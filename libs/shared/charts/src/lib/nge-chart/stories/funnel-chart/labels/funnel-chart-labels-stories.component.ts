import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeFunnelDataPoint } from '../../../../core/config';

import { createFunnelChartConfig } from '../../../../presets/funnel-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Dedicated label showcase for the funnel layer — every `labelPosition` mode side by
 * side, so the placement trade-off is visible at a glance rather than buried in one
 * section of the usage page.
 *
 * The three modes are not cosmetic variants of each other: `'inside'` fails as soon as
 * a band is narrower than its text (see the tapering pipeline below), which is exactly
 * the case outside labels exist to solve.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-funnel-chart-labels-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-funnel-chart-labels-stories',
  standalone: true,
  styleUrl: './funnel-chart-labels-stories.component.scss',
  templateUrl: './funnel-chart-labels-stories.component.html',
})
export class NgeFunnelChartLabelsStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/funnel-chart/labels';

  // Share-of-total dataset — the shape used by the classic funnel reference: a dominant
  // first stage tapering hard to a small tail.
  private readonly shareData: NgeFunnelDataPoint[] = [
    { label: 'A', value: 60 },
    { label: 'B', value: 20 },
    { label: 'C', value: 15 },
    { label: 'D', value: 5 },
  ];

  // Real-world stage names — long enough to show why an inside label stops fitting once
  // the funnel narrows.
  private readonly pipelineData: NgeFunnelDataPoint[] = [
    { label: 'Visitors', value: 10000 },
    { label: 'Signups', value: 4200 },
    { label: 'Trials', value: 1800 },
    { label: 'Customers', value: 650 },
  ];

  // The 10px theme default is sized for in-band text; outside labels are the chart's
  // primary annotation, so they carry more weight.
  //
  // Styled through `labelOutside`, NOT `label` (ARCH-267). The two slices are separate
  // because their backdrops are: an in-band label sits on a saturated band fill and reads the
  // absolute black/white contrast pair, while an 'edge' / 'right' label sits on the page
  // surface and tracks `--nge-chart-on-surface`. Overriding `label` here would style the
  // inside example below and leave these three untouched.
  private readonly outsideLabelTheme = {
    funnel: { labelOutside: { fontSize: 14, fontWeight: 600 } },
  };

  private readonly palette = ['#F9423A', '#DE2B27', '#26325B', '#BE2141'];

  // ============================================
  // 1. labelPosition: 'edge' — follows the taper
  // ============================================
  edgeConfig: NgeChartConfig = {
    ...createFunnelChartConfig({
      data: this.shareData,
      formatLabel: d => `${d.label}  ${d.value}%`,
      labelGutter: 110,
      labelPosition: 'edge',
      neckRatio: 0,
      seriesColors: this.palette,
      showLabels: true,
    }),
    theme: this.outsideLabelTheme,
  };

  // ============================================
  // 2. labelPosition: 'right' — aligned column
  // ============================================
  rightConfig: NgeChartConfig = {
    ...createFunnelChartConfig({
      data: this.shareData,
      formatLabel: d => `${d.label}  ${d.value}%`,
      labelGutter: 110,
      labelPosition: 'right',
      neckRatio: 0,
      seriesColors: this.palette,
      showLabels: true,
    }),
    theme: this.outsideLabelTheme,
  };

  // ============================================
  // 3. labelPosition: 'inside' — the default
  // ============================================
  insideConfig = createFunnelChartConfig({
    data: this.shareData,
    formatLabel: d => `${d.label}  ${d.value}%`,
    labelPosition: 'inside',
    neckRatio: 0,
    seriesColors: this.palette,
    showLabels: true,
  });

  // ============================================
  // 4. Long stage names — why outside labels exist
  // ============================================
  longLabelsInsideConfig = createFunnelChartConfig({
    data: this.pipelineData,
    formatLabel: d => `${d.label} — ${d.value.toLocaleString()}`,
    labelPosition: 'inside',
    showLabels: true,
  });

  longLabelsEdgeConfig: NgeChartConfig = {
    ...createFunnelChartConfig({
      data: this.pipelineData,
      formatLabel: d => `${d.label} — ${d.value.toLocaleString()}`,
      labelGutter: 150,
      labelPosition: 'edge',
      showLabels: true,
    }),
    theme: this.outsideLabelTheme,
  };

  // ============================================
  // 5. Pyramid with labels
  // ============================================
  pyramidLabelsConfig: NgeChartConfig = {
    ...createFunnelChartConfig({
      data: this.shareData,
      direction: 'up',
      formatLabel: d => `${d.label}  ${d.value}%`,
      labelGutter: 110,
      labelPosition: 'edge',
      neckRatio: 0,
      seriesColors: this.palette,
      showLabels: true,
    }),
    theme: this.outsideLabelTheme,
  };
}
