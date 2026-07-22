import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeStackedBarDataPoint } from '../../../../core/config';

import { createStackedBarChartConfig } from '../../../../presets/stacked-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Shared band-axis categories (quarters) for every theming example. */
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

/** Build one long-format product-line series keyed by quarter. */
function quarterlySeries(seriesId: string, values: number[]): NgeStackedBarDataPoint[] {
  return values.map((value, index) => ({ category: QUARTERS[index], seriesId, value }));
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'stacked-bar-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'stacked-bar-chart-theming',
  standalone: true,
  styleUrl: './stacked-bar-chart-theming.component.scss',
  templateUrl: './stacked-bar-chart-theming.component.html',
})
export class StackedBarChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/stacked-bar-chart/theming';

  // Four product-line series (Cloud / Licenses / Services / Support) stacked per
  // quarter, shared by every palette / token demo below.
  sampleData: NgeStackedBarDataPoint[] = [
    ...quarterlySeries('Cloud', [120, 145, 170, 210]),
    ...quarterlySeries('Licenses', [90, 88, 95, 100]),
    ...quarterlySeries('Services', [60, 72, 80, 95]),
    ...quarterlySeries('Support', [30, 35, 42, 50]),
  ];

  // 1. Default — palette comes from the theme's `stacked-bar.bar.colors`, which
  // resolves to the domain-agnostic `var(--chart-*)` tokens.
  defaultConfig = createStackedBarChartConfig({
    data: this.sampleData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });

  // 2. Ocean palette via the `seriesColors` preset option (also colors the legend).
  oceanConfig = createStackedBarChartConfig({
    data: this.sampleData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    seriesColors: ['#0277BD', '#00ACC1', '#26C6DA', '#4DD0E1'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });

  // Warm palette via seriesColors — reused in the multi-chart comparison.
  warmConfig = createStackedBarChartConfig({
    data: this.sampleData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    seriesColors: ['#EF6C00', '#F9A825', '#C62828', '#D84315'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });

  // Forest palette via seriesColors — reused in the multi-chart comparison.
  forestConfig = createStackedBarChartConfig({
    data: this.sampleData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    seriesColors: ['#2E7D32', '#9E9D24', '#00695C', '#558B2F'],
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });

  // 3. Palette via the theme slice instead of seriesColors — set
  // `theme['stacked-bar'].bar.colors` directly (index maps to colors[i % length]).
  paletteThemeConfig: NgeChartConfig = {
    ...createStackedBarChartConfig({
      data: this.sampleData,
      legend: { enabled: true },
      margin: { bottom: 45, left: 55, right: 20, top: 20 },
      showXAxis: true,
      showYAxis: true,
      stackOffset: 'none',
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Revenue ($K)',
    }),
    theme: {
      'stacked-bar': {
        bar: { colors: ['#5E35B1', '#00897B', '#3949AB', '#C0CA33'] },
      },
    },
  };

  // 4. Segment separators + rounded corners via `theme['stacked-bar'].bar`
  // (stroke / strokeWidth carve gaps between stacked segments).
  separatorsConfig: NgeChartConfig = {
    ...createStackedBarChartConfig({
      data: this.sampleData,
      legend: { enabled: true },
      margin: { bottom: 45, left: 55, right: 20, top: 20 },
      seriesColors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA'],
      showXAxis: true,
      showYAxis: true,
      stackOffset: 'none',
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Revenue ($K)',
    }),
    theme: {
      'stacked-bar': {
        bar: { radius: 4, stroke: '#FFFFFF', strokeWidth: 2 },
      },
    },
  };

  // 5. Value-label styling via `theme['stacked-bar'].label`.
  labelStyledConfig: NgeChartConfig = {
    ...createStackedBarChartConfig({
      data: this.sampleData,
      legend: { enabled: true },
      margin: { bottom: 45, left: 55, right: 20, top: 20 },
      seriesColors: ['#1565C0', '#2E7D32', '#EF6C00', '#6A1B9A'],
      showLabels: true,
      showXAxis: true,
      showYAxis: true,
      stackOffset: 'none',
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Revenue ($K)',
    }),
    theme: {
      'stacked-bar': {
        label: { color: '#FFFFFF', fontSize: 13, fontWeight: 700 },
      },
    },
  };

  // 6. Custom axis + gridlines via `theme.axis` and `theme.grid`.
  axisGridConfig: NgeChartConfig = {
    ...createStackedBarChartConfig({
      data: this.sampleData,
      legend: { enabled: true },
      margin: { bottom: 45, left: 55, right: 20, top: 20 },
      seriesColors: ['#3949AB', '#00ACC1', '#7CB342', '#FDD835'],
      showXAxis: true,
      showYAxis: true,
      showYGrid: true,
      stackOffset: 'none',
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Revenue ($K)',
    }),
    theme: {
      axis: {
        labelColor: '#333333',
        lineColor: '#CCCCCC',
        tickColor: '#666666',
      },
      grid: {
        lineColor: '#5C6BC0',
        lineDash: '4 4',
        lineWidth: 1,
      },
    },
  };

  // 8. Branded via `--chart-*` token overrides: NO seriesColors and NO theme
  // colors, so the fills fall through to the default palette
  // (var(--chart-primary / -secondary / -tertiary / -error)). The SCSS overrides
  // those tokens for BOTH light and dark, so the CSS variables drive the colors.
  brandedConfig = createStackedBarChartConfig({
    data: this.sampleData,
    legend: { enabled: true },
    margin: { bottom: 45, left: 55, right: 20, top: 20 },
    showXAxis: true,
    showYAxis: true,
    stackOffset: 'none',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Revenue ($K)',
  });
}
