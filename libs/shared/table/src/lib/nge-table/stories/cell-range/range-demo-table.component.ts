import {
  Component,
  computed,
  inject,
  input,
  model,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeTableExportData } from '../../../export';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';

import {
  NgeRangeBridge,
  NgeRangeColumnHandleComponent,
  NgeRangeOverlayComponent,
  provideNgeCellRange,
} from '../../../range';
import { NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';

/**
 * One range-enabled table, with its own provider scope.
 *
 * ⚠️ **This component exists because a range is per-table, and that is a correctness
 * constraint rather than tidiness.** `provideNgeCellRange()` registers one
 * {@link NgeRangeBridge} per *injector*, and the bridge holds both the engine
 * instance and the table root the gesture is delegated from. Put the providers on a
 * story component that renders nine tables and all nine share one bridge — the last
 * to attach wins, so a drag in the first section would resolve its cells against the
 * ninth section's table and write to the wrong state.
 *
 * It is also the shape a real consumer ends up with: a feature component that owns
 * one table, its state, and its interactions.
 *
 * **Two things the highlight precedent needed and this does not**, both because the
 * bridge owns the pointer gesture itself rather than riding the event stream:
 *
 * - No `(ngeTableEvent)` binding. `cell-click` carries a `NgeCellContext` and no
 *   modifier keys, which is enough to *toggle* a mark but not to tell a plain drag
 *   from a cmd/ctrl one.
 * - No `mousedown` shift-guard on a wrapper. `NgeRangeBridge` runs its own on the
 *   table root, so the browser's text-selection default is suppressed for a
 *   shift-click and for the duration of a drag without the consumer wiring anything.
 *
 * ⚠️ **`clearOnEscape` and `selectAllOnModifierA` are BOTH off here**, and they have
 * to be for a story page rather than as a general recommendation. Both listeners are
 * on the document — nothing in the table body is focusable, so a scoped handler
 * would never fire — so on a page of several range-enabled tables one `Escape` would
 * clear every one of them. The keys are given to exactly one table, which is
 * {@link NgeTableRangeKeysDemoComponent}. A single-table application should keep
 * the defaults and needs neither component.
 *
 * @typeParam TRow - The shape of one row of data.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-range-demo',
  },
  imports: [
    NgeRangeColumnHandleComponent,
    NgeRangeOverlayComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  providers: [provideNgeCellRange({ clearOnEscape: false, selectAllOnModifierA: false })],
  selector: 'nge-table-range-demo',
  standalone: true,
  styleUrl: './range-demo-table.component.scss',
  templateUrl: './range-demo-table.component.html',
})
export class NgeTableRangeDemoComponent<TRow> {
  /** The addon's view-side reader and gesture owner, one per instance of this component. */
  protected readonly range = inject(NgeRangeBridge);

  readonly config = input.required<NgeTableConfig<TRow>>();

  /** How tall the scroll viewport is. Bound to `nge-table` itself, never a wrapper. */
  readonly maxHeight = input<number>(420);

  /**
   * The type carrier for the projected slot template.
   *
   * Never read at runtime — it exists so `TRow` has somewhere to be inferred from,
   * without which `let-cell` resolves to `NgeCellContext<unknown>` and any field
   * access on the context fails to compile. ⚠️ That failure surfaces only in
   * Storybook's own build: `shared-table` has no build target, so nothing else runs
   * `ngtsc` over a story template.
   */
  readonly rows = input.required<readonly TRow[]>();

  /**
   * Whether to project the `header-overlay` slot that selects whole columns
   * (ARCH-270).
   *
   * **Off by default, which keeps this component's existing sections unchanged** —
   * ARCH-269's stories are about the cell gesture and gain nothing from a header
   * affordance. The column-selection stories turn it on, and running both together is
   * the composition worth showing: the two templates write the SAME slice, so a
   * selected column is an ordinary rectangle the body overlay already paints.
   */
  readonly showColumnHandles = input<boolean>(false);

  /**
   * Whether to render the clear / select-all controls.
   *
   * On by default: a section a reviewer can select in but not give up is a dead end.
   * The theming story turns them off — its tables are seeded for comparison rather
   * than driven, and eight toolbars would be noise.
   */
  readonly showControls = input<boolean>(true);

  /** Two-way, so a section can read the slice back out for its readout. */
  readonly state = model.required<NgeTableState>();

  /**
   * Whether anything is selected, for the control's disabled state.
   *
   * Reads `state()` first and deliberately: that is what makes this recompute. The
   * bridge holds the raw engine instance and is not reactive, which is exactly why
   * it carries no `hasRanges()` of its own — such a method would answer off options
   * refreshed only when the adapter's proxy was last read.
   */
  readonly hasRanges = computed(() => (this.state().ngeRange?.ranges.length ?? 0) > 0);

  /** Give up every rectangle and the gesture anchor. */
  clear(): void {
    this.range.clear();
  }

  /**
   * Select every cell of the current view.
   *
   * The same thing cmd/ctrl-A reaches, called directly — so it works on this table
   * even with `selectAllOnModifierA` off, and without the engagement scoping the key
   * needs.
   */
  selectAll(): void {
    this.range.selectAll();
  }

  /**
   * Export only the selected cells — **the ARCH-248 composition.**
   *
   * One seam supplies a `NgeCellContext → boolean`; the other consumes it. The
   * export reader has never heard of cell ranges and this addon has never heard of
   * exporting; they meet on the table instance and nowhere else. The same shape
   * ARCH-251 built its CSV proof on.
   */
  exportSelected(): NgeTableExportData {
    return this.table().readNgeExportData({ cellPredicate: this.range.predicate() });
  }

  /** The same table, unfiltered — for the contrast. */
  exportEverything(): NgeTableExportData {
    return this.table().readNgeExportData();
  }

  /**
   * The table this component wraps.
   *
   * `readNgeExportData` is a method on `<nge-table>` rather than a service, so
   * reaching it is an ordinary view query — and nothing here imports `@tanstack/*`
   * to hold the result.
   */
  private readonly table = viewChild.required(NgeTableComponent<TRow>);
}
