import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';

import { createLineChartConfig } from '../../../../presets/line-chart.preset';
import { addOverlay } from '../../../../presets/overlay-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Theming examples for the analytical `overlay` layer.
 *
 * The overlay is namespaced under `theme.overlay` (the key MUST equal the layer
 * `type`). Its slices map to the modes: `fitLine` (trendline), `band` (fan /
 * control shading), and `meanLine` / `limitLine` (control rules). Overriding them
 * recolours the annotation independently of the host line's `theme.line`.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'overlay-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'overlay-theming',
  standalone: true,
  styleUrl: './overlay-theming.component.scss',
  templateUrl: './overlay-theming.component.html',
})
export class OverlayThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/overlay/theming';

  // Shared datasets (numeric x → continuous scale for every mode).
  trendData: NgeLineDataPoint[] = [
    { x: 1, y: 16 },
    { x: 2, y: 25 },
    { x: 3, y: 21 },
    { x: 4, y: 31 },
    { x: 5, y: 28 },
    { x: 6, y: 37 },
    { x: 7, y: 34 },
    { x: 8, y: 43 },
    { x: 9, y: 40 },
    { x: 10, y: 49 },
    { x: 11, y: 46 },
    { x: 12, y: 55 },
  ];

  controlData: NgeLineDataPoint[] = [
    { x: 1, y: 49 },
    { x: 2, y: 54 },
    { x: 3, y: 46 },
    { x: 4, y: 55 },
    { x: 5, y: 50 },
    { x: 6, y: 53 },
    { x: 7, y: 45 },
    { x: 8, y: 56 },
    { x: 9, y: 48 },
    { x: 10, y: 52 },
    { x: 11, y: 44 },
    { x: 12, y: 53 },
  ];

  fanData: NgeLineDataPoint[] = [
    { x: 1, y: 40 },
    { x: 2, y: 43 },
    { x: 3, y: 42 },
    { x: 4, y: 47 },
    { x: 5, y: 49 },
    { x: 6, y: 52 },
    { x: 7, y: 55 },
    { x: 8, y: 58 },
    { x: 9, y: 61 },
    { x: 10, y: 64 },
    { x: 11, y: 67 },
    { x: 12, y: 70 },
  ];

  // Default theme — no overrides; the overlay reads its `--chart-*` token defaults
  // (fit line = --chart-secondary).
  defaultTrendConfig = addOverlay(
    createLineChartConfig({
      data: this.trendData,
      margin: { bottom: 40, left: 50, right: 24, top: 24 },
      showPoints: true,
      showXAxis: true,
      showYAxis: true,
    }),
    {
      data: this.trendData,
      fit: 'linear',
      mode: 'trendline',
    }
  );

  // Recoloured trend line — a bold dashed reference line over a muted host line.
  themedTrendConfig: NgeChartConfig = {
    ...addOverlay(
      createLineChartConfig({
        data: this.trendData,
        margin: { bottom: 40, left: 50, right: 24, top: 24 },
        seriesColors: ['#90A4AE'],
        showPoints: true,
        showXAxis: true,
        showYAxis: true,
      }),
      {
        data: this.trendData,
        fit: 'linear',
        mode: 'trendline',
      }
    ),
    theme: {
      line: {
        line: { color: '#90A4AE' },
        point: { color: '#90A4AE' },
      },
      overlay: {
        fitLine: { color: '#E53935', dash: '6 3', width: 3 },
      },
    },
  };

  // Control theming — mean / limit rules + shaded band recoloured together.
  themedControlConfig: NgeChartConfig = {
    ...addOverlay(
      createLineChartConfig({
        data: this.controlData,
        margin: { bottom: 40, left: 50, right: 24, top: 24 },
        seriesColors: ['#455A64'],
        showPoints: true,
        showXAxis: true,
        showYAxis: true,
        yDomain: [20, 80],
      }),
      {
        data: this.controlData,
        mode: 'control',
        showControlBand: true,
        sigma: 3,
      }
    ),
    theme: {
      overlay: {
        band: { fillColor: '#26A69A', fillOpacity: 0.18 },
        limitLine: { color: '#EF5350', dash: '4 3', width: 1.5 },
        meanLine: { color: '#26A69A', dash: '6 3', width: 2 },
      },
    },
  };

  // Fan theming — recolour the prediction-interval bands (overlapping translucent
  // fills darken toward the centre).
  themedFanConfig: NgeChartConfig = {
    ...addOverlay(
      createLineChartConfig({
        data: this.fanData,
        margin: { bottom: 40, left: 50, right: 24, top: 24 },
        seriesColors: ['#5E35B1'],
        showPoints: true,
        showXAxis: true,
        showYAxis: true,
        yDomain: [0, 110],
      }),
      {
        data: this.fanData,
        intervals: [0.5, 0.8, 0.95],
        mode: 'fan',
      }
    ),
    theme: {
      overlay: {
        band: { fillColor: '#7E57C2', fillOpacity: 0.22 },
      },
    },
  };

  // Comparison twins (default token fit line vs a custom amber solid fit line).
  comparisonDefaultConfig = addOverlay(
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

  comparisonCustomConfig: NgeChartConfig = {
    ...addOverlay(
      createLineChartConfig({
        data: this.trendData,
        seriesColors: ['#B0BEC5'],
        showPoints: true,
      }),
      {
        data: this.trendData,
        fit: 'linear',
        mode: 'trendline',
      }
    ),
    theme: {
      line: {
        line: { color: '#B0BEC5' },
        point: { color: '#B0BEC5' },
      },
      overlay: {
        fitLine: { color: '#FB8C00', dash: '', width: 3 },
      },
    },
  };
}
