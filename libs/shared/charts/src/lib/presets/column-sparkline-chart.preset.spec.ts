import type { NgeBarDataPoint, NgeBarLayerConfig } from '../core/config';

import { renderBarLayer } from '../layers/bar';
import { createColumnSparklineChartConfig } from './column-sparkline-chart.preset';

/** Narrow the first layer to a bar layer config for assertions. */
function barLayer(config: ReturnType<typeof createColumnSparklineChartConfig>): NgeBarLayerConfig {
  return config.layers[0] as NgeBarLayerConfig;
}

describe('createColumnSparklineChartConfig', () => {
  const series: NgeBarDataPoint[] = [
    { label: 'Mon', value: 12 },
    { label: 'Tue', value: 18 },
    { label: 'Wed', value: 9 },
    { label: 'Thu', value: 15 },
    { label: 'Fri', value: 21 },
  ];

  it('reuses the shipped bar layer (exactly one layer, bar renderer, no new type)', () => {
    const config = createColumnSparklineChartConfig({ data: series });
    const layer = barLayer(config);

    expect(config.layers).toHaveLength(1);
    expect(layer.type).toBe('bar');
    expect(layer.renderer).toBe(renderBarLayer);
  });

  it('applies compact defaults (tight margin, no labels, small padding, vertical, axes off)', () => {
    const config = createColumnSparklineChartConfig({ data: series });
    const layer = barLayer(config);

    expect(config.base?.margin).toEqual({ bottom: 2, left: 2, right: 2, top: 2 });
    expect(layer.showLabels).toBe(false);
    expect(layer.barPadding).toBe(0.1);
    expect(layer.orientation).toBe('vertical');
    expect(config.base?.showXAxis).toBeFalsy();
    expect(config.base?.showYAxis).toBeFalsy();
  });

  it('passes the data through to the layer untouched', () => {
    const config = createColumnSparklineChartConfig({ data: series });

    expect(barLayer(config).data).toEqual(series);
  });

  it('leaves the zero line off by default but passes showZeroLine through when set', () => {
    // Opt-in for columns (unlike win-loss, which defaults it on).
    expect(barLayer(createColumnSparklineChartConfig({ data: series })).showZeroLine).toBe(false);

    const withLine = createColumnSparklineChartConfig({ data: series, showZeroLine: true });
    expect(barLayer(withLine).showZeroLine).toBe(true);
  });

  it('lets compact defaults be overridden', () => {
    const config = createColumnSparklineChartConfig({
      barPadding: 0.5,
      data: series,
      margin: { bottom: 20, left: 20, right: 20, top: 20 },
      orientation: 'horizontal',
      showLabels: true,
    });
    const layer = barLayer(config);

    expect(layer.barPadding).toBe(0.5);
    expect(layer.orientation).toBe('horizontal');
    expect(layer.showLabels).toBe(true);
    expect(config.base?.margin).toEqual({ bottom: 20, left: 20, right: 20, top: 20 });
  });
});
