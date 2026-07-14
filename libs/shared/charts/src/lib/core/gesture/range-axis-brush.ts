import type { Selection } from 'd3-selection';

import type {
  NgeChartBaseConfig,
  NgeChartScales,
} from '../base-layout/nge-chart-base-layout.models';
import type { NgeChartDimensions } from '../chart.models';
import type { NgeChartGestureHandlers } from './nge-chart-gesture.models';

/**
 * Structural view of a d3 continuous scale (linear/time) the brush drives: it can
 * be duplicated and re-domained (`copy().domain(...)`), report its current domain,
 * and invert a pixel back to a domain value (a `Date` for time scales). Kept local
 * and structural so the module needs no `any`. Projection (value → pixel) is done
 * through {@link ScaleProjector}, since a d3 scale is also callable.
 */
interface ContinuousScale {
  copy(): ContinuousScale;
  domain(): number[];
  domain(domain: [number, number]): ContinuousScale;
  invert(pixel: number): Date | number;
}

/** Per-svg range-brush drag state — persists across re-renders (re-attached each render). */
interface RangeBrushState {
  /** Which range axis this drag targets. */
  axis: 'x' | 'y';
  /** What pointerdown grabbed: an end handle, or the window body (pan). */
  mode: 'body' | 'handle-hi' | 'handle-lo';
  /** Pointer that owns this drag (matched on every move/up). */
  pointerId: number;
  /** Along-axis pixel at pointerdown — the body-pan reference point. */
  startAlong: number;
  /** The focus[0]-edge window pixel captured at pointerdown. */
  startWin0: number;
  /** The focus[1]-edge window pixel captured at pointerdown. */
  startWin1: number;
}

/** A d3 continuous scale viewed as a bare projector (domain value → pixel). */
type ScaleProjector = (value: number) => number;

const rangeBrushStateBySvg = new WeakMap<SVGSVGElement, RangeBrushState>();

/** Pixel half-width of a handle's grab zone, tested on pointerdown. */
const HANDLE_GRAB_PX = 8;

/** Minimum window width (px): a dragged handle can't cross within this of the fixed edge. */
const MIN_PX = 8;

/**
 * Attach pointer handlers that turn a drag on a range/slider axis into semantic
 * `range-zoom` events — the interaction half of the range axis (base-layout draws
 * the ruler + brush chrome; this module DRAWS NOTHING, it only hit-tests geometry).
 *
 * A sibling of `attachGestureListeners`: called on every render with fresh scale
 * closures, it re-registers namespaced (`.ngeRangeBrush`) pointer handlers and
 * keeps drag state in a WeakMap keyed by the persistent svg node. The range axes
 * occupy the margin strips OUTSIDE the plot (X = the bottom strip, Y = the left
 * strip), a distinct hit area from the plot, so it coexists with the plot's own
 * pan/zoom gestures without interfering.
 *
 * The brush is decoupled: the layers keep the FOCUS domain while the axis owns the
 * FULL domain. A drag maps back through `fullScale.invert` and emits the new focus
 * domain; the consumer applies it and the next render redraws the window — so this
 * module never mutates a scale or a DOM node.
 *
 * @param svg - The chart's persistent `<svg>` wrapper (event target).
 * @param bounds - The bounded `<g>` (accepted for signature parity; unused — the
 *   brush chrome lives in base-layout, and hit-testing is pure geometry).
 * @param dimensions - Plot dimensions; `margin` gives the TRUE bounds translate.
 * @param scales - Current layer scales; copied + re-domained to the full extent.
 * @param base - Resolved base config carrying `xRangeAxis` / `yRangeAxis`.
 * @param handler - Gesture sink; when absent (or no range axis) handlers detach.
 */
export function attachRangeAxisBrush(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  dimensions: NgeChartDimensions,
  scales: NgeChartScales,
  base: NgeChartBaseConfig,
  handler: NgeChartGestureHandlers | undefined
): void {
  const svgNode = svg.node();
  if (!svgNode) return;

  const xEnabled = !!base.xRangeAxis;
  const yEnabled = !!base.yRangeAxis;
  const enabled = (xEnabled || yEnabled) && !!handler;

  // No range axis (or no sink): detach cleanly, mirroring attachGestureListeners.
  if (!enabled) {
    svg
      .on('pointercancel.ngeRangeBrush', null)
      .on('pointerdown.ngeRangeBrush', null)
      .on('pointermove.ngeRangeBrush', null)
      .on('pointerup.ngeRangeBrush', null);
    rangeBrushStateBySvg.delete(svgNode);
    return;
  }

  const margin = dimensions.margin;
  const bw = dimensions.boundedWidth;
  const bh = dimensions.boundedHeight;

  const clamp = (value: number, min: number, max: number): number =>
    Math.max(min, Math.min(max, value));

  // Along-axis pixel of a pointer in plot-origin coords. Uses the TRUE bounds
  // translate (dimensions.margin), NOT renderChart's local `margins` — the range
  // axis is drawn inside `bounds`, which is translated by dimensions.margin.
  const alongPixel = (axis: 'x' | 'y', event: MouseEvent): number => {
    const rect = svgNode.getBoundingClientRect();
    return axis === 'x'
      ? event.clientX - rect.left - margin.left
      : event.clientY - rect.top - margin.top;
  };

  // The full-extent scale for one axis: copy the layer scale and re-domain it to
  // the configured full range (its pixel range is preserved).
  const fullScaleFor = (axis: 'x' | 'y'): ContinuousScale => {
    // Only ever called for an enabled axis, so the config is present.
    const cfg = axis === 'x' ? base.xRangeAxis! : base.yRangeAxis!;
    const src = (axis === 'x' ? scales.x : scales.y) as unknown as ContinuousScale;
    return src.copy().domain(cfg.fullDomain);
  };

  // The two window edge pixels for one axis: project the current focus edges onto
  // the full-extent scale. Recomputed per pointerdown so it reflects the latest render.
  const windowEdges = (axis: 'x' | 'y'): [number, number] => {
    const src = (axis === 'x' ? scales.x : scales.y) as unknown as ContinuousScale;
    const focus = src.domain() as [number, number];
    const project = fullScaleFor(axis) as unknown as ScaleProjector;
    return [project(focus[0]), project(focus[1])];
  };

  // Emit a range-zoom for `state.axis` given the moving edge's current along-pixel.
  // All geometry is derived from the pixels captured at pointerdown, so the drag is
  // self-consistent regardless of when the consumer re-renders.
  const emitDrag = (state: RangeBrushState, alongPx: number): void => {
    const { axis, startWin0, startWin1 } = state;
    const fullScale = fullScaleFor(axis);
    const invert = (pixel: number): number => +fullScale.invert(pixel);
    const axisMaxPx = axis === 'x' ? bw : bh;
    // For a bottom axis pixels increase with the domain (win1 >= win0); a left
    // axis inverts that, so the handle clamp bounds flip sides.
    const ascending = startWin1 >= startWin0;

    let a: number;
    let b: number;
    if (state.mode === 'handle-lo') {
      const min = ascending ? 0 : startWin1 + MIN_PX;
      const max = ascending ? startWin1 - MIN_PX : axisMaxPx;
      a = clamp(alongPx, min, max);
      b = startWin1;
    } else if (state.mode === 'handle-hi') {
      const min = ascending ? startWin0 + MIN_PX : 0;
      const max = ascending ? axisMaxPx : startWin0 - MIN_PX;
      a = startWin0;
      b = clamp(alongPx, min, max);
    } else {
      // Body pan: shift both edges by the pointer delta, clamped so the window
      // stays within [0, axisMaxPx] (shift back on overflow, preserving width).
      const winLo = Math.min(startWin0, startWin1);
      const winHi = Math.max(startWin0, startWin1);
      let delta = alongPx - state.startAlong;
      if (winLo + delta < 0) delta = -winLo;
      if (winHi + delta > axisMaxPx) delta = axisMaxPx - winHi;
      a = startWin0 + delta;
      b = startWin1 + delta;
    }

    const domain = [invert(a), invert(b)].sort((m, n) => m - n) as [number, number];
    handler!.onGesture({ axis, domain, kind: 'range-zoom' });
  };

  svg.on('pointerdown.ngeRangeBrush', (event: PointerEvent) => {
    if (event.button !== 0) return;

    const alongX = alongPixel('x', event);
    const alongY = alongPixel('y', event);

    // The X range axis lives in the bottom margin strip; the Y range axis in the
    // left margin strip — both OUTSIDE the plot area, distinct from plot gestures.
    let axis: 'x' | 'y' | null = null;
    let alongPx = 0;
    // Pad the ALONG-axis extent by HANDLE_GRAB_PX at both ends so the END handles
    // stay grabbable when the window fills the whole axis: at 100% the extreme
    // handle sits exactly at pixel 0 (or the axis length) and its grab zone / capsule
    // spills just past that edge, so a click there would otherwise miss the strip and
    // the handle stayed stuck until the user first zoomed another way. The cross-axis
    // strip bounds stay tight.
    if (
      xEnabled &&
      alongX >= -HANDLE_GRAB_PX &&
      alongX <= bw + HANDLE_GRAB_PX &&
      alongY > bh &&
      alongY <= bh + margin.bottom
    ) {
      axis = 'x';
      alongPx = alongX;
    } else if (
      yEnabled &&
      alongY >= -HANDLE_GRAB_PX &&
      alongY <= bh + HANDLE_GRAB_PX &&
      alongX >= -margin.left &&
      alongX < 0
    ) {
      axis = 'y';
      alongPx = alongY;
    }
    if (!axis) return;

    // Pick the drag mode by proximity to a window edge, else the window body.
    const [win0, win1] = windowEdges(axis);
    let mode: RangeBrushState['mode'];
    if (Math.abs(alongPx - win0) <= HANDLE_GRAB_PX) {
      mode = 'handle-lo';
    } else if (Math.abs(alongPx - win1) <= HANDLE_GRAB_PX) {
      mode = 'handle-hi';
    } else if (alongPx > Math.min(win0, win1) && alongPx < Math.max(win0, win1)) {
      mode = 'body';
    } else {
      return; // in the strip but off the window — leave it to other listeners
    }

    event.preventDefault();
    try {
      svgNode.setPointerCapture?.(event.pointerId);
    } catch {
      // jsdom / detached nodes — capture is a nicety, not a requirement
    }
    rangeBrushStateBySvg.set(svgNode, {
      axis,
      mode,
      pointerId: event.pointerId,
      startAlong: alongPx,
      startWin0: win0,
      startWin1: win1,
    });
  });

  svg.on('pointermove.ngeRangeBrush', (event: PointerEvent) => {
    const state = rangeBrushStateBySvg.get(svgNode);
    if (!state || state.pointerId !== event.pointerId) return;
    emitDrag(state, alongPixel(state.axis, event));
  });

  const endDrag = (event: PointerEvent): void => {
    const state = rangeBrushStateBySvg.get(svgNode);
    if (!state || state.pointerId !== event.pointerId) return;
    rangeBrushStateBySvg.delete(svgNode);
    try {
      if (svgNode.hasPointerCapture?.(event.pointerId)) {
        svgNode.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore — releasing capture is best-effort
    }
    // Swallow the click that trails a drag so underlying handlers don't fire.
    svgNode.addEventListener('click', clickEvent => clickEvent.stopPropagation(), {
      capture: true,
      once: true,
    });
  };

  svg.on('pointercancel.ngeRangeBrush', endDrag);
  svg.on('pointerup.ngeRangeBrush', endDrag);
}
