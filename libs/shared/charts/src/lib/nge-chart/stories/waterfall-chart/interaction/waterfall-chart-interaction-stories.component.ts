import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeWaterfallDataPoint } from '../../../../core/config';

import { createWaterfallChartConfig } from '../../../../presets/waterfall-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'waterfall-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'waterfall-chart-interaction-stories',
  standalone: true,
  styleUrl: './waterfall-chart-interaction-stories.component.scss',
  templateUrl: './waterfall-chart-interaction-stories.component.html',
})
export class WaterfallChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/waterfall-chart/interaction';

  // === Base - Margins ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(55);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(55);

  // === Layer - Layout ===
  readonly barPadding = input<number>(0.2);
  readonly barRadius = input<number>(0);

  // === Layer - Visibility ===
  readonly connectors = input<boolean>(true);
  readonly cumulative = input<boolean>(false);
  readonly showLabels = input<boolean>(false);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);

  // === Layer - Axis Labels ===
  readonly xAxisLabel = input<string>('Movement');
  readonly yAxisLabel = input<string>('Revenue ($K)');

  // === Theme - Colors ===
  readonly riseColor = input<string>('');
  readonly fallColor = input<string>('');
  readonly totalColor = input<string>('');
  readonly cumulativeColor = input<string>('');

  // The rendered movements — re-rolled by "Randomize Data".
  readonly liveData = signal<NgeWaterfallDataPoint[]>(this.buildData());

  // Computed config that rebuilds when any input changes.
  readonly config = computed<NgeChartConfig>(() =>
    createWaterfallChartConfig({
      barPadding: this.barPadding(),
      barRadius: this.barRadius(),
      connectors: this.connectors(),
      cumulative: this.cumulative(),
      cumulativeColor: this.cumulativeColor() || undefined,
      data: this.liveData(),
      fallColor: this.fallColor() || undefined,
      margin: {
        bottom: this.marginBottom(),
        left: this.marginLeft(),
        right: this.marginRight(),
        top: this.marginTop(),
      },
      riseColor: this.riseColor() || undefined,
      showLabels: this.showLabels(),
      showTooltip: this.showTooltip(),
      totalColor: this.totalColor() || undefined,
      xAxisLabel: this.xAxisLabel(),
      yAxisLabel: this.yAxisLabel(),
    })
  );

  randomizeData(): void {
    this.liveData.set(this.buildData());
  }

  // Fresh signed movements between a fixed opening balance and closing total.
  private buildData(): NgeWaterfallDataPoint[] {
    const rand = (lo: number, hi: number): number => Math.round(lo + Math.random() * (hi - lo));
    return [
      { label: 'Start', value: rand(80, 160) },
      { label: 'Product A', value: rand(-20, 60) },
      { label: 'Product B', value: rand(-40, 40) },
      { label: 'Services', value: rand(-10, 50) },
      { label: 'Returns', value: rand(-40, 0) },
      { kind: 'total', label: 'Net', value: 0 },
    ];
  }
}
