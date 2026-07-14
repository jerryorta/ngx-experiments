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
   * Explicit X domain — continuous zoom override for LINEAR / TIME x only
   * (epoch ms for time). Ignored for categorical/point x (band-window zoom is a
   * separate mechanism). When set, replaces the data-driven x extent.
   */
  xDomain?: [number, number];

  /**
   * Explicit Y domain `[min, max]` — continuous zoom override. When set,
   * replaces the data-driven y extent (and `yStartAtZero`).
   */
  yDomain?: [number, number];

  /**
   * Whether to start y-axis at zero
   * @default true
   */
  yStartAtZero?: boolean;
}

/**
 * Default options for line chart scales
 */
const DEFAULT_OPTIONS: Required<Omit<CreateLineChartScalesOptions, 'xDomain' | 'yDomain'>> = {
  bandPadding: 0.1,
  valueHeadroom: 1.1,
  yStartAtZero: true,
};

/**
 * The line chart's data-driven CONTINUOUS x extent `[min, max]` as numbers
 * (epoch ms for `Date` x), or `null` when x is categorical (string) — a point
 * scale has no continuous extent and windows by category instead.
 *
 * Exported because two consumers must agree on it: `createLineChartScales`'
 * default linear/time x domain AND `NgeLineChartTransform`'s zoom/pan clamp
 * bound, so the gesture floor is exactly the un-zoomed view.
 */
export function computeLineXDataDomain(points: NgeLineDataPoint[]): [number, number] | null {
  if (points.length === 0 || typeof points[0].x === 'string') {
    return null;
  }

  const xNumbers = points.map(point =>
    point.x instanceof Date ? point.x.getTime() : (point.x as number)
  );

  return [Math.min(...xNumbers), Math.max(...xNumbers)];
}

/**
 * The line chart's data-driven y extent `[min, max]`, honouring `startAtZero`
 * (pins the floor to 0) and `headroom` (multiplies the max for top padding) —
 * the same defaults `createLineChartScales` applies. Returns `[0, 1]` when there
 * are no points. Shared by the scale factory's default y domain and the
 * transform's zoom/pan clamp bound.
 */
export function computeLineYDataDomain(
  points: NgeLineDataPoint[],
  startAtZero = true,
  headroom = 1.1
): [number, number] {
  if (points.length === 0) {
    return [0, 1];
  }

  const yValues = points.map(point => point.y);
  const minY = startAtZero ? 0 : Math.min(...yValues);

  return [minY, Math.max(...yValues) * headroom];
}

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

  // Extract unique x values (the categorical/point-scale domain; continuous x
  // derives its extent from computeLineXDataDomain below).
  const xValues: (Date | number | string)[] = [];

  for (const point of allPoints) {
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

  // Calculate y domain (an explicit yDomain override wins — continuous zoom)
  const yScaleDomain =
    opts.yDomain ?? computeLineYDataDomain(allPoints, opts.yStartAtZero, opts.valueHeadroom);

  // Create y scale (always linear for line charts)
  const yScale = scaleLinear().domain(yScaleDomain).range([dimensions.boundedHeight, 0]);

  // Create x scale based on type
  let xScale: NgeChartScales['x'];

  if (xType === 'string') {
    // Categorical x-axis with point scale (extends edge-to-edge)
    xScale = scalePoint<string>()
      .domain(xValues as string[])
      .range([0, dimensions.boundedWidth])
      .padding(0);
  } else {
    // Continuous x (linear or time). The data-driven extent is the shared
    // computeLineXDataDomain (epoch ms for Date x); an explicit xDomain
    // (continuous zoom) wins. Time scales map the numeric domain back to Dates.
    const [xLo, xHi] = opts.xDomain ?? computeLineXDataDomain(allPoints) ?? [0, 1];
    xScale =
      xType === 'number'
        ? scaleLinear().domain([xLo, xHi]).range([0, dimensions.boundedWidth])
        : scaleTime()
            .domain([new Date(xLo), new Date(xHi)])
            .range([0, dimensions.boundedWidth]);
  }

  return { x: xScale, y: yScale };
}
