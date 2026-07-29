import type { NgeChartConfig, NgeGraph, NgeNetworkLayerConfig } from '../core/config';

import { renderNetworkLayer } from '../layers/network';
import { createNetworkChartConfig } from './network-chart.preset';

const DATA: NgeGraph = {
  links: [
    { source: 'api', target: 'auth', value: 4 },
    { source: 'api', target: 'billing', value: 2 },
    { source: 'auth', target: 'billing', value: 1 },
  ],
};

const GROUPED_DATA: NgeGraph = {
  links: DATA.links,
  nodes: [
    { group: 'core', id: 'api' },
    { group: 'platform', id: 'auth' },
    { group: 'platform', id: 'billing' },
  ],
};

/** Narrow the network layer the preset always emits. */
function networkLayerOf(config: NgeChartConfig): NgeNetworkLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'network') as NgeNetworkLayerConfig;
}

describe('createNetworkChartConfig', () => {
  it('wires the network renderer and type', () => {
    const config = createNetworkChartConfig({ data: DATA });

    const layer = networkLayerOf(config);
    expect(layer.type).toBe('network');
    expect(layer.renderer).toBe(renderNetworkLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off', () => {
    const config = createNetworkChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createNetworkChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('takes a caller margin over the default', () => {
    const config = createNetworkChartConfig({
      data: DATA,
      margin: { bottom: 20, left: 40, right: 40, top: 20 },
    });

    expect(config.base?.margin).toEqual({ bottom: 20, left: 40, right: 40, top: 20 });
  });

  it('flows the family options through to the layer', () => {
    const onClick = jest.fn();
    const formatLabel = jest.fn(() => 'x');
    const layer = networkLayerOf(
      createNetworkChartConfig({
        axisCount: 4,
        charge: -400,
        clusterStrength: 0.6,
        data: GROUPED_DATA,
        directed: true,
        formatLabel,
        innerRadius: 0.25,
        labelColor: 'var(--custom-label)',
        labelPadding: 10,
        layout: 'hive',
        linkDistance: 90,
        maxNodeRadius: 24,
        minNodeRadius: 6,
        onClick,
        radiusRatio: 0.9,
        seed: 7,
        seriesColors: ['#111111', '#222222'],
        showLabels: true,
        tickCount: 120,
      })
    );

    expect(layer.axisCount).toBe(4);
    expect(layer.charge).toBe(-400);
    expect(layer.clusterStrength).toBe(0.6);
    expect(layer.directed).toBe(true);
    expect(layer.formatLabel).toBe(formatLabel);
    expect(layer.innerRadius).toBe(0.25);
    expect(layer.labelColor).toBe('var(--custom-label)');
    expect(layer.labelPadding).toBe(10);
    expect(layer.layout).toBe('hive');
    expect(layer.linkDistance).toBe(90);
    expect(layer.maxNodeRadius).toBe(24);
    expect(layer.minNodeRadius).toBe(6);
    expect(layer.onClick).toBe(onClick);
    expect(layer.radiusRatio).toBe(0.9);
    expect(layer.seed).toBe(7);
    expect(layer.seriesColors).toEqual(['#111111', '#222222']);
    expect(layer.showLabels).toBe(true);
    expect(layer.tickCount).toBe(120);
  });

  it('leaves every option unset when the caller supplies only data', () => {
    const layer = networkLayerOf(createNetworkChartConfig({ data: DATA }));

    expect(layer.layout).toBeUndefined();
    expect(layer.directed).toBeUndefined();
    expect(layer.showLabels).toBeUndefined();
    expect(layer.seed).toBeUndefined();
    expect(layer.tooltip).toBeUndefined();
  });

  it('passes the chart-wide animation through', () => {
    const config = createNetworkChartConfig({ animation: { enterMs: 500 }, data: DATA });

    expect(config.animation).toEqual({ enterMs: 500 });
  });

  describe('tooltip', () => {
    it('stays off unless enabled', () => {
      expect(networkLayerOf(createNetworkChartConfig({ data: DATA })).tooltip).toBeUndefined();
    });

    it('supplies default dimensions and a label + value formatter', () => {
      const layer = networkLayerOf(
        createNetworkChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(layer.tooltip?.enabled).toBe(true);
      expect(layer.tooltip?.height).toBe(65);
      expect(layer.tooltip?.width).toBe(150);
      expect(layer.tooltip?.formatContent?.({ id: 'api', value: 3 })).toEqual({
        label: 'api',
        value: '3',
      });
    });

    it('falls back from label to id in the default formatter', () => {
      const layer = networkLayerOf(
        createNetworkChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(
        layer.tooltip?.formatContent?.({ id: 'api', label: 'API gateway', value: 1 })?.label
      ).toBe('API gateway');
    });

    it('takes a caller formatter and dimensions', () => {
      const formatContent = jest.fn(() => ({ label: 'x', value: 'y' }));
      const layer = networkLayerOf(
        createNetworkChartConfig({
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
    it('produces the Network Visualisation defaults (force layout, no arrowheads)', () => {
      const layer = networkLayerOf(
        createNetworkChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(layer.layout).toBeUndefined();
      expect(layer.directed).toBeUndefined();
      expect(layer.tooltip?.enabled).toBe(true);
    });

    it('produces the Sociogram via directed + showLabels on the force layout', () => {
      const layer = networkLayerOf(
        createNetworkChartConfig({ data: DATA, directed: true, showLabels: true })
      );

      expect(layer.layout).toBeUndefined();
      expect(layer.directed).toBe(true);
      expect(layer.showLabels).toBe(true);
    });

    it('produces the Clustered Force Layout via layout: "cluster"', () => {
      const layer = networkLayerOf(
        createNetworkChartConfig({ data: GROUPED_DATA, layout: 'cluster' })
      );

      expect(layer.layout).toBe('cluster');
      expect(layer.data.nodes?.every(node => node.group !== undefined)).toBe(true);
    });

    it('produces the Hive Plot via layout: "hive"', () => {
      const layer = networkLayerOf(
        createNetworkChartConfig({ axisCount: 3, data: GROUPED_DATA, layout: 'hive' })
      );

      expect(layer.layout).toBe('hive');
      expect(layer.axisCount).toBe(3);
    });
  });
});
