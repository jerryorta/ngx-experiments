import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeHierarchyDatum } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';
import type { NgeLegendItem } from '../../../../core/legend';

import { extractSunburstChartLegendItems } from '../../../../core/legend';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createProportionalChartConfig } from '../../../../presets/proportional-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-proportional-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-proportional-chart-usage-stories',
  standalone: true,
  styleUrl: './proportional-chart-usage-stories.component.scss',
  templateUrl: './proportional-chart-usage-stories.component.html',
})
export class NgeProportionalChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/proportional-chart/usage';

  // EXAMPLE 1: Basic Usage — one circle per category, AREA proportional to value.
  readonly energyData: NgeHierarchyDatum[] = [
    { label: 'Solar', value: 120 },
    { label: 'Wind', value: 80 },
    { label: 'Hydro', value: 45 },
    { label: 'Geothermal', value: 20 },
  ];
  basicConfig = createProportionalChartConfig({
    data: this.energyData,
    showLabels: true,
  });

  // EXAMPLE 2: Squares and half-circles — the same magnitudes, a different primitive.
  squareConfig = createProportionalChartConfig({
    data: this.energyData,
    mark: 'square',
    showLabels: true,
  });
  halfCircleConfig = createProportionalChartConfig({
    data: this.energyData,
    mark: 'half-circle',
    showLabels: true,
  });

  // EXAMPLE 3: Waffle — a 10x10 grid where each cell is one percentage point.
  readonly gridData: NgeHierarchyDatum[] = [
    { label: 'Renewable', value: 42 },
    { label: 'Nuclear', value: 18 },
    { label: 'Fossil', value: 40 },
  ];
  waffleConfig = createProportionalChartConfig({
    data: this.gridData,
    mark: 'grid',
  });

  // A waffle names its categories through a legend rather than on-cell text, so the two
  // ship together. The extractor is shared with the sunburst — both read the same
  // `NgeHierarchyDatum[]` top level and cycle the same palette.
  readonly waffleLegendItems: NgeLegendItem[] = extractSunburstChartLegendItems(this.gridData);

  // EXAMPLE 4: Unit waffle — one cell per fixed quantity, surplus cells left empty.
  unitWaffleConfig = createProportionalChartConfig({
    columns: 12,
    data: [
      { label: 'Shipped', value: 31 },
      { label: 'In transit', value: 12 },
    ],
    mark: 'grid',
    rows: 5,
    valuePerCell: 1,
  });

  // EXAMPLE 5: Packed circles — nesting groups the leaves into clusters.
  readonly platformData: NgeHierarchyDatum[] = [
    {
      children: [
        { label: 'iOS', value: 62 },
        { label: 'Android', value: 91 },
      ],
      label: 'Mobile',
    },
    {
      children: [
        { label: 'macOS', value: 25 },
        { label: 'Windows', value: 70 },
        { label: 'Linux', value: 14 },
      ],
      label: 'Desktop',
    },
  ];
  packedConfig = createProportionalChartConfig({
    data: this.platformData,
    mark: 'packed',
    showLabels: true,
  });

  // EXAMPLE 6: Nested proportional area — concentric marks on one baseline.
  nestedConfig = createProportionalChartConfig({
    data: [
      { label: 'Audience', value: 100 },
      { label: 'Engaged', value: 55 },
      { label: 'Converted', value: 12 },
    ],
    layout: 'nested',
    mark: 'circle',
  });

  // EXAMPLE 7: Click Handling
  readonly lastClicked = signal<string>('None');
  clickableConfig = createProportionalChartConfig({
    data: this.energyData,
    onClick: (event: NgeChartLayerClickEvent<NgeHierarchyDatum>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
    showLabels: true,
  });

  // EXAMPLE 8: Tooltips
  tooltipConfig = createProportionalChartConfig({
    data: this.energyData,
    showLabels: true,
    tooltip: {
      enabled: true,
      formatContent: (d: NgeHierarchyDatum) => ({
        label: d.label,
        value: `${d.value} TWh`,
      }),
    },
  });

  // EXAMPLE 9: Dynamic Data with Signals
  readonly dynamicData = signal<NgeHierarchyDatum[]>([
    { label: 'North', value: 90 },
    { label: 'South', value: 60 },
    { label: 'East', value: 35 },
    { label: 'West', value: 15 },
  ]);
  readonly dynamicConfig = computed(() =>
    createProportionalChartConfig({
      data: this.dynamicData(),
      showLabels: true,
    })
  );

  randomizeData(): void {
    this.dynamicData.update(points =>
      points.map(point => ({ ...point, value: Math.round(10 + Math.random() * 90) }))
    );
  }
}
