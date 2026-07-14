import { scaleLinear } from 'd3-scale';

import type { NgeChartBaseConfig, NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeChartScaleFactory,
  NgeScatterDataPoint,
  NgeScatterLayerConfig,
} from '../core/config';
import type { NgeChartGesturesConfig } from '../core/gesture';
import type { NgeChartLegendConfig } from '../core/legend';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

import { extractScatterChartLegendItems } from '../core/legend';
import { renderScatterLayer } from '../layers/scatter';

/**
 * Tooltip options for scatter chart preset
 */
export interface ScatterChartTooltipOptions {
  /**
   * Enable tooltips
   */
  enabled?: boolean;

  /**
   * Custom content formatter
   */
  formatContent?: (data: NgeScatterDataPoint) => NgeTooltipContent;

  /**
   * Tooltip height
   */
  height?: number;

  /**
   * Positioning strategy
   */
  position?: NgeTooltipConfig<NgeScatterDataPoint>['position'];

  /**
   * Visual styling options
   */
  style?: NgeTooltipStyle;

  /**
   * Tooltip width
   */
  width?: number;
}

/**
 * Options for creating a scatter chart config preset.
 */
export interface ScatterChartPresetOptions {
  /**
   * Enter/update/exit transition duration in ms. Default 300.
   * Set 0 for instant renders (used during zoom/pan gestures).
   */
  animationMs?: number;

  /**
   * Data points. Each point needs numeric x and y coordinates.
   * Optional color and size can be specified per point.
   * Points with the same `seriesId` are grouped into a series.
   */
  data: NgeScatterDataPoint[];

  /**
   * Opt-in wheel-zoom / drag-pan gesture capture. Pair the chart's
   * `(chartGesture)` output with NgeScatterChartTransform.onChartGesture.
   */
  gestures?: NgeChartGesturesConfig;

  /** Legend configuration. Set `enabled: true` to auto-generate legend from series data. */
  legend?: Partial<NgeChartLegendConfig>;

  /**
   * Chart margin configuration
   */
  margin?: NgeChartBaseConfig['margin'];

  /**
   * Click handler for data points
   */
  onClick?: NgeScatterLayerConfig['onClick'];

  /**
   * Default radius of data points in pixels.
   * Individual points can override with their `size` property.
   */
  pointRadius?: number;

  /**
   * Opt into the full-range slider/brush axis for the X dimension. When true the
   * standard X axis is REPLACED by a full-range ruler + draggable brush that zooms
   * the plot along X. Its `fullDomain` is the data-driven extent (it ignores any
   * `xDomain` focus/zoom override), so the slider always spans the full data.
   */
  rangeAxisX?: boolean;

  /**
   * Opt into the full-range slider/brush axis for the Y dimension. When true the
   * standard Y axis is REPLACED by a full-range ruler + draggable brush that zooms
   * the plot along Y. Its `fullDomain` is the data-driven extent (it ignores any
   * `yDomain` focus/zoom override), so the slider always spans the full data.
   */
  rangeAxisY?: boolean;

  /**
   * Color palette for multi-series charts
   */
  seriesColors?: string[];

  /**
   * Show X axis
   */
  showXAxis?: boolean;

  /**
   * Show vertical gridlines at the X axis tick positions
   * @default false
   */
  showXGrid?: boolean;

  /**
   * Show Y axis
   */
  showYAxis?: boolean;

  /**
   * Show horizontal gridlines at the Y axis tick positions
   * @default false
   */
  showYGrid?: boolean;

  /**
   * Tooltip configuration. Use `{ enabled: true }` for default tooltip,
   * or provide custom options.
   */
  tooltip?: ScatterChartTooltipOptions;

  /**
   * X axis label
   */
  xAxisLabel?: string;

  /**
   * Number of ticks to display on the X axis.
   * Only applies to linear/time scales.
   * @default undefined (D3 auto-calculates)
   */
  xAxisTicks?: number;

  /**
   * Explicit X domain `[min, max]`. When set, replaces the data-driven domain
   * (and `xDomainPadding`) — the axis-zoom hook used by NgeScatterChartTransform.
   */
  xDomain?: [number, number];

  /**
   * Padding factor for X domain (adds margin on each side)
   * @default 0.05 (5%)
   */
  xDomainPadding?: number;

  /**
   * Y axis label
   */
  yAxisLabel?: string;

  /**
   * Number of ticks to display on the Y axis.
   * Only applies to linear scales.
   * @default undefined (D3 auto-calculates)
   */
  yAxisTicks?: number;

  /**
   * Explicit Y domain `[min, max]`. When set, replaces the data-driven domain
   * (and `yDomainPadding`/`yStartAtZero`) — the axis-zoom hook used by
   * NgeScatterChartTransform.
   */
  yDomain?: [number, number];

  /**
   * Padding factor for Y domain (adds margin on top)
   * @default 0.1 (10%)
   */
  yDomainPadding?: number;

  /**
   * Whether to start Y axis at zero
   * @default false (auto-fit to data range)
   */
  yStartAtZero?: boolean;
}

/**
 * Default content formatter for scatter data points.
 * Prefixes the series name when a point belongs to a named series.
 */
function defaultScatterTooltipFormatter(data: NgeScatterDataPoint): NgeTooltipContent {
  const seriesLabel = data.seriesId ? `${data.seriesId} · ` : '';

  return {
    extra: { seriesId: data.seriesId },
    label: `${seriesLabel}x: ${data.x.toFixed(1)}`,
    value: data.y,
  };
}

/**
 * The scatter chart's data-driven X extent `[min, max]` — the min/max of the
 * points' x values, each side expanded by `padding` × the span (falling back to
 * a span of 1 for a single distinct value), or `[0, 1]` when there are no points.
 *
 * Exported because two consumers must agree on it: the scale factory's default
 * X domain AND the range-axis `fullDomain`. Sharing one function guarantees the
 * full-range slider spans exactly the data even while the plot is zoomed into a
 * subrange via an explicit `xDomain`.
 */
export function computeScatterXDataDomain(
  points: NgeScatterDataPoint[],
  padding: number
): [number, number] {
  if (points.length === 0) {
    return [0, 1];
  }

  const xValues = points.map(p => p.x);
  const minX = Math.min(...xValues);
  const maxX = Math.max(...xValues);
  const xPadding = (maxX - minX || 1) * padding;

  return [minX - xPadding, maxX + xPadding];
}

/**
 * The scatter chart's data-driven Y extent `[min, max]`. Mirrors
 * {@link computeScatterXDataDomain} but honours `startAtZero`: when set, the
 * lower bound is pinned to 0 with no bottom padding (for count/magnitude axes
 * that must read from zero). Returns `[0, 1]` when there are no points.
 *
 * Shared by the scale factory's default Y domain and the range-axis `fullDomain`
 * so the full-range slider matches the plotted data.
 */
export function computeScatterYDataDomain(
  points: NgeScatterDataPoint[],
  padding: number,
  startAtZero: boolean
): [number, number] {
  if (points.length === 0) {
    return [0, 1];
  }

  const yValues = points.map(p => p.y);
  const rawMinY = Math.min(...yValues);
  const rawMaxY = Math.max(...yValues);
  const minY = startAtZero ? 0 : rawMinY;
  const yPadding = (rawMaxY - minY || 1) * padding;

  return [startAtZero ? 0 : minY - yPadding, rawMaxY + yPadding];
}

/**
 * Creates scales for scatter chart visualization.
 * Both X and Y are linear numeric scales.
 * An explicit `xDomain`/`yDomain` is used verbatim (axis zoom); otherwise the
 * domain is the data-driven extent (see {@link computeScatterXDataDomain} /
 * {@link computeScatterYDataDomain}).
 */
function createScatterChartScalesFactory(
  options: Pick<
    ScatterChartPresetOptions,
    'xDomain' | 'xDomainPadding' | 'yDomain' | 'yDomainPadding' | 'yStartAtZero'
  >
): NgeChartScaleFactory {
  const {
    xDomain,
    xDomainPadding = 0.05,
    yDomain,
    yDomainPadding = 0.1,
    yStartAtZero = false,
  } = options;

  return (config: NgeChartConfig, dimensions: NgeChartDimensions): NgeChartScales => {
    // Collect all data points from scatter layers
    const allPoints: NgeScatterDataPoint[] = [];

    for (const layer of config.layers.flat()) {
      if (layer.type === 'scatter') {
        const scatterLayer = layer as NgeScatterLayerConfig;
        allPoints.push(...scatterLayer.data);
      }
    }

    // Explicit domain wins (axis zoom); else the shared data-driven extent
    const xExtent = xDomain ?? computeScatterXDataDomain(allPoints, xDomainPadding);
    const yExtent = yDomain ?? computeScatterYDataDomain(allPoints, yDomainPadding, yStartAtZero);

    return {
      x: scaleLinear().domain(xExtent).range([0, dimensions.boundedWidth]),
      y: scaleLinear().domain(yExtent).range([dimensions.boundedHeight, 0]),
    };
  };
}

/**
 * Create a standard scatter chart configuration.
 *
 * @example
 * // Basic scatter plot
 * const config = createScatterChartConfig({
 *   data: [
 *     { x: 10, y: 20 },
 *     { x: 15, y: 35 },
 *     { x: 25, y: 15 },
 *   ],
 *   tooltip: { enabled: true },
 * });
 *
 * @example
 * // With custom colors and sizes
 * const config = createScatterChartConfig({
 *   data: [
 *     { x: 10, y: 20, color: '#ff0000', size: 8 },
 *     { x: 15, y: 35, color: '#00ff00', size: 12 },
 *     { x: 25, y: 15, color: '#0000ff', size: 6 },
 *   ],
 *   pointRadius: 5, // default size
 *   tooltip: { enabled: true },
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createScatterChartConfig(options: ScatterChartPresetOptions): NgeChartConfig {
  const {
    animationMs,
    data,
    gestures,
    legend,
    margin,
    onClick,
    pointRadius,
    rangeAxisX,
    rangeAxisY,
    seriesColors,
    showXAxis = true,
    showXGrid = false,
    showYAxis = true,
    showYGrid = false,
    tooltip,
    xAxisLabel,
    xAxisTicks,
    xDomain,
    xDomainPadding,
    yAxisLabel,
    yAxisTicks,
    yDomain,
    yDomainPadding,
    yStartAtZero,
  } = options;

  // Build tooltip config if enabled
  const tooltipConfig = tooltip?.enabled
    ? {
        enabled: true,
        formatContent: tooltip.formatContent ?? defaultScatterTooltipFormatter,
        height: tooltip.height ?? 65,
        position: tooltip.position ?? 'follow-mouse',
        style: tooltip.style,
        width: tooltip.width ?? 120,
      }
    : undefined;

  // Build legend config if enabled
  const legendConfig = legend?.enabled
    ? {
        enabled: true,
        interactive: legend.interactive ?? false,
        items: legend.items ?? extractScatterChartLegendItems(data, seriesColors),
        position: legend.position ?? 'bottom',
        // Scatter marks are circles — match the swatch by default
        swatchShape: legend.swatchShape ?? ('circle' as const),
      }
    : undefined;

  return {
    base: {
      margin,
      showXAxis,
      showXGrid,
      showYAxis,
      showYGrid,
      xAxisLabel,
      xAxisTicks,
      // fullDomain spans the WHOLE data (ignores any xDomain focus/zoom), so the
      // slider stays full-width even while the plot is zoomed into a subrange.
      xRangeAxis: rangeAxisX
        ? { fullDomain: computeScatterXDataDomain(data, xDomainPadding ?? 0.05) }
        : undefined,
      yAxisLabel,
      yAxisTicks,
      yRangeAxis: rangeAxisY
        ? {
            fullDomain: computeScatterYDataDomain(
              data,
              yDomainPadding ?? 0.1,
              yStartAtZero ?? false
            ),
          }
        : undefined,
    },
    gestures,
    layers: [
      {
        animationMs,
        data,
        onClick,
        pointRadius,
        renderer: renderScatterLayer,
        seriesColors,
        tooltip: tooltipConfig,
        type: 'scatter',
      },
    ],
    legend: legendConfig as NgeChartLegendConfig | undefined,
    scaleFactory: createScatterChartScalesFactory({
      xDomain,
      xDomainPadding,
      yDomain,
      yDomainPadding,
      yStartAtZero,
    }),
  };
}
