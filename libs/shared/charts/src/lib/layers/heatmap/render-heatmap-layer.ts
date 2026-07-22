import type { ScaleBand } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { hcl } from 'd3-color';
import { interpolateHcl } from 'd3-interpolate';
import { scaleLinear, scaleSequential, scaleSqrt } from 'd3-scale';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeHeatmapDataPoint, NgeHeatmapLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeHeatmapLayerTheme, ResolvedNgeHeatmapLayerTheme } from '../../core/theme';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipEvent,
  NgeTooltipHandlers,
} from '../../core/tooltip';

import { mergeHeatmapLayerTheme } from '../../core/theme';
import {
  computeHeatmapValueDomain,
  HEATMAP_SCHEME_INTERPOLATORS,
} from '../../nge-chart/nge-chart.heatmap.helpers';

/** Every mark class the layer owns — used for the empty-data stale sweep + interrupt. */
const HEATMAP_SELECTOR = '.nge-heatmap-cell, .nge-heatmap-bubble, .nge-heatmap-label';

/** Bubble max radius as a fraction of half the smaller band step when unset. */
const DEFAULT_BUBBLE_MAX_RATIO = 0.9;

/** Fallback tooltip bubble height (px) when the config omits one. */
const TOOLTIP_HEIGHT = 65;

/** Fallback tooltip bubble width (px) when the config omits one. */
const TOOLTIP_WIDTH = 120;

/**
 * Concrete fallbacks for the ramp / empty-cell tokens so the in-JS colour
 * interpolation never throws when a `var(--chart-*)` fails to resolve (e.g. under
 * jsdom, where `getComputedStyle` returns '' for a custom property).
 */
const FALLBACK = {
  '--chart-primary': '#1976d2',
  '--chart-surface': '#ffffff',
  '--chart-surface-container-highest': '#e0e0e0',
} as const;

/** Fields common to every interactive (hover/click) mark. */
interface InteractiveMark {
  /** Tooltip anchor X (top-center of the mark, plot space). */
  anchorX: number;
  /** Tooltip anchor Y (top edge of the mark, plot space). */
  anchorY: number;
  /** Pre-resolved tooltip content for this mark. */
  content: NgeTooltipContent;
  /** Source cell datum (click / tooltip payload). */
  datum: NgeHeatmapDataPoint;
  /** Index of the source cell in `config.data`. */
  index: number;
  /** Stable delimiter-safe join key (`row` + unit-separator + `col`). */
  key: string;
}

/** One color-encoded cell `<rect>`, interactive. */
interface HeatmapCellMark extends InteractiveMark {
  fill: string;
  height: number;
  rx: number;
  width: number;
  x: number;
  y: number;
}

/** One size-encoded bubble `<circle>` centered in its cell, interactive. */
interface HeatmapBubbleMark extends InteractiveMark {
  cx: number;
  cy: number;
  fill: string;
  r: number;
}

/** One in-cell value `<text>` label (non-interactive). */
interface HeatmapLabelMark {
  /** Auto-contrast fill: light on dark cells, dark on light cells, for legibility. */
  color: string;
  key: string;
  text: string;
  x: number;
  y: number;
}

/** Params threaded through the render helpers. */
interface HeatmapRenderParams {
  animation: ResolvedNgeChartAnimation;
  /** Maps a non-null cell value to a concrete ramp / scheme colour. */
  colorScale: (value: number) => string;
  config: NgeHeatmapLayerConfig;
  /** Resolved (concrete) fill for empty (`null`-value) cells. */
  emptyColor: string;
  margins: { bottom: number; left: number; right: number; top: number };
  theme: ResolvedNgeHeatmapLayerTheme;
  tooltip?: Partial<NgeTooltipConfig<NgeHeatmapDataPoint>>;
  tooltipHandlers?: NgeTooltipHandlers;
  x: ScaleBand<string>;
  y: ScaleBand<string>;
}

/**
 * Render a heatmap layer into the provided bounds with theme support.
 *
 * Draws a grid of value-encoded cells over a shared band × band scale pair (rows on
 * the y band axis, columns on the x band axis). `mark: 'cell'` (default) draws a
 * colour-encoded `<rect>` grid (**Heat Map**); `mark: 'bubble'` draws a `<circle>`
 * per cell whose radius is sqrt-scaled to the value (**Bubble-based Heat Map**),
 * double-encoded with the same ramp colour. Colour is resolved in-fn from a named
 * `scheme` (d3-scale-chromatic) or the theme token ramp (`rampFrom → rampMid? →
 * rampTo`, interpolated in HCL) — the `var(--chart-*)` endpoints are resolved to
 * concrete colours first (an unresolved `var()` fails silently in a JS
 * interpolator). Cells, bubbles and labels are each their own keyed
 * enter/update/exit join: cells fade in at final geometry, bubbles grow from r = 0,
 * and all three joins run every render so a `mark` toggle exits the inactive mark
 * cleanly. All colour is applied via D3 `.style()` on `--chart-*` tokens.
 */
export function renderHeatmapLayer(
  context: NgeChartLayerContext<
    NgeHeatmapDataPoint,
    NgeHeatmapLayerConfig,
    NgeHeatmapLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, margins, scales, theme, tooltipHandlers } = context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    bounds?.selectAll(HEATMAP_SELECTOR).interrupt().remove();
    return;
  }

  const mergedTheme = mergeHeatmapLayerTheme(theme);
  const x = scales.x as ScaleBand<string>;
  const y = scales.y as ScaleBand<string>;
  const domain = config.domain ?? computeHeatmapValueDomain([config]);
  const node = bounds.node();

  const params: HeatmapRenderParams = {
    animation,
    colorScale: buildColorScale(node, config, mergedTheme, domain),
    config,
    emptyColor: resolveThemeColor(
      node,
      mergedTheme.cell.emptyColor,
      FALLBACK['--chart-surface-container-highest']
    ),
    margins,
    theme: mergedTheme,
    tooltip: config.tooltip,
    tooltipHandlers,
    x,
    y,
  };

  const mark = config.mark ?? 'cell';
  // Build ONLY the active mark's array so the inactive join exits cleanly on a mark
  // toggle (no leaked marks). Labels ride alongside either mark when showValues.
  const cellMarks = mark === 'cell' ? buildCellMarks(data, params) : [];
  const bubbleMarks = mark === 'bubble' ? buildBubbleMarks(data, params) : [];
  const labelMarks = config.showValues ? buildLabelMarks(data, params) : [];

  bounds.selectAll(HEATMAP_SELECTOR).interrupt();

  const cellSel = renderCells(bounds, cellMarks, params);
  const bubbleSel = renderBubbles(bounds, bubbleMarks, params);
  renderLabels(bounds, labelMarks, params);

  attachInteraction(cellSel, params);
  attachInteraction(bubbleSel, params);

  // Labels sit above the marks (re-asserted after any enter-append).
  bounds.selectAll('.nge-heatmap-label').raise();
}

/**
 * Build the value → colour scale. A named `scheme` selects a d3-scale-chromatic
 * sequential interpolator (no token resolution needed). Otherwise the theme token
 * ramp is used: the `rampFrom` / `rampTo` (+ optional `rampMid`) `var(--chart-*)`
 * endpoints are resolved to concrete colours first, then interpolated in HCL across
 * the (clamped) value domain — an unresolved `var()` would fail silently in the JS
 * interpolator.
 */
function buildColorScale(
  node: Element | null,
  config: NgeHeatmapLayerConfig,
  theme: ResolvedNgeHeatmapLayerTheme,
  domain: [number, number]
): (value: number) => string {
  if (config.scheme) {
    const sequential = scaleSequential(HEATMAP_SCHEME_INTERPOLATORS[config.scheme]).domain(domain);
    return (value: number) => sequential(value);
  }

  const from = resolveThemeColor(node, theme.cell.rampFrom, FALLBACK['--chart-surface']);
  const to = resolveThemeColor(node, theme.cell.rampTo, FALLBACK['--chart-primary']);
  const mid = theme.cell.rampMid ? resolveThemeColor(node, theme.cell.rampMid, from) : '';

  const [min, max] = domain;
  const linear = mid
    ? scaleLinear<string>()
        .domain([min, (min + max) / 2, max])
        .range([from, mid, to])
    : scaleLinear<string>().domain([min, max]).range([from, to]);
  linear.clamp(true).interpolate(interpolateHcl);

  return (value: number) => linear(value);
}

/**
 * Resolve a `var(--chart-*)` token to a concrete colour by reading the custom
 * property off `node` (custom props inherit across the shadow boundary), falling
 * back to a hard-coded hex so the colour maths never throws (e.g. under jsdom, where
 * `getComputedStyle` returns '' for a custom property). A concrete colour or an
 * empty string passes through untouched.
 */
function resolveThemeColor(node: Element | null, value: string, fallback: string): string {
  if (!value) {
    return fallback;
  }
  const match = /^var\(\s*(--[\w-]+)\s*(?:,[^)]*)?\)$/.exec(value.trim());
  if (!match) {
    return value;
  }
  if (node && typeof getComputedStyle === 'function') {
    const resolved = getComputedStyle(node).getPropertyValue(match[1]).trim();
    if (resolved) {
      return resolved;
    }
  }
  return (FALLBACK as Record<string, string>)[match[1]] ?? fallback;
}

/**
 * Perceptual-lightness threshold (CIE Lab L*, 0–100): a cell fill below this reads as
 * "dark", so its value label flips to the light-on-dark color to stay legible.
 */
const LABEL_DARK_CELL_LIGHTNESS = 60;

/**
 * Pick a legible value-label color for a cell fill — the light-on-dark color when the
 * fill is perceptually dark (Lab L* < threshold), else the default label color. An
 * unparseable fill (e.g. an unresolved `var()` per-cell override) keeps the default.
 */
function labelColorForFill(fill: string, theme: ResolvedNgeHeatmapLayerTheme): string {
  const lightness = hcl(fill).l;
  return Number.isFinite(lightness) && lightness < LABEL_DARK_CELL_LIGHTNESS
    ? theme.label.colorOnDark
    : theme.label.color;
}

/**
 * Resolve every cell (row × column) to its rect geometry + fill. Empty cells
 * (`value === null`) take the resolved `emptyColor`; a per-cell `color` overrides
 * the ramp / empty fill.
 */
function buildCellMarks(
  data: NgeHeatmapDataPoint[],
  params: HeatmapRenderParams
): HeatmapCellMark[] {
  const { colorScale, emptyColor, theme, tooltip, x, y } = params;
  const width = x.bandwidth();
  const height = y.bandwidth();

  const marks: HeatmapCellMark[] = [];
  data.forEach((datum, index) => {
    const cellX = x(datum.col);
    const cellY = y(datum.row);
    if (cellX === undefined || cellY === undefined) {
      return;
    }
    const fill = datum.color || (datum.value === null ? emptyColor : colorScale(datum.value));
    marks.push({
      anchorX: cellX + width / 2,
      anchorY: cellY,
      content: cellContent(datum, tooltip),
      datum,
      fill,
      height,
      index,
      key: cellKey(datum),
      rx: theme.cell.radius,
      width,
      x: cellX,
      y: cellY,
    });
  });

  return marks;
}

/**
 * Resolve every non-null cell to a bubble centered in its cell, with radius
 * sqrt-scaled from `|value|` to `bubbleMaxRatio · min(bandwidth) / 2`. Empty cells
 * are omitted. Bubble fill: per-cell `color` → the fixed theme `bubble.color` →
 * the ramp colour for the value (double-encoding).
 */
function buildBubbleMarks(
  data: NgeHeatmapDataPoint[],
  params: HeatmapRenderParams
): HeatmapBubbleMark[] {
  const { colorScale, config, theme, tooltip, x, y } = params;
  const width = x.bandwidth();
  const height = y.bandwidth();
  const maxRadius =
    ((config.bubbleMaxRatio ?? DEFAULT_BUBBLE_MAX_RATIO) * Math.min(width, height)) / 2;

  let maxAbs = 0;
  for (const datum of data) {
    if (datum.value !== null) {
      maxAbs = Math.max(maxAbs, Math.abs(datum.value));
    }
  }
  const radiusScale = scaleSqrt()
    .domain([0, maxAbs > 0 ? maxAbs : 1])
    .range([0, maxRadius]);

  const marks: HeatmapBubbleMark[] = [];
  data.forEach((datum, index) => {
    if (datum.value === null) {
      return;
    }
    const cellX = x(datum.col);
    const cellY = y(datum.row);
    if (cellX === undefined || cellY === undefined) {
      return;
    }
    const cx = cellX + width / 2;
    const cy = cellY + height / 2;
    const r = radiusScale(Math.abs(datum.value));
    marks.push({
      anchorX: cx,
      anchorY: cy - r,
      content: cellContent(datum, tooltip),
      cx,
      cy,
      datum,
      fill: datum.color || theme.bubble.color || colorScale(datum.value),
      index,
      key: cellKey(datum),
      r,
    });
  });

  return marks;
}

/**
 * Resolve the in-cell value labels (when `showValues`). Each label reads `d.label`
 * or the `labelFormat`ted value (default `String(value)`), centered in its cell.
 * Cells with no value and no explicit label are skipped.
 */
function buildLabelMarks(
  data: NgeHeatmapDataPoint[],
  params: HeatmapRenderParams
): HeatmapLabelMark[] {
  const { colorScale, config, emptyColor, theme, x, y } = params;
  const width = x.bandwidth();
  const height = y.bandwidth();
  const format = config.labelFormat ?? ((value: number) => String(value));

  const marks: HeatmapLabelMark[] = [];
  for (const datum of data) {
    const text = datum.label ?? (datum.value !== null ? format(datum.value) : '');
    if (!text) {
      continue;
    }
    const cellX = x(datum.col);
    const cellY = y(datum.row);
    if (cellX === undefined || cellY === undefined) {
      continue;
    }
    const fill = datum.color || (datum.value === null ? emptyColor : colorScale(datum.value));
    marks.push({
      color: labelColorForFill(fill, theme),
      key: cellKey(datum),
      text,
      x: cellX + width / 2,
      y: cellY + height / 2,
    });
  }

  return marks;
}

/**
 * Delimiter-safe composite join key — `row` + `col` joined by an ASCII Unit
 * Separator (U+001F) rather than a space, so the keyed enter/update/exit join keeps
 * a stable identity for multi-word labels (`"North America"`) and never conflates
 * two genuinely distinct (row, col) pairs (a space separator would collide, e.g.
 * `("A B", "C")` vs `("A", "B C")`). The separator cannot appear in rendered text.
 */
function cellKey(datum: NgeHeatmapDataPoint): string {
  return `${datum.row}${datum.col}`;
}

/** Tooltip content for a cell — the custom formatter, else `row · col` / value. */
function cellContent(
  datum: NgeHeatmapDataPoint,
  tooltip?: Partial<NgeTooltipConfig<NgeHeatmapDataPoint>>
): NgeTooltipContent {
  return (
    tooltip?.formatContent?.(datum) ?? {
      label: `${datum.row} · ${datum.col}`,
      value: datum.value ?? 0,
    }
  );
}

/**
 * Join the cell rects (keyed by the delimiter-safe row/col key), returning the
 * merged selection. Cells take their final geometry synchronously (smear-free first
 * paint) and fade in on enter; fill/stroke are applied synchronously so specs read
 * them without flushing. Survivor opacity is re-asserted so a mark stranded mid-exit
 * by a rapid re-toggle recovers to full.
 */
function renderCells(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: HeatmapCellMark[],
  params: HeatmapRenderParams
): Selection<SVGRectElement, HeatmapCellMark, SVGGElement, unknown> {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGRectElement, HeatmapCellMark>('.nge-heatmap-cell')
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
    .classed('nge-heatmap-cell', true)
    .style('opacity', 0)
    .style('fill', d => d.fill)
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.width)
    .attr('height', d => d.height)
    .attr('rx', d => d.rx)
    .attr('ry', d => d.rx);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update survivors: animate geometry AND re-assert opacity → 1 — but via the
  // transition, NEVER a synchronous `sel.style('opacity', 1)`. A synchronous set runs
  // before the entering marks' `opacity-fade` tween captures its start value, so the
  // fade collapses to 1 → 1 (no visible fade-in — the very bug this replaces). Driven
  // on the update selection, the opacity tween also recovers a cell stranded mid-exit
  // by a rapid mark re-toggle (the top-of-render null-named `.interrupt()` freezes the
  // unnamed exit fade) and continues an interrupted enter fade.
  // Recolor survivors on the update transition too: a heatmap cell's fill ENCODES its
  // value, so on a data change (e.g. Randomize) the fill must interpolate old → new
  // over updateMs, not snap. (Set synchronously on enter above so a new cell is born
  // with its colour; a value-only change keeps the same keys, so every cell is a
  // survivor and this transition is the only thing that animates.)
  sel
    .transition('cell-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1)
    .style('fill', d => d.fill)
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.width)
    .attr('height', d => d.height);

  const merged = enter.merge(sel);
  merged
    .attr('data-col', d => d.datum.col)
    .attr('data-row', d => d.datum.row)
    .attr('rx', d => d.rx)
    .attr('ry', d => d.rx)
    .style('fill-opacity', theme.cell.opacity)
    .style('stroke', theme.cell.stroke)
    .style('stroke-width', `${theme.cell.strokeWidth}px`);

  return merged;
}

/**
 * Join the bubble circles (keyed by the delimiter-safe row/col key), returning the
 * merged selection. Centres are set synchronously; the radius grows from 0 on enter.
 * Fill/stroke are applied synchronously so specs read them without flushing. Survivor
 * opacity is re-asserted so a mark stranded mid-exit by a rapid re-toggle recovers.
 */
function renderBubbles(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: HeatmapBubbleMark[],
  params: HeatmapRenderParams
): Selection<SVGCircleElement, HeatmapBubbleMark, SVGGElement, unknown> {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGCircleElement, HeatmapBubbleMark>('.nge-heatmap-bubble')
    .data(marks, d => d.key);

  sel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .attr('r', 0)
    .style('opacity', 0)
    .remove();

  const enter = sel
    .enter()
    .append('circle')
    .classed('nge-heatmap-bubble', true)
    .style('fill', d => d.fill)
    .attr('cx', d => d.cx)
    .attr('cy', d => d.cy)
    .attr('r', 0);

  enter
    .transition('bubble-grow')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .attr('r', d => d.r);

  // Update survivors: animate centre + radius AND re-assert opacity → 1 via the
  // transition (never a synchronous set) so a bubble stranded mid-exit-fade by a rapid
  // mark re-toggle recovers to full opacity without pre-empting any entering grow.
  // Recolor + resize survivors on the update transition (fill encodes the value, so a
  // data change must interpolate old → new over updateMs, not snap). Fill is set
  // synchronously on enter above so a new bubble grows in with its colour.
  sel
    .transition('bubble-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1)
    .style('fill', d => d.fill)
    .attr('cx', d => d.cx)
    .attr('cy', d => d.cy)
    .attr('r', d => d.r);

  const merged = enter.merge(sel);
  merged
    .attr('data-col', d => d.datum.col)
    .attr('data-row', d => d.datum.row)
    .style('fill-opacity', theme.bubble.opacity)
    .style('stroke', theme.bubble.stroke)
    .style('stroke-width', `${theme.bubble.strokeWidth}px`);

  return merged;
}

/**
 * Join the value labels (keyed by the delimiter-safe row/col key). Text is set
 * synchronously (so specs read it without flushing); labels are non-interactive and
 * fade in on enter. Survivor opacity is re-asserted so a label stranded mid-exit by
 * a rapid re-toggle recovers to full.
 */
function renderLabels(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: HeatmapLabelMark[],
  params: HeatmapRenderParams
): void {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGTextElement, HeatmapLabelMark>('.nge-heatmap-label')
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
    .append('text')
    .classed('nge-heatmap-label', true)
    .style('dominant-baseline', 'central')
    .style('opacity', 0)
    .style('pointer-events', 'none')
    .style('text-anchor', 'middle')
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .text(d => d.text);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update survivors: animate position AND re-assert opacity → 1 via the transition
  // (never a synchronous set, which would cancel entering labels' fade-in) so a label
  // stranded mid-exit-fade by a rapid mark re-toggle recovers to full opacity.
  sel
    .transition('label-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1)
    .attr('x', d => d.x)
    .attr('y', d => d.y);

  enter
    .merge(sel)
    .text(d => d.text)
    .style('fill', d => d.color)
    .style('font-size', `${theme.label.fontSize}px`)
    .style('font-weight', `${theme.label.fontWeight}`);
}

/**
 * Wire hover (tooltip) and click handlers on an interactive selection (cell /
 * bubble). The hovered / clicked mark carries its pre-resolved tooltip content +
 * source cell datum for the payload.
 */
function attachInteraction<GElement extends SVGGraphicsElement, T extends InteractiveMark>(
  selection: Selection<GElement, T, SVGGElement, unknown>,
  params: HeatmapRenderParams
): void {
  const { config, tooltip, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltip?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);

  selection.style('cursor', interactive ? 'pointer' : 'default');

  selection
    .on('mouseenter', function (_event: PointerEvent, mark: T) {
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
    selection.on('click', function (event: PointerEvent, mark: T) {
      config.onClick!({ data: mark.datum, event, index: mark.index });
    });
  } else {
    selection.on('click', null);
  }
}

/**
 * Compute a tooltip event for a hovered mark: anchored at the mark's top edge,
 * centered on it, offset by the chart margins.
 */
function buildTooltipEvent(
  mark: InteractiveMark,
  params: HeatmapRenderParams
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
    style: { ...tooltip.style, borderColor: tooltip.style?.borderColor ?? theme.cell.stroke },
    visible: true,
  };
}

/** The hide-tooltip event emitted on mouseleave. */
function hiddenTooltipEvent(
  tooltip?: Partial<NgeTooltipConfig<NgeHeatmapDataPoint>>
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
