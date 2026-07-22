import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHierarchyDatum } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { extractSunburstChartLegendItems } from '../../../../core/legend';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createSunburstChartConfig } from '../../../../presets/sunburst-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Shared monthly-budget hierarchy driving the controls (three top-level branches). */
const BUDGET_HIERARCHY: NgeHierarchyDatum[] = [
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

/** Recursively re-roll every leaf's `value`; internal-node sums are recomputed by the renderer. */
function rerollLeaves(nodes: NgeHierarchyDatum[]): NgeHierarchyDatum[] {
  return nodes.map(node =>
    node.children?.length
      ? { ...node, children: rerollLeaves(node.children) }
      : { ...node, value: Math.round(50 + Math.random() * 1800) }
  );
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sunburst-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'sunburst-chart-interaction-stories',
  standalone: true,
  styleUrl: './sunburst-chart-interaction-stories.component.scss',
  templateUrl: './sunburst-chart-interaction-stories.component.html',
})
export class SunburstChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sunburst-chart/interaction';

  // Base - Margins
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // Layer - Layout
  readonly layout = input<'linear' | 'radial'>('radial');

  // Layer - Geometry
  readonly innerRadius = input<number>(0);
  readonly startAngle = input<number>(0);
  readonly endAngle = input<number>(6.28);
  readonly padAngle = input<number>(0);
  readonly maxDepth = input<number>(0);

  // Layer - Legend
  readonly showLegend = input<boolean>(true);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('right');
  /** Suppress the internal legend and render the standalone interactive <nge-chart-legend> above the chart. */
  readonly interactiveLegend = input<boolean>(false);

  // Layer - Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);

  // Theme - Segment Palette (top-level branch index → color)
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');

  // Theme - Segment Styling
  readonly segmentStroke = input<string>('');
  readonly segmentStrokeWidth = input<number>(1);
  readonly segmentOpacity = input<number>(1);

  // Sample data as a signal so the button can re-roll its leaf values.
  readonly sampleData = signal<NgeHierarchyDatum[]>(BUDGET_HIERARCHY);

  // Branch palette from the three color controls (empty entries dropped).
  readonly palette = computed<string[]>(() =>
    [this.seriesColor1(), this.seriesColor2(), this.seriesColor3()].filter(
      (color): color is string => !!color
    )
  );

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // Branches toggled OFF via the external interactive legend. Stored as an immutable
  // Set (replaced, never mutated) so updates fire the signal.
  private readonly hiddenBranches = signal<Set<string>>(new Set());

  // Base legend items over the FULL branch order, coloured to match the renderer
  // (extractSunburstChartLegendItems mirrors the layer's per-branch → palette[i % len]
  // resolution). Reused for both the internal legend and the interactive one.
  private readonly baseLegendItems = computed<NgeLegendItem[]>(() =>
    extractSunburstChartLegendItems(this.sampleData(), this.palette())
  );

  // Stable label → color map. The renderer colours each branch by its input index
  // (palette[i % len]); filtering a toggled-off branch would shift the survivors'
  // indices — and their colours. Resolving colours here over the full order and
  // stamping them onto chartData pins every branch's colour regardless of what is
  // currently visible.
  private readonly colorByLabel = computed<Map<string, string>>(
    () => new Map(this.baseLegendItems().map(item => [item.id ?? item.label, item.color]))
  );

  // One legend entry per branch (full order). A toggled-off branch stays listed but
  // dimmed (opacity 0.4) so it can be toggled back on.
  readonly legendItems = computed<NgeLegendItem[]>(() => {
    const hidden = this.hiddenBranches();
    return this.baseLegendItems().map(item => {
      const isHidden = hidden.has(item.id ?? item.label);
      return {
        ...item,
        opacity: isHidden ? 0.4 : 1,
        selected: !isHidden,
      };
    });
  });

  // Data fed to the preset. In interactiveLegend mode the toggled-off branches are
  // dropped and every remaining branch is stamped with its STABLE colour so the
  // renderer never recolours survivors as their indices shift. Otherwise the raw
  // sample data flows through unchanged.
  private readonly chartData = computed<NgeHierarchyDatum[]>(() => {
    const data = this.sampleData();
    if (!this.interactiveLegend()) {
      return data;
    }
    const hidden = this.hiddenBranches();
    const colorByLabel = this.colorByLabel();
    return data
      .filter(b => !hidden.has(b.label))
      .map(b => ({ ...b, color: colorByLabel.get(b.label) }));
  });

  // Toggle a branch in/out of the sunburst (immutable Set so the signal fires).
  onLegendItemClick(item: NgeLegendItem): void {
    const key = item.id ?? item.label;
    this.hiddenBranches.update(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Computed config rebuilds whenever any control (or the re-rolled data) changes.
  readonly config = computed<NgeChartConfig>(() => {
    const palette = this.palette();

    const baseConfig = createSunburstChartConfig({
      data: this.chartData(),
      endAngle: this.endAngle(),
      innerRadius: this.innerRadius(),
      layout: this.layout(),
      maxDepth: this.maxDepth() || undefined,
      padAngle: this.padAngle(),
      seriesColors: palette.length ? palette : undefined,
      startAngle: this.startAngle(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            height: this.tooltipHeight(),
            style: {
              backgroundColor: this.tooltipBackgroundColor() || undefined,
              borderColor: this.tooltipBorderColor() || undefined,
              borderWidth: this.tooltipBorderWidth(),
              divotHeight: this.tooltipDivotHeight(),
              divotWidth: this.tooltipDivotWidth(),
            },
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
      legend: this.interactiveLegend()
        ? undefined // external interactive legend takes over
        : this.showLegend()
          ? {
              enabled: true,
              items: this.baseLegendItems(),
              position: this.legendPosition(),
              swatchShape: 'square',
            }
          : undefined,
      theme: {
        sunburst: {
          segment: {
            opacity: this.segmentOpacity(),
            stroke: this.segmentStroke() || undefined,
            strokeWidth: this.segmentStrokeWidth(),
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.sampleData.set(rerollLeaves(BUDGET_HIERARCHY));
  }
}
