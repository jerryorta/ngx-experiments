import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeFunnelDataPoint } from '../../../../core/config';

import { createFunnelChartConfig } from '../../../../presets/funnel-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-funnel-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-funnel-chart-theming',
  standalone: true,
  styleUrl: './funnel-chart-theming.component.scss',
  templateUrl: './funnel-chart-theming.component.html',
})
export class NgeFunnelChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/funnel-chart/theming';

  // Four-band conversion-pipeline dataset — a funnel silhouette.
  sampleData: NgeFunnelDataPoint[] = [
    { label: 'Visitors', value: 10000 },
    { label: 'Signups', value: 4200 },
    { label: 'Trials', value: 1800 },
    { label: 'Customers', value: 650 },
  ];

  // Same stage count, widest-at-base — used for the funnel-vs-pyramid comparison.
  pyramidData: NgeFunnelDataPoint[] = [
    { label: 'Individual Contributors', value: 400 },
    { label: 'Managers', value: 80 },
    { label: 'Directors', value: 20 },
    { label: 'Executives', value: 5 },
  ];

  // Default theme — no overrides. Uses the built-in `--nge-chart-*` token palette,
  // which is theme-aware (adapts to the container's light / dark surface).
  defaultConfig = createFunnelChartConfig({
    data: this.sampleData,
  });

  // Green palette override via theme.funnel.band.colors.
  greenConfig: NgeChartConfig = {
    ...createFunnelChartConfig({ data: this.sampleData }),
    theme: {
      funnel: {
        band: {
          colors: ['#1B5E20', '#2E7D32', '#43A047', '#81C784'],
        },
      },
    },
  };

  // Blue palette override.
  blueConfig: NgeChartConfig = {
    ...createFunnelChartConfig({ data: this.sampleData }),
    theme: {
      funnel: {
        band: {
          colors: ['#0D47A1', '#1565C0', '#1E88E5', '#64B5F6'],
        },
      },
    },
  };

  // Red palette override.
  redConfig: NgeChartConfig = {
    ...createFunnelChartConfig({ data: this.sampleData }),
    theme: {
      funnel: {
        band: {
          colors: ['#B71C1C', '#C62828', '#E53935', '#EF9A9A'],
        },
      },
    },
  };

  // Purple palette override.
  purpleConfig: NgeChartConfig = {
    ...createFunnelChartConfig({ data: this.sampleData }),
    theme: {
      funnel: {
        band: {
          colors: ['#4A148C', '#6A1B9A', '#8E24AA', '#CE93D8'],
        },
      },
    },
  };

  // Translucent bands via band.opacity.
  translucentConfig: NgeChartConfig = {
    ...createFunnelChartConfig({ data: this.sampleData }),
    theme: {
      funnel: {
        band: {
          colors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA'],
          opacity: 0.6,
        },
      },
    },
  };

  // Thick surface-coloured stroke + a gap — separates the bands into discrete stages.
  strokeConfig: NgeChartConfig = {
    ...createFunnelChartConfig({ data: this.sampleData, gap: 4 }),
    theme: {
      funnel: {
        band: {
          colors: ['#1E88E5', '#43A047', '#FB8C00', '#8E24AA'],
          stroke: '#ffffff',
          strokeWidth: 3,
        },
      },
    },
  };

  // Label typography via label.color / fontSize / fontWeight (requires showLabels).
  typographyConfig: NgeChartConfig = {
    ...createFunnelChartConfig({ data: this.sampleData, showLabels: true }),
    theme: {
      funnel: {
        label: {
          color: '#ffffff',
          fontSize: 14,
          fontWeight: 700,
        },
      },
    },
  };

  // --- Side-by-side comparison (highlight section): Funnel vs Pyramid ---
  comparisonFunnel = createFunnelChartConfig({ data: this.sampleData });

  comparisonPyramid = createFunnelChartConfig({
    data: this.pyramidData,
    direction: 'up',
    neckRatio: 0,
  });
}
