import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeGraph } from '../../../../core/config';

import { createNetworkChartConfig } from '../../../../presets/network-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** A grouped service graph — the same fixture the usage stories use. */
const SERVICES: NgeGraph = {
  links: [
    { source: 'web', target: 'gateway', value: 8 },
    { source: 'mobile', target: 'gateway', value: 6 },
    { source: 'gateway', target: 'auth', value: 7 },
    { source: 'gateway', target: 'catalog', value: 5 },
    { source: 'gateway', target: 'orders', value: 4 },
    { source: 'orders', target: 'payments', value: 3 },
    { source: 'orders', target: 'inventory', value: 3 },
    { source: 'catalog', target: 'search', value: 2 },
    { source: 'auth', target: 'users', value: 4 },
    { source: 'payments', target: 'ledger', value: 2 },
  ],
  nodes: [
    { group: 'Client', id: 'web', label: 'Web' },
    { group: 'Client', id: 'mobile', label: 'Mobile' },
    { group: 'Edge', id: 'gateway', label: 'Gateway' },
    { group: 'Service', id: 'auth', label: 'Auth' },
    { group: 'Service', id: 'catalog', label: 'Catalog' },
    { group: 'Service', id: 'orders', label: 'Orders' },
    { group: 'Service', id: 'payments', label: 'Payments' },
    { group: 'Service', id: 'inventory', label: 'Inventory' },
    { group: 'Service', id: 'search', label: 'Search' },
    { group: 'Data', id: 'users', label: 'Users DB' },
    { group: 'Data', id: 'ledger', label: 'Ledger' },
  ],
};

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-network-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-network-chart-theming',
  standalone: true,
  styleUrl: './network-chart-theming.component.scss',
  templateUrl: './network-chart-theming.component.html',
})
export class NgeNetworkChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/network-chart/theming';

  sampleData: NgeGraph = SERVICES;

  // Default theme (no overrides) — renders on the `--nge-chart-*` token defaults.
  defaultConfig = createNetworkChartConfig({
    data: this.sampleData,
    showLabels: true,
  });

  // Green palette
  greenConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ data: this.sampleData, showLabels: true }),
    theme: {
      network: {
        node: {
          colors: ['#1B5E20', '#2E7D32', '#43A047', '#66BB6A', '#A5D6A7'],
          stroke: '#E8F5E9',
          strokeWidth: 1.5,
        },
      },
    },
  };

  // Blue palette
  blueConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ data: this.sampleData, showLabels: true }),
    theme: {
      network: {
        node: {
          colors: ['#0D47A1', '#1565C0', '#1E88E5', '#42A5F5', '#90CAF9'],
          stroke: '#E3F2FD',
          strokeWidth: 1.5,
        },
      },
    },
  };

  // Warm palette
  warmConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ data: this.sampleData, showLabels: true }),
    theme: {
      network: {
        node: {
          colors: ['#B71C1C', '#E64A19', '#F57C00', '#FBC02D', '#FFE082'],
          stroke: '#FFF3E0',
          strokeWidth: 1.5,
        },
      },
    },
  };

  // Link legibility — the load-bearing knob for a network. Opacity is what makes a dense
  // interior readable as structure rather than as one block of colour.
  denseLinksConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ data: this.sampleData }),
    theme: {
      network: {
        link: { opacity: 0.9, opacityHover: 1, width: 3 },
      },
    },
  };

  sparseLinksConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ data: this.sampleData }),
    theme: {
      network: {
        link: { color: '#9e9e9e', opacity: 0.18, opacityHover: 0.9, width: 1 },
      },
    },
  };

  // Label typography — the slice is theme-relative and carries no `colorOnDark`, because a
  // network label always sits beside its node rather than on it.
  labelTypographyConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ data: this.sampleData, labelPadding: 10, showLabels: true }),
    theme: {
      network: {
        label: { color: '#5D4037', fontSize: 13, fontWeight: 700 },
      },
    },
  };

  // Hive axis chrome — the one slice that has no counterpart in the force layouts.
  hiveAxisConfig: NgeChartConfig = {
    ...createNetworkChartConfig({
      axisCount: 4,
      data: this.sampleData,
      layout: 'hive',
      showLabels: true,
    }),
    theme: {
      network: {
        axis: { color: '#7B1FA2', width: 2 },
        node: { colors: ['#4A148C', '#7B1FA2', '#9C27B0', '#BA68C8', '#E1BEE7'] },
      },
    },
  };

  // Node sizing is a CONFIG concern, not a theme one — magnitude drives the radius, so the
  // range belongs with the data mapping rather than with the palette.
  largeNodesConfig = createNetworkChartConfig({
    data: this.sampleData,
    maxNodeRadius: 26,
    minNodeRadius: 8,
    showLabels: true,
  });

  // Side-by-side comparison configs
  clusterComparisonConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ data: this.sampleData, layout: 'cluster' }),
    theme: {
      network: {
        node: { colors: ['#0D47A1', '#1E88E5', '#42A5F5', '#90CAF9'] },
      },
    },
  };

  hiveComparisonConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ axisCount: 4, data: this.sampleData, layout: 'hive' }),
    theme: {
      network: {
        axis: { color: '#B71C1C', width: 1.5 },
        node: { colors: ['#B71C1C', '#E64A19', '#F57C00', '#FBC02D'] },
      },
    },
  };

  forceComparisonConfig: NgeChartConfig = {
    ...createNetworkChartConfig({ data: this.sampleData }),
    theme: {
      network: {
        node: { colors: ['#1B5E20', '#2E7D32', '#43A047', '#66BB6A'] },
      },
    },
  };
}
