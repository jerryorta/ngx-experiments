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

import type { ChartsTooltipCalc } from './charts-tooltip.calc';
import type { ChartTooltipState } from './charts-tooltip.model';

import { defaultChartTooltipState } from './charts-tooltip.model';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.nge-charts-tooltip--chromeless]': 'chromeless()',
    '[style.width.px]': 'chromeless() ? null : chartTooltipState().svgWidth - 1',
    class: 'nge-charts-tooltip',
  },
  imports: [],
  selector: 'nge-charts-tooltip',
  styleUrl: './charts-tooltip.component.scss',
  templateUrl: './charts-tooltip.component.html',
})
export class ChartsTooltipComponent implements OnDestroy {
  private _cd: ChangeDetectorRef = inject(ChangeDetectorRef);
  private _onDestroy$: Subject<boolean> = new Subject();

  /**
   * The tooltip calculator instance
   */
  readonly calc = input.required<ChartsTooltipCalc<any>>();

  /**
   * When true, the SVG bubble chrome is not rendered — only the projected content.
   * Lets a consumer's `#ngeChartTooltip` template fully replace the tooltip with
   * its own chrome (the "bring your own tooltip" mode).
   */
  readonly chromeless = input<boolean>(false);

  readonly chartTooltipState: WritableSignal<ChartTooltipState> = signal(defaultChartTooltipState);

  constructor() {
    // Subscribe to calc observables when calc input changes
    effect(onCleanup => {
      const calcValue = this.calc();
      if (!calcValue) return;

      const stateSubscription = calcValue.chartTooltipState$
        .pipe(takeUntil(this._onDestroy$))
        .subscribe((state: ChartTooltipState) => {
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
