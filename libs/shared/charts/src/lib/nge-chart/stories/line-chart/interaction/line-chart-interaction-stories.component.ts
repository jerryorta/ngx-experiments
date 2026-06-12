import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
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
    class: 'line-chart-interaction-stories',
  },
  imports: [
    CommonModule,
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
  ],
  selector: 'nge-line-chart-interaction-stories',
  standalone: true,
  styleUrl: './line-chart-interaction-stories.component.scss',
  templateUrl: './line-chart-interaction-stories.component.html',
})
export class LineChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/line-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // Layer config inputs
  readonly curveType = input<'linear' | 'monotone' | 'step'>('linear');
  readonly showPoints = input<boolean>(true);
  readonly showArea = input<boolean>(false);
  readonly areaOpacity = input<number>(0.3);
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(140);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);
  readonly xAxisLabel = input<string>('xAxisLabel');
  readonly yAxisLabel = input<string>('yAxisLabel');

  // Theme inputs - Line styling
  readonly lineWidth = input<number>(2);
  readonly pointRadius = input<number>(4);
  readonly lineColor = input<string>('');

  // Theme inputs - Axis styling
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Sample data as signal for dynamic updates
  readonly sampleData = signal<NgeLineDataPoint[]>([
    { x: 'Jan', y: 30 },
    { x: 'Feb', y: 45 },
    { x: 'Mar', y: 60 },
    { x: 'Apr', y: 35 },
    { x: 'May', y: 50 },
    { x: 'Jun', y: 70 },
  ]);

  // Randomize data values
  randomizeData(): void {
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];
    this.sampleData.set(
      months.map(label => ({
        x: label,
        y: Math.floor(Math.random() * 80) + 10,
      }))
    );
  }

  // Computed config that rebuilds when any input changes
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createLineChartConfig({
      areaOpacity: this.areaOpacity(),
      curveType: this.curveType(),
      data: this.sampleData(),
      lineWidth: this.lineWidth(),
      pointRadius: this.pointRadius(),
      seriesColors: this.lineColor() ? [this.lineColor()] : undefined,
      showArea: this.showArea(),
      showPoints: this.showPoints(),
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
      },
    };
  });
}
