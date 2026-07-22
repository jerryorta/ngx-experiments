import { CommonModule } from '@angular/common';
import { Component, computed, effect, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_LINE_LAYER_THEME } from '../../../../core/theme/nge-chart-theme.defaults';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { NgeLineChartTransform } from '../../../../transforms/line-chart.transform';
import { NgeChartComponent } from '../../../nge-chart.component';

/** 12 categorical months shared by the single-series and multi-series datasets. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** Series shown in the interactive-legend multi-line dataset (device channels). */
const SERIES_IDS = ['Desktop', 'Mobile', 'Tablet'];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'line-chart-interaction-stories',
  },
  imports: [
    CommonModule,
    NgeChartComponent,
    NgeChartLegendComponent,
    NgeStorybookReviewContainerComponent,
  ],
  selector: 'line-chart-interaction-stories',
  standalone: true,
  styleUrl: './line-chart-interaction-stories.component.scss',
  templateUrl: './line-chart-interaction-stories.component.html',
})
export class LineChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/line-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // Layer config inputs
  readonly curveType = input<'basis' | 'linear' | 'monotone' | 'step'>('linear');
  readonly showPoints = input<boolean>(true);
  readonly showArea = input<boolean>(false);
  readonly areaOpacity = input<number>(0.3);
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(140);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);
  readonly xAxisLabel = input<string>('xAxisLabel');
  readonly yAxisLabel = input<string>('yAxisLabel');

  // Interaction inputs (ARCH-174)
  /** Enable wheel-zoom / drag-pan / brush-zoom gestures (double-click resets). */
  readonly enableGestures = input<boolean>(true);
  /**
   * X data type: 'categorical' (point scale → whole-category WINDOW zoom) or
   * 'time' (continuous scale → continuous zoom, domains in epoch ms).
   */
  readonly dataMode = input<'categorical' | 'time'>('categorical');

  // Interactive legend (ARCH-178)
  /**
   * Suppress the internal legend and render the standalone interactive
   * <nge-chart-legend> above a multi-series (3-line) chart. Clicking a series
   * toggles its line in/out of the chart.
   */
  readonly interactiveLegend = input<boolean>(false);
  /** Multi-series palette for the interactive-legend demo (empty entries drop). */
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');

  // Theme inputs - Line styling
  readonly lineWidth = input<number>(2);
  readonly pointRadius = input<number>(4);
  readonly lineColor = input<string>('');

  // Theme inputs - Axis styling
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Bumped by "Randomize Data" to re-roll the generated series.
  private readonly randomizeSeed = signal(0);

  // 12 categorical months — enough to window into with band-window zoom.
  readonly categoricalData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildCategorical();
  });

  // 12 daily time points — a continuous time axis for continuous zoom.
  readonly timeData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildTime();
  });

  // Transform owns the interaction state (zoom/pan/window) and derives the
  // preset config; the constructor effect keeps its options in sync with the
  // Storybook controls (zoom state survives control changes).
  readonly transform = new NgeLineChartTransform({ data: [] });

  constructor() {
    effect(() => {
      this.transform.updateOptions({
        areaOpacity: this.areaOpacity(),
        curveType: this.curveType(),
        // Interactive-legend mode feeds the filtered multi-series data (and its
        // stable palette below); otherwise the single-series categorical/time data.
        data: this.interactiveLegend()
          ? this.interactiveChartData()
          : this.dataMode() === 'time'
            ? this.timeData()
            : this.categoricalData(),
        gestures: this.enableGestures() ? { brushZoom: true, pan: true, zoom: true } : undefined,
        lineWidth: this.lineWidth(),
        pointRadius: this.pointRadius(),
        seriesColors: this.interactiveLegend()
          ? this.interactiveSeriesColors()
          : this.lineColor()
            ? [this.lineColor()]
            : undefined,
        showArea: this.showArea(),
        showPoints: this.showPoints(),
        showXAxis: this.showXAxis(),
        showYAxis: this.showYAxis(),
        tooltip: this.showTooltip()
          ? {
              enabled: true,
              height: this.tooltipHeight(),
              position: this.tooltipPosition(),
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
        xAxisLabel: this.xAxisLabel() || undefined,
        yAxisLabel: this.yAxisLabel() || undefined,
      });
    });
  }

  // Re-roll the generated data (both modes).
  randomizeData(): void {
    this.randomizeSeed.update(seed => seed + 1);
  }

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // A 3-series (Desktop / Mobile / Tablet) dataset driven by a standalone
  // interactive legend. Clicking a series drops it from the data (its line
  // disappears) but keeps it listed in the legend, dimmed, so it can return.

  // Multi-series data, re-rolled by "Randomize Data" via the shared seed.
  readonly multiSeriesData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildMultiSeries();
  });

  // Series toggled OFF via the external legend. Immutable Set (replaced, never
  // mutated) so each update fires the signal.
  private readonly hiddenSeries = signal<Set<string>>(new Set());

  // Series palette from the three color controls (empty entries dropped).
  readonly palette = computed<string[]>(() =>
    [this.seriesColor1(), this.seriesColor2(), this.seriesColor3()].filter(
      (color): color is string => !!color
    )
  );

  // Stable seriesId → color over the FULL SERIES_IDS order. The line renderer
  // colors each series by its first-seen index (seriesColors[i % len]), so
  // filtering a toggled-off series would shift the survivors' indices — and thus
  // their colors. Resolving colors over the complete order here (and feeding the
  // matching stable palette to the chart) pins every line's color regardless of
  // what is visible. NOTE: a per-datum `color` on NgeLineDataPoint tints only the
  // point FILL, not the line stroke — so a stable `seriesColors` array (below),
  // not per-point stamping, is what keeps the LINES stable.
  private readonly seriesColorById = computed<Map<string, string>>(() => {
    const palette = this.palette();
    const colors = palette.length ? palette : (DEFAULT_LINE_LAYER_THEME.line.colors ?? []);
    return new Map(
      SERIES_IDS.map((seriesId, i) => [
        seriesId,
        colors[i % colors.length] ?? 'var(--chart-primary)',
      ])
    );
  });

  // One legend entry per series (full SERIES_IDS order). A toggled-off series
  // stays listed but dimmed (opacity 0.4) so it can be toggled back on.
  readonly legendItems = computed<NgeLegendItem[]>(() => {
    const colorById = this.seriesColorById();
    const hidden = this.hiddenSeries();
    return SERIES_IDS.map(seriesId => {
      const isHidden = hidden.has(seriesId);
      return {
        color: colorById.get(seriesId) ?? 'var(--chart-primary)',
        id: seriesId,
        label: seriesId,
        opacity: isHidden ? 0.4 : 1,
        selected: !isHidden,
      };
    });
  });

  // Visible series in stable SERIES_IDS order (= their first-seen order in the
  // data), so the palette below aligns to the renderer's series indexing.
  private readonly visibleSeries = computed<string[]>(() =>
    SERIES_IDS.filter(seriesId => !this.hiddenSeries().has(seriesId))
  );

  // Multi-series data with the toggled-off series dropped.
  readonly interactiveChartData = computed<NgeLineDataPoint[]>(() => {
    const hidden = this.hiddenSeries();
    return this.multiSeriesData().filter(point => !hidden.has(point.seriesId ?? ''));
  });

  // Stable palette aligned to the VISIBLE series' order. Because visibleSeries
  // preserves SERIES_IDS order (= the renderer's first-seen order), each
  // surviving line is handed back exactly its full-order color.
  readonly interactiveSeriesColors = computed<string[]>(() => {
    const colorById = this.seriesColorById();
    return this.visibleSeries().map(seriesId => colorById.get(seriesId) ?? 'var(--chart-primary)');
  });

  // Toggle a series' line in/out (immutable Set so the signal fires).
  onLegendItemClick(item: NgeLegendItem): void {
    const key = item.id ?? item.label;
    this.hiddenSeries.update(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // 12 months of categorical data with random values.
  private buildCategorical(): NgeLineDataPoint[] {
    return MONTHS.map(label => ({ x: label, y: Math.floor(Math.random() * 80) + 10 }));
  }

  // 12 months × 3 device-channel series with separated baselines so the lines
  // read as distinct bands. Re-rolled with the shared seed by "Randomize Data".
  private buildMultiSeries(): NgeLineDataPoint[] {
    const baselines: Record<string, number> = { Desktop: 50, Mobile: 30, Tablet: 12 };
    return SERIES_IDS.flatMap(seriesId =>
      MONTHS.map(label => ({
        seriesId,
        x: label,
        y: Math.round((baselines[seriesId] ?? 20) + Math.random() * 35),
      }))
    );
  }

  // 12 consecutive daily points from a fixed start — a continuous time axis.
  private buildTime(): NgeLineDataPoint[] {
    const start = new Date('2026-01-01T00:00:00Z').getTime();
    const day = 86_400_000;
    return Array.from({ length: 12 }, (_, i) => ({
      x: new Date(start + i * day),
      y: Math.floor(Math.random() * 80) + 10,
    }));
  }

  // The transform's derived config with control-driven margin + theme layered on.
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = this.transform.config();

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
        axis: {
          labelFontSize: this.axisLabelFontSize(),
          tickFontSize: this.axisTickFontSize(),
        },
      },
    };
  });
}
