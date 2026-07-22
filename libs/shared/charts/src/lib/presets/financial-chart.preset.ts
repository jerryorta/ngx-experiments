import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  FinancialVariant,
  NgeChartConfig,
  NgeFinancialDataPoint,
  NgeFinancialLayerConfig,
} from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent } from '../core/tooltip';

import { createFinancialChartScalesFactory } from '../nge-chart/nge-chart.financial.helpers';
import { renderFinancialLayer } from '../layers/financial';

/**
 * Options for creating a financial chart config preset.
 *
 * One preset spans the whole price-chart family — the default is a **candlestick**
 * (OHLC wick + body per period); `variant: 'kagi'` a reversal-driven **kagi** zigzag;
 * `variant: 'renko'` a fixed-brick **renko** staircase. The kagi/renko variants derive
 * their geometry from the `close` series alone. Axes default ON — a financial chart is
 * a standalone analytical chart.
 */
export interface FinancialChartPresetOptions {
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

  /** Renko fixed brick height in price units (renko variant). Defaults to a fraction of the close range. */
  brickSize?: number;

  /** Candle body width as a fraction of the band bandwidth (candlestick variant). Default 0.6. */
  candleWidth?: number;

  /** OHLC data points to render — one candle / one `close` sample per period, in sequence. */
  data: NgeFinancialDataPoint[];

  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];

  /** Click handler for a candle (candlestick variant only). */
  onClick?: NgeFinancialLayerConfig['onClick'];

  /** Interpret `reversalThreshold` as a fraction of the `close` price range (kagi variant). Default false. */
  reversalAsPercent?: boolean;

  /** Kagi reversal amount (kagi variant). Defaults to a small fraction of the `close` price range. */
  reversalThreshold?: number;

  /** Enable tooltips on hover (candlestick variant). Default false. */
  showTooltip?: boolean;

  /** Show the X axis. Default true. */
  showXAxis?: boolean;

  /** Show the Y axis. Default true. */
  showYAxis?: boolean;

  /** Which price chart to draw. Default `'candlestick'`. */
  variant?: FinancialVariant;

  /** X axis label. */
  xAxisLabel?: string;

  /** Y axis label. */
  yAxisLabel?: string;
}

/**
 * Default tooltip content formatter for a financial candle: the period date as the
 * label and its closing price as the value.
 */
function defaultFinancialTooltipFormatter(data: NgeFinancialDataPoint): NgeTooltipContent {
  return {
    label: data.date instanceof Date ? data.date.toLocaleDateString() : String(data.date),
    value: data.close,
  };
}

/**
 * Create a financial chart configuration.
 *
 * One preset spans the price-chart family: the default is a **candlestick** (a thin
 * `low`→`high` wick plus an `open`→`close` body per period, up/down coloured);
 * `variant: 'kagi'` folds the `close` series into a reversal-driven zigzag of
 * yang/yin vertical segments; `variant: 'renko'` walks the `close` series into a
 * fixed-`brickSize` diagonal staircase. Like the distribution / histogram / heatmap
 * presets, axes default ON — a financial chart is a standalone analytical chart.
 * Supplies its own sequence-band / price-linear scale factory (price on y).
 *
 * @example
 * // Candlestick
 * const config = createFinancialChartConfig({
 *   data: [
 *     { date: '2024-01-01', open: 10, high: 14, low: 9, close: 13 },
 *     { date: '2024-01-02', open: 13, high: 15, low: 11, close: 11 },
 *   ],
 * });
 *
 * @example
 * // Kagi
 * const config = createFinancialChartConfig({ data, variant: 'kagi' });
 *
 * <nge-chart [config]="config" />
 */
export function createFinancialChartConfig(options: FinancialChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    brickSize,
    candleWidth,
    data,
    margin,
    onClick,
    reversalAsPercent,
    reversalThreshold,
    showTooltip = false,
    showXAxis = true,
    showYAxis = true,
    variant,
    xAxisLabel,
    yAxisLabel,
  } = options;

  const tooltipConfig: Partial<NgeTooltipConfig<NgeFinancialDataPoint>> | undefined = showTooltip
    ? {
        enabled: true,
        formatContent: defaultFinancialTooltipFormatter,
        height: 65,
        position: 'follow-mouse',
        width: 140,
      }
    : undefined;

  const financialLayer: NgeFinancialLayerConfig = {
    animationMs,
    brickSize,
    candleWidth,
    data,
    onClick,
    renderer: renderFinancialLayer,
    reversalAsPercent,
    reversalThreshold,
    tooltip: tooltipConfig,
    type: 'financial',
    variant,
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
    layers: [financialLayer],
    scaleFactory: createFinancialChartScalesFactory({
      brickSize,
      reversalAsPercent,
      reversalThreshold,
      variant,
    }),
  };
}
