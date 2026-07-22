import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBumpDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createBumpChartConfig } from '../../../../presets/bump-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Ordered x axis shared by every bump story — seven years of rankings. A bump chart
 * needs an ORDERED x so the rank lines read left-to-right.
 */
const YEARS = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];

/**
 * Streaming-platform subscribers (millions) — the shared rank-over-time dataset reused
 * across the usage / theming / interaction stories. Five platforms whose values reorder
 * year over year so their RANKS genuinely cross (Pulse leads early then slides to last;
 * Nova and Zenith climb; Orbit and Vertex trade the middle) — the whole point of a bump
 * chart.
 */
const SUBSCRIBERS: Record<string, number[]> = {
  Nova: [45, 52, 58, 54, 60, 72, 88],
  Orbit: [30, 42, 56, 70, 68, 66, 75],
  Pulse: [60, 64, 62, 58, 55, 50, 48],
  Vertex: [52, 48, 50, 62, 72, 70, 65],
  Zenith: [25, 30, 38, 46, 58, 64, 70],
};

/** Flatten a `{ series: values[] }` table into `NgeBumpDataPoint` rows over YEARS. */
function buildBumpData(table: Record<string, number[]>): NgeBumpDataPoint[] {
  return Object.entries(table).flatMap(([seriesId, values]) =>
    values.map((value, index) => ({ seriesId, value, x: YEARS[index] }))
  );
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'bump-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'bump-chart-usage-stories',
  standalone: true,
  styleUrl: './bump-chart-usage-stories.component.scss',
  templateUrl: './bump-chart-usage-stories.component.html',
})
export class BumpChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bump-chart/usage';

  // ============================================
  // EXAMPLE 1: Basic Usage
  // ============================================
  basicData: NgeBumpDataPoint[] = buildBumpData(SUBSCRIBERS);

  basicConfig = createBumpChartConfig({
    data: this.basicData,
    xAxisLabel: 'Year',
  });

  // ============================================
  // EXAMPLE 2: Rank Order (desc vs asc)
  // ============================================
  // `desc` (default): highest value = rank 1. `asc`: lowest value = rank 1.
  descConfig = createBumpChartConfig({
    data: this.basicData,
    rankOrder: 'desc',
    xAxisLabel: 'Year',
  });

  ascConfig = createBumpChartConfig({
    data: this.basicData,
    rankOrder: 'asc',
    xAxisLabel: 'Year',
  });

  // ============================================
  // EXAMPLE 3: Curve Types
  // ============================================
  bumpCurveConfig = createBumpChartConfig({
    curveType: 'bump',
    data: this.basicData,
  });

  linearCurveConfig = createBumpChartConfig({
    curveType: 'linear',
    data: this.basicData,
  });

  monotoneCurveConfig = createBumpChartConfig({
    curveType: 'monotone',
    data: this.basicData,
  });

  // ============================================
  // EXAMPLE 4: Points & Labels
  // ============================================
  // End-of-line labels + per-rank circles both aid reading; toggle either off.
  linesOnlyConfig = createBumpChartConfig({
    data: this.basicData,
    showLabels: false,
    showPoints: false,
    xAxisLabel: 'Year',
  });

  // ============================================
  // EXAMPLE 5: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickConfig = createBumpChartConfig({
    data: this.basicData,
    onClick: (event: NgeChartLayerClickEvent<NgeBumpDataPoint>) => {
      this.lastClicked.set(
        `${event.data.seriesId} @ ${String(event.data.x)}: value ${event.data.value}`
      );
    },
    xAxisLabel: 'Year',
  });

  // ============================================
  // EXAMPLE 6: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeBumpDataPoint[]>(buildBumpData(SUBSCRIBERS));

  readonly dynamicConfig = computed(() =>
    createBumpChartConfig({
      data: this.dynamicData(),
      xAxisLabel: 'Year',
    })
  );

  randomizeData(): void {
    this.dynamicData.set(
      Object.keys(SUBSCRIBERS).flatMap(seriesId =>
        YEARS.map(year => ({ seriesId, value: Math.floor(Math.random() * 80) + 20, x: year }))
      )
    );
  }

  // ============================================
  // EXAMPLE 7: Tooltip on Hover
  // ============================================
  tooltipConfig = createBumpChartConfig({
    data: this.basicData,
    tooltip: { enabled: true, position: 'follow-mouse' },
    xAxisLabel: 'Year',
  });

  // ============================================
  // EXAMPLE 8: Legend
  // ============================================
  legendConfig = createBumpChartConfig({
    data: this.basicData,
    legend: { enabled: true, position: 'bottom' },
    xAxisLabel: 'Year',
  });
}
