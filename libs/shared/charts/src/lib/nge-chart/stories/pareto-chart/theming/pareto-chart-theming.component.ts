import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint } from '../../../../core/config';

import { createParetoChartConfig } from '../../../../presets/pareto-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'pareto-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'pareto-chart-theming',
  standalone: true,
  styleUrl: './pareto-chart-theming.component.scss',
  templateUrl: './pareto-chart-theming.component.html',
})
export class ParetoChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pareto-chart/theming';

  sampleData: NgeBarDataPoint[] = [
    { label: 'Scratches', value: 42 },
    { label: 'Dents', value: 30 },
    { label: 'Misalignment', value: 18 },
    { label: 'Discoloration', value: 12 },
    { label: 'Cracks', value: 8 },
    { label: 'Other', value: 5 },
  ];

  // Default — theme palette (primary bars, secondary line).
  defaultConfig = createParetoChartConfig({ data: this.sampleData });

  // Blue bars / red line.
  blueRedConfig = createParetoChartConfig({
    barColor: '#1E88E5',
    data: this.sampleData,
    lineColor: '#E53935',
  });

  // Green bars / amber line.
  greenConfig = createParetoChartConfig({
    barColor: '#43A047',
    data: this.sampleData,
    lineColor: '#FB8C00',
  });

  // Monochrome — grey bars / dark line.
  monochromeConfig = createParetoChartConfig({
    barColor: '#90A4AE',
    data: this.sampleData,
    lineColor: '#263238',
  });

  // High contrast — near-black bars / magenta line.
  highContrastConfig = createParetoChartConfig({
    barColor: '#212121',
    data: this.sampleData,
    lineColor: '#D500F9',
  });

  // Comparison row — three palettes on the same data.
  tealConfig = createParetoChartConfig({
    barColor: '#00897B',
    data: this.sampleData,
    lineColor: '#FF7043',
  });

  indigoConfig = createParetoChartConfig({
    barColor: '#3949AB',
    data: this.sampleData,
    lineColor: '#FDD835',
  });

  crimsonConfig = createParetoChartConfig({
    barColor: '#C2185B',
    data: this.sampleData,
    lineColor: '#00ACC1',
  });
}
