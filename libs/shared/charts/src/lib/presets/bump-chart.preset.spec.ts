import type { ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeBumpDataPoint, NgeBumpLayerConfig, NgeChartConfig } from '../core/config';

import { BUMP_RANK_EDGE_INSET } from '../nge-chart/nge-chart.bump.helpers';
import { renderBumpLayer } from '../layers/bump';
import { createBumpChartConfig } from './bump-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 45, left: 45, right: 24, top: 20 },
  width: 560,
};

const DATA: NgeBumpDataPoint[] = [
  { seriesId: 'North', value: 42, x: 'Q1' },
  { seriesId: 'South', value: 30, x: 'Q1' },
  { seriesId: 'North', value: 25, x: 'Q2' },
  { seriesId: 'South', value: 51, x: 'Q2' },
];

/** Narrow the bump layer the preset always emits. */
function bumpLayerOf(config: NgeChartConfig): NgeBumpLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'bump') as NgeBumpLayerConfig;
}

describe('createBumpChartConfig', () => {
  it('wires the bump renderer, type, and a scale factory', () => {
    const config = createBumpChartConfig({ data: DATA });

    const layer = bumpLayerOf(config);
    expect(layer.type).toBe('bump');
    expect(layer.renderer).toBe(renderBumpLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('renders a single layer with axes on by default', () => {
    const config = createBumpChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
  });

  it('passes curve / rank / point / label options through to the layer', () => {
    const layer = bumpLayerOf(
      createBumpChartConfig({
        curveType: 'linear',
        data: DATA,
        pointRadius: 7,
        rankOrder: 'asc',
        seriesColors: ['#abc'],
        showLabels: false,
        showPoints: false,
      })
    );

    expect(layer.curveType).toBe('linear');
    expect(layer.rankOrder).toBe('asc');
    expect(layer.pointRadius).toBe(7);
    expect(layer.seriesColors).toEqual(['#abc']);
    expect(layer.showLabels).toBe(false);
    expect(layer.showPoints).toBe(false);
  });

  it('defaults curve to bump and shows points + labels', () => {
    const layer = bumpLayerOf(createBumpChartConfig({ data: DATA }));

    expect(layer.curveType).toBe('bump');
    expect(layer.rankOrder).toBe('desc');
    expect(layer.showLabels).toBe(true);
    expect(layer.showPoints).toBe(true);
  });

  it('builds a tooltip config with a default series/rank formatter when enabled', () => {
    const layer = bumpLayerOf(createBumpChartConfig({ data: DATA, tooltip: { enabled: true } }));

    expect(layer.tooltip?.enabled).toBe(true);
    // The renderer hands the formatter a datum with the derived rank filled in.
    expect(layer.tooltip?.formatContent?.({ ...DATA[0], rank: 1 })).toEqual({
      extra: { seriesId: 'North', value: 42 },
      label: 'North · Q1',
      value: '#1',
    });
  });

  it('omits the tooltip config by default', () => {
    expect(bumpLayerOf(createBumpChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });

  it('exposes a scale factory: point x, rank y with rank 1 near the top', () => {
    const config = createBumpChartConfig({ data: DATA });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect(scales.x.domain()).toEqual(['Q1', 'Q2']);
    expect(scales.y.domain()).toEqual([1, 2]);
    const yScale = scales.y as ScaleLinear<number, number>;
    // Rank 1 sits at the inset top edge (the clip-clearance inset), not y = 0.
    expect(yScale(1)).toBeCloseTo(BUMP_RANK_EDGE_INSET, 6);
  });

  it('labels the y axis with integer ranks only', () => {
    const config = createBumpChartConfig({ data: DATA });

    // N = 2 series → 2 rank ticks; fractional ticks are dropped.
    expect(config.base?.yAxisTicks).toBe(2);
    expect(config.base?.yAxisTickFormat?.(2)).toBe('2');
    expect(config.base?.yAxisTickFormat?.(1.5)).toBe('');
  });

  it('builds legend items per series when the legend is enabled', () => {
    const config = createBumpChartConfig({ data: DATA, legend: { enabled: true } });

    expect(config.legend?.items).toEqual([
      { color: 'var(--chart-primary)', id: 'North', label: 'North' },
      { color: 'var(--chart-secondary)', id: 'South', label: 'South' },
    ]);
  });

  it('cycles the theme palette for legend swatches when seriesColors is empty', () => {
    // An empty seriesColors is treated as unset on BOTH sides — swatches match the lines.
    const config = createBumpChartConfig({
      data: DATA,
      legend: { enabled: true },
      seriesColors: [],
    });

    expect(config.legend?.items).toEqual([
      { color: 'var(--chart-primary)', id: 'North', label: 'North' },
      { color: 'var(--chart-secondary)', id: 'South', label: 'South' },
    ]);
  });
});
