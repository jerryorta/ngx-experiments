import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeRadialBarDataPoint } from '../../../../core/config';

import { createRadialBarChartConfig } from '../../../../presets/radial-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'radial-bar-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'radial-bar-theming',
  standalone: true,
  styleUrl: './radial-bar-theming.component.scss',
  templateUrl: './radial-bar-theming.component.html',
})
export class RadialBarThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/radial-bar/theming';

  // Single-series weekday magnitudes for the bar-palette + comparison examples.
  sampleData: NgeRadialBarDataPoint[] = [
    { label: 'Mon', value: 30 },
    { label: 'Tue', value: 55 },
    { label: 'Wed', value: 40 },
    { label: 'Thu', value: 25 },
    { label: 'Fri', value: 60 },
  ];

  // Multi-series quarterly data for the area-styling example.
  areaData: NgeRadialBarDataPoint[] = [
    { label: 'Q1', seriesId: '2023', value: 30 },
    { label: 'Q2', seriesId: '2023', value: 52 },
    { label: 'Q3', seriesId: '2023', value: 41 },
    { label: 'Q4', seriesId: '2023', value: 60 },
    { label: 'Q1', seriesId: '2024', value: 45 },
    { label: 'Q2', seriesId: '2024', value: 38 },
    { label: 'Q3', seriesId: '2024', value: 66 },
    { label: 'Q4', seriesId: '2024', value: 50 },
  ];

  // Circular-heatmap data (angular weekday × radial AM/PM ring) for the cell example.
  cellData: NgeRadialBarDataPoint[] = [
    { band: 'AM', label: 'Mon', value: 100 },
    { band: 'PM', label: 'Mon', value: 40 },
    { band: 'AM', label: 'Tue', value: 70 },
    { band: 'PM', label: 'Tue', value: 90 },
    { band: 'AM', label: 'Wed', value: 55 },
    { band: 'PM', label: 'Wed', value: 60 },
    { band: 'AM', label: 'Thu', value: 30 },
    { band: 'PM', label: 'Thu', value: 85 },
    { band: 'AM', label: 'Fri', value: 95 },
    { band: 'PM', label: 'Fri', value: 45 },
  ];

  // Default theme — no overrides. Uses the built-in `--chart-*` token palette,
  // which adapts to the container's light / dark surface.
  defaultConfig = createRadialBarChartConfig({
    data: this.sampleData,
    padAngle: 0.02,
  });

  // Green bar palette via theme['radial-bar'].bar.colors — the datum index maps to
  // colors[index % length].
  greenConfig: NgeChartConfig = {
    ...createRadialBarChartConfig({ data: this.sampleData, padAngle: 0.02 }),
    theme: {
      'radial-bar': {
        bar: {
          colors: ['#2E7D32', '#43A047', '#66BB6A', '#81C784', '#A5D6A7'],
        },
      },
    },
  };

  // Blue bar palette.
  blueConfig: NgeChartConfig = {
    ...createRadialBarChartConfig({ data: this.sampleData, padAngle: 0.02 }),
    theme: {
      'radial-bar': {
        bar: {
          colors: ['#1565C0', '#1E88E5', '#42A5F5', '#64B5F6', '#90CAF9'],
        },
      },
    },
  };

  // Red bar palette.
  redConfig: NgeChartConfig = {
    ...createRadialBarChartConfig({ data: this.sampleData, padAngle: 0.02 }),
    theme: {
      'radial-bar': {
        bar: {
          colors: ['#B71C1C', '#E53935', '#EF5350', '#E57373', '#EF9A9A'],
        },
      },
    },
  };

  // Cell-intensity theme — a teal base fill whose opacity ramps from a raised
  // `minOpacity` floor up to 1 with value (circular heat map).
  cellConfig: NgeChartConfig = {
    ...createRadialBarChartConfig({ data: this.cellData, innerRadius: 0.2, mark: 'cell' }),
    theme: {
      'radial-bar': {
        cell: {
          color: '#00897B',
          minOpacity: 0.15,
        },
      },
    },
  };

  // Area theme — a denser fill + thicker outline for the multi-series radial area.
  areaConfig: NgeChartConfig = {
    ...createRadialBarChartConfig({ data: this.areaData, innerRadius: 0.1, mark: 'area' }),
    theme: {
      'radial-bar': {
        area: {
          fillOpacity: 0.5,
          lineWidth: 3,
        },
      },
    },
  };

  // --- Side-by-side comparison (highlight section) ---
  comparisonGreen: NgeChartConfig = {
    ...createRadialBarChartConfig({ data: this.sampleData, padAngle: 0.02 }),
    theme: {
      'radial-bar': { bar: { colors: ['#2E7D32', '#43A047', '#66BB6A'] } },
    },
  };

  comparisonBlue: NgeChartConfig = {
    ...createRadialBarChartConfig({ data: this.sampleData, padAngle: 0.02 }),
    theme: {
      'radial-bar': { bar: { colors: ['#1565C0', '#1E88E5', '#42A5F5'] } },
    },
  };

  comparisonRed: NgeChartConfig = {
    ...createRadialBarChartConfig({ data: this.sampleData, padAngle: 0.02 }),
    theme: {
      'radial-bar': { bar: { colors: ['#B71C1C', '#E53935', '#EF5350'] } },
    },
  };
}
