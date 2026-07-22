import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeGroupedBarDataPoint,
  NgeGroupedBarLayerConfig,
} from '../core/config';
import type { NgeChartGesturesConfig } from '../core/gesture';
import type { NgeChartLegendConfig } from '../core/legend';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { extractGroupedBarLegendItems } from '../core/legend';
import { createGroupedBarChartScales } from '../nge-chart/nge-chart.grouped-bar.helpers';
import { renderGroupedBarLayer } from '../layers/grouped-bar';

/**
 * Tooltip options for grouped bar chart preset
 */
export interface GroupedBarChartTooltipOptions {
  enabled?: boolean;
  formatContent?: (data: NgeGroupedBarDataPoint) => NgeTooltipContent;
  height?: number;
  position?: NgeTooltipConfig<NgeGroupedBarDataPoint>['position'];
  style?: NgeTooltipStyle;
  width?: number;
}

/**
 * Options for creating a grouped bar chart config preset.
 */
export interface GroupedBarChartPresetOptions {
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
  /** Padding between bars within a group (0-1) */
  barPadding?: number;
  /** Bar corner radius (px) */
  barRadius?: number;
  data: NgeGroupedBarDataPoint[];
  /**
   * Opt-in wheel-zoom / drag-pan / brush-zoom gesture capture. Pair the chart's
   * `(chartGesture)` output with NgeGroupedBarChartTransform.onChartGesture —
   * the group (category) axis windows by whole categories, the value axis auto-fits.
   */
  gestures?: NgeChartGesturesConfig;
  /** Padding between groups (0-1) */
  groupPadding?: number;
  /** Format function for value labels */
  labelFormat?: (value: number) => string;
  /** Legend configuration. Set `enabled: true` to auto-generate legend from data. */
  legend?: Partial<NgeChartLegendConfig>;
  margin?: NgeChartBaseConfig['margin'];
  onClick?: NgeGroupedBarLayerConfig['onClick'];
  orientation?: 'horizontal' | 'vertical';
  showLabels?: boolean;
  showXAxis?: boolean;
  /** Show vertical gridlines at the X axis tick positions. @default false */
  showXGrid?: boolean;
  showYAxis?: boolean;
  /** Show horizontal gridlines at the Y axis tick positions. @default false */
  showYGrid?: boolean;
  tooltip?: GroupedBarChartTooltipOptions;
  xAxisLabel?: string;
  /** Custom format function for X axis tick labels */
  xAxisTickFormat?: (d: any) => string;
  xAxisTicks?: number;
  yAxisLabel?: string;
  /** Custom format function for Y axis tick labels */
  yAxisTickFormat?: (d: any) => string;
  yAxisTicks?: number;
}

/**
 * Default content formatter for grouped bar data points
 */
function defaultGroupedBarTooltipFormatter(data: NgeGroupedBarDataPoint): NgeTooltipContent {
  return {
    label: `${data.groupId} — ${data.label}`,
    value: data.value,
  };
}

/**
 * Create a grouped bar chart configuration.
 *
 * @example
 * const config = createGroupedBarChartConfig({
 *   data: [
 *     { groupId: 'Active', label: 'Avg', value: 185, color: '#4CAF50' },
 *     { groupId: 'Active', label: 'Min', value: 142, color: '#81C784' },
 *     { groupId: 'Closed', label: 'Avg', value: 178, color: '#2196F3' },
 *     { groupId: 'Closed', label: 'Min', value: 135, color: '#64B5F6' },
 *   ],
 *   showLabels: true,
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createGroupedBarChartConfig(
  options: GroupedBarChartPresetOptions
): NgeChartConfig {
  const {
    animation,
    animationMs,
    barPadding,
    barRadius,
    data,
    gestures,
    groupPadding,
    labelFormat,
    legend,
    margin,
    onClick,
    orientation = 'vertical',
    showLabels = false,
    showXAxis = false,
    showXGrid = false,
    showYAxis = false,
    showYGrid = false,
    tooltip,
    xAxisLabel,
    xAxisTickFormat,
    xAxisTicks,
    yAxisLabel,
    yAxisTickFormat,
    yAxisTicks,
  } = options;

  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultGroupedBarTooltipFormatter,
        height: tooltip.height ?? 65,
        position: tooltip.position ?? 'follow-mouse',
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  const legendConfig = legend?.enabled
    ? {
        enabled: true,
        items: legend.items ?? extractGroupedBarLegendItems(data),
        position: legend.position ?? 'bottom',
      }
    : undefined;

  return {
    animation,
    base: {
      margin,
      showXAxis,
      showXGrid,
      showYAxis,
      showYGrid,
      xAxisLabel,
      xAxisTickFormat,
      xAxisTicks,
      yAxisLabel,
      yAxisTickFormat,
      yAxisTicks,
    },
    gestures,
    layers: [
      {
        animationMs,
        barPadding,
        barRadius,
        data,
        groupPadding,
        labelFormat,
        onClick,
        orientation,
        renderer: renderGroupedBarLayer,
        showLabels,
        tooltip: tooltipConfig,
        type: 'grouped-bar',
      },
    ],
    legend: legendConfig as NgeChartLegendConfig | undefined,
    scaleFactory: createGroupedBarChartScales,
  };
}
