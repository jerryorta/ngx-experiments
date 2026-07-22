import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeDistributionDataPoint } from '../../../../core/config';

import { createDistributionChartConfig } from '../../../../presets/distribution-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Deterministic ~normal sample (seeded mulberry32, averaged in threes) so every
 * theming demo summarises the SAME four distributions.
 */
function makeValues(count: number, center: number, spread: number, seed: number): number[] {
  let state = seed >>> 0;
  const next = (): number => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return Array.from({ length: count }, () => {
    const bell = (next() + next() + next()) / 3;
    return Math.round(center + (bell - 0.5) * spread);
  });
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'distribution-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'distribution-chart-theming',
  standalone: true,
  styleUrl: './distribution-chart-theming.component.scss',
  templateUrl: './distribution-chart-theming.component.html',
})
export class DistributionChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/distribution-chart/theming';

  sampleData: NgeDistributionDataPoint[] = [
    { category: 'Class A', values: [...makeValues(44, 76, 40, 11), 31, 99] },
    { category: 'Class B', values: makeValues(46, 83, 28, 23) },
    { category: 'Class C', values: [...makeValues(43, 70, 48, 37), 18, 100] },
    { category: 'Class D', values: makeValues(45, 88, 24, 51) },
  ];

  // 1. Default — box fills the translucent `--chart-primary`, the median reads
  // `--chart-secondary`, the mean glyph `--chart-tertiary`, outliers `--chart-error`,
  // and whiskers the muted `--chart-on-surface-variant`.
  defaultConfig = createDistributionChartConfig({
    data: this.sampleData,
    showMean: true,
    xAxisLabel: 'Class',
    yAxisLabel: 'Score',
  });

  // 2. Box / median / whisker recolor — override the three box-mode slots with an
  // explicit green box, a dark-green median line, and a slate whisker.
  boxRecolorConfig: NgeChartConfig = {
    ...createDistributionChartConfig({
      data: this.sampleData,
      showMean: true,
      xAxisLabel: 'Class',
      yAxisLabel: 'Score',
    }),
    theme: {
      distribution: {
        box: { color: '#4CAF50', opacity: 0.5, stroke: '#2E7D32', strokeWidth: 1.5 },
        mean: { color: '#1B5E20', radius: 3.5 },
        median: { color: '#1B5E20', width: 2.5 },
        outlier: { color: '#C62828' },
        whisker: { color: '#546E7A', width: 1.5 },
      },
    },
  };

  // 3. Violin color scheme — recolor the KDE body + its outline and keep the inner
  // box legible against the fill.
  violinConfig: NgeChartConfig = {
    ...createDistributionChartConfig({
      data: this.sampleData,
      render: 'violin',
      showInnerBox: true,
      xAxisLabel: 'Class',
      yAxisLabel: 'Score',
    }),
    theme: {
      distribution: {
        box: { color: '#4A148C', opacity: 0.75, stroke: '#4A148C' },
        median: { color: '#F3E5F5', width: 2 },
        violin: { color: '#7E57C2', opacity: 0.45, stroke: '#4A148C', strokeWidth: 1.5 },
      },
    },
  };

  // 4. Points color scheme — a per-category `point.colors` palette so each class's
  // beeswarm reads its own hue (index maps to colors[index % length]).
  pointsConfig: NgeChartConfig = {
    ...createDistributionChartConfig({
      data: this.sampleData,
      jitter: 'beeswarm',
      render: 'points',
      xAxisLabel: 'Class',
      yAxisLabel: 'Score',
    }),
    theme: {
      distribution: {
        point: {
          colors: ['#1E88E5', '#43A047', '#F4511E', '#8E24AA'],
          opacity: 0.75,
          radius: 3.5,
          strokeColor: '#FFFFFF',
          strokeWidth: 0.75,
        },
      },
    },
  };

  // 5. Horizontal + themed — a warm amber box laid out horizontally with a bold
  // median and matching mean glyph.
  horizontalThemedConfig: NgeChartConfig = {
    ...createDistributionChartConfig({
      data: this.sampleData,
      orientation: 'horizontal',
      showMean: true,
      xAxisLabel: 'Score',
      yAxisLabel: 'Class',
    }),
    theme: {
      distribution: {
        box: { color: '#FB8C00', opacity: 0.5, stroke: '#E65100', strokeWidth: 1.5 },
        mean: { color: '#BF360C' },
        median: { color: '#E65100', width: 2.5 },
        whisker: { color: '#8D6E63', width: 1.5 },
      },
    },
  };

  // Side-by-side comparison — the SAME distributions rendered box vs violin vs
  // points, each with a coordinated teal theme slice.
  compareBoxConfig: NgeChartConfig = {
    ...createDistributionChartConfig({
      data: this.sampleData,
      xAxisLabel: 'Class',
      yAxisLabel: 'Score',
    }),
    theme: {
      distribution: {
        box: { color: '#26A69A', opacity: 0.55, stroke: '#00695C' },
        median: { color: '#004D40', width: 2 },
        whisker: { color: '#00695C', width: 1.5 },
      },
    },
  };

  compareViolinConfig: NgeChartConfig = {
    ...createDistributionChartConfig({
      data: this.sampleData,
      render: 'violin',
      showInnerBox: true,
      xAxisLabel: 'Class',
      yAxisLabel: 'Score',
    }),
    theme: {
      distribution: {
        box: { color: '#004D40', opacity: 0.8 },
        median: { color: '#E0F2F1', width: 2 },
        violin: { color: '#26A69A', opacity: 0.45, stroke: '#00695C', strokeWidth: 1.5 },
      },
    },
  };

  comparePointsConfig: NgeChartConfig = {
    ...createDistributionChartConfig({
      data: this.sampleData,
      jitter: 'beeswarm',
      render: 'points',
      xAxisLabel: 'Class',
      yAxisLabel: 'Score',
    }),
    theme: {
      distribution: {
        point: {
          color: '#26A69A',
          opacity: 0.7,
          radius: 3,
          strokeColor: '#FFFFFF',
          strokeWidth: 0.75,
        },
      },
    },
  };
}
