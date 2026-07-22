import type { NgeChartConfig, NgeGaugeDataPoint, NgeGaugeLayerConfig } from '../core/config';

import { renderGaugeLayer } from '../layers/gauge';
import { createGaugeChartConfig } from './gauge-chart.preset';

const DATA: NgeGaugeDataPoint = { max: 100, min: 0, units: '%', value: 72 };

/** Narrow the gauge layer the preset always emits. */
function gaugeLayerOf(config: NgeChartConfig): NgeGaugeLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'gauge') as NgeGaugeLayerConfig;
}

describe('createGaugeChartConfig', () => {
  it('wires the gauge renderer and type', () => {
    const config = createGaugeChartConfig({ data: DATA });

    const layer = gaugeLayerOf(config);
    expect(layer.type).toBe('gauge');
    expect(layer.renderer).toBe(renderGaugeLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (self-scaled layout)', () => {
    const config = createGaugeChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createGaugeChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('flows the family options (shape / indicator / geometry / thresholds) through to the layer', () => {
    const onClick = jest.fn();
    const thresholds = [{ value: 50 }, { value: 100 }];
    const layer = gaugeLayerOf(
      createGaugeChartConfig({
        data: DATA,
        endAngle: Math.PI,
        indicator: 'needle',
        innerRadius: 0.5,
        onClick,
        shape: 'arc',
        showValueLabel: false,
        startAngle: 0,
        thresholds,
      })
    );

    expect(layer.shape).toBe('arc');
    expect(layer.indicator).toBe('needle');
    expect(layer.innerRadius).toBe(0.5);
    expect(layer.startAngle).toBe(0);
    expect(layer.endAngle).toBe(Math.PI);
    expect(layer.showValueLabel).toBe(false);
    expect(layer.thresholds).toBe(thresholds);
    expect(layer.onClick).toBe(onClick);
  });

  it('leaves shape / indicator unset by default (renderer defaults to arc / fill)', () => {
    const layer = gaugeLayerOf(createGaugeChartConfig({ data: DATA }));

    expect(layer.shape).toBeUndefined();
    expect(layer.indicator).toBeUndefined();
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = gaugeLayerOf(createGaugeChartConfig({ data: DATA, tooltip: { enabled: true } }));

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
    // The default formatter renders label + value with a units suffix.
    expect(
      layer.tooltip?.formatContent?.({ label: 'Load', max: 100, min: 0, units: '%', value: 72 })
    ).toEqual({
      label: 'Load',
      value: '72 %',
    });
  });

  it('falls back to a generic label when the datum carries none', () => {
    const layer = gaugeLayerOf(createGaugeChartConfig({ data: DATA, tooltip: { enabled: true } }));

    expect(layer.tooltip?.formatContent?.({ max: 100, min: 0, value: 40 })).toEqual({
      label: 'Value',
      value: '40',
    });
  });

  it('omits the tooltip config by default', () => {
    expect(gaugeLayerOf(createGaugeChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });
});
