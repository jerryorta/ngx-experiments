import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { curveMonotoneX, line } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type {
  NgeHistogramBin,
  NgeHistogramDataPoint,
  NgeHistogramLayerConfig,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeHistogramLayerTheme, ResolvedNgeHistogramLayerTheme } from '../../core/theme';
import type { NgeTooltipConfig, NgeTooltipEvent, NgeTooltipHandlers } from '../../core/tooltip';
import type { HistogramCurvePoint } from '../../nge-chart/nge-chart.histogram.helpers';

import { mergeHistogramLayerTheme } from '../../core/theme';
import { binHistogram, fitExpectedCurve } from '../../nge-chart/nge-chart.histogram.helpers';

/** One resolved bin rect: pixel geometry plus the source bin (tooltip/click payload). */
interface HistogramRect {
  bin: NgeHistogramBin;
  height: number;
  index: number;
  width: number;
  x: number;
  y: number;
}

/** Internal params threaded through the render helpers. */
interface HistogramRenderParams {
  animation: ResolvedNgeChartAnimation;
  config: NgeHistogramLayerConfig;
  margins: { bottom: number; left: number; right: number; top: number };
  mergedTheme: ResolvedNgeHistogramLayerTheme;
  tooltip?: Partial<NgeTooltipConfig<NgeHistogramBin>>;
  tooltipHandlers?: NgeTooltipHandlers;
}

/**
 * Render a histogram layer into the provided bounds with theme support.
 *
 * Raw observations are binned (`d3-array` `bin()`) and one rect is drawn per bin
 * on the shared CONTINUOUS x-scale: `x = xScale(bin.x0)`, width spanning to
 * `xScale(bin.x1)` (less a configurable gap). In the default `'histogram'` mode
 * each bar rises from the zero baseline to its count. In `'rootogram'` mode a
 * normal curve is fit from the sample mean/σ and each bar HANGS from the fitted
 * expected frequency (top at `yScale(expected)`, bottom at
 * `yScale(expected − count)`) so its gap to the axis reads as the fit residual;
 * the fitted curve is drawn as a smooth path IN FRONT of the bars, with a node
 * (dot) sitting on the curve at each bar's top-center, and — when `showZeroLine`
 * is set — a horizontal reference line at y = 0 (the residual baseline). The bars,
 * fitted curve, nodes, zero line and labels all animate on enter / update / exit
 * via `context.animation` — every mark takes its final geometry synchronously
 * (birth, for a testable / smear-free first paint), fades in on enter, and morphs
 * on data update. All color is applied via D3 `.style()` on `--chart-*` tokens.
 */
export function renderHistogramLayer(
  context: NgeChartLayerContext<
    NgeHistogramDataPoint,
    NgeHistogramLayerConfig,
    NgeHistogramLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, scales, theme, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  const values = data.map(point => point.value);
  const { bins } = binHistogram(values, {
    binCount: config.binCount,
    domain: config.domain,
    thresholds: config.thresholds,
  });

  bounds.selectAll('.nge-histogram-bar').interrupt();

  if (bins.length === 0) {
    bounds.selectAll('.nge-histogram-bar').remove();
    bounds.selectAll('.nge-histogram-curve').remove();
    bounds.selectAll('.nge-histogram-label').remove();
    return;
  }

  const mergedTheme = mergeHistogramLayerTheme(theme);
  const xScale = scales.x as ScaleLinear<number, number>;
  const yScale = scales.y as ScaleLinear<number, number>;

  // Rootogram fit — only used when the mode is set AND a normal could be fit.
  const fit =
    (config.mode ?? 'histogram') === 'rootogram'
      ? fitExpectedCurve(values, bins, { xExtent: [bins[0].x0, bins[bins.length - 1].x1] })
      : null;
  const isRootogram = fit !== null && fit.curve.length > 0;
  const expected = isRootogram ? fit!.expected : null;

  const rects = buildHistogramRects(bins, expected, xScale, yScale, config.barGap ?? 1);

  const params: HistogramRenderParams = {
    animation,
    config,
    margins,
    mergedTheme,
    tooltip: config.tooltip,
    tooltipHandlers,
  };

  // Draw order (back → front): bars, the zero reference line, the fitted curve,
  // its nodes, then labels. The `.raise()` sweep re-asserts that stack AFTER any
  // bar enter-append (e.g. a higher `binCount`) so the overlays always sit IN
  // FRONT of the bars, not behind newly-added rects appended to the group's end.
  const showZeroLine = isRootogram && (config.showZeroLine ?? false);
  renderBars(bounds, rects, params);
  renderZeroLine(bounds, showZeroLine, dimensions.boundedWidth, yScale, mergedTheme, animation);
  renderCurve(bounds, isRootogram ? fit!.curve : [], xScale, yScale, mergedTheme, animation);
  renderNodes(bounds, isRootogram ? fit!.nodes : [], xScale, yScale, mergedTheme, animation);
  renderLabels(bounds, rects, params);

  bounds.selectAll('.nge-histogram-zero-line').raise();
  bounds.selectAll('.nge-histogram-curve').raise();
  bounds.selectAll('.nge-histogram-node').raise();
  bounds.selectAll('.nge-histogram-label').raise();
}

/**
 * Resolve each bin to pixel geometry. In histogram mode a bar spans
 * `[count, 0]`; in rootogram mode (when `expected` is supplied) it hangs from the
 * fitted expected value down by the observed count. A per-bar gap is carved out
 * symmetrically so adjacent bins read as separate bars.
 */
function buildHistogramRects(
  bins: NgeHistogramBin[],
  expected: null | number[],
  xScale: ScaleLinear<number, number>,
  yScale: ScaleLinear<number, number>,
  barGap: number
): HistogramRect[] {
  const zeroY = yScale(0);

  return bins.map((bin, index) => {
    const left = xScale(bin.x0);
    const right = xScale(bin.x1);
    const rawWidth = Math.max(0, right - left);
    const gap = Math.min(Math.max(0, barGap), rawWidth);

    let topY: number;
    let bottomY: number;
    if (expected) {
      const top = expected[index];
      topY = yScale(top);
      bottomY = yScale(top - bin.count);
    } else {
      topY = yScale(bin.count);
      bottomY = zeroY;
    }

    return {
      bin,
      height: Math.abs(bottomY - topY),
      index,
      width: Math.max(0, rawWidth - gap),
      x: left + gap / 2,
      y: Math.min(topY, bottomY),
    };
  });
}

/**
 * Join one rect per bin (keyed by index). New bins fade in at their final geometry
 * (enter — geometry stays synchronous so first paint is testable / smear-free),
 * survivors transition to their new geometry (update), and removed bins fade out
 * (exit) — all via `context.animation`. Fill / stroke come from the resolved theme
 * via D3 `.style()`.
 */
function renderBars(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  rects: HistogramRect[],
  params: HistogramRenderParams
): void {
  const { animation, config, mergedTheme } = params;
  const barRadius = config.barRadius ?? mergedTheme.bar.radius;

  const bars = bounds
    .selectAll<SVGRectElement, HistogramRect>('.nge-histogram-bar')
    .data(rects, d => d.index);

  // Exit: fade out removed bins.
  bars
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // Enter: new bars are placed at their final geometry (synchronous), then fade in.
  const enterBars = bars
    .enter()
    .append('rect')
    .classed('nge-histogram-bar', true)
    .style('opacity', 0)
    .attr('data-index', d => d.index)
    .attr('rx', barRadius)
    .attr('ry', barRadius)
    .attr('x', d => d.x)
    .attr('width', d => d.width)
    .attr('y', d => d.y)
    .attr('height', d => d.height)
    .style('fill', mergedTheme.bar.color)
    .style('fill-opacity', mergedTheme.bar.opacity)
    .style('stroke', mergedTheme.bar.stroke)
    .style('stroke-width', `${mergedTheme.bar.strokeWidth}px`);

  enterBars
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update: transition surviving bars to their new geometry (theme applied immediately).
  bars
    .attr('data-index', d => d.index)
    .attr('rx', barRadius)
    .attr('ry', barRadius)
    .style('fill', mergedTheme.bar.color)
    .style('fill-opacity', mergedTheme.bar.opacity)
    .style('stroke', mergedTheme.bar.stroke)
    .style('stroke-width', `${mergedTheme.bar.strokeWidth}px`)
    .transition('bar-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', d => d.x)
    .attr('width', d => d.width)
    .attr('y', d => d.y)
    .attr('height', d => d.height);

  const allBars = enterBars.merge(bars);

  attachBarHandlers(allBars, params);
}

/**
 * Draw a horizontal reference line at y = 0 spanning the plot width (rootogram
 * mode) — the residual baseline the hanging bars cross. Passing `show = false`
 * removes any previously drawn line.
 */
function renderZeroLine(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  show: boolean,
  plotWidth: number,
  yScale: ScaleLinear<number, number>,
  mergedTheme: ResolvedNgeHistogramLayerTheme,
  animation: ResolvedNgeChartAnimation
): void {
  const lineData = show ? [yScale(0)] : [];

  const zeroLine = bounds
    .selectAll<SVGLineElement, number>('.nge-histogram-zero-line')
    .data(lineData);

  zeroLine.exit().remove();

  const enter = zeroLine
    .enter()
    .append('line')
    .classed('nge-histogram-zero-line', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x1', 0)
    .attr('x2', plotWidth)
    .attr('y1', y => y)
    .attr('y2', y => y);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  enter
    .merge(zeroLine)
    .attr('x1', 0)
    .attr('x2', plotWidth)
    .style('stroke', mergedTheme.zeroLine.color)
    .style('stroke-width', `${mergedTheme.zeroLine.width}px`)
    .style('stroke-dasharray', mergedTheme.zeroLine.dash || 'none');

  zeroLine
    .transition('zeroline-pos')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('y1', y => y)
    .attr('y2', y => y);
}

/**
 * Draw the fitted expected-frequency curve as a single smooth path (rootogram
 * mode). Passing an empty `curve` removes any previously drawn path.
 */
function renderCurve(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  curve: HistogramCurvePoint[],
  xScale: ScaleLinear<number, number>,
  yScale: ScaleLinear<number, number>,
  mergedTheme: ResolvedNgeHistogramLayerTheme,
  animation: ResolvedNgeChartAnimation
): void {
  const generator = line<HistogramCurvePoint>()
    .x(point => xScale(point.x))
    .y(point => yScale(point.y))
    .curve(curveMonotoneX);
  const pathData = curve.length > 1 ? [generator(curve) ?? ''] : [];

  const path = bounds.selectAll<SVGPathElement, string>('.nge-histogram-curve').data(pathData);

  path.exit().remove();

  const enter = path
    .enter()
    .append('path')
    .classed('nge-histogram-curve', true)
    .style('fill', 'none')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('d', d => d);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  enter
    .merge(path)
    .style('stroke', mergedTheme.curve.color)
    .style('stroke-width', `${mergedTheme.curve.width}px`)
    .style('stroke-dasharray', mergedTheme.curve.dash || 'none');

  path
    .transition('curve-shape')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('d', d => d);
}

/**
 * Draw one node (dot) per bin on the fitted curve, marking each hanging bar's
 * top-center (rootogram mode). Passing an empty `nodes` array — or a themed
 * `node.radius` of 0 — removes any previously drawn nodes.
 */
function renderNodes(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  nodes: HistogramCurvePoint[],
  xScale: ScaleLinear<number, number>,
  yScale: ScaleLinear<number, number>,
  mergedTheme: ResolvedNgeHistogramLayerTheme,
  animation: ResolvedNgeChartAnimation
): void {
  const radius = mergedTheme.node.radius;
  const nodeData = radius > 0 ? nodes : [];

  const dots = bounds
    .selectAll<SVGCircleElement, HistogramCurvePoint>('.nge-histogram-node')
    .data(nodeData, (_point, index) => index);

  dots.exit().remove();

  const enter = dots
    .enter()
    .append('circle')
    .classed('nge-histogram-node', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('cx', point => xScale(point.x))
    .attr('cy', point => yScale(point.y))
    .attr('r', radius);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  enter
    .merge(dots)
    .attr('r', radius)
    .style('fill', mergedTheme.node.color)
    .style('stroke', mergedTheme.node.stroke)
    .style('stroke-width', `${mergedTheme.node.strokeWidth}px`);

  dots
    .transition('node-pos')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('cx', point => xScale(point.x))
    .attr('cy', point => yScale(point.y));
}

/**
 * Render optional per-bin count labels, centered above each bar.
 */
function renderLabels(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  rects: HistogramRect[],
  params: HistogramRenderParams
): void {
  const { animation, config, mergedTheme } = params;
  const labelData = config.showLabels ? rects : [];

  const labels = bounds
    .selectAll<SVGTextElement, HistogramRect>('.nge-histogram-label')
    .data(labelData, d => d.index);

  labels.exit().remove();

  const enter = labels
    .enter()
    .append('text')
    .classed('nge-histogram-label', true)
    .attr('text-anchor', 'middle')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x', d => d.x + d.width / 2)
    .attr('y', d => d.y - 4);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  enter
    .merge(labels)
    .attr('fill', mergedTheme.label.color)
    .attr('font-size', mergedTheme.label.fontSize)
    .attr('font-weight', mergedTheme.label.fontWeight)
    .text(d => String(d.bin.count));

  labels
    .transition('label-pos')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', d => d.x + d.width / 2)
    .attr('y', d => d.y - 4);
}

/**
 * Wire hover (tooltip) and click handlers on the bin rects. The hovered / clicked
 * rect carries its source bin for the tooltip content + click payload.
 */
function attachBarHandlers(
  bars: Selection<SVGRectElement, HistogramRect, SVGGElement, unknown>,
  params: HistogramRenderParams
): void {
  const { config, tooltip, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltip?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);

  bars.style('cursor', interactive ? 'pointer' : 'default');

  bars
    .on('mouseenter', function (_event: PointerEvent, rect: HistogramRect) {
      if (!tooltipEnabled) {
        return;
      }
      const tooltipEvent = computeTooltipEvent(rect, params);
      if (tooltipEvent) {
        tooltipHandlers!.onTooltip(tooltipEvent);
      }
    })
    .on('mouseleave', function () {
      if (tooltipEnabled) {
        tooltipHandlers!.onTooltip({
          content: { label: '', value: '' },
          dimensions: { height: tooltip!.height ?? 65, width: tooltip!.width ?? 120 },
          divotPosition: 'bottom',
          position: { divotX: 0, x: 0, y: 0 },
          visible: false,
        });
      }
    });

  if (config.onClick) {
    bars.on('click', function (event: PointerEvent, rect: HistogramRect) {
      config.onClick!({ data: rect.bin, event, index: rect.index });
    });
  } else {
    bars.on('click', null);
  }
}

/**
 * Compute a tooltip event for a hovered bin: anchored at the bar's top edge,
 * centered on the bar, offset by the chart margins.
 */
function computeTooltipEvent(
  rect: HistogramRect,
  params: HistogramRenderParams
): NgeTooltipEvent | null {
  const { margins, mergedTheme, tooltip } = params;
  if (!tooltip?.formatContent) {
    return null;
  }

  const tooltipWidth = tooltip.width ?? 120;
  const tooltipHeight = tooltip.height ?? 65;

  const barCenter = rect.x + rect.width / 2;
  const tooltipX = barCenter + margins.left - tooltipWidth / 2;
  const tooltipY = rect.y + margins.top - tooltipHeight - 12;

  const divotWidth = tooltip.style?.divotWidth ?? 24;
  const divotX = (tooltipWidth - divotWidth) / 2;

  const content = tooltip.formatContent(rect.bin);
  const mergedStyle = {
    ...tooltip.style,
    borderColor: tooltip.style?.borderColor ?? mergedTheme.bar.color,
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
