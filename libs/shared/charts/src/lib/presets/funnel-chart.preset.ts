import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type { NgeChartConfig, NgeFunnelDataPoint, NgeFunnelLayerConfig } from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderFunnelLayer } from '../layers/funnel';

/**
 * Tooltip options for the funnel chart preset.
 */
export interface FunnelChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeFunnelDataPoint) => NgeTooltipContent;

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
 * Options for creating a funnel / pyramid chart config preset.
 */
export interface FunnelChartPresetOptions {
  /**
   * Horizontal placement of each band. `'center'` (default) centers every band;
   * `'left'` pins every band's left edge to x = 0.
   */
  align?: 'center' | 'left';

  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Data points to render — one band per point, top to bottom in input order.
   */
  data: NgeFunnelDataPoint[];

  /**
   * Vertical stacking direction. `'down'` (default) stacks widest-at-top, narrowing
   * downward (Funnel Chart). `'up'` stacks widest-at-bottom, narrowing upward
   * (Pyramid Chart).
   */
  direction?: 'down' | 'up';

  /**
   * Format the on-band / tooltip label. Defaults to the datum's own `label`.
   */
  formatLabel?: (d: NgeFunnelDataPoint) => string;

  /**
   * Vertical gap in pixels carved out between adjacent bands. Default 0.
   */
  gap?: number;

  /**
   * In-band label colour for EVERY band. Setting it deliberately disables the automatic
   * on-fill contrast (which otherwise picks `theme.funnel.label.color` / `.colorOnDark`
   * from each band's own fill), giving one flat label colour. A per-datum `labelColor`
   * still wins over it. Only INSIDE labels derive — an `'edge'` / `'right'` label sits on
   * the plot surface and always takes the theme colour.
   */
  labelColor?: string;

  /**
   * Width in pixels reserved on the right for outside labels — the funnel is drawn into
   * `boundedWidth - labelGutter`. Ignored when labels are inside. Default 96.
   */
  labelGutter?: number;

  /**
   * Where `showLabels` draws each band's label. `'inside'` (default) centers it in the
   * band; `'edge'` sets it just outside the band's own right edge so labels step inward
   * with the taper (the classic funnel annotation); `'right'` pins them to one x for a
   * straight column.
   */
  labelPosition?: 'edge' | 'inside' | 'right';

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * The LAST band's bottom width, as a RATIO (0–1) of the widest band width. Unset
   * (default) ⇒ a flat-bottomed funnel. `0` ⇒ the last band collapses to a point —
   * the pyramid apex (pair with `direction: 'up'`).
   */
  neckRatio?: number;

  /**
   * Click handler for bands
   */
  onClick?: NgeFunnelLayerConfig['onClick'];

  /**
   * Band color palette. Band input index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw a label centered in each band. Default false.
   */
  showLabels?: boolean;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: FunnelChartTooltipOptions;
}

/**
 * Default content formatter for funnel chart bands — label + raw value.
 */
function defaultFunnelTooltipFormatter(data: NgeFunnelDataPoint): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value),
  };
}

/**
 * Create a standard funnel / pyramid chart configuration.
 *
 * @example
 * // Funnel — widest at top, narrowing down, flat bottom (neckRatio unset).
 * const funnel = createFunnelChartConfig({
 *   data: [
 *     { label: 'Visitors', value: 10000 },
 *     { label: 'Signups', value: 4200 },
 *     { label: 'Trials', value: 1800 },
 *     { label: 'Customers', value: 650 },
 *   ],
 *   tooltip: { enabled: true },
 * });
 *
 * // Pyramid — widest at bottom, narrowing up to a point apex.
 * const pyramid = createFunnelChartConfig({
 *   data: [
 *     { label: 'Individual Contributors', value: 400 },
 *     { label: 'Managers', value: 80 },
 *     { label: 'Directors', value: 20 },
 *     { label: 'Executives', value: 5 },
 *   ],
 *   direction: 'up',
 *   neckRatio: 0,
 * });
 *
 * <nge-chart [config]="funnel" />
 */
export function createFunnelChartConfig(options: FunnelChartPresetOptions): NgeChartConfig {
  const {
    align,
    animation,
    data,
    direction,
    formatLabel,
    gap,
    labelColor,
    labelGutter,
    labelPosition,
    margin,
    neckRatio,
    onClick,
    seriesColors,
    showLabels,
    tooltip,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the band centroid by the
  // renderer (`computeTooltipEvent`), so there is no `position` knob to wire — the
  // renderer's `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultFunnelTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures: a funnel is a single-view geometric chart with no meaningful zoom/pan
  // surface (like pie/donut), so it exposes no `gestures` option. Axes are off — width
  // is self-scaled from the data's own max value, not a shared cartesian scale.
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 10, left: 10, right: 10, top: 10 },
      showXAxis: false,
      showYAxis: false,
    },
    layers: [
      {
        align,
        data,
        direction,
        formatLabel,
        gap,
        labelColor,
        labelGutter,
        labelPosition,
        neckRatio,
        onClick,
        renderer: renderFunnelLayer,
        seriesColors,
        showLabels,
        tooltip: tooltipConfig,
        type: 'funnel',
      },
    ],
  };
}
