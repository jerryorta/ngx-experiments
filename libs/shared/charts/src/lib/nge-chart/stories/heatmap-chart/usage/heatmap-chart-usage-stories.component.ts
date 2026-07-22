import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeHeatmapDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createHeatmapChartConfig } from '../../../../presets/heatmap-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Row (region) and column (quarter) keys shared by every usage example. */
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

/** Build a fresh region × quarter grid of random sales values (dynamic demo). */
function makeSalesGrid(): NgeHeatmapDataPoint[] {
  return REGIONS.flatMap(row =>
    QUARTERS.map(col => ({ col, row, value: Math.round(20 + Math.random() * 70) }))
  );
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'heatmap-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'heatmap-chart-usage-stories',
  standalone: true,
  styleUrl: './heatmap-chart-usage-stories.component.scss',
  templateUrl: './heatmap-chart-usage-stories.component.html',
})
export class HeatmapChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/heatmap-chart/usage';

  /**
   * Quarterly sales ($K) by region shared across the static examples — one cell per
   * `row` (region, y band axis) × `col` (quarter, x band axis) pair. South's Q4 is
   * `null` to show empty-cell handling (drawn in the theme `emptyColor`, excluded
   * from the color domain).
   */
  sampleData: NgeHeatmapDataPoint[] = [
    { col: 'Q1', row: 'North', value: 42 },
    { col: 'Q2', row: 'North', value: 58 },
    { col: 'Q3', row: 'North', value: 71 },
    { col: 'Q4', row: 'North', value: 63 },
    { col: 'Q1', row: 'South', value: 35 },
    { col: 'Q2', row: 'South', value: 47 },
    { col: 'Q3', row: 'South', value: 52 },
    { col: 'Q4', row: 'South', value: null },
    { col: 'Q1', row: 'East', value: 61 },
    { col: 'Q2', row: 'East', value: 66 },
    { col: 'Q3', row: 'East', value: 78 },
    { col: 'Q4', row: 'East', value: 84 },
    { col: 'Q1', row: 'West', value: 28 },
    { col: 'Q2', row: 'West', value: 33 },
    { col: 'Q3', row: 'West', value: 40 },
    { col: 'Q4', row: 'West', value: 45 },
    { col: 'Q1', row: 'Central', value: 50 },
    { col: 'Q2', row: 'Central', value: 55 },
    { col: 'Q3', row: 'Central', value: 49 },
    { col: 'Q4', row: 'Central', value: 58 },
  ];

  // ============================================
  // EXAMPLE 1: Basic Cell Heatmap
  // ============================================
  // The default `mark: 'cell'` draws a color-encoded <rect> grid. Color comes from
  // the theme token ramp; the `null` South·Q4 cell renders empty and is excluded
  // from the color domain.
  basicConfig = createHeatmapChartConfig({
    data: this.sampleData,
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  // ============================================
  // EXAMPLE 2: Bubble Heatmap
  // ============================================
  // `mark: 'bubble'` swaps the cell rectangles for circles whose radius is
  // sqrt-scaled to the value (double-encoded with the ramp color).
  bubbleConfig = createHeatmapChartConfig({
    data: this.sampleData,
    mark: 'bubble',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  // ============================================
  // EXAMPLE 3: Named Color Scheme
  // ============================================
  // A `scheme` (d3-scale-chromatic) overrides the theme token ramp — here the
  // perceptually-uniform `viridis`.
  schemeConfig = createHeatmapChartConfig({
    data: this.sampleData,
    scheme: 'viridis',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  // ============================================
  // EXAMPLE 4: Show Values
  // ============================================
  // `showValues: true` prints each cell's value; empty (`null`) cells stay blank.
  valuesConfig = createHeatmapChartConfig({
    data: this.sampleData,
    scheme: 'blues',
    showValues: true,
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  // ============================================
  // EXAMPLE 5: Custom Color Domain
  // ============================================
  // `domain: [min, max]` pins the color scale instead of the data extent — useful
  // for comparing heatmaps on a shared scale (here 0–100).
  domainConfig = createHeatmapChartConfig({
    data: this.sampleData,
    domain: [0, 100],
    scheme: 'ylOrRd',
    showValues: true,
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  // ============================================
  // EXAMPLE 6: Click to Inspect a Cell
  // ============================================
  // The click payload carries the whole `NgeHeatmapDataPoint` — its `row`, `col`
  // and `value` — so you can drill into the clicked cell.
  readonly lastClicked = signal<string>('None');

  clickConfig = createHeatmapChartConfig({
    data: this.sampleData,
    onClick: (event: NgeChartLayerClickEvent<NgeHeatmapDataPoint>) => {
      const d = event.data;
      this.lastClicked.set(`${d.row}·${d.col}: ${d.value ?? '—'}`);
    },
    showValues: true,
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  // ============================================
  // EXAMPLE 7: Dynamic Data With Signals
  // ============================================
  // Recommended pattern: hold the grid in a `signal()` and rebuild the config in a
  // `computed()`. Re-rolling the grid recolors every cell against the new extent.
  readonly liveData = signal<NgeHeatmapDataPoint[]>(makeSalesGrid());

  readonly dynamicConfig = computed(() =>
    createHeatmapChartConfig({
      data: this.liveData(),
      scheme: 'viridis',
      showValues: true,
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Region',
    })
  );

  // ============================================
  // EXAMPLE 8: Tooltip on Hover
  // ============================================
  // `showTooltip: true` shows a follow-mouse tooltip carrying the cell's row·col and
  // value on hover (the preset's default formatter — override via `tooltip.formatContent`).
  tooltipConfig = createHeatmapChartConfig({
    data: this.sampleData,
    showTooltip: true,
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  randomizeData(): void {
    this.liveData.set(makeSalesGrid());
  }
}
