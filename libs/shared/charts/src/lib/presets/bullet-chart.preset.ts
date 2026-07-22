import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeBulletDataPoint, NgeBulletLayerConfig, NgeChartConfig } from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderBulletLayer } from '../layers/bullet';

/**
 * Tooltip options for bullet chart preset
 */
export interface BulletChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeBulletDataPoint) => NgeTooltipContent;

  /**
   * Tooltip height
   */
  height?: number;

  /**
   * Positioning strategy
   */
  position?: NgeTooltipConfig<NgeBulletDataPoint>['position'];

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
 * Options for creating a bullet chart config preset.
 */
export interface BulletChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Height of the main progress bar in pixels
   */
  barHeight?: number;

  /**
   * Data point for the bullet chart
   */
  data: NgeBulletDataPoint;

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
   * Click handler for the bullet chart
   */
  onClick?: NgeBulletLayerConfig['onClick'];

  /**
   * Height of the progress marker in pixels
   */
  progressIndicatorHeight?: number;

  /**
   * Width of the progress marker in pixels
   */
  progressIndicatorWidth?: number;

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
  tooltip?: BulletChartTooltipOptions;
}

/**
 * Default content formatter for bullet chart data points
 */
function defaultBulletTooltipFormatter(data: NgeBulletDataPoint): NgeTooltipContent {
  const suffix = data.units ? ` ${data.units}` : '';
  return {
    extra: {
      max: data.max,
      min: data.min,
    },
    label: 'Progress',
    value: `${data.progress}${suffix}`,
  };
}

/**
 * Create a standard bullet chart configuration.
 *
 * @example
 * const config = createBulletChartConfig({
 *   data: {
 *     min: 0,
 *     max: 100,
 *     progress: 75,
 *     units: '%',
 *     color: '#4CAF50', // Optional custom color
 *   },
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createBulletChartConfig(options: BulletChartPresetOptions): NgeChartConfig {
  const {
    animation,
    barHeight,
    data,
    limitIndicatorHeight,
    limitIndicatorWidth,
    margin,
    onClick,
    progressIndicatorHeight,
    progressIndicatorWidth,
    showXGrid = false,
    showYGrid = false,
    tooltip,
  } = options;

  // Build tooltip config if enabled
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultBulletTooltipFormatter,
        height: tooltip.height ?? 65,
        position: tooltip.position ?? 'above',
        showDuringAnimation: tooltip.showDuringAnimation ?? true,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures (ARCH-174): bullet is a single-row linear micro-chart — no
  // meaningful zoom/pan surface, so it exposes no `gestures` option.
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
        data,
        limitIndicatorHeight,
        limitIndicatorWidth,
        onClick,
        progressIndicatorHeight,
        progressIndicatorWidth,
        renderer: renderBulletLayer,
        tooltip: tooltipConfig,
        type: 'bullet',
      },
    ],
  };
}
