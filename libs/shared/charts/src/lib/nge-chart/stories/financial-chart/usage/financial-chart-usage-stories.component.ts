import {
  ChangeDetectionStrategy,
  Component,
  computed,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeFinancialDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createFinancialChartConfig } from '../../../../presets/financial-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * A hand-built ~24-session daily OHLC series that RISES (≈103→148), PULLS BACK
 * (≈148→122), then RECOVERS (≈122→155). The trend/counter-trend/trend shape makes
 * every variant read: candlestick shows a mix of up (green) / down (red) bodies with
 * visible wicks, kagi flips yang↔yin at the pullback and the recovery, and renko draws
 * an ascending staircase with a mid-series reversal. `low ≤ min(open,close)` and
 * `high ≥ max(open,close)` hold for every session.
 */
const SAMPLE_OHLC: readonly NgeFinancialDataPoint[] = [
  { close: 103, date: '2024-01-02', high: 104, low: 99, open: 100 },
  { close: 107, date: '2024-01-03', high: 108, low: 102, open: 103 },
  { close: 105, date: '2024-01-04', high: 109, low: 104, open: 107 },
  { close: 111, date: '2024-01-05', high: 112, low: 104, open: 105 },
  { close: 115, date: '2024-01-08', high: 116, low: 110, open: 111 },
  { close: 113, date: '2024-01-09', high: 118, low: 112, open: 115 },
  { close: 120, date: '2024-01-10', high: 121, low: 112, open: 113 },
  { close: 125, date: '2024-01-11', high: 126, low: 119, open: 120 },
  { close: 129, date: '2024-01-12', high: 130, low: 123, open: 125 },
  { close: 134, date: '2024-01-15', high: 135, low: 128, open: 129 },
  { close: 139, date: '2024-01-16', high: 140, low: 133, open: 134 },
  { close: 144, date: '2024-01-17', high: 145, low: 138, open: 139 },
  { close: 148, date: '2024-01-18', high: 150, low: 143, open: 144 },
  { close: 143, date: '2024-01-19', high: 149, low: 142, open: 148 },
  { close: 137, date: '2024-01-22', high: 144, low: 136, open: 143 },
  { close: 132, date: '2024-01-23', high: 139, low: 131, open: 137 },
  { close: 127, date: '2024-01-24', high: 134, low: 126, open: 132 },
  { close: 124, date: '2024-01-25', high: 130, low: 123, open: 127 },
  { close: 122, date: '2024-01-26', high: 128, low: 121, open: 124 },
  { close: 128, date: '2024-01-29', high: 129, low: 121, open: 122 },
  { close: 134, date: '2024-01-30', high: 135, low: 127, open: 128 },
  { close: 141, date: '2024-01-31', high: 142, low: 133, open: 134 },
  { close: 148, date: '2024-02-01', high: 149, low: 140, open: 141 },
  { close: 155, date: '2024-02-02', high: 156, low: 147, open: 148 },
];

/** Seeded mulberry32 — deterministic so a click re-rolls to a NEW yet reproducible walk. */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a fresh random-walk OHLC series from a seed. A sinusoidal drift guarantees
 * trend reversals (so kagi flips and renko reverses) while a per-session shock keeps
 * it noisy; the wick padding preserves `low ≤ min(open,close) ≤ max(open,close) ≤ high`.
 */
function makeRandomWalkOhlc(seed: number, count = 24): NgeFinancialDataPoint[] {
  const rand = mulberry32(seed);
  const startMs = Date.UTC(2024, 0, 2);
  const dayMs = 86_400_000;
  const round2 = (n: number): number => Math.round(n * 100) / 100;

  const points: NgeFinancialDataPoint[] = [];
  let prevClose = 100 + rand() * 20;
  for (let i = 0; i < count; i++) {
    const open = prevClose;
    const drift = Math.sin(i / 3) * 4;
    const shock = (rand() - 0.5) * 8;
    const close = Math.max(20, open + drift + shock);
    const high = Math.max(open, close) + rand() * 4;
    const low = Math.min(open, close) - rand() * 4;
    points.push({
      close: round2(close),
      date: new Date(startMs + i * dayMs).toISOString().slice(0, 10),
      high: round2(high),
      low: round2(low),
      open: round2(open),
    });
    prevClose = close;
  }
  return points;
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'financial-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'financial-chart-usage-stories',
  standalone: true,
  styleUrl: './financial-chart-usage-stories.component.scss',
  templateUrl: './financial-chart-usage-stories.component.html',
})
export class FinancialChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/financial-chart/usage';

  /** The OHLC series shared across the static examples. */
  sampleData: NgeFinancialDataPoint[] = [...SAMPLE_OHLC];

  // ============================================
  // EXAMPLE 1: Basic Candlestick
  // ============================================
  // The default `variant: 'candlestick'` draws an OHLC wick + body per session —
  // body = open→close (green when close ≥ open, red otherwise), wick = low→high.
  basicConfig = createFinancialChartConfig({
    data: this.sampleData,
    xAxisLabel: 'Session',
    yAxisLabel: 'Price',
  });

  // ============================================
  // EXAMPLE 2: Kagi
  // ============================================
  // `variant: 'kagi'` folds the `close` series into a reversal-driven zigzag whose
  // thickness/colour flips between yang (broke the prior shoulder) and yin (broke the
  // prior waist). Time is dropped — one slot per vertex.
  kagiConfig = createFinancialChartConfig({
    data: this.sampleData,
    variant: 'kagi',
    xAxisLabel: 'Sequence',
    yAxisLabel: 'Price',
  });

  // ============================================
  // EXAMPLE 3: Renko
  // ============================================
  // `variant: 'renko'` walks the `close` series emitting fixed-height bricks — an
  // ascending staircase, one step per brick, reversing only after a ~2·brickSize move.
  renkoConfig = createFinancialChartConfig({
    data: this.sampleData,
    variant: 'renko',
    xAxisLabel: 'Sequence',
    yAxisLabel: 'Price',
  });

  // ============================================
  // EXAMPLE 4: Candlestick With Tooltip
  // ============================================
  // `showTooltip: true` enables the hover tooltip (candlestick only); the default
  // formatter shows the session date and its closing price.
  tooltipConfig = createFinancialChartConfig({
    data: this.sampleData,
    showTooltip: true,
    xAxisLabel: 'Session',
    yAxisLabel: 'Price',
  });

  // ============================================
  // EXAMPLE 5: Click to Inspect a Candle
  // ============================================
  // The `onClick` payload carries the whole `NgeFinancialDataPoint` (candlestick
  // only — kagi/renko are derived transforms with no 1:1 source candle).
  readonly lastClicked = signal<string>('None');

  clickConfig = createFinancialChartConfig({
    data: this.sampleData,
    onClick: (event: NgeChartLayerClickEvent<NgeFinancialDataPoint>) => {
      const d = event.data;
      const label = d.date instanceof Date ? d.date.toLocaleDateString() : String(d.date);
      this.lastClicked.set(`${label} — O ${d.open} H ${d.high} L ${d.low} C ${d.close}`);
    },
    xAxisLabel: 'Session',
    yAxisLabel: 'Price',
  });

  // ============================================
  // EXAMPLE 6: Dynamic Data With Signals
  // ============================================
  // Recommended pattern: hold the OHLC series in a `signal()` and rebuild the config
  // inside a `computed()`. Randomize re-rolls a fresh (deterministic, seeded) walk.
  private readonly seed = signal<number>(1);
  readonly liveData = signal<NgeFinancialDataPoint[]>(makeRandomWalkOhlc(1));

  readonly dynamicConfig = computed(() =>
    createFinancialChartConfig({
      data: this.liveData(),
      showTooltip: true,
      xAxisLabel: 'Session',
      yAxisLabel: 'Price',
    })
  );

  randomizeData(): void {
    this.seed.update(s => s + 1);
    this.liveData.set(makeRandomWalkOhlc(this.seed()));
  }
}
