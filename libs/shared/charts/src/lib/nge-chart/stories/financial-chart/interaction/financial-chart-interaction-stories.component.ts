import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  FinancialVariant,
  NgeChartConfig,
  NgeFinancialDataPoint,
  NgeFinancialLayerConfig,
} from '../../../../core/config';

import { createFinancialChartConfig } from '../../../../presets/financial-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * The rise → pullback → recovery OHLC baseline — a mix of up/down candles with wicks,
 * a kagi that flips yang↔yin, and a renko staircase that reverses. "Randomize Data"
 * re-rolls it with a seeded walk.
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

/** Seeded mulberry32 — deterministic re-rolls (no `Math.random`). */
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
 * A fresh random-walk OHLC series from a seed. Sinusoidal drift guarantees the trend
 * reverses (kagi flips, renko reverses); wick padding keeps
 * `low ≤ min(open,close) ≤ max(open,close) ≤ high`.
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
    class: 'financial-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'financial-chart-interaction-stories',
  standalone: true,
  styleUrl: './financial-chart-interaction-stories.component.scss',
  templateUrl: './financial-chart-interaction-stories.component.html',
})
export class FinancialChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/financial-chart/interaction';

  // === Base - Margins ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(15);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // === Layer - Layout ===
  readonly variant = input<FinancialVariant>('candlestick');
  readonly candleWidth = input<number>(0.6);

  // === Layer - Financial ===
  readonly reversalThreshold = input<number>(0);
  readonly reversalAsPercent = input<boolean>(false);
  readonly brickSize = input<number>(0);

  // === Layer - Visibility ===
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');

  // === Theme - Financial Styling ===
  readonly upColor = input<string>('');
  readonly downColor = input<string>('');
  readonly wickColor = input<string>('');
  readonly kagiYangColor = input<string>('');
  readonly kagiYinColor = input<string>('');

  // The OHLC series — re-rolled by "Randomize Data" via a seeded (deterministic) walk.
  private readonly seed = signal<number>(1);
  readonly liveData = signal<NgeFinancialDataPoint[]>([...SAMPLE_OHLC]);

  // Computed config that rebuilds when any input changes. `reversalThreshold` /
  // `brickSize` of 0 fall back to the preset's auto defaults (3% / 5% of the close
  // range); the tooltip position is patched onto the built layer since the preset
  // fixes it to follow-mouse.
  readonly config = computed<NgeChartConfig>(() => {
    const base = createFinancialChartConfig({
      brickSize: this.brickSize() || undefined,
      candleWidth: this.candleWidth(),
      data: this.liveData(),
      margin: {
        bottom: this.marginBottom(),
        left: this.marginLeft(),
        right: this.marginRight(),
        top: this.marginTop(),
      },
      reversalAsPercent: this.reversalAsPercent(),
      reversalThreshold: this.reversalThreshold() || undefined,
      showTooltip: this.showTooltip(),
      showXAxis: this.showXAxis(),
      showYAxis: this.showYAxis(),
      variant: this.variant(),
      xAxisLabel: 'Session',
      yAxisLabel: 'Price',
    });

    const [layer] = base.layers.flat() as NgeFinancialLayerConfig[];
    const tooltipPosition = this.tooltipPosition();

    return {
      ...base,
      layers: [
        layer.tooltip
          ? { ...layer, tooltip: { ...layer.tooltip, position: tooltipPosition } }
          : layer,
      ],
      theme: {
        financial: {
          down: {
            color: this.downColor() || undefined,
          },
          kagi: {
            yangColor: this.kagiYangColor() || undefined,
            yinColor: this.kagiYinColor() || undefined,
          },
          up: {
            color: this.upColor() || undefined,
          },
          wick: {
            color: this.wickColor() || undefined,
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.seed.update(s => s + 1);
    this.liveData.set(makeRandomWalkOhlc(this.seed()));
  }
}
