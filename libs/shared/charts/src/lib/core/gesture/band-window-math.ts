/**
 * Pure, stateless band/point-axis WINDOW math (ARCH-174). A categorical axis has
 * no continuous `invert()`, so gestures window it by whole categories instead of
 * rescaling: the window is an inclusive `[startIndex, endIndex]` pair into the
 * axis's full ordered category list. Every fn returns a new window clamped to
 * `[0, count - 1]` — spans never go fractional and never produce NaN.
 *
 * Shared by every band-axis transform (bar / grouped-bar / diverging-bar and
 * categorical-x line) so the window semantics are defined exactly once. The
 * value (continuous) axis is handled separately by the scatter continuous math.
 */

import type { NgeBandWindowOp } from './nge-chart-gesture.models';

/** Inclusive `[startIndex, endIndex]` window into an axis's ordered category list. */
export type NgeBandWindow = [number, number];

/**
 * Clamp a window into `[0, count - 1]`, PRESERVING its span where possible: a
 * window shoved past an edge slides back in rather than shrinking. A span that
 * meets or exceeds `count` collapses to the full range.
 */
export function clampBandWindow(window: NgeBandWindow, count: number): NgeBandWindow {
  if (count <= 0) {
    return [0, 0];
  }

  const span = window[1] - window[0] + 1;
  if (span >= count) {
    return [0, count - 1];
  }

  let [start, end] = window;
  if (start < 0) {
    start = 0;
    end = span - 1;
  }
  if (end > count - 1) {
    end = count - 1;
    start = end - span + 1;
  }

  return [Math.max(0, start), Math.min(count - 1, end)];
}

/**
 * Zoom a category window around an anchor index. `factor > 1` narrows the window
 * (zoom in), `< 1` widens it; the anchor's proportional position is preserved.
 * Visible count becomes `round(currentCount / factor)`, floored at 1.
 */
export function zoomBandWindow(
  window: NgeBandWindow,
  count: number,
  factor: number,
  anchorIndex: number
): NgeBandWindow {
  const visible = window[1] - window[0] + 1;
  const nextVisible = Math.max(1, Math.min(count, Math.round(visible / factor)));
  const anchorFraction = visible <= 1 ? 0 : (anchorIndex - window[0]) / (visible - 1);
  const nextStart = Math.round(anchorIndex - anchorFraction * (nextVisible - 1));

  return clampBandWindow([nextStart, nextStart + nextVisible - 1], count);
}

/**
 * Pan a window by a signed whole-category delta, clamped to bounds — the span is
 * preserved, so panning into an edge stops rather than shrinking.
 */
export function panBandWindow(
  window: NgeBandWindow,
  count: number,
  deltaCategories: number
): NgeBandWindow {
  return clampBandWindow([window[0] + deltaCategories, window[1] + deltaCategories], count);
}

/**
 * Set a window from a brushed inclusive index range, normalized (min/max) and
 * clamped to `[0, count - 1]`. Always at least one category wide.
 */
export function brushBandWindow(selection: NgeBandWindow, count: number): NgeBandWindow {
  const lo = Math.max(0, Math.min(selection[0], selection[1]));
  const hi = Math.min(count - 1, Math.max(selection[0], selection[1]));

  return [Math.min(lo, hi), Math.max(lo, hi)];
}

/**
 * Apply a renderer-emitted band-window op to the current window. Converts the
 * op's 0..1 band-axis fractions into absolute category indices (relative to the
 * current window) and delegates to the pure window fns. This is the one place
 * every band transform (bar / grouped-bar / categorical-x line) shares.
 */
export function applyBandWindowOp(
  op: NgeBandWindowOp,
  window: NgeBandWindow,
  count: number
): NgeBandWindow {
  const visible = window[1] - window[0] + 1;

  switch (op.type) {
    case 'zoom': {
      const anchorIndex = Math.round(window[0] + op.anchorFraction * (visible - 1));
      return zoomBandWindow(window, count, op.factor, anchorIndex);
    }
    case 'pan':
      return panBandWindow(window, count, op.deltaCategories);
    case 'brush': {
      const from = window[0] + Math.round(op.fromFraction * (visible - 1));
      const to = window[0] + Math.round(op.toFraction * (visible - 1));
      return brushBandWindow([from, to], count);
    }
  }
}

/**
 * The ordered, de-duplicated category list of a band axis — unique keys in
 * first-occurrence order. Shared by band scale helpers and band transforms so a
 * window index refers to the same category on both sides of the seam.
 */
export function orderedBandCategories<T>(items: T[], key: (item: T) => string): string[] {
  const seen = new Set<string>();
  const ordered: string[] = [];

  for (const item of items) {
    const value = key(item);
    if (!seen.has(value)) {
      seen.add(value);
      ordered.push(value);
    }
  }

  return ordered;
}
