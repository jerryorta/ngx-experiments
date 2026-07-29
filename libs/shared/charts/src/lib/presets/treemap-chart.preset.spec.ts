import type { NgeChartConfig, NgeHierarchyDatum, NgeTreemapLayerConfig } from '../core/config';

import { renderTreemapLayer } from '../layers/treemap';
import { createTreemapChartConfig } from './treemap-chart.preset';

const DATA: NgeHierarchyDatum[] = [
  {
    children: [
      { label: 'A1', value: 30 },
      { label: 'A2', value: 20 },
    ],
    label: 'A',
  },
  { label: 'B', value: 25 },
];

/** Narrow the treemap layer the preset always emits. */
function treemapLayerOf(config: NgeChartConfig): NgeTreemapLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'treemap') as NgeTreemapLayerConfig;
}

describe('createTreemapChartConfig', () => {
  it('wires the treemap renderer and type', () => {
    const config = createTreemapChartConfig({ data: DATA });

    const layer = treemapLayerOf(config);
    expect(layer.type).toBe('treemap');
    expect(layer.renderer).toBe(renderTreemapLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off', () => {
    const config = createTreemapChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('applies a default all-around margin', () => {
    const config = createTreemapChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('flows the family options (tiling / padding / palette / depth) through to the layer', () => {
    const onClick = jest.fn();
    const layer = treemapLayerOf(
      createTreemapChartConfig({
        data: DATA,
        maxDepth: 2,
        onClick,
        padding: 3,
        paddingOuter: 4,
        paddingTop: 16,
        seriesColors: ['#111', '#222'],
        tiling: 'binary',
      })
    );

    expect(layer.tiling).toBe('binary');
    expect(layer.padding).toBe(3);
    expect(layer.paddingOuter).toBe(4);
    expect(layer.paddingTop).toBe(16);
    expect(layer.maxDepth).toBe(2);
    expect(layer.seriesColors).toEqual(['#111', '#222']);
    expect(layer.onClick).toBe(onClick);
  });

  it('flows the label options through to the layer', () => {
    const formatLabel = (d: NgeHierarchyDatum): string => d.label;
    const layer = treemapLayerOf(
      createTreemapChartConfig({
        data: DATA,
        formatLabel,
        labelColor: '#ff00ff',
        maxLabelDepth: 1,
        minLabelSize: 20,
        showLabels: true,
      })
    );

    expect(layer.showLabels).toBe(true);
    expect(layer.formatLabel).toBe(formatLabel);
    expect(layer.labelColor).toBe('#ff00ff');
    expect(layer.maxLabelDepth).toBe(1);
    expect(layer.minLabelSize).toBe(20);
  });

  it('flows the Voronoi tuning through to the layer', () => {
    const layer = treemapLayerOf(
      createTreemapChartConfig({
        convergenceRatio: 0.001,
        data: DATA,
        maxIterationCount: 120,
        seed: 42,
        tiling: 'voronoi',
      })
    );

    expect(layer.tiling).toBe('voronoi');
    expect(layer.seed).toBe(42);
    expect(layer.convergenceRatio).toBe(0.001);
    expect(layer.maxIterationCount).toBe(120);
  });

  it('builds a tooltip config with a default formatter when enabled', () => {
    const layer = treemapLayerOf(
      createTreemapChartConfig({ data: DATA, tooltip: { enabled: true } })
    );

    expect(layer.tooltip?.enabled).toBe(true);
    expect(typeof layer.tooltip?.formatContent).toBe('function');
    // The default formatter renders label + stringified value.
    expect(layer.tooltip?.formatContent?.({ label: 'Rent', value: 1800 })).toEqual({
      label: 'Rent',
      value: '1800',
    });
  });

  it('omits the tooltip config by default', () => {
    expect(treemapLayerOf(createTreemapChartConfig({ data: DATA })).tooltip).toBeUndefined();
  });
});
