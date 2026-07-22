import { scaleBand, scaleLinear } from 'd3-scale';
import { stack, stackOffsetExpand, stackOffsetNone } from 'd3-shape';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeStackedBarDataPoint,
  NgeStackedBarLayerConfig,
} from '../core/config';

import { orderedBandCategories } from '../core/gesture';

/** Stacking offset accepted by {@link buildStackedBarSeries} (mirrors the layer config). */
export type StackedBarOffset = 'expand' | 'none';

/**
 * One resolved stack segment within a column: `[y0, y1]` in data space (both fed
 * through the value scale at render time), paired with its raw `value`.
 */
export interface StackedBarSegment {
  seriesId: string;
  value: number;
  y0: number;
  y1: number;
}

/**
 * One resolved column (category): its raw group `total` (the sum of every series'
 * value — the Marimekko WIDTH weight) plus the ordered stack `segments`.
 */
export interface StackedBarColumn {
  category: string;
  segments: StackedBarSegment[];
  total: number;
}

/**
 * Result of {@link buildStackedBarSeries}: the ordered category + series lists,
 * the per-column stack segments, and the overall `[min, max]` value extent
 * covering every segment edge (`[0, 1]` for `expand`).
 */
export interface BuiltStackedBarSeries {
  categories: string[];
  columns: StackedBarColumn[];
  extent: [number, number];
  seriesOrder: string[];
}

/**
 * One resolved Marimekko column: variable `width` (∝ its group total) at a
 * cumulative `x` offset along the bounded width.
 */
export interface MarimekkoColumn {
  category: string;
  width: number;
  x: number;
}

/**
 * Options for {@link createStackedBarChartScales}.
 */
export interface CreateStackedBarChartScalesOptions {
  /**
   * Explicit value-axis domain override for the LINEAR (value) axis — replaces the
   * stack-aware extent. Applied to whichever axis is the value axis: `x` in
   * horizontal orientation.
   */
  xDomain?: [number, number];

  /**
   * Explicit value-axis domain override for the LINEAR (value) axis — replaces the
   * stack-aware extent. Applied to whichever axis is the value axis: `y` in the
   * default vertical orientation.
   */
  yDomain?: [number, number];
}

/**
 * The shared geometry core used by BOTH the stacked-bar scale factory (for a
 * stack-aware value extent) AND the renderer (for column segments).
 *
 * Pivots the long-format points to wide (category × seriesId, missing cells → 0)
 * and runs `d3.stack()` with the matching offset — `stackOffsetNone` (absolute)
 * or `stackOffsetExpand` (each column normalised to `[0, 1]`). Category and series
 * order are both first-seen. Each column also carries its raw `total` (sum of
 * series values) so a Marimekko layout can weight column widths by it.
 *
 * @param data - The layer's data points.
 * @param stackOffset - Stacking offset; `'expand'` normalises each column to 100%.
 * @returns Per-column segments + the overall `[min, max]` value extent.
 */
export function buildStackedBarSeries(
  data: NgeStackedBarDataPoint[],
  stackOffset?: StackedBarOffset
): BuiltStackedBarSeries {
  if (data.length === 0) {
    return { categories: [], columns: [], extent: [0, 1], seriesOrder: [] };
  }

  // Collect categories + series in first-seen order, and a value lookup for the
  // long→wide pivot (last value wins for a duplicate (category, series) cell).
  const categories: string[] = [];
  const seriesOrder: string[] = [];
  const valueByCategory = new Map<string, Map<string, number>>();

  for (const point of data) {
    let inner = valueByCategory.get(point.category);
    if (!inner) {
      inner = new Map<string, number>();
      valueByCategory.set(point.category, inner);
      categories.push(point.category);
    }
    if (!seriesOrder.includes(point.seriesId)) {
      seriesOrder.push(point.seriesId);
    }
    inner.set(point.seriesId, point.value);
  }

  // Pivot long→wide: one row per category, one column per seriesId (missing → 0).
  const rows = categories.map(category => {
    const inner = valueByCategory.get(category);
    const row: Record<string, number> = {};
    for (const id of seriesOrder) {
      row[id] = inner?.get(id) ?? 0;
    }
    return row;
  });

  const stacked = stack<Record<string, number>>()
    .keys(seriesOrder)
    .offset(stackOffset === 'expand' ? stackOffsetExpand : stackOffsetNone)(rows);

  const columns: StackedBarColumn[] = categories.map((category, colIndex) => {
    const row = rows[colIndex];
    const segments: StackedBarSegment[] = seriesOrder.map((seriesId, seriesIndex) => {
      const segment = stacked[seriesIndex][colIndex];
      return { seriesId, value: row[seriesId], y0: segment[0], y1: segment[1] };
    });
    const total = seriesOrder.reduce((sum, id) => sum + row[id], 0);
    return { category, segments, total };
  });

  return { categories, columns, extent: computeExtent(columns), seriesOrder };
}

/**
 * Creates scales for stacked-bar visualization.
 *
 * Collects points from `type === 'stacked-bar'` layers, builds a band scale over
 * the first-seen categories (with `barPadding`) and a linear value scale over the
 * union of each layer's stack-aware extent (`[0, 1]` under `expand`). Orientation
 * swaps which axis is the band vs the value axis; a Marimekko layer
 * (`bandWidthAccessor` set) is vertical-only. An explicit value-domain override
 * (`yDomain` vertical / `xDomain` horizontal) replaces the derived extent.
 *
 * @param config - The chart configuration containing layers.
 * @param dimensions - The bounded dimensions for the chart area.
 * @param options - Optional value-domain overrides.
 * @returns Scales object with x and y scales.
 */
export function createStackedBarChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions,
  options?: CreateStackedBarChartScalesOptions
): NgeChartScales {
  const layers: NgeStackedBarLayerConfig[] = [];
  const allPoints: NgeStackedBarDataPoint[] = [];

  for (const layer of config.layers.flat()) {
    if (layer.type === 'stacked-bar') {
      const stackedLayer = layer as NgeStackedBarLayerConfig;
      layers.push(stackedLayer);
      allPoints.push(...stackedLayer.data);
    }
  }

  if (allPoints.length === 0) {
    // Return default scales if no data.
    return {
      x: scaleBand<string>().domain([]).range([0, dimensions.boundedWidth]),
      y: scaleLinear().domain([0, 1]).range([dimensions.boundedHeight, 0]),
    };
  }

  // First layer decides orientation + padding (mirrors the bar factory). A
  // Marimekko layer is vertical-only even if `orientation: 'horizontal'` is set.
  const firstLayer = layers[0];
  const isMarimekko = firstLayer.bandWidthAccessor !== undefined;
  const isVertical = isMarimekko || firstLayer.orientation !== 'horizontal';
  const barPadding = firstLayer.barPadding ?? 0.2;

  // Value domain: union of each layer's stack-aware extent (an explicit
  // value-axis override wins).
  let lo = Infinity;
  let hi = -Infinity;
  for (const layer of layers) {
    const [layerLo, layerHi] = buildStackedBarSeries(layer.data, layer.stackOffset).extent;
    lo = Math.min(lo, layerLo);
    hi = Math.max(hi, layerHi);
  }
  const valueExtent: [number, number] = Number.isFinite(lo) ? [lo, hi] : [0, 1];
  const valueDomain = (isVertical ? options?.yDomain : options?.xDomain) ?? valueExtent;

  const categories = orderedBandCategories(allPoints, d => d.category);
  const bandScale = scaleBand<string>().domain(categories).padding(barPadding);

  if (isVertical) {
    return {
      x: bandScale.range([0, dimensions.boundedWidth]),
      y: scaleLinear().domain(valueDomain).range([dimensions.boundedHeight, 0]),
    };
  }

  return {
    x: scaleLinear().domain(valueDomain).range([0, dimensions.boundedWidth]),
    y: bandScale.range([0, dimensions.boundedHeight]),
  };
}

/**
 * Self-computed contiguous variable-width column layout for a Marimekko chart:
 * each column's width is proportional to `bandWidthAccessor(category, total)`,
 * normalised so the widths fill `boundedWidth` minus the inter-column padding.
 *
 * `padding` is a `[0, 1)` fraction of `boundedWidth` reserved for the gaps
 * between columns (0 → contiguous, classic Mekko). Non-positive weights are
 * floored at 0; an all-zero weight set falls back to equal widths.
 *
 * @param columns - The resolved columns (for category + `total`).
 * @param boundedWidth - The plot's bounded width.
 * @param padding - Fraction of `boundedWidth` reserved for inter-column gaps.
 * @param bandWidthAccessor - Per-column relative width weight.
 * @returns Each column's `x` offset and `width`.
 */
export function computeMarimekkoColumns(
  columns: StackedBarColumn[],
  boundedWidth: number,
  padding: number,
  bandWidthAccessor: (category: string, total: number) => number
): MarimekkoColumn[] {
  if (columns.length === 0) {
    return [];
  }

  const gapCount = columns.length - 1;
  const totalGap = gapCount > 0 ? padding * boundedWidth : 0;
  const gap = gapCount > 0 ? totalGap / gapCount : 0;
  const available = boundedWidth - totalGap;

  const weights = columns.map(column =>
    Math.max(0, bandWidthAccessor(column.category, column.total))
  );
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);

  let cursor = 0;
  return columns.map((column, index) => {
    const width =
      totalWeight > 0 ? (weights[index] / totalWeight) * available : available / columns.length;
    const result: MarimekkoColumn = { category: column.category, width, x: cursor };
    cursor += width + gap;
    return result;
  });
}

/**
 * The `[min, max]` value extent across every segment edge (both y0 and y1), so
 * the domain covers stacked totals (`none`), `[0, 1]` (`expand`), and any
 * negative baselines. Falls back to `[0, 1]` when there are no finite edges.
 */
function computeExtent(columns: StackedBarColumn[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;

  for (const column of columns) {
    for (const segment of column.segments) {
      min = Math.min(min, segment.y0, segment.y1);
      max = Math.max(max, segment.y0, segment.y1);
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1];
  }

  return [min, max];
}
