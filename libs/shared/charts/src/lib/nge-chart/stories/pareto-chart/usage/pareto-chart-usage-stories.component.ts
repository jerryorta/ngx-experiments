import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBarDataPoint } from '../../../../core/config';
import type { NgeChartLayerClickEvent } from '../../../../core/layer';

import { createParetoChartConfig } from '../../../../presets/pareto-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'pareto-chart-usage-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'pareto-chart-usage-stories',
  standalone: true,
  styleUrl: './pareto-chart-usage-stories.component.scss',
  templateUrl: './pareto-chart-usage-stories.component.html',
})
export class ParetoChartUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pareto-chart/usage';

  // ============================================
  // EXAMPLE 1: Basic Pareto (sorted + cumulative line)
  // ============================================
  defectData: NgeBarDataPoint[] = [
    { label: 'Scratches', value: 42 },
    { label: 'Dents', value: 30 },
    { label: 'Misalignment', value: 18 },
    { label: 'Discoloration', value: 12 },
    { label: 'Cracks', value: 8 },
    { label: 'Other', value: 5 },
  ];

  basicConfig = createParetoChartConfig({
    data: this.defectData,
  });

  // ============================================
  // EXAMPLE 2: With Value Labels
  // ============================================
  labeledConfig = createParetoChartConfig({
    data: this.defectData,
    showLabels: true,
  });

  // ============================================
  // EXAMPLE 3: Preserve Input Order (sort: false)
  // ============================================
  unsortedConfig = createParetoChartConfig({
    data: this.defectData,
    sort: false,
  });

  // ============================================
  // EXAMPLE 4: Click Handling
  // ============================================
  readonly lastClicked = signal<string>('None');

  clickableConfig = createParetoChartConfig({
    data: this.defectData,
    onBarClick: (event: NgeChartLayerClickEvent<NgeBarDataPoint>) => {
      this.lastClicked.set(`${event.data.label}: ${event.data.value}`);
    },
  });

  // ============================================
  // EXAMPLE 5: Custom Colors
  // ============================================
  customColorConfig = createParetoChartConfig({
    barColor: '#4CAF50',
    data: this.defectData,
    lineColor: '#E53935',
  });

  // ============================================
  // EXAMPLE 6: Dynamic Data with Signals
  // ============================================
  readonly dynamicData = signal<NgeBarDataPoint[]>([
    { label: 'Feature A', value: 55 },
    { label: 'Feature B', value: 40 },
    { label: 'Feature C', value: 28 },
    { label: 'Feature D', value: 15 },
    { label: 'Feature E', value: 10 },
  ]);

  readonly dynamicConfig = computed(() =>
    createParetoChartConfig({
      data: this.dynamicData(),
      showTooltip: true,
    })
  );

  randomizeData(): void {
    const labels = ['Feature A', 'Feature B', 'Feature C', 'Feature D', 'Feature E'];
    this.dynamicData.set(
      labels.map(label => ({ label, value: Math.floor(Math.random() * 60) + 5 }))
    );
  }
}
