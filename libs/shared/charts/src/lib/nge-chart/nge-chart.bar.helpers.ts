import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeBarDataPoint, NgeBarLayerConfig, NgeChartConfig } from '../core/config';

import { orderedBandCategories } from '../core/gesture';

/**
 * Options for creating bar chart scales
 */
export interface CreateBarChartScalesOptions {
  /**
   * Padding between bars (0-1)
   * @default 0.2
   */
  barPadding?: number;

  /**
   * Multiplier for max value to add headroom
   * @default 1.1
   */
  valueHeadroom?: number;
}

/**
 * Default options for bar chart scales
 */
const DEFAULT_OPTIONS: Required<CreateBarChartScalesOptions> = {
  barPadding: 0.2,
  valueHeadroom: 1.1,
};

/**
 * Creates scales for bar chart visualization.
 *
 * This is a pure function that extracts data from bar layers
 * and creates appropriate D3 scales based on orientation.
 *
 * @param config - The chart configuration containing layers
 * @param dimensions - The bounded dimensions for the chart area
 * @param options - Optional scale creation options
 * @returns Scales object with x and y scales
 */
export function createBarChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions,
  options?: CreateBarChartScalesOptions
): NgeChartScales {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Collect all bar points. When a band-window zoom is active, the consuming
  // transform passes only the VISIBLE window's data — so the band axis and the
  // value axis both derive from exactly what should be on screen (the value
  // axis auto-fits as you zoom; no off-window bars pile up at the origin).
  const barData: NgeBarDataPoint[] = [];
  for (const layer of config.layers.flat()) {
    if (layer.type === 'bar') {
      barData.push(...(layer.data as NgeBarDataPoint[]));
    }
  }

  const allLabels = orderedBandCategories(barData, d => d.label);
  const allValues = barData.map(d => d.value);

  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);

  // Determine orientation from first bar layer (if any)
  const barLayer = config.layers.flat().find(l => l.type === 'bar') as
    | NgeBarLayerConfig
    | undefined;
  const isVertical = !barLayer || barLayer.orientation !== 'horizontal';

  // Use layer-specific padding if provided, otherwise use options
  const barPadding = barLayer?.barPadding ?? opts.barPadding;

  // Calculate domain for value scale, including negative values
  // Apply headroom symmetrically to both min and max
  const valueDomainMax = maxValue > 0 ? maxValue * opts.valueHeadroom : 0;
  const valueDomainMin = minValue < 0 ? minValue * opts.valueHeadroom : 0;

  // Create scales based on orientation
  const xScale = isVertical
    ? scaleBand<string>().domain(allLabels).range([0, dimensions.boundedWidth]).padding(barPadding)
    : scaleLinear().domain([valueDomainMin, valueDomainMax]).range([0, dimensions.boundedWidth]);

  const yScale = isVertical
    ? scaleLinear().domain([valueDomainMin, valueDomainMax]).range([dimensions.boundedHeight, 0])
    : scaleBand<string>()
        .domain(allLabels)
        .range([0, dimensions.boundedHeight])
        .padding(barPadding);

  return { x: xScale, y: yScale };
}
