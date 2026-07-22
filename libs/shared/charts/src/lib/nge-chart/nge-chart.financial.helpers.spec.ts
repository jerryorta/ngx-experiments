import type { ScaleBand } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type {
  FinancialVariant,
  NgeChartConfig,
  NgeFinancialDataPoint,
  NgeFinancialLayerConfig,
} from '../core/config';

import {
  buildKagiSegments,
  buildRenkoBricks,
  computeFinancialPriceDomain,
  createFinancialChartScalesFactory,
  resolveKagiReversal,
  resolveRenkoBrickSize,
} from './nge-chart.financial.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Build OHLC data points from a `close` series (kagi/renko read only `close`). */
function ohlc(closes: number[]): NgeFinancialDataPoint[] {
  return closes.map((close, index) => ({
    close,
    date: index,
    high: close + 1,
    low: close - 1,
    open: close,
  }));
}

/** Build a minimal single-financial-layer chart config for the scale factory. */
function financialConfig(
  data: NgeFinancialDataPoint[],
  overrides?: Partial<NgeFinancialLayerConfig>
): NgeChartConfig {
  const layer: NgeFinancialLayerConfig = {
    data,
    renderer: () => undefined,
    type: 'financial',
    ...overrides,
  };
  return { layers: [layer] };
}

describe('resolveKagiReversal', () => {
  it('defaults to ~3% of the close range', () => {
    // Close range [10, 20] = 10 → 0.03 · 10 = 0.3.
    expect(resolveKagiReversal(ohlc([10, 15, 20]))).toBeCloseTo(0.3, 6);
  });

  it('uses an explicit absolute reversal', () => {
    expect(resolveKagiReversal(ohlc([10, 15, 20]), { reversal: 2 })).toBe(2);
  });

  it('reads an explicit reversal as a fraction of the close range when reversalAsPercent', () => {
    // 0.1 · range(10) = 1.
    expect(
      resolveKagiReversal(ohlc([10, 15, 20]), { reversal: 0.1, reversalAsPercent: true })
    ).toBeCloseTo(1, 6);
  });

  it('is 0 for a flat series (no range)', () => {
    expect(resolveKagiReversal(ohlc([7, 7, 7]))).toBe(0);
  });
});

describe('resolveRenkoBrickSize', () => {
  it('defaults to ~5% of the close range', () => {
    // range(10) · 0.05 = 0.5.
    expect(resolveRenkoBrickSize(ohlc([10, 15, 20]))).toBeCloseTo(0.5, 6);
  });

  it('uses an explicit brick size', () => {
    expect(resolveRenkoBrickSize(ohlc([10, 15, 20]), { brickSize: 3 })).toBe(3);
  });

  it('is 0 for a flat series (no range)', () => {
    expect(resolveRenkoBrickSize(ohlc([7, 7, 7]))).toBe(0);
  });
});

describe('buildKagiSegments', () => {
  it('returns no segments for fewer than two points', () => {
    expect(buildKagiSegments(ohlc([10]))).toEqual([]);
    expect(buildKagiSegments([])).toEqual([]);
  });

  it('returns no segments for a flat series', () => {
    expect(buildKagiSegments(ohlc([5, 5, 5]), { reversal: 1 })).toEqual([]);
  });

  it('short-circuits via the reversal <= 0 guard, even for a series that would otherwise turn', () => {
    // [10,11,12,10,9,12] yields 3 real segments at reversal 2 (see below), so a []
    // result here proves the `reversal <= 0` guard fired up front — not the downstream
    // degenerate-segment filter (which only drops zero-height legs of a built series).
    expect(buildKagiSegments(ohlc([10, 11, 12, 10, 9, 12]), { reversal: 0 })).toEqual([]);
    expect(buildKagiSegments(ohlc([10, 11, 12, 10, 9, 12]), { reversal: -2 })).toEqual([]);
  });

  it('folds the close series into reversal-driven turning-point segments', () => {
    // closes [10,11,12,10,9,12], reversal 2 → turns [10,12,9,12] → 3 segments.
    const segments = buildKagiSegments(ohlc([10, 11, 12, 10, 9, 12]), { reversal: 2 });

    expect(segments).toHaveLength(3);
    expect(segments.map(s => [s.priceFrom, s.priceTo])).toEqual([
      [10, 12],
      [12, 9],
      [9, 12],
    ]);
    expect(segments.map(s => s.direction)).toEqual(['up', 'down', 'up']);
    expect(segments.map(s => s.index)).toEqual([0, 1, 2]);
  });

  it('flips to yin below the prior waist and carries the state when the shoulder is not broken', () => {
    // Same series: seg0 up = yang; seg1 down breaks below the prior waist (9 < 10) =
    // yin; seg2 up only reaches the prior shoulder (12, not above) → carries yin.
    const segments = buildKagiSegments(ohlc([10, 11, 12, 10, 9, 12]), { reversal: 2 });

    expect(segments.map(s => s.line)).toEqual(['yang', 'yin', 'yin']);
  });

  it('marks a leg yang once it rises above the prior shoulder', () => {
    // closes [10,12,9,14], reversal 2 → turns [10,12,9,14]: seg2 up to 14 > prior
    // shoulder 12 → yang.
    const segments = buildKagiSegments(ohlc([10, 12, 9, 14]), { reversal: 2 });

    expect(segments.map(s => [s.priceFrom, s.priceTo])).toEqual([
      [10, 12],
      [12, 9],
      [9, 14],
    ]);
    expect(segments[2].line).toBe('yang');
  });

  it('ignores counter-moves smaller than the reversal', () => {
    // A 1-unit dip (12→11) never reverses at reversal 2 — one rising leg only.
    const segments = buildKagiSegments(ohlc([10, 12, 11, 13]), { reversal: 2 });

    expect(segments).toHaveLength(1);
    expect([segments[0].priceFrom, segments[0].priceTo]).toEqual([10, 13]);
  });
});

describe('buildRenkoBricks', () => {
  it('returns no bricks for fewer than two points or a non-positive brick size', () => {
    expect(buildRenkoBricks(ohlc([10]), { brickSize: 3 })).toEqual([]);
    expect(buildRenkoBricks(ohlc([10, 13, 16]), { brickSize: 0 })).toEqual([]);
  });

  it('emits continuation + reversal bricks in a diagonal staircase', () => {
    // closes [10,13,16,9], brick 3 → up[10,13], up[13,16], reversal down[10,13].
    const bricks = buildRenkoBricks(ohlc([10, 13, 16, 9]), { brickSize: 3 });

    expect(bricks).toHaveLength(3);
    expect(bricks.map(b => b.direction)).toEqual(['up', 'up', 'down']);
    expect(bricks.map(b => [b.low, b.high])).toEqual([
      [10, 13],
      [13, 16],
      [10, 13],
    ]);
    expect(bricks.map(b => b.index)).toEqual([0, 1, 2]);
  });

  it('emits one brick per brickSize crossed on a single large move', () => {
    // 10 → 20 with brick 3 crosses three bricks up.
    const bricks = buildRenkoBricks(ohlc([10, 20]), { brickSize: 3 });

    expect(bricks.map(b => [b.low, b.high])).toEqual([
      [10, 13],
      [13, 16],
      [16, 19],
    ]);
  });

  it('needs a ~2×brickSize counter-move to reverse (ignores a small pullback)', () => {
    // After up[10,13], a dip to 11 does not clear low − brick (7) → no reversal brick.
    const bricks = buildRenkoBricks(ohlc([10, 13, 11]), { brickSize: 3 });

    expect(bricks.map(b => b.direction)).toEqual(['up']);
  });
});

describe('computeFinancialPriceDomain', () => {
  it('spans the raw wick extent (candlestick), padded ~5%', () => {
    const [lo, hi] = computeFinancialPriceDomain(
      financialConfig([
        { close: 13, date: 0, high: 14, low: 9, open: 10 },
        { close: 11, date: 1, high: 15, low: 8, open: 13 },
      ]).layers[0] as NgeFinancialLayerConfig
    );

    // [min low 8, max high 15], pad 0.05 · 7 = 0.35.
    expect(lo).toBeCloseTo(7.65, 6);
    expect(hi).toBeCloseTo(15.35, 6);
  });

  it('spans the kagi segment prices, padded ~5%', () => {
    const [lo, hi] = computeFinancialPriceDomain(
      financialConfig(ohlc([10, 11, 12, 10, 9, 12]), {
        reversalThreshold: 2,
        variant: 'kagi',
      }).layers[0] as NgeFinancialLayerConfig
    );

    // turns span [9, 12], pad 0.05 · 3 = 0.15.
    expect(lo).toBeCloseTo(8.85, 6);
    expect(hi).toBeCloseTo(12.15, 6);
  });

  it('spans the renko brick bands, padded ~5%', () => {
    const [lo, hi] = computeFinancialPriceDomain(
      financialConfig(ohlc([10, 13, 16, 9]), { brickSize: 3, variant: 'renko' })
        .layers[0] as NgeFinancialLayerConfig
    );

    // bricks span [10, 16], pad 0.05 · 6 = 0.3.
    expect(lo).toBeCloseTo(9.7, 6);
    expect(hi).toBeCloseTo(16.3, 6);
  });

  it('falls back to [0, 1] with no data', () => {
    expect(
      computeFinancialPriceDomain(financialConfig([]).layers[0] as NgeFinancialLayerConfig)
    ).toEqual([0, 1]);
  });
});

describe('createFinancialChartScalesFactory', () => {
  it('puts one sequence slot per candle on the band x-axis and price on the linear y-axis', () => {
    const scales = createFinancialChartScalesFactory({})(
      financialConfig([
        { close: 13, date: 0, high: 14, low: 9, open: 10 },
        { close: 11, date: 1, high: 15, low: 8, open: 13 },
        { close: 15, date: 2, high: 16, low: 10, open: 11 },
      ]),
      DIMENSIONS
    );

    expect(scales.x.domain()).toEqual(['0', '1', '2']);
    expect(scales.x.range()).toEqual([0, 500]);
    expect((scales.x as ScaleBand<string>).bandwidth).toBeDefined();
    expect((scales.y as { bandwidth?: () => number }).bandwidth).toBeUndefined();
    expect(scales.y.range()).toEqual([300, 0]);

    const [yLo, yHi] = scales.y.domain() as [number, number];
    // [min low 8, max high 16], pad 0.05 · 8 = 0.4.
    expect(yLo).toBeCloseTo(7.6, 6);
    expect(yHi).toBeCloseTo(16.4, 6);
  });

  it('sizes the band domain to the kagi segment count', () => {
    const scales = createFinancialChartScalesFactory({})(
      financialConfig(ohlc([10, 11, 12, 10, 9, 12]), { reversalThreshold: 2, variant: 'kagi' }),
      DIMENSIONS
    );

    // 3 kagi segments → 3 slots.
    expect(scales.x.domain()).toEqual(['0', '1', '2']);
  });

  it('sizes the band domain to the renko brick count', () => {
    const scales = createFinancialChartScalesFactory({})(
      financialConfig(ohlc([10, 13, 16, 9]), { brickSize: 3, variant: 'renko' }),
      DIMENSIONS
    );

    // 3 renko bricks → 3 slots.
    expect(scales.x.domain()).toEqual(['0', '1', '2']);
  });

  it('honours a factory-level variant fallback when the layer omits it', () => {
    const variant: FinancialVariant = 'renko';
    const scales = createFinancialChartScalesFactory({ brickSize: 3, variant })(
      financialConfig(ohlc([10, 13, 16, 9])),
      DIMENSIONS
    );

    expect(scales.x.domain()).toEqual(['0', '1', '2']);
  });

  it('falls back to an empty band domain and a [0, 1] price domain with no layers', () => {
    const scales = createFinancialChartScalesFactory({})({ layers: [] }, DIMENSIONS);

    expect(scales.x.domain()).toEqual([]);
    expect(scales.y.domain()).toEqual([0, 1]);
  });
});
