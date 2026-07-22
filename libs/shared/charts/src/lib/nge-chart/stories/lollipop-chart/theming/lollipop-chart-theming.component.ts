import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLollipopDataPoint } from '../../../../core/config';

import { createLollipopChartConfig } from '../../../../presets/lollipop-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Customer-satisfaction score by city — the single-series theming dataset. */
const CITY_SCORES: NgeLollipopDataPoint[] = [
  { category: 'Austin', value: 78 },
  { category: 'Denver', value: 64 },
  { category: 'Seattle', value: 55 },
  { category: 'Portland', value: 71 },
  { category: 'Miami', value: 88 },
  { category: 'Chicago', value: 47 },
];

/** Median rent 2020 → 2024 ($) — a dumbbell dataset for the full-control demo. */
const RENT_CHANGE: NgeLollipopDataPoint[] = [
  { category: 'Austin', value: 1450, valueEnd: 1980 },
  { category: 'Denver', value: 1600, valueEnd: 1875 },
  { category: 'Seattle', value: 1900, valueEnd: 2350 },
  { category: 'Portland', value: 1550, valueEnd: 1790 },
  { category: 'Miami', value: 1700, valueEnd: 2450 },
];

/** Market share % 2019 → 2024 — a three-series slope dataset for the palette demo. */
const MARKET_SHARE: NgeLollipopDataPoint[] = [
  { category: '2019', seriesId: 'Brand A', value: 32 },
  { category: '2024', seriesId: 'Brand A', value: 48 },
  { category: '2019', seriesId: 'Brand B', value: 55 },
  { category: '2024', seriesId: 'Brand B', value: 38 },
  { category: '2019', seriesId: 'Brand C', value: 20 },
  { category: '2024', seriesId: 'Brand C', value: 41 },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'lollipop-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'lollipop-chart-theming',
  standalone: true,
  styleUrl: './lollipop-chart-theming.component.scss',
  templateUrl: './lollipop-chart-theming.component.html',
})
export class LollipopChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/lollipop-chart/theming';

  sampleData: NgeLollipopDataPoint[] = CITY_SCORES;

  // 1. Default — stem / marker / label pull from the theme's `lollipop` slice
  // (a muted `var(--chart-outline-variant)` stem + a `var(--chart-primary)` marker).
  defaultConfig = createLollipopChartConfig({
    data: this.sampleData,
    showLabels: true,
    xAxisLabel: 'City',
    yAxisLabel: 'Satisfaction',
  });

  // 2. Marker color — recolor the single-series glyph via `theme.lollipop.marker`
  // (single-series rows have no `seriesId`, so `marker.color` is the fill).
  markerColorConfig: NgeChartConfig = {
    ...createLollipopChartConfig({
      data: this.sampleData,
      xAxisLabel: 'City',
      yAxisLabel: 'Satisfaction',
    }),
    theme: {
      lollipop: {
        marker: { color: '#8E24AA', strokeColor: '#F3E5F5' },
      },
    },
  };

  // 3. Stem styling — thicken and recolor the stem via `theme.lollipop.stem`.
  stemStyleConfig: NgeChartConfig = {
    ...createLollipopChartConfig({
      data: this.sampleData,
      xAxisLabel: 'City',
      yAxisLabel: 'Satisfaction',
    }),
    theme: {
      lollipop: {
        marker: { color: '#00897B' },
        stem: { color: '#B2DFDB', width: 4 },
      },
    },
  };

  // 4. Value labels — style the printed values via `theme.lollipop.label`.
  labelStyleConfig: NgeChartConfig = {
    ...createLollipopChartConfig({
      data: this.sampleData,
      showLabels: true,
      xAxisLabel: 'City',
      yAxisLabel: 'Satisfaction',
    }),
    theme: {
      lollipop: {
        label: { color: '#C62828', fontSize: 13, fontWeight: 700 },
        marker: { color: '#EF5350' },
      },
    },
  };

  // 5. Semantic tokens — override with `var(--chart-*)` tokens so the marker + stem
  // track the surrounding theme and adapt automatically to light / dark.
  tokenConfig: NgeChartConfig = {
    ...createLollipopChartConfig({
      data: this.sampleData,
      xAxisLabel: 'City',
      yAxisLabel: 'Satisfaction',
    }),
    theme: {
      lollipop: {
        marker: { color: 'var(--chart-tertiary)' },
        stem: { color: 'var(--chart-secondary)' },
      },
    },
  };

  // 6. Multi-series palette — a slope chart colored via `theme.lollipop.marker.colors`
  // (each `seriesId` maps to `colors[index % length]`).
  paletteConfig: NgeChartConfig = {
    ...createLollipopChartConfig({
      connect: true,
      data: MARKET_SHARE,
      showLabels: true,
      xAxisLabel: 'Year',
      yAxisLabel: 'Market Share (%)',
    }),
    theme: {
      lollipop: {
        marker: { colors: ['#1E88E5', '#E53935', '#43A047'], radius: 6 },
      },
    },
  };

  // 7. Full control — a dumbbell styled through the whole `theme.lollipop` slice at
  // once (marker + span stem + labels).
  fullControlConfig: NgeChartConfig = {
    ...createLollipopChartConfig({
      data: RENT_CHANGE,
      showLabels: true,
      xAxisLabel: 'City',
      yAxisLabel: 'Median Rent ($)',
    }),
    theme: {
      lollipop: {
        label: { color: '#37474F', fontSize: 11, fontWeight: 600 },
        marker: { color: '#5E35B1', radius: 6, strokeColor: '#EDE7F6', strokeWidth: 2 },
        stem: { color: '#B39DDB', width: 3 },
      },
    },
  };

  // Side-by-side palette variants for the highlight row.
  greenConfig: NgeChartConfig = {
    ...createLollipopChartConfig({ data: this.sampleData }),
    theme: { lollipop: { marker: { color: '#2E7D32' }, stem: { color: '#A5D6A7' } } },
  };

  blueConfig: NgeChartConfig = {
    ...createLollipopChartConfig({ data: this.sampleData }),
    theme: { lollipop: { marker: { color: '#1565C0' }, stem: { color: '#90CAF9' } } },
  };

  amberConfig: NgeChartConfig = {
    ...createLollipopChartConfig({ data: this.sampleData }),
    theme: { lollipop: { marker: { color: '#EF6C00' }, stem: { color: '#FFCC80' } } },
  };
}
