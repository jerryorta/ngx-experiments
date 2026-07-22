import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeAreaDataPoint, NgeAreaLayerConfig } from '../core/config';

import { renderAreaLayer } from '../layers/area';
import { createAreaChartConfig } from './area-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Narrow the first layer to the area config it always is for this preset. */
function areaLayerOf(config: ReturnType<typeof createAreaChartConfig>): NgeAreaLayerConfig {
  return config.layers.flat()[0] as NgeAreaLayerConfig;
}

describe('createAreaChartConfig', () => {
  it('wires the area renderer, type, and a scale factory', () => {
    const config = createAreaChartConfig({
      data: [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
      ],
    });

    const layer = areaLayerOf(config);
    expect(layer.type).toBe('area');
    expect(layer.renderer).toBe(renderAreaLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('defaults curveType to linear and showLine to false', () => {
    const layer = areaLayerOf(createAreaChartConfig({ data: [{ x: 0, y: 10 }] }));

    expect(layer.curveType).toBe('linear');
    expect(layer.showLine).toBe(false);
  });

  it('passes stackOffset, fillOpacity, and seriesColors through to the layer', () => {
    const layer = areaLayerOf(
      createAreaChartConfig({
        data: [
          { seriesId: 'A', x: 0, y: 10 },
          { seriesId: 'B', x: 0, y: 5 },
        ],
        fillOpacity: 0.5,
        seriesColors: ['var(--a)', 'var(--b)'],
        stackOffset: 'wiggle',
      })
    );

    expect(layer.stackOffset).toBe('wiggle');
    expect(layer.fillOpacity).toBe(0.5);
    expect(layer.seriesColors).toEqual(['var(--a)', 'var(--b)']);
  });

  it('forwards base axis/grid flags', () => {
    const config = createAreaChartConfig({
      data: [{ x: 0, y: 10 }],
      showXAxis: true,
      showYAxis: true,
      showYGrid: true,
      xAxisLabel: 'Month',
      yAxisLabel: 'Value',
    });

    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
    expect(config.base?.showYGrid).toBe(true);
    expect(config.base?.xAxisLabel).toBe('Month');
    expect(config.base?.yAxisLabel).toBe('Value');
  });

  it('auto-populates one legend item per series when the legend is enabled', () => {
    const data: NgeAreaDataPoint[] = [
      { seriesId: 'North', x: 0, y: 10 },
      { seriesId: 'South', x: 0, y: 5 },
      { seriesId: 'North', x: 1, y: 12 },
      { seriesId: 'South', x: 1, y: 7 },
    ];

    const config = createAreaChartConfig({ data, legend: { enabled: true } });

    expect(config.legend?.enabled).toBe(true);
    expect(config.legend?.items.map(i => i.label)).toEqual(['North', 'South']);
  });

  it('produces an empty legend for single-series data', () => {
    const config = createAreaChartConfig({
      data: [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
      ],
      legend: { enabled: true },
    });

    expect(config.legend?.items).toEqual([]);
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = areaLayerOf(
      createAreaChartConfig({ data: [{ x: 0, y: 10 }], tooltip: { enabled: true } })
    );

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
  });

  it('omits the tooltip config when not enabled', () => {
    const layer = areaLayerOf(createAreaChartConfig({ data: [{ x: 0, y: 10 }] }));

    expect(layer.tooltip).toBeUndefined();
  });

  it('exposes a scale factory that produces x and y scales', () => {
    const config = createAreaChartConfig({
      data: [
        { x: 0, y: 10 },
        { x: 1, y: 20 },
      ],
    });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect(scales.x).toBeDefined();
    expect(scales.y.domain()).toEqual([0, 20]);
  });
});
