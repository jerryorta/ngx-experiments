import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { select } from 'd3-selection';
import { area, curveLinear, curveMonotoneX, curveStep, line } from 'd3-shape';
import 'd3-transition';

import type { NgeLineDataPoint, NgeLineLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeLineLayerTheme, ResolvedNgeLineLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';

import { mergeLineLayerTheme } from '../../core/theme';

/**
 * Get y position for a data point using the appropriate y-scale.
 * Uses y2 scale when useSecondaryAxis is true, otherwise uses primary y scale.
 */
function getYPosition(
  y: number,
  scales: { y: unknown; y2?: unknown },
  useSecondaryAxis?: boolean
): number {
  const scale = useSecondaryAxis && scales.y2 ? scales.y2 : scales.y;
  const yScale = scale as ScaleLinear<number, number>;
  return yScale(y) ?? 0;
}

/**
 * Internal representation of a series for rendering
 */
interface LineSeries {
  color: string;
  id: string;
  points: NgeLineDataPoint[];
}

/**
 * Render line layer into the provided bounds with theme support.
 * Supports single and multi-series lines via hybrid seriesId detection.
 */
export function renderLineLayer(
  context: NgeChartLayerContext<
    NgeLineDataPoint,
    NgeLineLayerConfig,
    NgeLineLayerTheme | undefined
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
  const mergedTheme = mergeLineLayerTheme(theme);

  // Group data by series
  const seriesArray = groupBySeries(data, config, mergedTheme);

  // Get curve factory
  const curveFactory = getCurveFactory(config.curveType);

  // Interrupt any running transitions
  bounds.selectAll('.nge-line-series').interrupt();

  // Render each series
  renderSeries(bounds, seriesArray, {
    config,
    curveFactory,
    dimensions,
    margins,
    mergedTheme,
    scales,
    tooltipConfig,
    tooltipHandlers,
    useSecondaryAxis: config.useSecondaryAxis,
  });
}

/**
 * Group data points by seriesId.
 * Points without seriesId are grouped into '__default__' series.
 */
function groupBySeries(
  data: NgeLineDataPoint[],
  config: NgeLineLayerConfig,
  theme: ResolvedNgeLineLayerTheme
): LineSeries[] {
  const seriesMap = new Map<string, NgeLineDataPoint[]>();

  for (const point of data) {
    const seriesId = point.seriesId ?? '__default__';
    if (!seriesMap.has(seriesId)) {
      seriesMap.set(seriesId, []);
    }
    seriesMap.get(seriesId)!.push(point);
  }

  // Sort points within each series by x value (only for numeric/date x-values)
  // For string/categorical x-values, preserve the original data order
  for (const [, points] of seriesMap) {
    if (points.length > 0) {
      const firstX = points[0].x;
      // Only sort if x values are dates or numbers
      if (firstX instanceof Date) {
        points.sort((a, b) => (a.x as Date).getTime() - (b.x as Date).getTime());
      } else if (typeof firstX === 'number') {
        points.sort((a, b) => (a.x as number) - (b.x as number));
      }
      // For string x-values, don't sort - preserve original order
    }
  }

  // Convert to array with colors
  const seriesColors = config.seriesColors ?? theme.line.colors;
  const seriesArray: LineSeries[] = [];
  let index = 0;

  for (const [id, points] of seriesMap) {
    const color = seriesColors[index % seriesColors.length];
    seriesArray.push({ color, id, points });
    index++;
  }

  return seriesArray;
}

/**
 * Get the D3 curve factory for the specified curve type
 */
function getCurveFactory(curveType?: 'linear' | 'monotone' | 'step') {
  switch (curveType) {
    case 'monotone':
      return curveMonotoneX;
    case 'step':
      return curveStep;
    case 'linear':
    default:
      return curveLinear;
  }
}

interface RenderSeriesParams {
  config: NgeLineLayerConfig;
  curveFactory: typeof curveLinear;
  dimensions: NgeChartLayerContext<any, any, any>['dimensions'];
  margins: { bottom: number; left: number; right: number; top: number };
  mergedTheme: ResolvedNgeLineLayerTheme;
  scales: NgeChartLayerContext<any, any, any>['scales'];
  tooltipConfig?: NgeTooltipConfig<NgeLineDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
  /** Use secondary Y axis (y2) for positioning */
  useSecondaryAxis?: boolean;
}

/**
 * Render all series with D3 join pattern
 */
function renderSeries(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  seriesArray: LineSeries[],
  params: RenderSeriesParams
): void {
  const { config } = params;

  // D3 join pattern for series groups
  const seriesGroups = bounds
    .selectAll<SVGGElement, LineSeries>('.nge-line-series')
    .data(seriesArray, d => d.id);

  // Enter
  const enterGroups = seriesGroups
    .enter()
    .append('g')
    .attr('class', 'nge-line-series')
    .attr('data-series-id', d => d.id);

  // Render area, line, and points for each entering group
  enterGroups.each(function (this: SVGGElement, series) {
    const group = select<SVGGElement, LineSeries>(this);

    // Area (if enabled)
    if (config.showArea) {
      renderArea(group, series, params);
    }

    // Line path
    renderLinePath(group, series, params);

    // Points (if enabled)
    if (config.showPoints) {
      renderPoints(group, series, params);
    }
  });

  // Update
  seriesGroups.each(function (this: SVGGElement, series) {
    const group = select<SVGGElement, LineSeries>(this);

    // Update area
    if (config.showArea) {
      renderArea(group, series, params);
    } else {
      group.select('.nge-line-area').remove();
    }

    // Update line
    renderLinePath(group, series, params);

    // Update points
    if (config.showPoints) {
      renderPoints(group, series, params);
    } else {
      group.selectAll('.nge-line-point').remove();
    }
  });

  // Exit
  seriesGroups.exit().transition().duration(200).style('opacity', 0).remove();
}

/**
 * Render the area under a line
 */
function renderArea(
  group: Selection<SVGGElement, LineSeries, null, undefined>,
  series: LineSeries,
  params: RenderSeriesParams
): void {
  const { config, curveFactory, dimensions, mergedTheme, scales, useSecondaryAxis } = params;

  const areaGenerator = area<NgeLineDataPoint>()
    .x(d => getXPosition(d, scales))
    .y0(dimensions.boundedHeight)
    .y1(d => getYPosition(d.y, scales, useSecondaryAxis))
    .curve(curveFactory);

  let areaPath = group.select<SVGPathElement>('.nge-line-area');

  if (areaPath.empty()) {
    areaPath = group
      .insert('path', ':first-child')
      .classed('nge-line-area', true)
      .style('pointer-events', 'none');
  }

  const areaOpacity = config.areaOpacity ?? mergedTheme.area.fillOpacity;
  const areaColor = series.color;

  areaPath
    .style('fill', areaColor)
    .style('fill-opacity', areaOpacity)
    .transition()
    .duration(300)
    .attr('d', areaGenerator(series.points));
}

/**
 * Render the line path
 */
function renderLinePath(
  group: Selection<SVGGElement, LineSeries, null, undefined>,
  series: LineSeries,
  params: RenderSeriesParams
): void {
  const { config, curveFactory, mergedTheme, scales, useSecondaryAxis } = params;

  const lineGenerator = line<NgeLineDataPoint>()
    .x(d => getXPosition(d, scales))
    .y(d => getYPosition(d.y, scales, useSecondaryAxis))
    .curve(curveFactory);

  let linePath = group.select<SVGPathElement>('.nge-line-path');

  if (linePath.empty()) {
    linePath = group
      .append('path')
      .classed('nge-line-path', true)
      .style('fill', 'none')
      .style('pointer-events', 'none');
  }

  const lineWidth = config.lineWidth ?? mergedTheme.line.width;

  linePath
    .style('stroke', series.color)
    .style('stroke-width', `${lineWidth}px`)
    .style('stroke-dasharray', mergedTheme.line.dash || 'none')
    .transition()
    .duration(300)
    .attr('d', lineGenerator(series.points));
}

/**
 * Render data points on the line
 */
function renderPoints(
  group: Selection<SVGGElement, LineSeries, null, undefined>,
  series: LineSeries,
  params: RenderSeriesParams
): void {
  const { config, margins, mergedTheme, scales, tooltipConfig, tooltipHandlers, useSecondaryAxis } =
    params;

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;
  const pointRadius = config.pointRadius ?? mergedTheme.point.radius;
  const hoverRadius = mergedTheme.point.hoverRadius;

  // D3 join pattern for points
  const points = group
    .selectAll<SVGCircleElement, NgeLineDataPoint>('.nge-line-point')
    .data(series.points, d => String(d.x));

  // Enter
  const enterPoints = points
    .enter()
    .append('circle')
    .classed('nge-line-point', true)
    .attr('cx', d => getXPosition(d, scales))
    .attr('cy', d => getYPosition(d.y, scales, useSecondaryAxis))
    .attr('r', 0)
    .style('fill', d => d.color ?? mergedTheme.point.color)
    .style('stroke', series.color)
    .style('stroke-width', `${mergedTheme.point.strokeWidth}px`)
    .style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Animate enter
  enterPoints.transition().duration(300).attr('r', pointRadius);

  // Update
  points
    .style('fill', d => d.color ?? mergedTheme.point.color)
    .style('stroke', series.color)
    .style('stroke-width', `${mergedTheme.point.strokeWidth}px`)
    .transition()
    .duration(300)
    .attr('cx', d => getXPosition(d, scales))
    .attr('cy', d => getYPosition(d.y, scales, useSecondaryAxis))
    .attr('r', pointRadius);

  // Exit
  points.exit().transition().duration(200).attr('r', 0).remove();

  // Merge for event handlers
  const allPoints = enterPoints.merge(points);

  // Hover handlers
  allPoints
    .on('mouseenter', function (event: PointerEvent, d: NgeLineDataPoint) {
      select(this).transition().duration(150).attr('r', hoverRadius);

      if (tooltipEnabled && tooltipConfig) {
        const tooltipEvent = computeTooltipEvent(
          d,
          series,
          scales,
          margins,
          tooltipConfig,
          useSecondaryAxis
        );
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      }
    })
    .on('mouseleave', function () {
      select(this).transition().duration(150).attr('r', pointRadius);

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

  // Click handler
  if (config.onClick) {
    allPoints.on('click', function (event: PointerEvent, d: NgeLineDataPoint) {
      const index = series.points.indexOf(d);
      config.onClick!({ data: d, event, index });
    });
  }
}

/**
 * Get x position for a data point, handling different x value types.
 * Works with point scales (line charts), band scales (bar charts), linear, and time scales.
 */
function getXPosition(d: NgeLineDataPoint, scales: any): number {
  // Point scales, linear scales, and time scales return exact positions
  // Band scales need centering, but line charts use point scales by default
  if (typeof d.x === 'string' && scales.x.bandwidth) {
    // Band scale (legacy support) - center on the band
    return (scales.x(d.x) ?? 0) + scales.x.bandwidth() / 2;
  }
  // Point scale, linear scale, or time scale - returns exact position
  return scales.x(d.x) ?? 0;
}

/**
 * Compute tooltip event for a data point
 */
function computeTooltipEvent(
  d: NgeLineDataPoint,
  series: LineSeries,
  scales: any,
  margins: { bottom: number; left: number; right: number; top: number },
  tooltipConfig: NgeTooltipConfig<NgeLineDataPoint>,
  useSecondaryAxis?: boolean
): NgeTooltipEvent | null {
  if (!tooltipConfig.formatContent) return null;

  const pointX = getXPosition(d, scales);
  const pointY = getYPosition(d.y, scales, useSecondaryAxis);

  const tooltipWidth = tooltipConfig.width ?? 120;
  const tooltipHeight = tooltipConfig.height ?? 65;

  // X position: centered on point
  const tooltipX = pointX + margins.left - tooltipWidth / 2;

  // Y position: above the point by default
  const tooltipY = pointY + margins.top - tooltipHeight - 12;

  // Divot position (points at the element)
  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const divotX = (tooltipWidth - divotWidth) / 2;

  // Format content using provided formatter
  const content = tooltipConfig.formatContent(d);

  // Merge series/point color as border color with existing style
  const pointColor = d.color ?? series.color;
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
