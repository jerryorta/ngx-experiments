import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHeatmapDataPoint } from '../../../../core/config';

import { createHeatmapChartConfig } from '../../../../presets/heatmap-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'heatmap-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'heatmap-chart-theming',
  standalone: true,
  styleUrl: './heatmap-chart-theming.component.scss',
  templateUrl: './heatmap-chart-theming.component.html',
})
export class HeatmapChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/heatmap-chart/theming';

  /**
   * Quarterly sales ($K) by region — one cell per row × column pair. South's Q4 is
   * `null` so the empty-cell (`cell.emptyColor`) theming reads across every demo.
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

  // 1. Default — no overrides. The cell ramp runs `--chart-surface` → `--chart-primary`,
  // empty cells read `--chart-surface-container-highest`, and separators the surface token.
  defaultConfig = createHeatmapChartConfig({
    data: this.sampleData,
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  // 2. Two-stop ramp — a straight `rampFrom` → `rampTo` gradient (light → dark blue).
  twoStopRampConfig: NgeChartConfig = {
    ...createHeatmapChartConfig({
      data: this.sampleData,
      showValues: true,
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Region',
    }),
    theme: {
      heatmap: {
        cell: { rampFrom: '#E3F2FD', rampTo: '#0D47A1' },
        label: { color: '#0D47A1', fontWeight: 600 },
      },
    },
  };

  // 3. Three-stop ramp — a `rampMid` inserts a midpoint (cream → orange → dark red),
  // interpolated in HCL for a smooth heat gradient.
  threeStopRampConfig: NgeChartConfig = {
    ...createHeatmapChartConfig({
      data: this.sampleData,
      showValues: true,
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Region',
    }),
    theme: {
      heatmap: {
        cell: { rampFrom: '#FFF3E0', rampMid: '#FB8C00', rampTo: '#B71C1C' },
        label: { color: '#3E2723', fontWeight: 600 },
      },
    },
  };

  // 4. Cell styling — rounded, white-gapped cells with a visible empty-cell fill and
  // an explicit two-stop teal ramp.
  cellStyleConfig: NgeChartConfig = {
    ...createHeatmapChartConfig({
      data: this.sampleData,
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Region',
    }),
    theme: {
      heatmap: {
        cell: {
          emptyColor: '#ECEFF1',
          radius: 6,
          rampFrom: '#E0F2F1',
          rampTo: '#00695C',
          stroke: '#FFFFFF',
          strokeWidth: 3,
        },
      },
    },
  };

  // 5. Bubble mode theming — size-encoded circles recolored via `theme.heatmap.bubble`
  // with a purple fill and a darker outline.
  bubbleThemedConfig: NgeChartConfig = {
    ...createHeatmapChartConfig({
      data: this.sampleData,
      mark: 'bubble',
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Region',
    }),
    theme: {
      heatmap: {
        bubble: { color: '#7E57C2', opacity: 0.85, stroke: '#4A148C', strokeWidth: 1.5 },
      },
    },
  };

  // Side-by-side comparison — the SAME grid rendered with three named d3 schemes.
  compareViridisConfig = createHeatmapChartConfig({
    data: this.sampleData,
    scheme: 'viridis',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  compareYlOrRdConfig = createHeatmapChartConfig({
    data: this.sampleData,
    scheme: 'ylOrRd',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });

  compareBluesConfig = createHeatmapChartConfig({
    data: this.sampleData,
    scheme: 'blues',
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Region',
  });
}
