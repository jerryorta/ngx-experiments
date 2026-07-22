import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeAreaDataPoint, NgeChartConfig } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_AREA_LAYER_THEME } from '../../../../core/theme/nge-chart-theme.defaults';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createAreaChartConfig } from '../../../../presets/area-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Shared categorical x axis for the interaction dataset. */
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'];

/** The three stacked series driven by the controls; 'overlaid' unsets stacking. */
const SERIES_IDS = ['Organic', 'Paid', 'Referral'];

/** Radio option that maps to an unset `stackOffset` (overlaid, non-summing). */
type StackControl = 'diverging' | 'expand' | 'none' | 'overlaid' | 'wiggle';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'area-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'area-chart-interaction-stories',
  standalone: true,
  styleUrl: './area-chart-interaction-stories.component.scss',
  templateUrl: './area-chart-interaction-stories.component.html',
})
export class AreaChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/area-chart/interaction';

  // Base - Margins
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(50);

  // Layer
  readonly stackOffset = input<StackControl>('none');
  readonly fillOpacity = input<number>(0.3);
  readonly showLine = input<boolean>(false);
  readonly curveType = input<'linear' | 'monotone' | 'step'>('linear');
  readonly animationMs = input<number>(300);

  // Legend
  readonly legendEnabled = input<boolean>(true);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('bottom');
  /** Suppress the internal legend and render the standalone interactive <nge-chart-legend> above the chart. */
  readonly interactiveLegend = input<boolean>(false);

  // Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(140);

  // Axis
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);
  readonly showXGrid = input<boolean>(false);
  readonly showYGrid = input<boolean>(false);
  readonly xAxisLabel = input<string>('Month');
  readonly yAxisLabel = input<string>('Sessions (K)');

  // Fixed 3-series seed; the button re-rolls it with fresh values.
  readonly seedData = signal<NgeAreaDataPoint[]>(this.buildSeries());

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // Series toggled OFF via the external interactive legend. Stored as an
  // immutable Set (replaced, never mutated) so updates fire the signal.
  private readonly hiddenSeries = signal<Set<string>>(new Set());

  // Stable seriesId → color over the FULL SERIES_IDS order. The area renderer
  // colors each series by its first-seen index (fill = `palette[i % len]` via
  // seriesColorFor) and IGNORES `NgeAreaDataPoint.color` for the fill, so simply
  // filtering a toggled-off series would shift the survivors' indices — and thus
  // recolor them. Pinning the color here (and re-deriving a matching seriesColors
  // palette for the visible series below) keeps every series' color fixed. This
  // story has no palette control, so the map tracks the theme's fill.colors — the
  // exact palette the renderer falls back to when seriesColors is unset.
  private readonly seriesColorById = computed<Map<string, string>>(() => {
    const colors = DEFAULT_AREA_LAYER_THEME.fill.colors ?? [];
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

  // Data fed to the preset. In interactiveLegend mode the toggled-off series are
  // dropped so the area re-renders (and re-stacks) without them; otherwise the
  // raw seed flows through unchanged. NOTE: unlike the stacked-bar story we do
  // NOT stamp a per-datum `color` here — the area renderer derives the fill purely
  // from the series index and ignores `NgeAreaDataPoint.color` for the fill, so
  // color stability is carried entirely by `visibleSeriesColors` below.
  readonly chartData = computed<NgeAreaDataPoint[]>(() => {
    const data = this.seedData();
    if (!this.interactiveLegend()) {
      return data;
    }
    const hidden = this.hiddenSeries();
    return data.filter(point => !hidden.has(point.seriesId ?? ''));
  });

  // Stable palette aligned to the VISIBLE series' post-filter order. After a
  // series is hidden, buildAreaSeries re-indexes the survivors 0..n-1 in
  // first-seen order; handing the renderer their pinned colors in that same order
  // makes its `seriesColors[index]` resolve back to each series' stable color.
  readonly visibleSeriesColors = computed<string[]>(() => {
    const colorById = this.seriesColorById();
    const hidden = this.hiddenSeries();
    return SERIES_IDS.filter(seriesId => !hidden.has(seriesId)).map(
      seriesId => colorById.get(seriesId) ?? 'var(--chart-primary)'
    );
  });

  // Toggle a series in/out of the chart (immutable Set so the signal fires).
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

  // Rebuilds whenever any control (or the re-rolled seed) changes. The preset is
  // called directly, keeping the story focused on createAreaChartConfig.
  readonly config = computed<NgeChartConfig>(() => {
    const offset = this.stackOffset();
    const interactiveLegend = this.interactiveLegend();
    const baseConfig = createAreaChartConfig({
      animationMs: this.animationMs(),
      curveType: this.curveType(),
      data: this.chartData(),
      fillOpacity: this.fillOpacity(),
      legend: interactiveLegend
        ? { enabled: false } // external interactive legend takes over
        : this.legendEnabled()
          ? { enabled: true, position: this.legendPosition() }
          : { enabled: false },
      seriesColors: interactiveLegend ? this.visibleSeriesColors() : undefined,
      showLine: this.showLine(),
      showXAxis: this.showXAxis(),
      showXGrid: this.showXGrid(),
      showYAxis: this.showYAxis(),
      showYGrid: this.showYGrid(),
      stackOffset: offset === 'overlaid' ? undefined : offset,
      tooltip: this.showTooltip()
        ? {
            enabled: true,
            height: this.tooltipHeight(),
            position: this.tooltipPosition(),
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
    };
  });

  randomizeData(): void {
    this.seedData.set(this.buildSeries());
  }

  // Three all-positive monthly series so the stacking modes stay legible.
  private buildSeries(): NgeAreaDataPoint[] {
    return SERIES_IDS.flatMap(seriesId =>
      MONTHS.map(month => ({ seriesId, x: month, y: Math.round(8 + Math.random() * 28) }))
    );
  }
}
