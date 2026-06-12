import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeGroupedBarDataPoint } from '../../../../core/config';

import { createGroupedBarChartConfig } from '../../../../presets/grouped-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-grouped-bar-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-grouped-bar-chart-usage-stories',
  standalone: true,
  styleUrl: './grouped-bar-chart-usage-stories.component.scss',
  templateUrl: './grouped-bar-chart-usage-stories.component.html',
})
export class GroupedBarChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/grouped-bar-chart/usage';

  // ============================================
  // EXAMPLE 1: Basic Grouped Bar Chart (Vertical)
  // ============================================
  basicGroupedData: NgeGroupedBarDataPoint[] = [
    { color: '#4CAF50', groupId: 'Active', label: 'Avg $/sqft', value: 185 },
    { color: '#81C784', groupId: 'Active', label: 'Min', value: 142 },
    { color: '#2E7D32', groupId: 'Active', label: 'Max', value: 225 },
    { color: '#2196F3', groupId: 'Closed', label: 'Avg $/sqft', value: 178 },
    { color: '#64B5F6', groupId: 'Closed', label: 'Min', value: 135 },
    { color: '#1565C0', groupId: 'Closed', label: 'Max', value: 210 },
  ];

  basicGroupedConfig = createGroupedBarChartConfig({
    data: this.basicGroupedData,
    labelFormat: v => '$' + v,
    legend: { enabled: true },
    showLabels: true,
    showXAxis: true,
    showYAxis: true,
    yAxisTickFormat: d => '$' + d,
  });

  // ============================================
  // EXAMPLE 2: Horizontal Grouped Bar Chart
  // ============================================
  horizontalGroupedConfig = createGroupedBarChartConfig({
    data: this.basicGroupedData,
    labelFormat: v => '$' + v,
    legend: { enabled: true },
    orientation: 'horizontal',
    showLabels: true,
    showXAxis: true,
    showYAxis: true,
    xAxisTickFormat: d => '$' + d,
  });

  // ============================================
  // EXAMPLE 3: Grouped Bar with Tooltip
  // ============================================
  tooltipGroupedConfig = createGroupedBarChartConfig({
    data: this.basicGroupedData,
    labelFormat: v => '$' + v,
    legend: { enabled: true },
    showLabels: true,
    showXAxis: true,
    showYAxis: true,
    tooltip: {
      enabled: true,
      position: 'follow-mouse',
      width: 160,
    },
    yAxisTickFormat: d => '$' + d,
  });

  // ============================================
  // EXAMPLE 4: Dynamic Data with Signals
  // ============================================
  readonly dynamicGroupedData = signal<NgeGroupedBarDataPoint[]>([
    { color: '#4CAF50', groupId: 'Active', label: 'Avg', value: 185 },
    { color: '#81C784', groupId: 'Active', label: 'Min', value: 142 },
    { color: '#2E7D32', groupId: 'Active', label: 'Max', value: 225 },
    { color: '#2196F3', groupId: 'Closed', label: 'Avg', value: 178 },
    { color: '#64B5F6', groupId: 'Closed', label: 'Min', value: 135 },
    { color: '#1565C0', groupId: 'Closed', label: 'Max', value: 210 },
  ]);

  readonly dynamicGroupedConfig = computed(() =>
    createGroupedBarChartConfig({
      data: this.dynamicGroupedData(),
      labelFormat: v => '$' + v,
      legend: { enabled: true },
      showLabels: true,
      showXAxis: true,
      showYAxis: true,
      yAxisTickFormat: d => '$' + d,
    })
  );

  randomizeGroupedData(): void {
    const groups = ['Active', 'Closed'];
    const labels = ['Avg', 'Min', 'Max'];
    const colors: Record<string, string[]> = {
      Active: ['#4CAF50', '#81C784', '#2E7D32'],
      Closed: ['#2196F3', '#64B5F6', '#1565C0'],
    };

    const newData: NgeGroupedBarDataPoint[] = [];
    for (const group of groups) {
      for (let i = 0; i < labels.length; i++) {
        newData.push({
          color: colors[group][i],
          groupId: group,
          label: labels[i],
          value: Math.floor(Math.random() * 200) + 100,
        });
      }
    }
    this.dynamicGroupedData.set(newData);
  }
}
