import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeRadarDataPoint,
  NgeRadarLayerConfig,
  NgeRadarRender,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderRadarLayer } from '../layers/radar';

/**
 * Tooltip options for the radar chart preset.
 */
export interface RadarChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeRadarDataPoint) => NgeTooltipContent;

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
 * Options for creating a radar / polar (spider / star) chart config preset.
 */
export interface RadarChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Data points to render — one `{ label, value }` per angular axis, grouped into series
   * by `seriesId`. The unique `label`s become the spokes; each `seriesId` a closed polygon.
   */
  data: NgeRadarDataPoint[];

  /**
   * End of the angular sweep in radians. Default `2 * Math.PI` (full circle).
   */
  endAngle?: number;

  /**
   * Filled-polygon fill opacity (0-1), `render: 'area'`. Falls back to the theme default
   * (0.3) when unset.
   */
  fillOpacity?: number;

  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius: `0` → axes start at
   * the center, e.g. `0.1` lifts them off a center hub. NOT pixels.
   */
  innerRadius?: number;

  /**
   * Number of concentric value rings (grid levels). Unset ⇒ the rings fall on the radial
   * scale's own ticks.
   */
  levels?: number;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for series vertices
   */
  onClick?: NgeRadarLayerConfig['onClick'];

  /**
   * Series shape: `'area'` filled polygon (default, Radar Diagram) or `'line'` stroked
   * outline only (Polar Chart).
   */
  render?: NgeRadarRender;

  /**
   * Series color palette. Series index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Start of the angular sweep in radians (first axis). Default 0 (12 o'clock, straight up).
   */
  startAngle?: number;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: RadarChartTooltipOptions;
}

/**
 * Default content formatter for radar data points — label + raw value.
 */
function defaultRadarTooltipFormatter(data: NgeRadarDataPoint): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value),
  };
}

/**
 * Create a standard radar / polar (spider / star) chart configuration.
 *
 * @example
 * const config = createRadarChartConfig({
 *   data: [
 *     { label: 'Speed', seriesId: 'A', value: 80 },
 *     { label: 'Power', seriesId: 'A', value: 60 },
 *     { label: 'Range', seriesId: 'A', value: 45 },
 *     { label: 'Speed', seriesId: 'B', value: 55 },
 *     { label: 'Power', seriesId: 'B', value: 90 },
 *     { label: 'Range', seriesId: 'B', value: 70 },
 *   ],
 *   render: 'area',
 *   levels: 5,
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createRadarChartConfig(options: RadarChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    endAngle,
    fillOpacity,
    innerRadius,
    levels,
    margin,
    onClick,
    render,
    seriesColors,
    startAngle,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the hovered vertex by the
  // renderer (`pointTooltipEvent`), so there is no `position` knob to wire — the renderer's
  // `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultRadarTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // A radar is a radial, single-view chart — no meaningful zoom/pan surface, so it exposes
  // no `gestures` option. Axes are off (radial layout).
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 40, left: 40, right: 40, top: 40 },
      showXAxis: false,
      showYAxis: false,
    },
    layers: [
      {
        data,
        endAngle,
        fillOpacity,
        innerRadius,
        levels,
        onClick,
        render,
        renderer: renderRadarLayer,
        seriesColors,
        startAngle,
        tooltip: tooltipConfig,
        type: 'radar',
      },
    ],
  };
}
