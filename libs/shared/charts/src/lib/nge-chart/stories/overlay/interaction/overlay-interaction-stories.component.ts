import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeLineDataPoint } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_LINE_LAYER_THEME } from '../../../../core/theme/nge-chart-theme.defaults';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createLineChartConfig } from '../../../../presets/line-chart.preset';
import { addOverlay } from '../../../../presets/overlay-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Series shown in the interactive-legend multi-line dataset. */
const SERIES_IDS = ['Alpha', 'Beta', 'Gamma'];

/**
 * Interaction playground for the analytical `overlay` layer.
 *
 * Every overlay option is a signal `input()` wired to a Storybook control; the
 * composed config (line host + overlay) rebuilds in a `computed`. The host uses a
 * numeric x so its scale is continuous — trendline and fan need an invertible x.
 * The `interactiveLegend` control swaps in a 3-series host with a standalone
 * <nge-chart-legend> whose clicks toggle each series' line + trend in/out.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'overlay-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'overlay-interaction-stories',
  standalone: true,
  styleUrl: './overlay-interaction-stories.component.scss',
  templateUrl: './overlay-interaction-stories.component.html',
})
export class OverlayInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/overlay/interaction';

  // === Base config inputs ===
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(24);
  readonly marginBottom = input<number>(40);
  readonly marginLeft = input<number>(50);

  // === Overlay mode ===
  readonly mode = input<'control' | 'fan' | 'trendline'>('trendline');

  // === Overlay: trendline ===
  readonly fit = input<'linear' | 'loess'>('linear');
  readonly loessBandwidth = input<number>(0.3);
  readonly showFitLine = input<boolean>(true);

  // === Overlay: control ===
  readonly sigma = input<number>(3);
  readonly showControlBand = input<boolean>(true);

  // === Overlay: fan ===
  readonly fanIntervals = input<'0.5, 0.8, 0.95' | '0.5, 0.9, 0.99' | '0.8, 0.95'>(
    '0.5, 0.8, 0.95'
  );

  // === Host visibility ===
  readonly showPoints = input<boolean>(true);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);

  // === Host tooltip ===
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');

  // === Interactive legend ===
  readonly interactiveLegend = input<boolean>(false);
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');

  // === Overlay theme ===
  readonly bandFillColor = input<string>('');
  readonly bandFillOpacity = input<number>(0.15);
  readonly fitLineColor = input<string>('');
  readonly fitLineWidth = input<number>(2);
  readonly limitLineColor = input<string>('');
  readonly meanLineColor = input<string>('');

  // Bumped by "Randomize Data" to re-roll every generated series.
  private readonly randomizeSeed = signal(0);

  // Mode-specific single-series datasets (numeric x → continuous scale).
  readonly trendData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildTrend();
  });

  readonly controlData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildControl();
  });

  readonly fanData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildFan();
  });

  // 3-series dataset for the interactive-legend mode.
  readonly multiSeriesData = computed<NgeLineDataPoint[]>(() => {
    this.randomizeSeed();
    return this.buildMultiSeries();
  });

  // The active single-series data for the current mode.
  readonly singleData = computed<NgeLineDataPoint[]>(() => {
    switch (this.mode()) {
      case 'control':
        return this.controlData();
      case 'fan':
        return this.fanData();
      default:
        return this.trendData();
    }
  });

  // Fan interval levels parsed from the preset control.
  readonly fanIntervalList = computed<number[]>(() => {
    switch (this.fanIntervals()) {
      case '0.5, 0.9, 0.99':
        return [0.5, 0.9, 0.99];
      case '0.8, 0.95':
        return [0.8, 0.95];
      default:
        return [0.5, 0.8, 0.95];
    }
  });

  // A y-domain that comfortably contains the control limits / fan bands for the
  // current mode so nothing clips (the overlay draws within the host's scales).
  readonly yDomain = computed<[number, number] | undefined>(() => {
    if (this.interactiveLegend()) {
      switch (this.mode()) {
        case 'control':
          return [0, 120];
        case 'fan':
          return [0, 140];
        default:
          return undefined;
      }
    }
    switch (this.mode()) {
      case 'control':
        return [20, 80];
      case 'fan':
        return [0, 115];
      default:
        return undefined;
    }
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

  // Stable seriesId → color over the FULL series order. The line renderer colors
  // each series by its first-seen index, so filtering a toggled-off series would
  // shift the survivors' colors — resolving them over the complete order here (and
  // feeding the matching stable palette to the chart) pins every line's color.
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

  // One legend entry per series (full order). A toggled-off series stays listed
  // but dimmed (opacity 0.4) so it can be toggled back on.
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

  // Visible series in stable SERIES_IDS order (= the renderer's first-seen order).
  private readonly visibleSeries = computed<string[]>(() =>
    SERIES_IDS.filter(seriesId => !this.hiddenSeries().has(seriesId))
  );

  // Multi-series data with the toggled-off series dropped (feeds host AND overlay).
  readonly interactiveChartData = computed<NgeLineDataPoint[]>(() => {
    const hidden = this.hiddenSeries();
    return this.multiSeriesData().filter(point => !hidden.has(point.seriesId ?? ''));
  });

  // Stable palette aligned to the VISIBLE series' order — each surviving line keeps
  // its full-order color.
  readonly interactiveSeriesColors = computed<string[]>(() => {
    const colorById = this.seriesColorById();
    return this.visibleSeries().map(seriesId => colorById.get(seriesId) ?? 'var(--chart-primary)');
  });

  // The composed config (line host + overlay) — rebuilds when any input changes.
  readonly config = computed<NgeChartConfig>(() => {
    const legend = this.interactiveLegend();
    const data = legend ? this.interactiveChartData() : this.singleData();

    const base = createLineChartConfig({
      data,
      margin: {
        bottom: this.marginBottom(),
        left: this.marginLeft(),
        right: this.marginRight(),
        top: this.marginTop(),
      },
      seriesColors: legend ? this.interactiveSeriesColors() : undefined,
      showPoints: this.showPoints(),
      showXAxis: this.showXAxis(),
      showYAxis: this.showYAxis(),
      tooltip: this.showTooltip() ? { enabled: true, position: this.tooltipPosition() } : undefined,
      yDomain: this.yDomain(),
    });

    const withOverlay = addOverlay(base, {
      data,
      fit: this.fit(),
      intervals: this.fanIntervalList(),
      loessBandwidth: this.loessBandwidth(),
      mode: this.mode(),
      showControlBand: this.showControlBand(),
      showFitLine: this.showFitLine(),
      sigma: this.sigma(),
    });

    return {
      ...withOverlay,
      theme: {
        overlay: {
          band: {
            fillColor: this.bandFillColor() || undefined,
            fillOpacity: this.bandFillOpacity(),
          },
          fitLine: {
            color: this.fitLineColor() || undefined,
            width: this.fitLineWidth(),
          },
          limitLine: {
            color: this.limitLineColor() || undefined,
          },
          meanLine: {
            color: this.meanLineColor() || undefined,
          },
        },
      },
    };
  });

  // Re-roll every generated dataset.
  randomizeData(): void {
    this.randomizeSeed.update(seed => seed + 1);
  }

  // Toggle a series' line + trend in/out (immutable Set so the signal fires).
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

  // A noisy upward series — good for a linear OR a LOESS trend.
  private buildTrend(): NgeLineDataPoint[] {
    return Array.from({ length: 12 }, (_, i) => ({
      x: i + 1,
      y: Math.round(14 + i * 3.6 + (Math.random() * 10 - 5)),
    }));
  }

  // A roughly stationary process centred near 50 — the control-chart shape.
  private buildControl(): NgeLineDataPoint[] {
    return Array.from({ length: 12 }, (_, i) => ({
      x: i + 1,
      y: Math.round(50 + (Math.random() * 16 - 8)),
    }));
  }

  // A gently rising series the fan bands widen around.
  private buildFan(): NgeLineDataPoint[] {
    return Array.from({ length: 12 }, (_, i) => ({
      x: i + 1,
      y: Math.round(42 + i * 2.6 + (Math.random() * 8 - 4)),
    }));
  }

  // 3 separated upward series so the lines read as distinct bands.
  private buildMultiSeries(): NgeLineDataPoint[] {
    const baselines: Record<string, number> = { Alpha: 54, Beta: 37, Gamma: 21 };
    return SERIES_IDS.flatMap(seriesId =>
      Array.from({ length: 12 }, (_, i) => ({
        seriesId,
        x: i + 1,
        y: Math.round((baselines[seriesId] ?? 30) + i * 1.5 + (Math.random() * 8 - 4)),
      }))
    );
  }
}
