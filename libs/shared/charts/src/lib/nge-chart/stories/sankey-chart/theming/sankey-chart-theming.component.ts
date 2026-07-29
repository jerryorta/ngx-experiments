import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeGraph } from '../../../../core/config';

import { createSankeyChartConfig } from '../../../../presets/sankey-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Monthly household budget — three sources into one pot, then out across six categories. */
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
    class: 'nge-sankey-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-sankey-chart-theming',
  standalone: true,
  styleUrl: './sankey-chart-theming.component.scss',
  templateUrl: './sankey-chart-theming.component.html',
})
export class NgeSankeyChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sankey-chart/theming';

  /** Default theme — no overrides, so everything resolves from `--nge-chart-*` tokens. */
  defaultConfig = createSankeyChartConfig({
    data: BUDGET,
    showLabels: true,
  });

  /** Forest — a green node palette with ribbons translucent enough to read the crossings. */
  greenConfig: NgeChartConfig = {
    ...createSankeyChartConfig({ data: BUDGET, showLabels: true }),
    theme: {
      sankey: {
        link: { opacity: 0.35, opacityHover: 0.8 },
        node: {
          colors: ['#1b5e20', '#2e7d32', '#43a047', '#66bb6a', '#81c784', '#a5d6a7'],
          stroke: '#ffffff',
        },
      },
    },
  };

  /** Ocean — a blue palette on a heavier node outline. */
  blueConfig: NgeChartConfig = {
    ...createSankeyChartConfig({ data: BUDGET, showLabels: true }),
    theme: {
      sankey: {
        link: { opacity: 0.4 },
        node: {
          colors: ['#0d47a1', '#1565c0', '#1976d2', '#42a5f5', '#64b5f6', '#90caf9'],
          stroke: '#ffffff',
          strokeWidth: 2,
        },
      },
    },
  };

  /** Ember — a warm palette showing how opacity alone changes the density of the reading. */
  emberConfig: NgeChartConfig = {
    ...createSankeyChartConfig({ data: BUDGET, showLabels: true }),
    theme: {
      sankey: {
        link: { opacity: 0.55, opacityHover: 0.95 },
        node: {
          colors: ['#bf360c', '#d84315', '#e64a19', '#f4511e', '#ff7043', '#ffab91'],
          stroke: '#fff8f6',
        },
      },
    },
  };

  /**
   * Monochrome — every node the same grey, so the ribbons carry the whole reading. A flat
   * `link.color` is the fallback used only when neither the link nor its source node names
   * one, which is exactly the case here once the palette collapses to a single entry.
   */
  monochromeConfig: NgeChartConfig = {
    ...createSankeyChartConfig({ data: BUDGET, showLabels: true }),
    theme: {
      sankey: {
        link: { opacity: 0.3 },
        node: { colors: ['#546e7a'], stroke: '#ffffff' },
      },
    },
  };

  /**
   * Opacity is the load-bearing knob. At 0.9 the ribbons stack opaquely and whichever paints
   * last wins; at 0.2 every crossing is legible but the individual flows go faint. The default
   * 0.4 is the compromise.
   */
  denseConfig: NgeChartConfig = {
    ...createSankeyChartConfig({ data: BUDGET, showLabels: true }),
    theme: { sankey: { link: { opacity: 0.9 } } },
  };

  sparseConfig: NgeChartConfig = {
    ...createSankeyChartConfig({ data: BUDGET, showLabels: true }),
    theme: { sankey: { link: { opacity: 0.2 } } },
  };

  /**
   * Label typography. The slice is theme-relative and carries no `colorOnDark` — a node rect
   * is far too narrow to seat text, so labels always sit on the plot surface and never take
   * the on-fill contrast derivation the in-mark slices do.
   */
  typographyConfig: NgeChartConfig = {
    ...createSankeyChartConfig({ data: BUDGET, labelPadding: 10, showLabels: true }),
    theme: {
      sankey: {
        label: { color: '#4a148c', fontSize: 13, fontWeight: 700 },
        node: { colors: ['#7b1fa2', '#8e24aa', '#9c27b0', '#ab47bc', '#ba68c8', '#ce93d8'] },
      },
    },
  };

  /** Parallel Sets under a themed palette — the straight-sided reading is theme-independent. */
  parallelSetsConfig: NgeChartConfig = {
    ...createSankeyChartConfig({
      data: BUDGET,
      linkShape: 'parallelogram',
      showLabels: true,
    }),
    theme: {
      sankey: {
        link: { opacity: 0.45 },
        node: {
          colors: ['#00695c', '#00897b', '#26a69a', '#4db6ac', '#80cbc4', '#b2dfdb'],
          stroke: '#ffffff',
        },
      },
    },
  };
}
