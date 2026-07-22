import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';

import { createLineChartConfig } from '../../../../presets/line-chart.preset';
import { addOverlay, createOverlayConfig } from '../../../../presets/overlay-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Usage examples for the analytical `overlay` layer.
 *
 * An overlay is NOT a standalone chart — it is composed OVER a line / scatter host
 * with {@link addOverlay} (or by dropping {@link createOverlayConfig} into a `layers`
 * array) so it draws on the host's shared scales. Its three modes (`trendline`,
 * `control`, `fan`) all read continuous x, so every host below uses a numeric x
 * (a linear scale — trendline + fan bail on a categorical/point scale).
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'overlay-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'overlay-usage-stories',
  standalone: true,
  styleUrl: './overlay-usage-stories.component.scss',
  templateUrl: './overlay-usage-stories.component.html',
})
export class OverlayUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/overlay/usage';

  // ============================================
  // Shared datasets (numeric x → continuous scale)
  // ============================================
  // A noisy upward series — good for a straight linear fit AND a wavy LOESS fit.
  trendData: NgeLineDataPoint[] = [
    { x: 1, y: 15 },
    { x: 2, y: 24 },
    { x: 3, y: 20 },
    { x: 4, y: 30 },
    { x: 5, y: 27 },
    { x: 6, y: 36 },
    { x: 7, y: 33 },
    { x: 8, y: 42 },
    { x: 9, y: 39 },
    { x: 10, y: 48 },
    { x: 11, y: 45 },
    { x: 12, y: 54 },
  ];

  // A roughly stationary process centred near 50 — the classic control-chart shape.
  controlData: NgeLineDataPoint[] = [
    { x: 1, y: 48 },
    { x: 2, y: 53 },
    { x: 3, y: 45 },
    { x: 4, y: 56 },
    { x: 5, y: 50 },
    { x: 6, y: 52 },
    { x: 7, y: 44 },
    { x: 8, y: 57 },
    { x: 9, y: 49 },
    { x: 10, y: 51 },
    { x: 11, y: 43 },
    { x: 12, y: 54 },
  ];

  // A gently rising series the fan bands widen around toward the forecast horizon.
  fanData: NgeLineDataPoint[] = [
    { x: 1, y: 42 },
    { x: 2, y: 45 },
    { x: 3, y: 44 },
    { x: 4, y: 49 },
    { x: 5, y: 51 },
    { x: 6, y: 54 },
    { x: 7, y: 56 },
    { x: 8, y: 60 },
    { x: 9, y: 62 },
    { x: 10, y: 65 },
    { x: 11, y: 68 },
    { x: 12, y: 72 },
  ];

  // Two series — the overlay fits one trend line PER series (grouped by seriesId).
  multiSeriesData: NgeLineDataPoint[] = [
    { seriesId: 'Store A', x: 1, y: 28 },
    { seriesId: 'Store A', x: 2, y: 31 },
    { seriesId: 'Store A', x: 3, y: 35 },
    { seriesId: 'Store A', x: 4, y: 38 },
    { seriesId: 'Store A', x: 5, y: 42 },
    { seriesId: 'Store A', x: 6, y: 45 },
    { seriesId: 'Store A', x: 7, y: 49 },
    { seriesId: 'Store A', x: 8, y: 52 },
    { seriesId: 'Store A', x: 9, y: 56 },
    { seriesId: 'Store A', x: 10, y: 59 },
    { seriesId: 'Store A', x: 11, y: 63 },
    { seriesId: 'Store A', x: 12, y: 66 },
    { seriesId: 'Store B', x: 1, y: 18 },
    { seriesId: 'Store B', x: 2, y: 20 },
    { seriesId: 'Store B', x: 3, y: 23 },
    { seriesId: 'Store B', x: 4, y: 25 },
    { seriesId: 'Store B', x: 5, y: 28 },
    { seriesId: 'Store B', x: 6, y: 30 },
    { seriesId: 'Store B', x: 7, y: 33 },
    { seriesId: 'Store B', x: 8, y: 35 },
    { seriesId: 'Store B', x: 9, y: 38 },
    { seriesId: 'Store B', x: 10, y: 40 },
    { seriesId: 'Store B', x: 11, y: 43 },
    { seriesId: 'Store B', x: 12, y: 45 },
  ];

  // ============================================
  // EXAMPLE 1: Composing a trend line (addOverlay)
  // ============================================
  linearTrendConfig = addOverlay(
    createLineChartConfig({
      data: this.trendData,
      margin: { bottom: 40, left: 50, right: 24, top: 24 },
      showPoints: true,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Observation',
      yAxisLabel: 'Value',
    }),
    {
      data: this.trendData,
      fit: 'linear',
      mode: 'trendline',
    }
  );

  // ============================================
  // EXAMPLE 2: Linear vs LOESS fit
  // ============================================
  comparisonLinearConfig = addOverlay(
    createLineChartConfig({
      data: this.trendData,
      showPoints: true,
    }),
    {
      data: this.trendData,
      fit: 'linear',
      mode: 'trendline',
    }
  );

  comparisonLoessConfig = addOverlay(
    createLineChartConfig({
      data: this.trendData,
      showPoints: true,
    }),
    {
      data: this.trendData,
      fit: 'loess',
      loessBandwidth: 0.4,
      mode: 'trendline',
    }
  );

  // ============================================
  // EXAMPLE 3: Control chart (mean + ±3σ + shaded band)
  // ============================================
  controlBandConfig = addOverlay(
    createLineChartConfig({
      data: this.controlData,
      margin: { bottom: 40, left: 50, right: 24, top: 24 },
      showPoints: true,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Sample',
      yAxisLabel: 'Measurement',
      // Give the host a y-domain that comfortably contains mean ± 3σ so the
      // limit lines / band never clip (the overlay draws within host scales).
      yDomain: [20, 80],
    }),
    {
      data: this.controlData,
      mode: 'control',
      showControlBand: true,
      sigma: 3,
    }
  );

  // ============================================
  // EXAMPLE 4: Control-limit width — 2σ vs 3σ
  // ============================================
  control2SigmaConfig = addOverlay(
    createLineChartConfig({
      data: this.controlData,
      showPoints: true,
      yDomain: [20, 80],
    }),
    {
      data: this.controlData,
      mode: 'control',
      showControlBand: true,
      sigma: 2,
    }
  );

  control3SigmaConfig = addOverlay(
    createLineChartConfig({
      data: this.controlData,
      showPoints: true,
      yDomain: [20, 80],
    }),
    {
      data: this.controlData,
      mode: 'control',
      showControlBand: true,
      sigma: 3,
    }
  );

  // ============================================
  // EXAMPLE 5: Fan chart (prediction intervals)
  // ============================================
  fanConfig = addOverlay(
    createLineChartConfig({
      data: this.fanData,
      margin: { bottom: 40, left: 50, right: 24, top: 24 },
      showPoints: true,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Period',
      yAxisLabel: 'Forecast',
      // Headroom for the widest (0.95) band at the forecast horizon.
      yDomain: [0, 115],
    }),
    {
      data: this.fanData,
      intervals: [0.5, 0.8, 0.95],
      mode: 'fan',
    }
  );

  // ============================================
  // EXAMPLE 6: Multi-series trend (one fit per series)
  // ============================================
  multiTrendConfig = addOverlay(
    createLineChartConfig({
      data: this.multiSeriesData,
      legend: { enabled: true },
      margin: { bottom: 40, left: 50, right: 24, top: 24 },
      seriesColors: ['#1E88E5', '#43A047'],
      showPoints: true,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Week',
      yAxisLabel: 'Revenue ($K)',
    }),
    {
      data: this.multiSeriesData,
      fit: 'linear',
      mode: 'trendline',
    }
  );

  // ============================================
  // EXAMPLE 7: createOverlayConfig in a layers array
  // ============================================
  layersApiConfig = this.buildLayersApiConfig();

  // ============================================
  // EXAMPLE 8: Dynamic data with signals
  // ============================================
  readonly dynamicData = signal<NgeLineDataPoint[]>([
    { x: 1, y: 12 },
    { x: 2, y: 18 },
    { x: 3, y: 16 },
    { x: 4, y: 24 },
    { x: 5, y: 30 },
    { x: 6, y: 27 },
    { x: 7, y: 36 },
    { x: 8, y: 40 },
    { x: 9, y: 44 },
    { x: 10, y: 50 },
  ]);

  readonly dynamicConfig = computed(() =>
    addOverlay(
      createLineChartConfig({
        data: this.dynamicData(),
        margin: { bottom: 40, left: 50, right: 24, top: 24 },
        showPoints: true,
        showXAxis: true,
        showYAxis: true,
        xAxisLabel: 'Observation',
        yAxisLabel: 'Value',
      }),
      {
        data: this.dynamicData(),
        fit: 'linear',
        mode: 'trendline',
      }
    )
  );

  randomizeData(): void {
    this.dynamicData.set(
      Array.from({ length: 10 }, (_, i) => ({
        x: i + 1,
        y: Math.round(10 + i * 4 + (Math.random() * 18 - 9)),
      }))
    );
  }

  // Build a host line config then append an overlay via createOverlayConfig — the
  // long-hand of addOverlay, showing the overlay is just another entry in `layers`.
  private buildLayersApiConfig(): NgeChartConfig {
    const base = createLineChartConfig({
      data: this.trendData,
      margin: { bottom: 40, left: 50, right: 24, top: 24 },
      showPoints: true,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Observation',
      yAxisLabel: 'Value',
    });

    return {
      ...base,
      layers: [
        ...base.layers,
        createOverlayConfig({
          data: this.trendData,
          fit: 'loess',
          loessBandwidth: 0.35,
          mode: 'trendline',
        }),
      ],
    };
  }
}
