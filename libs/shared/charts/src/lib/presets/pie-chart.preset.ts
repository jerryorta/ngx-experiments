import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeChartConfig, NgePieDataPoint, NgePieLayerConfig } from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderPieLayer } from '../layers/pie';

/**
 * Tooltip options for the pie chart preset.
 */
export interface PieChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgePieDataPoint) => NgeTooltipContent;

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
 * Options for creating a pie / donut / semi-circle chart config preset.
 */
export interface PieChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Data points to render — one slice per point, in input order.
   */
  data: NgePieDataPoint[];

  /**
   * End of the angular sweep in radians (semi-circle / gauge). Default `2 * Math.PI`.
   */
  endAngle?: number;

  /**
   * Format the slice label (when `showLabels` is set). Defaults to the datum's `label`.
   */
  formatLabel?: NgePieLayerConfig['formatLabel'];

  /**
   * Slice labels to emphasise — named slices stay at full opacity, the rest dim back to
   * `theme.pie.slice.dimmedOpacity`. Omitted or empty means no selection, so every slice
   * renders normally. **Arc geometry never changes**, which is what separates this from
   * filtering the data: dropping a slice regrows all the others and destroys the
   * part-to-whole reading. Drive it from a legend's `itemClick` / `clearAction`.
   */
  highlightedLabels?: NgePieLayerConfig['highlightedLabels'];

  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → a full pie,
   * e.g. `0.6` → a donut. NOT pixels.
   */
  innerRadius?: number;

  /**
   * Label colour for EVERY slice. Setting it deliberately disables the automatic on-fill
   * contrast (which otherwise picks `theme.pie.label.color` / `.colorOnDark` from each
   * slice's own fill), giving one flat label colour. A per-datum `labelColor` still wins
   * over it. Outside labels never derive — they take `theme.pie.labelOutside.color`.
   */
  labelColor?: string;

  /**
   * Width in pixels reserved on EACH side for outside labels — the pie's radius shrinks to
   * fit. Only used with `labelPosition: 'outside'`. Default 96.
   */
  labelGutter?: number;

  /**
   * How outside labels are arranged — `'perimeter'` (default) keeps each label on a ring
   * that follows the pie's curve at its own slice's mid-angle, so its leaders stay short
   * radial ticks instead of long diagonals (the same SLICES are leadered either way —
   * `displaced` weighs the height both layouts resolve identically); `'columns'` stacks each
   * hemisphere at a fixed x, which is what keeps leaders untangled past the ring's
   * ~20-category ceiling. Only used with `labelPosition: 'outside'`.
   */
  labelLayout?: NgePieLayerConfig['labelLayout'];

  /**
   * Minimum vertical spacing in pixels between adjacent outside labels. Only used with
   * `labelPosition: 'outside'`. Default 14.
   */
  labelLineHeight?: number;

  /**
   * Radial distance in pixels from the arc's outer edge out to the label ring / column.
   * Under `labelLayout: 'perimeter'` (the default) raising it also shrinks the pie, since the
   * ring has to fit the plot height — the lever for opening up a crowded chart without a
   * bigger canvas. Only used with `labelPosition: 'outside'`. Default 12.
   */
  labelOffset?: number;

  /**
   * Where `showLabels` draws each label. `'inside'` (default) centers it on the slice's arc
   * centroid; `'outside'` places every label beyond the arc in two collision-resolved
   * hemisphere columns, with leader lines on the displaced ones.
   */
  labelPosition?: NgePieLayerConfig['labelPosition'];

  /**
   * Radial distance in px from the arc's outer edge out to the leader's ELBOW — the length of
   * the stub leaving the wedge. Defaults to `labelOffset` (elbow on the label ring). Set it
   * shorter to decouple the two: a stubby tick off the slice with the text further out.
   * Only used with `labelPosition: 'outside'`.
   */
  leaderElbowOffset?: number;

  /**
   * Which outside labels get a leader line back to their slice — `'displaced'` (default)
   * only the ones whose height no longer names their wedge, `'all'` every label, `'none'` no
   * connectors. Only used with `labelPosition: 'outside'`.
   */
  leaderLines?: NgePieLayerConfig['leaderLines'];

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Smallest slice sweep (RADIANS) that still gets a label — narrower slices stay
   * unlabelled instead of overflowing their wedge. Defaults to `0.15` rad (≈ 8.6°) for
   * `labelPosition: 'inside'` and `0` for `'outside'`, where the wedge no longer has to
   * contain the text.
   */
  minLabelAngle?: number;

  /**
   * Click handler for slices
   */
  onClick?: NgePieLayerConfig['onClick'];

  /**
   * Angular gap between adjacent slices in radians. Default 0.
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
   * Slice color palette. Slice input index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label on each slice at its arc centroid, styled from `theme.pie.label`.
   * Default false.
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
  tooltip?: PieChartTooltipOptions;
}

/**
 * Default content formatter for pie chart slices — label + raw value.
 */
function defaultPieTooltipFormatter(data: NgePieDataPoint): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value),
  };
}

/**
 * Create a standard pie / donut / semi-circle chart configuration.
 *
 * @example
 * const config = createPieChartConfig({
 *   data: [
 *     { label: 'Rent', value: 1800 },
 *     { label: 'Food', value: 600 },
 *     { label: 'Transit', value: 300 },
 *   ],
 *   innerRadius: 0.6, // donut
 *   showLabels: true, // on-arc labels, styled from theme.pie.label
 *   tooltip: { enabled: true },
 * });
 *
 * // Many categories: push every label outside, collision-resolved, with leader lines.
 * const manyCategories = createPieChartConfig({
 *   data: countries,
 *   labelPosition: 'outside',
 *   showLabels: true,
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createPieChartConfig(options: PieChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    endAngle,
    formatLabel,
    highlightedLabels,
    innerRadius,
    labelColor,
    labelGutter,
    labelLayout,
    labelLineHeight,
    labelOffset,
    labelPosition,
    leaderElbowOffset,
    leaderLines,
    margin,
    minLabelAngle,
    onClick,
    padAngle,
    radiusRatio,
    seriesColors,
    showLabels,
    startAngle,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the slice centroid by the
  // renderer (`computeTooltipEvent`), so there is no `position` knob to wire — the
  // renderer's `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultPieTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures (ARCH-174): a pie is a radial, single-view chart — no meaningful zoom/pan
  // surface, so it exposes no `gestures` option. Axes are off (radial layout).
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
        highlightedLabels,
        innerRadius,
        labelColor,
        labelGutter,
        labelLayout,
        labelLineHeight,
        labelOffset,
        labelPosition,
        leaderElbowOffset,
        leaderLines,
        minLabelAngle,
        onClick,
        padAngle,
        radiusRatio,
        renderer: renderPieLayer,
        seriesColors,
        showLabels,
        startAngle,
        tooltip: tooltipConfig,
        type: 'pie',
      },
    ],
  };
}
