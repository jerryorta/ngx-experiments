import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import type { NgeChartConfig, NgeGroupedBarDataPoint } from '../../../../core/config';

import { createGroupedBarChartConfig } from '../../../../presets/grouped-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-grouped-bar-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-grouped-bar-chart-theming',
  standalone: true,
  styleUrl: './grouped-bar-chart-theming.component.scss',
  templateUrl: './grouped-bar-chart-theming.component.html',
})
export class GroupedBarChartThemingComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/grouped-bar-chart/theming';

  // Sample data
  sampleData: NgeGroupedBarDataPoint[] = [
    { color: '#4CAF50', groupId: 'Active', label: 'Avg', value: 185 },
    { color: '#81C784', groupId: 'Active', label: 'Min', value: 142 },
    { color: '#2E7D32', groupId: 'Active', label: 'Max', value: 225 },
    { color: '#2196F3', groupId: 'Closed', label: 'Avg', value: 178 },
    { color: '#64B5F6', groupId: 'Closed', label: 'Min', value: 135 },
    { color: '#1565C0', groupId: 'Closed', label: 'Max', value: 210 },
  ];

  // Data without per-bar colors (uses theme color)
  noColorData: NgeGroupedBarDataPoint[] = [
    { groupId: 'Active', label: 'Avg', value: 185 },
    { groupId: 'Active', label: 'Min', value: 142 },
    { groupId: 'Active', label: 'Max', value: 225 },
    { groupId: 'Closed', label: 'Avg', value: 178 },
    { groupId: 'Closed', label: 'Min', value: 135 },
    { groupId: 'Closed', label: 'Max', value: 210 },
  ];

  revenueData: NgeGroupedBarDataPoint[] = [
    { color: '#1565C0', groupId: 'Q1', label: 'Online', value: 100 },
    { color: '#42A5F5', groupId: 'Q1', label: 'Store', value: 80 },
    { color: '#1565C0', groupId: 'Q2', label: 'Online', value: 120 },
    { color: '#42A5F5', groupId: 'Q2', label: 'Store', value: 95 },
  ];

  expenseData: NgeGroupedBarDataPoint[] = [
    { color: '#C62828', groupId: 'Q1', label: 'Fixed', value: 60 },
    { color: '#EF5350', groupId: 'Q1', label: 'Variable', value: 45 },
    { color: '#C62828', groupId: 'Q2', label: 'Fixed', value: 65 },
    { color: '#EF5350', groupId: 'Q2', label: 'Variable', value: 50 },
  ];

  profitData: NgeGroupedBarDataPoint[] = [
    { color: '#2E7D32', groupId: 'Q1', label: 'Gross', value: 75 },
    { color: '#66BB6A', groupId: 'Q1', label: 'Net', value: 40 },
    { color: '#2E7D32', groupId: 'Q2', label: 'Gross', value: 100 },
    { color: '#66BB6A', groupId: 'Q2', label: 'Net', value: 55 },
  ];

  // 1. Default Theme
  defaultConfig = createGroupedBarChartConfig({
    data: this.noColorData,
    showLabels: true,
  });

  // 2. Custom Colors via theme override
  customColorsConfig: NgeChartConfig = {
    ...createGroupedBarChartConfig({
      data: this.noColorData,
      showLabels: true,
    }),
    theme: {
      'grouped-bar': {
        bar: { color: '#FF5722', hoverColor: '#FF8A65' },
      },
    },
  };

  // 3. Per-Bar Colors (from data)
  perBarColorConfig = createGroupedBarChartConfig({
    data: this.sampleData,
    legend: { enabled: true },
    showLabels: true,
  });

  // 4. Large Typography
  largeTypographyConfig: NgeChartConfig = {
    ...createGroupedBarChartConfig({
      data: this.sampleData,
      legend: { enabled: true },
      showLabels: true,
      showXAxis: true,
      showYAxis: true,
    }),
    theme: {
      axis: { labelFontSize: 16, tickFontSize: 14 },
      'grouped-bar': {
        label: { color: '#0D47A1', fontSize: 14, fontWeight: 600 },
      },
    },
  };

  // 5. Horizontal with Theme
  horizontalConfig: NgeChartConfig = {
    ...createGroupedBarChartConfig({
      data: this.sampleData,
      legend: { enabled: true },
      orientation: 'horizontal',
      showLabels: true,
      showYAxis: true,
    }),
    theme: {
      'grouped-bar': {
        bar: { color: '#9C27B0', hoverColor: '#CE93D8', radius: 4 },
      },
    },
  };

  // 6. With Legend (different positions)
  legendBottomConfig = createGroupedBarChartConfig({
    data: this.sampleData,
    legend: { enabled: true, position: 'bottom' },
    showLabels: true,
  });

  legendTopConfig = createGroupedBarChartConfig({
    data: this.sampleData,
    legend: { enabled: true, position: 'top' },
    showLabels: true,
  });

  // 7. Multiple Charts - Revenue / Expenses / Profit
  revenueConfig = createGroupedBarChartConfig({
    data: this.revenueData,
    legend: { enabled: true },
    showLabels: true,
  });

  expenseConfig = createGroupedBarChartConfig({
    data: this.expenseData,
    legend: { enabled: true },
    showLabels: true,
  });

  profitConfig = createGroupedBarChartConfig({
    data: this.profitData,
    legend: { enabled: true },
    showLabels: true,
  });
}
