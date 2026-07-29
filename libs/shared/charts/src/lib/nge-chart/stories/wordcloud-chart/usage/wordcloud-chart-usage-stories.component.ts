import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeWordCloudDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createWordCloudChartConfig } from '../../../../presets/wordcloud-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-wordcloud-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-wordcloud-chart-usage-stories',
  standalone: true,
  styleUrl: './wordcloud-chart-usage-stories.component.scss',
  templateUrl: './wordcloud-chart-usage-stories.component.html',
})
export class NgeWordCloudChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/wordcloud-chart/usage';

  // EXAMPLE 1: Basic Usage — one text mark per term, sized by frequency.
  readonly termData: NgeWordCloudDataPoint[] = [
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
  ];
  basicConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 52,
  });

  // EXAMPLE 2: Scale modes — the same frequencies, three different emphases.
  sqrtConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 44,
    scale: 'sqrt',
  });
  linearConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 44,
    scale: 'linear',
  });
  logConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 44,
    scale: 'log',
  });

  // EXAMPLE 3: Mixed orientation — alternating words turn a quarter turn.
  rotatedConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 44,
    rotations: [0, 90],
  });

  // EXAMPLE 4: Font size range — the span between the smallest and largest word.
  tightRangeConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 26,
    minFontSize: 14,
  });
  wideRangeConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 60,
    minFontSize: 8,
  });

  // EXAMPLE 5: Colour — a config palette, and a per-word override that beats it.
  paletteConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 48,
    seriesColors: ['#1B5E20', '#2E7D32', '#4CAF50', '#81C784'],
  });
  highlightConfig = createWordCloudChartConfig({
    data: this.termData.map(term =>
      term.label === 'angular' ? { ...term, color: '#D32F2F' } : term
    ),
    maxFontSize: 48,
  });

  // EXAMPLE 6: Click Handling
  readonly lastClicked = signal<string>('None');
  clickableConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 48,
    onClick: (event: NgeChartLayerClickEvent<NgeWordCloudDataPoint>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
  });

  // EXAMPLE 7: Tooltips
  tooltipConfig = createWordCloudChartConfig({
    data: this.termData,
    maxFontSize: 48,
    tooltip: {
      enabled: true,
      formatContent: (d: NgeWordCloudDataPoint) => ({
        label: d.label,
        value: `${d.value} mentions`,
      }),
    },
  });

  // EXAMPLE 8: Formatted labels — the drawn text differs from the join key.
  formattedConfig = createWordCloudChartConfig({
    data: this.termData,
    formatLabel: (d: NgeWordCloudDataPoint) => d.label.toUpperCase(),
    maxFontSize: 40,
  });

  // EXAMPLE 9: Dynamic Data with Signals
  readonly dynamicData = signal<NgeWordCloudDataPoint[]>([
    { label: 'north', value: 90 },
    { label: 'south', value: 72 },
    { label: 'east', value: 55 },
    { label: 'west', value: 41 },
    { label: 'central', value: 30 },
    { label: 'coastal', value: 22 },
  ]);
  readonly dynamicConfig = computed(() =>
    createWordCloudChartConfig({
      data: this.dynamicData(),
      maxFontSize: 52,
    })
  );

  randomizeData(): void {
    this.dynamicData.update(words =>
      words.map(word => ({ ...word, value: Math.round(10 + Math.random() * 90) }))
    );
  }
}
