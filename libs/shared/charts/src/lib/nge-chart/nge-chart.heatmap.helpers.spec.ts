import type { ScaleBand } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeHeatmapDataPoint,
  NgeHeatmapLayerConfig,
  HeatmapColorScheme,
} from '../core/config';

import {
  computeHeatmapValueDomain,
  createHeatmapChartScalesFactory,
  HEATMAP_SCHEME_INTERPOLATORS,
} from './nge-chart.heatmap.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const GRID: NgeHeatmapDataPoint[] = [
  { col: 'Mon', row: 'AM', value: 1 },
  { col: 'Tue', row: 'AM', value: 2 },
  { col: 'Mon', row: 'PM', value: 3 },
];

/** A single heatmap layer wrapping the given cells. */
function layer(data: NgeHeatmapDataPoint[]): NgeHeatmapLayerConfig {
  return { data, renderer: () => undefined, type: 'heatmap' };
}

/** A minimal single-heatmap-layer chart config for the scale factory. */
function heatmapConfig(data: NgeHeatmapDataPoint[]): NgeChartConfig {
  return { layers: [layer(data)] };
}

describe('computeHeatmapValueDomain', () => {
  it('returns [0, 1] when there are no non-null values', () => {
    expect(computeHeatmapValueDomain([layer([])])).toEqual([0, 1]);
    expect(computeHeatmapValueDomain([layer([{ col: 'A', row: 'X', value: null }])])).toEqual([
      0, 1,
    ]);
  });

  it('expands a flat extent (every value identical) to [v, v + 1]', () => {
    const data: NgeHeatmapDataPoint[] = [
      { col: 'A', row: 'X', value: 4 },
      { col: 'B', row: 'X', value: 4 },
    ];

    expect(computeHeatmapValueDomain([layer(data)])).toEqual([4, 5]);
  });

  it('spans min/max of the non-null values, excluding nulls', () => {
    const data: NgeHeatmapDataPoint[] = [
      { col: 'A', row: 'X', value: 3 },
      { col: 'B', row: 'X', value: null },
      { col: 'A', row: 'Y', value: 9 },
      { col: 'B', row: 'Y', value: 1 },
    ];

    expect(computeHeatmapValueDomain([layer(data)])).toEqual([1, 9]);
  });

  it('spans negative through positive values', () => {
    const data: NgeHeatmapDataPoint[] = [
      { col: 'A', row: 'X', value: -8 },
      { col: 'B', row: 'X', value: 8 },
    ];

    expect(computeHeatmapValueDomain([layer(data)])).toEqual([-8, 8]);
  });

  it('folds multiple layers into one extent', () => {
    expect(
      computeHeatmapValueDomain([
        layer([{ col: 'A', row: 'X', value: 2 }]),
        layer([{ col: 'A', row: 'Y', value: 8 }]),
      ])
    ).toEqual([2, 8]);
  });
});

describe('createHeatmapChartScalesFactory', () => {
  it('returns band scales on BOTH axes', () => {
    const scales = createHeatmapChartScalesFactory({})(heatmapConfig(GRID), DIMENSIONS);

    expect(typeof (scales.x as ScaleBand<string>).bandwidth).toBe('function');
    expect(typeof (scales.y as ScaleBand<string>).bandwidth).toBe('function');
  });

  it('derives ordered col (x) and row (y) domains in first-occurrence order', () => {
    const scales = createHeatmapChartScalesFactory({})(heatmapConfig(GRID), DIMENSIONS);

    expect((scales.x as ScaleBand<string>).domain()).toEqual(['Mon', 'Tue']);
    expect((scales.y as ScaleBand<string>).domain()).toEqual(['AM', 'PM']);
  });

  it('ranges the bands across the bounded plot', () => {
    const scales = createHeatmapChartScalesFactory({})(heatmapConfig(GRID), DIMENSIONS);

    expect((scales.x as ScaleBand<string>).range()).toEqual([0, DIMENSIONS.boundedWidth]);
    expect((scales.y as ScaleBand<string>).range()).toEqual([0, DIMENSIONS.boundedHeight]);
  });

  it('applies the default 0.05 col / row padding', () => {
    const scales = createHeatmapChartScalesFactory({})(heatmapConfig(GRID), DIMENSIONS);

    expect((scales.x as ScaleBand<string>).padding()).toBeCloseTo(0.05, 6);
    expect((scales.y as ScaleBand<string>).padding()).toBeCloseTo(0.05, 6);
  });

  it('honours col / row padding overrides', () => {
    const scales = createHeatmapChartScalesFactory({ colPadding: 0.2, rowPadding: 0.3 })(
      heatmapConfig(GRID),
      DIMENSIONS
    );

    expect((scales.x as ScaleBand<string>).padding()).toBeCloseTo(0.2, 6);
    expect((scales.y as ScaleBand<string>).padding()).toBeCloseTo(0.3, 6);
  });
});

describe('HEATMAP_SCHEME_INTERPOLATORS', () => {
  const SCHEMES: HeatmapColorScheme[] = [
    'blues',
    'greens',
    'greys',
    'inferno',
    'magma',
    'oranges',
    'plasma',
    'purples',
    'reds',
    'viridis',
    'ylGnBu',
    'ylOrRd',
  ];

  it.each(SCHEMES)('maps %s to an interpolator returning a color string', scheme => {
    const interpolator = HEATMAP_SCHEME_INTERPOLATORS[scheme];

    expect(typeof interpolator).toBe('function');
    const color = interpolator(0.5);
    expect(typeof color).toBe('string');
    expect(color).toMatch(/^#|^rgb|^hsl/);
  });

  it('exposes exactly the 12 named schemes', () => {
    expect(Object.keys(HEATMAP_SCHEME_INTERPOLATORS).sort()).toEqual([...SCHEMES].sort());
  });
});
