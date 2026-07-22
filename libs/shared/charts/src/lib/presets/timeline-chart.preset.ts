import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeTimelineDataPoint,
  NgeTimelineLayerConfig,
} from '../core/config';
import type { NgeChartGesturesConfig } from '../core/gesture';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import {
  computeTimelineXDataDomain,
  createTimelineChartScales,
} from '../nge-chart/nge-chart.timeline.helpers';
import { renderTimelineLayer } from '../layers/timeline';

/**
 * Tooltip options for the timeline chart preset.
 */
export interface TimelineChartTooltipOptions {
  /** Enable tooltips. */
  enabled?: boolean;
  /** Custom content formatter. Defaults to the item label + its date span. */
  formatContent?: (data: NgeTimelineDataPoint) => NgeTooltipContent;
  /** Tooltip height (px). */
  height?: number;
  /** Positioning strategy. */
  position?: NgeTooltipConfig<NgeTimelineDataPoint>['position'];
  /** Visual styling options (border color, background color, divot size). */
  style?: NgeTooltipStyle;
  /** Tooltip width (px). */
  width?: number;
}

/**
 * Options for creating a timeline / Gantt chart config preset.
 *
 * Axes default ON — a timeline is a standalone analytical chart. Supplies its own
 * time-x / band-y scale factory via {@link createTimelineChartScales}. Optional
 * `rowGroups` cluster the band rows into labelled swim-lane sections by reusing the
 * base layout's `yAxisGroups` axis-tier infrastructure.
 */
export interface TimelineChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;
  /**
   * Enter/update/exit transition duration in ms. Default 300.
   * Set 0 for instant renders (used during zoom/pan gestures).
   */
  animationMs?: number;
  /** Bar corner radius (px). */
  barRadius?: number;
  /** Data points to render — one span (or milestone) per item, grouped into rows by `rowId`. */
  data: NgeTimelineDataPoint[];
  /**
   * Opt-in plot gesture capture. On a timeline the y is a band (rows) axis, so plot
   * wheel/drag window the ROWS, not time — the time scrub comes from the range-axis
   * brush (`rangeAxisX`). Pair `(chartGesture)` with `NgeTimelineChartTransform`.
   */
  gestures?: NgeChartGesturesConfig;
  /** Format the on-bar / tooltip label from a datum. Defaults to the datum's `label`. */
  labelFormat?: (data: NgeTimelineDataPoint) => string;
  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];
  /** Milestone diamond size (px). */
  milestoneSize?: number;
  /** Click handler for a span / milestone. */
  onClick?: NgeTimelineLayerConfig['onClick'];
  /**
   * Replace the standard time x-axis with a full-range ruler + draggable brush (the
   * scrub axis): the ruler shows the WHOLE time extent while the plot renders only the
   * brushed focus window. Pair with `NgeTimelineChartTransform` (it feeds the brushed
   * window back as `xDomain`). Default false.
   */
  rangeAxisX?: boolean;
  /**
   * Optional swim-lane grouping of the band rows, drawn to the left of the row labels.
   * Reuses the base layout's `yAxisGroups` axis-tier system — e.g.
   * `[{ groupBy: rowId => teamOf(rowId) }]`.
   */
  rowGroups?: NgeChartBaseConfig['yAxisGroups'];
  /** Padding between band rows (0-1) on the y band scale. Default 0.2. */
  rowPadding?: number;
  /** Draw the item label inside each span bar. Default false. */
  showLabels?: boolean;
  /** Render items flagged `milestone` as diamonds. Default true. */
  showMilestones?: boolean;
  /** Show the X (time) axis. Default true. */
  showXAxis?: boolean;
  /** Show vertical gridlines at the X axis tick positions. Default false. */
  showXGrid?: boolean;
  /** Show the Y (row) axis. Default true. */
  showYAxis?: boolean;
  /** Show horizontal gridlines at the Y axis tick positions. Default false. */
  showYGrid?: boolean;
  /** Tooltip configuration. Use `{ enabled: true }` for the default tooltip, or provide custom options. */
  tooltip?: TimelineChartTooltipOptions;
  /** X axis label. */
  xAxisLabel?: string;
  /** Custom format function for X axis tick labels. */
  xAxisTickFormat?: (d: any) => string;
  /**
   * Target tick count for the time x-axis. Default 5 — d3 rounds this to a "nice"
   * time interval, so a multi-month span yields clean ~monthly ticks instead of the
   * dense weekly ticks d3's unbounded default emits (which collide in narrow charts).
   * Pass a higher value (>=6) for denser ticks on wide, long-span charts.
   */
  xAxisTicks?: number;
  /**
   * Explicit time x-domain `[min, max]` (epoch ms) — the scrub/zoom focus window fed by
   * `NgeTimelineChartTransform`. Renders only that slice; with `rangeAxisX` the ruler
   * still spans the full data extent.
   */
  xDomain?: [number, number];
  /** Y axis label. */
  yAxisLabel?: string;
}

/**
 * Default tooltip content for a timeline item: its label (falling back to the row)
 * and the formatted date span (or the single instant, for a milestone).
 */
function defaultTimelineTooltipFormatter(data: NgeTimelineDataPoint): NgeTooltipContent {
  const toLabel = (value: Date | number | string): string => {
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString();
  };

  return {
    label: data.label ?? data.rowId,
    value: data.milestone ? toLabel(data.start) : `${toLabel(data.start)} – ${toLabel(data.end)}`,
  };
}

/**
 * Create a timeline / Gantt chart configuration.
 *
 * Draws `[start, end]` bars on a continuous time x-axis, one band row per `rowId`,
 * with optional milestone diamonds and swim-lane `rowGroups`. Axes default ON. Ships
 * its own time-x / band-y {@link createTimelineChartScales} factory (the default
 * `createBarChartScales` only builds band-x / linear-y).
 *
 * @example
 * const config = createTimelineChartConfig({
 *   data: [
 *     { rowId: 'Design', label: 'Design', start: '2024-01-01', end: '2024-01-10' },
 *     { rowId: 'Build', label: 'Build', start: '2024-01-08', end: '2024-01-25' },
 *     { rowId: 'Build', label: 'Launch', start: '2024-01-25', end: '2024-01-25', milestone: true },
 *   ],
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createTimelineChartConfig(options: TimelineChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    barRadius,
    data,
    gestures,
    labelFormat,
    margin,
    milestoneSize,
    onClick,
    rangeAxisX = false,
    rowGroups,
    rowPadding,
    showLabels = false,
    showMilestones = true,
    showXAxis = true,
    showXGrid = false,
    showYAxis = true,
    showYGrid = false,
    tooltip,
    xAxisLabel,
    xAxisTickFormat,
    xAxisTicks = 5,
    xDomain,
    yAxisLabel,
  } = options;

  const tooltipConfig: Partial<NgeTooltipConfig<NgeTimelineDataPoint>> | undefined =
    tooltip?.enabled
      ? {
          enabled: true,
          formatContent: tooltip.formatContent ?? defaultTimelineTooltipFormatter,
          height: tooltip.height ?? 65,
          position: tooltip.position ?? 'follow-mouse',
          style: tooltip.style,
          width: tooltip.width ?? 160,
        }
      : undefined;

  const timelineLayer: NgeTimelineLayerConfig = {
    animationMs,
    barRadius,
    data,
    labelFormat,
    milestoneSize,
    onClick,
    renderer: renderTimelineLayer,
    rowPadding,
    showLabels,
    showMilestones,
    tooltip: tooltipConfig,
    type: 'timeline',
  };

  return {
    animation,
    base: {
      // Wider left gutter than the base default (45) so text row labels ("Platform",
      // "Frontend", …) aren't clipped; override `margin` for longer labels.
      margin: margin ?? { bottom: 45, left: 80, right: 15, top: 20 },
      showXAxis,
      showXGrid,
      showYAxis,
      showYGrid,
      xAxisLabel,
      xAxisTickFormat,
      xAxisTicks,
      xRangeAxis: rangeAxisX ? { fullDomain: computeTimelineXDataDomain(data) } : undefined,
      yAxisGroups: rowGroups,
      yAxisLabel,
    },
    gestures,
    layers: [timelineLayer],
    // The scrub/zoom focus window (epoch ms) is captured in the factory closure — the
    // transform rebuilds this config to change it; `xRangeAxis.fullDomain` stays full.
    scaleFactory: (config, dimensions) =>
      createTimelineChartScales(config, dimensions, { xDomain }),
  };
}
