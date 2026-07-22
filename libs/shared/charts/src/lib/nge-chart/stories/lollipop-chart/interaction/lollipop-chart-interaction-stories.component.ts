import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLollipopDataPoint } from '../../../../core/config';

import { createLollipopChartConfig } from '../../../../presets/lollipop-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** The base cities for the interaction playground (one shared series). */
const CITIES = ['Austin', 'Denver', 'Seattle', 'Portland', 'Miami', 'Chicago'] as const;

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'lollipop-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'lollipop-chart-interaction-stories',
  standalone: true,
  styleUrl: './lollipop-chart-interaction-stories.component.scss',
  templateUrl: './lollipop-chart-interaction-stories.component.html',
})
export class LollipopChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/lollipop-chart/interaction';

  // === Base - Margins ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // === Layer - Layout ===
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly shape = input<'circle' | 'diamond' | 'square'>('circle');
  readonly baseline = input<number>(0);
  readonly markerSize = input<number>(5);

  // === Layer - Visibility ===
  readonly showStem = input<boolean>(true);
  readonly connect = input<boolean>(false);
  readonly showLabels = input<boolean>(false);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);

  // === Layer - Axis Labels ===
  readonly xAxisLabel = input<string>('City');
  readonly yAxisLabel = input<string>('Satisfaction');

  // === Theme - Marker ===
  readonly markerColor = input<string>('');
  readonly markerStrokeColor = input<string>('');

  // === Theme - Stem ===
  readonly stemColor = input<string>('');
  readonly stemWidth = input<number>(2);

  // === Theme - Label ===
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);

  // The rendered scores — one shared series so `connect` draws a trend line and
  // `markerColor` (fed through `seriesColors`) recolors the series. Re-rolled by
  // "Randomize Data".
  readonly liveData = signal<NgeLollipopDataPoint[]>(this.buildData());

  // Computed config that rebuilds when any input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const marker = this.markerColor();

    const base = createLollipopChartConfig({
      baseline: this.baseline(),
      connect: this.connect(),
      data: this.liveData(),
      markerSize: this.markerSize(),
      orientation: this.orientation(),
      seriesColors: marker ? [marker] : undefined,
      shape: this.shape(),
      showLabels: this.showLabels(),
      showStem: this.showStem(),
      showTooltip: this.showTooltip(),
      xAxisLabel: this.xAxisLabel(),
      yAxisLabel: this.yAxisLabel(),
    });

    return {
      ...base,
      base: {
        ...base.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      theme: {
        lollipop: {
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
          },
          marker: {
            strokeColor: this.markerStrokeColor() || undefined,
          },
          stem: {
            color: this.stemColor() || undefined,
            width: this.stemWidth(),
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.liveData.set(this.buildData());
  }

  // Fresh satisfaction scores for the fixed cities, all in one series.
  private buildData(): NgeLollipopDataPoint[] {
    const rand = (lo: number, hi: number): number => Math.round(lo + Math.random() * (hi - lo));
    return CITIES.map(category => ({ category, seriesId: 'Satisfaction', value: rand(40, 95) }));
  }
}
