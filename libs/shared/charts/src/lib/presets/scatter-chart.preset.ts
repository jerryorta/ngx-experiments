import { scaleLinear } from 'd3-scale';

import type { NgeChartBaseConfig, NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeChartScaleFactory,
  NgeScatterDataPoint,
  NgeScatterLayerConfig,
} from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent, NgeTooltipStyle } from '../core/tooltip';

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
   * Data points. Each point needs numeric x and y coordinates.
   * Optional color and size can be specified per point.
   */
  data: NgeScatterDataPoint[];

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
   * Show X axis
   */
  showXAxis?: boolean;

  /**
   * Show Y axis
   */
  showYAxis?: boolean;

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
 * Default content formatter for scatter data points
 */
function defaultScatterTooltipFormatter(data: NgeScatterDataPoint): NgeTooltipContent {
  return {
    label: `x: ${data.x.toFixed(1)}`,
    value: data.y,
  };
}

/**
 * Creates scales for scatter chart visualization.
 * Both X and Y are linear numeric scales.
 */
function createScatterChartScalesFactory(
  options: Pick<ScatterChartPresetOptions, 'xDomainPadding' | 'yDomainPadding' | 'yStartAtZero'>
): NgeChartScaleFactory {
  const { xDomainPadding = 0.05, yDomainPadding = 0.1, yStartAtZero = false } = options;

  return (config: NgeChartConfig, dimensions: NgeChartDimensions): NgeChartScales => {
    // Collect all data points from scatter layers
    const allPoints: NgeScatterDataPoint[] = [];

    for (const layer of config.layers.flat()) {
      if (layer.type === 'scatter') {
        const scatterLayer = layer as NgeScatterLayerConfig;
        allPoints.push(...scatterLayer.data);
      }
    }

    if (allPoints.length === 0) {
      // Return default scales if no data
      return {
        x: scaleLinear().domain([0, 1]).range([0, dimensions.boundedWidth]),
        y: scaleLinear().domain([0, 1]).range([dimensions.boundedHeight, 0]),
      };
    }

    // Calculate X domain with padding
    const xValues = allPoints.map(p => p.x);
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const xRange = maxX - minX || 1;
    const xPadding = xRange * xDomainPadding;

    // Calculate Y domain with padding
    const yValues = allPoints.map(p => p.y);
    const rawMinY = Math.min(...yValues);
    const rawMaxY = Math.max(...yValues);
    const minY = yStartAtZero ? 0 : rawMinY;
    const yRange = rawMaxY - minY || 1;
    const yPadding = yRange * yDomainPadding;

    return {
      x: scaleLinear()
        .domain([minX - xPadding, maxX + xPadding])
        .range([0, dimensions.boundedWidth]),
      y: scaleLinear()
        .domain([minY - (yStartAtZero ? 0 : yPadding), rawMaxY + yPadding])
        .range([dimensions.boundedHeight, 0]),
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
    data,
    margin,
    onClick,
    pointRadius,
    showXAxis = true,
    showYAxis = true,
    tooltip,
    xAxisLabel,
    xAxisTicks,
    xDomainPadding,
    yAxisLabel,
    yAxisTicks,
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

  return {
    base: {
      margin,
      showXAxis,
      showYAxis,
      xAxisLabel,
      xAxisTicks,
      yAxisLabel,
      yAxisTicks,
    },
    layers: [
      {
        data,
        onClick,
        pointRadius,
        renderer: renderScatterLayer,
        tooltip: tooltipConfig,
        type: 'scatter',
      },
    ],
    scaleFactory: createScatterChartScalesFactory({
      xDomainPadding,
      yDomainPadding,
      yStartAtZero,
    }),
  };
}
