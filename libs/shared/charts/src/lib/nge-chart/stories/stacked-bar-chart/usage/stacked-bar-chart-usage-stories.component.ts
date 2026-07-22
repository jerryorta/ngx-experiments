import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeStackedBarDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createStackedBarChartConfig } from '../../../../presets/stacked-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Shared band-axis categories (quarters) for every usage example. */
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

/** Stack series — product lines that sum to total revenue per quarter. */
const SERIES_IDS = ['Cloud', 'Licenses', 'Services', 'Support'];

/** Blue / green / orange / purple palette shared across the examples. */
const PALETTE = ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA'];

/** Build one long-format product-line series keyed by quarter. */
function quarterlySeries(seriesId: string, values: number[]): NgeStackedBarDataPoint[] {
  return values.map((value, index) => ({ category: QUARTERS[index], seriesId, value }));
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'stacked-bar-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'stacked-bar-chart-usage-stories',
  standalone: true,
  styleUrl: './stacked-bar-chart-usage-stories.component.scss',
  templateUrl: './stacked-bar-chart-usage-stories.component.html',
})
export class StackedBarChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/stacked-bar-chart/usage';

  // Quarterly SaaS revenue split by product line. Totals grow across the year
  // (300 → 340 → 387 → 455), which the Marimekko example turns into column width.
  // Shared by examples 1–6; example 7 drives its own signal.
  revenueData: NgeStackedBarDataPoint[] = [
    ...quarterlySeries('Cloud', [120, 145, 170, 210]),
    ...quarterlySeries('Licenses', [90, 88, 95, 100]),
    ...quarterlySeries('Services', [60, 72, 80, 95]),
    ...quarterlySeries('Support', [30, 35, 42, 50]),
  ];

  // ============================================
  // EXAMPLE 1: Stacked Bar (stackOffset: 'none')
  // ============================================
  // Segments stack from a zero baseline, so each column's height is the quarter
  // total and every band reads as an absolute contribution.
  stackedConfig = createStackedBarChartConfig({
    data: this.revenueData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    seriesColors: PALETTE,
    showLabels: true,
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });

  // ============================================
  // EXAMPLE 2: 100% Stacked Bar (stackOffset: 'expand')
  // ============================================
  // `'expand'` normalises every column to full height, so each band reads as its
  // share of the quarter total regardless of the absolute magnitude.
  expandConfig = createStackedBarChartConfig({
    data: this.revenueData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    seriesColors: PALETTE,
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'expand',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Share of revenue',
  });

  // ============================================
  // EXAMPLE 3: Marimekko (bandWidthAccessor + expand)
  // ============================================
  // The `bandWidthAccessor` makes each column's WIDTH proportional to its group
  // total, and `'expand'` normalises the height — the classic mosaic where both
  // dimensions encode data. Marimekko is always laid out vertically.
  marimekkoConfig = createStackedBarChartConfig({
    bandWidthAccessor: (_category, total) => total,
    data: this.revenueData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    seriesColors: PALETTE,
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'expand',
    xAxisLabel: 'Quarter (width ∝ total revenue)',
    yAxisLabel: 'Share of revenue',
  });

  // ============================================
  // EXAMPLE 4: Horizontal Stacked Bar
  // ============================================
  // `orientation: 'horizontal'` swaps the band and value axes — the stack now
  // grows left-to-right. Available for the plain and 100% modes (not Marimekko).
  horizontalConfig = createStackedBarChartConfig({
    data: this.revenueData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    orientation: 'horizontal',
    seriesColors: PALETTE,
    showLabels: true,
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Revenue ($K)',
    yAxisLabel: 'Quarter',
  });

  // ============================================
  // EXAMPLE 5: Value Labels + Tooltip
  // ============================================
  // `showLabels` prints each segment's value in place, and `tooltip` surfaces the
  // series + category + value on hover.
  tooltipConfig = createStackedBarChartConfig({
    data: this.revenueData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    seriesColors: PALETTE,
    showLabels: true,
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    tooltip: {
      enabled: true,
      position: 'follow-mouse',
      width: 160,
    },
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });

  // ============================================
  // EXAMPLE 6: Click to Inspect a Segment
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickConfig = createStackedBarChartConfig({
    data: this.revenueData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    onClick: (event: NgeChartLayerClickEvent<NgeStackedBarDataPoint>) => {
      this.lastClicked.set(
        `${event.data.seriesId} — ${event.data.category}: $${event.data.value}K`
      );
    },
    seriesColors: PALETTE,
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });

  // ============================================
  // EXAMPLE 7: Dynamic Data With Signals
  // ============================================
  readonly liveData = signal<NgeStackedBarDataPoint[]>(this.buildLiveData());

  readonly dynamicConfig = computed(() =>
    createStackedBarChartConfig({
      data: this.liveData(),
      legend: { enabled: true },
      margin: { bottom: 45, left: 55, right: 20, top: 20 },
      seriesColors: PALETTE,
      showLabels: true,
      showXAxis: true,
      showYAxis: true,
      stackOffset: 'none',
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Revenue ($K)',
    })
  );

  randomizeData(): void {
    this.liveData.set(this.buildLiveData());
  }

  // Fresh long-format values for all series × quarters.
  private buildLiveData(): NgeStackedBarDataPoint[] {
    return SERIES_IDS.flatMap(seriesId =>
      QUARTERS.map(category => ({
        category,
        seriesId,
        value: Math.round(20 + Math.random() * 180),
      }))
    );
  }
}
