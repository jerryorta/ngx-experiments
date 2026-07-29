import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { interpolate } from 'd3-interpolate';
import { scaleBand, scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';
import { arc, areaRadial, curveLinearClosed, lineRadial, pie } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type { NgeChartDimensions } from '../../core/chart.models';
import type { NgeRadialBarDataPoint, NgeRadialBarLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeRadialBarLayerTheme, ResolvedNgeRadialBarLayerTheme } from '../../core/theme';
import type {
  NgeTooltipConfig,
  NgeTooltipContent,
  NgeTooltipEvent,
  NgeTooltipHandlers,
} from '../../core/tooltip';

import { applyRadiusRatio } from '../../core/fns';
import {
  elideLabelText,
  mergeRadialBarLayerTheme,
  resolveLabelColor,
  toCssFontSize,
} from '../../core/theme';

/** Every mark class the layer owns — used for the interrupt + the empty-data stale sweep. */
const RADIAL_BAR_SELECTOR =
  '.nge-radial-bar-arc, .nge-radial-bar-series, .nge-radial-bar-cell, .nge-radial-bar-label';

/** Series bucket key for area points that carry no explicit `seriesId`. */
const DEFAULT_SERIES_ID = '__default__';

/** ASCII Unit Separator — a delimiter-safe join for the (label, band) cell key. */
const KEY_SEP = '';

/** Radius of the invisible per-vertex hover/click targets (area mark). */
const AREA_HOVER_RADIUS = 8;

/**
 * Narrowest bar sweep (radians) that still earns an ON-BAR label when no `minLabelAngle`
 * is supplied — ≈ 8.6°, i.e. ~2.4% of a full turn. The pie / sunburst threshold, shared so
 * the radial layers suppress narrow marks identically. Outside labels default to `0`
 * instead: they are not drawn inside the bar, so its width stops being a constraint.
 */
const DEFAULT_MIN_LABEL_ANGLE = 0.15;

/**
 * Smallest extent (px) that still earns a label when no `minLabelSize` is supplied —
 * roughly one line box at the default label font size. Applied to the bar's radial extent
 * (the direction an on-bar label runs) and to the arc at its mid-radius (which bounds the
 * text's cap-height), so a wide-angle bar too short to seat a line stays unlabelled.
 */
const DEFAULT_MIN_LABEL_SIZE = 12;

/** Pixels reserved around the chart for outside labels when none is configured. */
const DEFAULT_OUTSIDE_LABEL_GUTTER = 48;

/** Radial gap (px) from the chart's outer radius out to an outside label's anchor. */
const OUTSIDE_LABEL_OFFSET = 12;

/**
 * Where one label sits and how it is turned, in the container's local (center-origin)
 * coords. Both placements reduce to the same four values, so the label join stays
 * placement-agnostic: `'inside'` turns the text along the bar's own radius, `'outside'`
 * leaves it horizontal and points it away from the center.
 */
interface RadialBarLabelPlacement {
  /** `text-anchor` — how the text sits relative to its anchor point. */
  anchor: 'end' | 'middle' | 'start';
  /** Rotation about the anchor, in DEGREES, normalised to [0, 360). */
  rotate: number;
  /** Anchor x. */
  x: number;
  /** Anchor y. */
  y: number;
}

/** A label `<text>` node caches its last-drawn placement so the update tween can slide it. */
type RadialBarLabelNode = SVGTextElement & { _current?: RadialBarLabelPlacement };

/** Compose a {@link RadialBarLabelPlacement} into the `transform` attribute that realises it. */
function labelTransform(placement: RadialBarLabelPlacement): string {
  return `translate(${placement.x},${placement.y}) rotate(${placement.rotate})`;
}

/** Fold an angle in degrees into [0, 360) — `startAngle` is arbitrary, so raw degrees are too. */
function normaliseDegrees(degrees: number): number {
  return ((degrees % 360) + 360) % 360;
}

/** The geometry a `d3.arc()` is drawn from (the tween interpolates over this shape). */
interface ArcGeom {
  endAngle: number;
  innerRadius: number;
  outerRadius: number;
  startAngle: number;
}

/** A radial arc `<path>` node caches its last-drawn geometry so the grow-in tween is smooth. */
type RadialArcNode = SVGPathElement & { _current?: ArcGeom };

/** Fields shared by every drawn arc mark (bar + cell). */
interface RadialArcMark {
  /** Start angle (radians, 0 = 12 o'clock, clockwise). */
  a0: number;
  /** End angle (radians). */
  a1: number;
  /** Resolved fill color. */
  color: string;
  /** Source datum (tooltip / click payload). */
  datum: NgeRadialBarDataPoint;
  /** Index of the source datum in `config.data`. */
  index: number;
  /** Inner radius (px). */
  innerR: number;
  /** Outer radius (px). */
  outerR: number;
}

/** One radial bar arc, keyed by its category label. */
interface RadialBarArcMark extends RadialArcMark {
  label: string;
}

/** One circular-heatmap cell arc, keyed by `label + band`, with a value-driven fill opacity. */
interface RadialCellMark extends RadialArcMark {
  key: string;
  opacity: number;
}

/** One vertex of a radial-area series (a category's value point). */
interface RadialAreaVertex {
  /** Band-center angle (radians). */
  angle: number;
  /** Source datum. */
  datum: NgeRadialBarDataPoint;
  /** Non-negative value. */
  value: number;
}

/** One radial-area / radial-line series (a `seriesId` group). */
interface RadialAreaSeries {
  color: string;
  id: string;
  index: number;
  points: RadialAreaVertex[];
}

/** Resolved geometry + palette threaded through the mark render helpers. */
interface RadialBarRenderParams {
  animation: ResolvedNgeChartAnimation;
  config: NgeRadialBarLayerConfig;
  cx: number;
  cy: number;
  dimensions: NgeChartDimensions;
  domainMax: number;
  endAngle: number;
  /** An element in the chart's tree — resolves `var(--nge-chart-*)` off the cascade. */
  host: Element | null;
  innerRadiusPx: number;
  labels: string[];
  margins: { bottom: number; left: number; right: number; top: number };
  outerRadius: number;
  palette: string[];
  radialScale: ScaleLinear<number, number>;
  startAngle: number;
  theme: ResolvedNgeRadialBarLayerTheme;
  tooltipConfig?: NgeTooltipConfig<NgeRadialBarDataPoint>;
  tooltipHandlers?: NgeTooltipHandlers;
}

/** An angular band: its `start` / `end` sweep and `center` (radians). */
interface AngularBand {
  center: number;
  end: number;
  start: number;
}

/**
 * Render the radial-bar (polar) layer into the provided bounds with theme support.
 * Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` (center + radius) and IGNORES the
 * injected cartesian `scales`: `outerRadius = min(w, h) / 2`, `innerRadius` is a ratio of
 * it, and every value maps to a radius via a linear `[0, max] → [innerR, outerR]` scale.
 * One primitive fans out across six catalog types: `mark: 'bar'` draws one `d3.arc()` per
 * datum (Radial Bar / Radial Histogram / Polar Area / Nightingale rose / coxcomb),
 * `mark: 'area'` a closed `d3.areaRadial()` + outline per series (Radial Line / Area), and
 * `mark: 'cell'` a grid of arc cells whose fill opacity encodes value (Circular Heat Map).
 * Only the ACTIVE mark's data is built, and all three joins run every render, so a runtime
 * `mark` toggle exits the inactive marks cleanly.
 *
 * Opt-in labels (`showLabels`) ride a FOURTH join on the bar key, drawn either along the
 * bar's radius (`labelPosition: 'inside'`, styled from `theme.label` with automatic on-fill
 * contrast) or horizontally on a ring just past the perimeter (`'outside'`, styled from the
 * surface-tracking `theme.labelOutside`, with `labelGutter` px taken off the outer radius so
 * the ring stays inside the clipped plot area). `mark: 'bar'` only — an `'area'` has no
 * per-datum mark to annotate, and a `'cell'` encodes value as fill OPACITY, which the
 * luminance-based label-colour derivation cannot see.
 */
export function renderRadialBarLayer(
  context: NgeChartLayerContext<
    NgeRadialBarDataPoint,
    NgeRadialBarLayerConfig,
    NgeRadialBarLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    bounds
      ?.selectAll(RADIAL_BAR_SELECTOR)
      .interrupt()
      .interrupt('opacity-fade')
      .interrupt('cell-geom')
      .interrupt('series-opacity')
      .remove();
    return;
  }

  const theme = mergeRadialBarLayerTheme(context.theme);

  const mark = config.mark ?? 'bar';

  // Outside labels ring the whole chart and are drawn INSIDE the plot area — the layers
  // group is clipped to it, so the band they occupy has to come off the chart's own radius
  // (the pie / funnel layers solve the same problem the same way). Keyed off `labelPosition`
  // and the mark alone, not `showLabels`, so toggling labels never resizes the chart.
  const outsideLabels = mark === 'bar' && (config.labelPosition ?? 'inside') === 'outside';
  const labelGutter = outsideLabels
    ? Math.max(0, config.labelGutter ?? DEFAULT_OUTSIDE_LABEL_GUTTER)
    : 0;

  // Self-scaled geometry: center in the bounded area, size the outer radius to the
  // smaller half-dimension, and read innerRadius as a ratio of it (0 → start at center).
  const cx = dimensions.boundedWidth / 2;
  const cy = dimensions.boundedHeight / 2;
  const outerRadius = applyRadiusRatio(
    Math.max(0, Math.min(dimensions.boundedWidth, dimensions.boundedHeight) / 2 - labelGutter),
    config.radiusRatio
  );
  // `innerRadius` is a 0–1 ratio of the outer radius; clamp into [0, 1) so a stray value
  // ≥ 1 can't invert the radial scale (innerR ≥ outerR). Angles stay free (sweeps/gauges).
  const innerRatio = Math.max(0, Math.min(config.innerRadius ?? 0, 1 - 1e-6));
  const innerRadiusPx = innerRatio * outerRadius;

  // Category labels in first-seen order (the angular band domain + bar/area join keys).
  const labels = uniqueInOrder(data.map(d => d.label));

  // Radial value scale (shared by every mark): [0, max] → [innerR, outerR]. Every value is
  // sanitized (safeValue) so a NaN / ±Infinity datum can't poison maxValue (→ NaN domain,
  // wrongly falling back to 1) — it collapses to 0, exactly like a negative.
  const maxValue = Math.max(0, ...data.map(d => safeValue(d.value)));
  const domainMax = maxValue > 0 ? maxValue : 1;
  const radialScale = scaleLinear().domain([0, domainMax]).range([innerRadiusPx, outerRadius]);

  const palette = config.seriesColors?.length ? config.seriesColors : theme.bar.colors;

  // Interrupt any running transitions (unnamed + the named cell/area ones) before
  // recomputing the joins, so a rapid re-render can't overlap a stale transition.
  bounds
    .selectAll(RADIAL_BAR_SELECTOR)
    .interrupt()
    .interrupt('opacity-fade')
    .interrupt('cell-geom')
    .interrupt('series-opacity');

  // Container group, centered in the bounded area (mirrors pie/sunburst).
  let container = bounds.select<SVGGElement>('.nge-radial-bar-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-radial-bar-container', true);
  }
  container.attr('transform', `translate(${cx},${cy})`);

  const params: RadialBarRenderParams = {
    animation,
    config,
    cx,
    cy,
    dimensions,
    domainMax,
    endAngle: config.endAngle ?? 2 * Math.PI,
    host: bounds.node(),
    innerRadiusPx,
    labels,
    margins,
    outerRadius,
    palette,
    radialScale,
    startAngle: config.startAngle ?? 0,
    theme,
    tooltipConfig,
    tooltipHandlers,
  };

  // Build ONLY the active mark's data so the inactive joins exit cleanly on a mark toggle.
  const barMarks = mark === 'bar' ? buildBarMarks(data, params) : [];
  const cellMarks = mark === 'cell' ? buildCellMarks(data, params) : [];
  const areaSeries = mark === 'area' ? buildAreaSeries(data, params) : [];

  renderBars(container, barMarks, params);
  renderCells(container, cellMarks, params);
  renderAreas(container, areaSeries, params);
  // Last, so the raised label group lands at the end of the container and no freshly
  // entered mark can paint over a label. A non-bar mark passes an empty set, so switching
  // away from `mark: 'bar'` exits every label cleanly.
  renderBarLabels(container, barMarks, params);
}

/** Distinct values of an array preserving first-seen order. */
function uniqueInOrder<T>(values: T[]): T[] {
  const seen = new Set<T>();
  const out: T[] = [];
  for (const value of values) {
    if (!seen.has(value)) {
      seen.add(value);
      out.push(value);
    }
  }
  return out;
}

/**
 * Sanitize a datum `value` for geometry. A non-finite value (`NaN` / `±Infinity`) or a
 * negative collapses to `0` — so it can never poison `maxValue` (a single `NaN` would make
 * `domainMax` fall back to 1 and blow every other bar past `outerRadius`) nor produce a
 * `radialScale(NaN)` → broken `d`. EVERY geometry read of a datum value goes through this.
 */
function safeValue(value: number): number {
  return Number.isFinite(value) ? Math.max(0, value) : 0;
}

/** Resolve a mark fill: per-datum color → palette by index → the single-mark fallback. */
function fillFor(
  datum: NgeRadialBarDataPoint,
  index: number,
  palette: string[],
  fallback: string
): string {
  return datum.color ?? palette[index % palette.length] ?? fallback;
}

/** Equal angular bands across `[startAngle, endAngle]`, one per label (Polar Area / grid). */
function equalBands(params: RadialBarRenderParams): Map<string, AngularBand> {
  const { endAngle, labels, startAngle } = params;
  const band = scaleBand<string>().domain(labels).range([startAngle, endAngle]);
  const bandwidth = band.bandwidth();
  const map = new Map<string, AngularBand>();
  for (const label of labels) {
    const start = band(label) ?? startAngle;
    map.set(label, { center: start + bandwidth / 2, end: start + bandwidth, start });
  }
  return map;
}

/** Value-proportional angular bands (cumulative, `d3.pie()`-style), index-aligned to `data`. */
function valueBands(data: NgeRadialBarDataPoint[], params: RadialBarRenderParams): AngularBand[] {
  const { endAngle, startAngle } = params;
  const arcs = pie<NgeRadialBarDataPoint>()
    .value(d => safeValue(d.value))
    .sort(null)
    .startAngle(startAngle)
    .endAngle(endAngle)(data);
  return arcs.map(a => ({
    center: (a.startAngle + a.endAngle) / 2,
    end: a.endAngle,
    start: a.startAngle,
  }));
}

/**
 * Resolve every bar to its arc geometry + fill. `wedge: 'value'` makes each bar's angular
 * extent proportional to its value; `wedge: 'equal'` (default) gives every bar the same
 * angular slot. Both map `value` to the outer radius via the shared radial scale.
 */
function buildBarMarks(
  data: NgeRadialBarDataPoint[],
  params: RadialBarRenderParams
): RadialBarArcMark[] {
  const { innerRadiusPx, palette, radialScale, theme } = params;
  const wedge = params.config.wedge ?? 'equal';

  const bandFor: (datum: NgeRadialBarDataPoint, index: number) => AngularBand =
    wedge === 'value'
      ? (() => {
          const bands = valueBands(data, params);
          return (_datum, index) => bands[index];
        })()
      : (() => {
          const bands = equalBands(params);
          return datum => bands.get(datum.label) ?? { center: 0, end: 0, start: 0 };
        })();

  return data.map((datum, index) => {
    const band = bandFor(datum, index);
    return {
      a0: band.start,
      a1: band.end,
      color: fillFor(datum, index, palette, theme.bar.color),
      datum,
      index,
      innerR: innerRadiusPx,
      label: datum.label,
      outerR: radialScale(safeValue(datum.value)),
    };
  });
}

/**
 * Resolve every cell (angular `label` × radial `band`) to its arc geometry + fill opacity.
 * The angular columns are always equal (a circular heatmap needs uniform spacing); the
 * radial rings come from a band scale over the distinct `band` keys; value maps to fill
 * OPACITY from the `minOpacity` floor to 1 (so it composes with an unresolved token fill).
 */
function buildCellMarks(
  data: NgeRadialBarDataPoint[],
  params: RadialBarRenderParams
): RadialCellMark[] {
  const { domainMax, innerRadiusPx, outerRadius, theme } = params;
  const angular = equalBands(params);
  const ringKeys = uniqueInOrder(data.map(d => String(d.band ?? '')));
  const ring = scaleBand<string>().domain(ringKeys).range([innerRadiusPx, outerRadius]);
  const ringWidth = ring.bandwidth();
  const { minOpacity } = theme.cell;

  return data.map((datum, index) => {
    const a = angular.get(datum.label) ?? { center: 0, end: 0, start: 0 };
    const ringKey = String(datum.band ?? '');
    const innerR = ring(ringKey) ?? innerRadiusPx;
    const norm = safeValue(datum.value) / domainMax;
    return {
      a0: a.start,
      a1: a.end,
      color: datum.color ?? theme.cell.color,
      datum,
      index,
      innerR,
      key: `${datum.label}${KEY_SEP}${ringKey}`,
      opacity: minOpacity + (1 - minOpacity) * norm,
      outerR: innerR + ringWidth,
    };
  });
}

/**
 * Group the data into radial-area series by `seriesId` (first-seen order), each carrying
 * its category vertices ordered by angular position. Series color cycles the palette by
 * series index.
 */
function buildAreaSeries(
  data: NgeRadialBarDataPoint[],
  params: RadialBarRenderParams
): RadialAreaSeries[] {
  const { labels, palette } = params;
  const angular = equalBands(params);

  const order: string[] = [];
  const groups = new Map<string, NgeRadialBarDataPoint[]>();
  for (const datum of data) {
    const id = datum.seriesId ?? DEFAULT_SERIES_ID;
    let bucket = groups.get(id);
    if (!bucket) {
      bucket = [];
      groups.set(id, bucket);
      order.push(id);
    }
    bucket.push(datum);
  }

  return order.map((id, index) => {
    const points = (groups.get(id) ?? [])
      .filter(datum => angular.has(datum.label))
      .map(datum => ({
        angle: (angular.get(datum.label) as AngularBand).center,
        datum,
        value: safeValue(datum.value),
      }))
      .sort((left, right) => labels.indexOf(left.datum.label) - labels.indexOf(right.datum.label));
    return { color: palette[index % palette.length], id, index, points };
  });
}

/** The arc geometry a mark draws at rest. */
function geomOf(mark: RadialArcMark): ArcGeom {
  return {
    endAngle: mark.a1,
    innerRadius: mark.innerR,
    outerRadius: mark.outerR,
    startAngle: mark.a0,
  };
}

/** The collapsed (zero radial length) birth geometry a bar grows out from. */
function birthGeom(mark: RadialArcMark): ArcGeom {
  return { ...geomOf(mark), outerRadius: mark.innerR };
}

/** The mark centroid in the container's local (center-origin) coords. */
function centroidLocal(mark: RadialArcMark): [number, number] {
  const angle = (mark.a0 + mark.a1) / 2;
  const r = (mark.innerR + mark.outerR) / 2;
  return [r * Math.sin(angle), -r * Math.cos(angle)];
}

/**
 * Render the radial bars as a keyed enter/update/exit arc join. New bars are born
 * collapsed at the inner radius and grow out to `radialScale(value)` via an arc-tween
 * (mirrors sunburst); survivors morph on update; removed bars fade out. Fills / handlers
 * are (re)applied on the merged selection every render so a theme change reaches survivors.
 */
function renderBars(
  container: Selection<SVGGElement, unknown, null, undefined>,
  marks: RadialBarArcMark[],
  params: RadialBarRenderParams
): void {
  const { animation, theme } = params;
  const arcGen = arc<ArcGeom>()
    .startAngle(g => g.startAngle)
    .endAngle(g => g.endAngle)
    .innerRadius(g => g.innerRadius)
    .outerRadius(g => g.outerRadius)
    .padAngle(params.config.padAngle ?? 0);

  function arcTween(this: SVGPathElement, mark: RadialBarArcMark): (t: number) => string {
    const node = this as RadialArcNode;
    const target = geomOf(mark);
    const start = node._current ?? birthGeom(mark);
    const interpolator = interpolate(start, target);
    return (t: number) => {
      const interpolated = interpolator(t);
      node._current = interpolated;
      return arcGen(interpolated) ?? '';
    };
  }

  const bars = container
    .selectAll<SVGPathElement, RadialBarArcMark>('.nge-radial-bar-arc')
    .data(marks, d => d.label);

  bars
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const entered = bars
    .enter()
    .append('path')
    .classed('nge-radial-bar-arc', true)
    .each(function (mark) {
      (this as RadialArcNode)._current = birthGeom(mark);
    });

  entered.transition().duration(animation.enterMs).ease(animation.easing).attrTween('d', arcTween);
  bars.transition().duration(animation.updateMs).ease(animation.easing).attrTween('d', arcTween);

  const merged = entered.merge(bars);
  merged
    .style('fill', d => d.color)
    .style('stroke', theme.bar.stroke)
    .style('stroke-width', theme.bar.strokeWidth)
    .style('opacity', theme.bar.opacity);

  wireArcInteraction(merged, params);
}

/**
 * Render the opt-in per-bar labels as a SEPARATE keyed join from the arcs (the funnel /
 * pie / sunburst pattern), on the same `label` key — so a bar and its label keep one
 * shared identity across data changes while entering, updating and exiting on their own
 * schedule. Labels live in their own group, raised to the end of the container each render
 * so a freshly entered arc can never paint over one.
 *
 * **Placement — two conventions, picked by `labelPosition`.**
 * `'inside'` puts the text ON the bar at its mid-radius, running ALONG the radius
 * (`rotate(mid − 90)`, with the left hemisphere flipped a further 180° so nothing reads
 * upside-down) — the sunburst convention. A wedge's arc is narrow near the center and its
 * length is what varies with the data, so running the text radially is the orientation that
 * survives both. `'outside'` instead leaves the text horizontal on a fixed ring just beyond
 * the chart's outer radius, anchored away from the center — a category ring, the radar
 * layer's axis-label convention. The gutter that keeps that ring inside the clipped plot
 * area is reserved from the outer radius by the caller.
 *
 * **Colour + typography come from whichever slice matches the placement**, because the two
 * have opposite backdrops: an on-bar label sits on a fill drawn from the palette (a RANGE,
 * so it derives per datum against its own bar), while an outside label sits on the plot
 * surface and must not derive — `theme.labelOutside` declares no `colorOnDark`, which makes
 * `resolveLabelColor` short-circuit to its surface-tracking `color`, and the empty `fill`
 * passed alongside keeps that intent obvious at the call site.
 *
 * **Suppression filters the DATA, not visibility**, so a bar that shrinks past a threshold
 * exits cleanly and re-enters when the data grows it back.
 */
function renderBarLabels(
  container: Selection<SVGGElement, unknown, null, undefined>,
  marks: RadialBarArcMark[],
  params: RadialBarRenderParams
): void {
  const { animation, config, host, outerRadius, theme } = params;

  const isOutside = (config.labelPosition ?? 'inside') === 'outside';
  const labelTheme = isOutside ? theme.labelOutside : theme.label;

  let labelGroup = container.select<SVGGElement>('.nge-radial-bar-labels');
  if (labelGroup.empty()) {
    labelGroup = container.append('g').classed('nge-radial-bar-labels', true);
  }
  labelGroup.raise();

  // The angle threshold only defaults to a non-zero value for ON-BAR labels, where the text
  // has to fit within the wedge; outside placement removes that constraint. An explicit
  // config value is honoured in BOTH modes, and the separate `> 0` guard keeps a zero-sweep
  // bar unlabelled either way — a threshold of 0 must not put text on a bar nobody can see.
  const minLabelAngle = config.minLabelAngle ?? (isOutside ? 0 : DEFAULT_MIN_LABEL_ANGLE);
  const minLabelSize = config.minLabelSize ?? DEFAULT_MIN_LABEL_SIZE;

  const labelData = config.showLabels
    ? marks.filter(mark => {
        const sweep = mark.a1 - mark.a0;
        if (sweep <= 0 || sweep < minLabelAngle) {
          return false;
        }
        // Absolute-size rule, in whichever direction the text runs. The arc half bounds the
        // cap-height in both modes (measured at the label's own radius); the radial half is
        // the thin-BAR rule and applies only to text drawn along the bar.
        const labelRadius = isOutside ? outerRadius : (mark.innerR + mark.outerR) / 2;
        if (sweep * labelRadius < minLabelSize) {
          return false;
        }
        return isOutside || mark.outerR - mark.innerR >= minLabelSize;
      })
    : [];

  const placementFor = (mark: RadialBarArcMark): RadialBarLabelPlacement => {
    const midAngle = (mark.a0 + mark.a1) / 2;

    if (isOutside) {
      // d3 arc angles start at 12 o'clock and run clockwise, so the outward direction is
      // (sin, −cos). Anchor by the horizontal component so the text always reads away from
      // the chart; a label at dead top / bottom centers instead of tipping either way.
      const radius = outerRadius + OUTSIDE_LABEL_OFFSET;
      const dx = Math.sin(midAngle);
      return {
        anchor: Math.abs(dx) < 1e-6 ? 'middle' : dx > 0 ? 'start' : 'end',
        rotate: 0,
        x: radius * dx,
        y: -radius * Math.cos(midAngle),
      };
    }

    // The classic radial label: `rotate(mid − 90) translate(r, 0) rotate(flip)`, folded into
    // one anchor + rotation so the update tween has plain numbers to interpolate.
    const deg = normaliseDegrees((midAngle * 180) / Math.PI);
    const baseline = deg - 90;
    const flip = deg < 180 ? 0 : 180;
    const radians = (baseline * Math.PI) / 180;
    const radius = (mark.innerR + mark.outerR) / 2;
    return {
      anchor: 'middle',
      rotate: normaliseDegrees(baseline + flip),
      x: radius * Math.cos(radians),
      y: radius * Math.sin(radians),
    };
  };

  // An on-bar label is bounded by the bar it runs along; an outside label sits on open
  // surface, and a non-positive width opts it out of elision entirely.
  const maxTextWidthFor = (mark: RadialBarArcMark): number =>
    isOutside ? 0 : mark.outerR - mark.innerR;

  const labelFillFor = (mark: RadialBarArcMark): string =>
    resolveLabelColor({
      configColor: config.labelColor,
      datumColor: mark.datum.labelColor,
      fill: isOutside ? '' : mark.color,
      node: host,
      theme: labelTheme,
    });

  // Interrupt in-flight label transitions before joining — same reason the arc join does it
  // (ARCH-194). Labels fade in from opacity 0, so a re-render landing mid-fade would
  // otherwise strand one semi-transparent or fully invisible.
  labelGroup.selectAll('.nge-radial-bar-label').interrupt();

  const labels = labelGroup
    .selectAll<SVGTextElement, RadialBarArcMark>('.nge-radial-bar-label')
    .data(labelData, d => d.label);

  labels
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const entered = labels
    .enter()
    .append('text')
    .classed('nge-radial-bar-label', true)
    .attr('data-label', d => d.label)
    .attr('dominant-baseline', 'middle')
    // Labels sit on top of their own bar — let hover / click fall through to the arc.
    .style('pointer-events', 'none')
    .style('opacity', 0)
    .each(function (d) {
      (this as RadialBarLabelNode)._current = placementFor(d);
    })
    .attr('transform', d => labelTransform(placementFor(d)));

  entered.transition().duration(animation.enterMs).ease(animation.easing).style('opacity', 1);

  // Survivors re-assert full opacity SYNCHRONOUSLY (entering labels are excluded — they are
  // still fading in above). Without this, a label whose fade was interrupted by a re-render
  // keeps whatever partial opacity it was killed at, and never recovers.
  labels.style('opacity', 1);

  // Re-apply anchor + text + styles on the MERGED selection so a runtime theme /
  // labelPosition / formatLabel change reaches already-rendered labels, not just freshly
  // entered ones. The text is set before eliding because elision measures the rendered
  // string.
  entered
    .merge(labels)
    .attr('text-anchor', d => placementFor(d).anchor)
    .style('fill', labelFillFor)
    .style('font-size', toCssFontSize(labelTheme.fontSize))
    .style('font-weight', labelTheme.fontWeight)
    .each(function (d) {
      elideLabelText(this, config.formatLabel?.(d.datum) ?? d.label, maxTextWidthFor(d));
    });

  /**
   * Slide a survivor to its new anchor as the bar it names grows or shrinks. Written as an
   * explicit tween over the anchor's own numbers rather than left to d3's automatic
   * `transform` interpolator, which decomposes the attribute through
   * `node.transform.baseVal` — a path that gives an anchor-then-rotate placement a
   * matrix-decomposed detour, and that jsdom does not implement at all.
   *
   * `rotate` snaps to the target instead of interpolating: a label crossing the hemisphere
   * boundary flips by 180°, and interpolating that would spin the text on its way over.
   */
  function placementTween(this: SVGTextElement, d: RadialBarArcMark): (t: number) => string {
    const node = this as RadialBarLabelNode;
    const target = placementFor(d);
    const start = node._current ?? target;
    const interpolator = interpolate({ x: start.x, y: start.y }, { x: target.x, y: target.y });
    return (t: number) => {
      const { x, y } = interpolator(t);
      node._current = { anchor: target.anchor, rotate: target.rotate, x, y };
      return labelTransform(node._current);
    };
  }

  labels
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attrTween('transform', placementTween);
}

/**
 * Render the circular-heatmap cells as a keyed enter/update/exit arc join. Cells take
 * their final geometry synchronously (smear-free first paint, testable without flushing)
 * and fade in on enter; fill + value-driven fill-opacity are re-applied on the merged
 * selection every render.
 */
function renderCells(
  container: Selection<SVGGElement, unknown, null, undefined>,
  marks: RadialCellMark[],
  params: RadialBarRenderParams
): void {
  const { animation, theme } = params;
  const arcGen = arc<ArcGeom>()
    .startAngle(g => g.startAngle)
    .endAngle(g => g.endAngle)
    .innerRadius(g => g.innerRadius)
    .outerRadius(g => g.outerRadius);

  const cells = container
    .selectAll<SVGPathElement, RadialCellMark>('.nge-radial-bar-cell')
    .data(marks, d => d.key);

  cells
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const entered = cells
    .enter()
    .append('path')
    .classed('nge-radial-bar-cell', true)
    .style('opacity', 0)
    .attr('d', d => arcGen(geomOf(d)) ?? '');

  entered
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  // Update survivors: re-place + re-assert opacity → 1 via the transition (never a
  // synchronous set, which would pre-empt an entering cell's fade). Geometry via a plain
  // `.attr('d', …)` on the transition — d3 string-interpolates the path, so a ring/value
  // change eases to its new shape (cells carry no cached `_current`; only bars tween one).
  cells
    .transition('cell-geom')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1)
    .attr('d', d => arcGen(geomOf(d)) ?? '');

  const merged = entered.merge(cells);
  merged
    .style('fill', d => d.color)
    .style('fill-opacity', d => d.opacity)
    .style('stroke', theme.cell.stroke)
    .style('stroke-width', theme.cell.strokeWidth);

  wireArcInteraction(merged, params);
}

/**
 * Render the radial-area series as a keyed series-group join. Each series draws a closed
 * `areaRadial` fill (baseline = inner radius, outer = `radialScale(value)`) and, over it,
 * a closed `lineRadial` outline; both are placed synchronously and the entering group
 * fades in (the area-layer pattern). Invisible per-vertex targets carry the tooltip/click.
 */
function renderAreas(
  container: Selection<SVGGElement, unknown, null, undefined>,
  seriesArray: RadialAreaSeries[],
  params: RadialBarRenderParams
): void {
  const { animation } = params;

  const seriesGroups = container
    .selectAll<SVGGElement, RadialAreaSeries>('.nge-radial-bar-series')
    .data(seriesArray, d => d.id);

  seriesGroups
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enterGroups = seriesGroups
    .enter()
    .append('g')
    .classed('nge-radial-bar-series', true)
    .attr('data-series-id', d => d.id)
    .style('opacity', 0);

  enterGroups.each(function (series) {
    renderAreaSeriesShapes(select<SVGGElement, RadialAreaSeries>(this), series, params);
  });

  enterGroups
    .transition('opacity-fade')
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', 1);

  seriesGroups.each(function (series) {
    renderAreaSeriesShapes(select<SVGGElement, RadialAreaSeries>(this), series, params);
  });

  seriesGroups
    .transition('series-opacity')
    .duration(animation.updateMs)
    .ease(animation.easing)
    .style('opacity', 1);
}

/** Draw / update one series' area fill + outline + interaction targets. */
function renderAreaSeriesShapes(
  group: Selection<SVGGElement, RadialAreaSeries, null, undefined>,
  series: RadialAreaSeries,
  params: RadialBarRenderParams
): void {
  const { innerRadiusPx, radialScale, theme } = params;

  const areaGen = areaRadial<RadialAreaVertex>()
    .angle(d => d.angle)
    .innerRadius(() => innerRadiusPx)
    .outerRadius(d => radialScale(d.value))
    .curve(curveLinearClosed);

  const lineGen = lineRadial<RadialAreaVertex>()
    .angle(d => d.angle)
    .radius(d => radialScale(d.value))
    .curve(curveLinearClosed);

  let areaPath = group.select<SVGPathElement>('.nge-radial-bar-area');
  if (areaPath.empty()) {
    areaPath = group
      .insert('path', ':first-child')
      .classed('nge-radial-bar-area', true)
      .style('pointer-events', 'none');
  }
  areaPath
    .attr('d', areaGen(series.points))
    .style('fill', series.color)
    .style('fill-opacity', theme.area.fillOpacity);

  let linePath = group.select<SVGPathElement>('.nge-radial-bar-line');
  if (linePath.empty()) {
    linePath = group
      .append('path')
      .classed('nge-radial-bar-line', true)
      .style('fill', 'none')
      .style('pointer-events', 'none');
  }
  linePath
    .attr('d', lineGen(series.points))
    .style('stroke', series.color)
    .style('stroke-width', theme.area.lineWidth);

  renderAreaInteractionPoints(group, series, params);
}

/**
 * Render invisible per-vertex hover/click targets at each series vertex (the tooltip /
 * click surface for the area — the fill keeps `pointer-events: none`). Only built when the
 * layer is interactive.
 */
function renderAreaInteractionPoints(
  group: Selection<SVGGElement, RadialAreaSeries, null, undefined>,
  series: RadialAreaSeries,
  params: RadialBarRenderParams
): void {
  const { config, radialScale, tooltipConfig, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);
  const interactive = tooltipEnabled || Boolean(config.onClick);
  const vertices = interactive ? series.points : [];

  const points = group
    .selectAll<SVGCircleElement, RadialAreaVertex>('.nge-radial-bar-point')
    .data(vertices, v => v.datum.label);

  const enterPoints = points
    .enter()
    .append('circle')
    .classed('nge-radial-bar-point', true)
    .attr('r', AREA_HOVER_RADIUS)
    .style('fill', 'transparent')
    .style('stroke', 'none');

  points.exit().remove();

  const merged = enterPoints.merge(points);
  merged
    .attr('cx', v => radialScale(v.value) * Math.sin(v.angle))
    .attr('cy', v => -radialScale(v.value) * Math.cos(v.angle))
    .style('cursor', interactive ? 'pointer' : 'default');

  if (tooltipEnabled) {
    merged
      .on('mouseenter', (_event: PointerEvent, v: RadialAreaVertex) => {
        const local: [number, number] = [
          radialScale(v.value) * Math.sin(v.angle),
          -radialScale(v.value) * Math.cos(v.angle),
        ];
        emitTooltip(v.datum, local, params);
      })
      .on('mouseleave', () => emitTooltipHidden(params));
  } else {
    merged.on('mouseenter', null).on('mouseleave', null);
  }

  if (config.onClick) {
    merged.on('click', (event: PointerEvent, v: RadialAreaVertex) => {
      config.onClick!({ data: v.datum, event, index: series.points.indexOf(v) });
    });
  } else {
    merged.on('click', null);
  }
}

/**
 * Wire cursor / hover (tooltip) / click on an interactive arc selection (bars or cells).
 * The tooltip anchors at the arc centroid; the click payload carries the source datum + its
 * `config.data` index. Handlers are (re)attached every render so a config change is honored.
 */
function wireArcInteraction<T extends RadialArcMark>(
  selection: Selection<SVGPathElement, T, SVGGElement, unknown>,
  params: RadialBarRenderParams
): void {
  const { config, tooltipConfig, tooltipHandlers } = params;
  const tooltipEnabled = Boolean(tooltipConfig?.enabled && tooltipHandlers?.onTooltip);

  selection.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  if (tooltipEnabled) {
    selection
      .on('mouseenter', (_event: PointerEvent, mark: T) =>
        emitTooltip(mark.datum, centroidLocal(mark), params)
      )
      .on('mouseleave', () => emitTooltipHidden(params));
  } else {
    selection.on('mouseenter', null).on('mouseleave', null);
  }

  if (config.onClick) {
    selection.on('click', (event: PointerEvent, mark: T) => {
      config.onClick!({ data: mark.datum, event, index: mark.index });
    });
  } else {
    selection.on('click', null);
  }
}

/** Format + emit a tooltip event for a datum anchored above a container-local point. */
function emitTooltip(
  datum: NgeRadialBarDataPoint,
  local: [number, number],
  params: RadialBarRenderParams
): void {
  const { tooltipConfig, tooltipHandlers } = params;
  if (!tooltipConfig?.formatContent || !tooltipHandlers?.onTooltip) {
    return;
  }
  const event = pointTooltipEvent(local[0], local[1], tooltipConfig.formatContent(datum), params);
  if (event) {
    tooltipHandlers.onTooltip(event);
  }
}

/** Emit the hide-tooltip event on mouseleave. */
function emitTooltipHidden(params: RadialBarRenderParams): void {
  const { tooltipConfig, tooltipHandlers } = params;
  if (!tooltipConfig || !tooltipHandlers?.onTooltip) {
    return;
  }
  tooltipHandlers.onTooltip({
    content: { label: '', value: '' },
    dimensions: { height: tooltipConfig.height, width: tooltipConfig.width },
    divotPosition: 'bottom',
    position: { divotX: 0, x: 0, y: 0 },
    visible: false,
  });
}

/**
 * Build a tooltip event anchored above a container-local point `(localX, localY)` (origin
 * at the chart center), positioned in full-SVG coords (center offset + margins) and clamped
 * to the chart bounds — mirrors the pie/sunburst divot/clamp structure.
 */
function pointTooltipEvent(
  localX: number,
  localY: number,
  content: NgeTooltipContent,
  params: RadialBarRenderParams
): NgeTooltipEvent | null {
  const { cx, cy, dimensions, margins, tooltipConfig } = params;
  if (!tooltipConfig) {
    return null;
  }

  const tooltipWidth = tooltipConfig.width;
  const tooltipHeight = tooltipConfig.height;
  const centerX = margins.left + cx + localX;

  const minTooltipX = margins.left;
  const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;
  const idealTooltipX = centerX - tooltipWidth / 2;
  const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

  const containerHeight = margins.top + dimensions.boundedHeight + margins.bottom;
  const rawTooltipY = margins.top + cy + localY - tooltipHeight - 10;
  const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

  const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
  const rx = 4;
  const targetTipX = centerX - tooltipX;
  const idealDivotX = targetTipX - divotWidth / 2;
  const minDivotX = rx;
  const maxDivotX = tooltipWidth - rx - divotWidth;
  const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
  const divotCenterX = divotX + divotWidth / 2;
  const divotTipOffset = targetTipX - divotCenterX;

  return {
    content,
    dimensions: { height: tooltipHeight, width: tooltipWidth },
    divotPosition: 'bottom' as const,
    position: {
      divotTipOffset: Math.round(divotTipOffset),
      divotX: Math.round(divotX),
      x: Math.round(tooltipX),
      y: Math.round(tooltipY),
    },
    style: tooltipConfig.style,
    visible: true,
  };
}
