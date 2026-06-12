import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import type { NgeBulletDataPoint, NgeChartConfig } from '../../../../core/config';

import { createBulletChartConfig } from '../../../../presets/bullet-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'bullet-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-bullet-chart-theming',
  standalone: true,
  styleUrl: './bullet-chart-theming.component.scss',
  templateUrl: './bullet-chart-theming.component.html',
})
export class BulletChartThemingComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bullet-chart/theming';

  // Sample data
  sampleData: NgeBulletDataPoint = {
    max: 100,
    min: 0,
    progress: 72,
    units: '%',
  };

  successData: NgeBulletDataPoint = {
    color: '#4CAF50',
    max: 100,
    min: 0,
    progress: 85,
    units: '%',
  };

  warnData: NgeBulletDataPoint = {
    color: '#FF9800',
    max: 100,
    min: 0,
    progress: 55,
    units: '%',
  };

  errorData: NgeBulletDataPoint = {
    color: '#F44336',
    max: 100,
    min: 0,
    progress: 25,
    units: '%',
  };

  // Default theme config
  defaultConfig = createBulletChartConfig({
    data: this.sampleData,
    tooltip: { enabled: true },
  });

  // Custom blue theme
  blueConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#E3F2FD' },
        limitIndicator: { color: '#1976D2' },
        progressBar: { color: '#2196F3' },
        progressIndicator: { color: '#1565C0' },
      },
    },
  };

  // Custom green theme
  greenConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#E8F5E9' },
        limitIndicator: { color: '#388E3C' },
        progressBar: { color: '#4CAF50' },
        progressIndicator: { color: '#2E7D32' },
      },
    },
  };

  // Custom purple theme
  purpleConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#F3E5F5' },
        limitIndicator: { color: '#7B1FA2' },
        progressBar: { color: '#9C27B0' },
        progressIndicator: { color: '#6A1B9A' },
      },
    },
  };

  // Custom orange theme
  orangeConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#FFF3E0' },
        limitIndicator: { color: '#E65100' },
        progressBar: { color: '#FF9800' },
        progressIndicator: { color: '#EF6C00' },
      },
    },
  };

  // Dark theme
  darkConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#424242' },
        limitIndicator: { color: '#9E9E9E' },
        progressBar: { color: '#00BCD4' },
        progressIndicator: { color: '#00ACC1' },
      },
    },
  };

  // Color-themed configs (color comes from data)
  customSuccessConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: { ...this.successData, color: '#00C853' },
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#E8F5E9' },
        limitIndicator: { color: '#2E7D32' },
      },
    },
  };

  customWarnConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: { ...this.warnData, color: '#FFB300' },
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#FFF8E1' },
        limitIndicator: { color: '#FF6F00' },
      },
    },
  };

  customErrorConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: { ...this.errorData, color: '#FF1744' },
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#FFEBEE' },
        limitIndicator: { color: '#B71C1C' },
      },
    },
  };

  // Custom dimensions theme
  thickBarConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      barHeight: 20,
      data: this.sampleData,
      limitIndicatorHeight: 50,
      limitIndicatorWidth: 4,
      progressIndicatorHeight: 50,
      progressIndicatorWidth: 10,
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: '#ECEFF1' },
        limitIndicator: { color: '#455A64' },
        progressBar: { color: '#607D8B' },
        progressIndicator: { color: '#37474F' },
      },
    },
  };

  // Gradient-like appearance with opacity
  gradientStyleConfig: NgeChartConfig = {
    ...createBulletChartConfig({
      data: { max: 100, min: 0, progress: 80, units: '%' },
      tooltip: { enabled: true },
    }),
    theme: {
      bullet: {
        backgroundBar: { color: 'rgba(103, 58, 183, 0.15)' },
        limitIndicator: { color: '#512DA8' },
        progressBar: { color: 'rgba(103, 58, 183, 0.7)' },
        progressIndicator: { color: '#673AB7' },
      },
    },
  };
}
