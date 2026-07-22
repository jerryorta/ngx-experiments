import { scaleLinear, scalePoint, scaleTime } from 'd3-scale';
import {
  stack,
  stackOffsetDiverging,
  stackOffsetExpand,
  stackOffsetNone,
  stackOffsetWiggle,
} from 'd3-shape';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeAreaDataPoint, NgeAreaLayerConfig, NgeChartConfig } from '../core/config';

import { computeLineXDataDomain } from './nge-chart.line.helpers';

/** Series bucket key for points that carry no explicit `seriesId`. */
const DEFAULT_SERIES_ID = '__default__';

/** Stacking offset accepted by {@link buildAreaSeries} (mirrors the layer config). */
export type AreaStackOffset = 'diverging' | 'expand' | 'none' | 'wiggle';

/**
 * One resolved band segment for a single x position: the fill spans `[y0, y1]`
 * in data space (both fed through `scales.y` at render time).
 */
export interface AreaBand {
  x: Date | number | string;
  y0: number;
  y1: number;
}

/** One resolved series: its identity, palette index, and ordered band segments. */
export interface AreaSeries {
  bands: AreaBand[];
  id: string;
  index: number;
}

/**
 * Result of {@link buildAreaSeries}: the per-series bands (in first-seen series
 * order) plus the overall `[yMin, yMax]` extent covering every band edge.
 */
export interface BuiltAreaSeries {
  extent: [number, number];
  series: AreaSeries[];
}

/**
 * Options for {@link createAreaChartScales}.
 */
export interface CreateAreaChartScalesOptions {
  /**
   * Explicit X domain — continuous zoom override for LINEAR / TIME x only
   * (epoch ms for time). Ignored for categorical/point x. Replaces the
   * data-driven x extent when set.
   */
  xDomain?: [number, number];

  /**
   * Explicit Y domain `[min, max]` — override that replaces the stack/range-aware
   * extent derived from {@link buildAreaSeries}.
   */
  yDomain?: [number, number];
}

/**
 * The shared geometry core used by BOTH the area scale factory (for a
 * stack/range-aware y extent) AND the renderer (for band paths).
 *
 * Mode selection:
 * - **Range** — if ANY point carries `y0`, each band is `[point.y0, point.y]`
 *   (no stacking).
 * - **Stacked** — else if there are 2+ series AND `stackOffset` is provided
 *   (including `'none'`), points are pivoted long→wide and run through
 *   `d3.stack()` with the matching offset (`none`/`expand`/`wiggle`/`diverging`).
 * - **Overlaid** — otherwise (single series, or multi-series without a
 *   `stackOffset`), each band rises from a zero baseline: `[0, point.y]`.
 *
 * @param data - The layer's data points.
 * @param stackOffset - Stacking offset; enables stacked mode for 2+ series.
 * @returns Per-series bands + the overall `[yMin, yMax]` extent.
 */
export function buildAreaSeries(
  data: NgeAreaDataPoint[],
  stackOffset?: AreaStackOffset
): BuiltAreaSeries {
  if (data.length === 0) {
    return { extent: [0, 1], series: [] };
  }

  // Group points by series in first-seen order.
  const seriesOrder: string[] = [];
  const grouped = new Map<string, NgeAreaDataPoint[]>();
  for (const point of data) {
    const id = point.seriesId ?? DEFAULT_SERIES_ID;
    if (!grouped.has(id)) {
      grouped.set(id, []);
      seriesOrder.push(id);
    }
    grouped.get(id)!.push(point);
  }

  const isRange = data.some(point => point.y0 !== undefined);
  const isStacked = !isRange && seriesOrder.length >= 2 && stackOffset !== undefined;

  const series = isStacked
    ? buildStackedSeries(seriesOrder, grouped, stackOffset as AreaStackOffset)
    : buildUnstackedSeries(seriesOrder, grouped, isRange);

  return { extent: computeExtent(series), series };
}

/**
 * Creates scales for area chart visualization.
 *
 * Collects points from `type === 'area'` layers (the line factory only sees
 * `type === 'line'` layers), builds the x scale identically to the line factory
 * — a point scale for string x, linear/time for number/Date x reusing
 * `computeLineXDataDomain` — and derives the y domain from the stack/range-aware
 * extent of {@link buildAreaSeries} so it covers stacked totals, `expand` →
 * `[0, 1]`, the `wiggle`/`diverging` symmetric band, and range → `[minY0, maxY]`.
 *
 * @param config - The chart configuration containing layers.
 * @param dimensions - The bounded dimensions for the chart area.
 * @param options - Optional continuous-zoom domain overrides.
 * @returns Scales object with x and y scales.
 */
export function createAreaChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions,
  options?: CreateAreaChartScalesOptions
): NgeChartScales {
  // Collect all area layers and their points.
  const areaLayers: NgeAreaLayerConfig[] = [];
  const allPoints: NgeAreaDataPoint[] = [];

  for (const layer of config.layers.flat()) {
    if (layer.type === 'area') {
      const areaLayer = layer as NgeAreaLayerConfig;
      areaLayers.push(areaLayer);
      allPoints.push(...areaLayer.data);
    }
  }

  if (allPoints.length === 0) {
    // Return default scales if no data.
    return {
      x: scalePoint<string>().domain([]).range([0, dimensions.boundedWidth]),
      y: scaleLinear().domain([0, 1]).range([dimensions.boundedHeight, 0]),
    };
  }

  // Y domain: union of each layer's stack/range-aware extent (an explicit
  // yDomain override wins — continuous zoom).
  let yLo = Infinity;
  let yHi = -Infinity;
  for (const layer of areaLayers) {
    const [lo, hi] = buildAreaSeries(layer.data, layer.stackOffset).extent;
    yLo = Math.min(yLo, lo);
    yHi = Math.max(yHi, hi);
  }
  const yScaleDomain = options?.yDomain ?? (Number.isFinite(yLo) ? [yLo, yHi] : [0, 1]);
  const yScale = scaleLinear().domain(yScaleDomain).range([dimensions.boundedHeight, 0]);

  // X scale mirrors the line factory: point scale for string x, linear/time for
  // number/Date x (area points are structurally assignable to NgeLineDataPoint).
  const firstX = allPoints[0].x;
  const xType = firstX instanceof Date ? 'time' : typeof firstX === 'number' ? 'number' : 'string';

  let xScale: NgeChartScales['x'];

  if (xType === 'string') {
    const xValues: string[] = [];
    for (const point of allPoints) {
      const strVal = String(point.x);
      if (!xValues.includes(strVal)) {
        xValues.push(strVal);
      }
    }
    xScale = scalePoint<string>().domain(xValues).range([0, dimensions.boundedWidth]).padding(0);
  } else {
    const [xLo, xHi] = options?.xDomain ?? computeLineXDataDomain(allPoints) ?? [0, 1];
    xScale =
      xType === 'number'
        ? scaleLinear().domain([xLo, xHi]).range([0, dimensions.boundedWidth])
        : scaleTime()
            .domain([new Date(xLo), new Date(xHi)])
            .range([0, dimensions.boundedWidth]);
  }

  return { x: xScale, y: yScale };
}

/**
 * Overlaid (zero-baseline) or range bands — one band per point, per series.
 */
function buildUnstackedSeries(
  seriesOrder: string[],
  grouped: Map<string, NgeAreaDataPoint[]>,
  isRange: boolean
): AreaSeries[] {
  return seriesOrder.map((id, index) => ({
    bands: sortedPoints(grouped.get(id) ?? []).map(point => ({
      x: point.x,
      y0: isRange ? (point.y0 ?? 0) : 0,
      y1: point.y,
    })),
    id,
    index,
  }));
}

/**
 * Stacked bands via long→wide pivot + `d3.stack()` with the mapped offset.
 * Missing (series, x) cells contribute 0 so every column stacks coherently.
 */
function buildStackedSeries(
  seriesOrder: string[],
  grouped: Map<string, NgeAreaDataPoint[]>,
  stackOffset: AreaStackOffset
): AreaSeries[] {
  const xOrder = collectSortedX(grouped, seriesOrder);

  // Per-series value lookup keyed by x for the pivot.
  const valueBySeries = new Map<string, Map<string, number>>();
  for (const id of seriesOrder) {
    const inner = new Map<string, number>();
    for (const point of grouped.get(id) ?? []) {
      inner.set(xKeyOf(point.x), point.y);
    }
    valueBySeries.set(id, inner);
  }

  // Pivot long→wide: one row per x, one column per seriesId (missing → 0).
  const rows = xOrder.map(x => {
    const row: Record<string, number> = {};
    for (const id of seriesOrder) {
      row[id] = valueBySeries.get(id)?.get(xKeyOf(x)) ?? 0;
    }
    return row;
  });

  const stacked = stack<Record<string, number>>().keys(seriesOrder).offset(offsetFor(stackOffset))(
    rows
  );

  return seriesOrder.map((id, index) => ({
    bands: stacked[index].map((segment, j) => ({
      x: xOrder[j],
      y0: segment[0],
      y1: segment[1],
    })),
    id,
    index,
  }));
}

/**
 * The `[yMin, yMax]` extent across every band edge (both y0 and y1), so the
 * domain covers stacked totals and the negative baselines wiggle/diverging emit.
 */
function computeExtent(series: AreaSeries[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;

  for (const s of series) {
    for (const band of s.bands) {
      min = Math.min(min, band.y0, band.y1);
      max = Math.max(max, band.y0, band.y1);
    }
  }

  if (!Number.isFinite(min) || !Number.isFinite(max)) {
    return [0, 1];
  }

  return [min, max];
}

/**
 * Unique x values across all series, sorted for number/Date x and kept in
 * first-seen order for categorical (string) x — matching the line factory.
 */
function collectSortedX(
  grouped: Map<string, NgeAreaDataPoint[]>,
  seriesOrder: string[]
): (Date | number | string)[] {
  const byKey = new Map<string, Date | number | string>();

  for (const id of seriesOrder) {
    for (const point of grouped.get(id) ?? []) {
      const key = xKeyOf(point.x);
      if (!byKey.has(key)) {
        byKey.set(key, point.x);
      }
    }
  }

  const values = Array.from(byKey.values());
  const first = values[0];
  if (first instanceof Date) {
    values.sort((a, b) => (a as Date).getTime() - (b as Date).getTime());
  } else if (typeof first === 'number') {
    values.sort((a, b) => (a as number) - (b as number));
  }

  return values;
}

/**
 * Sort a single series' points by x (numeric/date only; string x keeps its
 * original data order, matching the line renderer's grouping behaviour).
 */
function sortedPoints(points: NgeAreaDataPoint[]): NgeAreaDataPoint[] {
  const copy = [...points];
  const firstX = copy[0]?.x;
  if (firstX instanceof Date) {
    copy.sort((a, b) => (a.x as Date).getTime() - (b.x as Date).getTime());
  } else if (typeof firstX === 'number') {
    copy.sort((a, b) => (a.x as number) - (b.x as number));
  }
  return copy;
}

/** Stable string key for an x value (dates keyed by epoch ms). */
function xKeyOf(x: Date | number | string): string {
  return x instanceof Date ? String(x.getTime()) : String(x);
}

/** Map an {@link AreaStackOffset} to its d3-shape offset function. */
function offsetFor(stackOffset: AreaStackOffset) {
  switch (stackOffset) {
    case 'expand':
      return stackOffsetExpand;
    case 'wiggle':
      return stackOffsetWiggle;
    case 'diverging':
      return stackOffsetDiverging;
    case 'none':
    default:
      return stackOffsetNone;
  }
}
