import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeHeatmapDataPoint,
  NgeHeatmapLayerConfig,
  HeatmapColorScheme,
  HeatmapMark,
} from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent } from '../core/tooltip';

import { createHeatmapChartScalesFactory } from '../nge-chart/nge-chart.heatmap.helpers';
import { renderHeatmapLayer } from '../layers/heatmap';

/**
 * Options for creating a heatmap chart config preset.
 *
 * The default is a colour-encoded `<rect>` grid (**Heat Map**); `mark: 'bubble'`
 * gives a size-encoded **Bubble-based Heat Map**. Colour comes from a named `scheme`
 * (d3-scale-chromatic) or, unset, the theme token ramp. Axes default ON — a heatmap
 * is a standalone analytical chart — with a wider left margin for long row labels.
 */
export interface HeatmapChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Exit-transition (fade-out) duration in ms for removed marks. Default 300.
   * Set 0 for instant renders (used during zoom/pan gestures).
   */
  animationMs?: number;

  /** Max bubble radius as a fraction of half the smaller band step (bubble mode). Default 0.9. */
  bubbleMaxRatio?: number;

  /** Column-axis band padding (fraction of the band step). Default 0.05. */
  colPadding?: number;

  /** One cell per row × column pair. */
  data: NgeHeatmapDataPoint[];

  /** Explicit color domain [min, max]. Defaults to the data's non-null value extent. */
  domain?: [number, number];

  /** Format the in-cell / tooltip value. Default String(value). */
  labelFormat?: (value: number) => string;

  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];

  /** Cell (color-encoded) vs bubble (size-encoded) marks. Default 'cell'. */
  mark?: HeatmapMark;

  /** Click handler for a cell. */
  onClick?: NgeHeatmapLayerConfig['onClick'];

  /** Row-axis band padding (fraction of the band step). Default 0.05. */
  rowPadding?: number;

  /** Named sequential scheme; overrides the theme token ramp when set. */
  scheme?: HeatmapColorScheme;

  /** Enable tooltips on hover. Default false. */
  showTooltip?: boolean;

  /** Show per-cell value labels. Default false. */
  showValues?: boolean;

  /** Show the X axis. Default true. */
  showXAxis?: boolean;

  /** Show the Y axis. Default true. */
  showYAxis?: boolean;

  /** X axis label. */
  xAxisLabel?: string;

  /** Y axis label. */
  yAxisLabel?: string;
}

/**
 * Default tooltip content formatter for a heatmap cell: the `row · col` pair as the
 * label and the cell value (0 for an empty cell) as the value.
 */
function defaultHeatmapTooltipFormatter(data: NgeHeatmapDataPoint): NgeTooltipContent {
  return {
    label: `${data.row} · ${data.col}`,
    value: data.value ?? 0,
  };
}

/**
 * Create a heatmap chart configuration.
 *
 * Draws a grid of value-encoded cells over a shared band × band scale pair (rows on
 * the y band axis, columns on the x band axis). The default `mark: 'cell'` gives a
 * colour-encoded `<rect>` grid (**Heat Map**); `mark: 'bubble'` a size-encoded
 * **Bubble-based Heat Map** (radius ∝ value, double-encoded with the ramp colour).
 * Colour comes from a named `scheme` (d3-scale-chromatic) or the theme token ramp.
 * Like the histogram / distribution presets, axes default ON; the left margin is
 * wider to fit long row labels. Supplies its own band × band scale factory.
 *
 * @example
 * // Colour-encoded heat map
 * const config = createHeatmapChartConfig({
 *   data: [
 *     { col: 'Mon', row: 'AM', value: 3 },
 *     { col: 'Mon', row: 'PM', value: 8 },
 *     { col: 'Tue', row: 'AM', value: null },
 *   ],
 * });
 *
 * @example
 * // Bubble heat map with a named scheme
 * const config = createHeatmapChartConfig({ data, mark: 'bubble', scheme: 'viridis' });
 *
 * <nge-chart [config]="config" />
 */
export function createHeatmapChartConfig(options: HeatmapChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    bubbleMaxRatio,
    colPadding,
    data,
    domain,
    labelFormat,
    margin,
    mark,
    onClick,
    rowPadding,
    scheme,
    showTooltip = false,
    showValues = false,
    showXAxis = true,
    showYAxis = true,
    xAxisLabel,
    yAxisLabel,
  } = options;

  const tooltipConfig: Partial<NgeTooltipConfig<NgeHeatmapDataPoint>> | undefined = showTooltip
    ? {
        enabled: true,
        formatContent: defaultHeatmapTooltipFormatter,
        height: 65,
        position: 'follow-mouse',
        width: 140,
      }
    : undefined;

  const heatmapLayer: NgeHeatmapLayerConfig = {
    animationMs,
    bubbleMaxRatio,
    data,
    domain,
    labelFormat,
    mark,
    onClick,
    renderer: renderHeatmapLayer,
    scheme,
    showValues,
    tooltip: tooltipConfig,
    type: 'heatmap',
  };

  return {
    animation,
    base: {
      margin: margin ?? { bottom: 45, left: 70, right: 20, top: 20 },
      showXAxis,
      showYAxis,
      xAxisLabel,
      yAxisLabel,
    },
    layers: [heatmapLayer],
    scaleFactory: createHeatmapChartScalesFactory({ colPadding, rowPadding }),
  };
}
