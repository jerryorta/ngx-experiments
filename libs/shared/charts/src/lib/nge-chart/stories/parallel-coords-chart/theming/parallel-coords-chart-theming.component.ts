import { CommonModule } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeParallelCoordsBrushExtents,
  NgeParallelCoordsDataPoint,
} from '../../../../core/config';

import { createParallelCoordsChartConfig } from '../../../../presets/parallel-coords-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** One row of the source table, before it is reshaped into the layer's long format. */
interface CarRecord {
  cylinders: number;
  horsepower: number;
  mpg: number;
  name: string;
  origin: string;
  weight: number;
}

const CARS: CarRecord[] = [
  { cylinders: 8, horsepower: 130, mpg: 18, name: 'Chevelle', origin: 'USA', weight: 3504 },
  { cylinders: 8, horsepower: 165, mpg: 15, name: 'Skylark', origin: 'USA', weight: 3693 },
  { cylinders: 8, horsepower: 150, mpg: 16, name: 'Satellite', origin: 'USA', weight: 3436 },
  { cylinders: 6, horsepower: 105, mpg: 21, name: 'Torino', origin: 'USA', weight: 3012 },
  { cylinders: 4, horsepower: 95, mpg: 24, name: '510', origin: 'Japan', weight: 2372 },
  { cylinders: 4, horsepower: 88, mpg: 27, name: 'Corolla', origin: 'Japan', weight: 2130 },
  { cylinders: 4, horsepower: 72, mpg: 32, name: 'Civic', origin: 'Japan', weight: 1836 },
  { cylinders: 4, horsepower: 65, mpg: 35, name: 'Sunbird', origin: 'Japan', weight: 1975 },
  { cylinders: 4, horsepower: 90, mpg: 26, name: '124B', origin: 'Europe', weight: 2265 },
  { cylinders: 4, horsepower: 113, mpg: 25, name: '2002', origin: 'Europe', weight: 2234 },
  { cylinders: 5, horsepower: 103, mpg: 20, name: '5000', origin: 'Europe', weight: 2830 },
  { cylinders: 4, horsepower: 76, mpg: 30, name: '411', origin: 'Europe', weight: 2144 },
];

function toParallelData(cars: CarRecord[]): NgeParallelCoordsDataPoint[] {
  return cars.flatMap(car => [
    { label: 'MPG', seriesId: car.name, value: car.mpg },
    { label: 'Horsepower', seriesId: car.name, value: car.horsepower },
    { label: 'Weight', seriesId: car.name, value: car.weight },
    { label: 'Origin', seriesId: car.name, value: car.origin },
  ]);
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-parallel-coords-chart-theming',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-parallel-coords-chart-theming',
  standalone: true,
  styleUrl: './parallel-coords-chart-theming.component.scss',
  templateUrl: './parallel-coords-chart-theming.component.html',
})
export class NgeParallelCoordsChartThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/parallel-coords-chart/theming';

  readonly sampleData: NgeParallelCoordsDataPoint[] = toParallelData(CARS);

  // Default theme — no overrides.
  defaultConfig = createParallelCoordsChartConfig({
    colorBy: 'Origin',
    data: this.sampleData,
  });

  // Ocean palette.
  oceanConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({ colorBy: 'Origin', data: this.sampleData }),
    theme: {
      'parallel-coords': {
        line: { colors: ['#0277BD', '#26A69A', '#5C6BC0'] },
      },
    },
  };

  // Warm palette.
  warmConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({ colorBy: 'Origin', data: this.sampleData }),
    theme: {
      'parallel-coords': {
        line: { colors: ['#E64A19', '#F9A825', '#8D6E63'] },
      },
    },
  };

  // Emphasised chrome — heavier axes and larger names, for a chart read from a distance.
  boldChromeConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({ colorBy: 'Origin', data: this.sampleData }),
    theme: {
      'parallel-coords': {
        axis: { color: '#37474F', width: 2 },
        label: { color: '#37474F', fontSize: 15, fontWeight: 700 },
        tick: { color: '#607D8B', fontSize: 11 },
      },
    },
  };

  // Density tuning — thin, near-transparent lines so the bunching carries the reading rather
  // than any individual record.
  denseConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({ colorBy: 'Origin', data: this.sampleData }),
    theme: {
      'parallel-coords': {
        line: { opacity: 0.35, width: 1 },
      },
    },
  };

  // Opaque, heavy lines — the opposite end, for a handful of records that each matter.
  sparseConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({ colorBy: 'Origin', data: this.sampleData }),
    theme: {
      'parallel-coords': {
        line: { opacity: 1, width: 3 },
      },
    },
  };

  // Hover contrast — how hard the un-hovered records recede while one is traced.
  strongDimConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({
      colorBy: 'Origin',
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      'parallel-coords': {
        line: { dimmedOpacity: 0.04 },
      },
    },
  };

  softDimConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({
      colorBy: 'Origin',
      data: this.sampleData,
      tooltip: { enabled: true },
    }),
    theme: {
      'parallel-coords': {
        line: { dimmedOpacity: 0.35 },
      },
    },
  };

  // A pair of extents held open so the brush chrome is on screen without a gesture — the
  // chrome renders from `brushExtents` alone, `onBrush` only arms the drag.
  readonly brushExtents: NgeParallelCoordsBrushExtents = {
    Origin: { categories: ['Japan', 'Europe'], kind: 'categories' },
    Weight: { kind: 'range', range: [1800, 2500] },
  };

  // Default brush chrome — a translucent primary window with a hairline edge.
  brushDefaultConfig: NgeChartConfig = createParallelCoordsChartConfig({
    brushExtents: this.brushExtents,
    colorBy: 'Origin',
    data: this.sampleData,
  });

  // Emphasised brush chrome — a wider, more saturated window for a touch target, or for a
  // chart where the selection has to read from across a room.
  brushBoldConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({
      brushExtents: this.brushExtents,
      colorBy: 'Origin',
      data: this.sampleData,
    }),
    theme: {
      'parallel-coords': {
        brush: {
          fill: '#F9A825',
          fillOpacity: 0.35,
          stroke: '#E65100',
          strokeWidth: 2,
          width: 28,
        },
      },
    },
  };

  // Muted chrome — axes recede so the data lines carry all the contrast.
  quietChromeConfig: NgeChartConfig = {
    ...createParallelCoordsChartConfig({ colorBy: 'Origin', data: this.sampleData }),
    theme: {
      'parallel-coords': {
        axis: { color: '#E0E0E0', width: 1 },
        label: { fontSize: 11, fontWeight: 500 },
        tick: { color: '#BDBDBD', fontSize: 9 },
      },
    },
  };
}
