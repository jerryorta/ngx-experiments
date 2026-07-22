import { Component, computed, input, linkedSignal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig } from '../../../../core/config';

import { createDivergingBarChartConfig } from '../../../../presets/diverging-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'diverging-bar-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'diverging-bar-interaction-stories',
  standalone: true,
  styleUrl: './diverging-bar-interaction-stories.component.scss',
  templateUrl: './diverging-bar-interaction-stories.component.html',
})
export class DivergingBarInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/charts/src/lib/nge-chart/stories/diverging-bar-chart/interaction';

  // === Base - Margins ===
  readonly marginTop = input<number>(30);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(20);
  readonly marginLeft = input<number>(20);

  // === Data ===
  readonly value = input<number>(35);
  readonly min = input<number>(-100);
  readonly max = input<number>(100);
  readonly units = input<string>(' pts');
  readonly positiveColor = input<string>('');
  readonly negativeColor = input<string>('');

  // === Layer - Dimensions ===
  readonly barHeight = input<number>(10);
  readonly valueIndicatorHeight = input<number>(30);
  readonly valueIndicatorWidth = input<number>(5);
  readonly centerIndicatorHeight = input<number>(30);
  readonly centerIndicatorWidth = input<number>(3);
  readonly limitIndicatorHeight = input<number>(30);
  readonly limitIndicatorWidth = input<number>(2);

  // === Layer - Center Label ===
  readonly centerLabel = input<string>('Balanced');

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('above');
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);

  // The rendered value: seeded from the `value` control (and reset whenever that
  // control changes) but also writable by "Randomize Value".
  readonly currentValue = linkedSignal(() => this.value());

  randomizeValue(): void {
    const span = this.max() - this.min();
    this.currentValue.set(Math.round(this.min() + Math.random() * span));
  }

  // Computed config that rebuilds when any input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createDivergingBarChartConfig({
      barHeight: this.barHeight(),
      centerIndicatorHeight: this.centerIndicatorHeight(),
      centerIndicatorWidth: this.centerIndicatorWidth(),
      centerLabel: this.centerLabel(),
      data: {
        max: this.max(),
        min: this.min(),
        negativeColor: this.negativeColor() || undefined,
        positiveColor: this.positiveColor() || undefined,
        units: this.units(),
        value: this.currentValue(),
      },
      limitIndicatorHeight: this.limitIndicatorHeight(),
      limitIndicatorWidth: this.limitIndicatorWidth(),
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
      valueIndicatorHeight: this.valueIndicatorHeight(),
      valueIndicatorWidth: this.valueIndicatorWidth(),
    });

    // Apply margin overrides from the controls.
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
    };
  });
}
