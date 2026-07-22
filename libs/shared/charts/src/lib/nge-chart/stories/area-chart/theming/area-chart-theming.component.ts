import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeAreaDataPoint, NgeChartConfig } from '../../../../core/config';

import { createAreaChartConfig } from '../../../../presets/area-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Shared categorical x axis for every theming example. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/** Build a categorical monthly series (`seriesId` + month-keyed points). */
function monthlySeries(seriesId: string, values: number[]): NgeAreaDataPoint[] {
  return values.map((y, index) => ({ seriesId, x: MONTHS[index], y }));
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'area-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'area-chart-theming',
  standalone: true,
  styleUrl: './area-chart-theming.component.scss',
  templateUrl: './area-chart-theming.component.html',
})
export class AreaChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/area-chart/theming';

  // Three stacked traffic-source series, shared by the palette / token demos.
  sampleData: NgeAreaDataPoint[] = [
    ...monthlySeries('Organic', [20, 24, 22, 28, 30, 34]),
    ...monthlySeries('Paid', [12, 14, 18, 16, 20, 22]),
    ...monthlySeries('Referral', [6, 8, 7, 10, 12, 14]),
  ];

  // Default — palette comes from the theme's `area.fill.colors` (var(--chart-*)).
  defaultConfig = createAreaChartConfig({
    data: this.sampleData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  });

  // Ocean palette via seriesColors.
  oceanConfig = createAreaChartConfig({
    data: this.sampleData,
    fillOpacity: 0.35,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    seriesColors: ['#0277BD', '#00ACC1', '#26C6DA'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  });

  // Warm palette via seriesColors.
  warmConfig = createAreaChartConfig({
    data: this.sampleData,
    fillOpacity: 0.35,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    seriesColors: ['#EF6C00', '#F9A825', '#C62828'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  });

  // Forest palette via seriesColors.
  forestConfig = createAreaChartConfig({
    data: this.sampleData,
    fillOpacity: 0.35,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    seriesColors: ['#2E7D32', '#9E9D24', '#00695C'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  });

  // Subtle fill — overlaps stay maximally legible.
  subtleFillConfig = createAreaChartConfig({
    data: this.sampleData,
    fillOpacity: 0.1,
    legend: { enabled: true },
    seriesColors: ['#5E35B1', '#00897B', '#3949AB'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
  });

  // Bold fill — each band reads as a denser layer.
  boldFillConfig = createAreaChartConfig({
    data: this.sampleData,
    fillOpacity: 0.55,
    legend: { enabled: true },
    seriesColors: ['#5E35B1', '#00897B', '#3949AB'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
  });

  // Top-edge stroke via `showLine` + a thicker `theme.area.line.width`.
  lineEmphasisConfig: NgeChartConfig = {
    ...createAreaChartConfig({
      data: this.sampleData,
      fillOpacity: 0.25,
      legend: { enabled: true },
      margin: { bottom: 45, left: 48, right: 20, top: 20 },
      seriesColors: ['#1565C0', '#EF6C00', '#2E7D32'],
      showLine: true,
      showXAxis: true,
      showYAxis: true,
      stackOffset: 'none',
      xAxisLabel: 'Month',
      yAxisLabel: 'Sessions (K)',
    }),
    theme: {
      area: {
        line: { width: 3 },
      },
    },
  };

  // Custom axis colors via `theme.axis`.
  customAxisConfig: NgeChartConfig = {
    ...createAreaChartConfig({
      data: this.sampleData,
      seriesColors: ['#607D8B', '#455A64', '#90A4AE'],
      showXAxis: true,
      showYAxis: true,
      stackOffset: 'none',
      xAxisLabel: 'Month',
      yAxisLabel: 'Sessions (K)',
    }),
    theme: {
      axis: {
        labelColor: '#333333',
        lineColor: '#CCCCCC',
        tickColor: '#666666',
      },
    },
  };

  // Custom gridlines via `theme.grid`.
  gridThemedConfig: NgeChartConfig = {
    ...createAreaChartConfig({
      data: this.sampleData,
      seriesColors: ['#3949AB', '#00ACC1', '#7CB342'],
      showXAxis: true,
      showXGrid: true,
      showYAxis: true,
      showYGrid: true,
      stackOffset: 'none',
      xAxisLabel: 'Month',
      yAxisLabel: 'Sessions (K)',
    }),
    theme: {
      grid: {
        lineColor: '#5C6BC0',
        lineDash: '4 4',
        lineWidth: 1,
      },
    },
  };

  // Branded via `--chart-*` token overrides: NO seriesColors and NO theme fill
  // colors, so the fills fall through to the theme palette (var(--chart-primary),
  // var(--chart-secondary), var(--chart-tertiary)). The SCSS overrides those
  // tokens for BOTH light and dark, so the CSS variables — not the config — drive
  // the colors.
  brandedConfig = createAreaChartConfig({
    data: this.sampleData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 48, right: 20, top: 20 },
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Month',
    yAxisLabel: 'Sessions (K)',
  });
}
