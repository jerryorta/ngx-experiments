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
   * Format a node's label (when `showLabels` is set). Receives the node datum carrying its
   * SUMMED value. Defaults to the datum's own `label`.
   */
  formatLabel?: NgeSunburstLayerConfig['formatLabel'];

  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius (radial layout):
   * `0` → rings start at the center, e.g. `0.6` → a donut hole. NOT pixels.
   */
  innerRadius?: number;

  /**
   * Label colour for EVERY node. Setting it disables automatic on-fill contrast (the
   * derived black/white choice against the node's own fill), giving one flat label colour;
   * a per-datum `labelColor` still wins over it.
   */
  labelColor?: string;

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
   * Deepest depth that still gets a label (1 = top-level branches only). Independent of
   * `maxDepth`, which governs what is DRAWN. Unset ⇒ every drawn depth is eligible.
   */
  maxLabelDepth?: number;

  /**
   * Smallest node sweep in RADIANS that still gets a label — radial layout only. Default
   * `0.15` rad (≈ 8.6°). A zero-sweep node is never labelled whatever the threshold.
   */
  minLabelAngle?: number;

  /**
   * Smallest cross-text extent in PIXELS that still gets a label: the arc length at the
   * node's mid-radius (radial) or the rect width (linear). Catches the inner-ring nodes
   * that hold a wide angle but almost no arc. Default 12.
   */
  minLabelSize?: number;

  /**
   * Click handler for nodes
   */
  onClick?: NgeSunburstLayerConfig['onClick'];

  /**
   * Angular gap between adjacent nodes in radians (radial layout). Default 0.
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
   * Node color palette. Top-level branch index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label on each node — along its arc (radial) or inside its rect (linear) — styled
   * from `theme.sunburst.label`. Opt-in (default false); nodes below `minLabelAngle` /
   * `minLabelSize` or past `maxLabelDepth` stay unlabelled.
   */
  showLabels?: boolean;

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
 *
 * @example
 * // Labelled sunburst — labels ride the radius, and the nodes too small to hold text
 * // are dropped rather than drawn over their neighbours.
 * const labelled = createSunburstChartConfig({
 *   data: budget,
 *   showLabels: true,
 *   maxLabelDepth: 2,    // the outer ring is too thin for text
 *   minLabelSize: 16,    // a node needs 16px of arc before it earns a label
 *   formatLabel: d => `${d.label} · ${d.value}`,
 * });
 */
export function createSunburstChartConfig(options: SunburstChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    endAngle,
    formatLabel,
    innerRadius,
    labelColor,
    layout,
    margin,
    maxDepth,
    maxLabelDepth,
    minLabelAngle,
    minLabelSize,
    onClick,
    padAngle,
    radiusRatio,
    seriesColors,
    showLabels,
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
        formatLabel,
        innerRadius,
        labelColor,
        layout,
        maxDepth,
        maxLabelDepth,
        minLabelAngle,
        minLabelSize,
        onClick,
        padAngle,
        radiusRatio,
        renderer: renderSunburstLayer,
        seriesColors,
        showLabels,
        startAngle,
        tooltip: tooltipConfig,
        type: 'sunburst',
      },
    ],
  };
}
