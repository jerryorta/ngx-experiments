import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeParallelCoordsCurve,
  NgeParallelCoordsDataPoint,
  NgeParallelCoordsLayerConfig,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderParallelCoordsLayer } from '../layers/parallel-coords';

/**
 * Tooltip options for the parallel coordinates chart preset.
 */
export interface ParallelCoordsChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeParallelCoordsDataPoint) => NgeTooltipContent;

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
 * Options for creating a parallel coordinates chart config preset.
 */
export interface ParallelCoordsChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Controlled per-axis brush selections, keyed by dimension `label`. Records failing any
   * active extent are dimmed rather than removed. Pair with `onBrush` for the interactive
   * loop, or set it alone to drive the filter programmatically.
   */
  brushExtents?: NgeParallelCoordsLayerConfig['brushExtents'];

  /**
   * Dimension `label` whose value colors each polyline: every distinct value takes a palette
   * entry in first-seen order, and a record's line inherits the color of its own value. Unset
   * ⇒ color cycles the palette by record index, which stops carrying meaning once the record
   * count passes the palette size.
   */
  colorBy?: string;

  /**
   * Polyline shape. Default `'linear'` (straight segments between axes); `'monotone'` draws
   * the curved variant of the chart type.
   */
  curve?: NgeParallelCoordsCurve;

  /**
   * Data points to render — one `{ label, value }` per dimension, grouped into records by
   * `seriesId`. The unique `label`s become the vertical axes; each `seriesId` one polyline.
   */
  data: NgeParallelCoordsDataPoint[];

  /**
   * Axis order, and the subset of dimensions to draw. Unset ⇒ every unique `label` in
   * first-seen order. Order is a reading decision, not cosmetics: a correlation between two
   * dimensions is only visible when their axes are adjacent.
   */
  dimensions?: string[];

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Brush-change sink — setting it enables the per-axis drag gesture. Feed
   * `event.extents` straight back into `brushExtents` to close the controlled loop.
   */
  onBrush?: NgeParallelCoordsLayerConfig['onBrush'];

  /**
   * Click handler for record polylines
   */
  onClick?: NgeParallelCoordsLayerConfig['onClick'];

  /**
   * Line color palette. Record (or `colorBy` category) index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Tick count requested per numeric axis. Default 5. Point axes label every category.
   */
  tickCount?: number;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: ParallelCoordsChartTooltipOptions;
}

/**
 * Default content formatter for parallel coordinates data points — dimension + raw value.
 */
function defaultParallelCoordsTooltipFormatter(
  data: NgeParallelCoordsDataPoint
): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value),
  };
}

/**
 * Create a standard parallel coordinates chart configuration.
 *
 * @example
 * const config = createParallelCoordsChartConfig({
 *   data: [
 *     { label: 'Weight', seriesId: 'A', value: 3504 },
 *     { label: 'MPG', seriesId: 'A', value: 18 },
 *     { label: 'Origin', seriesId: 'A', value: 'USA' },
 *     { label: 'Weight', seriesId: 'B', value: 2130 },
 *     { label: 'MPG', seriesId: 'B', value: 35 },
 *     { label: 'Origin', seriesId: 'B', value: 'Japan' },
 *   ],
 *   colorBy: 'Origin',
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createParallelCoordsChartConfig(
  options: ParallelCoordsChartPresetOptions
): NgeChartConfig {
  const {
    animation,
    brushExtents,
    colorBy,
    curve,
    data,
    dimensions,
    margin,
    onBrush,
    onClick,
    seriesColors,
    tickCount,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the hovered vertex by the
  // renderer (`vertexTooltipEvent`), so there is no `position` knob to wire — the renderer's
  // `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultParallelCoordsTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // The layer draws its own vertical axes — one per dimension, each with its own scale — so
  // the shared cartesian axes are off. The margin is breathing room only: the layer keeps its
  // tick labels and dimension names INSIDE the plot rect, because everything a layer draws is
  // clipped to that rect and chrome hung in the margin would be discarded.
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 16, left: 24, right: 24, top: 24 },
      showXAxis: false,
      showYAxis: false,
    },
    layers: [
      {
        brushExtents,
        colorBy,
        curve,
        data,
        dimensions,
        onBrush,
        onClick,
        renderer: renderParallelCoordsLayer,
        seriesColors,
        tickCount,
        tooltip: tooltipConfig,
        type: 'parallel-coords',
      },
    ],
  };
}
