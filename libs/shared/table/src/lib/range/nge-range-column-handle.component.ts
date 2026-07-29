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
import type { NgeHeaderContext } from '../slots';

import { NGE_RANGE_COLUMN_ATTRIBUTE, NgeRangeBridge } from './nge-range-bridge';
import { isNgeColumnSelected, normalizeNgeRangeState } from './nge-range-state';

/**
 * The header cell this handle sits inside.
 *
 * ⚠️ The one core class name this component depends on — the same documented cost
 * `<nge-range-overlay>` accepts for `.nge-table__cell`, and the same dependency a
 * theme has. The table's header markup identifies a column by `aria-colindex`, never
 * by id, so an addon that needs "the header this context belongs to" either asks
 * core for an attribute it does not have or reaches for the class it does.
 */
const HEADER_SELECTOR = '.nge-table__header-cell';

/**
 * `<nge-range-column-handle>` — the affordance that selects a whole column
 * (ARCH-270), and the resolution of this story's central conflict.
 *
 * Projected into the existing `header-overlay` render slot, so the table's own
 * template is untouched:
 *
 * ```html
 * <nge-table [config]="config" [(state)]="state">
 *   <ng-template ngeTableSlot="header-overlay" let-header>
 *     <nge-range-column-handle [header]="header" [state]="state()" />
 *   </ng-template>
 * </nge-table>
 * ```
 *
 * ⚠️ **A header click already toggles the sort** (ARCH-242, and `Enter` / `Space` do
 * the same), so the gesture cannot simply be "click the header". Three resolutions
 * were on the table and this is the second:
 *
 * - A **modifier split** — plain click sorts, some modifier selects — is ruled out by
 *   the requirement itself: `shift` and `cmd`/`ctrl` are already spent on
 *   span-and-disjoint, so the discriminator would have to be a third modifier
 *   stacked on those two.
 * - A **dedicated affordance**, this one: a thin strip on the header's *leading*
 *   edge. Both gestures stay unmodified, at the cost of a target to find — which is
 *   mitigated exactly as ARCH-244's resize grip mitigates it, by being transparent at
 *   rest and revealing on header hover.
 * - **Moving sort onto an explicit control** frees the click outright but rewrites
 *   established behaviour and every story that sorts by clicking a header.
 *
 * It fits the crowded header without collision: the resize grip half-overhangs the
 * **trailing** edge, this owns the **leading** one, and a consumer's slotted
 * `header-cell` control sits in the flex flow inside the cell's padding. The two
 * gestures cannot reach each other — the click is stopped here, and the keyboard
 * route (cmd/ctrl + `Space`) is one Angular's `keydown.space` binding cannot match.
 *
 * **The state it writes is ARCH-269's**, not a slice of its own: a selected column is
 * an ordinary `NgeCellRange` unbounded on the row axis. So the body already paints
 * it, the export predicate already covers it, and the count of addons competing for
 * the one `cell-overlay` template stays at two.
 *
 * ⚠️ **Reactivity comes from `state`, not from the table** — the same requirement
 * `<nge-range-overlay>` documents at length. See {@link state}.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[class.nge-range-column-handle--on]': 'isColumnSelected()',
    class: 'nge-range-column-handle',
  },
  selector: 'nge-range-column-handle',
  styleUrl: './nge-range-column-handle.component.scss',
  templateUrl: './nge-range-column-handle.component.html',
})
export class NgeRangeColumnHandleComponent {
  /**
   * Optional so the component degrades rather than throws when it is used without
   * {@link provideNgeCellRange} — the header still stamps its column id, and only
   * the gesture and the paint are lost.
   */
  private readonly bridge = inject(NgeRangeBridge, { optional: true });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  private readonly renderer = inject(Renderer2);

  /** The slot context, bound straight from `let-header`. */
  readonly header = input.required<NgeHeaderContext>();

  /**
   * The host's **whole** table state, not just its range slice.
   *
   * ⚠️ **Narrowing this to `state().ngeRange` is a silent, shipped-behaviour bug**,
   * for the reason `<nge-range-overlay>` records in full: whether a column is
   * *fully* selected depends on the rectangle **and** on the row and column orders,
   * and those live in `sorting` / `filtering` / `columnPinning` / `columnOrder`. A
   * `computed` re-runs only when an input changes identity, so a slice-shaped input
   * would leave a sort invalidating nothing.
   */
  readonly state = input<NgeTableState | undefined>();

  /**
   * Whether every cell of this column is currently selected.
   *
   * Fully, not partially — a column a dragged block merely passes through does not
   * light up, so the header band distinguishes "I selected this column" from "my
   * selection happens to touch it".
   *
   * The order maps come from the bridge, which holds the raw engine instance and is
   * not reactive, so `state()` does double duty: it supplies the rectangles *and* it
   * is the signal saying the view may have moved. Reading it first is deliberate.
   */
  readonly isColumnSelected = computed(() => {
    const range = normalizeNgeRangeState(this.state()?.ngeRange);

    return isNgeColumnSelected(
      range,
      this.header().columnId,
      this.bridge?.rowOrder() ?? new Map(),
      this.bridge?.columnOrder() ?? new Map()
    );
  });

  /**
   * Select this column — plain, `shift`-extended, or `cmd`/`ctrl`-toggled.
   *
   * ⚠️ **`stopPropagation` is the whole reason sorting still works.** The click would
   * otherwise reach the header cell, whose own handler toggles the sort — the same
   * arrangement ARCH-244's grip, the select-all checkbox, and a slotted `header-cell`
   * control all already use.
   */
  select(event: MouseEvent): void {
    event.stopPropagation();

    const { columnId } = this.header();

    if (event.shiftKey) {
      this.bridge?.extendToColumn(columnId);
    } else {
      this.bridge?.startColumn(columnId, { additive: event.metaKey || event.ctrlKey });
    }
  }

  /**
   * Suppress the browser's own text selection on a `shift`-click.
   *
   * ⚠️ Gated on `shiftKey` alone, the same call ARCH-269's bridge makes for cells and
   * for the same two reasons: a blanket `user-select: none` would also stop a user
   * selecting a header's label, and an unconditional `preventDefault()` on
   * `mousedown` suppresses focus, which the header cell needs for its own keyboard
   * routes. `click` still fires after a prevented `mousedown`.
   *
   * ⚠️ A synthetic `MouseEvent` triggers no browser default, so no spec can catch a
   * regression here — verify it with a real pointer.
   */
  suppressTextSelection(event: MouseEvent): void {
    if (event.shiftKey) {
      event.preventDefault();
    }
  }

  /**
   * Publish this handle's column id onto the enclosing header cell.
   *
   * ⚠️ **Read by the KEYBOARD route only** (`NgeRangeBridge.selectFocusedColumn`),
   * never by a pointer hit-test. The attribute is on the whole header cell, so a
   * pointer test against it would select the column from a plain header click — which
   * is the sort. The pointer gesture is bound on this component's own element
   * instead, the ARCH-244 grip precedent.
   *
   * ⚠️ It is deliberately **not** `data-nge-range-cell`: the body's hit-test asks for
   * that attribute and must keep answering `null` for a header, and two names make
   * that structural rather than a guard someone can forget.
   *
   * Written from an `afterRenderEffect` because it is a DOM write against an element
   * this component does not own — reactive, so a recycled node re-publishes, and
   * post-render, so the header is certain to be there.
   */
  private readonly publishColumn = afterRenderEffect(() => {
    const { columnId } = this.header();
    const cell = this.host.nativeElement.closest(HEADER_SELECTOR);

    if (!cell) {
      return;
    }

    this.renderer.setAttribute(cell, NGE_RANGE_COLUMN_ATTRIBUTE, columnId);
  });
}
