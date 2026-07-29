import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  input,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeCellContext } from '../slots';
import type { NgeHighlightState } from './nge-highlight-state';

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
 *     <nge-highlight-overlay [cell]="cell" [highlight]="state().ngeHighlight" />
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
 * ⚠️ **Reactivity comes from `highlight`, not from the table.** Virtualization
 * recycles DOM, so this component must never hold a mark of its own — the node
 * showing row 12 is the node that showed row 4 a moment ago. Everything it displays
 * re-derives from the two inputs on every pass, which is also why binding `state`
 * on `<nge-table>` is a requirement rather than a nicety.
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

  /** The host's highlight slice — `state().ngeHighlight`. Absent until first written. */
  readonly highlight = input<NgeHighlightState | undefined>();

  /**
   * Whether this cell is marked.
   *
   * A pure derivation of the two inputs plus the row order, so it belongs in the
   * component rather than in a store: there is no state here to own, and the
   * component-scoped-store rule is about reactive *state*, not about computed view
   * glue.
   */
  readonly isHighlighted = computed(() => {
    const { columnId, rowId } = this.cell();

    return isNgeCellHighlighted(
      normalizeNgeHighlightState(this.highlight()),
      rowId,
      columnId,
      this.bridge?.rowOrder() ?? new Map()
    );
  });
}
