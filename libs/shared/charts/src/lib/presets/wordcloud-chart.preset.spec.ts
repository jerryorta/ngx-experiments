import type {
  NgeChartConfig,
  NgeWordCloudDataPoint,
  NgeWordCloudLayerConfig,
} from '../core/config';

import { renderWordCloudLayer } from '../layers/wordcloud';
import { createWordCloudChartConfig } from './wordcloud-chart.preset';

const DATA: NgeWordCloudDataPoint[] = [
  { label: 'angular', value: 120 },
  { label: 'signals', value: 86 },
  { label: 'rxjs', value: 44 },
];

/** Narrow the word cloud layer the preset always emits. */
function wordCloudLayerOf(config: NgeChartConfig): NgeWordCloudLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'wordcloud') as NgeWordCloudLayerConfig;
}

describe('createWordCloudChartConfig', () => {
  it('wires the word cloud renderer and type', () => {
    const config = createWordCloudChartConfig({ data: DATA });

    const layer = wordCloudLayerOf(config);
    expect(layer.type).toBe('wordcloud');
    expect(layer.renderer).toBe(renderWordCloudLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (self-scaled layout)', () => {
    const config = createWordCloudChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('does not expose a gestures option (single-view geometric chart)', () => {
    const config = createWordCloudChartConfig({ data: DATA });

    expect(config.gestures).toBeUndefined();
  });

  it('applies a default all-around margin', () => {
    const config = createWordCloudChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('overrides the default margin when one is supplied', () => {
    const config = createWordCloudChartConfig({
      data: DATA,
      margin: { bottom: 40, left: 20, right: 20, top: 5 },
    });

    expect(config.base?.margin).toEqual({ bottom: 40, left: 20, right: 20, top: 5 });
  });

  it('flows the family options through to the layer', () => {
    const onClick = jest.fn();
    const formatLabel = (d: NgeWordCloudDataPoint): string => d.label.toUpperCase();

    const layer = wordCloudLayerOf(
      createWordCloudChartConfig({
        data: DATA,
        fontFamily: 'Georgia, serif',
        formatLabel,
        maxFontSize: 90,
        minFontSize: 14,
        onClick,
        padding: 6,
        rotations: [0, 90],
        scale: 'log',
        seriesColors: ['#111', '#222'],
      })
    );

    expect(layer.fontFamily).toBe('Georgia, serif');
    expect(layer.formatLabel).toBe(formatLabel);
    expect(layer.maxFontSize).toBe(90);
    expect(layer.minFontSize).toBe(14);
    expect(layer.onClick).toBe(onClick);
    expect(layer.padding).toBe(6);
    expect(layer.rotations).toEqual([0, 90]);
    expect(layer.scale).toBe('log');
    expect(layer.seriesColors).toEqual(['#111', '#222']);
  });

  it('leaves every optional knob undefined so the renderer defaults apply', () => {
    const layer = wordCloudLayerOf(createWordCloudChartConfig({ data: DATA }));

    expect(layer.fontFamily).toBeUndefined();
    expect(layer.maxFontSize).toBeUndefined();
    expect(layer.minFontSize).toBeUndefined();
    expect(layer.padding).toBeUndefined();
    expect(layer.rotations).toBeUndefined();
    expect(layer.scale).toBeUndefined();
    expect(layer.seriesColors).toBeUndefined();
  });

  it('passes the chart-wide animation through', () => {
    const config = createWordCloudChartConfig({
      animation: { enterMs: 800 },
      data: DATA,
    });

    expect(config.animation).toEqual({ enterMs: 800 });
  });

  describe('tooltip', () => {
    it('omits the tooltip config when it is not enabled', () => {
      const layer = wordCloudLayerOf(createWordCloudChartConfig({ data: DATA }));

      expect(layer.tooltip).toBeUndefined();
    });

    it('builds a default tooltip when enabled', () => {
      const layer = wordCloudLayerOf(
        createWordCloudChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(layer.tooltip).toMatchObject({ enabled: true, height: 65, width: 150 });
      expect(layer.tooltip?.formatContent?.({ label: 'angular', value: 120 })).toEqual({
        label: 'angular',
        value: '120',
      });
    });

    it('honours a custom formatter and dimensions', () => {
      const formatContent = jest.fn().mockReturnValue({ label: 'x', value: 'y' });

      const layer = wordCloudLayerOf(
        createWordCloudChartConfig({
          data: DATA,
          tooltip: { enabled: true, formatContent, height: 90, width: 220 },
        })
      );

      expect(layer.tooltip).toMatchObject({ formatContent, height: 90, width: 220 });
    });
  });
});
