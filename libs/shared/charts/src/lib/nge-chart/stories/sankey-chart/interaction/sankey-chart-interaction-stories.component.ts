import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeGraph,
  NgeSankeyLinkShape,
  NgeSankeyNodeAlign,
} from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_SANKEY_LAYER_THEME } from '../../../../core/theme';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createSankeyChartConfig } from '../../../../presets/sankey-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Monthly household budget driving the controls. */
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

/**
 * Node ids in first-seen order — the same order the layer derives when `nodes` is omitted, so
 * the legend's palette assignment matches the chart's.
 */
const NODE_IDS: string[] = (() => {
  const ids: string[] = [];
  for (const link of BUDGET.links) {
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
    class: 'nge-sankey-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-sankey-chart-interaction-stories',
  standalone: true,
  styleUrl: './sankey-chart-interaction-stories.component.scss',
  templateUrl: './sankey-chart-interaction-stories.component.html',
})
export class NgeSankeyChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sankey-chart/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // === Layer config inputs ===
  readonly linkShape = input<NgeSankeyLinkShape>('curve');
  readonly nodeAlign = input<NgeSankeyNodeAlign>('justify');
  readonly nodeWidth = input<number>(16);
  readonly nodePadding = input<number>(8);
  readonly iterations = input<number>(6);
  readonly showLabels = input<boolean>(true);
  readonly labelPadding = input<number>(6);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(true);

  // === Layer - Legend ===
  readonly interactiveLegend = input<boolean>(false);

  // === Theme inputs ===
  readonly nodeStroke = input<string>('');
  readonly nodeStrokeWidth = input<number>(1);
  readonly nodeOpacity = input<number>(1);
  readonly linkOpacity = input<number>(DEFAULT_SANKEY_LAYER_THEME.link.opacity ?? 0.4);
  readonly linkOpacityHover = input<number>(DEFAULT_SANKEY_LAYER_THEME.link.opacityHover ?? 0.75);
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(11);

  /** The graph the controls drive. Replaced wholesale by `randomizeData()`. */
  private readonly graph = signal<NgeGraph>(BUDGET);

  /** Nodes toggled OFF via the standalone legend. Replaced, never mutated, so the signal fires. */
  private readonly hiddenNodes = signal<Set<string>>(new Set());

  /**
   * Stable `nodeId → colour` map over the FULL node order — the single source both the marks
   * and the legend swatches read.
   *
   * This is what keeps a toggle from recolouring the survivors. The layer assigns palette
   * colours by the node's index in the laid-out set, so dropping a node would shift every
   * later node's index and repaint the diagram. Stamping each surviving node with an explicit
   * `color` (which wins over the palette) pins it to the colour it had before the toggle.
   */
  private readonly colorByNodeId = computed<Map<string, string>>(() => {
    const colors = DEFAULT_SANKEY_LAYER_THEME.node.colors ?? [];
    return new Map(
      NODE_IDS.map(
        (id, i) =>
          [id, colors[i % colors.length] ?? 'var(--nge-chart-primary)'] as [string, string]
      )
    );
  });

  /** The stable colour for a node — the map is built over the full order, so this never misses. */
  private colorFor(id: string): string {
    return this.colorByNodeId().get(id) ?? 'var(--nge-chart-primary)';
  }

  /** One entry per node in FULL order; a hidden node stays listed but dimmed. */
  readonly legendItems = computed<NgeLegendItem[]>(() =>
    NODE_IDS.map(id => {
      const isHidden = this.hiddenNodes().has(id);
      return {
        color: this.colorFor(id),
        id,
        label: id,
        opacity: isHidden ? 0.4 : 1,
        selected: !isHidden,
      };
    })
  );

  /**
   * The graph handed to the preset. When the legend is interactive, hidden nodes are dropped
   * along with every link that touches them, and the survivors are stamped with their stable
   * colour.
   */
  private readonly chartGraph = computed<NgeGraph>(() => {
    const graph = this.graph();
    if (!this.interactiveLegend()) {
      return graph;
    }

    const hidden = this.hiddenNodes();
    const links = graph.links.filter(link => !hidden.has(link.source) && !hidden.has(link.target));
    const visible = NODE_IDS.filter(id => !hidden.has(id));

    return {
      links,
      nodes: visible.map(id => ({ color: this.colorFor(id), id })),
    };
  });

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
      links: BUDGET.links.map(link => ({
        ...link,
        value: Math.round(300 + Math.random() * 4200),
      })),
    });
  }

  /** Rebuilds whenever any control changes. */
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createSankeyChartConfig({
      data: this.chartGraph(),
      iterations: this.iterations(),
      labelColor: this.labelColor() || undefined,
      labelPadding: this.labelPadding(),
      linkShape: this.linkShape(),
      nodeAlign: this.nodeAlign(),
      nodePadding: this.nodePadding(),
      nodeWidth: this.nodeWidth(),
      showLabels: this.showLabels(),
      tooltip: this.showTooltip() ? { enabled: true } : undefined,
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
        sankey: {
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
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
