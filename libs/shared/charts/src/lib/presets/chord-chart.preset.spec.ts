import type { NgeChartConfig, NgeChordLayerConfig, NgeGraph } from '../core/config';

import { renderChordLayer } from '../layers/chord';
import { createChordChartConfig } from './chord-chart.preset';

const DATA: NgeGraph = {
  links: [
    { source: 'Design', target: 'Engineering', value: 20 },
    { source: 'Design', target: 'Product', value: 15 },
    { source: 'Engineering', target: 'Product', value: 10 },
  ],
};

/** Narrow the chord layer the preset always emits. */
function chordLayerOf(config: NgeChartConfig): NgeChordLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'chord') as NgeChordLayerConfig;
}

describe('createChordChartConfig', () => {
  it('wires the chord renderer and type', () => {
    const config = createChordChartConfig({ data: DATA });

    const layer = chordLayerOf(config);
    expect(layer.type).toBe('chord');
    expect(layer.renderer).toBe(renderChordLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off', () => {
    const config = createChordChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createChordChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('takes a caller margin over the default', () => {
    const config = createChordChartConfig({
      data: DATA,
      margin: { bottom: 20, left: 40, right: 40, top: 20 },
    });

    expect(config.base?.margin).toEqual({ bottom: 20, left: 40, right: 40, top: 20 });
  });

  it('flows the family options through to the layer', () => {
    const onClick = jest.fn();
    const formatLabel = jest.fn(() => 'x');
    const layer = chordLayerOf(
      createChordChartConfig({
        data: DATA,
        directed: true,
        endAngle: Math.PI,
        formatLabel,
        innerRadius: 0.75,
        labelColor: 'var(--custom-label)',
        labelPadding: 10,
        layout: 'linear',
        linkMark: 'edge',
        onClick,
        padAngle: 0.02,
        radiusRatio: 0.9,
        seriesColors: ['#111111', '#222222'],
        showLabels: true,
        sortSubgroups: 'ascending',
        startAngle: 0.1,
      })
    );

    expect(layer.directed).toBe(true);
    expect(layer.endAngle).toBe(Math.PI);
    expect(layer.formatLabel).toBe(formatLabel);
    expect(layer.innerRadius).toBe(0.75);
    expect(layer.labelColor).toBe('var(--custom-label)');
    expect(layer.labelPadding).toBe(10);
    expect(layer.layout).toBe('linear');
    expect(layer.linkMark).toBe('edge');
    expect(layer.onClick).toBe(onClick);
    expect(layer.padAngle).toBe(0.02);
    expect(layer.radiusRatio).toBe(0.9);
    expect(layer.seriesColors).toEqual(['#111111', '#222222']);
    expect(layer.showLabels).toBe(true);
    expect(layer.sortSubgroups).toBe('ascending');
    expect(layer.startAngle).toBe(0.1);
  });

  it('leaves every option unset when the caller supplies only data', () => {
    const layer = chordLayerOf(createChordChartConfig({ data: DATA }));

    expect(layer.directed).toBeUndefined();
    expect(layer.layout).toBeUndefined();
    expect(layer.linkMark).toBeUndefined();
    expect(layer.showLabels).toBeUndefined();
    expect(layer.tooltip).toBeUndefined();
  });

  it('passes the chart-wide animation through', () => {
    const config = createChordChartConfig({ animation: { enterMs: 500 }, data: DATA });

    expect(config.animation).toEqual({ enterMs: 500 });
  });

  describe('tooltip', () => {
    it('stays off unless enabled', () => {
      expect(chordLayerOf(createChordChartConfig({ data: DATA })).tooltip).toBeUndefined();
    });

    it('supplies default dimensions and a label + value formatter', () => {
      const layer = chordLayerOf(
        createChordChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(layer.tooltip?.enabled).toBe(true);
      expect(layer.tooltip?.height).toBe(65);
      expect(layer.tooltip?.width).toBe(150);
      expect(layer.tooltip?.formatContent?.({ id: 'Engineering', value: 30 })).toEqual({
        label: 'Engineering',
        value: '30',
      });
    });

    it('falls back from label to id in the default formatter', () => {
      const layer = chordLayerOf(
        createChordChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(
        layer.tooltip?.formatContent?.({ id: 'Engineering', label: 'Eng. team', value: 1 })?.label
      ).toBe('Eng. team');
    });

    it('takes a caller formatter and dimensions', () => {
      const formatContent = jest.fn(() => ({ label: 'x', value: 'y' }));
      const layer = chordLayerOf(
        createChordChartConfig({
          data: DATA,
          tooltip: { enabled: true, formatContent, height: 80, width: 200 },
        })
      );

      expect(layer.tooltip?.formatContent).toBe(formatContent);
      expect(layer.tooltip?.height).toBe(80);
      expect(layer.tooltip?.width).toBe(200);
    });
  });

  describe('catalog variants', () => {
    it('produces the Chord Diagram defaults (circular layout, ribbon links)', () => {
      const layer = chordLayerOf(
        createChordChartConfig({ data: DATA, showLabels: true, tooltip: { enabled: true } })
      );

      expect(layer.layout).toBeUndefined();
      expect(layer.linkMark).toBeUndefined();
      expect(layer.showLabels).toBe(true);
      expect(layer.tooltip?.enabled).toBe(true);
    });

    it('produces the Non-ribbon Chord via linkMark: "edge"', () => {
      const layer = chordLayerOf(
        createChordChartConfig({ data: DATA, linkMark: 'edge', showLabels: true })
      );

      expect(layer.layout).toBeUndefined();
      expect(layer.linkMark).toBe('edge');
      expect(layer.showLabels).toBe(true);
    });

    it('produces the Arc Diagram via layout: "linear"', () => {
      const layer = chordLayerOf(
        createChordChartConfig({ data: DATA, layout: 'linear', showLabels: true })
      );

      expect(layer.layout).toBe('linear');
      expect(layer.showLabels).toBe(true);
    });
  });
});
