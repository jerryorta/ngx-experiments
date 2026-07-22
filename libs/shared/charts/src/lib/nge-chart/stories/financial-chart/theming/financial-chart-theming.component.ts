import { ChangeDetectionStrategy, Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeFinancialDataPoint } from '../../../../core/config';

import { createFinancialChartConfig } from '../../../../presets/financial-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * The same rise → pullback → recovery OHLC series across every theming demo, so each
 * override reads against an identical candlestick / kagi / renko shape.
 */
const SAMPLE_OHLC: readonly NgeFinancialDataPoint[] = [
  { close: 103, date: '2024-01-02', high: 104, low: 99, open: 100 },
  { close: 107, date: '2024-01-03', high: 108, low: 102, open: 103 },
  { close: 105, date: '2024-01-04', high: 109, low: 104, open: 107 },
  { close: 111, date: '2024-01-05', high: 112, low: 104, open: 105 },
  { close: 115, date: '2024-01-08', high: 116, low: 110, open: 111 },
  { close: 113, date: '2024-01-09', high: 118, low: 112, open: 115 },
  { close: 120, date: '2024-01-10', high: 121, low: 112, open: 113 },
  { close: 125, date: '2024-01-11', high: 126, low: 119, open: 120 },
  { close: 129, date: '2024-01-12', high: 130, low: 123, open: 125 },
  { close: 134, date: '2024-01-15', high: 135, low: 128, open: 129 },
  { close: 139, date: '2024-01-16', high: 140, low: 133, open: 134 },
  { close: 144, date: '2024-01-17', high: 145, low: 138, open: 139 },
  { close: 148, date: '2024-01-18', high: 150, low: 143, open: 144 },
  { close: 143, date: '2024-01-19', high: 149, low: 142, open: 148 },
  { close: 137, date: '2024-01-22', high: 144, low: 136, open: 143 },
  { close: 132, date: '2024-01-23', high: 139, low: 131, open: 137 },
  { close: 127, date: '2024-01-24', high: 134, low: 126, open: 132 },
  { close: 124, date: '2024-01-25', high: 130, low: 123, open: 127 },
  { close: 122, date: '2024-01-26', high: 128, low: 121, open: 124 },
  { close: 128, date: '2024-01-29', high: 129, low: 121, open: 122 },
  { close: 134, date: '2024-01-30', high: 135, low: 127, open: 128 },
  { close: 141, date: '2024-01-31', high: 142, low: 133, open: 134 },
  { close: 148, date: '2024-02-01', high: 149, low: 140, open: 141 },
  { close: 155, date: '2024-02-02', high: 156, low: 147, open: 148 },
];

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'financial-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'financial-chart-theming',
  standalone: true,
  styleUrl: './financial-chart-theming.component.scss',
  templateUrl: './financial-chart-theming.component.html',
})
export class FinancialChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/financial-chart/theming';

  sampleData: NgeFinancialDataPoint[] = [...SAMPLE_OHLC];

  // 1. Default — up candles fill green (#4caf50), down candles red (#f44336), and the
  // wick reads the muted `--chart-on-surface-variant`.
  defaultConfig = createFinancialChartConfig({
    data: this.sampleData,
    xAxisLabel: 'Session',
    yAxisLabel: 'Price',
  });

  // 2. Custom up / down colors — recolor both bodies (teal up, amber down) with a
  // matching outline and a slate wick.
  customUpDownConfig: NgeChartConfig = {
    ...createFinancialChartConfig({
      data: this.sampleData,
      xAxisLabel: 'Session',
      yAxisLabel: 'Price',
    }),
    theme: {
      financial: {
        down: { color: '#EF6C00', stroke: '#E65100', strokeWidth: 1.5 },
        up: { color: '#00897B', stroke: '#00695C', strokeWidth: 1.5 },
        wick: { color: '#546E7A', width: 1.25 },
      },
    },
  };

  // 3. Hollow candlestick — the classic look: up candles are hollow (fillOpacity 0,
  // outline only) while down candles stay solid, so direction reads from fill.
  hollowCandleConfig: NgeChartConfig = {
    ...createFinancialChartConfig({
      data: this.sampleData,
      xAxisLabel: 'Session',
      yAxisLabel: 'Price',
    }),
    theme: {
      financial: {
        down: { color: '#D32F2F', fillOpacity: 1, stroke: '#D32F2F', strokeWidth: 1.5 },
        up: { color: '#2E7D32', fillOpacity: 0, stroke: '#2E7D32', strokeWidth: 1.5 },
        wick: { color: '#78909C', width: 1 },
      },
    },
  };

  // 4. Recolored kagi — swap the yang/yin palette (indigo yang, orange yin) and widen
  // the contrast between the thick and thin segments.
  recoloredKagiConfig: NgeChartConfig = {
    ...createFinancialChartConfig({
      data: this.sampleData,
      variant: 'kagi',
      xAxisLabel: 'Sequence',
      yAxisLabel: 'Price',
    }),
    theme: {
      financial: {
        kagi: {
          yangColor: '#3949AB',
          yangWidth: 3,
          yinColor: '#FB8C00',
          yinWidth: 1,
        },
        wick: { color: '#B0BEC5', width: 1 },
      },
    },
  };

  // Side-by-side comparison — the SAME series rendered candlestick vs kagi vs renko,
  // each with a coordinated teal `theme.financial` slice.
  compareCandlestickConfig: NgeChartConfig = {
    ...createFinancialChartConfig({
      data: this.sampleData,
      xAxisLabel: 'Session',
      yAxisLabel: 'Price',
    }),
    theme: {
      financial: {
        down: { color: '#00695C', stroke: '#004D40' },
        up: { color: '#26A69A', stroke: '#00695C' },
        wick: { color: '#80CBC4', width: 1 },
      },
    },
  };

  compareKagiConfig: NgeChartConfig = {
    ...createFinancialChartConfig({
      data: this.sampleData,
      variant: 'kagi',
      xAxisLabel: 'Sequence',
      yAxisLabel: 'Price',
    }),
    theme: {
      financial: {
        kagi: {
          yangColor: '#00695C',
          yangWidth: 2.5,
          yinColor: '#80CBC4',
          yinWidth: 1.25,
        },
      },
    },
  };

  compareRenkoConfig: NgeChartConfig = {
    ...createFinancialChartConfig({
      data: this.sampleData,
      variant: 'renko',
      xAxisLabel: 'Sequence',
      yAxisLabel: 'Price',
    }),
    theme: {
      financial: {
        down: { color: '#B2DFDB', stroke: '#00695C' },
        up: { color: '#26A69A', stroke: '#00695C' },
      },
    },
  };
}
