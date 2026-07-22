import type { ScaleBand, ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';
import type { SymbolType } from 'd3-shape';

import { line, symbol, symbolCircle, symbolDiamond, symbolSquare } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeLollipopDataPoint, NgeLollipopLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeLollipopLayerTheme, ResolvedNgeLollipopLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';

import { mergeLollipopLayerTheme } from '../../core/theme';

/** One resolved end marker: a `<path>` glyph at (`cx`, `cy`) for one row's value. */
interface LollipopMarker {
  category: string;
  /** Resolved fill (per-point → series palette → single-series color). */
  fill: string;
  /** Stable join key (`rowIndex:position`). */
  key: string;
  /** `'start'` = primary `value` marker; `'end'` = dumbbell `valueEnd` marker. */
  position: 'end' | 'start';
  /** Index of the source datum in `config.data` (click / tooltip payload index). */
  rowIndex: number;
  /** The value this marker sits at (either `value` or `valueEnd`). */
  value: number;
  /** Pixel center. */
  x: number;
  y: number;
}

/** One resolved stem / dumbbell segment (endpoints in pixel space). */
interface LollipopStem {
  key: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/** One resolved connect (slope) polyline for a series. */
interface LollipopConnect {
  color: string;
  d: string;
  key: string;
}

/** Params threaded through the render helpers. */
interface LollipopRenderParams {
  animation: ResolvedNgeChartAnimation;
  bandScale: ScaleBand<string>;
  config: NgeLollipopLayerConfig;
  /** Marker rows keyed by join key (tooltip / click datum recovery). */
  datumByKey: Map<string, NgeLollipopDataPoint>;
  margins: { bottom: number; left: number; right: number; top: number };
  mergedTheme: ResolvedNgeLollipopLayerTheme;
  radius: number;
  /** The shared marker glyph path string (same for every marker). */
  symbolPath: string;
  tooltipConfig?: NgeTooltipConfig<NgeLollipopDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
  valueScale: ScaleLinear<number, number>;
  /** True when categories sit on the x (band) axis and values run up the y axis. */
  vertical: boolean;
}

/**
 * Render a lollipop layer into the provided bounds with theme support.
 *
 * One primitive — a stem plus an end marker on the shared cartesian scales — fans
 * out into a whole catalog family via config: plain **lollipop**, **dot plot**
 * (`showStem: false`), **dumbbell / span** (per-point `valueEnd`), and **slope**
 * (`connect`). Categories occupy the band axis (x when vertical, y when
 * horizontal); values run up the linear axis. Stems and markers animate on enter
 * (fade in at their final position — geometry stays synchronous so first paint is
 * testable / smear-free) / update (reposition) / exit (fade) via `context.animation`;
 * the connect (slope) lines and labels apply geometry synchronously. All colour is
 * applied via D3 `.style()` on `--chart-*` tokens.
 */
export function renderLollipopLayer(
  context: NgeChartLayerContext<
    NgeLollipopDataPoint,
    NgeLollipopLayerConfig,
    NgeLollipopLayerTheme | undefined
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

  const mergedTheme = mergeLollipopLayerTheme(theme);
  const vertical = (config.orientation ?? 'vertical') === 'vertical';
  const bandScale = (vertical ? scales.x : scales.y) as ScaleBand<string>;
  const valueScale = (vertical ? scales.y : scales.x) as ScaleLinear<number, number>;
  const radius = config.markerSize ?? mergedTheme.marker.radius;

  const params: LollipopRenderParams = {
    animation,
    bandScale,
    config,
    datumByKey: new Map<string, NgeLollipopDataPoint>(),
    margins,
    mergedTheme,
    radius,
    symbolPath: buildSymbolPath(config.shape, radius),
    tooltipConfig,
    tooltipHandlers,
    valueScale,
    vertical,
  };

  const seriesIndexById = buildSeriesIndex(data);
  const markers = buildMarkers(data, params, seriesIndexById);
  const stems = buildStems(data, params);
  const connects = config.connect ? buildConnectPaths(data, params, seriesIndexById) : [];

  for (const marker of markers) {
    params.datumByKey.set(marker.key, data[marker.rowIndex]);
  }

  bounds
    .selectAll(
      '.nge-lollipop-marker, .nge-lollipop-stem, .nge-lollipop-connect, .nge-lollipop-label'
    )
    .interrupt();

  // Back → front: stems, then connect (slope) lines, then markers, then labels.
  renderStems(bounds, stems, params);
  renderConnects(bounds, connects, params);
  const allMarkers = renderMarkers(bounds, markers, params);
  renderLabels(bounds, markers, params);
  attachMarkerHandlers(allMarkers, params);
}

/** Pixel center X for a (category, value) pair, orientation-aware. */
function toX(category: string, value: number, params: LollipopRenderParams): number {
  const { bandScale, valueScale, vertical } = params;
  return vertical ? (bandScale(category) ?? 0) + bandScale.bandwidth() / 2 : valueScale(value);
}

/** Pixel center Y for a (category, value) pair, orientation-aware. */
function toY(category: string, value: number, params: LollipopRenderParams): number {
  const { bandScale, valueScale, vertical } = params;
  return vertical ? valueScale(value) : (bandScale(category) ?? 0) + bandScale.bandwidth() / 2;
}

/** Map each distinct `seriesId` (first-occurrence order) to a palette index. */
function buildSeriesIndex(data: NgeLollipopDataPoint[]): Map<string, number> {
  const index = new Map<string, number>();
  for (const point of data) {
    if (point.seriesId !== undefined && !index.has(point.seriesId)) {
      index.set(point.seriesId, index.size);
    }
  }
  return index;
}

/**
 * Resolve a marker's fill: per-point `color` → `config.seriesColors[i]` → the theme
 * palette (`marker.colors[i % n]`) by `seriesId` index → the single-series
 * `marker.color` (for points with no `seriesId`).
 */
function resolveMarkerFill(
  datum: NgeLollipopDataPoint,
  params: LollipopRenderParams,
  seriesIndexById: Map<string, number>
): string {
  if (datum.color) {
    return datum.color;
  }
  if (datum.seriesId !== undefined) {
    return resolveSeriesColor(datum.seriesId, params, seriesIndexById);
  }
  return params.mergedTheme.marker.color;
}

/** The series colour for a `seriesId`: `config.seriesColors[i]` else the theme palette. */
function resolveSeriesColor(
  seriesId: string,
  params: LollipopRenderParams,
  seriesIndexById: Map<string, number>
): string {
  const { config, mergedTheme } = params;
  const i = seriesIndexById.get(seriesId) ?? 0;
  const palette = mergedTheme.marker.colors;
  return config.seriesColors?.[i] ?? palette[i % palette.length];
}

/**
 * Flatten the data into end markers: one per single-value row, two per dumbbell row
 * (a row carrying `valueEnd`). A row renders as a dumbbell (two markers) only when
 * it carries a `valueEnd` — that per-point value is the sole two-marker switch.
 */
function buildMarkers(
  data: NgeLollipopDataPoint[],
  params: LollipopRenderParams,
  seriesIndexById: Map<string, number>
): LollipopMarker[] {
  const markers: LollipopMarker[] = [];

  data.forEach((datum, rowIndex) => {
    const fill = resolveMarkerFill(datum, params, seriesIndexById);
    markers.push({
      category: datum.category,
      fill,
      key: `${rowIndex}:start`,
      position: 'start',
      rowIndex,
      value: datum.value,
      x: toX(datum.category, datum.value, params),
      y: toY(datum.category, datum.value, params),
    });
    if (datum.valueEnd !== undefined) {
      markers.push({
        category: datum.category,
        fill,
        key: `${rowIndex}:end`,
        position: 'end',
        rowIndex,
        value: datum.valueEnd,
        x: toX(datum.category, datum.valueEnd, params),
        y: toY(datum.category, datum.valueEnd, params),
      });
    }
  });

  return markers;
}

/**
 * Build one stem per row (when `showStem !== false`): a dumbbell row (`valueEnd`)
 * gets a `value ↔ valueEnd` segment; a single-value row gets a `baseline → value`
 * stem.
 */
function buildStems(data: NgeLollipopDataPoint[], params: LollipopRenderParams): LollipopStem[] {
  if (params.config.showStem === false) {
    return [];
  }
  const baseline = params.config.baseline ?? 0;

  return data.map((datum, rowIndex) => {
    const from = datum.valueEnd !== undefined ? datum.valueEnd : baseline;
    return {
      key: String(rowIndex),
      x1: toX(datum.category, from, params),
      x2: toX(datum.category, datum.value, params),
      y1: toY(datum.category, from, params),
      y2: toY(datum.category, datum.value, params),
    };
  });
}

/**
 * Build one polyline per `seriesId` (2+ points), threaded through each point's
 * primary `value` marker in category-position order — the slope-chart connector.
 */
function buildConnectPaths(
  data: NgeLollipopDataPoint[],
  params: LollipopRenderParams,
  seriesIndexById: Map<string, number>
): LollipopConnect[] {
  const bySeries = new Map<string, NgeLollipopDataPoint[]>();
  for (const point of data) {
    if (point.seriesId === undefined) {
      continue;
    }
    const bucket = bySeries.get(point.seriesId) ?? [];
    bucket.push(point);
    bySeries.set(point.seriesId, bucket);
  }

  const { bandScale } = params;
  const pathGen = line<NgeLollipopDataPoint>()
    .x(d => toX(d.category, d.value, params))
    .y(d => toY(d.category, d.value, params));

  const connects: LollipopConnect[] = [];
  for (const [seriesId, points] of bySeries) {
    if (points.length < 2) {
      continue;
    }
    // Order strictly by CATEGORY BAND position — orientation-agnostic (the band
    // scale is the category scale in either orientation). Sorting by `toX` would
    // order by the VALUE position in horizontal orientation, zig-zagging the slope
    // line out of category order for series with 3+ points.
    const ordered = [...points].sort(
      (a, b) => (bandScale(a.category) ?? 0) - (bandScale(b.category) ?? 0)
    );
    const d = pathGen(ordered);
    if (d) {
      connects.push({
        color: resolveSeriesColor(seriesId, params, seriesIndexById),
        d,
        key: seriesId,
      });
    }
  }

  return connects;
}

/** Build the shared marker glyph path (circle / square / diamond) at the origin. */
function buildSymbolPath(shape: NgeLollipopLayerConfig['shape'], radius: number): string {
  const type: SymbolType =
    shape === 'diamond' ? symbolDiamond : shape === 'square' ? symbolSquare : symbolCircle;
  // Size is an AREA; use the circle-equivalent area so `radius` reads consistently.
  return (
    symbol()
      .type(type)
      .size(Math.PI * radius * radius)() ?? ''
  );
}

/** Join the stems / dumbbell segments (kept behind the markers). */
function renderStems(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  stems: LollipopStem[],
  params: LollipopRenderParams
): void {
  const { animation, mergedTheme } = params;

  const lines = bounds
    .selectAll<SVGLineElement, LollipopStem>('.nge-lollipop-stem')
    .data(stems, d => d.key);

  lines
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // Enter: stems are placed at their final endpoints (synchronous), then fade in.
  const enterLines = lines
    .enter()
    .insert('line', '.nge-lollipop-marker')
    .classed('nge-lollipop-stem', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x1', d => d.x1)
    .attr('y1', d => d.y1)
    .attr('x2', d => d.x2)
    .attr('y2', d => d.y2)
    .style('stroke', mergedTheme.stem.color)
    .style('stroke-width', `${mergedTheme.stem.width}px`);

  enterLines
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update: existing stems transition to new endpoints (theme applied immediately).
  lines
    .style('stroke', mergedTheme.stem.color)
    .style('stroke-width', `${mergedTheme.stem.width}px`)
    .transition('stem-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x1', d => d.x1)
    .attr('y1', d => d.y1)
    .attr('x2', d => d.x2)
    .attr('y2', d => d.y2);
}

/** Join the per-series connect (slope) polylines (kept behind the markers). */
function renderConnects(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  connects: LollipopConnect[],
  params: LollipopRenderParams
): void {
  const { mergedTheme } = params;

  const paths = bounds
    .selectAll<SVGPathElement, LollipopConnect>('.nge-lollipop-connect')
    .data(connects, d => d.key);

  paths.exit().remove();

  paths
    .enter()
    .insert('path', '.nge-lollipop-marker')
    .classed('nge-lollipop-connect', true)
    .style('fill', 'none')
    .style('pointer-events', 'none')
    .merge(paths)
    .attr('d', d => d.d)
    .style('stroke', d => d.color)
    .style('stroke-width', `${mergedTheme.stem.width}px`);
}

/** Join the end markers (uniform `<path>` glyphs), returning the merged selection. */
function renderMarkers(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  markers: LollipopMarker[],
  params: LollipopRenderParams
): Selection<SVGPathElement, LollipopMarker, SVGGElement, unknown> {
  const { animation, mergedTheme, symbolPath } = params;

  const paths = bounds
    .selectAll<SVGPathElement, LollipopMarker>('.nge-lollipop-marker')
    .data(markers, d => d.key);

  paths
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // Enter: markers are placed at their resolved position (synchronous), then fade in.
  const enterPaths = paths
    .enter()
    .append('path')
    .classed('nge-lollipop-marker', true)
    .style('opacity', 0)
    .attr('data-category', d => d.category)
    .attr('data-marker', d => d.position)
    .attr('d', symbolPath)
    .attr('transform', d => `translate(${d.x}, ${d.y})`)
    .style('fill', d => d.fill)
    .style('stroke', mergedTheme.marker.strokeColor)
    .style('stroke-width', `${mergedTheme.marker.strokeWidth}px`);

  enterPaths
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update: existing markers transition to their new position (theme applied immediately).
  paths
    .attr('data-category', d => d.category)
    .attr('data-marker', d => d.position)
    .attr('d', symbolPath)
    .style('fill', d => d.fill)
    .style('stroke', mergedTheme.marker.strokeColor)
    .style('stroke-width', `${mergedTheme.marker.strokeWidth}px`)
    .transition('marker-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('transform', d => `translate(${d.x}, ${d.y})`);

  return enterPaths.merge(paths);
}

/** Join optional per-marker value labels, offset off the glyph. */
function renderLabels(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  markers: LollipopMarker[],
  params: LollipopRenderParams
): void {
  const { config, mergedTheme, radius, vertical } = params;
  const labelData = config.showLabels ? markers : [];
  const offset = radius + 6;

  const labels = bounds
    .selectAll<SVGTextElement, LollipopMarker>('.nge-lollipop-label')
    .data(labelData, d => d.key);

  labels.exit().remove();

  labels
    .enter()
    .append('text')
    .classed('nge-lollipop-label', true)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'none')
    .merge(labels)
    .attr('x', d => (vertical ? d.x : d.x + offset))
    .attr('y', d => (vertical ? d.y - offset : d.y))
    .attr('fill', mergedTheme.label.color)
    .attr('font-size', mergedTheme.label.fontSize)
    .attr('font-weight', mergedTheme.label.fontWeight)
    .text(d => String(d.value));
}

/**
 * Wire hover (tooltip) and click handlers on the markers. The hovered / clicked
 * marker recovers its source datum for the tooltip content + click payload.
 */
function attachMarkerHandlers(
  markers: Selection<SVGPathElement, LollipopMarker, SVGGElement, unknown>,
  params: LollipopRenderParams
): void {
  const { config, datumByKey, tooltipConfig, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);

  markers.style('cursor', interactive ? 'pointer' : 'default');

  markers
    .on('mouseenter', function (_event: PointerEvent, marker: LollipopMarker) {
      if (!tooltipEnabled || !tooltipConfig) {
        return;
      }
      const datum = datumByKey.get(marker.key);
      if (!datum) {
        return;
      }
      const tooltipEvent = computeTooltipEvent(marker, datum, params);
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
    markers.on('click', function (event: PointerEvent, marker: LollipopMarker) {
      const datum = datumByKey.get(marker.key);
      if (!datum) {
        return;
      }
      config.onClick!({ data: datum, event, index: marker.rowIndex });
    });
  } else {
    markers.on('click', null);
  }
}

/**
 * Compute a tooltip event for a hovered marker: anchored above the glyph, centered
 * on it, offset by the chart margins.
 */
function computeTooltipEvent(
  marker: LollipopMarker,
  datum: NgeLollipopDataPoint,
  params: LollipopRenderParams
): NgeTooltipEvent | null {
  const { margins, radius, tooltipConfig } = params;
  if (!tooltipConfig?.formatContent) {
    return null;
  }

  const tooltipWidth = tooltipConfig.width ?? 120;
  const tooltipHeight = tooltipConfig.height ?? 65;

  const tooltipX = marker.x + margins.left - tooltipWidth / 2;
  const tooltipY = marker.y - radius + margins.top - tooltipHeight - 12;

  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const divotX = (tooltipWidth - divotWidth) / 2;

  const content = tooltipConfig.formatContent(datum);
  const mergedStyle = {
    ...tooltipConfig.style,
    borderColor: tooltipConfig.style?.borderColor ?? datum.color ?? marker.fill,
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
