import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeTableState } from '../nge-table-state';
import type { NgeCellContext } from '../slots';

import { NgeRangeBridge } from './nge-range-bridge';

/**
 * `<nge-fill-handle>` — the Excel/Numbers corner grip on the active range
 * (ARCH-271).
 *
 * Projected into the `cell-overlay` slot, beside `<nge-range-overlay>`:
 *
 * ```html
 * <ng-template ngeTableSlot="cell-overlay" let-cell>
 *   <nge-range-overlay [cell]="cell" [state]="state()" />
 *   <nge-fill-handle [cell]="cell" [state]="state()" />
 * </ng-template>
 * ```
 *
 * ⚠️ **One wrapper template, not two registrations.** `cell-overlay` resolves to one
 * template per column plus one shared fallback, so a second `ngeTableSlot="cell-overlay"`
 * would silently replace the first rather than compose with it. This is the third
 * cell-marking component in the library and the limit ARCH-269 recorded is now load
 * bearing: the consumer hosts them together, as above.
 *
 * **It renders a grip and nothing else.** Whether this cell is the corner is a
 * question only the engine can answer — it depends on the active rectangle *and* on
 * the current row and column order — so it is asked through {@link NgeRangeBridge},
 * exactly as `<nge-range-overlay>` asks about membership.
 *
 * ⚠️ **No grip while the active range is unbounded on the row axis.** A whole-column
 * selection (ARCH-270, or cmd/ctrl-A) covers every row, so it has no bottom edge to
 * hang the grip off and nothing below it to fill into. The gate lives in
 * `resolveNgeFillRegion` / `ngeFillHandleCell`, so the paint and the commit cannot
 * disagree about it.
 *
 * ⚠️ **Reactivity comes from `state`, not from the table** — the requirement
 * `<nge-range-overlay>` documents at length, and it applies with extra force here:
 * the pending fill region moves *during* a drag, and every frame of that drag is a
 * `state` write.
 *
 * @typeParam TRow - The shape of one row of data.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.nge-fill-handle--drop]': 'isDropCell()',
    '[class.nge-fill-handle--on]': 'isHandleCell()',
    '[class.nge-fill-handle--target]': 'isFillTarget()',
    class: 'nge-fill-handle',
  },
  selector: 'nge-fill-handle',
  styleUrl: './nge-fill-handle.component.scss',
  templateUrl: './nge-fill-handle.component.html',
})
export class NgeFillHandleComponent<TRow> {
  /**
   * Optional so the component degrades rather than throws without
   * {@link provideNgeCellRange} — with no bridge there is no engine to ask, so no
   * grip is drawn and nothing breaks.
   */
  private readonly bridge = inject(NgeRangeBridge, { optional: true });

  /** The slot context, bound straight from `let-cell`. */
  readonly cell = input.required<NgeCellContext<TRow>>();

  /**
   * The host's **whole** table state, never just a slice.
   *
   * ⚠️ Narrowing this is the silent, shipped-behaviour bug `<nge-range-overlay>`
   * records: where the corner *is* depends on `sorting`, `columnOrder`, `columnPinning`
   * and the range slice together, and a `computed` re-runs only when an input changes
   * identity. Taking the whole state makes the dependency true by construction — and
   * it is what drives the pending-region repaint on every frame of a drag.
   */
  readonly state = input<NgeTableState | undefined>();

  /** Whether this cell carries the grip — the active range's trailing-bottom corner. */
  readonly isHandleCell = computed(() => {
    // Read `state()` FIRST and deliberately: the bridge holds the raw engine instance
    // and is not reactive, so this is the signal that says the view may have moved.
    this.state();

    const { columnId, rowId } = this.cell();

    return this.bridge?.isFillHandle(rowId, columnId) ?? false;
  });

  /** Whether this cell sits in the block an in-flight drag would fill. */
  readonly isFillTarget = computed(() => {
    this.state();

    const { columnId, rowId } = this.cell();

    return this.bridge?.isFillTarget(rowId, columnId) ?? false;
  });

  /**
   * Whether this cell is about to leave the selection — a drag back INTO the block.
   *
   * The retraction half of the gesture, and it paints differently from a fill target on
   * purpose: one region is about to gain values, the other is about to stop being
   * selected. Sharing a style would make the two opposite outcomes look identical at the
   * moment the user is deciding between them.
   */
  readonly isDropCell = computed(() => {
    this.state();

    const { columnId, rowId } = this.cell();

    return this.bridge?.isFillDrop(rowId, columnId) ?? false;
  });
}
