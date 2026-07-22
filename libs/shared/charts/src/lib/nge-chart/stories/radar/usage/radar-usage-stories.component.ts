import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeRadarDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createRadarChartConfig } from '../../../../presets/radar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'radar-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'radar-usage-stories',
  standalone: true,
  styleUrl: './radar-usage-stories.component.scss',
  templateUrl: './radar-usage-stories.component.html',
})
export class RadarUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/radar/usage';

  // Single-series product profile — one value per attribute axis (the spokes).
  private readonly singleData: NgeRadarDataPoint[] = [
    { label: 'Speed', value: 80 },
    { label: 'Power', value: 65 },
    { label: 'Range', value: 45 },
    { label: 'Agility', value: 70 },
    { label: 'Defense', value: 55 },
    { label: 'Stealth', value: 40 },
  ];

  // Multi-series comparison — two products scored across the same attribute axes. Each
  // `seriesId` becomes one closed radar polygon over the shared spokes.
  private readonly multiData: NgeRadarDataPoint[] = [
    { label: 'Speed', seriesId: 'Falcon', value: 80 },
    { label: 'Power', seriesId: 'Falcon', value: 60 },
    { label: 'Range', seriesId: 'Falcon', value: 45 },
    { label: 'Agility', seriesId: 'Falcon', value: 70 },
    { label: 'Defense', seriesId: 'Falcon', value: 55 },
    { label: 'Speed', seriesId: 'Vortex', value: 55 },
    { label: 'Power', seriesId: 'Vortex', value: 82 },
    { label: 'Range', seriesId: 'Vortex', value: 70 },
    { label: 'Agility', seriesId: 'Vortex', value: 48 },
    { label: 'Defense', seriesId: 'Vortex', value: 78 },
  ];

  // ============================================
  // EXAMPLE 1: Basic Radar (single series)
  // ============================================
  basicConfig = createRadarChartConfig({
    data: this.singleData,
  });

  // ============================================
  // EXAMPLE 2: Multi-series Comparison
  // ============================================
  multiConfig = createRadarChartConfig({
    data: this.multiData,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 3: Polar Chart (render: 'line')
  // ============================================
  polarConfig = createRadarChartConfig({
    data: this.multiData,
    render: 'line',
  });

  // ============================================
  // EXAMPLE 4: Grid Levels
  // ============================================
  levelsConfig = createRadarChartConfig({
    data: this.singleData,
    levels: 3,
  });

  // ============================================
  // EXAMPLE 5: Inner Hub (innerRadius ratio)
  // ============================================
  hubConfig = createRadarChartConfig({
    data: this.singleData,
    innerRadius: 0.15,
  });

  // ============================================
  // EXAMPLE 6: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createRadarChartConfig({
    data: this.multiData,
    onClick: (event: NgeChartLayerClickEvent<NgeRadarDataPoint>) => {
      this.lastClicked.set(
        `${event.data.seriesId ?? 'series'} · ${event.data.label}: ${event.data.value}`
      );
    },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 7: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeRadarDataPoint[]>(this.singleData);

  readonly dynamicConfig = computed<NgeChartConfig>(() =>
    createRadarChartConfig({
      data: this.dynamicData(),
      tooltip: { enabled: true },
    })
  );

  randomizeData(): void {
    this.dynamicData.set(
      this.singleData.map(point => ({ ...point, value: Math.round(20 + Math.random() * 70) }))
    );
  }
}
