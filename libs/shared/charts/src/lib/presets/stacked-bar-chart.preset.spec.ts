import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeStackedBarDataPoint, NgeStackedBarLayerConfig } from '../core/config';

import { renderStackedBarLayer } from '../layers/stacked-bar';
import { createStackedBarChartConfig } from './stacked-bar-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const DATA: NgeStackedBarDataPoint[] = [
  { category: 'Q1', seriesId: 'A', value: 10 },
  { category: 'Q1', seriesId: 'B', value: 20 },
  { category: 'Q2', seriesId: 'A', value: 10 },
  { category: 'Q2', seriesId: 'B', value: 5 },
];

/** Narrow the first layer to the stacked-bar config it always is for this preset. */
function stackedLayerOf(
  config: ReturnType<typeof createStackedBarChartConfig>
): NgeStackedBarLayerConfig {
  return config.layers.flat()[0] as NgeStackedBarLayerConfig;
}

describe('createStackedBarChartConfig', () => {
  it('wires the stacked-bar renderer, type, and a scale factory', () => {
    const config = createStackedBarChartConfig({ data: DATA });

    const layer = stackedLayerOf(config);
    expect(layer.type).toBe('stacked-bar');
    expect(layer.renderer).toBe(renderStackedBarLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('defaults orientation to vertical and showLabels to false', () => {
    const layer = stackedLayerOf(createStackedBarChartConfig({ data: DATA }));

    expect(layer.orientation).toBe('vertical');
    expect(layer.showLabels).toBe(false);
  });

  it('passes stackOffset, bandWidthAccessor, and seriesColors through to the layer', () => {
    const bandWidthAccessor = (_category: string, total: number) => total;
    const layer = stackedLayerOf(
      createStackedBarChartConfig({
        bandWidthAccessor,
        data: DATA,
        seriesColors: ['var(--a)', 'var(--b)'],
        stackOffset: 'expand',
      })
    );

    expect(layer.stackOffset).toBe('expand');
    expect(layer.bandWidthAccessor).toBe(bandWidthAccessor);
    expect(layer.seriesColors).toEqual(['var(--a)', 'var(--b)']);
  });

  it('forwards base axis/grid flags', () => {
    const config = createStackedBarChartConfig({
      data: DATA,
      showXAxis: true,
      showYAxis: true,
      showYGrid: true,
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Value',
    });

    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
    expect(config.base?.showYGrid).toBe(true);
    expect(config.base?.xAxisLabel).toBe('Quarter');
    expect(config.base?.yAxisLabel).toBe('Value');
  });

  it('auto-populates one legend item per series when the legend is enabled', () => {
    const config = createStackedBarChartConfig({ data: DATA, legend: { enabled: true } });

    expect(config.legend?.enabled).toBe(true);
    expect(config.legend?.items.map(i => i.label)).toEqual(['A', 'B']);
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = stackedLayerOf(
      createStackedBarChartConfig({ data: DATA, tooltip: { enabled: true } })
    );

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
  });

  it('omits the tooltip config when not enabled', () => {
    const layer = stackedLayerOf(createStackedBarChartConfig({ data: DATA }));

    expect(layer.tooltip).toBeUndefined();
  });

  it('exposes a scale factory that covers the stacked total on the value axis', () => {
    const config = createStackedBarChartConfig({ data: DATA });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect(scales.x.domain()).toEqual(['Q1', 'Q2']);
    // Q1 totals 30 → the value (y) domain covers it.
    expect(scales.y.domain()).toEqual([0, 30]);
  });

  it('clamps the value axis to [0, 1] under expand via the scale factory', () => {
    const config = createStackedBarChartConfig({ data: DATA, stackOffset: 'expand' });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect(scales.y.domain()).toEqual([0, 1]);
  });

  it('threads the value-domain override through the scale-factory closure for both orientations', () => {
    // The preset captures { xDomain, yDomain } in the scaleFactory closure, so the
    // override reaches createStackedBarChartScales via config.scaleFactory (not just
    // the helper's direct 3rd arg). Vertical → value axis is y, honours yDomain.
    const vertical = createStackedBarChartConfig({ data: DATA, yDomain: [0, 100] });
    expect(vertical.scaleFactory!(vertical, DIMENSIONS).y.domain()).toEqual([0, 100]);

    // Symmetric horizontal → value axis is x, honours xDomain; band stays on y.
    const horizontal = createStackedBarChartConfig({
      data: DATA,
      orientation: 'horizontal',
      xDomain: [0, 50],
    });
    const horizontalScales = horizontal.scaleFactory!(horizontal, DIMENSIONS);
    expect(horizontalScales.x.domain()).toEqual([0, 50]);
    expect(horizontalScales.y.domain()).toEqual(['Q1', 'Q2']);
  });
});
