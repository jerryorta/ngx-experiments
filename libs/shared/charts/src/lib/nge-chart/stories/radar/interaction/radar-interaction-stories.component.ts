import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeRadarDataPoint, NgeRadarRender } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_RADAR_LAYER_THEME } from '../../../../core/theme/nge-chart-theme.defaults';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createRadarChartConfig } from '../../../../presets/radar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Dimension axes (spokes) shared by every series. */
const LABELS = ['Speed', 'Power', 'Range', 'Agility', 'Defense', 'Stealth'];

/** The multi-series groups — the interactive legend toggles these. */
const SERIES_IDS = ['Falcon', 'Vortex', 'Comet'];

/** Fresh multi-series radar values (one closed polygon per series). */
function buildRadarData(): NgeRadarDataPoint[] {
  return SERIES_IDS.flatMap(seriesId =>
    LABELS.map(label => ({ label, seriesId, value: Math.round(20 + Math.random() * 70) }))
  );
}

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'radar-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'radar-interaction-stories',
  standalone: true,
  styleUrl: './radar-interaction-stories.component.scss',
  templateUrl: './radar-interaction-stories.component.html',
})
export class RadarInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/radar/interaction';

  // Base - Margins
  readonly marginTop = input<number>(40);
  readonly marginRight = input<number>(40);
  readonly marginBottom = input<number>(40);
  readonly marginLeft = input<number>(40);

  // Layer - Layout
  readonly render = input<NgeRadarRender>('area');
  readonly innerRadius = input<number>(0);
  readonly startAngle = input<number>(0);
  readonly endAngle = input<number>(6.28);
  readonly levels = input<number>(5);

  // Layer - Legend
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

  // Theme - Series Styling (fill palette; series index → colors[i % len])
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');
  readonly fillOpacity = input<number>(0.3);
  readonly lineWidth = input<number>(2);
  readonly pointRadius = input<number>(3);

  // Theme - Web Styling
  readonly axisColor = input<string>('');
  readonly gridColor = input<string>('');

  // Data held as a signal so the button can re-roll the values.
  readonly radarData = signal<NgeRadarDataPoint[]>(buildRadarData());

  // Fill palette from the three color controls (empty entries dropped).
  readonly palette = computed<string[]>(() =>
    [this.seriesColor1(), this.seriesColor2(), this.seriesColor3()].filter(
      (color): color is string => !!color
    )
  );

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // Series toggled OFF via the external interactive legend. Stored as an immutable Set
  // (replaced, never mutated) so updates fire the signal.
  private readonly hiddenSeries = signal<Set<string>>(new Set());

  // Stable seriesId → color over the FULL SERIES_IDS order. The radar renderer colors each
  // series by its first-seen index (`seriesColors[i % len]`) and IGNORES a per-datum `color`
  // for the polygon, so simply filtering a toggled-off series would shift the survivors'
  // indices — and thus recolor them. Pinning the color here (and re-deriving a matching
  // seriesColors palette for the visible series below) keeps every series' color fixed. When
  // no palette control is set the map tracks the theme's series.colors — the exact palette the
  // renderer falls back to.
  private readonly seriesColorById = computed<Map<string, string>>(() => {
    const colors = this.palette().length
      ? this.palette()
      : (DEFAULT_RADAR_LAYER_THEME.series.colors ?? []);
    return new Map(
      SERIES_IDS.map((seriesId, i) => [
        seriesId,
        colors[i % colors.length] ?? 'var(--chart-primary)',
      ])
    );
  });

  // One legend entry per series (full SERIES_IDS order). A toggled-off series stays listed but
  // dimmed (opacity 0.4) so it can be toggled back on.
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

  // Stable palette aligned to the VISIBLE series' post-filter order. After a series is hidden,
  // buildSeries re-indexes the survivors 0..n-1 in first-seen order; handing the renderer their
  // pinned colors in that same order makes its `seriesColors[index]` resolve back to each
  // series' stable color.
  private readonly visibleSeriesColors = computed<string[]>(() => {
    const colorById = this.seriesColorById();
    const hidden = this.hiddenSeries();
    return SERIES_IDS.filter(seriesId => !hidden.has(seriesId)).map(
      seriesId => colorById.get(seriesId) ?? 'var(--chart-primary)'
    );
  });

  // Data fed to the preset. In interactiveLegend mode the toggled-off series are dropped so the
  // radar re-renders without them; NOTE we do NOT stamp a per-datum `color` — the radar renderer
  // derives the fill purely from the series index, so color stability rides on
  // `visibleSeriesColors` below.
  private readonly chartData = computed<NgeRadarDataPoint[]>(() => {
    const data = this.radarData();
    if (!this.interactiveLegend()) {
      return data;
    }
    const hidden = this.hiddenSeries();
    return data.filter(point => !hidden.has(point.seriesId ?? ''));
  });

  // Toggle a series in/out of the radar (immutable Set so the signal fires).
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
    const palette = this.palette();
    const interactiveLegend = this.interactiveLegend();

    const baseConfig = createRadarChartConfig({
      data: this.chartData(),
      endAngle: this.endAngle(),
      innerRadius: this.innerRadius(),
      levels: this.levels(),
      render: this.render(),
      seriesColors: interactiveLegend
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
        radar: {
          axis: { color: this.axisColor() || undefined },
          grid: { color: this.gridColor() || undefined },
          series: {
            fillOpacity: this.fillOpacity(),
            lineWidth: this.lineWidth(),
            pointRadius: this.pointRadius(),
          },
        },
      },
    };
  });

  randomizeData(): void {
    this.radarData.set(buildRadarData());
  }
}
