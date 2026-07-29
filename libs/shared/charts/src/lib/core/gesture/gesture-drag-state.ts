/**
 * Per-svg state for the plot's drag gestures (pan / brush-zoom), and the probe
 * other interactions consult before they draw.
 *
 * Interaction state cannot live in a closure: every gesture frame re-renders the
 * chart, and a render re-attaches the listeners with fresh scale closures. It also
 * cannot live on a redrawn DOM node. Keying it by the one node that survives a
 * render — the `<svg>` wrapper, reached via `bounds.node()?.ownerSVGElement` — is
 * what lets a drag stay live across the re-render each emit triggers. The same
 * shape backs `range-axis-brush.ts` and the parallel-coords per-axis brush.
 *
 * It lives here rather than beside the listeners in `nge-chart.renderer.ts` so the
 * crosshair can read {@link isGestureBrushing} without importing the renderer, which
 * imports the crosshair.
 */

/** A live drag on the plot — persists across re-renders (listeners re-attach per render). */
export interface NgeGestureDragState {
  /** Sub-step pixel accumulator for band-axis pan — emits whole-category steps. */
  bandAccumPx: number;
  lastPoint: [number, number];
  /** 'pan' shifts domains per move; 'brush' draws a zoom-to rectangle */
  mode: 'brush' | 'pan';
  /** True once the drag passed the movement threshold */
  moved: boolean;
  pointerId: number;
  startPoint: [number, number];
}

const dragStateBySvg = new WeakMap<SVGSVGElement, NgeGestureDragState>();

/** Forget the drag on this chart (pointer released / cancelled, or gestures turned off). */
export function clearGestureDragState(svgNode: SVGSVGElement): void {
  dragStateBySvg.delete(svgNode);
}

/**
 * The live drag on this chart, or `undefined`. Returns the stored object by
 * reference — the gesture handlers advance `moved` / `lastPoint` / `bandAccumPx`
 * on it in place as the pointer travels.
 */
export function getGestureDragState(svgNode: SVGSVGElement): NgeGestureDragState | undefined {
  return dragStateBySvg.get(svgNode);
}

/**
 * Is a brush-zoom rectangle being dragged on this chart right now?
 *
 * The crosshair asks before it draws: a guide, focus dots and a tooltip layered
 * over the selection rectangle compete with it for the same plot, and which one
 * won would otherwise be decided by listener order rather than by intent. Pan and
 * wheel-zoom are deliberately NOT reported here — the pointer position stays the
 * thing the reader is tracking through those, so the crosshair keeps drawing.
 *
 * `moved` is part of the test because a sub-threshold press is a click, not a brush.
 */
export function isGestureBrushing(svgNode: null | SVGSVGElement | undefined): boolean {
  const state = svgNode ? dragStateBySvg.get(svgNode) : undefined;
  return !!state && state.mode === 'brush' && state.moved;
}

/** Begin tracking a drag on this chart. */
export function setGestureDragState(svgNode: SVGSVGElement, state: NgeGestureDragState): void {
  dragStateBySvg.set(svgNode, state);
}
