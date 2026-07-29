import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeGraph,
  NgeGraphNode,
  NgeSankeyLayerConfig,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderSankeyLayer } from '../layers/sankey';

/**
 * Tooltip options for the sankey chart preset.
 */
export interface SankeyChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeGraphNode) => NgeTooltipContent;

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
 * Options for creating a sankey chart config preset.
 */
export interface SankeyChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * The flow graph. `nodes` is optional — omit it and the node set is derived from the link
   * endpoints in first-seen order.
   */
  data: NgeGraph;

  /**
   * Format a node's label (when `showLabels` is set). Receives the node carrying its
   * laid-out throughput as `value`. Defaults to the node's `label`, then its `id`.
   */
  formatLabel?: NgeSankeyLayerConfig['formatLabel'];

  /**
   * Relaxation passes used to reduce link crossings. Default 6; 0 leaves nodes in their
   * initial column order.
   */
  iterations?: number;

  /**
   * Label colour for EVERY node label. A per-datum `labelColor` still wins over it.
   */
  labelColor?: string;

  /**
   * Gap (px) between a node rect and its label. Default 6.
   */
  labelPadding?: number;

  /**
   * Ribbon geometry — `'curve'` (default) for Sankey / Alluvial, `'parallelogram'` for the
   * straight-sided Parallel Sets band.
   */
  linkShape?: NgeSankeyLayerConfig['linkShape'];

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Which column a node lands in when its depth leaves a choice. Default `'justify'`.
   */
  nodeAlign?: NgeSankeyLayerConfig['nodeAlign'];

  /**
   * Vertical gap (px) between node rects in the same column. Default 8.
   */
  nodePadding?: number;

  /**
   * Width (px) of a node rect. Default 16.
   */
  nodeWidth?: number;

  /**
   * Click handler for node rects
   */
  onClick?: NgeSankeyLayerConfig['onClick'];

  /**
   * Node color palette. Node index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label beside each node rect, styled from `theme.sankey.label`. Opt-in
   * (default false).
   */
  showLabels?: boolean;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: SankeyChartTooltipOptions;
}

/**
 * Default content formatter for sankey nodes — display name + laid-out throughput.
 */
function defaultSankeyTooltipFormatter(data: NgeGraphNode): NgeTooltipContent {
  return {
    label: data.label ?? data.id,
    value: String(data.value ?? ''),
  };
}

/**
 * Create a standard sankey (weighted flow) chart configuration.
 *
 * @example
 * const config = createSankeyChartConfig({
 *   data: {
 *     links: [
 *       { source: 'Salary', target: 'Budget', value: 5200 },
 *       { source: 'Budget', target: 'Housing', value: 2100 },
 *       { source: 'Budget', target: 'Savings', value: 1400 },
 *     ],
 *   },
 *   showLabels: true,
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 *
 * @example
 * // Parallel Sets — categorical stages joined by straight-sided bands.
 * const parallelSets = createSankeyChartConfig({
 *   data: survey,
 *   linkShape: 'parallelogram',
 *   nodeAlign: 'left',
 *   showLabels: true,
 * });
 *
 * @example
 * // Alluvial — the same primitive with stages named for successive time periods, so the
 * // ribbons read as cohorts moving between categories.
 * const alluvial = createSankeyChartConfig({
 *   data: cohorts,
 *   nodeAlign: 'left',
 *   showLabels: true,
 * });
 */
export function createSankeyChartConfig(options: SankeyChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    formatLabel,
    iterations,
    labelColor,
    labelPadding,
    linkShape,
    margin,
    nodeAlign,
    nodePadding,
    nodeWidth,
    onClick,
    seriesColors,
    showLabels,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the node's centre by the
  // renderer (`computeTooltipEvent`), so there is no `position` knob to wire — the
  // renderer's `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultSankeyTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // The default margin is wider on the left and right than the treemap's even inset: node
  // labels sit beside the outermost rects, and while the layer keeps them inside the plot
  // rect, a symmetric breathing space is what stops the first and last columns reading as
  // jammed against the chart edge. Gestures (ARCH-174): a sankey fills its box with a single
  // view, so it exposes no `gestures` option. Axes are off.
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
        formatLabel,
        iterations,
        labelColor,
        labelPadding,
        linkShape,
        nodeAlign,
        nodePadding,
        nodeWidth,
        onClick,
        renderer: renderSankeyLayer,
        seriesColors,
        showLabels,
        tooltip: tooltipConfig,
        type: 'sankey',
      },
    ],
  };
}
