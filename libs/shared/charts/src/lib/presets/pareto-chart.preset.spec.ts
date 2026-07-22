import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeBarDataPoint,
  NgeBarLayerConfig,
  NgeChartConfig,
  NgeLineLayerConfig,
} from '../core/config';

import { renderBarLayer } from '../layers/bar';
import { renderLineLayer } from '../layers/line';
import { createParetoChartConfig } from './pareto-chart.preset';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Unsorted category values (grand total 100). */
const DATA: NgeBarDataPoint[] = [
  { label: 'B', value: 30 },
  { label: 'A', value: 50 },
  { label: 'C', value: 20 },
];

function barLayerOf(config: NgeChartConfig): NgeBarLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'bar') as NgeBarLayerConfig;
}

function lineLayerOf(config: NgeChartConfig): NgeLineLayerConfig {
  return config.layers.flat().find(layer => layer.type === 'line') as NgeLineLayerConfig;
}

describe('createParetoChartConfig', () => {
  it('composes a bar layer and a secondary-axis line layer', () => {
    const config = createParetoChartConfig({ data: DATA });

    expect(barLayerOf(config).renderer).toBe(renderBarLayer);
    expect(lineLayerOf(config).renderer).toBe(renderLineLayer);
    expect(lineLayerOf(config).useSecondaryAxis).toBe(true);
    expect(typeof config.scaleFactory).toBe('function');
  });

  it('turns on all three axes with a cumulative-% label', () => {
    const config = createParetoChartConfig({ data: DATA });

    expect(config.base?.showXAxis).toBe(true);
    expect(config.base?.showYAxis).toBe(true);
    expect(config.base?.showY2Axis).toBe(true);
    expect(config.base?.y2AxisLabel).toBe('Cumulative %');
  });

  it('sorts the bars descending by default (canonical Pareto order)', () => {
    expect(barLayerOf(createParetoChartConfig({ data: DATA })).data.map(d => d.label)).toEqual([
      'A',
      'B',
      'C',
    ]);
  });

  it('preserves the input order when sort is false', () => {
    expect(
      barLayerOf(createParetoChartConfig({ data: DATA, sort: false })).data.map(d => d.label)
    ).toEqual(['B', 'A', 'C']);
  });

  it('feeds the line the cumulative % (ending at 100%) aligned to the sorted bars', () => {
    const line = lineLayerOf(createParetoChartConfig({ data: DATA }));

    expect(line.data.map(point => point.x)).toEqual(['A', 'B', 'C']);
    expect(line.data.map(point => point.y)).toEqual([50, 80, 100]);
  });

  it('applies a uniform bar color without clobbering a per-datum override', () => {
    const bar = barLayerOf(
      createParetoChartConfig({
        barColor: 'var(--bar)',
        data: [
          { color: 'var(--keep)', label: 'A', value: 50 },
          { label: 'B', value: 30 },
        ],
      })
    );

    const colorByLabel = new Map(bar.data.map(d => [d.label, d.color]));
    expect(colorByLabel.get('A')).toBe('var(--keep)');
    expect(colorByLabel.get('B')).toBe('var(--bar)');
  });

  it('exposes a scale factory returning band x, value y, and a percentage y2', () => {
    const config = createParetoChartConfig({ data: DATA });

    const scales = config.scaleFactory!(config, DIMENSIONS);
    expect(scales.x.domain()).toEqual(['A', 'B', 'C']);
    // Max value 50 → 10% headroom.
    expect(scales.y.domain()).toEqual([0, expect.closeTo(55, 6)]);
    expect(scales.y2?.domain()).toEqual([0, 100]);
  });
});
