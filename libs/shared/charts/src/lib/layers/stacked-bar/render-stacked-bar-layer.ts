import type { ScaleBand, ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { select } from 'd3-selection';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeStackedBarDataPoint, NgeStackedBarLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeStackedBarLayerTheme, ResolvedNgeStackedBarLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';
import type {
  StackedBarColumn,
  StackedBarSegment,
} from '../../nge-chart/nge-chart.stacked-bar.helpers';

import { mergeStackedBarLayerTheme } from '../../core/theme';
import {
  buildStackedBarSeries,
  computeMarimekkoColumns,
} from '../../nge-chart/nge-chart.stacked-bar.helpers';

/** A column's start + thickness along the CATEGORY axis (band scale or Marimekko). */
interface ColumnGeometry {
  size: number;
  start: number;
}

/** Internal params threaded through the enter/update helpers. */
interface StackedBarRenderParams {
  animation: ResolvedNgeChartAnimation;
  barRadius: number;
  config: NgeStackedBarLayerConfig;
  data: NgeStackedBarDataPoint[];
  /** category → seriesId → source datum (for colour, tooltip, click). */
  datumLookup: Map<string, Map<string, NgeStackedBarDataPoint>>;
  /** category → its band-axis start + size. */
  geometryByCategory: Map<string, ColumnGeometry>;
  isVertical: boolean;
  margins: { bottom: number; left: number; right: number; top: number };
  mergedTheme: ResolvedNgeStackedBarLayerTheme;
  /** seriesId → its palette index (for the modulo colour cycle). */
  seriesIndexById: Map<string, number>;
  showLabels: boolean;
  tooltipConfig?: NgeTooltipConfig<NgeStackedBarDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
  valueScale: ScaleLinear<number, number>;
}

/**
 * Render a stacked-bar layer into the provided bounds with theme support.
 *
 * Segments stack per category via `d3.stack()` (offset `none` / `expand`).
 * Column geometry along the category axis is either the shared uniform band
 * scale or — when `config.bandWidthAccessor` is set — a self-computed
 * variable-width Marimekko layout (vertical-only). Each column is a keyed `<g>`
 * translated to its band start; segments are keyed rects positioned along the
 * value axis. All colour is applied via D3 `.style()` on `--chart-*` tokens.
 */
export function renderStackedBarLayer(
  context: NgeChartLayerContext<
    NgeStackedBarDataPoint,
    NgeStackedBarLayerConfig,
    NgeStackedBarLayerTheme | undefined
  >
): void {
  const {
    animation,
    bounds,
    config,
    data,
    dimensions,
    margins,
    scales,
    theme,
    tooltipConfig,
    tooltipHandlers,
  } = context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  const mergedTheme = mergeStackedBarLayerTheme(theme);
  const built = buildStackedBarSeries(data, config.stackOffset);

  // Marimekko is vertical-only; otherwise honour orientation.
  const isMarimekko = config.bandWidthAccessor !== undefined;
  const isVertical = isMarimekko || config.orientation !== 'horizontal';
  const showLabels = config.showLabels ?? false;
  const barRadius = config.barRadius ?? mergedTheme.bar.radius;

  const valueScale = (isVertical ? scales.y : scales.x) as ScaleLinear<number, number>;

  // Column geometry (start + size along the CATEGORY axis): Marimekko self-computes
  // variable widths across the bounded width (the shared band scale is ignored);
  // otherwise every column reads the uniform band scale.
  const geometryByCategory = new Map<string, ColumnGeometry>();
  if (isMarimekko) {
    const marimekkoColumns = computeMarimekkoColumns(
      built.columns,
      dimensions.boundedWidth,
      config.barPadding ?? 0,
      config.bandWidthAccessor!
    );
    for (const column of marimekkoColumns) {
      geometryByCategory.set(column.category, { size: column.width, start: column.x });
    }
  } else {
    const bandScale = (isVertical ? scales.x : scales.y) as ScaleBand<string>;
    const size = bandScale.bandwidth();
    for (const column of built.columns) {
      geometryByCategory.set(column.category, { size, start: bandScale(column.category) ?? 0 });
    }
  }

  const seriesIndexById = new Map<string, number>();
  built.seriesOrder.forEach((id, index) => seriesIndexById.set(id, index));

  const params: StackedBarRenderParams = {
    animation,
    barRadius,
    config,
    data,
    datumLookup: buildDatumLookup(data),
    geometryByCategory,
    isVertical,
    margins,
    mergedTheme,
    seriesIndexById,
    showLabels,
    tooltipConfig,
    tooltipHandlers,
    valueScale,
  };

  // Interrupt any running transitions.
  bounds.selectAll('.nge-stacked-bar-column').interrupt();

  // Keyed join on column containers — one <g> per category, translated to its
  // band start so segments can position with a relative (0-based) band offset.
  const groups = bounds
    .selectAll<SVGGElement, StackedBarColumn>('.nge-stacked-bar-column')
    .data(built.columns, d => d.category);

  const enterGroups = groups
    .enter()
    .append('g')
    .classed('nge-stacked-bar-column', true)
    .attr('data-category', d => d.category)
    .attr('transform', d => columnTransform(d.category, params))
    .style('opacity', 0);

  // Fade entering columns in (segment geometry is applied synchronously below).
  enterGroups
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  groups
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('transform', d => columnTransform(d.category, params));

  groups
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // Segment join runs on both entered and updated column groups.
  enterGroups.merge(groups).each(function (this: SVGGElement, column) {
    joinSegments(select<SVGGElement, StackedBarColumn>(this), column, params);
  });
}

/** `translate(...)` placing a column group at its band start along the category axis. */
function columnTransform(category: string, params: StackedBarRenderParams): string {
  const start = params.geometryByCategory.get(category)?.start ?? 0;
  return params.isVertical ? `translate(${start}, 0)` : `translate(0, ${start})`;
}

/**
 * Join the segment rects (keyed by seriesId) within one column group. New segments
 * take their geometry synchronously (birth); surviving segments morph to the new
 * geometry on a data update. Colour is applied synchronously.
 */
function joinSegments(
  groupG: Selection<SVGGElement, StackedBarColumn, null, undefined>,
  column: StackedBarColumn,
  params: StackedBarRenderParams
): void {
  const { animation, barRadius, isVertical, mergedTheme, valueScale } = params;
  const size = params.geometryByCategory.get(column.category)?.size ?? 0;

  const rects = groupG
    .selectAll<SVGRectElement, StackedBarSegment>('.nge-stacked-bar-segment')
    .data(column.segments, d => d.seriesId);

  rects.exit().remove();

  const enterRects = rects.enter().append('rect').classed('nge-stacked-bar-segment', true);

  const allRects = enterRects
    .merge(rects)
    .attr('data-series-id', d => d.seriesId)
    .attr('rx', barRadius)
    .attr('ry', barRadius)
    .style('fill', segment => resolveSegmentFill(column.category, segment, params))
    .style('stroke', mergedTheme.bar.stroke)
    .style('stroke-width', `${mergedTheme.bar.strokeWidth}px`);

  // Entering segments take geometry synchronously (birth); surviving segments morph
  // to the new geometry on a data update over `animation.updateMs`.
  const morph = rects
    .transition('segment-geom')
    .duration(animation.updateMs)
    .ease(animation.easing);
  if (isVertical) {
    enterRects
      .attr('x', 0)
      .attr('width', size)
      .attr('y', d => Math.min(valueScale(d.y0), valueScale(d.y1)))
      .attr('height', d => Math.abs(valueScale(d.y0) - valueScale(d.y1)));
    morph
      .attr('x', 0)
      .attr('width', size)
      .attr('y', d => Math.min(valueScale(d.y0), valueScale(d.y1)))
      .attr('height', d => Math.abs(valueScale(d.y0) - valueScale(d.y1)));
  } else {
    enterRects
      .attr('y', 0)
      .attr('height', size)
      .attr('x', d => Math.min(valueScale(d.y0), valueScale(d.y1)))
      .attr('width', d => Math.abs(valueScale(d.y0) - valueScale(d.y1)));
    morph
      .attr('y', 0)
      .attr('height', size)
      .attr('x', d => Math.min(valueScale(d.y0), valueScale(d.y1)))
      .attr('width', d => Math.abs(valueScale(d.y0) - valueScale(d.y1)));
  }

  renderSegmentLabels(groupG, column, size, params);
  attachSegmentHandlers(allRects, column, params);
}

/**
 * Resolve a segment's fill: a per-datum `color` override, else the config /
 * theme palette cycled by the series index (modulo, so short palettes wrap).
 */
function resolveSegmentFill(
  category: string,
  segment: StackedBarSegment,
  params: StackedBarRenderParams
): string {
  const datum = params.datumLookup.get(category)?.get(segment.seriesId);
  if (datum?.color) {
    return datum.color;
  }
  const palette = params.config.seriesColors ?? params.mergedTheme.bar.colors;
  const index = params.seriesIndexById.get(segment.seriesId) ?? 0;
  return palette[index % palette.length];
}

/**
 * Render optional per-segment value labels, centered on each non-zero segment.
 * Zero-value (zero-height) segments are skipped — they have nowhere to sit.
 */
function renderSegmentLabels(
  groupG: Selection<SVGGElement, StackedBarColumn, null, undefined>,
  column: StackedBarColumn,
  size: number,
  params: StackedBarRenderParams
): void {
  const { isVertical, mergedTheme, showLabels, valueScale } = params;

  const labelData = showLabels ? column.segments.filter(segment => segment.value !== 0) : [];

  const labels = groupG
    .selectAll<SVGTextElement, StackedBarSegment>('.nge-stacked-bar-label')
    .data(labelData, d => d.seriesId);

  labels.exit().remove();

  const allLabels = labels
    .enter()
    .append('text')
    .classed('nge-stacked-bar-label', true)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'none')
    .merge(labels)
    .attr('fill', mergedTheme.label.color)
    .attr('font-size', mergedTheme.label.fontSize)
    .attr('font-weight', mergedTheme.label.fontWeight)
    .text(d => String(d.value));

  if (isVertical) {
    allLabels.attr('x', size / 2).attr('y', d => (valueScale(d.y0) + valueScale(d.y1)) / 2);
  } else {
    allLabels.attr('x', d => (valueScale(d.y0) + valueScale(d.y1)) / 2).attr('y', size / 2);
  }
}

/**
 * Wire hover (tooltip) and click handlers on a column's segment rects. The
 * hovered/clicked segment recovers its source datum for the tooltip content and
 * click payload; synthetic zero-fill cells with no datum are inert.
 */
function attachSegmentHandlers(
  rects: Selection<SVGRectElement, StackedBarSegment, SVGGElement, StackedBarColumn>,
  column: StackedBarColumn,
  params: StackedBarRenderParams
): void {
  const { config, data, tooltipConfig, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);

  rects.style('cursor', interactive ? 'pointer' : 'default');

  rects
    .on('mouseenter', function (_event: PointerEvent, segment: StackedBarSegment) {
      if (!tooltipEnabled || !tooltipConfig) {
        return;
      }
      const datum = params.datumLookup.get(column.category)?.get(segment.seriesId);
      if (!datum) {
        return;
      }
      const tooltipEvent = computeTooltipEvent(column, segment, datum, params);
      if (tooltipEvent) {
        tooltipHandlers!.onTooltip(tooltipEvent);
      }
    })
    .on('mouseleave', function () {
      if (tooltipEnabled && tooltipConfig) {
        tooltipHandlers!.onTooltip({
          content: { label: '', value: '' },
          dimensions: { height: tooltipConfig.height ?? 65, width: tooltipConfig.width ?? 120 },
          divotPosition: 'bottom',
          position: { divotX: 0, x: 0, y: 0 },
          visible: false,
        });
      }
    });

  if (config.onClick) {
    rects.on('click', function (event: PointerEvent, segment: StackedBarSegment) {
      const datum = params.datumLookup.get(column.category)?.get(segment.seriesId);
      if (!datum) {
        return;
      }
      config.onClick!({ data: datum, event, index: data.indexOf(datum) });
    });
  } else {
    rects.on('click', null);
  }
}

/**
 * Compute a tooltip event for a hovered segment: anchored at the segment's outer
 * edge along the value axis, centered on the column, offset by the chart margins.
 */
function computeTooltipEvent(
  column: StackedBarColumn,
  segment: StackedBarSegment,
  datum: NgeStackedBarDataPoint,
  params: StackedBarRenderParams
): NgeTooltipEvent | null {
  const { isVertical, margins, tooltipConfig, valueScale } = params;
  if (!tooltipConfig?.formatContent) {
    return null;
  }

  const geometry = params.geometryByCategory.get(column.category);
  const start = geometry?.start ?? 0;
  const size = geometry?.size ?? 0;

  const edgeA = valueScale(segment.y0);
  const edgeB = valueScale(segment.y1);
  const valueOuter = Math.min(edgeA, edgeB);
  const valueMid = (edgeA + edgeB) / 2;
  const bandCenter = start + size / 2;

  const anchorX = isVertical ? bandCenter : valueMid;
  const anchorY = isVertical ? valueOuter : bandCenter;

  const tooltipWidth = tooltipConfig.width ?? 120;
  const tooltipHeight = tooltipConfig.height ?? 65;

  const tooltipX = anchorX + margins.left - tooltipWidth / 2;
  const tooltipY = anchorY + margins.top - tooltipHeight - 12;

  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const divotX = (tooltipWidth - divotWidth) / 2;

  const content = tooltipConfig.formatContent(datum);
  const segmentColor = resolveSegmentFill(column.category, segment, params);
  const mergedStyle = {
    ...tooltipConfig.style,
    borderColor: tooltipConfig.style?.borderColor ?? datum.color ?? segmentColor,
  };

  return {
    content,
    dimensions: { height: tooltipHeight, width: tooltipWidth },
    divotPosition: 'bottom',
    position: { divotX, x: tooltipX, y: tooltipY },
    style: mergedStyle,
    visible: true,
  };
}

/**
 * Index each datum by category + seriesId so a segment can recover its source
 * datum for colour, tooltip content, and click payloads.
 */
function buildDatumLookup(
  data: NgeStackedBarDataPoint[]
): Map<string, Map<string, NgeStackedBarDataPoint>> {
  const lookup = new Map<string, Map<string, NgeStackedBarDataPoint>>();

  for (const point of data) {
    let inner = lookup.get(point.category);
    if (!inner) {
      inner = new Map<string, NgeStackedBarDataPoint>();
      lookup.set(point.category, inner);
    }
    inner.set(point.seriesId, point);
  }

  return lookup;
}
