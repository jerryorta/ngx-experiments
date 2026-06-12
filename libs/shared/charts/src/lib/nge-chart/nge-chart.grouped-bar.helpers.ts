import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeChartConfig, NgeGroupedBarDataPoint, NgeGroupedBarLayerConfig } from '../core/config';

/**
 * Options for creating grouped bar chart scales
 */
export interface CreateGroupedBarChartScalesOptions {
  /**
   * Padding between category groups (0-1)
   * @default 0.2
   */
  groupPadding?: number;

  /**
   * Multiplier for max value to add headroom
   * @default 1.1
   */
  valueHeadroom?: number;
}

const DEFAULT_OPTIONS: Required<CreateGroupedBarChartScalesOptions> = {
  groupPadding: 0.2,
  valueHeadroom: 1.1,
};

/**
 * Creates scales for grouped bar chart visualization.
 *
 * The outer scaleBand uses unique `label` values as categories on the axis
 * (e.g., "Avg $/sqft", "Min", "Max"). The inner scaleBand (computed in the
 * renderer) uses `groupId` values as series within each category
 * (e.g., "Active", "Closed").
 */
export function createGroupedBarChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions,
  options?: CreateGroupedBarChartScalesOptions
): NgeChartScales {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Collect unique labels (categories) and all values
  const allLabels: string[] = [];
  const allValues: number[] = [];

  for (const layer of config.layers.flat()) {
    if (layer.type === 'grouped-bar') {
      for (const d of layer.data as NgeGroupedBarDataPoint[]) {
        if (!allLabels.includes(d.label)) {
          allLabels.push(d.label);
        }
        allValues.push(d.value);
      }
    }
  }

  const maxValue = Math.max(...allValues, 0);
  const minValue = Math.min(...allValues, 0);

  // Determine orientation from first grouped-bar layer
  const groupedBarLayer = config.layers.flat().find(l => l.type === 'grouped-bar') as NgeGroupedBarLayerConfig | undefined;
  const isVertical = !groupedBarLayer || groupedBarLayer.orientation !== 'horizontal';

  const groupPadding = groupedBarLayer?.groupPadding ?? opts.groupPadding;

  const valueDomainMax = maxValue > 0 ? maxValue * opts.valueHeadroom : 0;
  const valueDomainMin = minValue < 0 ? minValue * opts.valueHeadroom : 0;

  // Outer scale uses labels as categories
  const xScale = isVertical
    ? scaleBand<string>().domain(allLabels).range([0, dimensions.boundedWidth]).padding(groupPadding)
    : scaleLinear()
        .domain([valueDomainMin, valueDomainMax])
        .range([0, dimensions.boundedWidth]);

  const yScale = isVertical
    ? scaleLinear()
        .domain([valueDomainMin, valueDomainMax])
        .range([dimensions.boundedHeight, 0])
    : scaleBand<string>().domain(allLabels).range([0, dimensions.boundedHeight]).padding(groupPadding);

  return { x: xScale, y: yScale };
}
