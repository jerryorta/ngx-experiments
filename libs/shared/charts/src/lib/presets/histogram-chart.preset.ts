import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeHistogramBin,
  NgeHistogramDataPoint,
  NgeHistogramLayerConfig,
} from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent } from '../core/tooltip';

import { createHistogramChartScales } from '../nge-chart/nge-chart.histogram.helpers';
import { renderHistogramLayer } from '../layers/histogram';

/**
 * Options for creating a histogram chart config preset.
 */
export interface HistogramChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Exit-transition (fade-out) duration in ms for removed bars. Default 200.
   * Geometry is applied synchronously; set 0 for instant exits (e.g. during
   * zoom/pan gestures).
   */
  animationMs?: number;

  /** Horizontal gap (px) between adjacent bin bars. Default 1. */
  barGap?: number;

  /** Bar corner radius (px). */
  barRadius?: number;

  /** Desired number of uniform bins. Ignored when `thresholds` is set. Default 10. */
  binCount?: number;

  /** Raw numeric observations — binned by the layer, not pre-aggregated. */
  data: NgeHistogramDataPoint[];

  /** Explicit binning range `[min, max]`. Defaults to the data extent. */
  domain?: [number, number];

  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * `'histogram'` (default) draws bars from the axis; `'rootogram'` hangs them
   * from a fitted normal expected-frequency curve.
   */
  mode?: 'histogram' | 'rootogram';

  /** Click handler for bins. */
  onClick?: NgeHistogramLayerConfig['onClick'];

  /** Show per-bin count labels above each bar. Default false. */
  showLabels?: boolean;

  /** Enable tooltips on bin hover. Default false. */
  showTooltip?: boolean;

  /** Show the X axis. Default true. */
  showXAxis?: boolean;

  /** Show the Y axis. Default true. */
  showYAxis?: boolean;

  /**
   * Draw a horizontal reference line at y = 0 (rootogram mode only — the residual
   * baseline the hanging bars cross). Default false.
   */
  showZeroLine?: boolean;

  /** Explicit bin boundary cut points fed to `d3.bin`. Overrides `binCount`. */
  thresholds?: number[];

  /** X axis label. */
  xAxisLabel?: string;

  /** Y axis label. Default 'Frequency'. */
  yAxisLabel?: string;
}

/**
 * Default tooltip content formatter for histogram bins: the bin range as the
 * label and its observation count as the value.
 */
function defaultHistogramTooltipFormatter(bin: NgeHistogramBin): NgeTooltipContent {
  const format = (value: number): string =>
    Number.isInteger(value) ? String(value) : value.toFixed(2);
  return {
    label: `${format(bin.x0)}–${format(bin.x1)}`,
    value: bin.count,
  };
}

/**
 * Create a histogram chart configuration.
 *
 * Bins raw observations into a frequency distribution rendered as bars on a
 * continuous value axis. Set `mode: 'rootogram'` to hang the bars from a fitted
 * normal expected-frequency curve instead of the axis. Like the waterfall preset
 * (and unlike the micro-chart presets) axes default ON — a histogram is a
 * standalone analytical chart. Supplies its own linear-x/linear-y scale factory.
 *
 * @example
 * // Histogram
 * const config = createHistogramChartConfig({
 *   data: samples.map(value => ({ value })),
 *   binCount: 12,
 * });
 *
 * @example
 * // Hanging rootogram
 * const config = createHistogramChartConfig({ data, mode: 'rootogram' });
 *
 * <nge-chart [config]="config" />
 */
export function createHistogramChartConfig(options: HistogramChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    barGap,
    barRadius,
    binCount,
    data,
    domain,
    margin,
    mode = 'histogram',
    onClick,
    showLabels = false,
    showTooltip = false,
    showXAxis = true,
    showYAxis = true,
    showZeroLine = false,
    thresholds,
    xAxisLabel,
    yAxisLabel = 'Frequency',
  } = options;

  const tooltipConfig: Partial<NgeTooltipConfig<NgeHistogramBin>> | undefined = showTooltip
    ? {
        enabled: true,
        formatContent: defaultHistogramTooltipFormatter,
        height: 65,
        position: 'follow-mouse',
        width: 140,
      }
    : undefined;

  const histogramLayer: NgeHistogramLayerConfig = {
    animationMs,
    barGap,
    barRadius,
    binCount,
    data,
    domain,
    mode,
    onClick,
    renderer: renderHistogramLayer,
    showLabels,
    showZeroLine,
    thresholds,
    tooltip: tooltipConfig,
    type: 'histogram',
  };

  return {
    animation,
    base: {
      margin: margin ?? { bottom: 45, left: 50, right: 15, top: 20 },
      showXAxis,
      showYAxis,
      xAxisLabel,
      yAxisLabel,
    },
    layers: [histogramLayer],
    scaleFactory: createHistogramChartScales,
  };
}
