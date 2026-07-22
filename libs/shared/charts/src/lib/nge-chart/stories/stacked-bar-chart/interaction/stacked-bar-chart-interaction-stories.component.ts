import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeStackedBarDataPoint } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { DEFAULT_STACKED_BAR_LAYER_THEME } from '../../../../core/theme/nge-chart-theme.defaults';
import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createStackedBarChartConfig } from '../../../../presets/stacked-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Shared band-axis categories (quarters) for the interaction dataset. */
const QUARTERS = ['Q1', 'Q2', 'Q3', 'Q4'];

/** Stack series driven by the controls. */
const SERIES_IDS = ['Cloud', 'Licenses', 'Services', 'Support'];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'stacked-bar-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'stacked-bar-chart-interaction-stories',
  standalone: true,
  styleUrl: './stacked-bar-chart-interaction-stories.component.scss',
  templateUrl: './stacked-bar-chart-interaction-stories.component.html',
})
export class StackedBarChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/stacked-bar-chart/interaction';

  // Base - Margins
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(20);
  readonly marginBottom = input<number>(45);
  readonly marginLeft = input<number>(55);

  // Layer - Layout
  readonly stackOffset = input<'expand' | 'none'>('none');
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly marimekko = input<boolean>(false);
  readonly barPadding = input<number>(0.2);
  readonly barRadius = input<number>(0);
  readonly animationMs = input<number>(300);

  // Layer - Visibility
  readonly showLabels = input<boolean>(true);
  readonly showXAxis = input<boolean>(true);
  readonly showYAxis = input<boolean>(true);
  readonly showXGrid = input<boolean>(false);
  readonly showYGrid = input<boolean>(false);
  readonly xAxisLabel = input<string>('Quarter');
  readonly yAxisLabel = input<string>('Revenue ($K)');

  // Layer - Legend
  readonly showLegend = input<boolean>(true);
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('bottom');
  /** Suppress the internal legend and render the standalone interactive <nge-chart-legend> above the chart. */
  readonly interactiveLegend = input<boolean>(false);

  // Layer - Tooltip
  readonly showTooltip = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);

  // Theme - Series Palette
  readonly seriesColor1 = input<string>('#1E88E5');
  readonly seriesColor2 = input<string>('#43A047');
  readonly seriesColor3 = input<string>('#FB8C00');
  readonly seriesColor4 = input<string>('#8E24AA');
  readonly barStroke = input<string>('');
  readonly barStrokeWidth = input<number>(1);

  // Theme - Label Styling
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(10);
  readonly labelFontWeight = input<number>(500);

  // Theme - Axis Styling
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Sample data as a signal so the button can re-roll it.
  readonly sampleData = signal<NgeStackedBarDataPoint[]>(this.buildSeries());

  randomizeData(): void {
    this.sampleData.set(this.buildSeries());
  }

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // Series toggled OFF via the external interactive legend. Stored as an
  // immutable Set (replaced, never mutated) so updates fire the signal.
  private readonly hiddenSeries = signal<Set<string>>(new Set());

  // Series palette from the four color controls (empty entries dropped). Shared
  // by the config below AND the stable color map.
  readonly palette = computed<string[]>(() =>
    [this.seriesColor1(), this.seriesColor2(), this.seriesColor3(), this.seriesColor4()].filter(
      (color): color is string => !!color
    )
  );

  // Stable seriesId → color over the FULL SERIES_IDS order. The renderer colors
  // each segment by its first-seen series index (palette[i % len]), so simply
  // filtering a toggled-off series would shift the survivors' indices — and thus
  // their colors. Resolving colors here over the complete order (and stamping
  // them onto each datum in chartData) pins every series' color regardless of
  // what is currently visible. Mirrors extractStackedBarChartLegendItems.
  private readonly seriesColorById = computed<Map<string, string>>(() => {
    const palette = this.palette();
    const colors = palette.length ? palette : (DEFAULT_STACKED_BAR_LAYER_THEME.bar.colors ?? []);
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
  // dropped and every remaining point is stamped with its STABLE color so the
  // renderer never recolors survivors as their indices shift. Otherwise the raw
  // sample data flows through unchanged.
  readonly chartData = computed<NgeStackedBarDataPoint[]>(() => {
    const data = this.sampleData();
    if (!this.interactiveLegend()) {
      return data;
    }
    const colorById = this.seriesColorById();
    const hidden = this.hiddenSeries();
    return data
      .filter(point => !hidden.has(point.seriesId))
      .map(point => ({ ...point, color: colorById.get(point.seriesId) }));
  });

  // Toggle a series in/out of the stack (immutable Set so the signal fires).
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

    const baseConfig = createStackedBarChartConfig({
      animationMs: this.animationMs(),
      bandWidthAccessor: this.marimekko() ? (_category, total) => total : undefined,
      barPadding: this.barPadding(),
      barRadius: this.barRadius(),
      data: this.chartData(),
      legend: this.interactiveLegend()
        ? undefined // external interactive legend takes over
        : this.showLegend()
          ? { enabled: true, position: this.legendPosition() }
          : undefined,
      orientation: this.orientation(),
      seriesColors: palette.length ? palette : undefined,
      showLabels: this.showLabels(),
      showXAxis: this.showXAxis(),
      showXGrid: this.showXGrid(),
      showYAxis: this.showYAxis(),
      showYGrid: this.showYGrid(),
      stackOffset: this.stackOffset(),
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
      theme: {
        axis: {
          labelFontSize: this.axisLabelFontSize(),
          tickFontSize: this.axisTickFontSize(),
        },
        'stacked-bar': {
          bar: {
            stroke: this.barStroke() || undefined,
            strokeWidth: this.barStrokeWidth(),
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

  // Fresh long-format values for every series × quarter.
  private buildSeries(): NgeStackedBarDataPoint[] {
    return SERIES_IDS.flatMap(seriesId =>
      QUARTERS.map(category => ({
        category,
        seriesId,
        value: Math.round(20 + Math.random() * 180),
      }))
    );
  }
}
