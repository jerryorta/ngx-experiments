import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeHistogramBin, NgeHistogramDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createHistogramChartConfig } from '../../../../presets/histogram-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Deterministic ~normal sample: a seeded mulberry32 RNG averaged in threes
 * (central-limit) so every render bins the SAME bell-shaped distribution — the
 * histogram / rootogram demos stay stable across change-detection cycles.
 */
function makeSamples(
  count: number,
  center: number,
  spread: number,
  seed: number
): NgeHistogramDataPoint[] {
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
    return { value: Math.round(center + (bell - 0.5) * spread) };
  });
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'histogram-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'histogram-chart-usage-stories',
  standalone: true,
  styleUrl: './histogram-chart-usage-stories.component.scss',
  templateUrl: './histogram-chart-usage-stories.component.html',
})
export class HistogramChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/histogram-chart/usage';

  /** ~140 bell-shaped observations shared across the static examples. */
  sampleData: NgeHistogramDataPoint[] = makeSamples(140, 50, 80, 42);

  // ============================================
  // EXAMPLE 1: Basic Histogram
  // ============================================
  // Raw observations (`{ value }[]`) are binned by the layer itself — 10 uniform
  // bins by default — and drawn as frequency bars on a CONTINUOUS value axis.
  basicConfig = createHistogramChartConfig({
    data: this.sampleData,
    xAxisLabel: 'Value',
  });

  // ============================================
  // EXAMPLE 2: Rootogram Mode
  // ============================================
  // `mode: 'rootogram'` fits a normal curve from the sample mean/σ and HANGS each
  // bar from that expected frequency, so a bar's gap to the axis reads as the fit
  // residual. The fitted expected-frequency curve is drawn behind the bars.
  rootogramConfig = createHistogramChartConfig({
    data: this.sampleData,
    mode: 'rootogram',
    xAxisLabel: 'Value',
  });

  // ============================================
  // EXAMPLE 3: Bin Count (granularity)
  // ============================================
  // `binCount` sets how many uniform bins span the data extent — more bins = a
  // finer, higher-resolution distribution.
  fineBinsConfig = createHistogramChartConfig({
    binCount: 24,
    data: this.sampleData,
    xAxisLabel: 'Value',
  });

  // ============================================
  // EXAMPLE 4: Explicit Domain
  // ============================================
  // Pin the binning range with `domain: [min, max]` (here a fixed 0–100 scale)
  // so multiple histograms share identical bin edges regardless of their data.
  domainConfig = createHistogramChartConfig({
    binCount: 10,
    data: this.sampleData,
    domain: [0, 100],
    xAxisLabel: 'Value',
  });

  // ============================================
  // EXAMPLE 5: Per-Bin Count Labels
  // ============================================
  // `showLabels: true` prints each bin's observation count centered above the bar.
  labelsConfig = createHistogramChartConfig({
    binCount: 8,
    data: this.sampleData,
    showLabels: true,
    xAxisLabel: 'Value',
  });

  // ============================================
  // EXAMPLE 6: Click to Inspect a Bin
  // ============================================
  // The click payload carries the BIN (`{ x0, x1, count }`), not a single datum —
  // the interaction unit for a histogram is a bin.
  readonly lastClicked = signal<string>('None');

  clickConfig = createHistogramChartConfig({
    data: this.sampleData,
    onClick: (event: NgeChartLayerClickEvent<NgeHistogramBin>) => {
      const bin = event.data;
      this.lastClicked.set(`[${bin.x0.toFixed(0)}, ${bin.x1.toFixed(0)}) — ${bin.count} obs`);
    },
    xAxisLabel: 'Value',
  });

  // ============================================
  // EXAMPLE 7: Dynamic Data With Signals
  // ============================================
  // Recommended pattern: hold raw observations in a `signal()` and rebuild the
  // config inside a `computed()`. Re-rolling the sample re-fits the rootogram.
  readonly liveData = signal<NgeHistogramDataPoint[]>(makeSamples(140, 50, 80, 7));

  readonly dynamicConfig = computed(() =>
    createHistogramChartConfig({
      data: this.liveData(),
      mode: 'rootogram',
      xAxisLabel: 'Value',
    })
  );

  randomizeData(): void {
    this.liveData.set(makeSamples(140, 50, 80, Math.floor(Math.random() * 1_000_000_000)));
  }
}
