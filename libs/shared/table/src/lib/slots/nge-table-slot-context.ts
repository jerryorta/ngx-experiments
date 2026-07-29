import type { Signal } from '@angular/core';

import type { NgeTableSelectionModifiers } from '../nge-table/store/nge-table-selection';
import type { NgeTableSlotName } from './nge-table-slot-name';

/**
 * What a cell template is handed.
 *
 * Ours, not TanStack's. `flexRender` renders a `TemplateRef` with a context of
 * `$implicit` alone, valued at whatever is bound to `flexRenderProps` — so the
 * library chooses the object, and choosing this one is what keeps `@tanstack/*`
 * out of a consumer's `let-` binding while still going through the adapter's
 * intended seam. Hand over `cell.getContext()` instead and every consumer
 * template would be typed against `CellContext`, which is the insulation this
 * library exists to provide leaking on its very first use.
 *
 * `value` is `unknown` unless a caller names `TValue`, and deliberately so: the
 * type of a cell's value depends on which column it belongs to, and the column id
 * is a string. Read `row` instead — it *is* typed, and `row.amount` says what
 * `value` means at the same time as producing it.
 *
 * @typeParam TRow - The shape of one row of data.
 * @typeParam TValue - The accessor's return type, when a caller knows it.
 */
export interface NgeCellContext<TRow, TValue = unknown> {
  /**
   * Activate this cell's editor (ARCH-292). A no-op on a column that has not
   * declared `meta.ngeEdit.enabled`.
   *
   * ⚠️ **A callback on the context, not a service to inject** — the same
   * arrangement {@link NgeSelectionCellContext.toggle} uses, and for the same
   * reason: a projected `ng-template` resolves DI from its *declaration* injector,
   * the consumer's, so a template cannot reach the table. Here the table is
   * already building this object and can close over its own store, so the answer
   * travels with the question.
   */
  readonly beginEdit: () => void;
  /** Abandon the edit, proposing nothing. What `Escape` in an editor calls. */
  readonly cancelEdit: () => void;
  /** The column this cell belongs to — matches `NgeTableColumn.id`. */
  readonly columnId: string;
  /**
   * Propose a new value for this cell and close the editor.
   *
   * ⚠️ **This emits `edit-intent`; it does not write anything.** `config.data`
   * belongs to the host, so the table announces the patch and the host applies it
   * and hands new `data` back in. A host that ignores the event sees no edit —
   * correct behaviour for one that has not opted into editing, not a bug.
   */
  readonly commitEdit: (value: unknown) => void;
  /**
   * Whether this cell is currently being edited — the flag a template branches on
   * to swap read-only text for a control:
   *
   * ```html
   * <ng-template ngeCell="name" [ngeCellOf]="rows" let-cell>
   *   @if (cell.isEditing()) { <input [value]="cell.value" … /> }
   *   @else { {{ cell.value }} }
   * </ng-template>
   * ```
   *
   * Permanently `true` for a column declaring `meta.ngeEdit.alwaysLive`, and
   * permanently `false` for one that has not opted into editing at all.
   *
   * ⚠️ **Signal-valued, for the reason {@link NgeCellContext.isSettled} is** —
   * this context is memoised against the engine `Cell`, so a plain boolean would be
   * read once at first build and served stale for the life of the row model. The
   * cell would render, the read-only text would stay, and activation would simply
   * never appear. That failure looks exactly like a wiring bug in the gesture,
   * which is why the shape is inherited from ARCH-291 rather than re-decided.
   *
   * ⚠️ **Costs nothing on a table that has not opted in.** Unlike `isSettled` — one
   * signal per table, because scroll describes the viewport — this describes the
   * *cell*, so an opted-in table allocates one `computed` per cell. A table with no
   * editable column shares a single frozen bundle instead (`NGE_CELL_NO_EDIT`), so
   * "available but unused" allocates exactly as much as before the feature existed.
   */
  readonly isEditing: Signal<boolean>;
  /**
   * Whether the scroll has been quiet long enough to render expensive content.
   *
   * A cell template branches on it to draw a cheap shell while the user is
   * flicking and the real thing once they stop — a chart, an image, a map, a
   * third-party widget — with no cooperation from the library that renders it:
   *
   * ```html
   * <ng-template ngeCell="series" [ngeCellOf]="rows" let-cell>
   *   @if (cell.isSettled()) { <nge-chart [config]="chartFor(cell.row)" /> }
   *   @else { <nge-cell-shell /> }
   * </ng-template>
   * ```
   *
   * ⚠️ **Signal-valued, and it is the reason anything here that moves must be.**
   * Cell contexts are memoised against the engine `Cell` because a cell's *value*
   * cannot move under it — but this can, so a plain boolean would be read once,
   * cached, and served stale forever. A signal keeps the object identity the memo
   * exists for while the value stays live, which is why the alternative (drop the
   * memo, allocate a context per cell per render) was rejected: that is the churn
   * this field exists to avoid. {@link NgeCellContext.isEditing} inherits the same
   * shape.
   *
   * ⚠️ **Not a `NgeTableEvent`, deliberately.** That output notifies the *host*; a
   * "load now" event would make a consumer hold per-cell render flags and feed them
   * back, which is the data flow the slot seam exists to remove. A slot is a place,
   * not a state (ARCH-246) — the table hands the fact, the template decides.
   *
   * **Binary, not a velocity.** It answers "has the scroll been quiet for a moment",
   * which degrades correctly on its own: a slow drag settles continuously, a fast
   * flick shells the whole way. A velocity threshold would be a tuning constant that
   * is wrong across trackpad momentum, wheel clicks and touch flicks, and would
   * become a knob every consumer sets badly. Tiered rendering by scroll speed is a
   * real technique and deliberately not this contract.
   *
   * **Permanently `true` without virtualization**, which is the honest answer rather
   * than a gap: a table that renders every row renders each cell once and never
   * recycles it, so there is no per-slide cost to defer and nothing a shell would
   * save. Deferring there would cost a frame and buy nothing.
   */
  readonly isSettled: Signal<boolean>;
  /** The whole row, so a template can reach fields its own column does not carry. */
  readonly row: TRow;
  /** The row's engine id — `getRowId(row)` when the config supplies one, else the index. */
  readonly rowId: string;
  /**
   * The row's index in the **source data**, which is the engine's own `row.index`
   * and therefore survives a sort rather than tracking the display order.
   *
   * Display position is deliberately not offered *to a template* — the row
   * element carries it instead, as `aria-rowindex` for an assistive technology
   * and as the `nge-table__row--alt` class for a stripe (ARCH-286). A template
   * handed it as a number would go stale the moment virtualization recycled the
   * node into a different position without the row changing.
   */
  readonly rowIndex: number;
  /** What the column's accessor returned for this row. */
  readonly value: TValue;
}

/**
 * What a header or footer template is handed.
 *
 * No `label` field. A column's `header` may be a string, a function, or a
 * component, and flattening that to something a template could interpolate would
 * mean either `unknown` (useless) or rendering it here (which is the very job the
 * slot is taking over). A template that replaces the header supplies its own
 * label; one that decorates it — `header-overlay` — sits beside the default.
 */
export interface NgeHeaderContext {
  /** The column this header belongs to — matches `NgeTableColumn.id`. */
  readonly columnId: string;
  /**
   * A spacer cell in a grouped header, spanning nothing.
   *
   * The engine emits these to keep grouped levels aligned. A template that draws
   * a border or a control should skip them, or a table with column groups grows
   * controls for columns that are not there.
   */
  readonly isPlaceholder: boolean;
  /** Which way this column is sorted, or `null` when it is not. */
  readonly sortDirection: 'asc' | 'desc' | null;
  /** The column's current width in pixels, after any drag (ARCH-244). */
  readonly width: number;
}

/**
 * What a whole-row template — `row-detail` — is handed.
 *
 * `isExpanded` reads `state.expanded`, which a host may write directly or a user
 * may write through the disclosure column (ARCH-298); the band cannot tell the two
 * apart, which is what "a slot is a place, not a state" means in practice.
 */
export interface NgeRowContext<TRow> {
  /**
   * Whether this row may be opened at all — `false` when `enableRowExpansion` is a
   * predicate that rejects it, and when the feature is off entirely.
   *
   * A band that draws its own close control reads this to decide whether to offer
   * one, the same question {@link NgeExpandCellContext.canExpand} answers for the
   * column's control.
   */
  readonly canExpand: boolean;
  /** Whether `state.expanded` currently names this row. */
  readonly isExpanded: boolean;
  readonly row: TRow;
  /** The row's engine id — `getRowId(row)` when the config supplies one, else the index. */
  readonly rowId: string;
  /**
   * The row's index in the **source data**, which is the engine's own `row.index`
   * and therefore survives a sort rather than tracking the display order.
   *
   * Display position is deliberately not offered *to a template* — the row
   * element carries it instead, as `aria-rowindex` for an assistive technology
   * and as the `nge-table__row--alt` class for a stripe (ARCH-286). A template
   * handed it as a number would go stale the moment virtualization recycled the
   * node into a different position without the row changing.
   */
  readonly rowIndex: number;
  /**
   * Open or close this row — what lets a detail band collapse itself, which is the
   * first thing a consumer wants from one.
   *
   * ⚠️ **A callback on the context, not a service to inject**, for the reason
   * {@link NgeSelectionCellContext.toggle} is one: a projected `ng-template`
   * resolves DI from its *declaration* injector, so a band cannot reach the table.
   * A no-op on a row that cannot expand, so a template need not guard it.
   */
  readonly toggleExpanded: () => void;
}

/**
 * What an `expand-cell` template is handed — one row's disclosure state, plus the
 * way to change it.
 *
 * The library ships a native `<button>` chevron and a consumer replaces it by
 * projecting this slot, so a table dropped into a domain wears that domain's
 * disclosure control rather than a browser default sitting next to it. Same
 * arrangement, and the same reasoning, as ARCH-278's swappable checkbox.
 *
 * ⚠️ A projected control sits inside a row whose click may select, so it owes
 * itself a `$event.stopPropagation()` exactly as the native one does.
 *
 * @typeParam TRow - The shape of one row of data.
 */
export interface NgeExpandCellContext<TRow> {
  /**
   * Whether this row may be opened at all — `false` when `enableRowExpansion` is a
   * predicate that rejects it.
   *
   * Offered so a consumer can **disable** their control rather than hide it: a row
   * whose chevron silently vanishes reads as a rendering bug, where a disabled one
   * reads as a rule.
   */
  readonly canExpand: boolean;
  /** Whether this row is currently in `state.expanded`. */
  readonly isExpanded: boolean;
  readonly row: TRow;
  /** The row's engine id — `getRowId(row)`, which expansion state is keyed by. */
  readonly rowId: string;
  /**
   * The row's index in the **source data** — the engine's own `row.index`, so it
   * survives a sort rather than tracking the display order.
   */
  readonly rowIndex: number;
  /**
   * Open or close this row. Exactly what the native chevron calls, so a projected
   * control inherits the capability check without knowing it exists.
   */
  readonly toggle: () => void;
}

/**
 * What an `expand-header` template is handed — the expand-all state, plus the way
 * to drive it.
 *
 * Same callback arrangement as {@link NgeExpandCellContext}. A count is offered
 * because a consumer may reasonably render "3 of 25 open" where the library renders
 * a chevron.
 */
export interface NgeExpandHeaderContext {
  /** Every expandable row is open — drives a control's expanded state. */
  readonly allExpanded: boolean;
  /** Rows in the **processed** row model, for a count readout. */
  readonly rowCount: number;
  /**
   * At least one row is open.
   *
   * Deliberately not a *count* of open rows: `state.expanded` may be the `true`
   * shorthand, under which there is no map to count and the honest answer is "all
   * of them" rather than a number the table would have to materialise ten thousand
   * keys to produce.
   */
  readonly someExpanded: boolean;
  /** Open every row, or close them all when everything is already open. */
  readonly toggleAll: () => void;
}

/**
 * What a `selection-cell` template is handed — one row's selection, plus the way
 * to change it.
 *
 * The library ships a native `<input type="checkbox">` and a consumer replaces it
 * by projecting this slot, so a table dropped into a domain wears that domain's
 * control (`cg-checkbox`, `gy-checkbox`) rather than a browser default sitting
 * next to it.
 *
 * ⚠️ **`toggle` is a callback on the context, not a service to inject.** A
 * projected `ng-template` resolves DI from its *declaration* injector — the
 * consumer's — so a template cannot reach the table, which is why ARCH-250's
 * highlight overlay needs a bridge provided alongside it. That constraint bites
 * when a template must *ask the table a question*; here the table is already
 * building this object and can close over its own store, so the answer travels
 * with the question and no per-table provider scope is needed.
 *
 * @typeParam TRow - The shape of one row of data.
 */
export interface NgeSelectionCellContext<TRow> {
  /**
   * Whether this row may be selected at all — `false` when `enableRowSelection`
   * is a predicate that rejects it.
   *
   * Offered so a consumer can **disable** their control rather than hide it: a row
   * whose checkbox silently vanishes reads as a rendering bug, where a disabled one
   * reads as a rule.
   */
  readonly canSelect: boolean;
  /** Whether this row is currently in `state.rowSelection`. */
  readonly isSelected: boolean;
  readonly row: TRow;
  /** The row's engine id — `getRowId(row)`, which selection state is keyed by. */
  readonly rowId: string;
  /**
   * The row's index in the **source data** — the engine's own `row.index`, so it
   * survives a sort rather than tracking the display order.
   */
  readonly rowIndex: number;
  /**
   * Add or remove this row. Exactly what the native checkbox calls, so a projected
   * control inherits single-row mode and the capability check without knowing
   * either exists.
   *
   * **Pass the click event to get range selection for free.** With modifiers, a
   * shift-click extends the range from the anchor just as it does on the row body;
   * without them it is a plain per-row toggle. A `MouseEvent` structurally
   * satisfies the parameter, so `(click)="selection.toggle($event)"` is the whole
   * of it — a consumer whose control emits no event still calls `toggle()` and
   * loses only the range.
   */
  readonly toggle: (modifiers?: NgeTableSelectionModifiers) => void;
}

/**
 * What a `selection-header` template is handed — the select-all tri-state, plus
 * the way to drive it.
 *
 * Counts as well as flags, because a consumer may reasonably render "3 of 25
 * selected" where the library renders a checkbox. Same callback arrangement as
 * {@link NgeSelectionCellContext}.
 */
export interface NgeSelectionHeaderContext {
  /** Every selectable row is selected — drives a checkbox's `checked`. */
  readonly allSelected: boolean;
  /** Rows in the **processed** row model, for a count readout. */
  readonly rowCount: number;
  /** How many rows are currently selected. */
  readonly selectedCount: number;
  /** Some but not all — drives a checkbox's `indeterminate`. */
  readonly someSelected: boolean;
  /** Select every row, or clear them when everything is already selected. */
  readonly toggleAll: () => void;
}

/**
 * What a table-level template — `empty`, `loading`, `toolbar` — is handed.
 *
 * Counts rather than the data itself. A band spanning the whole table is drawn
 * *about* the table, and handing over the rows would invite a toolbar to iterate
 * them — which is a job for a cell, or for the consumer's own component above the
 * table, and not for a band that has to keep rendering while the data changes
 * underneath it.
 */
export interface NgeTableContext {
  /** Visible leaf columns, matching the grid's `aria-colcount`. */
  readonly columnCount: number;
  /** Rows in the **processed** row model — what the user would see, not what was supplied. */
  readonly rowCount: number;
}

/**
 * Which context each slot's template is handed.
 *
 * Kept as an interface so the mapping reads as a table, and consumed through
 * {@link NgeTableSlotContextByName}, which is what turns "every name has a
 * decided context" into something the compiler checks.
 */
interface NgeTableSlotContexts<TRow> {
  'cell-overlay': NgeCellContext<TRow>;
  empty: NgeTableContext;
  'expand-cell': NgeExpandCellContext<TRow>;
  'expand-header': NgeExpandHeaderContext;
  footer: NgeTableContext;
  'footer-cell': NgeHeaderContext;
  'header-cell': NgeHeaderContext;
  'header-overlay': NgeHeaderContext;
  loading: NgeTableContext;
  'row-detail': NgeRowContext<TRow>;
  'selection-cell': NgeSelectionCellContext<TRow>;
  'selection-header': NgeSelectionHeaderContext;
  toolbar: NgeTableContext;
}

/**
 * Slot name → the context its template receives.
 *
 * Written as a mapping **over the name union** rather than as a plain interface,
 * which is what makes the pair self-enforcing: adding a name to
 * `NGE_TABLE_SLOT_NAMES` without deciding its context fails to compile here,
 * rather than silently handing a consumer something untyped to bind against. That
 * is the difference between "the seam is open" and "the seam is open and cannot be
 * extended carelessly".
 */
export type NgeTableSlotContextByName<TRow> = {
  [TName in NgeTableSlotName]: NgeTableSlotContexts<TRow>[TName];
};

/**
 * The embedded-view context Angular actually creates for a cell template.
 *
 * `$implicit` alone, because that is all `flexRender` sets
 * (`angular-table/src/flex-render.ts` → `#renderTemplateRefContent`). One
 * `let-cell` in a consumer's `ng-template` therefore binds the whole
 * {@link NgeCellContext}, which is also why the context is an object rather than
 * a spread of loose keys.
 */
export interface NgeCellTemplateContext<TRow, TValue = unknown> {
  $implicit: NgeCellContext<TRow, TValue>;
}

/**
 * The embedded-view context Angular creates for a named slot's template.
 *
 * Generic over the name so `let-ctx` resolves to *that slot's* context rather
 * than the union of all of them — see `NgeTableSlotDirective`'s context guard.
 */
export interface NgeTableSlotTemplateContext<TName extends NgeTableSlotName, TRow> {
  $implicit: NgeTableSlotContextByName<TRow>[TName];
}
