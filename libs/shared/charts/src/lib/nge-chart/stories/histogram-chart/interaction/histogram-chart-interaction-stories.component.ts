import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHistogramDataPoint } from '../../../../core/config';

import { createHistogramChartConfig } from '../../../../presets/histogram-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Deterministic ~normal sample (seeded mulberry32, averaged in threes) — the
 * baseline distribution; "Randomize Data" re-rolls it with a fresh seed.
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
    const bell = (next() + next() + next()) / 3;
    return { value: Math.round(center + (bell - 0.5) * spread) };
  });
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'histogram-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'histogram-chart-interaction-stories',
  standalone: true,
  styleUrl: './histogram-chart-interaction-stories.component.scss',
  templateUrl: './histogram-chart-interaction-stories.component.html',
})
export class HistogramChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/histogram-chart/interaction';

  // === Base - Margins ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(15);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // === Layer - Layout ===
  readonly binCount = input<number>(10);
  readonly barGap = input<number>(1);

  // === Layer - Mode ===
  readonly mode = input<'histogram' | 'rootogram'>('histogram');

  // === Layer - Visibility ===
  readonly showLabels = input<boolean>(false);
  readonly showZeroLine = input<boolean>(false);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);

  // === Layer - Axis Labels ===
  readonly xAxisLabel = input<string>('Value');
  readonly yAxisLabel = input<string>('Frequency');

  // === Theme - Bar Styling ===
  readonly barColor = input<string>('');
  readonly barOpacity = input<number>(1);
  readonly barRadius = input<number>(0);
  readonly barStroke = input<string>('');
  readonly barStrokeWidth = input<number>(1);

  // === Theme - Curve Styling (rootogram) ===
  readonly curveColor = input<string>('');
  readonly curveWidth = input<number>(2);

  // === Theme - Node Styling (rootogram) ===
  readonly nodeColor = input<string>('');
  readonly nodeRadius = input<number>(4);

  // === Theme - Zero Line Styling (rootogram) ===
  readonly zeroLineColor = input<string>('');

  // === Theme - Label Styling ===
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);

  // The binned observations — re-rolled by "Randomize Data".
  readonly liveData = signal<NgeHistogramDataPoint[]>(makeSamples(140, 50, 80, 42));

  // Computed config that rebuilds when any input changes. Bar radius is applied
  // through the theme slice (the renderer reads `theme.histogram.bar.radius`);
  // bar gap is a live preset option.
  readonly config = computed<NgeChartConfig>(() => {
    const base = createHistogramChartConfig({
      barGap: this.barGap(),
      binCount: this.binCount(),
      data: this.liveData(),
      margin: {
        bottom: this.marginBottom(),
        left: this.marginLeft(),
        right: this.marginRight(),
        top: this.marginTop(),
      },
      mode: this.mode(),
      showLabels: this.showLabels(),
      showTooltip: this.showTooltip(),
      showZeroLine: this.showZeroLine(),
      xAxisLabel: this.xAxisLabel(),
      yAxisLabel: this.yAxisLabel(),
    });

    return {
      ...base,
      theme: {
        histogram: {
          bar: {
            color: this.barColor() || undefined,
            opacity: this.barOpacity(),
            radius: this.barRadius(),
            stroke: this.barStroke() || undefined,
            strokeWidth: this.barStrokeWidth(),
          },
          curve: {
            color: this.curveColor() || undefined,
            width: this.curveWidth(),
          },
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
          },
          node: {
            color: this.nodeColor() || undefined,
            radius: this.nodeRadius(),
          },
          zeroLine: {
            color: this.zeroLineColor() || undefined,
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.liveData.set(makeSamples(140, 50, 80, Math.floor(Math.random() * 1_000_000_000)));
  }
}
