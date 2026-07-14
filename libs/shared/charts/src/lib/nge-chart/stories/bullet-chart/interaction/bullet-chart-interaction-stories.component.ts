import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBulletDataPoint, NgeChartConfig } from '../../../../core/config';

import { createBulletChartConfig } from '../../../../presets/bullet-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'bullet-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'bullet-chart-interaction-stories',
  standalone: true,
  styleUrl: './bullet-chart-interaction-stories.component.scss',
  templateUrl: './bullet-chart-interaction-stories.component.html',
})
export class BulletChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bullet-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // Layer config inputs - Dimensions
  readonly barHeight = input<number>(10);
  readonly progressIndicatorHeight = input<number>(30);
  readonly progressIndicatorWidth = input<number>(5);
  readonly limitIndicatorHeight = input<number>(30);
  readonly limitIndicatorWidth = input<number>(2);

  // Layer config inputs - Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipHeight = input<number>(50);
  readonly tooltipWidth = input<number>(80);
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);

  // Data inputs
  readonly progress = input<number>(65);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly color = input<string>('');

  // Theme inputs - Background Bar
  readonly backgroundBarColor = input<string>('');
  readonly backgroundBarHeight = input<number>(10);

  // Theme inputs - Progress Bar
  readonly progressBarColor = input<string>('');

  // Theme inputs - Progress Indicator
  readonly progressIndicatorColor = input<string>('');

  // Theme inputs - Limit Indicator
  readonly limitIndicatorColor = input<string>('');

  // Sample data as signal for dynamic updates
  readonly sampleData = signal<NgeBulletDataPoint>({
    max: 100,
    min: 0,
    progress: 65,
    units: '%',
  });

  // Randomize progress value
  randomizeProgress(): void {
    this.sampleData.update(data => ({
      ...data,
      progress: Math.floor(Math.random() * (data.max - data.min)) + data.min,
    }));
  }

  // Computed config that rebuilds when any input changes
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createBulletChartConfig({
      barHeight: this.barHeight(),
      data: {
        color: this.color() || undefined,
        max: this.max(),
        min: this.min(),
        progress: this.progress(),
      },
      limitIndicatorHeight: this.limitIndicatorHeight(),
      limitIndicatorWidth: this.limitIndicatorWidth(),
      progressIndicatorHeight: this.progressIndicatorHeight(),
      progressIndicatorWidth: this.progressIndicatorWidth(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            formatContent: data => ({
              extra: {
                max: data.max,
                min: data.min,
                progress: data.progress,
              },
              label: 'Progress',
              value: '',
            }),
            height: this.tooltipHeight(),
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
        bullet: {
          backgroundBar: {
            color: this.backgroundBarColor() || undefined,
            height: this.backgroundBarHeight(),
          },
          limitIndicator: {
            color: this.limitIndicatorColor() || undefined,
          },
          progressBar: {
            color: this.progressBarColor() || undefined,
          },
          progressIndicator: {
            color: this.progressIndicatorColor() || undefined,
          },
        },
      },
    };
  });
}
