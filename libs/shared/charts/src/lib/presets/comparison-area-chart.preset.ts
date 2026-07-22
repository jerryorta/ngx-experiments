import type { NgeChartConfig } from '../core/config';
import type { LineChartPresetOptions } from './line-chart.preset';

import { createLineChartConfig } from './line-chart.preset';

/**
 * Low, non-occluding fill so overlaid comparison areas read as translucent bands
 * — a caller comparing two loans can still see the band underneath the one on top.
 */
const DEFAULT_COMPARISON_AREA_OPACITY = 0.15;

/**
 * Options for the comparison-area preset — identical to {@link LineChartPresetOptions}.
 *
 * The preset only re-defaults a handful of line-layer options for overlay comparisons;
 * it adds no options of its own, so every line option (data, tooltip, gestures, axes,
 * legend, series colours…) applies here unchanged.
 */
export type ComparisonAreaChartPresetOptions = LineChartPresetOptions;

/**
 * Comparison-oriented defaults over the shipped `line` layer, for comparing 2–3
 * alternatives — such as loan scenarios — as overlaid, low-opacity area fills with a
 * legend. The areas are **overlaid, NOT stacked**: competing options (loan A vs loan B)
 * don't sum to a whole, so stacking them would misrepresent the comparison.
 *
 * This is a thin preset — it introduces no new layer `type`, config-union entry, or
 * theme slice; it just applies comparison defaults over {@link createLineChartConfig}.
 * Every default here is overridable, `seriesColors` is left to fall through to the
 * theme's token-derived palette, and all other line options pass through untouched.
 *
 * @example
 * // Two loan scenarios distinguished by seriesId (overlaid, not stacked)
 * const config = createComparisonAreaChartConfig({
 *   data: [
 *     { seriesId: 'Loan A', x: 0, y: 1800 },
 *     { seriesId: 'Loan A', x: 12, y: 1750 },
 *     { seriesId: 'Loan B', x: 0, y: 1600 },
 *     { seriesId: 'Loan B', x: 12, y: 1680 },
 *   ],
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createComparisonAreaChartConfig(
  options: ComparisonAreaChartPresetOptions
): NgeChartConfig {
  const {
    areaOpacity = DEFAULT_COMPARISON_AREA_OPACITY,
    curveType = 'monotone',
    legend,
    showArea = true,
    showPoints = false,
    ...rest
  } = options;

  return createLineChartConfig({
    ...rest,
    areaOpacity,
    curveType,
    // Legend on by default so overlaid alternatives stay distinguishable; callers can
    // still override `position` or opt out with `enabled: false`.
    legend: { enabled: true, ...legend },
    showArea,
    showPoints,
  });
}
