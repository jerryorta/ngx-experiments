import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeRadialBarDataPoint,
  NgeRadialBarLayerConfig,
  NgeRadialBarMark,
  NgeRadialBarWedge,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderRadialBarLayer } from '../layers/radial-bar';

/**
 * Tooltip options for the radial-bar chart preset.
 */
export interface RadialBarChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeRadialBarDataPoint) => NgeTooltipContent;

  /**
   * Tooltip height
   */
  height?: number;

  /**
   * Visual styling options (border color, background color, divot size)
   */
  style?: NgeTooltipStyle;

  /**
   * Tooltip width
   */
  width?: number;
}

/**
 * Options for creating a radial-bar (polar) chart config preset.
 */
export interface RadialBarChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Data points to render — one arc / vertex per point (grouped by `seriesId` for `'area'`).
   */
  data: NgeRadialBarDataPoint[];

  /**
   * End of the angular sweep in radians (semi-circle / gauge). Default `2 * Math.PI`.
   */
  endAngle?: number;

  /**
   * Format a bar's label (when `showLabels` is set). Receives the bar's own datum, so a
   * value label is `d => String(d.value)`. Defaults to the datum's own `label`.
   */
  formatLabel?: NgeRadialBarLayerConfig['formatLabel'];

  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → start at the
   * center, e.g. `0.3` carves a center hole. NOT pixels.
   */
  innerRadius?: number;

  /**
   * Flat label colour for EVERY bar — rung 2 of the label-colour chain. Setting it
   * disables the automatic on-fill contrast that `labelPosition: 'inside'` applies by
   * default; a per-datum `labelColor` still wins. Outside labels never derive — they take
   * `theme['radial-bar'].labelOutside.color`.
   */
  labelColor?: string;

  /**
   * Pixels reserved around the chart for outside labels — the outer radius shrinks by this
   * much so a label cannot fall outside the clipped plot area. Ignored when `labelPosition`
   * is `'inside'`. Default 48.
   */
  labelGutter?: number;

  /**
   * Where `showLabels` draws each bar's label. `'inside'` (default) runs it along the
   * bar's radius with automatic on-fill contrast; `'outside'` puts a horizontal category
   * ring just beyond the perimeter.
   */
  labelPosition?: NgeRadialBarLayerConfig['labelPosition'];

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Radial shape: `'bar'` arcs (default), `'area'` closed radial area, `'cell'` heatmap grid.
   */
  mark?: NgeRadialBarMark;

  /**
   * Smallest bar sweep (radians) that still gets a label. Default 0.15 rad inside, 0
   * outside. A zero-sweep bar is never labelled.
   */
  minLabelAngle?: number;

  /**
   * Smallest extent (px) that still gets a label, measured in whichever direction the text
   * runs — the thin-bar / short-arc rule. Default 12.
   */
  minLabelSize?: number;

  /**
   * Click handler for bars / cells / area vertices
   */
  onClick?: NgeRadialBarLayerConfig['onClick'];

  /**
   * Angular gap between adjacent bars in radians (`mark: 'bar'`). `0` ⇒ contiguous
   * wedges (rose). Default 0.
   */
  padAngle?: number;

  /**
   * Scale the self-computed outer radius by a RATIO (0–1): `1` (default) fills the plot,
   * `0.75` draws it at three-quarters size. Applied AFTER the layer's own label reserves,
   * and `innerRadius` scales with it, so the chart shrinks without distorting. The knob for
   * "make the chart smaller in a box I do not control" — not `labelGutter`, which is
   * measured off the arc and drags the labels inward with it.
   */
  radiusRatio?: number;

  /**
   * Fill palette. Datum input index (bar/cell) or series index (area) maps to
   * colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label on each bar (`mark: 'bar'` only). Opt-in — default false.
   */
  showLabels?: boolean;

  /**
   * Start of the angular sweep in radians (semi-circle / gauge). Default 0.
   */
  startAngle?: number;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: RadialBarChartTooltipOptions;

  /**
   * Angular distribution across categories (`mark: 'bar'` only). `'equal'` (default)
   * gives every category the same slot; `'value'` makes each wedge proportional to value.
   */
  wedge?: NgeRadialBarWedge;
}

/**
 * Default content formatter for radial-bar data points — label + raw value.
 */
function defaultRadialBarTooltipFormatter(data: NgeRadialBarDataPoint): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value),
  };
}

/**
 * Create a standard radial-bar (polar) chart configuration.
 *
 * @example
 * const config = createRadialBarChartConfig({
 *   data: [
 *     { label: 'Mon', value: 30 },
 *     { label: 'Tue', value: 55 },
 *     { label: 'Wed', value: 40 },
 *   ],
 *   mark: 'bar',
 *   wedge: 'equal',
 *   innerRadius: 0.2,
 *   padAngle: 0.02,
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createRadialBarChartConfig(options: RadialBarChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    endAngle,
    formatLabel,
    innerRadius,
    labelColor,
    labelGutter,
    labelPosition,
    margin,
    mark,
    minLabelAngle,
    minLabelSize,
    onClick,
    padAngle,
    radiusRatio,
    seriesColors,
    showLabels,
    startAngle,
    tooltip,
    wedge,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the arc centroid by the
  // renderer (`pointTooltipEvent`), so there is no `position` knob to wire — the
  // renderer's `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultRadialBarTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures (ARCH-174): a radial-bar is a radial, single-view chart — no meaningful
  // zoom/pan surface, so it exposes no `gestures` option. Axes are off (radial layout).
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 10, left: 10, right: 10, top: 10 },
      showXAxis: false,
      showYAxis: false,
    },
    layers: [
      {
        data,
        endAngle,
        formatLabel,
        innerRadius,
        labelColor,
        labelGutter,
        labelPosition,
        mark,
        minLabelAngle,
        minLabelSize,
        onClick,
        padAngle,
        radiusRatio,
        renderer: renderRadialBarLayer,
        seriesColors,
        showLabels,
        startAngle,
        tooltip: tooltipConfig,
        type: 'radial-bar',
        wedge,
      },
    ],
  };
}
