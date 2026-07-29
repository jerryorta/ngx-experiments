import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeGraph,
  NgeGraphNode,
  NgeNetworkLayerConfig,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderNetworkLayer } from '../layers/network';

/**
 * Tooltip options for the network chart preset.
 */
export interface NetworkChartTooltipOptions {
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
 * Options for creating a network chart config preset.
 */
export interface NetworkChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * How many axes the hive layout radiates from the centre (`'hive'` only). Clamped to
   * 2–4; default 3.
   */
  axisCount?: NgeNetworkLayerConfig['axisCount'];

  /**
   * Many-body force strength (`'force'` / `'cluster'` only). Negative repels — the sign
   * that spreads a graph out. Default -180.
   */
  charge?: NgeNetworkLayerConfig['charge'];

  /**
   * How hard a node is pulled toward its `group`'s anchor (`'cluster'` only), 0–1.
   * Default 0.35.
   */
  clusterStrength?: NgeNetworkLayerConfig['clusterStrength'];

  /**
   * The relationship graph. `nodes` is optional — omit it and the node set is derived
   * from the link endpoints in first-seen order. Supply it to give nodes labels, colours,
   * a `group` (which the `'cluster'` and `'hive'` layouts arrange by), or to include a
   * node no link touches.
   */
  data: NgeGraph;

  /**
   * Draw an arrowhead at each connection's target end. Opt-in (default false); pair it
   * with `showLabels` to turn the force layout into a Sociogram.
   */
  directed?: NgeNetworkLayerConfig['directed'];

  /**
   * Format a node's label (when `showLabels` is set). Receives the node carrying its
   * resolved magnitude as `value`. Defaults to the node's `label`, then its `id`.
   */
  formatLabel?: NgeNetworkLayerConfig['formatLabel'];

  /**
   * Start of the hive axes as a RATIO (0–1) of the self-computed outer radius (`'hive'`
   * only). Default 0.15.
   */
  innerRadius?: NgeNetworkLayerConfig['innerRadius'];

  /**
   * Label colour for EVERY node label. A per-datum `labelColor` still wins over it.
   */
  labelColor?: NgeNetworkLayerConfig['labelColor'];

  /**
   * Gap (px) between a node's circle and its label. Default 6.
   */
  labelPadding?: NgeNetworkLayerConfig['labelPadding'];

  /**
   * Layout family. `'force'` (default) settles a `d3-force` simulation; `'cluster'` adds a
   * per-`group` anchor to it; `'hive'` places nodes deterministically on radial axes.
   */
  layout?: NgeNetworkLayerConfig['layout'];

  /**
   * Target distance (px) between two linked nodes (`'force'` / `'cluster'` only).
   * Default 60.
   */
  linkDistance?: NgeNetworkLayerConfig['linkDistance'];

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Largest node circle radius (px). Default 16.
   */
  maxNodeRadius?: NgeNetworkLayerConfig['maxNodeRadius'];

  /**
   * Smallest node circle radius (px). Default 4.
   */
  minNodeRadius?: NgeNetworkLayerConfig['minNodeRadius'];

  /**
   * Click handler for node circles.
   */
  onClick?: NgeNetworkLayerConfig['onClick'];

  /**
   * Scale the self-computed outer radius by a RATIO (0–1) (`'hive'` only).
   */
  radiusRatio?: NgeNetworkLayerConfig['radiusRatio'];

  /**
   * Seed for the simulation's initial placement (`'force'` / `'cluster'` only). The layout
   * is deterministic per seed, so changing it re-rolls the arrangement without changing
   * the data. Default 42.
   */
  seed?: NgeNetworkLayerConfig['seed'];

  /**
   * Node color palette. Node index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label beside each node circle, styled from `theme.network.label`. Opt-in
   * (default false).
   */
  showLabels?: boolean;

  /**
   * How many iterations the simulation is stepped before the graph is drawn (`'force'` /
   * `'cluster'` only). Default 300.
   */
  tickCount?: NgeNetworkLayerConfig['tickCount'];

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: NetworkChartTooltipOptions;
}

/**
 * Default content formatter for network nodes — display name + resolved magnitude.
 */
function defaultNetworkTooltipFormatter(data: NgeGraphNode): NgeTooltipContent {
  return {
    label: data.label ?? data.id,
    value: String(data.value ?? ''),
  };
}

/**
 * Create a standard network chart configuration — one preset folding the Network
 * Visualisation, Clustered Force Layout, Hive Plot and Sociogram catalog entries into a
 * single primitive via `layout` (plus the `directed` / `showLabels` pair).
 *
 * @example
 * // Network Visualisation — a settled force-directed graph (the defaults).
 * const config = createNetworkChartConfig({
 *   data: {
 *     links: [
 *       { source: 'api', target: 'auth', value: 4 },
 *       { source: 'api', target: 'billing', value: 2 },
 *       { source: 'auth', target: 'billing', value: 1 },
 *     ],
 *   },
 * });
 *
 * @example
 * // Sociogram — the same layout, named and directed.
 * const config = createNetworkChartConfig({
 *   data: { links, nodes },
 *   directed: true,
 *   showLabels: true,
 * });
 *
 * @example
 * // Clustered Force Layout — nodes gather by `group` while their links still shape the interior.
 * const config = createNetworkChartConfig({
 *   data: {
 *     links,
 *     nodes: [
 *       { group: 'frontend', id: 'web' },
 *       { group: 'backend', id: 'api' },
 *     ],
 *   },
 *   layout: 'cluster',
 * });
 *
 * @example
 * // Hive Plot — deterministic placement on three axes, one per `group`.
 * const config = createNetworkChartConfig({
 *   data: { links, nodes },
 *   layout: 'hive',
 *   axisCount: 3,
 *   showLabels: true,
 * });
 */
export function createNetworkChartConfig(options: NetworkChartPresetOptions): NgeChartConfig {
  const {
    animation,
    axisCount,
    charge,
    clusterStrength,
    data,
    directed,
    formatLabel,
    innerRadius,
    labelColor,
    labelPadding,
    layout,
    linkDistance,
    margin,
    maxNodeRadius,
    minNodeRadius,
    onClick,
    radiusRatio,
    seed,
    seriesColors,
    showLabels,
    tickCount,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the node's circle by the
  // renderer, so there is no `position` knob to wire — the renderer's `mergeTooltipConfig`
  // fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultNetworkTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Self-scaled in every layout — the arrangement comes from the graph's own structure, not
  // from the shared cartesian scales, so both axes stay off (the same opt-out the sankey,
  // chord and pie layers make). The default margin is a plain all-around inset: node labels
  // sit beside their circles and hive axis labels past the axes, both of which the layer
  // already keeps inside the plot rect. Gestures (ARCH-174): a network diagram is a single,
  // self-contained view — no zoom/pan surface — so it exposes no `gestures` option.
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 10, left: 10, right: 10, top: 10 },
      showXAxis: false,
      showYAxis: false,
    },
    layers: [
      {
        axisCount,
        charge,
        clusterStrength,
        data,
        directed,
        formatLabel,
        innerRadius,
        labelColor,
        labelPadding,
        layout,
        linkDistance,
        maxNodeRadius,
        minNodeRadius,
        onClick,
        radiusRatio,
        renderer: renderNetworkLayer,
        seed,
        seriesColors,
        showLabels,
        tickCount,
        tooltip: tooltipConfig,
        type: 'network',
      },
    ],
  };
}
