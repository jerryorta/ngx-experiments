import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  Renderer2,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeTableState } from '../nge-table-state';
import type { NgeCellContext } from '../slots';

import { NGE_RANGE_CELL_ATTRIBUTE, NgeRangeBridge } from './nge-range-bridge';
import {
  ngeRangeCellKey,
  isNgeCellInRange,
  isNgeRangeFocusCell,
  normalizeNgeRangeState,
} from './nge-range-state';

/**
 * The cell this overlay sits inside.
 *
 * ⚠️ The one core class name this component depends on, and it is the same
 * documented cost the stylesheet's `:has()` already carries — the dependency a
 * theme has. There is no alternative that is not a core edit: the table's own
 * markup identifies a cell by `role` and `aria-colindex`, never by record, so an
 * addon that needs to find "the cell this context belongs to" in the DOM either
 * asks core for an attribute it does not have or reaches for the class it does.
 */
const CELL_SELECTOR = '.nge-table__cell';

/**
 * `<nge-range-overlay>` — what makes a selected cell look selected, and what makes
 * the drag gesture possible.
 *
 * Projected into the existing `cell-overlay` render slot, so the table's own
 * template is untouched:
 *
 * ```html
 * <nge-table [config]="config" [(state)]="state">
 *   <ng-template ngeTableSlot="cell-overlay" let-cell>
 *     <nge-range-overlay [cell]="cell" [state]="state()" />
 *   </ng-template>
 * </nge-table>
 * ```
 *
 * One template covers every column: `ngeTableSlotTemplateFor` falls back to the
 * shared registration when a column has none of its own. It also composes with
 * ARCH-250's highlight overlay in the same slot — two independently styled marks on
 * one cell is the arrangement the epic settled on, not a collision.
 *
 * **It renders nothing.** The element exists to carry a class and to publish its
 * cell's identity, and the stylesheet paints the cell *around* it with `:has()`.
 * That indirection is what lets an addon tint a cell it does not own:
 * `.nge-table__cell` is neither positioned nor a stacking context (both deliberate
 * — see ARCH-243), so an absolutely-positioned overlay would escape to the table
 * host, and giving the cell `position: relative` would be a core edit.
 *
 * **It also stamps {@link NGE_RANGE_CELL_ATTRIBUTE} onto the enclosing cell**, and
 * hands {@link NgeRangeBridge} the table root reached from it. That attribute is
 * the gesture's whole hit-test key, which is what keeps the drag independent of any
 * core attribute — see the bridge. Written from an `afterRenderEffect` because it
 * is a DOM write against an element this component does not own: reactive, so a
 * recycled node re-publishes, and post-render, so the cell is certain to be there.
 *
 * ⚠️ **Reactivity comes from `range`, not from the table.** Virtualization recycles
 * DOM, so this component must never hold a mark of its own — the node showing row 12
 * is the node that showed row 4 a moment ago. Everything it displays re-derives from
 * the two inputs on every pass, which is also why binding `state` on `<nge-table>`
 * is a requirement rather than a nicety.
 *
 * @typeParam TRow - The shape of one row of data.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.nge-range-overlay--focus]': 'isFocusCell()',
    '[class.nge-range-overlay--on]': 'isInRange()',
    class: 'nge-range-overlay',
  },
  selector: 'nge-range-overlay',
  styleUrl: './nge-range-overlay.component.scss',
  templateUrl: './nge-range-overlay.component.html',
})
export class NgeRangeOverlayComponent<TRow> {
  /**
   * The bridge is optional so the component degrades rather than throws when it is
   * used without {@link provideNgeCellRange} — the cell still publishes its key,
   * and only the column-order resolution (and therefore the paint) is lost, which
   * is the part that genuinely needs the table.
   */
  private readonly bridge = inject(NgeRangeBridge, { optional: true });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly renderer = inject(Renderer2);

  /** The slot context, bound straight from `let-cell`. */
  readonly cell = input.required<NgeCellContext<TRow>>();

  /**
   * The host's **whole** table state, not just its range slice.
   *
   * ⚠️ **The width of this input is load-bearing, and narrowing it to
   * `state().ngeRange` is a silent, shipped-behaviour bug.** Membership is a
   * function of three things — the rectangle, the row order, and the column order —
   * and the last two are functions of sorting, filtering, pinning and column order,
   * none of which live in the range slice. A `computed` re-runs only when an input
   * changes identity, so with a slice-shaped input a **sort invalidates nothing**:
   * `state.ngeRange` is untouched, `getSortedRowModel` reorders the same `Row`
   * instances rather than rebuilding them, `getAllCells` is memoised per row and the
   * slot context per `Cell`, and both `@for`s track by id — so every input holds
   * still while the view order moves underneath, and the painted block quietly
   * degenerates into an enumeration of whatever was under the pointer at drag time.
   *
   * Taking the whole state makes the dependency true by construction. It is also
   * what a consumer already holds, so it is the shorter binding as well as the
   * correct one.
   *
   * ⚠️ A column reorder does **not** exhibit the bug, which is why it must not be
   * used to check for it: `columnOrder` invalidates the engine's leaf-column memo,
   * so `getAllCells` rebuilds and the `cell` input changes on its own. Only the row
   * axis discriminates.
   */
  readonly state = input<NgeTableState | undefined>();

  /**
   * Whether this cell falls inside any selected rectangle.
   *
   * A pure derivation of the two inputs plus the two order maps, so it belongs in
   * the component rather than in a store: there is no state here to own, and the
   * component-scoped-store rule is about reactive *state*, not about computed view
   * glue.
   *
   * The order maps come from the bridge, which holds the raw engine instance and is
   * not reactive — so `state()` is doing double duty here: it supplies the rectangle
   * *and* it is the signal that tells this computed the view may have moved. Reading
   * it first is deliberate.
   */
  readonly isInRange = computed(() => {
    const range = normalizeNgeRangeState(this.state()?.ngeRange);
    const { columnId, rowId } = this.cell();

    return isNgeCellInRange(
      range,
      rowId,
      columnId,
      this.bridge?.rowOrder() ?? new Map(),
      this.bridge?.columnOrder() ?? new Map()
    );
  });

  /**
   * Whether this cell is the active rectangle's focus — the corner a keyboard
   * extension moves and where a fill handle would sit.
   *
   * Painted differently from the rest of the block, which is what a spreadsheet
   * does and what tells a user which of several rectangles the next shift-click
   * will move.
   */
  readonly isFocusCell = computed(() => {
    const { columnId, rowId } = this.cell();

    return isNgeRangeFocusCell(normalizeNgeRangeState(this.state()?.ngeRange), rowId, columnId);
  });

  /** `rowId::columnId`, the value the gesture reads back off the cell. */
  private readonly cellKey = computed(() => {
    const { columnId, rowId } = this.cell();

    return ngeRangeCellKey(rowId, columnId);
  });

  /**
   * Publish this cell's identity, and hand the bridge the table root.
   *
   * Both are idempotent and both are re-run when the context moves, which is what
   * makes them safe under virtualization: a recycled node is a node whose `cell`
   * input changed, so the attribute is rewritten for the record now in it. The root
   * is resolved from the cell rather than injected, because a projected template's
   * component has no other route to the table it is rendering inside.
   */
  private readonly publishCell = afterRenderEffect(() => {
    const key = this.cellKey();
    const cell = this.host.nativeElement.closest(CELL_SELECTOR);

    if (!cell) {
      return;
    }

    this.renderer.setAttribute(cell, NGE_RANGE_CELL_ATTRIBUTE, key);
    this.bridge?.attachRoot(cell);
  });
}
