import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeLineDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createLineChartConfig } from '../../../../presets/line-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-line-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-line-chart-usage-stories',
  standalone: true,
  styleUrl: './line-chart-usage-stories.component.scss',
  templateUrl: './line-chart-usage-stories.component.html',
})
export class LineChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/line-chart/usage';

  // ============================================
  // EXAMPLE 1: Basic Single Line
  // ============================================
  basicData: NgeLineDataPoint[] = [
    { x: 'Jan', y: 30 },
    { x: 'Feb', y: 45 },
    { x: 'Mar', y: 28 },
    { x: 'Apr', y: 52 },
    { x: 'May', y: 48 },
    { x: 'Jun', y: 65 },
  ];

  basicConfig = createLineChartConfig({
    data: this.basicData,
    margin: { bottom: 40, left: 50, right: 20, top: 20 },
    showPoints: true,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Month',
    yAxisLabel: 'Value',
  });

  // ============================================
  // EXAMPLE 2: Multi-Series Line Chart
  // ============================================
  multiSeriesData: NgeLineDataPoint[] = [
    // Sales series
    { seriesId: 'Sales', x: 'Jan', y: 30 },
    { seriesId: 'Sales', x: 'Feb', y: 45 },
    { seriesId: 'Sales', x: 'Mar', y: 55 },
    { seriesId: 'Sales', x: 'Apr', y: 48 },
    { seriesId: 'Sales', x: 'May', y: 62 },
    // Returns series
    { seriesId: 'Returns', x: 'Jan', y: 5 },
    { seriesId: 'Returns', x: 'Feb', y: 8 },
    { seriesId: 'Returns', x: 'Mar', y: 12 },
    { seriesId: 'Returns', x: 'Apr', y: 7 },
    { seriesId: 'Returns', x: 'May', y: 10 },
    // Profit series
    { seriesId: 'Profit', x: 'Jan', y: 25 },
    { seriesId: 'Profit', x: 'Feb', y: 37 },
    { seriesId: 'Profit', x: 'Mar', y: 43 },
    { seriesId: 'Profit', x: 'Apr', y: 41 },
    { seriesId: 'Profit', x: 'May', y: 52 },
  ];

  multiSeriesConfig = createLineChartConfig({
    data: this.multiSeriesData,
    legend: { enabled: true },
    margin: { bottom: 40, left: 55, right: 20, top: 20 },
    seriesColors: ['#2196F3', '#4CAF50', '#FF9800'], // Blue, Green, Orange
    showPoints: true,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Month',
    yAxisLabel: 'Amount ($K)',
  });

  // ============================================
  // EXAMPLE 3: Area Chart
  // ============================================
  areaData: NgeLineDataPoint[] = [
    { x: 'Q1', y: 120 },
    { x: 'Q2', y: 185 },
    { x: 'Q3', y: 150 },
    { x: 'Q4', y: 220 },
  ];

  areaConfig = createLineChartConfig({
    curveType: 'monotone',
    data: this.areaData,
    margin: { bottom: 40, left: 55, right: 20, top: 20 },
    showArea: true,
    showPoints: true,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });

  // ============================================
  // EXAMPLE 4: Curve Types
  // ============================================
  curveData: NgeLineDataPoint[] = [
    { x: 'A', y: 20 },
    { x: 'B', y: 45 },
    { x: 'C', y: 30 },
    { x: 'D', y: 60 },
    { x: 'E', y: 35 },
    { x: 'F', y: 50 },
  ];

  linearConfig = createLineChartConfig({
    curveType: 'linear',
    data: this.curveData,
    showPoints: true,
  });

  monotoneConfig = createLineChartConfig({
    curveType: 'monotone',
    data: this.curveData,
    showPoints: true,
  });

  stepConfig = createLineChartConfig({
    curveType: 'step',
    data: this.curveData,
    showPoints: true,
  });

  // ============================================
  // EXAMPLE 5: Click Handling
  // ============================================
  clickData: NgeLineDataPoint[] = [
    { x: 'Week 1', y: 100 },
    { x: 'Week 2', y: 120 },
    { x: 'Week 3', y: 95 },
    { x: 'Week 4', y: 140 },
  ];

  readonly lastClickedPoint = signal<string>('None');

  clickConfig = createLineChartConfig({
    data: this.clickData,
    onClick: (event: NgeChartLayerClickEvent<NgeLineDataPoint>) => {
      this.lastClickedPoint.set(`${event.data.x}: ${event.data.y}`);
    },
    showPoints: true,
  });

  // ============================================
  // EXAMPLE 6: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeLineDataPoint[]>([
    { x: 'Mon', y: 20 },
    { x: 'Tue', y: 35 },
    { x: 'Wed', y: 50 },
    { x: 'Thu', y: 40 },
    { x: 'Fri', y: 65 },
  ]);

  readonly dynamicConfig = computed(() =>
    createLineChartConfig({
      data: this.dynamicData(),
      showPoints: true,
    })
  );

  randomizeData(): void {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    this.dynamicData.set(
      days.map(label => ({
        x: label,
        y: Math.floor(Math.random() * 80) + 10,
      }))
    );
  }

  // ============================================
  // EXAMPLE 7: Tooltip on Hover
  // ============================================
  tooltipData: NgeLineDataPoint[] = [
    { x: 'Jan', y: 4500 },
    { x: 'Feb', y: 5200 },
    { x: 'Mar', y: 4800 },
    { x: 'Apr', y: 6100 },
    { x: 'May', y: 5800 },
  ];

  tooltipConfig = createLineChartConfig({
    data: this.tooltipData,
    margin: { bottom: 40, left: 60, right: 20, top: 20 },
    showPoints: true,
    showXAxis: true,
    showYAxis: true,
    tooltip: {
      enabled: true,
      position: 'follow-mouse',
    },
    xAxisLabel: 'Month',
    yAxisLabel: 'Revenue ($)',
  });
}
