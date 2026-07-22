import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';

import { createComparisonAreaChartConfig } from '../../../../presets/comparison-area-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'comparison-area-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'comparison-area-chart-theming',
  standalone: true,
  styleUrl: './comparison-area-chart-theming.component.scss',
  templateUrl: './comparison-area-chart-theming.component.html',
})
export class ComparisonAreaChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/comparison-area-chart/theming';

  // Two competing loans as declining-balance series (values in $K).
  sampleData: NgeLineDataPoint[] = [
    { seriesId: '30-yr @ 6.5%', x: 0, y: 400 },
    { seriesId: '30-yr @ 6.5%', x: 5, y: 373 },
    { seriesId: '30-yr @ 6.5%', x: 10, y: 336 },
    { seriesId: '30-yr @ 6.5%', x: 15, y: 285 },
    { seriesId: '30-yr @ 6.5%', x: 20, y: 215 },
    { seriesId: '30-yr @ 6.5%', x: 25, y: 118 },
    { seriesId: '30-yr @ 6.5%', x: 30, y: 0 },
    { seriesId: '15-yr @ 5.75%', x: 0, y: 400 },
    { seriesId: '15-yr @ 5.75%', x: 5, y: 296 },
    { seriesId: '15-yr @ 5.75%', x: 10, y: 158 },
    { seriesId: '15-yr @ 5.75%', x: 15, y: 0 },
  ];

  // Default (no overrides) — the palette comes from the theme; the 0.15 area fill
  // is the preset's `areaOpacity` default (a defined layer value, which suppresses
  // the theme's area.fillOpacity token — hence every fill-opacity demo below drives
  // it through the preset option, not the theme).
  defaultConfig = createComparisonAreaChartConfig({
    data: this.sampleData,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Year',
    yAxisLabel: 'Balance ($K)',
  });

  // Ocean palette — fill opacity via the preset's areaOpacity option.
  oceanConfig = createComparisonAreaChartConfig({
    areaOpacity: 0.2,
    data: this.sampleData,
    seriesColors: ['#0277BD', '#00ACC1'],
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Year',
    yAxisLabel: 'Balance ($K)',
  });

  // Warm palette
  warmConfig = createComparisonAreaChartConfig({
    areaOpacity: 0.25,
    data: this.sampleData,
    seriesColors: ['#EF6C00', '#C62828'],
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Year',
    yAxisLabel: 'Balance ($K)',
  });

  // Forest palette
  forestConfig = createComparisonAreaChartConfig({
    areaOpacity: 0.18,
    data: this.sampleData,
    seriesColors: ['#2E7D32', '#9E9D24'],
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Year',
    yAxisLabel: 'Balance ($K)',
  });

  // Low fill opacity — overlaps stay maximally legible.
  subtleFillConfig = createComparisonAreaChartConfig({
    areaOpacity: 0.08,
    data: this.sampleData,
    seriesColors: ['#5E35B1', '#00897B'],
    showXAxis: true,
    showYAxis: true,
  });

  // High fill opacity — each scenario reads as a denser band.
  boldFillConfig = createComparisonAreaChartConfig({
    areaOpacity: 0.4,
    data: this.sampleData,
    seriesColors: ['#5E35B1', '#00897B'],
    showXAxis: true,
    showYAxis: true,
  });

  // Thicker strokes (theme.line.line.width, which resolves via the theme) + denser
  // fill (areaOpacity option).
  emphasisConfig: NgeChartConfig = {
    ...createComparisonAreaChartConfig({
      areaOpacity: 0.22,
      data: this.sampleData,
      seriesColors: ['#1565C0', '#EF6C00'],
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Year',
      yAxisLabel: 'Balance ($K)',
    }),
    theme: {
      line: {
        line: { width: 3 },
      },
    },
  };

  // Custom axis colors via theme.axis.
  customAxisConfig: NgeChartConfig = {
    ...createComparisonAreaChartConfig({
      data: this.sampleData,
      seriesColors: ['#607D8B', '#455A64'],
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Year',
      yAxisLabel: 'Balance ($K)',
    }),
    theme: {
      axis: {
        labelColor: '#333333',
        lineColor: '#CCCCCC',
        tickColor: '#666666',
      },
    },
  };

  // Custom gridlines via theme.grid.
  gridThemedConfig: NgeChartConfig = {
    ...createComparisonAreaChartConfig({
      data: this.sampleData,
      seriesColors: ['#3949AB', '#00ACC1'],
      showXAxis: true,
      showXGrid: true,
      showYAxis: true,
      showYGrid: true,
      xAxisLabel: 'Year',
      yAxisLabel: 'Balance ($K)',
    }),
    theme: {
      grid: {
        lineColor: '#5C6BC0',
        lineDash: '4 4',
        lineWidth: 1,
      },
    },
  };
}
