import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeGraph, NgeGraphNode } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createChordChartConfig } from '../../../../presets/chord-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Interstate migration between six US regions — a fixed set of entities with weighted,
 * reciprocal relationships, exactly what a chord diagram exists to read. Every region
 * appears as a link SOURCE at least once (a node that is only ever a target gets a
 * zero-width arc under the default undirected layout), and the Northeast/Southeast pair
 * is deliberately asymmetric (420 vs 95) so a merged ribbon's uneven ends are visible.
 */
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

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-chord-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-chord-chart-usage-stories',
  standalone: true,
  styleUrl: './chord-chart-usage-stories.component.scss',
  templateUrl: './chord-chart-usage-stories.component.html',
})
export class NgeChordChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/chord-chart/usage';

  // EXAMPLE 1: Chord Diagram — the defaults (circular layout, filled ribbons).
  basicConfig = createChordChartConfig({
    data: MIGRATION,
    showLabels: true,
  });

  // EXAMPLE 2: Non-ribbon Chord — the same ring, connections stroked instead of filled.
  nonRibbonConfig = createChordChartConfig({
    data: MIGRATION,
    linkMark: 'edge',
    showLabels: true,
  });

  // EXAMPLE 3: Arc Diagram — nodes on a baseline, connections as stroked arcs above it.
  arcDiagramConfig = createChordChartConfig({
    data: MIGRATION,
    layout: 'linear',
    showLabels: true,
  });

  // EXAMPLE 4: Labels — off the mark (past the ring / beneath the circle), with the gap
  // to the mark controlled by labelPadding.
  labelledConfig = createChordChartConfig({
    data: MIGRATION,
    labelPadding: 10,
    showLabels: true,
  });

  // EXAMPLE 5: Ring sizing — innerRadius sets the arc BAND thickness as a ratio of the
  // outer radius; radiusRatio shrinks the whole ring, leaving room around it.
  thinRingConfig = createChordChartConfig({
    data: MIGRATION,
    innerRadius: 0.75,
    showLabels: true,
  });
  scaledDownConfig = createChordChartConfig({
    data: MIGRATION,
    radiusRatio: 0.7,
    showLabels: true,
  });

  // EXAMPLE 6: Directed — `false` (default) merges A→B / B→A into one asymmetric-ended
  // ribbon; `true` draws them as two distinct ribbons. Look at Northeast ↔ Southeast
  // (420 vs 95) to see the difference plainly.
  mergedConfig = createChordChartConfig({
    data: MIGRATION,
    showLabels: true,
  });
  directedConfig = createChordChartConfig({
    data: MIGRATION,
    directed: true,
    showLabels: true,
  });

  // EXAMPLE 7: Sort subgroups — orders the ribbons WITHIN each arc by value instead of
  // leaving d3-chord's own order.
  sortedConfig = createChordChartConfig({
    data: MIGRATION,
    showLabels: true,
    sortSubgroups: 'ascending',
  });

  // EXAMPLE 8: Tooltips — the default formatter reports each node's laid-out flow total.
  tooltipConfig = createChordChartConfig({
    data: MIGRATION,
    showLabels: true,
    tooltip: { enabled: true },
  });

  // EXAMPLE 9: Click Handling
  readonly lastClicked = signal<string>('None');
  clickableConfig = createChordChartConfig({
    data: MIGRATION,
    onClick: (event: NgeChartLayerClickEvent<NgeGraphNode>) => {
      this.lastClicked.set(`${event.data.label ?? event.data.id}: ${event.data.value ?? 0}`);
    },
    showLabels: true,
  });

  // EXAMPLE 10: Dynamic Data with Signals
  readonly dynamicGraph = signal<NgeGraph>(MIGRATION);
  readonly dynamicConfig = computed(() =>
    createChordChartConfig({
      data: this.dynamicGraph(),
      showLabels: true,
      tooltip: { enabled: true },
    })
  );

  randomizeData(): void {
    this.dynamicGraph.set({
      links: MIGRATION.links.map(link => ({
        ...link,
        value: Math.round(20 + Math.random() * 480),
      })),
    });
  }
}
