import type { ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeScatterDataPoint, NgeScatterLayerConfig } from '../core/config';

import { extractScatterChartLegendItems } from '../core/legend';
import {
  computeScatterXDataDomain,
  computeScatterYDataDomain,
  createScatterChartConfig,
} from './scatter-chart.preset';

/** Narrow the first layer to a scatter layer config for assertions. */
function scatterLayer(config: ReturnType<typeof createScatterChartConfig>): NgeScatterLayerConfig {
  return config.layers[0] as NgeScatterLayerConfig;
}

describe('createScatterChartConfig', () => {
  const multiSeries: NgeScatterDataPoint[] = [
    { seriesId: 'Sales', x: 1, y: 10 },
    { seriesId: 'Returns', x: 2, y: 4 },
    { seriesId: 'Sales', x: 3, y: 12 },
  ];

  const dimensions: NgeChartDimensions = {
    boundedHeight: 100,
    boundedWidth: 200,
    height: 130,
    margin: { bottom: 20, left: 30, right: 10, top: 10 },
    width: 240,
  };

  /** Read back the linear x/y scale domains the preset's scaleFactory builds. */
  function domains(config: ReturnType<typeof createScatterChartConfig>): {
    x: number[];
    y: number[];
  } {
    const scales = config.scaleFactory!(config, dimensions);
    return {
      x: (scales.x as ScaleLinear<number, number>).domain(),
      y: (scales.y as ScaleLinear<number, number>).domain(),
    };
  }

  it('produces a scatter layer with the scatter renderer', () => {
    const config = createScatterChartConfig({ data: [{ x: 1, y: 2 }] });
    const layer = scatterLayer(config);

    expect(layer.type).toBe('scatter');
    expect(layer.renderer).toBeInstanceOf(Function);
  });

  it('threads seriesColors into the scatter layer', () => {
    const config = createScatterChartConfig({
      data: multiSeries,
      seriesColors: ['#111111', '#222222'],
    });

    expect(scatterLayer(config).seriesColors).toEqual(['#111111', '#222222']);
  });

  it('omits the legend when not enabled', () => {
    const config = createScatterChartConfig({ data: multiSeries });

    expect(config.legend).toBeUndefined();
  });

  it('auto-generates legend items from series data when legend is enabled', () => {
    const config = createScatterChartConfig({ data: multiSeries, legend: { enabled: true } });

    expect(config.legend?.enabled).toBe(true);
    expect(config.legend?.position).toBe('bottom');
    expect(config.legend?.items).toEqual(extractScatterChartLegendItems(multiSeries));
  });

  it('passes seriesColors through to the auto-generated legend items', () => {
    const config = createScatterChartConfig({
      data: multiSeries,
      legend: { enabled: true },
      seriesColors: ['#abcabc', '#defdef'],
    });

    expect(config.legend?.items).toEqual([
      { color: '#abcabc', id: 'Sales', label: 'Sales' },
      { color: '#defdef', id: 'Returns', label: 'Returns' },
    ]);
  });

  it('respects explicit legend items over auto-generation', () => {
    const items = [{ color: '#ff0000', label: 'Custom' }];
    const config = createScatterChartConfig({
      data: multiSeries,
      legend: { enabled: true, items },
    });

    expect(config.legend?.items).toBe(items);
  });

  it('passes legend.interactive through (default false)', () => {
    const plain = createScatterChartConfig({ data: multiSeries, legend: { enabled: true } });
    const interactive = createScatterChartConfig({
      data: multiSeries,
      legend: { enabled: true, interactive: true },
    });

    expect(plain.legend?.interactive).toBe(false);
    expect(interactive.legend?.interactive).toBe(true);
  });

  it('threads animationMs into the scatter layer and gestures into the config', () => {
    const gestures = { pan: true, zoom: true };
    const config = createScatterChartConfig({ animationMs: 0, data: multiSeries, gestures });

    expect(scatterLayer(config).animationMs).toBe(0);
    expect(config.gestures).toBe(gestures);

    const plain = createScatterChartConfig({ data: multiSeries });
    expect(scatterLayer(plain).animationMs).toBeUndefined();
    expect(plain.gestures).toBeUndefined();
  });

  it('defaults the legend swatch shape to circle (scatter marks), with passthrough', () => {
    const auto = createScatterChartConfig({ data: multiSeries, legend: { enabled: true } });
    const overridden = createScatterChartConfig({
      data: multiSeries,
      legend: { enabled: true, swatchShape: 'square' },
    });

    expect(auto.legend?.swatchShape).toBe('circle');
    expect(overridden.legend?.swatchShape).toBe('square');
  });

  it('defaults grid flags off and passes them through the base config when set', () => {
    const off = createScatterChartConfig({ data: multiSeries });
    expect(off.base?.showXGrid).toBe(false);
    expect(off.base?.showYGrid).toBe(false);

    const on = createScatterChartConfig({
      data: multiSeries,
      showXGrid: true,
      showYGrid: true,
    });
    expect(on.base?.showXGrid).toBe(true);
    expect(on.base?.showYGrid).toBe(true);
  });

  describe('explicit axis domains (zoom hook)', () => {
    it('uses xDomain/yDomain verbatim when provided (no padding applied)', () => {
      const config = createScatterChartConfig({
        data: multiSeries,
        xDomain: [10, 20],
        yDomain: [-5, 5],
      });

      expect(domains(config)).toEqual({ x: [10, 20], y: [-5, 5] });
    });

    it('computes data-driven padded domains when no explicit domain is set', () => {
      // x: 1..3, padding 0.05 * 2 = 0.1 → [0.9, 3.1]
      // y: 4..12, padding 0.1 * 8 = 0.8 → [3.2, 12.8]
      const config = createScatterChartConfig({ data: multiSeries });
      const { x, y } = domains(config);

      expect(x[0]).toBeCloseTo(0.9);
      expect(x[1]).toBeCloseTo(3.1);
      expect(y[0]).toBeCloseTo(3.2);
      expect(y[1]).toBeCloseTo(12.8);
    });

    it('mixes an explicit X domain with a data-driven Y domain', () => {
      const config = createScatterChartConfig({ data: multiSeries, xDomain: [0, 50] });
      const { x, y } = domains(config);

      expect(x).toEqual([0, 50]);
      expect(y[0]).toBeCloseTo(3.2);
      expect(y[1]).toBeCloseTo(12.8);
    });
  });

  describe('range axis (full-range slider opt-in)', () => {
    it('omits both range axes by default', () => {
      const config = createScatterChartConfig({ data: multiSeries });

      expect(config.base?.xRangeAxis).toBeUndefined();
      expect(config.base?.yRangeAxis).toBeUndefined();
    });

    it('rangeAxisX sets xRangeAxis.fullDomain to the data-driven X extent (Y untouched)', () => {
      const config = createScatterChartConfig({ data: multiSeries, rangeAxisX: true });
      const [min, max] = config.base!.xRangeAxis!.fullDomain;

      expect(min).toBeCloseTo(0.9);
      expect(max).toBeCloseTo(3.1);
      expect(config.base?.yRangeAxis).toBeUndefined();
    });

    it('rangeAxisY sets yRangeAxis.fullDomain to the data-driven Y extent (X untouched)', () => {
      const config = createScatterChartConfig({ data: multiSeries, rangeAxisY: true });
      const [min, max] = config.base!.yRangeAxis!.fullDomain;

      expect(min).toBeCloseTo(3.2);
      expect(max).toBeCloseTo(12.8);
      expect(config.base?.xRangeAxis).toBeUndefined();
    });

    it('fullDomain spans the FULL data even when a focus xDomain (zoom) is also set', () => {
      const config = createScatterChartConfig({
        data: multiSeries,
        rangeAxisX: true,
        xDomain: [1.5, 2.5], // focus/zoom into a subrange
      });

      // The range axis still spans the whole data…
      const [min, max] = config.base!.xRangeAxis!.fullDomain;
      expect(min).toBeCloseTo(0.9);
      expect(max).toBeCloseTo(3.1);

      // …while the layer/focus scale honours the zoom subrange verbatim
      expect(domains(config).x).toEqual([1.5, 2.5]);
    });

    it('fullDomain (Y) spans the FULL data even when a focus yDomain (zoom) is also set', () => {
      const config = createScatterChartConfig({
        data: multiSeries,
        rangeAxisY: true,
        yDomain: [5, 10], // focus/zoom into a subrange
      });

      // The range axis still spans the whole data…
      const [min, max] = config.base!.yRangeAxis!.fullDomain;
      expect(min).toBeCloseTo(3.2);
      expect(max).toBeCloseTo(12.8);

      // …while the layer/focus scale honours the zoom subrange verbatim
      expect(domains(config).y).toEqual([5, 10]);
    });

    it('fullDomain equals the shared X helper output', () => {
      const config = createScatterChartConfig({ data: multiSeries, rangeAxisX: true });

      expect(config.base!.xRangeAxis!.fullDomain).toEqual(
        computeScatterXDataDomain(multiSeries, 0.05)
      );
    });
  });

  describe('data-domain helpers (shared by scaleFactory + range axis)', () => {
    it('computeScatterXDataDomain / Y match the factory scale domains (single source of truth)', () => {
      const config = createScatterChartConfig({ data: multiSeries });
      const { x, y } = domains(config);

      expect(x).toEqual(computeScatterXDataDomain(multiSeries, 0.05));
      expect(y).toEqual(computeScatterYDataDomain(multiSeries, 0.1, false));
    });

    it('computeScatterYDataDomain pins the lower bound to 0 (no bottom padding) when startAtZero', () => {
      // y 4..12 → top padding 0.1 * (12 - 0) = 1.2 → [0, 13.2]
      const [lo, hi] = computeScatterYDataDomain(multiSeries, 0.1, true);

      expect(lo).toBe(0);
      expect(hi).toBeCloseTo(13.2);
    });

    it('both helpers fall back to [0, 1] for empty data', () => {
      expect(computeScatterXDataDomain([], 0.05)).toEqual([0, 1]);
      expect(computeScatterYDataDomain([], 0.1, false)).toEqual([0, 1]);
    });
  });

  describe('default tooltip formatter', () => {
    function formatter(): (data: NgeScatterDataPoint) => {
      extra?: unknown;
      label: string;
      value: unknown;
    } {
      const config = createScatterChartConfig({ data: multiSeries, tooltip: { enabled: true } });
      const fn = scatterLayer(config).tooltip?.formatContent;
      if (!fn) {
        throw new Error('Expected a default tooltip formatter to be wired');
      }
      return fn;
    }

    it('prefixes the series name when a point has a seriesId', () => {
      expect(formatter()({ seriesId: 'Sales', x: 10, y: 20 })).toEqual({
        extra: { seriesId: 'Sales' },
        label: 'Sales · x: 10.0',
        value: 20,
      });
    });

    it('omits the series prefix for single-series points', () => {
      expect(formatter()({ x: 10, y: 20 })).toEqual({
        extra: { seriesId: undefined },
        label: 'x: 10.0',
        value: 20,
      });
    });
  });
});
