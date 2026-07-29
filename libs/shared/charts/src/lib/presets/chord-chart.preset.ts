import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeChordLayerConfig,
  NgeGraph,
  NgeGraphNode,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderChordLayer } from '../layers/chord';

/**
 * Tooltip options for the chord chart preset.
 */
export interface ChordChartTooltipOptions {
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
 * Options for creating a chord chart config preset.
 */
export interface ChordChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * The relationship graph. `nodes` is optional — omit it and the node set is derived
   * from the link endpoints in first-seen order.
   */
  data: NgeGraph;

  /**
   * `false` (default) merges `A→B` and `B→A` into one ribbon with asymmetric ends — the
   * classic chord-diagram form, even over directional data. `true` draws them as two
   * distinct ribbons for a genuinely one-way graph.
   */
  directed?: NgeChordLayerConfig['directed'];

  /**
   * End of the ring's angular span in radians (circular layout only). Default `2 * Math.PI`
   * (full turn).
   */
  endAngle?: NgeChordLayerConfig['endAngle'];

  /**
   * Format a node's label (when `showLabels` is set). Receives the node carrying its
   * summed flow as `value`. Defaults to the node's `label`, then its `id`.
   */
  formatLabel?: NgeChordLayerConfig['formatLabel'];

  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius (circular layout
   * only) — the ring of arcs occupies the band between this radius and the outer radius.
   * Default 0.9.
   */
  innerRadius?: NgeChordLayerConfig['innerRadius'];

  /**
   * Label colour for EVERY node label. A per-datum `labelColor` still wins over it.
   */
  labelColor?: NgeChordLayerConfig['labelColor'];

  /**
   * Gap (px) between a node's mark and its label. Default 6.
   */
  labelPadding?: NgeChordLayerConfig['labelPadding'];

  /**
   * Layout family. `'circular'` (default) draws the ring of arcs — Chord Diagram or
   * Non-ribbon Chord, depending on `linkMark`; `'linear'` draws nodes on a horizontal
   * baseline with arced connections above it — the Arc Diagram.
   */
  layout?: NgeChordLayerConfig['layout'];

  /**
   * How a connection is drawn. `'ribbon'` (default) fills the area between two arcs;
   * `'edge'` strokes a thin curve instead. The linear layout ignores this and always
   * renders as `'edge'`.
   */
  linkMark?: NgeChordLayerConfig['linkMark'];

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for node arcs (circular layout) or node circles (linear layout).
   */
  onClick?: NgeChordLayerConfig['onClick'];

  /**
   * Angular gap between adjacent ring arcs, in radians (circular layout only). Default 0.
   */
  padAngle?: NgeChordLayerConfig['padAngle'];

  /**
   * Scale the self-computed outer radius by a RATIO (0–1) (circular layout only).
   */
  radiusRatio?: NgeChordLayerConfig['radiusRatio'];

  /**
   * Node color palette. Node index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label off each node — past the ring in `'circular'` layout, beneath the circle
   * in `'linear'` layout — styled from `theme.chord.label`. Opt-in (default false).
   */
  showLabels?: boolean;

  /**
   * Order the sub-arcs within each group. `'none'` (default) leaves `d3-chord`'s own
   * ordering; `'ascending'` / `'descending'` sort them by value.
   */
  sortSubgroups?: NgeChordLayerConfig['sortSubgroups'];

  /**
   * Start of the ring's angular span in radians (circular layout only). Default 0.
   */
  startAngle?: NgeChordLayerConfig['startAngle'];

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: ChordChartTooltipOptions;
}

/**
 * Default content formatter for chord nodes — display name + laid-out flow total.
 */
function defaultChordTooltipFormatter(data: NgeGraphNode): NgeTooltipContent {
  return {
    label: data.label ?? data.id,
    value: String(data.value ?? ''),
  };
}

/**
 * Create a standard chord / arc relationship-diagram chart configuration — one preset
 * folding the Chord Diagram, Non-ribbon Chord, and Arc Diagram catalog entries into a
 * single primitive via `layout` + `linkMark`.
 *
 * @example
 * // Chord Diagram — a ring of arcs joined by filled ribbons (the defaults).
 * const config = createChordChartConfig({
 *   data: {
 *     links: [
 *       { source: 'Design', target: 'Engineering', value: 20 },
 *       { source: 'Design', target: 'Product', value: 15 },
 *       { source: 'Engineering', target: 'Product', value: 10 },
 *     ],
 *   },
 *   showLabels: true,
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 *
 * @example
 * // Non-ribbon Chord — the same ring, but connections stroke a thin curve instead of
 * // filling the space between arcs.
 * const nonRibbon = createChordChartConfig({
 *   data: teamHandoffs,
 *   linkMark: 'edge',
 *   showLabels: true,
 * });
 *
 * @example
 * // Arc Diagram — nodes on a horizontal baseline, connections as stroked arcs above it.
 * const arcDiagram = createChordChartConfig({
 *   data: coOccurrences,
 *   layout: 'linear',
 *   showLabels: true,
 * });
 */
export function createChordChartConfig(options: ChordChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    directed,
    endAngle,
    formatLabel,
    innerRadius,
    labelColor,
    labelPadding,
    layout,
    linkMark,
    margin,
    onClick,
    padAngle,
    radiusRatio,
    seriesColors,
    showLabels,
    sortSubgroups,
    startAngle,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the node's arc / circle by
  // the renderer (`computeTooltipEvent`), so there is no `position` knob to wire — the
  // renderer's `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultChordTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Self-scaled to the plot rect in every layout — a ring of arcs or a baseline of circles
  // computes its own geometry rather than binding to the shared cartesian scales, so both
  // axes stay off, the same opt-out the sankey and pie layers make. The default margin is a
  // plain all-around inset (no asymmetric reserve, unlike sankey's beside-the-rect labels):
  // a chord's opt-in labels sit past the ring / beneath the circles, which the layer already
  // keeps inside the plot rect. Gestures (ARCH-174): a chord/arc diagram is a single,
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
        data,
        directed,
        endAngle,
        formatLabel,
        innerRadius,
        labelColor,
        labelPadding,
        layout,
        linkMark,
        onClick,
        padAngle,
        radiusRatio,
        renderer: renderChordLayer,
        seriesColors,
        showLabels,
        sortSubgroups,
        startAngle,
        tooltip: tooltipConfig,
        type: 'chord',
      },
    ],
  };
}
