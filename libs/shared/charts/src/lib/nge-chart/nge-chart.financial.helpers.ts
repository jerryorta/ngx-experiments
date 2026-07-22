import { max, min } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  FinancialVariant,
  NgeChartConfig,
  NgeChartScaleFactory,
  NgeFinancialDataPoint,
  NgeFinancialLayerConfig,
} from '../core/config';

/** Default kagi reversal as a fraction of the `close` price range when none is given. */
const DEFAULT_REVERSAL_RANGE_FRACTION = 0.03;

/** Default renko brick height as a fraction of the `close` price range when none is given. */
const DEFAULT_BRICK_RANGE_FRACTION = 0.05;

/** Fractional padding added to each side of the resolved price (value) domain. */
const PRICE_DOMAIN_PADDING = 0.05;

/** Band padding (fraction of the band step) between adjacent sequence slots. */
const DEFAULT_BAND_PADDING = 0.2;

/**
 * One kagi vertical segment: the price move from the previous turning point
 * (`priceFrom`) to this one (`priceTo`), seated at band-slot `index`. `direction` is
 * whether this leg rose or fell; `line` is the yang / yin classification driving its
 * thickness + colour — yang once the line rises above the prior shoulder, yin once it
 * falls below the prior waist (the state CARRIES across legs that don't break the
 * prior extreme). A short horizontal connector (drawn in the renderer) bridges the
 * previous segment's end to this segment's `priceFrom`.
 */
export interface KagiSegment {
  /** Whether this leg rose (`priceTo >= priceFrom`) or fell. */
  direction: 'down' | 'up';
  /** Sequence slot on the band axis (0-based). */
  index: number;
  /** Yang (thick, rose above the prior shoulder) vs yin (thin, fell below the prior waist). */
  line: 'yang' | 'yin';
  /** Price at the start of the segment (the previous turning point). */
  priceFrom: number;
  /** Price at the end of the segment (this turning-point extreme). */
  priceTo: number;
}

/**
 * One renko brick: a fixed-height `[low, high]` price band (height = `brickSize`)
 * seated at band-slot `index`, coloured by `direction`. Consecutive bricks advance
 * one slot on x and step one `brickSize` up / down on y, forming a diagonal staircase.
 */
export interface RenkoBrick {
  /** Whether the brick stepped up or down. */
  direction: 'down' | 'up';
  /** Top price edge of the brick. */
  high: number;
  /** Sequence slot on the band axis (0-based). */
  index: number;
  /** Bottom price edge of the brick (`high − brickSize`). */
  low: number;
}

/** Fallback options merged behind a layer's own knobs when building the scale factory. */
export interface FinancialScaleFactoryOptions {
  /** Renko brick height (price units). Falls back to a fraction of the `close` range. */
  brickSize?: number;
  /** Interpret `reversalThreshold` as a fraction of the `close` price range. */
  reversalAsPercent?: boolean;
  /** Kagi reversal amount (absolute price, or a range fraction when `reversalAsPercent`). */
  reversalThreshold?: number;
  /** Which financial shape drives the sequence length + price domain. Default `'candlestick'`. */
  variant?: FinancialVariant;
}

/** Options threaded into the kagi / renko transforms (defaults derived from the data). */
interface FinancialTransformOptions {
  brickSize?: number;
  reversal?: number;
  reversalAsPercent?: boolean;
}

/** The `[min, max]` span of the `close` series (0 for fewer than one point). */
function closeRange(data: NgeFinancialDataPoint[]): number {
  const lo = min(data, point => point.close);
  const hi = max(data, point => point.close);
  return lo === undefined || hi === undefined ? 0 : hi - lo;
}

/**
 * Resolve the effective kagi reversal amount (absolute price units): an explicit
 * `reversal` wins (read as a fraction of the `close` price range when
 * `reversalAsPercent`; a non-positive value signals "no segments"), else a small
 * default fraction of that range — which is 0 for a degenerate (flat) series, also
 * signalling "no segments" to {@link buildKagiSegments}.
 *
 * @param data - The layer's OHLC data points (the `close` series drives the range).
 * @param opts - Explicit reversal + percent flag; both optional.
 * @returns The reversal amount in absolute price units.
 */
export function resolveKagiReversal(
  data: NgeFinancialDataPoint[],
  opts: FinancialTransformOptions = {}
): number {
  const range = closeRange(data);
  if (opts.reversal != null) {
    return opts.reversalAsPercent ? opts.reversal * range : opts.reversal;
  }
  return DEFAULT_REVERSAL_RANGE_FRACTION * range;
}

/**
 * Resolve the effective renko brick height (price units): an explicit `brickSize`
 * wins (a non-positive value signals "no bricks"), else a small default fraction of
 * the `close` price range — which is 0 for a degenerate (flat) series, also
 * signalling "no bricks" to {@link buildRenkoBricks}.
 *
 * @param data - The layer's OHLC data points (the `close` series drives the range).
 * @param opts - Explicit `brickSize`; optional.
 * @returns The brick height in price units.
 */
export function resolveRenkoBrickSize(
  data: NgeFinancialDataPoint[],
  opts: FinancialTransformOptions = {}
): number {
  if (opts.brickSize != null) {
    return opts.brickSize;
  }
  return DEFAULT_BRICK_RANGE_FRACTION * closeRange(data);
}

/**
 * Fold the `close` series into the ordered kagi turning points: the anchor
 * (`close[0]`) followed by each reversal extreme. The line extends in the current
 * direction while price makes new extremes; a counter-move of at least `reversal`
 * closes the current leg (pushing its extreme) and starts a new one the other way.
 * Sub-threshold counter-moves are ignored (the noise reduction kagi is prized for).
 */
function buildKagiTurns(closes: number[], reversal: number): number[] {
  const turns: number[] = [closes[0]];
  let direction = 0;
  let extreme = closes[0];

  for (let i = 1; i < closes.length; i++) {
    const price = closes[i];
    if (direction === 0) {
      // Wait for the first move that clears the reversal to set the initial direction.
      if (price >= extreme + reversal) {
        direction = 1;
        extreme = price;
      } else if (price <= extreme - reversal) {
        direction = -1;
        extreme = price;
      }
    } else if (direction === 1) {
      if (price > extreme) {
        extreme = price;
      } else if (price <= extreme - reversal) {
        turns.push(extreme);
        direction = -1;
        extreme = price;
      }
    } else if (price < extreme) {
      extreme = price;
    } else if (price >= extreme + reversal) {
      turns.push(extreme);
      direction = 1;
      extreme = price;
    }
  }

  turns.push(extreme);
  return turns;
}

/**
 * Transform the `close` series into a sequence of kagi vertical segments.
 *
 * The shared kagi geometry core used by BOTH the scale factory (for the sequence
 * length + price extent) AND the renderer (for segment geometry + yin/yang styling).
 * Builds the turning points ({@link buildKagiTurns}), then one segment per consecutive
 * pair. The yang / yin thickness flips when a leg breaks the PRIOR same-direction
 * extreme (two turning points back — the "shoulder" for an up leg, the "waist" for a
 * down leg): an up leg rising above the prior shoulder becomes yang, a down leg
 * falling below the prior waist becomes yin, and a leg that only retraces CARRIES the
 * previous state. Degenerate (zero-height) endpoint segments are dropped and the
 * remainder re-indexed so slots stay contiguous. Returns `[]` when the series has
 * fewer than two points, a non-positive reversal, or no real movement.
 *
 * @param data - The layer's OHLC data points, in sequence.
 * @param opts - Reversal amount + percent flag (defaults derived from the data).
 * @returns The ordered kagi segments (band-slot `index` 0..n-1), or `[]`.
 */
export function buildKagiSegments(
  data: NgeFinancialDataPoint[],
  opts: FinancialTransformOptions = {}
): KagiSegment[] {
  if (data.length < 2) {
    return [];
  }
  const reversal = resolveKagiReversal(data, opts);
  if (reversal <= 0) {
    return [];
  }

  const turns = buildKagiTurns(
    data.map(point => point.close),
    reversal
  );
  if (turns.length < 2) {
    return [];
  }

  const segments: KagiSegment[] = [];
  let line: 'yang' | 'yin' = turns[1] >= turns[0] ? 'yang' : 'yin';
  for (let j = 0; j < turns.length - 1; j++) {
    const priceFrom = turns[j];
    const priceTo = turns[j + 1];
    const direction: 'down' | 'up' = priceTo >= priceFrom ? 'up' : 'down';
    if (j > 0) {
      // The prior same-direction extreme (shoulder for an up leg, waist for a down
      // leg) is two turning points back — turns alternate, so it is turns[j - 1].
      const prior = turns[j - 1];
      if (direction === 'up' && priceTo > prior) {
        line = 'yang';
      } else if (direction === 'down' && priceTo < prior) {
        line = 'yin';
      }
    }
    segments.push({ direction, index: j, line, priceFrom, priceTo });
  }

  // Drop degenerate (zero-height) endpoint segments (e.g. a final leg that never
  // moved) and re-index so band slots stay contiguous.
  return segments
    .filter(segment => segment.priceFrom !== segment.priceTo)
    .map((segment, index) => ({ ...segment, index }));
}

/**
 * Transform the `close` series into renko bricks.
 *
 * The shared renko geometry core used by BOTH the scale factory (for the sequence
 * length + price extent) AND the renderer (for brick geometry). Walks the `close`
 * series maintaining the last brick's `[low, high]` band (seeded flat at `close[0]`).
 * A move of at least `brickSize` beyond the band's top emits up brick(s) `[high,
 * high + brickSize]`; a move at least `brickSize` below the band's bottom emits down
 * brick(s) `[low − brickSize, low]`. Because the band has height `brickSize` after the
 * first brick, a REVERSAL inherently needs to clear the opposite edge — a ~2×brickSize
 * move — matching classic renko. A single large move emits multiple bricks (one per
 * `brickSize` crossed). Returns `[]` when the series has fewer than two points or a
 * non-positive brick size.
 *
 * @param data - The layer's OHLC data points, in sequence.
 * @param opts - Brick size (defaults to a fraction of the `close` range).
 * @returns The ordered renko bricks (band-slot `index` 0..n-1), or `[]`.
 */
export function buildRenkoBricks(
  data: NgeFinancialDataPoint[],
  opts: FinancialTransformOptions = {}
): RenkoBrick[] {
  if (data.length < 2) {
    return [];
  }
  const brickSize = resolveRenkoBrickSize(data, opts);
  if (brickSize <= 0) {
    return [];
  }

  const closes = data.map(point => point.close);
  const bricks: RenkoBrick[] = [];
  let low = closes[0];
  let high = closes[0];

  for (let i = 1; i < closes.length; i++) {
    const price = closes[i];
    while (price >= high + brickSize) {
      const newLow = high;
      const newHigh = high + brickSize;
      bricks.push({ direction: 'up', high: newHigh, index: bricks.length, low: newLow });
      low = newLow;
      high = newHigh;
    }
    while (price <= low - brickSize) {
      const newHigh = low;
      const newLow = low - brickSize;
      bricks.push({ direction: 'down', high: newHigh, index: bricks.length, low: newLow });
      low = newLow;
      high = newHigh;
    }
  }

  return bricks;
}

/** Pad a `[lo, hi]` price extent ~5% each side; falls back / expands degenerate spans. */
function padPriceDomain(lo?: number, hi?: number): [number, number] {
  if (lo === undefined || hi === undefined || !Number.isFinite(lo) || !Number.isFinite(hi)) {
    return [0, 1];
  }
  if (lo === hi) {
    const pad = Math.abs(hi) * PRICE_DOMAIN_PADDING || 1;
    return [lo - pad, hi + pad];
  }
  const pad = (hi - lo) * PRICE_DOMAIN_PADDING;
  return [lo - pad, hi + pad];
}

/**
 * The financial layer's price (value) domain for ONE layer, resolved per its
 * `variant` and padded ~5% each side so wicks / kagi caps / bricks clear the plot
 * edges. Candlestick spans the raw `[min low, max high]`; kagi spans its segment
 * price extents; renko spans its brick `[low, high]` bands (each falling back to the
 * `close` extent when the transform yields nothing). Returns `[0, 1]` with no data
 * and expands a zero-width span to a padded band.
 *
 * @param layer - The financial layer whose data + variant set the price domain.
 * @returns The padded `[min, max]` price domain.
 */
export function computeFinancialPriceDomain(layer: NgeFinancialLayerConfig): [number, number] {
  const variant = layer.variant ?? 'candlestick';

  if (variant === 'kagi') {
    const segments = buildKagiSegments(layer.data, {
      reversal: layer.reversalThreshold,
      reversalAsPercent: layer.reversalAsPercent,
    });
    if (segments.length > 0) {
      return padPriceDomain(
        min(segments, segment => Math.min(segment.priceFrom, segment.priceTo)),
        max(segments, segment => Math.max(segment.priceFrom, segment.priceTo))
      );
    }
    return padPriceDomain(
      min(layer.data, point => point.close),
      max(layer.data, point => point.close)
    );
  }

  if (variant === 'renko') {
    const bricks = buildRenkoBricks(layer.data, { brickSize: layer.brickSize });
    if (bricks.length > 0) {
      return padPriceDomain(
        min(bricks, brick => brick.low),
        max(bricks, brick => brick.high)
      );
    }
    return padPriceDomain(
      min(layer.data, point => point.close),
      max(layer.data, point => point.close)
    );
  }

  // Candlestick: the full wick extent.
  return padPriceDomain(
    min(layer.data, point => point.low),
    max(layer.data, point => point.high)
  );
}

/** How many band slots (candles / kagi segments / renko bricks) a layer occupies. */
function financialPrimitiveCount(layer: NgeFinancialLayerConfig): number {
  const variant = layer.variant ?? 'candlestick';
  if (variant === 'kagi') {
    return buildKagiSegments(layer.data, {
      reversal: layer.reversalThreshold,
      reversalAsPercent: layer.reversalAsPercent,
    }).length;
  }
  if (variant === 'renko') {
    return buildRenkoBricks(layer.data, { brickSize: layer.brickSize }).length;
  }
  return layer.data.length;
}

/** Overlay the factory-level fallback options behind a layer's own knobs. */
function resolveEffectiveLayer(
  layer: NgeFinancialLayerConfig,
  options: FinancialScaleFactoryOptions
): NgeFinancialLayerConfig {
  return {
    ...layer,
    brickSize: layer.brickSize ?? options.brickSize,
    reversalAsPercent: layer.reversalAsPercent ?? options.reversalAsPercent,
    reversalThreshold: layer.reversalThreshold ?? options.reversalThreshold,
    variant: layer.variant ?? options.variant,
  };
}

/**
 * Build a financial-chart scale factory: a `scaleBand` SEQUENCE axis on x (one slot
 * per candle / kagi segment / renko brick — evenly spaced, so calendar gaps collapse)
 * and a `scaleLinear` PRICE axis on y. Financial charts are vertical-only (price on
 * y), so unlike the distribution factory there is no orientation knob. The band domain
 * length + the price extent come from the SAME `variant` transforms the renderer uses
 * (via {@link buildKagiSegments} / {@link buildRenkoBricks}), so both agree on the
 * sequence length and value range. `options` supplies per-knob fallbacks behind each
 * layer's own `variant` / `reversalThreshold` / `brickSize`.
 *
 * @param options - Fallback variant / reversal / brick-size knobs (all optional).
 * @returns A {@link NgeChartScaleFactory} producing the band (sequence) + linear (price) scales.
 */
export function createFinancialChartScalesFactory(
  options: FinancialScaleFactoryOptions = {}
): NgeChartScaleFactory {
  return (config: NgeChartConfig, dimensions: NgeChartDimensions): NgeChartScales => {
    let lo = Infinity;
    let hi = -Infinity;
    let maxCount = 0;

    for (const layer of config.layers.flat()) {
      if (layer.type !== 'financial') {
        continue;
      }
      const effective = resolveEffectiveLayer(layer as NgeFinancialLayerConfig, options);
      const [layerLo, layerHi] = computeFinancialPriceDomain(effective);
      lo = Math.min(lo, layerLo);
      hi = Math.max(hi, layerHi);
      maxCount = Math.max(maxCount, financialPrimitiveCount(effective));
    }

    const bandDomain = Array.from({ length: maxCount }, (_, index) => String(index));
    const priceDomain: [number, number] =
      Number.isFinite(lo) && Number.isFinite(hi) ? [lo, hi] : [0, 1];

    return {
      x: scaleBand<string>()
        .domain(bandDomain)
        .range([0, dimensions.boundedWidth])
        .padding(DEFAULT_BAND_PADDING),
      y: scaleLinear().domain(priceDomain).range([dimensions.boundedHeight, 0]),
    };
  };
}
