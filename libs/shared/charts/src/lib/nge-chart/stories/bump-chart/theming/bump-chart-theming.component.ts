import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBumpDataPoint, NgeChartConfig } from '../../../../core/config';

import { createBumpChartConfig } from '../../../../presets/bump-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Ordered x axis shared by the theming examples. */
const YEARS = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];

/**
 * The same streaming-platform rank-over-time dataset used across every bump story
 * (five platforms whose ranks cross year over year).
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
    class: 'bump-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'bump-chart-theming',
  standalone: true,
  styleUrl: './bump-chart-theming.component.scss',
  templateUrl: './bump-chart-theming.component.html',
})
export class BumpChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bump-chart/theming';

  sampleData: NgeBumpDataPoint[] = buildBumpData(SUBSCRIBERS);

  // Default theme (no overrides) — rank lines cycle the --chart-* token palette.
  defaultConfig = createBumpChartConfig({
    data: this.sampleData,
    xAxisLabel: 'Year',
  });

  // Custom series palette via `seriesColors` (colors series by first-seen index).
  customPaletteConfig = createBumpChartConfig({
    data: this.sampleData,
    seriesColors: ['#2196F3', '#FF9800', '#4CAF50', '#E91E63', '#9C27B0'],
    xAxisLabel: 'Year',
  });

  // Thicker, dashed rank lines via config.theme.bump.line.
  thickDashedLinesConfig: NgeChartConfig = {
    ...createBumpChartConfig({
      data: this.sampleData,
      seriesColors: ['#3949AB', '#00897B', '#8E24AA', '#F4511E', '#546E7A'],
      xAxisLabel: 'Year',
    }),
    theme: {
      bump: {
        line: { dash: '6 4', width: 4 },
      },
    },
  };

  // Larger per-rank circles via config.theme.bump.point.
  largePointsConfig: NgeChartConfig = {
    ...createBumpChartConfig({
      data: this.sampleData,
      seriesColors: ['#00838F', '#5E35B1', '#43A047', '#FB8C00', '#C2185B'],
      xAxisLabel: 'Year',
    }),
    theme: {
      bump: {
        point: { hoverRadius: 10, radius: 7, strokeWidth: 3 },
      },
    },
  };

  // Bold, tinted end labels via config.theme.bump.label.
  boldLabelsConfig: NgeChartConfig = {
    ...createBumpChartConfig({
      data: this.sampleData,
      seriesColors: ['#1E88E5', '#43A047', '#FDD835', '#E53935', '#8E24AA'],
      xAxisLabel: 'Year',
    }),
    theme: {
      bump: {
        label: { color: '#37474F', fontSize: 13, fontWeight: 700 },
      },
    },
  };

  // Custom axis colors + typography via config.theme.axis.
  customAxisConfig: NgeChartConfig = {
    ...createBumpChartConfig({
      data: this.sampleData,
      seriesColors: ['#607D8B', '#009688', '#795548', '#3F51B5', '#FF5722'],
      xAxisLabel: 'Year',
    }),
    theme: {
      axis: {
        labelColor: '#333333',
        labelFontSize: 14,
        lineColor: '#CCCCCC',
        tickColor: '#666666',
        tickFontSize: 12,
      },
    },
  };

  // Tooltip positioning: above / below / follow-mouse.
  tooltipAboveConfig = createBumpChartConfig({
    data: this.sampleData,
    tooltip: { enabled: true, position: 'above' },
  });

  tooltipBelowConfig = createBumpChartConfig({
    data: this.sampleData,
    tooltip: { enabled: true, position: 'below' },
  });

  tooltipFollowConfig = createBumpChartConfig({
    data: this.sampleData,
    tooltip: { enabled: true, position: 'follow-mouse' },
  });

  // Multi-chart comparison: same rankings, two different palettes.
  vibrantPaletteConfig = createBumpChartConfig({
    data: this.sampleData,
    seriesColors: ['#2196F3', '#FF9800', '#4CAF50', '#E91E63', '#9C27B0'],
    xAxisLabel: 'Year',
  });

  mutedPaletteConfig = createBumpChartConfig({
    data: this.sampleData,
    seriesColors: ['#78909C', '#8D6E63', '#9575CD', '#4DB6AC', '#A1887F'],
    xAxisLabel: 'Year',
  });
}
