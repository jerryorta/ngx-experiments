import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint, NgeLineDataPoint } from '../../../../core/config';
import type { WinLossDataPoint } from '../../../../presets/winloss-sparkline-chart.preset';

import { createColumnSparklineChartConfig } from '../../../../presets/column-sparkline-chart.preset';
import { createSparklineChartConfig } from '../../../../presets/sparkline-chart.preset';
import { createWinLossSparklineChartConfig } from '../../../../presets/winloss-sparkline-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sparkline-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'sparkline-chart-theming',
  standalone: true,
  styleUrl: './sparkline-chart-theming.component.scss',
  templateUrl: './sparkline-chart-theming.component.html',
})
export class SparklineChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sparkline-chart/theming';

  lineData: NgeLineDataPoint[] = [
    { x: 0, y: 42 },
    { x: 1, y: 45 },
    { x: 2, y: 41 },
    { x: 3, y: 50 },
    { x: 4, y: 47 },
    { x: 5, y: 55 },
    { x: 6, y: 58 },
    { x: 7, y: 64 },
  ];

  columnData: NgeBarDataPoint[] = [
    { label: 'W1', value: 120 },
    { label: 'W2', value: 165 },
    { label: 'W3', value: 98 },
    { label: 'W4', value: 143 },
    { label: 'W5', value: 187 },
    { label: 'W6', value: 156 },
  ];

  winLossData: WinLossDataPoint[] = [
    { label: 'G1', value: 1 },
    { label: 'G2', value: -1 },
    { label: 'G3', value: 1 },
    { label: 'G4', value: 1 },
    { label: 'G5', value: 0 },
    { label: 'G6', value: -1 },
    { label: 'G7', value: 1 },
    { label: 'G8', value: 1 },
  ];

  // Default configs — colours resolve entirely from the ambient --chart-* tokens,
  // so the same config re-themes just by overriding tokens on a wrapper (below).
  lineConfig = createSparklineChartConfig({ data: this.lineData });
  columnConfig = createColumnSparklineChartConfig({ data: this.columnData });
  winLossConfig = createWinLossSparklineChartConfig({ data: this.winLossData });

  // Per-config colour overrides (preset options) — independent of the ambient tokens.
  lastValueDotConfig = createSparklineChartConfig({
    data: this.lineData,
    lastValueColor: '#E53935',
  });

  customWinLossConfig = createWinLossSparklineChartConfig({
    data: this.winLossData,
    lossColor: '#C62828',
    tieColor: '#9E9E9E',
    winColor: '#2E7D32',
  });
}
