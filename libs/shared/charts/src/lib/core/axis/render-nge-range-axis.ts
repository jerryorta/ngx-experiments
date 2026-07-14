import type { Selection } from 'd3-selection';

import type {
  NgeChartXScale,
  NgeChartYScale,
} from '../base-layout/nge-chart-base-layout.models';
import type { AxisOrient, NgeChartAxisTheme } from './nge-axis.models';

import { renderNgeAxis } from './render-nge-axis';

/** Bottom range-axis: window band height (px) — frames the baseline + tick-label row. */
const X_WINDOW_BAND = 22;

/** Left range-axis: window band width (px) — frames the tick-label column. */
const Y_WINDOW_BAND = 40;

/** Handle capsule thickness (px), measured ALONG the axis. Kept slimmer than the
 * brush's `HANDLE_GRAB_PX` hit zone so the visible handle reads fine while staying
 * easy to grab. */
const HANDLE_THICKNESS = 6;

/** Handle capsule overhang (px) beyond the window band on each cross-axis edge. */
const HANDLE_OVERHANG = 3;

/** Handle capsule corner radius (px) — the rounded d3-brush end-handle look. */
const HANDLE_RADIUS = 3;

/** Window fill opacity — translucent so the ruler's tick numbers read through it. */
const WINDOW_FILL_OPACITY = 0.15;

/** Window stroke opacity — a faint outline around the translucent fill. */
const WINDOW_STROKE_OPACITY = 0.6;

/** Which window edge a handle sits on: `lo` = focus[0] edge, `hi` = focus[1] edge. */
interface HandleDatum {
  /** Pixel offset (along the axis) of the window edge this handle marks. */
  edge: number;
  /** Stable join key so the pair persists across redraws and only moves. */
  key: 'hi' | 'lo';
}

/**
 * Everything {@link renderNgeRangeAxis} needs for one range/slider axis. Mirrors
 * `RenderNgeAxisOptions` but swaps the single `scale` for a `fullScale` (domained
 * to the whole data extent) plus the plot's current `focusDomain`, from which the
 * brush window is derived.
 */
export interface RenderNgeRangeAxisOptions {
  /** Resolved `theme.axis` block, forwarded to the underlying ruler. */
  axisTheme: NgeChartAxisTheme;
  /**
   * The plot's CURRENT focus (zoomed) domain, `[min, max]` in data units. The
   * brush window spans this slice of {@link fullScale}; dragging it re-picks the
   * focus. Rebuilt into pixels each render — the renderer keeps NO brush state.
   */
  focusDomain: [number, number];
  /**
   * A scale of the axis's own kind (linear/time) whose domain is the FULL data
   * extent. Its ticks/baseline render exactly like a standard axis, and it maps
   * the focus domain onto window pixels.
   */
  fullScale: NgeChartXScale | NgeChartYScale;
  /** Which plot edge the axis is drawn against — `'bottom'` (X) or `'left'` (Y). */
  orient: AxisOrient;
  /** Optional override formatter for tick labels (forwarded to the ruler). */
  tickFormat?: (value: unknown) => string;
  /** Tick-count hint, honored by linear/time scales (forwarded to the ruler). */
  ticks?: number;
}

/**
 * Projects a focus domain to its `[edge0, edge1]` window pixels on the full-range
 * scale — `[fullScale(focusDomain[0]), fullScale(focusDomain[1])]`. Returned
 * UNSORTED (edge0 = focus min, edge1 = focus max): for a bottom axis edge0 < edge1,
 * but for a left axis the inverted range makes edge0 > edge1. Callers sort when they
 * need min/max. The brush interaction mirrors this exact projection when hit-testing
 * (kept inline there so `core/gesture` stays decoupled from `core/axis`), so the
 * rendered window and the drag geometry always agree.
 *
 * @param fullScale - The full-extent scale (linear/time) the window maps onto.
 * @param focusDomain - The plot's current focus domain, `[min, max]` data units.
 * @returns The two window edge pixels, in focus-domain order.
 */
export function rangeWindowPixels(
  fullScale: NgeChartXScale | NgeChartYScale,
  focusDomain: [number, number]
): [number, number] {
  const project = fullScale as unknown as (value: number) => number | undefined;
  return [project(focusDomain[0]) ?? 0, project(focusDomain[1]) ?? 0];
}

/**
 * Renders one range/slider axis into a caller-positioned `<g>`: a full-range ruler
 * (identical to a standard axis) overlaid with a persistent brush — a translucent
 * window plus two rounded end-handles marking the plot's current focus slice.
 *
 * The chrome is rebuilt from `focusDomain` on every call (select-or-append + a
 * keyed handle join reuse nodes) so the renderer holds NO retained brush state —
 * the window always reflects the focus the caller passes. The actual dragging is
 * owned by the sibling brush interaction (`attachRangeAxisBrush`), which hit-tests
 * this geometry and emits a new focus; this function only draws.
 *
 * The caller owns the group's outer transform (bottom axis → plot floor, left axis
 * → plot origin), exactly as for {@link renderNgeAxis}.
 *
 * @param group - The range-axis `<g>`, already positioned by the caller.
 * @param options - Full-range scale, current focus, orientation, and axis theme.
 */
export function renderNgeRangeAxis(
  group: Selection<SVGGElement, unknown, null, undefined>,
  options: RenderNgeRangeAxisOptions
): void {
  const { axisTheme, focusDomain, fullScale, orient, tickFormat, ticks } = options;

  // Full-range ruler: same baseline + ticks + labels a standard axis would draw.
  renderNgeAxis(group, { axisTheme, orient, scale: fullScale, tickFormat, ticks });

  const isVertical = orient === 'left' || orient === 'right';
  const [edge0, edge1] = rangeWindowPixels(fullScale, focusDomain);
  const lo = Math.min(edge0, edge1);
  const hi = Math.max(edge0, edge1);
  const span = hi - lo;

  // The window band runs ACROSS the axis over the tick-label row: for a bottom
  // axis it drops below the baseline over the numbers; for a left axis it runs
  // left of the baseline over the tick-label column.
  const windowX = isVertical ? -Y_WINDOW_BAND : lo;
  const windowY = isVertical ? lo : 0;
  const windowWidth = isVertical ? Y_WINDOW_BAND : span;
  const windowHeight = isVertical ? span : X_WINDOW_BAND;

  // Window rect: select-or-append so redraws reuse the node (no retained state).
  let windowRect = group.select<SVGRectElement>('.nge-chart-range-axis-window');
  if (windowRect.empty()) {
    windowRect = group
      .append('rect')
      .attr('class', 'nge-chart-range-axis-window')
      // Dragging the window body pans the focus — hint it with a grab cursor.
      .attr('cursor', 'grab')
      .attr('fill', 'var(--chart-primary)')
      .attr('fill-opacity', WINDOW_FILL_OPACITY)
      .attr('stroke', 'var(--chart-primary)')
      .attr('stroke-opacity', WINDOW_STROKE_OPACITY)
      .attr('stroke-width', 1);
  }
  windowRect
    .attr('height', windowHeight)
    .attr('width', windowWidth)
    .attr('x', windowX)
    .attr('y', windowY);

  // Two capsule handles at the window's leading/trailing edges. Keyed join keeps
  // the pair stable across redraws; each redraw only repositions them.
  const handles: HandleDatum[] = [
    { edge: lo, key: 'lo' },
    { edge: hi, key: 'hi' },
  ];
  const handleSelection = group
    .selectAll<SVGRectElement, HandleDatum>('.nge-chart-range-axis-handle')
    .data(handles, datum => datum.key);

  handleSelection.exit().remove();

  const handleMerged = handleSelection
    .enter()
    .append('rect')
    .attr('class', 'nge-chart-range-axis-handle')
    // Resize cursor by axis orientation: a vertical (Y/left) axis resizes up/down,
    // a horizontal (X/bottom) axis resizes left/right.
    .attr('cursor', isVertical ? 'ns-resize' : 'ew-resize')
    .attr('fill', 'var(--chart-primary)')
    .attr('rx', HANDLE_RADIUS)
    .attr('ry', HANDLE_RADIUS)
    .merge(handleSelection);

  if (isVertical) {
    // Capsule runs horizontally across the band, centered on its window edge.
    handleMerged
      .attr('height', HANDLE_THICKNESS)
      .attr('width', windowWidth + 2 * HANDLE_OVERHANG)
      .attr('x', windowX - HANDLE_OVERHANG)
      .attr('y', datum => datum.edge - HANDLE_THICKNESS / 2);
  } else {
    // Capsule runs vertically down the band, centered on its window edge.
    handleMerged
      .attr('height', windowHeight + 2 * HANDLE_OVERHANG)
      .attr('width', HANDLE_THICKNESS)
      .attr('x', datum => datum.edge - HANDLE_THICKNESS / 2)
      .attr('y', windowY - HANDLE_OVERHANG);
  }
}
