import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeHistogramDataPoint } from '../../../../core/config';

import { createHistogramChartConfig } from '../../../../presets/histogram-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/**
 * Deterministic ~normal sample (seeded mulberry32, averaged in threes) so every
 * theming demo bins the SAME bell-shaped distribution.
 */
function makeSamples(
  count: number,
  center: number,
  spread: number,
  seed: number
): NgeHistogramDataPoint[] {
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
    return { value: Math.round(center + (bell - 0.5) * spread) };
  });
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'histogram-chart-theming',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'histogram-chart-theming',
  standalone: true,
  styleUrl: './histogram-chart-theming.component.scss',
  templateUrl: './histogram-chart-theming.component.html',
})
export class HistogramChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/histogram-chart/theming';

  sampleData: NgeHistogramDataPoint[] = makeSamples(140, 50, 80, 42);

  // 1. Default — bars fill `--chart-primary`, the rootogram curve reads
  // `--chart-secondary`, and count labels read `--chart-on-surface`.
  defaultConfig = createHistogramChartConfig({
    data: this.sampleData,
    showLabels: true,
    xAxisLabel: 'Value',
  });

  // 2. Bar fill — override `theme.histogram.bar.color` (the `--chart-primary`
  // slot) with a custom green.
  barFillConfig: NgeChartConfig = {
    ...createHistogramChartConfig({ data: this.sampleData, xAxisLabel: 'Value' }),
    theme: { histogram: { bar: { color: '#4CAF50' } } },
  };

  // 3. Bar shape — a surface-toned `stroke` separates adjacent bins and a corner
  // `radius` rounds each bar (radius is read from the theme, not a preset option).
  barShapeConfig: NgeChartConfig = {
    ...createHistogramChartConfig({ binCount: 12, data: this.sampleData, xAxisLabel: 'Value' }),
    theme: {
      histogram: { bar: { color: '#7E57C2', radius: 4, stroke: '#EDE7F6', strokeWidth: 2 } },
    },
  };

  // 4. Rootogram curve + nodes — override `theme.histogram.curve.color` and
  // `theme.histogram.node.color` (both the `--chart-secondary` slot) so the
  // fitted normal curve reads a bold red dash and its per-bin nodes match.
  curveConfig: NgeChartConfig = {
    ...createHistogramChartConfig({
      data: this.sampleData,
      mode: 'rootogram',
      xAxisLabel: 'Value',
    }),
    theme: {
      histogram: {
        bar: { color: '#90CAF9' },
        curve: { color: '#E53935', dash: '4 2', width: 3 },
        node: { color: '#E53935', radius: 4.5, stroke: '#FFEBEE', strokeWidth: 1.5 },
      },
    },
  };

  // 5. Label color — override `theme.histogram.label.color` (the
  // `--chart-on-surface` slot) plus size / weight.
  labelConfig: NgeChartConfig = {
    ...createHistogramChartConfig({
      binCount: 8,
      data: this.sampleData,
      showLabels: true,
      xAxisLabel: 'Value',
    }),
    theme: {
      histogram: {
        bar: { color: '#FF7043' },
        label: { color: '#BF360C', fontSize: 13, fontWeight: 700 },
      },
    },
  };

  // 6. Full slice — bar + curve + node + zero line + label all styled together
  // (rootogram mode so every element is visible in one chart).
  fullSliceConfig: NgeChartConfig = {
    ...createHistogramChartConfig({
      data: this.sampleData,
      mode: 'rootogram',
      showLabels: true,
      showZeroLine: true,
      xAxisLabel: 'Value',
    }),
    theme: {
      histogram: {
        bar: { color: '#26A69A', opacity: 0.85, radius: 2, stroke: '#E0F2F1', strokeWidth: 1 },
        curve: { color: '#00695C', dash: '', width: 3 },
        label: { color: '#004D40', fontSize: 12, fontWeight: 600 },
        node: { color: '#00695C', radius: 4, stroke: '#E0F2F1', strokeWidth: 1.5 },
        zeroLine: { color: '#4DB6AC', dash: '5 3', width: 1.5 },
      },
    },
  };

  // Palette variants for the side-by-side comparison row.
  greenConfig: NgeChartConfig = {
    ...createHistogramChartConfig({ data: this.sampleData, xAxisLabel: 'Value' }),
    theme: { histogram: { bar: { color: '#43A047' } } },
  };

  amberConfig: NgeChartConfig = {
    ...createHistogramChartConfig({ data: this.sampleData, xAxisLabel: 'Value' }),
    theme: { histogram: { bar: { color: '#FB8C00' } } },
  };

  indigoConfig: NgeChartConfig = {
    ...createHistogramChartConfig({ data: this.sampleData, xAxisLabel: 'Value' }),
    theme: { histogram: { bar: { color: '#3949AB' } } },
  };
}
