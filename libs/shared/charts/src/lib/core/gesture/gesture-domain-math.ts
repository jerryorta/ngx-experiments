/**
 * Pure, stateless continuous-axis gesture math — the shared domain vocabulary
 * every cartesian NgeChart transform reuses (ARCH-174). Extracted verbatim
 * from `NgeScatterChartTransform` so scatter, line, and the value axis of the
 * bar family derive zoom/pan domains from ONE implementation instead of a
 * per-type copy.
 *
 * Stateless by design (mirrors the gesture event model): each fn takes the
 * CURRENT rendered domain plus the gesture payload and returns the next
 * domain, so accumulation falls out of the next event carrying the new domain.
 */

/**
 * Zoom a continuous `[min, max]` domain around a fixed focus anchor (data
 * units). `factor > 1` zooms in (narrows the span), `< 1` zooms out; the focus
 * point stays put: `[f - (f - d0) / k, f + (d1 - f) / k]`.
 */
export function zoomDomain(
  domain: [number, number],
  focus: number,
  factor: number
): [number, number] {
  return [focus - (focus - domain[0]) / factor, focus + (domain[1] - focus) / factor];
}

/**
 * Pan a continuous `[min, max]` domain by a data-space delta. Content follows
 * the cursor, so the domain shifts AGAINST the drag (drag right → domain moves
 * left): `[d0 - delta, d1 - delta]`.
 */
export function panDomain(domain: [number, number], delta: number): [number, number] {
  return [domain[0] - delta, domain[1] - delta];
}

/**
 * Clamp a continuous `[min, max]` domain so it stays within `full`, PRESERVING
 * its span where possible — the continuous mirror of `clampBandWindow`. Two
 * branches, in order:
 *
 * 1. **Zoom-out floor** — a span at or beyond the full span snaps to `full`
 *    exactly: you can't widen past 100%, and 100% IS the full-data view.
 * 2. **Pan clamp** — a narrower window shoved past an edge slides back inside
 *    `[fullMin, fullMax]` (span preserved) rather than moving off the data.
 *
 * `full` is the data-driven extent the un-zoomed chart renders (so "100%" == the
 * initial view); it is normalized here so callers may pass it in either order.
 * `next` is assumed ascending (both `zoomDomain` and `panDomain` preserve order).
 */
export function clampDomain(next: [number, number], full: [number, number]): [number, number] {
  const fullLo = Math.min(full[0], full[1]);
  const fullHi = Math.max(full[0], full[1]);
  const span = next[1] - next[0];

  // Zoom-out floor: never wider than the full domain.
  if (span >= fullHi - fullLo) {
    return [fullLo, fullHi];
  }

  // Pan clamp: slide the (narrower) window back inside the full domain.
  let lo = next[0];
  let hi = next[1];
  if (lo < fullLo) {
    lo = fullLo;
    hi = fullLo + span;
  }
  if (hi > fullHi) {
    hi = fullHi;
    lo = fullHi - span;
  }

  return [lo, hi];
}

/**
 * True when `next` has collapsed below a proportional epsilon (`1e-6`) of the
 * `reference` span — the guard that rejects degenerate zooms produced by
 * extreme programmatic factors before they reach the scale.
 */
export function isDegenerateSpan(next: [number, number], reference: [number, number]): boolean {
  const minSpan = Math.abs(reference[1] - reference[0]) * 1e-6;
  return Math.abs(next[1] - next[0]) < minSpan;
}
