import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeWaterfallDataPoint,
  NgeWaterfallLayerConfig,
} from '../core/config';

import { renderWaterfallLayer } from '../layers/waterfall';
import {
  buildCumulativePercentPoints,
  buildWaterfallBars,
  createWaterfallChartScales,
} from './nge-chart.waterfall.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Three positive deltas that sum to 100, closed by a total checkpoint. */
const WATERFALL: NgeWaterfallDataPoint[] = [
  { label: 'A', value: 50 },
  { label: 'B', value: 30 },
  { label: 'C', value: 20 },
  { kind: 'total', label: 'Total', value: 0 },
];

/** Build a minimal single-waterfall-layer chart config for the scale factory. */
function waterfallConfig(
  data: NgeWaterfallDataPoint[],
  overrides?: Partial<NgeWaterfallLayerConfig>
): NgeChartConfig {
  const layer: NgeWaterfallLayerConfig = {
    data,
    renderer: renderWaterfallLayer,
    type: 'waterfall',
    ...overrides,
  };
  return { layers: [layer] };
}

describe('buildWaterfallBars', () => {
  it('returns an empty result with a [0, 0] extent for no data', () => {
    expect(buildWaterfallBars([])).toEqual({ bars: [], extent: [0, 0] });
  });

  it('floats delta bars on the running total and anchors total bars at zero', () => {
    const { bars } = buildWaterfallBars(WATERFALL);

    // A: [0, 50], B: [50, 80], C: [80, 100]; Total checkpoint: [0, 100].
    expect(bars).toEqual([
      { color: undefined, end: 50, kind: 'delta', label: 'A', start: 0, value: 50 },
      { color: undefined, end: 80, kind: 'delta', label: 'B', start: 50, value: 30 },
      { color: undefined, end: 100, kind: 'delta', label: 'C', start: 80, value: 20 },
      { color: undefined, end: 100, kind: 'total', label: 'Total', start: 0, value: 0 },
    ]);
  });

  it('spans the running-cumulative extent including the zero baseline', () => {
    expect(buildWaterfallBars(WATERFALL).extent).toEqual([0, 100]);
  });

  it('handles a falling delta that dips the running total, covering the peak in the extent', () => {
    const mixed: NgeWaterfallDataPoint[] = [
      { label: 'Open', value: 100 },
      { label: 'Gain', value: 40 },
      { label: 'Loss', value: -60 },
    ];

    const { bars, extent } = buildWaterfallBars(mixed);

    // Open [0, 100], Gain [100, 140], Loss [140, 80] (end < start → falling).
    expect(bars.map(bar => [bar.start, bar.end])).toEqual([
      [0, 100],
      [100, 140],
      [140, 80],
    ]);
    // Extent covers the 140 peak (Gain's top) and the zero baseline.
    expect(extent).toEqual([0, 140]);
  });

  it('carries a per-datum color override through to the bar', () => {
    const { bars } = buildWaterfallBars([{ color: 'var(--override)', label: 'A', value: 10 }]);

    expect(bars[0].color).toBe('var(--override)');
  });

  it('lets a total bar dip below zero when the running total is negative', () => {
    const { bars, extent } = buildWaterfallBars([
      { label: 'Down', value: -40 },
      { kind: 'total', label: 'Net', value: 0 },
    ]);

    expect(bars[0]).toMatchObject({ end: -40, kind: 'delta', start: 0 });
    expect(bars[1]).toMatchObject({ end: -40, kind: 'total', start: 0 });
    expect(extent).toEqual([-40, 0]);
  });
});

describe('buildCumulativePercentPoints', () => {
  it('returns the running total as a percentage of the grand total', () => {
    // Grand total = the delta sum (50 + 30 + 20 = 100); the total checkpoint sits at 100%.
    expect(buildCumulativePercentPoints(WATERFALL)).toEqual([
      { x: 'A', y: 50 },
      { x: 'B', y: 80 },
      { x: 'C', y: 100 },
      { x: 'Total', y: 100 },
    ]);
  });

  it('returns an empty array when the grand total is zero (no divide-by-zero)', () => {
    expect(buildCumulativePercentPoints([])).toEqual([]);
    expect(
      buildCumulativePercentPoints([
        { label: 'A', value: 0 },
        { label: 'B', value: 0 },
      ])
    ).toEqual([]);
  });
});

describe('createWaterfallChartScales', () => {
  it('returns default scales when there are no waterfall layers', () => {
    const scales = createWaterfallChartScales({ layers: [] }, DIMENSIONS);

    expect(scales.x.domain()).toEqual([]);
    expect(scales.y.domain()).toEqual([0, 1]);
    expect(scales.y2).toBeUndefined();
  });

  it('builds a band x domain and a padded running-cumulative y domain', () => {
    const scales = createWaterfallChartScales(waterfallConfig(WATERFALL), DIMENSIONS);

    expect(scales.x.domain()).toEqual(['A', 'B', 'C', 'Total']);
    // Extent [0, 100] → 10% headroom on the non-zero side, zero baseline preserved.
    expect(scales.y.domain()).toEqual([0, expect.closeTo(110, 6)]);
    expect((scales.x as { bandwidth?: () => number }).bandwidth).toBeDefined();
    expect(scales.y.range()).toEqual([300, 0]);
  });

  it('emits a [0, 100] secondary percentage scale when cumulative', () => {
    const scales = createWaterfallChartScales(waterfallConfig(WATERFALL), DIMENSIONS, {
      cumulative: true,
    });

    expect(scales.y2?.domain()).toEqual([0, 100]);
    expect(scales.y2?.range()).toEqual([300, 0]);
  });

  it('adds the secondary scale even on the empty fallback when cumulative', () => {
    const scales = createWaterfallChartScales({ layers: [] }, DIMENSIONS, { cumulative: true });

    expect(scales.y2?.domain()).toEqual([0, 100]);
  });

  it('honours an explicit yDomain override', () => {
    const scales = createWaterfallChartScales(waterfallConfig(WATERFALL), DIMENSIONS, {
      yDomain: [0, 200],
    });

    expect(scales.y.domain()).toEqual([0, 200]);
  });
});
