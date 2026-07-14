import { CommonModule } from '@angular/common';
import {
  Component,
  computed,
  effect,
  input,
  linkedSignal,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeScatterDataPoint } from '../../../../core/config';

import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { NgeScatterChartTransform } from '../../../../transforms/scatter-chart.transform';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'scatter-chart-interaction-stories',
  },
  imports: [
    CommonModule,
    NgeChartComponent,
    NgeChartLegendComponent,
    NgeStorybookReviewContainerComponent,
  ],
  selector: 'scatter-chart-interaction-stories',
  standalone: true,
  styleUrl: './scatter-chart-interaction-stories.component.scss',
  templateUrl: './scatter-chart-interaction-stories.component.html',
})
export class ScatterChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/scatter-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // Layer config inputs
  readonly pointRadius = input<number>(6);
  readonly xDomainPadding = input<number>(0.05);
  readonly yDomainPadding = input<number>(0.1);
  readonly yStartAtZero = input<boolean>(false);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);
  readonly showXGrid = input<boolean>(false);
  readonly showYGrid = input<boolean>(false);
  readonly xAxisTicks = input<number>(0);
  readonly yAxisTicks = input<number>(0);
  readonly xAxisLabel = input<string>('X Value');
  readonly yAxisLabel = input<string>('Y Value');
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(140);

  // Multi-series + legend inputs
  readonly multiSeries = input<boolean>(false);
  readonly pointsPerSeries = input<number>(6);
  readonly showLegend = input<boolean>(false);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('bottom');
  /** Hide the chart-internal legend and render a standalone <nge-chart-legend> above the chart */
  readonly externalLegend = input<boolean>(false);
  /** Enable wheel-zoom + drag-pan gestures (double-click resets) */
  readonly enableGestures = input<boolean>(false);
  /** Render the X axis as a full-range ruler with a draggable brush (window + handles) */
  readonly rangeAxisX = input<boolean>(false);
  /** Render the Y axis as a full-range ruler with a draggable brush (window + handles) */
  readonly rangeAxisY = input<boolean>(false);

  // Theme inputs - Point styling
  readonly pointColor = input<string>('');
  readonly pointHoverColor = input<string>('');
  readonly pointOpacity = input<number>(0.7);
  readonly pointStrokeColor = input<string>('');
  readonly pointStrokeWidth = input<number>(1);

  // Theme inputs - Axis styling
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Bumped by the "Randomize Data" button to re-roll the generated point clouds.
  private readonly randomizeSeed = signal(0);

  // Per-series point count used to GENERATE data: normally follows the
  // `pointsPerSeries` control, but "Randomize Data" overrides it with a random
  // value (100–300) so each click also varies the data SIZE — showing the chart
  // re-scale to different volumes. As a linkedSignal it resets to the control
  // value whenever the control changes, so the slider still takes effect.
  private readonly generatedPointsPerSeries = linkedSignal(() => this.pointsPerSeries());

  // Data VALUE range (max) the generated cloud spans — normally 0–100, but
  // "Randomize Data" varies it (up to ~0–300) so the chart's axes visibly re-scale
  // to different data extents. Only the randomize button changes it.
  private readonly generatedRange = signal(100);

  // Single-series data, generated at the current density (3 × the generated
  // per-series count) with a gentle upward trend. Re-rolls when the seed or the
  // generated count changes.
  readonly sampleData = computed<NgeScatterDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildSingleSeries(this.generatedPointsPerSeries() * 3, this.generatedRange());
  });

  // Multi-series data — three series across the SAME x-range (like line-chart
  // series) so they overlap: A rises, B stays mid, C declines and they cross.
  // Density follows the `pointsPerSeries` control; Randomize re-rolls positions
  // AND varies the per-series count (see generatedPointsPerSeries).
  readonly multiSeriesData = computed<NgeScatterDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildMultiSeries(this.generatedPointsPerSeries(), this.generatedRange());
  });

  // Transform owns the interaction state (legend series selection) and derives
  // the preset config; the constructor effect keeps its options in sync with
  // the Storybook controls.
  readonly transform = new NgeScatterChartTransform({ data: [] });

  constructor() {
    effect(() => {
      this.transform.updateOptions({
        data: this.multiSeries() ? this.multiSeriesData() : this.sampleData(),
        gestures: this.enableGestures() ? { brushZoom: true, pan: true, zoom: true } : undefined,
        legend:
          this.externalLegend() && this.multiSeries()
            ? { enabled: false } // external standalone legend takes over
            : {
                enabled: this.showLegend(),
                interactive: true,
                position: this.legendPosition(),
              },
        pointRadius: this.pointRadius(),
        rangeAxisX: this.rangeAxisX(),
        rangeAxisY: this.rangeAxisY(),
        showXAxis: this.showXAxis(),
        showXGrid: this.showXGrid(),
        showYAxis: this.showYAxis(),
        showYGrid: this.showYGrid(),
        tooltip: this.showTooltip()
          ? {
              enabled: true,
              height: this.tooltipHeight(),
              position: this.tooltipPosition(),
              style: {
                backgroundColor: this.tooltipBackgroundColor() || undefined,
                borderColor: this.tooltipBorderColor() || undefined,
                borderWidth: this.tooltipBorderWidth(),
                divotHeight: this.tooltipDivotHeight(),
                divotWidth: this.tooltipDivotWidth(),
              },
              width: this.tooltipWidth(),
            }
          : undefined,
        xAxisLabel: this.xAxisLabel() || undefined,
        xAxisTicks: this.xAxisTicks() || undefined,
        xDomainPadding: this.xDomainPadding(),
        yAxisLabel: this.yAxisLabel() || undefined,
        yAxisTicks: this.yAxisTicks() || undefined,
        yDomainPadding: this.yDomainPadding(),
        yStartAtZero: this.yStartAtZero(),
      });
    });
  }

  // Re-roll the generated data AND vary both its size (100–300 per series) and its
  // value range (0–100 up to ~0–300), so the chart re-scales its axes to different
  // data extents, not just new point positions.
  randomizeData(): void {
    this.generatedPointsPerSeries.set(100 + Math.floor(Math.random() * 201));
    this.generatedRange.set(100 + Math.floor(Math.random() * 201));
    this.randomizeSeed.update(seed => seed + 1);
  }

  // Single upward-trending cloud of `count` points spread across the x-range,
  // scaled from the base 0–100 space to span 0–`range`.
  private buildSingleSeries(count: number, range: number): NgeScatterDataPoint[] {
    const span = Math.max(1, count - 1);
    const scale = range / 100;
    return Array.from({ length: count }, (_, i) => {
      const x = Math.max(2, Math.min(98, (100 * i) / span + (Math.random() - 0.5) * 8));
      const y = Math.max(4, Math.min(96, 12 + x * 0.6 + (Math.random() - 0.5) * 28));
      return { x: Math.round(x * scale), y: Math.round(y * scale) };
    });
  }

  // Three overlapping series (A rises, B mid, C declines) at `perSeries` points
  // each, all spread across the SAME x-range so they interleave and cross, scaled
  // from the base 0–100 space to span 0–`range`.
  private buildMultiSeries(perSeries: number, range: number): NgeScatterDataPoint[] {
    const seriesIds = ['Series A', 'Series B', 'Series C'];
    const span = Math.max(1, perSeries - 1);
    const scale = range / 100;
    return seriesIds.flatMap((seriesId, index) =>
      Array.from({ length: perSeries }, (_, i) => {
        const x = Math.max(4, Math.min(96, 8 + (84 * i) / span + (Math.random() - 0.5) * 8));
        // A rises, B stays mid, C declines across the SAME x-range.
        const trends = [15 + x * 0.55, 50, 80 - x * 0.5];
        const y = Math.max(5, Math.min(95, trends[index] + (Math.random() - 0.5) * 22));
        return { seriesId, x: Math.round(x * scale), y: Math.round(y * scale) };
      })
    );
  }

  // Computed config: the transform's derived config with the control-driven
  // base margin + theme overrides layered on top
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = this.transform.config();

    return {
      ...baseConfig,
      base: {
        ...baseConfig.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      theme: {
        axis: {
          labelFontSize: this.axisLabelFontSize(),
          tickFontSize: this.axisTickFontSize(),
        },
        scatter: {
          point: {
            color: this.pointColor() || undefined,
            hoverColor: this.pointHoverColor() || undefined,
            opacity: this.pointOpacity(),
            strokeColor: this.pointStrokeColor() || undefined,
            strokeWidth: this.pointStrokeWidth(),
          },
        },
      },
    };
  });
}
