import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeParallelCoordsDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

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

/**
 * The canonical parallel-coordinates dataset: measurements that share no unit, which is what
 * makes the per-axis scales visible — `weight` runs in the thousands while `mpg` runs in the
 * tens, and both fill their own axis.
 */
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

/**
 * Reshape a table of records into the layer's LONG format — one datum per record per
 * dimension, tied together by `seriesId`. Consumers holding wide rows need this hop, so the
 * stories do it the same way a caller would.
 */
function toParallelData(cars: CarRecord[]): NgeParallelCoordsDataPoint[] {
  return cars.flatMap(car => [
    { label: 'MPG', seriesId: car.name, value: car.mpg },
    { label: 'Cylinders', seriesId: car.name, value: car.cylinders },
    { label: 'Horsepower', seriesId: car.name, value: car.horsepower },
    { label: 'Weight', seriesId: car.name, value: car.weight },
    { label: 'Origin', seriesId: car.name, value: car.origin },
  ]);
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-parallel-coords-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-parallel-coords-chart-usage-stories',
  standalone: true,
  styleUrl: './parallel-coords-chart-usage-stories.component.scss',
  templateUrl: './parallel-coords-chart-usage-stories.component.html',
})
export class NgeParallelCoordsChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/parallel-coords-chart/usage';

  readonly carData: NgeParallelCoordsDataPoint[] = toParallelData(CARS);

  // EXAMPLE 1: Basic usage — one axis per dimension, one polyline per record.
  basicConfig = createParallelCoordsChartConfig({
    data: this.carData,
  });

  // EXAMPLE 2: Colour by a dimension — the reading the chart type is for.
  colorByConfig = createParallelCoordsChartConfig({
    colorBy: 'Origin',
    data: this.carData,
  });

  // EXAMPLE 3: Axis order and subset — adjacency is what makes a correlation visible.
  orderedConfig = createParallelCoordsChartConfig({
    colorBy: 'Origin',
    data: this.carData,
    dimensions: ['Weight', 'Horsepower', 'MPG'],
  });

  // EXAMPLE 4: Curved variant — same geometry, monotone interpolation between axes.
  curvedConfig = createParallelCoordsChartConfig({
    colorBy: 'Origin',
    curve: 'monotone',
    data: this.carData,
  });

  // EXAMPLE 5: Mixed scales — `Origin` is categorical, so it takes a point axis while its
  // numeric neighbours take linear ones.
  mixedConfig = createParallelCoordsChartConfig({
    colorBy: 'Origin',
    data: this.carData,
    dimensions: ['Origin', 'Cylinders', 'MPG'],
  });

  // EXAMPLE 6: Tooltip + click — both resolve to the datum on the axis nearest the pointer.
  readonly lastClicked = signal<string>('None');
  interactiveConfig = createParallelCoordsChartConfig({
    colorBy: 'Origin',
    data: this.carData,
    onClick: (event: NgeChartLayerClickEvent<NgeParallelCoordsDataPoint>) => {
      this.lastClicked.set(`${event.data.seriesId} — ${event.data.label}: ${event.data.value}`);
    },
    tooltip: { enabled: true },
  });

  // EXAMPLE 7: Dynamic data with signals.
  readonly dynamicCars = signal<CarRecord[]>(CARS);
  readonly dynamicConfig = computed(() =>
    createParallelCoordsChartConfig({
      colorBy: 'Origin',
      data: toParallelData(this.dynamicCars()),
      tooltip: { enabled: true },
    })
  );

  randomizeData(): void {
    this.dynamicCars.update(cars =>
      cars.map(car => ({
        ...car,
        horsepower: Math.round(60 + Math.random() * 120),
        mpg: Math.round(12 + Math.random() * 26),
        weight: Math.round(1800 + Math.random() * 2000),
      }))
    );
  }

  resetData(): void {
    this.dynamicCars.set(CARS);
  }
}
