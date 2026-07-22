import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint, NgeChartConfig } from '../../../../core/config';

import { createParetoChartConfig } from '../../../../presets/pareto-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'pareto-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'pareto-chart-interaction-stories',
  standalone: true,
  styleUrl: './pareto-chart-interaction-stories.component.scss',
  templateUrl: './pareto-chart-interaction-stories.component.html',
})
export class ParetoChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pareto-chart/interaction';

  // === Base - Margins ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(60);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(55);

  // === Layer - Visibility ===
  readonly showLabels = input<boolean>(false);
  readonly sort = input<boolean>(true);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);

  // === Layer - Layout ===
  readonly barPadding = input<number>(0.2);
  readonly barRadius = input<number>(2);

  // === Layer - Axis Labels ===
  readonly xAxisLabel = input<string>('Category');
  readonly yAxisLabel = input<string>('Count');
  readonly y2AxisLabel = input<string>('Cumulative %');

  // === Theme - Colors ===
  readonly barColor = input<string>('');
  readonly lineColor = input<string>('');

  // Bumped by "Randomize Data" to re-roll the generated bars.
  private readonly randomizeSeed = signal(0);

  readonly sampleData = computed<NgeBarDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildData();
  });

  // Rebuilds when ANY control changes; control-driven margin layered over the preset.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createParetoChartConfig({
      barColor: this.barColor() || undefined,
      barPadding: this.barPadding(),
      barRadius: this.barRadius(),
      data: this.sampleData(),
      lineColor: this.lineColor() || undefined,
      showLabels: this.showLabels(),
      showTooltip: this.showTooltip(),
      sort: this.sort(),
      xAxisLabel: this.xAxisLabel() || undefined,
      y2AxisLabel: this.y2AxisLabel() || undefined,
      yAxisLabel: this.yAxisLabel() || undefined,
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
    };
  });

  randomizeData(): void {
    this.randomizeSeed.update(seed => seed + 1);
  }

  private buildData(): NgeBarDataPoint[] {
    const categories = ['Scratches', 'Dents', 'Misalignment', 'Discoloration', 'Cracks', 'Other'];
    return categories.map(label => ({ label, value: Math.floor(Math.random() * 50) + 5 }));
  }
}
