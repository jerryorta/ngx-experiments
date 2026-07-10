import type { NgeChartConfig } from '@nge/charts';

import { ChangeDetectionStrategy, Component, computed, input, output, ViewEncapsulation } from '@angular/core';
import { NgeChartComponent } from '@nge/charts';

import type { LdgDonutSegment } from './ldg-donut.models';

import { createLdgDonutChartConfig } from './ldg-donut-chart.preset';

export type { LdgDonutSegment } from './ldg-donut.models';

/**
 * Domain-branded donut/pie chart. A **thin wrapper**: it maps its inputs to a
 * promotable donut *layer* (render fn + config + `--chart-*` theme + preset, in
 * this folder) and renders it through the shared `<nge-chart [config]>`. All
 * real logic lives in the layer, so the donut can promote into `@nge/charts` by
 * moving those files + registering a `'donut'` layer type — no rewrite. See
 * `docs/reference/charts.md` ("Domain charts must be promotion-ready").
 *
 * @example
 * <ldg-donut-chart
 *   [segments]="[{ label: 'Groceries', value: 62400, color: 'var(--ldg-category-1)' }]"
 *   centerLabel="Total"
 *   centerValue="$624.00"
 *   (segmentClick)="onCategoryClick($event)"
 * />
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-donut-chart' },
  imports: [NgeChartComponent],
  selector: 'ldg-donut-chart',
  styleUrl: './ldg-donut-chart.component.scss',
  templateUrl: './ldg-donut-chart.component.html',
})
export class LdgDonutChartComponent {
  /** Optional label drawn in the donut hole, e.g. 'Total'. */
  readonly centerLabel = input<string>();

  /** Optional value drawn in the donut hole, e.g. '$4,231' — pre-formatted by the caller. */
  readonly centerValue = input<string>();

  /** Slices to render, in order — arcs preserve this order rather than sorting by value. */
  readonly segments = input.required<LdgDonutSegment[]>();

  /** Whether the chart's built-in legend renders alongside the donut. */
  readonly showLegend = input(true);

  /** Inner-radius ratio: 0 renders a filled pie, closer to 1 a thinner ring. */
  readonly thickness = input(0.55);

  /** Emits the clicked segment's original data. */
  readonly segmentClick = output<LdgDonutSegment>();

  /** The donut layer wrapped in a full `NgeChartConfig` — the component is pure mapping. */
  protected readonly chartConfig = computed<NgeChartConfig>(() =>
    createLdgDonutChartConfig({
      centerLabel: this.centerLabel(),
      centerValue: this.centerValue(),
      data: this.segments(),
      legend: this.showLegend(),
      onSegmentClick: segment => this.segmentClick.emit(segment),
      thickness: this.thickness(),
    })
  );
}
