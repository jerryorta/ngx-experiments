import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeChartConfig, NgeHierarchyDatum, NgeTreemapLayerConfig } from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderTreemapLayer } from '../layers/treemap';

/**
 * Tooltip options for the treemap chart preset.
 */
export interface TreemapChartTooltipOptions {
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
 * Options for creating a treemap chart config preset.
 */
export interface TreemapChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * `tiling: 'voronoi'` only — stop the solve at this fraction of total cell-area error.
   * Default `0.01`. Lower is more faithful and slower.
   */
  convergenceRatio?: number;

  /**
   * Hierarchy nodes to render — one branch per top-level node, seated under a synthetic
   * root; internal-node magnitudes are summed from their children.
   */
  data: NgeHierarchyDatum[];

  /**
   * Format a cell's label (when `showLabels` is set). Receives the node datum carrying its
   * SUMMED value. Defaults to the datum's own `label`.
   */
  formatLabel?: NgeTreemapLayerConfig['formatLabel'];

  /**
   * Label colour for EVERY cell. Setting it disables automatic on-fill contrast (the
   * derived black/white choice against the cell's own fill), giving one flat label colour;
   * a per-datum `labelColor` still wins over it.
   */
  labelColor?: string;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Optional depth cap — render at most this many levels. Unset ⇒ full depth.
   */
  maxDepth?: number;

  /**
   * `tiling: 'voronoi'` only — hard iteration ceiling. Default 50.
   */
  maxIterationCount?: number;

  /**
   * Deepest level that still gets a label (1 = top-level branches only). Independent of
   * `maxDepth`, which governs what is DRAWN. Unset ⇒ every drawn level is eligible.
   */
  maxLabelDepth?: number;

  /**
   * Smallest cell extent in PIXELS, tested on BOTH axes, that still gets a label. Catches
   * the slivers that are wide enough for text but far too short to seat it. Default 12.
   */
  minLabelSize?: number;

  /**
   * Click handler for cells
   */
  onClick?: NgeTreemapLayerConfig['onClick'];

  /**
   * Gap (px) between sibling cells. Default 1. Rectangular tilings only.
   */
  padding?: number;

  /**
   * Inset (px) between a parent cell's edge and its children — non-zero is what makes the
   * parent visible as a container, i.e. the Nested Proportional Area reading. Default 0.
   * Rectangular tilings only.
   */
  paddingOuter?: number;

  /**
   * Extra inset (px) at the TOP of a parent cell, over and above `paddingOuter` — the strip
   * a parent's own label sits in. Default 0. Rectangular tilings only.
   */
  paddingTop?: number;

  /**
   * `tiling: 'voronoi'` only — seed for the initial cell sites. Fixed by default so the same
   * data always draws the same arrangement; change it to shop for a nicer one.
   */
  seed?: number;

  /**
   * Cell color palette. Top-level branch index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label inside each cell, styled from `theme.treemap.label`. Opt-in (default
   * false); cells below `minLabelSize` or past `maxLabelDepth` stay unlabelled.
   */
  showLabels?: boolean;

  /**
   * Partition algorithm — the six `d3.treemap` tilings, or `'voronoi'` for the convex
   * variant. Default `'squarify'`.
   */
  tiling?: NgeTreemapLayerConfig['tiling'];

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: TreemapChartTooltipOptions;
}

/**
 * Default content formatter for treemap cells — label + raw (summed) value.
 */
function defaultTreemapTooltipFormatter(data: NgeHierarchyDatum): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value ?? ''),
  };
}

/**
 * Create a standard treemap (nested proportional) chart configuration.
 *
 * @example
 * const config = createTreemapChartConfig({
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
 *   showLabels: true,
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 *
 * @example
 * // Nested Proportional Area — parents stay visible as containers, with a top strip
 * // holding their own label.
 * const nested = createTreemapChartConfig({
 *   data: budget,
 *   paddingOuter: 3,
 *   paddingTop: 16,
 *   showLabels: true,
 *   maxLabelDepth: 1,   // label the branches, not every leaf
 * });
 *
 * @example
 * // Convex Treemap — a weighted-Voronoi partition. Deterministic for a given `seed`.
 * const convex = createTreemapChartConfig({
 *   data: budget,
 *   tiling: 'voronoi',
 *   seed: 42,
 * });
 */
export function createTreemapChartConfig(options: TreemapChartPresetOptions): NgeChartConfig {
  const {
    animation,
    convergenceRatio,
    data,
    formatLabel,
    labelColor,
    margin,
    maxDepth,
    maxIterationCount,
    maxLabelDepth,
    minLabelSize,
    onClick,
    padding,
    paddingOuter,
    paddingTop,
    seed,
    seriesColors,
    showLabels,
    tiling,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the cell centroid by the
  // renderer (`computeTooltipEvent`), so there is no `position` knob to wire — the
  // renderer's `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultTreemapTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures (ARCH-174): a treemap fills its box with a single view — no meaningful zoom/pan
  // surface, so it exposes no `gestures` option. Axes are off.
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 10, left: 10, right: 10, top: 10 },
      showXAxis: false,
      showYAxis: false,
    },
    layers: [
      {
        convergenceRatio,
        data,
        formatLabel,
        labelColor,
        maxDepth,
        maxIterationCount,
        maxLabelDepth,
        minLabelSize,
        onClick,
        padding,
        paddingOuter,
        paddingTop,
        renderer: renderTreemapLayer,
        seed,
        seriesColors,
        showLabels,
        tiling,
        tooltip: tooltipConfig,
        type: 'treemap',
      },
    ],
  };
}
