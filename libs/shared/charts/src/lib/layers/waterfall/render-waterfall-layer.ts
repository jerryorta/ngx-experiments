import type { ScaleBand, ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeWaterfallDataPoint, NgeWaterfallLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeWaterfallLayerTheme, ResolvedNgeWaterfallLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';
import type { WaterfallBar } from '../../nge-chart/nge-chart.waterfall.helpers';

import { mergeWaterfallLayerTheme } from '../../core/theme';
import { buildWaterfallBars } from '../../nge-chart/nge-chart.waterfall.helpers';

/** Internal params threaded through the render helpers. */
interface WaterfallRenderParams {
  animation: ResolvedNgeChartAnimation;
  bandScale: ScaleBand<string>;
  barRadius: number;
  config: NgeWaterfallLayerConfig;
  /** label → source datum (for colour override, tooltip content, click payload). */
  datumByLabel: Map<string, NgeWaterfallDataPoint>;
  margins: { bottom: number; left: number; right: number; top: number };
  mergedTheme: ResolvedNgeWaterfallLayerTheme;
  tooltipConfig?: NgeTooltipConfig<NgeWaterfallDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
  valueScale: ScaleLinear<number, number>;
}

/**
 * Render a waterfall layer into the provided bounds with theme support.
 *
 * Each datum is one bar. `'delta'` bars float on the running cumulative total
 * (`[start, end]`, colored by rise / fall), `'total'` bars anchor at zero. Thin
 * step connectors bridge consecutive bars at the carried running-total level.
 * Geometry is applied synchronously (so gesture re-renders don't smear and tests
 * read final values); all colour is applied via D3 `.style()` on `--chart-*`
 * tokens (rise / fall default to literal semantic green / red).
 */
export function renderWaterfallLayer(
  context: NgeChartLayerContext<
    NgeWaterfallDataPoint,
    NgeWaterfallLayerConfig,
    NgeWaterfallLayerTheme | undefined
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

  const mergedTheme = mergeWaterfallLayerTheme(theme);
  const { bars } = buildWaterfallBars(data);

  const params: WaterfallRenderParams = {
    animation,
    bandScale: scales.x as ScaleBand<string>,
    barRadius: config.barRadius ?? 0,
    config,
    datumByLabel: buildDatumLookup(data),
    margins,
    mergedTheme,
    tooltipConfig,
    tooltipHandlers,
    valueScale: scales.y as ScaleLinear<number, number>,
  };

  bounds.selectAll('.nge-waterfall-bar').interrupt();

  // Connectors render first (behind the bars); labels last (on top).
  renderConnectors(bounds, bars, params);
  renderBars(bounds, bars, params);
  renderLabels(bounds, bars, params);
}

/**
 * Resolve a bar's fill: a per-datum `color` override, else the config / theme
 * color for its role — `total` for `'total'` bars, `rise` for a non-negative
 * delta, `fall` for a negative delta.
 */
function resolveBarFill(bar: WaterfallBar, params: WaterfallRenderParams): string {
  if (bar.color) {
    return bar.color;
  }
  const { config, mergedTheme } = params;
  if (bar.kind === 'total') {
    return config.totalColor ?? mergedTheme.total.color;
  }
  if (bar.value >= 0) {
    return config.riseColor ?? mergedTheme.rise.color;
  }
  return config.fallColor ?? mergedTheme.fall.color;
}

/**
 * Join one rect per bar (keyed by label). New bars take their geometry synchronously
 * (birth); surviving bars morph to the new geometry on a data update. The value
 * scale maps both `[start, end]` edges, and `min`/`abs` keep it sign-agnostic (bars
 * floating below zero render correctly).
 */
function renderBars(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  bars: WaterfallBar[],
  params: WaterfallRenderParams
): void {
  const { animation, bandScale, barRadius, valueScale } = params;
  const size = bandScale.bandwidth();

  const rects = bounds
    .selectAll<SVGRectElement, WaterfallBar>('.nge-waterfall-bar')
    .data(bars, d => d.label);

  rects
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enterRects = rects
    .enter()
    .append('rect')
    .classed('nge-waterfall-bar', true)
    .style('opacity', 0);

  // Fade entering bars in (geometry below is applied synchronously).
  enterRects
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  const allRects = enterRects
    .merge(rects)
    .attr('data-label', d => d.label)
    .attr('data-kind', d => d.kind)
    .attr('rx', barRadius)
    .attr('ry', barRadius)
    .style('fill', d => resolveBarFill(d, params));

  // Entering bars take their geometry synchronously (birth — so first paint is
  // testable / smear-free); surviving bars morph to the new geometry on a data
  // update over `animation.updateMs`.
  enterRects
    .attr('x', d => bandScale(d.label) ?? 0)
    .attr('width', size)
    .attr('y', d => Math.min(valueScale(d.start), valueScale(d.end)))
    .attr('height', d => Math.abs(valueScale(d.start) - valueScale(d.end)));

  rects
    .transition('bar-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', d => bandScale(d.label) ?? 0)
    .attr('width', size)
    .attr('y', d => Math.min(valueScale(d.start), valueScale(d.end)))
    .attr('height', d => Math.abs(valueScale(d.start) - valueScale(d.end)));

  attachBarHandlers(allRects, params);
}

/**
 * Draw the step connectors as a single d3 path: one horizontal segment per gap,
 * seated at the carried running-total level (`bars[i].end`) between the right
 * edge of bar `i` and the left edge of bar `i + 1`. Disabled via
 * `config.connectors === false`.
 */
function renderConnectors(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  bars: WaterfallBar[],
  params: WaterfallRenderParams
): void {
  const { bandScale, config, mergedTheme, valueScale } = params;
  const enabled = config.connectors !== false && bars.length > 1;
  const pathData = enabled ? [buildConnectorPath(bars, bandScale, valueScale)] : [];

  const path = bounds.selectAll<SVGPathElement, string>('.nge-waterfall-connector').data(pathData);

  path.exit().remove();

  path
    .enter()
    // Insert before the bars so connectors render behind them (appends on the
    // first pass, when no bar rects exist yet).
    .insert('path', '.nge-waterfall-bar')
    .classed('nge-waterfall-connector', true)
    .style('fill', 'none')
    .style('pointer-events', 'none')
    .merge(path)
    .attr('d', d => d)
    .style('stroke', mergedTheme.connector.color)
    .style('stroke-width', `${mergedTheme.connector.width}px`)
    .style('stroke-dasharray', mergedTheme.connector.dash || 'none');
}

/** Build the connector path string (see {@link renderConnectors}). */
function buildConnectorPath(
  bars: WaterfallBar[],
  bandScale: ScaleBand<string>,
  valueScale: ScaleLinear<number, number>
): string {
  const size = bandScale.bandwidth();
  const segments: string[] = [];

  for (let i = 0; i < bars.length - 1; i++) {
    const current = bars[i];
    const next = bars[i + 1];
    const y = valueScale(current.end);
    const xStart = (bandScale(current.label) ?? 0) + size;
    const xEnd = bandScale(next.label) ?? 0;
    segments.push(`M${xStart},${y}L${xEnd},${y}`);
  }

  return segments.join('');
}

/**
 * Render optional per-bar value labels, centered on each bar. Delta bars show
 * their signed `value`; total bars show the running total (`end`).
 */
function renderLabels(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  bars: WaterfallBar[],
  params: WaterfallRenderParams
): void {
  const { bandScale, config, mergedTheme, valueScale } = params;
  const size = bandScale.bandwidth();
  const labelData = config.showLabels ? bars : [];

  const labels = bounds
    .selectAll<SVGTextElement, WaterfallBar>('.nge-waterfall-label')
    .data(labelData, d => d.label);

  labels.exit().remove();

  labels
    .enter()
    .append('text')
    .classed('nge-waterfall-label', true)
    .attr('text-anchor', 'middle')
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'none')
    .merge(labels)
    .attr('x', d => (bandScale(d.label) ?? 0) + size / 2)
    .attr('y', d => (valueScale(d.start) + valueScale(d.end)) / 2)
    .attr('fill', mergedTheme.label.color)
    .attr('font-size', mergedTheme.label.fontSize)
    .attr('font-weight', mergedTheme.label.fontWeight)
    .text(d => (d.kind === 'total' ? String(d.end) : String(d.value)));
}

/**
 * Wire hover (tooltip) and click handlers on the bar rects. The hovered / clicked
 * bar recovers its source datum for the tooltip content + click payload.
 */
function attachBarHandlers(
  rects: Selection<SVGRectElement, WaterfallBar, SVGGElement, unknown>,
  params: WaterfallRenderParams
): void {
  const { config, datumByLabel, tooltipConfig, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);

  rects.style('cursor', interactive ? 'pointer' : 'default');

  rects
    .on('mouseenter', function (_event: PointerEvent, bar: WaterfallBar) {
      if (!tooltipEnabled || !tooltipConfig) {
        return;
      }
      const datum = datumByLabel.get(bar.label);
      if (!datum) {
        return;
      }
      const tooltipEvent = computeTooltipEvent(bar, datum, params);
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
    rects.on('click', function (event: PointerEvent, bar: WaterfallBar) {
      const datum = datumByLabel.get(bar.label);
      if (!datum) {
        return;
      }
      config.onClick!({ data: datum, event, index: config.data.indexOf(datum) });
    });
  } else {
    rects.on('click', null);
  }
}

/**
 * Compute a tooltip event for a hovered bar: anchored at the bar's top edge,
 * centered on the band, offset by the chart margins.
 */
function computeTooltipEvent(
  bar: WaterfallBar,
  datum: NgeWaterfallDataPoint,
  params: WaterfallRenderParams
): NgeTooltipEvent | null {
  const { bandScale, margins, tooltipConfig, valueScale } = params;
  if (!tooltipConfig?.formatContent) {
    return null;
  }

  const size = bandScale.bandwidth();
  const barTop = Math.min(valueScale(bar.start), valueScale(bar.end));
  const bandCenter = (bandScale(bar.label) ?? 0) + size / 2;

  const tooltipWidth = tooltipConfig.width ?? 120;
  const tooltipHeight = tooltipConfig.height ?? 65;

  const tooltipX = bandCenter + margins.left - tooltipWidth / 2;
  const tooltipY = barTop + margins.top - tooltipHeight - 12;

  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const divotX = (tooltipWidth - divotWidth) / 2;

  const content = tooltipConfig.formatContent(datum);
  const barColor = resolveBarFill(bar, params);
  const mergedStyle = {
    ...tooltipConfig.style,
    borderColor: tooltipConfig.style?.borderColor ?? datum.color ?? barColor,
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

/** Index each datum by label so a bar can recover its source datum. */
function buildDatumLookup(data: NgeWaterfallDataPoint[]): Map<string, NgeWaterfallDataPoint> {
  const lookup = new Map<string, NgeWaterfallDataPoint>();
  for (const point of data) {
    lookup.set(point.label, point);
  }
  return lookup;
}
