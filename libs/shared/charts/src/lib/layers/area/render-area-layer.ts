import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { select } from 'd3-selection';
import { area, curveBasis, curveLinear, curveMonotoneX, curveStep, line } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeAreaDataPoint, NgeAreaLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeAreaLayerTheme, ResolvedNgeAreaLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';
import type { AreaBand, AreaSeries } from '../../nge-chart/nge-chart.area.helpers';

import { mergeAreaLayerTheme } from '../../core/theme';
import { buildAreaSeries } from '../../nge-chart/nge-chart.area.helpers';

/** Series bucket key for points that carry no explicit `seriesId`. */
const DEFAULT_SERIES_ID = '__default__';

/** Radius of the invisible per-vertex hover/click targets. */
const AREA_HOVER_RADIUS = 8;

/**
 * A real data vertex (a band segment paired with its source datum). Synthetic
 * zero-fill segments — stacked columns where a series has no point — have no
 * datum and are excluded, so they never trigger a tooltip or click.
 */
interface AreaVertex {
  band: AreaBand;
  datum: NgeAreaDataPoint;
}

/**
 * Render an area layer into the provided bounds with theme support.
 *
 * Supports single-series, multi-series overlaid, stacked (`stackOffset` =
 * `none`/`expand`/`wiggle`/`diverging`), and range bands (points with `y0`).
 * The fill is the primary mark; `showLine` adds a stroke along the top edge and
 * tooltips/clicks are wired through invisible per-vertex targets. All colour and
 * opacity is applied via D3 `.style()` on `--chart-*` tokens.
 */
export function renderAreaLayer(
  context: NgeChartLayerContext<
    NgeAreaDataPoint,
    NgeAreaLayerConfig,
    NgeAreaLayerTheme | undefined
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

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  // Merge theme with defaults.
  const mergedTheme = mergeAreaLayerTheme(theme);

  // Resolve bands (overlaid / stacked / range) via the shared geometry core.
  const built = buildAreaSeries(data, config.stackOffset);

  // Get curve factory.
  const curveFactory = getCurveFactory(config.curveType);

  // Datum lookup per series for tooltip/click resolution.
  const datumLookup = buildDatumLookup(data);

  // Interrupt any running transitions.
  bounds.selectAll('.nge-area-series').interrupt();

  renderSeries(bounds, built.series, {
    animation,
    config,
    curveFactory,
    datumLookup,
    margins,
    mergedTheme,
    scales,
    tooltipConfig,
    tooltipHandlers,
  });
}

interface RenderAreaSeriesParams {
  animation: ResolvedNgeChartAnimation;
  config: NgeAreaLayerConfig;
  curveFactory: typeof curveLinear;
  datumLookup: Map<string, Map<string, NgeAreaDataPoint>>;
  margins: { bottom: number; left: number; right: number; top: number };
  mergedTheme: ResolvedNgeAreaLayerTheme;
  scales: NgeChartLayerContext<any, any, any>['scales'];
  tooltipConfig?: NgeTooltipConfig<NgeAreaDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
}

/**
 * Render all series with the D3 join pattern (enter/update/exit keyed by id).
 */
function renderSeries(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  seriesArray: AreaSeries[],
  params: RenderAreaSeriesParams
): void {
  const { animation, config } = params;

  const seriesGroups = bounds
    .selectAll<SVGGElement, AreaSeries>('.nge-area-series')
    .data(seriesArray, d => d.id);

  // Enter
  const enterGroups = seriesGroups
    .enter()
    .append('g')
    .attr('class', 'nge-area-series')
    .attr('data-series-id', d => d.id)
    .style('opacity', 0);

  enterGroups.each(function (this: SVGGElement, series) {
    const group = select<SVGGElement, AreaSeries>(this);
    renderAreaPath(group, series, params);
    if (config.showLine) {
      renderTopLine(group, series, params);
    }
    renderInteractionPoints(group, series, params);
  });

  // Fade the entering series in (geometry above is applied synchronously).
  enterGroups
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update
  seriesGroups.each(function (this: SVGGElement, series) {
    const group = select<SVGGElement, AreaSeries>(this);
    renderAreaPath(group, series, params);
    if (config.showLine) {
      renderTopLine(group, series, params);
    } else {
      group.select('.nge-area-line').remove();
    }
    renderInteractionPoints(group, series, params);
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
 * Resolve a series' fill/stroke color from the config palette or theme,
 * cycling with modulo so short palettes wrap.
 */
function seriesColorFor(series: AreaSeries, params: RenderAreaSeriesParams): string {
  const palette = params.config.seriesColors ?? params.mergedTheme.fill.colors;
  return palette[series.index % palette.length];
}

/**
 * Render the filled area band for a series (`[y0, y1]` through scales.y). A new
 * path takes its shape synchronously (birth — so first paint is testable /
 * smear-free); an existing path morphs to the new shape on a data update over
 * `animation.updateMs`.
 */
function renderAreaPath(
  group: Selection<SVGGElement, AreaSeries, null, undefined>,
  series: AreaSeries,
  params: RenderAreaSeriesParams
): void {
  const { animation, config, curveFactory, mergedTheme, scales } = params;
  const yScale = scales.y as ScaleLinear<number, number>;

  const areaGenerator = area<AreaBand>()
    .x(d => getXPosition(d.x, scales))
    .y0(d => yScale(d.y0) ?? 0)
    .y1(d => yScale(d.y1) ?? 0)
    .curve(curveFactory);

  const shape = areaGenerator(series.bands);

  let areaPath = group.select<SVGPathElement>('.nge-area-fill');
  const isNew = areaPath.empty();

  if (isNew) {
    areaPath = group
      .insert('path', ':first-child')
      .classed('nge-area-fill', true)
      .style('pointer-events', 'none');
  }

  areaPath
    .style('fill', seriesColorFor(series, params))
    .style('fill-opacity', config.fillOpacity ?? mergedTheme.fill.opacity);

  if (isNew || animation.updateMs <= 0) {
    areaPath.attr('d', shape);
  } else {
    areaPath
      .transition('area-shape')
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('d', shape);
  }
}

/**
 * Render the optional stroke along the top edge (y1) of a series' area.
 */
function renderTopLine(
  group: Selection<SVGGElement, AreaSeries, null, undefined>,
  series: AreaSeries,
  params: RenderAreaSeriesParams
): void {
  const { animation, curveFactory, mergedTheme, scales } = params;
  const yScale = scales.y as ScaleLinear<number, number>;

  const lineGenerator = line<AreaBand>()
    .x(d => getXPosition(d.x, scales))
    .y(d => yScale(d.y1) ?? 0)
    .curve(curveFactory);

  const shape = lineGenerator(series.bands);

  let linePath = group.select<SVGPathElement>('.nge-area-line');
  const isNew = linePath.empty();

  if (isNew) {
    linePath = group
      .append('path')
      .classed('nge-area-line', true)
      .style('fill', 'none')
      .style('pointer-events', 'none');
  }

  linePath
    .style('stroke', seriesColorFor(series, params))
    .style('stroke-width', `${mergedTheme.line.width}px`);

  if (isNew || animation.updateMs <= 0) {
    linePath.attr('d', shape);
  } else {
    linePath
      .transition('line-shape')
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('d', shape);
  }
}

/**
 * Render invisible per-vertex hover/click targets at each real datum, positioned
 * on the band top (y1). These are the tooltip/click surface for the area — the
 * fill itself keeps `pointer-events: none` so stacked bands don't occlude.
 */
function renderInteractionPoints(
  group: Selection<SVGGElement, AreaSeries, null, undefined>,
  series: AreaSeries,
  params: RenderAreaSeriesParams
): void {
  const { config, margins, scales, tooltipConfig, tooltipHandlers } = params;
  const yScale = scales.y as ScaleLinear<number, number>;

  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);

  const lookup = params.datumLookup.get(series.id);
  const vertices: AreaVertex[] = interactive
    ? series.bands
        .map(band => ({ band, datum: lookup?.get(xKeyOf(band.x)) }))
        .filter((v): v is AreaVertex => v.datum !== undefined)
    : [];

  const seriesColor = seriesColorFor(series, params);

  const points = group
    .selectAll<SVGCircleElement, AreaVertex>('.nge-area-point')
    .data(vertices, v => xKeyOf(v.band.x));

  const enterPoints = points
    .enter()
    .append('circle')
    .classed('nge-area-point', true)
    .attr('r', AREA_HOVER_RADIUS)
    .style('fill', 'transparent')
    .style('stroke', 'none');

  points.exit().remove();

  const allPoints = enterPoints.merge(points);

  allPoints
    .attr('cx', v => getXPosition(v.band.x, scales))
    .attr('cy', v => yScale(v.band.y1) ?? 0)
    .style('cursor', interactive ? 'pointer' : 'default');

  // Hover handlers
  allPoints
    .on('mouseenter', function (event: PointerEvent, v: AreaVertex) {
      if (tooltipEnabled && tooltipConfig) {
        const tooltipEvent = computeTooltipEvent(v, seriesColor, scales, margins, tooltipConfig);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
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

  // Click handler
  if (config.onClick) {
    allPoints.on('click', function (event: PointerEvent, v: AreaVertex) {
      config.onClick!({ data: v.datum, event, index: vertices.indexOf(v) });
    });
  }
}

/**
 * Get the D3 curve factory for the specified curve type.
 */
function getCurveFactory(curveType?: 'basis' | 'linear' | 'monotone' | 'step') {
  switch (curveType) {
    case 'basis':
      return curveBasis;
    case 'monotone':
      return curveMonotoneX;
    case 'step':
      return curveStep;
    case 'linear':
    default:
      return curveLinear;
  }
}

/**
 * Get x position for an x value, handling different scale types.
 * Works with point scales, band scales (centered), linear, and time scales.
 */
function getXPosition(x: Date | number | string, scales: any): number {
  if (typeof x === 'string' && scales.x.bandwidth) {
    return (scales.x(x) ?? 0) + scales.x.bandwidth() / 2;
  }
  return scales.x(x) ?? 0;
}

/** Stable string key for an x value (dates keyed by epoch ms). */
function xKeyOf(x: Date | number | string): string {
  return x instanceof Date ? String(x.getTime()) : String(x);
}

/**
 * Index each datum by series id + x key so a band segment can recover its
 * source datum for tooltip content and click payloads.
 */
function buildDatumLookup(data: NgeAreaDataPoint[]): Map<string, Map<string, NgeAreaDataPoint>> {
  const lookup = new Map<string, Map<string, NgeAreaDataPoint>>();

  for (const point of data) {
    const id = point.seriesId ?? DEFAULT_SERIES_ID;
    let inner = lookup.get(id);
    if (!inner) {
      inner = new Map<string, NgeAreaDataPoint>();
      lookup.set(id, inner);
    }
    inner.set(xKeyOf(point.x), point);
  }

  return lookup;
}

/**
 * Compute a tooltip event for a hovered vertex, positioned at the band top.
 */
function computeTooltipEvent(
  vertex: AreaVertex,
  seriesColor: string,
  scales: any,
  margins: { bottom: number; left: number; right: number; top: number },
  tooltipConfig: NgeTooltipConfig<NgeAreaDataPoint>
): NgeTooltipEvent | null {
  if (!tooltipConfig.formatContent) return null;

  const yScale = scales.y as ScaleLinear<number, number>;
  const pointX = getXPosition(vertex.band.x, scales);
  const pointY = yScale(vertex.band.y1) ?? 0;

  const tooltipWidth = tooltipConfig.width ?? 120;
  const tooltipHeight = tooltipConfig.height ?? 65;

  // X position: centered on the vertex.
  const tooltipX = pointX + margins.left - tooltipWidth / 2;

  // Y position: above the band top by default.
  const tooltipY = pointY + margins.top - tooltipHeight - 12;

  // Divot position (points at the element).
  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const divotX = (tooltipWidth - divotWidth) / 2;

  // Format content using the provided formatter.
  const content = tooltipConfig.formatContent(vertex.datum);

  // Merge series/point color as border color with the existing style.
  const pointColor = vertex.datum.color ?? seriesColor;
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
