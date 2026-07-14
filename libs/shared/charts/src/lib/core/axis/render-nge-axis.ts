import type { Selection } from 'd3-selection';

import type { AxisOrient, AxisTick, RenderNgeAxisOptions } from './nge-axis.models';

import { computeAxisTicks } from './compute-axis-ticks';

/**
 * Tick-mark length. The nge-axis suppresses tick marks entirely (only labels
 * are drawn), so this stays 0 — kept named to mirror d3-axis's `tickSizeInner`.
 */
const TICK_SIZE_INNER = 0;

/** Gap (px) between the axis baseline and a tick label (d3-axis `tickPadding`). */
const TICK_PADDING = 8;

/** Structural view of a scale exposing its pixel range (both endpoints). */
interface RangeScaleShape {
  range(): number[];
}

/**
 * The `dy` baseline nudge for a tick label, matching d3-axis (and the current
 * base-layout for the rotated bottom-axis case). Rotated bottom labels use a
 * tighter nudge so the rotated glyph pivots cleanly off the baseline.
 */
function tickLabelDy(orient: AxisOrient, rotated: boolean, rotation: number): string {
  if (rotated) {
    return rotation < 0 ? '0.25em' : '0.5em';
  }
  if (orient === 'bottom') {
    return '0.71em';
  }
  if (orient === 'top') {
    // Labels sit ABOVE the baseline; their own baseline lands at -spacing.
    return '0em';
  }
  return '0.32em';
}

/**
 * The `text-anchor` for a tick label. Bottom labels center under their tick;
 * left labels end-align (hug the axis); right labels start-align. A rotated
 * bottom label anchors at the pivot end so the line of text runs away from the
 * tick without overlapping it.
 */
function tickLabelAnchor(orient: AxisOrient, rotated: boolean, rotation: number): string {
  if (rotated) {
    return rotation < 0 ? 'end' : 'start';
  }
  if (orient === 'left') {
    return 'end';
  }
  if (orient === 'right') {
    return 'start';
  }
  return 'middle';
}

/**
 * Renders one chart axis — baseline + tick labels — into a caller-owned `<g>`.
 *
 * A hand-forked d3-axis: it reuses d3-axis's orientation math and enter/update/exit
 * data-join but emits NgeChart's own DOM directly, so the library controls exactly
 * what is drawn. Two deliberate departures from stock d3-axis: tick marks are
 * suppressed (each `.tick` holds only a `<text>`, never a `<line>`), and there is
 * no transition (renders are instant, matching every other NgeChart layer). Tick
 * positions come from {@link computeAxisTicks}, so axis ticks and gridlines always
 * agree.
 *
 * The caller owns the group's outer transform (e.g. translating a bottom axis to
 * the plot floor); this function only manages the axis's internal elements.
 *
 * @param group - The axis `<g>`, already positioned by the caller.
 * @param options - Orientation, scale, tick config, and resolved axis theme.
 */
export function renderNgeAxis(
  group: Selection<SVGGElement, unknown, null, undefined>,
  options: RenderNgeAxisOptions
): void {
  const { axisTheme, orient, scale, tickFormat, tickRotation = 0, ticks: tickCount } = options;

  // Orientation math, lifted from d3-axis. `k` flips the tick-label offset toward
  // the plot for a left axis; the "position axis" is x for vertical axes (left/
  // right) and y for the horizontal bottom axis.
  const isVertical = orient === 'left' || orient === 'right';
  // `k` flips the tick-label offset toward the plot's outer edge: negative for a
  // left axis (labels left of the baseline) and a top axis (labels above it).
  const k = orient === 'left' || orient === 'top' ? -1 : 1;
  const tickTextAxis = isVertical ? 'x' : 'y';
  const spacing = Math.max(TICK_SIZE_INNER, 0) + TICK_PADDING;
  const rotated = !isVertical && tickRotation !== 0;

  const ticks = computeAxisTicks(scale, tickCount);

  // d3-axis parity: force the axis group's font-family so tick text renders in a
  // sans-serif face rather than inheriting the ambient page font (stock d3-axis
  // set this once on the axis <g>).
  group.attr('font-family', 'sans-serif');

  // Baseline (`.domain`) path spanning the scale range. With tick-size-outer 0 it
  // is a single straight line: horizontal for a bottom axis, vertical otherwise.
  // `fill: none` is required because a bare <path> would otherwise fill solid.
  const range = (scale as unknown as RangeScaleShape).range();
  const range0 = +range[0];
  const range1 = +range[range.length - 1];
  const baseline = isVertical ? `M0,${range0}V${range1}` : `M${range0},0H${range1}`;

  const domain = group.selectAll<SVGPathElement, null>('.domain').data([null]);
  domain
    .enter()
    .insert('path', '.tick')
    .attr('class', 'domain')
    .attr('fill', 'none')
    .merge(domain)
    .attr('d', baseline)
    .style('stroke', axisTheme.lineColor ?? 'var(--chart-outline-variant)')
    .style('stroke-width', `${axisTheme.lineWidth ?? 1}px`);

  // Ticks: keyed join on the domain value so redraws reuse nodes and only the
  // changed ticks enter/exit. Each `.tick` carries a single <text> (no <line>).
  const tickSelection = group
    .selectAll<SVGGElement, AxisTick>('.tick')
    .data(ticks, tick => String(tick.value));

  tickSelection.exit().remove();

  const tickEnter = tickSelection.enter().append('g').attr('class', 'tick');
  tickEnter.append('text');

  const tickMerged = tickEnter.merge(tickSelection).order();

  tickMerged.attr('transform', tick =>
    isVertical ? `translate(0,${tick.position})` : `translate(${tick.position},0)`
  );

  tickMerged
    .select<SVGTextElement>('text')
    .attr(tickTextAxis, k * spacing)
    .attr('dy', tickLabelDy(orient, rotated, tickRotation))
    .attr('dx', rotated ? (tickRotation < 0 ? '-0.5em' : '0.5em') : null)
    .attr('text-anchor', tickLabelAnchor(orient, rotated, tickRotation))
    .attr('transform', rotated ? `rotate(${tickRotation})` : null)
    .style('fill', axisTheme.tickColor ?? 'var(--chart-on-surface)')
    .style('font-size', `${axisTheme.tickFontSize ?? 10}px`)
    .text(tick => (tickFormat ? tickFormat(tick.value) : tick.label));
}
