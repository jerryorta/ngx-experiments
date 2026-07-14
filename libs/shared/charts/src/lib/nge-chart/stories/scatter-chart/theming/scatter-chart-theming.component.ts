import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeScatterDataPoint } from '../../../../core/config';

import { createScatterChartConfig } from '../../../../presets/scatter-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'scatter-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'scatter-chart-theming',
  standalone: true,
  styleUrl: './scatter-chart-theming.component.scss',
  templateUrl: './scatter-chart-theming.component.html',
})
export class ScatterChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/scatter-chart/theming';

  // Sample data (positive correlation cloud)
  sampleData: NgeScatterDataPoint[] = [
    { x: 12, y: 18 },
    { x: 20, y: 28 },
    { x: 28, y: 24 },
    { x: 36, y: 40 },
    { x: 44, y: 34 },
    { x: 52, y: 50 },
    { x: 60, y: 46 },
    { x: 68, y: 62 },
    { x: 76, y: 58 },
    { x: 84, y: 74 },
  ];

  // Two-cluster data with per-point colors
  clusterData: NgeScatterDataPoint[] = [
    { color: '#F44336', x: 15, y: 20 },
    { color: '#F44336', x: 22, y: 28 },
    { color: '#F44336', x: 28, y: 22 },
    { color: '#F44336', x: 34, y: 32 },
    { color: '#2196F3', x: 60, y: 62 },
    { color: '#2196F3', x: 67, y: 70 },
    { color: '#2196F3', x: 73, y: 66 },
    { color: '#2196F3', x: 80, y: 78 },
  ];

  // Bubble data with per-point sizes
  bubbleData: NgeScatterDataPoint[] = [
    { size: 6, x: 18, y: 30 },
    { size: 12, x: 34, y: 48 },
    { size: 18, x: 50, y: 36 },
    { size: 9, x: 64, y: 62 },
    { size: 22, x: 78, y: 74 },
    { size: 14, x: 88, y: 52 },
  ];

  // Default theme (no overrides)
  defaultConfig = createScatterChartConfig({
    data: this.sampleData,
    tooltip: { enabled: true },
  });

  // Green theme via config.theme.scatter.point
  greenConfig: NgeChartConfig = {
    ...createScatterChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      scatter: {
        point: { color: '#4CAF50', hoverColor: '#2E7D32' },
      },
    },
  };

  // Opacity + stroke overrides
  opacityConfig: NgeChartConfig = {
    ...createScatterChartConfig({
      data: this.sampleData,
      pointRadius: 8,
      tooltip: { enabled: true },
    }),
    theme: {
      scatter: {
        point: {
          color: '#9C27B0',
          hoverColor: '#6A1B9A',
          opacity: 0.5,
          strokeColor: '#4A148C',
          strokeWidth: 2,
        },
      },
    },
  };

  // Per-point colors (data[].color overrides theme)
  perPointColorConfig = createScatterChartConfig({
    data: this.clusterData,
    pointRadius: 7,
    tooltip: { enabled: true },
  });

  // Bubble chart (per-point sizes)
  bubbleConfig = createScatterChartConfig({
    data: this.bubbleData,
    tooltip: { enabled: true },
  });

  // Custom axis theme + labels
  customAxisConfig: NgeChartConfig = {
    ...createScatterChartConfig({
      data: this.sampleData,
      showXAxis: true,
      showYAxis: true,
      tooltip: { enabled: true },
      xAxisLabel: 'Input',
      yAxisLabel: 'Output',
    }),
    theme: {
      axis: {
        labelColor: '#333333',
        lineColor: '#CCCCCC',
        tickColor: '#666666',
      },
      scatter: {
        point: { color: '#607D8B', hoverColor: '#455A64' },
      },
    },
  };

  // Large typography
  largeTypographyConfig: NgeChartConfig = {
    ...createScatterChartConfig({
      data: this.sampleData,
      showXAxis: true,
      showYAxis: true,
      tooltip: { enabled: true },
      xAxisLabel: 'Input',
      yAxisLabel: 'Output',
    }),
    theme: {
      axis: { labelFontSize: 16, tickFontSize: 13 },
      scatter: {
        point: { color: '#2196F3', hoverColor: '#1565C0' },
      },
    },
  };

  // Tooltip positioning variants
  tooltipAboveConfig = createScatterChartConfig({
    data: this.sampleData,
    tooltip: { enabled: true, position: 'above' },
  });

  tooltipBelowConfig = createScatterChartConfig({
    data: this.sampleData,
    tooltip: { enabled: true, position: 'below' },
  });

  tooltipFollowConfig = createScatterChartConfig({
    data: this.sampleData,
    tooltip: { enabled: true, position: 'follow-mouse' },
  });

  // Multi-series data — each series spans the SAME x-range (like line-chart
  // series), so the groups overlap and interleave instead of sitting in
  // separate x-bands (A rises, C declines, B stays mid; the three cross).
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

  // Custom series palette via `seriesColors` (index i → seriesColors[i % len]),
  // with an auto-generated legend from the series data.
  oceanPaletteConfig = createScatterChartConfig({
    data: this.multiSeriesData,
    legend: { enabled: true },
    seriesColors: ['#0277BD', '#00838F', '#26A69A'],
    tooltip: { enabled: true },
  });

  // Alternate palette + legend positioned to the right.
  sunsetPaletteConfig = createScatterChartConfig({
    data: this.multiSeriesData,
    legend: { enabled: true, position: 'right' },
    seriesColors: ['#C62828', '#EF6C00', '#F9A825'],
    tooltip: { enabled: true },
  });

  // Multi-chart comparison configs
  blueConfig: NgeChartConfig = {
    ...createScatterChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      scatter: {
        point: { color: '#2196F3', hoverColor: '#1565C0' },
      },
    },
  };

  redConfig: NgeChartConfig = {
    ...createScatterChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      scatter: {
        point: { color: '#F44336', hoverColor: '#C62828' },
      },
    },
  };

  tealConfig: NgeChartConfig = {
    ...createScatterChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      scatter: {
        point: { color: '#009688', hoverColor: '#00695C' },
      },
    },
  };
}
