import { scaleLinear, scalePoint, scaleTime } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeChartConfig, NgeLineDataPoint, NgeLineLayerConfig } from '../core/config';

/**
 * Options for creating line chart scales
 */
export interface CreateLineChartScalesOptions {
  /**
   * Padding between band scale items (0-1)
   * @default 0.1
   */
  bandPadding?: number;

  /**
   * Multiplier for max y value to add headroom
   * @default 1.1
   */
  valueHeadroom?: number;

  /**
   * Whether to start y-axis at zero
   * @default true
   */
  yStartAtZero?: boolean;
}

/**
 * Default options for line chart scales
 */
const DEFAULT_OPTIONS: Required<CreateLineChartScalesOptions> = {
  bandPadding: 0.1,
  valueHeadroom: 1.1,
  yStartAtZero: true,
};

/**
 * Creates scales for line chart visualization.
 *
 * This is a pure function that extracts data from line layers
 * and creates appropriate D3 scales based on x value type:
 * - String x values → Band scale
 * - Number x values → Linear scale
 * - Date x values → Time scale
 *
 * @param config - The chart configuration containing layers
 * @param dimensions - The bounded dimensions for the chart area
 * @param options - Optional scale creation options
 * @returns Scales object with x and y scales
 */
export function createLineChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions,
  options?: CreateLineChartScalesOptions
): NgeChartScales {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Collect all data points from line layers
  const allPoints: NgeLineDataPoint[] = [];

  for (const layer of config.layers.flat()) {
    if (layer.type === 'line') {
      const lineLayer = layer as NgeLineLayerConfig;
      allPoints.push(...lineLayer.data);
    }
  }

  if (allPoints.length === 0) {
    // Return default scales if no data
    return {
      x: scalePoint<string>().domain([]).range([0, dimensions.boundedWidth]),
      y: scaleLinear().domain([0, 1]).range([dimensions.boundedHeight, 0]),
    };
  }

  // Determine x-value type from first point
  const firstX = allPoints[0].x;
  const xType = firstX instanceof Date ? 'time' : typeof firstX === 'number' ? 'number' : 'string';

  // Extract unique x values and all y values
  const xValues: (Date | number | string)[] = [];
  const yValues: number[] = [];

  for (const point of allPoints) {
    yValues.push(point.y);

    // Collect unique x values
    const xVal = point.x;
    if (xType === 'string') {
      const strVal = String(xVal);
      if (!xValues.includes(strVal)) {
        xValues.push(strVal);
      }
    } else if (xType === 'number') {
      const numVal = xVal as number;
      if (!xValues.includes(numVal)) {
        xValues.push(numVal);
      }
    } else {
      // Date - add all for min/max calculation
      xValues.push(xVal as Date);
    }
  }

  // Calculate y domain
  const minY = opts.yStartAtZero ? 0 : Math.min(...yValues);
  const maxY = Math.max(...yValues) * opts.valueHeadroom;

  // Create y scale (always linear for line charts)
  const yScale = scaleLinear().domain([minY, maxY]).range([dimensions.boundedHeight, 0]);

  // Create x scale based on type
  let xScale: NgeChartScales['x'];

  if (xType === 'string') {
    // Categorical x-axis with point scale (extends edge-to-edge)
    xScale = scalePoint<string>()
      .domain(xValues as string[])
      .range([0, dimensions.boundedWidth])
      .padding(0);
  } else if (xType === 'number') {
    // Numeric x-axis with linear scale
    const numValues = xValues as number[];
    const minX = Math.min(...numValues);
    const maxX = Math.max(...numValues);
    xScale = scaleLinear().domain([minX, maxX]).range([0, dimensions.boundedWidth]);
  } else {
    // Time x-axis with time scale
    const dateValues = xValues as Date[];
    const minDate = new Date(Math.min(...dateValues.map(d => d.getTime())));
    const maxDate = new Date(Math.max(...dateValues.map(d => d.getTime())));
    xScale = scaleTime().domain([minDate, maxDate]).range([0, dimensions.boundedWidth]);
  }

  return { x: xScale, y: yScale };
}
