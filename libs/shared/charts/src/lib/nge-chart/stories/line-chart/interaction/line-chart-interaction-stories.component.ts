import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';

import { NgeLineChartTransform } from '../../../../transforms/line-chart.transform';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'line-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'line-chart-interaction-stories',
  standalone: true,
  styleUrl: './line-chart-interaction-stories.component.scss',
  templateUrl: './line-chart-interaction-stories.component.html',
})
export class LineChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/line-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // Layer config inputs
  readonly curveType = input<'linear' | 'monotone' | 'step'>('linear');
  readonly showPoints = input<boolean>(true);
  readonly showArea = input<boolean>(false);
  readonly areaOpacity = input<number>(0.3);
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(140);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);
  readonly xAxisLabel = input<string>('xAxisLabel');
  readonly yAxisLabel = input<string>('yAxisLabel');

  // Interaction inputs (ARCH-174)
  /** Enable wheel-zoom / drag-pan / brush-zoom gestures (double-click resets). */
  readonly enableGestures = input<boolean>(true);
  /**
   * X data type: 'categorical' (point scale → whole-category WINDOW zoom) or
   * 'time' (continuous scale → continuous zoom, domains in epoch ms).
   */
  readonly dataMode = input<'categorical' | 'time'>('categorical');

  // Theme inputs - Line styling
  readonly lineWidth = input<number>(2);
  readonly pointRadius = input<number>(4);
  readonly lineColor = input<string>('');

  // Theme inputs - Axis styling
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Bumped by "Randomize Data" to re-roll the generated series.
  private readonly randomizeSeed = signal(0);

  // 12 categorical months — enough to window into with band-window zoom.
  readonly categoricalData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildCategorical();
  });

  // 12 daily time points — a continuous time axis for continuous zoom.
  readonly timeData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildTime();
  });

  // Transform owns the interaction state (zoom/pan/window) and derives the
  // preset config; the constructor effect keeps its options in sync with the
  // Storybook controls (zoom state survives control changes).
  readonly transform = new NgeLineChartTransform({ data: [] });

  constructor() {
    effect(() => {
      this.transform.updateOptions({
        areaOpacity: this.areaOpacity(),
        curveType: this.curveType(),
        data: this.dataMode() === 'time' ? this.timeData() : this.categoricalData(),
        gestures: this.enableGestures() ? { brushZoom: true, pan: true, zoom: true } : undefined,
        lineWidth: this.lineWidth(),
        pointRadius: this.pointRadius(),
        seriesColors: this.lineColor() ? [this.lineColor()] : undefined,
        showArea: this.showArea(),
        showPoints: this.showPoints(),
        showXAxis: this.showXAxis(),
        showYAxis: this.showYAxis(),
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
        yAxisLabel: this.yAxisLabel() || undefined,
      });
    });
  }

  // Re-roll the generated data (both modes).
  randomizeData(): void {
    this.randomizeSeed.update(seed => seed + 1);
  }

  // 12 months of categorical data with random values.
  private buildCategorical(): NgeLineDataPoint[] {
    const months = [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ];
    return months.map(label => ({ x: label, y: Math.floor(Math.random() * 80) + 10 }));
  }

  // 12 consecutive daily points from a fixed start — a continuous time axis.
  private buildTime(): NgeLineDataPoint[] {
    const start = new Date('2026-01-01T00:00:00Z').getTime();
    const day = 86_400_000;
    return Array.from({ length: 12 }, (_, i) => ({
      x: new Date(start + i * day),
      y: Math.floor(Math.random() * 80) + 10,
    }));
  }

  // The transform's derived config with control-driven margin + theme layered on.
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
      },
    };
  });
}
