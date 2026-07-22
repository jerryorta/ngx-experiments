import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHierarchyDatum } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createSunburstChartConfig } from '../../../../presets/sunburst-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sunburst-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'sunburst-chart-usage-stories',
  standalone: true,
  styleUrl: './sunburst-chart-usage-stories.component.scss',
  templateUrl: './sunburst-chart-usage-stories.component.html',
})
export class SunburstChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sunburst-chart/usage';

  // Shared monthly-budget hierarchy — three top-level branches, each fanned out into
  // categories (some with a further sub-level). Leaves carry `value`; internal nodes
  // omit it and have their magnitude summed from children by d3.hierarchy().sum().
  private readonly budgetHierarchy: NgeHierarchyDatum[] = [
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

  // ============================================
  // EXAMPLE 1: Basic Sunburst
  // ============================================
  basicConfig = createSunburstChartConfig({
    data: this.budgetHierarchy,
  });

  // ============================================
  // EXAMPLE 2: Multi-level Donut (innerRadius ratio)
  // ============================================
  donutConfig = createSunburstChartConfig({
    data: this.budgetHierarchy,
    innerRadius: 0.3,
  });

  // ============================================
  // EXAMPLE 3: Icicle (linear layout)
  // ============================================
  icicleConfig = createSunburstChartConfig({
    data: this.budgetHierarchy,
    layout: 'linear',
  });

  // ============================================
  // EXAMPLE 4: Depth Cap (maxDepth)
  // ============================================
  depthCappedConfig = createSunburstChartConfig({
    data: this.budgetHierarchy,
    innerRadius: 0.3,
    maxDepth: 2,
  });

  // ============================================
  // EXAMPLE 5: Custom Branch Colors
  // ============================================
  customColorsConfig = createSunburstChartConfig({
    data: this.budgetHierarchy,
    innerRadius: 0.3,
    seriesColors: ['#1E88E5', '#43A047', '#FB8C00'],
  });

  // ============================================
  // EXAMPLE 6: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createSunburstChartConfig({
    data: this.budgetHierarchy,
    innerRadius: 0.3,
    onClick: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => {
      const { label, value } = event.data;
      // Internal nodes omit `value` (it is summed from children by the renderer),
      // so only append it when the clicked node is a leaf.
      this.lastClicked.set(value == null ? label : `${label}: ${value}`);
    },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 7: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeHierarchyDatum[]>(this.budgetHierarchy);

  readonly dynamicConfig = computed<NgeChartConfig>(() =>
    createSunburstChartConfig({
      data: this.dynamicData(),
      innerRadius: 0.3,
      tooltip: { enabled: true },
    })
  );

  randomizeData(): void {
    this.dynamicData.set(this.rerollLeaves(this.budgetHierarchy));
  }

  // Recursively re-roll every leaf's `value`, leaving the tree shape (and the summed
  // internal-node magnitudes) to be recomputed by the renderer.
  private rerollLeaves(nodes: NgeHierarchyDatum[]): NgeHierarchyDatum[] {
    return nodes.map(node =>
      node.children?.length
        ? { ...node, children: this.rerollLeaves(node.children) }
        : { ...node, value: Math.round(50 + Math.random() * 1800) }
    );
  }
}
