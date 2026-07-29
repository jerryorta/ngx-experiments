import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeWordCloudDataPoint,
  NgeWordCloudLayerConfig,
  NgeWordCloudScale,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderWordCloudLayer } from '../layers/wordcloud';

/**
 * Tooltip options for the word cloud chart preset.
 */
export interface WordCloudChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeWordCloudDataPoint) => NgeTooltipContent;

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
 * Options for creating a word cloud chart config preset.
 */
export interface WordCloudChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Words to render — one text mark per datum. `label` is the word and must be unique;
   * `value` is its frequency / weight.
   */
  data: NgeWordCloudDataPoint[];

  /**
   * Font family the words are drawn AND measured in. Falls back to
   * `theme.wordcloud.word.fontFamily` (`'inherit'` by default).
   */
  fontFamily?: string;

  /**
   * Format the rendered word / tooltip label. Defaults to the datum's own `label`.
   */
  formatLabel?: (d: NgeWordCloudDataPoint) => string;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Font size (px) of the highest-valued word. Default 64.
   */
  maxFontSize?: number;

  /**
   * Font size (px) of the lowest-valued word. Default 10.
   */
  minFontSize?: number;

  /**
   * Click handler for words
   */
  onClick?: NgeWordCloudLayerConfig['onClick'];

  /**
   * Clearance (px) kept between adjacent word boxes. Default 2.
   */
  padding?: number;

  /**
   * Rotation angles (degrees) cycled across the words by placement order. Default `[0]` —
   * every word horizontal. `[0, 90]` gives the classic mixed-orientation cloud.
   */
  rotations?: number[];

  /**
   * How `value` maps to font size — `'sqrt'` (default), `'linear'`, or `'log'`.
   */
  scale?: NgeWordCloudScale;

  /**
   * Word color palette. Placement order maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: WordCloudChartTooltipOptions;
}

/**
 * Default content formatter for word cloud marks — word + raw value.
 */
function defaultWordCloudTooltipFormatter(data: NgeWordCloudDataPoint): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value ?? 0),
  };
}

/**
 * Create a standard word cloud chart configuration.
 *
 * @example
 * // Term frequency — the largest word carries the highest count.
 * const terms = createWordCloudChartConfig({
 *   data: [
 *     { label: 'angular', value: 120 },
 *     { label: 'signals', value: 86 },
 *     { label: 'rxjs', value: 44 },
 *     { label: 'ngrx', value: 31 },
 *   ],
 *   tooltip: { enabled: true },
 * });
 *
 * // Mixed orientation — alternating words turn 90°, the classic cloud look.
 * const mixed = createWordCloudChartConfig({
 *   data: terms,
 *   rotations: [0, 90],
 * });
 *
 * <nge-chart [config]="terms" />
 */
export function createWordCloudChartConfig(options: WordCloudChartPresetOptions): NgeChartConfig {
  const {
    animation,
    data,
    fontFamily,
    formatLabel,
    margin,
    maxFontSize,
    minFontSize,
    onClick,
    padding,
    rotations,
    scale,
    seriesColors,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the word by the renderer
  // (`computeTooltipEvent`), so there is no `position` knob to wire — the renderer's
  // `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultWordCloudTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures: a word cloud is a single-view geometric chart with no meaningful zoom/pan
  // surface (like pie/funnel/proportional), so it exposes no `gestures` option. Axes are off —
  // words are sized from the data's own extent, not a shared cartesian scale.
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
        fontFamily,
        formatLabel,
        maxFontSize,
        minFontSize,
        onClick,
        padding,
        renderer: renderWordCloudLayer,
        rotations,
        scale,
        seriesColors,
        tooltip: tooltipConfig,
        type: 'wordcloud',
      },
    ],
  };
}
