import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeScatterDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createScatterChartConfig } from '../../../../presets/scatter-chart.preset';
import { NgeScatterChartTransform } from '../../../../transforms/scatter-chart.transform';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'scatter-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'scatter-chart-usage-stories',
  standalone: true,
  styleUrl: './scatter-chart-usage-stories.component.scss',
  templateUrl: './scatter-chart-usage-stories.component.html',
})
export class ScatterChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/scatter-chart/usage';

  // ============================================
  // EXAMPLE 1: Basic Usage
  // ============================================
  basicData: NgeScatterDataPoint[] = [
    { x: 12, y: 18 },
    { x: 18, y: 25 },
    { x: 22, y: 20 },
    { x: 28, y: 34 },
    { x: 33, y: 30 },
    { x: 38, y: 45 },
    { x: 42, y: 38 },
    { x: 47, y: 52 },
    { x: 53, y: 48 },
    { x: 58, y: 60 },
    { x: 63, y: 55 },
    { x: 68, y: 70 },
    { x: 72, y: 64 },
    { x: 78, y: 80 },
    { x: 85, y: 74 },
  ];

  basicConfig = createScatterChartConfig({
    data: this.basicData,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 2: Click Handling
  // ============================================
  readonly lastClickedPoint = signal<string>('None');

  clickableConfig = createScatterChartConfig({
    data: this.basicData,
    onClick: (event: NgeChartLayerClickEvent<NgeScatterDataPoint>) => {
      this.lastClickedPoint.set(`(${event.data.x}, ${event.data.y})`);
    },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 3: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeScatterDataPoint[]>([
    { x: 20, y: 30 },
    { x: 35, y: 55 },
    { x: 48, y: 40 },
    { x: 60, y: 68 },
    { x: 72, y: 52 },
    { x: 84, y: 78 },
  ]);

  readonly dynamicConfig = computed(() =>
    createScatterChartConfig({
      data: this.dynamicData(),
      tooltip: { enabled: true },
    })
  );

  randomizeData(): void {
    this.dynamicData.set(
      Array.from({ length: 20 }, () => ({
        x: Math.round(Math.random() * 100),
        y: Math.round(Math.random() * 100),
      }))
    );
  }

  // ============================================
  // EXAMPLE 4: Per-Point Colors (Clusters)
  // ============================================
  coloredData: NgeScatterDataPoint[] = [
    { color: '#F44336', x: 15, y: 20 },
    { color: '#F44336', x: 20, y: 28 },
    { color: '#F44336', x: 25, y: 22 },
    { color: '#F44336', x: 30, y: 30 },
    { color: '#2196F3', x: 60, y: 65 },
    { color: '#2196F3', x: 65, y: 72 },
    { color: '#2196F3', x: 70, y: 68 },
    { color: '#2196F3', x: 75, y: 78 },
  ];

  coloredConfig = createScatterChartConfig({
    data: this.coloredData,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 5: Per-Point Sizes (Bubble Style)
  // ============================================
  bubbleData: NgeScatterDataPoint[] = [
    { size: 6, x: 20, y: 30 },
    { size: 10, x: 35, y: 45 },
    { size: 16, x: 50, y: 35 },
    { size: 8, x: 62, y: 60 },
    { size: 20, x: 75, y: 72 },
    { size: 12, x: 85, y: 55 },
  ];

  bubbleConfig = createScatterChartConfig({
    data: this.bubbleData,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 6: Tooltip on Hover
  // ============================================
  tooltipConfig = createScatterChartConfig({
    data: this.basicData,
    tooltip: {
      enabled: true,
      position: 'follow-mouse', // 'above' | 'below' | 'follow-mouse'
    },
  });

  // ============================================
  // EXAMPLE 7: Custom Tooltip Content
  // ============================================
  housingData: NgeScatterDataPoint[] = [
    { x: 1200, y: 240 },
    { x: 1500, y: 310 },
    { x: 1800, y: 350 },
    { x: 2100, y: 420 },
    { x: 2400, y: 460 },
    { x: 2800, y: 540 },
    { x: 3200, y: 610 },
  ];

  customTooltipConfig = createScatterChartConfig({
    data: this.housingData,
    tooltip: {
      enabled: true,
      formatContent: point => ({
        label: `${point.x.toLocaleString()} sqft`,
        value: `$${point.y}K`,
      }),
      height: 70,
      position: 'above',
      width: 150,
    },
  });

  // ============================================
  // EXAMPLE 8: Axis Labels & Domain Padding
  // ============================================
  axisConfig = createScatterChartConfig({
    data: this.housingData,
    showXAxis: true,
    showYAxis: true,
    tooltip: { enabled: true },
    xAxisLabel: 'Square Feet',
    xDomainPadding: 0.1,
    yAxisLabel: 'Price ($K)',
    yDomainPadding: 0.15,
    yStartAtZero: true,
  });

  // ============================================
  // EXAMPLE 9: Multi-Series with Legend
  // ============================================
  // Each series spans the SAME x-range (like line-chart series), so the groups
  // overlap and interleave rather than sitting in separate x-bands: A trends up,
  // C trends down, B stays mid — the three cross in the middle of the plot.
  multiSeriesData: NgeScatterDataPoint[] = [
    // Series A — rising
    { seriesId: 'Series A', x: 10, y: 24 },
    { seriesId: 'Series A', x: 24, y: 30 },
    { seriesId: 'Series A', x: 40, y: 40 },
    { seriesId: 'Series A', x: 54, y: 46 },
    { seriesId: 'Series A', x: 70, y: 58 },
    { seriesId: 'Series A', x: 86, y: 68 },
    // Series B — mid / flat
    { seriesId: 'Series B', x: 12, y: 50 },
    { seriesId: 'Series B', x: 26, y: 44 },
    { seriesId: 'Series B', x: 42, y: 54 },
    { seriesId: 'Series B', x: 56, y: 48 },
    { seriesId: 'Series B', x: 72, y: 56 },
    { seriesId: 'Series B', x: 88, y: 52 },
    // Series C — declining
    { seriesId: 'Series C', x: 10, y: 72 },
    { seriesId: 'Series C', x: 24, y: 64 },
    { seriesId: 'Series C', x: 40, y: 56 },
    { seriesId: 'Series C', x: 55, y: 46 },
    { seriesId: 'Series C', x: 70, y: 38 },
    { seriesId: 'Series C', x: 86, y: 32 },
  ];

  multiSeriesConfig = createScatterChartConfig({
    data: this.multiSeriesData,
    legend: { enabled: true },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 10: Per-Point Override within a Series
  // ============================================
  overrideSeriesData: NgeScatterDataPoint[] = [
    // Two series sharing the same x-range so they overlap (like line-chart series).
    // Series A renders in the first palette color...
    { seriesId: 'Series A', x: 14, y: 30 },
    { seriesId: 'Series A', x: 40, y: 40 },
    { seriesId: 'Series A', x: 66, y: 52 },
    // ...except this one, whose per-point `color` overrides the series color.
    { color: '#F44336', seriesId: 'Series A', x: 82, y: 60 },
    // Series B renders in the second palette color...
    { seriesId: 'Series B', x: 22, y: 52 },
    { seriesId: 'Series B', x: 48, y: 60 },
    { seriesId: 'Series B', x: 88, y: 70 },
    // ...and this one keeps the series color but sets a larger bubble radius.
    { seriesId: 'Series B', size: 20, x: 70, y: 66 },
  ];

  overrideSeriesConfig = createScatterChartConfig({
    data: this.overrideSeriesData,
    legend: { enabled: true },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 11: Legend Series Selection (transform)
  // ============================================
  // Plain class (no DI) that owns the interaction semantics: clicking a legend
  // entry selects that series — the others fade via per-point opacity — and the
  // derived config signal re-renders the chart.
  readonly legendSelectionTransform = new NgeScatterChartTransform({
    data: this.multiSeriesData,
    tooltip: { enabled: true },
  });
}
