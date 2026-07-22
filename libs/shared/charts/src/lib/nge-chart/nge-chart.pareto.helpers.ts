import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeBarDataPoint,
  NgeBarLayerConfig,
  NgeChartConfig,
  NgeLineDataPoint,
} from '../core/config';

import { orderedBandCategories } from '../core/gesture';

/**
 * Sort bar points descending by value — the canonical Pareto ordering (biggest
 * contributors first). Pure: returns a new array, leaving the input untouched.
 *
 * @param data - The bar points to order.
 * @returns A new array sorted by descending `value`.
 */
export function sortParetoDescending(data: NgeBarDataPoint[]): NgeBarDataPoint[] {
  return [...data].sort((a, b) => b.value - a.value);
}

/**
 * Cumulative-percentage line points for a Pareto overlay: the running sum of the
 * bar values, in the GIVEN order, as a percentage of the grand total, positioned
 * at each bar's `label`. Assumes the data is already in Pareto order (see
 * {@link sortParetoDescending}); the final point is 100%. Returns an empty array
 * when the grand total is 0 (avoids a divide-by-zero flat line).
 *
 * @param data - The (pre-sorted) bar points.
 * @returns Line points `{ x: label, y: cumulativePercent }`.
 */
export function buildParetoCumulativePoints(data: NgeBarDataPoint[]): NgeLineDataPoint[] {
  let grandTotal = 0;
  for (const point of data) {
    grandTotal += point.value;
  }
  if (grandTotal === 0) {
    return [];
  }

  let running = 0;
  return data.map(point => {
    running += point.value;
    return { x: point.label, y: (running / grandTotal) * 100 };
  });
}

/**
 * Creates scales for a Pareto visualization: a band `x` over the bar labels, a
 * linear `y` over the bar values (`[0, max]` with 10% headroom), and a linear
 * `y2` percentage scale (`[0, 100]`) for the cumulative-line overlay. The `bar`
 * layer renders against `x`/`y`; the `line` layer renders against `x`/`y2` (via
 * `useSecondaryAxis`). Reads the `type === 'bar'` layers for labels + values.
 *
 * @param config - The chart configuration containing the bar + line layers.
 * @param dimensions - The bounded dimensions for the chart area.
 * @returns Scales object with x, y, and y2 scales.
 */
export function createParetoChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions
): NgeChartScales {
  const barPoints: NgeBarDataPoint[] = [];
  let barPadding = 0.2;

  for (const layer of config.layers.flat()) {
    if (layer.type === 'bar') {
      const barLayer = layer as NgeBarLayerConfig;
      barPoints.push(...barLayer.data);
      barPadding = barLayer.barPadding ?? barPadding;
    }
  }

  const y2Scale = scaleLinear().domain([0, 100]).range([dimensions.boundedHeight, 0]);

  if (barPoints.length === 0) {
    return {
      x: scaleBand<string>().domain([]).range([0, dimensions.boundedWidth]),
      y: scaleLinear().domain([0, 1]).range([dimensions.boundedHeight, 0]),
      y2: y2Scale,
    };
  }

  const labels = orderedBandCategories(barPoints, d => d.label);
  const maxValue = Math.max(0, ...barPoints.map(d => d.value)) * 1.1;
  const bandScale = scaleBand<string>().domain(labels).padding(barPadding);

  return {
    x: bandScale.range([0, dimensions.boundedWidth]),
    y: scaleLinear()
      .domain([0, maxValue || 1])
      .range([dimensions.boundedHeight, 0]),
    y2: y2Scale,
  };
}
