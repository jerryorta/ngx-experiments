import { Directive, inject, input, TemplateRef } from '@angular/core';

import type { NgeTableSlotTemplateContext } from './nge-table-slot-context';
import type { NgeTableSlotName } from './nge-table-slot-name';

/**
 * `[ngeTableSlot]` — register an Angular template at one of the table's named
 * positions.
 *
 * ```html
 * <nge-table [config]="config">
 *   <ng-template ngeTableSlot="empty" let-table>
 *     Nothing matched — {{ table.columnCount }} columns, no rows.
 *   </ng-template>
 *
 *   <ng-template ngeTableSlot="header-cell" ngeTableSlotColumn="amount" let-header>
 *     <span class="numeric">Amount {{ header.sortDirection ?? "" }}</span>
 *   </ng-template>
 * </nge-table>
 * ```
 *
 * **One directive for every name, on purpose.** The alternative — a directive per
 * slot — would make adding a name a new file, a new export, and a new
 * `contentChildren` query on `<nge-table>`, which is a change to the rendering
 * pipeline and therefore exactly what this seam promises will never be necessary.
 * Here a name costs an entry in `NGE_TABLE_SLOT_NAMES`, a context in
 * `NgeTableSlotContexts`, and one `ngTemplateOutlet` at the position it names.
 *
 * A slot is a **place**, not a state. Its template renders whenever one is
 * registered, and what appears there — including whether anything does — is the
 * consumer's business, decided from the context they are handed. That is why
 * `loading` needs no `config.loading` flag and `row-detail` needs no expansion
 * feature: the template gates itself on `isExpanded`, and the table stays unaware
 * of what it is drawing.
 *
 * @typeParam TName - Inferred from the bound slot name, so `let-` resolves to that
 *   slot's context rather than the union of every slot's.
 * @typeParam TRow - Inferred from `ngeTableSlotOf`; `unknown` when it is omitted.
 */
@Directive({
  selector: 'ng-template[ngeTableSlot]',
  standalone: true,
})
export class NgeTableSlotDirective<
  TName extends NgeTableSlotName = NgeTableSlotName,
  TRow = unknown,
> {
  /** Which position this template fills. */
  readonly ngeTableSlot = input.required<TName>();

  /**
   * Narrow a per-column slot to one column, by `NgeTableColumn.id`.
   *
   * Only `cell-overlay`, `footer-cell`, `header-cell`, and `header-overlay` are
   * addressed per column; every other name ignores this. Omit it on one of those
   * four and the template applies to *every* column — useful for a sort affordance
   * or a footer total that every column should get — and a column-specific
   * template wins over the shared one, so the general case and the exception can
   * be declared side by side.
   */
  readonly ngeTableSlotColumn = input<string>();

  /**
   * Type carrier — bind the same array you passed as `config.data`.
   *
   * Never read at runtime; it exists so `TRow` can be inferred, which matters for
   * the two row-shaped slots (`cell-overlay`, `row-detail`). Omit it and `row` is
   * `unknown`: safe to hold, honest about what is known, and not an `any`.
   */
  readonly ngeTableSlotOf = input<readonly TRow[]>();

  /** The template itself, rendered through `ngTemplateOutlet` at the slot's anchor. */
  readonly template: TemplateRef<NgeTableSlotTemplateContext<TName, TRow>> = inject(TemplateRef);

  /**
   * Teach the template type-checker which context this slot's `let-` bindings
   * carry.
   *
   * `TName` is inferred from the bound name, so `ngeTableSlot="empty"` types
   * `let-ctx` as `NgeTableContext` while `ngeTableSlot="row-detail"` types it as
   * `NgeRowContext` — one directive, per-slot types. Where inference cannot see a
   * literal the type widens to the union of every context, which is still typed
   * and still not `any`.
   */
  static ngTemplateContextGuard<TName extends NgeTableSlotName, TRow>(
    _directive: NgeTableSlotDirective<TName, TRow>,
    _context: unknown
  ): _context is NgeTableSlotTemplateContext<TName, TRow> {
    return true;
  }
}
