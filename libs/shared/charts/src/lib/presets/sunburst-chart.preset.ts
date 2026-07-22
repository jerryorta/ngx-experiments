import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeChartConfig, NgeHierarchyDatum, NgeSunburstLayerConfig } from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderSunburstLayer } from '../layers/sunburst';

/**
 * Tooltip options for the sunburst / icicle chart preset.
 */
export interface SunburstChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeHierarchyDatum) => NgeTooltipContent;

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
 * Options for creating a sunburst / icicle chart config preset.
 */
export interface SunburstChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Hierarchy nodes to render — one branch per top-level node, seated under a synthetic
   * root; internal-node magnitudes are summed from their children.
   */
  data: NgeHierarchyDatum[];

  /**
   * End of the angular sweep in radians (radial layout). Default `2 * Math.PI`.
   */
  endAngle?: number;

  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius (radial layout):
   * `0` → rings start at the center, e.g. `0.6` → a donut hole. NOT pixels.
   */
  innerRadius?: number;

  /**
   * Partition layout. `'radial'` (default) draws concentric rings (sunburst / donut);
   * `'linear'` draws stacked rectangle columns (icicle).
   */
  layout?: NgeSunburstLayerConfig['layout'];

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Optional depth cap — render at most this many rings / columns. Unset ⇒ full depth.
   */
  maxDepth?: number;

  /**
   * Click handler for nodes
   */
  onClick?: NgeSunburstLayerConfig['onClick'];

  /**
   * Angular gap between adjacent nodes in radians (radial layout). Default 0.
   */
  padAngle?: number;

  /**
   * Node color palette. Top-level branch index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Start of the angular sweep in radians (radial layout). Default 0.
   */
  startAngle?: number;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: SunburstChartTooltipOptions;
}

/**
 * Default content formatter for sunburst nodes — label + raw (summed) value.
 */
function defaultSunburstTooltipFormatter(data: NgeHierarchyDatum): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value ?? ''),
  };
}

/**
 * Create a standard sunburst / icicle (multi-level hierarchy) chart configuration.
 *
 * @example
 * const config = createSunburstChartConfig({
 *   data: [
 *     {
 *       label: 'Housing',
 *       children: [
 *         { label: 'Rent', value: 1800 },
 *         { label: 'Utilities', value: 300 },
 *       ],
 *     },
 *     { label: 'Food', value: 600 },
 *   ],
 *   innerRadius: 0.3, // donut hole
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createSunburstChartConfig(options: SunburstChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    endAngle,
    innerRadius,
    layout,
    margin,
    maxDepth,
    onClick,
    padAngle,
    seriesColors,
    startAngle,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the segment centroid by the
  // renderer (`computeTooltipEvent`), so there is no `position` knob to wire — the
  // renderer's `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultSunburstTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures (ARCH-174): a sunburst is a radial / stacked, single-view chart — no
  // meaningful zoom/pan surface, so it exposes no `gestures` option. Axes are off.
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
        layout,
        maxDepth,
        onClick,
        padAngle,
        renderer: renderSunburstLayer,
        seriesColors,
        startAngle,
        tooltip: tooltipConfig,
        type: 'sunburst',
      },
    ],
  };
}
