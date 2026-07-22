import { Component, computed, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  NgeChartConfig,
  NgeGroupedBarDataPoint,
  NgeStackedBarDataPoint,
} from '../../../core/config';
import type { NgeTooltipContent } from '../../../core/tooltip';

import { createGroupedBarChartConfig, createStackedBarChartConfig } from '../../../presets';
import { NgeChartComponent } from '../../nge-chart.component';
import {
  colorByLabel,
  colorBySeries,
  GROUPED_DATA,
  pieConfigsByColumn,
  pieConfigsByGroup,
  STACK_COLORS,
  STACKED_DATA,
} from './chart-in-tooltip-demo-data';

type ChartInTooltipVariant = 'grouped' | 'stacked';

/**
 * Base stacked-column chart. Its custom `formatContent` sets the tooltip `label` to
 * the COLUMN identity (`category`) — constant across a column's segments — so the
 * hovered key stays stable while the pointer moves within one column, and the
 * enter-driven `position: 'above'` avoids per-mousemove emission.
 */
function buildStackedConfig(): NgeChartConfig {
  return createStackedBarChartConfig({
    data: STACKED_DATA,
    legend: { enabled: true, position: 'bottom' },
    // Reserve a top margin >= tooltip.height + ~12 so the enter-driven 'above'
    // tooltip (a ~165px-tall card) always clears the top of the plot, for ANY bar
    // height. The bar layer's tooltip-Y is unclamped, so we make the room HERE
    // rather than change the shared renderer (keeps the charts surface intact).
    margin: { bottom: 44, left: 56, right: 24, top: 180 },
    seriesColors: [...STACK_COLORS],
    showXAxis: true,
    showYAxis: true,
    tooltip: {
      enabled: true,
      formatContent: (d: NgeStackedBarDataPoint): NgeTooltipContent => ({
        label: d.category,
        value: d.value,
      }),
      height: 165,
      position: 'above',
      width: 165,
    },
    xAxisLabel: 'Quarter',
    yAxisLabel: 'Cost (USD)',
    // Headroom so the tallest column isn't flush against the plot's top edge.
    yDomain: [0, 8500],
  });
}

/** Base grouped-bar chart; the tooltip `label` is the GROUP identity (`groupId`). */
function buildGroupedConfig(): NgeChartConfig {
  return createGroupedBarChartConfig({
    data: GROUPED_DATA,
    legend: { enabled: true, position: 'bottom' },
    // Same reserved-top-margin rationale as the stacked variant above. The grouped
    // preset applies its own value headroom (1.1x), so no explicit domain is needed.
    margin: { bottom: 44, left: 56, right: 24, top: 180 },
    showXAxis: true,
    showYAxis: true,
    tooltip: {
      enabled: true,
      formatContent: (d: NgeGroupedBarDataPoint): NgeTooltipContent => ({
        label: d.groupId,
        value: d.value,
      }),
      height: 165,
      position: 'above',
      width: 165,
    },
    xAxisLabel: 'Device',
    yAxisLabel: 'Sessions',
  });
}

/**
 * Business purpose: capability demo (ARCH-228) proving the pluggable Angular tooltip
 * (`#ngeChartTooltip`, ARCH-213) can host a NESTED `<nge-chart>`. Hovering a bar
 * column renders a donut/pie of that column's parts inside the chromeless tooltip —
 * pure composition of existing presets, no new library surface.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'chart-in-tooltip-stories' },
  imports: [NgeChartComponent, NgeStorybookReviewContainerComponent],
  selector: 'chart-in-tooltip-stories',
  standalone: true,
  styleUrl: './chart-in-tooltip-stories.component.scss',
  templateUrl: './chart-in-tooltip-stories.component.html',
})
export class ChartInTooltipStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/charts/src/lib/nge-chart/stories/chart-in-tooltip';

  /** Which base chart to demo: a stacked column → donut of its segments, or a
   * grouped column → pie of the group's series. */
  readonly variant = input<ChartInTooltipVariant>('stacked');

  /** Base chart config for the active variant. */
  readonly config = computed<NgeChartConfig>(() =>
    this.variant() === 'stacked' ? buildStackedConfig() : buildGroupedConfig()
  );

  /** Per-column pie/donut configs, built ONCE per variant. Looking one up by the
   * hovered `content.label` returns a stable object reference, so the nested D3
   * chart is never rebuilt on hover (no per-mousemove thrash). */
  private readonly pieByColumn = computed<Map<string, NgeChartConfig>>(() =>
    this.variant() === 'stacked'
      ? pieConfigsByColumn(STACKED_DATA, colorBySeries)
      : pieConfigsByGroup(GROUPED_DATA, colorByLabel)
  );

  /** The nested chart config for the hovered column, or `undefined` when the tooltip
   * is hidden / the column is unknown (the template guards with `@if`). */
  pieConfigFor(content: NgeTooltipContent | null): NgeChartConfig | undefined {
    return this.pieByColumn().get(content?.label ?? '');
  }
}
