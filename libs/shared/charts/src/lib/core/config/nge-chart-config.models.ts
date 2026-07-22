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
  | 'distribution'
  | 'diverging-bar'
  | 'financial'
  | 'gauge'
  | 'grouped-bar'
  | 'heatmap'
  | 'histogram'
  | 'line'
  | 'lollipop'
  | 'overlay'
  | 'pie'
  | 'radar'
  | 'radial-bar'
  | 'scatter'
  | 'stacked-bar'
  | 'sunburst'
  | 'timeline'
  | 'waterfall';

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
  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → a full pie,
   * e.g. `0.6` → a donut whose center hole is 60% of the radius. NOT pixels (so it
   * stays resize-safe). Default 0.
   */
  innerRadius?: number;
  /** Click handler for slices. */
  onClick?: (event: NgeChartLayerClickEvent<NgePieDataPoint>) => void;
  /** Angular gap between adjacent slices in radians. Default 0. */
  padAngle?: number;
  /** Renderer function. Import `renderPieLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgePieDataPoint, NgePieLayerConfig, any>;
  /** Slice color palette. Slice input index maps to colors[index % length]. */
  seriesColors?: string[];
  /** Start of the angular sweep in radians (semi-circle / gauge). Default 0 (12 o'clock). */
  startAngle?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgePieDataPoint>>;
  type: 'pie';
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
  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius (radial layout):
   * `0` → rings start at the center, `> 0` carves a center hole (donut). NOT pixels
   * (so it stays resize-safe). Default 0.
   */
  innerRadius?: number;
  /**
   * Partition layout. `'radial'` (default) draws concentric rings (sunburst / donut /
   * pie rings); `'linear'` draws stacked rectangle columns (icicle).
   */
  layout?: 'linear' | 'radial';
  /** Optional depth cap — render at most this many rings / columns. Unset ⇒ full depth. */
  maxDepth?: number;
  /** Click handler for nodes. */
  onClick?: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => void;
  /** Angular gap between adjacent nodes in radians (radial layout). Default 0. */
  padAngle?: number;
  /** Renderer function. Import `renderSunburstLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeHierarchyDatum, NgeSunburstLayerConfig, any>;
  /** Node color palette assigned by top-level branch index. index maps to colors[index % length]. */
  seriesColors?: string[];
  /** Start of the angular sweep in radians (radial layout). Default 0 (12 o'clock). */
  startAngle?: number;
  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeHierarchyDatum>>;
  type: 'sunburst';
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
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → bars/rings
   * start at the center, e.g. `0.3` carves a center hole. NOT pixels (so it stays
   * resize-safe). Default 0.
   */
  innerRadius?: number;
  /** Radial shape: `'bar'` arcs (default), `'area'` closed radial area, `'cell'` heatmap grid. */
  mark?: NgeRadialBarMark;
  /** Click handler for bars / cells / area vertices. */
  onClick?: (event: NgeChartLayerClickEvent<NgeRadialBarDataPoint>) => void;
  /** Angular gap between adjacent bars in radians (`mark: 'bar'`). `0` ⇒ contiguous wedges (rose). Default 0. */
  padAngle?: number;
  /** Renderer function. Import `renderRadialBarLayer` from '@nge/charts'. */
  renderer: NgeChartLayerRenderFn<NgeRadialBarDataPoint, NgeRadialBarLayerConfig, any>;
  /** Fill palette. Datum input index (bar/cell) or series index (area) maps to colors[index % length]. */
  seriesColors?: string[];
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

/**
 * Union of all layer configs.
 * Discriminated by 'type' field.
 */
export type NgeChartLayerDefinition =
  | NgeAreaLayerConfig
  | NgeBarLayerConfig
  | NgeBulletLayerConfig
  | NgeBumpLayerConfig
  | NgeDistributionLayerConfig
  | NgeDivergingBarLayerConfig
  | NgeFinancialLayerConfig
  | NgeGaugeLayerConfig
  | NgeGroupedBarLayerConfig
  | NgeHeatmapLayerConfig
  | NgeHistogramLayerConfig
  | NgeLineLayerConfig
  | NgeLollipopLayerConfig
  | NgeOverlayLayerConfig
  | NgePieLayerConfig
  | NgeRadarLayerConfig
  | NgeRadialBarLayerConfig
  | NgeScatterLayerConfig
  | NgeStackedBarLayerConfig
  | NgeSunburstLayerConfig
  | NgeTimelineLayerConfig
  | NgeWaterfallLayerConfig;

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
  /** Slice magnitude (non-negative) — proportional to its arc sweep. */
  value: number;
}

/**
 * One node of the shared hierarchical datum the sunburst / icicle layer partitions
 * (reused later by treemap / icicle). A tree of `label`-identified nodes: a leaf
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
  /** Leaf magnitude (non-negative). Internal-node value is summed from children by d3.hierarchy().sum(); leave unset on internal nodes. */
  value?: number;
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
   * composes with unresolved `var(--chart-*)` palette colors.
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
