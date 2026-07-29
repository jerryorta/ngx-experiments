/**
 * Shared sizing knob for the radial layer family (pie / sunburst / radar / radial-bar /
 * gauge). Every one of them self-scales to fill its plot — `min(w, h) / 2`, minus whatever
 * the layer reserves for labels — which leaves a chart with **no way to be made smaller**
 * inside a box it does not control. `labelGutter` looks like the lever and is not: it is
 * measured off the arc, so shrinking the mark with it drags the labels inward too and just
 * moves the dead space from the middle to the edges.
 *
 * `radiusRatio` is the missing lever. It is applied LAST, after the layer's own label
 * reserves, so the two compose instead of fighting: the reserves decide how much room the
 * labels need, then this scales the mark inside what is left. Because every radial layer
 * derives `innerRadiusPx` as a ratio OF the outer radius, a donut's hole and a sunburst's
 * rings scale with it automatically — the chart gets smaller, not distorted.
 *
 * Pair it with `labelOffset` for full control: `radiusRatio` sets how big the mark is,
 * `labelOffset` sets how far off it the labels sit. Independent, in that order.
 */

/** Default when a layer's config omits `radiusRatio` — fill the plot, the historical behaviour. */
const DEFAULT_RADIUS_RATIO = 1;

/**
 * Scale a self-computed outer radius by the layer's `radiusRatio`.
 *
 * The ratio is clamped into `[0, 1]`: above 1 it would push the mark outside the plot rect
 * the layers group is clipped to (silently cropping it rather than growing it), and below 0
 * it would invert the geometry. A non-finite value falls back to the default rather than
 * poisoning the radius with `NaN`.
 */
export function applyRadiusRatio(outerRadius: number, radiusRatio: number | undefined): number {
  if (radiusRatio === undefined || !Number.isFinite(radiusRatio)) {
    return outerRadius;
  }

  return outerRadius * Math.max(0, Math.min(radiusRatio, DEFAULT_RADIUS_RATIO));
}
