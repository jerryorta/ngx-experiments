import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeGaugeDataPoint } from '../../../../core/config';

import { createGaugeChartConfig } from '../../../../presets/gauge-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'gauge-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'gauge-theming',
  standalone: true,
  styleUrl: './gauge-theming.component.scss',
  templateUrl: './gauge-theming.component.html',
})
export class GaugeThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/gauge/theming';

  // Single-value throughput reading shared across the theming examples.
  sampleData: NgeGaugeDataPoint = {
    label: 'Throughput',
    max: 100,
    min: 0,
    units: '%',
    value: 68,
  };

  // Default theme — no overrides. Uses the built-in `--chart-*` token palette,
  // which adapts to the container's light / dark surface.
  defaultConfig = createGaugeChartConfig({
    data: this.sampleData,
  });

  // Green value + track via theme.gauge.value.color / track.color.
  greenConfig: NgeChartConfig = {
    ...createGaugeChartConfig({ data: this.sampleData }),
    theme: {
      gauge: {
        track: { color: '#E8F5E9' },
        value: { color: '#43A047' },
      },
    },
  };

  // Blue value + track.
  blueConfig: NgeChartConfig = {
    ...createGaugeChartConfig({ data: this.sampleData }),
    theme: {
      gauge: {
        track: { color: '#E3F2FD' },
        value: { color: '#1E88E5' },
      },
    },
  };

  // Red value + track.
  redConfig: NgeChartConfig = {
    ...createGaugeChartConfig({ data: this.sampleData }),
    theme: {
      gauge: {
        track: { color: '#FFEBEE' },
        value: { color: '#E53935' },
      },
    },
  };

  // Needle styling — a thicker, recolored needle on an angular gauge
  // (theme.gauge.needle.color / width).
  needleConfig: NgeChartConfig = {
    ...createGaugeChartConfig({ data: this.sampleData, indicator: 'needle' }),
    theme: {
      gauge: {
        needle: { color: '#6A1B9A', width: 4 },
        value: { color: '#9C27B0' },
      },
    },
  };

  // Threshold palette — recolor the ascending bands via theme.gauge.threshold.colors
  // (band index → colors[index % length]).
  thresholdConfig: NgeChartConfig = {
    ...createGaugeChartConfig({
      data: this.sampleData,
      indicator: 'needle',
      thresholds: [{ value: 50 }, { value: 80 }, { value: 100 }],
    }),
    theme: {
      gauge: {
        threshold: { colors: ['#43A047', '#FB8C00', '#E53935'] },
      },
    },
  };

  // Center value-label styling — recolor + resize the readout via theme.gauge.label.
  labelConfig: NgeChartConfig = {
    ...createGaugeChartConfig({ data: this.sampleData }),
    theme: {
      gauge: {
        label: { color: '#1565C0', fontSize: 28, fontWeight: 700 },
        value: { color: '#2196F3' },
      },
    },
  };

  // --- Side-by-side comparison (highlight section): one theme across all three shapes ---
  solidComparison: NgeChartConfig = {
    ...createGaugeChartConfig({ data: this.sampleData }),
    theme: {
      gauge: {
        track: { color: '#E8F5E9' },
        value: { color: '#43A047' },
      },
    },
  };

  angularComparison: NgeChartConfig = {
    ...createGaugeChartConfig({ data: this.sampleData, indicator: 'needle' }),
    theme: {
      gauge: {
        needle: { color: '#1565C0' },
        track: { color: '#E3F2FD' },
        value: { color: '#1E88E5' },
      },
    },
  };

  linearComparison: NgeChartConfig = {
    ...createGaugeChartConfig({ data: this.sampleData, shape: 'linear' }),
    theme: {
      gauge: {
        track: { color: '#F3E5F5' },
        value: { color: '#9C27B0' },
      },
    },
  };
}
