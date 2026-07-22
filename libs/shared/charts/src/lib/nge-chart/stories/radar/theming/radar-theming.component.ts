import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeRadarDataPoint } from '../../../../core/config';

import { createRadarChartConfig } from '../../../../presets/radar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'radar-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'radar-theming',
  standalone: true,
  styleUrl: './radar-theming.component.scss',
  templateUrl: './radar-theming.component.html',
})
export class RadarThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/radar/theming';

  // Single-series product profile for the palette + web + comparison examples.
  sampleData: NgeRadarDataPoint[] = [
    { label: 'Speed', value: 80 },
    { label: 'Power', value: 65 },
    { label: 'Range', value: 45 },
    { label: 'Agility', value: 70 },
    { label: 'Defense', value: 55 },
    { label: 'Stealth', value: 40 },
  ];

  // Multi-series data for the palette + area-emphasis examples.
  multiData: NgeRadarDataPoint[] = [
    { label: 'Speed', seriesId: 'Falcon', value: 80 },
    { label: 'Power', seriesId: 'Falcon', value: 60 },
    { label: 'Range', seriesId: 'Falcon', value: 45 },
    { label: 'Agility', seriesId: 'Falcon', value: 70 },
    { label: 'Defense', seriesId: 'Falcon', value: 55 },
    { label: 'Speed', seriesId: 'Vortex', value: 55 },
    { label: 'Power', seriesId: 'Vortex', value: 82 },
    { label: 'Range', seriesId: 'Vortex', value: 70 },
    { label: 'Agility', seriesId: 'Vortex', value: 48 },
    { label: 'Defense', seriesId: 'Vortex', value: 78 },
  ];

  // Default theme — no overrides. Uses the built-in `--chart-*` token palette,
  // which adapts to the container's light / dark surface.
  defaultConfig = createRadarChartConfig({
    data: this.multiData,
    tooltip: { enabled: true },
  });

  // Green series palette via theme.radar.series.colors — the series index maps to
  // colors[index % length].
  greenConfig: NgeChartConfig = {
    ...createRadarChartConfig({ data: this.multiData }),
    theme: {
      radar: {
        series: { colors: ['#2E7D32', '#66BB6A', '#A5D6A7'] },
      },
    },
  };

  // Blue series palette.
  blueConfig: NgeChartConfig = {
    ...createRadarChartConfig({ data: this.multiData }),
    theme: {
      radar: {
        series: { colors: ['#1565C0', '#42A5F5', '#90CAF9'] },
      },
    },
  };

  // Red series palette.
  redConfig: NgeChartConfig = {
    ...createRadarChartConfig({ data: this.multiData }),
    theme: {
      radar: {
        series: { colors: ['#B71C1C', '#EF5350', '#EF9A9A'] },
      },
    },
  };

  // Web styling — recolor the spokes + concentric grid rings independently of the series.
  webConfig: NgeChartConfig = {
    ...createRadarChartConfig({ data: this.sampleData }),
    theme: {
      radar: {
        axis: { color: '#B0BEC5', width: 1 },
        grid: { color: '#CFD8DC', width: 1 },
        series: { color: '#00897B' },
      },
    },
  };

  // Area emphasis — a denser fill + thicker outline + larger vertex dots for the polygons.
  areaConfig: NgeChartConfig = {
    ...createRadarChartConfig({ data: this.multiData }),
    theme: {
      radar: {
        series: { fillOpacity: 0.5, lineWidth: 3, pointRadius: 4 },
      },
    },
  };

  // --- Side-by-side comparison (highlight section) ---
  comparisonGreen: NgeChartConfig = {
    ...createRadarChartConfig({ data: this.sampleData }),
    theme: {
      radar: { series: { colors: ['#2E7D32', '#43A047', '#66BB6A'] } },
    },
  };

  comparisonBlue: NgeChartConfig = {
    ...createRadarChartConfig({ data: this.sampleData }),
    theme: {
      radar: { series: { colors: ['#1565C0', '#1E88E5', '#42A5F5'] } },
    },
  };

  comparisonRed: NgeChartConfig = {
    ...createRadarChartConfig({ data: this.sampleData }),
    theme: {
      radar: { series: { colors: ['#B71C1C', '#E53935', '#EF5350'] } },
    },
  };
}
