import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeGraph, NgeGraphNode } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createSankeyChartConfig } from '../../../../presets/sankey-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Monthly household budget — three income sources converging on one pot, then splitting
 * across six categories. Inflow and outflow both total 6600, so the hub's height is
 * unambiguous and every ribbon is directly comparable.
 */
const BUDGET: NgeGraph = {
  links: [
    { source: 'Salary', target: 'Net Income', value: 4800 },
    { source: 'Freelance', target: 'Net Income', value: 1200 },
    { source: 'Investments', target: 'Net Income', value: 600 },
    { source: 'Net Income', target: 'Housing', value: 2100 },
    { source: 'Net Income', target: 'Savings', value: 1800 },
    { source: 'Net Income', target: 'Food', value: 1100 },
    { source: 'Net Income', target: 'Transport', value: 640 },
    { source: 'Net Income', target: 'Leisure', value: 560 },
    { source: 'Net Income', target: 'Insurance', value: 400 },
  ],
};

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-sankey-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-sankey-chart-usage-stories',
  standalone: true,
  styleUrl: './sankey-chart-usage-stories.component.scss',
  templateUrl: './sankey-chart-usage-stories.component.html',
})
export class NgeSankeyChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sankey-chart/usage';

  // EXAMPLE 1: Basic Sankey — links only, node set derived from the endpoints.
  basicConfig = createSankeyChartConfig({
    data: BUDGET,
    showLabels: true,
  });

  // EXAMPLE 2: Parallel Sets — the same primitive with straight-sided bands over categorical
  // stages. Gender → travel class → outcome, the canonical Parallel Sets reading.
  parallelSetsConfig = createSankeyChartConfig({
    data: {
      links: [
        { source: 'Male', target: 'First', value: 180 },
        { source: 'Male', target: 'Second', value: 179 },
        { source: 'Male', target: 'Third', value: 510 },
        { source: 'Female', target: 'First', value: 145 },
        { source: 'Female', target: 'Second', value: 106 },
        { source: 'Female', target: 'Third', value: 196 },
        { source: 'First', target: 'Survived', value: 200 },
        { source: 'First', target: 'Lost', value: 125 },
        { source: 'Second', target: 'Survived', value: 119 },
        { source: 'Second', target: 'Lost', value: 166 },
        { source: 'Third', target: 'Survived', value: 181 },
        { source: 'Third', target: 'Lost', value: 525 },
      ],
    },
    linkShape: 'parallelogram',
    nodeAlign: 'left',
    showLabels: true,
  });

  // EXAMPLE 3: Alluvial — stages named for successive periods, so the ribbons read as cohorts
  // moving between tiers over time rather than as a one-way flow.
  alluvialConfig = createSankeyChartConfig({
    data: {
      links: [
        { source: 'Q1 Free', target: 'Q2 Free', value: 620 },
        { source: 'Q1 Free', target: 'Q2 Pro', value: 180 },
        { source: 'Q1 Free', target: 'Q2 Churned', value: 200 },
        { source: 'Q1 Pro', target: 'Q2 Pro', value: 340 },
        { source: 'Q1 Pro', target: 'Q2 Free', value: 60 },
        { source: 'Q1 Pro', target: 'Q2 Churned', value: 50 },
        { source: 'Q2 Free', target: 'Q3 Free', value: 500 },
        { source: 'Q2 Free', target: 'Q3 Pro', value: 120 },
        { source: 'Q2 Free', target: 'Q3 Churned', value: 60 },
        { source: 'Q2 Pro', target: 'Q3 Pro', value: 430 },
        { source: 'Q2 Pro', target: 'Q3 Churned', value: 90 },
      ],
    },
    nodeAlign: 'left',
    showLabels: true,
  });

  // EXAMPLE 4: Explicit nodes — control ORDER (which drives the palette) and give individual
  // nodes their own colour and display label.
  explicitNodesConfig = createSankeyChartConfig({
    data: {
      links: BUDGET.links,
      nodes: [
        { id: 'Salary', label: 'Salary (net)' },
        { id: 'Freelance' },
        { id: 'Investments' },
        { color: '#455a64', id: 'Net Income', label: 'Take-home' },
        { color: '#c62828', id: 'Housing' },
        { color: '#2e7d32', id: 'Savings' },
        { id: 'Food' },
        { id: 'Transport' },
        { id: 'Leisure' },
        { id: 'Insurance' },
      ],
    },
    showLabels: true,
  });

  // EXAMPLE 5: Tooltips — the default formatter reports each node's laid-out throughput.
  tooltipConfig = createSankeyChartConfig({
    data: BUDGET,
    showLabels: true,
    tooltip: { enabled: true },
  });

  // EXAMPLE 6: Click Handling
  readonly lastClicked = signal<string>('None');
  clickableConfig = createSankeyChartConfig({
    data: BUDGET,
    onClick: (event: NgeChartLayerClickEvent<NgeGraphNode>) => {
      this.lastClicked.set(`${event.data.label ?? event.data.id}: ${event.data.value ?? 0}`);
    },
    showLabels: true,
  });

  // EXAMPLE 7: Dynamic Data with Signals
  readonly dynamicGraph = signal<NgeGraph>(BUDGET);
  readonly dynamicConfig = computed(() =>
    createSankeyChartConfig({
      data: this.dynamicGraph(),
      showLabels: true,
      tooltip: { enabled: true },
    })
  );

  randomizeData(): void {
    this.dynamicGraph.set({
      links: BUDGET.links.map(link => ({
        ...link,
        value: Math.round(300 + Math.random() * 4200),
      })),
    });
  }
}
