import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeDivergingBarDataPoint,
  NgeDivergingBarLayerConfig,
} from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderDivergingBarLayer } from '../layers/diverging-bar';

/**
 * Tooltip options for diverging bar chart preset
 */
export interface DivergingBarChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeDivergingBarDataPoint) => NgeTooltipContent;

  /**
   * Tooltip height
   */
  height?: number;

  /**
   * Positioning strategy
   */
  position?: NgeTooltipConfig<NgeDivergingBarDataPoint>['position'];

  /**
   * Whether to show tooltip during initial animation.
   * Defaults to true for backward compatibility.
   * Set to false to only show tooltip on hover interaction.
   */
  showDuringAnimation?: boolean;

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
 * Options for creating a diverging bar chart config preset.
 */
export interface DivergingBarChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Height of the main value bar in pixels
   */
  barHeight?: number;

  /**
   * Height of the center (zero point) indicator in pixels
   */
  centerIndicatorHeight?: number;

  /**
   * Width of the center (zero point) indicator in pixels
   */
  centerIndicatorWidth?: number;

  /**
   * Label text displayed in the bubble above the center indicator.
   * Defaults to 'Balanced'.
   */
  centerLabel?: string;

  /**
   * Data point for the diverging bar chart
   */
  data: NgeDivergingBarDataPoint;

  /**
   * Height of the min/max limit indicators in pixels
   */
  limitIndicatorHeight?: number;

  /**
   * Width of the min/max limit indicators in pixels
   */
  limitIndicatorWidth?: number;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for the diverging bar chart
   */
  onClick?: NgeDivergingBarLayerConfig['onClick'];

  /**
   * Show vertical gridlines at the X axis tick positions
   * @default false
   */
  showXGrid?: boolean;

  /**
   * Show horizontal gridlines at the Y axis tick positions
   * @default false
   */
  showYGrid?: boolean;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: DivergingBarChartTooltipOptions;

  /**
   * Height of the value marker in pixels
   */
  valueIndicatorHeight?: number;

  /**
   * Width of the value marker in pixels
   */
  valueIndicatorWidth?: number;
}

/**
 * Default content formatter for diverging bar chart data points
 */
function defaultDivergingBarTooltipFormatter(data: NgeDivergingBarDataPoint): NgeTooltipContent {
  const suffix = data.units ? `${data.units}` : '';
  const sign = data.value > 0 ? '+' : '';
  return {
    extra: {
      max: data.max,
      min: data.min,
    },
    label: 'Value',
    value: `${sign}${data.value}${suffix}`,
  };
}

/**
 * Create a standard diverging bar chart configuration.
 * Diverging bar charts show a value that can be positive or negative,
 * with the bar extending from the center (zero point) toward the value.
 *
 * @example
 * const config = createDivergingBarChartConfig({
 *   data: {
 *     min: -100,
 *     max: 100,
 *     value: 25, // Positive: bar extends right from center
 *     units: '%',
 *     positiveColor: '#4caf50', // Green for positive
 *     negativeColor: '#f44336', // Red for negative
 *   },
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createDivergingBarChartConfig(
  options: DivergingBarChartPresetOptions
): NgeChartConfig {
  const {
    animation,
    barHeight,
    centerIndicatorHeight,
    centerIndicatorWidth,
    centerLabel,
    data,
    limitIndicatorHeight,
    limitIndicatorWidth,
    margin,
    onClick,
    showXGrid = false,
    showYGrid = false,
    tooltip,
    valueIndicatorHeight,
    valueIndicatorWidth,
  } = options;

  // Build tooltip config if enabled
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultDivergingBarTooltipFormatter,
        height: tooltip.height ?? 65,
        position: tooltip.position ?? 'above',
        showDuringAnimation: tooltip.showDuringAnimation ?? true,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures (ARCH-174): diverging-bar is a single-value micro-chart (one datum,
  // no category axis) — no meaningful zoom/pan surface, so it exposes no
  // `gestures` option (same rationale as bullet).
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 10, left: 10, right: 10, top: 10 },
      showXAxis: false,
      showXGrid,
      showYAxis: false,
      showYGrid,
    },
    layers: [
      {
        barHeight,
        centerIndicatorHeight,
        centerIndicatorWidth,
        centerLabel,
        data,
        limitIndicatorHeight,
        limitIndicatorWidth,
        onClick,
        renderer: renderDivergingBarLayer,
        tooltip: tooltipConfig,
        type: 'diverging-bar',
        valueIndicatorHeight,
        valueIndicatorWidth,
      },
    ],
  };
}
