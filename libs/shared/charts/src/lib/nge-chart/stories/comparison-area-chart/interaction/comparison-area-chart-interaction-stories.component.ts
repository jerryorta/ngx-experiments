import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';

import { createComparisonAreaChartConfig } from '../../../../presets/comparison-area-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'comparison-area-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'comparison-area-chart-interaction-stories',
  standalone: true,
  styleUrl: './comparison-area-chart-interaction-stories.component.scss',
  templateUrl: './comparison-area-chart-interaction-stories.component.html',
})
export class ComparisonAreaChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/charts/src/lib/nge-chart/stories/comparison-area-chart/interaction';

  // Base - Margins
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(60);

  // Layer
  readonly showArea = input<boolean>(true);
  readonly areaOpacity = input<number>(0.15);
  readonly curveType = input<'linear' | 'monotone' | 'step'>('monotone');
  readonly showPoints = input<boolean>(false);

  // Legend
  readonly legendEnabled = input<boolean>(true);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('bottom');

  // Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(140);

  // Axis labels
  readonly xAxisLabel = input<string>('Year');
  readonly yAxisLabel = input<string>('Remaining balance');

  // Fixed multi-loan comparison seed; the button re-rolls it with fresh rates.
  readonly seedData = signal<NgeLineDataPoint[]>(this.buildLoans());

  // Rebuilds whenever any control (or the re-rolled seed) changes — the preset is
  // called directly, keeping this story focused on createComparisonAreaChartConfig.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createComparisonAreaChartConfig({
      areaOpacity: this.areaOpacity(),
      curveType: this.curveType(),
      data: this.seedData(),
      legend: this.legendEnabled()
        ? { enabled: true, position: this.legendPosition() }
        : { enabled: false },
      showArea: this.showArea(),
      showPoints: this.showPoints(),
      showXAxis: true,
      showYAxis: true,
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            height: this.tooltipHeight(),
            position: this.tooltipPosition(),
            width: this.tooltipWidth(),
          }
        : undefined,
      xAxisLabel: this.xAxisLabel() || undefined,
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

  // Re-roll the seed with fresh rates.
  randomizeData(): void {
    this.seedData.set(this.buildLoans());
  }

  // Three 30-year loans on a $400K principal, each with a slightly different rate,
  // emitted as yearly remaining-balance points so the overlaid bands diverge.
  private buildLoans(): NgeLineDataPoint[] {
    const labels = ['Loan A', 'Loan B', 'Loan C'];
    return labels.flatMap((label, index) => {
      const annualRatePct = 5.5 + Math.random() * 2 + index * 0.1;
      return this.amortizeBalance(label, 400_000, annualRatePct, 30);
    });
  }

  // Deterministic yearly remaining-balance schedule for one loan.
  private amortizeBalance(
    loanLabel: string,
    principal: number,
    annualRatePct: number,
    termYears: number
  ): NgeLineDataPoint[] {
    const monthlyRate = annualRatePct / 100 / 12;
    const totalMonths = termYears * 12;
    const growthFactor = (1 + monthlyRate) ** totalMonths;
    const monthlyPayment =
      monthlyRate === 0
        ? principal / totalMonths
        : (principal * monthlyRate * growthFactor) / (growthFactor - 1);

    const points: NgeLineDataPoint[] = [{ seriesId: loanLabel, x: 0, y: principal }];
    let balance = principal;
    for (let year = 1; year <= termYears; year++) {
      for (let month = 0; month < 12; month++) {
        balance -= monthlyPayment - balance * monthlyRate;
      }
      points.push({ seriesId: loanLabel, x: year, y: Math.max(0, Math.round(balance)) });
    }
    return points;
  }
}
