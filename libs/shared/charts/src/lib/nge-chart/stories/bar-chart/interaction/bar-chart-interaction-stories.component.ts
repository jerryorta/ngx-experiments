import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint, NgeChartConfig } from '../../../../core/config';

import { NgeBarChartTransform } from '../../../../transforms/bar-chart.transform';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'bar-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'bar-chart-interaction-stories',
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

  // Interaction inputs (ARCH-174)
  /**
   * Enable wheel-zoom / drag-pan / brush-zoom gestures (double-click resets).
   * The band (category) axis windows by whole categories; the value axis
   * auto-fits to the visible window.
   */
  readonly enableGestures = input<boolean>(true);

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

  // Bumped by "Randomize Data" to re-roll the generated bars.
  private readonly randomizeSeed = signal(0);

  // 12 categorical months — enough to window into with band-window zoom.
  readonly sampleData = computed<NgeBarDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildData();
  });

  // Transform owns the interaction state (the category window) and derives the
  // preset config; the constructor effect keeps its options in sync with the
  // Storybook controls (window state survives control changes).
  readonly transform = new NgeBarChartTransform({ data: [] });

  constructor() {
    effect(() => {
      this.transform.updateOptions({
        data: this.sampleData(),
        gestures: this.enableGestures() ? { brushZoom: true, pan: true, zoom: true } : undefined,
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
    });
  }

  // Re-roll the generated data.
  randomizeData(): void {
    this.randomizeSeed.update(seed => seed + 1);
  }

  // 12 months of bars with random values.
  private buildData(): NgeBarDataPoint[] {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months.map(label => ({ label, value: Math.floor(Math.random() * 80) + 10 }));
  }

  // The transform's derived config with control-driven margin + theme layered on.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = this.transform.config();

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
