import type {
  NgeChartConfig,
  NgeGroupedBarDataPoint,
  NgePieDataPoint,
  NgeStackedBarDataPoint,
} from '../../../core/config';

// Import the pie preset DIRECTLY (not via the `../../../presets` barrel): this file
// is unit-tested, and the full barrel transitively pulls layer renderers that import
// the umbrella `d3` ESM package, which Jest cannot transform in the spec context.
import { createPieChartConfig } from '../../../presets/pie-chart.preset';

/**
 * Business purpose: the DATA + DERIVATION half of the ARCH-228 "chart-in-tooltip"
 * capability demo. It models what a real consumer does — own the source data and
 * map a hovered column to a nested pie/donut config — WITHOUT adding any surface
 * to `libs/shared/charts`. Everything here is pure so it is unit-testable and so
 * the per-column configs are built ONCE (stable object references → the nested D3
 * chart never re-renders while the pointer moves within a column).
 */

/** Stack-series palette, shared by the stacked bars (via `seriesColors`) and the
 * donut slices (via {@link colorBySeries}) so a slice maps visually to its bar
 * segment. Index = first-seen series order in {@link STACKED_DATA}. */
export const STACK_COLORS = ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA'] as const;

/** Within-group palette, shared by the grouped bars and the pie slices. */
export const GROUP_COLORS = ['#1E88E5', '#43A047', '#FB8C00'] as const;

const STACK_SERIES = ['Rent', 'Payroll', 'Marketing', 'Utilities'] as const;
const GROUP_LABELS = ['Organic', 'Paid', 'Referral'] as const;

/** `seriesId → color`, so a donut slice always matches its stacked-bar segment. */
export const colorBySeries: Record<string, string> = Object.fromEntries(
  STACK_SERIES.map((s, i) => [s, STACK_COLORS[i % STACK_COLORS.length]])
);

/** `label → color`, so a pie slice always matches its grouped-bar. */
export const colorByLabel: Record<string, string> = Object.fromEntries(
  GROUP_LABELS.map((l, i) => [l, GROUP_COLORS[i % GROUP_COLORS.length]])
);

/**
 * Quarterly operating cost by segment. Points sharing a `category` (quarter) stack
 * into one column; hovering that column shows a donut of its segments.
 */
export const STACKED_DATA: NgeStackedBarDataPoint[] = [
  { category: 'Q1', seriesId: 'Rent', value: 1200 },
  { category: 'Q1', seriesId: 'Payroll', value: 3200 },
  { category: 'Q1', seriesId: 'Marketing', value: 800 },
  { category: 'Q1', seriesId: 'Utilities', value: 300 },
  { category: 'Q2', seriesId: 'Rent', value: 1200 },
  { category: 'Q2', seriesId: 'Payroll', value: 3400 },
  { category: 'Q2', seriesId: 'Marketing', value: 1100 },
  { category: 'Q2', seriesId: 'Utilities', value: 340 },
  { category: 'Q3', seriesId: 'Rent', value: 1250 },
  { category: 'Q3', seriesId: 'Payroll', value: 3600 },
  { category: 'Q3', seriesId: 'Marketing', value: 900 },
  { category: 'Q3', seriesId: 'Utilities', value: 360 },
  { category: 'Q4', seriesId: 'Rent', value: 1250 },
  { category: 'Q4', seriesId: 'Payroll', value: 3900 },
  { category: 'Q4', seriesId: 'Marketing', value: 1500 },
  { category: 'Q4', seriesId: 'Utilities', value: 380 },
];

/**
 * Sessions by acquisition channel across device groups. Points sharing a `groupId`
 * (device) form one column of bars; hovering that group shows a pie of its channels.
 * `color` is set per-label so the grouped bars correlate with the pie slices.
 */
export const GROUPED_DATA: NgeGroupedBarDataPoint[] = [
  { color: colorByLabel['Organic'], groupId: 'Mobile', label: 'Organic', value: 420 },
  { color: colorByLabel['Paid'], groupId: 'Mobile', label: 'Paid', value: 280 },
  { color: colorByLabel['Referral'], groupId: 'Mobile', label: 'Referral', value: 150 },
  { color: colorByLabel['Organic'], groupId: 'Desktop', label: 'Organic', value: 380 },
  { color: colorByLabel['Paid'], groupId: 'Desktop', label: 'Paid', value: 320 },
  { color: colorByLabel['Referral'], groupId: 'Desktop', label: 'Referral', value: 210 },
  { color: colorByLabel['Organic'], groupId: 'Tablet', label: 'Organic', value: 120 },
  { color: colorByLabel['Paid'], groupId: 'Tablet', label: 'Paid', value: 90 },
  { color: colorByLabel['Referral'], groupId: 'Tablet', label: 'Referral', value: 60 },
];

/**
 * Derive one DONUT config per stacked column: group points by `category`, turn each
 * column's segments into pie slices (`innerRadius: 0.6` → donut), keyed by category.
 * Built once and looked up by the hovered `content.label` → stable references.
 */
export function pieConfigsByColumn(
  data: NgeStackedBarDataPoint[],
  colors: Record<string, string>
): Map<string, NgeChartConfig> {
  const slicesByCategory = new Map<string, NgePieDataPoint[]>();
  for (const d of data) {
    const slices = slicesByCategory.get(d.category) ?? [];
    slices.push({ color: colors[d.seriesId], label: d.seriesId, value: d.value });
    slicesByCategory.set(d.category, slices);
  }

  const configs = new Map<string, NgeChartConfig>();
  for (const [category, slices] of slicesByCategory) {
    configs.set(category, createPieChartConfig({ data: slices, innerRadius: 0.6, padAngle: 0.02 }));
  }
  return configs;
}

/**
 * Derive one PIE config per group: group points by `groupId`, turn each group's
 * bars into pie slices (`innerRadius: 0` → full pie), keyed by groupId.
 */
export function pieConfigsByGroup(
  data: NgeGroupedBarDataPoint[],
  colors: Record<string, string>
): Map<string, NgeChartConfig> {
  const slicesByGroup = new Map<string, NgePieDataPoint[]>();
  for (const d of data) {
    const slices = slicesByGroup.get(d.groupId) ?? [];
    slices.push({ color: d.color ?? colors[d.label], label: d.label, value: d.value });
    slicesByGroup.set(d.groupId, slices);
  }

  const configs = new Map<string, NgeChartConfig>();
  for (const [groupId, slices] of slicesByGroup) {
    configs.set(groupId, createPieChartConfig({ data: slices, innerRadius: 0, padAngle: 0.02 }));
  }
  return configs;
}
