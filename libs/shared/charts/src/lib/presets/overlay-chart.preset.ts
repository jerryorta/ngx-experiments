import type { NgeChartAnimationConfig } from '../core/animation';
import type {
  NgeChartConfig,
  NgeOverlayDataPoint,
  NgeOverlayLayerConfig,
  NgeOverlayMode,
} from '../core/config';
import type { NgeTooltipConfig } from '../core/tooltip';

import { renderOverlayLayer } from '../layers/overlay';

/**
 * Options for an analytical overlay layer.
 *
 * These are the overlay fields only — an overlay is NOT a standalone chart, so there is
 * no base / axis / scale config here. Compose it onto an existing chart with
 * {@link addOverlay} (or drop {@link createOverlayConfig} into a `layers` array) so it
 * shares the host's scales.
 */
export interface OverlayPresetOptions {
  /**
   * Standard enter/update/exit animation (per-phase durations + easing) for the
   * overlay layer. Overrides the chart-wide animation and the `animationMs` shorthand.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Enter/update/exit transition duration in ms. Default 300. Set 0 for instant
   * renders (used during zoom/pan gestures).
   */
  animationMs?: number;

  /** Data points the overlay fits / summarises — the series it is computed from. */
  data: NgeOverlayDataPoint[];

  /** Trend fit method (`trendline` mode). Default `'linear'` (least-squares). */
  fit?: 'linear' | 'loess';

  /**
   * Prediction-interval levels in (0, 1), one widening band each (`fan` mode). A higher
   * level yields a wider band. Default `[0.5, 0.8, 0.95]`.
   */
  intervals?: number[];

  /** LOESS smoothing bandwidth in (0, 1] (`trendline` mode, `fit: 'loess'`). Default 0.3. */
  loessBandwidth?: number;

  /** Which annotation to draw: `'trendline'`, `'control'`, or `'fan'`. */
  mode: NgeOverlayMode;

  /** Restrict the overlay to one series when the source `data` is multi-series (by `seriesId`). */
  seriesId?: string;

  /** Shade the area between the control limits (`control` mode). Default false. */
  showControlBand?: boolean;

  /** Draw the fitted trend line (`trendline` mode). Default true. */
  showFitLine?: boolean;

  /** Control-limit half-width in standard deviations (`control` mode). Default 3. */
  sigma?: number;

  /** Tooltip configuration. Set `enabled: true` to show tooltips on hover. */
  tooltip?: Partial<NgeTooltipConfig<NgeOverlayDataPoint>>;
}

/**
 * Build a single overlay layer definition (`type: 'overlay'` + the `renderOverlayLayer`
 * renderer bound in) from the given options.
 *
 * Drop it into any chart's `layers` array so it draws on the host's shared scales:
 *
 * @example
 * const config = createLineChartConfig({ data: series });
 * config.layers.push(createOverlayConfig({ data: series, mode: 'trendline' }));
 *
 * <nge-chart [config]="config" />
 */
export function createOverlayConfig(options: OverlayPresetOptions): NgeOverlayLayerConfig {
  const {
    animation,
    animationMs,
    data,
    fit,
    intervals,
    loessBandwidth,
    mode,
    seriesId,
    showControlBand,
    showFitLine,
    sigma,
    tooltip,
  } = options;

  return {
    animation,
    animationMs,
    data,
    fit,
    intervals,
    loessBandwidth,
    mode,
    renderer: renderOverlayLayer,
    seriesId,
    showControlBand,
    showFitLine,
    sigma,
    tooltip,
    type: 'overlay',
  };
}

/**
 * Append an analytical overlay onto an existing chart config, returning a new config.
 *
 * The overlay is added as the last layer (front) so it draws OVER the host series on the
 * host's shared scales — the overlay does not build its own scales, base, or axes.
 *
 * @example
 * // A line chart with a linear trend line overlaid.
 * const base = createLineChartConfig({ data: series, showPoints: true });
 * const config = addOverlay(base, { data: series, mode: 'trendline' });
 *
 * <nge-chart [config]="config" />
 */
export function addOverlay(
  config: NgeChartConfig,
  options: OverlayPresetOptions
): NgeChartConfig {
  return {
    ...config,
    layers: [...config.layers, createOverlayConfig(options)],
  };
}
