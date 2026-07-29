import type { Selection } from 'd3-selection';

import { scaleLinear, scalePoint } from 'd3-scale';
import { pointer, select } from 'd3-selection';
import { curveMonotoneX, line } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeChartDimensions } from '../../core/chart.models';
import type {
  NgeParallelCoordsBrushExtent,
  NgeParallelCoordsBrushExtents,
  NgeParallelCoordsDataPoint,
  NgeParallelCoordsLayerConfig,
  NgeParallelCoordsValue,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type {
  NgeParallelCoordsLayerTheme,
  ResolvedNgeParallelCoordsLayerTheme,
} from '../../core/theme';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipEvent,
  NgeTooltipHandlers,
} from '../../core/tooltip';
import type { ParallelBrushAxis } from './parallel-coords-brush';

import { mergeParallelCoordsLayerTheme } from '../../core/theme';
import {
  isBrushDragging,
  recordMatchesExtents,
  renderParallelCoordsBrush,
} from './parallel-coords-brush';

/** Every mark class the layer owns — used for the interrupt + the empty-data stale sweep. */
const PARALLEL_COORDS_SELECTOR =
  '.nge-parallel-coords-record, .nge-parallel-coords-axis, .nge-parallel-coords-tick, .nge-parallel-coords-axis-label, .nge-parallel-coords-brush';

/** Record bucket key for data points that carry no explicit `seriesId`. */
const DEFAULT_SERIES_ID = '__default__';

/** Stroke width (px) of the invisible per-record hover/click target. */
const HIT_STROKE_WIDTH = 10;

/** Horizontal gap (px) between an axis and its tick labels. */
const TICK_LABEL_GAP = 6;

/**
 * Height (px) reserved at the TOP of the bounded area for the dimension names, taken out of
 * the axis span rather than drawn above it.
 *
 * ⚠️ Everything a layer draws is inside `g.nge-chart-layers`, which the base layout gives a
 * `clip-path` of the plot rect — so a mark at a negative coordinate is not merely tight, it is
 * silently discarded. Chrome this layer would naturally hang in the margin (dimension names
 * above the plot, the first axis's ticks to its left) therefore lives INSIDE the bounds, the
 * same way the radial layers take their label reserve out of the radius.
 */
const AXIS_LABEL_STRIP = 24;

/** Height (px) reserved at the BOTTOM so the lowest tick label's descenders stay in the clip. */
const TICK_LABEL_STRIP = 8;

/** Baseline (px) of the dimension names within the reserved top strip. */
const AXIS_LABEL_BASELINE = 12;

/** Requested tick count per numeric axis when the config does not set one. */
const DEFAULT_TICK_COUNT = 5;

/** Padding of a point (ordinal) axis, in step fractions, so categories clear the plot edges. */
const POINT_AXIS_PADDING = 0.5;

/** One printed tick on a dimension axis. */
interface ParallelTick {
  /** Rendered tick text. */
  label: string;
  /** Tick y pixel within the bounded area. */
  y: number;
}

/**
 * One vertical dimension axis. `toY` closes over whichever d3 scale the dimension resolved
 * to, so the union of scale types stays inside {@link buildAxes} rather than leaking into
 * every consumer of an axis.
 */
interface ParallelAxis extends ParallelBrushAxis {
  /** Ticks printed alongside the axis. */
  ticks: ParallelTick[];
  /** Map a raw value to a y pixel; `null` when the value is not representable on this axis. */
  toY: (value: NgeParallelCoordsValue) => null | number;
}

/** One record's crossing of one axis. */
interface ParallelVertex {
  /** The axis this vertex sits on. */
  axis: ParallelAxis;
  /** Source datum (tooltip / click payload). */
  datum: NgeParallelCoordsDataPoint;
  /** Vertex y pixel within the bounded area. */
  y: number;
}

/** One record (a `seriesId` group) drawn as a polyline across the axes. */
interface ParallelRecord {
  /** Resolved stroke color. */
  color: string;
  /** Record identity (join key). */
  id: string;
  /** Record index in first-seen order. */
  index: number;
  /**
   * Resting opacity: the theme's `line.opacity`, or `line.dimmedOpacity` when an active brush
   * extent filters this record out. Carried on the record rather than recomputed at each use
   * because the hover highlight has to RESTORE it — restoring a flat `line.opacity` would wipe
   * the brush dim the moment the pointer left a polyline.
   */
  opacity: number;
  /** Vertices in axis order — the polyline's points. */
  vertices: ParallelVertex[];
}

/** Resolved geometry + palette threaded through the mark render helpers. */
interface ParallelCoordsRenderParams {
  animation: ResolvedNgeChartAnimation;
  axes: ParallelAxis[];
  /** The layer's bounds `<g>` — the frame brush pointer positions resolve against. */
  boundsNode: null | SVGGElement;
  config: NgeParallelCoordsLayerConfig;
  dimensions: NgeChartDimensions;
  /** Active brush extents (normalised — never undefined). */
  extents: NgeParallelCoordsBrushExtents;
  margins: { bottom: number; left: number; right: number; top: number };
  theme: ResolvedNgeParallelCoordsLayerTheme;
  tooltipConfig?: NgeTooltipConfig<NgeParallelCoordsDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
}

/**
 * Render the parallel coordinates layer into the provided bounds with theme support.
 * Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` and IGNORES the injected cartesian
 * `scales`: the N unique dimension `label`s become N vertical axes evenly spaced across
 * `boundedWidth`, each carrying its OWN scale down the bounded height — a `scaleLinear` where
 * every value on that dimension is a finite number, otherwise a `scalePoint` over its
 * categories. Every `seriesId` group then draws as one `d3.line()` polyline visiting each axis
 * at its value. `curve: 'monotone'` swaps the straight segments for an x-monotone curve.
 *
 * Per-axis scales are the point of the chart type: the dimensions are different quantities, so
 * a shared domain would flatten every axis but the largest. The axes stop short of the bounded
 * edges by this layer's own chrome reserves ({@link AXIS_LABEL_STRIP} / {@link
 * TICK_LABEL_STRIP}), because a layer draws inside a clipped group and anything it hangs in the
 * margin is discarded rather than merely tight. Marks take their final geometry
 * synchronously (smear-free first paint, testable without flushing) and fade in on enter;
 * survivors re-place on update; removed marks fade on exit — every transition driven off
 * `context.animation`.
 */
export function renderParallelCoordsLayer(
  context: NgeChartLayerContext<
    NgeParallelCoordsDataPoint,
    NgeParallelCoordsLayerConfig,
    NgeParallelCoordsLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  const theme = mergeParallelCoordsLayerTheme(context.theme);
  const axes =
    bounds && Array.isArray(data) && data.length > 0 ? buildAxes(data, config, dimensions) : [];

  if (!bounds || axes.length === 0) {
    bounds?.selectAll(PARALLEL_COORDS_SELECTOR).interrupt().interrupt('opacity-fade').remove();
    return;
  }

  // Interrupt any running transitions (unnamed + the named fade) before recomputing the
  // joins, so a rapid re-render can't overlap a stale transition.
  bounds.selectAll(PARALLEL_COORDS_SELECTOR).interrupt().interrupt('opacity-fade');

  let container = bounds.select<SVGGElement>('.nge-parallel-coords-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-parallel-coords-container', true);
  }

  // Fixed z-ordered sub-groups (created once, in order): axis lines sit behind the records
  // they measure, while ticks and dimension names sit in front so text stays readable through
  // the overplotting this chart type is built around. The brush sits between the two — above
  // the records so its grab band intercepts a drag before a record's hit path can, and below
  // the text, which is `pointer-events: none` and so never competes for the pointer.
  const axisGroup = ensureGroup(container, 'nge-parallel-coords-axis-group');
  const recordGroup = ensureGroup(container, 'nge-parallel-coords-record-group');
  const brushGroup = ensureGroup(container, 'nge-parallel-coords-brush-group');
  const chromeGroup = ensureGroup(container, 'nge-parallel-coords-chrome-group');

  const params: ParallelCoordsRenderParams = {
    animation,
    axes,
    boundsNode: bounds.node(),
    config,
    dimensions,
    extents: config.brushExtents ?? {},
    margins,
    theme,
    tooltipConfig,
    tooltipHandlers,
  };

  const records = buildRecords(data, params);

  renderAxes(axisGroup, params);
  renderRecords(recordGroup, records, params);
  renderParallelCoordsBrush(brushGroup, {
    axes,
    boundedWidth: dimensions.boundedWidth,
    boundsNode: params.boundsNode,
    extents: params.extents,
    onBrush: config.onBrush,
    span: axisSpan(dimensions.boundedHeight),
    theme,
  });
  renderChrome(chromeGroup, params);
}

/**
 * The vertical span the axes occupy: the bounded height minus this layer's own chrome
 * reserves. Shared by the scale construction and the axis-line geometry so the two cannot
 * drift apart.
 */
function axisSpan(boundedHeight: number): { bottom: number; top: number } {
  const top = AXIS_LABEL_STRIP;
  return { bottom: Math.max(top + 1, boundedHeight - TICK_LABEL_STRIP), top };
}

/** Distinct values of an array preserving first-seen order. */
function uniqueInOrder<T>(values: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

/** Get-or-create a classed child `<g>` of the container (stable z-order across re-renders). */
function ensureGroup(
  container: Selection<SVGGElement, unknown, null, undefined>,
  className: string
): Selection<SVGGElement, unknown, null, undefined> {
  let group = container.select<SVGGElement>(`.${className}`);
  if (group.empty()) {
    group = container.append('g').classed(className, true);
  }
  return group;
}

/**
 * Build one axis per dimension: `config.dimensions` gives the order and subset when set,
 * otherwise the unique labels in first-seen order. Axes are spread evenly across the bounded
 * width (a lone axis centres rather than pinning to x=0), and each resolves its own scale.
 *
 * A dimension goes LINEAR only when every one of its values is a finite number; a single
 * string forces the whole dimension onto a point scale, because a mixed axis has no numeric
 * ordering to fall back on. Non-finite numbers on a linear axis are dropped rather than
 * collapsed to 0 — a bad reading should leave a gap in the polyline, not a false floor value.
 */
function buildAxes(
  data: NgeParallelCoordsDataPoint[],
  config: NgeParallelCoordsLayerConfig,
  dimensions: NgeChartDimensions
): ParallelAxis[] {
  const present = uniqueInOrder(data.map(d => d.label));
  const labels = config.dimensions?.length
    ? config.dimensions.filter(label => present.includes(label))
    : present;
  if (labels.length === 0) {
    return [];
  }

  const { boundedHeight, boundedWidth } = dimensions;
  const tickCount = config.tickCount ?? DEFAULT_TICK_COUNT;
  const step = labels.length > 1 ? boundedWidth / (labels.length - 1) : 0;
  const { bottom: axisBottom, top: axisTop } = axisSpan(boundedHeight);

  return labels.map((label, index) => {
    const values = data.filter(d => d.label === label).map(d => d.value);
    const x = labels.length > 1 ? index * step : boundedWidth / 2;
    const numeric = values.every(value => typeof value === 'number');
    const finite = values.filter(
      (value): value is number => typeof value === 'number' && isFinite(value)
    );

    // Brush chrome is clipped like everything else the layer draws, so both projections keep
    // their pixels inside the axis span — a stale extent from another dataset can otherwise
    // resolve outside the domain and hang its window past the plot edge, where it vanishes.
    const intoSpan = (y: number): number => Math.max(axisTop, Math.min(axisBottom, y));

    if (numeric && finite.length > 0) {
      // A dimension whose readings are all identical has no extent to scale; widen it by one
      // unit either side so the scale stays invertible and the vertices land mid-axis.
      const min = Math.min(...finite);
      const max = Math.max(...finite);
      const domain: [number, number] = min === max ? [min - 1, max + 1] : [min, max];
      const scale = scaleLinear().domain(domain).range([axisBottom, axisTop]).nice();
      const format = scale.tickFormat(tickCount);
      return {
        fromY: (a: number, b: number): NgeParallelCoordsBrushExtent => {
          // y increases DOWNWARD while the scale ascends upward, so the top pixel inverts to
          // the larger value — hence the sort rather than a positional pair.
          const values = [scale.invert(a), scale.invert(b)];
          return { kind: 'range', range: [Math.min(...values), Math.max(...values)] };
        },
        label,
        ticks: scale.ticks(tickCount).map(value => ({ label: format(value), y: scale(value) })),
        toBand: (extent: NgeParallelCoordsBrushExtent): [number, number] | null =>
          extent.kind === 'range'
            ? [intoSpan(scale(extent.range[1])), intoSpan(scale(extent.range[0]))]
            : null,
        toY: (value: NgeParallelCoordsValue) =>
          typeof value === 'number' && isFinite(value) ? scale(value) : null,
        x,
      };
    }

    const categories = uniqueInOrder(values.map(value => String(value)));
    const scale = scalePoint<string>()
      .domain(categories)
      .range([axisBottom, axisTop])
      .padding(POINT_AXIS_PADDING);
    // Half a step either side, so a selected category's window covers its whole cell rather
    // than pinching to the single pixel its point sits on.
    const categoryPad = scale.step() / 2;
    return {
      fromY: (a: number, b: number): NgeParallelCoordsBrushExtent | null => {
        const top = Math.min(a, b);
        const bottom = Math.max(a, b);
        const selected = categories.filter(category => {
          const y = scale(category);
          return y !== undefined && y >= top && y <= bottom;
        });
        // A band that fell between two categories selects nothing, which reads as "no filter"
        // rather than as an empty selection that would dim every record at once.
        return selected.length > 0 ? { categories: selected, kind: 'categories' } : null;
      },
      label,
      ticks: categories.map(category => ({ label: category, y: scale(category) ?? 0 })),
      toBand: (extent: NgeParallelCoordsBrushExtent): [number, number] | null => {
        if (extent.kind !== 'categories') {
          return null;
        }
        const ys = extent.categories
          .map(category => scale(category))
          .filter((y): y is number => y !== undefined);
        return ys.length > 0
          ? [intoSpan(Math.min(...ys) - categoryPad), intoSpan(Math.max(...ys) + categoryPad)]
          : null;
      },
      toY: (value: NgeParallelCoordsValue) => scale(String(value)) ?? null,
      x,
    };
  });
}

/**
 * Group the data into records by `seriesId` (first-seen order), each carrying one vertex per
 * axis it has a representable value for — in axis order, so the polyline reads left to right.
 * A record missing a dimension simply skips that axis rather than dropping out of the chart.
 *
 * Color resolves per-datum `color` → `colorBy` → the positional palette. `colorBy` maps the
 * record's value on the named dimension to a palette entry, which is what makes the chart
 * legible past the handful of records a positional palette can distinguish.
 */
function buildRecords(
  data: NgeParallelCoordsDataPoint[],
  params: ParallelCoordsRenderParams
): ParallelRecord[] {
  const { axes, config, theme } = params;
  const palette = config.seriesColors?.length ? config.seriesColors : theme.line.colors;

  const order: string[] = [];
  const groups = new Map<string, NgeParallelCoordsDataPoint[]>();
  for (const datum of data) {
    const id = datum.seriesId ?? DEFAULT_SERIES_ID;
    let bucket = groups.get(id);
    if (!bucket) {
      bucket = [];
      groups.set(id, bucket);
      order.push(id);
    }
    bucket.push(datum);
  }

  // Category order for `colorBy` is taken over the WHOLE dataset, not per record, so the same
  // category keeps the same color no matter which record is drawn first.
  const colorCategories = config.colorBy
    ? uniqueInOrder(
        data.filter(datum => datum.label === config.colorBy).map(datum => String(datum.value))
      )
    : [];

  return order.map((id, index) => {
    const bucket = groups.get(id) ?? [];
    const byLabel = new Map(bucket.map(datum => [datum.label, datum] as const));

    const vertices: ParallelVertex[] = [];
    for (const axis of axes) {
      const datum = byLabel.get(axis.label);
      if (!datum) {
        continue;
      }
      const y = axis.toY(datum.value);
      if (y === null) {
        continue;
      }
      vertices.push({ axis, datum, y });
    }

    // Records failing an active extent are DIMMED, never removed: the point of brushing a
    // dataset this dense is reading the selection against the population it came from.
    const matches = recordMatchesExtents(byLabel, axes, params.extents);

    return {
      color: recordColor(bucket, index, colorCategories, params, palette),
      id,
      index,
      opacity: matches ? theme.line.opacity : theme.line.dimmedOpacity,
      vertices,
    };
  });
}

/** Resolve one record's stroke: explicit per-datum color, then `colorBy`, then position. */
function recordColor(
  bucket: NgeParallelCoordsDataPoint[],
  index: number,
  colorCategories: string[],
  params: ParallelCoordsRenderParams,
  palette: string[]
): string {
  const explicit = bucket.find(datum => datum.color)?.color;
  if (explicit) {
    return explicit;
  }

  const { colorBy } = params.config;
  if (colorBy) {
    const datum = bucket.find(entry => entry.label === colorBy);
    const category = datum ? colorCategories.indexOf(String(datum.value)) : -1;
    if (category >= 0) {
      return palette[category % palette.length];
    }
  }

  return palette[index % palette.length];
}

/**
 * Render the vertical dimension axes as a keyed enter/update/exit join keyed by dimension
 * label — one full-height line per dimension. Lines take final geometry synchronously and
 * fade in; survivors re-place on update; removed axes fade out.
 */
function renderAxes(
  group: Selection<SVGGElement, unknown, null, undefined>,
  params: ParallelCoordsRenderParams
): void {
  const { animation, axes, dimensions, theme } = params;
  const { bottom, top } = axisSpan(dimensions.boundedHeight);

  const lines = group
    .selectAll<SVGLineElement, ParallelAxis>('.nge-parallel-coords-axis')
    .data(axes, axis => axis.label);

  lines
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const entered = lines
    .enter()
    .append('line')
    .classed('nge-parallel-coords-axis', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x1', axis => axis.x)
    .attr('x2', axis => axis.x)
    .attr('y1', top)
    .attr('y2', bottom);

  entered
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  lines
    .attr('x1', axis => axis.x)
    .attr('x2', axis => axis.x)
    .attr('y1', top)
    .attr('y2', bottom)
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1);

  entered.merge(lines).style('stroke', theme.axis.color).style('stroke-width', theme.axis.width);
}

/**
 * Render the axis chrome — per-axis tick labels and the dimension names above each axis — as
 * keyed joins. Tick keys carry the dimension so two axes sharing a tick text stay distinct.
 * The first and last dimension names anchor inward so they cannot overflow the plot edges.
 */
function renderChrome(
  group: Selection<SVGGElement, unknown, null, undefined>,
  params: ParallelCoordsRenderParams
): void {
  const { animation, axes, theme } = params;

  // Ticks hang to an axis's left, except on the FIRST axis — there they would land at a
  // negative x, outside the plot clip, and vanish. Flipping just that one keeps them visible
  // without pushing every other axis's ticks into its neighbour.
  const tickAnchor = (axis: ParallelAxis): string => (axis === axes[0] ? 'start' : 'end');
  const tickX = (axis: ParallelAxis): number =>
    axis === axes[0] ? axis.x + TICK_LABEL_GAP : axis.x - TICK_LABEL_GAP;

  const tickEntries = axes.flatMap(axis => axis.ticks.map(tick => ({ axis, tick })));
  const ticks = group
    .selectAll<SVGTextElement, { axis: ParallelAxis; tick: ParallelTick }>(
      '.nge-parallel-coords-tick'
    )
    .data(tickEntries, entry => `${entry.axis.label}::${entry.tick.label}`);

  ticks
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enteredTicks = ticks
    .enter()
    .append('text')
    .classed('nge-parallel-coords-tick', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('dy', '0.32em')
    .attr('x', entry => tickX(entry.axis))
    .attr('y', entry => entry.tick.y)
    .text(entry => entry.tick.label);

  enteredTicks
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  ticks
    .attr('x', entry => tickX(entry.axis))
    .attr('y', entry => entry.tick.y)
    .text(entry => entry.tick.label)
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1);

  enteredTicks
    .merge(ticks)
    .attr('text-anchor', entry => tickAnchor(entry.axis))
    .style('fill', theme.tick.color)
    .style('font-size', `${theme.tick.fontSize}px`);

  const anchorFor = (axis: ParallelAxis): string => {
    if (axes.length < 2) {
      return 'middle';
    }
    if (axis === axes[0]) {
      return 'start';
    }
    return axis === axes[axes.length - 1] ? 'end' : 'middle';
  };

  const names = group
    .selectAll<SVGTextElement, ParallelAxis>('.nge-parallel-coords-axis-label')
    .data(axes, axis => axis.label);

  names
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enteredNames = names
    .enter()
    .append('text')
    .classed('nge-parallel-coords-axis-label', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x', axis => axis.x)
    .attr('y', AXIS_LABEL_BASELINE)
    .text(axis => axis.label);

  enteredNames
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  names
    .attr('x', axis => axis.x)
    .attr('y', AXIS_LABEL_BASELINE)
    .text(axis => axis.label)
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1);

  enteredNames
    .merge(names)
    .attr('text-anchor', anchorFor)
    .style('fill', theme.label.color)
    .style('font-size', `${theme.label.fontSize}px`)
    .style('font-weight', theme.label.fontWeight);
}

/**
 * Render the record polylines as a keyed enter/update/exit join keyed by `seriesId`. Each
 * record is a group holding the visible stroke plus an invisible wide-stroke twin that carries
 * hover and click: the visible line is too thin to hit reliably, and widening the real stroke
 * would change the density reading the chart depends on.
 */
function renderRecords(
  group: Selection<SVGGElement, unknown, null, undefined>,
  records: ParallelRecord[],
  params: ParallelCoordsRenderParams
): void {
  const { animation } = params;

  const groups = group
    .selectAll<SVGGElement, ParallelRecord>('.nge-parallel-coords-record')
    .data(records, record => record.id);

  groups
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const entered = groups
    .enter()
    .append('g')
    .classed('nge-parallel-coords-record', true)
    .attr('data-series-id', record => record.id)
    .style('opacity', 0);

  entered.each(function (record) {
    renderRecordShapes(select<SVGGElement, ParallelRecord>(this), record, params);
  });

  entered
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', record => record.opacity);

  groups.each(function (record) {
    renderRecordShapes(select<SVGGElement, ParallelRecord>(this), record, params);
  });

  groups
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', record => record.opacity);

  attachRecordInteraction(entered.merge(groups), params);
}

/** Draw / update one record's visible polyline and its invisible hit twin. */
function renderRecordShapes(
  group: Selection<SVGGElement, ParallelRecord, null, undefined>,
  record: ParallelRecord,
  params: ParallelCoordsRenderParams
): void {
  const { config, theme } = params;

  const generator = line<ParallelVertex>()
    .x(vertex => vertex.axis.x)
    .y(vertex => vertex.y);
  if (config.curve === 'monotone') {
    generator.curve(curveMonotoneX);
  }
  const path = generator(record.vertices) ?? '';

  let visible = group.select<SVGPathElement>('.nge-parallel-coords-line');
  if (visible.empty()) {
    visible = group
      .append('path')
      .classed('nge-parallel-coords-line', true)
      .style('fill', 'none')
      .style('pointer-events', 'none');
  }
  visible.attr('d', path).style('stroke', record.color).style('stroke-width', theme.line.width);

  let hit = group.select<SVGPathElement>('.nge-parallel-coords-hit');
  if (hit.empty()) {
    hit = group
      .append('path')
      .classed('nge-parallel-coords-hit', true)
      .style('fill', 'none')
      .style('stroke', 'transparent')
      .style('stroke-width', HIT_STROKE_WIDTH);
  }
  hit.attr('d', path);
}

/**
 * Wire hover / click on every record's hit path.
 *
 * Hover dims the other records to `theme.line.dimmedOpacity` so one can be traced through the
 * overplotting, and is applied straight to the DOM rather than routed through a re-render —
 * it is interaction feedback, not a data change.
 *
 * The tooltip and click payload resolve to the datum on whichever axis the pointer is nearest,
 * which is why this layer needs no per-vertex hover targets: a record count high enough to be
 * worth this chart type would otherwise mean records × dimensions invisible circles.
 */
function attachRecordInteraction(
  selection: Selection<SVGGElement, ParallelRecord, SVGGElement, unknown>,
  params: ParallelCoordsRenderParams
): void {
  const { config, theme, tooltipConfig, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);

  const hits = selection.select<SVGPathElement>('.nge-parallel-coords-hit');
  hits.style('cursor', interactive ? 'pointer' : 'default');

  if (!interactive) {
    hits.on('click', null).on('mouseenter', null).on('mouseleave', null).on('mousemove', null);
    return;
  }

  /** The `.nge-parallel-coords-record` group holding a hit path. */
  const recordOf = (node: SVGPathElement): SVGGElement => node.parentNode as SVGGElement;

  /** Every record group in the layer — the dim/restore target. */
  const allRecords = (
    node: SVGPathElement
  ): Selection<SVGGElement, ParallelRecord, SVGGElement, unknown> =>
    select(recordOf(node).parentNode as SVGGElement).selectAll<SVGGElement, ParallelRecord>(
      '.nge-parallel-coords-record'
    );

  hits
    .on('mouseenter', function (this: SVGPathElement) {
      // A brush drag passing over the polylines must not trigger the hover dim — the two would
      // then fight over the same opacity, which reads as flicker rather than as either effect.
      if (isBrushDragging(this.ownerSVGElement)) {
        return;
      }
      // The enter fade targets the resting opacity, so it has to be interrupted or it would
      // land on top of the dim a moment later.
      allRecords(this).interrupt('opacity-fade').style('opacity', theme.line.dimmedOpacity);
      select(recordOf(this)).style('opacity', 1);
    })
    .on('mouseleave', function (this: SVGPathElement) {
      if (isBrushDragging(this.ownerSVGElement)) {
        return;
      }
      // Restore each record's OWN resting opacity, not a flat `line.opacity` — a brushed-out
      // record has to fall back to the dim, or the first hover would silently clear the filter's
      // whole visual effect.
      allRecords(this).style('opacity', record => record.opacity);
      if (tooltipEnabled) {
        emitTooltipHidden(params);
      }
    });

  if (tooltipEnabled) {
    hits.on(
      'mousemove',
      function (this: SVGPathElement, event: PointerEvent, record: ParallelRecord) {
        const vertex = nearestVertex(record, pointer(event, this)[0]);
        if (vertex) {
          emitTooltip(vertex, params);
        }
      }
    );
  } else {
    hits.on('mousemove', null);
  }

  if (config.onClick) {
    hits.on('click', function (this: SVGPathElement, event: PointerEvent, record: ParallelRecord) {
      const vertex = nearestVertex(record, pointer(event, this)[0]);
      if (vertex) {
        config.onClick!({ data: vertex.datum, event, index: record.index });
      }
    });
  } else {
    hits.on('click', null);
  }
}

/** The record vertex whose axis is nearest a local x pixel. */
function nearestVertex(record: ParallelRecord, localX: number): null | ParallelVertex {
  let best: null | ParallelVertex = null;
  let bestDistance = Infinity;
  for (const vertex of record.vertices) {
    const distance = Math.abs(vertex.axis.x - localX);
    if (distance < bestDistance) {
      best = vertex;
      bestDistance = distance;
    }
  }
  return best;
}

/** Format + emit a tooltip event for the datum at a vertex, anchored above it. */
function emitTooltip(vertex: ParallelVertex, params: ParallelCoordsRenderParams): void {
  const { tooltipConfig, tooltipHandlers } = params;
  if (!tooltipConfig?.formatContent || !tooltipHandlers?.onTooltip) {
    return;
  }
  const event = vertexTooltipEvent(vertex, tooltipConfig.formatContent(vertex.datum), params);
  if (event) {
    tooltipHandlers.onTooltip(event);
  }
}

/** Emit the hide-tooltip event on mouseleave. */
function emitTooltipHidden(params: ParallelCoordsRenderParams): void {
  const { tooltipConfig, tooltipHandlers } = params;
  if (!tooltipConfig || !tooltipHandlers?.onTooltip) {
    return;
  }
  tooltipHandlers.onTooltip({
    content: { label: '', value: '' },
    dimensions: { height: tooltipConfig.height, width: tooltipConfig.width },
    divotPosition: 'bottom',
    position: { divotX: 0, x: 0, y: 0 },
    visible: false,
  });
}

/**
 * Build a tooltip event anchored above a vertex, positioned in full-SVG coords (bounded
 * offset + margins) and clamped to the chart bounds — mirrors the radar / pie divot+clamp
 * structure, minus the radial centre offset (this layer draws in plot coordinates).
 */
function vertexTooltipEvent(
  vertex: ParallelVertex,
  content: NgeTooltipContent,
  params: ParallelCoordsRenderParams
): NgeTooltipEvent | null {
  const { dimensions, margins, tooltipConfig } = params;
  if (!tooltipConfig) {
    return null;
  }

  const tooltipWidth = tooltipConfig.width;
  const tooltipHeight = tooltipConfig.height;
  const centerX = margins.left + vertex.axis.x;

  const minTooltipX = margins.left;
  const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;
  const idealTooltipX = centerX - tooltipWidth / 2;
  const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

  const containerHeight = margins.top + dimensions.boundedHeight + margins.bottom;
  const rawTooltipY = margins.top + vertex.y - tooltipHeight - 10;
  const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const rx = 4;
  const targetTipX = centerX - tooltipX;
  const idealDivotX = targetTipX - divotWidth / 2;
  const minDivotX = rx;
  const maxDivotX = tooltipWidth - rx - divotWidth;
  const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
  const divotCenterX = divotX + divotWidth / 2;
  const divotTipOffset = targetTipX - divotCenterX;

  return {
    content,
    dimensions: { height: tooltipHeight, width: tooltipWidth },
    divotPosition: 'bottom' as const,
    position: {
      divotTipOffset: Math.round(divotTipOffset),
      divotX: Math.round(divotX),
      x: Math.round(tooltipX),
      y: Math.round(tooltipY),
    },
    style: tooltipConfig.style,
    visible: true,
  };
}
