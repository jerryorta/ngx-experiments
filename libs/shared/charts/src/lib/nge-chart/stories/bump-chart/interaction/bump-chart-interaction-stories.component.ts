import { CommonModule } from '@angular/common';
import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeBumpDataPoint, NgeChartConfig } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_BUMP_LAYER_THEME } from '../../../../core/theme/nge-chart-theme.defaults';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createBumpChartConfig } from '../../../../presets/bump-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Ordered x axis shared by every bump story — seven years of rankings. */
const YEARS = ['2019', '2020', '2021', '2022', '2023', '2024', '2025'];

/**
 * Series in their FIRST-SEEN order — this MUST match the order the rows are emitted
 * into the data (see `buildBumpData`), because the bump renderer colors each series by
 * its first-seen index. The interactive-legend color plumbing below relies on it.
 */
const SERIES_IDS = ['Nova', 'Orbit', 'Pulse', 'Vertex', 'Zenith'];

/**
 * Streaming-platform subscribers (millions) — the shared rank-over-time dataset. Five
 * platforms whose values reorder year over year so their ranks genuinely cross.
 */
const SUBSCRIBERS: Record<string, number[]> = {
  Nova: [45, 52, 58, 54, 60, 72, 88],
  Orbit: [30, 42, 56, 70, 68, 66, 75],
  Pulse: [60, 64, 62, 58, 55, 50, 48],
  Vertex: [52, 48, 50, 62, 72, 70, 65],
  Zenith: [25, 30, 38, 46, 58, 64, 70],
};

/** Flatten the `{ series: values[] }` table into `NgeBumpDataPoint` rows over YEARS. */
function buildBumpData(): NgeBumpDataPoint[] {
  return SERIES_IDS.flatMap(seriesId =>
    (SUBSCRIBERS[seriesId] ?? []).map((value, index) => ({ seriesId, value, x: YEARS[index] }))
  );
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'bump-chart-interaction-stories',
  },
  imports: [
    CommonModule,
    NgeChartComponent,
    NgeChartLegendComponent,
    NgeStorybookReviewContainerComponent,
  ],
  selector: 'bump-chart-interaction-stories',
  standalone: true,
  styleUrl: './bump-chart-interaction-stories.component.scss',
  templateUrl: './bump-chart-interaction-stories.component.html',
})
export class BumpChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/bump-chart/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(45);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(45);

  // === Layer config inputs ===
  readonly curveType = input<'bump' | 'linear' | 'monotone'>('bump');
  readonly rankOrder = input<'asc' | 'desc'>('desc');
  readonly showPoints = input<boolean>(true);
  readonly showLabels = input<boolean>(true);
  readonly pointRadius = input<number>(5);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);
  readonly xAxisLabel = input<string>('Year');
  readonly yAxisLabel = input<string>('Rank');

  // === Layer legend inputs (internal auto-legend, non-interactive mode) ===
  readonly showLegend = input<boolean>(false);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('bottom');

  // === Layer tooltip inputs ===
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipWidth = input<number>(160);
  readonly tooltipHeight = input<number>(65);

  // === Interactive legend inputs ===
  /**
   * Suppress the internal legend and render the standalone interactive
   * <nge-chart-legend> above the chart. Clicking a series toggles its rank line
   * in/out; the toggled-off series stays listed but dimmed so it can return.
   */
  readonly interactiveLegend = input<boolean>(false);
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');
  readonly seriesColor4 = input<string>('#E53935');
  readonly seriesColor5 = input<string>('#8E24AA');

  // === Theme inputs ===
  readonly lineWidth = input<number>(2.5);
  readonly lineDash = input<string>('');
  readonly pointHoverRadius = input<number>(7);
  readonly pointStrokeWidth = input<number>(2);
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(11);
  readonly labelFontWeight = input<number>(600);
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Sample data as a signal so "Randomize Data" can re-roll it (ranks re-derive).
  readonly sampleData = signal<NgeBumpDataPoint[]>(buildBumpData());

  // Re-roll every series' values across the years (keeps SERIES_IDS first-seen order).
  randomizeData(): void {
    this.sampleData.set(
      SERIES_IDS.flatMap(seriesId =>
        YEARS.map(year => ({ seriesId, value: Math.floor(Math.random() * 80) + 20, x: year }))
      )
    );
  }

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // A standalone interactive legend above the chart. Clicking a series drops its
  // rank line from the chart but keeps it listed (dimmed) so it can be toggled back.

  // Series toggled OFF. Immutable Set (replaced, never mutated) so the signal fires.
  private readonly hiddenSeries = signal<Set<string>>(new Set());

  // Series palette from the five color controls (empty entries dropped).
  readonly palette = computed<string[]>(() =>
    [
      this.seriesColor1(),
      this.seriesColor2(),
      this.seriesColor3(),
      this.seriesColor4(),
      this.seriesColor5(),
    ].filter((color): color is string => !!color)
  );

  // Stable seriesId → color over the FULL SERIES_IDS order. The bump renderer colors
  // each rank line by its first-seen index (seriesColors[i % len]), so filtering a
  // toggled-off series would shift the survivors' indices — and thus their colors.
  // Resolving colors over the complete order here (and feeding the matching stable
  // palette to the chart) pins every line's color regardless of what is visible.
  // NOTE: a per-datum `color` on NgeBumpDataPoint tints only the point FILL, not the
  // line stroke — so a stable `seriesColors` array (below), not per-point stamping, is
  // what keeps the LINES stable.
  private readonly seriesColorById = computed<Map<string, string>>(() => {
    const palette = this.palette();
    const colors = palette.length ? palette : (DEFAULT_BUMP_LAYER_THEME.line.colors ?? []);
    return new Map(
      SERIES_IDS.map((seriesId, i) => [
        seriesId,
        colors[i % colors.length] ?? 'var(--chart-primary)',
      ])
    );
  });

  // One legend entry per series (full SERIES_IDS order). A toggled-off series stays
  // listed but dimmed (opacity 0.4) so it can be toggled back on.
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

  // Visible series in stable SERIES_IDS order (= their first-seen order in the data),
  // so the palette below aligns to the renderer's series indexing.
  private readonly visibleSeries = computed<string[]>(() =>
    SERIES_IDS.filter(seriesId => !this.hiddenSeries().has(seriesId))
  );

  // Multi-series data with the toggled-off series dropped.
  readonly interactiveChartData = computed<NgeBumpDataPoint[]>(() => {
    const hidden = this.hiddenSeries();
    return this.sampleData().filter(point => !hidden.has(point.seriesId));
  });

  // Stable palette aligned to the VISIBLE series' order. Because visibleSeries
  // preserves SERIES_IDS order (= the renderer's first-seen order), each surviving
  // line is handed back exactly its full-order color.
  readonly interactiveSeriesColors = computed<string[]>(() => {
    const colorById = this.seriesColorById();
    return this.visibleSeries().map(seriesId => colorById.get(seriesId) ?? 'var(--chart-primary)');
  });

  // Toggle a series' rank line in/out (immutable Set so the signal fires).
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

  // Computed config rebuilds when ANY input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const interactive = this.interactiveLegend();

    const baseConfig = createBumpChartConfig({
      curveType: this.curveType(),
      data: interactive ? this.interactiveChartData() : this.sampleData(),
      legend: interactive
        ? undefined
        : this.showLegend()
          ? { enabled: true, position: this.legendPosition() }
          : undefined,
      pointRadius: this.pointRadius(),
      rankOrder: this.rankOrder(),
      seriesColors: interactive
        ? this.interactiveSeriesColors()
        : this.palette().length
          ? this.palette()
          : undefined,
      showLabels: this.showLabels(),
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
            },
            width: this.tooltipWidth(),
          }
        : undefined,
      xAxisLabel: this.xAxisLabel() || undefined,
      yAxisLabel: this.yAxisLabel() || undefined,
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
        axis: {
          labelFontSize: this.axisLabelFontSize(),
          tickFontSize: this.axisTickFontSize(),
        },
        bump: {
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
            fontWeight: this.labelFontWeight(),
          },
          line: {
            dash: this.lineDash() || undefined,
            width: this.lineWidth(),
          },
          point: {
            hoverRadius: this.pointHoverRadius(),
            strokeWidth: this.pointStrokeWidth(),
          },
        },
      },
    };
  });
}
