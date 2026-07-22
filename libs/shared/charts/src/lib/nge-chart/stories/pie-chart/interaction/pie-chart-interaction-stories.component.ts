import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgePieDataPoint } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { extractPieChartLegendItems } from '../../../../core/legend';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createPieChartConfig } from '../../../../presets/pie-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Slice categories driven by the controls (one slice per label). */
const SLICE_LABELS = ['Rent', 'Food', 'Transit', 'Utilities', 'Savings'];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'pie-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'pie-chart-interaction-stories',
  standalone: true,
  styleUrl: './pie-chart-interaction-stories.component.scss',
  templateUrl: './pie-chart-interaction-stories.component.html',
})
export class PieChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/pie-chart/interaction';

  // Base - Margins
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // Layer - Geometry
  readonly innerRadius = input<number>(0);
  readonly startAngle = input<number>(0);
  readonly endAngle = input<number>(6.28);
  readonly padAngle = input<number>(0);

  // Layer - Legend
  readonly showLegend = input<boolean>(true);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('right');
  /** Suppress the internal legend and render the standalone interactive <nge-chart-legend> above the chart. */
  readonly interactiveLegend = input<boolean>(false);

  // Layer - Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);

  // Theme - Slice Palette
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');
  readonly seriesColor4 = input<string>('#8E24AA');
  readonly seriesColor5 = input<string>('#00ACC1');

  // Theme - Slice Styling
  readonly sliceStroke = input<string>('');
  readonly sliceStrokeWidth = input<number>(1);
  readonly sliceOpacity = input<number>(1);

  // Sample data as a signal so the button can re-roll it.
  readonly sampleData = signal<NgePieDataPoint[]>(this.buildSlices());

  randomizeData(): void {
    this.sampleData.set(this.buildSlices());
  }

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // Slices toggled OFF via the external interactive legend. Stored as an immutable
  // Set (replaced, never mutated) so updates fire the signal.
  private readonly hiddenSlices = signal<Set<string>>(new Set());

  // Slice palette from the five color controls (empty entries dropped).
  readonly palette = computed<string[]>(() =>
    [
      this.seriesColor1(),
      this.seriesColor2(),
      this.seriesColor3(),
      this.seriesColor4(),
      this.seriesColor5(),
    ].filter((color): color is string => !!color)
  );

  // Base legend items over the FULL slice order, coloured to match the renderer
  // (extractPieChartLegendItems mirrors the layer's per-datum → palette[i % len]
  // resolution). Reused for both the internal legend and the interactive one.
  private readonly baseLegendItems = computed<NgeLegendItem[]>(() =>
    extractPieChartLegendItems(this.sampleData(), this.palette())
  );

  // Stable label → color map. The renderer colours each slice by its input index
  // (palette[d.index % len]); filtering a toggled-off slice would shift the
  // survivors' indices — and their colours. Resolving colours here over the full
  // order and stamping them onto chartData pins every slice's colour regardless of
  // what is currently visible.
  private readonly colorByLabel = computed<Map<string, string>>(
    () => new Map(this.baseLegendItems().map(item => [item.id ?? item.label, item.color]))
  );

  // One legend entry per slice (full order). A toggled-off slice stays listed but
  // dimmed (opacity 0.4) so it can be toggled back on.
  readonly legendItems = computed<NgeLegendItem[]>(() => {
    const hidden = this.hiddenSlices();
    return this.baseLegendItems().map(item => {
      const isHidden = hidden.has(item.id ?? item.label);
      return {
        ...item,
        opacity: isHidden ? 0.4 : 1,
        selected: !isHidden,
      };
    });
  });

  // Data fed to the preset. In interactiveLegend mode the toggled-off slices are
  // dropped and every remaining slice is stamped with its STABLE colour so the
  // renderer never recolours survivors as their indices shift. Otherwise the raw
  // sample data flows through unchanged.
  readonly chartData = computed<NgePieDataPoint[]>(() => {
    const data = this.sampleData();
    if (!this.interactiveLegend()) {
      return data;
    }
    const hidden = this.hiddenSlices();
    const colorByLabel = this.colorByLabel();
    return data
      .filter(point => !hidden.has(point.label))
      .map(point => ({ ...point, color: colorByLabel.get(point.label) }));
  });

  // Toggle a slice in/out of the pie (immutable Set so the signal fires).
  onLegendItemClick(item: NgeLegendItem): void {
    const key = item.id ?? item.label;
    this.hiddenSlices.update(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Computed config rebuilds whenever any control (or the re-rolled data) changes.
  readonly config = computed<NgeChartConfig>(() => {
    const palette = this.palette();

    const baseConfig = createPieChartConfig({
      data: this.chartData(),
      endAngle: this.endAngle(),
      innerRadius: this.innerRadius(),
      padAngle: this.padAngle(),
      seriesColors: palette.length ? palette : undefined,
      startAngle: this.startAngle(),
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            height: this.tooltipHeight(),
            style: {
              backgroundColor: this.tooltipBackgroundColor() || undefined,
              borderColor: this.tooltipBorderColor() || undefined,
              borderWidth: this.tooltipBorderWidth(),
              divotHeight: this.tooltipDivotHeight(),
              divotWidth: this.tooltipDivotWidth(),
            },
            width: this.tooltipWidth(),
          }
        : undefined,
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
      legend: this.interactiveLegend()
        ? undefined // external interactive legend takes over
        : this.showLegend()
          ? {
              enabled: true,
              items: this.baseLegendItems(),
              position: this.legendPosition(),
              swatchShape: 'square',
            }
          : undefined,
      theme: {
        pie: {
          slice: {
            opacity: this.sliceOpacity(),
            stroke: this.sliceStroke() || undefined,
            strokeWidth: this.sliceStrokeWidth(),
          },
        },
      },
    };
  });

  // Fresh values for every slice.
  private buildSlices(): NgePieDataPoint[] {
    return SLICE_LABELS.map(label => ({
      label,
      value: Math.round(100 + Math.random() * 1800),
    }));
  }
}
