import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeParallelCoordsBrushExtents,
  NgeParallelCoordsCurve,
  NgeParallelCoordsDataPoint,
} from '../../../../core/config';

import { createParallelCoordsChartConfig } from '../../../../presets/parallel-coords-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Named axis arrangements — `dimensions` is an array, which no single control expresses well. */
type DimensionPreset = 'all' | 'performance' | 'reversed';

/** One row of the source table, before it is reshaped into the layer's long format. */
interface CarRecord {
  cylinders: number;
  horsepower: number;
  mpg: number;
  name: string;
  origin: string;
  weight: number;
}

const ORIGINS = ['USA', 'Japan', 'Europe'];

const DIMENSION_PRESETS: Record<DimensionPreset, string[] | undefined> = {
  all: undefined,
  performance: ['Weight', 'Horsepower', 'MPG'],
  reversed: ['Origin', 'Weight', 'Horsepower', 'Cylinders', 'MPG'],
};

/**
 * Read one dimension off a source row, keyed by the axis label it was flattened onto. This is
 * the half of brushing that lives OUTSIDE the chart: the emitted extents are in data terms, so
 * a consumer applies them to its own rows exactly like this rather than asking the chart what
 * it drew.
 */
const CAR_DIMENSION_READERS: Record<string, (car: CarRecord) => number | string> = {
  Cylinders: car => car.cylinders,
  Horsepower: car => car.horsepower,
  MPG: car => car.mpg,
  Origin: car => car.origin,
  Weight: car => car.weight,
};

/** Reshape a table of records into the layer's long format. */
function toParallelData(cars: CarRecord[]): NgeParallelCoordsDataPoint[] {
  return cars.flatMap(car => [
    { label: 'MPG', seriesId: car.name, value: car.mpg },
    { label: 'Cylinders', seriesId: car.name, value: car.cylinders },
    { label: 'Horsepower', seriesId: car.name, value: car.horsepower },
    { label: 'Weight', seriesId: car.name, value: car.weight },
    { label: 'Origin', seriesId: car.name, value: car.origin },
  ]);
}

/**
 * Generate `count` synthetic records. The record count is a control because it is what the
 * density theme knobs have to be tuned against — a palette and opacity that read well at 12
 * records are a solid block at 200.
 */
function generateCars(count: number): CarRecord[] {
  return Array.from({ length: count }, (_, index) => {
    // Deterministic-ish spread so a re-render at the same count keeps a comparable picture.
    const weight = 1800 + Math.random() * 2000;
    return {
      cylinders: weight > 3200 ? 8 : weight > 2600 ? 6 : 4,
      horsepower: Math.round(55 + (weight - 1800) / 20 + Math.random() * 30),
      mpg: Math.round(38 - (weight - 1800) / 130 + Math.random() * 6),
      name: `car-${index}`,
      origin: ORIGINS[index % ORIGINS.length],
      weight: Math.round(weight),
    };
  });
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-parallel-coords-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-parallel-coords-chart-interaction-stories',
  standalone: true,
  styleUrl: './parallel-coords-chart-interaction-stories.component.scss',
  templateUrl: './parallel-coords-chart-interaction-stories.component.html',
})
export class NgeParallelCoordsChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/charts/src/lib/nge-chart/stories/parallel-coords-chart/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(24);
  readonly marginRight = input<number>(24);
  readonly marginBottom = input<number>(16);
  readonly marginLeft = input<number>(24);

  // === Layer config inputs ===
  readonly brushing = input<boolean>(false);
  readonly colorBy = input<string>('Origin');
  readonly curve = input<NgeParallelCoordsCurve>('linear');
  readonly dimensionPreset = input<DimensionPreset>('all');
  readonly recordCount = input<number>(24);
  readonly showTooltip = input<boolean>(true);
  readonly tickCount = input<number>(5);

  // === Theme inputs ===
  readonly axisColor = input<string>('');
  readonly axisWidth = input<number>(1);
  readonly labelFontSize = input<number>(12);
  readonly labelFontWeight = input<number>(600);
  readonly lineDimmedOpacity = input<number>(0.12);
  readonly lineOpacity = input<number>(0.7);
  readonly lineWidth = input<number>(1.5);
  readonly tickColor = input<string>('');
  readonly tickFontSize = input<number>(10);

  /**
   * The brush is CONTROLLED: the layer emits, this holds, the next render draws. Keeping the
   * extents here — rather than inside the chart — is the whole point of the seam, since it is
   * what lets the same selection drive anything else on a dashboard.
   */
  readonly brushExtents = signal<NgeParallelCoordsBrushExtents>({});

  /** Human-readable summary of the active extents, so the emitted payload is visible. */
  readonly brushSummary = computed<string[]>(() =>
    Object.entries(this.brushExtents()).map(([dimension, extent]) =>
      extent.kind === 'range'
        ? `${dimension}: ${extent.range[0].toFixed(0)}–${extent.range[1].toFixed(0)}`
        : `${dimension}: ${extent.categories.join(', ')}`
    )
  );

  /** Records still crossing every active extent — what a consumer would filter its table to. */
  readonly matchingCount = computed<number>(() => {
    const extents = this.brushExtents();
    const dimensions = Object.keys(extents);
    if (dimensions.length === 0) {
      return this.sizedCars().length;
    }
    return this.sizedCars().filter(car =>
      dimensions.every(dimension => {
        const extent = extents[dimension];
        const value = CAR_DIMENSION_READERS[dimension]?.(car);
        if (value === undefined) {
          return false;
        }
        return extent.kind === 'range'
          ? typeof value === 'number' && value >= extent.range[0] && value <= extent.range[1]
          : extent.categories.includes(String(value));
      })
    ).length;
  });

  private readonly cars = signal<CarRecord[]>(generateCars(24));

  // The generated pool is regenerated whenever the requested count changes, and the button
  // reshuffles it at the current count.
  private readonly sizedCars = computed<CarRecord[]>(() => {
    const pool = this.cars();
    const count = this.recordCount();
    return pool.length === count ? pool : generateCars(count);
  });

  readonly sampleData = computed<NgeParallelCoordsDataPoint[]>(() =>
    toParallelData(this.sizedCars())
  );

  randomizeData(): void {
    this.cars.set(generateCars(this.recordCount()));
  }

  clearBrushes(): void {
    this.brushExtents.set({});
  }

  // Computed config rebuilds when ANY input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const brushing = this.brushing();
    const baseConfig = createParallelCoordsChartConfig({
      brushExtents: brushing ? this.brushExtents() : undefined,
      colorBy: this.colorBy() || undefined,
      curve: this.curve(),
      data: this.sampleData(),
      dimensions: DIMENSION_PRESETS[this.dimensionPreset()],
      // Setting the sink is what arms the drag; the extents come back through it and are held
      // in this component, which is the controlled loop the layer is built around.
      onBrush: brushing ? event => this.brushExtents.set(event.extents) : undefined,
      tickCount: this.tickCount(),
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
        'parallel-coords': {
          axis: {
            color: this.axisColor() || undefined,
            width: this.axisWidth(),
          },
          label: {
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          line: {
            dimmedOpacity: this.lineDimmedOpacity(),
            opacity: this.lineOpacity(),
            width: this.lineWidth(),
          },
          tick: {
            color: this.tickColor() || undefined,
            fontSize: this.tickFontSize(),
          },
        },
      },
    };
  });
}
