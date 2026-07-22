import { scaleLinear, scalePoint, scaleTime } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeBumpDataPoint,
  NgeBumpLayerConfig,
  NgeChartConfig,
  NgeChartScaleFactory,
} from '../core/config';

/**
 * Right-edge gutter (px) reserved on the x range when a bump layer shows end
 * labels. Bump end labels sit just past each series' LAST point, and layers render
 * into the CLIPPED plot group (`boundedWidth × boundedHeight`) — without reserving
 * room the labels would be cut off at the plot edge. The renderer offsets each label
 * a few px past the last point, so this gutter (kept larger than that offset) leaves
 * the label sitting inside the clip. `0` when no bump layer shows labels, so the x
 * range is then exactly `[0, boundedWidth]`.
 */
export const BUMP_END_LABEL_GUTTER = 56;

/**
 * Vertical inset (px) reserved at the TOP and BOTTOM of the rank y-range. Layers
 * render into the CLIPPED plot group (`boundedWidth × boundedHeight`), so rank 1 (top)
 * and rank N (bottom) sit exactly on the clip edges and would otherwise slice the point
 * markers in half and cut the bottom end label off. The inset pushes those rows inward
 * by enough to clear BOTH the point marker (radius + stroke ≈ 7px) AND the
 * vertically-centered end label's half-height (≈ fontSize / 2), with headroom. The axis
 * and marks share this scale via the scale factory, so they stay aligned automatically.
 *
 * NOTE: this is a bump-LOCAL fix; the systemic all-charts clip fix is a separate engine
 * ticket, so the base layout is left untouched.
 */
export const BUMP_RANK_EDGE_INSET = 16;

/** Direction the per-x rank ordering runs. */
export type BumpRankOrder = 'asc' | 'desc';

/** Fallback options merged behind a layer's own knobs when building the scale factory. */
export interface BumpScaleFactoryOptions {
  /** Per-x rank ordering fallback behind a layer's own `rankOrder`. Default `'desc'`. */
  rankOrder?: BumpRankOrder;
}

/**
 * One bump datum with its derived (or explicit) rank resolved. Wraps the SOURCE
 * `datum` (identity preserved for click-index recovery + tooltip content) plus the
 * `rank` it occupies at its x-tick — the y-position driver. Emitted by
 * {@link deriveBumpRanks}, consumed by both the scale factory (for the max rank N)
 * and the renderer (per-point rank).
 */
export interface RankedBumpPoint {
  /** The source data point (kept by reference for identity-based interaction). */
  datum: NgeBumpDataPoint;
  /** 1-based rank at this datum's x-tick (1 = best; explicit `datum.rank` wins). */
  rank: number;
}

/**
 * Canonical string key for an x value, discriminating the three x types so a numeric
 * `1000` and a string `'1000'` never collide when grouping observations per x-tick.
 */
export function bumpXKey(x: Date | number | string): string {
  if (x instanceof Date) {
    return `d${x.getTime()}`;
  }
  if (typeof x === 'number') {
    return `n${x}`;
  }
  return `s${x}`;
}

/**
 * Derive each observation's rank per x-tick.
 *
 * The pure core shared by the scale factory (which needs the max rank for the y
 * domain) and the renderer (which needs each point's rank for its y position). For
 * every distinct x, the series present at that x are ordered by `value` —
 * `'desc'` (default) puts the highest value at rank 1, `'asc'` the lowest — and
 * assigned ranks `1..N`. Ties break deterministically by `seriesId` (ascending), so
 * the ranking is stable across renders. A series absent at some x simply has no point
 * there (its neighbours close the rank gap). A datum carrying an explicit `rank` keeps
 * that rank verbatim (the derived positional rank is used only when `rank` is omitted).
 *
 * @param data - The bump layer's observations (each a `(seriesId, x, value)`).
 * @param rankOrder - Order the per-x value comparison runs. Default `'desc'`.
 * @returns One {@link RankedBumpPoint} per input datum (grouping order is by x-tick).
 */
export function deriveBumpRanks(
  data: NgeBumpDataPoint[],
  rankOrder: BumpRankOrder = 'desc'
): RankedBumpPoint[] {
  // Bucket observations by x-tick (first-seen order preserved).
  const groups = new Map<string, NgeBumpDataPoint[]>();
  for (const datum of data) {
    const key = bumpXKey(datum.x);
    const bucket = groups.get(key);
    if (bucket) {
      bucket.push(datum);
    } else {
      groups.set(key, [datum]);
    }
  }

  const ranked: RankedBumpPoint[] = [];
  for (const bucket of groups.values()) {
    // Sort a COPY by value (desc = highest first), tie-breaking by seriesId asc so
    // equal values rank deterministically across renders.
    const ordered = [...bucket].sort((a, b) => {
      const diff = rankOrder === 'asc' ? a.value - b.value : b.value - a.value;
      return diff !== 0 ? diff : a.seriesId.localeCompare(b.seriesId);
    });
    ordered.forEach((datum, index) => {
      ranked.push({ datum, rank: datum.rank ?? index + 1 });
    });
  }

  return ranked;
}

/**
 * The maximum rank across the data — the N that sets the y (rank) domain's bottom.
 * Derives ranks with {@link deriveBumpRanks} so explicit `rank` overrides expand the
 * domain the same way they shift points. Returns 0 for empty data.
 *
 * @param data - The bump layer's observations.
 * @param rankOrder - Order the per-x ranking runs. Default `'desc'`.
 * @returns The largest resolved rank, or 0 when there is no data.
 */
export function computeBumpMaxRank(
  data: NgeBumpDataPoint[],
  rankOrder: BumpRankOrder = 'desc'
): number {
  let maxRank = 0;
  for (const point of deriveBumpRanks(data, rankOrder)) {
    if (point.rank > maxRank) {
      maxRank = point.rank;
    }
  }
  return maxRank;
}

/**
 * Build the bump x scale from the observed x values, mirroring the line layer's x
 * logic: string x → `scalePoint` (categorical, edge-to-edge), number x →
 * `scaleLinear`, `Date` x → `scaleTime`. `rangeEnd` is the right end of the x range
 * (`boundedWidth`, or less when an end-label gutter is reserved).
 */
function buildBumpXScale(points: NgeBumpDataPoint[], rangeEnd: number): NgeChartScales['x'] {
  const firstX = points[0].x;
  const xType = firstX instanceof Date ? 'time' : typeof firstX === 'number' ? 'number' : 'string';

  if (xType === 'string') {
    const domain: string[] = [];
    for (const point of points) {
      const value = String(point.x);
      if (!domain.includes(value)) {
        domain.push(value);
      }
    }
    return scalePoint<string>().domain(domain).range([0, rangeEnd]).padding(0);
  }

  const xNumbers = points.map(point =>
    point.x instanceof Date ? point.x.getTime() : (point.x as number)
  );
  const lo = Math.min(...xNumbers);
  const hi = Math.max(...xNumbers);

  return xType === 'number'
    ? scaleLinear().domain([lo, hi]).range([0, rangeEnd])
    : scaleTime()
        .domain([new Date(lo), new Date(hi)])
        .range([0, rangeEnd]);
}

/**
 * Build a bump-chart scale factory: an x scale reusing the line layer's x logic
 * (string → point, number → linear, `Date` → time) and a `scaleLinear` RANK axis on
 * y whose domain `[1, N]` maps to `[inset, boundedHeight − inset]` — so **rank 1 sits
 * near the top** (y = {@link BUMP_RANK_EDGE_INSET}) and the worst rank near the bottom,
 * both inset so the clipped plot doesn't slice the top/bottom markers + labels. N is the
 * max rank across every bump layer's data (via {@link computeBumpMaxRank}), clamped to
 * ≥ 2 so a single-series (N = 1) domain doesn't collapse rank 1 to the vertical midpoint.
 * The ranking derivation drives both the y domain here and the per-point y position in
 * the renderer. When any bump layer shows end labels the x range reserves a right-edge
 * {@link BUMP_END_LABEL_GUTTER} so the labels clear the clipped plot area; otherwise the
 * range is exactly `[0, boundedWidth]`. `options.rankOrder` is the fallback behind each
 * layer's own `rankOrder`.
 *
 * @param options - Fallback rank-order knob (optional).
 * @returns A {@link NgeChartScaleFactory} producing the x (time/linear/point) + y (rank) scales.
 */
export function createBumpChartScalesFactory(
  options: BumpScaleFactoryOptions = {}
): NgeChartScaleFactory {
  return (config: NgeChartConfig, dimensions: NgeChartDimensions): NgeChartScales => {
    const allPoints: NgeBumpDataPoint[] = [];
    let rankOrder: BumpRankOrder = options.rankOrder ?? 'desc';
    let reserveLabelGutter = false;

    for (const layer of config.layers.flat()) {
      if (layer.type !== 'bump') {
        continue;
      }
      const bumpLayer = layer as NgeBumpLayerConfig;
      allPoints.push(...bumpLayer.data);
      rankOrder = bumpLayer.rankOrder ?? rankOrder;
      if (bumpLayer.showLabels) {
        reserveLabelGutter = true;
      }
    }

    const rangeEnd = Math.max(
      0,
      dimensions.boundedWidth - (reserveLabelGutter ? BUMP_END_LABEL_GUTTER : 0)
    );

    // Inset the rank rows so rank 1 (top) and rank N (bottom) clear the clipped plot edges.
    const inset = BUMP_RANK_EDGE_INSET;
    const yRange: [number, number] = [inset, Math.max(inset, dimensions.boundedHeight - inset)];
    // Clamp N ≥ 2 so a single-series (N = 1) domain still maps rank 1 to the top (y = inset)
    // rather than collapsing to the midpoint.
    const maxRank = Math.max(2, computeBumpMaxRank(allPoints, rankOrder));

    if (allPoints.length === 0) {
      return {
        x: scalePoint<string>().domain([]).range([0, rangeEnd]),
        y: scaleLinear().domain([1, maxRank]).range(yRange),
      };
    }

    return {
      x: buildBumpXScale(allPoints, rangeEnd),
      // Rank 1 → y inset (near top); rank N → y boundedHeight − inset (near bottom).
      y: scaleLinear().domain([1, maxRank]).range(yRange),
    };
  };
}
