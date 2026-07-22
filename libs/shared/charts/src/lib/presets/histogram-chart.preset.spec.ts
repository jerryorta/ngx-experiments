import type { ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeHistogramDataPoint,
  NgeHistogramLayerConfig,
} from '../core/config';

import { renderHistogramLayer } from '../layers/histogram';
import { createHistogramChartConfig } from './histogram-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const DATA: NgeHistogramDataPoint[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(value => ({ value }));

/** Narrow the histogram layer the preset always emits. */
function histogramLayerOf(config: NgeChartConfig): NgeHistogramLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'histogram') as NgeHistogramLayerConfig;
}

describe('createHistogramChartConfig', () => {
  it('wires the histogram renderer, type, and a scale factory', () => {
    const config = createHistogramChartConfig({ data: DATA });

    const layer = histogramLayerOf(config);
    expect(layer.type).toBe('histogram');
    expect(layer.renderer).toBe(renderHistogramLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('renders a single layer with axes on by default', () => {
    const config = createHistogramChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
    expect(config.base?.yAxisLabel).toBe('Frequency');
  });

  it('defaults to histogram mode', () => {
    expect(histogramLayerOf(createHistogramChartConfig({ data: DATA })).mode).toBe('histogram');
  });

  it('passes binning + mode + gap options through to the layer', () => {
    const layer = histogramLayerOf(
      createHistogramChartConfig({
        barGap: 4,
        binCount: 8,
        data: DATA,
        domain: [0, 10],
        mode: 'rootogram',
        thresholds: [2, 4, 6, 8],
      })
    );

    expect(layer.binCount).toBe(8);
    expect(layer.thresholds).toEqual([2, 4, 6, 8]);
    expect(layer.domain).toEqual([0, 10]);
    expect(layer.mode).toBe('rootogram');
    expect(layer.barGap).toBe(4);
  });

  it('builds a tooltip config with a default range/count formatter when showTooltip is set', () => {
    const layer = histogramLayerOf(createHistogramChartConfig({ data: DATA, showTooltip: true }));

    expect(layer.tooltip?.enabled).toBe(true);
    expect(layer.tooltip?.formatContent?.({ count: 7, x0: 2, x1: 4 })).toEqual({
      label: '2–4',
      value: 7,
    });
  });

  it('omits the tooltip config by default', () => {
    expect(histogramLayerOf(createHistogramChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });

  it('exposes a scale factory over the bin extent and count range', () => {
    const config = createHistogramChartConfig({ binCount: 5, data: DATA, domain: [0, 10] });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect(scales.x.domain()).toEqual([0, 10]);
    expect(scales.y.domain()).toEqual([0, 3]);
    // Linear (continuous) x — not a band scale.
    expect((scales.x as ScaleLinear<number, number>).invert(0)).toBeCloseTo(0, 6);
  });
});
