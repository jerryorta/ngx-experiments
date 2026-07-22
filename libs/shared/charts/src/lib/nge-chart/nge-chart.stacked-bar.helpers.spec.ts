import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeStackedBarDataPoint,
  NgeStackedBarLayerConfig,
} from '../core/config';

import { renderStackedBarLayer } from '../layers/stacked-bar';
import {
  buildStackedBarSeries,
  computeMarimekkoColumns,
  createStackedBarChartScales,
} from './nge-chart.stacked-bar.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Build a minimal single-stacked-bar-layer chart config for the scale factory. */
function stackedConfig(
  data: NgeStackedBarDataPoint[],
  overrides?: Partial<NgeStackedBarLayerConfig>
): NgeChartConfig {
  const layer: NgeStackedBarLayerConfig = {
    data,
    renderer: renderStackedBarLayer,
    type: 'stacked-bar',
    ...overrides,
  };
  return { layers: [layer] };
}

/** Two series (A, B) across two categories (Q1, Q2). */
const STACKED: NgeStackedBarDataPoint[] = [
  { category: 'Q1', seriesId: 'A', value: 10 },
  { category: 'Q1', seriesId: 'B', value: 20 },
  { category: 'Q2', seriesId: 'A', value: 10 },
  { category: 'Q2', seriesId: 'B', value: 5 },
];

describe('buildStackedBarSeries', () => {
  it('returns an empty result with a [0, 1] extent for no data', () => {
    expect(buildStackedBarSeries([])).toEqual({
      categories: [],
      columns: [],
      extent: [0, 1],
      seriesOrder: [],
    });
  });

  it('collects categories and series in first-seen order', () => {
    const result = buildStackedBarSeries(STACKED);

    expect(result.categories).toEqual(['Q1', 'Q2']);
    expect(result.seriesOrder).toEqual(['A', 'B']);
  });

  describe('offset "none" (absolute)', () => {
    it('stacks each column from a zero baseline with per-series segments', () => {
      const result = buildStackedBarSeries(STACKED, 'none');

      expect(result.columns[0]).toEqual({
        category: 'Q1',
        segments: [
          { seriesId: 'A', value: 10, y0: 0, y1: 10 },
          { seriesId: 'B', value: 20, y0: 10, y1: 30 },
        ],
        total: 30,
      });
      expect(result.columns[1]).toEqual({
        category: 'Q2',
        segments: [
          { seriesId: 'A', value: 10, y0: 0, y1: 10 },
          { seriesId: 'B', value: 5, y0: 10, y1: 15 },
        ],
        total: 15,
      });
    });

    it('spans the tallest stacked total in its extent', () => {
      // Q1 totals 30, Q2 totals 15 → extent covers the max column total.
      expect(buildStackedBarSeries(STACKED, 'none').extent).toEqual([0, 30]);
    });

    it('defaults an omitted stackOffset to "none"', () => {
      expect(buildStackedBarSeries(STACKED)).toEqual(buildStackedBarSeries(STACKED, 'none'));
    });

    it('stacks a single series from a zero baseline', () => {
      const result = buildStackedBarSeries(
        [
          { category: 'Q1', seriesId: 'A', value: 10 },
          { category: 'Q2', seriesId: 'A', value: 20 },
        ],
        'none'
      );

      expect(result.seriesOrder).toEqual(['A']);
      expect(result.columns[0].segments).toEqual([{ seriesId: 'A', value: 10, y0: 0, y1: 10 }]);
      expect(result.extent).toEqual([0, 20]);
    });

    it('fills a missing (category, series) cell with a zero-height segment', () => {
      // Q2 has no B point → the pivot fills (Q2, B) with 0, so B's Q2 segment is a
      // zero-height band (y0 === y1) sitting on A's cumulative top (12).
      const result = buildStackedBarSeries(
        [
          { category: 'Q1', seriesId: 'A', value: 10 },
          { category: 'Q1', seriesId: 'B', value: 5 },
          { category: 'Q2', seriesId: 'A', value: 12 },
          { category: 'Q3', seriesId: 'A', value: 8 },
          { category: 'Q3', seriesId: 'B', value: 7 },
        ],
        'none'
      );

      const q2 = result.columns[1];
      expect(q2.category).toBe('Q2');
      expect(q2.total).toBe(12);
      expect(q2.segments[1]).toEqual({ seriesId: 'B', value: 0, y0: 12, y1: 12 });
    });
  });

  describe('offset "expand" (100%)', () => {
    it('normalises each column to [0, 1]', () => {
      const result = buildStackedBarSeries(STACKED, 'expand');

      expect(result.extent).toEqual([0, 1]);
      // Q1 totals 30 → A occupies [0, 1/3], B occupies [1/3, 1].
      expect(result.columns[0].segments[0].y0).toBe(0);
      expect(result.columns[0].segments[0].y1).toBeCloseTo(1 / 3, 10);
      expect(result.columns[0].segments[1].y1).toBeCloseTo(1, 10);
    });

    it('keeps the raw column total for Marimekko width weighting', () => {
      // Heights normalise to 100%, but `total` stays the RAW group sum.
      const result = buildStackedBarSeries(STACKED, 'expand');

      expect(result.columns.map(c => c.total)).toEqual([30, 15]);
    });
  });
});

describe('createStackedBarChartScales', () => {
  it('returns default scales when there are no stacked-bar layers', () => {
    const scales = createStackedBarChartScales({ layers: [] }, DIMENSIONS);

    expect(scales.x.domain()).toEqual([]);
    expect(scales.y.domain()).toEqual([0, 1]);
  });

  it('builds a band x domain and covers the stacked total in the y domain (vertical)', () => {
    const scales = createStackedBarChartScales(
      stackedConfig(STACKED, { stackOffset: 'none' }),
      DIMENSIONS
    );

    expect(scales.x.domain()).toEqual(['Q1', 'Q2']);
    expect(scales.y.domain()).toEqual([0, 30]);
    // Band scale on x, linear (inverted) value scale on y.
    expect((scales.x as { bandwidth?: () => number }).bandwidth).toBeDefined();
    expect(scales.y.range()).toEqual([300, 0]);
  });

  it('clamps the y domain to [0, 1] for expand (100%)', () => {
    const scales = createStackedBarChartScales(
      stackedConfig(STACKED, { stackOffset: 'expand' }),
      DIMENSIONS
    );

    expect(scales.y.domain()).toEqual([0, 1]);
  });

  it('honours an explicit yDomain override (vertical value axis)', () => {
    const scales = createStackedBarChartScales(
      stackedConfig(STACKED, { stackOffset: 'none' }),
      DIMENSIONS,
      { yDomain: [0, 100] }
    );

    expect(scales.y.domain()).toEqual([0, 100]);
  });

  it('swaps the axes for horizontal orientation (band y, value x)', () => {
    const scales = createStackedBarChartScales(
      stackedConfig(STACKED, { orientation: 'horizontal', stackOffset: 'none' }),
      DIMENSIONS,
      { xDomain: [0, 50] }
    );

    // Value scale moves to x (honouring xDomain); band scale moves to y.
    expect(scales.x.domain()).toEqual([0, 50]);
    expect(scales.y.domain()).toEqual(['Q1', 'Q2']);
    expect((scales.y as { bandwidth?: () => number }).bandwidth).toBeDefined();
  });

  it('keeps a Marimekko layer vertical even when orientation is horizontal', () => {
    const scales = createStackedBarChartScales(
      stackedConfig(STACKED, {
        bandWidthAccessor: (_category, total) => total,
        orientation: 'horizontal',
        stackOffset: 'expand',
      }),
      DIMENSIONS
    );

    // Marimekko is vertical-only: the value scale stays on y.
    expect(scales.y.domain()).toEqual([0, 1]);
    expect((scales.x as { bandwidth?: () => number }).bandwidth).toBeDefined();
  });
});

describe('computeMarimekkoColumns', () => {
  const columns = buildStackedBarSeries(STACKED).columns;

  it('returns an empty layout for no columns', () => {
    expect(computeMarimekkoColumns([], 300, 0, () => 1)).toEqual([]);
  });

  it('gives a single column the full width with no inter-column gap (gap-count guard)', () => {
    // One category → gapCount 0, so no gap is reserved even with padding set: the
    // lone column fills the entire 300px bounded width (no divide-by-zero / NaN).
    const single = buildStackedBarSeries([
      { category: 'Q1', seriesId: 'A', value: 10 },
      { category: 'Q1', seriesId: 'B', value: 20 },
    ]).columns;

    const layout = computeMarimekkoColumns(single, 300, 0.2, (_category, total) => total);

    expect(layout).toHaveLength(1);
    expect(layout[0].x).toBe(0);
    expect(layout[0].width).toBe(300);
    expect(Number.isFinite(layout[0].width)).toBe(true);
  });

  it('weights widths by the accessor and fills the full width when padding is 0', () => {
    const layout = computeMarimekkoColumns(columns, 300, 0, (_category, total) => total);

    // Weights 30 : 15 over 300px → 200 : 100, contiguous from x = 0.
    expect(layout).toEqual([
      { category: 'Q1', width: 200, x: 0 },
      { category: 'Q2', width: 100, x: 200 },
    ]);
    expect(layout.reduce((sum, c) => sum + c.width, 0)).toBe(300);
  });

  it('reserves an inter-column gap from padding', () => {
    const layout = computeMarimekkoColumns(columns, 300, 0.1, (_category, total) => total);

    // padding 0.1 → 30px gap; available 270px split 30:15 → 180 : 90.
    expect(layout[0]).toEqual({ category: 'Q1', width: 180, x: 0 });
    expect(layout[1]).toEqual({ category: 'Q2', width: 90, x: 210 });
    // Widths sum to the available (non-gap) width.
    expect(layout.reduce((sum, c) => sum + c.width, 0)).toBeCloseTo(270, 10);
  });

  it('falls back to equal widths when every weight is zero', () => {
    const layout = computeMarimekkoColumns(columns, 300, 0, () => 0);

    expect(layout.map(c => c.width)).toEqual([150, 150]);
  });

  it('floors a negative weight to 0 and gives the positive column the full available width', () => {
    // Weights 30 (Q1) and -5 (Q2): the negative is floored to 0 (Math.max(0, weight)),
    // so Q2 collapses to 0 width and Q1 takes all 270px of available width (300
    // boundedWidth minus the single 30px gap). No negative width, no NaN.
    const layout = computeMarimekkoColumns(columns, 300, 0.1, category =>
      category === 'Q1' ? 30 : -5
    );

    expect(layout[0]).toEqual({ category: 'Q1', width: 270, x: 0 });
    expect(layout[1].width).toBe(0);
    for (const column of layout) {
      expect(column.width).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(column.width)).toBe(true);
    }
  });
});
