import type { NgeChartConfig, NgeHierarchyDatum, NgeTreeLayerConfig } from '../core/config';

import { renderTreeLayer } from '../layers/tree';
import { createTreeChartConfig } from './tree-chart.preset';

const DATA: NgeHierarchyDatum[] = [
  {
    children: [
      { children: [{ label: 'interviews', value: 4 }], label: 'research' },
      { children: [{ label: 'prototypes', value: 6 }], label: 'design' },
    ],
    label: 'product',
  },
];

/** Narrow the tree layer the preset always emits. */
function treeLayerOf(config: NgeChartConfig): NgeTreeLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'tree') as NgeTreeLayerConfig;
}

describe('createTreeChartConfig', () => {
  it('wires the tree renderer and type', () => {
    const config = createTreeChartConfig({ data: DATA });

    const layer = treeLayerOf(config);
    expect(layer.type).toBe('tree');
    expect(layer.renderer).toBe(renderTreeLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off', () => {
    const config = createTreeChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createTreeChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('takes a caller margin over the default', () => {
    const config = createTreeChartConfig({
      data: DATA,
      margin: { bottom: 20, left: 40, right: 40, top: 20 },
    });

    expect(config.base?.margin).toEqual({ bottom: 20, left: 40, right: 40, top: 20 });
  });

  it('leaves every layout knob unset so the layer applies its own defaults', () => {
    const layer = treeLayerOf(createTreeChartConfig({ data: DATA }));

    expect(layer.alignLeaves).toBeUndefined();
    expect(layer.layout).toBeUndefined();
    expect(layer.linkShape).toBeUndefined();
    expect(layer.orientation).toBeUndefined();
    expect(layer.nodeRadius).toBeUndefined();
  });

  describe('the catalog readings', () => {
    it('passes the Dendrogram’s leaf alignment through', () => {
      const layer = treeLayerOf(createTreeChartConfig({ alignLeaves: true, data: DATA }));

      expect(layer.alignLeaves).toBe(true);
    });

    it('passes the Organisational Chart’s orientation and elbow links through', () => {
      const layer = treeLayerOf(
        createTreeChartConfig({
          data: DATA,
          linkShape: 'elbow',
          orientation: 'top-bottom',
          showLabels: true,
        })
      );

      expect(layer.orientation).toBe('top-bottom');
      expect(layer.linkShape).toBe('elbow');
      expect(layer.showLabels).toBe(true);
    });

    it('passes the Radial Convergence’s layout and radius ratio through', () => {
      const layer = treeLayerOf(
        createTreeChartConfig({ data: DATA, layout: 'radial', radiusRatio: 0.8 })
      );

      expect(layer.layout).toBe('radial');
      expect(layer.radiusRatio).toBe(0.8);
    });
  });

  describe('tooltips', () => {
    it('leaves them off unless asked for', () => {
      expect(treeLayerOf(createTreeChartConfig({ data: DATA })).tooltip).toBeUndefined();
    });

    it('supplies a default formatter reporting the node’s summed value', () => {
      const layer = treeLayerOf(createTreeChartConfig({ data: DATA, tooltip: { enabled: true } }));

      expect(layer.tooltip?.enabled).toBe(true);
      expect(layer.tooltip?.formatContent?.({ label: 'research', value: 4 })).toEqual({
        label: 'research',
        value: '4',
      });
    });

    it('takes a caller formatter and dimensions over the defaults', () => {
      const formatContent = jest.fn(() => ({ label: 'x', value: 'y' }));
      const layer = treeLayerOf(
        createTreeChartConfig({
          data: DATA,
          tooltip: { enabled: true, formatContent, height: 80, width: 200 },
        })
      );

      expect(layer.tooltip?.formatContent).toBe(formatContent);
      expect(layer.tooltip?.height).toBe(80);
      expect(layer.tooltip?.width).toBe(200);
    });
  });

  describe('pass-through', () => {
    it('forwards the label options', () => {
      const formatLabel = (d: NgeHierarchyDatum): string => d.label.toUpperCase();
      const layer = treeLayerOf(
        createTreeChartConfig({
          data: DATA,
          formatLabel,
          labelColor: '#123456',
          labelPadding: 12,
          showLabels: true,
        })
      );

      expect(layer.formatLabel).toBe(formatLabel);
      expect(layer.labelColor).toBe('#123456');
      expect(layer.labelPadding).toBe(12);
    });

    it('forwards the palette, depth cap, node radius and click handler', () => {
      const onClick = jest.fn();
      const layer = treeLayerOf(
        createTreeChartConfig({
          data: DATA,
          maxDepth: 2,
          nodeRadius: 7,
          onClick,
          seriesColors: ['#111111', '#222222'],
        })
      );

      expect(layer.maxDepth).toBe(2);
      expect(layer.nodeRadius).toBe(7);
      expect(layer.onClick).toBe(onClick);
      expect(layer.seriesColors).toEqual(['#111111', '#222222']);
    });

    it('forwards the chart-wide animation', () => {
      const config = createTreeChartConfig({ animation: { enterMs: 500 }, data: DATA });

      expect(config.animation).toEqual({ enterMs: 500 });
    });
  });
});
