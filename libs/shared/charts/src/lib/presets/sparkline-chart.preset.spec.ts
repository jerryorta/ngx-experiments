import type {
  NgeLineDataPoint,
  NgeLineLayerConfig,
  NgeScatterLayerConfig,
} from '../core/config';

import { renderLineLayer } from '../layers/line';
import { renderScatterLayer } from '../layers/scatter';
import { createSparklineChartConfig } from './sparkline-chart.preset';

/** Narrow the first layer to a line layer config for assertions. */
function lineLayer(config: ReturnType<typeof createSparklineChartConfig>): NgeLineLayerConfig {
  return config.layers[0] as NgeLineLayerConfig;
}

/** Narrow the (optional) second layer to the last-value scatter overlay. */
function dotLayer(config: ReturnType<typeof createSparklineChartConfig>): NgeScatterLayerConfig {
  return config.layers[1] as NgeScatterLayerConfig;
}

describe('createSparklineChartConfig', () => {
  const singleSeries: NgeLineDataPoint[] = [
    { x: 0, y: 4 },
    { x: 1, y: 6 },
    { x: 2, y: 5 },
    { x: 3, y: 8 },
  ];

  const multiSeries: NgeLineDataPoint[] = [
    { seriesId: 'A', x: 0, y: 4 },
    { seriesId: 'A', x: 1, y: 6 },
    { seriesId: 'B', x: 0, y: 2 },
    { seriesId: 'B', x: 1, y: 3 },
  ];

  it('reuses the shipped line layer for the trend (line renderer, no new type)', () => {
    const config = createSparklineChartConfig({ data: singleSeries });
    const layer = lineLayer(config);

    expect(layer.type).toBe('line');
    expect(layer.renderer).toBe(renderLineLayer);
  });

  it('applies compact defaults (tight margin, 1px stroke, points off, axes off)', () => {
    const config = createSparklineChartConfig({ data: singleSeries });
    const layer = lineLayer(config);

    expect(config.base?.margin).toEqual({ bottom: 2, left: 2, right: 2, top: 2 });
    expect(layer.lineWidth).toBe(1);
    expect(layer.showPoints).toBe(false);
    expect(config.base?.showXAxis).toBeFalsy();
    expect(config.base?.showYAxis).toBeFalsy();
  });

  it('composes a single-point scatter overlay for the last value (default on)', () => {
    const config = createSparklineChartConfig({ data: singleSeries });
    const dot = dotLayer(config);

    expect(config.layers).toHaveLength(2);
    expect(dot.type).toBe('scatter');
    expect(dot.renderer).toBe(renderScatterLayer);
    // Exactly one dot, sitting on the series' final datum.
    expect(dot.data).toHaveLength(1);
    expect(dot.data[0]).toMatchObject({ x: 3, y: 8 });
  });

  it('omits the overlay entirely when showLastValueDot is false (line layer only)', () => {
    const config = createSparklineChartConfig({ data: singleSeries, showLastValueDot: false });

    expect(config.layers).toHaveLength(1);
    expect(lineLayer(config).type).toBe('line');
  });

  it('places one last-value dot per series, in first-seen order', () => {
    const config = createSparklineChartConfig({ data: multiSeries });
    const dot = dotLayer(config);

    expect(dot.data).toHaveLength(2);
    // A's last point, then B's last point.
    expect(dot.data[0]).toMatchObject({ seriesId: 'A', x: 1, y: 6 });
    expect(dot.data[1]).toMatchObject({ seriesId: 'B', x: 1, y: 3 });
  });

  it('honours lastValueColor on the dot, else leaves it to the series colour', () => {
    const withColor = createSparklineChartConfig({
      data: singleSeries,
      lastValueColor: '#ff0000',
    });
    expect(dotLayer(withColor).data[0].color).toBe('#ff0000');

    const withoutColor = createSparklineChartConfig({ data: singleSeries });
    expect(dotLayer(withoutColor).data[0].color).toBeUndefined();
  });

  it('threads the line seriesColors palette onto the dot overlay so dots match lines', () => {
    const palette = ['#111111', '#222222'];
    const config = createSparklineChartConfig({ data: multiSeries, seriesColors: palette });

    expect(lineLayer(config).seriesColors).toEqual(palette);
    expect(dotLayer(config).seriesColors).toEqual(palette);
  });

  it('projects Date x onto epoch-ms for the shared time scale', () => {
    const dated: NgeLineDataPoint[] = [
      { x: new Date('2026-01-01'), y: 1 },
      { x: new Date('2026-02-01'), y: 3 },
    ];
    const config = createSparklineChartConfig({ data: dated });

    expect(dotLayer(config).data[0].x).toBe(new Date('2026-02-01').getTime());
  });

  it('introduces no layer type beyond the reused line + scatter', () => {
    const config = createSparklineChartConfig({ data: multiSeries });
    const types = config.layers.flat().map(layer => layer.type);

    expect(new Set(types)).toEqual(new Set(['line', 'scatter']));
  });

  it('lets compact defaults be overridden', () => {
    const config = createSparklineChartConfig({
      data: singleSeries,
      lineWidth: 3,
      margin: { bottom: 10, left: 10, right: 10, top: 10 },
      showPoints: true,
    });
    const layer = lineLayer(config);

    expect(layer.lineWidth).toBe(3);
    expect(layer.showPoints).toBe(true);
    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });
});
