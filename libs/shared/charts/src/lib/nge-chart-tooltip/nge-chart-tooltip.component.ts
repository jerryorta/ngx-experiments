import type { OnDestroy, WritableSignal } from '@angular/core';

import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  effect,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

import type { NgeChartTooltipCalc } from './nge-chart-tooltip.calc';
import type { NgeChartTooltipState } from './nge-chart-tooltip.model';

import { defaultNgeChartTooltipState } from './nge-chart-tooltip.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.nge-chart-tooltip--chromeless]': 'chromeless()',
    '[style.width.px]': 'chromeless() ? null : chartTooltipState().svgWidth - 1',
    class: 'nge-chart-tooltip',
  },
  imports: [],
  selector: 'nge-chart-tooltip',
  styleUrl: './nge-chart-tooltip.component.scss',
  templateUrl: './nge-chart-tooltip.component.html',
})
export class NgeChartTooltipComponent implements OnDestroy {
  private _cd: ChangeDetectorRef = inject(ChangeDetectorRef);
  private _onDestroy$: Subject<boolean> = new Subject();

  /**
   * The tooltip calculator instance
   */
  readonly calc = input.required<NgeChartTooltipCalc<any>>();

  /**
   * When true, the SVG bubble chrome is not rendered — only the projected content.
   * Lets a consumer's `#ngeChartTooltip` template fully replace the tooltip with
   * its own chrome (the "bring your own tooltip" mode).
   */
  readonly chromeless = input<boolean>(false);

  readonly chartTooltipState: WritableSignal<NgeChartTooltipState> = signal(
    defaultNgeChartTooltipState
  );

  constructor() {
    // Subscribe to calc observables when calc input changes
    effect(onCleanup => {
      const calcValue = this.calc();
      if (!calcValue) return;

      const stateSubscription = calcValue.chartTooltipState$
        .pipe(takeUntil(this._onDestroy$))
        .subscribe((state: NgeChartTooltipState) => {
          this.chartTooltipState.set(state);
          this._cd.detectChanges();
        });

      onCleanup(() => {
        stateSubscription.unsubscribe();
      });
    });
  }

  ngOnDestroy() {
    this._onDestroy$.next(true);
  }
}
