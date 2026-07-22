import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeGaugeDataPoint,
  NgeGaugeIndicator,
  NgeGaugeLayerConfig,
  NgeGaugeShape,
  NgeGaugeThreshold,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderGaugeLayer } from '../layers/gauge';

/**
 * Tooltip options for the gauge chart preset.
 */
export interface GaugeChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeGaugeDataPoint) => NgeTooltipContent;

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
 * Options for creating a gauge (single-value meter) chart config preset.
 */
export interface GaugeChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Data point to render (a single value against its own min/max range).
   */
  data: NgeGaugeDataPoint;

  /**
   * End of the angular sweep in radians (`shape: 'arc'`). Default ≈ `0.75π` (speedometer).
   */
  endAngle?: number;

  /**
   * Arc readout: `'fill'` (default) grows a filled value arc; `'needle'` swings a needle.
   * Ignored when `shape: 'linear'`.
   */
  indicator?: NgeGaugeIndicator;

  /**
   * Inner radius as a RATIO (0–1) of the self-computed outer radius (`shape: 'arc'`).
   * Default `0.65` (the classic gauge ring). NOT pixels.
   */
  innerRadius?: number;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for the gauge
   */
  onClick?: NgeGaugeLayerConfig['onClick'];

  /**
   * Meter form: `'arc'` circular gauge (default) or `'linear'` horizontal progress bar.
   */
  shape?: NgeGaugeShape;

  /**
   * Print the numeric value (+ units) at the center. Default true.
   */
  showValueLabel?: boolean;

  /**
   * Start of the angular sweep in radians (`shape: 'arc'`). Default ≈ `-0.75π` (speedometer).
   */
  startAngle?: number;

  /**
   * Optional ascending colored bands painted along the track. Default none.
   */
  thresholds?: NgeGaugeThreshold[];

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: GaugeChartTooltipOptions;
}

/**
 * Default content formatter for gauge data points — label + value (with units suffix).
 */
function defaultGaugeTooltipFormatter(data: NgeGaugeDataPoint): NgeTooltipContent {
  const suffix = data.units ? ` ${data.units}` : '';
  return {
    label: data.label ?? 'Value',
    value: `${data.value}${suffix}`,
  };
}

/**
 * Create a standard gauge (single-value meter) chart configuration.
 *
 * @example
 * const config = createGaugeChartConfig({
 *   data: { min: 0, max: 100, value: 72, units: '%' },
 *   shape: 'arc',
 *   indicator: 'needle',
 *   thresholds: [{ value: 33 }, { value: 66 }, { value: 100 }],
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createGaugeChartConfig(options: GaugeChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    endAngle,
    indicator,
    innerRadius,
    margin,
    onClick,
    shape,
    showValueLabel,
    startAngle,
    thresholds,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the gauge center by the
  // renderer, so there is no `position` knob to wire — the renderer's `mergeTooltipConfig`
  // fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultGaugeTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures (ARCH-174): a gauge is a single-value meter — no meaningful zoom/pan surface,
  // so it exposes no `gestures` option. Axes are off (self-scaled radial / linear layout).
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
        endAngle,
        indicator,
        innerRadius,
        onClick,
        renderer: renderGaugeLayer,
        shape,
        showValueLabel,
        startAngle,
        thresholds,
        tooltip: tooltipConfig,
        type: 'gauge',
      },
    ],
  };
}
