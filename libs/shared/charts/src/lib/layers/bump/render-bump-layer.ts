import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';
import type { CurveFactory } from 'd3-shape';

import { select } from 'd3-selection';
import { curveBumpX, curveLinear, curveMonotoneX, line } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeChartScales } from '../../core/base-layout';
import type { NgeBumpDataPoint, NgeBumpLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeBumpLayerTheme, ResolvedNgeBumpLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';
import type { RankedBumpPoint } from '../../nge-chart/nge-chart.bump.helpers';

import { mergeBumpLayerTheme } from '../../core/theme';
import { deriveBumpRanks } from '../../nge-chart/nge-chart.bump.helpers';

/** X offset (px) of an end label past its series' last point. */
const BUMP_END_LABEL_OFFSET = 8;

/** A callable x scale (point / linear / time all invoke the same way). */
type XScaleFn = ((value: Date | number | string) => number | undefined) & {
  bandwidth?: () => number;
};

/** One resolved series: its color + its ranked points in left-to-right x order. */
interface BumpSeries {
  color: string;
  id: string;
  points: RankedBumpPoint[];
}

/** Params threaded through the render helpers. */
interface BumpRenderParams {
  animation: ResolvedNgeChartAnimation;
  config: NgeBumpLayerConfig;
  curveFactory: CurveFactory;
  /** The original, ungrouped data — used for stable click indices. */
  data: NgeBumpDataPoint[];
  margins: { bottom: number; left: number; right: number; top: number };
  mergedTheme: ResolvedNgeBumpLayerTheme;
  scales: NgeChartScales;
  tooltipConfig?: NgeTooltipConfig<NgeBumpDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
}

/**
 * Render a bump (rank-over-time) layer into the provided bounds with theme support.
 *
 * Extends the line renderer: one keyed `<g class="nge-bump-series">` per series
 * carrying a rank line (`curveBumpX` by default), optional per-point circles, and an
 * optional end label at the series' last x. Ranks are DERIVED per x-tick from each
 * datum's `value` (via {@link deriveBumpRanks}); the shared y scale maps rank 1 to the
 * top. Series enter by fading in (line geometry applied synchronously so first paint is
 * smear-free + testable) and survivors morph via named transitions; points grow from
 * radius 0. All colour is applied via D3 `.style()` on the resolved series color /
 * `--chart-*` tokens (never `.attr()`, where a `var()` would fail silently). Every
 * transition runs off `context.animation` — no hardcoded durations (bar a small hover
 * tween).
 */
export function renderBumpLayer(
  context: NgeChartLayerContext<
    NgeBumpDataPoint,
    NgeBumpLayerConfig,
    NgeBumpLayerTheme | undefined
  >
): void {
  const {
    animation,
    bounds,
    config,
    data,
    margins,
    scales,
    theme,
    tooltipConfig,
    tooltipHandlers,
  } = context;

  if (!bounds) {
    return;
  }

  // Stop any in-flight transitions before reconciling.
  bounds.selectAll('.nge-bump-series').interrupt();

  // Empty-data stale sweep: drop every mark (labels + points live inside the series
  // groups) and bail.
  if (!Array.isArray(data) || data.length === 0) {
    bounds.selectAll('.nge-bump-series').remove();
    return;
  }

  const mergedTheme = mergeBumpLayerTheme(theme);
  const ranked = deriveBumpRanks(data, config.rankOrder ?? 'desc');
  const seriesArray = buildSeries(ranked, data, config, mergedTheme, scales);

  renderSeries(bounds, seriesArray, {
    animation,
    config,
    curveFactory: getCurveFactory(config.curveType),
    data,
    margins,
    mergedTheme,
    scales,
    tooltipConfig,
    tooltipHandlers,
  });
}

/** The D3 curve factory for the configured curve type (default the symmetric bump). */
function getCurveFactory(curveType?: 'bump' | 'linear' | 'monotone'): CurveFactory {
  switch (curveType) {
    case 'linear':
      return curveLinear;
    case 'monotone':
      return curveMonotoneX;
    case 'bump':
    default:
      return curveBumpX;
  }
}

/**
 * Group ranked points into series and resolve each series' color.
 *
 * Points are bucketed by `seriesId` and sorted left-to-right by pixel x (so the line
 * connects in visual order for any x type). Series ORDER + color index follow first
 * appearance in the ORIGINAL data — matching `extractBumpChartLegendItems` and the
 * `seriesColors[i % n]` palette cycle.
 */
function buildSeries(
  ranked: RankedBumpPoint[],
  data: NgeBumpDataPoint[],
  config: NgeBumpLayerConfig,
  theme: ResolvedNgeBumpLayerTheme,
  scales: NgeChartScales
): BumpSeries[] {
  const byId = new Map<string, RankedBumpPoint[]>();
  for (const point of ranked) {
    const id = point.datum.seriesId;
    const bucket = byId.get(id);
    if (bucket) {
      bucket.push(point);
    } else {
      byId.set(id, [point]);
    }
  }

  for (const bucket of byId.values()) {
    bucket.sort((a, b) => getXPosition(a.datum.x, scales) - getXPosition(b.datum.x, scales));
  }

  // An empty seriesColors is treated the same as unset — cycle the theme palette (so
  // lines match the legend swatches, which do the same).
  const palette = config.seriesColors?.length ? config.seriesColors : theme.line.colors;
  const seen: string[] = [];
  const series: BumpSeries[] = [];

  for (const datum of data) {
    if (seen.includes(datum.seriesId)) {
      continue;
    }
    seen.push(datum.seriesId);
    const points = byId.get(datum.seriesId);
    if (!points || points.length === 0) {
      continue;
    }
    const index = seen.length - 1;
    const color = palette.length ? palette[index % palette.length] : theme.line.colors[0];
    series.push({ color, id: datum.seriesId, points });
  }

  return series;
}

/**
 * Reconcile the series groups with a keyed enter / update / exit join. Entering
 * groups fade in (their line geometry is applied synchronously); survivors re-render
 * (line morphs, points reposition); removed series fade out.
 */
function renderSeries(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  seriesArray: BumpSeries[],
  params: BumpRenderParams
): void {
  const { animation, config } = params;

  const seriesGroups = bounds
    .selectAll<SVGGElement, BumpSeries>('.nge-bump-series')
    .data(seriesArray, d => d.id);

  const enterGroups = seriesGroups
    .enter()
    .append('g')
    .attr('class', 'nge-bump-series')
    .attr('data-series-id', d => d.id)
    .style('opacity', 0);

  // Fade the entering series in (geometry is applied synchronously below).
  enterGroups
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  enterGroups.each(function (this: SVGGElement, series) {
    const group = select<SVGGElement, BumpSeries>(this);
    renderLinePath(group, series, params);
    if (config.showPoints) {
      renderPoints(group, series, params);
    }
    if (config.showLabels) {
      renderEndLabel(group, series, params);
    }
  });

  seriesGroups.each(function (this: SVGGElement, series) {
    const group = select<SVGGElement, BumpSeries>(this);
    renderLinePath(group, series, params);
    if (config.showPoints) {
      renderPoints(group, series, params);
    } else {
      group.selectAll('.nge-bump-point').remove();
    }
    if (config.showLabels) {
      renderEndLabel(group, series, params);
    } else {
      group.selectAll('.nge-bump-label').remove();
    }
  });

  seriesGroups
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();
}

/** Render a series' rank line (create-once path; morphs on update). */
function renderLinePath(
  group: Selection<SVGGElement, BumpSeries, null, undefined>,
  series: BumpSeries,
  params: BumpRenderParams
): void {
  const { animation, curveFactory, mergedTheme, scales } = params;

  const lineGenerator = line<RankedBumpPoint>()
    .x(d => getXPosition(d.datum.x, scales))
    .y(d => rankY(d.rank, scales))
    .curve(curveFactory);

  let path = group.select<SVGPathElement>('.nge-bump-line');
  const entering = path.empty();
  if (entering) {
    path = group
      .append('path')
      .classed('nge-bump-line', true)
      .style('fill', 'none')
      .style('pointer-events', 'none');
  }

  // Colour + width applied synchronously (a var() palette resolves only via .style()).
  path
    .style('stroke', series.color)
    .style('stroke-width', `${mergedTheme.line.width}px`)
    .style('stroke-dasharray', mergedTheme.line.dash || 'none');

  const d = lineGenerator(series.points) ?? '';
  if (entering) {
    // Enter: final geometry synchronously — smear-free first paint (the group fades in).
    path.attr('d', d);
  } else {
    // Update: morph the survivor path to its new geometry.
    path.transition('line-geom').duration(animation.updateMs).ease(animation.easing).attr('d', d);
  }
}

/** Render a series' per-point circles (grow on enter, reposition on update). */
function renderPoints(
  group: Selection<SVGGElement, BumpSeries, null, undefined>,
  series: BumpSeries,
  params: BumpRenderParams
): void {
  const { animation, config, margins, mergedTheme, scales, tooltipConfig, tooltipHandlers } =
    params;

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;
  const radius = config.pointRadius ?? mergedTheme.point.radius;
  const hoverRadius = mergedTheme.point.hoverRadius;

  const points = group
    .selectAll<SVGCircleElement, RankedBumpPoint>('.nge-bump-point')
    .data(series.points, d => String(d.datum.x));

  const enterPoints = points
    .enter()
    .append('circle')
    .classed('nge-bump-point', true)
    .attr('cx', d => getXPosition(d.datum.x, scales))
    .attr('cy', d => rankY(d.rank, scales))
    .attr('r', 0)
    .style('fill', d => d.datum.color ?? mergedTheme.point.color)
    .style('stroke', series.color)
    .style('stroke-width', `${mergedTheme.point.strokeWidth}px`)
    .style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  enterPoints.transition().duration(animation.enterMs).ease(animation.easing).attr('r', radius);

  points
    .style('fill', d => d.datum.color ?? mergedTheme.point.color)
    .style('stroke', series.color)
    .style('stroke-width', `${mergedTheme.point.strokeWidth}px`)
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('cx', d => getXPosition(d.datum.x, scales))
    .attr('cy', d => rankY(d.rank, scales))
    .attr('r', radius);

  points
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .attr('r', 0)
    .remove();

  const allPoints = enterPoints.merge(points);

  allPoints
    .on('mouseenter', function (this: SVGCircleElement, _event: PointerEvent, d: RankedBumpPoint) {
      select(this).transition().duration(150).attr('r', hoverRadius);

      if (tooltipEnabled && tooltipConfig) {
        const tooltipEvent = computeTooltipEvent(d, series, scales, margins, tooltipConfig);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('mouseleave', function (this: SVGCircleElement) {
      select(this).transition().duration(150).attr('r', radius);

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
    allPoints.on('click', function (event: PointerEvent, d: RankedBumpPoint) {
      const index = params.data.indexOf(d.datum);
      config.onClick!({ data: d.datum, event, index });
    });
  }
}

/** Render / update a series' end label, seated at its last point + a small offset. */
function renderEndLabel(
  group: Selection<SVGGElement, BumpSeries, null, undefined>,
  series: BumpSeries,
  params: BumpRenderParams
): void {
  const { animation, mergedTheme, scales } = params;
  const last = series.points[series.points.length - 1];
  if (!last) {
    group.selectAll('.nge-bump-label').remove();
    return;
  }

  const x = getXPosition(last.datum.x, scales) + BUMP_END_LABEL_OFFSET;
  const y = rankY(last.rank, scales);

  let label = group.select<SVGTextElement>('.nge-bump-label');
  const entering = label.empty();
  if (entering) {
    label = group
      .append('text')
      .classed('nge-bump-label', true)
      .attr('text-anchor', 'start')
      .attr('dominant-baseline', 'middle')
      .style('pointer-events', 'none');
  }

  // Colour via .style() so a var(--chart-*) resolves (an SVG fill attr would not).
  label
    .style('fill', mergedTheme.label.color)
    .attr('font-size', mergedTheme.label.fontSize)
    .attr('font-weight', mergedTheme.label.fontWeight)
    .text(series.id);

  if (entering) {
    label.attr('x', x).attr('y', y);
  } else {
    label
      .transition('label-move')
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x', x)
      .attr('y', y);
  }
}

/**
 * Pixel x for an x value. Point / linear / time scales return the exact position; a
 * band scale (defensive) centers on the band.
 */
function getXPosition(x: Date | number | string, scales: NgeChartScales): number {
  const xScale = scales.x as unknown as XScaleFn;
  if (typeof x === 'string' && xScale.bandwidth) {
    return (xScale(x) ?? 0) + xScale.bandwidth() / 2;
  }
  return xScale(x) ?? 0;
}

/** Pixel y for a rank (rank 1 at the top). */
function rankY(rank: number, scales: NgeChartScales): number {
  const yScale = scales.y as unknown as ScaleLinear<number, number>;
  return yScale(rank) ?? 0;
}

/** Compute a tooltip event for a hovered point: anchored above it, centered on it. */
function computeTooltipEvent(
  point: RankedBumpPoint,
  series: BumpSeries,
  scales: NgeChartScales,
  margins: { bottom: number; left: number; right: number; top: number },
  tooltipConfig: NgeTooltipConfig<NgeBumpDataPoint>
): NgeTooltipEvent | null {
  if (!tooltipConfig.formatContent) {
    return null;
  }

  const pointX = getXPosition(point.datum.x, scales);
  const pointY = rankY(point.rank, scales);

  const tooltipWidth = tooltipConfig.width ?? 120;
  const tooltipHeight = tooltipConfig.height ?? 65;

  const tooltipX = pointX + margins.left - tooltipWidth / 2;
  const tooltipY = pointY + margins.top - tooltipHeight - 12;

  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const divotX = (tooltipWidth - divotWidth) / 2;

  // Expose the derived rank to the formatter without mutating the source datum
  // (keeps click-index identity intact).
  const content = tooltipConfig.formatContent({ ...point.datum, rank: point.rank });
  const pointColor = point.datum.color ?? series.color;
  const mergedStyle = {
    ...tooltipConfig.style,
    borderColor: tooltipConfig.style?.borderColor ?? pointColor,
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
