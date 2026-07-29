import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeGraph, NgeGraphNode } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createNetworkChartConfig } from '../../../../presets/network-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * A service-dependency graph. Every node carries a `group` (the tier it belongs to), which is
 * what the `'cluster'` and `'hive'` layouts arrange by — the same fixture therefore drives all
 * three geometries, which makes the difference between them the only thing that changes.
 */
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

/**
 * A small who-talks-to-whom graph. Deliberately separate from `SERVICES`: a Sociogram is a
 * drawing of PEOPLE, and its arrowheads only mean something when the relationship genuinely
 * runs one way ("reports to", "asks for help from").
 */
const TEAM: NgeGraph = {
  links: [
    { source: 'ana', target: 'ben', value: 5 },
    { source: 'ana', target: 'cleo', value: 3 },
    { source: 'ben', target: 'cleo', value: 4 },
    { source: 'cleo', target: 'dev', value: 6 },
    { source: 'dev', target: 'ana', value: 2 },
    { source: 'eli', target: 'cleo', value: 3 },
  ],
  nodes: [
    { id: 'ana', label: 'Ana' },
    { id: 'ben', label: 'Ben' },
    { id: 'cleo', label: 'Cleo' },
    { id: 'dev', label: 'Dev' },
    { id: 'eli', label: 'Eli' },
  ],
};

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-network-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-network-chart-usage-stories',
  standalone: true,
  styleUrl: './network-chart-usage-stories.component.scss',
  templateUrl: './network-chart-usage-stories.component.html',
})
export class NgeNetworkChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/network-chart/usage';

  // EXAMPLE 1: Basic Usage — Network Visualisation
  basicData: NgeGraph = SERVICES;
  basicConfig = createNetworkChartConfig({
    data: this.basicData,
    showLabels: true,
  });

  // EXAMPLE 2: Sociogram — directed + labelled
  sociogramConfig = createNetworkChartConfig({
    data: TEAM,
    directed: true,
    showLabels: true,
  });

  // EXAMPLE 3: Clustered Force Layout — nodes gather by `group`
  clusteredConfig = createNetworkChartConfig({
    data: SERVICES,
    layout: 'cluster',
    showLabels: true,
  });

  // EXAMPLE 4: Hive Plot — deterministic placement on radial axes
  hiveConfig = createNetworkChartConfig({
    axisCount: 4,
    data: SERVICES,
    layout: 'hive',
    showLabels: true,
  });

  // EXAMPLE 5: Click Handling
  readonly lastClicked = signal<string>('None');
  clickableConfig = createNetworkChartConfig({
    data: SERVICES,
    onClick: (event: NgeChartLayerClickEvent<NgeGraphNode>) => {
      this.lastClicked.set(`${event.data.label ?? event.data.id}: ${event.data.value} links`);
    },
    showLabels: true,
  });

  // EXAMPLE 6: Tooltips
  tooltipConfig = createNetworkChartConfig({
    data: SERVICES,
    tooltip: {
      enabled: true,
      formatContent: (d: NgeGraphNode) => ({
        label: d.label ?? d.id,
        value: `${d.value} connections`,
      }),
    },
  });

  // EXAMPLE 7: Re-rolling the arrangement with `seed`
  readonly seed = signal<number>(42);
  readonly seededConfig = computed(() =>
    createNetworkChartConfig({
      data: SERVICES,
      seed: this.seed(),
      showLabels: true,
    })
  );

  // EXAMPLE 8: Dynamic Data with Signals
  readonly dynamicData = signal<NgeGraph>(TEAM);
  readonly dynamicConfig = computed(() =>
    createNetworkChartConfig({
      data: this.dynamicData(),
      directed: true,
      showLabels: true,
    })
  );

  nextSeed(): void {
    this.seed.update(current => current + 1);
  }

  randomizeData(): void {
    const people = ['ana', 'ben', 'cleo', 'dev', 'eli', 'fay'];
    const labels: Record<string, string> = {
      ana: 'Ana',
      ben: 'Ben',
      cleo: 'Cleo',
      dev: 'Dev',
      eli: 'Eli',
      fay: 'Fay',
    };

    const count = 4 + Math.floor(Math.random() * 3);
    const chosen = people.slice(0, count);
    const links = chosen.flatMap((source, index) =>
      chosen
        .slice(index + 1)
        .filter(() => Math.random() > 0.4)
        .map(target => ({ source, target, value: 1 + Math.floor(Math.random() * 6) }))
    );

    this.dynamicData.set({
      links,
      nodes: chosen.map(id => ({ id, label: labels[id] })),
    });
  }
}
