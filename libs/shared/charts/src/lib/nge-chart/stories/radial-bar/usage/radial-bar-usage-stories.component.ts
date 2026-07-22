import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeRadialBarDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createRadialBarChartConfig } from '../../../../presets/radial-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'radial-bar-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'radial-bar-usage-stories',
  standalone: true,
  styleUrl: './radial-bar-usage-stories.component.scss',
  templateUrl: './radial-bar-usage-stories.component.html',
})
export class RadialBarUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/radial-bar/usage';

  // Single-series weekday magnitudes — the angular category (`label`) + radial `value`
  // shared by the bar / rose / coxcomb / donut / click / dynamic examples below.
  private readonly barData: NgeRadialBarDataPoint[] = [
    { label: 'Mon', value: 30 },
    { label: 'Tue', value: 55 },
    { label: 'Wed', value: 40 },
    { label: 'Thu', value: 25 },
    { label: 'Fri', value: 60 },
  ];

  // Multi-series quarterly data — two `seriesId` groups sharing the same angular
  // categories drive the radial line + area example (one closed area per series).
  private readonly areaData: NgeRadialBarDataPoint[] = [
    { label: 'Q1', seriesId: '2023', value: 30 },
    { label: 'Q2', seriesId: '2023', value: 52 },
    { label: 'Q3', seriesId: '2023', value: 41 },
    { label: 'Q4', seriesId: '2023', value: 60 },
    { label: 'Q1', seriesId: '2024', value: 45 },
    { label: 'Q2', seriesId: '2024', value: 38 },
    { label: 'Q3', seriesId: '2024', value: 66 },
    { label: 'Q4', seriesId: '2024', value: 50 },
  ];

  // Circular-heatmap data — the angular `label` (weekday) crossed with the radial
  // `band` (AM / PM ring); `value` maps to each cell's fill intensity.
  private readonly cellData: NgeRadialBarDataPoint[] = [
    { band: 'AM', label: 'Mon', value: 100 },
    { band: 'PM', label: 'Mon', value: 40 },
    { band: 'AM', label: 'Tue', value: 70 },
    { band: 'PM', label: 'Tue', value: 90 },
    { band: 'AM', label: 'Wed', value: 55 },
    { band: 'PM', label: 'Wed', value: 60 },
    { band: 'AM', label: 'Thu', value: 30 },
    { band: 'PM', label: 'Thu', value: 85 },
    { band: 'AM', label: 'Fri', value: 95 },
    { band: 'PM', label: 'Fri', value: 45 },
  ];

  // ============================================
  // EXAMPLE 1: Basic Radial Bar
  // ============================================
  basicConfig = createRadialBarChartConfig({
    data: this.barData,
    padAngle: 0.02,
  });

  // ============================================
  // EXAMPLE 2: Polar Area / Nightingale Rose
  // ============================================
  roseConfig = createRadialBarChartConfig({
    data: this.barData,
    mark: 'bar',
    padAngle: 0,
    wedge: 'equal',
  });

  // ============================================
  // EXAMPLE 3: Coxcomb (value-proportional wedges)
  // ============================================
  coxcombConfig = createRadialBarChartConfig({
    data: this.barData,
    mark: 'bar',
    wedge: 'value',
  });

  // ============================================
  // EXAMPLE 4: Radial Line + Area (multi-series)
  // ============================================
  areaConfig = createRadialBarChartConfig({
    data: this.areaData,
    innerRadius: 0.1,
    mark: 'area',
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 5: Circular Heat Map
  // ============================================
  cellConfig = createRadialBarChartConfig({
    data: this.cellData,
    innerRadius: 0.2,
    mark: 'cell',
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 6: Donut Hole (innerRadius ratio)
  // ============================================
  donutConfig = createRadialBarChartConfig({
    data: this.barData,
    innerRadius: 0.4,
    padAngle: 0.02,
  });

  // ============================================
  // EXAMPLE 7: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createRadialBarChartConfig({
    data: this.barData,
    onClick: (event: NgeChartLayerClickEvent<NgeRadialBarDataPoint>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
    padAngle: 0.02,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 8: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeRadialBarDataPoint[]>(this.barData);

  readonly dynamicConfig = computed<NgeChartConfig>(() =>
    createRadialBarChartConfig({
      data: this.dynamicData(),
      padAngle: 0.02,
      tooltip: { enabled: true },
    })
  );

  randomizeData(): void {
    this.dynamicData.set(
      this.barData.map(point => ({ ...point, value: Math.round(15 + Math.random() * 75) }))
    );
  }
}
