import type { ScaleLinear, ScaleTime } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeBumpDataPoint, NgeBumpLayerConfig, NgeChartConfig } from '../core/config';

import {
  BUMP_END_LABEL_GUTTER,
  BUMP_RANK_EDGE_INSET,
  computeBumpMaxRank,
  createBumpChartScalesFactory,
  deriveBumpRanks,
  type RankedBumpPoint,
} from './nge-chart.bump.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Build a minimal single-bump-layer chart config for the scale factory. */
function bumpConfig(
  data: NgeBumpDataPoint[],
  overrides?: Partial<NgeBumpLayerConfig>
): NgeChartConfig {
  const layer: NgeBumpLayerConfig = {
    data,
    renderer: () => undefined,
    type: 'bump',
    ...overrides,
  };
  return { layers: [layer] };
}

/** Resolve one point's rank by series (and optionally x) from a derivation. */
function rankOf(
  ranked: RankedBumpPoint[],
  seriesId: string,
  x?: Date | number | string
): number | undefined {
  return ranked.find(
    point => point.datum.seriesId === seriesId && (x === undefined || point.datum.x === x)
  )?.rank;
}

describe('deriveBumpRanks', () => {
  it('ranks the highest value as rank 1 per x-tick (desc default)', () => {
    const ranked = deriveBumpRanks([
      { seriesId: 'A', value: 10, x: 'Q1' },
      { seriesId: 'B', value: 30, x: 'Q1' },
      { seriesId: 'C', value: 20, x: 'Q1' },
    ]);

    expect(rankOf(ranked, 'B')).toBe(1);
    expect(rankOf(ranked, 'C')).toBe(2);
    expect(rankOf(ranked, 'A')).toBe(3);
  });

  it('ranks the lowest value as rank 1 when rankOrder is asc', () => {
    const ranked = deriveBumpRanks(
      [
        { seriesId: 'A', value: 10, x: 'Q1' },
        { seriesId: 'B', value: 30, x: 'Q1' },
        { seriesId: 'C', value: 20, x: 'Q1' },
      ],
      'asc'
    );

    expect(rankOf(ranked, 'A')).toBe(1);
    expect(rankOf(ranked, 'C')).toBe(2);
    expect(rankOf(ranked, 'B')).toBe(3);
  });

  it('breaks ties deterministically by seriesId (ascending)', () => {
    // B and A both 20 → A (seriesId asc) takes the lower rank, stable across renders.
    const ranked = deriveBumpRanks([
      { seriesId: 'B', value: 20, x: 'Q1' },
      { seriesId: 'A', value: 20, x: 'Q1' },
      { seriesId: 'C', value: 10, x: 'Q1' },
    ]);

    expect(rankOf(ranked, 'A')).toBe(1);
    expect(rankOf(ranked, 'B')).toBe(2);
    expect(rankOf(ranked, 'C')).toBe(3);
  });

  it('ranks only the series present at each x (missing points close the gap)', () => {
    // B is absent at Q2 → A is the sole (rank 1) series there.
    const ranked = deriveBumpRanks([
      { seriesId: 'A', value: 10, x: 'Q1' },
      { seriesId: 'B', value: 20, x: 'Q1' },
      { seriesId: 'A', value: 5, x: 'Q2' },
    ]);

    expect(rankOf(ranked, 'B', 'Q1')).toBe(1);
    expect(rankOf(ranked, 'A', 'Q1')).toBe(2);
    expect(rankOf(ranked, 'A', 'Q2')).toBe(1);
  });

  it('honours an explicit rank verbatim (derived rank is used only when omitted)', () => {
    // A's value (10) would derive rank 2, but the explicit rank 5 wins.
    const ranked = deriveBumpRanks([
      { rank: 5, seriesId: 'A', value: 10, x: 'Q1' },
      { seriesId: 'B', value: 30, x: 'Q1' },
    ]);

    expect(rankOf(ranked, 'A')).toBe(5);
    expect(rankOf(ranked, 'B')).toBe(1);
  });

  it('groups by x type without colliding a numeric x with its string form', () => {
    const ranked = deriveBumpRanks([
      { seriesId: 'A', value: 10, x: 1 },
      { seriesId: 'B', value: 20, x: '1' },
    ]);

    // Distinct x-ticks (number 1 vs string '1') → each series is the sole rank 1.
    expect(rankOf(ranked, 'A', 1)).toBe(1);
    expect(rankOf(ranked, 'B', '1')).toBe(1);
  });

  it('returns an empty array for no data', () => {
    expect(deriveBumpRanks([])).toEqual([]);
  });
});

describe('computeBumpMaxRank', () => {
  it('is the largest per-x series count', () => {
    // Q1 has 3 series, Q2 has 2 → N = 3.
    expect(
      computeBumpMaxRank([
        { seriesId: 'A', value: 10, x: 'Q1' },
        { seriesId: 'B', value: 20, x: 'Q1' },
        { seriesId: 'C', value: 30, x: 'Q1' },
        { seriesId: 'A', value: 5, x: 'Q2' },
        { seriesId: 'B', value: 8, x: 'Q2' },
      ])
    ).toBe(3);
  });

  it('expands to an explicit rank beyond the series count', () => {
    expect(
      computeBumpMaxRank([
        { rank: 8, seriesId: 'A', value: 10, x: 'Q1' },
        { seriesId: 'B', value: 20, x: 'Q1' },
      ])
    ).toBe(8);
  });

  it('is 0 for empty data', () => {
    expect(computeBumpMaxRank([])).toBe(0);
  });
});

describe('createBumpChartScalesFactory', () => {
  it('builds a point x scale for string x and a rank y scale with rank 1 at the top', () => {
    const scales = createBumpChartScalesFactory({})(
      bumpConfig([
        { seriesId: 'A', value: 10, x: 'Q1' },
        { seriesId: 'B', value: 20, x: 'Q1' },
        { seriesId: 'C', value: 30, x: 'Q1' },
        { seriesId: 'A', value: 5, x: 'Q2' },
        { seriesId: 'B', value: 8, x: 'Q2' },
        { seriesId: 'C', value: 3, x: 'Q2' },
      ]),
      DIMENSIONS
    );

    expect(scales.x.domain()).toEqual(['Q1', 'Q2']);
    expect(scales.x.range()).toEqual([0, 500]);
    // Rank domain [1, N=3] → range inset from the clipped edges: rank 1 near the top
    // (y = inset), rank 3 near the bottom (y = boundedHeight − inset).
    expect(scales.y.domain()).toEqual([1, 3]);
    expect(scales.y.range()).toEqual([BUMP_RANK_EDGE_INSET, 300 - BUMP_RANK_EDGE_INSET]);
    const yScale = scales.y as ScaleLinear<number, number>;
    expect(yScale(1)).toBeCloseTo(BUMP_RANK_EDGE_INSET, 6);
    expect(yScale(3)).toBeCloseTo(300 - BUMP_RANK_EDGE_INSET, 6);
    expect(yScale(2)).toBeCloseTo(150, 6);
  });

  it('clamps the rank domain so a single-series (N=1) chart seats rank 1 at the top', () => {
    const scales = createBumpChartScalesFactory({})(
      bumpConfig([
        { seriesId: 'Solo', value: 10, x: 'Q1' },
        { seriesId: 'Solo', value: 20, x: 'Q2' },
      ]),
      DIMENSIONS
    );

    // N = 1 clamps to a [1, 2] domain so rank 1 maps to the inset top, not the midpoint.
    expect(scales.y.domain()).toEqual([1, 2]);
    const yScale = scales.y as ScaleLinear<number, number>;
    expect(yScale(1)).toBeCloseTo(BUMP_RANK_EDGE_INSET, 6);
  });

  it('builds a linear x scale for numeric x', () => {
    const scales = createBumpChartScalesFactory({})(
      bumpConfig([
        { seriesId: 'A', value: 10, x: 1 },
        { seriesId: 'B', value: 20, x: 1 },
        { seriesId: 'A', value: 30, x: 4 },
        { seriesId: 'B', value: 5, x: 4 },
      ]),
      DIMENSIONS
    );

    const xScale = scales.x as ScaleLinear<number, number>;
    expect(typeof xScale.invert).toBe('function');
    expect(xScale.domain()).toEqual([1, 4]);
    expect(xScale.range()).toEqual([0, 500]);
  });

  it('builds a time x scale for Date x', () => {
    const jan = new Date('2024-01-01');
    const feb = new Date('2024-02-01');
    const scales = createBumpChartScalesFactory({})(
      bumpConfig([
        { seriesId: 'A', value: 10, x: jan },
        { seriesId: 'B', value: 20, x: jan },
        { seriesId: 'A', value: 30, x: feb },
        { seriesId: 'B', value: 5, x: feb },
      ]),
      DIMENSIONS
    );

    const xScale = scales.x as ScaleTime<number, number>;
    expect(xScale(jan)).toBeCloseTo(0, 6);
    expect(xScale(feb)).toBeCloseTo(500, 6);
  });

  it('reserves a right-edge label gutter when a layer shows labels', () => {
    const scales = createBumpChartScalesFactory({})(
      bumpConfig(
        [
          { seriesId: 'A', value: 10, x: 'Q1' },
          { seriesId: 'B', value: 20, x: 'Q1' },
        ],
        { showLabels: true }
      ),
      DIMENSIONS
    );

    expect(scales.x.range()).toEqual([0, 500 - BUMP_END_LABEL_GUTTER]);
  });

  it('spans the full width (no gutter) when labels are off', () => {
    const scales = createBumpChartScalesFactory({})(
      bumpConfig(
        [
          { seriesId: 'A', value: 10, x: 'Q1' },
          { seriesId: 'B', value: 20, x: 'Q1' },
        ],
        { showLabels: false }
      ),
      DIMENSIONS
    );

    expect(scales.x.range()).toEqual([0, 500]);
  });

  it('falls back to an empty x domain and a clamped [1, 2] rank domain with no data', () => {
    const scales = createBumpChartScalesFactory({})(bumpConfig([]), DIMENSIONS);

    expect(scales.x.domain()).toEqual([]);
    expect(scales.y.domain()).toEqual([1, 2]);
  });
});
