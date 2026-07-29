import type { NgeChartConfig, NgeGraph, NgeSankeyLayerConfig } from '../core/config';

import { renderSankeyLayer } from '../layers/sankey';
import { createSankeyChartConfig } from './sankey-chart.preset';

const DATA: NgeGraph = {
  links: [
    { source: 'Salary', target: 'Budget', value: 5200 },
    { source: 'Budget', target: 'Housing', value: 2100 },
    { source: 'Budget', target: 'Savings', value: 1400 },
  ],
};

/** Narrow the sankey layer the preset always emits. */
function sankeyLayerOf(config: NgeChartConfig): NgeSankeyLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'sankey') as NgeSankeyLayerConfig;
}

describe('createSankeyChartConfig', () => {
  it('wires the sankey renderer and type', () => {
    const config = createSankeyChartConfig({ data: DATA });

    const layer = sankeyLayerOf(config);
    expect(layer.type).toBe('sankey');
    expect(layer.renderer).toBe(renderSankeyLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off', () => {
    const config = createSankeyChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createSankeyChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('takes a caller margin over the default', () => {
    const config = createSankeyChartConfig({
      data: DATA,
      margin: { bottom: 20, left: 40, right: 40, top: 20 },
    });

    expect(config.base?.margin).toEqual({ bottom: 20, left: 40, right: 40, top: 20 });
  });

  it('flows the family options through to the layer', () => {
    const onClick = jest.fn();
    const layer = sankeyLayerOf(
      createSankeyChartConfig({
        data: DATA,
        iterations: 12,
        labelPadding: 10,
        linkShape: 'parallelogram',
        nodeAlign: 'left',
        nodePadding: 14,
        nodeWidth: 24,
        onClick,
        seriesColors: ['#111111', '#222222'],
        showLabels: true,
      })
    );

    expect(layer.iterations).toBe(12);
    expect(layer.labelPadding).toBe(10);
    expect(layer.linkShape).toBe('parallelogram');
    expect(layer.nodeAlign).toBe('left');
    expect(layer.nodePadding).toBe(14);
    expect(layer.nodeWidth).toBe(24);
    expect(layer.onClick).toBe(onClick);
    expect(layer.seriesColors).toEqual(['#111111', '#222222']);
    expect(layer.showLabels).toBe(true);
  });

  it('leaves every option unset when the caller supplies only data', () => {
    const layer = sankeyLayerOf(createSankeyChartConfig({ data: DATA }));

    expect(layer.linkShape).toBeUndefined();
    expect(layer.nodeAlign).toBeUndefined();
    expect(layer.showLabels).toBeUndefined();
    expect(layer.tooltip).toBeUndefined();
  });

  it('passes the chart-wide animation through', () => {
    const config = createSankeyChartConfig({ animation: { enterMs: 500 }, data: DATA });

    expect(config.animation).toEqual({ enterMs: 500 });
  });

  describe('tooltip', () => {
    it('stays off unless enabled', () => {
      expect(sankeyLayerOf(createSankeyChartConfig({ data: DATA })).tooltip).toBeUndefined();
    });

    it('supplies default dimensions and a label + value formatter', () => {
      const layer = sankeyLayerOf(
        createSankeyChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(layer.tooltip?.enabled).toBe(true);
      expect(layer.tooltip?.height).toBe(65);
      expect(layer.tooltip?.width).toBe(150);
      expect(layer.tooltip?.formatContent?.({ id: 'Budget', value: 5200 })).toEqual({
        label: 'Budget',
        value: '5200',
      });
    });

    it('falls back from label to id in the default formatter', () => {
      const layer = sankeyLayerOf(
        createSankeyChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(
        layer.tooltip?.formatContent?.({ id: 'Budget', label: 'Monthly budget', value: 1 })?.label
      ).toBe('Monthly budget');
    });

    it('takes a caller formatter and dimensions', () => {
      const formatContent = jest.fn(() => ({ label: 'x', value: 'y' }));
      const layer = sankeyLayerOf(
        createSankeyChartConfig({
          data: DATA,
          tooltip: { enabled: true, formatContent, height: 80, width: 200 },
        })
      );

      expect(layer.tooltip?.formatContent).toBe(formatContent);
      expect(layer.tooltip?.height).toBe(80);
      expect(layer.tooltip?.width).toBe(200);
    });
  });
});
