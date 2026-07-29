import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeHierarchyDatum,
  NgeTreeLayout,
  NgeTreeLinkShape,
  NgeTreeOrientation,
} from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createTreeChartConfig } from '../../../../presets/tree-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * A DELIBERATELY ragged hierarchy — some branches reach three levels and others stop at two.
 * `alignLeaves` is invisible on a balanced tree, so a balanced fixture would make the control
 * look broken.
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
    class: 'nge-tree-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-tree-chart-interaction-stories',
  standalone: true,
  styleUrl: './tree-chart-interaction-stories.component.scss',
  templateUrl: './tree-chart-interaction-stories.component.html',
})
export class NgeTreeChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/tree-chart/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(16);
  readonly marginRight = input<number>(16);
  readonly marginBottom = input<number>(16);
  readonly marginLeft = input<number>(16);

  // === Layer - Layout ===
  readonly layout = input<NgeTreeLayout>('tidy');
  readonly alignLeaves = input<boolean>(false);
  readonly orientation = input<NgeTreeOrientation>('left-right');
  readonly linkShape = input<NgeTreeLinkShape>('curve');
  readonly nodeRadius = input<number>(4);
  readonly maxDepth = input<number>(0);
  readonly radiusRatio = input<number>(1);

  // === Layer - Labels ===
  readonly showLabels = input<boolean>(true);
  readonly labelPadding = input<number>(6);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(false);

  // === Theme - Node Styling ===
  readonly nodeColor1 = input<string>('');
  readonly nodeColor2 = input<string>('');
  readonly nodeColor3 = input<string>('');
  readonly nodeOpacity = input<number>(1);
  readonly nodeStroke = input<string>('');
  readonly nodeStrokeWidth = input<number>(1);

  // === Theme - Link Styling ===
  readonly linkColor = input<string>('');
  readonly linkOpacity = input<number>(0.9);
  readonly linkWidth = input<number>(1.5);

  // === Theme - Label Styling ===
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);
  readonly labelFontWeight = input<number>(600);

  readonly sampleData = signal<NgeHierarchyDatum[]>(TAXONOMY);
  readonly lastClicked = signal<string>('None');

  // Rebuilds whenever ANY control changes.
  readonly config = computed<NgeChartConfig>(() => {
    const palette = [this.nodeColor1(), this.nodeColor2(), this.nodeColor3()].filter(Boolean);

    const baseConfig = createTreeChartConfig({
      alignLeaves: this.alignLeaves(),
      data: this.sampleData(),
      labelPadding: this.labelPadding(),
      layout: this.layout(),
      linkShape: this.linkShape(),
      // 0 means "no cap" — the control's off position, since a range control has no undefined.
      maxDepth: this.maxDepth() > 0 ? this.maxDepth() : undefined,
      nodeRadius: this.nodeRadius(),
      onClick: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => {
        this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
      },
      orientation: this.orientation(),
      radiusRatio: this.radiusRatio(),
      seriesColors: palette.length ? palette : undefined,
      showLabels: this.showLabels(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            formatContent: (d: NgeHierarchyDatum) => ({
              label: d.label,
              value: String(d.value ?? ''),
            }),
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
        tree: {
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          link: {
            color: this.linkColor() || undefined,
            opacity: this.linkOpacity(),
            width: this.linkWidth(),
          },
          node: {
            opacity: this.nodeOpacity(),
            stroke: this.nodeStroke() || undefined,
            strokeWidth: this.nodeStrokeWidth(),
          },
        },
      },
    };
  });

  randomizeData(): void {
    const pool = ['Coffee', 'Tea', 'Juice', 'Soda', 'Water', 'Kombucha'];
    const branchCount = 2 + Math.floor(Math.random() * 3);

    this.sampleData.set([
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
