import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeRadialBarDataPoint,
  NgeRadialBarMark,
  NgeRadialBarWedge,
} from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_RADIAL_BAR_LAYER_THEME } from '../../../../core/theme/nge-chart-theme.defaults';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createRadialBarChartConfig } from '../../../../presets/radial-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Angular categories for the `bar` mark (also the weekday columns of the `cell` grid). */
const BAR_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

/** Angular categories for the `area` mark (shared across every series). */
const AREA_LABELS = ['Q1', 'Q2', 'Q3', 'Q4'];

/** Radial rings for the `cell` mark (circular heat map). */
const CELL_BANDS = ['AM', 'PM'];

/** The multi-series groups for the `area` mark — the interactive legend toggles these. */
const SERIES_IDS = ['2022', '2023', '2024'];

/** Fresh single-series bar values (one arc per weekday). */
function buildBarData(): NgeRadialBarDataPoint[] {
  return BAR_LABELS.map(label => ({ label, value: Math.round(15 + Math.random() * 75) }));
}

/** Fresh multi-series area values (one closed radial area per series). */
function buildAreaData(): NgeRadialBarDataPoint[] {
  return SERIES_IDS.flatMap(seriesId =>
    AREA_LABELS.map(label => ({ label, seriesId, value: Math.round(15 + Math.random() * 75) }))
  );
}

/** Fresh circular-heatmap values (angular weekday × radial AM/PM ring). */
function buildCellData(): NgeRadialBarDataPoint[] {
  return CELL_BANDS.flatMap(band =>
    BAR_LABELS.map(label => ({ band, label, value: Math.round(10 + Math.random() * 90) }))
  );
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'radial-bar-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'radial-bar-interaction-stories',
  standalone: true,
  styleUrl: './radial-bar-interaction-stories.component.scss',
  templateUrl: './radial-bar-interaction-stories.component.html',
})
export class RadialBarInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/radial-bar/interaction';

  // Base - Margins
  readonly marginTop = input<number>(10);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(10);
  readonly marginLeft = input<number>(10);

  // Layer - Layout
  readonly mark = input<NgeRadialBarMark>('bar');
  readonly wedge = input<NgeRadialBarWedge>('equal');
  readonly innerRadius = input<number>(0.1);
  readonly startAngle = input<number>(0);
  readonly endAngle = input<number>(6.28);
  readonly padAngle = input<number>(0.02);

  // Layer - Legend
  /** Suppress the internal legend and render the standalone interactive <nge-chart-legend> above the chart (mark: area). */
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

  // Theme - Bar Styling (fill palette; datum index / area series index → colors[i % len])
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');

  // Theme - Cell Styling
  readonly cellColor = input<string>('');
  readonly cellMinOpacity = input<number>(0.1);

  // Theme - Area Styling
  readonly areaFillOpacity = input<number>(0.3);
  readonly areaLineWidth = input<number>(2);

  // Per-mark datasets held as signals so the button can re-roll their values. The
  // three marks need different data shapes (bar: label+value, area: +seriesId,
  // cell: +band), so `chartData` below picks the active mark's set.
  readonly barData = signal<NgeRadialBarDataPoint[]>(buildBarData());
  readonly areaData = signal<NgeRadialBarDataPoint[]>(buildAreaData());
  readonly cellData = signal<NgeRadialBarDataPoint[]>(buildCellData());

  // Fill palette from the three color controls (empty entries dropped).
  readonly palette = computed<string[]>(() =>
    [this.seriesColor1(), this.seriesColor2(), this.seriesColor3()].filter(
      (color): color is string => !!color
    )
  );

  // --- Interactive-legend mode (interactiveLegend control, mark: area) ---------
  // Series toggled OFF via the external interactive legend. Stored as an immutable
  // Set (replaced, never mutated) so updates fire the signal.
  private readonly hiddenSeries = signal<Set<string>>(new Set());

  // Stable seriesId → color over the FULL SERIES_IDS order. The area renderer colors
  // each series by its first-seen index (`seriesColors[i % len]`) and IGNORES a
  // per-datum `color` for the area fill, so simply filtering a toggled-off series
  // would shift the survivors' indices — and thus recolor them. Pinning the color
  // here (and re-deriving a matching seriesColors palette for the visible series
  // below) keeps every series' color fixed. When no palette control is set the map
  // tracks the theme's bar.colors — the exact palette the renderer falls back to.
  private readonly seriesColorById = computed<Map<string, string>>(() => {
    const colors = this.palette().length
      ? this.palette()
      : (DEFAULT_RADIAL_BAR_LAYER_THEME.bar.colors ?? []);
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

  // Stable palette aligned to the VISIBLE series' post-filter order. After a series
  // is hidden, buildAreaSeries re-indexes the survivors 0..n-1 in first-seen order;
  // handing the renderer their pinned colors in that same order makes its
  // `seriesColors[index]` resolve back to each series' stable color.
  private readonly visibleSeriesColors = computed<string[]>(() => {
    const colorById = this.seriesColorById();
    const hidden = this.hiddenSeries();
    return SERIES_IDS.filter(seriesId => !hidden.has(seriesId)).map(
      seriesId => colorById.get(seriesId) ?? 'var(--chart-primary)'
    );
  });

  // Data fed to the preset — the active mark's dataset. In interactiveLegend mode
  // (area only) the toggled-off series are dropped so the area re-renders without
  // them; NOTE we do NOT stamp a per-datum `color` — the area renderer derives the
  // fill purely from the series index, so color stability rides on
  // `visibleSeriesColors` below.
  private readonly chartData = computed<NgeRadialBarDataPoint[]>(() => {
    const mark = this.mark();
    if (mark === 'cell') {
      return this.cellData();
    }
    if (mark === 'area') {
      const data = this.areaData();
      if (!this.interactiveLegend()) {
        return data;
      }
      const hidden = this.hiddenSeries();
      return data.filter(point => !hidden.has(point.seriesId ?? ''));
    }
    return this.barData();
  });

  // Toggle a series in/out of the radial area (immutable Set so the signal fires).
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

  // Computed config rebuilds whenever any control (or the re-rolled data) changes.
  readonly config = computed<NgeChartConfig>(() => {
    const mark = this.mark();
    const palette = this.palette();
    const interactiveLegendArea = this.interactiveLegend() && mark === 'area';

    const baseConfig = createRadialBarChartConfig({
      data: this.chartData(),
      endAngle: this.endAngle(),
      innerRadius: this.innerRadius(),
      mark,
      padAngle: this.padAngle(),
      seriesColors: interactiveLegendArea
        ? this.visibleSeriesColors()
        : palette.length
          ? palette
          : undefined,
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
      wedge: this.wedge(),
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
        'radial-bar': {
          area: {
            fillOpacity: this.areaFillOpacity(),
            lineWidth: this.areaLineWidth(),
          },
          cell: {
            color: this.cellColor() || undefined,
            minOpacity: this.cellMinOpacity(),
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.barData.set(buildBarData());
    this.areaData.set(buildAreaData());
    this.cellData.set(buildCellData());
  }
}
