import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeHierarchyDatum,
  NgeProportionalLayout,
  NgeProportionalMark,
} from '../../../../core/config';

import { createProportionalChartConfig } from '../../../../presets/proportional-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-proportional-chart-interaction-stories',
  },
  imports: [CommonModule, NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-proportional-chart-interaction-stories',
  standalone: true,
  styleUrl: './proportional-chart-interaction-stories.component.scss',
  templateUrl: './proportional-chart-interaction-stories.component.html',
})
export class NgeProportionalChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/charts/src/lib/nge-chart/stories/proportional-chart/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(20);
  readonly marginLeft = input<number>(20);

  // === Layer config inputs ===
  readonly mark = input<NgeProportionalMark>('circle');
  readonly layout = input<NgeProportionalLayout>('row');
  readonly padding = input<number>(2);
  readonly rows = input<number>(10);
  readonly columns = input<number>(10);
  readonly valuePerCell = input<number>(0);
  readonly showLabels = input<boolean>(true);
  readonly minLabelSize = input<number>(24);
  readonly showTooltip = input<boolean>(false);

  // === Theme inputs ===
  readonly markStroke = input<string>('');
  readonly markStrokeWidth = input<number>(1);
  readonly markOpacity = input<number>(1);
  readonly emptyCellColor = input<string>('');
  readonly emptyCellOpacity = input<number>(1);
  readonly labelColor = input<string>('');
  readonly labelColorOnDark = input<string>('');
  readonly labelFontSize = input<number>(10);
  readonly labelFontWeight = input<number>(600);

  readonly sampleData = signal<NgeHierarchyDatum[]>([
    { label: 'Solar', value: 120 },
    { label: 'Wind', value: 80 },
    { label: 'Hydro', value: 45 },
    { label: 'Geothermal', value: 20 },
  ]);

  randomizeData(): void {
    this.sampleData.update(points =>
      points.map(point => ({ ...point, value: Math.round(10 + Math.random() * 120) }))
    );
  }

  // Nesting the data is what turns `mark: 'packed'` into clustered circles, so the packed
  // control gets a grouped copy while every other mark reads the flat series.
  private readonly packedData = computed<NgeHierarchyDatum[]>(() => {
    const [first, second, third, fourth] = this.sampleData();
    return [
      { children: [first, second], label: 'Group A' },
      { children: [third, fourth], label: 'Group B' },
    ];
  });

  // Computed config rebuilds when ANY input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createProportionalChartConfig({
      columns: this.columns(),
      data: this.mark() === 'packed' ? this.packedData() : this.sampleData(),
      layout: this.layout(),
      mark: this.mark(),
      minLabelSize: this.minLabelSize(),
      padding: this.padding(),
      rows: this.rows(),
      showLabels: this.showLabels(),
      tooltip: this.showTooltip() ? { enabled: true } : undefined,
      // 0 means "unset" — fall back to total / (rows * columns) so the grid fills exactly.
      valuePerCell: this.valuePerCell() || undefined,
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
        proportional: {
          emptyCell: {
            color: this.emptyCellColor() || undefined,
            opacity: this.emptyCellOpacity(),
          },
          label: {
            color: this.labelColor() || undefined,
            colorOnDark: this.labelColorOnDark() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          mark: {
            opacity: this.markOpacity(),
            stroke: this.markStroke() || undefined,
            strokeWidth: this.markStrokeWidth(),
          },
        },
      },
    };
  });
}
