import type { NgeLineDataPoint, NgeLineLayerConfig } from '../core/config';

import { renderLineLayer } from '../layers/line';
import { createComparisonAreaChartConfig } from './comparison-area-chart.preset';

/** Narrow the first layer to a line layer config for assertions. */
function lineLayer(
  config: ReturnType<typeof createComparisonAreaChartConfig>
): NgeLineLayerConfig {
  return config.layers[0] as NgeLineLayerConfig;
}

describe('createComparisonAreaChartConfig', () => {
  const twoLoans: NgeLineDataPoint[] = [
    { seriesId: 'Loan A', x: 0, y: 1800 },
    { seriesId: 'Loan A', x: 12, y: 1750 },
    { seriesId: 'Loan B', x: 0, y: 1600 },
    { seriesId: 'Loan B', x: 12, y: 1680 },
  ];

  it('reuses the shipped line layer (exactly one layer, line renderer)', () => {
    const config = createComparisonAreaChartConfig({ data: twoLoans });
    const layer = lineLayer(config);

    expect(config.layers).toHaveLength(1);
    expect(layer.type).toBe('line');
    expect(layer.renderer).toBe(renderLineLayer);
  });

  it('applies overlaid-comparison defaults (area on, low opacity, monotone, no points, legend on)', () => {
    const config = createComparisonAreaChartConfig({ data: twoLoans });
    const layer = lineLayer(config);

    expect(layer.showArea).toBe(true);
    expect(layer.areaOpacity).toBe(0.15);
    expect(layer.curveType).toBe('monotone');
    expect(layer.showPoints).toBe(false);
    expect(config.legend?.enabled).toBe(true);
  });

  it('lets every comparison default be overridden', () => {
    const config = createComparisonAreaChartConfig({
      areaOpacity: 0.4,
      curveType: 'linear',
      data: twoLoans,
      legend: { enabled: false },
      showArea: false,
      showPoints: true,
    });
    const layer = lineLayer(config);

    expect(layer.showArea).toBe(false);
    expect(layer.areaOpacity).toBe(0.4);
    expect(layer.curveType).toBe('linear');
    expect(layer.showPoints).toBe(true);
    // enabled:false collapses the line preset's legend config back to undefined
    expect(config.legend).toBeUndefined();
  });

  it('passes multi-series data through to the layer untouched', () => {
    const config = createComparisonAreaChartConfig({ data: twoLoans });
    const layer = lineLayer(config);

    expect(layer.data).toHaveLength(twoLoans.length);
    expect(layer.data).toEqual(twoLoans);
  });

  it('leaves seriesColors undefined by default and threads it through when provided', () => {
    const without = createComparisonAreaChartConfig({ data: twoLoans });
    expect(lineLayer(without).seriesColors).toBeUndefined();

    const palette = ['#111111', '#222222'];
    const withColors = createComparisonAreaChartConfig({ data: twoLoans, seriesColors: palette });
    expect(lineLayer(withColors).seriesColors).toEqual(palette);
  });

  it('keeps an explicit areaOpacity of 0 (the default fires only on undefined)', () => {
    const config = createComparisonAreaChartConfig({ areaOpacity: 0, data: twoLoans });
    expect(lineLayer(config).areaOpacity).toBe(0);
  });

  it('threads a partial legend position through without disabling the legend', () => {
    const config = createComparisonAreaChartConfig({ data: twoLoans, legend: { position: 'top' } });
    expect(config.legend?.enabled).toBe(true);
    expect(config.legend?.position).toBe('top');
  });
});
