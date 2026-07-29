import type {
  NgeAreaDataPoint,
  NgeBumpDataPoint,
  NgeGraph,
  NgeGroupedBarDataPoint,
  NgeHierarchyDatum,
  NgeLineDataPoint,
  NgePieDataPoint,
  NgeScatterDataPoint,
  NgeStackedBarDataPoint,
} from '../config/nge-chart-config.models';
import type { NgeLegendItem } from './nge-chart-legend.models';

import { deriveGraphNodes } from '../fns';
import {
  DEFAULT_AREA_LAYER_THEME,
  DEFAULT_BAR_LAYER_THEME,
  DEFAULT_BUMP_LAYER_THEME,
  DEFAULT_CHORD_LAYER_THEME,
  DEFAULT_LINE_LAYER_THEME,
  DEFAULT_PIE_LAYER_THEME,
  DEFAULT_SCATTER_LAYER_THEME,
  DEFAULT_STACKED_BAR_LAYER_THEME,
  DEFAULT_SUNBURST_LAYER_THEME,
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
        'var(--nge-chart-tertiary)',
      label: 'Mean',
    });
  }

  if (options.showMedianLine) {
    items.push({
      color:
        options.medianLineColor ??
        DEFAULT_BAR_LAYER_THEME.statistical.medianLineColor ??
        'var(--nge-chart-secondary)',
      label: 'Median',
    });
  }

  return items;
}

/**
 * Extract legend items from area chart multi-series data.
 * Returns one item per unique seriesId, using colors from seriesColors or theme defaults.
 * Returns empty array for single-series data (no seriesId).
 */
export function extractAreaChartLegendItems(
  data: NgeAreaDataPoint[],
  seriesColors?: string[],
  themeColors?: string[]
): NgeLegendItem[] {
  const fallbackColors = DEFAULT_AREA_LAYER_THEME.fill.colors ?? [];
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

  // Cycle seriesColors WITH modulo so the legend matches the renderer's
  // `palette[i % palette.length]` (seriesColorFor) when seriesColors is shorter
  // than the series count.
  return uniqueSeries.map((seriesId, i) => ({
    color:
      seriesColors?.[i % seriesColors.length] ??
      colors[i % colors.length] ??
      'var(--nge-chart-primary)',
    label: seriesId,
  }));
}

/**
 * Extract legend items from stacked-bar multi-series data.
 * Returns one item per unique seriesId (in first-seen order), using colors from
 * seriesColors or theme defaults. Every stacked-bar point carries a seriesId, so
 * this always yields one item per stack series.
 */
export function extractStackedBarChartLegendItems(
  data: NgeStackedBarDataPoint[],
  seriesColors?: string[],
  themeColors?: string[]
): NgeLegendItem[] {
  const fallbackColors = DEFAULT_STACKED_BAR_LAYER_THEME.bar.colors ?? [];
  const colors = themeColors ?? fallbackColors;
  const uniqueSeries: string[] = [];

  for (const d of data) {
    if (!uniqueSeries.includes(d.seriesId)) {
      uniqueSeries.push(d.seriesId);
    }
  }

  // Cycle seriesColors WITH modulo so the legend matches the renderer's
  // `palette[i % palette.length]` when seriesColors is shorter than the series count.
  return uniqueSeries.map((seriesId, i) => ({
    color:
      seriesColors?.[i % seriesColors.length] ??
      colors[i % colors.length] ??
      'var(--nge-chart-primary)',
    label: seriesId,
  }));
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
    color: seriesColors?.[i] ?? colors[i % colors.length] ?? 'var(--nge-chart-primary)',
    label: seriesId,
  }));
}

/**
 * Extract legend items from bump chart data — one item per unique `seriesId` (in
 * first-seen order), coloured from seriesColors or theme defaults. Cycles the palette
 * WITH modulo so the legend matches the renderer's `palette[i % palette.length]`. An
 * empty `seriesColors` is treated the same as unset (falls through to the theme palette)
 * — matching the renderer, so lines + swatches always agree. Every bump point carries a
 * seriesId, so this yields one item per series.
 */
export function extractBumpChartLegendItems(
  data: NgeBumpDataPoint[],
  seriesColors?: string[],
  themeColors?: string[]
): NgeLegendItem[] {
  const fallbackColors = DEFAULT_BUMP_LAYER_THEME.line.colors ?? [];
  const themePalette = themeColors ?? fallbackColors;
  // An empty seriesColors is the same as unset — cycle the theme palette.
  const palette = seriesColors?.length ? seriesColors : themePalette;
  const uniqueSeries: string[] = [];

  for (const d of data) {
    if (!uniqueSeries.includes(d.seriesId)) {
      uniqueSeries.push(d.seriesId);
    }
  }

  if (uniqueSeries.length === 0) {
    return [];
  }

  return uniqueSeries.map((seriesId, i) => ({
    color: palette[i % palette.length] ?? 'var(--nge-chart-primary)',
    id: seriesId,
    label: seriesId,
  }));
}

/**
 * Extract legend items from pie chart data — one item per unique `label` (in first-seen
 * order), coloured to match the renderer. A per-slice `color` override wins; otherwise
 * the palette cycles WITH modulo (`palette[i % length]`) exactly like the renderer's
 * `palette[d.index % length]`, so swatches and slices always agree. An empty
 * `seriesColors` is treated the same as unset (falls through to the theme palette).
 * Every pie point carries a label, so this always yields one item per unique slice.
 *
 * Each item also carries its slice's `value`. That is data, not presentation — the legend
 * renders it only under `showValues`, so populating it here leaves every existing pie legend
 * looking exactly as it did.
 */
export function extractPieChartLegendItems(
  data: NgePieDataPoint[],
  seriesColors?: string[],
  themeColors?: string[]
): NgeLegendItem[] {
  const fallbackColors = DEFAULT_PIE_LAYER_THEME.slice.colors ?? [];
  // An empty seriesColors is the same as unset — cycle the theme palette.
  const palette = seriesColors?.length ? seriesColors : (themeColors ?? fallbackColors);
  const seen = new Set<string>();
  const uniqueSlices: NgePieDataPoint[] = [];

  for (const d of data) {
    if (!seen.has(d.label)) {
      seen.add(d.label);
      uniqueSlices.push(d);
    }
  }

  return uniqueSlices.map((d, i) => ({
    color: d.color ?? palette[i % palette.length] ?? 'var(--nge-chart-primary)',
    id: d.label,
    label: d.label,
    value: d.value,
  }));
}

/**
 * Extract legend items from sunburst hierarchy data — one item per TOP-LEVEL branch (in
 * first-seen order), coloured to match the renderer. A per-branch `color` override wins;
 * otherwise the palette cycles WITH modulo (`palette[i % length]`) exactly like the renderer
 * colours by top-level branch index, so swatches and branches always agree. An empty
 * `seriesColors` is treated the same as unset (falls through to the theme palette).
 * Descendants inherit their branch colour, so the legend covers the top level only.
 */
export function extractSunburstChartLegendItems(
  data: NgeHierarchyDatum[],
  seriesColors?: string[],
  themeColors?: string[]
): NgeLegendItem[] {
  const fallbackColors = DEFAULT_SUNBURST_LAYER_THEME.segment.colors ?? [];
  // An empty seriesColors is the same as unset — cycle the theme palette.
  const palette = seriesColors?.length ? seriesColors : (themeColors ?? fallbackColors);
  const seen = new Set<string>();
  const uniqueBranches: NgeHierarchyDatum[] = [];

  for (const d of data) {
    if (!seen.has(d.label)) {
      seen.add(d.label);
      uniqueBranches.push(d);
    }
  }

  return uniqueBranches.map((d, i) => ({
    color: d.color ?? palette[i % palette.length] ?? 'var(--nge-chart-primary)',
    id: d.label,
    label: d.label,
  }));
}

/**
 * Extract legend items from scatter chart multi-series data.
 * Returns one item per unique seriesId, using colors from seriesColors or theme defaults.
 * Returns empty array for single-series data (no seriesId).
 */
export function extractScatterChartLegendItems(
  data: NgeScatterDataPoint[],
  seriesColors?: string[],
  themeColors?: string[]
): NgeLegendItem[] {
  const fallbackColors = DEFAULT_SCATTER_LAYER_THEME.point.colors ?? [];
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

  // Cycle seriesColors WITH modulo so the legend matches the renderer's
  // `palette[i % palette.length]` when seriesColors is shorter than the series count.
  return uniqueSeries.map((seriesId, i) => ({
    color:
      seriesColors?.[i % seriesColors.length] ??
      colors[i % colors.length] ??
      'var(--nge-chart-primary)',
    id: seriesId,
    label: seriesId,
  }));
}

/**
 * Extract legend items from a chord/arc relationship graph — one item per node, ordered
 * however {@link deriveGraphNodes} resolves the graph's categorical set (explicit
 * `data.nodes`, else link endpoints in first-seen order — the SAME resolution the chord
 * renderer uses, from the same shared function, so the two can never disagree on order),
 * coloured to match the renderer. A per-node `color` override wins; otherwise the palette
 * cycles WITH modulo (`palette[i % length]`) exactly like the renderer's
 * `palette[i % palette.length]`, so swatches and arcs/circles always agree. An empty
 * `seriesColors` is treated the same as unset (falls through to the theme palette).
 *
 * Carries no `value` — a node's magnitude is the SUMMED flow the chord layout computes
 * from its links, not a field supplied on the input datum, so populating it here would
 * read `undefined` for the common case (no explicit `nodes`) and stale for the rest.
 */
export function extractChordChartLegendItems(
  data: NgeGraph,
  seriesColors?: string[],
  themeColors?: string[]
): NgeLegendItem[] {
  const fallbackColors = DEFAULT_CHORD_LAYER_THEME.node.colors ?? [];
  // An empty seriesColors is the same as unset — cycle the theme palette.
  const palette = seriesColors?.length ? seriesColors : (themeColors ?? fallbackColors);

  return deriveGraphNodes(data).map((node, i) => ({
    color: node.color ?? palette[i % palette.length] ?? 'var(--nge-chart-primary)',
    id: node.id,
    label: node.label ?? node.id,
  }));
}
