import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { Delaunay } from 'd3-delaunay';
import { select } from 'd3-selection';
import 'd3-transition';

import type { NgeScatterDataPoint, NgeScatterLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type {
  NgeScatterLayerTheme,
  ResolvedNgeScatterLayerTheme,
} from '../../core/theme/nge-chart-theme.models';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipEvent,
  NgeTooltipHandlers,
} from '../../core/tooltip';

/**
 * Default scatter theme values
 */
const DEFAULT_SCATTER_THEME: ResolvedNgeScatterLayerTheme = {
  point: {
    color: '#1976D2',
    hoverColor: '#1565C0',
    opacity: 0.7,
    radius: 5,
    strokeColor: '#ffffff',
    strokeWidth: 1,
  },
};

/**
 * Merge user theme with defaults
 */
function mergeScatterLayerTheme(
  theme: NgeScatterLayerTheme | undefined
): ResolvedNgeScatterLayerTheme {
  return {
    point: {
      ...DEFAULT_SCATTER_THEME.point,
      ...theme?.point,
    },
  };
}

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
 * Default content formatter for scatter points
 */
function defaultScatterTooltipFormatter(data: NgeScatterDataPoint): NgeTooltipContent {
  return {
    label: `x: ${data.x.toFixed(1)}`,
    value: data.y.toFixed(1),
  };
}

/**
 * Render scatter layer with Voronoi-based tooltip detection.
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

  // Interrupt any running transitions
  bounds.selectAll('.nge-scatter-group').interrupt();

  // Create or select scatter group
  let scatterGroup = bounds.select<SVGGElement>('.nge-scatter-group');
  if (scatterGroup.empty()) {
    scatterGroup = bounds.append('g').attr('class', 'nge-scatter-group');
  }

  // Render points with D3 join pattern
  renderPoints(scatterGroup, data, {
    baseRadius,
    config,
    dimensions,
    margins: resolvedMargins,
    mergedTheme,
    scales,
    tooltipConfig,
    tooltipHandlers,
  });

  // Set up Voronoi overlay for better tooltip detection
  if (tooltipConfig?.enabled && tooltipHandlers?.onTooltip) {
    setupVoronoiOverlay(scatterGroup, data, {
      baseRadius,
      config,
      dimensions,
      margins: resolvedMargins,
      mergedTheme,
      scales,
      tooltipConfig,
      tooltipHandlers,
    });
  }
}

interface RenderPointsParams {
  baseRadius: number;
  config: NgeScatterLayerConfig;
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
  params: RenderPointsParams
): NgeTooltipEvent | null {
  const { dimensions, margins, scales, tooltipConfig } = params;

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
    style: tooltipConfig.style,
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
 * Render scatter points with D3 join pattern
 */
function renderPoints(
  group: Selection<SVGGElement, unknown, null, undefined>,
  data: NgeScatterDataPoint[],
  params: RenderPointsParams
): void {
  const { baseRadius, config, mergedTheme, scales, tooltipConfig, tooltipHandlers } = params;

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Data join
  const points = group
    .selectAll<SVGCircleElement, NgeScatterDataPoint>('.nge-scatter-point')
    .data(data, (d, i) => `${d.x}-${d.y}-${i}`);

  // Exit
  points.exit().transition().duration(300).attr('r', 0).attr('opacity', 0).remove();

  // Enter
  const pointsEnter = points
    .enter()
    .append('circle')
    .attr('class', 'nge-scatter-point')
    .attr('cx', d => getXPosition(d.x, scales))
    .attr('cy', d => getYPosition(d.y, scales))
    .attr('r', 0)
    .attr('opacity', 0);

  // Merge enter + update
  const allPoints = pointsEnter.merge(points);

  // Transition to final state
  allPoints
    .transition()
    .duration(300)
    .attr('cx', d => getXPosition(d.x, scales))
    .attr('cy', d => getYPosition(d.y, scales))
    .attr('r', d => d.size ?? baseRadius)
    .attr('opacity', mergedTheme.point.opacity)
    .attr('fill', d => d.color ?? mergedTheme.point.color)
    .attr('stroke', mergedTheme.point.strokeColor)
    .attr('stroke-width', mergedTheme.point.strokeWidth);

  // Set up mouse events on points (direct hover fallback)
  allPoints
    .style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default')
    .on('pointerenter', function (event: PointerEvent, d: NgeScatterDataPoint) {
      // Highlight on hover
      select(this)
        .transition()
        .duration(150)
        .attr('fill', d.color ? d.color : mergedTheme.point.hoverColor)
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
      // Reset styling
      select(this)
        .transition()
        .duration(150)
        .attr('fill', d.color ?? mergedTheme.point.color)
        .attr('r', d.size ?? baseRadius);

      // Hide tooltip
      if (tooltipEnabled) {
        tooltipHandlers!.onTooltip(createHideTooltipEvent(tooltipConfig!));
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

/**
 * Set up Voronoi overlay for improved tooltip detection.
 * This allows tooltips to show when hovering near a point,
 * not just directly over it.
 */
function setupVoronoiOverlay(
  group: Selection<SVGGElement, unknown, null, undefined>,
  data: NgeScatterDataPoint[],
  params: RenderPointsParams
): void {
  const { baseRadius, config, dimensions, mergedTheme, scales, tooltipConfig, tooltipHandlers } =
    params;

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Remove existing overlay
  group.select('.nge-scatter-voronoi-overlay').remove();

  // Create Delaunay triangulation from scaled point positions
  const points: [number, number][] = data.map(d => [
    getXPosition(d.x, scales),
    getYPosition(d.y, scales),
  ]);

  const delaunay = Delaunay.from(points);
  const voronoi = delaunay.voronoi([0, 0, dimensions.boundedWidth, dimensions.boundedHeight]);

  // Create overlay group
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

  // Track currently hovered point for smooth transitions
  let currentHoveredIndex: null | number = null;

  cells
    .on('pointerenter', function (event: PointerEvent, d: NgeScatterDataPoint) {
      const index = data.indexOf(d);
      if (currentHoveredIndex === index) return;

      // Reset previous point if any
      if (currentHoveredIndex !== null) {
        const prevData = data[currentHoveredIndex];
        group
          .selectAll<SVGCircleElement, NgeScatterDataPoint>('.nge-scatter-point')
          .filter((_, i) => i === currentHoveredIndex)
          .transition()
          .duration(150)
          .attr('fill', prevData.color ?? mergedTheme.point.color)
          .attr('r', prevData.size ?? baseRadius);
      }

      currentHoveredIndex = index;

      // Highlight point
      group
        .selectAll<SVGCircleElement, NgeScatterDataPoint>('.nge-scatter-point')
        .filter((_, i) => i === index)
        .transition()
        .duration(150)
        .attr('fill', d.color ? d.color : mergedTheme.point.hoverColor)
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
      const index = data.indexOf(d);

      // Only reset if we're leaving this specific cell
      if (currentHoveredIndex === index) {
        currentHoveredIndex = null;

        // Reset point styling
        group
          .selectAll<SVGCircleElement, NgeScatterDataPoint>('.nge-scatter-point')
          .filter((_, i) => i === index)
          .transition()
          .duration(150)
          .attr('fill', d.color ?? mergedTheme.point.color)
          .attr('r', d.size ?? baseRadius);

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
