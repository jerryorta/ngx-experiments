import { Directive, inject, input, TemplateRef } from '@angular/core';

import type { NgeCellTemplateContext } from './nge-table-slot-context';

/**
 * `[ngeCell]` — register an Angular template as one column's cell.
 *
 * ```html
 * <nge-table [config]="config">
 *   <ng-template ngeCell="amount" [ngeCellOf]="rows" let-cell>
 *     <strong>{{ cell.value | currency }}</strong> · {{ cell.row.owner.name }}
 *   </ng-template>
 * </nge-table>
 * ```
 *
 * Columns without a template keep rendering their `columnDef.cell`, so adopting
 * this is per-column and costs nothing anywhere else. The shape follows a
 * per-column cell-template directive that proved the pattern in an earlier
 * Angular data table; what is new is that the template is handed a typed,
 * TanStack-free context.
 *
 * **A cell is an arbitrary Angular render target** — charts, inputs, graphics.
 * Inline editing is therefore a cell *pattern* rather than a table feature: a cell
 * containing an `<input>`. Two consequences a template here has to respect.
 *
 * A percentage-sized element such as `<nge-chart>` — whose shadow style is
 * `height: 100%` — needs an ancestor with a **definite** height, and collapses to
 * nothing in a `height: auto` box. ⚠️ A cell already supplies one
 * (`height: var(--nge-table-row-height)`, never `auto`), so a chart dropped
 * straight in fills the row and the often-repeated "wrap it in a fixed-height div"
 * changes nothing *here*. What gives it room is `config.rowHeight`. The rule bites
 * outside a cell — a story panel, or a `row-detail` band.
 *
 * And virtualization recycles DOM, so a cell must re-derive everything it shows
 * from the context it is handed and must never hold state of its own — the node
 * drawing row 12 is the node that drew row 4 a moment ago. That is also why
 * anything a cell must *react* to arrives as a signal on the context rather than as
 * a plain field: see {@link NgeCellContext.isSettled}.
 *
 * @typeParam TRow - Inferred from `ngeCellOf`; `unknown` when it is omitted.
 * @typeParam TValue - The accessor's return type, when a caller names it.
 */
@Directive({
  selector: 'ng-template[ngeCell]',
  standalone: true,
})
export class NgeCellDirective<TRow = unknown, TValue = unknown> {
  /** Which column this template renders. Matches `NgeTableColumn.id`. */
  readonly ngeCell = input.required<string>();

  /**
   * Type carrier — bind the same array you passed as `config.data`.
   *
   * Never read at runtime. It exists so `TRow` has somewhere to be inferred from,
   * which is what makes `let-cell` resolve to `NgeCellContext<YourRow>` instead
   * of `NgeCellContext<unknown>`; `NgForOf` earns `ngForOf` the same way. Omit it
   * and the template still works — `cell.row` is simply `unknown`, which is safe
   * to hold and honest about what is known, unlike an `any`.
   */
  readonly ngeCellOf = input<readonly TRow[]>();

  /**
   * The template itself.
   *
   * Handed straight to `flexRender` as its `content`, which is what makes this a
   * bridge to the adapter rather than a second rendering path beside it.
   */
  readonly template: TemplateRef<NgeCellTemplateContext<TRow, TValue>> = inject(TemplateRef);

  /**
   * Teach the template type-checker what `let-` bindings this directive produces.
   *
   * Without it every `let-cell` is `any`, and an `any` in the public surface is
   * exactly what the story's acceptance criteria rule out. The body is
   * unconditionally `true` because the guard is a *typing* device: the context is
   * built by this library, so there is nothing to check at runtime.
   */
  static ngTemplateContextGuard<TRow, TValue>(
    _directive: NgeCellDirective<TRow, TValue>,
    _context: unknown
  ): _context is NgeCellTemplateContext<TRow, TValue> {
    return true;
  }
}
