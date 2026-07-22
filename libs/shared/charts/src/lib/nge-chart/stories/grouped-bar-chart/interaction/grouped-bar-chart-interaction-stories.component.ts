import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeChartConfig, NgeGroupedBarDataPoint } from '../../../../core/config';
import type { NgeLegendItem } from '../../../../core/legend';

import { NgeChartLegendComponent } from '../../../../nge-chart-legend/nge-chart-legend.component';
import { createGroupedBarChartConfig } from '../../../../presets/grouped-bar-chart.preset';
import { NgeChartComponent } from '../../../nge-chart.component';

/** Category (band-axis) buckets shared by every group. */
const CATEGORIES = ['Avg', 'Min', 'Max'];

/**
 * Groups (series) rendered as side-by-side bars within each category — these are
 * the entries the interactive legend toggles. Three groups so the toggle visibly
 * re-lays-out the survivors.
 */
const GROUP_IDS = ['Active', 'Pending', 'Closed'];

/**
 * Per-group shade ramp (one shade per category, index-aligned to CATEGORIES).
 * Index 0 is the group's representative color — the single swatch shown for the
 * whole group in the interactive legend and the uniform fill every bar in the
 * group gets in that mode.
 */
const GROUP_SHADES: Record<string, string[]> = {
  Active: ['#4CAF50', '#81C784', '#2E7D32'],
  Closed: ['#2196F3', '#64B5F6', '#1565C0'],
  Pending: ['#FB8C00', '#FFB74D', '#EF6C00'],
};

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-grouped-bar-chart-interaction-stories',
  },
  imports: [NgeChartComponent, NgeChartLegendComponent, NgeStorybookReviewContainerComponent],
  selector: 'nge-grouped-bar-chart-interaction-stories',
  standalone: true,
  styleUrl: './grouped-bar-chart-interaction-stories.component.scss',
  templateUrl: './grouped-bar-chart-interaction-stories.component.html',
})
export class GroupedBarChartInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.FINAL;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/grouped-bar-chart/interaction';

  // Base config inputs
  readonly marginTop = input<number>(20);
  readonly marginRight = input<number>(10);
  readonly marginBottom = input<number>(20);
  readonly marginLeft = input<number>(10);

  // Layer config inputs
  readonly orientation = input<'horizontal' | 'vertical'>('vertical');
  readonly showLabels = input<boolean>(true);
  readonly showXAxis = input<boolean>(false);
  readonly showYAxis = input<boolean>(false);
  readonly showTooltip = input<boolean>(false);
  readonly showLegend = input<boolean>(true);
  readonly tooltipPosition = input<'above' | 'below' | 'follow-mouse'>('follow-mouse');
  readonly tooltipBackgroundColor = input<string>('');
  readonly tooltipBorderColor = input<string>('');
  readonly tooltipBorderWidth = input<number>(1);
  readonly tooltipDivotHeight = input<number>(12);
  readonly tooltipDivotWidth = input<number>(24);
  readonly tooltipHeight = input<number>(65);
  readonly tooltipWidth = input<number>(150);

  // Legend inputs
  readonly legendPosition = input<'bottom' | 'left' | 'right' | 'top'>('bottom');
  /** Suppress the internal legend and render the standalone interactive <nge-chart-legend> above the chart. */
  readonly interactiveLegend = input<boolean>(false);

  // Theme inputs - Bar styling
  readonly barColor = input<string>('');
  readonly barHoverColor = input<string>('');
  readonly barRadius = input<number>(2);

  // Theme inputs - Label styling
  readonly labelColor = input<string>('');
  readonly labelFontSize = input<number>(11);

  // Theme inputs - Axis styling
  readonly axisLabelFontSize = input<number>(14);
  readonly axisTickFontSize = input<number>(12);

  // Sample data as signal for dynamic updates
  readonly sampleData = signal<NgeGroupedBarDataPoint[]>(this.buildSeries());

  // Randomize data values
  randomizeData(): void {
    this.sampleData.set(this.buildSeries());
  }

  // --- Interactive-legend mode (interactiveLegend control) --------------------
  // Groups toggled OFF via the external interactive legend. Stored as an
  // immutable Set (replaced, never mutated) so updates fire the signal.
  private readonly hiddenGroups = signal<Set<string>>(new Set());

  // Stable groupId → color over the FULL GROUP_IDS order. Grouped-bar colors are
  // per-datum — the renderer fills each bar straight from `d.color` (never by
  // series index like the stacked bar), so filtering a toggled-off group can't
  // shift the survivors' colors. We still resolve every group's color from this
  // one stable map (index 0 of its shade ramp) and stamp it onto each datum in
  // chartData, so the legend swatch and the bars share a single source of truth
  // and stay identical as groups toggle. Mirrors extractGroupedBarLegendItems.
  private readonly groupColorById = new Map<string, string>(
    GROUP_IDS.map(groupId => [groupId, GROUP_SHADES[groupId][0]])
  );

  // One legend entry per group (full GROUP_IDS order). A toggled-off group stays
  // listed but dimmed (opacity 0.4) so it can be toggled back on.
  readonly legendItems = computed<NgeLegendItem[]>(() => {
    const hidden = this.hiddenGroups();
    return GROUP_IDS.map(groupId => {
      const isHidden = hidden.has(groupId);
      return {
        color: this.groupColorById.get(groupId) ?? 'var(--chart-primary)',
        id: groupId,
        label: groupId,
        opacity: isHidden ? 0.4 : 1,
        selected: !isHidden,
      };
    });
  });

  // Data fed to the preset. In interactiveLegend mode the toggled-off groups are
  // dropped and every remaining point is stamped with its group's stable color so
  // the bars render uniformly per group and the legend swatch matches exactly.
  // Otherwise the raw (per-bar shaded) sample data flows through unchanged.
  readonly chartData = computed<NgeGroupedBarDataPoint[]>(() => {
    const data = this.sampleData();
    if (!this.interactiveLegend()) {
      return data;
    }
    const hidden = this.hiddenGroups();
    return data
      .filter(point => !hidden.has(point.groupId))
      .map(point => ({ ...point, color: this.groupColorById.get(point.groupId) }));
  });

  // Toggle a group in/out of the chart (immutable Set so the signal fires).
  onLegendItemClick(item: NgeLegendItem): void {
    const key = item.id ?? item.label;
    this.hiddenGroups.update(prev => {
      const next = new Set(prev);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      return next;
    });
  }

  // Computed config that rebuilds when any input changes
  readonly config = computed<NgeChartConfig>(() => {
    const baseConfig = createGroupedBarChartConfig({
      data: this.chartData(),
      legend: this.interactiveLegend()
        ? undefined // external interactive legend takes over
        : this.showLegend()
          ? {
              enabled: true,
              position: this.legendPosition(),
            }
          : undefined,
      orientation: this.orientation(),
      showLabels: this.showLabels(),
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
    });

    // Apply base and theme overrides from controls
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
        'grouped-bar': {
          bar: {
            color: this.barColor() || undefined,
            hoverColor: this.barHoverColor() || undefined,
            radius: this.barRadius(),
          },
          label: {
            color: this.labelColor() || undefined,
            fontSize: this.labelFontSize(),
          },
        },
      },
    };
  });

  // Fresh values for every group × category, each bar keeping its shade-ramp color.
  private buildSeries(): NgeGroupedBarDataPoint[] {
    return GROUP_IDS.flatMap(groupId =>
      CATEGORIES.map((category, i) => ({
        color: GROUP_SHADES[groupId][i],
        groupId,
        label: category,
        value: Math.floor(Math.random() * 200) + 100,
      }))
    );
  }
}
