import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeGraph, NgeGraphNode } from '../../../../core/config';
import type { NgeNetworkLayout } from '../../../../core/config';

import { createNetworkChartConfig } from '../../../../presets/network-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Node ids the randomizer draws from, each with the tier it belongs to. */
const NODE_POOL: { group: string; id: string; label: string }[] = [
  { group: 'Client', id: 'web', label: 'Web' },
  { group: 'Client', id: 'mobile', label: 'Mobile' },
  { group: 'Edge', id: 'gateway', label: 'Gateway' },
  { group: 'Edge', id: 'cdn', label: 'CDN' },
  { group: 'Service', id: 'auth', label: 'Auth' },
  { group: 'Service', id: 'catalog', label: 'Catalog' },
  { group: 'Service', id: 'orders', label: 'Orders' },
  { group: 'Service', id: 'payments', label: 'Payments' },
  { group: 'Service', id: 'inventory', label: 'Inventory' },
  { group: 'Data', id: 'users', label: 'Users DB' },
  { group: 'Data', id: 'ledger', label: 'Ledger' },
];

const INITIAL_GRAPH: NgeGraph = {
  links: [
    { source: 'web', target: 'gateway', value: 8 },
    { source: 'mobile', target: 'gateway', value: 6 },
    { source: 'gateway', target: 'auth', value: 7 },
    { source: 'gateway', target: 'catalog', value: 5 },
    { source: 'gateway', target: 'orders', value: 4 },
    { source: 'orders', target: 'payments', value: 3 },
    { source: 'orders', target: 'inventory', value: 3 },
    { source: 'auth', target: 'users', value: 4 },
    { source: 'payments', target: 'ledger', value: 2 },
  ],
  // `cdn` is pool-only — it gives the randomizer a node the initial graph does not show, so the
  // first Randomize visibly changes the node SET rather than only the edges.
  nodes: NODE_POOL.filter(node => node.id !== 'cdn'),
};

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-network-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-network-chart-interaction-stories',
  standalone: true,
  styleUrl: './network-chart-interaction-stories.component.scss',
  templateUrl: './network-chart-interaction-stories.component.html',
})
export class NgeNetworkChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/network-chart/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // === Layer - Layout ===
  readonly layout = input<NgeNetworkLayout>('force');

  // === Layer - Force tuning ===
  readonly charge = input<number>(-180);
  readonly clusterStrength = input<number>(0.35);
  readonly linkDistance = input<number>(60);
  readonly seed = input<number>(42);
  readonly tickCount = input<number>(300);

  // === Layer - Hive ===
  readonly axisCount = input<number>(3);
  readonly innerRadius = input<number>(0.15);
  readonly radiusRatio = input<number>(1);

  // === Layer - Nodes ===
  readonly maxNodeRadius = input<number>(16);
  readonly minNodeRadius = input<number>(4);

  // === Layer - Visibility ===
  readonly directed = input<boolean>(false);
  readonly labelPadding = input<number>(6);
  readonly showLabels = input<boolean>(true);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(false);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);

  // === Theme - Node Styling ===
  readonly nodeColor = input<string>('');
  readonly nodeOpacity = input<number>(1);
  readonly nodeStroke = input<string>('');
  readonly nodeStrokeWidth = input<number>(1);

  // === Theme - Link Styling ===
  readonly linkColor = input<string>('');
  readonly linkOpacity = input<number>(0.35);
  readonly linkOpacityHover = input<number>(0.8);
  readonly linkWidth = input<number>(1.5);

  // === Theme - Label Styling ===
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);
  readonly labelFontWeight = input<number>(600);

  // === Theme - Axis Styling (hive only) ===
  readonly axisColor = input<string>('');
  readonly axisWidth = input<number>(1);

  readonly graph = signal<NgeGraph>(INITIAL_GRAPH);
  readonly lastClicked = signal<string>('None');

  // Computed config rebuilds when ANY input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createNetworkChartConfig({
      axisCount: this.axisCount(),
      charge: this.charge(),
      clusterStrength: this.clusterStrength(),
      data: this.graph(),
      directed: this.directed(),
      innerRadius: this.innerRadius(),
      labelPadding: this.labelPadding(),
      layout: this.layout(),
      linkDistance: this.linkDistance(),
      maxNodeRadius: this.maxNodeRadius(),
      minNodeRadius: this.minNodeRadius(),
      onClick: event => {
        const node = event.data as NgeGraphNode;
        this.lastClicked.set(`${node.label ?? node.id} — ${node.value} connections`);
      },
      radiusRatio: this.radiusRatio(),
      seed: this.seed(),
      showLabels: this.showLabels(),
      tickCount: this.tickCount(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            formatContent: (d: NgeGraphNode) => ({
              label: d.label ?? d.id,
              value: `${d.value} connections`,
            }),
            height: this.tooltipHeight(),
            width: this.tooltipWidth(),
          }
        : undefined,
    });

    return {
      ...baseConfig,
      base: {
        ...baseConfig.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      theme: {
        network: {
          axis: {
            color: this.axisColor() || undefined,
            width: this.axisWidth(),
          },
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          link: {
            color: this.linkColor() || undefined,
            opacity: this.linkOpacity(),
            opacityHover: this.linkOpacityHover(),
            width: this.linkWidth(),
          },
          node: {
            color: this.nodeColor() || undefined,
            opacity: this.nodeOpacity(),
            stroke: this.nodeStroke() || undefined,
            strokeWidth: this.nodeStrokeWidth(),
          },
        },
      },
    };
  });

  randomizeData(): void {
    const count = 6 + Math.floor(Math.random() * 5);
    const nodes = [...NODE_POOL].sort(() => Math.random() - 0.5).slice(0, count);

    // Chain every node onto an earlier one first, so the graph is always connected — an
    // arbitrary random edge set routinely leaves an island the force layout then flings at a
    // corner, which reads as a layout bug rather than as the data it is.
    const links = nodes.slice(1).map((node, index) => ({
      source: nodes[Math.floor(Math.random() * (index + 1))].id,
      target: node.id,
      value: 1 + Math.floor(Math.random() * 8),
    }));

    // Then a few extra edges for interest.
    const extras = Math.floor(Math.random() * 4);
    for (let i = 0; i < extras; i++) {
      const source = nodes[Math.floor(Math.random() * nodes.length)];
      const target = nodes[Math.floor(Math.random() * nodes.length)];
      if (source.id !== target.id) {
        links.push({
          source: source.id,
          target: target.id,
          value: 1 + Math.floor(Math.random() * 5),
        });
      }
    }

    this.graph.set({ links, nodes });
  }
}
