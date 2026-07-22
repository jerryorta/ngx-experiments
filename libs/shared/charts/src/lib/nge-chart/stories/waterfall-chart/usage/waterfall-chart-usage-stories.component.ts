import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeWaterfallDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createWaterfallChartConfig } from '../../../../presets/waterfall-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** A revenue bridge: opening balance, signed movements, closing total. */
const REVENUE: NgeWaterfallDataPoint[] = [
  { label: 'Start', value: 120 },
  { label: 'Product A', value: 45 },
  { label: 'Product B', value: -20 },
  { label: 'Services', value: 30 },
  { label: 'Returns', value: -15 },
  { kind: 'total', label: 'Net', value: 0 },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'waterfall-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'waterfall-chart-usage-stories',
  standalone: true,
  styleUrl: './waterfall-chart-usage-stories.component.scss',
  templateUrl: './waterfall-chart-usage-stories.component.html',
})
export class WaterfallChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/waterfall-chart/usage';

  revenueData: NgeWaterfallDataPoint[] = REVENUE;

  // ============================================
  // EXAMPLE 1: Basic Waterfall
  // ============================================
  // Each 'delta' bar floats from the prior running total to the new one, colored
  // rise (green) for a gain and fall (red) for a loss. Step connectors bridge the
  // bars at the carried running-total level.
  basicConfig = createWaterfallChartConfig({
    data: this.revenueData,
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  // ============================================
  // EXAMPLE 2: Subtotal / Total Bars
  // ============================================
  // A `kind: 'total'` datum renders a subtotal / total column anchored at zero
  // (spanning [0, runningTotal]) without advancing the running total — handy for
  // period checkpoints like a half-year or full-year total.
  totalsConfig = createWaterfallChartConfig({
    data: [
      { label: 'Start', value: 120 },
      { label: 'Q1', value: 40 },
      { label: 'Q2', value: 30 },
      { kind: 'total', label: 'H1', value: 0 },
      { label: 'Q3', value: -25 },
      { label: 'Q4', value: 50 },
      { kind: 'total', label: 'Year', value: 0 },
    ],
    showLabels: true,
    xAxisLabel: 'Period',
    yAxisLabel: 'Revenue ($K)',
  });

  // ============================================
  // EXAMPLE 3: Click to Inspect a Bar
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickConfig = createWaterfallChartConfig({
    data: this.revenueData,
    onClick: (event: NgeChartLayerClickEvent<NgeWaterfallDataPoint>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  // ============================================
  // EXAMPLE 4: Cumulative Overlay (Pareto-style)
  // ============================================
  // `cumulative: true` overlays a running-total % line on a secondary (right)
  // axis, reusing the line layer. Feed positive, descending values for a classic
  // Pareto reading (or use the dedicated createParetoChartConfig preset).
  cumulativeConfig = createWaterfallChartConfig({
    cumulative: true,
    data: this.revenueData,
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  // ============================================
  // EXAMPLE 5: Dynamic Data With Signals
  // ============================================
  readonly liveData = signal<NgeWaterfallDataPoint[]>(this.buildData());

  readonly dynamicConfig = computed(() =>
    createWaterfallChartConfig({
      data: this.liveData(),
      showLabels: true,
      xAxisLabel: 'Movement',
      yAxisLabel: 'Revenue ($K)',
    })
  );

  // ============================================
  // EXAMPLE 6: Value Labels
  // ============================================
  // `showLabels` prints each bar's value in place — a delta shows its signed
  // movement, a total shows the running total.
  labelsConfig = createWaterfallChartConfig({
    data: this.revenueData,
    showLabels: true,
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  randomizeData(): void {
    this.liveData.set(this.buildData());
  }

  // Fresh signed movements between a fixed opening balance and closing total.
  private buildData(): NgeWaterfallDataPoint[] {
    const rand = (lo: number, hi: number): number => Math.round(lo + Math.random() * (hi - lo));
    return [
      { label: 'Start', value: rand(80, 160) },
      { label: 'Product A', value: rand(-20, 60) },
      { label: 'Product B', value: rand(-40, 40) },
      { label: 'Services', value: rand(-10, 50) },
      { label: 'Returns', value: rand(-40, 0) },
      { kind: 'total', label: 'Net', value: 0 },
    ];
  }
}
