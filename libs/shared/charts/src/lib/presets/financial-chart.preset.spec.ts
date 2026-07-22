import type { ScaleBand, ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeFinancialDataPoint,
  NgeFinancialLayerConfig,
} from '../core/config';

import { renderFinancialLayer } from '../layers/financial';
import { createFinancialChartConfig } from './financial-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const DATA: NgeFinancialDataPoint[] = [
  { close: 13, date: '2024-01-01', high: 14, low: 9, open: 10 },
  { close: 11, date: '2024-01-02', high: 15, low: 11, open: 13 },
];

/** Narrow the financial layer the preset always emits. */
function financialLayerOf(config: NgeChartConfig): NgeFinancialLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'financial') as NgeFinancialLayerConfig;
}

describe('createFinancialChartConfig', () => {
  it('wires the financial renderer, type, and a scale factory', () => {
    const config = createFinancialChartConfig({ data: DATA });

    const layer = financialLayerOf(config);
    expect(layer.type).toBe('financial');
    expect(layer.renderer).toBe(renderFinancialLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('renders a single layer with axes on by default', () => {
    const config = createFinancialChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
  });

  it('passes variant / candle / kagi / renko options through to the layer', () => {
    const layer = financialLayerOf(
      createFinancialChartConfig({
        brickSize: 3,
        candleWidth: 0.8,
        data: DATA,
        reversalAsPercent: true,
        reversalThreshold: 0.05,
        variant: 'renko',
      })
    );

    expect(layer.variant).toBe('renko');
    expect(layer.candleWidth).toBe(0.8);
    expect(layer.brickSize).toBe(3);
    expect(layer.reversalThreshold).toBe(0.05);
    expect(layer.reversalAsPercent).toBe(true);
  });

  it('builds a tooltip config with a default date/close formatter when showTooltip is set', () => {
    const layer = financialLayerOf(createFinancialChartConfig({ data: DATA, showTooltip: true }));

    expect(layer.tooltip?.enabled).toBe(true);
    expect(layer.tooltip?.formatContent?.(DATA[0])).toEqual({
      label: '2024-01-01',
      value: 13,
    });
  });

  it('omits the tooltip config by default', () => {
    expect(financialLayerOf(createFinancialChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });

  it('exposes a scale factory: sequence band on x, linear price on y', () => {
    const config = createFinancialChartConfig({ data: DATA });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    const band = scales.x as ScaleBand<string>;
    expect(typeof band.bandwidth).toBe('function');
    // One slot per candle.
    expect(band.domain()).toEqual(['0', '1']);
    expect(typeof (scales.y as ScaleLinear<number, number>).invert).toBe('function');
  });
});
