import type { Selection } from 'd3-selection';

import { pointer, select } from 'd3-selection';

import type {
  NgeParallelCoordsBrushEvent,
  NgeParallelCoordsBrushExtent,
  NgeParallelCoordsBrushExtents,
  NgeParallelCoordsDataPoint,
} from '../../core/config';
import type { ResolvedNgeParallelCoordsLayerTheme } from '../../core/theme';

/**
 * The slice of a dimension axis the brush needs: where it sits, and the two projections
 * between a pixel band and an extent in data terms.
 *
 * Declared here rather than imported from the layer so the two modules stay acyclic — the
 * layer's own `ParallelAxis` extends this. Both projections live on the axis (closing over
 * whichever d3 scale the dimension resolved to) for the same reason `toY` does: the union of
 * scale types stays inside the axis factory instead of leaking into every consumer.
 */
export interface ParallelBrushAxis {
  /**
   * Invert a pixel band into an extent, or `null` when the band selects nothing — which on a
   * point axis means it fell in the gap between two categories.
   */
  fromY: (a: number, b: number) => NgeParallelCoordsBrushExtent | null;
  /** Dimension label — the extents-map key and the join key. */
  label: string;
  /** Project an extent back to its `[top, bottom]` pixel band, or `null` if it does not apply. */
  toBand: (extent: NgeParallelCoordsBrushExtent) => [number, number] | null;
  /** Axis x pixel within the bounded area. */
  x: number;
}

/** Geometry + sinks threaded into the brush render. */
export interface ParallelBrushParams {
  /** The drawn axes, in axis order. */
  axes: ParallelBrushAxis[];
  /** Plot width — the clamp the brush chrome must respect at the outer axes. */
  boundedWidth: number;
  /**
   * The layer's bounds `<g>` — the frame every pointer position is resolved against, so the
   * hit maths matches the coordinates the chrome is drawn in.
   */
  boundsNode: null | SVGGElement;
  /** Currently active extents (controlled by the consumer). */
  extents: NgeParallelCoordsBrushExtents;
  /** Brush-change sink. Absent ⇒ no gesture is wired (chrome may still render). */
  onBrush?: (event: NgeParallelCoordsBrushEvent) => void;
  /** The vertical span the axes occupy, from the layer's `axisSpan()`. */
  span: { bottom: number; top: number };
  theme: ResolvedNgeParallelCoordsLayerTheme;
}

/** Per-svg brush drag state — persists across the re-render every emit triggers. */
interface ParallelBrushDragState {
  /** Dimension being dragged. */
  dimension: string;
  /** What pointerdown grabbed. */
  mode: 'body' | 'create' | 'handle-hi' | 'handle-lo';
  /** True once the drag passed {@link CLICK_SLOP_PX} — a sub-slop release is a click. */
  moved: boolean;
  /** Pointer that owns this drag (matched on every move/up). */
  pointerId: number;
  /** The window's `[top, bottom]` captured at pointerdown; both edges = `startY` on create. */
  startBand: [number, number];
  /** Bounds-local y at pointerdown — the body-pan reference point. */
  startY: number;
}

const brushStateBySvg = new WeakMap<SVGSVGElement, ParallelBrushDragState>();

/** Pixel half-height of a window edge's grab zone, tested on pointerdown. */
const HANDLE_GRAB_PX = 8;

/** Drawn height (px) of a window's edge grips. */
const HANDLE_HEIGHT = 4;

/** Minimum window height (px): a dragged handle cannot cross within this of the fixed edge. */
const MIN_WINDOW_PX = 8;

/** Minimum width (px) of the invisible grab band, whatever the theme paints. */
const MIN_GRAB_WIDTH = 16;

/**
 * Pixel movement below which a release counts as a click rather than a drag — the same 3px
 * guard the plot gestures use to protect a point click from a twitchy pointer.
 */
const CLICK_SLOP_PX = 3;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/**
 * Is a brush drag currently live on this chart? The record hover highlight asks before it
 * dims, so a drag that passes over the polylines cannot start a dim/restore fight with the
 * brush — the flicker shape plot gestures hit against the crosshair.
 */
export function isBrushDragging(svgNode: null | SVGSVGElement | undefined): boolean {
  return !!svgNode && brushStateBySvg.has(svgNode);
}

/**
 * Does a record satisfy every active extent?
 *
 * Only extents naming a DRAWN dimension apply: a `config.dimensions` subset can hide an axis
 * whose extent is still in the map, and an invisible filter with no chrome to explain it reads
 * as a bug. A record with no value on a brushed dimension does NOT match — it cannot be shown
 * to cross that axis inside the range, which is the one place the layer's usual "a record
 * missing a dimension simply skips that axis" rule does not carry.
 */
export function recordMatchesExtents(
  byLabel: Map<string, NgeParallelCoordsDataPoint>,
  axes: ParallelBrushAxis[],
  extents: NgeParallelCoordsBrushExtents
): boolean {
  for (const axis of axes) {
    const extent = extents[axis.label];
    if (!extent) {
      continue;
    }
    const datum = byLabel.get(axis.label);
    if (!datum || !valueInExtent(datum.value, extent)) {
      return false;
    }
  }
  return true;
}

/** Is one raw value inside one extent? */
function valueInExtent(
  value: NgeParallelCoordsDataPoint['value'],
  extent: NgeParallelCoordsBrushExtent
): boolean {
  if (extent.kind === 'categories') {
    return extent.categories.includes(String(value));
  }
  return (
    typeof value === 'number' &&
    isFinite(value) &&
    value >= extent.range[0] &&
    value <= extent.range[1]
  );
}

/**
 * Draw the per-axis brush chrome and wire the drag.
 *
 * Decoupled the same way the chart-level range-axis brush is: this module hit-tests and emits,
 * the consumer applies the new extents, and the next render redraws the window. It never
 * mutates `params.extents`.
 *
 * Each axis gets an invisible full-span grab band (the pointerdown target, sitting above the
 * record hit paths so an axis drag can never reach one) plus — when that dimension has an
 * extent — the selection window and its two edge grips. The chrome takes its geometry
 * SYNCHRONOUSLY, with no transition: the window has to sit under the pointer during a drag,
 * and an animated one would visibly trail the cursor.
 */
export function renderParallelCoordsBrush(
  group: Selection<SVGGElement, unknown, null, undefined>,
  params: ParallelBrushParams
): void {
  const { axes, extents, onBrush, span } = params;
  const enabled = !!onBrush || Object.keys(extents).length > 0;

  const groups = group
    .selectAll<SVGGElement, ParallelBrushAxis>('.nge-parallel-coords-brush')
    .data(enabled ? axes : [], axis => axis.label);

  groups.exit().remove();

  const entered = groups
    .enter()
    .append('g')
    .classed('nge-parallel-coords-brush', true)
    .attr('data-dimension', axis => axis.label);

  entered.append('rect').classed('nge-parallel-coords-brush-band', true);

  const merged = entered.merge(groups);
  const width = bandWidth(params);

  merged
    .select<SVGRectElement>('.nge-parallel-coords-brush-band')
    .attr('height', Math.max(0, span.bottom - span.top))
    .attr('width', width)
    .attr('x', axis => bandX(axis, params))
    .attr('y', span.top)
    .style('cursor', onBrush ? 'crosshair' : 'default')
    .style('fill', 'transparent')
    // `all` rather than trusting a transparent fill to count as painted: the band has to catch
    // the pointer whatever the fill resolves to.
    .style('pointer-events', 'all');

  merged.each(function (axis) {
    renderWindow(select<SVGGElement, ParallelBrushAxis>(this), axis, params);
  });

  attachBrushDrag(merged, params);

  if (!onBrush) {
    detachSvgHandlers(group);
  }
}

/** The drawn window width, never wider than the plot itself. */
function bandWidth(params: ParallelBrushParams): number {
  return Math.min(
    Math.max(params.theme.brush.width, MIN_GRAB_WIDTH),
    Math.max(0, params.boundedWidth)
  );
}

/**
 * The window's left edge, clamped into the plot rect.
 *
 * ⚠️ A layer draws inside a CLIPPED group, so a band centred on the first axis (x = 0) would
 * start at a negative x and be DISCARDED — not merely tight. The outer axes therefore keep
 * their band flush against the plot edge, the same trade the layer already makes flipping the
 * first axis's tick labels inward.
 */
function bandX(axis: ParallelBrushAxis, params: ParallelBrushParams): number {
  const width = bandWidth(params);
  return clamp(axis.x - width / 2, 0, Math.max(0, params.boundedWidth - width));
}

/** Draw (or clear) one axis's selection window and its two edge grips. */
function renderWindow(
  group: Selection<SVGGElement, ParallelBrushAxis, null, undefined>,
  axis: ParallelBrushAxis,
  params: ParallelBrushParams
): void {
  const { extents, theme } = params;
  const extent = extents[axis.label];
  const band = extent ? axis.toBand(extent) : null;
  const width = bandWidth(params);
  const x = bandX(axis, params);

  const windows = group
    .selectAll<SVGRectElement, [number, number]>('.nge-parallel-coords-brush-window')
    .data(band ? [band] : []);

  windows.exit().remove();

  windows
    .enter()
    .append('rect')
    .classed('nge-parallel-coords-brush-window', true)
    // The band above owns the pointer for the whole axis; the painted marks stay inert so they
    // cannot swallow a drag that starts on top of them.
    .style('pointer-events', 'none')
    .merge(windows)
    .attr('height', ([top, bottom]) => Math.max(0, bottom - top))
    .attr('width', width)
    .attr('x', x)
    .attr('y', ([top]) => top)
    .style('fill', theme.brush.fill)
    .style('fill-opacity', theme.brush.fillOpacity)
    .style('stroke', theme.brush.stroke)
    .style('stroke-width', theme.brush.strokeWidth);

  const handles = group
    .selectAll<SVGRectElement, number>('.nge-parallel-coords-brush-handle')
    .data(band ?? []);

  handles.exit().remove();

  handles
    .enter()
    .append('rect')
    .classed('nge-parallel-coords-brush-handle', true)
    .style('pointer-events', 'none')
    .merge(handles)
    .attr('height', HANDLE_HEIGHT)
    .attr('width', width)
    .attr('x', x)
    .attr('y', edge => edge - HANDLE_HEIGHT / 2)
    .style('fill', theme.brush.stroke);
}

/**
 * Wire pointerdown on each grab band, and the move/up pair on the persistent `<svg>`.
 *
 * The svg carries move/up so a drag survives the pointer leaving the narrow band, and the drag
 * state is keyed by that same svg node so it survives the re-render each emit triggers.
 * Handlers are namespaced `.ngeParallelBrush` and re-registered every render with fresh
 * closures — the sibling of how the chart-level gestures and range-axis brush re-attach.
 */
function attachBrushDrag(
  selection: Selection<SVGGElement, ParallelBrushAxis, SVGGElement, unknown>,
  params: ParallelBrushParams
): void {
  const { axes, boundsNode, extents, onBrush, span } = params;
  const bands = selection.select<SVGRectElement>('.nge-parallel-coords-brush-band');

  if (!onBrush) {
    bands.on('pointerdown.ngeParallelBrush', null);
    return;
  }

  const svgNode = selection.node()?.ownerSVGElement;
  if (!svgNode) {
    return;
  }

  /** Bounds-local y of a pointer event. */
  const localY = (event: PointerEvent): number => pointer(event, boundsNode ?? svgNode)[1];

  const axisFor = (dimension: string): ParallelBrushAxis | undefined =>
    axes.find(axis => axis.label === dimension);

  /** The window edges for a dimension right now, or `null` when it is unbrushed. */
  const currentBand = (dimension: string): [number, number] | null => {
    const axis = axisFor(dimension);
    const extent = axis ? extents[dimension] : undefined;
    return axis && extent ? axis.toBand(extent) : null;
  };

  const emit = (dimension: string, extent: NgeParallelCoordsBrushExtent | null): void => {
    const next: NgeParallelCoordsBrushExtents = { ...extents };
    if (extent) {
      next[dimension] = extent;
    } else {
      delete next[dimension];
    }
    onBrush({ dimension, extent, extents: next });
  };

  /** Resolve the dragged band for the current pointer position, then emit its extent. */
  const emitDrag = (state: ParallelBrushDragState, y: number): void => {
    const axis = axisFor(state.dimension);
    if (!axis) {
      return;
    }

    const [startTop, startBottom] = state.startBand;
    let top: number;
    let bottom: number;

    if (state.mode === 'handle-lo') {
      top = clamp(y, span.top, startBottom - MIN_WINDOW_PX);
      bottom = startBottom;
    } else if (state.mode === 'handle-hi') {
      top = startTop;
      bottom = clamp(y, startTop + MIN_WINDOW_PX, span.bottom);
    } else if (state.mode === 'body') {
      // Shift both edges by the pointer delta, pushed back on overflow so the window keeps its
      // height instead of being squashed against the end of the axis.
      let delta = y - state.startY;
      if (startTop + delta < span.top) delta = span.top - startTop;
      if (startBottom + delta > span.bottom) delta = span.bottom - startBottom;
      top = startTop + delta;
      bottom = startBottom + delta;
    } else {
      const from = clamp(state.startY, span.top, span.bottom);
      const to = clamp(y, span.top, span.bottom);
      top = Math.min(from, to);
      bottom = Math.max(from, to);
    }

    emit(state.dimension, axis.fromY(top, bottom));
  };

  bands.on('pointerdown.ngeParallelBrush', function (this: SVGRectElement, event: PointerEvent) {
    if (event.button !== 0) return;

    const axis = select<SVGRectElement, ParallelBrushAxis>(this).datum();
    const y = localY(event);
    const band = currentBand(axis.label);

    // Pick the mode by proximity to a window edge, else the window body, else a fresh drag.
    let mode: ParallelBrushDragState['mode'] = 'create';
    if (band) {
      const [top, bottom] = band;
      if (Math.abs(y - top) <= HANDLE_GRAB_PX) {
        mode = 'handle-lo';
      } else if (Math.abs(y - bottom) <= HANDLE_GRAB_PX) {
        mode = 'handle-hi';
      } else if (y > top && y < bottom) {
        mode = 'body';
      }
    }

    event.preventDefault();
    try {
      svgNode.setPointerCapture?.(event.pointerId);
    } catch {
      // jsdom / detached nodes — capture is a nicety, not a requirement
    }

    brushStateBySvg.set(svgNode, {
      dimension: axis.label,
      mode,
      moved: false,
      pointerId: event.pointerId,
      startBand: band ?? [y, y],
      startY: y,
    });
  });

  const svg = select(svgNode);

  svg.on('pointermove.ngeParallelBrush', (event: PointerEvent) => {
    const state = brushStateBySvg.get(svgNode);
    if (!state || state.pointerId !== event.pointerId) return;

    const y = localY(event);
    if (!state.moved && Math.abs(y - state.startY) < CLICK_SLOP_PX) {
      return;
    }
    state.moved = true;
    emitDrag(state, y);
  });

  const endDrag = (event: PointerEvent): void => {
    const state = brushStateBySvg.get(svgNode);
    if (!state || state.pointerId !== event.pointerId) return;
    brushStateBySvg.delete(svgNode);

    try {
      if (svgNode.hasPointerCapture?.(event.pointerId)) {
        svgNode.releasePointerCapture(event.pointerId);
      }
    } catch {
      // ignore — releasing capture is best-effort
    }

    // A press that never moved is a click, and a click on an unbrushed stretch of an axis
    // clears that axis — d3-brush's own gesture. A sub-slop release on an existing window
    // (a grab thought better of) leaves the selection alone.
    if (!state.moved && state.mode === 'create') {
      emit(state.dimension, null);
      return;
    }

    if (state.moved) {
      // Swallow the click that trails a drag so the record click handler does not fire.
      svgNode.addEventListener('click', clickEvent => clickEvent.stopPropagation(), {
        capture: true,
        once: true,
      });
    }
  };

  svg.on('pointercancel.ngeParallelBrush', endDrag);
  svg.on('pointerup.ngeParallelBrush', endDrag);
}

/** Drop the svg-level handlers when the brush is not wired. */
function detachSvgHandlers(group: Selection<SVGGElement, unknown, null, undefined>): void {
  const svgNode = group.node()?.ownerSVGElement;
  if (!svgNode) return;
  select(svgNode)
    .on('pointercancel.ngeParallelBrush', null)
    .on('pointermove.ngeParallelBrush', null)
    .on('pointerup.ngeParallelBrush', null);
  brushStateBySvg.delete(svgNode);
}
