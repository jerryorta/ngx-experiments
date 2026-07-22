import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeHeatmapDataPoint,
  NgeHeatmapLayerConfig,
  HeatmapColorScheme,
  HeatmapMark,
} from '../../../../core/config';

import { createHeatmapChartConfig } from '../../../../presets/heatmap-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Row (region) and column (quarter) keys of the demo grid. */
const REGIONS = ['North', 'South', 'East', 'West', 'Central'];
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

/** Build a fresh region × quarter grid of random sales values (Randomize button). */
function makeSalesGrid(): NgeHeatmapDataPoint[] {
  return REGIONS.flatMap(row =>
    QUARTERS.map(col => ({ col, row, value: Math.round(20 + Math.random() * 70) }))
  );
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'heatmap-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'heatmap-chart-interaction-stories',
  standalone: true,
  styleUrl: './heatmap-chart-interaction-stories.component.scss',
  templateUrl: './heatmap-chart-interaction-stories.component.html',
})
export class HeatmapChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/heatmap-chart/interaction';

  // === Base - Margins ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(70);

  // === Layer - Layout ===
  readonly mark = input<HeatmapMark>('cell');
  readonly colPadding = input<number>(0.05);
  readonly rowPadding = input<number>(0.05);
  readonly bubbleMaxRatio = input<number>(0.9);

  // === Layer - Color ===
  readonly scheme = input<'' | HeatmapColorScheme>('');
  readonly domainMin = input<null | number>(null);
  readonly domainMax = input<null | number>(null);

  // === Layer - Visibility ===
  readonly showValues = input<boolean>(false);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);

  // === Layer - Tooltip ===
  readonly showTooltip = input<boolean>(false);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');

  // === Theme - Cell ===
  readonly cellRampFrom = input<string>('');
  readonly cellRampMid = input<string>('');
  readonly cellRampTo = input<string>('');
  readonly cellEmptyColor = input<string>('');
  readonly cellRadius = input<number>(1);
  readonly cellStrokeWidth = input<number>(1);
  readonly cellOpacity = input<number>(1);

  // === Theme - Bubble ===
  readonly bubbleColor = input<string>('');
  readonly bubbleOpacity = input<number>(0.85);
  readonly bubbleStroke = input<string>('');
  readonly bubbleStrokeWidth = input<number>(1);

  // === Theme - Label ===
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);
  readonly labelFontWeight = input<number>(500);

  // The grid cells — re-rolled by "Randomize Data".
  readonly liveData = signal<NgeHeatmapDataPoint[]>(makeSalesGrid());

  // Computed config that rebuilds when any input changes. `domain` is applied only
  // when both bounds are set; the tooltip position is patched onto the built layer
  // since the preset fixes it to follow-mouse.
  readonly config = computed<NgeChartConfig>(() => {
    const domainMin = this.domainMin();
    const domainMax = this.domainMax();
    const domain =
      domainMin != null && domainMax != null
        ? ([domainMin, domainMax] as [number, number])
        : undefined;

    const base = createHeatmapChartConfig({
      bubbleMaxRatio: this.bubbleMaxRatio(),
      colPadding: this.colPadding(),
      data: this.liveData(),
      domain,
      margin: {
        bottom: this.marginBottom(),
        left: this.marginLeft(),
        right: this.marginRight(),
        top: this.marginTop(),
      },
      mark: this.mark(),
      rowPadding: this.rowPadding(),
      scheme: this.scheme() || undefined,
      showTooltip: this.showTooltip(),
      showValues: this.showValues(),
      showXAxis: this.showXAxis(),
      showYAxis: this.showYAxis(),
      xAxisLabel: 'Quarter',
      yAxisLabel: 'Region',
    });

    const [layer] = base.layers.flat() as NgeHeatmapLayerConfig[];
    const tooltipPosition = this.tooltipPosition();

    return {
      ...base,
      layers: [
        layer.tooltip
          ? { ...layer, tooltip: { ...layer.tooltip, position: tooltipPosition } }
          : layer,
      ],
      theme: {
        heatmap: {
          bubble: {
            color: this.bubbleColor() || undefined,
            opacity: this.bubbleOpacity(),
            stroke: this.bubbleStroke() || undefined,
            strokeWidth: this.bubbleStrokeWidth(),
          },
          cell: {
            emptyColor: this.cellEmptyColor() || undefined,
            opacity: this.cellOpacity(),
            radius: this.cellRadius(),
            rampFrom: this.cellRampFrom() || undefined,
            rampMid: this.cellRampMid() || undefined,
            rampTo: this.cellRampTo() || undefined,
            strokeWidth: this.cellStrokeWidth(),
          },
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.liveData.set(makeSalesGrid());
  }
}
