import type {
  NgeChartConfig,
  NgeHierarchyDatum,
  NgeProportionalLayerConfig,
} from '../core/config';

import { renderProportionalLayer } from '../layers/proportional';
import { createProportionalChartConfig } from './proportional-chart.preset';

const DATA: NgeHierarchyDatum[] = [
  { label: 'Solar', value: 120 },
  { label: 'Wind', value: 80 },
  { label: 'Hydro', value: 30 },
];

/** Narrow the proportional layer the preset always emits. */
function proportionalLayerOf(config: NgeChartConfig): NgeProportionalLayerConfig {
  return config.layers
    .flat()
    .find(layer => layer.type === 'proportional') as NgeProportionalLayerConfig;
}

describe('createProportionalChartConfig', () => {
  it('wires the proportional renderer and type', () => {
    const config = createProportionalChartConfig({ data: DATA });

    const layer = proportionalLayerOf(config);
    expect(layer.type).toBe('proportional');
    expect(layer.renderer).toBe(renderProportionalLayer);
    expect(layer.data).toBe(DATA);
  });

  it('renders a single layer with both axes off (self-scaled layout)', () => {
    const config = createProportionalChartConfig({ data: DATA });

    expect(config.layers.flat()).toHaveLength(1);
    expect(config.base?.showXAxis).toBe(false);
    expect(config.base?.showYAxis).toBe(false);
  });

  it('does not expose a gestures option (single-view geometric chart)', () => {
    const config = createProportionalChartConfig({ data: DATA });

    expect(config.gestures).toBeUndefined();
  });

  it('applies a default all-around margin', () => {
    const config = createProportionalChartConfig({ data: DATA });

    expect(config.base?.margin).toEqual({ bottom: 10, left: 10, right: 10, top: 10 });
  });

  it('overrides the default margin when one is supplied', () => {
    const config = createProportionalChartConfig({
      data: DATA,
      margin: { bottom: 40, left: 20, right: 20, top: 5 },
    });

    expect(config.base?.margin).toEqual({ bottom: 40, left: 20, right: 20, top: 5 });
  });

  it('flows the family options through to the layer', () => {
    const onClick = jest.fn();
    const formatLabel = (d: NgeHierarchyDatum): string => d.label;

    const layer = proportionalLayerOf(
      createProportionalChartConfig({
        columns: 8,
        data: DATA,
        formatLabel,
        labelColor: '#abcdef',
        layout: 'nested',
        mark: 'square',
        minLabelSize: 40,
        onClick,
        padding: 6,
        rows: 4,
        seriesColors: ['#111', '#222'],
        showLabels: true,
        valuePerCell: 5,
      })
    );

    expect(layer.columns).toBe(8);
    expect(layer.formatLabel).toBe(formatLabel);
    expect(layer.labelColor).toBe('#abcdef');
    expect(layer.layout).toBe('nested');
    expect(layer.mark).toBe('square');
    expect(layer.minLabelSize).toBe(40);
    expect(layer.onClick).toBe(onClick);
    expect(layer.padding).toBe(6);
    expect(layer.rows).toBe(4);
    expect(layer.seriesColors).toEqual(['#111', '#222']);
    expect(layer.showLabels).toBe(true);
    expect(layer.valuePerCell).toBe(5);
  });

  it('leaves every optional knob undefined so the renderer defaults apply', () => {
    const layer = proportionalLayerOf(createProportionalChartConfig({ data: DATA }));

    expect(layer.mark).toBeUndefined();
    expect(layer.layout).toBeUndefined();
    expect(layer.padding).toBeUndefined();
    expect(layer.rows).toBeUndefined();
    expect(layer.columns).toBeUndefined();
    expect(layer.valuePerCell).toBeUndefined();
    expect(layer.minLabelSize).toBeUndefined();
  });

  it('passes the chart-wide animation through', () => {
    const config = createProportionalChartConfig({
      animation: { enterMs: 800 },
      data: DATA,
    });

    expect(config.animation).toEqual({ enterMs: 800 });
  });

  describe('tooltip', () => {
    it('omits the tooltip config when it is not enabled', () => {
      const layer = proportionalLayerOf(createProportionalChartConfig({ data: DATA }));

      expect(layer.tooltip).toBeUndefined();
    });

    it('builds a default tooltip when enabled', () => {
      const layer = proportionalLayerOf(
        createProportionalChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(layer.tooltip).toMatchObject({ enabled: true, height: 65, width: 150 });
      expect(layer.tooltip?.formatContent?.({ label: 'Solar', value: 120 })).toEqual({
        label: 'Solar',
        value: '120',
      });
    });

    it('reports 0 for a node with no own value (an internal node before summing)', () => {
      const layer = proportionalLayerOf(
        createProportionalChartConfig({ data: DATA, tooltip: { enabled: true } })
      );

      expect(layer.tooltip?.formatContent?.({ label: 'Mobile' })).toEqual({
        label: 'Mobile',
        value: '0',
      });
    });

    it('honours a custom formatter and dimensions', () => {
      const formatContent = jest.fn().mockReturnValue({ label: 'x', value: 'y' });

      const layer = proportionalLayerOf(
        createProportionalChartConfig({
          data: DATA,
          tooltip: { enabled: true, formatContent, height: 90, width: 220 },
        })
      );

      expect(layer.tooltip).toMatchObject({ formatContent, height: 90, width: 220 });
    });
  });
});
