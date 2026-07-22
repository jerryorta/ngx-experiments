import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartBaseConfig } from '../../../../core/base-layout';
import type { NgeDivergingBarDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createDivergingBarChartConfig } from '../../../../presets/diverging-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'diverging-bar-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'diverging-bar-usage-stories',
  standalone: true,
  styleUrl: './diverging-bar-usage-stories.component.scss',
  templateUrl: './diverging-bar-usage-stories.component.html',
})
export class DivergingBarUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/diverging-bar-chart/usage';

  // Shared margin: the center-label bubble renders above the plot, so the top
  // margin must leave room for it (the chart container clips overflow).
  private readonly chartMargin: NgeChartBaseConfig['margin'] = {
    bottom: 12,
    left: 16,
    right: 16,
    top: 30,
  };

  // ============================================
  // EXAMPLE 1: Basic Usage
  // ============================================
  basicData: NgeDivergingBarDataPoint = {
    max: 100,
    min: -100,
    units: ' pts',
    value: 35,
  };

  basicConfig = createDivergingBarChartConfig({
    data: this.basicData,
    margin: this.chartMargin,
  });

  // ============================================
  // EXAMPLE 2: With Tooltip
  // ============================================
  tooltipData: NgeDivergingBarDataPoint = {
    max: 100,
    min: -100,
    units: ' pts',
    value: 42,
  };

  tooltipConfig = createDivergingBarChartConfig({
    data: this.tooltipData,
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 3: Positive vs Negative (market momentum)
  // ============================================
  sellersMarketConfig = createDivergingBarChartConfig({
    centerLabel: 'Balanced',
    data: { max: 100, min: -100, units: ' pts', value: 62 },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  balancedMarketConfig = createDivergingBarChartConfig({
    centerLabel: 'Balanced',
    data: { max: 100, min: -100, units: ' pts', value: 4 },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  buyersMarketConfig = createDivergingBarChartConfig({
    centerLabel: 'Balanced',
    data: { max: 100, min: -100, units: ' pts', value: -58 },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 4: Custom Colors (via the data point)
  // ============================================
  customColorsConfig = createDivergingBarChartConfig({
    data: {
      max: 100,
      min: -100,
      negativeColor: '#EF6C00', // orange for negative
      positiveColor: '#1E88E5', // blue for positive
      units: '%',
      value: 28,
    },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 5: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createDivergingBarChartConfig({
    data: { max: 100, min: -100, units: ' pts', value: 18 },
    margin: this.chartMargin,
    onClick: (event: NgeChartLayerClickEvent<NgeDivergingBarDataPoint>) => {
      const sign = event.data.value > 0 ? '+' : '';
      this.lastClicked.set(`${sign}${event.data.value}${event.data.units ?? ''}`);
    },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 6: Dynamic Data with Signals
  // ============================================
  readonly dynamicValue = signal(30);

  readonly dynamicData = computed<NgeDivergingBarDataPoint>(() => ({
    max: 100,
    min: -100,
    units: ' pts',
    value: this.dynamicValue(),
  }));

  readonly dynamicConfig = computed(() =>
    createDivergingBarChartConfig({
      data: this.dynamicData(),
      margin: this.chartMargin,
      tooltip: { enabled: true },
    })
  );

  incrementValue(): void {
    this.dynamicValue.update(v => Math.min(100, v + 20));
  }

  decrementValue(): void {
    this.dynamicValue.update(v => Math.max(-100, v - 20));
  }

  randomizeValue(): void {
    this.dynamicValue.set(Math.floor(Math.random() * 201) - 100);
  }

  // ============================================
  // EXAMPLE 7: Custom Center Label
  // ============================================
  centerLabelConfig = createDivergingBarChartConfig({
    centerLabel: 'Fair Value',
    data: { max: 50, min: -50, units: '%', value: -12 },
    margin: this.chartMargin,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 8: Custom Dimensions
  // ============================================
  customDimensionsConfig = createDivergingBarChartConfig({
    barHeight: 16,
    centerIndicatorHeight: 46,
    centerIndicatorWidth: 4,
    data: { max: 100, min: -100, units: ' pts', value: 48 },
    limitIndicatorHeight: 40,
    limitIndicatorWidth: 3,
    margin: this.chartMargin,
    tooltip: { enabled: true },
    valueIndicatorHeight: 46,
    valueIndicatorWidth: 8,
  });
}
