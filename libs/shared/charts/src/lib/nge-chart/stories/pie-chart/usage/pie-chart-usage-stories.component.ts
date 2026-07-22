import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgePieDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { extractPieChartLegendItems } from '../../../../core/legend';
import { createPieChartConfig } from '../../../../presets/pie-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'pie-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'pie-chart-usage-stories',
  standalone: true,
  styleUrl: './pie-chart-usage-stories.component.scss',
  templateUrl: './pie-chart-usage-stories.component.html',
})
export class PieChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pie-chart/usage';

  // Shared monthly-budget dataset — one slice per category, in input order.
  private readonly budgetData: NgePieDataPoint[] = [
    { label: 'Rent', value: 1800 },
    { label: 'Food', value: 600 },
    { label: 'Transit', value: 300 },
    { label: 'Utilities', value: 250 },
    { label: 'Savings', value: 450 },
  ];

  // ============================================
  // EXAMPLE 1: Basic Pie
  // ============================================
  basicConfig = createPieChartConfig({
    data: this.budgetData,
  });

  // ============================================
  // EXAMPLE 2: Donut (innerRadius ratio)
  // ============================================
  donutConfig = createPieChartConfig({
    data: this.budgetData,
    innerRadius: 0.6,
  });

  // ============================================
  // EXAMPLE 3: Semi-circle Donut (gauge sweep)
  // ============================================
  semiCircleConfig = createPieChartConfig({
    data: this.budgetData,
    endAngle: Math.PI / 2,
    innerRadius: 0.5,
    startAngle: -Math.PI / 2,
  });

  // ============================================
  // EXAMPLE 4: Custom Slice Colors
  // ============================================
  customColorsConfig = createPieChartConfig({
    data: this.budgetData,
    seriesColors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1'],
  });

  // ============================================
  // EXAMPLE 5: Tooltip on Hover
  // ============================================
  tooltipConfig = createPieChartConfig({
    data: this.budgetData,
    innerRadius: 0.5,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 6: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createPieChartConfig({
    data: this.budgetData,
    onClick: (event: NgeChartLayerClickEvent<NgePieDataPoint>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 7: With a Legend (categorical — pair with extractPieChartLegendItems)
  // ============================================
  readonly legendData = signal<NgePieDataPoint[]>(this.budgetData);

  readonly legendConfig = computed<NgeChartConfig>(() => {
    const data = this.legendData();
    return {
      ...createPieChartConfig({
        data,
        innerRadius: 0.55,
        tooltip: { enabled: true },
      }),
      legend: {
        enabled: true,
        items: extractPieChartLegendItems(data),
        position: 'right',
        swatchShape: 'square',
      },
    };
  });

  randomizeLegendData(): void {
    this.legendData.set(
      this.budgetData.map(point => ({
        ...point,
        value: Math.round(100 + Math.random() * 1800),
      }))
    );
  }
}
