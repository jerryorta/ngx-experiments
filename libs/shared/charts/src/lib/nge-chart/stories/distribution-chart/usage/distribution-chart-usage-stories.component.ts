import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeDistributionDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createDistributionChartConfig } from '../../../../presets/distribution-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Deterministic ~normal sample: a seeded mulberry32 RNG averaged in threes
 * (central-limit) so every render summarises the SAME distributions — the box /
 * violin / point demos stay stable across change-detection cycles.
 */
function makeValues(count: number, center: number, spread: number, seed: number): number[] {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const bell = (next() + next() + next()) / 3; // ~normal, mean 0.5
    return Math.round(center + (bell - 0.5) * spread);
  });
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'distribution-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'distribution-chart-usage-stories',
  standalone: true,
  styleUrl: './distribution-chart-usage-stories.component.scss',
  templateUrl: './distribution-chart-usage-stories.component.html',
})
export class DistributionChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/distribution-chart/usage';

  /**
   * Four classes' raw exam scores shared across the static examples. Each category
   * is an array of RAW observations — the layer computes quartiles / KDE / jitter
   * itself. A couple of extreme scores are appended so the box-mode IQR fences have
   * outliers to draw.
   */
  sampleData: NgeDistributionDataPoint[] = [
    { category: 'Class A', values: [...makeValues(44, 76, 40, 11), 31, 99] },
    { category: 'Class B', values: makeValues(46, 83, 28, 23) },
    { category: 'Class C', values: [...makeValues(43, 70, 48, 37), 18, 100] },
    { category: 'Class D', values: makeValues(45, 88, 24, 51) },
  ];

  // ============================================
  // EXAMPLE 1: Basic Box-and-Whisker
  // ============================================
  // The default `render: 'box'` draws a Tukey box-and-whisker per category —
  // box = IQR, line = median, whiskers = 1.5·IQR fences, dots = outliers.
  basicConfig = createDistributionChartConfig({
    data: this.sampleData,
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  // ============================================
  // EXAMPLE 2: Violin (KDE density)
  // ============================================
  // `render: 'violin'` mirrors a kernel-density estimate around each category's
  // axis; `showInnerBox: true` overlays a mini box-and-whisker for the quartiles.
  violinConfig = createDistributionChartConfig({
    data: this.sampleData,
    render: 'violin',
    showInnerBox: true,
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  // ============================================
  // EXAMPLE 3: Beeswarm Point Cloud
  // ============================================
  // `render: 'points'` plots every raw observation; `jitter: 'beeswarm'` packs
  // them into a symmetric, non-overlapping swarm so density reads as width.
  beeswarmConfig = createDistributionChartConfig({
    data: this.sampleData,
    jitter: 'beeswarm',
    render: 'points',
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  // ============================================
  // EXAMPLE 4: Jitter vs Strip
  // ============================================
  // Same point cloud, two scatter strategies: `jitter: 'uniform'` spreads points
  // randomly across the band; `jitter: 'none'` collapses them onto a single strip.
  uniformJitterConfig = createDistributionChartConfig({
    data: this.sampleData,
    jitter: 'uniform',
    render: 'points',
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  stripConfig = createDistributionChartConfig({
    data: this.sampleData,
    jitter: 'none',
    render: 'points',
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  // ============================================
  // EXAMPLE 5: Error Bars (±σ)
  // ============================================
  // `showBox: false` drops the box for an error-bar plot; `whiskerStat: 'stddev'`
  // sizes the whiskers to ±1 standard deviation and `showMean: true` marks the mean.
  errorBarConfig = createDistributionChartConfig({
    data: this.sampleData,
    showBox: false,
    showMean: true,
    whiskerStat: 'stddev',
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  // ============================================
  // EXAMPLE 6: Horizontal Orientation
  // ============================================
  // `orientation: 'horizontal'` swaps the scales — categories run down the y axis
  // and the value axis becomes x. Great for long category labels.
  horizontalConfig = createDistributionChartConfig({
    data: this.sampleData,
    orientation: 'horizontal',
    xAxisLabel: 'Score',
    yAxisLabel: 'Class',
  });

  // ============================================
  // EXAMPLE 7: Whisker Statistic (IQR vs min–max)
  // ============================================
  // `whiskerStat` picks the whisker extent: `'iqr'` (Tukey 1.5·IQR fences, with
  // outliers) vs `'minmax'` (whiskers reach the data extremes, no outliers).
  iqrConfig = createDistributionChartConfig({
    data: this.sampleData,
    whiskerStat: 'iqr',
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  minMaxConfig = createDistributionChartConfig({
    data: this.sampleData,
    whiskerStat: 'minmax',
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  // ============================================
  // EXAMPLE 8: Click to Inspect a Category
  // ============================================
  // The click payload carries the whole `NgeDistributionDataPoint` — its
  // `category` and raw `values[]` — so you can drill into the clicked distribution.
  readonly lastClicked = signal<string>('None');

  clickConfig = createDistributionChartConfig({
    data: this.sampleData,
    onClick: (event: NgeChartLayerClickEvent<NgeDistributionDataPoint>) => {
      const d = event.data;
      const sorted = [...d.values].sort((a, b) => a - b);
      const median = sorted[Math.floor(sorted.length / 2)];
      this.lastClicked.set(`${d.category} — n=${d.values.length}, median ≈ ${median}`);
    },
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  // ============================================
  // EXAMPLE 9: Dynamic Data With Signals
  // ============================================
  // Recommended pattern: hold raw observations in a `signal()` and rebuild the
  // config inside a `computed()`. Re-rolling the sample re-summarises every violin.
  readonly liveData = signal<NgeDistributionDataPoint[]>([
    { category: 'Class A', values: makeValues(45, 76, 40, 3) },
    { category: 'Class B', values: makeValues(45, 83, 28, 5) },
    { category: 'Class C', values: makeValues(45, 70, 48, 7) },
    { category: 'Class D', values: makeValues(45, 88, 24, 9) },
  ]);

  readonly dynamicConfig = computed(() =>
    createDistributionChartConfig({
      data: this.liveData(),
      render: 'violin',
      showInnerBox: true,
      xAxisLabel: 'Class',
      yAxisLabel: 'Score',
    })
  );

  randomizeData(): void {
    const seed = Math.floor(Math.random() * 1_000_000_000);
    this.liveData.set([
      { category: 'Class A', values: makeValues(45, 76, 40, seed) },
      { category: 'Class B', values: makeValues(45, 83, 28, seed + 1) },
      { category: 'Class C', values: makeValues(45, 70, 48, seed + 2) },
      { category: 'Class D', values: makeValues(45, 88, 24, seed + 3) },
    ]);
  }
}
