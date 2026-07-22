import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  DistributionJitter,
  DistributionRenderMode,
  DistributionWhiskerStat,
  NgeChartConfig,
  NgeDistributionDataPoint,
  NgeDistributionLayerConfig,
} from '../../../../core/config';

import { createDistributionChartConfig } from '../../../../presets/distribution-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Deterministic ~normal sample (seeded mulberry32, averaged in threes) — the
 * baseline distributions; "Randomize Data" re-rolls them with a fresh seed.
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
    const bell = (next() + next() + next()) / 3;
    return Math.round(center + (bell - 0.5) * spread);
  });
}

/** Build the four endpoint response-time distributions from a base seed. */
function makeEndpoints(seed: number): NgeDistributionDataPoint[] {
  return [
    { category: '/search', values: makeValues(50, 180, 120, seed) },
    { category: '/checkout', values: makeValues(50, 320, 220, seed + 1) },
    { category: '/profile', values: makeValues(50, 110, 70, seed + 2) },
    { category: '/feed', values: makeValues(50, 240, 160, seed + 3) },
  ];
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'distribution-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'distribution-chart-interaction-stories',
  standalone: true,
  styleUrl: './distribution-chart-interaction-stories.component.scss',
  templateUrl: './distribution-chart-interaction-stories.component.html',
})
export class DistributionChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/charts/src/lib/nge-chart/stories/distribution-chart/interaction';

  // === Base - Margins ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(15);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // === Layer - Layout ===
  readonly render = input<DistributionRenderMode>('box');
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly boxWidth = input<number>(0.6);

  // === Layer - Box ===
  readonly whiskerStat = input<DistributionWhiskerStat>('iqr');
  readonly showBox = input<boolean>(true);
  readonly showOutliers = input<boolean>(true);
  readonly showMean = input<boolean>(false);

  // === Layer - Violin ===
  readonly showInnerBox = input<boolean>(true);
  readonly kdeKernel = input<'epanechnikov' | 'gaussian'>('epanechnikov');
  readonly kdeResolution = input<number>(50);

  // === Layer - Points ===
  readonly jitter = input<DistributionJitter>('beeswarm');
  readonly jitterWidth = input<number>(0.7);
  readonly pointRadius = input<number>(3);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');

  // === Layer - Axis Labels ===
  readonly xAxisLabel = input<string>('Endpoint');
  readonly yAxisLabel = input<string>('Response (ms)');

  // === Theme - Box Styling ===
  readonly boxColor = input<string>('');
  readonly boxOpacity = input<number>(0.55);

  // === Theme - Median Styling ===
  readonly medianColor = input<string>('');

  // === Theme - Whisker Styling ===
  readonly whiskerColor = input<string>('');

  // === Theme - Violin Styling ===
  readonly violinColor = input<string>('');
  readonly violinOpacity = input<number>(0.4);

  // === Theme - Point Styling ===
  readonly pointColor = input<string>('');
  readonly pointOpacity = input<number>(0.7);

  // === Theme - Outlier Styling ===
  readonly outlierColor = input<string>('');

  // The observations per endpoint — re-rolled by "Randomize Data".
  readonly liveData = signal<NgeDistributionDataPoint[]>(makeEndpoints(42));

  // Computed config that rebuilds when any input changes. `pointRadius` is a live
  // preset option (it wins over `theme.point.radius`); the tooltip position is
  // patched onto the built layer since the preset fixes it to follow-mouse.
  readonly config = computed<NgeChartConfig>(() => {
    const base = createDistributionChartConfig({
      boxWidth: this.boxWidth(),
      data: this.liveData(),
      jitter: this.jitter(),
      jitterWidth: this.jitterWidth(),
      kdeKernel: this.kdeKernel(),
      kdeResolution: this.kdeResolution(),
      margin: {
        bottom: this.marginBottom(),
        left: this.marginLeft(),
        right: this.marginRight(),
        top: this.marginTop(),
      },
      orientation: this.orientation(),
      pointRadius: this.pointRadius(),
      render: this.render(),
      showBox: this.showBox(),
      showInnerBox: this.showInnerBox(),
      showMean: this.showMean(),
      showOutliers: this.showOutliers(),
      showTooltip: this.showTooltip(),
      whiskerStat: this.whiskerStat(),
      xAxisLabel: this.xAxisLabel(),
      yAxisLabel: this.yAxisLabel(),
    });

    const [layer] = base.layers.flat() as NgeDistributionLayerConfig[];
    const tooltipPosition = this.tooltipPosition();

    return {
      ...base,
      layers: [
        layer.tooltip
          ? { ...layer, tooltip: { ...layer.tooltip, position: tooltipPosition } }
          : layer,
      ],
      theme: {
        distribution: {
          box: {
            color: this.boxColor() || undefined,
            opacity: this.boxOpacity(),
          },
          median: {
            color: this.medianColor() || undefined,
          },
          outlier: {
            color: this.outlierColor() || undefined,
          },
          point: {
            color: this.pointColor() || undefined,
            opacity: this.pointOpacity(),
          },
          violin: {
            color: this.violinColor() || undefined,
            opacity: this.violinOpacity(),
          },
          whisker: {
            color: this.whiskerColor() || undefined,
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.liveData.set(makeEndpoints(Math.floor(Math.random() * 1_000_000_000)));
  }
}
