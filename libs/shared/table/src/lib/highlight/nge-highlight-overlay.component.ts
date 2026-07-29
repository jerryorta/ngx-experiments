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

import { NgeHighlightBridge } from './nge-highlight-bridge';
import { isNgeCellHighlighted, normalizeNgeHighlightState } from './nge-highlight-state';

/**
 * `<nge-highlight-overlay>` — what makes a highlighted cell look highlighted.
 *
 * Projected into the existing `cell-overlay` render slot, so the table's own
 * template is untouched:
 *
 * ```html
 * <nge-table [config]="config" [(state)]="state">
 *   <ng-template ngeTableSlot="cell-overlay" let-cell>
 *     <nge-highlight-overlay [cell]="cell" [state]="state()" />
 *   </ng-template>
 * </nge-table>
 * ```
 *
 * One template covers every column: `ngeTableSlotTemplateFor` falls back to the
 * shared registration when a column has none of its own.
 *
 * **It renders nothing.** The element exists only to carry a class, and the
 * stylesheet paints the cell *around* it with `:has()`. That indirection is what
 * lets an addon tint a cell it does not own: `.nge-table__cell` is neither
 * positioned nor a stacking context (both deliberate — see ARCH-243), so an
 * absolutely-positioned overlay would escape to the table host, and giving the cell
 * `position: relative` would be a core edit. The honest cost is that this addon
 * depends on core's BEM class names, exactly as a theme does.
 *
 * ⚠️ **Reactivity comes from `state`, not from the table.** Virtualization recycles
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
    '[class.nge-highlight-overlay--on]': 'isHighlighted()',
    class: 'nge-highlight-overlay',
  },
  selector: 'nge-highlight-overlay',
  styleUrl: './nge-highlight-overlay.component.scss',
  templateUrl: './nge-highlight-overlay.component.html',
})
export class NgeHighlightOverlayComponent<TRow> {
  /**
   * The bridge is optional so the component degrades rather than throws when it is
   * used without {@link provideNgeCellHighlighting} — a table then still paints
   * individually-picked cells, and only loses range resolution, which is the part
   * that genuinely needs the row model.
   */
  private readonly bridge = inject(NgeHighlightBridge, { optional: true });

  /** The slot context, bound straight from `let-cell`. */
  readonly cell = input.required<NgeCellContext<TRow>>();

  /**
   * The host's **whole** table state, not just its highlight slice.
   *
   * ⚠️ **The width of this input is load-bearing, and narrowing it to
   * `state().ngeHighlight` is a silent, shipped-behaviour bug.** A block's
   * membership is a function of two things — the descriptor and the row order — and
   * the second is a function of sorting, filtering and pinning, none of which live
   * in the highlight slice. A `computed` re-runs only when an input changes
   * identity, so with a slice-shaped input a **sort invalidates nothing**:
   * `state.ngeHighlight` is untouched, `getSortedRowModel` reorders the same `Row`
   * instances rather than rebuilding them, `getAllCells` is memoised per row and the
   * slot context per `Cell`, and both `@for`s track by id — so every input holds
   * still while the view order moves underneath, and the painted block quietly
   * degenerates into an enumeration of whatever was marked at click time.
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
   * Whether this cell is marked.
   *
   * A pure derivation of the two inputs plus the row order, so it belongs in the
   * component rather than in a store: there is no state here to own, and the
   * component-scoped-store rule is about reactive *state*, not about computed view
   * glue.
   *
   * The row order comes from the bridge, which holds the raw engine instance and is
   * not reactive — so `state()` is doing double duty here: it supplies the marks
   * *and* it is the signal that tells this computed the view may have moved. Reading
   * it first is deliberate.
   */
  readonly isHighlighted = computed(() => {
    const highlight = normalizeNgeHighlightState(this.state()?.ngeHighlight);
    const { columnId, rowId } = this.cell();

    return isNgeCellHighlighted(highlight, rowId, columnId, this.bridge?.rowOrder() ?? new Map());
  });
}
