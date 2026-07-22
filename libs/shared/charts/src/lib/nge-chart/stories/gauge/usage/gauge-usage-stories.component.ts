import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeGaugeDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createGaugeChartConfig } from '../../../../presets/gauge-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'gauge-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'gauge-usage-stories',
  standalone: true,
  styleUrl: './gauge-usage-stories.component.scss',
  templateUrl: './gauge-usage-stories.component.html',
})
export class GaugeUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/gauge/usage';

  // Shared single-value datum — a CPU-load reading measured against a 0–100% range.
  // A gauge renders ONE datum (not an array); `value` is clamped into `[min, max]`.
  private readonly cpuLoad: NgeGaugeDataPoint = {
    label: 'CPU Load',
    max: 100,
    min: 0,
    units: '%',
    value: 72,
  };

  // ============================================
  // EXAMPLE 1: Solid Gauge (default arc + fill)
  // ============================================
  solidConfig = createGaugeChartConfig({
    data: this.cpuLoad,
  });

  // ============================================
  // EXAMPLE 2: Angular Gauge (arc + needle)
  // ============================================
  needleConfig = createGaugeChartConfig({
    data: this.cpuLoad,
    indicator: 'needle',
  });

  // ============================================
  // EXAMPLE 3: Progress Bar (linear)
  // ============================================
  linearConfig = createGaugeChartConfig({
    data: this.cpuLoad,
    shape: 'linear',
  });

  // ============================================
  // EXAMPLE 4: Threshold Bands
  // ============================================
  thresholdConfig = createGaugeChartConfig({
    data: this.cpuLoad,
    indicator: 'needle',
    thresholds: [{ value: 50 }, { value: 80 }, { value: 100 }],
  });

  // ============================================
  // EXAMPLE 5: Semicircle (horizontal base — endpoints level)
  // ============================================
  semicircleConfig = createGaugeChartConfig({
    data: this.cpuLoad,
    endAngle: Math.PI / 2,
    innerRadius: 0.55,
    startAngle: -Math.PI / 2,
  });

  // ============================================
  // EXAMPLE 6: Tooltip
  // ============================================
  tooltipConfig = createGaugeChartConfig({
    data: this.cpuLoad,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 7: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createGaugeChartConfig({
    data: this.cpuLoad,
    onClick: (event: NgeChartLayerClickEvent<NgeGaugeDataPoint>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}${event.data.units ?? ''}`);
    },
  });

  // ============================================
  // EXAMPLE 8: Dynamic Data with Signals
  // ============================================
  readonly dynamicValue = signal<NgeGaugeDataPoint>(this.cpuLoad);

  readonly dynamicConfig = computed<NgeChartConfig>(() =>
    createGaugeChartConfig({
      data: this.dynamicValue(),
      indicator: 'needle',
      thresholds: [{ value: 50 }, { value: 80 }, { value: 100 }],
    })
  );

  randomizeValue(): void {
    this.dynamicValue.update(data => ({
      ...data,
      value: Math.round(Math.random() * (data.max - data.min)) + data.min,
    }));
  }
}
