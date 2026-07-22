import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { Delaunay } from 'd3-delaunay';
import { select } from 'd3-selection';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeScatterDataPoint, NgeScatterLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeScatterLayerTheme, ResolvedNgeScatterLayerTheme } from '../../core/theme';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipEvent,
  NgeTooltipHandlers,
} from '../../core/tooltip';

import { mergeScatterLayerTheme } from '../../core/theme';

/**
 * Get X position for a scatter data point
 */
function getXPosition(x: number, scales: { x: unknown }): number {
  const xScale = scales.x as ScaleLinear<number, number>;
  return xScale(x) ?? 0;
}

/**
 * Get Y position for a scatter data point
 */
function getYPosition(y: number, scales: { y: unknown }): number {
  const yScale = scales.y as ScaleLinear<number, number>;
  return yScale(y) ?? 0;
}

/**
 * Default content formatter for scatter points.
 * Prefixes the series name when a point belongs to a named series.
 */
function defaultScatterTooltipFormatter(data: NgeScatterDataPoint): NgeTooltipContent {
  const seriesLabel = data.seriesId ? `${data.seriesId} · ` : '';

  return {
    extra: { seriesId: data.seriesId },
    label: `${seriesLabel}x: ${data.x.toFixed(1)}`,
    value: data.y.toFixed(1),
  };
}

/**
 * Internal representation of a scatter series for rendering.
 */
interface ScatterSeries {
  color: string;
  id: string;
  points: NgeScatterDataPoint[];
}

/**
 * Group scatter points by seriesId.
 * Points without a seriesId are collected into a single '__default__' series,
 * preserving single-series behavior. Unlike the line renderer, scatter points
 * are NOT sorted — scatter x values are not ordered.
 *
 * Per-series color follows the documented precedence:
 * `seriesColors[i] ?? theme.point.colors[i] ?? theme.point.color`.
 */
function groupBySeries(
  data: NgeScatterDataPoint[],
  config: NgeScatterLayerConfig,
  theme: ResolvedNgeScatterLayerTheme
): ScatterSeries[] {
  const seriesMap = new Map<string, NgeScatterDataPoint[]>();

  for (const point of data) {
    const seriesId = point.seriesId ?? '__default__';
    if (!seriesMap.has(seriesId)) {
      seriesMap.set(seriesId, []);
    }
    seriesMap.get(seriesId)!.push(point);
  }

  const palette = config.seriesColors ?? theme.point.colors;
  const seriesArray: ScatterSeries[] = [];
  let index = 0;

  for (const [id, points] of seriesMap) {
    const color = palette.length ? palette[index % palette.length] : theme.point.color;
    seriesArray.push({ color, id, points });
    index++;
  }

  return seriesArray;
}

/**
 * Render scatter layer with Voronoi-based tooltip detection.
 * Supports single and multi-series scatters via hybrid seriesId detection,
 * mirroring the line-chart series model inside one scatter layer.
 * Uses Delaunay triangulation for efficient nearest-point lookup.
 */
export function renderScatterLayer(
  context: NgeChartLayerContext<
    NgeScatterDataPoint,
    NgeScatterLayerConfig,
    NgeScatterLayerTheme | undefined
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

  // Merge theme with defaults
  const mergedTheme = mergeScatterLayerTheme(theme);

  // Get point radius from config or theme
  const baseRadius = config.pointRadius ?? mergedTheme.point.radius;

  // Default margins for tooltip calculations
  const resolvedMargins = margins ?? { bottom: 25, left: 45, right: 15, top: 15 };

  // Group points into series and resolve each point's final color once.
  // colorByPoint maps a datum to `point.color ?? series.color`, threaded into the
  // renderers and Voronoi overlay so highlight/reset stay identity-based.
  const seriesArray = groupBySeries(data, config, mergedTheme);
  const colorByPoint = new Map<NgeScatterDataPoint, string>();
  for (const series of seriesArray) {
    for (const point of series.points) {
      colorByPoint.set(point, point.color ?? series.color);
    }
  }

  // Create or select scatter group
  let scatterGroup = bounds.select<SVGGElement>('.nge-scatter-group');
  if (scatterGroup.empty()) {
    scatterGroup = bounds.append('g').attr('class', 'nge-scatter-group');
  }

  // Interrupt any running transitions
  scatterGroup.selectAll('.nge-scatter-series').interrupt();
  scatterGroup.selectAll('.nge-scatter-point').interrupt();

  const params: RenderScatterParams = {
    animation,
    baseRadius,
    colorByPoint,
    config,
    data,
    dimensions,
    margins: resolvedMargins,
    mergedTheme,
    scales,
    tooltipConfig,
    tooltipHandlers,
  };

  // Render each series into its own keyed <g class="nge-scatter-series">
  renderSeries(scatterGroup, seriesArray, params);

  // Single Voronoi overlay across ALL series' points, appended AFTER the series
  // groups so it stays on top now that points live in sub-groups.
  if (tooltipConfig?.enabled && tooltipHandlers?.onTooltip) {
    setupVoronoiOverlay(scatterGroup, data, params);
  }
}

interface RenderScatterParams {
  animation: ResolvedNgeChartAnimation;
  baseRadius: number;
  /** Resolved color per datum: `point.color ?? series.color`. */
  colorByPoint: Map<NgeScatterDataPoint, string>;
  config: NgeScatterLayerConfig;
  /** Original, ungrouped data — used for stable click indices. */
  data: NgeScatterDataPoint[];
  dimensions: NgeChartLayerContext<unknown, unknown, unknown>['dimensions'];
  margins: { bottom: number; left: number; right: number; top: number };
  mergedTheme: ResolvedNgeScatterLayerTheme;
  scales: NgeChartLayerContext<unknown, unknown, unknown>['scales'];
  tooltipConfig?: NgeTooltipConfig<NgeScatterDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
}

/**
 * Compute tooltip event for a scatter point
 */
function computeTooltipEvent(
  event: PointerEvent,
  d: NgeScatterDataPoint,
  params: RenderScatterParams
): NgeTooltipEvent | null {
  const { colorByPoint, dimensions, margins, mergedTheme, scales, tooltipConfig } = params;

  if (!tooltipConfig) return null;

  // Get formatted content
  const formatFn = tooltipConfig.formatContent ?? defaultScatterTooltipFormatter;
  const content = formatFn(d);

  // Calculate point position (center of point)
  const pointX = getXPosition(d.x, scales);
  const pointY = getYPosition(d.y, scales);

  // Mouse position relative to container
  const mouseY = event.offsetY;

  // Tooltip dimensions
  const tooltipWidth = tooltipConfig.width;
  const tooltipHeight = tooltipConfig.height;

  // Calculate tooltip X position centered on point
  let tooltipX = margins.left + pointX - tooltipWidth / 2;

  // Clamp to chart bounds
  const minX = 5;
  const maxX = (dimensions.width ?? 0) - tooltipWidth - 5;
  tooltipX = Math.max(minX, Math.min(maxX, tooltipX));

  // Calculate divot X position (relative to tooltip left)
  // divotX is the left edge of the divot, tip is at divotX + divotWidth/2
  // So we need to offset by half the divot width to center the tip on the target
  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const targetX = margins.left + pointX;
  let divotX = targetX - tooltipX - divotWidth / 2;
  divotX = Math.max(15, Math.min(tooltipWidth - divotWidth - 15, divotX));

  // Calculate divot tip offset (when tooltip/divot is clamped)
  // Tip should point to targetX - tooltipX, but divot center is at divotX + divotWidth/2
  // Offset adjusts the tip position within the divot to still point at target
  const desiredTipX = targetX - tooltipX;
  const actualTipX = divotX + divotWidth / 2;
  const divotTipOffset = desiredTipX - actualTipX;

  // Determine tooltip position and divot direction based on mouse position
  const position = tooltipConfig.position ?? 'follow-mouse';
  let tooltipY: number;
  let divotPosition: 'bottom' | 'top';

  if (position === 'follow-mouse') {
    // Position tooltip above or below mouse based on chart position
    const chartMiddle = (dimensions.height ?? 0) / 2;
    if (mouseY < chartMiddle) {
      // Mouse in top half - show tooltip below point
      tooltipY = margins.top + pointY + 15;
      divotPosition = 'top';
    } else {
      // Mouse in bottom half - show tooltip above point
      tooltipY = margins.top + pointY - tooltipHeight - 15;
      divotPosition = 'bottom';
    }
  } else if (position === 'above') {
    tooltipY = margins.top + pointY - tooltipHeight - 15;
    divotPosition = 'bottom';
  } else {
    // below
    tooltipY = margins.top + pointY + 15;
    divotPosition = 'top';
  }

  // Border color follows the point's resolved series color unless overridden
  const pointColor = colorByPoint.get(d) ?? mergedTheme.point.color;
  const mergedStyle = {
    ...tooltipConfig.style,
    borderColor: tooltipConfig.style?.borderColor ?? pointColor,
  };

  return {
    content,
    dimensions: {
      height: tooltipHeight,
      width: tooltipWidth,
    },
    divotPosition,
    position: {
      divotTipOffset: Math.abs(divotTipOffset) > 1 ? divotTipOffset : undefined,
      divotX,
      x: tooltipX,
      y: tooltipY,
    },
    style: mergedStyle,
    visible: true,
  };
}

/**
 * Create a hide tooltip event
 */
function createHideTooltipEvent(
  tooltipConfig: NgeTooltipConfig<NgeScatterDataPoint>
): NgeTooltipEvent {
  return {
    content: { label: '', value: '' },
    dimensions: { height: tooltipConfig.height, width: tooltipConfig.width },
    divotPosition: 'bottom',
    position: { divotX: 0, x: 0, y: 0 },
    visible: false,
  };
}

/**
 * Render each series into a keyed `<g class="nge-scatter-series">` via a D3 join.
 */
function renderSeries(
  group: Selection<SVGGElement, unknown, null, undefined>,
  seriesArray: ScatterSeries[],
  params: RenderScatterParams
): void {
  const { animation } = params;

  const seriesGroups = group
    .selectAll<SVGGElement, ScatterSeries>('.nge-scatter-series')
    .data(seriesArray, d => d.id);

  // Enter
  const enterGroups = seriesGroups
    .enter()
    .append('g')
    .attr('class', 'nge-scatter-series')
    .attr('data-series-id', d => d.id);

  // Enter + update: render this series' points into its own group
  enterGroups.merge(seriesGroups).each(function (this: SVGGElement, series) {
    renderPoints(select<SVGGElement, ScatterSeries>(this), series, params);
  });

  // Exit
  seriesGroups
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();
}

/**
 * Render one series' scatter points with a D3 join.
 * Fill + stroke are applied synchronously via `.style()` (never `.attr()`) so the
 * `var(--chart-*)` palette resolves — a `var()` in an SVG presentation attribute
 * fails silently. Geometry (`cx`/`cy`/`r`) and `opacity` animate in.
 */
function renderPoints(
  group: Selection<SVGGElement, ScatterSeries, null, undefined>,
  series: ScatterSeries,
  params: RenderScatterParams
): void {
  const {
    animation,
    baseRadius,
    colorByPoint,
    config,
    mergedTheme,
    scales,
    tooltipConfig,
    tooltipHandlers,
  } = params;

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Data join
  const points = group
    .selectAll<SVGCircleElement, NgeScatterDataPoint>('.nge-scatter-point')
    .data(series.points, (d, i) => `${d.x}-${d.y}-${i}`);

  // Exit
  points
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .attr('r', 0)
    .attr('opacity', 0)
    .remove();

  // Enter — fill/stroke set synchronously with .style() so var() palette resolves
  const pointsEnter = points
    .enter()
    .append('circle')
    .attr('class', 'nge-scatter-point')
    .attr('cx', d => getXPosition(d.x, scales))
    .attr('cy', d => getYPosition(d.y, scales))
    .attr('r', 0)
    .attr('opacity', 0)
    .style('fill', d => colorByPoint.get(d) ?? mergedTheme.point.color)
    .style('stroke', mergedTheme.point.strokeColor)
    .attr('stroke-width', mergedTheme.point.strokeWidth);

  // Update — keep fill/stroke in sync
  points
    .style('fill', d => colorByPoint.get(d) ?? mergedTheme.point.color)
    .style('stroke', mergedTheme.point.strokeColor)
    .attr('stroke-width', mergedTheme.point.strokeWidth);

  // Merge enter + update
  const allPoints = pointsEnter.merge(points);

  // Cursor (sync), then animate geometry + opacity to final state
  allPoints.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');
  allPoints
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('cx', d => getXPosition(d.x, scales))
    .attr('cy', d => getYPosition(d.y, scales))
    .attr('r', d => d.size ?? baseRadius)
    .attr('opacity', d => d.opacity ?? mergedTheme.point.opacity);

  // Direct hover fallback — keep the point's resolved color, just bump the radius
  allPoints
    .on('pointerenter', function (event: PointerEvent, d: NgeScatterDataPoint) {
      select(this)
        .transition()
        .duration(150)
        .style('fill', colorByPoint.get(d) ?? mergedTheme.point.color)
        .attr('r', (d.size ?? baseRadius) * 1.3);

      // Show tooltip
      if (tooltipEnabled) {
        const tooltipEvent = computeTooltipEvent(event, d, params);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('pointermove', function (event: PointerEvent, d: NgeScatterDataPoint) {
      if (tooltipEnabled && tooltipConfig?.position === 'follow-mouse') {
        const tooltipEvent = computeTooltipEvent(event, d, params);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('pointerleave', function (_event: PointerEvent, d: NgeScatterDataPoint) {
      // Reset styling to the resolved series color
      select(this)
        .transition()
        .duration(150)
        .style('fill', colorByPoint.get(d) ?? mergedTheme.point.color)
        .attr('r', d.size ?? baseRadius);

      // Hide tooltip
      if (tooltipEnabled) {
        tooltipHandlers!.onTooltip(createHideTooltipEvent(tooltipConfig!));
      }
    })
    .on('click', function (event: PointerEvent, d: NgeScatterDataPoint) {
      if (config.onClick) {
        const clickIndex = params.data.indexOf(d);
        config.onClick({
          data: d,
          event,
          index: clickIndex,
        });
      }
    });
}

/**
 * Set up a single Voronoi overlay across ALL series' points for improved tooltip
 * detection. This allows tooltips to show when hovering near a point, not just
 * directly over it.
 *
 * Highlight/reset select `.nge-scatter-point` across every series sub-group and
 * filter by datum identity — once points are grouped by series, DOM order no
 * longer matches data order, so positional-index selection would highlight the
 * wrong circle.
 */
function setupVoronoiOverlay(
  group: Selection<SVGGElement, unknown, null, undefined>,
  data: NgeScatterDataPoint[],
  params: RenderScatterParams
): void {
  const {
    baseRadius,
    colorByPoint,
    config,
    dimensions,
    mergedTheme,
    scales,
    tooltipConfig,
    tooltipHandlers,
  } = params;

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Remove existing overlay so it can be re-appended AFTER the series groups
  group.select('.nge-scatter-voronoi-overlay').remove();

  // Build the Delaunay from the full flattened point set
  const points: [number, number][] = data.map(d => [
    getXPosition(d.x, scales),
    getYPosition(d.y, scales),
  ]);

  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, dimensions.boundedWidth, dimensions.boundedHeight]);

  // Create overlay group (appended last → on top of every series group)
  const overlayGroup = group
    .append('g')
    .attr('class', 'nge-scatter-voronoi-overlay')
    .style('pointer-events', 'all');

  // Render Voronoi cells as invisible paths
  const cells = overlayGroup
    .selectAll<SVGPathElement, NgeScatterDataPoint>('.nge-scatter-voronoi-cell')
    .data(data)
    .enter()
    .append('path')
    .attr('class', 'nge-scatter-voronoi-cell')
    .attr('d', (_, i) => voronoi.renderCell(i))
    .attr('fill', 'transparent')
    .attr('stroke', 'none')
    .style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Track currently hovered point by datum identity for smooth transitions
  let currentHovered: NgeScatterDataPoint | null = null;

  // Reset a point's fill + radius by selecting it across ALL series groups by identity
  const resetPoint = (point: NgeScatterDataPoint): void => {
    group
      .selectAll<SVGCircleElement, NgeScatterDataPoint>('.nge-scatter-point')
      .filter(pointDatum => pointDatum === point)
      .transition()
      .duration(150)
      .style('fill', colorByPoint.get(point) ?? mergedTheme.point.color)
      .attr('r', point.size ?? baseRadius);
  };

  cells
    .on('pointerenter', function (event: PointerEvent, d: NgeScatterDataPoint) {
      if (currentHovered === d) return;

      // Reset previously hovered point (if any)
      if (currentHovered !== null) {
        resetPoint(currentHovered);
      }

      currentHovered = d;

      // Highlight the hovered point by datum identity (not positional index)
      group
        .selectAll<SVGCircleElement, NgeScatterDataPoint>('.nge-scatter-point')
        .filter(pointDatum => pointDatum === d)
        .transition()
        .duration(150)
        .style('fill', colorByPoint.get(d) ?? mergedTheme.point.color)
        .attr('r', (d.size ?? baseRadius) * 1.3);

      // Show tooltip
      if (tooltipEnabled) {
        const tooltipEvent = computeTooltipEvent(event, d, params);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('pointermove', function (event: PointerEvent, d: NgeScatterDataPoint) {
      if (tooltipEnabled && tooltipConfig?.position === 'follow-mouse') {
        const tooltipEvent = computeTooltipEvent(event, d, params);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('pointerleave', function (_event: PointerEvent, d: NgeScatterDataPoint) {
      // Only reset if we're leaving the currently hovered point
      if (currentHovered === d) {
        currentHovered = null;
        resetPoint(d);

        // Hide tooltip
        if (tooltipEnabled) {
          tooltipHandlers!.onTooltip(createHideTooltipEvent(tooltipConfig!));
        }
      }
    })
    .on('click', function (event: PointerEvent, d: NgeScatterDataPoint) {
      if (config.onClick) {
        const clickIndex = data.indexOf(d);
        config.onClick({
          data: d,
          event,
          index: clickIndex,
        });
      }
    });
}
