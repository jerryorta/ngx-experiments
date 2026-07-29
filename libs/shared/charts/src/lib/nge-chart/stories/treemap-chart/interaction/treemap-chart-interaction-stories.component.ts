import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeHierarchyDatum,
  NgeTreemapTiling,
} from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_TREEMAP_LAYER_THEME } from '../../../../core/theme';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createTreemapChartConfig } from '../../../../presets/treemap-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Shared cloud-spend hierarchy driving the controls (four top-level branches). */
const CLOUD_SPEND: NgeHierarchyDatum[] = [
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

/** Recursively re-roll every leaf's `value`; internal-node sums are recomputed by the renderer. */
function rerollLeaves(nodes: NgeHierarchyDatum[]): NgeHierarchyDatum[] {
  return nodes.map(node =>
    node.children?.length
      ? { ...node, children: rerollLeaves(node.children) }
      : { ...node, value: Math.round(80 + Math.random() * 4200) }
  );
}

/** A branch's summed magnitude — the key the renderer sorts top-level branches by. */
function totalOf(node: NgeHierarchyDatum): number {
  return node.children?.length
    ? node.children.reduce((sum, child) => sum + totalOf(child), 0)
    : Math.max(0, node.value ?? 0);
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-treemap-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-treemap-chart-interaction-stories',
  standalone: true,
  styleUrl: './treemap-chart-interaction-stories.component.scss',
  templateUrl: './treemap-chart-interaction-stories.component.html',
})
export class NgeTreemapChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/treemap-chart/interaction';

  // Base - Margins
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // Layer - Layout
  readonly tiling = input<NgeTreemapTiling>('squarify');
  readonly padding = input<number>(1);
  readonly paddingOuter = input<number>(0);
  readonly paddingTop = input<number>(0);
  readonly maxDepth = input<number>(0);

  // Layer - Voronoi (tiling: 'voronoi' only)
  readonly seed = input<number>(1);
  readonly convergenceRatio = input<number>(0.01);
  readonly maxIterationCount = input<number>(50);

  // Layer - Labels
  readonly showLabels = input<boolean>(true);
  readonly minLabelSize = input<number>(12);
  readonly maxLabelDepth = input<number>(0);

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

  // Theme - Cell Palette (top-level branch index → color)
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');
  readonly seriesColor4 = input<string>('#8E24AA');

  // Theme - Cell Styling
  readonly cellStroke = input<string>('');
  readonly cellStrokeWidth = input<number>(1);
  readonly cellOpacity = input<number>(1);
  readonly depthFade = input<number>(6);

  // Theme - Label Styling
  readonly labelFontSize = input<number>(10);
  readonly labelFontWeight = input<number>(600);
  /** Flat label colour — empty keeps the automatic on-fill contrast derivation. */
  readonly labelColor = input<string>('');

  // Sample data as a signal so the button can re-roll its leaf values.
  readonly sampleData = signal<NgeHierarchyDatum[]>(CLOUD_SPEND);

  // Branch palette from the four color controls (empty entries dropped).
  readonly palette = computed<string[]>(() =>
    [this.seriesColor1(), this.seriesColor2(), this.seriesColor3(), this.seriesColor4()].filter(
      (color): color is string => !!color
    )
  );

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // Branches toggled OFF via the external interactive legend. Stored as an immutable
  // Set (replaced, never mutated) so updates fire the signal.
  private readonly hiddenBranches = signal<Set<string>>(new Set());

  /**
   * Branch labels in the order the RENDERER lays them out.
   *
   * The layer sorts top-level branches by descending summed value before assigning
   * `palette[index]`, so the palette index is the sorted position, not the input position.
   * Mirroring that sort here is what keeps a legend swatch showing the same colour as the
   * cell it names — reading the colours off the input order would silently disagree
   * whenever the data is not already sorted.
   */
  private readonly sortedBranchLabels = computed<string[]>(() =>
    [...this.sampleData()].sort((a, b) => totalOf(b) - totalOf(a)).map(branch => branch.label)
  );

  /** Stable label → colour over the FULL sorted order. Feeds BOTH the swatches and the marks. */
  private readonly colorByLabel = computed<Map<string, string>>(() => {
    const palette = this.palette().length
      ? this.palette()
      : (DEFAULT_TREEMAP_LAYER_THEME.cell.colors ?? []);
    return new Map(
      this.sortedBranchLabels().map((label, i) => [
        label,
        palette[i % palette.length] ?? 'var(--nge-chart-primary)',
      ])
    );
  });

  // One legend entry per branch (full order). A toggled-off branch stays listed but
  // dimmed (opacity 0.4) so it can be toggled back on.
  readonly legendItems = computed<NgeLegendItem[]>(() => {
    const hidden = this.hiddenBranches();
    const colorByLabel = this.colorByLabel();
    return this.sortedBranchLabels().map(label => {
      const isHidden = hidden.has(label);
      return {
        color: colorByLabel.get(label) ?? 'var(--nge-chart-primary)',
        id: label,
        label,
        opacity: isHidden ? 0.4 : 1,
        selected: !isHidden,
      };
    });
  });

  // Data fed to the preset — toggled-off branches dropped in interactive-legend mode.
  private readonly chartData = computed<NgeHierarchyDatum[]>(() => {
    if (!this.interactiveLegend()) {
      return this.sampleData();
    }
    const hidden = this.hiddenBranches();
    return this.sampleData().filter(branch => !hidden.has(branch.label));
  });

  /**
   * Palette handed to the preset. In interactive-legend mode it is rebuilt as the surviving
   * branches' stable colours IN THE RENDERER'S SORT ORDER, so hiding one branch cannot shift
   * the survivors' palette indices and recolour them.
   *
   * Deliberately not solved by stamping each branch's `color`: a per-node colour opts that
   * node out of the depth fade, so the stamp would flatten the nesting the fade exists to show.
   */
  private readonly effectivePalette = computed<string[] | undefined>(() => {
    if (!this.interactiveLegend()) {
      return this.palette().length ? this.palette() : undefined;
    }
    const hidden = this.hiddenBranches();
    const colorByLabel = this.colorByLabel();
    return this.sortedBranchLabels()
      .filter(label => !hidden.has(label))
      .map(label => colorByLabel.get(label) ?? 'var(--nge-chart-primary)');
  });

  // Toggle a branch in/out of the treemap (immutable Set so the signal fires).
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
    const baseConfig = createTreemapChartConfig({
      convergenceRatio: this.convergenceRatio(),
      data: this.chartData(),
      labelColor: this.labelColor() || undefined,
      maxDepth: this.maxDepth() || undefined,
      maxIterationCount: this.maxIterationCount(),
      maxLabelDepth: this.maxLabelDepth() || undefined,
      minLabelSize: this.minLabelSize(),
      padding: this.padding(),
      paddingOuter: this.paddingOuter(),
      paddingTop: this.paddingTop(),
      seed: this.seed(),
      seriesColors: this.effectivePalette(),
      showLabels: this.showLabels(),
      tiling: this.tiling(),
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
              items: this.legendItems(),
              position: this.legendPosition(),
              swatchShape: 'square',
            }
          : undefined,
      theme: {
        treemap: {
          cell: {
            depthFade: this.depthFade(),
            opacity: this.cellOpacity(),
            stroke: this.cellStroke() || undefined,
            strokeWidth: this.cellStrokeWidth(),
          },
          label: {
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.sampleData.set(rerollLeaves(CLOUD_SPEND));
  }
}
