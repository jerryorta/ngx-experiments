import type { ScaleBand } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeChartConfig, NgeHeatmapDataPoint, NgeHeatmapLayerConfig } from '../core/config';

import { renderHeatmapLayer } from '../layers/heatmap';
import { createHeatmapChartConfig } from './heatmap-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const DATA: NgeHeatmapDataPoint[] = [
  { col: 'Mon', row: 'AM', value: 3 },
  { col: 'Tue', row: 'AM', value: 8 },
  { col: 'Mon', row: 'PM', value: null },
  { col: 'Tue', row: 'PM', value: 5 },
];

/** Narrow the heatmap layer the preset always emits. */
function heatmapLayerOf(config: NgeChartConfig): NgeHeatmapLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'heatmap') as NgeHeatmapLayerConfig;
}

describe('createHeatmapChartConfig', () => {
  it('wires the heatmap renderer, type, and a scale factory', () => {
    const config = createHeatmapChartConfig({ data: DATA });

    const layer = heatmapLayerOf(config);
    expect(layer.type).toBe('heatmap');
    expect(layer.renderer).toBe(renderHeatmapLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('renders a single layer with axes on by default', () => {
    const config = createHeatmapChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
  });

  it('passes mark / scheme / value options through to the layer', () => {
    const layer = heatmapLayerOf(
      createHeatmapChartConfig({
        bubbleMaxRatio: 0.6,
        data: DATA,
        domain: [0, 10],
        mark: 'bubble',
        scheme: 'viridis',
        showValues: true,
      })
    );

    expect(layer.mark).toBe('bubble');
    expect(layer.scheme).toBe('viridis');
    expect(layer.domain).toEqual([0, 10]);
    expect(layer.bubbleMaxRatio).toBe(0.6);
    expect(layer.showValues).toBe(true);
  });

  it('builds a tooltip config with a default row·col / value formatter when showTooltip is set', () => {
    const layer = heatmapLayerOf(createHeatmapChartConfig({ data: DATA, showTooltip: true }));

    expect(layer.tooltip?.enabled).toBe(true);
    expect(layer.tooltip?.formatContent?.({ col: 'Tue', row: 'PM', value: 5 })).toEqual({
      label: 'PM · Tue',
      value: 5,
    });
  });

  it('formats an empty (null-value) cell tooltip value as 0', () => {
    const layer = heatmapLayerOf(createHeatmapChartConfig({ data: DATA, showTooltip: true }));

    expect(layer.tooltip?.formatContent?.({ col: 'Mon', row: 'PM', value: null })).toEqual({
      label: 'PM · Mon',
      value: 0,
    });
  });

  it('omits the tooltip config by default', () => {
    expect(heatmapLayerOf(createHeatmapChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });

  it('exposes a band × band scale factory with ordered col / row domains', () => {
    const config = createHeatmapChartConfig({ data: DATA });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    const xBand = scales.x as ScaleBand<string>;
    const yBand = scales.y as ScaleBand<string>;
    expect(typeof xBand.bandwidth).toBe('function');
    expect(typeof yBand.bandwidth).toBe('function');
    expect(xBand.domain()).toEqual(['Mon', 'Tue']);
    expect(yBand.domain()).toEqual(['AM', 'PM']);
  });
});
