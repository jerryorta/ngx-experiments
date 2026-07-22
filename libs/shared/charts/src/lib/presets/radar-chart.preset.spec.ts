import type { NgeChartConfig, NgeRadarDataPoint, NgeRadarLayerConfig } from '../core/config';

import { renderRadarLayer } from '../layers/radar';
import { createRadarChartConfig } from './radar-chart.preset';

const DATA: NgeRadarDataPoint[] = [
  { label: 'Speed', seriesId: 'A', value: 80 },
  { label: 'Power', seriesId: 'A', value: 60 },
  { label: 'Range', seriesId: 'A', value: 45 },
];

/** Narrow the radar layer the preset always emits. */
function radarLayerOf(config: NgeChartConfig): NgeRadarLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'radar') as NgeRadarLayerConfig;
}

describe('createRadarChartConfig', () => {
  it('wires the radar renderer and type', () => {
    const config = createRadarChartConfig({ data: DATA });

    const layer = radarLayerOf(config);
    expect(layer.type).toBe('radar');
    expect(layer.renderer).toBe(renderRadarLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (radial layout)', () => {
    const config = createRadarChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin (room for the axis labels)', () => {
    const config = createRadarChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 40, left: 40, right: 40, top: 40 });
  });

  it('flows the radar knobs (render / geometry / levels / palette) through to the layer', () => {
    const onClick = jest.fn();
    const layer = radarLayerOf(
      createRadarChartConfig({
        data: DATA,
        endAngle: Math.PI,
        fillOpacity: 0.5,
        innerRadius: 0.2,
        levels: 4,
        onClick,
        render: 'line',
        seriesColors: ['#111', '#222'],
        startAngle: 0,
      })
    );

    expect(layer.render).toBe('line');
    expect(layer.innerRadius).toBe(0.2);
    expect(layer.levels).toBe(4);
    expect(layer.fillOpacity).toBe(0.5);
    expect(layer.startAngle).toBe(0);
    expect(layer.endAngle).toBe(Math.PI);
    expect(layer.seriesColors).toEqual(['#111', '#222']);
    expect(layer.onClick).toBe(onClick);
  });

  it('leaves render unset by default (renderer defaults to area)', () => {
    const layer = radarLayerOf(createRadarChartConfig({ data: DATA }));

    expect(layer.render).toBeUndefined();
    expect(layer.levels).toBeUndefined();
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = radarLayerOf(createRadarChartConfig({ data: DATA, tooltip: { enabled: true } }));

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
    // The default formatter renders label + stringified value.
    expect(layer.tooltip?.formatContent?.({ label: 'Speed', value: 80 })).toEqual({
      label: 'Speed',
      value: '80',
    });
  });

  it('omits the tooltip config by default', () => {
    expect(radarLayerOf(createRadarChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });
});
