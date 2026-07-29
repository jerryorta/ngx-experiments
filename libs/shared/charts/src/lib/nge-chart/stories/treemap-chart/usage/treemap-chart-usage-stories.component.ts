import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeHierarchyDatum } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createTreemapChartConfig } from '../../../../presets/treemap-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-treemap-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-treemap-chart-usage-stories',
  standalone: true,
  styleUrl: './treemap-chart-usage-stories.component.scss',
  templateUrl: './treemap-chart-usage-stories.component.html',
})
export class NgeTreemapChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/treemap-chart/usage';

  // Shared cloud-spend hierarchy — the canonical treemap reading: which line items dominate
  // the bill, and how they group. Leaves carry `value`; internal nodes omit it and have their
  // magnitude summed from children by d3.hierarchy().sum().
  private readonly cloudSpend: NgeHierarchyDatum[] = [
    {
      children: [
        { label: 'EC2', value: 4200 },
        { label: 'Lambda', value: 860 },
        { label: 'Fargate', value: 640 },
      ],
      label: 'Compute',
    },
    {
      children: [
        { label: 'S3', value: 1900 },
        { label: 'EBS', value: 740 },
        { label: 'Glacier', value: 210 },
      ],
      label: 'Storage',
    },
    {
      children: [
        { label: 'RDS', value: 1650 },
        { label: 'DynamoDB', value: 520 },
      ],
      label: 'Database',
    },
    {
      children: [
        { label: 'CloudFront', value: 780 },
        { label: 'Data Transfer', value: 430 },
        { label: 'Route 53', value: 90 },
      ],
      label: 'Network',
    },
  ];

  // ============================================
  // EXAMPLE 1: Basic Treemap
  // ============================================
  basicConfig = createTreemapChartConfig({
    data: this.cloudSpend,
  });

  // ============================================
  // EXAMPLE 2: Labelled cells
  // ============================================
  labelledConfig = createTreemapChartConfig({
    data: this.cloudSpend,
    formatLabel: d => `${d.label} · $${d.value}`,
    minLabelSize: 44,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 3: Nested Proportional Area
  // ============================================
  nestedConfig = createTreemapChartConfig({
    data: this.cloudSpend,
    maxLabelDepth: 1,
    padding: 2,
    paddingOuter: 4,
    paddingTop: 18,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 4: Tiling variants
  // ============================================
  squarifyConfig = createTreemapChartConfig({
    data: this.cloudSpend,
    maxDepth: 1,
    showLabels: true,
    tiling: 'squarify',
  });

  binaryConfig = createTreemapChartConfig({
    data: this.cloudSpend,
    maxDepth: 1,
    showLabels: true,
    tiling: 'binary',
  });

  sliceDiceConfig = createTreemapChartConfig({
    data: this.cloudSpend,
    maxDepth: 1,
    showLabels: true,
    tiling: 'slice-dice',
  });

  // ============================================
  // EXAMPLE 5: Convex Treemap (Voronoi)
  // ============================================
  voronoiConfig = createTreemapChartConfig({
    data: this.cloudSpend,
    maxLabelDepth: 1,
    seed: 7,
    showLabels: true,
    tiling: 'voronoi',
  });

  // ============================================
  // EXAMPLE 6: Tooltips
  // ============================================
  tooltipConfig = createTreemapChartConfig({
    data: this.cloudSpend,
    tooltip: {
      enabled: true,
      formatContent: d => ({ label: d.label, value: `$${(d.value ?? 0).toLocaleString()}` }),
    },
  });

  // ============================================
  // EXAMPLE 7: Click handling
  // ============================================
  readonly lastClicked = signal<string>('None');
  clickableConfig = createTreemapChartConfig({
    data: this.cloudSpend,
    onClick: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => {
      this.lastClicked.set(event.data.label);
    },
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 8: Dynamic data with signals
  // ============================================
  readonly dynamicData = signal<NgeHierarchyDatum[]>(this.cloudSpend);
  readonly dynamicConfig = computed(() =>
    createTreemapChartConfig({
      data: this.dynamicData(),
      showLabels: true,
    })
  );

  randomizeData(): void {
    this.dynamicData.set(
      this.cloudSpend.map(branch => ({
        ...branch,
        children: branch.children?.map(leaf => ({
          ...leaf,
          value: Math.round(200 + Math.random() * 4000),
        })),
      }))
    );
  }
}
