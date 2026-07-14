import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBulletDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createBulletChartConfig } from '../../../../presets/bullet-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'bullet-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'bullet-chart-usage-stories',
  standalone: true,
  styleUrl: './bullet-chart-usage-stories.component.scss',
  templateUrl: './bullet-chart-usage-stories.component.html',
})
export class BulletChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bullet-chart/usage';

  // ============================================
  // EXAMPLE 1: Basic Usage
  // ============================================
  basicData: NgeBulletDataPoint = {
    max: 100,
    min: 0,
    progress: 75,
    units: '%',
  };

  basicConfig = createBulletChartConfig({
    data: this.basicData,
  });

  // ============================================
  // EXAMPLE 2: With Tooltip
  // ============================================
  tooltipData: NgeBulletDataPoint = {
    max: 100,
    min: 0,
    progress: 65,
    units: '%',
  };

  tooltipConfig = createBulletChartConfig({
    data: this.tooltipData,
    tooltip: {
      enabled: true,
      height: 50,
      width: 80,
    },
  });

  // ============================================
  // EXAMPLE 3: Grade Colors
  // ============================================
  /**
   * Get color based on grade percentage
   * - Failing (< 70%): red
   * - C grade (70% - 80%): yellow/orange
   * - Good grade (> 80%): green
   */
  private getGradeColor(percentage: number): string {
    if (percentage < 70) {
      return '#F44336'; // red - failing
    } else if (percentage <= 80) {
      return '#FF9800'; // yellow/orange - C grade
    } else {
      return '#4CAF50'; // green - good grade
    }
  }

  // A grade (> 80%) - Green
  gradeAData: NgeBulletDataPoint = {
    color: this.getGradeColor(92),
    max: 100,
    min: 0,
    progress: 92,
    units: '%',
  };

  // C grade (70% - 80%) - Yellow/Orange
  gradeCData: NgeBulletDataPoint = {
    color: this.getGradeColor(75),
    max: 100,
    min: 0,
    progress: 75,
    units: '%',
  };

  // Failing (< 70%) - Red
  gradeFailData: NgeBulletDataPoint = {
    color: this.getGradeColor(45),
    max: 100,
    min: 0,
    progress: 45,
    units: '%',
  };

  gradeAConfig = createBulletChartConfig({
    data: this.gradeAData,
    tooltip: { enabled: true },
  });

  gradeCConfig = createBulletChartConfig({
    data: this.gradeCData,
    tooltip: { enabled: true },
  });

  gradeFailConfig = createBulletChartConfig({
    data: this.gradeFailData,
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 4: Click Handling
  // ============================================
  clickableData: NgeBulletDataPoint = {
    max: 100,
    min: 0,
    progress: 70,
    units: '%',
  };

  readonly lastClickedProgress = signal<string>('None');

  clickableConfig = createBulletChartConfig({
    data: this.clickableData,
    onClick: (event: NgeChartLayerClickEvent<NgeBulletDataPoint>) => {
      this.lastClickedProgress.set(`${event.data.progress}${event.data.units}`);
    },
    tooltip: { enabled: true },
  });

  // ============================================
  // EXAMPLE 5: Dynamic Data with Signals
  // ============================================
  readonly dynamicProgress = signal(50);

  readonly dynamicData = computed<NgeBulletDataPoint>(() => ({
    max: 100,
    min: 0,
    progress: this.dynamicProgress(),
    units: '%',
  }));

  readonly dynamicConfig = computed(() =>
    createBulletChartConfig({
      data: this.dynamicData(),
      tooltip: { enabled: true },
    })
  );

  incrementProgress(): void {
    this.dynamicProgress.update(p => Math.min(100, p + 10));
  }

  decrementProgress(): void {
    this.dynamicProgress.update(p => Math.max(0, p - 10));
  }

  randomizeProgress(): void {
    this.dynamicProgress.set(Math.floor(Math.random() * 100));
  }

  // ============================================
  // EXAMPLE 6: Custom Ranges
  // ============================================
  customRangeData: NgeBulletDataPoint = {
    max: 500,
    min: 100,
    progress: 350,
    units: ' MHz',
  };

  customRangeConfig = createBulletChartConfig({
    data: this.customRangeData,
    tooltip: {
      enabled: true,
      formatContent: data => ({
        label: 'CPU Speed',
        value: `${data.progress}${data.units}`,
      }),
      width: 120,
    },
  });

  // ============================================
  // EXAMPLE 7: Custom Tooltip Format
  // ============================================
  storageData: NgeBulletDataPoint = {
    max: 1000,
    min: 0,
    progress: 742,
    units: ' GB',
  };

  storageConfig = createBulletChartConfig({
    data: this.storageData,
    tooltip: {
      enabled: true,
      formatContent: data => ({
        extra: { remaining: `${data.max - data.progress} GB free` },
        label: 'Storage Used',
        value: `${data.progress}${data.units}`,
      }),
      height: 70,
      width: 140,
    },
  });

  // ============================================
  // EXAMPLE 8: Custom Dimensions
  // ============================================
  customDimensionsData: NgeBulletDataPoint = {
    max: 100,
    min: 0,
    progress: 60,
    units: '%',
  };

  customDimensionsConfig = createBulletChartConfig({
    barHeight: 16,
    data: this.customDimensionsData,
    limitIndicatorHeight: 40,
    limitIndicatorWidth: 4,
    progressIndicatorHeight: 40,
    progressIndicatorWidth: 8,
    tooltip: { enabled: true },
  });
}
