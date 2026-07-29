import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig } from '../core/base-layout';
import type {
  NgeChartConfig,
  NgeHierarchyDatum,
  NgeProportionalLayerConfig,
  NgeProportionalLayout,
  NgeProportionalMark,
} from '../core/config';
import type { NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { renderProportionalLayer } from '../layers/proportional';

/**
 * Tooltip options for the proportional-area chart preset.
 */
export interface ProportionalChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter. Receives the datum with its SUMMED magnitude, so an internal
   * node reports its aggregate rather than `undefined`.
   */
  formatContent?: (data: NgeHierarchyDatum) => NgeTooltipContent;

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
 * Options for creating a proportional-area / waffle chart config preset.
 */
export interface ProportionalChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Grid columns (`mark: 'grid'` only). Default 10 — with `rows`, a 100-cell percentage waffle.
   */
  columns?: number;

  /**
   * Nodes to render. A flat array of leaves gives one mark per datum; nesting groups the
   * `'packed'` mark's circles and leaves only the leaves drawn.
   */
  data: NgeHierarchyDatum[];

  /**
   * Format the on-mark / tooltip label. Defaults to the datum's own `label`.
   */
  formatLabel?: (d: NgeHierarchyDatum) => string;

  /**
   * On-mark label colour for EVERY mark. Setting it deliberately disables the automatic
   * on-fill contrast (which otherwise picks `theme.proportional.label.color` / `.colorOnDark`
   * from each mark's own fill), giving one flat label colour. A per-datum `labelColor` still
   * wins over it.
   */
  labelColor?: string;

  /**
   * How the single-shape marks are arranged. `'row'` (default) spaces them evenly across the
   * plot width; `'nested'` stacks them concentrically on a shared bottom baseline — the
   * Nested Proportional Area. Ignored by `mark: 'grid'` and `mark: 'packed'`.
   */
  layout?: NgeProportionalLayout;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Which area-encoded shape to draw. Default `'circle'`.
   */
  mark?: NgeProportionalMark;

  /**
   * Smallest mark width (px) that still earns a label. Default 24.
   */
  minLabelSize?: number;

  /**
   * Click handler for marks
   */
  onClick?: NgeProportionalLayerConfig['onClick'];

  /**
   * Separation between marks in pixels — the grid gutter, the `d3.pack()` padding, and the
   * inset taken off each row slot. Default 2.
   */
  padding?: number;

  /**
   * Grid rows (`mark: 'grid'` only). Default 10 — with `columns`, a 100-cell percentage waffle.
   */
  rows?: number;

  /**
   * Mark color palette. Top-level input index maps to colors[index % length].
   */
  seriesColors?: string[];

  /**
   * Draw each datum's label on its own mark. Default false. Ignored by `mark: 'grid'`, whose
   * categories are named by a legend — pair a waffle with `extractSunburstChartLegendItems()`
   * and a `<nge-chart-legend>`.
   */
  showLabels?: boolean;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: ProportionalChartTooltipOptions;

  /**
   * Magnitude one grid cell represents (`mark: 'grid'` only). Unset (default) ⇒ the data's
   * total divided by `rows × columns`, so the grid is exactly filled. Setting it turns the
   * waffle into a UNIT chart and leaves any surplus cells empty.
   */
  valuePerCell?: number;
}

/**
 * Default content formatter for proportional-area marks — label + raw value.
 */
function defaultProportionalTooltipFormatter(data: NgeHierarchyDatum): NgeTooltipContent {
  return {
    label: data.label,
    value: String(data.value ?? 0),
  };
}

/**
 * Create a standard proportional-area / waffle chart configuration.
 *
 * @example
 * // Proportional area — one circle per category, AREA proportional to value.
 * const areas = createProportionalChartConfig({
 *   data: [
 *     { label: 'Solar', value: 120 },
 *     { label: 'Wind', value: 80 },
 *     { label: 'Hydro', value: 30 },
 *   ],
 *   showLabels: true,
 *   tooltip: { enabled: true },
 * });
 *
 * // Waffle — a 10x10 grid where each cell is one percentage point.
 * const waffle = createProportionalChartConfig({
 *   data: [
 *     { label: 'Renewable', value: 42 },
 *     { label: 'Nuclear', value: 18 },
 *     { label: 'Fossil', value: 40 },
 *   ],
 *   mark: 'grid',
 * });
 *
 * // Packed circles — nesting groups the leaves into clusters.
 * const packed = createProportionalChartConfig({
 *   data: [
 *     { children: [{ label: 'iOS', value: 60 }, { label: 'Android', value: 90 }], label: 'Mobile' },
 *     { children: [{ label: 'macOS', value: 25 }, { label: 'Windows', value: 70 }], label: 'Desktop' },
 *   ],
 *   mark: 'packed',
 *   showLabels: true,
 * });
 *
 * // Nested proportional area — concentric marks on one baseline.
 * const nested = createProportionalChartConfig({
 *   data: [
 *     { label: 'Total', value: 100 },
 *     { label: 'Reached', value: 55 },
 *     { label: 'Converted', value: 12 },
 *   ],
 *   layout: 'nested',
 * });
 *
 * <nge-chart [config]="areas" />
 */
export function createProportionalChartConfig(
  options: ProportionalChartPresetOptions
): NgeChartConfig {
  const {
    animation,
    columns,
    data,
    formatLabel,
    labelColor,
    layout,
    margin,
    mark,
    minLabelSize,
    onClick,
    padding,
    rows,
    seriesColors,
    showLabels,
    tooltip,
    valuePerCell,
  } = options;

  // Build tooltip config if enabled. Placement is fixed above the mark centroid by the
  // renderer (`computeTooltipEvent`), so there is no `position` knob to wire — the
  // renderer's `mergeTooltipConfig` fills the required `position` default.
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultProportionalTooltipFormatter,
        height: tooltip.height ?? 65,
        style: tooltip.style,
        width: tooltip.width ?? 150,
      }
    : undefined;

  // Gestures: a proportional-area chart is a single-view geometric chart with no meaningful
  // zoom/pan surface (like pie/funnel), so it exposes no `gestures` option. Axes are off —
  // every mark is sized from the data's own maximum, not a shared cartesian scale.
  return {
    animation,
    base: {
      margin: margin ?? { bottom: 10, left: 10, right: 10, top: 10 },
      showXAxis: false,
      showYAxis: false,
    },
    layers: [
      {
        columns,
        data,
        formatLabel,
        labelColor,
        layout,
        mark,
        minLabelSize,
        onClick,
        padding,
        renderer: renderProportionalLayer,
        rows,
        seriesColors,
        showLabels,
        tooltip: tooltipConfig,
        type: 'proportional',
        valuePerCell,
      },
    ],
  };
}
