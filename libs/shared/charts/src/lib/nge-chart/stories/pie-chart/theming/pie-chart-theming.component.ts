import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgePieDataPoint } from '../../../../core/config';

import { createPieChartConfig } from '../../../../presets/pie-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'pie-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'pie-chart-theming',
  standalone: true,
  styleUrl: './pie-chart-theming.component.scss',
  templateUrl: './pie-chart-theming.component.html',
})
export class PieChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pie-chart/theming';

  // Six-slice dataset so a full 6-colour palette is exercised.
  sampleData: NgePieDataPoint[] = [
    { label: 'Rent', value: 1800 },
    { label: 'Food', value: 600 },
    { label: 'Transit', value: 300 },
    { label: 'Utilities', value: 250 },
    { label: 'Savings', value: 450 },
    { label: 'Other', value: 150 },
  ];

  // Default theme — no overrides. Uses the built-in `--chart-*` token palette,
  // which is theme-aware (adapts to the container's light / dark surface).
  defaultConfig = createPieChartConfig({
    data: this.sampleData,
    innerRadius: 0.5,
  });

  // Warm palette override via theme.pie.slice.colors.
  warmConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.5 }),
    theme: {
      pie: {
        slice: {
          colors: ['#E53935', '#FB8C00', '#FDD835', '#F4511E', '#D81B60', '#8E24AA'],
        },
      },
    },
  };

  // Cool palette override.
  coolConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.5 }),
    theme: {
      pie: {
        slice: {
          colors: ['#1E88E5', '#00ACC1', '#43A047', '#3949AB', '#00897B', '#5E35B1'],
        },
      },
    },
  };

  // Per-datum color overrides — each slice carries its own `color`, which wins
  // over any palette. Useful when colours are semantic rather than positional.
  perDatumConfig = createPieChartConfig({
    data: [
      { color: '#5C6BC0', label: 'Rent', value: 1800 },
      { color: '#66BB6A', label: 'Food', value: 600 },
      { color: '#FFA726', label: 'Transit', value: 300 },
      { color: '#26C6DA', label: 'Utilities', value: 250 },
      { color: '#EC407A', label: 'Savings', value: 450 },
      { color: '#8D6E63', label: 'Other', value: 150 },
    ],
    innerRadius: 0.5,
  });

  // Thick surface-coloured separators via slice.stroke + strokeWidth.
  strokeConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData }),
    theme: {
      pie: {
        slice: {
          colors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#E53935'],
          stroke: '#ffffff',
          strokeWidth: 3,
        },
      },
    },
  };

  // Translucent slices via slice.opacity.
  translucentConfig: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.4 }),
    theme: {
      pie: {
        slice: {
          colors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA', '#00ACC1', '#E53935'],
          opacity: 0.7,
        },
      },
    },
  };

  // --- Side-by-side comparison (highlight section) ---
  comparisonDefault = createPieChartConfig({ data: this.sampleData, innerRadius: 0.55 });

  comparisonWarm: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.55 }),
    theme: {
      pie: {
        slice: { colors: ['#E53935', '#FB8C00', '#FDD835', '#F4511E', '#D81B60', '#8E24AA'] },
      },
    },
  };

  comparisonCool: NgeChartConfig = {
    ...createPieChartConfig({ data: this.sampleData, innerRadius: 0.55 }),
    theme: {
      pie: {
        slice: { colors: ['#1E88E5', '#00ACC1', '#43A047', '#3949AB', '#00897B', '#5E35B1'] },
      },
    },
  };
}
