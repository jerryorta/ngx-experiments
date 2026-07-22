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
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → a full pie,
   * e.g. `0.6` → a donut. NOT pixels.
   */
  innerRadius?: number;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for slices
   */
  onClick?: NgePieLayerConfig['onClick'];

  /**
   * Angular gap between adjacent slices in radians. Default 0.
   */
  padAngle?: number;

  /**
   * Slice color palette. Slice input index maps to colors[index % length].
   */
  seriesColors?: string[];

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
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createPieChartConfig(options: PieChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    endAngle,
    innerRadius,
    margin,
    onClick,
    padAngle,
    seriesColors,
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
        innerRadius,
        onClick,
        padAngle,
        renderer: renderPieLayer,
        seriesColors,
        startAngle,
        tooltip: tooltipConfig,
        type: 'pie',
      },
    ],
  };
}
