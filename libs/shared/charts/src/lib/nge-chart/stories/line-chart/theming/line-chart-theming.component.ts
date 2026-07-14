import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';

import { createLineChartConfig } from '../../../../presets/line-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'line-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'line-chart-theming',
  standalone: true,
  styleUrl: './line-chart-theming.component.scss',
  templateUrl: './line-chart-theming.component.html',
})
export class LineChartThemingComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/line-chart/theming';

  // Sample data
  sampleData: NgeLineDataPoint[] = [
    { x: 'Jan', y: 30 },
    { x: 'Feb', y: 45 },
    { x: 'Mar', y: 60 },
    { x: 'Apr', y: 35 },
    { x: 'May', y: 50 },
  ];

  multiSeriesData: NgeLineDataPoint[] = [
    // Sales series
    { seriesId: 'Sales', x: 'Jan', y: 30 },
    { seriesId: 'Sales', x: 'Feb', y: 45 },
    { seriesId: 'Sales', x: 'Mar', y: 55 },
    { seriesId: 'Sales', x: 'Apr', y: 48 },
    { seriesId: 'Sales', x: 'May', y: 62 },
    // Costs series
    { seriesId: 'Costs', x: 'Jan', y: 20 },
    { seriesId: 'Costs', x: 'Feb', y: 25 },
    { seriesId: 'Costs', x: 'Mar', y: 35 },
    { seriesId: 'Costs', x: 'Apr', y: 30 },
    { seriesId: 'Costs', x: 'May', y: 38 },
  ];

  revenueData: NgeLineDataPoint[] = [
    { x: 'Q1', y: 100 },
    { x: 'Q2', y: 120 },
    { x: 'Q3', y: 90 },
    { x: 'Q4', y: 150 },
  ];

  expenseData: NgeLineDataPoint[] = [
    { x: 'Q1', y: 80 },
    { x: 'Q2', y: 95 },
    { x: 'Q3', y: 70 },
    { x: 'Q4', y: 85 },
  ];

  profitData: NgeLineDataPoint[] = [
    { x: 'Q1', y: 20 },
    { x: 'Q2', y: 25 },
    { x: 'Q3', y: 20 },
    { x: 'Q4', y: 65 },
  ];

  // Config presets using factory functions
  defaultConfig = createLineChartConfig({
    data: this.sampleData,
    showPoints: true,
  });

  greenConfig: NgeChartConfig = {
    ...createLineChartConfig({
      data: this.sampleData,
      seriesColors: ['#4CAF50'],
      showPoints: true,
    }),
    theme: {
      line: {
        line: { color: '#4CAF50' },
        point: { color: '#4CAF50', hoverRadius: 6 },
      },
    },
  };

  blueConfig: NgeChartConfig = {
    ...createLineChartConfig({
      data: this.revenueData,
      seriesColors: ['#2196F3'],
      showPoints: true,
    }),
    theme: {
      line: {
        line: { color: '#2196F3' },
        point: { color: '#2196F3', hoverRadius: 6 },
      },
    },
  };

  redConfig: NgeChartConfig = {
    ...createLineChartConfig({
      data: this.expenseData,
      seriesColors: ['#F44336'],
      showPoints: true,
    }),
    theme: {
      line: {
        line: { color: '#F44336' },
        point: { color: '#F44336', hoverRadius: 6 },
      },
    },
  };

  profitConfig: NgeChartConfig = {
    ...createLineChartConfig({
      data: this.profitData,
      seriesColors: ['#4CAF50'],
      showPoints: true,
    }),
    theme: {
      line: {
        line: { color: '#4CAF50' },
        point: { color: '#4CAF50', hoverRadius: 6 },
      },
    },
  };

  // Area chart with theming
  areaConfig: NgeChartConfig = {
    ...createLineChartConfig({
      curveType: 'monotone',
      data: this.sampleData,
      seriesColors: ['#9C27B0'],
      showArea: true,
      showPoints: true,
    }),
    theme: {
      line: {
        area: { fillOpacity: 0.3 },
        line: { color: '#9C27B0' },
        point: { color: '#9C27B0', hoverRadius: 6 },
      },
    },
  };

  // Large typography config
  largeTypographyConfig: NgeChartConfig = {
    ...createLineChartConfig({
      data: this.sampleData,
      seriesColors: ['#2196F3'],
      showPoints: true,
      showXAxis: true,
      showYAxis: true,
    }),
    theme: {
      axis: { labelFontSize: 14, tickFontSize: 12 },
      line: {
        line: { color: '#2196F3', width: 3 },
        point: { color: '#0D47A1', hoverRadius: 8, radius: 6 },
      },
    },
  };

  // Multi-series with custom colors
  multiSeriesConfig = createLineChartConfig({
    data: this.multiSeriesData,
    margin: { bottom: 40, left: 55, right: 20, top: 20 },
    seriesColors: ['#2196F3', '#FF9800'],
    showPoints: true,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Month',
    yAxisLabel: 'Amount ($K)',
  });

  customAxisConfig: NgeChartConfig = {
    ...createLineChartConfig({
      data: this.sampleData,
      seriesColors: ['#607D8B'],
      showPoints: true,
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
      line: {
        line: { color: '#607D8B' },
        point: { color: '#607D8B' },
      },
    },
  };

  // Grid theming
  gridThemedConfig: NgeChartConfig = {
    ...createLineChartConfig({
      data: this.sampleData,
      seriesColors: ['#2196F3'],
      showPoints: true,
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

  // Curve type comparisons
  linearCurveConfig = createLineChartConfig({
    curveType: 'linear',
    data: this.sampleData,
    seriesColors: ['#2196F3'],
    showPoints: true,
  });

  monotoneCurveConfig = createLineChartConfig({
    curveType: 'monotone',
    data: this.sampleData,
    seriesColors: ['#4CAF50'],
    showPoints: true,
  });

  stepCurveConfig = createLineChartConfig({
    curveType: 'step',
    data: this.sampleData,
    seriesColors: ['#FF9800'],
    showPoints: true,
  });

  // Tooltip example configurations
  tooltipAboveConfig = createLineChartConfig({
    data: this.sampleData,
    showPoints: true,
    tooltip: { enabled: true, position: 'above' },
  });

  tooltipBelowConfig = createLineChartConfig({
    data: this.sampleData,
    showPoints: true,
    tooltip: { enabled: true, position: 'below' },
  });

  tooltipFollowConfig = createLineChartConfig({
    data: this.sampleData,
    showPoints: true,
    tooltip: { enabled: true, position: 'follow-mouse' },
  });

  onClick(event: unknown): void {
    console.log('Point clicked:', event);
  }
}
