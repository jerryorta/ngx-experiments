import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeGaugeDataPoint,
  NgeGaugeIndicator,
  NgeGaugeShape,
  NgeGaugeThreshold,
} from '../../../../core/config';

import { createGaugeChartConfig } from '../../../../presets/gauge-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'gauge-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'gauge-interaction-stories',
  standalone: true,
  styleUrl: './gauge-interaction-stories.component.scss',
  templateUrl: './gauge-interaction-stories.component.html',
})
export class GaugeInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/gauge/interaction';

  // Base - Margins
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // Layer - Shape
  readonly shape = input<NgeGaugeShape>('arc');
  readonly indicator = input<NgeGaugeIndicator>('fill');

  // Layer - Geometry (arc only)
  readonly startAngle = input<number>(-2.36); // ≈ -0.75π
  readonly endAngle = input<number>(2.36); //    ≈  0.75π
  readonly innerRadius = input<number>(0.65);

  // Layer - Value
  readonly value = input<number>(72);
  readonly min = input<number>(0);
  readonly max = input<number>(100);
  readonly showValueLabel = input<boolean>(true);

  // Layer - Thresholds
  readonly showThresholds = input<boolean>(false);

  // Layer - Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);

  // Theme - Value fill
  readonly valueColor = input<string>('');
  readonly valueOpacity = input<number>(1);

  // Theme - Track
  readonly trackColor = input<string>('');
  readonly trackOpacity = input<number>(1);

  // Theme - Needle (arc + needle)
  readonly needleColor = input<string>('');
  readonly needleWidth = input<number>(2);

  // Theme - Label
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(20);
  readonly labelFontWeight = input<number>(600);

  // Ascending threshold bands (33% / 66% / 100% of the range), supplied only when
  // the showThresholds control is on.
  private readonly thresholds = computed<NgeGaugeThreshold[]>(() => {
    const lo = this.min();
    const span = this.max() - lo;
    return [{ value: lo + span * 0.33 }, { value: lo + span * 0.66 }, { value: this.max() }];
  });

  // Computed config rebuilds whenever any control changes.
  readonly config = computed<NgeChartConfig>(() => {
    const datum: NgeGaugeDataPoint = {
      max: this.max(),
      min: this.min(),
      units: '%',
      value: this.value(),
    };

    const baseConfig = createGaugeChartConfig({
      data: datum,
      endAngle: this.endAngle(),
      indicator: this.indicator(),
      innerRadius: this.innerRadius(),
      shape: this.shape(),
      showValueLabel: this.showValueLabel(),
      startAngle: this.startAngle(),
      thresholds: this.showThresholds() ? this.thresholds() : undefined,
      tooltip: this.showTooltip()
        ? {
            enabled: true,
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
        gauge: {
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          needle: {
            color: this.needleColor() || undefined,
            width: this.needleWidth(),
          },
          track: {
            color: this.trackColor() || undefined,
            opacity: this.trackOpacity(),
          },
          value: {
            color: this.valueColor() || undefined,
            opacity: this.valueOpacity(),
          },
        },
      },
    };
  });
}
