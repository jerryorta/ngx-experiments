import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHierarchyDatum } from '../../../../core/config';

import { createSunburstChartConfig } from '../../../../presets/sunburst-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sunburst-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'sunburst-chart-theming',
  standalone: true,
  styleUrl: './sunburst-chart-theming.component.scss',
  templateUrl: './sunburst-chart-theming.component.html',
})
export class SunburstChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sunburst-chart/theming';

  // Shared monthly-budget hierarchy — three top-level branches, each fanned out into
  // categories (some with a further sub-level). Leaves carry `value`; internal nodes
  // omit it and are summed by d3.hierarchy().sum().
  sampleData: NgeHierarchyDatum[] = [
    {
      children: [
        { label: 'Rent', value: 1800 },
        {
          children: [
            { label: 'Electric', value: 180 },
            { label: 'Water', value: 120 },
            { label: 'Internet', value: 90 },
          ],
          label: 'Utilities',
        },
        { label: 'Insurance', value: 150 },
      ],
      label: 'Housing',
    },
    {
      children: [
        { label: 'Groceries', value: 520 },
        {
          children: [
            { label: 'Restaurants', value: 240 },
            { label: 'Coffee', value: 90 },
          ],
          label: 'Dining Out',
        },
      ],
      label: 'Food',
    },
    {
      children: [
        { label: 'Fuel', value: 160 },
        { label: 'Transit', value: 120 },
        { label: 'Rideshare', value: 80 },
      ],
      label: 'Transport',
    },
  ];

  // Default theme — no overrides. Uses the built-in `--chart-*` token palette,
  // which is theme-aware (adapts to the container's light / dark surface).
  defaultConfig = createSunburstChartConfig({
    data: this.sampleData,
    innerRadius: 0.3,
  });

  // Warm palette via the preset's `seriesColors` option — the top-level branch index
  // maps to colors[index % length], and every descendant inherits its branch color.
  warmConfig = createSunburstChartConfig({
    data: this.sampleData,
    innerRadius: 0.3,
    seriesColors: ['#E53935', '#FB8C00', '#FDD835', '#F4511E', '#D81B60', '#8E24AA'],
  });

  // Cool palette via a theme override (theme.sunburst.segment.colors) — same effect
  // as seriesColors, reached through the composite theme instead of the preset option.
  coolConfig: NgeChartConfig = {
    ...createSunburstChartConfig({ data: this.sampleData, innerRadius: 0.3 }),
    theme: {
      sunburst: {
        segment: {
          colors: ['#1E88E5', '#00ACC1', '#43A047', '#3949AB', '#00897B', '#5E35B1'],
        },
      },
    },
  };

  // Per-node color overrides — each top-level branch carries its own `color`, inherited
  // by its descendants; a per-node `color` on Rent wins over its branch color.
  perNodeConfig = createSunburstChartConfig({
    data: [
      {
        children: [
          { color: '#26C6DA', label: 'Rent', value: 1800 },
          {
            children: [
              { label: 'Electric', value: 180 },
              { label: 'Water', value: 120 },
              { label: 'Internet', value: 90 },
            ],
            label: 'Utilities',
          },
          { label: 'Insurance', value: 150 },
        ],
        color: '#5C6BC0',
        label: 'Housing',
      },
      {
        children: [
          { label: 'Groceries', value: 520 },
          {
            children: [
              { label: 'Restaurants', value: 240 },
              { label: 'Coffee', value: 90 },
            ],
            label: 'Dining Out',
          },
        ],
        color: '#66BB6A',
        label: 'Food',
      },
      {
        children: [
          { label: 'Fuel', value: 160 },
          { label: 'Transit', value: 120 },
          { label: 'Rideshare', value: 80 },
        ],
        color: '#FFA726',
        label: 'Transport',
      },
    ],
    innerRadius: 0.3,
  });

  // Thick surface-coloured separators via segment.stroke + strokeWidth.
  strokeConfig: NgeChartConfig = {
    ...createSunburstChartConfig({ data: this.sampleData, innerRadius: 0.3 }),
    theme: {
      sunburst: {
        segment: {
          colors: ['#1E88E5', '#43A047', '#FB8C00'],
          stroke: '#ffffff',
          strokeWidth: 3,
        },
      },
    },
  };

  // Translucent segments via segment.opacity.
  translucentConfig: NgeChartConfig = {
    ...createSunburstChartConfig({ data: this.sampleData, innerRadius: 0.3 }),
    theme: {
      sunburst: {
        segment: {
          colors: ['#1E88E5', '#43A047', '#FB8C00'],
          opacity: 0.7,
        },
      },
    },
  };

  // --- Side-by-side comparison (highlight section) ---
  comparisonDefault = createSunburstChartConfig({ data: this.sampleData, innerRadius: 0.4 });

  comparisonWarm = createSunburstChartConfig({
    data: this.sampleData,
    innerRadius: 0.4,
    seriesColors: ['#E53935', '#FB8C00', '#FDD835'],
  });

  comparisonCool: NgeChartConfig = {
    ...createSunburstChartConfig({ data: this.sampleData, innerRadius: 0.4 }),
    theme: {
      sunburst: {
        segment: { colors: ['#1E88E5', '#00ACC1', '#43A047'] },
      },
    },
  };
}
