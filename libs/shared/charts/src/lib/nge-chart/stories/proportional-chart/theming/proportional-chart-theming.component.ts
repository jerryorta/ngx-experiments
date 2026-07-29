import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHierarchyDatum } from '../../../../core/config';

import { createProportionalChartConfig } from '../../../../presets/proportional-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-proportional-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-proportional-chart-theming',
  standalone: true,
  styleUrl: './proportional-chart-theming.component.scss',
  templateUrl: './proportional-chart-theming.component.html',
})
export class NgeProportionalChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/proportional-chart/theming';

  sampleData: NgeHierarchyDatum[] = [
    { label: 'Solar', value: 120 },
    { label: 'Wind', value: 80 },
    { label: 'Hydro', value: 45 },
    { label: 'Geothermal', value: 20 },
  ];

  waffleData: NgeHierarchyDatum[] = [
    { label: 'Renewable', value: 42 },
    { label: 'Nuclear', value: 18 },
    { label: 'Fossil', value: 40 },
  ];

  // Default theme (no overrides) — renders on the --nge-chart-* token defaults.
  defaultConfig = createProportionalChartConfig({
    data: this.sampleData,
    showLabels: true,
  });

  // Green theme
  greenConfig: NgeChartConfig = {
    ...createProportionalChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      proportional: {
        mark: { colors: ['#1B5E20', '#2E7D32', '#4CAF50', '#81C784'] },
      },
    },
  };

  // Blue theme
  blueConfig: NgeChartConfig = {
    ...createProportionalChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      proportional: {
        mark: { colors: ['#0D47A1', '#1565C0', '#1E88E5', '#64B5F6'] },
      },
    },
  };

  // Red theme
  redConfig: NgeChartConfig = {
    ...createProportionalChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      proportional: {
        mark: { colors: ['#B71C1C', '#C62828', '#E53935', '#EF9A9A'] },
      },
    },
  };

  // Outlined marks — a thick surface-coloured stroke separates adjacent shapes.
  outlinedConfig: NgeChartConfig = {
    ...createProportionalChartConfig({
      data: this.sampleData,
      mark: 'square',
      showLabels: true,
    }),
    theme: {
      proportional: {
        mark: {
          colors: ['#4A148C', '#6A1B9A', '#8E24AA', '#CE93D8'],
          opacity: 0.85,
          stroke: '#311B92',
          strokeWidth: 3,
        },
      },
    },
  };

  // Label typography — size and weight are theme rungs, not per-datum ones.
  labelTypographyConfig: NgeChartConfig = {
    ...createProportionalChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      proportional: {
        label: { fontSize: 16, fontWeight: 700 },
      },
    },
  };

  // Flat label colour — supplying `color` AND `colorOnDark` as the same value opts the whole
  // theme out of the automatic on-fill contrast derivation.
  flatLabelConfig: NgeChartConfig = {
    ...createProportionalChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      proportional: {
        label: { color: '#ffffff', colorOnDark: '#ffffff', fontWeight: 700 },
        mark: { colors: ['#37474F', '#455A64', '#546E7A', '#607D8B'] },
      },
    },
  };

  // Waffle with a themed remainder — `emptyCell` is the one slice that is chrome, not data.
  waffleDefaultConfig = createProportionalChartConfig({
    data: this.waffleData,
    mark: 'grid',
  });

  waffleThemedConfig: NgeChartConfig = {
    ...createProportionalChartConfig({
      data: this.waffleData,
      mark: 'grid',
    }),
    theme: {
      proportional: {
        emptyCell: { color: '#ECEFF1', opacity: 0.6 },
        mark: { colors: ['#00695C', '#00897B', '#4DB6AC'], stroke: '#FAFAFA', strokeWidth: 2 },
      },
    },
  };

  // Packed circles with a branch palette.
  packedConfig: NgeChartConfig = {
    ...createProportionalChartConfig({
      data: [
        {
          children: [
            { label: 'iOS', value: 62 },
            { label: 'Android', value: 91 },
          ],
          label: 'Mobile',
        },
        {
          children: [
            { label: 'macOS', value: 25 },
            { label: 'Windows', value: 70 },
          ],
          label: 'Desktop',
        },
      ],
      mark: 'packed',
      showLabels: true,
    }),
    theme: {
      proportional: {
        mark: { colors: ['#E65100', '#00838F'], stroke: '#FFFFFF', strokeWidth: 2 },
      },
    },
  };
}
