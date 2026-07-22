import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeLollipopDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createLollipopChartConfig } from '../../../../presets/lollipop-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Customer-satisfaction score by city — the single-series baseline dataset. */
const CITY_SCORES: NgeLollipopDataPoint[] = [
  { category: 'Austin', value: 78 },
  { category: 'Denver', value: 64 },
  { category: 'Seattle', value: 55 },
  { category: 'Portland', value: 71 },
  { category: 'Miami', value: 88 },
  { category: 'Chicago', value: 47 },
];

/** Median rent 2020 → 2024 ($) — a before/after pair per city (dumbbell data). */
const RENT_CHANGE: NgeLollipopDataPoint[] = [
  { category: 'Austin', value: 1450, valueEnd: 1980 },
  { category: 'Denver', value: 1600, valueEnd: 1875 },
  { category: 'Seattle', value: 1900, valueEnd: 2350 },
  { category: 'Portland', value: 1550, valueEnd: 1790 },
  { category: 'Miami', value: 1700, valueEnd: 2450 },
];

/** Market share % 2019 → 2024 — three series across two categories (slope data). */
const MARKET_SHARE: NgeLollipopDataPoint[] = [
  { category: '2019', seriesId: 'Brand A', value: 32 },
  { category: '2024', seriesId: 'Brand A', value: 48 },
  { category: '2019', seriesId: 'Brand B', value: 55 },
  { category: '2024', seriesId: 'Brand B', value: 38 },
  { category: '2019', seriesId: 'Brand C', value: 20 },
  { category: '2024', seriesId: 'Brand C', value: 41 },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'lollipop-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'lollipop-chart-usage-stories',
  standalone: true,
  styleUrl: './lollipop-chart-usage-stories.component.scss',
  templateUrl: './lollipop-chart-usage-stories.component.html',
})
export class LollipopChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/lollipop-chart/usage';

  cityScores: NgeLollipopDataPoint[] = CITY_SCORES;

  // ============================================
  // EXAMPLE 1: Basic Lollipop
  // ============================================
  // A stem from the baseline to an end marker per category — the defaults. Reads
  // like a bar chart with far less ink, so many categories stay legible.
  basicConfig = createLollipopChartConfig({
    data: this.cityScores,
    xAxisLabel: 'City',
    yAxisLabel: 'Satisfaction',
  });

  // ============================================
  // EXAMPLE 2: Dot Plot
  // ============================================
  // `showStem: false` drops the stems for a bare dot plot — pure marker positions,
  // the minimal-ink reading of the same comparison.
  dotPlotConfig = createLollipopChartConfig({
    data: this.cityScores,
    showLabels: true,
    showStem: false,
    xAxisLabel: 'City',
    yAxisLabel: 'Satisfaction',
  });

  // ============================================
  // EXAMPLE 3: Dumbbell / Span
  // ============================================
  // Each row carries a `valueEnd`, so a category renders two markers joined by a
  // span segment (the baseline stem is dropped) — ideal for before → after deltas.
  dumbbellConfig = createLollipopChartConfig({
    data: RENT_CHANGE,
    showTooltip: true,
    xAxisLabel: 'City',
    yAxisLabel: 'Median Rent ($)',
  });

  // ============================================
  // EXAMPLE 4: Slope Chart
  // ============================================
  // `connect: true` joins same-`seriesId` markers across categories into a slope
  // line, so each brand's rise / fall between the two years reads at a glance.
  slopeConfig = createLollipopChartConfig({
    connect: true,
    data: MARKET_SHARE,
    seriesColors: ['#1E88E5', '#E53935', '#43A047'],
    showLabels: true,
    xAxisLabel: 'Year',
    yAxisLabel: 'Market Share (%)',
  });

  // ============================================
  // EXAMPLE 5: Click to Inspect a Marker
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickConfig = createLollipopChartConfig({
    data: this.cityScores,
    onClick: (event: NgeChartLayerClickEvent<NgeLollipopDataPoint>) => {
      this.lastClicked.set(`${event.data.category}: ${event.data.value}`);
    },
    xAxisLabel: 'City',
    yAxisLabel: 'Satisfaction',
  });

  // ============================================
  // EXAMPLE 6: Dynamic Data With Signals
  // ============================================
  readonly liveData = signal<NgeLollipopDataPoint[]>(this.buildData());

  readonly dynamicConfig = computed(() =>
    createLollipopChartConfig({
      data: this.liveData(),
      showLabels: true,
      xAxisLabel: 'City',
      yAxisLabel: 'Satisfaction',
    })
  );

  // ============================================
  // EXAMPLE 7: Shapes & Orientation
  // ============================================
  // `orientation: 'horizontal'` swaps categories onto the y axis, `shape: 'diamond'`
  // changes the marker glyph, and `showLabels` prints each value.
  horizontalConfig = createLollipopChartConfig({
    data: this.cityScores,
    markerSize: 7,
    orientation: 'horizontal',
    shape: 'diamond',
    showLabels: true,
    xAxisLabel: 'Satisfaction',
    yAxisLabel: 'City',
  });

  randomizeData(): void {
    this.liveData.set(this.buildData());
  }

  // Fresh satisfaction scores for the fixed set of cities.
  private buildData(): NgeLollipopDataPoint[] {
    const rand = (lo: number, hi: number): number => Math.round(lo + Math.random() * (hi - lo));
    return CITY_SCORES.map(point => ({ category: point.category, value: rand(40, 95) }));
  }
}
