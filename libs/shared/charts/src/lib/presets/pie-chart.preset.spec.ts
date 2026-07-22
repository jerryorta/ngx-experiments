import type { NgeChartConfig, NgePieDataPoint, NgePieLayerConfig } from '../core/config';

import { renderPieLayer } from '../layers/pie';
import { createPieChartConfig } from './pie-chart.preset';

const DATA: NgePieDataPoint[] = [
  { label: 'A', value: 30 },
  { label: 'B', value: 20 },
  { label: 'C', value: 50 },
];

/** Narrow the pie layer the preset always emits. */
function pieLayerOf(config: NgeChartConfig): NgePieLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'pie') as NgePieLayerConfig;
}

describe('createPieChartConfig', () => {
  it('wires the pie renderer and type', () => {
    const config = createPieChartConfig({ data: DATA });

    const layer = pieLayerOf(config);
    expect(layer.type).toBe('pie');
    expect(layer.renderer).toBe(renderPieLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (radial layout)', () => {
    const config = createPieChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createPieChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('flows the family options (donut / semi-circle / palette) through to the layer', () => {
    const onClick = jest.fn();
    const layer = pieLayerOf(
      createPieChartConfig({
        data: DATA,
        endAngle: Math.PI / 2,
        innerRadius: 0.6,
        onClick,
        padAngle: 0.02,
        seriesColors: ['#111', '#222'],
        startAngle: -Math.PI / 2,
      })
    );

    expect(layer.innerRadius).toBe(0.6);
    expect(layer.startAngle).toBe(-Math.PI / 2);
    expect(layer.endAngle).toBe(Math.PI / 2);
    expect(layer.padAngle).toBe(0.02);
    expect(layer.seriesColors).toEqual(['#111', '#222']);
    expect(layer.onClick).toBe(onClick);
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = pieLayerOf(createPieChartConfig({ data: DATA, tooltip: { enabled: true } }));

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
    // The default formatter renders label + stringified value.
    expect(layer.tooltip?.formatContent?.({ label: 'Rent', value: 1800 })).toEqual({
      label: 'Rent',
      value: '1800',
    });
  });

  it('omits the tooltip config by default', () => {
    expect(pieLayerOf(createPieChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });
});
