import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartBaseConfig } from '../../../../core/base-layout';
import type { NgeDivergingBarDataPoint } from '../../../../core/config';

import { createDivergingBarChartConfig } from '../../../../presets/diverging-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'diverging-bar-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'diverging-bar-theming',
  standalone: true,
  styleUrl: './diverging-bar-theming.component.scss',
  templateUrl: './diverging-bar-theming.component.html',
})
export class DivergingBarThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/diverging-bar-chart/theming';

  // The center-label bubble renders above the plot, so leave room in the top margin.
  private readonly chartMargin: NgeChartBaseConfig['margin'] = {
    bottom: 12,
    left: 16,
    right: 16,
    top: 30,
  };

  // Sample data - a mildly positive value so the positive color is visible.
  sampleData: NgeDivergingBarDataPoint = {
    max: 100,
    min: -100,
    units: ' pts',
    value: 45,
  };

  // Default theme (built-in green / red)
  defaultConfig = createDivergingBarChartConfig({
    data: this.sampleData,
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // Blue / orange
  blueConfig = createDivergingBarChartConfig({
    data: { ...this.sampleData, negativeColor: '#EF6C00', positiveColor: '#1E88E5' },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // Teal / rose
  tealConfig = createDivergingBarChartConfig({
    data: { ...this.sampleData, negativeColor: '#E53935', positiveColor: '#00897B' },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // Purple / amber
  purpleConfig = createDivergingBarChartConfig({
    data: { ...this.sampleData, negativeColor: '#FB8C00', positiveColor: '#8E24AA' },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // Indigo / pink
  indigoConfig = createDivergingBarChartConfig({
    data: { ...this.sampleData, negativeColor: '#D81B60', positiveColor: '#3949AB' },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // Positive / negative states of a single color pair
  positiveStateConfig = createDivergingBarChartConfig({
    data: { max: 100, min: -100, positiveColor: '#2E7D32', units: ' pts', value: 68 },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  negativeStateConfig = createDivergingBarChartConfig({
    data: { max: 100, min: -100, negativeColor: '#C62828', units: ' pts', value: -68 },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // Dark surface - colors chosen to pop on a dark background
  darkConfig = createDivergingBarChartConfig({
    data: {
      max: 100,
      min: -100,
      negativeColor: '#EC407A',
      positiveColor: '#26C6DA',
      units: ' pts',
      value: 52,
    },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // Transparency effects via rgba data colors
  transparencyConfig = createDivergingBarChartConfig({
    data: {
      max: 100,
      min: -100,
      negativeColor: 'rgba(244, 67, 54, 0.55)',
      positiveColor: 'rgba(76, 175, 80, 0.6)',
      units: ' pts',
      value: 40,
    },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // Custom dimensions (preset layer options) combined with a custom color
  thickBarConfig = createDivergingBarChartConfig({
    barHeight: 20,
    centerIndicatorHeight: 50,
    centerIndicatorWidth: 4,
    data: { max: 100, min: -100, positiveColor: '#5E35B1', units: ' pts', value: 54 },
    limitIndicatorHeight: 44,
    limitIndicatorWidth: 4,
    margin: this.chartMargin,
    tooltip: { enabled: true },
    valueIndicatorHeight: 50,
    valueIndicatorWidth: 10,
  });
}
