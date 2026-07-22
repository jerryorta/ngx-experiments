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
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → start at the
   * center, e.g. `0.3` carves a center hole. NOT pixels.
   */
  innerRadius?: number;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Radial shape: `'bar'` arcs (default), `'area'` closed radial area, `'cell'` heatmap grid.
   */
  mark?: NgeRadialBarMark;

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
   * Fill palette. Datum input index (bar/cell) or series index (area) maps to
   * colors[index % length].
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
    innerRadius,
    margin,
    mark,
    onClick,
    padAngle,
    seriesColors,
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
        innerRadius,
        mark,
        onClick,
        padAngle,
        renderer: renderRadialBarLayer,
        seriesColors,
        startAngle,
        tooltip: tooltipConfig,
        type: 'radial-bar',
        wedge,
      },
    ],
  };
}
