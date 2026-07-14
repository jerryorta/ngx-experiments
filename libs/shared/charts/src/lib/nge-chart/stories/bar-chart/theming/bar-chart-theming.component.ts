import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint, NgeChartConfig } from '../../../../core/config';

import { createBarChartConfig } from '../../../../presets/bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'bar-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'bar-chart-theming',
  standalone: true,
  styleUrl: './bar-chart-theming.component.scss',
  templateUrl: './bar-chart-theming.component.html',
})
export class BarChartThemingComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bar-chart/theming';

  // Sample data
  sampleData: NgeBarDataPoint[] = [
    { label: 'Jan', value: 30 },
    { label: 'Feb', value: 45 },
    { label: 'Mar', value: 60 },
    { label: 'Apr', value: 35 },
    { label: 'May', value: 50 },
  ];

  perBarColorData: NgeBarDataPoint[] = [
    { color: '#4CAF50', label: 'Success', value: 45 },
    { color: '#FF9800', label: 'Warning', value: 20 },
    { color: '#F44336', label: 'Error', value: 10 },
    { color: '#2196F3', label: 'Info', value: 25 },
  ];

  revenueData: NgeBarDataPoint[] = [
    { label: 'Q1', value: 100 },
    { label: 'Q2', value: 120 },
    { label: 'Q3', value: 90 },
    { label: 'Q4', value: 150 },
  ];

  expenseData: NgeBarDataPoint[] = [
    { label: 'Q1', value: 80 },
    { label: 'Q2', value: 95 },
    { label: 'Q3', value: 70 },
    { label: 'Q4', value: 85 },
  ];

  profitData: NgeBarDataPoint[] = [
    { label: 'Q1', value: 20 },
    { label: 'Q2', value: 25 },
    { label: 'Q3', value: 20 },
    { label: 'Q4', value: 65 },
  ];

  // Config presets using factory functions
  defaultConfig = createBarChartConfig({
    data: this.sampleData,
    showLabels: true,
  });

  greenConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      bar: {
        bar: { color: '#4CAF50', hoverColor: '#81C784' },
        label: { color: '#1B5E20' },
      },
    },
  };

  blueConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.revenueData,
      showLabels: true,
    }),
    theme: {
      bar: {
        bar: { color: '#2196F3', hoverColor: '#64B5F6' },
      },
    },
  };

  redConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.expenseData,
      showLabels: true,
    }),
    theme: {
      bar: {
        bar: { color: '#F44336', hoverColor: '#EF9A9A' },
      },
    },
  };

  profitConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.profitData,
      showLabels: true,
    }),
    theme: {
      bar: {
        bar: { color: '#4CAF50', hoverColor: '#81C784' },
      },
    },
  };

  purpleConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.sampleData,
      orientation: 'horizontal',
      showLabels: true,
      showYAxis: true,
    }),
    theme: {
      bar: {
        bar: { color: '#9C27B0', hoverColor: '#CE93D8', radius: 4 },
      },
    },
  };

  largeTypographyConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.sampleData,
      showLabels: true,
      showXAxis: true,
      showYAxis: true,
    }),
    theme: {
      axis: { labelFontSize: 14, tickFontSize: 12 },
      bar: {
        bar: { color: '#2196F3', hoverColor: '#64B5F6' },
        label: { color: '#0D47A1', fontSize: 14, fontWeight: 600 },
      },
    },
  };

  perBarColorConfig = createBarChartConfig({
    data: this.perBarColorData,
    showLabels: true,
  });

  customAxisConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.sampleData,
      showLabels: true,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Month',
      yAxisLabel: 'Value',
    }),
    theme: {
      axis: {
        labelColor: '#333333',
        lineColor: '#CCCCCC',
        tickColor: '#666666',
      },
      bar: {
        bar: { color: '#607D8B' },
      },
    },
  };

  gridThemedConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.sampleData,
      showLabels: true,
      showXAxis: true,
      showXGrid: true,
      showYAxis: true,
      showYGrid: true,
    }),
    theme: {
      grid: {
        lineColor: '#5C6BC0',
        lineDash: '4 4',
        lineWidth: 1,
      },
    },
  };

  statsConfig: NgeChartConfig = {
    ...createBarChartConfig({
      data: this.sampleData,
      margin: { right: 45 },
      showLabels: true,
      showMeanLine: true,
      showMedianLine: true,
    }),
    theme: {
      bar: {
        bar: { color: '#FF5722', hoverColor: '#FF8A65' },
        statistical: {
          meanLineColor: '#3F51B5',
          medianLineColor: '#009688',
        },
      },
    },
  };

  // Tooltip example configurations
  tooltipAboveConfig = createBarChartConfig({
    data: this.sampleData,
    showLabels: true,
    tooltip: { enabled: true, position: 'above' },
  });

  tooltipBelowConfig = createBarChartConfig({
    data: this.sampleData,
    showLabels: true,
    tooltip: { enabled: true, position: 'below' },
  });

  tooltipFollowConfig = createBarChartConfig({
    data: this.sampleData,
    showLabels: true,
    tooltip: { enabled: true, position: 'follow-mouse' },
  });

  onClick(event: unknown): void {
    console.log('Bar clicked:', event);
  }
}
