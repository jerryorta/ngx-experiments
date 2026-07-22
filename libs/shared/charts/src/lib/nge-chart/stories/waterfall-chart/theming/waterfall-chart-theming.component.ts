import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeWaterfallDataPoint } from '../../../../core/config';

import { createWaterfallChartConfig } from '../../../../presets/waterfall-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** A revenue bridge shared across every theming demo. */
const REVENUE: NgeWaterfallDataPoint[] = [
  { label: 'Start', value: 120 },
  { label: 'Product A', value: 45 },
  { label: 'Product B', value: -20 },
  { label: 'Services', value: 30 },
  { label: 'Returns', value: -15 },
  { kind: 'total', label: 'Net', value: 0 },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'waterfall-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'waterfall-chart-theming',
  standalone: true,
  styleUrl: './waterfall-chart-theming.component.scss',
  templateUrl: './waterfall-chart-theming.component.html',
})
export class WaterfallChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/waterfall-chart/theming';

  sampleData: NgeWaterfallDataPoint[] = REVENUE;

  // 1. Default — rise / fall / total pull from the theme's `waterfall` slice
  // (semantic green / red rise / fall + a `var(--chart-primary)` total).
  defaultConfig = createWaterfallChartConfig({
    data: this.sampleData,
    showLabels: true,
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  // 2. Muted palette via the `riseColor` / `fallColor` / `totalColor` options.
  mutedConfig = createWaterfallChartConfig({
    data: this.sampleData,
    fallColor: '#B0605E',
    riseColor: '#6B9B7C',
    totalColor: '#5B6B8C',
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  // 3. Bold palette via the same preset options.
  boldConfig = createWaterfallChartConfig({
    data: this.sampleData,
    fallColor: '#E53935',
    riseColor: '#00C853',
    totalColor: '#2962FF',
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  // 4. Monochrome — one hue at three weights (rise / fall / total).
  monochromeConfig = createWaterfallChartConfig({
    data: this.sampleData,
    fallColor: '#90A4AE',
    riseColor: '#455A64',
    showLabels: true,
    totalColor: '#263238',
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  // 5. Cumulative overlay with a custom `cumulativeColor` for the % line.
  cumulativeConfig = createWaterfallChartConfig({
    cumulative: true,
    cumulativeColor: '#8E24AA',
    data: this.sampleData,
    xAxisLabel: 'Movement',
    yAxisLabel: 'Revenue ($K)',
  });

  // 6. Full control via the `theme.waterfall` slice — the alternate path when you
  // compose a theme object rather than passing preset color options (also styles
  // the connectors + value labels).
  themeSliceConfig: NgeChartConfig = {
    ...createWaterfallChartConfig({
      data: this.sampleData,
      showLabels: true,
      xAxisLabel: 'Movement',
      yAxisLabel: 'Revenue ($K)',
    }),
    theme: {
      waterfall: {
        connector: { color: '#9E9E9E', dash: '2 4', width: 2 },
        fall: { color: '#C62828' },
        label: { color: '#212121', fontSize: 12, fontWeight: 700 },
        rise: { color: '#2E7D32' },
        total: { color: '#1565C0' },
      },
    },
  };
}
