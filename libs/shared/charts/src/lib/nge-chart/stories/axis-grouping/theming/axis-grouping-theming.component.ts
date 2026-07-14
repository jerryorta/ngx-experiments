import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { AxisGroupTheme, AxisTierConfig } from '../../../../core/axis';
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
      color: '#3F51B5',
      groupId: 'This Year',
      label,
      value: 40 + Math.round(20 * Math.sin(i / 2)),
    },
    {
      color: '#C5CAE9',
      groupId: 'Last Year',
      label,
      value: 30 + Math.round(14 * Math.sin(i / 2 + 1)),
    },
  ]);
}

/**
 * Layers grouping tiers PLUS a `theme.axis.group` override onto an already-built preset config —
 * the theming counterpart of the usage story's `withXAxisGroups` (see
 * docs/reference/charts.md § Axis grouping tiers).
 */
function withThemedXAxisGroups(
  config: NgeChartConfig,
  groups: AxisTierConfig[],
  group: AxisGroupTheme
): NgeChartConfig {
  return {
    ...config,
    base: { ...config.base, xAxisGroups: groups },
    theme: { ...config.theme, axis: { ...config.theme?.axis, group } },
  };
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'axis-grouping-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-axis-grouping-theming',
  standalone: true,
  styleUrl: './axis-grouping-theming.component.scss',
  templateUrl: './axis-grouping-theming.component.html',
})
export class AxisGroupingThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/axis-grouping/theming';

  // ============================================
  // EXAMPLE 1: Linear Numeric Ranges (Scatter)
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

  linearRangesTiers: AxisTierConfig[] = [
    {
      ranges: [
        { from: 0, label: 'Low', to: 33 },
        { from: 33, label: 'Medium', to: 66 },
        { from: 66, label: 'High', to: 100 },
      ],
    },
  ];

  linearRangesLightConfig = withThemedXAxisGroups(
    createScatterChartConfig({
      data: this.linearRangesData,
      tooltip: { enabled: true },
      xDomain: [0, 100],
    }),
    this.linearRangesTiers,
    { labelColor: '#455A64', labelFontSize: 11, separatorColor: '#B0BEC5', separatorWidth: 1 }
  );

  linearRangesBoldConfig = withThemedXAxisGroups(
    createScatterChartConfig({
      data: this.linearRangesData,
      tooltip: { enabled: true },
      xDomain: [0, 100],
    }),
    this.linearRangesTiers,
    {
      labelColor: '#FFFFFF',
      labelFontSize: 12,
      separatorColor: '#FFFFFF',
      separatorWidth: 2,
      tint: '#6A1B9A',
    }
  );

  // ============================================
  // EXAMPLE 2: Calendar Interval (Time Scale)
  // ============================================
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

  monthIntervalTiers: AxisTierConfig[] = [{ interval: 'month' }];

  monthIntervalLightConfig = withThemedXAxisGroups(
    createLineChartConfig({
      data: this.threeYearDomainData,
      showPoints: true,
      showXAxis: true,
    }),
    this.monthIntervalTiers,
    { labelColor: '#37474F', labelFontSize: 11, separatorColor: '#90A4AE', separatorWidth: 1 }
  );

  monthIntervalBoldConfig = withThemedXAxisGroups(
    createLineChartConfig({
      data: this.threeYearDomainData,
      showPoints: true,
      showXAxis: true,
    }),
    this.monthIntervalTiers,
    {
      labelColor: '#FFFFFF',
      labelFontSize: 12,
      separatorColor: '#B2DFDB',
      separatorWidth: 2,
      tint: '#00695C',
    }
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

  priceBracketTiers: AxisTierConfig[] = [
    {
      ranges: [
        { from: 0, label: '$0–250K', to: 250000 },
        { from: 250000, label: '$250K–500K', to: 500000 },
        { from: 500000, label: '$500K–1M', to: 1000000 },
      ],
    },
  ];

  priceBracketLightConfig = withThemedXAxisGroups(
    createLineChartConfig({
      data: this.priceBracketData,
      showArea: true,
      showPoints: true,
      showXAxis: true,
      showXGrid: true,
      tooltip: { enabled: true },
    }),
    this.priceBracketTiers,
    { labelColor: '#4E342E', labelFontSize: 11, separatorColor: '#D7CCC8', separatorWidth: 1 }
  );

  priceBracketBoldConfig = withThemedXAxisGroups(
    createLineChartConfig({
      data: this.priceBracketData,
      showArea: true,
      showPoints: true,
      showXAxis: true,
      showXGrid: true,
      tooltip: { enabled: true },
    }),
    this.priceBracketTiers,
    {
      labelColor: '#FFFFFF',
      labelFontSize: 12,
      separatorColor: '#FFE0B2',
      separatorWidth: 2,
      tint: '#E65100',
    }
  );

  // ============================================
  // EXAMPLE 4: Band-Scale Category Grouping
  // ============================================
  monthlySalesData: NgeGroupedBarDataPoint[] = buildMonthlySalesData();

  quarterTiers: AxisTierConfig[] = [{ groupBy: quarterOfMonth }];

  quarterGroupingLightConfig = withThemedXAxisGroups(
    createGroupedBarChartConfig({
      data: this.monthlySalesData,
      legend: { enabled: true },
      showXAxis: true,
      showYAxis: true,
    }),
    this.quarterTiers,
    { labelColor: '#283593', labelFontSize: 11, separatorColor: '#C5CAE9', separatorWidth: 1 }
  );

  quarterGroupingBoldConfig = withThemedXAxisGroups(
    createGroupedBarChartConfig({
      data: this.monthlySalesData,
      legend: { enabled: true },
      showXAxis: true,
      showYAxis: true,
    }),
    this.quarterTiers,
    {
      labelColor: '#FFFFFF',
      labelFontSize: 12,
      separatorColor: '#C5CAE9',
      separatorWidth: 2,
      tint: '#1A237E',
    }
  );

  // ============================================
  // EXAMPLE 5: Pill / Bracket Render Style
  // ============================================
  pillStyleTiers: AxisTierConfig[] = [
    {
      ranges: [
        { from: 0, label: 'Low', to: 33 },
        { from: 33, label: 'Medium', to: 66 },
        { from: 66, label: 'High', to: 100 },
      ],
      style: 'pill',
    },
  ];

  pillLightConfig = withThemedXAxisGroups(
    createScatterChartConfig({
      data: this.linearRangesData,
      tooltip: { enabled: true },
      xDomain: [0, 100],
    }),
    this.pillStyleTiers,
    {
      labelColor: '#37474F',
      labelFontSize: 11,
      pillBackground: '#ECEFF1',
      separatorColor: '#607D8B',
      separatorWidth: 1,
    }
  );

  pillBoldConfig = withThemedXAxisGroups(
    createScatterChartConfig({
      data: this.linearRangesData,
      tooltip: { enabled: true },
      xDomain: [0, 100],
    }),
    this.pillStyleTiers,
    {
      labelColor: '#FFFFFF',
      labelFontSize: 12,
      pillBackground: '#5E35B1',
      separatorColor: '#5E35B1',
      separatorWidth: 2,
    }
  );
}
