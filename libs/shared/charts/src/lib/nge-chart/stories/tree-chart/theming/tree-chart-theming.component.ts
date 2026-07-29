import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHierarchyDatum } from '../../../../core/config';

import { createTreeChartConfig } from '../../../../presets/tree-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** One hierarchy across every panel, so the only thing that changes is the theme. */
const TAXONOMY: NgeHierarchyDatum[] = [
  {
    children: [
      {
        children: [
          { label: 'Espresso', value: 9 },
          { label: 'Cold brew', value: 6 },
        ],
        label: 'Coffee',
      },
      {
        children: [
          { label: 'Green', value: 4 },
          { label: 'Herbal', value: 3 },
        ],
        label: 'Tea',
      },
      {
        children: [
          { label: 'Sparkling', value: 5 },
          { label: 'Still', value: 2 },
        ],
        label: 'Water',
      },
    ],
    label: 'Drinks',
  },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-tree-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-tree-chart-theming',
  standalone: true,
  styleUrl: './tree-chart-theming.component.scss',
  templateUrl: './tree-chart-theming.component.html',
})
export class NgeTreeChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/tree-chart/theming';

  sampleData: NgeHierarchyDatum[] = TAXONOMY;

  // Default theme (no overrides) — renders on the --nge-chart-* token defaults.
  defaultConfig = createTreeChartConfig({
    data: this.sampleData,
    showLabels: true,
  });

  // Green — one flat hue across every branch.
  greenConfig: NgeChartConfig = {
    ...createTreeChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      tree: {
        link: { color: '#2E7D32' },
        node: { colors: ['#4CAF50', '#66BB6A', '#81C784'], stroke: '#E8F5E9' },
      },
    },
  };

  // Blue — a cooler palette with a heavier edge.
  blueConfig: NgeChartConfig = {
    ...createTreeChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      tree: {
        link: { color: '#1565C0', opacity: 1, width: 2.5 },
        node: { colors: ['#1976D2', '#42A5F5', '#90CAF9'], stroke: '#E3F2FD' },
      },
    },
  };

  // Quiet edges — the structure recedes so the nodes carry the reading.
  quietEdgesConfig: NgeChartConfig = {
    ...createTreeChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      tree: {
        link: { color: '#9E9E9E', opacity: 0.4, width: 1 },
        node: { colors: ['#7B1FA2', '#AB47BC', '#CE93D8'], strokeWidth: 2 },
      },
    },
  };

  // Larger, heavier label typography.
  typographyConfig: NgeChartConfig = {
    ...createTreeChartConfig({
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      tree: {
        label: { color: '#37474F', fontSize: 14, fontWeight: 700 },
      },
    },
  };

  // The dendrogram reading, themed — leaves aligned so the labels form one column.
  dendrogramConfig: NgeChartConfig = {
    ...createTreeChartConfig({
      alignLeaves: true,
      data: this.sampleData,
      showLabels: true,
    }),
    theme: {
      tree: {
        label: { color: '#455A64', fontSize: 12 },
        link: { color: '#B0BEC5', width: 1.5 },
        node: { colors: ['#FF7043', '#FFA726', '#FFCA28'] },
      },
    },
  };

  // The radial reading, themed.
  radialConfig: NgeChartConfig = {
    ...createTreeChartConfig({
      alignLeaves: true,
      data: this.sampleData,
      layout: 'radial',
      showLabels: true,
    }),
    theme: {
      tree: {
        link: { color: '#00838F', opacity: 0.75 },
        node: { colors: ['#00ACC1', '#26C6DA', '#80DEEA'] },
      },
    },
  };

  // The org-chart reading, themed — elbow links read as reporting lines.
  orgChartConfig: NgeChartConfig = {
    ...createTreeChartConfig({
      data: this.sampleData,
      linkShape: 'elbow',
      orientation: 'top-bottom',
      showLabels: true,
    }),
    theme: {
      tree: {
        label: { fontSize: 11 },
        link: { color: '#546E7A', width: 2 },
        node: { colors: ['#37474F', '#607D8B', '#90A4AE'], stroke: '#ECEFF1', strokeWidth: 2 },
      },
    },
  };

  // Side-by-side comparison panels.
  warmConfig: NgeChartConfig = {
    ...createTreeChartConfig({ data: this.sampleData }),
    theme: {
      tree: {
        link: { color: '#BF360C' },
        node: { colors: ['#E64A19', '#FF7043', '#FFAB91'] },
      },
    },
  };

  coolConfig: NgeChartConfig = {
    ...createTreeChartConfig({ data: this.sampleData }),
    theme: {
      tree: {
        link: { color: '#283593' },
        node: { colors: ['#3949AB', '#5C6BC0', '#9FA8DA'] },
      },
    },
  };

  monoConfig: NgeChartConfig = {
    ...createTreeChartConfig({ data: this.sampleData }),
    theme: {
      tree: {
        link: { color: '#757575' },
        node: { colors: ['#212121', '#616161', '#9E9E9E'] },
      },
    },
  };
}
