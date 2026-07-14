import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeLegendItem } from '../core/legend';

/**
 * Reusable, chart-agnostic legend component — usable standalone, anywhere.
 * Renders color swatches + labels horizontally or vertically.
 *
 * `<nge-chart>` renders one internally from `config.legend`, but the same
 * component can be placed OUTSIDE the chart (custom headers, side panels)
 * and driven by any `NgeLegendItem[]` source — e.g.
 * `NgeScatterChartTransform.legendItems()`. Its contract doubles as the
 * build guideline for fully custom app legends: consume `NgeLegendItem[]`
 * (id / color / label / opacity / selected) and emit the clicked item.
 *
 * When `interactive` is true, entries render as buttons and clicks emit
 * `itemClick` — pair with a transform (e.g. NgeScatterChartTransform) to
 * drive series selection. Item `opacity`/`selected` reflect that state.
 *
 * @example
 * <nge-chart-legend [items]="legendItems" />
 * <nge-chart-legend [items]="legendItems" orientation="vertical" swatchShape="line" />
 * <nge-chart-legend
 *   [items]="transform.legendItems()"
 *   [interactive]="true"
 *   swatchShape="circle"
 *   (itemClick)="transform.onLegendItemClick($event)"
 * />
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-chart-legend' },
  selector: 'nge-chart-legend',
  standalone: true,
  styleUrl: './nge-chart-legend.component.scss',
  templateUrl: './nge-chart-legend.component.html',
})
export class NgeChartLegendComponent {
  /** Legend items to display */
  readonly items = input.required<NgeLegendItem[]>();
  /** Layout direction. Default: 'horizontal' */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
  /** Render entries as clickable buttons that emit `itemClick`. Default: false */
  readonly interactive = input<boolean>(false);
  /**
   * Swatch shape matching the mark it represents: 'circle' for scatter points,
   * 'line' for line series, 'square' for bars. Default: 'square'
   */
  readonly swatchShape = input<'circle' | 'line' | 'square'>('square');

  /** Emitted when an interactive legend entry is clicked */
  readonly itemClick = output<NgeLegendItem>();
}
