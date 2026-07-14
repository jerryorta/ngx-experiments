import type { Selection } from 'd3-selection';
import type { TimeInterval } from 'd3-time';

import { select } from 'd3-selection';
import { timeDay, timeMonth, timeWeek, timeYear } from 'd3-time';
import { timeFormat } from 'd3-time-format';

import type {
  NgeChartXScale,
  NgeChartYScale,
} from '../base-layout/nge-chart-base-layout.models';
import type {
  AxisGroupTheme,
  AxisOrient,
  AxisTierBand,
  AxisTierConfig,
  AxisTierStyle,
  RenderAxisTiersOptions,
  ResolvedBand,
} from './nge-axis.models';

type Scale = NgeChartXScale | NgeChartYScale;
type CalendarInterval = 'day' | 'month' | 'quarter' | 'week' | 'year';

/** Structural view of a scale exposing its pixel range (both endpoints). */
interface RangeScaleShape {
  range(): number[];
}

/** The pixel extent of a scale's range as `[min, max]`, normalized for inverted (y) scales. */
function rangeExtent(scale: Scale): [number, number] {
  const range = (scale as unknown as RangeScaleShape).range();
  const a = +range[0];
  const b = +range[range.length - 1];
  return a <= b ? [a, b] : [b, a];
}

/** Clamp a pixel value into `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Projects author-supplied domain ranges into pixel bands. Used when a tier's
 * groupings don't follow a calendar or category rule but are stated outright
 * (e.g. "Q1 = Jan..Mar"). Reversed pixel order (y scales invert) is normalized so
 * `start <= end`, and bands are clamped to the scale range so an out-of-view
 * range never paints outside the plot.
 *
 * @param scale - The scale the parent axis uses.
 * @param ranges - Bands expressed in domain units.
 * @returns One pixel-space {@link ResolvedBand} per input range.
 */
export function resolveRangeBands(scale: Scale, ranges: AxisTierBand[]): ResolvedBand[] {
  const project = scale as unknown as (value: unknown) => number | undefined;
  const [min, max] = rangeExtent(scale);

  return ranges.map(band => {
    let start = project(band.from) ?? 0;
    let end = project(band.to) ?? 0;
    if (start > end) {
      [start, end] = [end, start];
    }
    start = clamp(start, min, max);
    end = clamp(end, min, max);
    return { center: (start + end) / 2, end, label: band.label, start };
  });
}

/** The d3-time interval for a calendar granularity ('quarter' = every third month). */
function calendarIntervalFor(interval: CalendarInterval): TimeInterval {
  switch (interval) {
    case 'day':
      return timeDay;
    case 'month':
      return timeMonth;
    case 'quarter':
      return timeMonth.every(3) ?? timeMonth;
    case 'week':
      return timeWeek;
    case 'year':
      return timeYear;
  }
}

/** An interval-appropriate label formatter (month → 'Jan', year → '2020', etc.). */
function calendarLabelFor(interval: CalendarInterval): (date: Date) => string {
  switch (interval) {
    case 'day':
      return timeFormat('%b %d');
    case 'month':
      return timeFormat('%b');
    // No d3-time-format directive for quarters; derive Q1–Q4 from the month.
    case 'quarter':
      return (date: Date) => `Q${Math.floor(date.getMonth() / 3) + 1}`;
    case 'week':
      return timeFormat('%b %d');
    case 'year':
      return timeFormat('%Y');
  }
}

/**
 * Tiles a time scale's domain into calendar bands (days, weeks, months, quarters,
 * years). The visible domain drives the band count, so a two-week window yields
 * two day-bands while a two-year window yields two year-bands. Interval boundaries
 * are clipped to the domain and the partial leading/trailing spans are kept so the
 * tier always covers exactly what's on screen.
 *
 * @param scale - A time scale (non-time scales yield no bands).
 * @param interval - The calendar granularity to group by.
 * @returns Consecutive pixel-space bands covering the visible domain.
 */
export function resolveIntervalBands(scale: Scale, interval: CalendarInterval): ResolvedBand[] {
  const domain = (scale as unknown as { domain(): unknown[] }).domain();
  const d0 = domain[0];
  const d1 = domain[domain.length - 1];
  if (!(d0 instanceof Date) || !(d1 instanceof Date)) {
    return [];
  }

  const project = scale as unknown as (value: Date) => number;
  const timeInterval = calendarIntervalFor(interval);
  const format = calendarLabelFor(interval);

  // Edges = domain start, every interior interval boundary, domain end. Consecutive
  // pairs become bands; the first/last may be partial spans of their interval.
  const edges: Date[] = [d0];
  for (const boundary of timeInterval.range(d0, d1)) {
    if (+boundary > +d0 && +boundary < +d1) {
      edges.push(boundary);
    }
  }
  edges.push(d1);

  const bands: ResolvedBand[] = [];
  for (let i = 0; i < edges.length - 1; i++) {
    const from = edges[i];
    const to = edges[i + 1];
    let start = project(from);
    let end = project(to);
    if (start > end) {
      [start, end] = [end, start];
    }
    bands.push({ center: (start + end) / 2, end, label: format(from), start });
  }
  return bands;
}

/**
 * Coalesces a band scale's categories into pixel bands by a grouping function —
 * e.g. mapping months to quarters, or cities to regions. Adjacent categories that
 * share a `groupBy` value merge into one band spanning the first category's start
 * to the last category's end, letting a categorical axis carry a second tier of
 * higher-level structure.
 *
 * @param scale - A band/point scale whose domain is the category list.
 * @param groupBy - Maps each category to its group label.
 * @returns One pixel-space band per run of adjacent same-group categories.
 */
export function resolveCategoryBands(
  scale: Scale,
  groupBy: (category: string) => string
): ResolvedBand[] {
  const domain = (scale as unknown as { domain(): string[] }).domain();
  const bandwidthFn = (scale as unknown as { bandwidth?: () => number }).bandwidth;
  const bandwidth = typeof bandwidthFn === 'function' ? bandwidthFn.call(scale) : 0;
  const project = scale as unknown as (category: string) => number | undefined;

  const bands: ResolvedBand[] = [];
  let i = 0;
  while (i < domain.length) {
    const groupLabel = groupBy(domain[i]);
    let j = i;
    while (j + 1 < domain.length && groupBy(domain[j + 1]) === groupLabel) {
      j++;
    }
    const start = project(domain[i]) ?? 0;
    const end = (project(domain[j]) ?? 0) + bandwidth;
    bands.push({ center: (start + end) / 2, end, label: groupLabel, start });
    i = j + 1;
  }
  return bands;
}

/**
 * Resolves any {@link AxisTierConfig} to pixel bands, dispatching to the strategy
 * that matches its shape. The single entry point the renderer calls so callers
 * never branch on tier kind themselves.
 *
 * @param scale - The scale the parent axis uses.
 * @param tier - The tier definition (ranges, interval, or groupBy).
 * @returns Pixel-space bands for the tier.
 */
export function resolveTierBands(scale: Scale, tier: AxisTierConfig): ResolvedBand[] {
  if ('ranges' in tier) {
    return resolveRangeBands(scale, tier.ranges);
  }
  if ('interval' in tier) {
    return resolveIntervalBands(scale, tier.interval);
  }
  if ('groupBy' in tier) {
    return resolveCategoryBands(scale, tier.groupBy);
  }
  return [];
}

/** Outward translate for tier row `i`: bottom stacks down (+y), right stacks right (+x), left stacks left (−x). */
function tierRowTransform(orient: AxisOrient, index: number, tierHeight: number): string {
  const offset = index * tierHeight;
  if (orient === 'bottom') {
    return `translate(0,${offset})`;
  }
  if (orient === 'right') {
    return `translate(${offset},0)`;
  }
  // left: rows stack leftward; each row's local box is drawn 0..tierHeight, so
  // shift by one extra row width to keep the box on the outward (−x) side.
  return `translate(${-(index + 1) * tierHeight},0)`;
}

/**
 * If a label overflows the space available to it, ellipsize it; if even one
 * character plus the ellipsis won't fit, hide it. Guarded for jsdom, where
 * `getComputedTextLength` is absent or returns 0 — there we leave the label as-is
 * (collision handling is a render-time refinement, not a data concern).
 */
function fitLabel(node: SVGTextElement, label: string, available: number): void {
  // Clear any prior hide before measuring so a band re-widened on zoom is
  // re-evaluated from a visible baseline. A hidden <text> reports
  // getComputedTextLength() === 0, which would otherwise read as "fits" and keep
  // the label permanently hidden.
  node.style.display = '';
  if (typeof node.getComputedTextLength !== 'function' || available <= 0) {
    return;
  }
  if (node.getComputedTextLength() <= available) {
    return;
  }
  let text = label;
  while (text.length > 0) {
    text = text.slice(0, -1);
    node.textContent = `${text}…`;
    if (node.getComputedTextLength() <= available) {
      return;
    }
  }
  // Nothing fits, not even "…" — drop the label rather than overrun the band.
  node.style.display = 'none';
}

/**
 * Default vertical padding (px) added to the label font size to size a pill's
 * height. A module constant rather than a theme field: the pill's cross-axis
 * thickness is an intrinsic of the fixed-height tier row, not a styling knob.
 */
const PILL_VERTICAL_PADDING = 5;

/**
 * Measures a label's rendered width, guarded for jsdom where `getComputedTextLength`
 * is absent (or returns 0 for an unlaid-out node). The fallback approximates an
 * average glyph as 0.6·fontSize so a pill still receives a sane width under test.
 */
function measureText(node: SVGTextElement, text: string, fontSize: number): number {
  if (typeof node.getComputedTextLength === 'function') {
    const measured = node.getComputedTextLength();
    if (measured > 0) {
      return measured;
    }
  }
  return text.length * fontSize * 0.6;
}

/** The outcome of fitting a pill label to its band: how wide to draw it, or hide it. */
interface PillFit {
  /** Whether the band's label + pill are dropped (they cannot fit their band). */
  hidden: boolean;
  /** Rendered width (px) of the fitted (possibly ellipsized) label. */
  textWidth: number;
}

/**
 * Fits a pill's label to its band and reports how wide the pill must be.
 *
 * Horizontal (bottom) axis: the whole pill (label + 2·paddingX) must fit inside the
 * band's pixel width, so the label is ellipsized until it does and hidden if not
 * even "…" fits — mirroring {@link fitLabel}. Vertical (left/right) axis: a
 * horizontal label can't be width-bounded by the ~22px row, so the pill is hidden
 * only when the band is too short (in pixels) to seat it without colliding with a
 * neighbour; otherwise the full label is kept and the pill sizes to it.
 *
 * Always resets `display` before measuring so a band re-widened on zoom re-shows.
 * jsdom-safe via {@link measureText}.
 */
function fitPillLabel(
  node: SVGTextElement,
  label: string,
  bandExtent: number,
  horizontal: boolean,
  paddingX: number,
  pillHeight: number,
  fontSize: number
): PillFit {
  node.style.display = '';
  node.textContent = label;

  if (!horizontal) {
    if (bandExtent < pillHeight) {
      node.style.display = 'none';
      return { hidden: true, textWidth: 0 };
    }
    return { hidden: false, textWidth: measureText(node, label, fontSize) };
  }

  const maxTextWidth = bandExtent - 2 * paddingX;
  if (maxTextWidth <= 0) {
    node.style.display = 'none';
    return { hidden: true, textWidth: 0 };
  }
  const fullWidth = measureText(node, label, fontSize);
  if (fullWidth <= maxTextWidth) {
    return { hidden: false, textWidth: fullWidth };
  }
  let text = label;
  while (text.length > 0) {
    text = text.slice(0, -1);
    node.textContent = `${text}…`;
    const width = measureText(node, node.textContent, fontSize);
    if (width <= maxTextWidth) {
      return { hidden: false, textWidth: width };
    }
  }
  // Nothing fits, not even "…" — drop the label (and its pill) rather than overrun.
  node.style.display = 'none';
  return { hidden: true, textWidth: 0 };
}

/**
 * Renders one tier row as an open-top bracket + centered badge per band (the
 * `style: 'pill'` treatment). Within the fixed-height row the baseline sits toward
 * the outward edge; end ticks rise from it back to the near-axis edge; and a
 * rounded pill straddles the baseline, its opaque fill masking the line behind the
 * label. Outline, baseline, and end ticks all use `separatorColor`/`separatorWidth`.
 *
 * Geometry is expressed in "along" (position down the axis) and "cross"
 * (perpendicular, 0..thickness) coordinates then projected to x/y per orientation,
 * so the same machinery yields a horizontal bracket for a bottom axis and a rotated
 * one for a left/right axis. On a vertical axis the label stays horizontal, so its
 * badge reads as a horizontal chip pinned on the vertical baseline (and may extend
 * past the ~22px row width for a long label — see docs/reference/charts.md).
 */
function renderPillTier(
  row: Selection<SVGGElement, unknown, null, undefined>,
  bands: ResolvedBand[],
  orient: AxisOrient,
  groupTheme: AxisGroupTheme,
  tierHeight: number
): void {
  // Clear any separators artifacts a prior render left at this index (style change).
  row.selectAll('rect.nge-axis-tier-tint').remove();
  row.selectAll('line.nge-axis-tier-separator').remove();

  const horizontal = orient === 'bottom';
  const thickness = tierHeight;
  const stroke = groupTheme.separatorColor ?? 'var(--chart-outline-variant)';
  const strokeWidth = groupTheme.separatorWidth ?? 1;
  const labelColor = groupTheme.labelColor ?? 'var(--chart-on-surface)';
  const labelFontSize = groupTheme.labelFontSize ?? 11;
  const pillBackground = groupTheme.pillBackground ?? 'var(--chart-surface)';
  const pillPaddingX = groupTheme.pillPaddingX ?? 8;

  // A pill fits fully inside the row: height is the label plus a little padding,
  // capped so the whole badge stays within the row even at large font sizes.
  const pillHeight = Math.min(labelFontSize + PILL_VERTICAL_PADDING, thickness - 2);
  const pillRadius = groupTheme.pillRadius ?? pillHeight / 2;

  // Cross-axis anchors. The baseline sits toward the OUTWARD edge (down for a bottom
  // axis, left for a left axis); ticks run from it back to the near-axis edge.
  const outwardIsHigh = orient !== 'left';
  const baselineCross = outwardIsHigh ? thickness - pillHeight / 2 - 1 : pillHeight / 2 + 1;
  const nearAxisCross = outwardIsHigh ? 0 : thickness;

  const toX = (along: number, cross: number): number => (horizontal ? along : cross);
  const toY = (along: number, cross: number): number => (horizontal ? cross : along);

  // Baseline: one line per band, running along the axis at the baseline cross.
  const baselines = row
    .selectAll<SVGLineElement, ResolvedBand>('line.nge-axis-tier-baseline')
    .data(bands);
  baselines.exit().remove();
  baselines
    .enter()
    .append('line')
    .attr('class', 'nge-axis-tier-baseline')
    .merge(baselines)
    .attr('x1', band => toX(band.start, baselineCross))
    .attr('y1', band => toY(band.start, baselineCross))
    .attr('x2', band => toX(band.end, baselineCross))
    .attr('y2', band => toY(band.end, baselineCross))
    .attr('stroke', stroke)
    .attr('stroke-width', strokeWidth);

  // End ticks: two per band (leading + trailing edge), each rising from the baseline
  // to the near-axis edge (the open top of the bracket).
  const tickPositions = bands.flatMap(band => [band.start, band.end]);
  const endTicks = row
    .selectAll<SVGLineElement, number>('line.nge-axis-tier-endtick')
    .data(tickPositions);
  endTicks.exit().remove();
  endTicks
    .enter()
    .append('line')
    .attr('class', 'nge-axis-tier-endtick')
    .merge(endTicks)
    .attr('x1', along => toX(along, baselineCross))
    .attr('y1', along => toY(along, baselineCross))
    .attr('x2', along => toX(along, nearAxisCross))
    .attr('y2', along => toY(along, nearAxisCross))
    .attr('stroke', stroke)
    .attr('stroke-width', strokeWidth);

  // Pills — appended BEFORE labels so the labels paint over the opaque fill; sized
  // after the labels are measured below.
  const pills = row.selectAll<SVGRectElement, ResolvedBand>('rect.nge-axis-tier-pill').data(bands);
  pills.exit().remove();
  const pillsMerged = pills
    .enter()
    .append('rect')
    .attr('class', 'nge-axis-tier-pill')
    .merge(pills);

  // Labels centered on the baseline.
  const labels = row
    .selectAll<SVGTextElement, ResolvedBand>('text.nge-axis-tier-label')
    .data(bands);
  labels.exit().remove();
  const labelsMerged = labels
    .enter()
    .append('text')
    .attr('class', 'nge-axis-tier-label')
    .merge(labels);
  labelsMerged
    .attr('x', band => toX(band.center, baselineCross))
    .attr('y', band => toY(band.center, baselineCross))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .style('fill', labelColor)
    .style('font-size', `${labelFontSize}px`)
    .style('font-family', 'sans-serif')
    .text(band => band.label);

  // Fit each label to its band, then size (or hide) the matching pill. Both
  // selections are joined to the same `bands`, so index `i` refers to one band.
  const fits: PillFit[] = new Array<PillFit>(bands.length);
  labelsMerged.each(function (band, i) {
    fits[i] = fitPillLabel(
      this,
      band.label,
      band.end - band.start,
      horizontal,
      pillPaddingX,
      pillHeight,
      labelFontSize
    );
  });
  pillsMerged.each(function (band, i) {
    const fit = fits[i];
    const rect = select(this);
    if (!fit || fit.hidden) {
      rect.style('display', 'none');
      return;
    }
    const pillLength = fit.textWidth + 2 * pillPaddingX;
    // The pill straddles the baseline (cross = baselineCross) centered on the band
    // (along = band.center): its along-extent is the label run, its cross-extent the
    // fixed pill height.
    const x = horizontal ? band.center - pillLength / 2 : baselineCross - pillLength / 2;
    const y = horizontal ? baselineCross - pillHeight / 2 : band.center - pillHeight / 2;
    rect
      .style('display', '')
      .attr('x', x)
      .attr('y', y)
      .attr('width', pillLength)
      .attr('height', pillHeight)
      .attr('rx', pillRadius)
      .attr('ry', pillRadius)
      .attr('fill', pillBackground)
      .attr('stroke', stroke)
      .attr('stroke-width', strokeWidth);
  });
}

/**
 * Renders one tier row. Dispatches on the tier's render `style`: `'pill'` draws an
 * open-top bracket + centered badge per band; anything else (the default
 * `'separators'`) draws the tint rects, boundary separators, and centered labels.
 */
function renderTierRow(
  row: Selection<SVGGElement, unknown, null, undefined>,
  bands: ResolvedBand[],
  orient: AxisOrient,
  groupTheme: AxisGroupTheme,
  tierHeight: number,
  style?: AxisTierStyle
): void {
  if (style === 'pill') {
    renderPillTier(row, bands, orient, groupTheme, tierHeight);
    return;
  }

  // Separators style: clear any pill artifacts a prior render left at this index (a
  // tier that changed style) before drawing tint/separator/label geometry.
  row.selectAll('line.nge-axis-tier-baseline').remove();
  row.selectAll('line.nge-axis-tier-endtick').remove();
  row.selectAll('rect.nge-axis-tier-pill').remove();

  const horizontal = orient === 'bottom';
  const thickness = tierHeight;

  // Optional background tint behind each band.
  if (groupTheme.tint) {
    const rects = row
      .selectAll<SVGRectElement, ResolvedBand>('rect.nge-axis-tier-tint')
      .data(bands);
    rects.exit().remove();
    rects
      .enter()
      .append('rect')
      .attr('class', 'nge-axis-tier-tint')
      .merge(rects)
      .attr('x', band => (horizontal ? band.start : 0))
      .attr('y', band => (horizontal ? 0 : band.start))
      .attr('width', band => (horizontal ? band.end - band.start : thickness))
      .attr('height', band => (horizontal ? thickness : band.end - band.start))
      .attr('fill', groupTheme.tint);
  } else {
    row.selectAll('rect.nge-axis-tier-tint').remove();
  }

  // Boundary separators at every band edge — each band's leading AND trailing
  // edge. Contiguous bands share an edge (band[i].end === band[i+1].start), and a
  // gapped {ranges} tier leaves interior trailing edges that a leading-edges-only
  // pass would drop, so collect the unique boundary positions (one line each).
  const boundaries = new Set<number>();
  for (const band of bands) {
    boundaries.add(band.start);
    boundaries.add(band.end);
  }
  const separators = Array.from(boundaries).sort((a, b) => a - b);
  const lines = row
    .selectAll<SVGLineElement, number>('line.nge-axis-tier-separator')
    .data(separators);
  lines.exit().remove();
  lines
    .enter()
    .append('line')
    .attr('class', 'nge-axis-tier-separator')
    .merge(lines)
    .attr('x1', pos => (horizontal ? pos : 0))
    .attr('x2', pos => (horizontal ? pos : thickness))
    .attr('y1', pos => (horizontal ? 0 : pos))
    .attr('y2', pos => (horizontal ? thickness : pos))
    .attr('stroke', groupTheme.separatorColor ?? 'var(--chart-outline-variant)')
    .attr('stroke-width', groupTheme.separatorWidth ?? 1);

  // Centered band labels.
  const labels = row
    .selectAll<SVGTextElement, ResolvedBand>('text.nge-axis-tier-label')
    .data(bands);
  labels.exit().remove();
  const labelsMerged = labels
    .enter()
    .append('text')
    .attr('class', 'nge-axis-tier-label')
    .merge(labels);
  labelsMerged
    .attr('x', band => (horizontal ? band.center : thickness / 2))
    .attr('y', band => (horizontal ? thickness / 2 : band.center))
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'central')
    .style('fill', groupTheme.labelColor ?? 'var(--chart-on-surface)')
    .style('font-size', `${groupTheme.labelFontSize ?? 11}px`)
    .style('font-family', 'sans-serif')
    .text(band => band.label);

  // Collision handling: for a horizontal axis the label competes with the band's
  // width; for a vertical axis a horizontal label competes with the row thickness.
  labelsMerged.each(function (band) {
    const available = horizontal ? band.end - band.start : thickness;
    fitLabel(this, band.label, available);
  });
}

/**
 * Renders grouping-tier rows beneath (bottom axis) or beside (left/right axis) an
 * axis — a second dimension of structure over the tick labels (e.g. months under
 * days, quarters under months, regions under cities). Each tier is resolved to
 * pixel bands via {@link resolveTierBands} and drawn as an outward-stacked row of
 * optional tints, boundary separators, and centered labels.
 *
 * The caller positions the passed `<g>` at the axis baseline offset by its
 * tick-label allowance so tier 0 clears the tick text; each subsequent tier stacks
 * one `tierHeight` further outward (bottom → down, left → left, right → right).
 *
 * @param group - The tiers `<g>`, already positioned by the caller.
 * @param tiers - Tier definitions, innermost (nearest the axis) first.
 * @param options - Orientation, scale, resolved group theme, and tier height.
 */
export function renderAxisTiers(
  group: Selection<SVGGElement, unknown, null, undefined>,
  tiers: AxisTierConfig[],
  options: RenderAxisTiersOptions
): void {
  const { groupTheme, orient, scale, tierHeight } = options;

  const rows = group.selectAll<SVGGElement, AxisTierConfig>('g.nge-axis-tier').data(tiers);
  rows.exit().remove();
  const rowsMerged = rows.enter().append('g').attr('class', 'nge-axis-tier').merge(rows);

  rowsMerged.attr('transform', (_tier, index) => tierRowTransform(orient, index, tierHeight));

  rowsMerged.each(function (tier) {
    const bands = resolveTierBands(scale, tier);
    renderTierRow(select(this), bands, orient, groupTheme, tierHeight, tier.style);
  });
}
