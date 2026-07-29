import type { NgeChartAnimationConfig } from '../animation';
import type {
  NgeChartBaseConfig,
  NgeChartScales,
} from '../base-layout/nge-chart-base-layout.models';
import type { NgeChartDimensions } from '../chart.models';
import type { NgeChartGesturesConfig } from '../gesture/nge-chart-gesture.models';
import type {
  NgeChartLayerClickEvent,
  NgeChartLayerRenderFn,
} from '../layer/nge-chart-layer.types';
import type { NgeChartLegendConfig } from '../legend/nge-chart-legend.models';
import type { NgeChartTheme } from '../theme/nge-chart-theme.models';
import type { NgeTooltipConfig } from '../tooltip';

/**
 * Factory function type for creating chart scales.
 * Allows custom scale creation logic to be injected.
 */
export type NgeChartScaleFactory = (
  config: NgeChartConfig,
  dimensions: NgeChartDimensions
) => NgeChartScales;

/**
 * Supported layer types.
 * Each type maps to a specific render function.
 */
export type NgeChartLayerType =
  | 'area'
  | 'bar'
  | 'bullet'
  | 'bump'
  | 'chord'
  | 'distribution'
  | 'diverging-bar'
  | 'financial'
  | 'funnel'
  | 'gauge'
  | 'grouped-bar'
  | 'heatmap'
  | 'histogram'
  | 'line'
  | 'lollipop'
  | 'network'
  | 'overlay'
  | 'parallel-coords'
  | 'pie'
  | 'proportional'
  | 'radar'
  | 'radial-bar'
  | 'sankey'
  | 'scatter'
  | 'stacked-bar'
  | 'sunburst'
  | 'timeline'
  | 'tree'
  | 'treemap'
  | 'waterfall'
  | 'wordcloud';

/**
 * Bar layer configuration
 */
export interface NgeBarLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  barPadding?: number;
  barRadius?: number;
  data: NgeBarDataPoint[];
  /**
   * Value-label colour for EVERY bar — rung 2 of the label-colour chain (per-datum →
   * layer config → `theme.bar.label.color`). Bar value labels are drawn on the plot
   * surface just outside the bar, not on its fill, so this layer has no derived
   * on-fill contrast rung; a per-datum `labelColor` still wins over it.
   */
  labelColor?: string;
  /** Format function for value labels displayed on bars */
  labelFormat?: (value: number) => string;
  onClick?: (event: NgeChartLayerClickEvent<NgeBarDataPoint>) => void;
  orientation?: 'horizontal' | 'vertical';
  /** Renderer function. Import `renderBarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeBarDataPoint, NgeBarLayerConfig, any>;
  showLabels?: boolean;
  showMeanLine?: boolean;
  showMedianLine?: boolean;
  /**
   * Draw a horizontal rule at the value-scale zero baseline (a vertical rule for
   * horizontal bars). Opt-in — used to make a diverging bar series (e.g. win-loss)
   * read clearly by anchoring wins above / losses below a visible midline.
   */
  showZeroLine?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeBarDataPoint>>;
  type: 'bar';
}

/**
 * Line layer configuration
 */
export interface NgeLineLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Area fill opacity (0-1). Only applies when showArea is true */
  areaOpacity?: number;
  /** Curve interpolation type */
  curveType?: 'basis' | 'linear' | 'monotone' | 'step';
  /** Data points to render */
  data: NgeLineDataPoint[];
  /** Line stroke width in pixels */
  lineWidth?: number;
  /** Click handler for data points */
  onClick?: (event: NgeChartLayerClickEvent<NgeLineDataPoint>) => void;
  /** Radius of data points in pixels */
  pointRadius?: number;
  /** Renderer function. Import `renderLineLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeLineDataPoint, NgeLineLayerConfig, any>;
  /** Color palette for multi-series. Series index maps to colors[index % length] */
  seriesColors?: string[];
  /** Fill area under the line */
  showArea?: boolean;
  /** Show circles at data points */
  showPoints?: boolean;
  /** Tooltip configuration */
  tooltip?: Partial<NgeTooltipConfig<NgeLineDataPoint>>;
  type: 'line';
  /**
   * Use secondary Y axis (y2) for this layer.
   * When true, the line will be scaled against scales.y2 instead of scales.y.
   * Requires scales.y2 to be defined in the chart's scaleFactory.
   * @default false
   */
  useSecondaryAxis?: boolean;
}

/** Which analytical annotation the overlay layer draws — the primary render discriminator. */
export type NgeOverlayMode = 'control' | 'fan' | 'trendline';

/**
 * Overlay (analytical-annotation) layer configuration.
 *
 * A composable annotation drawn OVER a host line / scatter series to answer an
 * analytical question about it, seated on the same shared cartesian scales. One
 * primitive fans out across three modes via `mode`: `'trendline'` fits and strokes a
 * reference trend (`fit: 'linear'` least-squares line or `fit: 'loess'` local
 * regression); `'control'` draws the series mean with symmetric ±`sigma`·σ
 * statistical-process-control limits (optionally shaded via `showControlBand`);
 * `'fan'` draws nested widening prediction-interval bands (one per `intervals` level)
 * that fan out to express growing forecast uncertainty. The layer computes purely from
 * its own `data` — `x` accepts a `Date`, epoch-ms `number`, or date `string` (coerced
 * to a number before fitting) — so it can annotate any host without reading the host's
 * data.
 */
export interface NgeOverlayLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Data points to fit / summarise — the series the overlay is computed from. */
  data: NgeOverlayDataPoint[];
  /** Trend fit method (`'trendline'` mode). Default `'linear'` (least-squares). */
  fit?: 'linear' | 'loess';
  /**
   * Prediction-interval levels in (0, 1), one widening band each (`'fan'` mode). A
   * higher level yields a wider band. Default `[0.5, 0.8, 0.95]`.
   */
  intervals?: number[];
  /** LOESS smoothing bandwidth in (0, 1] (`'trendline'` mode, `fit: 'loess'`). Default 0.3. */
  loessBandwidth?: number;
  /** Which annotation to draw. Selects which mode-specific fields below apply. */
  mode: NgeOverlayMode;
  /** Renderer function. Import `renderOverlayLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeOverlayDataPoint, NgeOverlayLayerConfig, any>;
  /** Restrict the overlay to one series when the source `data` is multi-series (by `seriesId`). */
  seriesId?: string;
  /** Shade the area between the control limits (`'control'` mode). Default false. */
  showControlBand?: boolean;
  /** Draw the fitted trend line (`'trendline'` mode). Default true. */
  showFitLine?: boolean;
  /** Control-limit half-width in standard deviations (`'control'` mode). Default 3. */
  sigma?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeOverlayDataPoint>>;
  type: 'overlay';
}

/**
 * Bump (rank-over-time) chart layer configuration.
 *
 * Extends the line layer to plot how a set of series RANK against each other over an
 * ordered x axis (time / sequence / category). Each datum carries the metric `value`;
 * the layer DERIVES a `1..N` rank per x-tick (highest value = rank 1 by default —
 * flip with `rankOrder: 'asc'`) unless a datum supplies an explicit `rank`. Series are
 * drawn as smooth (`curveBumpX`) rank lines with rank 1 pinned to the top; optional
 * per-point circles (`showPoints`) and end-of-line series labels (`showLabels`) aid
 * reading. Colour cycles the `seriesColors` / theme palette by series index.
 */
export interface NgeBumpLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Rank-line curve interpolation. Default `'bump'` (`curveBumpX`, symmetric S-bend). */
  curveType?: 'bump' | 'linear' | 'monotone';
  /** Data points to render — one `(seriesId, x, value)` observation each. */
  data: NgeBumpDataPoint[];
  /** Click handler for data points (points mode). */
  onClick?: (event: NgeChartLayerClickEvent<NgeBumpDataPoint>) => void;
  /** Radius of the per-point circles in pixels (when `showPoints`). */
  pointRadius?: number;
  /**
   * Direction the per-x-tick ranking runs. `'desc'` (default) ranks the highest
   * `value` as rank 1; `'asc'` ranks the lowest as rank 1.
   */
  rankOrder?: 'asc' | 'desc';
  /** Renderer function. Import `renderBumpLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeBumpDataPoint, NgeBumpLayerConfig, any>;
  /** Color palette for series. Series index maps to colors[index % length]. An empty array is treated as unset. */
  seriesColors?: string[];
  /** Draw the series label at the end (last x) of each rank line. Off unless set; the `createBumpChartConfig` preset defaults it on. */
  showLabels?: boolean;
  /** Draw circles at each rank position. Off unless set; the `createBumpChartConfig` preset defaults it on. */
  showPoints?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeBumpDataPoint>>;
  type: 'bump';
}

/**
 * Lollipop chart layer configuration.
 *
 * A stem line + end marker seated on the shared cartesian scales — one primitive
 * fanning out across a whole catalog family: **Lollipop** (stem + marker),
 * **Dot Plot / Dot Chart** (`showStem: false` ⇒ bare markers), **Dumbbell / Span**
 * (per-point `valueEnd` ⇒ two markers joined by a segment), and **Slope** (`connect`
 * ⇒ same-`seriesId` markers joined across categories). Categories sit on the band
 * axis (x when vertical, y when horizontal); the stem/marker read the linear value
 * axis. Value color resolves per-point `color` → `seriesColors[i]` → the theme
 * palette (by `seriesId` index) → the single-series marker color.
 */
export interface NgeLollipopLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Single-marker stem origin on the value axis. Default 0. */
  baseline?: number;
  /**
   * Join same-`seriesId` markers across categories into a slope line (ordered by
   * category position, through the primary `value` marker). Default false.
   */
  connect?: boolean;
  /** Data points to render — one lollipop / row per point. */
  data: NgeLollipopDataPoint[];
  /** Marker radius in pixels. Overrides `theme.lollipop.marker.radius`. */
  markerSize?: number;
  /** Click handler for markers. */
  onClick?: (event: NgeChartLayerClickEvent<NgeLollipopDataPoint>) => void;
  /** Category-axis orientation. `'vertical'` (default) puts categories on x. */
  orientation?: 'horizontal' | 'vertical';
  /** Renderer function. Import `renderLollipopLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeLollipopDataPoint, NgeLollipopLayerConfig, any>;
  /** Multi-series palette keyed by `seriesId` index. index maps to colors[index % length]. */
  seriesColors?: string[];
  /** Marker glyph. Default `'circle'`. */
  shape?: 'circle' | 'diamond' | 'square';
  /** Show per-point value labels near each marker. Default false. */
  showLabels?: boolean;
  /** Draw the stem / dumbbell connector. `false` ⇒ a bare dot plot. Default true. */
  showStem?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeLollipopDataPoint>>;
  type: 'lollipop';
}

/**
 * Area layer configuration.
 *
 * The fill is the primary mark: `fillOpacity` controls it and `showLine` adds an
 * optional stroke along the top edge. This layer owns the stacking family — set
 * `stackOffset` with 2+ series to stack (`'none'` = zero baseline, `'expand'` =
 * 100%, `'wiggle'` = streamgraph, `'diverging'` = split around zero); omit it for
 * overlaid, non-summing series. Points carrying `y0` render as range bands
 * (`[y0, y]`) and are exclusive of stacking.
 */
export interface NgeAreaLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Curve interpolation type */
  curveType?: 'basis' | 'linear' | 'monotone' | 'step';
  /** Data points to render. Points sharing a `seriesId` form one series/band. */
  data: NgeAreaDataPoint[];
  /** Area fill opacity (0-1). Falls back to theme.area.fill.opacity. */
  fillOpacity?: number;
  /** Click handler for data points */
  onClick?: (event: NgeChartLayerClickEvent<NgeAreaDataPoint>) => void;
  /** Renderer function. Import `renderAreaLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeAreaDataPoint, NgeAreaLayerConfig, any>;
  /** Color palette for multi-series. Series index maps to colors[index % length]. */
  seriesColors?: string[];
  /** Draw a stroke along the top edge (y1) of each area. */
  showLine?: boolean;
  /**
   * Stacking offset for 2+ series. `'none'` stacks from a zero baseline,
   * `'expand'` normalises each column to 100%, `'wiggle'` centres the stack
   * (streamgraph), `'diverging'` splits positives/negatives around zero. Omit for
   * overlaid (non-stacked) series. Ignored in range mode (points with `y0`).
   */
  stackOffset?: 'diverging' | 'expand' | 'none' | 'wiggle';
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeAreaDataPoint>>;
  type: 'area';
}

/**
 * Pie / donut / semi-circle layer configuration.
 *
 * One radial primitive fans out across three catalog types via config, seated on a
 * self-computed center + radius (it IGNORES the shared cartesian scales): **Pie**
 * (`innerRadius: 0`), **Donut** (`innerRadius > 0` carves the center hole), and
 * **Semi-circle / gauge** (`startAngle`/`endAngle` sweep less than a full turn). Each
 * datum's `value` maps to a proportional arc; slice color resolves per-datum `color` →
 * `seriesColors[i]` → the theme `slice.colors` palette (by input index). The layer is
 * inherently categorical — pair it with `extractPieChartLegendItems` for a legend.
 */
export interface NgePieLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Data points to render — one slice per point, in input order. */
  data: NgePieDataPoint[];
  /** End of the angular sweep in radians (semi-circle / gauge). Default `2 * Math.PI` (full turn). */
  endAngle?: number;
  /** Format the slice label (when `showLabels` is set). Defaults to the datum's own `label`. */
  formatLabel?: (d: NgePieDataPoint) => string;
  /**
   * Slice labels to emphasise. Named slices keep `theme.pie.slice.opacity`; every other
   * slice drops to `theme.pie.slice.dimmedOpacity`. Omitted or empty means "no selection" —
   * every slice renders at full opacity, exactly as before this option existed.
   *
   * **Arc geometry is untouched.** This is the whole difference from filtering the data:
   * removing a slice re-runs `d3.pie()` and every surviving wedge grows to fill the gap,
   * which destroys the part-to-whole comparison a pie exists to show. Dimming leaves each
   * wedge at the angle it already had, so selection is a reading aid rather than a
   * re-computation. Pair it with a legend — the layer holds no selection state of its own,
   * so the caller decides what is in here (`nge-chart-legend`'s `itemClick` /
   * `clearAction`).
   */
  highlightedLabels?: string[];
  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → a full pie,
   * e.g. `0.6` → a donut whose center hole is 60% of the radius. NOT pixels (so it
   * stays resize-safe). Default 0.
   */
  innerRadius?: number;
  /**
   * Label colour for EVERY slice — rung 2 of the label-colour chain (per-datum → layer
   * config → derived from the slice fill → the theme colour). Setting it deliberately
   * disables automatic on-fill contrast, giving one flat label colour; a per-datum
   * `labelColor` still wins over it.
   *
   * Derived contrast applies to `labelPosition: 'inside'` only — an outside label sits on
   * the plot surface, not on a slice fill, so it always takes
   * `theme.pie.labelOutside.color`. Both explicit rungs work in either mode.
   */
  labelColor?: string;
  /**
   * Width in pixels reserved on EACH side for outside labels. The pie's outer radius
   * shrinks to fit `boundedWidth - 2 * labelGutter`, because the layers group is clipped
   * to the plot area — a label drawn past `boundedWidth` would be cut off. Ignored when
   * `labelPosition` is `'inside'`. Default 96.
   */
  labelGutter?: number;
  /**
   * How outside labels are arranged around the pie. Only consulted when `labelPosition`
   * is `'outside'`.
   *
   * - `'perimeter'` (default) keeps each label on a ring just past the arc, at its own
   *   slice's mid-angle — so the label ring follows the pie's curve and a label the collision
   *   pass never touched sits exactly where its wedge points. Both layouts leader the SAME
   *   SLICES — `displaced` weighs the label's height, which identifies its wedge either way —
   *   but the ring's connectors are far shorter, because each ends on its own slice's bearing
   *   instead of reaching across to a ruler line. Measured on the 30-country reference at
   *   `leaderLines: 'all'`: mean leader 45px against the column's 185px, 1341px of total ink
   *   against 5556px.
   * - `'columns'` stacks each hemisphere into a straight vertical column at a fixed x.
   *   Separation is guaranteed, but every label is pulled off its slice's own bearing even
   *   when nothing was going to collide, so its connectors run as long diagonals. Reach for
   *   it past the ring's density ceiling —
   *   leaders stay untangled to ~20 categories on the ring and cross sharply above that,
   *   while a column terminates every leader at the same x and so stays nested at any count.
   *
   * Both layouts separate on collision and both reserve `labelGutter` — only the resting
   * place of an uncrowded label differs.
   */
  labelLayout?: 'columns' | 'perimeter';
  /**
   * Minimum vertical spacing in pixels between two adjacent outside labels — the distance
   * the collision pass pushes them apart. Raise it alongside
   * `theme.pie.labelOutside.fontSize`. Ignored when `labelPosition` is `'inside'`.
   * Default 14.
   */
  labelLineHeight?: number;
  /**
   * Radial distance in pixels from the arc's outer edge out to the label ring (or hemisphere
   * column) — how far the labels sit clear of the pie. Ignored when `labelPosition` is
   * `'inside'`. Default 12.
   *
   * Under `labelLayout: 'perimeter'` (the default) this knob does double duty: the ring it
   * defines has to fit inside the plot's height, so raising it also **shrinks the pie**. That
   * is the lever for opening up a crowded chart without enlarging the canvas — a smaller pie
   * with its labels further out, in the same box. Under `'columns'` it only moves the columns
   * outward, since the pie is not height-constrained by them.
   */
  labelOffset?: number;
  /**
   * Where `showLabels` draws each slice's label.
   *
   * - `'inside'` (default) centers it on the slice's arc centroid, styled from
   *   `theme.pie.label` with automatic on-fill contrast. Legible only while slices stay
   *   wide, so `minLabelAngle` drops the narrow ones.
   * - `'outside'` places EVERY label beyond the arc in two hemisphere columns, styled from
   *   `theme.pie.labelOutside`. Labels are pushed apart so none overlap, and a displaced
   *   label gets a leader line back to its slice. Reserves `labelGutter` px on each side
   *   and drops `minLabelAngle`'s default to 0 — a sliver can be labelled outside because
   *   the wedge no longer has to contain the text.
   */
  labelPosition?: 'inside' | 'outside';
  /**
   * Radial distance in pixels from the arc's outer edge out to the leader's ELBOW — the
   * length of the stub that leaves the wedge. **Defaults to `labelOffset`**, which keeps the
   * elbow on the label ring exactly as it was before this option existed.
   *
   * Set it SHORTER than `labelOffset` to decouple the two: a stubby radial tick off the
   * slice, then a longer run out to text that sits further away. Without it one knob drives
   * both, so pushing the labels out also lengthens every stub.
   *
   * Only used with `labelPosition: 'outside'`. A value larger than `labelOffset` puts the
   * elbow beyond the labels — allowed (nothing breaks, and the ring's vertical reserve grows
   * to match so it cannot be clipped), but it inverts the shape the connector is describing.
   */
  leaderElbowOffset?: number;
  /**
   * Which outside labels get a leader line back to their slice. Only consulted when
   * `labelPosition` is `'outside'` — an on-arc label sits on the slice it names, so it
   * never needs a connector.
   *
   * - `'displaced'` (default) draws one only where a label's HEIGHT no longer names its wedge
   *   — that is, where the collision pass had to move it. On a chart where the crowding is
   *   local, the leaders appear exactly where the eye needs help tracing a label back to a
   *   thin wedge, and nowhere else. `labelLayout` does not change who qualifies: a label
   *   pulled out to a hemisphere column keeps the height that identifies it, so it stays
   *   traceable without a connector.
   * - `'all'` draws one for EVERY outside label. A label resting at its natural anchor gets
   *   a short, near-straight radial tick rather than an elbow — the uniform look, where the
   *   connector reads as a consistent part of the chart's grammar instead of a hint that
   *   only some slices needed.
   * - `'none'` draws none, leaving the label columns to stand on their own. Often cleaner
   *   on a dense pie with short labels.
   */
  leaderLines?: 'all' | 'displaced' | 'none';
  /**
   * Smallest slice sweep (in RADIANS) that still gets a label — the small-slice rule. A
   * slice narrower than this is dropped from the label join entirely rather than drawn
   * with text spilling over its neighbours; it regains its label as soon as the data
   * widens it past the threshold. Only consulted when `showLabels` is set.
   *
   * Default `0.15` rad (≈ 8.6°, i.e. ~2.4% of a full turn) for `labelPosition: 'inside'`,
   * where the text has to fit within the wedge — and `0` for `'outside'`, where it does
   * not. An explicit value is honoured in BOTH modes, so slivers can still be suppressed
   * on purpose. A zero-sweep slice is never labelled either way: a threshold of 0 must not
   * put text on an invisible slice.
   */
  minLabelAngle?: number;
  /** Click handler for slices. */
  onClick?: (event: NgeChartLayerClickEvent<NgePieDataPoint>) => void;
  /** Angular gap between adjacent slices in radians. Default 0. */
  padAngle?: number;
  /** Renderer function. Import `renderPieLayer` from '@nge/charts'. */
  /**
   * Scale the self-computed outer radius by a RATIO (0–1): `1` (default) fills the plot,
   * `0.75` draws the pie at three-quarters size. Applied AFTER the layer's own label
   * reserves, so it composes with them rather than fighting them, and `innerRadius` — being
   * a ratio OF the outer radius — scales with it, so the chart shrinks without distorting.
   *
   * This is the knob for "make the chart smaller in a box I do not control". Do NOT reach
   * for `labelGutter`: it is measured off the arc, so shrinking the mark with it pulls the
   * labels inward too and merely moves the dead space to the edges. Pair with `labelOffset`
   * to set how far off the mark the labels then sit.
   */
  radiusRatio?: number;
  renderer: NgeChartLayerRenderFn<NgePieDataPoint, NgePieLayerConfig, any>;
  /** Slice color palette. Slice input index maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw a label on each slice, centered at its arc centroid and styled from
   * `theme.pie.label`. Opt-in (default false) so existing pies keep their current look;
   * slices narrower than `minLabelAngle` stay unlabelled.
   */
  showLabels?: boolean;
  /** Start of the angular sweep in radians (semi-circle / gauge). Default 0 (12 o'clock). */
  startAngle?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgePieDataPoint>>;
  type: 'pie';
}

/**
 * Funnel / pyramid layer configuration.
 *
 * A vertical stack of trapezoids sized by value — a self-scaled, array-data primitive
 * (it IGNORES the shared cartesian scales, computing widths from `context.dimensions`
 * the same way `pie` computes its own center + radius). Band *i* is a trapezoid whose
 * top width comes from `value[i]` and whose bottom width comes from `value[i + 1]`; the
 * last band has no successor, so `neckRatio` (a ratio of the widest width) supplies its
 * bottom width instead — omit it for a flat-bottomed **Funnel Chart**, or set it to `0`
 * to collapse the last band to a point, producing a **Pyramid Chart**. `direction`
 * picks which end is widest: `'down'` (default) stacks widest-at-top narrowing downward
 * (funnel); `'up'` stacks widest-at-bottom narrowing upward (pyramid). `align` picks
 * horizontal placement: `'center'` (default) centers each band, `'left'` pins every
 * band's left edge to x = 0. Band color resolves per-datum `color` → `seriesColors[i]`
 * → the theme `band.colors` palette (by input index). `label` is the enter/update/exit
 * join key.
 */
export interface NgeFunnelLayerConfig {
  /**
   * Horizontal placement of each band within the bounded width. `'center'` (default)
   * centers every band; `'left'` pins every band's left edge to x = 0.
   */
  align?: 'center' | 'left';
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Data points to render — one band per point, top to bottom in input order. */
  data: NgeFunnelDataPoint[];
  /**
   * Vertical stacking direction. `'down'` (default) stacks widest-at-top, narrowing
   * downward (Funnel Chart). `'up'` stacks widest-at-bottom, narrowing upward
   * (Pyramid Chart).
   */
  direction?: 'down' | 'up';
  /** Format the on-band / tooltip label. Defaults to the datum's own `label`. */
  formatLabel?: (d: NgeFunnelDataPoint) => string;
  /** Vertical gap in pixels carved out between adjacent bands. Default 0. */
  gap?: number;
  /**
   * Label colour for EVERY band — rung 2 of the label-colour chain (per-datum → layer
   * config → derived from the band fill → the theme colour). Setting it deliberately
   * disables automatic on-fill contrast, giving one flat label colour; a per-datum
   * `labelColor` still wins over it. Derived contrast only applies to
   * `labelPosition: 'inside'` — an outside label sits on the plot surface, so it always
   * takes `theme.funnel.labelOutside.color`.
   */
  labelColor?: string;
  /**
   * Width in pixels reserved on the right for outside labels. The funnel itself is
   * drawn into `boundedWidth - labelGutter`, because the layers group is clipped to the
   * plot area — a label drawn past `boundedWidth` would be cut off. Ignored when
   * `labelPosition` is `'inside'`. Default 96.
   */
  labelGutter?: number;
  /**
   * Where `showLabels` draws each band's label.
   *
   * - `'inside'` (default) centers it within the band — legible only while bands stay wide.
   * - `'edge'` sets each label just outside the band's own right edge, so the column of
   *   labels steps inward with the funnel's taper (the classic funnel annotation).
   * - `'right'` pins every label to one x at the gutter's left edge, giving a straight,
   *   aligned column regardless of taper.
   *
   * `'edge'` and `'right'` both reserve `labelGutter` px off the funnel's width, and both
   * style their labels from `theme.funnel.labelOutside` rather than the in-band
   * `theme.funnel.label`.
   */
  labelPosition?: 'edge' | 'inside' | 'right';
  /**
   * The LAST band's bottom width, as a RATIO (0–1) of the widest band width — it has
   * no successor value to narrow toward. Unset (default) ⇒ the last band's bottom
   * width equals its own top width (a flat-bottomed funnel). `0` collapses the last
   * band to a point — the pyramid apex.
   */
  neckRatio?: number;
  /** Click handler for bands. */
  onClick?: (event: NgeChartLayerClickEvent<NgeFunnelDataPoint>) => void;
  /** Renderer function. Import `renderFunnelLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeFunnelDataPoint, NgeFunnelLayerConfig, any>;
  /** Band color palette. Band input index maps to colors[index % length]. */
  seriesColors?: string[];
  /** Draw a label centered in each band. Default false. */
  showLabels?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeFunnelDataPoint>>;
  type: 'funnel';
}

/**
 * Sunburst / icicle (multi-level hierarchy) layer configuration.
 *
 * One hierarchical primitive fans out across the radial + linear catalog families via
 * `layout`, seated on a self-computed center + radius (it IGNORES the shared cartesian
 * scales): `'radial'` (default) partitions a `d3.hierarchy` into concentric rings —
 * **Sunburst** (`innerRadius: 0`), **multi-level Donut** (`innerRadius > 0` carves the
 * center hole), and a single-ring **Pie** (a one-level tree) — while `'linear'` lays the
 * same partition out as stacked rectangle columns (**Icicle**). Each node's `value` maps
 * to a proportional arc / rect; internal-node values are summed from their children by
 * `d3.hierarchy().sum()`. Node color resolves per-node `color` → the `seriesColors`
 * palette (by top-level branch index) → the theme `segment.colors` palette. The layer is
 * inherently categorical — pair it with a legend over the top-level branches.
 *
 * Opt-in per-node labels (`showLabels`) are drawn ON the node — along the radius in
 * `'radial'`, horizontally inside the rect in `'linear'` — styled from
 * `theme.sunburst.label` with automatic on-fill contrast. A hierarchy crowds far faster
 * than a flat chart, so three thresholds keep the ones that cannot fit off the canvas:
 * `minLabelAngle` (narrow wedges), `minLabelSize` (short arcs / rects at any angle), and
 * `maxLabelDepth` (rings past a chosen depth).
 */
export interface NgeSunburstLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Top-level hierarchy nodes (seated under a synthetic root) — one branch per node. */
  data: NgeHierarchyDatum[];
  /** End of the angular sweep in radians (radial layout). Default `2 * Math.PI` (full turn). */
  endAngle?: number;
  /** Format a node's label (when `showLabels` is set). Receives the node datum carrying its
   * SUMMED value, so an internal node reports its aggregate rather than `undefined`.
   * Defaults to the datum's own `label`. */
  formatLabel?: (d: NgeHierarchyDatum) => string;
  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius (radial layout):
   * `0` → rings start at the center, `> 0` carves a center hole (donut). NOT pixels
   * (so it stays resize-safe). Default 0.
   */
  innerRadius?: number;
  /**
   * Label colour for EVERY node — rung 2 of the label-colour chain (per-datum → layer
   * config → derived from the node fill → `theme.sunburst.label.color`). Setting it
   * deliberately disables automatic on-fill contrast, giving one flat label colour; a
   * per-datum `labelColor` still wins over it.
   */
  labelColor?: string;
  /**
   * Partition layout. `'radial'` (default) draws concentric rings (sunburst / donut /
   * pie rings); `'linear'` draws stacked rectangle columns (icicle).
   */
  layout?: 'linear' | 'radial';
  /** Optional depth cap — render at most this many rings / columns. Unset ⇒ full depth. */
  maxDepth?: number;
  /**
   * Deepest depth that still gets a label (1 = top-level branches only). Independent of
   * `maxDepth`, which governs what is DRAWN: a chart can render five rings while labelling
   * only the two that have room. Unset ⇒ every drawn depth is eligible.
   */
  maxLabelDepth?: number;
  /**
   * Smallest node sweep (in RADIANS) that still gets a label — the narrow-node half of the
   * suppression rule, and RADIAL layout only (a linear cell has no sweep). A node narrower
   * than this is dropped from the label join entirely rather than drawn with text spilling
   * across its neighbours, and regains its label as soon as the data widens it. Default
   * `0.15` rad (≈ 8.6°), the pie layer's threshold. A zero-sweep node is never labelled
   * whatever the threshold — a value of 0 must not put text on a node nobody can see.
   */
  minLabelAngle?: number;
  /**
   * Smallest cross-text extent (in PIXELS) that still gets a label — the absolute-size half
   * of the suppression rule, and the one `minLabelAngle` cannot express: an inner ring node
   * can hold a generous angle and still have almost no arc to seat a line of text.
   *
   * Measured in whichever direction the text's cap-height runs: RADIAL → the node's arc
   * length at its mid-radius (`sweep × midRadius`); LINEAR → the rect's width. Default 12px,
   * about one line box at the default label font size.
   */
  minLabelSize?: number;
  /** Click handler for nodes. */
  onClick?: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => void;
  /** Angular gap between adjacent nodes in radians (radial layout). Default 0. */
  padAngle?: number;
  /** Renderer function. Import `renderSunburstLayer` from '@nge/charts'. */
  /**
   * Scale the self-computed outer radius by a RATIO (0–1): `1` (default) fills the plot,
   * `0.75` draws the rings at three-quarters size. Applied AFTER the layer's own label
   * reserves, so it composes with them rather than fighting them, and `innerRadius` — being
   * a ratio OF the outer radius — scales with it, so the chart shrinks without distorting.
   *
   * This is the knob for "make the chart smaller in a box I do not control". Do NOT reach
   * for `labelGutter`: it is measured off the arc, so shrinking the mark with it pulls the
   * labels inward too and merely moves the dead space to the edges. Pair with `labelOffset`
   * to set how far off the mark the labels then sit.
   */
  radiusRatio?: number;
  renderer: NgeChartLayerRenderFn<NgeHierarchyDatum, NgeSunburstLayerConfig, any>;
  /** Node color palette assigned by top-level branch index. index maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw a label on each node — on its arc (radial) or inside its rect (linear) — styled
   * from `theme.sunburst.label`. Opt-in (default false) so existing sunbursts keep their
   * current look; nodes below `minLabelAngle` / `minLabelSize` / past `maxLabelDepth` stay
   * unlabelled.
   */
  showLabels?: boolean;
  /** Start of the angular sweep in radians (radial layout). Default 0 (12 o'clock). */
  startAngle?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeHierarchyDatum>>;
  type: 'sunburst';
}

/** Which shape the proportional layer sizes by area — the primary render discriminator. */
export type NgeProportionalMark = 'circle' | 'grid' | 'half-circle' | 'packed' | 'square';

/** How the proportional layer arranges its single-shape marks relative to one another. */
export type NgeProportionalLayout = 'nested' | 'row';

/**
 * Proportional-area / waffle layer configuration.
 *
 * One area-encoding primitive fans out across the catalog's proportional family, seated on
 * self-computed geometry (it IGNORES the shared cartesian scales). Every mark's AREA — not
 * its width or height — is proportional to `value`, so a linear dimension scales with the
 * square root of the magnitude. `mark` picks the shape:
 *
 * - `mark: 'circle'` (default) draws one circle per datum, radius `√(value / max)` of the
 *   slot — the **Proportional Area Chart** / **Circular Bubble**.
 * - `mark: 'half-circle'` draws the same magnitudes as semicircles rising from a shared bottom
 *   baseline — the **Half-Circle Proportional Area**.
 * - `mark: 'square'` substitutes a square of side `√(value / max)` — the **Square
 *   Proportional Area**.
 * - `mark: 'grid'` draws a `rows × columns` cell grid and fills `value / valuePerCell` cells
 *   per category, bottom-left origin — the **Waffle Chart**. Unfilled cells are drawn from
 *   `theme.proportional.emptyCell`.
 * - `mark: 'packed'` runs `d3.pack()` over the data and draws the resulting leaf circles —
 *   the **Packed Circle** / **Clustered Force**-style grouping when the data nests.
 *
 * `layout` then arranges the three single-shape marks: `'row'` (default) spaces them evenly
 * across the plot width, `'nested'` stacks them concentrically on a shared bottom baseline —
 * the **Nested Proportional Area**. It is ignored by `'grid'` and `'packed'`, which own their
 * own layout.
 */
export interface NgeProportionalLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Grid columns (`mark: 'grid'` only). Default 10 — with `rows`, a 100-cell percentage waffle. */
  columns?: number;
  /**
   * Nodes to render. A flat array of leaves gives one mark per datum; nesting groups the
   * `'packed'` mark's circles. An internal node's magnitude is summed from its children by
   * `d3.hierarchy().sum()`, so only leaves need a `value`.
   */
  data: NgeHierarchyDatum[];
  /** Format the on-mark / tooltip label. Defaults to the datum's own `label`. */
  formatLabel?: (d: NgeHierarchyDatum) => string;
  /**
   * On-mark label colour for EVERY mark — rung 2 of the label-colour chain (per-datum →
   * layer config → derived from the mark fill → `theme.proportional.label.color`). Setting
   * it deliberately disables the automatic on-fill contrast; a per-datum `labelColor` still
   * wins over it.
   */
  labelColor?: string;
  /**
   * How the single-shape marks are arranged. `'row'` (default) spaces them evenly across the
   * plot width; `'nested'` stacks them concentrically on a shared bottom baseline. Ignored by
   * `mark: 'grid'` and `mark: 'packed'`.
   */
  layout?: NgeProportionalLayout;
  /** Which area-encoded shape to draw. Default `'circle'`. */
  mark?: NgeProportionalMark;
  /**
   * Smallest mark width (px) that still earns a label — a mark narrower than this is drawn
   * unlabelled rather than overflowing. Measured across the mark's own inner width (a
   * circle's diameter, a square's side). Default 24.
   */
  minLabelSize?: number;
  onClick?: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => void;
  /**
   * Separation between marks in pixels — the gutter between grid cells, the padding passed to
   * `d3.pack()`, and the inset taken off each `'row'` slot. Default 2.
   */
  padding?: number;
  /** Renderer function. Import `renderProportionalLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeHierarchyDatum, NgeProportionalLayerConfig, any>;
  /** Grid rows (`mark: 'grid'` only). Default 10 — with `columns`, a 100-cell percentage waffle. */
  rows?: number;
  /** Mark color palette. Top-level input index maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw each datum's label on its own mark. Default false.
   *
   * Scoped to the single-mark shapes — `'circle'`, `'half-circle'`, `'square'` and `'packed'`.
   * `mark: 'grid'` draws NO labels whatever this is set to: a waffle's categories are named by
   * a legend, not by text repeated across a category's run of cells (the same shape as the
   * radial-bar layer scoping its labels to `mark: 'bar'`). Pair a waffle with
   * `extractSunburstChartLegendItems()` and a `<nge-chart-legend>` instead.
   */
  showLabels?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeHierarchyDatum>>;
  type: 'proportional';
  /**
   * Magnitude one grid cell represents (`mark: 'grid'` only). Unset (default) ⇒ the data's
   * total divided by `rows × columns`, so the grid is exactly filled and each cell reads as a
   * percentage point. Setting it turns the waffle into a UNIT chart — one cell per fixed
   * quantity — and leaves any surplus cells empty.
   */
  valuePerCell?: number;
}

/** Which shape the radar layer draws each series as — the primary render discriminator. */
export type NgeRadarRender = 'area' | 'line';

/**
 * Radar / polar (spider / star) layer configuration.
 *
 * A MULTI-SERIES radial primitive seated on a self-computed center + radius (it IGNORES
 * the shared cartesian scales). Every series carries one `{ label, value }` point per
 * angular axis (dimension); the N unique `label`s become N evenly-angled spokes, the first
 * pointing straight up (12 o'clock). Each series draws as a closed `d3.lineRadial()` /
 * `d3.areaRadial()` polygon (`curveLinearClosed`) whose vertex radius encodes `value` via a
 * linear `[0, max] → [innerRadius, outerRadius]` scale, over a web of concentric value
 * rings + radial spokes. `render` fans it out across two catalog types:
 *
 * - `render: 'area'` (default) fills each series polygon (`fillOpacity`) under a stroked
 *   outline — the classic **Radar Diagram / Spider chart**.
 * - `render: 'line'` strokes the outline only (no fill), with small vertex dots — a
 *   **Polar Chart** of the same radial axes.
 *
 * Series color is positional — series index maps to `seriesColors[i]` / the theme palette.
 */
export interface NgeRadarLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Data points to render — one `{ label, value }` per axis, grouped into series by `seriesId`. */
  data: NgeRadarDataPoint[];
  /** End of the angular sweep in radians. Default `2 * Math.PI` (full circle). */
  endAngle?: number;
  /**
   * Filled-polygon fill opacity (0-1), `render: 'area'`. Falls back to
   * `theme.radar.series.fillOpacity` (default 0.3) when unset.
   */
  fillOpacity?: number;
  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → axes start at
   * the center, e.g. `0.1` lifts them off a center hub. NOT pixels (so it stays
   * resize-safe). Default 0.
   */
  innerRadius?: number;
  /**
   * Number of concentric value rings (grid levels) to draw. Unset ⇒ the rings fall on the
   * radial scale's own `ticks()`.
   */
  levels?: number;
  /** Click handler for series vertices. */
  onClick?: (event: NgeChartLayerClickEvent<NgeRadarDataPoint>) => void;
  /** Series shape: `'area'` filled polygon (default) or `'line'` stroked outline (polar chart). */
  /**
   * Scale the self-computed outer radius by a RATIO (0–1): `1` (default) fills the plot,
   * `0.75` draws the web at three-quarters size. Applied AFTER the layer's own label
   * reserves, so it composes with them rather than fighting them, and `innerRadius` — being
   * a ratio OF the outer radius — scales with it, so the chart shrinks without distorting.
   *
   * This is the knob for "make the chart smaller in a box I do not control". Do NOT reach
   * for `labelGutter`: it is measured off the arc, so shrinking the mark with it pulls the
   * labels inward too and merely moves the dead space to the edges. Pair with `labelOffset`
   * to set how far off the mark the labels then sit.
   */
  radiusRatio?: number;
  render?: NgeRadarRender;
  /** Renderer function. Import `renderRadarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeRadarDataPoint, NgeRadarLayerConfig, any>;
  /** Series color palette. Series index maps to colors[index % length]. */
  seriesColors?: string[];
  /** Start of the angular sweep in radians (first axis). Default 0 (12 o'clock, straight up). */
  startAngle?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeRadarDataPoint>>;
  type: 'radar';
}

/** Which radial mark the radial-bar layer draws — the primary render discriminator. */
export type NgeRadialBarMark = 'area' | 'bar' | 'cell';

/** How the radial-bar layer distributes angular extent across the category bands. */
export type NgeRadialBarWedge = 'equal' | 'value';

/**
 * Radial-bar (polar) layer configuration.
 *
 * One radial primitive fans out across SIX catalog types via two options, seated on a
 * self-computed center + radius (it IGNORES the shared cartesian scales). `mark` picks
 * the shape and `wedge` picks how the circle's angle is divided:
 *
 * - `mark: 'bar'` (default) draws one `d3.arc()` per datum from the inner radius out to
 *   `radialScale(value)` — **Radial Bar** / **Radial Histogram** (`wedge: 'equal'`,
 *   `padAngle > 0`), **Polar Area / Nightingale rose** (`wedge: 'equal'`, `padAngle: 0`
 *   ⇒ full contiguous wedges), or a coxcomb where the angle also encodes value
 *   (`wedge: 'value'`).
 * - `mark: 'area'` draws a closed radial area + outline per `seriesId` group over the
 *   category band centers — **Radial Line** (outline) + **Radial Area** (fill),
 *   multi-series aware.
 * - `mark: 'cell'` draws a 2D grid of arc cells (angular `label` × radial `band`) whose
 *   fill intensity (opacity) encodes `value` — **Circular Heat Map**.
 *
 * `wedge` applies to `mark: 'bar'` only; `'area'` and `'cell'` always use equal angular
 * bands (a radial line/area and a circular heatmap need uniform angular spacing). Fill
 * color resolves per-datum `color` → `seriesColors[i]` → the theme `bar.colors` palette.
 */
export interface NgeRadialBarLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Data points to render — one arc / vertex per point (grouped by `seriesId` for `'area'`). */
  data: NgeRadialBarDataPoint[];
  /** End of the angular sweep in radians (semi-circle / gauge). Default `2 * Math.PI` (full turn). */
  endAngle?: number;
  /**
   * Format a bar's label (when `showLabels` is set). Receives the bar's own datum, so a
   * value label is just `d => String(d.value)` and a combined one
   * `d => \`${d.label} ${d.value}\`` — the layer draws ONE label per bar rather than a
   * separate category and value join. Defaults to the datum's own `label`.
   */
  formatLabel?: (d: NgeRadialBarDataPoint) => string;
  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → bars/rings
   * start at the center, e.g. `0.3` carves a center hole. NOT pixels (so it stays
   * resize-safe). Default 0.
   */
  innerRadius?: number;
  /**
   * Label colour for EVERY bar — rung 2 of the label-colour chain (per-datum → layer
   * config → derived from the bar fill → the theme colour). Setting it deliberately
   * disables automatic on-fill contrast, giving one flat label colour; a per-datum
   * `labelColor` still wins over it.
   *
   * Derived contrast applies to `labelPosition: 'inside'` only — an outside label sits on
   * the plot surface, not on a bar fill, so it always takes
   * `theme['radial-bar'].labelOutside.color`. Both explicit rungs work in either mode.
   */
  labelColor?: string;
  /**
   * Width in pixels reserved around the chart for outside labels. The outer radius shrinks
   * by this much, because the layers group is clipped to the plot area — a label drawn past
   * the bounded rect would be cut off, and this layer's labels ring the whole chart rather
   * than sitting in two side columns. Ignored when `labelPosition` is `'inside'`. Default 48.
   */
  labelGutter?: number;
  /**
   * Where `showLabels` draws each bar's label (`mark: 'bar'` only).
   *
   * - `'inside'` (default) puts it ON the bar at its mid-radius, running ALONG the radius
   *   with the left hemisphere flipped 180° so nothing reads upside-down, styled from
   *   `theme['radial-bar'].label` with automatic on-fill contrast. Text is bounded by the
   *   bar's radial extent, so a short bar drops its label rather than spilling.
   * - `'outside'` places every label horizontally just beyond the chart's outer radius, at
   *   the bar's band mid-angle, anchored away from the center — a category ring around the
   *   chart, styled from `theme['radial-bar'].labelOutside`. Drops `minLabelAngle`'s
   *   default to 0, because the bar no longer has to contain the text.
   */
  labelPosition?: 'inside' | 'outside';
  /** Radial shape: `'bar'` arcs (default), `'area'` closed radial area, `'cell'` heatmap grid. */
  mark?: NgeRadialBarMark;
  /**
   * Smallest bar sweep (in RADIANS) that still gets a label. A bar narrower than this is
   * dropped from the label join entirely rather than drawn with text spilling across its
   * neighbours, and regains its label as soon as the data widens it. Default `0.15` rad
   * (≈ 8.6°) for `labelPosition: 'inside'` and `0` for `'outside'`, where the bar's width
   * stops being a constraint. A zero-sweep bar is never labelled whatever the threshold.
   */
  minLabelAngle?: number;
  /**
   * Smallest extent (in PIXELS) that still gets a label — the absolute-size half of the
   * suppression rule, measured in whichever direction the text runs.
   *
   * `'inside'` text runs along the radius, so this is compared against the bar's radial
   * extent (`outerRadius − innerRadius`) — the thin-bar rule — AND against the arc length
   * at the bar's mid-radius, which bounds the text's cap-height. `'outside'` text sits off
   * the mark, so only the arc-length half applies. Default 12px, about one line box at the
   * default label font size.
   */
  minLabelSize?: number;
  /** Click handler for bars / cells / area vertices. */
  onClick?: (event: NgeChartLayerClickEvent<NgeRadialBarDataPoint>) => void;
  /** Angular gap between adjacent bars in radians (`mark: 'bar'`). `0` ⇒ contiguous wedges (rose). Default 0. */
  padAngle?: number;
  /** Renderer function. Import `renderRadialBarLayer` from '@nge/charts'. */
  /**
   * Scale the self-computed outer radius by a RATIO (0–1): `1` (default) fills the plot,
   * `0.75` draws the bars at three-quarters size. Applied AFTER the layer's own label
   * reserves, so it composes with them rather than fighting them, and `innerRadius` — being
   * a ratio OF the outer radius — scales with it, so the chart shrinks without distorting.
   *
   * This is the knob for "make the chart smaller in a box I do not control". Do NOT reach
   * for `labelGutter`: it is measured off the arc, so shrinking the mark with it pulls the
   * labels inward too and merely moves the dead space to the edges. Pair with `labelOffset`
   * to set how far off the mark the labels then sit.
   */
  radiusRatio?: number;
  renderer: NgeChartLayerRenderFn<NgeRadialBarDataPoint, NgeRadialBarLayerConfig, any>;
  /** Fill palette. Datum input index (bar/cell) or series index (area) maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw a label on each bar — on it (`labelPosition: 'inside'`) or just beyond the
   * perimeter (`'outside'`). Opt-in (default false) so existing radial bars keep their
   * current look; bars below `minLabelAngle` / `minLabelSize` stay unlabelled.
   *
   * `mark: 'bar'` ONLY. `'area'` has no per-datum mark to annotate, and `'cell'` encodes
   * its value as fill OPACITY over one base colour — the luminance derivation behind
   * on-mark label colour reads the full-strength fill and would pick white text for a
   * nearly-transparent cell, so cell labels need an opacity-aware rung first.
   */
  showLabels?: boolean;
  /** Start of the angular sweep in radians (semi-circle / gauge). Default 0 (12 o'clock). */
  startAngle?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeRadialBarDataPoint>>;
  type: 'radial-bar';
  /**
   * Angular distribution across categories (`mark: 'bar'` only). `'equal'` (default)
   * gives every category the same angular slot (Polar Area / Radial Bar); `'value'`
   * makes each wedge's angular extent proportional to `value` (coxcomb, `d3.pie()`-style).
   */
  wedge?: NgeRadialBarWedge;
}

/**
 * Scatter layer configuration
 */
export interface NgeScatterLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  data: NgeScatterDataPoint[];
  onClick?: (event: NgeChartLayerClickEvent<NgeScatterDataPoint>) => void;
  pointRadius?: number;
  /** Renderer function. Import `renderScatterLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeScatterDataPoint, NgeScatterLayerConfig, any>;
  /** Color palette for multi-series. Series index maps to colors[index % length] */
  seriesColors?: string[];
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeScatterDataPoint>>;
  type: 'scatter';
}

/**
 * Bullet chart layer configuration
 */
export interface NgeBulletLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). A
   * single-value meter layer, so these drive the create/update transitions of its
   * fixed elements. Overrides the chart-wide `animation` and `animationMs` shorthand.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation`.
   * `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Height of the main progress bar in pixels */
  barHeight?: number;
  /** Data point to render (single value) */
  data: NgeBulletDataPoint;
  /** Height of the min/max limit indicators in pixels */
  limitIndicatorHeight?: number;
  /** Width of the min/max limit indicators in pixels */
  limitIndicatorWidth?: number;
  /** Click handler for the bullet chart */
  onClick?: (event: NgeChartLayerClickEvent<NgeBulletDataPoint>) => void;
  /** Height of the progress marker in pixels */
  progressIndicatorHeight?: number;
  /** Width of the progress marker in pixels */
  progressIndicatorWidth?: number;
  /** Renderer function. Import `renderBulletLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeBulletDataPoint, NgeBulletLayerConfig, any>;
  /** Tooltip configuration */
  tooltip?: Partial<NgeTooltipConfig<NgeBulletDataPoint>>;
  type: 'bullet';
}

/**
 * Diverging bar chart layer configuration.
 * Used for showing positive/negative values from a center point (e.g., Price Momentum).
 */
export interface NgeDivergingBarLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). A
   * single-value meter layer, so these drive the create/update transitions of its
   * fixed elements. Overrides the chart-wide `animation` and `animationMs` shorthand.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation`.
   * `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Height of the main progress bar in pixels */
  barHeight?: number;
  /** Height of the center marker in pixels */
  centerIndicatorHeight?: number;
  /** Width of the center marker in pixels */
  centerIndicatorWidth?: number;
  /** Label text for the center indicator bubble. Defaults to 'Balanced'. */
  centerLabel?: string;
  /** Data point to render (single value) */
  data: NgeDivergingBarDataPoint;
  /** Height of the min/max limit indicators in pixels */
  limitIndicatorHeight?: number;
  /** Width of the min/max limit indicators in pixels */
  limitIndicatorWidth?: number;
  /** Click handler for the diverging bar chart */
  onClick?: (event: NgeChartLayerClickEvent<NgeDivergingBarDataPoint>) => void;
  /** Renderer function. Import `renderDivergingBarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeDivergingBarDataPoint, NgeDivergingBarLayerConfig, any>;
  /** Tooltip configuration */
  tooltip?: Partial<NgeTooltipConfig<NgeDivergingBarDataPoint>>;
  type: 'diverging-bar';
  /** Height of the value marker in pixels */
  valueIndicatorHeight?: number;
  /** Width of the value marker in pixels */
  valueIndicatorWidth?: number;
}

/** Which financial-chart shape the layer draws — the primary render discriminator. */
export type FinancialVariant = 'candlestick' | 'kagi' | 'renko';

/**
 * Financial (price-movement) chart layer configuration.
 *
 * One primitive fans out across three classic price charts via `variant`, all seated
 * on a shared band (sequence) + linear (price) scale pair with price on y. Financial
 * charts collapse calendar gaps to evenly-spaced slots, so the band axis is a
 * sequence index — one slot per candle / kagi vertex / renko brick — never a
 * continuous time axis. `'candlestick'` (default, x = time) draws an OHLC wick + body
 * per period; `'kagi'` (time-independent) folds the `close` series into a
 * reversal-driven zigzag of vertical segments whose thickness/colour flips between
 * yang (rising above the prior shoulder) and yin (falling below the prior waist);
 * `'renko'` (time-independent) walks the `close` series emitting fixed-height bricks
 * in a diagonal staircase. Because kagi/renko are DERIVED transforms with no 1:1
 * source datum, hover/click interaction is wired for `'candlestick'` only.
 */
export interface NgeFinancialLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /**
   * Renko fixed brick height in price units (renko variant). Defaults to a small
   * fraction of the `close` price range when omitted.
   */
  brickSize?: number;
  /** Candle body width as a fraction of the band bandwidth (candlestick variant). Default 0.6. */
  candleWidth?: number;
  /** OHLC data points to render — one candle / one `close` sample per period, in sequence. */
  data: NgeFinancialDataPoint[];
  /** Click handler for a candle (candlestick variant only — kagi/renko are derived). */
  onClick?: (event: NgeChartLayerClickEvent<NgeFinancialDataPoint>) => void;
  /** Renderer function. Import `renderFinancialLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeFinancialDataPoint, NgeFinancialLayerConfig, any>;
  /**
   * Interpret `reversalThreshold` as a fraction of the `close` price range rather
   * than an absolute price amount (kagi variant). Default false.
   */
  reversalAsPercent?: boolean;
  /**
   * Kagi reversal amount (kagi variant): a counter-move must reach at least this
   * much to start a new vertical. Absolute price units, unless `reversalAsPercent`
   * reads it as a fraction of the `close` price range. Defaults to a small fraction
   * of the `close` price range when omitted.
   */
  reversalThreshold?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover (candlestick variant). */
  tooltip?: Partial<NgeTooltipConfig<NgeFinancialDataPoint>>;
  type: 'financial';
  /** Which price chart to draw. Default `'candlestick'`. */
  variant?: FinancialVariant;
}

/** Which shape the gauge layer draws — the primary render discriminator. */
export type NgeGaugeShape = 'arc' | 'linear';

/** How the arc gauge encodes its value: a growing filled arc, or a rotating needle. */
export type NgeGaugeIndicator = 'fill' | 'needle';

/**
 * One colored threshold band on the gauge track. The band's UPPER bound is `value`;
 * bands are read in ascending `value` order, band N spanning from the prior band's upper
 * bound (or the datum `min`) up to its own `value`. An optional `color` overrides the
 * cycled `theme.threshold.colors` palette entry for that band.
 */
export interface NgeGaugeThreshold {
  /** Optional band fill color (else cycles `theme.threshold.colors` by band index). */
  color?: string;
  /** Upper bound of this band, in data units (ascending across the array). */
  value: number;
}

/**
 * Gauge (single-value meter) layer configuration.
 *
 * A single `value` rendered against a `[min, max]` range — a self-scaled meter (like
 * `bullet`) that computes its center + radius from `context.dimensions` and IGNORES the
 * shared cartesian scales. One primitive fans out across the catalog's meter family via
 * two options. `shape` picks the form: `'arc'` (default) draws a circular gauge over a
 * `startAngle → endAngle` sweep (default a 270° speedometer), `'linear'` draws a
 * horizontal **Progress Bar**. In arc form `indicator` picks the readout: `'fill'`
 * (default) grows a filled value arc (**Solid Gauge**), `'needle'` rotates a needle to
 * the value (**Angular Gauge**); `indicator` is ignored for `shape: 'linear'`. Optional
 * ascending `thresholds` paint colored zones along the track, and `showValueLabel`
 * (default true) prints the numeric value at the center.
 */
export interface NgeGaugeLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). A
   * single-value meter layer, so these drive the create/update transitions of its
   * fixed elements. Overrides the chart-wide `animation` and `animationMs` shorthand.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation`.
   * `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Data point to render (a single value against its own min/max range). */
  data: NgeGaugeDataPoint;
  /**
   * End of the angular sweep in radians (radial-bar convention: 0 = 12 o'clock,
   * clockwise). Default ≈ `0.75π` — with `startAngle` a 270° speedometer sweep.
   * `shape: 'arc'` only.
   */
  endAngle?: number;
  /**
   * Arc readout: `'fill'` (default) grows a filled value arc (Solid Gauge); `'needle'`
   * rotates a needle to the value (Angular Gauge). Ignored when `shape: 'linear'`.
   */
  indicator?: NgeGaugeIndicator;
  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius (`shape: 'arc'`):
   * `0` → a full pie-style gauge, `0.65` (default) carves the classic gauge ring. NOT
   * pixels (so it stays resize-safe).
   */
  innerRadius?: number;
  /** Click handler for the gauge. */
  onClick?: (event: NgeChartLayerClickEvent<NgeGaugeDataPoint>) => void;
  /** Renderer function. Import `renderGaugeLayer` from '@nge/charts'. */
  /**
   * Scale the self-computed outer radius by a RATIO (0–1): `1` (default) fills the plot,
   * `0.75` draws the gauge arc at three-quarters size. Applied AFTER the layer's own label
   * reserves, so it composes with them rather than fighting them, and `innerRadius` — being
   * a ratio OF the outer radius — scales with it, so the chart shrinks without distorting.
   *
   * This is the knob for "make the chart smaller in a box I do not control". Do NOT reach
   * for `labelGutter`: it is measured off the arc, so shrinking the mark with it pulls the
   * labels inward too and merely moves the dead space to the edges. Pair with `labelOffset`
   * to set how far off the mark the labels then sit.
   */
  radiusRatio?: number;
  renderer: NgeChartLayerRenderFn<NgeGaugeDataPoint, NgeGaugeLayerConfig, any>;
  /** Meter form: `'arc'` circular gauge (default) or `'linear'` horizontal progress bar. */
  shape?: NgeGaugeShape;
  /** Print the numeric value (+ units) at the center. Default true. */
  showValueLabel?: boolean;
  /**
   * Start of the angular sweep in radians (radial-bar convention: 0 = 12 o'clock,
   * clockwise). Default ≈ `-0.75π` — with `endAngle` a 270° speedometer sweep.
   * `shape: 'arc'` only.
   */
  startAngle?: number;
  /** Optional ascending colored bands painted along the track. Default none. */
  thresholds?: NgeGaugeThreshold[];
  /** Tooltip configuration. Set `enabled: true` to show a tooltip on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeGaugeDataPoint>>;
  type: 'gauge';
}

/**
 * Grouped bar chart layer configuration.
 * Used for showing side-by-side bars grouped by category (e.g., Active vs Closed with Avg/Min/Max bars).
 */
export interface NgeGroupedBarLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Padding between bars within a group (0-1) */
  barPadding?: number;
  /** Bar corner radius (px) */
  barRadius?: number;
  /** Data points to render */
  data: NgeGroupedBarDataPoint[];
  /** Padding between groups (0-1) */
  groupPadding?: number;
  /** Format function for value labels displayed on bars */
  labelFormat?: (value: number) => string;
  /** Click handler for individual bars */
  onClick?: (event: NgeChartLayerClickEvent<NgeGroupedBarDataPoint>) => void;
  /** Bar orientation */
  orientation?: 'horizontal' | 'vertical';
  /** Renderer function. Import `renderGroupedBarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeGroupedBarDataPoint, NgeGroupedBarLayerConfig, any>;
  /** Show value labels on bars */
  showLabels?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeGroupedBarDataPoint>>;
  type: 'grouped-bar';
}

/**
 * Stacked bar chart layer configuration.
 *
 * Segments stack per category from a long-format dataset (`category` = band axis,
 * `seriesId` = stack series). Covers three catalog types from one family: plain
 * **stacked bar** (`stackOffset: 'none'`, absolute value axis), **100% stacked
 * bar** (`stackOffset: 'expand'`, each column normalised to full height), and
 * **Marimekko** (supply `bandWidthAccessor` to make each column's WIDTH ∝ its
 * group total — orthogonal to the height offset; Marimekko-proper pairs it with
 * `'expand'`). Orientation swaps the band/value axes for the plain/100% modes;
 * Marimekko is vertical-only.
 */
export interface NgeStackedBarLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /**
   * Per-column WIDTH weight for a Marimekko layout: each column's width ∝
   * `bandWidthAccessor(category, columnTotal)`, laid out contiguously across the
   * bounded width (the shared uniform band scale is ignored). Omit for uniform
   * `scaleBand` columns. Forces vertical orientation when set.
   *
   * In Marimekko mode the layer self-computes variable column widths and does NOT
   * use the shared uniform band x-scale, so a standard category x-axis
   * (`showXAxis: true`) will not align with the columns — keep `showXAxis: false`
   * (the preset default) and rely on inline labels / the legend.
   */
  bandWidthAccessor?: (category: string, total: number) => number;
  /** Padding between columns (0-1). Uniform-band columns only. */
  barPadding?: number;
  /** Segment corner radius (px). */
  barRadius?: number;
  /** Data points to render. Points sharing a `seriesId` form one stack series. */
  data: NgeStackedBarDataPoint[];
  /**
   * In-segment label colour for EVERY segment — rung 2 of the label-colour chain
   * (per-datum → layer config → derived from the segment fill →
   * `theme['stacked-bar'].label.color`). Setting it deliberately disables automatic
   * on-fill contrast; a per-datum `labelColor` still wins over it.
   */
  labelColor?: string;
  /** Click handler for segments */
  onClick?: (event: NgeChartLayerClickEvent<NgeStackedBarDataPoint>) => void;
  /** Bar orientation. Ignored (treated as vertical) for Marimekko. */
  orientation?: 'horizontal' | 'vertical';
  /** Renderer function. Import `renderStackedBarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeStackedBarDataPoint, NgeStackedBarLayerConfig, any>;
  /** Color palette for stack series. Series index maps to colors[index % length]. */
  seriesColors?: string[];
  /** Show per-segment value labels. */
  showLabels?: boolean;
  /**
   * Stacking offset. `'none'` stacks from a zero baseline (absolute values);
   * `'expand'` normalises each column to 100% (`stackOffsetExpand`). Omit for `'none'`.
   */
  stackOffset?: 'expand' | 'none';
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeStackedBarDataPoint>>;
  type: 'stacked-bar';
}

/**
 * Waterfall chart layer configuration.
 *
 * Sequential running-total bars: each `'delta'` datum's bar floats from the prior
 * cumulative total to the new one (rise = positive / fall = negative coloring),
 * while `'total'` data anchor at zero as subtotal / total columns. Thin step
 * connectors bridge consecutive bars. Covers the *Waterfall Chart* catalog type;
 * pair with the preset's `cumulative` option (a secondary-axis line) for a
 * *Pareto Chart*.
 */
export interface NgeWaterfallLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Padding between bars (0-1). Default 0.2. */
  barPadding?: number;
  /** Bar corner radius (px). */
  barRadius?: number;
  /** Draw step connectors bridging consecutive bars. Default true. */
  connectors?: boolean;
  /** Data points in sequence — one bar per point, left to right. */
  data: NgeWaterfallDataPoint[];
  /** Fill for falling (negative-delta) bars. Overrides `theme.waterfall.fall.color`. */
  fallColor?: string;
  /** Click handler for bars. */
  onClick?: (event: NgeChartLayerClickEvent<NgeWaterfallDataPoint>) => void;
  /** Renderer function. Import `renderWaterfallLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeWaterfallDataPoint, NgeWaterfallLayerConfig, any>;
  /** Fill for rising (positive-delta) bars. Overrides `theme.waterfall.rise.color`. */
  riseColor?: string;
  /** Show per-bar value labels. */
  showLabels?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeWaterfallDataPoint>>;
  /** Fill for `'total'` bars. Overrides `theme.waterfall.total.color`. */
  totalColor?: string;
  type: 'waterfall';
}

/**
 * Histogram chart layer configuration.
 *
 * Bins a set of raw numeric observations (`data: { value }[]`) into a frequency
 * distribution and draws one bar per bin on a CONTINUOUS (linear) value axis —
 * unlike the categorical `bar` layer. Binning is delegated to `d3-array`'s
 * `bin()`: control the granularity with `binCount` (uniform bins across the data
 * extent) or supply explicit `thresholds` cut points; pin the binning range with
 * `domain`. Set `mode: 'rootogram'` for a Tukey **hanging rootogram** — a normal
 * curve is fit from the sample mean/σ and each bar hangs from that expected
 * frequency so the gap to the axis reads as the fit residual. Covers the
 * *Histogram* and *Hanging Rootogram* catalog types.
 */
export interface NgeHistogramLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Horizontal gap (px) carved out between adjacent bin bars. Default 1. */
  barGap?: number;
  /** Bar corner radius (px). */
  barRadius?: number;
  /**
   * Desired number of uniform bins across the data extent. Ignored when explicit
   * `thresholds` are supplied. Default 10.
   */
  binCount?: number;
  /** Raw numeric observations — binned in the helper, not pre-aggregated. */
  data: NgeHistogramDataPoint[];
  /**
   * Explicit binning range `[min, max]`. Values outside it fall into the edge
   * bins. Defaults to the data's own `[min, max]` extent.
   */
  domain?: [number, number];
  /**
   * `'histogram'` (default) draws bars up from the zero baseline. `'rootogram'`
   * fits a normal curve and hangs each bar from it (residual = distance to axis).
   */
  mode?: 'histogram' | 'rootogram';
  /** Click handler for bins (payload carries the bin, not a raw datum). */
  onClick?: (event: NgeChartLayerClickEvent<NgeHistogramBin>) => void;
  /** Renderer function. Import `renderHistogramLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeHistogramDataPoint, NgeHistogramLayerConfig, any>;
  /** Show per-bin count labels above each bar. */
  showLabels?: boolean;
  /**
   * Draw a horizontal reference line at y = 0 (rootogram mode only — it marks the
   * residual baseline the hanging bars cross; bars dipping below it read as
   * observed > expected). Ignored in plain histogram mode, where y = 0 coincides
   * with the x-axis. Default false.
   */
  showZeroLine?: boolean;
  /**
   * Explicit bin boundary cut points fed straight to `d3.bin`. Overrides
   * `binCount` when set (values below the first / at-or-above the last cut point
   * fall into the edge bins).
   */
  thresholds?: number[];
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeHistogramBin>>;
  type: 'histogram';
}

/** How the distribution layer encodes each category's spread. */
export type DistributionRenderMode = 'box' | 'points' | 'violin';

/** Statistic driving the box-mode whisker extent. */
export type DistributionWhiskerStat = 'iqr' | 'minmax' | 'stddev' | 'stderr';

/** Point-scatter strategy used when rendering the raw observations (points mode). */
export type DistributionJitter = 'beeswarm' | 'none' | 'uniform';

/**
 * Distribution chart layer configuration.
 *
 * Summarises each category's set of raw numeric observations (`values[]`) as a
 * spread, seated on a shared band (category) + linear (value) scale pair. One
 * primitive fans out across a whole catalog family via `render`: `'box'` draws a
 * **box-and-whisker** (`showBox: false` ⇒ an **error-bar** plot; `whiskerStat`
 * picks Tukey IQR fences / min–max / ±σ / ±SE), `'points'` a **strip / jitter /
 * beeswarm** point cloud (`jitter`), and `'violin'` a mirrored **violin** KDE
 * density (`showInnerBox` overlays a mini box-and-whisker). Categories sit on the
 * band axis (x when vertical, y when horizontal); the observations read the linear
 * value axis.
 */
export interface NgeDistributionLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Box width as a fraction of the band bandwidth (0-1). Default 0.6. */
  boxWidth?: number;
  /** Data points to render — one distribution (box / violin / point cloud) per category. */
  data: NgeDistributionDataPoint[];
  /** Point-scatter strategy (points mode). Default `'beeswarm'`. */
  jitter?: DistributionJitter;
  /** Jitter / beeswarm spread as a fraction of the band bandwidth (0-1). Default 0.7. */
  jitterWidth?: number;
  /** KDE bandwidth (violin mode). Defaults to the Silverman rule-of-thumb. */
  kdeBandwidth?: number;
  /** KDE smoothing kernel (violin mode). Default `'epanechnikov'`. */
  kdeKernel?: 'epanechnikov' | 'gaussian';
  /** KDE sample resolution across the value domain (violin mode). Default 50. */
  kdeResolution?: number;
  /** Click handler for a category's distribution. */
  onClick?: (event: NgeChartLayerClickEvent<NgeDistributionDataPoint>) => void;
  /** Category-axis orientation. `'vertical'` (default) puts categories on x. */
  orientation?: 'horizontal' | 'vertical';
  /** Marker radius in pixels (points mode). */
  pointRadius?: number;
  /**
   * Distribution encoding. `'box'` (default) draws a box-and-whisker, `'points'`
   * a jittered / beeswarm point cloud, `'violin'` a mirrored KDE density.
   */
  render?: DistributionRenderMode;
  /** Renderer function. Import `renderDistributionLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeDistributionDataPoint, NgeDistributionLayerConfig, any>;
  /** Draw the box (box mode). `false` ⇒ an error-bar style (whiskers only). Default true. */
  showBox?: boolean;
  /** Overlay a mini box-and-whisker inside the violin (violin mode). Default true. */
  showInnerBox?: boolean;
  /** Mark the mean with a glyph (box mode). Default false. */
  showMean?: boolean;
  /** Draw outlier points beyond the whiskers (box mode). Default true when `whiskerStat` is `'iqr'`. */
  showOutliers?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeDistributionDataPoint>>;
  type: 'distribution';
  /** Whisker extent statistic (box mode). Default `'iqr'` (Tukey 1.5·IQR fences). */
  whiskerStat?: DistributionWhiskerStat;
}

/** How the heatmap encodes each cell's value. */
export type HeatmapMark = 'bubble' | 'cell';

/** Named sequential d3-scale-chromatic scheme (overrides the theme token ramp). */
export type HeatmapColorScheme =
  | 'blues'
  | 'greens'
  | 'greys'
  | 'inferno'
  | 'magma'
  | 'oranges'
  | 'plasma'
  | 'purples'
  | 'reds'
  | 'viridis'
  | 'ylGnBu'
  | 'ylOrRd';

/**
 * Heatmap chart layer configuration.
 *
 * A grid of value-encoded cells over a shared band × band scale pair — rows on the y
 * band axis, columns on the x band axis. `mark: 'cell'` (default) draws a
 * colour-encoded `<rect>` grid (**Heat Map**); `mark: 'bubble'` draws a `<circle>`
 * per cell whose radius is sqrt-scaled to the value (**Bubble-based Heat Map**),
 * double-encoded with the same ramp colour. Colour comes from a sequential ramp
 * resolved in the renderer — either a named `scheme` (d3-scale-chromatic) or the
 * theme token ramp (`rampFrom` → `rampMid?` → `rampTo`). A `null` value marks an
 * empty cell (theme `emptyColor` for cells, omitted for bubbles) that is excluded
 * from the colour domain; a per-cell `color` overrides everything.
 */
export interface NgeHeatmapLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Max bubble radius as a fraction of half the smaller band step (bubble mode). Default 0.9. */
  bubbleMaxRatio?: number;
  /** Data points to render — one cell per row × column pair. */
  data: NgeHeatmapDataPoint[];
  /** Explicit color domain [min, max]. Defaults to the data's non-null value extent. */
  domain?: [number, number];
  /**
   * In-cell label colour for EVERY cell — rung 2 of the label-colour chain (per-datum →
   * layer config → derived from the cell fill → `theme.heatmap.label.color`). Setting it
   * deliberately disables automatic on-fill contrast; a per-cell `labelColor` still wins
   * over it.
   */
  labelColor?: string;
  /** Format the in-cell / tooltip value. Default String(value). */
  labelFormat?: (value: number) => string;
  /** Cell (color-encoded) vs bubble (size-encoded) marks. Default 'cell'. */
  mark?: HeatmapMark;
  /** Click handler for a cell. */
  onClick?: (event: NgeChartLayerClickEvent<NgeHeatmapDataPoint>) => void;
  /** Renderer function. Import `renderHeatmapLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeHeatmapDataPoint, NgeHeatmapLayerConfig, any>;
  /** Named sequential scheme; overrides the theme token ramp when set. */
  scheme?: HeatmapColorScheme;
  /** Show per-cell value labels. Default false. */
  showValues?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeHeatmapDataPoint>>;
  type: 'heatmap';
}

/**
 * Timeline / Gantt chart layer configuration.
 *
 * Draws one horizontal bar per item spanning `[start, end]` on a continuous time
 * x-axis, seated on a categorical band y-axis (one row per unique `rowId`; multiple
 * items may share a row). Covers the *Gantt Chart*, *Timeline* and *Scaled Timeline*
 * catalog types from one primitive. Items flagged `milestone` render as a point
 * diamond at `start` instead of a span; `group` clusters rows into optional swim-lane
 * sections (wired through the preset's `rowGroups` → `base.yAxisGroups`). Requires the
 * time × band scale pair from `createTimelineChartScales` (the preset supplies it).
 */
export interface NgeTimelineLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Bar corner radius (px). Falls back to `theme.timeline.bar.radius`. */
  barRadius?: number;
  /** Data points to render — one span (or milestone) per item, grouped into rows by `rowId`. */
  data: NgeTimelineDataPoint[];
  /** Format the on-bar / tooltip label from a datum. Defaults to the datum's `label`. */
  labelFormat?: (data: NgeTimelineDataPoint) => string;
  /** Milestone diamond size (px). Falls back to `theme.timeline.milestone.size`. */
  milestoneSize?: number;
  /** Click handler for a span / milestone. */
  onClick?: (event: NgeChartLayerClickEvent<NgeTimelineDataPoint>) => void;
  /** Renderer function. Import `renderTimelineLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeTimelineDataPoint, NgeTimelineLayerConfig, any>;
  /** Padding between band rows (0-1) on the y band scale. Default 0.2. */
  rowPadding?: number;
  /** Draw the item label inside each span bar. Default false. */
  showLabels?: boolean;
  /** Render items flagged `milestone` as diamonds. Default true. */
  showMilestones?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeTimelineDataPoint>>;
  type: 'timeline';
}

/** How the word-cloud layer maps a word's `value` onto its font size. */
export type NgeWordCloudScale = 'linear' | 'log' | 'sqrt';

/**
 * Word cloud layer configuration.
 *
 * Frequency-sized text placed by a spiral layout, seated on self-computed geometry (it
 * IGNORES the shared cartesian scales). Each datum's `value` maps to a font size through
 * `scale`, and the words are placed largest-first along an archimedean spiral out from the
 * plot centre, taking the first position whose bounding box clears every word already
 * placed. Covers the catalog's *Word Cloud* type.
 *
 * **Placement is deterministic** — same data, same size, same picture. The classic
 * implementations randomise the spiral's start angle and each word's rotation, but a chart
 * that re-renders on resize, theme change and data update would then reshuffle every word on
 * every render and defeat the keyed enter/update/exit join. `rotations` is therefore applied
 * by index rather than at random.
 *
 * A word that finds no free position within the layout's iteration budget is **dropped**
 * rather than overlapped — the same "suppress what cannot be drawn cleanly" rule the
 * `minLabelSize` thresholds apply elsewhere.
 */
export interface NgeWordCloudLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant, used during zoom/pan gestures. Default 300.
   */
  animationMs?: number;
  /** Words to render — one `<text>` mark per datum. */
  data: NgeWordCloudDataPoint[];
  /**
   * Font family the words are drawn AND measured in. Falls back to
   * `theme.wordcloud.word.fontFamily`. Measurement and rendering must agree, so setting one
   * without the other is what produces a cloud with overlapping or over-spaced words.
   */
  fontFamily?: string;
  /** Format the rendered word / tooltip label. Defaults to the datum's own `label`. */
  formatLabel?: (d: NgeWordCloudDataPoint) => string;
  /** Font size (px) of the highest-valued word. Default 64. */
  maxFontSize?: number;
  /** Font size (px) of the lowest-valued word. Default 10. */
  minFontSize?: number;
  onClick?: (event: NgeChartLayerClickEvent<NgeWordCloudDataPoint>) => void;
  /** Clearance (px) kept between adjacent word boxes. Default 2. */
  padding?: number;
  /** Renderer function. Import `renderWordCloudLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeWordCloudDataPoint, NgeWordCloudLayerConfig, any>;
  /**
   * Rotation angles (degrees) cycled across the words by placement order. Default `[0]` —
   * every word horizontal. `[0, 90]` gives the classic mixed-orientation cloud. Applied by
   * index, never at random, so the layout stays stable across re-renders.
   */
  rotations?: number[];
  /**
   * How `value` maps to font size. `'sqrt'` (default) scales the word's AREA with its value,
   * which is what keeps a high-frequency outlier from swamping the cloud; `'linear'` scales
   * the height directly; `'log'` compresses a long tail. `'log'` falls back to `'sqrt'` when
   * any value is non-positive, which a log domain cannot represent.
   */
  scale?: NgeWordCloudScale;
  /** Word color palette. Placement order maps to colors[index % length]. */
  seriesColors?: string[];
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeWordCloudDataPoint>>;
  type: 'wordcloud';
}

/**
 * A value on one parallel-coordinates axis. A number puts the axis on a linear scale; a
 * string puts it on a point (ordinal) scale, which is how a categorical dimension such as
 * `origin` sits alongside numeric ones in the same chart.
 */
export type NgeParallelCoordsValue = number | string;

/** Polyline shape across the axes: straight segments, or an x-monotone curve. */
export type NgeParallelCoordsCurve = 'linear' | 'monotone';

/**
 * One dimension's brush selection, in DATA terms rather than pixels — so a consumer can feed
 * it straight into its own filtering (a table query, a sibling chart) instead of re-deriving
 * what a pixel band meant. The shape follows the axis's scale type: `range` for the linear
 * axis a numeric dimension resolves to, `categories` for the point axis a categorical one gets.
 */
export type NgeParallelCoordsBrushExtent =
  | {
      /** Selected categories, in axis (domain) order. */
      categories: string[];
      kind: 'categories';
    }
  | {
      kind: 'range';
      /** Selected `[min, max]`, ascending. */
      range: [number, number];
    };

/**
 * Active brush extents keyed by dimension `label`. A dimension absent from the map is
 * unbrushed; the extents present compose as AND.
 */
export type NgeParallelCoordsBrushExtents = Record<string, NgeParallelCoordsBrushExtent>;

/** Payload of a brush change — one drag on one axis. */
export interface NgeParallelCoordsBrushEvent {
  /** The dimension whose extent changed. */
  dimension: string;
  /** The extent for `dimension` after this change; `null` when the drag cleared it. */
  extent: NgeParallelCoordsBrushExtent | null;
  /**
   * Every active extent after this change — feed it straight back as `brushExtents` to close
   * the controlled loop, without having to merge the single-dimension change yourself.
   */
  extents: NgeParallelCoordsBrushExtents;
}

/**
 * Parallel coordinates layer configuration.
 *
 * A MULTI-AXIS cartesian primitive seated on self-computed geometry (it IGNORES the shared
 * cartesian scales). The N unique dimension `label`s become N vertical axes evenly spaced
 * across the plot width, and every `seriesId` group draws as one polyline visiting each axis
 * at its value for that dimension. Covers the catalog's *Parallel Coordinates* type;
 * `curve: 'monotone'` gives its curved variant.
 *
 * **Every axis carries its OWN scale.** This is the difference from the radar layer, which
 * shares one radial scale across all its spokes: parallel-coordinates dimensions are
 * different quantities (a price against a weight against a rating), so a shared domain would
 * flatten every axis but the largest. Axes whose values are all finite numbers get a
 * `scaleLinear`; any other axis gets a `scalePoint` over its categories in first-seen order.
 *
 * Line color resolves per-datum `color` → `colorBy` → the positional palette. Reach for
 * `colorBy` on any real dataset: this chart type routinely draws hundreds of records, and
 * cycling a six-entry palette by record index encodes nothing, whereas coloring by a
 * dimension's value is the reading the chart is for.
 */
export interface NgeParallelCoordsLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /**
   * Controlled per-axis brush selections, keyed by dimension `label`. Records that fail any
   * active extent drop to `theme['parallel-coords'].line.dimmedOpacity` instead of being
   * removed, so the filtered-out population stays legible as context.
   *
   * The layer never mutates this — a drag emits through {@link onBrush} and the consumer
   * feeds the new map back, which is what makes the extents shareable with the rest of a
   * dashboard. Setting it without an `onBrush` handler is a valid read-only mode: the chrome
   * and the dimming render, but there is no gesture.
   *
   * A record with NO value on a brushed dimension does not match — it cannot be shown to
   * cross that axis inside the range. This is the one place the layer's usual "a record
   * missing a dimension simply skips that axis" rule does not carry.
   */
  brushExtents?: NgeParallelCoordsBrushExtents;
  /**
   * Dimension `label` whose value colors each polyline: every distinct value of that
   * dimension takes a palette entry in first-seen order, and a record's line inherits the
   * color of its own value. Unset ⇒ color cycles the palette by record index.
   */
  colorBy?: string;
  /** Polyline shape. Default `'linear'` (straight segments between axes). */
  curve?: NgeParallelCoordsCurve;
  /** Data points to render — one `{ label, value }` per axis, grouped into records by `seriesId`. */
  data: NgeParallelCoordsDataPoint[];
  /**
   * Axis order, and the subset of dimensions to draw. Unset ⇒ every unique `label` in
   * first-seen order. Reordering matters to the reading: parallel coordinates only reveals a
   * correlation between two dimensions when their axes are adjacent.
   */
  dimensions?: string[];
  /**
   * Brush-change sink. Setting it is what ENABLES the drag gesture — a controlled brush with
   * nowhere to report does nothing, the same reasoning that gates the chart-level range-axis
   * brush on its handler. Drag an axis to select, drag a window's edge to resize or its body
   * to pan, click an axis without dragging to clear it.
   */
  onBrush?: (event: NgeParallelCoordsBrushEvent) => void;
  /** Click handler for record polylines. */
  onClick?: (event: NgeChartLayerClickEvent<NgeParallelCoordsDataPoint>) => void;
  /** Renderer function. Import `renderParallelCoordsLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeParallelCoordsDataPoint, NgeParallelCoordsLayerConfig, any>;
  /** Line color palette. Record index (or `colorBy` category index) maps to colors[index % length]. */
  seriesColors?: string[];
  /** Tick count requested per numeric axis. Default 5. Point axes label every category. */
  tickCount?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeParallelCoordsDataPoint>>;
  type: 'parallel-coords';
}

/**
 * How a treemap partitions its box.
 *
 * The six rectangular modes are `d3-hierarchy`'s own tiling functions and differ only in
 * how they cut — every one of them still produces axis-aligned rectangles. `'voronoi'` is
 * the odd member: a weighted-Voronoi (power-diagram) tessellation, a genuinely different
 * algorithm that yields straight-edged convex POLYGONS. Reach for it when the reading is
 * about grouping and adjacency rather than strict nesting, and accept that it is an
 * iterative solve rather than a closed-form layout.
 *
 * - `'squarify'` (default) — drives cell aspect ratios toward 1, which is what makes areas
 *   comparable by eye. The right default for "which of these is bigger".
 * - `'binary'` — recursive halving; keeps sibling input order far better than squarify.
 * - `'dice'` / `'slice'` — cut only across / only down. Use when one axis carries meaning.
 * - `'slice-dice'` — alternates by depth, so each level reads as a distinct direction.
 * - `'resquarify'` — squarified but STABLE: cells keep their place when values update, so an
 *   animating treemap does not reshuffle. Prefer it over `'squarify'` for live data.
 * - `'voronoi'` — the catalog's Convex Treemap.
 */
export type NgeTreemapTiling =
  'binary' | 'dice' | 'resquarify' | 'slice' | 'slice-dice' | 'squarify' | 'voronoi';

/**
 * Treemap (nested proportional rectangles) layer configuration.
 *
 * Partitions a `NgeHierarchyDatum` tree into cells whose AREA is proportional to value,
 * seated on the full plot rect (it IGNORES the shared cartesian scales, like the radial
 * layers). One primitive fans out across the catalog family via `tiling`: the rectangular
 * modes give **Treemap**, adding `paddingTop` / `paddingOuter` keeps parent cells visible
 * behind their children for **Nested Proportional Area**, and `'voronoi'` gives the
 * convex-polygon **Convex Treemap**. Cell colour resolves per-node `color` → the
 * `seriesColors` palette (by top-level branch index) → the theme `cell.colors` palette,
 * then lightens with depth by `theme.treemap.cell.depthFade` so nesting reads without an
 * outline. The layer is inherently categorical — pair it with a legend over the top-level
 * branches.
 *
 * Opt-in per-cell labels (`showLabels`) are drawn INSIDE the cell, styled from
 * `theme.treemap.label` with automatic on-fill contrast, and elided to the cell width. A
 * treemap's cells vary in size by orders of magnitude, so `minLabelSize` and
 * `maxLabelDepth` drop the ones that cannot seat text rather than letting them spill.
 */
export interface NgeTreemapLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /**
   * `tiling: 'voronoi'` only — stop the solve once total cell-area error falls to this
   * fraction of the plot area. Default `0.01` (1%). Lower is more faithful to the data and
   * slower; the layout is iterative, so this is the main quality/cost dial.
   */
  convergenceRatio?: number;
  /** Top-level hierarchy nodes (seated under a synthetic root) — one branch per node. */
  data: NgeHierarchyDatum[];
  /**
   * Format a cell's label (when `showLabels` is set). Receives the node datum carrying its
   * SUMMED value, so an internal node reports its aggregate rather than `undefined`.
   * Defaults to the datum's own `label`.
   */
  formatLabel?: (d: NgeHierarchyDatum) => string;
  /**
   * Label colour for EVERY cell — rung 2 of the label-colour chain (per-datum → layer
   * config → derived from the cell fill → `theme.treemap.label.color`). Setting it
   * deliberately disables automatic on-fill contrast, giving one flat label colour; a
   * per-datum `labelColor` still wins over it.
   */
  labelColor?: string;
  /** Optional depth cap — render at most this many levels. Unset ⇒ full depth. */
  maxDepth?: number;
  /**
   * `tiling: 'voronoi'` only — hard iteration ceiling, so a pathological dataset cannot
   * hang the render. Default 50. Raise it only alongside a lower `convergenceRatio`.
   */
  maxIterationCount?: number;
  /**
   * Deepest level that still gets a label (1 = top-level branches only). Independent of
   * `maxDepth`, which governs what is DRAWN: a treemap can render four levels while
   * labelling only the two with room. Unset ⇒ every drawn level is eligible.
   */
  maxLabelDepth?: number;
  /**
   * Smallest cell extent (in PIXELS) that still gets a label, tested in BOTH directions —
   * a cell must be at least this wide to seat the text and at least one line box tall to
   * seat its cap-height. Cells below it are dropped from the label join entirely rather
   * than drawn with text spilling across their neighbours, and regain their label as soon
   * as the data grows them. Default 12px, about one line box at the default label size.
   */
  minLabelSize?: number;
  /** Click handler for cells. */
  onClick?: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => void;
  /**
   * Gap (px) between sibling cells — `d3.treemap`'s `paddingInner`. Default 1, just enough
   * to separate adjacent cells without the theme stroke. Rectangular tilings only.
   */
  padding?: number;
  /**
   * Inset (px) between a parent cell's edge and its children — `d3.treemap`'s
   * `paddingOuter`. Non-zero is what makes a parent VISIBLE as a container behind its
   * children, which is the Nested Proportional Area reading. Default 0. Rectangular
   * tilings only.
   */
  paddingOuter?: number;
  /**
   * Extra inset (px) at the TOP of a parent cell, over and above `paddingOuter` —
   * `d3.treemap`'s `paddingTop`. This is the strip a parent's own label sits in, so set it
   * whenever `showLabels` is on and `maxLabelDepth` includes internal nodes. Default 0.
   * Rectangular tilings only.
   */
  paddingTop?: number;
  /** Renderer function. Import `renderTreemapLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeHierarchyDatum, NgeTreemapLayerConfig, any>;
  /**
   * `tiling: 'voronoi'` only — seed for the layout's initial cell sites. The tessellation
   * starts from random positions, so without a fixed seed the same data draws a different
   * arrangement on every render and reload. Default 1; change it to shop for a nicer
   * arrangement of the same data.
   */
  seed?: number;
  /** Cell color palette assigned by top-level branch index. index maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw a label inside each cell, styled from `theme.treemap.label`. Opt-in (default
   * false); cells below `minLabelSize` or past `maxLabelDepth` stay unlabelled.
   */
  showLabels?: boolean;
  /** Partition algorithm. Default `'squarify'`. See {@link NgeTreemapTiling}. */
  tiling?: NgeTreemapTiling;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeHierarchyDatum>>;
  type: 'treemap';
}

/** How a sankey link's ribbon is drawn between its two node rects. */
export type NgeSankeyLinkShape = 'curve' | 'parallelogram';

/** Which column a node is pushed to when its depth leaves a choice. */
export type NgeSankeyNodeAlign = 'center' | 'justify' | 'left' | 'right';

/**
 * Sankey layer configuration — weighted flow between staged nodes.
 *
 * Self-scaled to the plot rect (it IGNORES the shared cartesian scales, like the radial
 * and treemap layers). `d3-sankey` assigns each node a column from its depth in the graph
 * and a height proportional to the larger of its in/out flow; every link is a ribbon whose
 * thickness is its `value`.
 *
 * One primitive covers three catalog entries. The base curved form is the **Sankey
 * Diagram**; staging the same graph by a categorical variable (often time) is the
 * **Alluvial Diagram**, which needs no separate mode; and `linkShape: 'parallelogram'`
 * swaps the cubic ribbons for straight-sided ones, which — with categorical stages on
 * parallel axes — is **Parallel Sets**.
 *
 * `data` is a single {@link NgeGraph} object rather than an array, the same shape
 * exception the bullet layer makes. Node colour resolves per-node `color` → the
 * `seriesColors` palette (by node index) → the theme `node.colors` palette; a link with no
 * `color` inherits its source node's, which is what makes a flow readable as "coming from"
 * somewhere.
 *
 * Opt-in labels (`showLabels`) sit BESIDE each node rect — a node rect is `nodeWidth` wide
 * (16px by default), so text never fits inside one. With only that placement there is
 * nothing to disambiguate, so the single `theme.sankey.label` slice is theme-relative and
 * takes no on-fill contrast derivation, exactly like bar value labels. The layer reserves
 * the labels' width inside the plot rect before laying out, because the layers group is
 * clipped and a label hung past the edge would be discarded rather than merely tight.
 */
export interface NgeSankeyLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /** The flow graph — nodes (optional, derived from link endpoints when omitted) + links. */
  data: NgeGraph;
  /**
   * Format a node's label (when `showLabels` is set). Receives the node datum carrying
   * its SUMMED flow as `value`, so a node reports its throughput rather than `undefined`.
   * Defaults to the node's `label`, falling back to its `id`.
   */
  formatLabel?: (d: NgeGraphNode) => string;
  /**
   * Relaxation passes `d3-sankey` runs to reduce link crossings. Default 6. Higher is
   * tidier and slower; 0 leaves nodes in their initial column order.
   */
  iterations?: number;
  /**
   * Label colour for EVERY node label — rung 2 of the label-colour chain (per-datum →
   * layer config → derived from the mark fill → theme). Node labels sit outside the mark,
   * so the derivation rung is deliberately inert here and this simply overrides the theme.
   */
  labelColor?: string;
  /** Gap (px) between a node rect and its label. Default 6. */
  labelPadding?: number;
  /**
   * Ribbon geometry. `'curve'` (default) gives the cubic Sankey/Alluvial ribbon;
   * `'parallelogram'` gives the straight-sided Parallel Sets band. Both are drawn as
   * FILLED paths with vertical ends, so a ribbon always meets its node rect square on.
   */
  linkShape?: NgeSankeyLinkShape;
  /**
   * Which column a node lands in when its depth leaves a choice — `d3-sankey`'s four
   * alignment functions. `'justify'` (default) pushes sink nodes to the last column;
   * `'left'` / `'right'` anchor to one side; `'center'` centres unconnected nodes.
   */
  nodeAlign?: NgeSankeyNodeAlign;
  /** Vertical gap (px) between node rects in the same column. Default 8. */
  nodePadding?: number;
  /** Width (px) of a node rect. Default 16. */
  nodeWidth?: number;
  /** Click handler for node rects. */
  onClick?: (event: NgeChartLayerClickEvent<NgeGraphNode>) => void;
  /** Renderer function. Import `renderSankeyLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeGraphNode, NgeSankeyLayerConfig, any>;
  /** Node colour palette assigned by node index. index maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw a label beside each node rect, styled from `theme.sankey.label`. Opt-in
   * (default false). Labels in the left half sit to the right of their rect and vice
   * versa, so they always fall inward.
   */
  showLabels?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeGraphNode>>;
  type: 'sankey';
}

/** Which geometry the chord layer draws. See {@link NgeChordLayerConfig} `layout`. */
export type NgeChordLayout = 'circular' | 'linear';

/** How a connection between two nodes is drawn. See {@link NgeChordLayerConfig} `linkMark`. */
export type NgeChordLinkMark = 'edge' | 'ribbon';

/**
 * Chord layer configuration — a circular or linear diagram of weighted relationships between
 * nodes, folding three Data Viz Project catalog entries into one primitive via `layout` +
 * `linkMark`.
 *
 * Self-scaled to the plot rect (it IGNORES the shared cartesian scales, like the radial and
 * sankey layers). `data` is a single {@link NgeGraph} object rather than an array, the same
 * shape exception the sankey layer makes.
 *
 * `layout: 'circular'` (default) seats every node as an arc on an outer ring, each arc sized
 * by that node's total flow — computed by `d3.chord()` when `directed` is `false` (default),
 * which merges `A→B` and `B→A` into ONE ribbon with asymmetric ends, or by
 * `d3.chordDirected()` when `directed` is `true`, which keeps them as two separate ribbons
 * for a genuinely one-way graph. Within that ring, `linkMark: 'ribbon'` (default) fills each
 * connection as a `d3.ribbon()` shape between its two arcs — the classic **Chord Diagram** —
 * while `linkMark: 'edge'` strokes a thin curve instead of filling it, trading *volume* for
 * legibility of *which* nodes connect — the **Non-ribbon Chord**. `layout: 'linear'`
 * abandons the ring for a horizontal baseline: nodes become circles on the baseline (radius
 * proportional to `value`) labelled beneath, and every connection is drawn as a stroked
 * semicircular arc above the baseline whose `stroke-width` is proportional to its `value` —
 * the **Arc Diagram**. The linear layout is inherently stroked and renders as `'edge'`
 * regardless of `linkMark`.
 *
 * Node colour resolves per-node `color` → the `seriesColors` palette (by node index) → the
 * theme `node.colors` palette; a link with no `color` inherits its source node's, the same
 * rule the sankey layer uses so a connection reads as "coming from" somewhere.
 *
 * Opt-in labels (`showLabels`) sit OFF the mark — past the outer edge of the ring in
 * `'circular'` layout, beneath the node circle in `'linear'` layout — so the single
 * `theme.chord.label` slice is theme-relative and carries no on-fill contrast derivation,
 * exactly like the sankey layer's node labels.
 */
export interface NgeChordLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /** The relationship graph — nodes (optional, derived from link endpoints when omitted) + weighted links. */
  data: NgeGraph;
  /**
   * `false` (default) computes the layout with `d3.chord()`, which merges `A→B` and `B→A`
   * into ONE ribbon with asymmetric ends — the classic chord-diagram form, even over
   * directional data. `true` switches to `d3.chordDirected()`, drawing `A→B` and `B→A` as
   * two distinct ribbons for a genuinely one-way graph.
   */
  directed?: boolean;
  /**
   * End of the ring's angular span in radians (circular layout only). Default `2 * Math.PI`
   * (full turn).
   */
  endAngle?: number;
  /**
   * Format a node's label (when `showLabels` is set). Receives the node datum carrying its
   * SUMMED flow — the same value that sizes its arc / circle — as `value`, so a node reports
   * its throughput rather than `undefined`. Defaults to the node's `label`, falling back to
   * its `id`.
   */
  formatLabel?: (d: NgeGraphNode) => string;
  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius (circular layout only):
   * the ring of arcs occupies the band between this radius and the outer radius, and every
   * ribbon / edge attaches to its arc at this radius. NOT pixels (so it stays resize-safe).
   * Default 0.9 — a thin arc band with the ribbons filling the rest of the disc.
   */
  innerRadius?: number;
  /**
   * Label colour for EVERY node label — rung 2 of the label-colour chain (per-datum → layer
   * config → derived from the mark fill → theme). Node labels sit outside the mark, so the
   * derivation rung is deliberately inert here and this simply overrides the theme.
   */
  labelColor?: string;
  /** Gap (px) between a node's mark and its label. Default 6. */
  labelPadding?: number;
  /**
   * Layout family. `'circular'` (default) draws the ring of arcs — Chord Diagram or
   * Non-ribbon Chord, depending on `linkMark`; `'linear'` draws nodes on a horizontal
   * baseline with arced connections above it — the Arc Diagram.
   */
  layout?: NgeChordLayout;
  /**
   * How a connection is drawn. `'ribbon'` (default) fills the area between two arcs;
   * `'edge'` strokes a thin curve instead. The linear layout ignores this and always
   * renders as `'edge'`.
   */
  linkMark?: NgeChordLinkMark;
  /** Click handler for node arcs (circular layout) or node circles (linear layout). */
  onClick?: (event: NgeChartLayerClickEvent<NgeGraphNode>) => void;
  /** Angular gap between adjacent ring arcs, in radians (circular layout only). Default 0. */
  padAngle?: number;
  /**
   * Scale the self-computed outer radius by a RATIO (0–1) (circular layout only). See
   * `core/fns/radial-radius.fns.ts` — the shared sizing knob every radial layer applies as
   * the LAST step of its radius computation, after its own label reserves.
   */
  radiusRatio?: number;
  /** Renderer function. Import `renderChordLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeGraphNode, NgeChordLayerConfig, any>;
  /** Node color palette assigned by node index. index maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw a label off each node — past the ring in `'circular'` layout, beneath the circle in
   * `'linear'` layout — styled from `theme.chord.label`. Opt-in (default false).
   */
  showLabels?: boolean;
  /**
   * Order the sub-arcs within each group. `'none'` (default) leaves `d3-chord`'s own
   * ordering; `'ascending'` / `'descending'` sort them by value.
   */
  sortSubgroups?: 'ascending' | 'descending' | 'none';
  /** Start of the ring's angular span in radians (circular layout only). Default 0. */
  startAngle?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeGraphNode>>;
  type: 'chord';
}

/** Which geometry the network layer draws. See {@link NgeNetworkLayerConfig} `layout`. */
export type NgeNetworkLayout = 'cluster' | 'force' | 'hive';

/**
 * Network layer configuration — a node-link graph drawn as a graph, where a node's POSITION
 * carries the meaning. That is what separates it from the other two `NgeGraph` layers: sankey
 * and chord are flow diagrams, so every node is seated on a prescribed column or ring and only
 * the connections vary. Here the arrangement itself is the finding.
 *
 * Self-scaled to the plot rect (it IGNORES the shared cartesian scales, like the radial, sankey
 * and chord layers). `data` is a single {@link NgeGraph} object rather than an array, the same
 * shape exception those two make.
 *
 * `layout` folds four Data Viz Project catalog entries into one primitive, and splits into two
 * genuinely different geometries rather than one parameterised solver:
 *
 * - `'force'` (default) runs a `d3-force` simulation — link, many-body, centering and collision
 *   forces settle the graph into an arrangement where distance approximates relatedness. The
 *   **Network Visualisation**; add `showLabels` and `directed` and it is the **Sociogram**, which
 *   is a drawing convention over this same layout rather than a layout of its own.
 * - `'cluster'` runs the SAME simulation with an added per-`group` positional anchor, so nodes
 *   sharing a {@link NgeGraphNode} `group` gather while the graph's own structure still shapes
 *   the interior — the **Clustered Force Layout**.
 * - `'hive'` runs NO simulation. Nodes are placed deterministically on 2–3 straight axes
 *   radiating from the centre, assigned by `group` (falling back to a degree rule) and ranked
 *   along their axis by `value` (falling back to degree), with connections drawn as curves
 *   between axes — the **Hive Plot**. It is a constrained layout, not a force parameter, which
 *   is why it is a branch and not a flag.
 *
 * The simulation is DETERMINISTIC: it is seeded, run stopped for a fixed `tickCount`, and its
 * settled positions are memoized per chart instance — so the same data draws the same picture on
 * every render, reload and test run. See `layers/network/network-force-layout.ts`.
 *
 * Node colour resolves per-node `color` → the `seriesColors` palette (by node index) → the theme
 * `node.colors` palette; a link with no `color` inherits its source node's, the same rule the
 * sankey and chord layers use so a connection reads as "coming from" somewhere.
 *
 * Opt-in labels (`showLabels`) sit BESIDE the node circle, never on it, so the single
 * `theme.network.label` slice is theme-relative and carries no on-fill contrast derivation.
 */
export interface NgeNetworkLayerConfig {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /**
   * How many axes the hive layout radiates from the centre (`'hive'` only). Clamped to 2–4;
   * default 3. Nodes are assigned to an axis by `group` when the graph supplies one, else by
   * a degree rule, so an ungrouped graph still plots.
   */
  axisCount?: number;
  /**
   * Many-body force strength (`'force'` / `'cluster'` only). Negative values repel — the sign
   * that spreads a graph out; positive values would collapse it. Default -180.
   */
  charge?: number;
  /**
   * How hard a node is pulled toward its `group`'s anchor point (`'cluster'` only), 0–1.
   * Default 0.35 — firm enough to separate the groups, loose enough that the graph's own
   * link structure still shapes each cluster's interior.
   */
  clusterStrength?: number;
  /** The relationship graph — nodes (optional, derived from link endpoints when omitted) + weighted links. */
  data: NgeGraph;
  /**
   * Draw an arrowhead at each connection's target end, marking the direction of the
   * relationship. Opt-in (default false) — an undirected graph reads cleaner without them.
   * This plus `showLabels` is what turns the `'force'` layout into a Sociogram.
   */
  directed?: boolean;
  /**
   * Format a node's label (when `showLabels` is set). Receives the node datum carrying its
   * resolved magnitude — the same value that sizes its circle — as `value`, so a node whose
   * `value` the caller left unset still reports its degree rather than `undefined`. Defaults
   * to the node's `label`, falling back to its `id`.
   *
   * Called MORE THAN ONCE per node per render — once to measure the label's width (which is
   * what sizes the hive layout's axis reserve) and once to draw it. Keep it pure; a formatter
   * that counts its own invocations or mutates state will not see one call per node.
   */
  formatLabel?: (d: NgeGraphNode) => string;
  /**
   * Start of the hive axes as a RATIO (0–1) of the self-computed outer radius (`'hive'`
   * only) — every axis runs from this radius outward, leaving the centre clear so the
   * inter-axis curves have room to read. Default 0.15.
   */
  innerRadius?: number;
  /**
   * Label colour for EVERY node label — rung 2 of the label-colour chain (per-datum → layer
   * config → derived from the mark fill → theme). Node labels sit beside the circle rather
   * than on it, so the derivation rung is deliberately inert here and this simply overrides
   * the theme.
   */
  labelColor?: string;
  /** Gap (px) between a node's circle and its label. Default 6. */
  labelPadding?: number;
  /**
   * Layout family. `'force'` (default) settles a `d3-force` simulation; `'cluster'` adds a
   * per-`group` anchor to it; `'hive'` places nodes deterministically on radial axes.
   */
  layout?: NgeNetworkLayout;
  /**
   * Target distance (px) between two linked nodes (`'force'` / `'cluster'` only). Default 60.
   */
  linkDistance?: number;
  /** Largest node circle radius (px) — the radius of the highest-magnitude node. Default 16. */
  maxNodeRadius?: number;
  /** Smallest node circle radius (px) — the radius of a zero-magnitude node. Default 4. */
  minNodeRadius?: number;
  /** Click handler for node circles. */
  onClick?: (event: NgeChartLayerClickEvent<NgeGraphNode>) => void;
  /**
   * Scale the self-computed outer radius by a RATIO (0–1) (`'hive'` only). See
   * `core/fns/radial-radius.fns.ts` — the shared sizing knob every radial layer applies as
   * the LAST step of its radius computation, after its own label reserves.
   */
  radiusRatio?: number;
  /** Renderer function. Import `renderNetworkLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeGraphNode, NgeNetworkLayerConfig, any>;
  /**
   * Seed for the simulation's initial placement (`'force'` / `'cluster'` only). The layout is
   * deterministic per seed, so changing it re-rolls the arrangement without changing the data.
   * Default 42.
   */
  seed?: number;
  /** Node color palette assigned by node index. index maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw a label beside each node circle, styled from `theme.network.label`. Opt-in
   * (default false) — a dense graph is unreadable with every node named.
   */
  showLabels?: boolean;
  /**
   * How many iterations the simulation is stepped before the graph is drawn (`'force'` /
   * `'cluster'` only). Default 300 — enough for a graph of a few dozen nodes to settle. The
   * simulation is run STOPPED for exactly this many ticks rather than animating to rest,
   * which is what makes the layout reproducible and unit-testable.
   */
  tickCount?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeGraphNode>>;
  type: 'network';
}

/** Coordinate system the tree layer seats its nodes in. See {@link NgeTreeLayerConfig} `layout`. */
export type NgeTreeLayout = 'radial' | 'tidy';

/**
 * Which edge of the plot the root sits on, and therefore which way depth grows.
 * Cartesian (`'tidy'`) only — a radial tree puts the root at the centre, so depth always
 * grows outward and there is no orientation left to choose.
 */
export type NgeTreeOrientation = 'bottom-top' | 'left-right' | 'right-left' | 'top-bottom';

/** How a parent→child edge is drawn. See {@link NgeTreeLayerConfig} `linkShape`. */
export type NgeTreeLinkShape = 'curve' | 'elbow' | 'straight';

/**
 * Tree layer configuration — a hierarchy drawn as a LINK DIAGRAM.
 *
 * This is the third reading of `NgeHierarchyDatum` and the only one that draws the
 * parent→child relationship itself: the sunburst nests it as angle, the treemap as area, and
 * both leave the edges implicit in adjacency. Here the edge is a mark, which is what makes
 * structure — depth, branching factor, where a subtree hangs — directly legible.
 *
 * Self-scaled to the plot rect (it IGNORES the shared cartesian scales, like the radial,
 * sankey, chord and network layers).
 *
 * Four Data Viz Project catalog entries fall out of two orthogonal choices rather than four
 * code paths:
 *
 * - `alignLeaves` swaps `d3.tree()` for `d3.cluster()`, pushing every leaf onto the outer
 *   edge regardless of its depth — the **Dendrogram** reading. It is a flag and not a third
 *   `layout` member precisely because it composes with both coordinate systems: an aligned
 *   radial tree is the circular dendrogram.
 * - `layout` picks the coordinate system: `'tidy'` (default) is cartesian, `'radial'` wraps
 *   the same layout onto a full turn with the root at the centre — the **Radial Convergence**.
 *
 * The remaining two entries are drawing conventions over the tidy layout rather than layouts
 * of their own: `orientation: 'top-bottom'` + `linkShape: 'elbow'` + `showLabels` is the
 * **Organisational Chart**, and `orientation: 'left-right'` + `linkShape: 'curve'` is the
 * **Mind Map**.
 *
 * Node colour resolves per-node `color` → the `seriesColors` palette (by TOP-LEVEL branch
 * index, so a branch and all its descendants share one hue) → the theme `node.colors`
 * palette — the same rule the sunburst and treemap use, which is what lets one legend over
 * the top-level branches serve all three.
 *
 * Opt-in labels (`showLabels`) sit BESIDE the node circle, never on it, so the single
 * `theme.tree.label` slice is theme-relative and carries no on-fill contrast derivation.
 */
export interface NgeTreeLayerConfig {
  /**
   * Push every LEAF onto the outer edge of the plot regardless of its depth (`d3.cluster()`
   * instead of `d3.tree()`), so the leaves line up and the internal nodes stretch to meet
   * them. This is the Dendrogram reading — it makes the leaf set scannable as a list, at the
   * cost of no longer showing depth by position. Default false (tidy: a node sits at its own
   * depth).
   */
  alignLeaves?: boolean;
  /**
   * Standard enter/update/exit animation (per-phase durations + easing). Overrides
   * the chart-wide `animation` and the `animationMs` shorthand below.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Shorthand that sets enter = update = exit duration (ms); prefer `animation` for
   * per-phase control. `0` = instant. Default 300.
   */
  animationMs?: number;
  /** Top-level hierarchy nodes (seated under a synthetic root) — one branch per node. */
  data: NgeHierarchyDatum[];
  /**
   * Format a node's label (when `showLabels` is set). Receives the node datum carrying its
   * SUMMED value, so an internal node reports its aggregate rather than `undefined`.
   * Defaults to the datum's own `label`.
   *
   * Called MORE THAN ONCE per node per render — once to measure the widest label (which is
   * what sizes the layout's label reserve) and once to draw it. Keep it pure; a formatter
   * that counts its own invocations or mutates state will not see one call per node.
   */
  formatLabel?: (d: NgeHierarchyDatum) => string;
  /**
   * Label colour for EVERY node label — rung 2 of the label-colour chain (per-datum → layer
   * config → derived from the mark fill → theme). A tree label sits beside its node circle
   * rather than on it, so the derivation rung is deliberately inert here and this simply
   * overrides the theme.
   */
  labelColor?: string;
  /** Gap (px) between a node's circle and its label. Default 6. */
  labelPadding?: number;
  /**
   * Coordinate system. `'tidy'` (default) seats the tree on the plot rect and grows depth in
   * the `orientation` direction; `'radial'` puts the root at the centre and wraps the breadth
   * axis onto a full turn.
   */
  layout?: NgeTreeLayout;
  /**
   * How a parent→child edge is drawn. `'curve'` (default) is the d3 link generator's smooth
   * S-bend; `'elbow'` is the right-angle path of an org chart, which reads as a reporting
   * line rather than a flow; `'straight'` is a plain segment, the sparsest option for a
   * dense tree.
   *
   * `'elbow'` is cartesian-only — a right angle in polar coordinates is an arc-then-radius
   * pair that reads as neither, so `layout: 'radial'` falls back to `'curve'`.
   */
  linkShape?: NgeTreeLinkShape;
  /**
   * Optional depth cap — render at most this many levels below the root. Unset ⇒ full depth.
   * The cap is applied BEFORE layout, so the remaining levels spread across the whole plot
   * rather than leaving a gap where the pruned depth used to be.
   */
  maxDepth?: number;
  /** Node circle radius (px). Flat, not value-scaled — a tree's nodes mark structure, not magnitude. Default 4. */
  nodeRadius?: number;
  /** Click handler for node circles. */
  onClick?: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => void;
  /**
   * Which edge the root sits on, and therefore which way depth grows (`'tidy'` only).
   * Default `'left-right'` — with `showLabels` on, a horizontal tree needs one label reserve
   * on the leaf side, whereas a vertical one needs per-node horizontal room that varies with
   * sibling spacing. Use `'top-bottom'` for the org-chart reading.
   */
  orientation?: NgeTreeOrientation;
  /**
   * Scale the self-computed outer radius by a RATIO (0–1) (`'radial'` only). See
   * `core/fns/radial-radius.fns.ts` — the shared sizing knob every radial layer applies as
   * the LAST step of its radius computation, after its own label reserves.
   */
  radiusRatio?: number;
  /** Renderer function. Import `renderTreeLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeHierarchyDatum, NgeTreeLayerConfig, any>;
  /** Node color palette assigned by top-level branch index. index maps to colors[index % length]. */
  seriesColors?: string[];
  /**
   * Draw a label beside each node circle, styled from `theme.tree.label`. Opt-in (default
   * false) — a deep tree is unreadable with every node named.
   */
  showLabels?: boolean;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeHierarchyDatum>>;
  type: 'tree';
}

/**
 * Union of all layer configs.
 * Discriminated by 'type' field.
 */
export type NgeChartLayerDefinition =
  | NgeAreaLayerConfig
  | NgeBarLayerConfig
  | NgeBulletLayerConfig
  | NgeBumpLayerConfig
  | NgeChordLayerConfig
  | NgeDistributionLayerConfig
  | NgeDivergingBarLayerConfig
  | NgeFinancialLayerConfig
  | NgeFunnelLayerConfig
  | NgeGaugeLayerConfig
  | NgeGroupedBarLayerConfig
  | NgeHeatmapLayerConfig
  | NgeHistogramLayerConfig
  | NgeLineLayerConfig
  | NgeLollipopLayerConfig
  | NgeNetworkLayerConfig
  | NgeOverlayLayerConfig
  | NgeParallelCoordsLayerConfig
  | NgePieLayerConfig
  | NgeProportionalLayerConfig
  | NgeRadarLayerConfig
  | NgeRadialBarLayerConfig
  | NgeSankeyLayerConfig
  | NgeScatterLayerConfig
  | NgeStackedBarLayerConfig
  | NgeSunburstLayerConfig
  | NgeTimelineLayerConfig
  | NgeTreeLayerConfig
  | NgeTreemapLayerConfig
  | NgeWaterfallLayerConfig
  | NgeWordCloudLayerConfig;

/**
 * Data point types for each layer
 */
export interface NgeAreaDataPoint {
  /** Optional per-point color override */
  color?: string;
  /** Optional series identifier for multi-series / stacked charts */
  seriesId?: string;
  x: Date | number | string;
  y: number;
  /**
   * Optional lower bound for a range band. When present the band spans `[y0, y]`
   * (range mode) instead of rising from a zero / stacked baseline.
   */
  y0?: number;
}

export interface NgeBarDataPoint {
  /** Optional color override for the bar */
  color?: string;
  label: string;
  /**
   * Optional: Color for the value label text.
   * If not provided, uses theme.label.color.
   */
  labelColor?: string;
  /**
   * Optional: Maximum value of range (for filter interaction)
   */
  rangeMax?: number;
  /**
   * Optional: Minimum value of range (for filter interaction)
   */
  rangeMin?: number;
  value: number;
}

export interface NgeGroupedBarDataPoint {
  /** Optional color override for the bar */
  color?: string;
  /** Group identifier — e.g., "Active", "Closed" */
  groupId: string;
  /** Bar label within group — e.g., "Avg $/sqft", "Min", "Max" */
  label: string;
  /** Optional: Color for the value label text */
  labelColor?: string;
  value: number;
}

/**
 * One category's distribution for the distribution layer: the raw numeric
 * `values` whose spread is summarised (box / violin / point cloud). The layer
 * computes the quartiles / KDE / jitter itself — do NOT pre-aggregate.
 */
export interface NgeDistributionDataPoint {
  /** Band-axis category — one distribution per category. */
  category: string;
  /** Optional per-distribution color override. */
  color?: string;
  /** The raw numeric observations whose distribution is summarised. */
  values: number[];
}

/**
 * One period's OHLC observation for the financial layer. The candlestick variant
 * draws all four prices (wick `low`→`high`, body `open`→`close`); the derived
 * kagi/renko variants read only `close`. `date` positions the candle on the time-
 * ordered sequence axis (it is NOT a continuous time scale — one evenly-spaced slot
 * per datum) and is ignored by the time-independent kagi/renko variants.
 */
export interface NgeFinancialDataPoint {
  /** Closing price for the period (the only price the kagi/renko variants read). */
  close: number;
  /** Period timestamp — orders the candlestick sequence; ignored by kagi/renko. */
  date: Date | number | string;
  /** Highest price during the period (candlestick wick top). */
  high: number;
  /** Lowest price during the period (candlestick wick bottom). */
  low: number;
  /** Opening price for the period (candlestick body edge). */
  open: number;
}

/**
 * One band of the funnel / pyramid layer: a proportional `value` labelled by `label`.
 * `label` is the enter/update/exit join key, the legend row, and the default tooltip
 * label — so it must be unique per band. `value` is treated as non-negative (negatives
 * are clamped to 0 by the renderer). An optional `color` overrides the resolved palette
 * color for this band.
 */
export interface NgeFunnelDataPoint {
  /** Optional per-band fill override (wins over the seriesColors / theme palette). */
  color?: string;
  /** Band identity — the join key, legend row, and default tooltip label (unique per band). */
  label: string;
  /**
   * Optional per-band in-band label colour — the highest-priority rung of the label-colour
   * chain (per-datum → layer config → derived from the band fill → `theme.funnel.label.color`).
   * Supplying it opts this band out of automatic on-fill contrast.
   */
  labelColor?: string;
  /** Band magnitude (non-negative) — proportional to its width. */
  value: number;
}

/**
 * One datum of the gauge (single-value meter) layer: a `value` measured against its own
 * `[min, max]` range. Mirrors `NgeBulletDataPoint` (kept flat + JSON-serializable so it
 * promotes cleanly out of a domain lib) with `value` in place of `progress`, plus an
 * optional display `label`. `value` is clamped into `[min, max]` (a non-finite value
 * collapses to `min`).
 */
export interface NgeGaugeDataPoint {
  /** Optional color override for the value arc / fill / needle. */
  color?: string;
  /** Optional display label (reserved / tooltip). */
  label?: string;
  /** Maximum value of the range. */
  max: number;
  /** Minimum value of the range. */
  min: number;
  /** Units suffix (e.g., '%', 'MHz', 'Kb'). */
  units?: string;
  /** Current value (clamped into `[min, max]`). */
  value: number;
}

/**
 * One cell of the heatmap grid: the `value` at the intersection of a `row` (y band
 * axis) and `col` (x band axis). A `null` value marks an empty cell — drawn in the
 * theme `emptyColor` for cells, omitted for bubbles — and is excluded from the colour
 * domain. The layer resolves the colour ramp itself; do NOT pre-compute colours.
 */
export interface NgeHeatmapDataPoint {
  /** Column key — the x band-axis category. */
  col: string;
  /** Optional per-cell fill override (wins over ramp / scheme / theme). */
  color?: string;
  /** Optional short in-cell label (falls back to the formatted value when showValues). */
  label?: string;
  /**
   * Optional per-cell label colour — the highest-priority rung of the label-colour chain
   * (per-datum → layer config → derived from the cell fill → `theme.heatmap.label.color`).
   * Supplying it opts this cell out of automatic on-fill contrast.
   */
  labelColor?: string;
  /** Row key — the y band-axis category. */
  row: string;
  /** Cell magnitude driving color (and bubble size). null ⇒ empty cell. */
  value: null | number;
}

/**
 * One raw observation for the histogram layer. The layer bins these `value`s
 * itself (via `d3-array`'s `bin()`) — do NOT pre-aggregate into counts.
 */
export interface NgeHistogramDataPoint {
  /** The raw numeric observation to be binned. */
  value: number;
}

/**
 * One resolved histogram bin: the half-open interval `[x0, x1)` in value space
 * and the `count` of observations that fell in it. Emitted by `binHistogram` and
 * used as the tooltip / click interaction unit (a bin, not a single datum).
 */
export interface NgeHistogramBin {
  /** Number of observations in this bin. */
  count: number;
  /** Inclusive lower edge of the bin (value space). */
  x0: number;
  /** Exclusive upper edge of the bin (inclusive on the final bin). */
  x1: number;
}

export interface NgeLineDataPoint {
  /** Optional per-point color override */
  color?: string;
  /** Optional series identifier for multi-series charts */
  seriesId?: string;
  x: Date | number | string;
  y: number;
}

/**
 * One observation the overlay layer fits / summarises: a `y` at position `x`. Mirrors
 * the line data point — `x` accepts a `Date`, epoch-ms `number`, or date `string` (the
 * render fn coerces it to a number before fitting) — with an optional `seriesId` so a
 * multi-series source can be narrowed to the single series being annotated.
 */
export interface NgeOverlayDataPoint {
  /** Optional series identifier — filter a multi-series source via the layer `seriesId`. */
  seriesId?: string;
  x: Date | number | string;
  y: number;
}

/**
 * One observation for the bump layer: a series' metric `value` at one ordered x
 * position. The layer derives a `1..N` rank per x-tick from `value` (see
 * `NgeBumpLayerConfig`) — supply `rank` only to pin an explicit rank. `seriesId` is
 * required: a bump chart plots how named series rank against one another.
 */
export interface NgeBumpDataPoint {
  /** Optional per-point color override (wins over series/theme colors). */
  color?: string;
  /**
   * Explicit rank at this x-tick. When omitted, rank is derived from `value`. Used
   * verbatim when supplied — it may coincide with another series' (derived or explicit)
   * rank at the same x, seating two series on one rank; that is by design.
   */
  rank?: number;
  /** Series identifier — one rank line per series. */
  seriesId: string;
  /** Metric driving the derived rank (higher = rank 1 by default). */
  value: number;
  /** Ordered x position (time / sequence / category). */
  x: Date | number | string;
}

/**
 * One observation for the lollipop layer: a `value` at one band-axis `category`.
 *
 * A single-value datum draws a stem from the layer `baseline` up to a marker at
 * `value` (the *lollipop* / *dot-plot* family). Supplying `valueEnd` turns the row
 * into a *dumbbell / span*: two markers at `value` and `valueEnd` joined by a
 * segment (the baseline stem is dropped). Points sharing a `seriesId` map to the
 * multi-series palette and — when the layer's `connect` is set — are joined across
 * categories into a *slope* line.
 */
export interface NgeLollipopDataPoint {
  /** Band-axis category — one lollipop / row per category. */
  category: string;
  /** Optional per-point color override (wins over series/theme colors). */
  color?: string;
  /** Optional series id — points sharing it connect across categories when `connect` is set (slope), and map to the multi-series palette. */
  seriesId?: string;
  /** Primary value — the (first) marker position; single-marker stem runs baseline → value. */
  value: number;
  /** Optional second value ⇒ dumbbell/span: markers at `value` and `valueEnd` joined by a segment (replaces the baseline stem). */
  valueEnd?: number;
}

/**
 * One slice of the pie / donut / semi-circle layer: a proportional `value` labelled
 * by `label`. `label` is the enter/update/exit join key, the legend row, and the
 * default tooltip label — so it must be unique per slice. `value` is treated as
 * non-negative (negatives are clamped to 0 by the renderer). An optional `color`
 * overrides the resolved palette color for this slice.
 */
export interface NgePieDataPoint {
  /** Optional per-slice fill override (wins over the seriesColors / theme palette). */
  color?: string;
  /** Slice identity — the join key, legend row, and default tooltip label (unique per slice). */
  label: string;
  /**
   * Optional per-slice on-arc label colour — the highest-priority rung of the label-colour
   * chain (per-datum → layer config → derived from the slice fill → `theme.pie.label.color`).
   * Supplying it opts this slice out of automatic on-fill contrast.
   */
  labelColor?: string;
  /** Slice magnitude (non-negative) — proportional to its arc sweep. */
  value: number;
}

/**
 * One node of the shared hierarchical datum the sunburst / icicle layer partitions and the
 * proportional-area layer sizes by area (reused later by treemap). A tree of
 * `label`-identified nodes: a leaf
 * carries its own non-negative `value`, while an internal node OMITS `value` and has
 * its magnitude summed from `children` by `d3.hierarchy().sum()`. `label` is the
 * enter/update/exit join-key segment, the legend row, and the default tooltip label.
 * An optional `color` overrides the resolved palette color for this node.
 */
export interface NgeHierarchyDatum {
  /** Child nodes; omit/empty for a leaf. */
  children?: NgeHierarchyDatum[];
  /** Optional per-node fill override (wins over the branch palette). */
  color?: string;
  /** Node identity — join-key segment, legend row, default tooltip label. */
  label: string;
  /**
   * Optional per-node label colour — the highest-priority rung of the label-colour chain
   * (per-datum → layer config → derived from the node fill → `theme.<type>.label.color`).
   * Supplying it opts this node out of automatic on-fill contrast.
   */
  labelColor?: string;
  /** Leaf magnitude (non-negative). Internal-node value is summed from children by d3.hierarchy().sum(); leave unset on internal nodes. */
  value?: number;
}

/**
 * One vertex of a {@link NgeGraph} — the shared node-link model behind the flow and
 * relationship layers (sankey today; chord / arc and network / force next).
 *
 * Kept flat and JSON-serializable, like every other datum here, so a graph assembled in a
 * domain lib promotes into the shared library unchanged. `id` is the identity the links
 * reference and the join key the render fns bind on, which is why it is required while
 * `label` — a display concern — is not.
 *
 * ⚠️ `value` is an OUTPUT as much as an input. A layout that derives magnitude from the
 * graph (sankey sums each node's larger side) writes the computed throughput back onto the
 * node it hands to `formatLabel` / the tooltip, so a caller that left it unset still reads
 * a number there.
 */
export interface NgeGraphNode {
  /** Optional per-node fill override (wins over the palette). */
  color?: string;
  /**
   * Optional category this node belongs to — the clustering / axis-assignment key for the
   * layouts that arrange nodes by role rather than by flow (the network layer's `'cluster'`
   * and `'hive'`). A plain string rather than a config-level accessor function, so a graph
   * stays flat and JSON-serializable and promotes out of a domain lib unchanged.
   *
   * Ignored by the layouts that seat every node positionally (sankey, chord).
   */
  group?: string;
  /** Node identity — referenced by `NgeGraphLink.source` / `.target`, and the join key. */
  id: string;
  /** Display name. Defaults to `id` when unset. */
  label?: string;
  /**
   * Optional per-node label colour — the highest-priority rung of the label-colour chain.
   * Supplying it opts this node out of the layer-config and theme rungs.
   */
  labelColor?: string;
  /**
   * Magnitude. Optional on input: a layout that can derive it from the links does, and
   * writes the result back. Supply it to pin a node larger than its flow warrants.
   */
  value?: number;
}

/**
 * One weighted, directed edge of a {@link NgeGraph}.
 *
 * `source` / `target` are node **ids**, not indices or object references — an index breaks
 * the moment a caller filters the node list, and a reference is not serializable. Layers
 * resolve them against the node set.
 */
export interface NgeGraphLink {
  /**
   * Optional per-link fill override. Unset, a link takes its SOURCE node's colour, which
   * is what lets a reader follow a flow forward through the diagram.
   */
  color?: string;
  /** Id of the node this edge leaves. */
  source: string;
  /** Id of the node this edge enters. */
  target: string;
  /** Edge weight — ribbon thickness / arc width / edge strength. Non-negative. */
  value: number;
}

/**
 * A node-link graph: the shared data model for flow and relationship layers, playing the
 * role {@link NgeHierarchyDatum} plays for the nesting layers.
 *
 * `nodes` is OPTIONAL. Most flow datasets arrive as links alone, so a layer derives the
 * node set from the link endpoints in first-seen order when it is omitted. Supply it to
 * control node ORDER (which drives the palette and the initial column layout), to give
 * nodes display labels or colours, or to include a node no link touches.
 *
 * ⚠️ Layouts in this family mutate what they are given — `d3-sankey` replaces each link's
 * `source` / `target` id with a resolved node object and writes geometry onto both. A
 * render fn therefore works on a COPY; the caller's graph is never touched, so a config
 * object stays reusable across re-renders and across charts.
 */
export interface NgeGraph {
  /** The weighted edges. Required — the graph's structure lives here. */
  links: NgeGraphLink[];
  /** Explicit node set. Omit to derive it from the link endpoints in first-seen order. */
  nodes?: NgeGraphNode[];
}

/**
 * One datum of the radar / polar layer: a radial `value` at the angular axis `label`,
 * belonging to the series `seriesId`. Kept flat + JSON-serializable so it promotes cleanly
 * out of a domain lib.
 *
 * - `label` — the angular axis (dimension / spoke) this point sits on. The set of unique
 *   `label`s across the data defines the spokes; within one series each `label` appears once.
 * - `value` — the radial magnitude along the axis (non-negative; negatives clamp to 0).
 * - `seriesId` — groups points into one closed radar polygon and maps the series to the
 *   palette by its first-seen index. A single-series radar leaves it unset.
 * - `color` — reserved per-datum override (radar resolves series color positionally by index).
 */
export interface NgeRadarDataPoint {
  /** Optional per-datum fill override (radar resolves series color positionally by index). */
  color?: string;
  /** Angular axis (dimension) label — the spoke this point sits on and the join key. */
  label: string;
  /** Optional series id — groups points into one radar polygon and maps to the palette by index. */
  seriesId?: string;
  /** Radial magnitude (non-negative) along the axis. */
  value: number;
}

/**
 * One datum of the radial-bar (polar) layer: a radial `value` at the angular category
 * `label`. Kept flat + JSON-serializable so it promotes cleanly out of a domain lib.
 *
 * - `label` — the angular category (band) position around the circle AND the join key
 *   for `'bar'` / `'area'`. Within one `'area'` series it must be unique.
 * - `value` — the radial magnitude: bar length (`'bar'`), area/line radius (`'area'`),
 *   or cell intensity (`'cell'`). Treated as non-negative (negatives clamp to 0).
 * - `band` — the radial RING key, used ONLY by `mark: 'cell'` (circular heat map) to
 *   stack a datum onto a concentric ring; ignored by `'bar'` / `'area'`.
 * - `seriesId` — groups multi-series radial line/area (`'area'`) and maps a series to the
 *   palette by its index; a bar/cell chart leaves it unset.
 * - `color` — per-datum fill override (wins over the `seriesColors` / theme palette).
 */
export interface NgeRadialBarDataPoint {
  /** Radial ring key — used ONLY by `mark: 'cell'` (circular heat map). Ignored by bar/area. */
  band?: number | string;
  /** Optional per-datum fill override (wins over the seriesColors / theme palette). */
  color?: string;
  /** Angular category (band) — the position around the circle and the bar/area join key. */
  label: string;
  /**
   * Optional per-datum label colour — the highest-priority rung of the label-colour chain
   * (per-datum → layer config → derived from the bar fill → `theme['radial-bar'].label.color`).
   * Supplying it opts this bar out of automatic on-fill contrast.
   */
  labelColor?: string;
  /** Optional series id — groups a multi-series radial line/area and maps to the palette by index. */
  seriesId?: string;
  /** Radial magnitude (non-negative) — bar length / area radius / cell intensity. */
  value: number;
}

export interface NgeScatterDataPoint {
  color?: string;
  /**
   * Optional per-point opacity override (0-1). Falls back to theme.point.opacity.
   * The de-emphasis primitive used by series selection: unlike color math, opacity
   * composes with unresolved `var(--nge-chart-*)` palette colors.
   */
  opacity?: number;
  /** Optional series identifier for multi-series charts */
  seriesId?: string;
  size?: number;
  x: number;
  y: number;
}

/**
 * One long-format observation for the stacked-bar layer: the `value` of
 * `seriesId` within `category`. Points sharing a `category` stack into one
 * column; points sharing a `seriesId` form one stack series across columns.
 */
export interface NgeStackedBarDataPoint {
  /** Band-axis category — points sharing it stack into one column. */
  category: string;
  /** Optional per-segment color override. */
  color?: string;
  /**
   * Optional per-segment in-segment label colour — the highest-priority rung of the
   * label-colour chain (per-datum → layer config → derived from the segment fill →
   * `theme['stacked-bar'].label.color`). Supplying it opts this segment out of
   * automatic on-fill contrast.
   */
  labelColor?: string;
  /** Stack-series identifier — points sharing it form one series. */
  seriesId: string;
  /** Segment magnitude. */
  value: number;
}

/**
 * One observation for the waterfall layer: a labelled `value` at one bar.
 *
 * `kind: 'delta'` (default) contributes its signed `value` to the running
 * cumulative — the bar floats from the prior running total to the new one.
 * `kind: 'total'` is a subtotal / total checkpoint anchored at zero (the bar
 * spans `[0, runningTotal]`) and does not advance the running total.
 */
export interface NgeWaterfallDataPoint {
  /** Optional per-bar fill override (wins over the rise/fall/total theme colors). */
  color?: string;
  /**
   * Bar role. `'delta'` (default) adds `value` to the running total (rise/fall
   * bar); `'total'` renders an anchored-at-zero subtotal / total bar at the
   * current running total without changing it.
   */
  kind?: 'delta' | 'total';
  /** Band-axis label — one bar per datum. */
  label: string;
  /** Signed contribution for `'delta'` bars; display magnitude for `'total'` bars. */
  value: number;
}

export interface NgeBulletDataPoint {
  /** Optional color override for progress bar and indicator */
  color?: string;
  /** Maximum value of the range */
  max: number;
  /** Minimum value of the range */
  min: number;
  /** Current progress value */
  progress: number;
  /** Units suffix (e.g., 'Kb', 'MHz', '%') */
  units?: string;
}

/**
 * Data point for diverging bar chart.
 * Value range is typically symmetric around 0 (e.g., -100 to +100).
 * Bar extends from center (0) toward the value.
 */
export interface NgeDivergingBarDataPoint {
  /** Maximum value of the range (typically positive, e.g., 100) */
  max: number;
  /** Minimum value of the range (typically negative, e.g., -100) */
  min: number;
  /** Color for negative values (left side). Defaults to theme color. */
  negativeColor?: string;
  /** Color for positive values (right side). Defaults to theme color. */
  positiveColor?: string;
  /** Units suffix (e.g., '%', 'pts') */
  units?: string;
  /** Current value. Positive extends right, negative extends left from center. */
  value: number;
}

/**
 * One item on the timeline / Gantt layer: a task/event spanning `[start, end]` on a
 * time axis, placed on the band row named by `rowId`. Multiple items may share a
 * `rowId` (several bars on one row). An item flagged `milestone` is a zero-duration
 * marker drawn as a diamond at `start` (its `end` is ignored). Times accept a `Date`,
 * an epoch-ms `number`, or a date `string` — the layer coerces them.
 */
export interface NgeTimelineDataPoint {
  /** Optional per-bar fill override (a resolved color; wins over the theme bar color). */
  color?: string;
  /** End of the span (right edge). Ignored when `milestone` is set. */
  end: Date | number | string;
  /** Optional grouping key — items sharing it cluster into a swim-lane section (via the preset's `rowGroups`). */
  group?: string;
  /** Stable identity for the enter/update/exit join. Falls back to `` `${rowId}:${start}:${end}` ``. */
  id?: string;
  /** Bar/label text and the default tooltip label. */
  label?: string;
  /** Render as a point milestone (diamond at `start`) instead of a span. Default false. */
  milestone?: boolean;
  /** Band-axis row — one row per unique `rowId`; items may share a row. */
  rowId: string;
  /** Start of the span (left edge); the marker position when `milestone`. */
  start: Date | number | string;
}

/**
 * One word of the word-cloud layer: a `label` drawn at a size proportional to its `value`.
 *
 * `label` is the word itself — the enter/update/exit join key, the legend row, and the
 * default tooltip label — so it must be unique across the data. `value` is its frequency /
 * weight and is treated as non-negative.
 *
 * There is no `labelColor` counterpart to the other layers': in a word cloud the text IS the
 * mark rather than a label drawn on one, so `color` already names the text's own colour and
 * the on-fill contrast derivation (`resolveLabelColor`) has nothing to derive against.
 */
export interface NgeWordCloudDataPoint {
  /** Optional per-word text-colour override (wins over the seriesColors / theme palette). */
  color?: string;
  /** The word — the join key, legend row, and default tooltip label (unique per datum). */
  label: string;
  /** Word magnitude (non-negative) — proportional to its font size. */
  value: number;
}

/**
 * One record's value on one parallel-coordinates axis.
 *
 * The data is LONG rather than wide — a record contributes one datum per dimension, tied
 * together by `seriesId`, rather than arriving as a single row of fields. That is the shape
 * the radar layer already uses for its own multi-axis data, so one fixture can drive both
 * chart types and the library keeps a single multi-axis convention.
 */
export interface NgeParallelCoordsDataPoint {
  /** Optional per-record line-colour override (wins over `colorBy` and the palette). */
  color?: string;
  /** Dimension (axis) label this value sits on — the axis join key. */
  label: string;
  /** Record identity — groups this datum's siblings into one polyline across the axes. */
  seriesId?: string;
  /** Value on this dimension: a number for a linear axis, a string for a point axis. */
  value: NgeParallelCoordsValue;
}

/**
 * Unified chart configuration.
 * Single config object for the <nge-chart> component.
 */
export interface NgeChartConfig {
  /**
   * Chart-wide default enter/update/exit animation (durations + easing) applied to
   * every layer. A layer's own `animation` / `animationMs` overrides it per-layer;
   * the standard `NGE_CHART_ANIMATION_DEFAULTS` fills any remaining gaps.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Base layout configuration (margins, axes, scale types)
   */
  base?: NgeChartBaseConfig;

  /**
   * Opt-in wheel-zoom / drag-pan gesture capture. The chart emits semantic
   * `NgeChartGestureEvent`s (via `<nge-chart (chartGesture)>`) — pair with a
   * transform (e.g. NgeScatterChartTransform.onChartGesture) for zoom/pan.
   */
  gestures?: NgeChartGesturesConfig;

  /**
   * Array of layer definitions to render.
   * Layers are rendered in order (first = back, last = front).
   *
   * Supports nested arrays (flattened during rendering) for grouping:
   * ```typescript
   * layers: [
   *   [barLayer1, barLayer2],  // Group of bar layers
   *   lineLayer,               // Single layer
   * ]
   * ```
   *
   * When combining presets, use spread to preserve types:
   * ```typescript
   * layers: [...barConfig.layers, ...lineConfig.layers]
   * ```
   */
  layers: (NgeChartLayerDefinition | NgeChartLayerDefinition[])[];

  /**
   * Legend configuration. When enabled, renders a legend above or below the chart.
   * Presets auto-populate items from layer data.
   */
  legend?: NgeChartLegendConfig;

  /**
   * Custom scale factory function.
   * If provided, this function will be called to create scales instead of the default.
   * Useful for custom scale types, domains, or advanced configurations.
   *
   * @example
   * ```typescript
   * scaleFactory: (config, dimensions) => ({
   *   x: scaleTime().domain([startDate, endDate]).range([0, dimensions.boundedWidth]),
   *   y: scaleLinear().domain([0, 100]).range([dimensions.boundedHeight, 0])
   * })
   * ```
   */
  scaleFactory?: NgeChartScaleFactory;

  /**
   * Theme overrides (see P4 for theme models)
   */
  theme?: NgeChartTheme;
}

// NgeChartTheme is now imported from '../theme/nge-chart-theme.models'
// Re-export for convenience
export type { NgeChartTheme } from '../theme/nge-chart-theme.models';
