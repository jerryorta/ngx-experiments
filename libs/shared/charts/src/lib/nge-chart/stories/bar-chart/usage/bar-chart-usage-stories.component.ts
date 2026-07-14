import { CurrencyPipe } from '@angular/common';
import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createBarChartConfig } from '../../../../presets/bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'bar-chart-usage-stories',
  },
  imports: [CurrencyPipe, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'bar-chart-usage-stories',
  standalone: true,
  styleUrl: './bar-chart-usage-stories.component.scss',
  templateUrl: './bar-chart-usage-stories.component.html',
})
export class BarChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bar-chart/usage';

  // ============================================
  // EXAMPLE 1: Basic Usage
  // ============================================
  basicData: NgeBarDataPoint[] = [
    { label: 'Jan', value: 30 },
    { label: 'Feb', value: 45 },
    { label: 'Mar', value: 60 },
    { label: 'Apr', value: 35 },
    { label: 'May', value: 50 },
  ];

  basicConfig = createBarChartConfig({
    data: this.basicData,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 2: Click Handling
  // ============================================
  clickableData: NgeBarDataPoint[] = [
    { label: 'Product A', value: 120 },
    { label: 'Product B', value: 85 },
    { label: 'Product C', value: 150 },
    { label: 'Product D', value: 95 },
  ];

  readonly lastClickedBar = signal<string>('None');

  clickableConfig = createBarChartConfig({
    data: this.clickableData,
    onClick: (event: NgeChartLayerClickEvent<NgeBarDataPoint>) => {
      this.lastClickedBar.set(`${event.data.label}: ${event.data.value}`);
    },
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 3: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeBarDataPoint[]>([
    { label: 'Mon', value: 20 },
    { label: 'Tue', value: 35 },
    { label: 'Wed', value: 50 },
    { label: 'Thu', value: 40 },
    { label: 'Fri', value: 65 },
  ]);

  readonly dynamicConfig = computed(() =>
    createBarChartConfig({
      data: this.dynamicData(),
      showLabels: true,
    })
  );

  randomizeData(): void {
    const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];
    this.dynamicData.set(
      days.map(label => ({
        label,
        value: Math.floor(Math.random() * 80) + 10,
      }))
    );
  }

  // ============================================
  // EXAMPLE 4: Horizontal Bar Chart
  // ============================================
  horizontalData: NgeBarDataPoint[] = [
    { label: '$0-$100K', value: 15 },
    { label: '$100K-$200K', value: 28 },
    { label: '$200K-$300K', value: 42 },
    { label: '$300K-$400K', value: 35 },
    { label: '$400K+', value: 20 },
  ];

  horizontalConfig = createBarChartConfig({
    data: this.horizontalData,
    orientation: 'horizontal',
    showLabels: true,
    showYAxis: true,
  });

  // ============================================
  // EXAMPLE 5: With Statistical Lines
  // ============================================
  statisticalData: NgeBarDataPoint[] = [
    { label: 'A', value: 22 },
    { label: 'B', value: 45 },
    { label: 'C', value: 38 },
    { label: 'D', value: 62 },
    { label: 'E', value: 30 },
    { label: 'F', value: 55 },
  ];

  statisticalConfig = createBarChartConfig({
    data: this.statisticalData,
    legend: { enabled: true },
    showLabels: true,
    showMeanLine: true,
    showMedianLine: true,
  });

  // ============================================
  // EXAMPLE 6: Per-Bar Colors (Status Indicators)
  // ============================================
  statusData: NgeBarDataPoint[] = [
    { color: '#4CAF50', label: 'Completed', value: 85 },
    { color: '#2196F3', label: 'In Progress', value: 45 },
    { color: '#FF9800', label: 'Pending', value: 30 },
    { color: '#F44336', label: 'Failed', value: 12 },
  ];

  statusConfig = createBarChartConfig({
    data: this.statusData,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 7: Tooltip on Hover
  // ============================================
  tooltipData: NgeBarDataPoint[] = [
    { label: 'North', value: 125 },
    { label: 'South', value: 98 },
    { label: 'East', value: 142 },
    { label: 'West', value: 87 },
  ];

  tooltipConfig = createBarChartConfig({
    data: this.tooltipData,
    showLabels: true,
    tooltip: {
      enabled: true,
      position: 'follow-mouse', // 'above' | 'below' | 'follow-mouse'
    },
  });

  // ============================================
  // EXAMPLE 8: Custom Tooltip Template
  // ============================================
  customTooltipData: NgeBarDataPoint[] = [
    { label: 'Q1 2024', value: 45000 },
    { label: 'Q2 2024', value: 52000 },
    { label: 'Q3 2024', value: 48000 },
    { label: 'Q4 2024', value: 61000 },
  ];

  customTooltipConfig = createBarChartConfig({
    data: this.customTooltipData,
    showLabels: true,
    tooltip: {
      enabled: true,
      height: 80,
      position: 'above',
      width: 140,
    },
  });

  // ============================================
  // EXAMPLE 9: Label Formatting
  // ============================================
  labelFormatData: NgeBarDataPoint[] = [
    { label: 'Q1', value: 245000 },
    { label: 'Q2', value: 312000 },
    { label: 'Q3', value: 287000 },
    { label: 'Q4', value: 356000 },
  ];

  labelFormatConfig = createBarChartConfig({
    data: this.labelFormatData,
    labelFormat: v => '$' + (v / 1000).toFixed(0) + 'K',
    showLabels: true,
    showYAxis: true,
    yAxisTickFormat: d => '$' + d / 1000 + 'K',
  });

  // ============================================
  // EXAMPLE 10: Gridlines
  // ============================================
  gridlinesConfig = createBarChartConfig({
    data: this.basicData,
    showLabels: true,
    showXAxis: true,
    showXGrid: true,
    showYAxis: true,
    showYGrid: true,
  });
}
