import type {
  NgeChartConfig,
  NgeRadialBarDataPoint,
  NgeRadialBarLayerConfig,
} from '../core/config';

import { renderRadialBarLayer } from '../layers/radial-bar';
import { createRadialBarChartConfig } from './radial-bar-chart.preset';

const DATA: NgeRadialBarDataPoint[] = [
  { label: 'A', value: 30 },
  { label: 'B', value: 20 },
  { label: 'C', value: 50 },
];

/** Narrow the radial-bar layer the preset always emits. */
function radialBarLayerOf(config: NgeChartConfig): NgeRadialBarLayerConfig {
  return config.layers
    .flat()
    .find(layer => layer.type === 'radial-bar') as NgeRadialBarLayerConfig;
}

describe('createRadialBarChartConfig', () => {
  it('wires the radial-bar renderer and type', () => {
    const config = createRadialBarChartConfig({ data: DATA });

    const layer = radialBarLayerOf(config);
    expect(layer.type).toBe('radial-bar');
    expect(layer.renderer).toBe(renderRadialBarLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (radial layout)', () => {
    const config = createRadialBarChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createRadialBarChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('flows the family options (mark / wedge / geometry / palette) through to the layer', () => {
    const onClick = jest.fn();
    const layer = radialBarLayerOf(
      createRadialBarChartConfig({
        data: DATA,
        endAngle: Math.PI,
        innerRadius: 0.3,
        mark: 'cell',
        onClick,
        padAngle: 0.02,
        seriesColors: ['#111', '#222'],
        startAngle: 0,
        wedge: 'value',
      })
    );

    expect(layer.mark).toBe('cell');
    expect(layer.wedge).toBe('value');
    expect(layer.innerRadius).toBe(0.3);
    expect(layer.startAngle).toBe(0);
    expect(layer.endAngle).toBe(Math.PI);
    expect(layer.padAngle).toBe(0.02);
    expect(layer.seriesColors).toEqual(['#111', '#222']);
    expect(layer.onClick).toBe(onClick);
  });

  it('leaves mark / wedge unset by default (renderer defaults to bar / equal)', () => {
    const layer = radialBarLayerOf(createRadialBarChartConfig({ data: DATA }));

    expect(layer.mark).toBeUndefined();
    expect(layer.wedge).toBeUndefined();
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = radialBarLayerOf(
      createRadialBarChartConfig({ data: DATA, tooltip: { enabled: true } })
    );

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
    // The default formatter renders label + stringified value.
    expect(layer.tooltip?.formatContent?.({ label: 'Mon', value: 30 })).toEqual({
      label: 'Mon',
      value: '30',
    });
  });

  it('omits the tooltip config by default', () => {
    expect(radialBarLayerOf(createRadialBarChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });
});
