import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeChordLayout,
  NgeChordLinkMark,
  NgeGraph,
  NgeGraphNode,
} from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';
import type { NgeLegendItem } from '../../../../core/legend';

import { extractChordChartLegendItems } from '../../../../core/legend';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createChordChartConfig } from '../../../../presets/chord-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Interstate migration between six US regions — the same fixture the other two facets use. */
const MIGRATION: NgeGraph = {
  links: [
    { source: 'Northeast', target: 'Southeast', value: 420 },
    { source: 'Southeast', target: 'Northeast', value: 95 },
    { source: 'Northeast', target: 'Midwest', value: 60 },
    { source: 'Midwest', target: 'Northeast', value: 75 },
    { source: 'Northeast', target: 'West', value: 140 },
    { source: 'West', target: 'Northeast', value: 110 },
    { source: 'Southeast', target: 'Midwest', value: 85 },
    { source: 'Midwest', target: 'Southeast', value: 130 },
    { source: 'Southeast', target: 'West', value: 65 },
    { source: 'West', target: 'Southeast', value: 55 },
    { source: 'Southeast', target: 'Southwest', value: 150 },
    { source: 'Southwest', target: 'Southeast', value: 45 },
    { source: 'Midwest', target: 'West', value: 175 },
    { source: 'West', target: 'Midwest', value: 95 },
    { source: 'Midwest', target: 'Southwest', value: 60 },
    { source: 'Southwest', target: 'Midwest', value: 50 },
    { source: 'Southwest', target: 'West', value: 230 },
    { source: 'West', target: 'Southwest', value: 280 },
    { source: 'Mountain', target: 'West', value: 115 },
    { source: 'West', target: 'Mountain', value: 135 },
    { source: 'Mountain', target: 'Southwest', value: 90 },
    { source: 'Southwest', target: 'Mountain', value: 70 },
  ],
};

/**
 * Node ids in first-seen order — the same order `deriveGraphNodes` resolves (and therefore the
 * same order `extractChordChartLegendItems` and the renderer both use), so the legend's palette
 * assignment always matches the chart's.
 */
const NODE_IDS: string[] = (() => {
  const ids: string[] = [];
  for (const link of MIGRATION.links) {
    for (const id of [link.source, link.target]) {
      if (!ids.includes(id)) {
        ids.push(id);
      }
    }
  }
  return ids;
})();

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-chord-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-chord-chart-interaction-stories',
  standalone: true,
  styleUrl: './chord-chart-interaction-stories.component.scss',
  templateUrl: './chord-chart-interaction-stories.component.html',
})
export class NgeChordChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/chord-chart/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // === Layer - Layout ===
  readonly layout = input<NgeChordLayout>('circular');
  readonly linkMark = input<NgeChordLinkMark>('ribbon');
  readonly directed = input<boolean>(false);
  readonly sortSubgroups = input<'ascending' | 'descending' | 'none'>('none');

  // === Layer - Geometry (circular layout only) ===
  readonly innerRadius = input<number>(0.9);
  readonly radiusRatio = input<number>(1);
  readonly padAngle = input<number>(0);
  readonly startAngle = input<number>(0);
  readonly endAngle = input<number>(6.28);

  // === Layer - Labels ===
  readonly showLabels = input<boolean>(true);
  readonly labelPadding = input<number>(6);

  // === Layer - Legend ===
  readonly showLegend = input<boolean>(true);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('right');
  /** Suppress the internal legend and render the standalone interactive <nge-chart-legend> above the chart. */
  readonly interactiveLegend = input<boolean>(false);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);

  // === Theme - Node Styling ===
  readonly nodeOpacity = input<number>(1);
  readonly nodeStroke = input<string>('');
  readonly nodeStrokeWidth = input<number>(1);

  // === Theme - Link Styling ===
  readonly linkOpacity = input<number>(0.4);
  readonly linkOpacityHover = input<number>(0.75);

  // === Theme - Label Styling ===
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(11);
  readonly labelFontWeight = input<number>(600);

  /** The last-clicked node's label + laid-out flow total, or 'None'. */
  readonly lastClicked = signal<string>('None');

  /** The graph the controls drive. Replaced wholesale by randomizeData(). */
  private readonly graph = signal<NgeGraph>(MIGRATION);

  /** Nodes toggled OFF via the standalone legend. Immutable Set (replaced, never mutated) so the signal fires. */
  private readonly hiddenNodes = signal<Set<string>>(new Set());

  /**
   * One legend entry per node in FULL order, coloured to match the renderer —
   * `extractChordChartLegendItems` derives the same node set/order the layer itself resolves
   * (via the shared `deriveGraphNodes`), so the two can never disagree.
   */
  private readonly baseLegendItems = computed<NgeLegendItem[]>(() =>
    extractChordChartLegendItems(this.graph())
  );

  /**
   * Stable node id → colour, read by both the marks (via `chartGraph`'s stamped nodes) and the
   * legend swatches. The renderer assigns palette colour by a node's index in the laid-out set,
   * so simply filtering a toggled-off node would shift every later node's index and repaint the
   * ring; resolving colour here over the FULL order and stamping it onto survivors pins each
   * one to the colour it already had.
   */
  private readonly colorById = computed<Map<string, string>>(
    () => new Map(this.baseLegendItems().map(item => [item.id ?? item.label, item.color]))
  );

  /** One entry per node in FULL order; a hidden node stays listed but dimmed. */
  readonly legendItems = computed<NgeLegendItem[]>(() => {
    const hidden = this.hiddenNodes();
    return this.baseLegendItems().map(item => {
      const isHidden = hidden.has(item.id ?? item.label);
      return { ...item, opacity: isHidden ? 0.4 : 1, selected: !isHidden };
    });
  });

  /**
   * The graph handed to the preset. When the legend is interactive, hidden nodes are dropped
   * along with every link that touches them, and survivors are stamped with their stable
   * colour, matching the sankey layer's own `chartGraph` shape for the same `NgeGraph` input.
   *
   * ⚠️ This FILTERS rather than fades. The library's documented rule (ARCH-284,
   * `docs/architecture/charts.md` § "Legend interactivity & series selection") is that a
   * legend selection must fade, never filter — removing data re-runs the layout and changes
   * the size of whatever survives, which is exactly what happens here: dropping a node
   * re-runs `d3.chord()` on the remaining links, so every surviving arc grows. Chord has no
   * `highlightedNodes` config / `dimmedOpacity` theme token to fade with yet (unlike pie,
   * which has both), so filtering is the only thing this story can express today. The
   * template says so directly to the reader — see the visible note beside the legend, not
   * just this comment.
   */
  private readonly chartGraph = computed<NgeGraph>(() => {
    const graph = this.graph();
    if (!this.interactiveLegend()) {
      return graph;
    }

    const hidden = this.hiddenNodes();
    const colorById = this.colorById();
    const links = graph.links.filter(link => !hidden.has(link.source) && !hidden.has(link.target));
    const visible = NODE_IDS.filter(id => !hidden.has(id));

    return {
      links,
      nodes: visible.map(id => ({ color: colorById.get(id), id })),
    };
  });

  // Toggle a node in/out of the diagram (immutable Set so the signal fires).
  onLegendItemClick(item: NgeLegendItem): void {
    const key = item.id ?? item.label;
    this.hiddenNodes.update(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  randomizeData(): void {
    this.graph.set({
      links: MIGRATION.links.map(link => ({
        ...link,
        value: Math.round(20 + Math.random() * 480),
      })),
    });
  }

  /** Rebuilds whenever any control (or the re-rolled data) changes. */
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createChordChartConfig({
      data: this.chartGraph(),
      directed: this.directed(),
      endAngle: this.endAngle(),
      innerRadius: this.innerRadius(),
      labelColor: this.labelColor() || undefined,
      labelPadding: this.labelPadding(),
      layout: this.layout(),
      linkMark: this.linkMark(),
      onClick: (event: NgeChartLayerClickEvent<NgeGraphNode>) => {
        this.lastClicked.set(`${event.data.label ?? event.data.id}: ${event.data.value ?? 0}`);
      },
      padAngle: this.padAngle(),
      radiusRatio: this.radiusRatio(),
      showLabels: this.showLabels(),
      sortSubgroups: this.sortSubgroups(),
      startAngle: this.startAngle(),
      tooltip: this.showTooltip()
        ? { enabled: true, height: this.tooltipHeight(), width: this.tooltipWidth() }
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
        chord: {
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          link: {
            opacity: this.linkOpacity(),
            opacityHover: this.linkOpacityHover(),
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
}
