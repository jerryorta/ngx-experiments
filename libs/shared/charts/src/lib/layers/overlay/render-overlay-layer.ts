import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { select } from 'd3-selection';
import { area, line } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeOverlayDataPoint, NgeOverlayLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeOverlayLayerTheme, ResolvedNgeOverlayLayerTheme } from '../../core/theme';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipHandlers,
} from '../../core/tooltip';
import type { OverlayBandPoint, OverlayXYPoint } from './overlay-fit.helpers';

import { mergeOverlayLayerTheme } from '../../core/theme';
import { controlLimits, linearFit, loessFit, predictionBands } from './overlay-fit.helpers';

/** Bucket key for overlay points that carry no explicit `seriesId`. */
const DEFAULT_SERIES_ID = '__default__';

/** Fan prediction-interval levels used when the config omits `intervals`. */
const DEFAULT_FAN_INTERVALS = [0.5, 0.8, 0.95];

/** Selects every overlay sub-mark (any mode) for interrupt / teardown. */
const OVERLAY_MARK_SELECTOR = "[class*='nge-overlay']";
/** Selects the per-series trend-line groups (`trendline` mode). */
const TREND_SERIES_SELECTOR = '.nge-overlay-series';
/** Selects the fan prediction-interval bands (`fan` mode). */
const FAN_BAND_SELECTOR = '.nge-overlay-fan-band';
/** Selects the control mean / limit / band / hit marks (`control` mode). */
const CONTROL_MARK_SELECTOR =
  '.nge-overlay-mean, .nge-overlay-limit, .nge-overlay-control-band, .nge-overlay-control-hit';

/**
 * Every NAMED transition this layer starts. The top-of-render interrupt must cancel each
 * by name: an unnamed `selection.interrupt()` only cancels the default (unnamed)
 * transition, so a still-running named fade / morph keeps writing `d` / `y1` / `y2`
 * after a subsequent instant (`updateMs <= 0`) render — smearing the marks behind a
 * zoom / pan transform, violating the "instant renders are smear-free per frame" contract.
 */
const OVERLAY_TRANSITION_NAMES = [
  'overlay-control-band',
  'overlay-fan-fade',
  'overlay-fan-shape',
  'overlay-fit-fade',
  'overlay-fit-shape',
  'overlay-limit-fade',
  'overlay-limit-shape',
  'overlay-mean',
] as const;

/** Extra hit width (px) of the transparent trend-line hover target. */
const TREND_HIT_STROKE_WIDTH = 12;

/** A styled straight rule — the `{ color, dash, width }` shape of every line theme slice. */
type OverlayLineStyle = ResolvedNgeOverlayLayerTheme['meanLine'];

/**
 * The slice of a d3 x-scale the overlay reads: a callable projection plus the optional
 * `invert` / `domain` a CONTINUOUS (linear / time) scale exposes. A categorical band /
 * point scale has neither — which is how the layer detects it and no-ops trend / fan
 * (mirrors the sibling bump layer's `XScaleFn` norm).
 */
type OverlayXScale = ((value: Date | number) => number | undefined) & {
  domain?: () => (Date | number)[];
  invert?: (pixel: number) => Date | number;
};

/** One vertex of a fitted trend line, x already mapped back to a scale input. */
interface OverlayDrawPoint {
  /** Scale-input x (a `Date` for a time scale, else a `number`). */
  sx: Date | number;
  /** Numeric y value. */
  y: number;
}

/** One prediction-interval band (a `fan` level), keyed by its level in the join. */
interface OverlayFanBand {
  /** The `[y0, y1]` span at each numeric x. */
  band: OverlayBandPoint[];
  /** Interval level (0-1) — the join key. */
  level: number;
}

/** One ±σ control limit (`control` mode), keyed by which boundary it is. */
interface OverlayLimitEntry {
  /** Join key — the upper or lower limit. */
  key: 'lower' | 'upper';
  /** The limit's y value (before scaling). */
  value: number;
}

/** A fitted trend line for one source series, ready to stroke as a single path. */
interface OverlayTrendSeries {
  /** Draw points in scale-input space (x reversed out of number space). */
  drawPoints: OverlayDrawPoint[];
  /** Source series id (or the default bucket). */
  id: string;
  /** Least-squares R² goodness-of-fit — surfaced on the trend tooltip. */
  rSquared: number;
  /** Least-squares slope (per numeric-x unit) — surfaced on the trend tooltip. */
  slope: number;
}

/** Shared, pre-resolved values every mode renderer needs. */
interface OverlayRenderParams {
  animation: ResolvedNgeChartAnimation;
  /** Bounded plot width — control lines / band span `[0, boundedWidth]`. */
  boundedWidth: number;
  config: NgeOverlayLayerConfig;
  /** Chart margins — offset a mark-local anchor into container space for the tooltip. */
  margins: { bottom: number; left: number; right: number; top: number };
  theme: ResolvedNgeOverlayLayerTheme;
  /** Tooltip config (dimensions / style) — present only when a tooltip is wired. */
  tooltipConfig?: NgeTooltipConfig<NgeOverlayDataPoint>;
  /** Whether an interactive tooltip is wired (`tooltipConfig.enabled` + a handler). */
  tooltipEnabled: boolean;
  /** Tooltip dispatch handler — present only when a tooltip is wired. */
  tooltipHandlers?: NgeTooltipHandlers;
  /** Map a numeric x back to the host x-scale's input (`Date` for a time scale). */
  toScaleInput: (nx: number) => Date | number;
  /** Project a scale-input x to a pixel position on the shared x-scale. */
  xPos: (sx: Date | number) => number;
  /** The shared primary y-scale. */
  yScale: ScaleLinear<number, number>;
}

/**
 * Render an analytical-annotation overlay into the provided bounds with theme support.
 *
 * A composable layer drawn OVER a host line / scatter series on the SAME shared scales,
 * fanning out across three modes via `config.mode`:
 *
 * - `trendline` — fits each source series (`fit: 'linear'` least-squares or `fit:
 *   'loess'` local regression) and strokes one reference path per series.
 * - `control` — draws the series mean plus symmetric ±`sigma`·σ statistical-process-
 *   control limits, optionally shaded (`showControlBand`).
 * - `fan` — draws nested widening prediction-interval bands (one per `intervals` level)
 *   that express growing forecast uncertainty.
 *
 * The layer reads only the shared scales (it never builds its own) and computes purely
 * from its own `data`: `x` is coerced to a number for fitting, and fitted results are
 * mapped back through the host x-scale for drawing. Every sub-mark reconciles via a
 * keyed enter/update/exit join (or the sanctioned single-mark create-once idiom) and
 * drives all transitions off `context.animation`.
 */
export function renderOverlayLayer(
  context: NgeChartLayerContext<
    NgeOverlayDataPoint,
    NgeOverlayLayerConfig,
    NgeOverlayLayerTheme | undefined
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

  if (!bounds) {
    return;
  }

  // Stop any in-flight transitions on every overlay sub-mark before joining. The
  // unnamed interrupt cancels the default transition; each NAMED transition this layer
  // starts must be cancelled by name too, or a still-running fade / morph keeps
  // overwriting the marks' geometry after a subsequent instant (updateMs <= 0) render.
  const inFlight = bounds.selectAll(OVERLAY_MARK_SELECTOR);
  inFlight.interrupt();
  OVERLAY_TRANSITION_NAMES.forEach(name => inFlight.interrupt(name));

  // Empty data — remove stale marks and bail.
  if (!Array.isArray(data) || data.length === 0) {
    bounds.selectAll(OVERLAY_MARK_SELECTOR).remove();
    return;
  }

  const mergedTheme = mergeOverlayLayerTheme(theme);

  // Narrow to a single series when requested (multi-series source).
  const points = config.seriesId ? data.filter(d => d.seriesId === config.seriesId) : data;

  // Reconcile a mode switch: drop marks belonging to the other two modes.
  removeInactiveModeMarks(bounds, config.mode);

  if (points.length === 0) {
    bounds.selectAll(OVERLAY_MARK_SELECTOR).remove();
    return;
  }

  // Read the HOST's shared scales — the overlay never builds its own.
  const xScale = scales.x as unknown as OverlayXScale;
  const yScale = scales.y as ScaleLinear<number, number>;
  const continuousX = typeof xScale.invert === 'function';
  const xDomain = continuousX ? xScale.domain?.() : undefined;
  const xIsTime = !!xDomain && xDomain[0] instanceof Date;

  const params: OverlayRenderParams = {
    animation,
    boundedWidth: dimensions.boundedWidth,
    config,
    margins,
    theme: mergedTheme,
    tooltipConfig,
    tooltipEnabled: !!(tooltipConfig?.enabled && tooltipHandlers?.onTooltip),
    tooltipHandlers,
    toScaleInput: (nx: number) => (xIsTime ? new Date(nx) : nx),
    xPos: (sx: Date | number) => xScale(sx) ?? 0,
    yScale,
  };

  switch (config.mode) {
    case 'control':
      // Horizontal rules / band — no x fit needed, works on any x-scale.
      renderControl(bounds, points, params);
      break;
    case 'fan':
      // A fan needs a continuous (invertible) x to place its bands.
      if (!continuousX) {
        bounds.selectAll(FAN_BAND_SELECTOR).remove();
        return;
      }
      renderFan(bounds, points, params);
      break;
    case 'trendline':
      // The fit line is the whole mark: skip when disabled or x is categorical.
      if (config.showFitLine === false || !continuousX) {
        bounds.selectAll(TREND_SERIES_SELECTOR).remove();
        return;
      }
      renderTrendline(bounds, points, params);
      break;
  }
}

/**
 * Remove the marks of the two modes NOT currently active, so a `mode` switch
 * reconciles cleanly (the active mode reconciles via its own keyed join).
 */
function removeInactiveModeMarks(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  mode: NgeOverlayLayerConfig['mode']
): void {
  if (mode !== 'trendline') {
    bounds.selectAll(TREND_SERIES_SELECTOR).remove();
  }
  if (mode !== 'control') {
    bounds.selectAll(CONTROL_MARK_SELECTOR).remove();
  }
  if (mode !== 'fan') {
    bounds.selectAll(FAN_BAND_SELECTOR).remove();
  }
}

/* ------------------------------------------------------------------ trendline */

/**
 * Render one fit line per source series via a keyed series-group join. Each group
 * owns a single `<path>` (create-once idiom) that morphs on update and fades on
 * enter/exit.
 */
function renderTrendline(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  points: NgeOverlayDataPoint[],
  params: OverlayRenderParams
): void {
  const { animation } = params;
  const series = buildTrendSeries(points, params);

  if (series.length === 0) {
    bounds.selectAll(TREND_SERIES_SELECTOR).remove();
    return;
  }

  const groups = bounds
    .selectAll<SVGGElement, OverlayTrendSeries>(TREND_SERIES_SELECTOR)
    .data(series, d => d.id);

  // Enter — append the group, draw its fit path synchronously, then fade in.
  const enterGroups = groups
    .enter()
    .append('g')
    .attr('class', 'nge-overlay-series')
    .attr('data-series-id', d => d.id)
    .style('opacity', 0);

  enterGroups.each(function (this: SVGGElement, s) {
    renderFitPath(select<SVGGElement, OverlayTrendSeries>(this), s, params);
  });

  enterGroups
    .transition('overlay-fit-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update — survivors stay fully opaque (restores opacity if an in-flight enter fade
  // was just interrupted) and re-fit (morphs the path over updateMs).
  groups.style('opacity', 1);
  groups.each(function (this: SVGGElement, s) {
    renderFitPath(select<SVGGElement, OverlayTrendSeries>(this), s, params);
  });

  // Exit — fade out then remove.
  groups
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();
}

/**
 * Fit each source series and project its line back to scale-input space. Degenerate
 * fits (under two vertices) are dropped so nothing half-draws.
 */
function buildTrendSeries(
  points: NgeOverlayDataPoint[],
  params: OverlayRenderParams
): OverlayTrendSeries[] {
  const { config, toScaleInput } = params;
  const grouped = groupBySeries(points);
  const series: OverlayTrendSeries[] = [];

  for (const [id, seriesPoints] of grouped) {
    const xy = toXYPoints(seriesPoints);
    // Always run the least-squares fit: its `line` feeds `fit: 'linear'`, and its slope
    // / R² feed the tooltip for BOTH fits (a representative linear summary of the series,
    // even when a loess curve is what's drawn).
    const fit = linearFit(xy);
    const fitted = config.fit === 'loess' ? loessFit(xy, config.loessBandwidth) : fit.line;

    const drawPoints: OverlayDrawPoint[] = fitted.map(p => ({
      sx: toScaleInput(p.x),
      y: p.y,
    }));

    if (drawPoints.length >= 2) {
      series.push({ drawPoints, id, rSquared: fit.rSquared, slope: fit.slope });
    }
  }

  return series;
}

/**
 * Draw / update the single fit `<path>` for a series group. Birth shape is applied
 * synchronously (smear-free, testable); later updates morph over `animation.updateMs`.
 */
function renderFitPath(
  group: Selection<SVGGElement, OverlayTrendSeries, null, undefined>,
  series: OverlayTrendSeries,
  params: OverlayRenderParams
): void {
  const { animation, theme, xPos, yScale } = params;

  const lineGenerator = line<OverlayDrawPoint>()
    .x(d => xPos(d.sx))
    .y(d => yScale(d.y) ?? 0);

  const shape = lineGenerator(series.drawPoints);

  let path = group.select<SVGPathElement>('.nge-overlay-fit');
  const isNew = path.empty();

  if (isNew) {
    path = group
      .append('path')
      .classed('nge-overlay-fit', true)
      .style('fill', 'none')
      .style('pointer-events', 'none');
  }

  path
    .style('stroke', theme.fitLine.color)
    .style('stroke-dasharray', theme.fitLine.dash || 'none')
    .style('stroke-width', `${theme.fitLine.width}px`);

  if (isNew || animation.updateMs <= 0) {
    path.attr('d', shape);
  } else {
    path
      .transition('overlay-fit-shape')
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('d', shape);
  }

  renderFitHitPath(group, series, shape, params);
}

/**
 * Give the (thin, pointer-transparent) fit line a real hover target: a sibling `<path>`
 * with the same `d` but a thick transparent stroke and `pointer-events: stroke`. Present
 * only when a tooltip is wired (else removed, so the overlay never blocks the host
 * series); on hover it emits the series' slope + R², anchored at the line's midpoint.
 */
function renderFitHitPath(
  group: Selection<SVGGElement, OverlayTrendSeries, null, undefined>,
  series: OverlayTrendSeries,
  shape: null | string,
  params: OverlayRenderParams
): void {
  const { tooltipEnabled, xPos, yScale } = params;

  let hit = group.select<SVGPathElement>('.nge-overlay-fit-hit');

  if (!tooltipEnabled) {
    hit.remove();
    return;
  }

  if (hit.empty()) {
    hit = group
      .append('path')
      .classed('nge-overlay-fit-hit', true)
      .style('cursor', 'default')
      .style('fill', 'none')
      .style('pointer-events', 'stroke')
      .style('stroke', 'transparent')
      .style('stroke-width', `${TREND_HIT_STROKE_WIDTH}px`);
  }

  // Instant geometry — the hit target must never lag the visible line.
  hit.attr('d', shape);

  const mid = series.drawPoints[Math.floor(series.drawPoints.length / 2)];
  const px = xPos(mid.sx);
  const py = yScale(mid.y) ?? 0;
  const content = trendTooltipContent(series);

  hit
    .on('mouseenter.nge-overlay', () => emitOverlayTooltip(px, py, content, params))
    .on('mouseleave.nge-overlay', () => hideOverlayTooltip(params));
}

/* ------------------------------------------------------------------- control */

/**
 * Render the control mode: the series mean rule, symmetric ±σ limit rules, and an
 * optional shaded band between the limits.
 */
function renderControl(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  points: NgeOverlayDataPoint[],
  params: OverlayRenderParams
): void {
  const { config, theme } = params;
  const limits = controlLimits(
    points.map(d => d.y),
    config.sigma
  );

  // Optional shaded band between the limits (opt-in — the config defaults it off).
  if (
    config.showControlBand === true &&
    Number.isFinite(limits.lower) &&
    Number.isFinite(limits.upper)
  ) {
    renderControlBand(bounds, limits.lower, limits.upper, params);
  } else {
    bounds.selectAll('.nge-overlay-control-band').remove();
  }

  // Mean (centre) rule + the upper / lower ±σ limit rules.
  renderHorizontalLine(bounds, 'nge-overlay-mean', limits.mean, theme.meanLine, params);
  renderLimitLines(bounds, limits.lower, limits.upper, params);

  // Transparent full-envelope hover target driving the mean / ±σ tooltip.
  renderControlHitTarget(bounds, limits, params);
}

/**
 * Draw / update the transparent hover target spanning the control envelope (the ±σ
 * limits), so `control` mode is hoverable even with `showControlBand` off (the default).
 * Present only when a tooltip is wired; on hover it emits the mean + upper / lower limits.
 * A collapsed envelope (zero σ) gets a minimum hit height so it stays hoverable.
 */
function renderControlHitTarget(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  limits: { lower: number; mean: number; upper: number },
  params: OverlayRenderParams
): void {
  const { boundedWidth, tooltipEnabled, yScale } = params;

  let hit = bounds.select<SVGRectElement>('.nge-overlay-control-hit');

  if (!tooltipEnabled || !Number.isFinite(limits.upper) || !Number.isFinite(limits.lower)) {
    hit.remove();
    return;
  }

  const yUpper = yScale(limits.upper) ?? 0;
  const yLower = yScale(limits.lower) ?? 0;
  const rawHeight = Math.abs(yLower - yUpper);
  const height = Math.max(rawHeight, TREND_HIT_STROKE_WIDTH);
  const yTop = Math.min(yUpper, yLower) - (height - rawHeight) / 2;

  if (hit.empty()) {
    hit = bounds
      .append('rect')
      .attr('class', 'nge-overlay-control-hit')
      .style('cursor', 'default')
      .style('fill', 'transparent')
      .style('pointer-events', 'all');
  }

  hit.attr('x', 0).attr('y', yTop).attr('width', boundedWidth).attr('height', height);

  const content = controlTooltipContent(limits);
  const px = boundedWidth / 2;
  const py = yScale(limits.mean) ?? 0;

  hit
    .on('mouseenter.nge-overlay', () => emitOverlayTooltip(px, py, content, params))
    .on('mouseleave.nge-overlay', () => hideOverlayTooltip(params));
}

/**
 * Draw / update the shaded control band as a single `<rect>` spanning the plot width
 * between the two limits (sanctioned single-mark create-once idiom).
 */
function renderControlBand(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  lower: number,
  upper: number,
  params: OverlayRenderParams
): void {
  const { animation, boundedWidth, theme, yScale } = params;

  const yUpper = yScale(upper) ?? 0;
  const yLower = yScale(lower) ?? 0;
  const yTop = Math.min(yUpper, yLower);
  const height = Math.abs(yLower - yUpper);

  let rect = bounds.select<SVGRectElement>('.nge-overlay-control-band');
  const isNew = rect.empty();

  if (isNew) {
    // Insert at the back so the band sits behind the host series + the rules.
    rect = bounds
      .insert('rect', ':first-child')
      .attr('class', 'nge-overlay-band nge-overlay-control-band')
      .attr('x', 0)
      .attr('y', yTop)
      .attr('width', boundedWidth)
      .attr('height', height)
      .style('opacity', 0)
      .style('pointer-events', 'none');
  }

  rect.style('fill', theme.band.fillColor).style('fill-opacity', theme.band.fillOpacity);

  if (isNew) {
    rect
      .attr('x', 0)
      .attr('y', yTop)
      .attr('width', boundedWidth)
      .attr('height', height)
      .transition('overlay-control-band')
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', 1);
  } else if (animation.updateMs <= 0) {
    rect.attr('y', yTop).attr('width', boundedWidth).attr('height', height).style('opacity', 1);
  } else {
    rect
      .transition('overlay-control-band')
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('y', yTop)
      .attr('width', boundedWidth)
      .attr('height', height)
      .style('opacity', 1);
  }
}

/**
 * Draw / update a single full-width horizontal rule at `value` (create-once idiom),
 * used for the control mean line.
 */
function renderHorizontalLine(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  className: string,
  value: number,
  style: OverlayLineStyle,
  params: OverlayRenderParams
): void {
  const { animation, boundedWidth, yScale } = params;
  const y = yScale(value) ?? 0;

  let hline = bounds.select<SVGLineElement>(`.${className}`);
  const isNew = hline.empty();

  if (isNew) {
    hline = bounds
      .append('line')
      .attr('class', className)
      .attr('x1', 0)
      .attr('x2', boundedWidth)
      .attr('y1', y)
      .attr('y2', y)
      .style('opacity', 0)
      .style('pointer-events', 'none');
  }

  hline
    .style('stroke', style.color)
    .style('stroke-dasharray', style.dash || 'none')
    .style('stroke-width', `${style.width}px`);

  if (isNew) {
    hline
      .attr('x2', boundedWidth)
      .attr('y1', y)
      .attr('y2', y)
      .transition('overlay-mean')
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', 1);
  } else if (animation.updateMs <= 0) {
    hline.attr('x2', boundedWidth).attr('y1', y).attr('y2', y).style('opacity', 1);
  } else {
    hline
      .transition('overlay-mean')
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x2', boundedWidth)
      .attr('y1', y)
      .attr('y2', y)
      .style('opacity', 1);
  }
}

/**
 * Render the upper / lower ±σ limit rules via a keyed enter/update/exit join
 * (keyed by boundary) so both animate position on a data / theme change.
 */
function renderLimitLines(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  lower: number,
  upper: number,
  params: OverlayRenderParams
): void {
  const { animation, boundedWidth, theme, yScale } = params;
  const style = theme.limitLine;

  const entries: OverlayLimitEntry[] = [
    { key: 'upper', value: upper },
    { key: 'lower', value: lower },
  ];

  const lines = bounds
    .selectAll<SVGLineElement, OverlayLimitEntry>('.nge-overlay-limit')
    .data(entries, d => d.key);

  // Enter — final geometry synchronously, then fade in.
  const enterLines = lines
    .enter()
    .append('line')
    .attr('class', 'nge-overlay-limit')
    .attr('data-limit', d => d.key)
    .attr('x1', 0)
    .attr('x2', boundedWidth)
    .attr('y1', d => yScale(d.value) ?? 0)
    .attr('y2', d => yScale(d.value) ?? 0)
    .style('opacity', 0)
    .style('pointer-events', 'none');

  enterLines
    .style('stroke', style.color)
    .style('stroke-dasharray', style.dash || 'none')
    .style('stroke-width', `${style.width}px`)
    .transition('overlay-limit-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update — restyle + reposition survivors.
  const update = lines
    .style('stroke', style.color)
    .style('stroke-dasharray', style.dash || 'none')
    .style('stroke-width', `${style.width}px`);

  if (animation.updateMs <= 0) {
    update
      .attr('x2', boundedWidth)
      .attr('y1', d => yScale(d.value) ?? 0)
      .attr('y2', d => yScale(d.value) ?? 0)
      .style('opacity', 1);
  } else {
    update
      .transition('overlay-limit-shape')
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x2', boundedWidth)
      .attr('y1', d => yScale(d.value) ?? 0)
      .attr('y2', d => yScale(d.value) ?? 0)
      .style('opacity', 1);
  }

  // Exit — fade out then remove.
  lines
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();
}

/* ----------------------------------------------------------------------- fan */

/**
 * Render one shaded prediction-interval band per level via a keyed join (keyed by
 * level). Bands are drawn widest-first so narrower bands paint on top — the
 * overlapping translucent fills darken toward the centre (the fan look).
 */
function renderFan(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  points: NgeOverlayDataPoint[],
  params: OverlayRenderParams
): void {
  const { animation, config, theme, toScaleInput, xPos, yScale } = params;

  const xy = toXYPoints(points);

  // Under two points there is no envelope to draw.
  if (xy.length < 2) {
    bounds.selectAll(FAN_BAND_SELECTOR).remove();
    return;
  }

  const levels =
    config.intervals && config.intervals.length > 0 ? config.intervals : DEFAULT_FAN_INTERVALS;

  const bands: OverlayFanBand[] = predictionBands(xy, levels).sort((a, b) => b.level - a.level);

  const areaGenerator = area<OverlayBandPoint>()
    .x(d => xPos(toScaleInput(d.x)))
    .y0(d => yScale(d.y0) ?? 0)
    .y1(d => yScale(d.y1) ?? 0);

  const paths = bounds
    .selectAll<SVGPathElement, OverlayFanBand>(FAN_BAND_SELECTOR)
    .data(bands, d => d.level);

  // Enter — shape synchronously (smear-free birth), then fade in.
  const enterPaths = paths
    .enter()
    .append('path')
    .attr('class', 'nge-overlay-band nge-overlay-fan-band')
    .attr('data-level', d => d.level)
    .attr('d', d => areaGenerator(d.band))
    .style('fill', theme.band.fillColor)
    .style('fill-opacity', theme.band.fillOpacity)
    .style('opacity', 0)
    .style('pointer-events', 'none');

  enterPaths
    .transition('overlay-fan-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update — restyle + morph survivors.
  const update = paths
    .style('fill', theme.band.fillColor)
    .style('fill-opacity', theme.band.fillOpacity);

  if (animation.updateMs <= 0) {
    update.attr('d', d => areaGenerator(d.band)).style('opacity', 1);
  } else {
    update
      .transition('overlay-fan-shape')
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('d', d => areaGenerator(d.band))
      .style('opacity', 1);
  }

  // Exit — fade out then remove.
  paths
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const allBands = enterPaths.merge(paths);

  // Keep DOM order aligned with the sorted data (widest band at the back).
  allBands.order();

  // Bands fill an area, so they take pointer events directly — surface each band's
  // prediction-interval level on hover (or stay pointer-transparent when no tooltip).
  wireFanTooltip(allBands, params);
}

/**
 * Give the fan bands real hit targets (pointer-events on their fill) and dispatch each
 * band's prediction-interval level on hover, anchored at its widest (far) end — or clear
 * the wiring and stay pointer-transparent (not blocking the host series) when no tooltip.
 */
function wireFanTooltip(
  bands: Selection<SVGPathElement, OverlayFanBand, SVGGElement, unknown>,
  params: OverlayRenderParams
): void {
  const { boundedWidth, tooltipEnabled, toScaleInput, xPos, yScale } = params;

  if (!tooltipEnabled) {
    bands
      .style('pointer-events', 'none')
      .on('mouseenter.nge-overlay', null)
      .on('mouseleave.nge-overlay', null);
    return;
  }

  bands
    .style('cursor', 'default')
    .style('pointer-events', 'fill')
    .on('mouseenter.nge-overlay', (_event: PointerEvent, d: OverlayFanBand) => {
      const last = d.band[d.band.length - 1];
      const px = last ? xPos(toScaleInput(last.x)) : boundedWidth;
      const py = last ? (yScale(last.y1) ?? 0) : 0;
      emitOverlayTooltip(px, py, fanTooltipContent(d), params);
    })
    .on('mouseleave.nge-overlay', () => hideOverlayTooltip(params));
}

/* ------------------------------------------------------------------- shared */

/**
 * Group points by `seriesId`, bucketing points without one under a default id.
 */
function groupBySeries(points: NgeOverlayDataPoint[]): Map<string, NgeOverlayDataPoint[]> {
  const map = new Map<string, NgeOverlayDataPoint[]>();

  for (const point of points) {
    const id = point.seriesId ?? DEFAULT_SERIES_ID;
    let bucket = map.get(id);
    if (!bucket) {
      bucket = [];
      map.set(id, bucket);
    }
    bucket.push(point);
  }

  return map;
}

/**
 * Project overlay data into finite numeric xy pairs the fit helpers operate on
 * (`x` coerced out of Date / string; non-finite pairs dropped).
 */
function toXYPoints(points: NgeOverlayDataPoint[]): OverlayXYPoint[] {
  return points
    .map(d => ({ x: toNumericX(d.x), y: d.y }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));
}

/**
 * Coerce a Date / number / string x to a plain number for fitting. A numeric string
 * parses directly (epoch-ms); a non-numeric string — a documented ISO date such as
 * `'2020-01-01'` — falls back to Date parsing so it isn't silently dropped. A genuinely
 * unparseable string yields NaN and is legitimately filtered out by `toXYPoints`.
 */
function toNumericX(x: Date | number | string): number {
  if (x instanceof Date) {
    return +x;
  }
  if (typeof x === 'number') {
    return x;
  }
  const n = Number(x);
  return Number.isNaN(n) ? +new Date(x) : n;
}

/* ------------------------------------------------------------------ tooltip */

/**
 * Format a statistic for a tooltip value: two decimals for mid-range magnitudes,
 * exponential for very small / very large ones (a time-scale slope is per-millisecond),
 * and an em dash for a non-finite (degenerate-fit) value.
 */
function formatStat(n: number): string {
  if (!Number.isFinite(n)) {
    return '—';
  }
  const abs = Math.abs(n);
  if (abs !== 0 && (abs < 1e-2 || abs >= 1e5)) {
    return n.toExponential(2);
  }
  return n.toFixed(2);
}

/** Tooltip content for a trend line: least-squares slope + R² goodness-of-fit. */
function trendTooltipContent(series: OverlayTrendSeries): NgeTooltipContent {
  return {
    label: 'Trend',
    value: `slope ${formatStat(series.slope)} · R² ${formatStat(series.rSquared)}`,
  };
}

/** Tooltip content for a fan band: its prediction-interval level as a percentage. */
function fanTooltipContent(band: OverlayFanBand): NgeTooltipContent {
  return {
    label: 'Prediction interval',
    value: `${Math.round(band.level * 100)}%`,
  };
}

/** Tooltip content for the control envelope: mean + upper / lower ±σ limits. */
function controlTooltipContent(limits: {
  lower: number;
  mean: number;
  upper: number;
}): NgeTooltipContent {
  return {
    label: 'Control limits',
    value: `μ ${formatStat(limits.mean)} · UCL ${formatStat(limits.upper)} · LCL ${formatStat(limits.lower)}`,
  };
}

/**
 * Dispatch a VISIBLE tooltip anchored at a mark-derived plot position (bounded space),
 * offset into container space by the chart margins — mirroring the sibling line layer's
 * `computeTooltipEvent`. No-op unless a tooltip is wired.
 */
function emitOverlayTooltip(
  px: number,
  py: number,
  content: NgeTooltipContent,
  params: OverlayRenderParams
): void {
  const { margins, tooltipConfig, tooltipHandlers } = params;
  if (!tooltipConfig || !tooltipHandlers) {
    return;
  }

  const width = tooltipConfig.width ?? 160;
  const height = tooltipConfig.height ?? 56;
  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;

  tooltipHandlers.onTooltip({
    content,
    dimensions: { height, width },
    divotPosition: 'bottom',
    position: {
      divotX: (width - divotWidth) / 2,
      x: px + margins.left - width / 2,
      y: py + margins.top - height - 12,
    },
    style: tooltipConfig.style,
    visible: true,
  });
}

/** Dispatch a HIDDEN tooltip (hover-out). No-op unless a tooltip is wired. */
function hideOverlayTooltip(params: OverlayRenderParams): void {
  const { tooltipConfig, tooltipHandlers } = params;
  if (!tooltipConfig || !tooltipHandlers) {
    return;
  }

  tooltipHandlers.onTooltip({
    content: { label: '', value: '' },
    dimensions: { height: tooltipConfig.height ?? 56, width: tooltipConfig.width ?? 160 },
    divotPosition: 'bottom',
    position: { divotX: 0, x: 0, y: 0 },
    visible: false,
  });
}
