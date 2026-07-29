import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeWordCloudDataPoint } from '../../../../core/config';

import { createWordCloudChartConfig } from '../../../../presets/wordcloud-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-wordcloud-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-wordcloud-chart-theming',
  standalone: true,
  styleUrl: './wordcloud-chart-theming.component.scss',
  templateUrl: './wordcloud-chart-theming.component.html',
})
export class NgeWordCloudChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/wordcloud-chart/theming';

  sampleData: NgeWordCloudDataPoint[] = [
    { label: 'angular', value: 120 },
    { label: 'signals', value: 96 },
    { label: 'typescript', value: 78 },
    { label: 'rxjs', value: 64 },
    { label: 'ngrx', value: 52 },
    { label: 'nx', value: 44 },
    { label: 'jest', value: 36 },
    { label: 'd3', value: 30 },
    { label: 'storybook', value: 24 },
    { label: 'scss', value: 18 },
  ];

  // Default theme (no overrides) — renders on the --nge-chart-* token defaults.
  defaultConfig = createWordCloudChartConfig({
    data: this.sampleData,
    maxFontSize: 48,
  });

  // Green theme
  greenConfig: NgeChartConfig = {
    ...createWordCloudChartConfig({
      data: this.sampleData,
      maxFontSize: 48,
    }),
    theme: {
      wordcloud: {
        word: { colors: ['#1B5E20', '#2E7D32', '#4CAF50', '#81C784'] },
      },
    },
  };

  // Blue theme
  blueConfig: NgeChartConfig = {
    ...createWordCloudChartConfig({
      data: this.sampleData,
      maxFontSize: 48,
    }),
    theme: {
      wordcloud: {
        word: { colors: ['#0D47A1', '#1565C0', '#1E88E5', '#64B5F6'] },
      },
    },
  };

  // Red theme. The last three configs sit in a 3-column comparison row, so they run a smaller
  // maximum — at 48px the leading word alone fills a narrow panel and most of the tail is
  // dropped, which leaves too little cloud to compare.
  redConfig: NgeChartConfig = {
    ...createWordCloudChartConfig({
      data: this.sampleData,
      maxFontSize: 30,
    }),
    theme: {
      wordcloud: {
        word: { colors: ['#B71C1C', '#C62828', '#E53935', '#EF9A9A'] },
      },
    },
  };

  // Monochrome — one colour at graded opacity reads the frequency purely through size.
  monochromeConfig: NgeChartConfig = {
    ...createWordCloudChartConfig({
      data: this.sampleData,
      maxFontSize: 48,
    }),
    theme: {
      wordcloud: {
        word: { color: '#37474F', colors: ['#37474F'], opacity: 0.85 },
      },
    },
  };

  // Typography — family and weight are the layer's two type knobs.
  serifConfig: NgeChartConfig = {
    ...createWordCloudChartConfig({
      data: this.sampleData,
      maxFontSize: 48,
    }),
    theme: {
      wordcloud: {
        word: { fontFamily: 'Georgia, "Times New Roman", serif', fontWeight: 400 },
      },
    },
  };

  monospaceConfig: NgeChartConfig = {
    ...createWordCloudChartConfig({
      data: this.sampleData,
      maxFontSize: 40,
    }),
    theme: {
      wordcloud: {
        word: { fontFamily: '"Fira Code", "Consolas", monospace', fontWeight: 700 },
      },
    },
  };

  // Light weight — thinner strokes suit a cloud that leans on size rather than colour.
  lightWeightConfig: NgeChartConfig = {
    ...createWordCloudChartConfig({
      data: this.sampleData,
      maxFontSize: 30,
    }),
    theme: {
      wordcloud: {
        word: { fontWeight: 300 },
      },
    },
  };

  // Faded — opacity lets a cloud sit behind other content as a backdrop.
  fadedConfig: NgeChartConfig = {
    ...createWordCloudChartConfig({
      data: this.sampleData,
      maxFontSize: 30,
    }),
    theme: {
      wordcloud: {
        word: { opacity: 0.45 },
      },
    },
  };
}
