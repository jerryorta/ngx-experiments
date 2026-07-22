import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeAreaDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createAreaChartConfig } from '../../../../presets/area-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Shared categorical x axis for every usage example. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/** Build a categorical monthly series (`seriesId` + month-keyed points). */
function monthlySeries(seriesId: string, values: number[]): NgeAreaDataPoint[] {
  return values.map((y, index) => ({ seriesId, x: MONTHS[index], y }));
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'area-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'area-chart-usage-stories',
  standalone: true,
  styleUrl: './area-chart-usage-stories.component.scss',
  templateUrl: './area-chart-usage-stories.component.html',
})
export class AreaChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/area-chart/usage';

  // ============================================
  // EXAMPLE 1: Plain area — single series
  // ============================================
  // No `seriesId` → one default series filling from a zero baseline `[0, y]`.
  plainData: NgeAreaDataPoint[] = MONTHS.map((month, index) => ({
    x: month,
    y: [24, 31, 28, 39, 44, 51][index],
  }));

  plainConfig = createAreaChartConfig({
    data: this.plainData,
    fillOpacity: 0.3,
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    showLine: true,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Month',
    yAxisLabel: 'Visits (K)',
  });

  // ============================================
  // EXAMPLE 2: Overlaid multi-series (non-summing)
  // ============================================
  // 2+ series, NO `stackOffset` → each rises from zero and overlaps. Low
  // `fillOpacity` keeps both bands legible through one another.
  overlaidData: NgeAreaDataPoint[] = [
    ...monthlySeries('Desktop', [30, 28, 33, 30, 27, 25]),
    ...monthlySeries('Mobile', [12, 18, 22, 29, 35, 44]),
  ];

  overlaidConfig = createAreaChartConfig({
    data: this.overlaidData,
    fillOpacity: 0.25,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    seriesColors: ['#1E88E5', '#8E24AA'],
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  });

  // Traffic-source dataset shared by the three stacking demos (3, 4, 5) and the
  // click demo (8) — same data, different `stackOffset`.
  trafficData: NgeAreaDataPoint[] = [
    ...monthlySeries('Organic', [20, 24, 22, 28, 30, 34]),
    ...monthlySeries('Paid', [12, 14, 18, 16, 20, 22]),
    ...monthlySeries('Referral', [6, 8, 7, 10, 12, 14]),
  ];

  // ============================================
  // EXAMPLE 3: Stacked — stackOffset: 'none'
  // ============================================
  stackedConfig = createAreaChartConfig({
    data: this.trafficData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    seriesColors: ['#1E88E5', '#43A047', '#FB8C00'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  });

  // ============================================
  // EXAMPLE 4: 100% stacked — stackOffset: 'expand'
  // ============================================
  // Each column normalises to `[0, 1]` — reads as share-of-total.
  expandConfig = createAreaChartConfig({
    data: this.trafficData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    seriesColors: ['#1E88E5', '#43A047', '#FB8C00'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'expand',
    xAxisLabel: 'Month',
    yAxisLabel: 'Share of sessions',
  });

  // ============================================
  // EXAMPLE 5: Stream graph — stackOffset: 'wiggle'
  // ============================================
  // Centres the stack around a free-floating baseline (streamgraph). The y axis
  // is dropped because the baseline is no longer zero.
  streamConfig = createAreaChartConfig({
    data: this.trafficData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 20, right: 20, top: 20 },
    seriesColors: ['#1E88E5', '#43A047', '#FB8C00'],
    showXAxis: true,
    stackOffset: 'wiggle',
    xAxisLabel: 'Month',
  });

  // ============================================
  // EXAMPLE 6: Diverging — stackOffset: 'diverging'
  // ============================================
  // Positive series stack up from zero, negative series stack down — best with
  // mixed-sign data (inflows vs outflows).
  divergingData: NgeAreaDataPoint[] = [
    ...monthlySeries('Inflows', [40, 46, 42, 50, 55, 60]),
    ...monthlySeries('Outflows', [-28, -34, -30, -38, -32, -40]),
  ];

  divergingConfig = createAreaChartConfig({
    data: this.divergingData,
    fillOpacity: 0.4,
    legend: { enabled: true },
    margin: { bottom: 45, left: 52, right: 20, top: 20 },
    seriesColors: ['#2E7D32', '#C62828'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'diverging',
    xAxisLabel: 'Month',
    yAxisLabel: 'Net cash flow ($K)',
  });

  // ============================================
  // EXAMPLE 7: Range band — points carry y0
  // ============================================
  // When points carry `y0`, the band spans `[y0, y]` (range mode) instead of a
  // zero baseline. `showLine` strokes the upper edge (y).
  rangeData: NgeAreaDataPoint[] = [
    { x: 'Jan', y: 9, y0: 2 },
    { x: 'Feb', y: 11, y0: 3 },
    { x: 'Mar', y: 15, y0: 6 },
    { x: 'Apr', y: 19, y0: 9 },
    { x: 'May', y: 24, y0: 13 },
    { x: 'Jun', y: 29, y0: 17 },
  ];

  rangeConfig = createAreaChartConfig({
    data: this.rangeData,
    fillOpacity: 0.3,
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    seriesColors: ['#00838F'],
    showLine: true,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Month',
    yAxisLabel: 'Temp range (°C)',
  });

  // ============================================
  // EXAMPLE 8: Click to inspect a point
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickConfig = createAreaChartConfig({
    data: this.trafficData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    onClick: (event: NgeChartLayerClickEvent<NgeAreaDataPoint>) => {
      this.lastClicked.set(
        `${event.data.seriesId} — ${String(event.data.x)}: ${event.data.y}K sessions`
      );
    },
    seriesColors: ['#1E88E5', '#43A047', '#FB8C00'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  });

  // ============================================
  // EXAMPLE 9: Dynamic data with signals
  // ============================================
  readonly liveData = signal<NgeAreaDataPoint[]>(this.buildLiveData());

  readonly dynamicConfig = computed(() =>
    createAreaChartConfig({
      data: this.liveData(),
      fillOpacity: 0.3,
      margin: { bottom: 45, left: 48, right: 20, top: 20 },
      showLine: true,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Month',
      yAxisLabel: 'Visits (K)',
    })
  );

  randomizeData(): void {
    this.liveData.set(this.buildLiveData());
  }

  private buildLiveData(): NgeAreaDataPoint[] {
    return MONTHS.map(month => ({ x: month, y: Math.round(15 + Math.random() * 45) }));
  }
}
