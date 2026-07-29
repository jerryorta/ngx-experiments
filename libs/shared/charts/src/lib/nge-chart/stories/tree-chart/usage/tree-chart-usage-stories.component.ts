import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeHierarchyDatum } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createTreeChartConfig } from '../../../../presets/tree-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * A company reporting structure. One top-level node, so the tree draws its own root — which is
 * what an org chart needs, and what separates this fixture from the forest case below.
 */
const ORG: NgeHierarchyDatum[] = [
  {
    children: [
      {
        children: [
          { label: 'Platform', value: 8 },
          { label: 'Mobile', value: 5 },
          { label: 'Data', value: 4 },
        ],
        label: 'Engineering',
      },
      {
        children: [
          { label: 'Research', value: 3 },
          { label: 'Brand', value: 2 },
        ],
        label: 'Design',
      },
      {
        children: [
          { label: 'Enterprise', value: 6 },
          { label: 'Self-serve', value: 4 },
        ],
        label: 'Revenue',
      },
    ],
    label: 'CEO',
  },
];

/**
 * A product taxonomy with DELIBERATELY ragged depth — some branches reach a third level and
 * others stop at the second. Only a ragged tree shows what `alignLeaves` does; on a balanced one
 * the tidy and dendrogram readings draw the identical picture.
 */
const TAXONOMY: NgeHierarchyDatum[] = [
  {
    children: [
      {
        children: [
          { children: [{ label: 'Espresso', value: 9 }], label: 'Hot' },
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
      { label: 'Water', value: 2 },
    ],
    label: 'Drinks',
  },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-tree-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-tree-chart-usage-stories',
  standalone: true,
  styleUrl: './tree-chart-usage-stories.component.scss',
  templateUrl: './tree-chart-usage-stories.component.html',
})
export class NgeTreeChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/tree-chart/usage';

  // EXAMPLE 1: Mind Map — the defaults (tidy, left-right, curved)
  basicData: NgeHierarchyDatum[] = TAXONOMY;
  basicConfig = createTreeChartConfig({
    data: this.basicData,
    showLabels: true,
  });

  // EXAMPLE 2: Dendrogram — every leaf pulled onto the outer edge
  dendrogramConfig = createTreeChartConfig({
    alignLeaves: true,
    data: TAXONOMY,
    showLabels: true,
  });

  // EXAMPLE 3: Organisational Chart — top-down with right-angle reporting lines
  orgChartConfig = createTreeChartConfig({
    data: ORG,
    linkShape: 'elbow',
    orientation: 'top-bottom',
    showLabels: true,
  });

  // EXAMPLE 4: Radial Convergence — the root at the centre, depth growing outward
  radialConfig = createTreeChartConfig({
    alignLeaves: true,
    data: ORG,
    layout: 'radial',
    showLabels: true,
  });

  // EXAMPLE 5: Depth cap
  cappedConfig = createTreeChartConfig({
    data: ORG,
    maxDepth: 1,
    showLabels: true,
  });

  // EXAMPLE 6: Click Handling
  readonly lastClicked = signal<string>('None');
  clickableConfig = createTreeChartConfig({
    data: ORG,
    onClick: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
    showLabels: true,
  });

  // EXAMPLE 7: Tooltips
  tooltipConfig = createTreeChartConfig({
    data: ORG,
    tooltip: {
      enabled: true,
      formatContent: (d: NgeHierarchyDatum) => ({
        label: d.label,
        value: `${d.value} people`,
      }),
    },
  });

  // EXAMPLE 8: Dynamic Data with Signals
  readonly dynamicData = signal<NgeHierarchyDatum[]>(TAXONOMY);
  readonly dynamicConfig = computed(() =>
    createTreeChartConfig({
      data: this.dynamicData(),
      showLabels: true,
    })
  );

  randomizeData(): void {
    const pool = ['Coffee', 'Tea', 'Juice', 'Soda', 'Water', 'Kombucha'];
    const branchCount = 2 + Math.floor(Math.random() * 3);

    this.dynamicData.set([
      {
        children: pool.slice(0, branchCount).map(label => ({
          children: Array.from({ length: 1 + Math.floor(Math.random() * 3) }, (_, index) => ({
            label: `${label} ${index + 1}`,
            value: 1 + Math.floor(Math.random() * 9),
          })),
          label,
        })),
        label: 'Drinks',
      },
    ]);
  }
}
