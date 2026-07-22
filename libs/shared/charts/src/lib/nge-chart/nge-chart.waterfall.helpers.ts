import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeLineDataPoint,
  NgeWaterfallDataPoint,
  NgeWaterfallLayerConfig,
} from '../core/config';

import { orderedBandCategories } from '../core/gesture';

/**
 * One resolved waterfall bar: its `[start, end]` span in data space (both fed
 * through the value scale at render time), the source `value`, and its `kind`.
 * A `'delta'` bar floats from the prior running total to the new one; a `'total'`
 * bar is anchored at zero (`start = 0`) at the current running total.
 */
export interface WaterfallBar {
  /** Per-bar fill override carried from the source datum. */
  color?: string;
  end: number;
  kind: 'delta' | 'total';
  label: string;
  start: number;
  value: number;
}

/**
 * Result of {@link buildWaterfallBars}: the ordered bars plus the overall
 * `[min, max]` value extent covering every bar edge AND the zero baseline.
 */
export interface BuiltWaterfallSeries {
  bars: WaterfallBar[];
  extent: [number, number];
}

/**
 * Options for {@link createWaterfallChartScales}.
 */
export interface CreateWaterfallChartScalesOptions {
  /**
   * Emit the secondary `y2` percentage scale (`[0, 100]`) for a cumulative-total
   * line overlay. When false / omitted no `y2` scale is returned.
   */
  cumulative?: boolean;

  /**
   * Explicit value-axis (`y`) domain override — replaces the running-cumulative
   * extent (e.g. to pin a zero-based domain or clamp the headroom).
   */
  yDomain?: [number, number];
}

/**
 * The shared geometry core used by BOTH the waterfall scale factory (for a
 * cumulative-aware value extent) AND the renderer (for bar spans).
 *
 * Walks the points left-to-right maintaining a running total. A `'delta'` point
 * contributes its signed `value`: its bar spans `[running, running + value]` and
 * advances the running total. A `'total'` point is a checkpoint anchored at zero:
 * its bar spans `[0, running]` and does NOT change the running total.
 *
 * @param data - The layer's data points, in sequence.
 * @returns The ordered bars + the `[min, max]` value extent (always including 0).
 */
export function buildWaterfallBars(data: NgeWaterfallDataPoint[]): BuiltWaterfallSeries {
  const bars: WaterfallBar[] = [];
  let running = 0;
  let min = 0;
  let max = 0;

  for (const point of data) {
    const kind = point.kind ?? 'delta';
    let start: number;
    let end: number;

    if (kind === 'total') {
      start = 0;
      end = running;
    } else {
      start = running;
      end = running + point.value;
      running = end;
    }

    bars.push({ color: point.color, end, kind, label: point.label, start, value: point.value });
    min = Math.min(min, start, end);
    max = Math.max(max, start, end);
  }

  return { bars, extent: [min, max] };
}

/**
 * Cumulative-percentage points for a running-total line overlay: each bar's
 * running total as a percentage of the grand total (the sum of the `'delta'`
 * steps), positioned at the bar's `label`. Rendered through the `line` layer on
 * the secondary axis. Returns an empty array when the grand total is 0 (avoids a
 * divide-by-zero flat line).
 *
 * @param data - The waterfall layer's data points, in sequence.
 * @returns Line points `{ x: label, y: cumulativePercent }`.
 */
export function buildCumulativePercentPoints(data: NgeWaterfallDataPoint[]): NgeLineDataPoint[] {
  const { bars } = buildWaterfallBars(data);

  // Grand total = the final running total across the delta steps.
  let grandTotal = 0;
  for (const bar of bars) {
    if (bar.kind === 'delta') {
      grandTotal += bar.value;
    }
  }
  if (grandTotal === 0) {
    return [];
  }

  // Running total AFTER each bar → percentage of the grand total. A 'total'
  // checkpoint reflects the running total at that point (its `end`).
  let running = 0;
  return bars.map(bar => {
    if (bar.kind === 'delta') {
      running += bar.value;
    }
    const cumulative = bar.kind === 'total' ? bar.end : running;
    return { x: bar.label, y: (cumulative / grandTotal) * 100 };
  });
}

/**
 * Creates scales for a waterfall visualization (optionally with a cumulative
 * overlay).
 *
 * Collects points from `type === 'waterfall'` layers, builds a band scale over
 * the bar labels (with `barPadding`) and a linear value scale over the running-
 * cumulative extent (10% headroom on the non-zero side, zero baseline preserved).
 * When `options.cumulative` is set it also returns a `y2` percentage scale
 * (`[0, 100]`) for the overlay line. An explicit `yDomain` override replaces the
 * derived value extent.
 *
 * @param config - The chart configuration containing layers.
 * @param dimensions - The bounded dimensions for the chart area.
 * @param options - Optional cumulative flag + value-domain override.
 * @returns Scales object with x, y, and (when cumulative) y2 scales.
 */
export function createWaterfallChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions,
  options?: CreateWaterfallChartScalesOptions
): NgeChartScales {
  const layers: NgeWaterfallLayerConfig[] = [];
  const allPoints: NgeWaterfallDataPoint[] = [];

  for (const layer of config.layers.flat()) {
    if (layer.type === 'waterfall') {
      const waterfallLayer = layer as NgeWaterfallLayerConfig;
      layers.push(waterfallLayer);
      allPoints.push(...waterfallLayer.data);
    }
  }

  const y2Scale = options?.cumulative
    ? scaleLinear().domain([0, 100]).range([dimensions.boundedHeight, 0])
    : undefined;

  if (allPoints.length === 0) {
    // Return default scales if no data.
    const emptyScales: NgeChartScales = {
      x: scaleBand<string>().domain([]).range([0, dimensions.boundedWidth]),
      y: scaleLinear().domain([0, 1]).range([dimensions.boundedHeight, 0]),
    };
    if (y2Scale) {
      emptyScales.y2 = y2Scale;
    }
    return emptyScales;
  }

  // Value domain: union of each layer's cumulative extent, padded 10% on the
  // non-zero side (the zero baseline is preserved), unless an override wins.
  let lo = 0;
  let hi = 0;
  for (const layer of layers) {
    const [layerLo, layerHi] = buildWaterfallBars(layer.data).extent;
    lo = Math.min(lo, layerLo);
    hi = Math.max(hi, layerHi);
  }
  const domainLo = lo < 0 ? lo * 1.1 : lo;
  const domainHi = hi > 0 ? hi * 1.1 : hi;
  const valueDomain: [number, number] =
    options?.yDomain ?? (domainLo === domainHi ? [domainLo, domainHi + 1] : [domainLo, domainHi]);

  const barPadding = layers[0].barPadding ?? 0.2;
  const labels = orderedBandCategories(allPoints, d => d.label);
  const bandScale = scaleBand<string>().domain(labels).padding(barPadding);

  const scales: NgeChartScales = {
    x: bandScale.range([0, dimensions.boundedWidth]),
    y: scaleLinear().domain(valueDomain).range([dimensions.boundedHeight, 0]),
  };
  if (y2Scale) {
    scales.y2 = y2Scale;
  }
  return scales;
}
