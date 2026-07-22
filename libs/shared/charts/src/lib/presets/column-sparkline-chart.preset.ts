import type { NgeChartConfig } from '../core/config';
import type { BarChartPresetOptions } from './bar-chart.preset';

import { createBarChartConfig } from './bar-chart.preset';

/**
 * Compact column-sparkline margin — a few pixels so the columns fill the cell
 * almost edge-to-edge (a sparkline lives inline, not in a full chart frame).
 */
const DEFAULT_COLUMN_SPARKLINE_MARGIN = { bottom: 2, left: 2, right: 2, top: 2 };

/** Tight inter-column gap so a dense series still reads as a continuous mini-histogram. */
const DEFAULT_COLUMN_SPARKLINE_BAR_PADDING = 0.1;

/**
 * Options for the column-sparkline preset — identical to {@link BarChartPresetOptions}.
 *
 * The preset only re-defaults a handful of bar-layer options for a compact inline
 * read; it adds no options of its own, so every bar option (data, tooltip, bar
 * radius, orientation, axes, legend…) applies here unchanged.
 */
export type ColumnSparklineChartPresetOptions = BarChartPresetOptions;

/**
 * Compact, axis-less **column sparkline** — a dense mini-histogram of a single
 * measure over an ordered sequence, meant to sit inline next to a number rather
 * than in a full chart frame. Tight margins, no value labels, a small inter-column
 * gap, and vertical columns by default.
 *
 * This is a thin preset — it introduces no new layer `type`, config-union entry, or
 * theme slice. It applies compact defaults over {@link createBarChartConfig}; every
 * default is overridable and all other bar options pass through untouched.
 *
 * @example
 * const config = createColumnSparklineChartConfig({
 *   data: [
 *     { label: 'Mon', value: 12 },
 *     { label: 'Tue', value: 18 },
 *     { label: 'Wed', value: 9 },
 *     { label: 'Thu', value: 15 },
 *     { label: 'Fri', value: 21 },
 *   ],
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createColumnSparklineChartConfig(
  options: ColumnSparklineChartPresetOptions
): NgeChartConfig {
  const {
    barPadding = DEFAULT_COLUMN_SPARKLINE_BAR_PADDING,
    margin = DEFAULT_COLUMN_SPARKLINE_MARGIN,
    orientation = 'vertical',
    showLabels = false,
    ...rest
  } = options;

  return createBarChartConfig({
    ...rest,
    barPadding,
    margin,
    orientation,
    showLabels,
  });
}
