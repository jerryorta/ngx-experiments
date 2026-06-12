import type {
  NgeGroupedBarDataPoint,
  NgeLineDataPoint,
} from '../config/nge-chart-config.models';
import type { NgeLegendItem } from './nge-chart-legend.models';

import {
  DEFAULT_BAR_LAYER_THEME,
  DEFAULT_LINE_LAYER_THEME,
} from '../theme/nge-chart-theme.defaults';

/**
 * Extract legend items from grouped bar data.
 * Returns one item per unique groupId, using the first color found for each group.
 */
export function extractGroupedBarLegendItems(data: NgeGroupedBarDataPoint[]): NgeLegendItem[] {
  const seen = new Map<string, string>();

  for (const d of data) {
    if (!seen.has(d.groupId) && d.color) {
      seen.set(d.groupId, d.color);
    }
  }

  return Array.from(seen.entries()).map(([label, color]) => ({ color, label }));
}

/**
 * Extract legend items for bar chart trend lines (mean/median).
 * Returns items for each enabled statistical line with its color.
 */
export function extractBarTrendLineLegendItems(options: {
  meanLineColor?: string;
  medianLineColor?: string;
  showMeanLine?: boolean;
  showMedianLine?: boolean;
}): NgeLegendItem[] {
  const items: NgeLegendItem[] = [];

  if (options.showMeanLine) {
    items.push({
      color:
        options.meanLineColor ??
        DEFAULT_BAR_LAYER_THEME.statistical.meanLineColor ??
        'var(--chart-tertiary)',
      label: 'Mean',
    });
  }

  if (options.showMedianLine) {
    items.push({
      color:
        options.medianLineColor ??
        DEFAULT_BAR_LAYER_THEME.statistical.medianLineColor ??
        'var(--chart-secondary)',
      label: 'Median',
    });
  }

  return items;
}

/**
 * Extract legend items from line chart multi-series data.
 * Returns one item per unique seriesId, using colors from seriesColors or theme defaults.
 * Returns empty array for single-series data (no seriesId).
 */
export function extractLineChartLegendItems(
  data: NgeLineDataPoint[],
  seriesColors?: string[],
  themeColors?: string[]
): NgeLegendItem[] {
  const fallbackColors = DEFAULT_LINE_LAYER_THEME.line.colors ?? [];
  const colors = themeColors ?? fallbackColors;
  const uniqueSeries: string[] = [];

  for (const d of data) {
    if (d.seriesId && !uniqueSeries.includes(d.seriesId)) {
      uniqueSeries.push(d.seriesId);
    }
  }

  if (uniqueSeries.length === 0) {
    return [];
  }

  return uniqueSeries.map((seriesId, i) => ({
    color: seriesColors?.[i] ?? colors[i % colors.length] ?? 'var(--chart-primary)',
    label: seriesId,
  }));
}
