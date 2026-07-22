import type { ScaleBand, ScaleLinear } from 'd3-scale';

import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeLollipopDataPoint,
  NgeLollipopLayerConfig,
} from '../core/config';

import { renderLollipopLayer } from '../layers/lollipop';
import { createLollipopChartConfig } from './lollipop-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 45, left: 50, right: 15, top: 20 },
  width: 560,
};

const DATA: NgeLollipopDataPoint[] = [
  { category: 'A', value: 50 },
  { category: 'B', value: 30 },
  { category: 'C', value: 20 },
];

/** Narrow the lollipop layer the preset always emits. */
function lollipopLayerOf(config: NgeChartConfig): NgeLollipopLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'lollipop') as NgeLollipopLayerConfig;
}

describe('createLollipopChartConfig', () => {
  it('wires the lollipop renderer, type, and a scale factory', () => {
    const config = createLollipopChartConfig({ data: DATA });

    const layer = lollipopLayerOf(config);
    expect(layer.type).toBe('lollipop');
    expect(layer.renderer).toBe(renderLollipopLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('renders a single layer with axes on by default', () => {
    const config = createLollipopChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
  });

  it('flows the family options through to the layer', () => {
    const layer = lollipopLayerOf(
      createLollipopChartConfig({
        baseline: 5,
        connect: true,
        data: DATA,
        markerSize: 8,
        seriesColors: ['#111', '#222'],
        shape: 'diamond',
        showLabels: true,
        showStem: false,
      })
    );

    expect(layer.baseline).toBe(5);
    expect(layer.connect).toBe(true);
    expect(layer.markerSize).toBe(8);
    expect(layer.seriesColors).toEqual(['#111', '#222']);
    expect(layer.shape).toBe('diamond');
    expect(layer.showLabels).toBe(true);
    expect(layer.showStem).toBe(false);
  });

  it('builds a tooltip config with a default formatter when showTooltip is set', () => {
    const layer = lollipopLayerOf(createLollipopChartConfig({ data: DATA, showTooltip: true }));

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
  });

  it('omits the tooltip config by default', () => {
    expect(lollipopLayerOf(createLollipopChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });

  describe('scale factory', () => {
    it('produces a band category x-scale and a linear value y-scale (vertical)', () => {
      const config = createLollipopChartConfig({ data: DATA });

      const scales = config.scaleFactory!(config, DIMENSIONS);
      const x = scales.x as ScaleBand<string>;
      const y = scales.y as ScaleLinear<number, number>;

      // Band scale exposes bandwidth(); linear scale does not.
      expect(typeof x.bandwidth).toBe('function');
      expect((y as unknown as { bandwidth?: unknown }).bandwidth).toBeUndefined();
      expect(x.domain()).toEqual(['A', 'B', 'C']);
      // Value extent [0, 50] → 10% headroom on the non-zero side, zero preserved.
      expect(y.domain()).toEqual([0, expect.closeTo(55, 6)]);
    });

    it('swaps the band / linear axes for horizontal orientation', () => {
      const config = createLollipopChartConfig({ data: DATA, orientation: 'horizontal' });

      const scales = config.scaleFactory!(config, DIMENSIONS);
      const x = scales.x as ScaleLinear<number, number>;
      const y = scales.y as ScaleBand<string>;

      expect(typeof y.bandwidth).toBe('function');
      expect((x as unknown as { bandwidth?: unknown }).bandwidth).toBeUndefined();
      expect(y.domain()).toEqual(['A', 'B', 'C']);
    });

    it('does not anchor the domain at 0 for a dot plot (showStem: false)', () => {
      const config = createLollipopChartConfig({
        data: [
          { category: 'A', value: 47 },
          { category: 'B', value: 88 },
          { category: 'C', value: 63 },
        ],
        showStem: false,
      });

      const y = config.scaleFactory!(config, DIMENSIONS).y as ScaleLinear<number, number>;
      const [lo, hi] = y.domain();

      // Position encoding: scores 47–88 sit tight to the data extent ± ~10% padding,
      // so the min stays above 0 (a 0-anchored axis would squeeze the marks).
      expect(lo).toBeGreaterThan(0);
      expect(lo).toBeCloseTo(42.9, 6);
      expect(hi).toBeCloseTo(92.1, 6);
    });

    it('spans the combined value/valueEnd extent for dumbbells (not anchored at 0)', () => {
      const config = createLollipopChartConfig({
        data: [
          { category: 'North', value: 40, valueEnd: 80 },
          { category: 'South', value: 55, valueEnd: 70 },
        ],
      });

      const y = config.scaleFactory!(config, DIMENSIONS).y as ScaleLinear<number, number>;
      const [lo, hi] = y.domain();

      // Combined value/valueEnd extent [40, 80] ± ~10% padding — NOT [0, …].
      expect(lo).toBeGreaterThan(0);
      expect(lo).toBeCloseTo(36, 6);
      expect(hi).toBeCloseTo(84, 6);
    });

    it('still anchors the domain at 0 / baseline for a pure lollipop (default)', () => {
      const config = createLollipopChartConfig({ data: DATA });

      const y = config.scaleFactory!(config, DIMENSIONS).y as ScaleLinear<number, number>;

      // DATA is [50, 30, 20] with stems and no valueEnd ⇒ zero baseline preserved.
      expect(y.domain()).toEqual([0, expect.closeTo(55, 6)]);
    });
  });
});
