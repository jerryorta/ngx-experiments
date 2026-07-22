import type { ScaleBand, ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeDistributionDataPoint,
  NgeDistributionLayerConfig,
} from '../core/config';

import { renderDistributionLayer } from '../layers/distribution';
import { createDistributionChartConfig } from './distribution-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const DATA: NgeDistributionDataPoint[] = [
  { category: 'A', values: [10, 12, 12, 13, 14, 40] },
  { category: 'B', values: [5, 6, 7, 8, 9] },
];

/** Narrow the distribution layer the preset always emits. */
function distributionLayerOf(config: NgeChartConfig): NgeDistributionLayerConfig {
  return config.layers
    .flat()
    .find(layer => layer.type === 'distribution') as NgeDistributionLayerConfig;
}

describe('createDistributionChartConfig', () => {
  it('wires the distribution renderer, type, and a scale factory', () => {
    const config = createDistributionChartConfig({ data: DATA });

    const layer = distributionLayerOf(config);
    expect(layer.type).toBe('distribution');
    expect(layer.renderer).toBe(renderDistributionLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('renders a single layer with axes on by default', () => {
    const config = createDistributionChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
  });

  it('passes render / box / violin / points options through to the layer', () => {
    const layer = distributionLayerOf(
      createDistributionChartConfig({
        boxWidth: 0.8,
        data: DATA,
        jitter: 'uniform',
        jitterWidth: 0.5,
        kdeBandwidth: 2,
        kdeKernel: 'gaussian',
        kdeResolution: 64,
        pointRadius: 4,
        render: 'violin',
        showBox: false,
        showInnerBox: false,
        showMean: true,
        showOutliers: false,
        whiskerStat: 'stddev',
      })
    );

    expect(layer.render).toBe('violin');
    expect(layer.boxWidth).toBe(0.8);
    expect(layer.whiskerStat).toBe('stddev');
    expect(layer.showBox).toBe(false);
    expect(layer.showInnerBox).toBe(false);
    expect(layer.showMean).toBe(true);
    expect(layer.showOutliers).toBe(false);
    expect(layer.kdeBandwidth).toBe(2);
    expect(layer.kdeKernel).toBe('gaussian');
    expect(layer.kdeResolution).toBe(64);
    expect(layer.jitter).toBe('uniform');
    expect(layer.jitterWidth).toBe(0.5);
    expect(layer.pointRadius).toBe(4);
  });

  it('builds a tooltip config with a default category/median formatter when showTooltip is set', () => {
    const layer = distributionLayerOf(
      createDistributionChartConfig({ data: DATA, showTooltip: true })
    );

    expect(layer.tooltip?.enabled).toBe(true);
    // Category 'B' median is 7.
    expect(layer.tooltip?.formatContent?.({ category: 'B', values: [5, 6, 7, 8, 9] })).toEqual({
      label: 'B',
      value: 7,
    });
  });

  it('omits the tooltip config by default', () => {
    expect(
      distributionLayerOf(createDistributionChartConfig({ data: DATA })).tooltip
    ).toBeUndefined();
  });

  it('exposes a vertical scale factory: band on x, linear on y', () => {
    const config = createDistributionChartConfig({ data: DATA });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    const band = scales.x as ScaleBand<string>;
    expect(typeof band.bandwidth).toBe('function');
    expect(band.domain()).toEqual(['A', 'B']);
    expect(typeof (scales.y as ScaleLinear<number, number>).invert).toBe('function');
  });

  it('swaps the axes for horizontal orientation: linear on x, band on y', () => {
    const config = createDistributionChartConfig({ data: DATA, orientation: 'horizontal' });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    const band = scales.y as ScaleBand<string>;
    expect(typeof band.bandwidth).toBe('function');
    expect(band.domain()).toEqual(['A', 'B']);
    expect(typeof (scales.x as ScaleLinear<number, number>).invert).toBe('function');
  });
});
