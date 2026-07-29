import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeFunnelDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createFunnelChartConfig } from '../../../../presets/funnel-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-funnel-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-funnel-chart-usage-stories',
  standalone: true,
  styleUrl: './funnel-chart-usage-stories.component.scss',
  templateUrl: './funnel-chart-usage-stories.component.html',
})
export class NgeFunnelChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/funnel-chart/usage';

  // Shared conversion-pipeline dataset — one band per stage, top to bottom in input order.
  private readonly conversionData: NgeFunnelDataPoint[] = [
    { label: 'Visitors', value: 10000 },
    { label: 'Signups', value: 4200 },
    { label: 'Trials', value: 1800 },
    { label: 'Customers', value: 650 },
  ];

  // Population-pyramid dataset — widest at the base, narrowing toward the apex.
  private readonly pyramidData: NgeFunnelDataPoint[] = [
    { label: 'Individual Contributors', value: 400 },
    { label: 'Managers', value: 80 },
    { label: 'Directors', value: 20 },
    { label: 'Executives', value: 5 },
  ];

  // ============================================
  // EXAMPLE 1: Basic Funnel
  // ============================================
  basicConfig = createFunnelChartConfig({
    data: this.conversionData,
  });

  // ============================================
  // EXAMPLE 2: Pyramid (direction: 'up' + neckRatio: 0)
  // ============================================
  pyramidConfig = createFunnelChartConfig({
    data: this.pyramidData,
    direction: 'up',
    neckRatio: 0,
  });

  // ============================================
  // EXAMPLE 3: Labels with a Custom Formatter
  // ============================================
  labeledConfig = createFunnelChartConfig({
    data: this.conversionData,
    formatLabel: d => `${d.label}: ${d.value.toLocaleString()}`,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 4: Gap — Discrete Stages
  // ============================================
  continuousConfig = createFunnelChartConfig({
    data: this.conversionData,
  });

  discreteConfig = createFunnelChartConfig({
    data: this.conversionData,
    gap: 8,
  });

  // ============================================
  // EXAMPLE 5: Left-aligned Bands
  // ============================================
  leftAlignConfig = createFunnelChartConfig({
    align: 'left',
    data: this.conversionData,
  });

  // ============================================
  // EXAMPLE 6: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createFunnelChartConfig({
    data: this.conversionData,
    onClick: (event: NgeChartLayerClickEvent<NgeFunnelDataPoint>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 7: Dynamic Data via Signals
  // ============================================
  readonly dynamicData = signal<NgeFunnelDataPoint[]>(this.conversionData);

  readonly dynamicConfig = computed<NgeChartConfig>(() =>
    createFunnelChartConfig({
      data: this.dynamicData(),
      showLabels: true,
      tooltip: { enabled: true },
    })
  );

  randomizeData(): void {
    let value = 5000 + Math.round(Math.random() * 10000);
    this.dynamicData.set(
      this.conversionData.map((point, index) => {
        if (index > 0) {
          value = Math.round(value * (0.4 + Math.random() * 0.35));
        }
        return { label: point.label, value };
      })
    );
  }

  // ============================================
  // EXAMPLE 8: Custom Series Colors
  // ============================================
  customColorsConfig = createFunnelChartConfig({
    data: this.conversionData,
    seriesColors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA'],
  });

  // ============================================
  // EXAMPLE 9: Labels Beside the Chart
  // ============================================
  // The classic funnel annotation: labels sit OUTSIDE the funnel, one per band, so they
  // stay legible as the bands taper toward the neck (an inside label has nowhere to go
  // once a band is only a few pixels wide). `labelGutter` is taken off the plot width
  // rather than the margin because the layers group is clipped to the plot rect — a
  // label past `boundedWidth` would be cut off.
  shareData: NgeFunnelDataPoint[] = [
    { label: 'A', value: 60 },
    { label: 'B', value: 20 },
    { label: 'C', value: 15 },
    { label: 'D', value: 5 },
  ];

  // The 10px theme default is sized for in-band labels; outside labels are the chart's
  // primary annotation, so bump them to read as such.
  //
  // Styled through `labelOutside`, NOT `label` (ARCH-267) — the two placements read
  // separate theme slices because their backdrops differ, so overriding `label` here
  // would leave these 'edge' / 'right' charts untouched.
  private readonly outsideLabelTheme = {
    funnel: { labelOutside: { fontSize: 14, fontWeight: 600 } },
  };

  // 'edge' sets each label just outside its OWN band's right edge, so the labels step
  // inward as the funnel narrows instead of forming a straight column.
  outsideLabelsConfig: NgeChartConfig = {
    ...createFunnelChartConfig({
      data: this.shareData,
      formatLabel: d => `${d.label}  ${d.value}%`,
      labelGutter: 110,
      labelPosition: 'edge',
      // 0 tapers the last band to a point, closing the funnel neck.
      neckRatio: 0,
      seriesColors: ['#F9423A', '#DE2B27', '#26325B', '#BE2141'],
      showLabels: true,
    }),
    theme: this.outsideLabelTheme,
  };

  // Same data, 'right' — every label pinned to one x for an aligned column.
  outsideLabelsColumnConfig: NgeChartConfig = {
    ...createFunnelChartConfig({
      data: this.shareData,
      formatLabel: d => `${d.label}  ${d.value}%`,
      labelGutter: 110,
      labelPosition: 'right',
      neckRatio: 0,
      seriesColors: ['#F9423A', '#DE2B27', '#26325B', '#BE2141'],
      showLabels: true,
    }),
    theme: this.outsideLabelTheme,
  };
}
