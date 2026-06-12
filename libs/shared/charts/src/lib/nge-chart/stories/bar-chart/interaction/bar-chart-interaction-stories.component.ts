import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
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
    class: 'bar-chart-interaction-stories',
  },
  imports: [
    CommonModule,
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
  ],
  selector: 'nge-bar-chart-interaction-stories',
  standalone: true,
  styleUrl: './bar-chart-interaction-stories.component.scss',
  templateUrl: './bar-chart-interaction-stories.component.html',
})
export class BarChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bar-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(20);
  readonly marginLeft = input<number>(10);

  // Layer config inputs
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly showLabels = input<boolean>(true);
  readonly showTooltip = input<boolean>(false);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(120);
  readonly showXAxis = input<boolean>(false);
  readonly showYAxis = input<boolean>(false);
  readonly xAxisLabel = input<string>('');
  readonly yAxisLabel = input<string>('');
  readonly showMeanLine = input<boolean>(false);
  readonly showMedianLine = input<boolean>(false);

  // Theme inputs - Bar styling
  readonly barColor = input<string>('');
  readonly barHoverColor = input<string>('');
  readonly barRadius = input<number>(4);

  // Theme inputs - Label styling
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(12);

  // Theme inputs - Axis styling
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Theme inputs - Statistical styling
  readonly statisticalLabelFontSize = input<number>(12);
  readonly statisticalLabelFontWeight = input<number>(500);

  // Sample data as signal for dynamic updates
  readonly sampleData = signal<NgeBarDataPoint[]>([
    { label: 'Jan', value: 30 },
    { label: 'Feb', value: 45 },
    { label: 'Mar', value: 60 },
    { label: 'Apr', value: 35 },
    { label: 'May', value: 50 },
    { label: 'Jun', value: 70 },
  ]);

  // Randomize data values
  randomizeData(): void {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    this.sampleData.set(
      months.map(label => ({
        label,
        value: Math.floor(Math.random() * 80) + 10,
      }))
    );
  }

  // Computed config that rebuilds when any input changes
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createBarChartConfig({
      data: this.sampleData(),
      orientation: this.orientation(),
      showLabels: this.showLabels(),
      showMeanLine: this.showMeanLine(),
      showMedianLine: this.showMedianLine(),
      showXAxis: this.showXAxis(),
      showYAxis: this.showYAxis(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            height: this.tooltipHeight(),
            position: this.tooltipPosition(),
            style: {
              backgroundColor: this.tooltipBackgroundColor() || undefined,
              borderColor: this.tooltipBorderColor() || undefined,
              borderWidth: this.tooltipBorderWidth(),
              divotHeight: this.tooltipDivotHeight(),
              divotWidth: this.tooltipDivotWidth(),
            },
            width: this.tooltipWidth(),
          }
        : undefined,
      xAxisLabel: this.xAxisLabel() || undefined,
      yAxisLabel: this.yAxisLabel() || undefined,
    });

    // Apply base and theme overrides from controls
    return {
      ...baseConfig,
      base: {
        ...baseConfig.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      theme: {
        axis: {
          labelFontSize: this.axisLabelFontSize(),
          tickFontSize: this.axisTickFontSize(),
        },
        bar: {
          bar: {
            color: this.barColor() || undefined,
            hoverColor: this.barHoverColor() || undefined,
            radius: this.barRadius(),
          },
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
          },
          statistical: {
            labelFontSize: this.statisticalLabelFontSize(),
            labelFontWeight: this.statisticalLabelFontWeight(),
          },
        },
      },
    };
  });
}
