import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeChartConfig, NgeHierarchyDatum, NgeTreeLayerConfig } from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderTreeLayer } from '../layers/tree';

/**
 * Tooltip options for the tree chart preset.
 */
export interface TreeChartTooltipOptions {
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
 * Options for creating a tree chart config preset.
 */
export interface TreeChartPresetOptions {
  /**
   * Push every leaf onto the outer edge regardless of its depth — the Dendrogram reading.
   * Composes with both coordinate systems. Default false.
   */
  alignLeaves?: NgeTreeLayerConfig['alignLeaves'];

  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Top-level hierarchy nodes. One node is drawn as the tree's own root; several are drawn
   * as a forest, with the root that joins them left undrawn.
   */
  data: NgeHierarchyDatum[];

  /**
   * Format a node's label (when `showLabels` is set). Receives the node carrying its summed
   * subtree value. Defaults to the datum's own `label`.
   */
  formatLabel?: NgeTreeLayerConfig['formatLabel'];

  /**
   * Label colour for EVERY node label. A per-datum `labelColor` still wins over it.
   */
  labelColor?: NgeTreeLayerConfig['labelColor'];

  /**
   * Gap (px) between a node's circle and its label. Default 6.
   */
  labelPadding?: NgeTreeLayerConfig['labelPadding'];

  /**
   * Coordinate system. `'tidy'` (default) is cartesian; `'radial'` puts the root at the
   * centre and wraps the breadth axis onto a full turn.
   */
  layout?: NgeTreeLayerConfig['layout'];

  /**
   * How a parent→child edge is drawn — `'curve'` (default), `'elbow'` (the org-chart
   * reporting line, cartesian only) or `'straight'`.
   */
  linkShape?: NgeTreeLayerConfig['linkShape'];

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Optional depth cap — render at most this many levels below the root.
   */
  maxDepth?: NgeTreeLayerConfig['maxDepth'];

  /**
   * Node circle radius (px). Default 4.
   */
  nodeRadius?: NgeTreeLayerConfig['nodeRadius'];

  /**
   * Click handler for node circles.
   */
  onClick?: NgeTreeLayerConfig['onClick'];

  /**
   * Which edge the root sits on (`'tidy'` only). Default `'left-right'`.
   */
  orientation?: NgeTreeLayerConfig['orientation'];

  /**
   * Scale the self-computed outer radius by a RATIO (0–1) (`'radial'` only).
   */
  radiusRatio?: NgeTreeLayerConfig['radiusRatio'];

  /**
   * Node color palette assigned by top-level branch index. index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label beside each node circle, styled from `theme.tree.label`. Opt-in
   * (default false).
   */
  showLabels?: boolean;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: TreeChartTooltipOptions;
}

/**
 * Default content formatter for tree nodes — the node's label + its summed subtree value.
 */
function defaultTreeTooltipFormatter(data: NgeHierarchyDatum): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value ?? ''),
  };
}

/**
 * Create a standard tree chart configuration — one preset folding the Dendrogram,
 * Organisational Chart, Mind Map and Radial Convergence catalog entries into a single
 * primitive via `layout` / `alignLeaves` / `orientation` / `linkShape`.
 *
 * @example
 * // Mind Map — a tidy tree growing left to right with curved edges (the defaults).
 * const config = createTreeChartConfig({
 *   data: [
 *     {
 *       label: 'product',
 *       children: [
 *         { label: 'research', children: [{ label: 'interviews', value: 4 }] },
 *         { label: 'design', children: [{ label: 'prototypes', value: 6 }] },
 *       ],
 *     },
 *   ],
 *   showLabels: true,
 * });
 *
 * @example
 * // Dendrogram — every leaf pulled onto the outer edge, so the leaf set reads as a list.
 * const config = createTreeChartConfig({
 *   data: taxonomy,
 *   alignLeaves: true,
 *   showLabels: true,
 * });
 *
 * @example
 * // Organisational Chart — top-down, with right-angle reporting lines.
 * const config = createTreeChartConfig({
 *   data: reportingLines,
 *   orientation: 'top-bottom',
 *   linkShape: 'elbow',
 *   showLabels: true,
 * });
 *
 * @example
 * // Radial Convergence — the root at the centre, depth growing outward.
 * const config = createTreeChartConfig({
 *   data: taxonomy,
 *   layout: 'radial',
 *   alignLeaves: true,
 *   showLabels: true,
 * });
 */
export function createTreeChartConfig(options: TreeChartPresetOptions): NgeChartConfig {
  const {
    alignLeaves,
    animation,
    data,
    formatLabel,
    labelColor,
    labelPadding,
    layout,
    linkShape,
    margin,
    maxDepth,
    nodeRadius,
    onClick,
    orientation,
    radiusRatio,
    seriesColors,
    showLabels,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the node's circle by the
  // renderer, so there is no `position` knob to wire — the renderer's `mergeTooltipConfig`
  // fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultTreeTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Self-scaled in both layouts — a tree's arrangement comes from its own structure, not from
  // the shared cartesian scales, so both axes stay off (the same opt-out the sankey, chord,
  // network and radial layers make). The default margin is a plain all-around inset: node
  // labels sit beside their circles, and the layer already takes their reserve out of its own
  // bounds. Gestures (ARCH-174): a tree is a single, self-contained view — no zoom/pan surface
  // — so it exposes no `gestures` option.
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 10, left: 10, right: 10, top: 10 },
      showXAxis: false,
      showYAxis: false,
    },
    layers: [
      {
        alignLeaves,
        data,
        formatLabel,
        labelColor,
        labelPadding,
        layout,
        linkShape,
        maxDepth,
        nodeRadius,
        onClick,
        orientation,
        radiusRatio,
        renderer: renderTreeLayer,
        seriesColors,
        showLabels,
        tooltip: tooltipConfig,
        type: 'tree',
      },
    ],
  };
}
