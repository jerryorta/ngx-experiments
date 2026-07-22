import type { NgeChartConfig, NgeHierarchyDatum, NgeSunburstLayerConfig } from '../core/config';

import { renderSunburstLayer } from '../layers/sunburst';
import { createSunburstChartConfig } from './sunburst-chart.preset';

const DATA: NgeHierarchyDatum[] = [
  {
    children: [
      { label: 'A1', value: 30 },
      { label: 'A2', value: 20 },
    ],
    label: 'A',
  },
  { label: 'B', value: 25 },
];

/** Narrow the sunburst layer the preset always emits. */
function sunburstLayerOf(config: NgeChartConfig): NgeSunburstLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'sunburst') as NgeSunburstLayerConfig;
}

describe('createSunburstChartConfig', () => {
  it('wires the sunburst renderer and type', () => {
    const config = createSunburstChartConfig({ data: DATA });

    const layer = sunburstLayerOf(config);
    expect(layer.type).toBe('sunburst');
    expect(layer.renderer).toBe(renderSunburstLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (radial layout)', () => {
    const config = createSunburstChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createSunburstChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('flows the family options (layout / donut / palette / depth) through to the layer', () => {
    const onClick = jest.fn();
    const layer = sunburstLayerOf(
      createSunburstChartConfig({
        data: DATA,
        endAngle: Math.PI / 2,
        innerRadius: 0.6,
        layout: 'linear',
        maxDepth: 2,
        onClick,
        padAngle: 0.02,
        seriesColors: ['#111', '#222'],
        startAngle: -Math.PI / 2,
      })
    );

    expect(layer.layout).toBe('linear');
    expect(layer.innerRadius).toBe(0.6);
    expect(layer.startAngle).toBe(-Math.PI / 2);
    expect(layer.endAngle).toBe(Math.PI / 2);
    expect(layer.padAngle).toBe(0.02);
    expect(layer.maxDepth).toBe(2);
    expect(layer.seriesColors).toEqual(['#111', '#222']);
    expect(layer.onClick).toBe(onClick);
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = sunburstLayerOf(
      createSunburstChartConfig({ data: DATA, tooltip: { enabled: true } })
    );

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
    // The default formatter renders label + stringified value.
    expect(layer.tooltip?.formatContent?.({ label: 'Rent', value: 1800 })).toEqual({
      label: 'Rent',
      value: '1800',
    });
  });

  it('omits the tooltip config by default', () => {
    expect(sunburstLayerOf(createSunburstChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });
});
