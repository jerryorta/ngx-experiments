import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { AxisTierConfig } from '../../../../core/axis';
import type {
  NgeChartConfig,
  NgeGroupedBarDataPoint,
  NgeLineDataPoint,
  NgeScatterDataPoint,
} from '../../../../core/config';

import { createGroupedBarChartConfig } from '../../../../presets/grouped-bar-chart.preset';
import { createLineChartConfig } from '../../../../presets/line-chart.preset';
import { createScatterChartConfig } from '../../../../presets/scatter-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Month labels driving Example 4's band-scale domain, in axis (Jan → Dec) order. */
const MONTH_LABELS = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'May',
  'Jun',
  'Jul',
  'Aug',
  'Sep',
  'Oct',
  'Nov',
  'Dec',
];

/** Example 4's `groupBy` tier — coalesces a month label into its calendar quarter. */
function quarterOfMonth(month: string): string {
  const index = MONTH_LABELS.indexOf(month);
  return `Q${Math.floor(index / 3) + 1}`;
}

/**
 * Two-series (This Year / Last Year) monthly data for Example 4, ordered Jan → Dec so the
 * band-scale category domain ticks in calendar order.
 */
function buildMonthlySalesData(): NgeGroupedBarDataPoint[] {
  return MONTH_LABELS.flatMap((label, i) => [
    {
      color: '#2196F3',
      groupId: 'This Year',
      label,
      value: 40 + Math.round(20 * Math.sin(i / 2)),
    },
    {
      color: '#B0BEC5',
      groupId: 'Last Year',
      label,
      value: 30 + Math.round(14 * Math.sin(i / 2 + 1)),
    },
  ]);
}

/**
 * Layers grouping tiers onto an already-built preset config's base layout. Presets don't expose
 * a tier option directly (see docs/architecture/charts.md § Axis grouping tiers), so every example
 * below builds its preset config first, then overrides `base.xAxisGroups`.
 */
function withXAxisGroups(config: NgeChartConfig, groups: AxisTierConfig[]): NgeChartConfig {
  return { ...config, base: { ...config.base, xAxisGroups: groups } };
}

/**
 * Layers Y-axis grouping tiers PLUS a Y-axis label onto an already-built preset config — the
 * vertical counterpart of {@link withXAxisGroups}. Exercises the Y-title/Y-tier geometry: the
 * rotated title and the tier stack share the left margin, so the title must seat beyond the
 * stack rather than overprint it.
 */
function withYAxisRangeTiers(
  config: NgeChartConfig,
  groups: AxisTierConfig[],
  yAxisLabel: string
): NgeChartConfig {
  return { ...config, base: { ...config.base, yAxisGroups: groups, yAxisLabel } };
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'axis-grouping-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-axis-grouping-usage-stories',
  standalone: true,
  styleUrl: './axis-grouping-usage-stories.component.scss',
  templateUrl: './axis-grouping-usage-stories.component.html',
})
export class AxisGroupingUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/axis-grouping/usage';

  // ============================================
  // EXAMPLE 1: Linear Numeric Ranges
  // ============================================
  linearRangesData: NgeScatterDataPoint[] = [
    { x: 6, y: 24 },
    { x: 14, y: 38 },
    { x: 22, y: 20 },
    { x: 30, y: 46 },
    { x: 40, y: 30 },
    { x: 48, y: 52 },
    { x: 58, y: 28 },
    { x: 68, y: 58 },
    { x: 78, y: 42 },
    { x: 86, y: 64 },
    { x: 94, y: 50 },
  ];

  linearRangesConfig = withXAxisGroups(
    createScatterChartConfig({
      data: this.linearRangesData,
      tooltip: { enabled: true },
      xDomain: [0, 100],
    }),
    [
      {
        ranges: [
          { from: 0, label: 'Low', to: 33 },
          { from: 33, label: 'Medium', to: 66 },
          { from: 66, label: 'High', to: 100 },
        ],
      },
    ]
  );

  // ============================================
  // EXAMPLE 2: Calendar Interval (Time Scale)
  // ============================================
  weeklyDomainData: NgeLineDataPoint[] = [
    { x: new Date(2026, 0, 5), y: 42 },
    { x: new Date(2026, 0, 12), y: 48 },
    { x: new Date(2026, 0, 19), y: 45 },
    { x: new Date(2026, 0, 26), y: 53 },
    { x: new Date(2026, 1, 2), y: 58 },
    { x: new Date(2026, 1, 9), y: 55 },
    { x: new Date(2026, 1, 16), y: 62 },
  ];

  threeYearDomainData: NgeLineDataPoint[] = [
    { x: new Date(2023, 0, 1), y: 40 },
    { x: new Date(2023, 3, 1), y: 48 },
    { x: new Date(2023, 6, 1), y: 44 },
    { x: new Date(2023, 9, 1), y: 52 },
    { x: new Date(2024, 0, 1), y: 55 },
    { x: new Date(2024, 3, 1), y: 61 },
    { x: new Date(2024, 6, 1), y: 58 },
    { x: new Date(2024, 9, 1), y: 66 },
    { x: new Date(2025, 0, 1), y: 70 },
    { x: new Date(2025, 3, 1), y: 68 },
    { x: new Date(2025, 6, 1), y: 76 },
    { x: new Date(2025, 9, 1), y: 74 },
    { x: new Date(2026, 0, 1), y: 82 },
  ];

  weeklyIntervalConfig = withXAxisGroups(
    createLineChartConfig({
      data: this.weeklyDomainData,
      showPoints: true,
      showXAxis: true,
    }),
    [{ interval: 'week' }]
  );

  monthlyIntervalConfig = withXAxisGroups(
    createLineChartConfig({
      data: this.threeYearDomainData,
      showPoints: true,
      showXAxis: true,
    }),
    [{ interval: 'month' }]
  );

  // ============================================
  // EXAMPLE 3: Custom Ranges on a Continuous Scale
  // ============================================
  priceBracketData: NgeLineDataPoint[] = [
    { x: 0, y: 12 },
    { x: 100000, y: 28 },
    { x: 200000, y: 45 },
    { x: 300000, y: 38 },
    { x: 400000, y: 30 },
    { x: 550000, y: 22 },
    { x: 700000, y: 14 },
    { x: 850000, y: 8 },
    { x: 1000000, y: 4 },
  ];

  priceBracketConfig = withXAxisGroups(
    createLineChartConfig({
      data: this.priceBracketData,
      showArea: true,
      showPoints: true,
      showXAxis: true,
      tooltip: { enabled: true },
    }),
    [
      {
        ranges: [
          { from: 0, label: '$0–250K', to: 250000 },
          { from: 250000, label: '$250K–500K', to: 500000 },
          { from: 500000, label: '$500K–1M', to: 1000000 },
        ],
      },
    ]
  );

  // ============================================
  // EXAMPLE 4: Band-Scale Category Grouping
  // ============================================
  monthlySalesData: NgeGroupedBarDataPoint[] = buildMonthlySalesData();

  quarterGroupingConfig = withXAxisGroups(
    createGroupedBarChartConfig({
      data: this.monthlySalesData,
      legend: { enabled: true },
      showXAxis: true,
      showYAxis: true,
    }),
    [{ groupBy: quarterOfMonth }]
  );

  // ============================================
  // EXAMPLE 5: Y-Axis Range Tiers + Y-Axis Label
  // ============================================
  yRangeTierConfig = withYAxisRangeTiers(
    createScatterChartConfig({
      data: this.linearRangesData,
      tooltip: { enabled: true },
      xDomain: [0, 100],
      yDomain: [0, 100],
    }),
    [
      {
        ranges: [
          { from: 0, label: 'Low', to: 33 },
          { from: 33, label: 'Mid', to: 66 },
          { from: 66, label: 'High', to: 100 },
        ],
      },
    ],
    'Score'
  );

  // ============================================
  // EXAMPLE 6: Pill / Bracket Render Style
  // ============================================
  pillStyleConfig = withXAxisGroups(
    createScatterChartConfig({
      data: this.linearRangesData,
      tooltip: { enabled: true },
      xDomain: [0, 100],
    }),
    [
      {
        ranges: [
          { from: 0, label: 'Low', to: 33 },
          { from: 33, label: 'Medium', to: 66 },
          { from: 66, label: 'High', to: 100 },
        ],
        style: 'pill',
      },
    ]
  );
}
