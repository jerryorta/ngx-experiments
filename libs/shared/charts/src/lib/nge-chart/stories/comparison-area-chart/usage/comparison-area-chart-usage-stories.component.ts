import { CurrencyPipe } from '@angular/common';
import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeLineDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createComparisonAreaChartConfig } from '../../../../presets/comparison-area-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'comparison-area-chart-usage-stories',
  },
  imports: [CurrencyPipe, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'comparison-area-chart-usage-stories',
  standalone: true,
  styleUrl: './comparison-area-chart-usage-stories.component.scss',
  templateUrl: './comparison-area-chart-usage-stories.component.html',
})
export class ComparisonAreaChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/comparison-area-chart/usage';

  /** Same starting principal shared by every competing loan scenario. */
  readonly comparisonPrincipal = 400_000;

  // ============================================
  // EXAMPLE 1: Remaining Balance Over Term
  // ============================================
  balanceData: NgeLineDataPoint[] = [
    ...this.amortize('30-yr @ 6.5%', this.comparisonPrincipal, 6.5, 30, 'balance'),
    ...this.amortize('15-yr @ 5.75%', this.comparisonPrincipal, 5.75, 15, 'balance'),
    ...this.amortize('30-yr refi @ 6.0%', this.comparisonPrincipal, 6, 30, 'balance'),
  ];

  balanceConfig = createComparisonAreaChartConfig({
    data: this.balanceData,
    margin: { bottom: 45, left: 72, right: 20, top: 20 },
    seriesColors: ['#2196F3', '#4CAF50', '#FF9800'],
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Year',
    yAxisLabel: 'Remaining balance',
  });

  // ============================================
  // EXAMPLE 2: Cumulative Interest Paid
  // ============================================
  interestData: NgeLineDataPoint[] = [
    ...this.amortize('30-yr @ 6.5%', this.comparisonPrincipal, 6.5, 30, 'interest'),
    ...this.amortize('15-yr @ 5.75%', this.comparisonPrincipal, 5.75, 15, 'interest'),
    ...this.amortize('30-yr refi @ 6.0%', this.comparisonPrincipal, 6, 30, 'interest'),
  ];

  interestConfig = createComparisonAreaChartConfig({
    data: this.interestData,
    margin: { bottom: 45, left: 72, right: 20, top: 20 },
    seriesColors: ['#2196F3', '#4CAF50', '#FF9800'],
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Year',
    yAxisLabel: 'Cumulative interest',
  });

  // ============================================
  // EXAMPLE 3: Click to Select a Scenario
  // ============================================
  clickData: NgeLineDataPoint[] = [
    ...this.amortize('30-yr @ 6.5%', this.comparisonPrincipal, 6.5, 30, 'balance'),
    ...this.amortize('15-yr @ 5.75%', this.comparisonPrincipal, 5.75, 15, 'balance'),
  ];

  readonly lastSelected = signal<string>('None');

  clickConfig = createComparisonAreaChartConfig({
    data: this.clickData,
    onClick: (event: NgeChartLayerClickEvent<NgeLineDataPoint>) => {
      this.lastSelected.set(
        `${event.data.seriesId} — year ${event.data.x}: $${event.data.y.toLocaleString()}`
      );
    },
    showPoints: true,
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Year',
    yAxisLabel: 'Remaining balance',
  });

  // ============================================
  // EXAMPLE 4: Dynamic Rates With Signals
  // ============================================
  readonly loans = signal<{ label: string; rate: number; termYears: number }[]>([
    { label: '30-yr', rate: 6.5, termYears: 30 },
    { label: '15-yr', rate: 5.75, termYears: 15 },
    { label: 'Refi', rate: 6, termYears: 30 },
  ]);

  readonly dynamicConfig = computed(() =>
    createComparisonAreaChartConfig({
      data: this.loans().flatMap(loan =>
        this.amortize(
          `${loan.label} @ ${loan.rate}%`,
          this.comparisonPrincipal,
          loan.rate,
          loan.termYears,
          'balance'
        )
      ),
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Year',
      yAxisLabel: 'Remaining balance',
    })
  );

  randomizeRates(): void {
    this.loans.set([
      { label: '30-yr', rate: this.rollRate(5.5, 7.5), termYears: 30 },
      { label: '15-yr', rate: this.rollRate(5, 6.75), termYears: 15 },
      { label: 'Refi', rate: this.rollRate(5.5, 7), termYears: 30 },
    ]);
  }

  /**
   * Deterministic standard-amortization schedule for one loan, emitting a single
   * point per whole year (x = year 0…termYears). `metric` selects the y value —
   * the remaining balance or the cumulative interest paid to that point. No
   * randomness: identical inputs always produce an identical series.
   */
  private amortize(
    loanLabel: string,
    principal: number,
    annualRatePct: number,
    termYears: number,
    metric: 'balance' | 'interest'
  ): NgeLineDataPoint[] {
    const monthlyRate = annualRatePct / 100 / 12;
    const totalMonths = termYears * 12;

    // M = P·r·(1+r)^n / ((1+r)^n − 1); the (1+r)^n form avoids a negative exponent.
    const growthFactor = (1 + monthlyRate) ** totalMonths;
    const monthlyPayment =
      monthlyRate === 0
        ? principal / totalMonths
        : (principal * monthlyRate * growthFactor) / (growthFactor - 1);

    const points: NgeLineDataPoint[] = [];
    let balance = principal;
    let cumulativeInterest = 0;

    // Year 0 — starting state before the first payment.
    points.push({
      seriesId: loanLabel,
      x: 0,
      y: metric === 'balance' ? balance : cumulativeInterest,
    });

    for (let year = 1; year <= termYears; year++) {
      for (let month = 0; month < 12; month++) {
        const interestForMonth = balance * monthlyRate;
        const principalForMonth = monthlyPayment - interestForMonth;
        balance -= principalForMonth;
        cumulativeInterest += interestForMonth;
      }
      points.push({
        seriesId: loanLabel,
        x: year,
        y: Math.max(0, Math.round(metric === 'balance' ? balance : cumulativeInterest)),
      });
    }

    return points;
  }

  private rollRate(min: number, max: number): number {
    return Math.round((Math.random() * (max - min) + min) * 100) / 100;
  }
}
