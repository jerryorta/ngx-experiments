import type {
  NgeChartConfig,
  NgeParallelCoordsDataPoint,
  NgeParallelCoordsLayerConfig,
} from '../core/config';

import { renderParallelCoordsLayer } from '../layers/parallel-coords';
import { createParallelCoordsChartConfig } from './parallel-coords-chart.preset';

const DATA: NgeParallelCoordsDataPoint[] = [
  { label: 'Weight', seriesId: 'A', value: 3504 },
  { label: 'MPG', seriesId: 'A', value: 18 },
  { label: 'Origin', seriesId: 'A', value: 'USA' },
  { label: 'Weight', seriesId: 'B', value: 2130 },
  { label: 'MPG', seriesId: 'B', value: 35 },
  { label: 'Origin', seriesId: 'B', value: 'Japan' },
];

/** Narrow the parallel coordinates layer the preset always emits. */
function parallelCoordsLayerOf(config: NgeChartConfig): NgeParallelCoordsLayerConfig {
  return config.layers
    .flat()
    .find(layer => layer.type === 'parallel-coords') as NgeParallelCoordsLayerConfig;
}

describe('createParallelCoordsChartConfig', () => {
  it('wires the parallel coordinates renderer and type', () => {
    const config = createParallelCoordsChartConfig({ data: DATA });

    const layer = parallelCoordsLayerOf(config);
    expect(layer.type).toBe('parallel-coords');
    expect(layer.renderer).toBe(renderParallelCoordsLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (the layer draws its own)', () => {
    const config = createParallelCoordsChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a modest all-around margin (the layer keeps its chrome inside the plot)', () => {
    const config = createParallelCoordsChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 16, left: 24, right: 24, top: 24 });
  });

  it('lets a caller override the margin', () => {
    const margin = { bottom: 8, left: 8, right: 8, top: 8 };
    const config = createParallelCoordsChartConfig({ data: DATA, margin });

    expect(config.base?.margin).toEqual(margin);
  });

  it('does not expose a gestures option (single-view multi-axis chart)', () => {
    const config = createParallelCoordsChartConfig({ data: DATA });

    expect(config.gestures).toBeUndefined();
  });

  it('passes the layout and color options through to the layer', () => {
    const onClick = jest.fn();
    const config = createParallelCoordsChartConfig({
      colorBy: 'Origin',
      curve: 'monotone',
      data: DATA,
      dimensions: ['MPG', 'Weight'],
      onClick,
      seriesColors: ['#111111'],
      tickCount: 3,
    });

    const layer = parallelCoordsLayerOf(config);
    expect(layer.colorBy).toBe('Origin');
    expect(layer.curve).toBe('monotone');
    expect(layer.dimensions).toEqual(['MPG', 'Weight']);
    expect(layer.onClick).toBe(onClick);
    expect(layer.seriesColors).toEqual(['#111111']);
    expect(layer.tickCount).toBe(3);
  });

  it('omits the tooltip config unless it is enabled', () => {
    expect(
      parallelCoordsLayerOf(createParallelCoordsChartConfig({ data: DATA })).tooltip
    ).toBeUndefined();
    expect(
      parallelCoordsLayerOf(
        createParallelCoordsChartConfig({ data: DATA, tooltip: { enabled: false } })
      ).tooltip
    ).toBeUndefined();
  });

  it('defaults the tooltip size and formatter when enabled', () => {
    const config = createParallelCoordsChartConfig({ data: DATA, tooltip: { enabled: true } });

    const tooltip = parallelCoordsLayerOf(config).tooltip;
    expect(tooltip?.enabled).toBe(true);
    expect(tooltip?.height).toBe(65);
    expect(tooltip?.width).toBe(150);
    expect(tooltip?.formatContent?.(DATA[0])).toEqual({ label: 'Weight', value: '3504' });
  });

  it('keeps a categorical value readable in the default tooltip formatter', () => {
    const config = createParallelCoordsChartConfig({ data: DATA, tooltip: { enabled: true } });

    expect(parallelCoordsLayerOf(config).tooltip?.formatContent?.(DATA[2])).toEqual({
      label: 'Origin',
      value: 'USA',
    });
  });

  it('honours a custom tooltip formatter and size', () => {
    const formatContent = jest.fn(() => ({ label: 'x', value: 'y' }));
    const config = createParallelCoordsChartConfig({
      data: DATA,
      tooltip: { enabled: true, formatContent, height: 90, width: 200 },
    });

    const tooltip = parallelCoordsLayerOf(config).tooltip;
    expect(tooltip?.formatContent).toBe(formatContent);
    expect(tooltip?.height).toBe(90);
    expect(tooltip?.width).toBe(200);
  });
});
