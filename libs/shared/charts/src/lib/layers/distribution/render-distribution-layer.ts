import type { ScaleBand, ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { area, curveCatmullRom } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeDistributionDataPoint, NgeDistributionLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type {
  NgeDistributionLayerTheme,
  ResolvedNgeDistributionLayerTheme,
} from '../../core/theme';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipEvent,
  NgeTooltipHandlers,
} from '../../core/tooltip';
import type { NgeBoxStats, KdePoint } from '../../nge-chart/nge-chart.distribution.helpers';

import { mergeDistributionLayerTheme } from '../../core/theme';
import {
  computeBoxStats,
  computeDodgeOffsets,
  computeJitterOffsets,
  computeKde,
  hashSeed,
} from '../../nge-chart/nge-chart.distribution.helpers';

/** Every sub-mark class the layer owns — used for the empty-data stale sweep + interrupt. */
const DISTRIBUTION_SELECTOR =
  '.nge-distribution-box, .nge-distribution-median, .nge-distribution-whisker, ' +
  '.nge-distribution-mean, .nge-distribution-outlier, .nge-distribution-violin, ' +
  '.nge-distribution-point';

/** Inner (violin-mode) box half-width as a fraction of the normal box half-width. */
const INNER_BOX_WIDTH_RATIO = 0.35;

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
  /** Source category datum (click / tooltip payload). */
  datum: NgeDistributionDataPoint;
  /** Index of the source category in `config.data`. */
  index: number;
  /** Stable join key. */
  key: string;
}

/** A `<path>`-based mark (whisker / violin). */
interface PathMark {
  d: string;
  key: string;
}

/** A `<circle>`-based mark (mean / outlier / point). */
interface CircleMark {
  cx: number;
  cy: number;
  key: string;
  r: number;
}

/** One box rect (q1→q3), interactive. */
interface BoxMark extends InteractiveMark {
  category: string;
  height: number;
  rx: number;
  width: number;
  x: number;
  y: number;
}

/** One median line across the box. */
interface MedianMark {
  key: string;
  x1: number;
  x2: number;
  y1: number;
  y2: number;
}

/** One whisker `<path>` (both whiskers + caps, or the error-bar span). */
interface WhiskerMark extends PathMark {
  category: string;
}

/** One mean glyph. */
interface MeanMark extends CircleMark {
  category: string;
}

/** One outlier point beyond the whiskers, interactive. */
interface OutlierMark extends InteractiveMark, CircleMark {
  category: string;
}

/** One mirrored KDE violin `<path>`, interactive. */
interface ViolinMark extends InteractiveMark, PathMark {
  category: string;
}

/** One raw-observation point, interactive. */
interface PointMark extends InteractiveMark, CircleMark {
  category: string;
  fill: string;
}

/** All resolved sub-marks for one render pass (each its own keyed join). */
interface DistributionMarks {
  boxMarks: BoxMark[];
  meanMarks: MeanMark[];
  medianMarks: MedianMark[];
  outlierMarks: OutlierMark[];
  pointMarks: PointMark[];
  violinMarks: ViolinMark[];
  whiskerMarks: WhiskerMark[];
}

/** One category's resolved geometry + statistics (n=0 categories are dropped). */
interface CategoryDatum {
  bandCenter: number;
  boxHalf: number;
  category: string;
  color?: string;
  datum: NgeDistributionDataPoint;
  index: number;
  stats: NgeBoxStats;
  values: number[];
}

/** Params threaded through the render helpers. */
interface DistributionRenderParams {
  animation: ResolvedNgeChartAnimation;
  bandScale: ScaleBand<string>;
  config: NgeDistributionLayerConfig;
  margins: { bottom: number; left: number; right: number; top: number };
  theme: ResolvedNgeDistributionLayerTheme;
  tooltip?: Partial<NgeTooltipConfig<NgeDistributionDataPoint>>;
  tooltipHandlers?: NgeTooltipHandlers;
  valueScale: ScaleLinear<number, number>;
  /** True when categories sit on the x (band) axis and values run up the y axis. */
  vertical: boolean;
}

/**
 * Render a distribution layer into the provided bounds with theme support.
 *
 * Summarises each category's raw observations (`values[]`) as a spread seated on a
 * shared band (category) + linear (value) scale pair. One primitive fans out via
 * `render`: `'box'` draws a **box-and-whisker** (`showBox: false` ⇒ an **error-bar**
 * plot; `whiskerStat` picks the whisker extent), `'violin'` a mirrored **KDE
 * density** (with an optional inner box), and `'points'` a **strip / jitter /
 * beeswarm** point cloud. Categories occupy the band axis (x when vertical, y when
 * horizontal); observations read the linear value axis. Every sub-mark is its own
 * FLAT keyed enter/update/exit join — marks take their final geometry synchronously
 * (smear-free first paint), fade in on enter, morph on update, and fade on exit via
 * `context.animation`. All colour is applied via D3 `.style()` on `--chart-*` tokens.
 */
export function renderDistributionLayer(
  context: NgeChartLayerContext<
    NgeDistributionDataPoint,
    NgeDistributionLayerConfig,
    NgeDistributionLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, margins, scales, theme, tooltipHandlers } = context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    bounds?.selectAll(DISTRIBUTION_SELECTOR).interrupt().remove();
    return;
  }

  const vertical = (config.orientation ?? 'vertical') === 'vertical';
  const params: DistributionRenderParams = {
    animation,
    bandScale: (vertical ? scales.x : scales.y) as ScaleBand<string>,
    config,
    margins,
    theme: mergeDistributionLayerTheme(theme),
    tooltip: config.tooltip,
    tooltipHandlers,
    valueScale: (vertical ? scales.y : scales.x) as ScaleLinear<number, number>,
    vertical,
  };

  const categories = buildCategories(data, params);
  const marks = emptyMarks();
  const renderMode = config.render ?? 'box';
  if (renderMode === 'violin') {
    buildViolinMode(categories, params, marks);
  } else if (renderMode === 'points') {
    buildPointMode(categories, params, marks);
  } else {
    buildBoxMode(categories, params, marks);
  }

  bounds.selectAll(DISTRIBUTION_SELECTOR).interrupt();

  // Draw order (back → front): violin, box, whisker, median, mean, outlier, point.
  // The `.raise()` sweep re-asserts that stack AFTER any enter-append so overlays
  // always sit in front of freshly-added marks appended to the group's end.
  renderPaths(bounds, marks.violinMarks, 'nge-distribution-violin', params, violinStyle(params));
  const boxSel = renderBoxes(bounds, marks.boxMarks, params);
  renderPaths(
    bounds,
    marks.whiskerMarks,
    'nge-distribution-whisker',
    params,
    whiskerStyle(params)
  );
  renderMedians(bounds, marks.medianMarks, params);
  renderCircles(bounds, marks.meanMarks, 'nge-distribution-mean', animation, meanStyle(params));
  const outlierSel = renderCircles(
    bounds,
    marks.outlierMarks,
    'nge-distribution-outlier',
    animation,
    outlierStyle(params)
  );
  const pointSel = renderCircles(
    bounds,
    marks.pointMarks,
    'nge-distribution-point',
    animation,
    pointStyle(params)
  );
  const violinSel = bounds.selectAll<SVGPathElement, ViolinMark>('.nge-distribution-violin');

  attachInteraction(boxSel, params);
  attachInteraction(violinSel, params);
  attachInteraction(outlierSel, params);
  attachInteraction(pointSel, params);

  bounds.selectAll('.nge-distribution-box').raise();
  bounds.selectAll('.nge-distribution-whisker').raise();
  bounds.selectAll('.nge-distribution-median').raise();
  bounds.selectAll('.nge-distribution-mean').raise();
  bounds.selectAll('.nge-distribution-outlier').raise();
  bounds.selectAll('.nge-distribution-point').raise();
}

/** Orientation-aware pixel X for a (band-axis pixel, value) pair. */
function toValueX(bandCoord: number, value: number, params: DistributionRenderParams): number {
  return params.vertical ? bandCoord : params.valueScale(value);
}

/** Orientation-aware pixel Y for a (band-axis pixel, value) pair. */
function toValueY(bandCoord: number, value: number, params: DistributionRenderParams): number {
  return params.vertical ? params.valueScale(value) : bandCoord;
}

/**
 * Resolve each category to its band center, box half-width, and box statistics.
 * Categories with no observations (`computeBoxStats` returns `null`) are dropped —
 * they keep their axis tick but draw nothing.
 */
function buildCategories(
  data: NgeDistributionDataPoint[],
  params: DistributionRenderParams
): CategoryDatum[] {
  const { bandScale, config } = params;
  const whiskerStat = config.whiskerStat ?? 'iqr';
  const boxWidthFraction = config.boxWidth ?? 0.6;
  const bandwidth = bandScale.bandwidth();

  const categories: CategoryDatum[] = [];
  data.forEach((datum, index) => {
    const stats = computeBoxStats(datum.values, whiskerStat);
    if (!stats) {
      return;
    }
    categories.push({
      bandCenter: (bandScale(datum.category) ?? 0) + bandwidth / 2,
      boxHalf: (boxWidthFraction * bandwidth) / 2,
      category: datum.category,
      color: datum.color,
      datum,
      index,
      stats,
      values: datum.values,
    });
  });

  return categories;
}

/** Empty per-render mark buckets. */
function emptyMarks(): DistributionMarks {
  return {
    boxMarks: [],
    meanMarks: [],
    medianMarks: [],
    outlierMarks: [],
    pointMarks: [],
    violinMarks: [],
    whiskerMarks: [],
  };
}

/**
 * Box mode. Draws a whisker per category always; when `showBox !== false` adds the
 * box + median (+ outliers when `showOutliers`); marks the mean when `showMean` (or
 * always, as the center marker, in the `showBox === false` error-bar variant).
 */
function buildBoxMode(
  categories: CategoryDatum[],
  params: DistributionRenderParams,
  marks: DistributionMarks
): void {
  const { config, theme } = params;
  const errorBar = config.showBox === false;
  const drawMean = errorBar || config.showMean === true;
  const whiskerStat = config.whiskerStat ?? 'iqr';
  const drawOutliers = !errorBar && (config.showOutliers ?? whiskerStat === 'iqr');

  for (const category of categories) {
    const capHalf = theme.whisker.capRatio * category.boxHalf;
    marks.whiskerMarks.push({
      category: category.category,
      d: buildWhiskerPath(category.bandCenter, capHalf, category.stats, errorBar, params),
      key: category.category,
    });

    if (!errorBar) {
      const rect = rectFor(
        category.stats.q1,
        category.stats.q3,
        category.bandCenter,
        category.boxHalf,
        params
      );
      marks.boxMarks.push(boxMark(category, rect, theme.box.radius, params));
      marks.medianMarks.push(
        medianLine(
          category.category,
          category.bandCenter,
          category.boxHalf,
          category.stats.median,
          params
        )
      );
    }

    if (drawMean) {
      marks.meanMarks.push({
        category: category.category,
        cx: toValueX(category.bandCenter, category.stats.mean, params),
        cy: toValueY(category.bandCenter, category.stats.mean, params),
        key: category.category,
        r: theme.mean.radius,
      });
    }

    if (drawOutliers) {
      category.stats.outliers.forEach((value, i) =>
        marks.outlierMarks.push(outlierMark(category, value, i, theme.outlier.radius, params))
      );
    }
  }
}

/**
 * Violin mode. A FIRST pass computes each category's KDE and the layer-wide max
 * density so violins are width-comparable; a degenerate KDE (`[]`) skips only that
 * category's violin. When `showInnerBox !== false` each category also gets a thin
 * inner box + median (reusing the box/median classes).
 */
function buildViolinMode(
  categories: CategoryDatum[],
  params: DistributionRenderParams,
  marks: DistributionMarks
): void {
  const { config, theme } = params;
  const drawInner = config.showInnerBox !== false;

  const kdeByCategory = new Map<string, KdePoint[]>();
  let globalMaxDensity = 0;
  for (const category of categories) {
    const kde = computeKde(category.values, {
      bandwidth: config.kdeBandwidth,
      kernel: config.kdeKernel,
      resolution: config.kdeResolution,
    });
    kdeByCategory.set(category.category, kde);
    for (const point of kde) {
      if (point.density > globalMaxDensity) {
        globalMaxDensity = point.density;
      }
    }
  }

  for (const category of categories) {
    const kde = kdeByCategory.get(category.category) ?? [];
    if (kde.length > 0 && globalMaxDensity > 0) {
      const d = buildViolinPath(
        category.bandCenter,
        category.boxHalf,
        globalMaxDensity,
        kde,
        params
      );
      if (d) {
        marks.violinMarks.push(violinMark(category, d, params));
      }
    }

    if (drawInner) {
      const innerHalf = category.boxHalf * INNER_BOX_WIDTH_RATIO;
      const rect = rectFor(
        category.stats.q1,
        category.stats.q3,
        category.bandCenter,
        innerHalf,
        params
      );
      marks.boxMarks.push(boxMark(category, rect, theme.box.radius, params));
      marks.medianMarks.push(
        medianLine(category.category, category.bandCenter, innerHalf, category.stats.median, params)
      );
    }
  }
}

/**
 * Points mode. One circle per raw observation at `bandCenter + offset` on the band
 * axis: `beeswarm` packs a non-overlapping dodge, `uniform` seeds a deterministic
 * jitter per category, `none` stacks them on the center line.
 */
function buildPointMode(
  categories: CategoryDatum[],
  params: DistributionRenderParams,
  marks: DistributionMarks
): void {
  const { bandScale, config, theme, valueScale } = params;
  const radius = config.pointRadius ?? theme.point.radius;
  const jitter = config.jitter ?? 'beeswarm';

  for (const category of categories) {
    const count = category.values.length;
    let offsets: number[];
    if (jitter === 'uniform') {
      offsets = computeJitterOffsets(
        count,
        (config.jitterWidth ?? 0.7) * bandScale.bandwidth(),
        hashSeed(category.category)
      );
    } else if (jitter === 'none') {
      offsets = category.values.map(() => 0);
    } else {
      offsets = computeDodgeOffsets(
        category.values.map(value => valueScale(value)),
        radius
      );
    }

    const fill = resolvePointFill(category, theme);
    category.values.forEach((value, i) => {
      const bandCoord = category.bandCenter + offsets[i];
      const cx = toValueX(bandCoord, value, params);
      const cy = toValueY(bandCoord, value, params);
      marks.pointMarks.push({
        anchorX: cx,
        anchorY: cy - radius,
        category: category.category,
        content: { label: category.category, value },
        cx,
        cy,
        datum: category.datum,
        fill,
        index: category.index,
        key: `${category.category}:${i}`,
        r: radius,
      });
    });
  }
}

/** Build a box rect for a `[loValue, hiValue]` span centered on the band axis. */
function rectFor(
  loValue: number,
  hiValue: number,
  center: number,
  half: number,
  params: DistributionRenderParams
): { height: number; width: number; x: number; y: number } {
  const a = params.valueScale(loValue);
  const b = params.valueScale(hiValue);
  return params.vertical
    ? { height: Math.abs(b - a), width: 2 * half, x: center - half, y: Math.min(a, b) }
    : { height: 2 * half, width: Math.abs(b - a), x: Math.min(a, b), y: center - half };
}

/** Resolve a box mark from a rect (top-center tooltip anchor, orientation-aware). */
function boxMark(
  category: CategoryDatum,
  rect: { height: number; width: number; x: number; y: number },
  radius: number,
  params: DistributionRenderParams
): BoxMark {
  return {
    anchorX: params.vertical ? category.bandCenter : rect.x + rect.width / 2,
    anchorY: rect.y,
    category: category.category,
    content: boxContent(category, params),
    datum: category.datum,
    height: rect.height,
    index: category.index,
    key: category.category,
    rx: radius,
    width: rect.width,
    x: rect.x,
    y: rect.y,
  };
}

/** Resolve a median line across a box of the given half-width. */
function medianLine(
  category: string,
  center: number,
  half: number,
  median: number,
  params: DistributionRenderParams
): MedianMark {
  return {
    key: category,
    x1: toValueX(center - half, median, params),
    x2: toValueX(center + half, median, params),
    y1: toValueY(center - half, median, params),
    y2: toValueY(center + half, median, params),
  };
}

/** Resolve one outlier circle (top-center tooltip anchor). */
function outlierMark(
  category: CategoryDatum,
  value: number,
  i: number,
  radius: number,
  params: DistributionRenderParams
): OutlierMark {
  const cx = toValueX(category.bandCenter, value, params);
  const cy = toValueY(category.bandCenter, value, params);
  return {
    anchorX: cx,
    anchorY: cy - radius,
    category: category.category,
    content: { label: category.category, value },
    cx,
    cy,
    datum: category.datum,
    index: category.index,
    key: `${category.category}:${i}`,
    r: radius,
  };
}

/** Resolve one violin mark (top-center tooltip anchor at the max observation). */
function violinMark(
  category: CategoryDatum,
  d: string,
  params: DistributionRenderParams
): ViolinMark {
  const { valueScale, vertical } = params;
  return {
    anchorX: vertical
      ? category.bandCenter
      : (valueScale(category.stats.min) + valueScale(category.stats.max)) / 2,
    anchorY: vertical ? valueScale(category.stats.max) : category.bandCenter - category.boxHalf,
    category: category.category,
    content: boxContent(category, params),
    d,
    datum: category.datum,
    index: category.index,
    key: category.category,
  };
}

/** Tooltip content for a box / violin mark — the custom formatter, else the median. */
function boxContent(category: CategoryDatum, params: DistributionRenderParams): NgeTooltipContent {
  return (
    params.tooltip?.formatContent?.(category.datum) ?? {
      label: category.category,
      value: category.stats.median,
    }
  );
}

/** Per-category point fill: `d.color` override → theme palette by index → single color. */
function resolvePointFill(
  category: CategoryDatum,
  theme: ResolvedNgeDistributionLayerTheme
): string {
  if (category.color) {
    return category.color;
  }
  const palette = theme.point.colors;
  return palette.length > 0 ? palette[category.index % palette.length] : theme.point.color;
}

/**
 * Build the whisker `<path>` for one category. In box mode both whiskers run from
 * the box edges (`q1 → whiskerLow`, `q3 → whiskerHigh`), each with an end cap; in
 * error-bar mode a single span runs `whiskerLow → whiskerHigh` with caps at both
 * ends. Cap length is `whisker.capRatio · boxWidth` (so `capHalf = capRatio · boxHalf`).
 */
function buildWhiskerPath(
  center: number,
  capHalf: number,
  stats: NgeBoxStats,
  errorBar: boolean,
  params: DistributionRenderParams
): string {
  const seg = (v1: number, v2: number): string =>
    `M${toValueX(center, v1, params)},${toValueY(center, v1, params)}` +
    `L${toValueX(center, v2, params)},${toValueY(center, v2, params)}`;
  const cap = (v: number): string =>
    `M${toValueX(center - capHalf, v, params)},${toValueY(center - capHalf, v, params)}` +
    `L${toValueX(center + capHalf, v, params)},${toValueY(center + capHalf, v, params)}`;

  return errorBar
    ? `${seg(stats.whiskerLow, stats.whiskerHigh)}${cap(stats.whiskerLow)}${cap(stats.whiskerHigh)}`
    : `${seg(stats.q1, stats.whiskerLow)}${cap(stats.whiskerLow)}` +
        `${seg(stats.q3, stats.whiskerHigh)}${cap(stats.whiskerHigh)}`;
}

/**
 * Build a mirrored violin `<path>` about the band center: at each KDE sample the
 * half-width is `(density / globalMaxDensity) · violinHalf`, drawn with a smooth
 * Catmull–Rom curve. Orientation flows through `toValueX` / `toValueY`.
 */
function buildViolinPath(
  center: number,
  violinHalf: number,
  globalMaxDensity: number,
  kde: KdePoint[],
  params: DistributionRenderParams
): string {
  const width = (point: KdePoint): number =>
    globalMaxDensity > 0 ? (point.density / globalMaxDensity) * violinHalf : 0;

  const generator = area<KdePoint>()
    .x0(point => toValueX(center - width(point), point.value, params))
    .x1(point => toValueX(center + width(point), point.value, params))
    .y0(point => toValueY(center - width(point), point.value, params))
    .y1(point => toValueY(center + width(point), point.value, params))
    .curve(curveCatmullRom);

  return generator(kde) ?? '';
}

/** Join the box rects (keyed by category), returning the merged selection. */
function renderBoxes(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: BoxMark[],
  params: DistributionRenderParams
): Selection<SVGRectElement, BoxMark, SVGGElement, unknown> {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGRectElement, BoxMark>('.nge-distribution-box')
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
    .classed('nge-distribution-box', true)
    .style('opacity', 0)
    .attr('data-category', d => d.category)
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

  sel
    .transition('box-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x', d => d.x)
    .attr('y', d => d.y)
    .attr('width', d => d.width)
    .attr('height', d => d.height);

  const merged = enter.merge(sel);
  merged
    .attr('data-category', d => d.category)
    .attr('rx', d => d.rx)
    .attr('ry', d => d.rx)
    .style('fill', theme.box.color)
    .style('fill-opacity', theme.box.opacity)
    .style('stroke', theme.box.stroke)
    .style('stroke-width', `${theme.box.strokeWidth}px`);

  return merged;
}

/** Join the median lines (keyed by category). */
function renderMedians(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: MedianMark[],
  params: DistributionRenderParams
): void {
  const { animation, theme } = params;

  const sel = bounds
    .selectAll<SVGLineElement, MedianMark>('.nge-distribution-median')
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
    .classed('nge-distribution-median', true)
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .attr('x1', d => d.x1)
    .attr('y1', d => d.y1)
    .attr('x2', d => d.x2)
    .attr('y2', d => d.y2);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  sel
    .transition('median-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('x1', d => d.x1)
    .attr('y1', d => d.y1)
    .attr('x2', d => d.x2)
    .attr('y2', d => d.y2);

  enter
    .merge(sel)
    .style('stroke', theme.median.color)
    .style('stroke-width', `${theme.median.width}px`);
}

/**
 * Join a `<path>`-per-category sub-mark (whisker / violin) with the fade-in pattern,
 * returning the merged selection. `applyStyle` sets fill/stroke immediately on both
 * enter and update (theme applied synchronously); geometry morphs over `updateMs`.
 */
function renderPaths<T extends PathMark>(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: T[],
  className: string,
  params: DistributionRenderParams,
  applyStyle: (selection: Selection<SVGPathElement, T, SVGGElement, unknown>) => void
): Selection<SVGPathElement, T, SVGGElement, unknown> {
  const { animation } = params;

  const sel = bounds.selectAll<SVGPathElement, T>(`.${className}`).data(marks, d => d.key);

  sel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enter = sel
    .enter()
    .append('path')
    .classed(className, true)
    .style('opacity', 0)
    .attr('d', d => d.d);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  sel
    .transition('path-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('d', d => d.d);

  const merged = enter.merge(sel);
  applyStyle(merged);
  return merged;
}

/**
 * Join a `<circle>`-per-mark sub-mark (mean / outlier / point) with the fade-in
 * pattern, returning the merged selection. `applyStyle` sets fill/stroke immediately.
 */
function renderCircles<T extends CircleMark>(
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  marks: T[],
  className: string,
  animation: ResolvedNgeChartAnimation,
  applyStyle: (selection: Selection<SVGCircleElement, T, SVGGElement, unknown>) => void
): Selection<SVGCircleElement, T, SVGGElement, unknown> {
  const sel = bounds.selectAll<SVGCircleElement, T>(`.${className}`).data(marks, d => d.key);

  sel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enter = sel
    .enter()
    .append('circle')
    .classed(className, true)
    .style('opacity', 0)
    .attr('cx', d => d.cx)
    .attr('cy', d => d.cy)
    .attr('r', d => d.r);

  enter
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  sel
    .transition('circle-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('cx', d => d.cx)
    .attr('cy', d => d.cy);

  const merged = enter.merge(sel);
  merged.attr('r', d => d.r);
  applyStyle(merged);
  return merged;
}

/** Violin fill + stroke styler. */
function violinStyle(
  params: DistributionRenderParams
): (selection: Selection<SVGPathElement, ViolinMark, SVGGElement, unknown>) => void {
  const { violin } = params.theme;
  return selection =>
    selection
      .style('fill', violin.color)
      .style('fill-opacity', violin.opacity)
      .style('stroke', violin.stroke)
      .style('stroke-width', `${violin.strokeWidth}px`);
}

/** Whisker stroke styler (non-interactive). */
function whiskerStyle(
  params: DistributionRenderParams
): (selection: Selection<SVGPathElement, WhiskerMark, SVGGElement, unknown>) => void {
  const { whisker } = params.theme;
  return selection =>
    selection
      .style('fill', 'none')
      .style('pointer-events', 'none')
      .style('stroke', whisker.color)
      .style('stroke-width', `${whisker.width}px`);
}

/** Mean glyph styler (non-interactive). */
function meanStyle(
  params: DistributionRenderParams
): (selection: Selection<SVGCircleElement, MeanMark, SVGGElement, unknown>) => void {
  const { mean } = params.theme;
  return selection =>
    selection
      .style('pointer-events', 'none')
      .style('fill', mean.color)
      .style('stroke', mean.color)
      .style('stroke-width', `${mean.strokeWidth}px`);
}

/** Outlier point styler. */
function outlierStyle(
  params: DistributionRenderParams
): (selection: Selection<SVGCircleElement, OutlierMark, SVGGElement, unknown>) => void {
  const { outlier } = params.theme;
  return selection =>
    selection
      .style('fill', outlier.color)
      .style('stroke', outlier.color)
      .style('stroke-width', `${outlier.strokeWidth}px`);
}

/** Raw-observation point styler (per-point fill). */
function pointStyle(
  params: DistributionRenderParams
): (selection: Selection<SVGCircleElement, PointMark, SVGGElement, unknown>) => void {
  const { point } = params.theme;
  return selection =>
    selection
      .style('fill', d => d.fill)
      .style('fill-opacity', point.opacity)
      .style('stroke', point.strokeColor)
      .style('stroke-width', `${point.strokeWidth}px`);
}

/**
 * Wire hover (tooltip) and click handlers on an interactive selection (box / violin
 * / outlier / point). The hovered / clicked mark carries its pre-resolved tooltip
 * content + source category datum for the payload.
 */
function attachInteraction<GElement extends SVGGraphicsElement, T extends InteractiveMark>(
  selection: Selection<GElement, T, SVGGElement, unknown>,
  params: DistributionRenderParams
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
  params: DistributionRenderParams
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
    style: { ...tooltip.style, borderColor: tooltip.style?.borderColor ?? theme.box.color },
    visible: true,
  };
}

/** The hide-tooltip event emitted on mouseleave. */
function hiddenTooltipEvent(
  tooltip?: Partial<NgeTooltipConfig<NgeDistributionDataPoint>>
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
