import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';

import type { NgeLegendItem } from '../core/legend';

/**
 * Reusable chart legend component.
 * Renders color swatches + labels horizontally or vertically.
 * Works with any chart type — just pass `NgeLegendItem[]`.
 *
 * @example
 * <nge-chart-legend [items]="legendItems" />
 * <nge-chart-legend [items]="legendItems" orientation="vertical" />
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-chart-legend' },
  selector: 'nge-chart-legend',
  standalone: true,
  styleUrl: './nge-chart-legend.component.scss',
  template: `
    <div class="nge-chart-legend-list" [class.nge-chart-legend-list--vertical]="orientation() === 'vertical'">
      @for (item of items(); track item.label) {
        <div class="nge-chart-legend-item">
          <span class="nge-chart-legend-swatch" [style.background-color]="item.color"></span>
          <span class="nge-chart-legend-label">{{ item.label }}</span>
        </div>
      }
    </div>
  `,
})
export class NgeChartLegendComponent {
  /** Legend items to display */
  readonly items = input.required<NgeLegendItem[]>();
  /** Layout direction. Default: 'horizontal' */
  readonly orientation = input<'horizontal' | 'vertical'>('horizontal');
}
