import type { ScaleBand, ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeFinancialDataPoint, NgeFinancialLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeFinancialLayerTheme, ResolvedNgeFinancialLayerTheme } from '../../core/theme';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipEvent,
  NgeTooltipHandlers,
} from '../../core/tooltip';
import type { KagiSegment, RenkoBrick } from '../../nge-chart/nge-chart.financial.helpers';

import { mergeFinancialLayerTheme } from '../../core/theme';
import { buildKagiSegments, buildRenkoBricks } from '../../nge-chart/nge-chart.financial.helpers';

/** Every sub-mark class the layer owns — used for the empty-data stale sweep + interrupt. */
const FINANCIAL_SELECTOR =
  '.nge-financial-wick, .nge-financial-body, .nge-financial-kagi, ' +
  '.nge-financial-connector, .nge-financial-brick';

/** Candle body width as a fraction of the band bandwidth when unset. */
const DEFAULT_CANDLE_WIDTH = 0.6;

/** Minimum candle body height (px) so a doji (open === close) still shows a line. */
const MIN_BODY_HEIGHT = 1;

/** Fallback tooltip bubble height (px) when the config omits one. */
const TOOLTIP_HEIGHT = 65;

/** Fallback tooltip bubble width (px) when the config omits one. */
const TOOLTIP_WIDTH = 120;

/** Fields common to every interactive (hover/click) mark. */
interface InteractiveMark {
  /** Tooltip anchor X (top-center of the mark, plot space). */
  anchorX: number;
  /** Tooltip anchor Y (top edge of the mark, plot space). */
  anchorY: number;
  /** Pre-resolved tooltip content for this mark. */
  content: NgeTooltipContent;
  /** Source OHLC datum (click / tooltip payload). */
  datum: NgeFinancialDataPoint;
  /** Index of the source datum in `config.data`. */
  index: number;
  /** Stable join key (candle date identity — see {@link candleKey}). */
  key: string;
}

/** One candlestick wick `<line>` (low → high), non-interactive. */
interface WickMark {
  key: string;
  x: number;
  y1: number;
  y2: number;
}

/** One candlestick body `<rect>` (open → close), interactive. */
interface BodyMark extends InteractiveMark {
  height: number;
  /** True when `close >= open` (rising period → up color). */
  up: boolean;
  width: number;
  x: number;
  y: number;
}

/** One kagi vertical segment `<line>`, carrying its own yang / yin style. */
interface KagiMark {
  key: string;
  line: 'yang' | 'yin';
  x: number;
  y1: number;
  y2: number;
}

/** One renko brick `<rect>` (a fixed `brickSize` price band), non-interactive. */
interface BrickMark {
  /** Up brick (up color) vs down brick (down color). */
  direction: 'down' | 'up';
  height: number;
  key: string;
  width: number;
  x: number;
  y: number;
}

/** Params threaded through the render helpers. */
interface FinancialRenderParams {
  animation: ResolvedNgeChartAnimation;
  bandScale: ScaleBand<string>;
  config: NgeFinancialLayerConfig;
  margins: { bottom: number; left: number; right: number; top: number };
  theme: ResolvedNgeFinancialLayerTheme;
  tooltip?: Partial<NgeTooltipConfig<NgeFinancialDataPoint>>;
  tooltipHandlers?: NgeTooltipHandlers;
  valueScale: ScaleLinear<number, number>;
}

/**
 * Render a financial layer into the provided bounds with theme support.
 *
 * One primitive fans out via `config.variant` across three classic price charts,
 * seated on a shared band (sequence) + linear (price) scale pair (price on y).
 * `'candlestick'` (default) draws a thin **wick** (`low`→`high`) plus an OHLC **body**
 * (`open`→`close`, up/down coloured) per period; `'kagi'` folds the `close` series
 * into a reversal-driven zigzag of vertical **kagi** segments (thickness/colour
 * flipping yang↔yin) joined by thin horizontal **connectors**; `'renko'` walks the
 * `close` series emitting fixed-height **bricks** in a diagonal staircase. The kagi /
 * renko geometry comes from the SAME transforms the scale factory uses
 * (`buildKagiSegments` / `buildRenkoBricks`), so marks and axes agree. Every sub-mark
 * is its own FLAT keyed enter/update/exit join — marks take their final geometry
 * synchronously (smear-free first paint), fade in on enter, morph on update, and fade
 * on exit via `context.animation`. All colour is applied via D3 `.style()` (up/down
 * default to literal semantic green / red). Because kagi/renko are DERIVED transforms
 * with no 1:1 source datum, hover/click interaction is wired for candlestick bodies only.
 */
export function renderFinancialLayer(
  context: NgeChartLayerContext<
    NgeFinancialDataPoint,
    NgeFinancialLayerConfig,
    NgeFinancialLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, margins, scales, theme, tooltipHandlers } = context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    bounds?.selectAll(FINANCIAL_SELECTOR).interrupt().remove();
    return;
  }

  const variant = config.variant ?? 'candlestick';
  const params: FinancialRenderParams = {
    animation,
    bandScale: scales.x as ScaleBand<string>,
    config,
    margins,
    theme: mergeFinancialLayerTheme(theme),
    tooltip: config.tooltip,
    tooltipHandlers,
    valueScale: scales.y as ScaleLinear<number, number>,
  };

  // Build ONLY the active variant's mark arrays so the inactive joins exit cleanly on
  // a variant toggle (no leaked marks) — mirrors the heatmap cell/bubble toggle.
  const candles = variant === 'candlestick' ? data : [];
  const wickMarks = candles.map((datum, index) => buildWickMark(datum, index, params));
  const bodyMarks = candles.map((datum, index) => buildBodyMark(datum, index, params));

  const kagiMarks =
    variant === 'kagi'
      ? buildKagiSegments(data, {
          reversal: config.reversalThreshold,
          reversalAsPercent: config.reversalAsPercent,
        }).map(segment => buildKagiMark(segment, params))
      : [];

  const brickMarks =
    variant === 'renko'
      ? buildRenkoBricks(data, { brickSize: config.brickSize }).map(brick =>
          buildBrickMark(brick, params)
        )
      : [];

  bounds.selectAll(FINANCIAL_SELECTOR).interrupt();

  renderConnectors(bounds, kagiMarks, params);
  renderKagi(bounds, kagiMarks, params);
  renderWicks(bounds, wickMarks, params);
  const bodySel = renderBodies(bounds, bodyMarks, params);
  renderBricks(bounds, brickMarks, params);

  attachInteraction(bodySel, params);

  // Draw order (back → front): connectors, kagi verticals; wicks, bodies. The
  // `.raise()` sweep re-asserts that stack AFTER any enter-append.
  bounds.selectAll('.nge-financial-kagi').raise();
  bounds.selectAll('.nge-financial-body').raise();
}

/** The pixel center of a sequence slot on the band axis. */
function bandCenter(index: number, bandScale: ScaleBand<string>): number {
  return (bandScale(String(index)) ?? 0) + bandScale.bandwidth() / 2;
}

/**
 * Stable join identity for a candle: its `date` (a `Date` normalized to epoch ms so
 * the key is stable + unique per period). Keying the wick / body join on this — rather
 * than the slot index — lets the enter/update/exit join track the actual candle across
 * a sliding data window (the dropped candle fades out, the new one fades in) instead of
 * re-morphing every mark by position. Positioning stays by index / band slot.
 */
function candleKey(datum: NgeFinancialDataPoint): string {
  return String(datum.date instanceof Date ? datum.date.getTime() : datum.date);
}

/** Resolve one candlestick wick (a vertical line from `low` up to `high`). */
function buildWickMark(
  datum: NgeFinancialDataPoint,
  index: number,
  params: FinancialRenderParams
): WickMark {
  const { bandScale, valueScale } = params;
  const cx = bandCenter(index, bandScale);
  return { key: candleKey(datum), x: cx, y1: valueScale(datum.high), y2: valueScale(datum.low) };
}

/**
 * Resolve one candlestick body (an `open`→`close` rect centered in the slot). Up
 * (`close >= open`) takes the up color; a doji (`open === close`) keeps a 1px sliver.
 */
function buildBodyMark(
  datum: NgeFinancialDataPoint,
  index: number,
  params: FinancialRenderParams
): BodyMark {
  const { bandScale, config, valueScale } = params;
  const cx = bandCenter(index, bandScale);
  const width = (config.candleWidth ?? DEFAULT_CANDLE_WIDTH) * bandScale.bandwidth();
  const yOpen = valueScale(datum.open);
  const yClose = valueScale(datum.close);
  const top = Math.min(yOpen, yClose);
  return {
    anchorX: cx,
    anchorY: top,
    content: bodyContent(datum, params),
    datum,
    height: Math.max(Math.abs(yOpen - yClose), MIN_BODY_HEIGHT),
    index,
    key: candleKey(datum),
    up: datum.close >= datum.open,
    width,
    x: cx - width / 2,
    y: top,
  };
}

/**
 * Resolve one kagi vertical segment (`priceFrom`→`priceTo`) at its band slot,
 * carrying its yang / yin classification for per-segment thickness + colour.
 */
function buildKagiMark(segment: KagiSegment, params: FinancialRenderParams): KagiMark {
  const { bandScale, valueScale } = params;
  const cx = bandCenter(segment.index, bandScale);
  return {
    key: String(segment.index),
    line: segment.line,
    x: cx,
    y1: valueScale(segment.priceFrom),
    y2: valueScale(segment.priceTo),
  };
}

/** Resolve one renko brick (a `[low, high]` rect filling its band slot). */
function buildBrickMark(brick: RenkoBrick, params: FinancialRenderParams): BrickMark {
  const { bandScale, valueScale } = params;
  const yHigh = valueScale(brick.high);
  const yLow = valueScale(brick.low);
  return {
    direction: brick.direction,
    height: Math.abs(yLow - yHigh),
    key: String(brick.index),
    width: bandScale.bandwidth(),
    x: bandScale(String(brick.index)) ?? 0,
    y: Math.min(yHigh, yLow),
  };
}

/** Tooltip content for a candle — the custom formatter, else its date / close. */
function bodyContent(
  datum: NgeFinancialDataPoint,
  params: FinancialRenderParams
): NgeTooltipContent {
  return (
    params.tooltip?.formatContent?.(datum) ?? {
      label: formatDate(datum.date),
      value: datum.close,
    }
  );
}

/** Render the candlestick date as a short label for the default tooltip. */
function formatDate(date: Date | number | string): string {
  return date instanceof Date ? date.toLocaleDateString() : String(date);
}

/**
 * Join the candlestick wicks (keyed by candle date identity). Wicks take their final
 * geometry synchronously (smear-free first paint) and fade in on enter; geometry
 * morphs over `updateMs`. Stroke is applied synchronously so specs read it verbatim.
 */
function renderWicks(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: WickMark[],
  params: FinancialRenderParams
): void {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGLineElement, WickMark>('.nge-financial-wick')
    .data(marks, d => d.key);

  sel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enter = sel
    .enter()
    .append('line')
    .classed('nge-financial-wick', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x1', d => d.x)
    .attr('x2', d => d.x)
    .attr('y1', d => d.y1)
    .attr('y2', d => d.y2);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  sel
    .transition('wick-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x1', d => d.x)
    .attr('x2', d => d.x)
    .attr('y1', d => d.y1)
    .attr('y2', d => d.y2);

  enter.merge(sel).style('stroke', theme.wick.color).style('stroke-width', `${theme.wick.width}px`);
}

/**
 * Join the candlestick bodies (keyed by candle date identity), returning the merged
 * selection. Bodies take their final geometry synchronously and fade in on enter;
 * geometry morphs over `updateMs`. Fill/stroke resolve up vs down synchronously.
 */
function renderBodies(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: BodyMark[],
  params: FinancialRenderParams
): Selection<SVGRectElement, BodyMark, SVGGElement, unknown> {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGRectElement, BodyMark>('.nge-financial-body')
    .data(marks, d => d.key);

  sel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enter = sel
    .enter()
    .append('rect')
    .classed('nge-financial-body', true)
    .style('opacity', 0)
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.width)
    .attr('height', d => d.height);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  sel
    .transition('body-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.width)
    .attr('height', d => d.height);

  const merged = enter.merge(sel);
  merged
    .attr('data-direction', d => (d.up ? 'up' : 'down'))
    .style('fill', d => (d.up ? theme.up.color : theme.down.color))
    .style('fill-opacity', d => (d.up ? theme.up.fillOpacity : theme.down.fillOpacity))
    .style('stroke', d => (d.up ? theme.up.stroke : theme.down.stroke))
    .style('stroke-width', d => `${d.up ? theme.up.strokeWidth : theme.down.strokeWidth}px`);

  return merged;
}

/**
 * Join the kagi vertical segments (keyed by segment index). Each `<line>` carries its
 * own yang (thick / primary) or yin (thin / error) style; verticals take their final
 * geometry synchronously and fade in on enter, morphing over `updateMs`.
 */
function renderKagi(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: KagiMark[],
  params: FinancialRenderParams
): void {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGLineElement, KagiMark>('.nge-financial-kagi')
    .data(marks, d => d.key);

  sel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enter = sel
    .enter()
    .append('line')
    .classed('nge-financial-kagi', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x1', d => d.x)
    .attr('x2', d => d.x)
    .attr('y1', d => d.y1)
    .attr('y2', d => d.y2);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  sel
    .transition('kagi-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x1', d => d.x)
    .attr('x2', d => d.x)
    .attr('y1', d => d.y1)
    .attr('y2', d => d.y2);

  enter
    .merge(sel)
    .attr('data-line', d => d.line)
    .style('stroke', d => (d.line === 'yang' ? theme.kagi.yangColor : theme.kagi.yinColor))
    .style(
      'stroke-width',
      d => `${d.line === 'yang' ? theme.kagi.yangWidth : theme.kagi.yinWidth}px`
    );
}

/**
 * Draw the kagi horizontal connectors as a single `<path>`: one short segment per
 * turning, bridging the previous vertical's end to the next vertical's start at the
 * shared turning price. Styled thin/neutral with the wick token. Cleared (`[]`) for
 * any non-kagi variant so a variant toggle exits it. Mirrors the waterfall connector.
 */
function renderConnectors(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  segments: KagiMark[],
  params: FinancialRenderParams
): void {
  const { bandScale, theme } = params;
  const pathData = segments.length > 1 ? [buildConnectorPath(segments, bandScale)] : [];

  const path = bounds.selectAll<SVGPathElement, string>('.nge-financial-connector').data(pathData);

  path.exit().remove();

  path
    .enter()
    // Insert before the verticals so connectors render behind them (appends on the
    // first pass, when no kagi lines exist yet).
    .insert('path', '.nge-financial-kagi')
    .classed('nge-financial-connector', true)
    .style('fill', 'none')
    .style('pointer-events', 'none')
    .merge(path)
    .attr('d', d => d)
    .style('stroke', theme.wick.color)
    .style('stroke-width', `${theme.wick.width}px`);
}

/**
 * Build the connector path: for each segment after the first, a horizontal move at the
 * segment's start price (`y1`) from the previous slot center to this segment's center.
 */
function buildConnectorPath(segments: KagiMark[], bandScale: ScaleBand<string>): string {
  const parts: string[] = [];
  for (let j = 1; j < segments.length; j++) {
    const prevX = bandCenter(j - 1, bandScale);
    const currentX = segments[j].x;
    const y = segments[j].y1;
    parts.push(`M${prevX},${y}L${currentX},${y}`);
  }
  return parts.join('');
}

/**
 * Join the renko bricks (keyed by brick index). Bricks take their final geometry
 * synchronously and fade in on enter, morphing over `updateMs`; fill/stroke resolve up
 * vs down synchronously.
 */
function renderBricks(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: BrickMark[],
  params: FinancialRenderParams
): void {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGRectElement, BrickMark>('.nge-financial-brick')
    .data(marks, d => d.key);

  sel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enter = sel
    .enter()
    .append('rect')
    .classed('nge-financial-brick', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.width)
    .attr('height', d => d.height);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  sel
    .transition('brick-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.width)
    .attr('height', d => d.height);

  const up = theme.up;
  const down = theme.down;
  enter
    .merge(sel)
    .attr('data-direction', d => d.direction)
    .style('fill', d => (d.direction === 'up' ? up.color : down.color))
    .style('fill-opacity', d => (d.direction === 'up' ? up.fillOpacity : down.fillOpacity))
    .style('stroke', d => (d.direction === 'up' ? up.stroke : down.stroke))
    .style('stroke-width', d => `${d.direction === 'up' ? up.strokeWidth : down.strokeWidth}px`);
}

/**
 * Wire hover (tooltip) and click handlers on the candlestick bodies. The hovered /
 * clicked body carries its pre-resolved tooltip content + source OHLC datum. Kagi /
 * renko marks are derived (no 1:1 datum) and stay non-interactive.
 */
function attachInteraction(
  selection: Selection<SVGRectElement, BodyMark, SVGGElement, unknown>,
  params: FinancialRenderParams
): void {
  const { config, tooltip, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltip?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);

  selection.style('cursor', interactive ? 'pointer' : 'default');

  selection
    .on('mouseenter', function (_event: PointerEvent, mark: BodyMark) {
      if (!tooltipEnabled) {
        return;
      }
      const event = buildTooltipEvent(mark, params);
      if (event) {
        tooltipHandlers!.onTooltip(event);
      }
    })
    .on('mouseleave', function () {
      if (tooltipEnabled) {
        tooltipHandlers!.onTooltip(hiddenTooltipEvent(tooltip));
      }
    });

  if (config.onClick) {
    selection.on('click', function (event: PointerEvent, mark: BodyMark) {
      config.onClick!({ data: mark.datum, event, index: mark.index });
    });
  } else {
    selection.on('click', null);
  }
}

/**
 * Compute a tooltip event for a hovered candle: anchored at the body's top edge,
 * centered on it, offset by the chart margins.
 */
function buildTooltipEvent(
  mark: InteractiveMark,
  params: FinancialRenderParams
): NgeTooltipEvent | null {
  const { margins, theme, tooltip } = params;
  if (!tooltip) {
    return null;
  }

  const width = tooltip.width ?? TOOLTIP_WIDTH;
  const height = tooltip.height ?? TOOLTIP_HEIGHT;
  const x = mark.anchorX + margins.left - width / 2;
  const y = mark.anchorY + margins.top - height - 12;

  const divotWidth = tooltip.style?.divotWidth ?? 24;
  const divotX = (width - divotWidth) / 2;

  return {
    content: mark.content,
    dimensions: { height, width },
    divotPosition: 'bottom',
    position: { divotX, x, y },
    style: { ...tooltip.style, borderColor: tooltip.style?.borderColor ?? theme.up.color },
    visible: true,
  };
}

/** The hide-tooltip event emitted on mouseleave. */
function hiddenTooltipEvent(
  tooltip?: Partial<NgeTooltipConfig<NgeFinancialDataPoint>>
): NgeTooltipEvent {
  return {
    content: { label: '', value: '' },
    dimensions: {
      height: tooltip?.height ?? TOOLTIP_HEIGHT,
      width: tooltip?.width ?? TOOLTIP_WIDTH,
    },
    divotPosition: 'bottom',
    position: { divotX: 0, x: 0, y: 0 },
    visible: false,
  };
}
