import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { areaRadial, curveLinearClosed, lineRadial } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeChartDimensions } from '../../core/chart.models';
import type { NgeRadarDataPoint, NgeRadarLayerConfig, NgeRadarRender } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeRadarLayerTheme, ResolvedNgeRadarLayerTheme } from '../../core/theme';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipEvent,
  NgeTooltipHandlers,
} from '../../core/tooltip';

import { mergeRadarLayerTheme } from '../../core/theme';

/** Every mark class the layer owns — used for the interrupt + the empty-data stale sweep. */
const RADAR_SELECTOR =
  '.nge-radar-series, .nge-radar-axis, .nge-radar-grid, .nge-radar-axis-label';

/** Series bucket key for points that carry no explicit `seriesId`. */
const DEFAULT_SERIES_ID = '__default__';

/** Radius of the invisible per-vertex hover/click targets. */
const VERTEX_HOVER_RADIUS = 8;

/** Gap (px) from the outer radius out to the category-label anchor. */
const AXIS_LABEL_OFFSET = 16;

/** One vertex of a radar series (a dimension's value point). */
interface RadarVertex {
  /** Spoke angle (radians, 0 = 12 o'clock, clockwise). */
  angle: number;
  /** Source datum (tooltip / click payload). */
  datum: NgeRadarDataPoint;
  /** Non-negative value. */
  value: number;
}

/** One radar series (a `seriesId` group) drawn as a closed polygon. */
interface RadarSeries {
  /** Resolved fill/stroke color (positional — by series index into the palette). */
  color: string;
  /** Series identity (join key). */
  id: string;
  /** Series index in first-seen order (drives the palette color). */
  index: number;
  /** Vertices ordered by spoke position (so the closed polygon traces axes in order). */
  points: RadarVertex[];
}

/** One angular axis (spoke): its dimension `label` and `angle` (radians). */
interface RadarAxis {
  angle: number;
  label: string;
}

/** Resolved geometry + palette threaded through the mark render helpers. */
interface RadarRenderParams {
  animation: ResolvedNgeChartAnimation;
  config: NgeRadarLayerConfig;
  cx: number;
  cy: number;
  dimensions: NgeChartDimensions;
  domainMax: number;
  endAngle: number;
  innerRadiusPx: number;
  labels: string[];
  margins: { bottom: number; left: number; right: number; top: number };
  outerRadius: number;
  palette: string[];
  radialScale: ScaleLinear<number, number>;
  render: NgeRadarRender;
  startAngle: number;
  theme: ResolvedNgeRadarLayerTheme;
  tooltipConfig?: NgeTooltipConfig<NgeRadarDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
}

/**
 * Render the radar / polar (spider / star) layer into the provided bounds with theme support.
 * Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` (center + radius) and IGNORES the
 * injected cartesian `scales`: `outerRadius = min(w, h) / 2`, `innerRadius` is a ratio of it,
 * and every value maps to a radius via a linear `[0, max] → [innerR, outerR]` scale. The N
 * unique dimension `label`s become N evenly-angled spokes (first straight up, 12 o'clock),
 * and each `seriesId` group draws as a closed `d3.lineRadial()` outline (`curveLinearClosed`)
 * over a web of concentric value rings + radial spokes. `render: 'area'` (default) fills the
 * polygon under the outline (Radar Diagram); `render: 'line'` strokes the outline only
 * (Polar Chart). Both place their final geometry synchronously (smear-free first paint,
 * testable without flushing) and fade in on enter; survivors re-place on update; removed
 * marks fade on exit — every transition driven off `context.animation`.
 */
export function renderRadarLayer(
  context: NgeChartLayerContext<
    NgeRadarDataPoint,
    NgeRadarLayerConfig,
    NgeRadarLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    bounds
      ?.selectAll(RADAR_SELECTOR)
      .interrupt()
      .interrupt('opacity-fade')
      .interrupt('series-opacity')
      .remove();
    return;
  }

  const theme = mergeRadarLayerTheme(context.theme);

  // Self-scaled geometry: center in the bounded area, size the outer radius to the smaller
  // half-dimension, and read innerRadius as a ratio of it (0 → axes start at the center).
  const cx = dimensions.boundedWidth / 2;
  const cy = dimensions.boundedHeight / 2;
  const outerRadius = Math.min(dimensions.boundedWidth, dimensions.boundedHeight) / 2;
  // `innerRadius` is a 0–1 ratio of the outer radius; clamp into [0, 1) so a stray value
  // ≥ 1 can't invert the radial scale (innerR ≥ outerR).
  const innerRatio = Math.max(0, Math.min(config.innerRadius ?? 0, 1 - 1e-6));
  const innerRadiusPx = innerRatio * outerRadius;

  // The unique dimension labels in first-seen order → one spoke each (the angular domain).
  const labels = uniqueInOrder(data.map(d => d.label));

  // Radial value scale (shared by every series + grid ring): [0, max] → [innerR, outerR].
  // Values are sanitized (safeValue) so a NaN / ±Infinity datum can't poison maxValue (→ a
  // NaN domain, wrongly falling back to 1) — it collapses to 0, exactly like a negative.
  const maxValue = Math.max(0, ...data.map(d => safeValue(d.value)));
  const domainMax = maxValue > 0 ? maxValue : 1;
  const radialScale = scaleLinear().domain([0, domainMax]).range([innerRadiusPx, outerRadius]);

  const palette = config.seriesColors?.length ? config.seriesColors : theme.series.colors;

  // Interrupt any running transitions (unnamed + the named fade ones) before recomputing the
  // joins, so a rapid re-render can't overlap a stale transition.
  bounds
    .selectAll(RADAR_SELECTOR)
    .interrupt()
    .interrupt('opacity-fade')
    .interrupt('series-opacity');

  // Container group, centered in the bounded area (mirrors pie/sunburst/radial-bar).
  let container = bounds.select<SVGGElement>('.nge-radar-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-radar-container', true);
  }
  container.attr('transform', `translate(${cx},${cy})`);

  // Fixed z-ordered sub-groups (created once, in order): grid rings < spokes < series < labels.
  const gridGroup = ensureGroup(container, 'nge-radar-grid-group');
  const axisGroup = ensureGroup(container, 'nge-radar-axis-group');
  const seriesLayer = ensureGroup(container, 'nge-radar-series-group');
  const labelGroup = ensureGroup(container, 'nge-radar-label-group');

  const params: RadarRenderParams = {
    animation,
    config,
    cx,
    cy,
    dimensions,
    domainMax,
    endAngle: config.endAngle ?? 2 * Math.PI,
    innerRadiusPx,
    labels,
    margins,
    outerRadius,
    palette,
    radialScale,
    render: config.render ?? 'area',
    startAngle: config.startAngle ?? 0,
    theme,
    tooltipConfig,
    tooltipHandlers,
  };

  const axes = buildAxes(params);
  const angleByLabel = new Map(axes.map(axis => [axis.label, axis.angle] as const));
  const series = buildSeries(data, angleByLabel, params);

  renderGrid(gridGroup, axes, params);
  renderAxes(axisGroup, axes, params);
  renderSeries(seriesLayer, series, params);
  renderAxisLabels(labelGroup, axes, params);
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

/**
 * Sanitize a datum `value` for geometry. A non-finite value (`NaN` / `±Infinity`) or a
 * negative collapses to `0` — so it can never poison `maxValue` (a single `NaN` would make
 * `domainMax` fall back to 1 and blow every other vertex past `outerRadius`) nor produce a
 * `radialScale(NaN)` → broken `d`. EVERY geometry read of a datum value goes through this.
 */
function safeValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
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
 * One evenly-angled spoke per unique dimension label. Spokes are spaced
 * `(endAngle - startAngle) / N` apart with the FIRST at `startAngle` — for the default
 * full-circle 0→2π sweep that puts axis 0 straight up (12 o'clock, d3's radial 0), the
 * conventional radar orientation.
 */
function buildAxes(params: RadarRenderParams): RadarAxis[] {
  const { endAngle, labels, startAngle } = params;
  const n = labels.length;
  const step = n > 0 ? (endAngle - startAngle) / n : 0;
  return labels.map((label, i) => ({ angle: startAngle + i * step, label }));
}

/**
 * Group the data into radar series by `seriesId` (first-seen order), each carrying its
 * dimension vertices ordered by spoke position (so the closed polygon traces the dimensions
 * in axis order). Series color cycles the palette by series index — kept POSITIONAL (a
 * filtered-out series would otherwise recolor its neighbours), matching the radial-area layer.
 */
function buildSeries(
  data: NgeRadarDataPoint[],
  angleByLabel: Map<string, number>,
  params: RadarRenderParams
): RadarSeries[] {
  const { labels, palette } = params;

  const order: string[] = [];
  const groups = new Map<string, NgeRadarDataPoint[]>();
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

  return order.map((id, index) => {
    const points = (groups.get(id) ?? [])
      .filter(datum => angleByLabel.has(datum.label))
      .map(datum => ({
        angle: angleByLabel.get(datum.label) as number,
        datum,
        value: safeValue(datum.value),
      }))
      .sort((left, right) => labels.indexOf(left.datum.label) - labels.indexOf(right.datum.label));
    return { color: palette[index % palette.length], id, index, points };
  });
}

/** Ring values: `config.levels` evenly-spaced levels, else the radial scale's positive ticks. */
function ringValues(params: RadarRenderParams): number[] {
  const { config, domainMax, radialScale } = params;
  const levels = config.levels;
  if (levels && levels > 0) {
    return Array.from({ length: levels }, (_, k) => ((k + 1) / levels) * domainMax);
  }
  return radialScale.ticks(5).filter(value => value > 0);
}

/** The closed-polygon `d` for one grid ring: through every spoke angle at the value's radius. */
function ringPath(value: number, spokeAngles: number[], params: RadarRenderParams): string {
  const r = params.radialScale(value);
  const gen = lineRadial<number>()
    .angle(angle => angle)
    .radius(() => r)
    .curve(curveLinearClosed);
  return gen(spokeAngles) ?? '';
}

/**
 * Render the concentric value rings (the grid web) as a keyed enter/update/exit join keyed
 * by ring value. Each ring is a closed regular polygon through the spoke angles at that
 * value's radius, so the web aligns with the axes. Rings take final geometry synchronously
 * and fade in; survivors re-place on update; removed rings fade out.
 */
function renderGrid(
  group: Selection<SVGGElement, unknown, null, undefined>,
  axes: RadarAxis[],
  params: RadarRenderParams
): void {
  const { animation, theme } = params;
  const spokeAngles = axes.map(axis => axis.angle);
  const values = ringValues(params);

  const rings = group
    .selectAll<SVGPathElement, number>('.nge-radar-grid')
    .data(values, value => String(value));

  rings
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const entered = rings
    .enter()
    .append('path')
    .classed('nge-radar-grid', true)
    .style('fill', 'none')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('d', value => ringPath(value, spokeAngles, params));

  entered
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  rings
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1)
    .attr('d', value => ringPath(value, spokeAngles, params));

  entered.merge(rings).style('stroke', theme.grid.color).style('stroke-width', theme.grid.width);
}

/**
 * Render the radial spokes as a keyed enter/update/exit join keyed by dimension label — one
 * line from the center out to the rim per dimension. Lines take final geometry synchronously
 * and fade in; survivors re-place on update; removed spokes fade out.
 */
function renderAxes(
  group: Selection<SVGGElement, unknown, null, undefined>,
  axes: RadarAxis[],
  params: RadarRenderParams
): void {
  const { animation, outerRadius, theme } = params;
  const tipX = (axis: RadarAxis): number => outerRadius * Math.sin(axis.angle);
  const tipY = (axis: RadarAxis): number => -outerRadius * Math.cos(axis.angle);

  const spokes = group
    .selectAll<SVGLineElement, RadarAxis>('.nge-radar-axis')
    .data(axes, axis => axis.label);

  spokes
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const entered = spokes
    .enter()
    .append('line')
    .classed('nge-radar-axis', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x1', 0)
    .attr('y1', 0)
    .attr('x2', tipX)
    .attr('y2', tipY);

  entered
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  spokes
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1)
    .attr('x2', tipX)
    .attr('y2', tipY);

  entered
    .merge(spokes)
    .attr('x1', 0)
    .attr('y1', 0)
    .style('stroke', theme.axis.color)
    .style('stroke-width', theme.axis.width);
}

/**
 * Render the per-dimension category labels as a keyed enter/update/exit join keyed by
 * dimension label — one text just outside each spoke tip, text-anchored by the spoke's
 * horizontal direction so it reads outward.
 */
function renderAxisLabels(
  group: Selection<SVGGElement, unknown, null, undefined>,
  axes: RadarAxis[],
  params: RadarRenderParams
): void {
  const { animation, outerRadius, theme } = params;
  const r = outerRadius + AXIS_LABEL_OFFSET;
  const labelX = (axis: RadarAxis): number => r * Math.sin(axis.angle);
  const labelY = (axis: RadarAxis): number => -r * Math.cos(axis.angle);
  const anchor = (axis: RadarAxis): string => {
    const x = Math.sin(axis.angle);
    if (Math.abs(x) < 1e-6) {
      return 'middle';
    }
    return x > 0 ? 'start' : 'end';
  };

  const texts = group
    .selectAll<SVGTextElement, RadarAxis>('.nge-radar-axis-label')
    .data(axes, axis => axis.label);

  texts
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const entered = texts
    .enter()
    .append('text')
    .classed('nge-radar-axis-label', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('dy', '0.32em')
    .attr('x', labelX)
    .attr('y', labelY)
    .text(axis => axis.label);

  entered
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  texts
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1)
    .attr('x', labelX)
    .attr('y', labelY);

  entered
    .merge(texts)
    .text(axis => axis.label)
    .attr('text-anchor', anchor)
    .style('fill', theme.label.color)
    .style('font-size', `${theme.label.fontSize}px`)
    .style('font-weight', theme.label.fontWeight);
}

/**
 * Render the radar series as a keyed series-group join keyed by `seriesId`. Each series draws
 * a closed `lineRadial` outline (both modes) and, in `render: 'area'`, a filled `areaRadial`
 * polygon beneath it; both are placed synchronously and the entering group fades in (the
 * area-layer pattern). Survivors re-draw on update; removed series fade out.
 */
function renderSeries(
  group: Selection<SVGGElement, unknown, null, undefined>,
  seriesArray: RadarSeries[],
  params: RadarRenderParams
): void {
  const { animation, theme } = params;

  const seriesGroups = group
    .selectAll<SVGGElement, RadarSeries>('.nge-radar-series')
    .data(seriesArray, d => d.id);

  seriesGroups
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enterGroups = seriesGroups
    .enter()
    .append('g')
    .classed('nge-radar-series', true)
    .attr('data-series-id', d => d.id)
    .style('opacity', 0);

  enterGroups.each(function (series) {
    renderSeriesShapes(select<SVGGElement, RadarSeries>(this), series, params);
  });

  enterGroups
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.series.opacity);

  seriesGroups.each(function (series) {
    renderSeriesShapes(select<SVGGElement, RadarSeries>(this), series, params);
  });

  seriesGroups
    .transition('series-opacity')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', theme.series.opacity);
}

/** Draw / update one series' outline (+ area fill for `render: 'area'`) + vertex dots + targets. */
function renderSeriesShapes(
  group: Selection<SVGGElement, RadarSeries, null, undefined>,
  series: RadarSeries,
  params: RadarRenderParams
): void {
  const { config, innerRadiusPx, radialScale, render, theme } = params;

  const areaGen = areaRadial<RadarVertex>()
    .angle(d => d.angle)
    .innerRadius(() => innerRadiusPx)
    .outerRadius(d => radialScale(d.value))
    .curve(curveLinearClosed);

  const lineGen = lineRadial<RadarVertex>()
    .angle(d => d.angle)
    .radius(d => radialScale(d.value))
    .curve(curveLinearClosed);

  // Filled polygon (`render: 'area'` only). Removed in `'line'` mode so a runtime toggle
  // drops the fill cleanly (Polar Chart = outline, no fill).
  let areaPath = group.select<SVGPathElement>('.nge-radar-area');
  if (render === 'area') {
    if (areaPath.empty()) {
      areaPath = group
        .insert('path', ':first-child')
        .classed('nge-radar-area', true)
        .style('pointer-events', 'none');
    }
    areaPath
      .attr('d', areaGen(series.points))
      .style('fill', series.color)
      .style('fill-opacity', config.fillOpacity ?? theme.series.fillOpacity);
  } else if (!areaPath.empty()) {
    areaPath.remove();
  }

  // Outline (both modes).
  let linePath = group.select<SVGPathElement>('.nge-radar-line');
  if (linePath.empty()) {
    linePath = group
      .append('path')
      .classed('nge-radar-line', true)
      .style('fill', 'none')
      .style('pointer-events', 'none');
  }
  linePath
    .attr('d', lineGen(series.points))
    .style('stroke', series.color)
    .style('stroke-width', theme.series.lineWidth);

  renderVertexDots(group, series, params);
  renderInteractionPoints(group, series, params);
}

/**
 * Render the visible vertex dots (one per data point). Radius comes from
 * `theme.series.pointRadius` (0 hides them); fill is the series color. The dots keep
 * `pointer-events: none` — the invisible interaction targets carry hover/click.
 */
function renderVertexDots(
  group: Selection<SVGGElement, RadarSeries, null, undefined>,
  series: RadarSeries,
  params: RadarRenderParams
): void {
  const { radialScale, theme } = params;
  const radius = theme.series.pointRadius;
  const vertices = radius > 0 ? series.points : [];

  const dots = group
    .selectAll<SVGCircleElement, RadarVertex>('.nge-radar-vertex')
    .data(vertices, v => v.datum.label);

  const entered = dots
    .enter()
    .append('circle')
    .classed('nge-radar-vertex', true)
    .style('pointer-events', 'none');

  dots.exit().remove();

  entered
    .merge(dots)
    .attr('r', radius)
    .attr('cx', v => radialScale(v.value) * Math.sin(v.angle))
    .attr('cy', v => -radialScale(v.value) * Math.cos(v.angle))
    .style('fill', series.color);
}

/**
 * Render invisible per-vertex hover/click targets at each series vertex (the tooltip / click
 * surface — the outline + fill + dots all keep `pointer-events: none`). Only built when the
 * layer is interactive.
 */
function renderInteractionPoints(
  group: Selection<SVGGElement, RadarSeries, null, undefined>,
  series: RadarSeries,
  params: RadarRenderParams
): void {
  const { config, radialScale, tooltipConfig, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);
  const vertices = interactive ? series.points : [];

  const points = group
    .selectAll<SVGCircleElement, RadarVertex>('.nge-radar-point')
    .data(vertices, v => v.datum.label);

  const enterPoints = points
    .enter()
    .append('circle')
    .classed('nge-radar-point', true)
    .attr('r', VERTEX_HOVER_RADIUS)
    .style('fill', 'transparent')
    .style('stroke', 'none');

  points.exit().remove();

  const merged = enterPoints.merge(points);
  merged
    .attr('cx', v => radialScale(v.value) * Math.sin(v.angle))
    .attr('cy', v => -radialScale(v.value) * Math.cos(v.angle))
    .style('cursor', interactive ? 'pointer' : 'default');

  if (tooltipEnabled) {
    merged
      .on('mouseenter', (_event: PointerEvent, v: RadarVertex) => {
        const local: [number, number] = [
          radialScale(v.value) * Math.sin(v.angle),
          -radialScale(v.value) * Math.cos(v.angle),
        ];
        emitTooltip(v.datum, local, params);
      })
      .on('mouseleave', () => emitTooltipHidden(params));
  } else {
    merged.on('mouseenter', null).on('mouseleave', null);
  }

  if (config.onClick) {
    merged.on('click', (event: PointerEvent, v: RadarVertex) => {
      config.onClick!({ data: v.datum, event, index: series.points.indexOf(v) });
    });
  } else {
    merged.on('click', null);
  }
}

/** Format + emit a tooltip event for a datum anchored above a container-local point. */
function emitTooltip(
  datum: NgeRadarDataPoint,
  local: [number, number],
  params: RadarRenderParams
): void {
  const { tooltipConfig, tooltipHandlers } = params;
  if (!tooltipConfig?.formatContent || !tooltipHandlers?.onTooltip) {
    return;
  }
  const event = pointTooltipEvent(local[0], local[1], tooltipConfig.formatContent(datum), params);
  if (event) {
    tooltipHandlers.onTooltip(event);
  }
}

/** Emit the hide-tooltip event on mouseleave. */
function emitTooltipHidden(params: RadarRenderParams): void {
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
 * Build a tooltip event anchored above a container-local point `(localX, localY)` (origin at
 * the chart center), positioned in full-SVG coords (center offset + margins) and clamped to
 * the chart bounds — mirrors the radial-bar / pie / sunburst divot/clamp structure.
 */
function pointTooltipEvent(
  localX: number,
  localY: number,
  content: NgeTooltipContent,
  params: RadarRenderParams
): NgeTooltipEvent | null {
  const { cx, cy, dimensions, margins, tooltipConfig } = params;
  if (!tooltipConfig) {
    return null;
  }

  const tooltipWidth = tooltipConfig.width;
  const tooltipHeight = tooltipConfig.height;
  const centerX = margins.left + cx + localX;

  const minTooltipX = margins.left;
  const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;
  const idealTooltipX = centerX - tooltipWidth / 2;
  const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

  const containerHeight = margins.top + dimensions.boundedHeight + margins.bottom;
  const rawTooltipY = margins.top + cy + localY - tooltipHeight - 10;
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
