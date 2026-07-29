import type { InputSignal, Signal, Type } from '@angular/core';
import type { Column, ColumnDef, RowData } from '@tanstack/angular-table';

import { signal } from '@angular/core';

import type { NgeCellContext } from '../slots';

/**
 * What the table requires of a component it renders as a column's editor.
 *
 * One input, `cell`, carrying the whole {@link NgeCellContext} — the same shape
 * `<nge-range-overlay>` and `<nge-highlight-overlay>` take, so an editor reads
 * like every other component this library projects into a cell.
 *
 * ⚠️ **Not generic over the row, deliberately.** An editor is named as a *type* on
 * a column's meta, and `ColumnMeta` is one globally-merged interface: a
 * `NgeCellEditor<MyRow>` would have to be assignable to whatever row type the
 * declaration merge fixed, and `InputSignal<T>` is invariant in `T`, so it would
 * not be. `NgeCellContext<TRow>` *is* assignable to `NgeCellContext<unknown>`
 * (`row` is a readonly property), which makes `unknown` here the type that accepts
 * every consumer's rows rather than the one that gives up on them.
 */
export interface NgeCellEditor {
  readonly cell: InputSignal<NgeCellContext<unknown>>;
}

/** An editor component class, as a column names it. */
export type NgeCellEditorComponent = Type<NgeCellEditor>;

/**
 * A column's editing options, namespaced under `ngeEdit`.
 *
 * Namespaced rather than bare for the reason ARCH-248 records: `ColumnMeta` is a
 * single globally-merged interface shared by every addon and every consuming
 * domain, so an unqualified `editable` key would be claimed by whoever declared it
 * first.
 */
export interface NgeColumnEdit {
  /**
   * Instantiate the control immediately instead of on activation — the column of
   * sliders case.
   *
   * ⚠️ **Per column, never table-wide.** Activation is the default precisely
   * because it is cheaper: thirty visible rows across three editable columns is
   * ninety control instances that activation never creates at all. A column opts
   * out of that saving when its control *is* the reading — a slider a user scans
   * down the column — and nothing else should.
   */
  alwaysLive?: boolean;
  /**
   * The component this column renders when no `[ngeCell]` template names it
   * (ARCH-293) — `NgeCellInputComponent`, `NgeCellCheckboxComponent`, or a
   * consumer's own.
   *
   * ⚠️ **This is what makes a library-shipped editor a *default*** in ARCH-278's
   * sense, rather than something every consumer has to hand-wire a template for.
   * It resolves through the render-slot registry (`NgeTableStore.cellTemplate`),
   * which consults the projected templates FIRST — so a `[ngeCell]` for the same
   * column shadows whatever is named here, and `<nge-table>`'s own markup gains
   * no branch. The alternative, a central `if (editable) renderOurInput()`, is the
   * switch ARCH-292 ruled out and the extensibility gate exists to catch.
   *
   * ⚠️ **A type, never an instance.** The table renders it through the adapter's
   * own `flexRender` seam, one instance per rendered cell, and hands it the cell
   * context as its `cell` input.
   */
  editor?: NgeCellEditorComponent;
  /**
   * Extra inputs for {@link NgeColumnEdit.editor} — how a column configures the
   * editor it named.
   *
   * `{ type: 'number' }` makes `<nge-cell-input>` a number field; `{ label: … }`
   * gives either editor a better name than the column id. Without this an editor's
   * own options would only be reachable by projecting a `[ngeCell]` template,
   * which would make every option a reason to abandon the route that exists to
   * avoid writing one.
   *
   * ⚠️ **Only inputs the component actually declares are applied.** The adapter
   * filters by the component's reflected input names, so a misspelled key is
   * dropped in silence rather than throwing — check the rendered control, not the
   * console, when an option appears to do nothing.
   */
  editorInputs?: Record<string, unknown>;
  /** Whether this column can be edited at all. */
  enabled?: boolean;
}

declare module '@tanstack/table-core' {
  /**
   * The editing flag, alongside `ngeExport` (ARCH-248) and `ngeFill` (ARCH-271).
   *
   * ⚠️ **This flag is the ONLY switch the core is allowed to make on "is this
   * column editable".** What a cell renders when it is being edited is a
   * `[ngeCell]` template resolved through the existing registry, never a branch in
   * `<nge-table>`'s own markup — a central `if (editable) renderOurInput()` would
   * be the first such switch in the epic, introduced two waves after the gate that
   * exists to catch it.
   */
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    ngeEdit?: NgeColumnEdit;
  }
}

/** Which cell an in-progress edit belongs to. */
export interface NgeCellEditTarget {
  readonly columnId: string;
  readonly rowId: string;
}

/**
 * The four members a cell context carries for editing, resolved for one cell.
 *
 * Handed over as a bundle rather than assembled per member so the disabled path
 * can be one shared frozen object — see {@link NGE_CELL_NO_EDIT}.
 */
export interface NgeCellEditMembers {
  readonly beginEdit: () => void;
  readonly cancelEdit: () => void;
  readonly commitEdit: (value: unknown) => void;
  readonly isEditing: Signal<boolean>;
}

/**
 * How a cell context reaches the table's editing state.
 *
 * The same arrangement `NgeSelectionCellContext.toggle` uses, and for the same
 * reason: a projected `ng-template` resolves DI from its *declaration* injector —
 * the consumer's — so a template cannot reach `NgeTableStore`. The table is
 * already building the context and can close over its own store, so the answer
 * travels with the question and no per-table provider scope is needed.
 */
export interface NgeCellEditPort {
  /** Everything one cell needs, or the shared no-op bundle when editing is off. */
  forCell(rowId: string, columnId: string): NgeCellEditMembers;
}

/**
 * Permanently not editing. The `false` half of ARCH-291's `NGE_CELL_ALWAYS_SETTLED`.
 *
 * One signal for the whole application rather than one per cell — nothing can ever
 * move it, so every cell of every non-editing table can share the same reference.
 */
export const NGE_CELL_NEVER_EDITING: Signal<boolean> = signal(false).asReadonly();

const NO_EDIT_MEMBERS: NgeCellEditMembers = Object.freeze({
  beginEdit: (): void => undefined,
  cancelEdit: (): void => undefined,
  commitEdit: (): void => undefined,
  isEditing: NGE_CELL_NEVER_EDITING,
});

/**
 * The port a table with no editable column hands every cell.
 *
 * ⚠️ **This is what makes "the frame budget is unchanged by the feature being
 * available but unused" structural rather than measured-and-hoped.** `isEditing`
 * describes the *cell* rather than the viewport, so unlike ARCH-291's settle
 * signal it cannot be one shared `computed` — an opted-in table allocates one per
 * cell. A table that has opted into nothing allocates none at all, because this
 * bundle is frozen, shared, and returned by reference for every cell in it.
 *
 * The export seam takes this one too: an export reads a row model rather than a
 * viewport, so "nothing is being edited" is its *answer*, exactly as
 * `NGE_CELL_ALWAYS_SETTLED` is.
 */
export const NGE_CELL_NO_EDIT: NgeCellEditPort = Object.freeze({
  forCell: (): NgeCellEditMembers => NO_EDIT_MEMBERS,
});

/** A column's `ngeEdit` options, or `undefined` when it declared none. */
export function ngeColumnEdit<TRow, TValue>(
  column: ColumnDef<TRow, TValue> | undefined
): NgeColumnEdit | undefined {
  return column?.meta?.ngeEdit;
}

/** Whether a column definition has opted into editing. */
export function isNgeColumnEditable<TRow, TValue>(
  column: ColumnDef<TRow, TValue> | undefined
): boolean {
  return ngeColumnEdit(column)?.enabled === true;
}

/** Whether a column renders its control without waiting to be activated. */
export function isNgeColumnAlwaysLive<TRow, TValue>(
  column: ColumnDef<TRow, TValue> | undefined
): boolean {
  const edit = ngeColumnEdit(column);

  return edit?.enabled === true && edit.alwaysLive === true;
}

/**
 * The engine-side twin of {@link isNgeColumnEditable}, for the live `Column`.
 *
 * Separate from the `ColumnDef` reader because the two are reached from different
 * places — a config walk holds definitions, a cell holds `cell.column` — and
 * collapsing them would mean casting at one of the two call sites.
 */
export function isNgeCellColumnEditable(column: Column<unknown, unknown>): boolean {
  return column.columnDef.meta?.ngeEdit?.enabled === true;
}

/**
 * The editor component a live column named, or `undefined` when it named none.
 *
 * Read off the engine's `Column` rather than the config's `ColumnDef` because the
 * id the editor is indexed by has to be the **resolved** one: a definition may
 * leave `id` out and let TanStack derive it from `accessorKey`, and a map keyed by
 * the undefined half would silently never match a cell.
 */
export function ngeCellColumnEditor(
  column: Column<unknown, unknown>
): NgeCellEditorComponent | undefined {
  return column.columnDef.meta?.ngeEdit?.editor;
}

/** The extra inputs a live column declared for its editor, or none. */
export function ngeCellColumnEditorInputs(
  column: Column<unknown, unknown>
): Record<string, unknown> | undefined {
  return column.columnDef.meta?.ngeEdit?.editorInputs;
}
