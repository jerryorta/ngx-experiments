import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeBarDataPoint, NgeBarLayerConfig, NgeChartConfig } from '../core/config';

import { renderBarLayer } from '../layers/bar';
import {
  buildParetoCumulativePoints,
  createParetoChartScales,
  sortParetoDescending,
} from './nge-chart.pareto.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Unsorted category values (grand total 100). */
const BARS: NgeBarDataPoint[] = [
  { label: 'B', value: 30 },
  { label: 'A', value: 50 },
  { label: 'C', value: 20 },
];

/** Build a minimal single-bar-layer chart config for the scale factory. */
function barConfig(data: NgeBarDataPoint[]): NgeChartConfig {
  const layer: NgeBarLayerConfig = { data, renderer: renderBarLayer, type: 'bar' };
  return { layers: [layer] };
}

describe('sortParetoDescending', () => {
  it('sorts a copy descending by value, leaving the input untouched', () => {
    const sorted = sortParetoDescending(BARS);

    expect(sorted.map(d => d.label)).toEqual(['A', 'B', 'C']);
    expect(sorted.map(d => d.value)).toEqual([50, 30, 20]);
    // Original array order is preserved.
    expect(BARS.map(d => d.label)).toEqual(['B', 'A', 'C']);
  });
});

describe('buildParetoCumulativePoints', () => {
  it('accumulates the running sum as a percentage of the grand total, in the given order', () => {
    const sorted = sortParetoDescending(BARS);

    expect(buildParetoCumulativePoints(sorted)).toEqual([
      { x: 'A', y: 50 },
      { x: 'B', y: 80 },
      { x: 'C', y: 100 },
    ]);
  });

  it('reaches exactly 100% on the final point', () => {
    const points = buildParetoCumulativePoints(sortParetoDescending(BARS));

    expect(points.at(-1)?.y).toBe(100);
  });

  it('returns an empty array when the grand total is zero', () => {
    expect(buildParetoCumulativePoints([])).toEqual([]);
    expect(buildParetoCumulativePoints([{ label: 'A', value: 0 }])).toEqual([]);
  });
});

describe('createParetoChartScales', () => {
  it('returns default scales (with a percentage y2) when there are no bar layers', () => {
    const scales = createParetoChartScales({ layers: [] }, DIMENSIONS);

    expect(scales.x.domain()).toEqual([]);
    expect(scales.y.domain()).toEqual([0, 1]);
    expect(scales.y2?.domain()).toEqual([0, 100]);
  });

  it('builds a band x, a padded value y, and a [0, 100] percentage y2', () => {
    const scales = createParetoChartScales(barConfig(sortParetoDescending(BARS)), DIMENSIONS);

    expect(scales.x.domain()).toEqual(['A', 'B', 'C']);
    // Max value 50 → 10% headroom.
    expect(scales.y.domain()).toEqual([0, expect.closeTo(55, 6)]);
    expect(scales.y2?.domain()).toEqual([0, 100]);
    expect((scales.x as { bandwidth?: () => number }).bandwidth).toBeDefined();
    expect(scales.y2?.range()).toEqual([300, 0]);
  });
});
