import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint, NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';
import type { WinLossDataPoint } from '../../../../presets/winloss-sparkline-chart.preset';

import { createColumnSparklineChartConfig } from '../../../../presets/column-sparkline-chart.preset';
import { createSparklineChartConfig } from '../../../../presets/sparkline-chart.preset';
import { createWinLossSparklineChartConfig } from '../../../../presets/winloss-sparkline-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'sparkline-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'sparkline-chart-interaction-stories',
  standalone: true,
  styleUrl: './sparkline-chart-interaction-stories.component.scss',
  templateUrl: './sparkline-chart-interaction-stories.component.html',
})
export class SparklineChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/sparkline-chart/interaction';

  // Line sparkline controls
  readonly showLastValueDot = input<boolean>(true);
  readonly lastValueColor = input<string>('');
  readonly lineWidth = input<number>(1);
  readonly showPoints = input<boolean>(false);
  readonly showArea = input<boolean>(false);
  readonly curveType = input<'basis' | 'linear' | 'monotone' | 'step'>('monotone');

  // Column sparkline controls
  readonly showLabels = input<boolean>(false);
  readonly barPadding = input<number>(0.1);

  // Win-loss controls
  readonly winColor = input<string>('#1976D2');
  readonly lossColor = input<string>('#B3261E');
  readonly tieColor = input<string>('#9E9E9E');

  // Shared compact margins
  readonly marginTop = input<number>(4);
  readonly marginRight = input<number>(6);
  readonly marginBottom = input<number>(4);
  readonly marginLeft = input<number>(6);

  // Tooltip (shared across all three variants)
  readonly tooltipEnabled = input<boolean>(true);

  // Zero baseline — opt-in for the column sparkline, on by default for win-loss.
  readonly showZeroLine = input<boolean>(true);

  // Fixed seeds for each variant.
  private readonly lineData: NgeLineDataPoint[] = [
    { x: 0, y: 42 },
    { x: 1, y: 45 },
    { x: 2, y: 41 },
    { x: 3, y: 50 },
    { x: 4, y: 47 },
    { x: 5, y: 55 },
    { x: 6, y: 58 },
    { x: 7, y: 64 },
  ];

  private readonly columnData: NgeBarDataPoint[] = [
    { label: 'W1', value: 120 },
    { label: 'W2', value: 165 },
    { label: 'W3', value: 98 },
    { label: 'W4', value: 143 },
    { label: 'W5', value: 187 },
    { label: 'W6', value: 156 },
  ];

  private readonly winLossData: WinLossDataPoint[] = [
    { label: 'G1', value: 1 },
    { label: 'G2', value: -1 },
    { label: 'G3', value: 1 },
    { label: 'G4', value: 1 },
    { label: 'G5', value: 0 },
    { label: 'G6', value: -1 },
    { label: 'G7', value: 1 },
    { label: 'G8', value: 1 },
  ];

  // Shared compact margin, recomputed from the four margin controls.
  private readonly margin = computed(() => ({
    bottom: this.marginBottom(),
    left: this.marginLeft(),
    right: this.marginRight(),
    top: this.marginTop(),
  }));

  readonly lineConfig = computed<NgeChartConfig>(() =>
    createSparklineChartConfig({
      curveType: this.curveType(),
      data: this.lineData,
      lastValueColor: this.lastValueColor() || undefined,
      lineWidth: this.lineWidth(),
      margin: this.margin(),
      showArea: this.showArea(),
      showLastValueDot: this.showLastValueDot(),
      showPoints: this.showPoints(),
      tooltip: this.tooltipEnabled() ? { enabled: true } : undefined,
    })
  );

  readonly columnConfig = computed<NgeChartConfig>(() =>
    createColumnSparklineChartConfig({
      barPadding: this.barPadding(),
      data: this.columnData,
      margin: this.margin(),
      showLabels: this.showLabels(),
      showZeroLine: this.showZeroLine(),
      tooltip: this.tooltipEnabled() ? { enabled: true } : undefined,
    })
  );

  readonly winLossConfig = computed<NgeChartConfig>(() =>
    createWinLossSparklineChartConfig({
      data: this.winLossData,
      lossColor: this.lossColor(),
      margin: this.margin(),
      showZeroLine: this.showZeroLine(),
      tieColor: this.tieColor(),
      tooltip: this.tooltipEnabled()
        ? {
            enabled: true,
            formatContent: d => {
              const outcome = d.value > 0 ? 'Win' : d.value < 0 ? 'Loss' : 'Tie';
              return { label: d.label, value: `${outcome} (${d.value > 0 ? '+' : ''}${d.value})` };
            },
          }
        : undefined,
      winColor: this.winColor(),
    })
  );
}
