import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeLineLayerConfig,
  NgeWaterfallDataPoint,
  NgeWaterfallLayerConfig,
} from '../core/config';

import { renderWaterfallLayer } from '../layers/waterfall';
import { createWaterfallChartConfig } from './waterfall-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const DATA: NgeWaterfallDataPoint[] = [
  { label: 'A', value: 50 },
  { label: 'B', value: 30 },
  { label: 'C', value: 20 },
  { kind: 'total', label: 'Total', value: 0 },
];

/** Narrow the waterfall layer the preset always emits. */
function waterfallLayerOf(config: NgeChartConfig): NgeWaterfallLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'waterfall') as NgeWaterfallLayerConfig;
}

/** The optional cumulative-overlay line layer. */
function lineLayerOf(config: NgeChartConfig): NgeLineLayerConfig | undefined {
  return config.layers.flat().find(layer => layer.type === 'line') as
    | NgeLineLayerConfig
    | undefined;
}

describe('createWaterfallChartConfig', () => {
  it('wires the waterfall renderer, type, and a scale factory', () => {
    const config = createWaterfallChartConfig({ data: DATA });

    const layer = waterfallLayerOf(config);
    expect(layer.type).toBe('waterfall');
    expect(layer.renderer).toBe(renderWaterfallLayer);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('renders a single layer with axes on and no secondary axis by default', () => {
    const config = createWaterfallChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
    expect(config.base?.showY2Axis).toBe(false);
    expect(lineLayerOf(config)).toBeUndefined();
  });

  it('passes rise / fall / total color overrides through to the layer', () => {
    const layer = waterfallLayerOf(
      createWaterfallChartConfig({
        data: DATA,
        fallColor: 'var(--fall)',
        riseColor: 'var(--rise)',
        totalColor: 'var(--total)',
      })
    );

    expect(layer.riseColor).toBe('var(--rise)');
    expect(layer.fallColor).toBe('var(--fall)');
    expect(layer.totalColor).toBe('var(--total)');
  });

  it('builds a tooltip config with a default formatter when showTooltip is set', () => {
    const layer = waterfallLayerOf(createWaterfallChartConfig({ data: DATA, showTooltip: true }));

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
  });

  it('omits the tooltip config by default', () => {
    expect(waterfallLayerOf(createWaterfallChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });

  describe('cumulative overlay', () => {
    it('adds a secondary-axis line layer and shows the y2 axis', () => {
      const config = createWaterfallChartConfig({ cumulative: true, data: DATA });

      expect(config.layers.flat()).toHaveLength(2);
      const line = lineLayerOf(config);
      expect(line?.type).toBe('line');
      expect(line?.useSecondaryAxis).toBe(true);
      expect(config.base?.showY2Axis).toBe(true);
      expect(config.base?.y2AxisLabel).toBe('Cumulative %');
    });

    it('feeds the line the running-total % points (ending at 100%)', () => {
      const line = lineLayerOf(createWaterfallChartConfig({ cumulative: true, data: DATA }));

      expect(line?.data.map(point => point.y)).toEqual([50, 80, 100, 100]);
    });

    it('returns the y2 scale from the factory only when cumulative', () => {
      const plain = createWaterfallChartConfig({ data: DATA });
      expect(plain.scaleFactory!(plain, DIMENSIONS).y2).toBeUndefined();

      const cumulative = createWaterfallChartConfig({ cumulative: true, data: DATA });
      expect(cumulative.scaleFactory!(cumulative, DIMENSIONS).y2?.domain()).toEqual([0, 100]);
    });
  });

  it('exposes a scale factory covering the running-cumulative extent', () => {
    const config = createWaterfallChartConfig({ data: DATA });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect(scales.x.domain()).toEqual(['A', 'B', 'C', 'Total']);
    // Extent [0, 100] → 10% headroom.
    expect(scales.y.domain()).toEqual([0, expect.closeTo(110, 6)]);
  });

  it('threads the yDomain override through the scale-factory closure', () => {
    const config = createWaterfallChartConfig({ data: DATA, yDomain: [0, 500] });

    expect(config.scaleFactory!(config, DIMENSIONS).y.domain()).toEqual([0, 500]);
  });
});
