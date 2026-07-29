import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeWordCloudDataPoint,
  NgeWordCloudScale,
} from '../../../../core/config';

import { createWordCloudChartConfig } from '../../../../presets/wordcloud-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-wordcloud-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-wordcloud-chart-interaction-stories',
  standalone: true,
  styleUrl: './wordcloud-chart-interaction-stories.component.scss',
  templateUrl: './wordcloud-chart-interaction-stories.component.html',
})
export class NgeWordCloudChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/wordcloud-chart/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // === Layer config inputs ===
  readonly scale = input<NgeWordCloudScale>('sqrt');
  readonly minFontSize = input<number>(10);
  readonly maxFontSize = input<number>(48);
  readonly padding = input<number>(2);
  readonly rotationMode = input<'horizontal' | 'mixed' | 'quarter-turn'>('horizontal');
  readonly uppercase = input<boolean>(false);
  readonly showTooltip = input<boolean>(false);

  // === Theme inputs ===
  readonly wordFontFamily = input<string>('');
  readonly wordFontWeight = input<number>(600);
  readonly wordOpacity = input<number>(1);

  readonly sampleData = signal<NgeWordCloudDataPoint[]>([
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
    { label: 'zoneless', value: 14 },
    { label: 'vite', value: 10 },
  ]);

  randomizeData(): void {
    this.sampleData.update(words =>
      words.map(word => ({ ...word, value: Math.round(10 + Math.random() * 120) }))
    );
  }

  // `rotations` is an array, which no single Storybook control expresses well — the three
  // named modes cover the orientations a word cloud actually ships with.
  private readonly rotations = computed<number[]>(() => {
    switch (this.rotationMode()) {
      case 'mixed':
        return [0, 90];
      case 'quarter-turn':
        return [90];
      default:
        return [0];
    }
  });

  // Computed config rebuilds when ANY input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createWordCloudChartConfig({
      data: this.sampleData(),
      fontFamily: this.wordFontFamily() || undefined,
      formatLabel: this.uppercase() ? d => d.label.toUpperCase() : undefined,
      maxFontSize: this.maxFontSize(),
      minFontSize: this.minFontSize(),
      padding: this.padding(),
      rotations: this.rotations(),
      scale: this.scale(),
      tooltip: this.showTooltip() ? { enabled: true } : undefined,
    });

    return {
      ...baseConfig,
      base: {
        ...baseConfig.base,
        margin: {
          bottom: this.marginBottom(),
          left: this.marginLeft(),
          right: this.marginRight(),
          top: this.marginTop(),
        },
      },
      theme: {
        wordcloud: {
          word: {
            fontWeight: this.wordFontWeight(),
            opacity: this.wordOpacity(),
          },
        },
      },
    };
  });
}
