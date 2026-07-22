import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint, NgeLineDataPoint } from '../../../../core/config';
import type { WinLossDataPoint } from '../../../../presets/winloss-sparkline-chart.preset';

import { createColumnSparklineChartConfig } from '../../../../presets/column-sparkline-chart.preset';
import { createSparklineChartConfig } from '../../../../presets/sparkline-chart.preset';
import { createWinLossSparklineChartConfig } from '../../../../presets/winloss-sparkline-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sparkline-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'sparkline-chart-usage-stories',
  standalone: true,
  styleUrl: './sparkline-chart-usage-stories.component.scss',
  templateUrl: './sparkline-chart-usage-stories.component.html',
})
export class SparklineChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sparkline-chart/usage';

  // ============================================
  // EXAMPLE 1: Line sparkline (single series)
  // ============================================
  /** Twelve months of a single metric — the canonical inline trend. */
  readonly revenueTrend = signal<NgeLineDataPoint[]>([
    { x: 0, y: 42 },
    { x: 1, y: 45 },
    { x: 2, y: 41 },
    { x: 3, y: 47 },
    { x: 4, y: 52 },
    { x: 5, y: 49 },
    { x: 6, y: 55 },
    { x: 7, y: 58 },
    { x: 8, y: 54 },
    { x: 9, y: 61 },
    { x: 10, y: 64 },
    { x: 11, y: 68 },
  ]);

  readonly lineSparklineConfig = computed(() =>
    createSparklineChartConfig({ data: this.revenueTrend(), tooltip: { enabled: true } })
  );

  // ============================================
  // EXAMPLE 2: Column sparkline
  // ============================================
  /** Weekly volume as a dense mini-histogram. */
  readonly weeklyVolume = signal<NgeBarDataPoint[]>([
    { label: 'W1', value: 120 },
    { label: 'W2', value: 165 },
    { label: 'W3', value: 98 },
    { label: 'W4', value: 143 },
    { label: 'W5', value: 187 },
    { label: 'W6', value: 156 },
    { label: 'W7', value: 201 },
    { label: 'W8', value: 178 },
  ]);

  readonly columnSparklineConfig = computed(() =>
    createColumnSparklineChartConfig({ data: this.weeklyVolume() })
  );

  /** Weekly net change (some weeks down) — the optional zero line frames up vs down. */
  readonly weeklyNetChange = signal<NgeBarDataPoint[]>([
    { label: 'W1', value: 8 },
    { label: 'W2', value: 14 },
    { label: 'W3', value: -6 },
    { label: 'W4', value: 3 },
    { label: 'W5', value: -11 },
    { label: 'W6', value: 9 },
    { label: 'W7', value: -4 },
    { label: 'W8', value: 12 },
  ]);

  // Opt-in zero baseline (default off for columns) — meaningful once values go negative.
  readonly columnZeroLineConfig = computed(() =>
    createColumnSparklineChartConfig({ data: this.weeklyNetChange(), showZeroLine: true })
  );

  // ============================================
  // EXAMPLE 3: Win-loss sparkline
  // ============================================
  /** A season's results — only the outcome (win / loss / tie) matters. */
  readonly seasonResults = signal<WinLossDataPoint[]>([
    { label: 'G1', value: 1 },
    { label: 'G2', value: 1 },
    { label: 'G3', value: -1 },
    { label: 'G4', value: 1 },
    { label: 'G5', value: 0 },
    { label: 'G6', value: -1 },
    { label: 'G7', value: 1 },
    { label: 'G8', value: 1 },
    { label: 'G9', value: -1 },
    { label: 'G10', value: 1 },
  ]);

  readonly winLossSparklineConfig = computed(() =>
    createWinLossSparklineChartConfig({
      data: this.seasonResults(),
      // Custom tooltip: the ±1 bar carries the sign, so map it back to the outcome word.
      tooltip: {
        enabled: true,
        formatContent: d => {
          const outcome = d.value > 0 ? 'Win' : d.value < 0 ? 'Loss' : 'Tie';
          return { label: d.label, value: `${outcome} (${d.value > 0 ? '+' : ''}${d.value})` };
        },
      },
    })
  );

  // ============================================
  // EXAMPLE 4: Multi-series line sparkline
  // ============================================
  /** Two metrics in one cell — each dot inherits its own line's colour. */
  readonly multiTrend = signal<NgeLineDataPoint[]>([
    { seriesId: 'Revenue', x: 0, y: 42 },
    { seriesId: 'Revenue', x: 1, y: 47 },
    { seriesId: 'Revenue', x: 2, y: 52 },
    { seriesId: 'Revenue', x: 3, y: 61 },
    { seriesId: 'Cost', x: 0, y: 30 },
    { seriesId: 'Cost', x: 1, y: 33 },
    { seriesId: 'Cost', x: 2, y: 31 },
    { seriesId: 'Cost', x: 3, y: 38 },
  ]);

  readonly multiSeriesSparklineConfig = computed(() =>
    createSparklineChartConfig({
      data: this.multiTrend(),
      seriesColors: ['#1976D2', '#E53935'],
    })
  );
}
