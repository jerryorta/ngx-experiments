import type { Signal, TemplateRef } from '@angular/core';
import type { Cell, Column, FlexRenderComponent, Header, Row } from '@tanstack/angular-table';

import { signal } from '@angular/core';
import { flexRenderComponent } from '@tanstack/angular-table';

import type { NgeCellEditor, NgeCellEditorComponent, NgeCellEditPort } from '../../edit';
import type {
  NgeCellContext,
  NgeCellTemplateContext,
  NgeHeaderContext,
  NgeRowContext,
  NgeTableContext,
  NgeTableSlotName,
  NgeTableSlotTemplateContext,
} from '../../slots';

import { ngeCellColumnEditor, ngeCellColumnEditorInputs } from '../../edit';
import { NGE_TABLE_COLUMN_SLOT_NAMES } from '../../slots';

/**
 * A settled signal for a caller that is not rendering — always `true`.
 *
 * `NgeCellContext.isSettled` describes a scroll, and only a table on screen has
 * one. The export seam builds contexts to hand a `cellPredicate`, off a row model
 * rather than a viewport, so there is no scroll to be quiet: nothing is deferred,
 * nothing recycles, and every cell is read exactly once. `true` is the answer, not
 * a stand-in for one.
 *
 * Shared rather than allocated per call, so a predicate closing over it compares
 * equal across cells. It is a `signal` and not a bare function because `Signal<T>`
 * is branded — an ordinary `() => true` does not satisfy it.
 */
export const NGE_CELL_ALWAYS_SETTLED: Signal<boolean> = signal(true).asReadonly();

/**
 * A slot template once it is in the registry, with its context widened to the
 * union of every slot's.
 *
 * The narrowing that matters happens at the *use* site — `NgeTableSlotDirective`
 * types a consumer's `let-` binding by the name they bound. By the time a template
 * reaches the registry the table only needs to know where to put it, so carrying
 * nine distinct template types through the lookup would buy nothing and would make
 * the registry a mapped type instead of a `Map`.
 */
export type NgeTableSlotTemplate = TemplateRef<
  NgeTableSlotTemplateContext<NgeTableSlotName, unknown>
>;

/**
 * What one cell renders, in the shape `*flexRender` takes.
 *
 * Two things can satisfy it — a consumer's projected `[ngeCell]` template, or the
 * editor component a column named (ARCH-293) — and the adapter renders both
 * through the same seam: `FlexRenderContent` accepts a `TemplateRef` *and* a
 * `FlexRenderComponent`
 * (`../open-source/table/packages/angular-table/src/flex-render/view.ts:11-14`).
 * That is what lets a library-shipped editor be a default without `<nge-table>`'s
 * markup gaining a branch for it.
 */
export type NgeCellContent = (
  props: NgeCellContext<unknown>
) => FlexRenderComponent<NgeCellEditor> | TemplateRef<NgeCellTemplateContext<unknown>>;

/**
 * A cell's content, paired with the `TemplateRef` when one is what produced it.
 *
 * The thunk is not decoration. `flexRender`'s `content` input cannot take a bare
 * `TemplateRef` — its declared type is `string | number | ((props) => …) | null`,
 * and only the *return* of that function is allowed to be a template. Building the
 * thunk once, here, is what keeps its identity stable: `ngOnChanges` on `content`
 * sets `ContentChanged`, which clears the view container and rebuilds the embedded
 * view, so a thunk allocated per change-detection pass would destroy and recreate
 * every custom cell on every cycle
 * (`../open-source/table/packages/angular-table/src/flex-render.ts:106-113`).
 */
export interface NgeCellTemplate {
  /** Hand this to `*flexRender`, never {@link NgeCellTemplate.template} directly. */
  readonly content: NgeCellContent;
  /** The projected template, absent on an entry an editor component produced. */
  readonly template?: TemplateRef<NgeCellTemplateContext<unknown>>;
}

/**
 * What the registry needs from a `NgeCellDirective`.
 *
 * Declared structurally, for the same reason `NgeTableStateWriter` is: the
 * mapping is the part worth testing directly, and testing it should not require
 * standing up a component to obtain a directive instance. `NgeCellDirective`
 * satisfies this because an `InputSignal<string>` is callable.
 */
export interface NgeCellRegistration {
  readonly ngeCell: () => string;
  readonly template: TemplateRef<NgeCellTemplateContext<unknown>>;
}

/** What the registry needs from a `NgeTableSlotDirective`. Structural, as above. */
export interface NgeTableSlotRegistration {
  readonly ngeTableSlot: () => NgeTableSlotName;
  readonly ngeTableSlotColumn: () => string | undefined;
  readonly template: NgeTableSlotTemplate;
}

/** Every template registered for one slot name. */
export interface NgeTableSlotEntry {
  /** Templates that named a column, keyed by it. Beats {@link NgeTableSlotEntry.shared}. */
  readonly byColumn: ReadonlyMap<string, NgeTableSlotTemplate>;
  /** The template that named no column, applying to every one. */
  readonly shared: NgeTableSlotTemplate | null;
}

/** Slot name → the templates registered for it. */
export type NgeTableSlotRegistry = ReadonlyMap<NgeTableSlotName, NgeTableSlotEntry>;

/** {@link NgeTableSlotEntry} while it is still being filled in. */
interface MutableSlotEntry {
  byColumn: Map<string, NgeTableSlotTemplate>;
  shared: NgeTableSlotTemplate | null;
}

/** The names addressed per column, as a set, so the lookup is O(1) rather than a scan. */
const COLUMN_SLOT_NAMES = new Set<NgeTableSlotName>(NGE_TABLE_COLUMN_SLOT_NAMES);

/**
 * Index the registered cell templates by the column each one names.
 *
 * **Last declaration wins.** Two templates for one column is a mistake either way,
 * and taking the later one is the behaviour that lets a consumer wrapping
 * `<nge-table>` in their own component project a default and still allow the
 * caller's own template — declared afterwards in content order — to replace it.
 */
export function toNgeCellTemplateMap(
  registrations: readonly NgeCellRegistration[]
): ReadonlyMap<string, NgeCellTemplate> {
  const templates = new Map<string, NgeCellTemplate>();

  for (const registration of registrations) {
    const { template } = registration;
    templates.set(registration.ngeCell(), { content: () => template, template });
  }

  return templates;
}

/**
 * Index the editor components the columns named, by resolved column id (ARCH-293).
 *
 * The **second** place a cell's content can come from, consulted by
 * `NgeTableStore.cellTemplate` only after the projected `[ngeCell]` templates —
 * which is the whole of "a library-shipped editor is a default a consumer's
 * template shadows" (ARCH-278's resolution order). `<nge-table>`'s markup gains no
 * branch for it: the existing `*flexRender` anchor renders a component exactly as
 * it renders a template.
 *
 * ⚠️ **Built from the engine's leaf columns, so the ids are the resolved ones.** A
 * `ColumnDef` may omit `id` and let TanStack derive it from `accessorKey`, and a
 * map keyed by the undefined half would match no cell while looking correct.
 */
export function toNgeEditorTemplateMap(
  columns: readonly Column<unknown, unknown>[]
): ReadonlyMap<string, NgeCellTemplate> {
  const templates = new Map<string, NgeCellTemplate>();

  for (const column of columns) {
    const editor = ngeCellColumnEditor(column);

    if (editor) {
      templates.set(column.id, {
        content: toNgeEditorContent(editor, ngeCellColumnEditorInputs(column)),
      });
    }
  }

  return templates;
}

/**
 * The thunk that hands one editor component its cell.
 *
 * ⚠️ **The `WeakMap` is what keeps this affordable, not a micro-optimisation.**
 * `*flexRender` calls this on every change-detection pass of every rendered
 * editable cell, and a fresh `FlexRenderComponent` each time would mean a
 * `reflectComponentType` call per cell per pass *and* a changed memo key, which is
 * the churn `cellContexts` and the stable-thunk rule already exist to avoid.
 * Keying on the context is safe for the same reason that cache is: a context is
 * memoised against its engine `Cell`, and anything that changes a cell's value
 * rebuilds the row model and with it both.
 *
 * A bare component type would render too — the adapter accepts one — but it is
 * fed `props` as inputs *by name*, and a cell context carries no `cell` key. The
 * editor's one required input would silently never be set.
 */
function toNgeEditorContent(
  editor: NgeCellEditorComponent,
  editorInputs: Record<string, unknown> | undefined
): NgeCellContent {
  const byContext = new WeakMap<NgeCellContext<unknown>, FlexRenderComponent<NgeCellEditor>>();

  return props => {
    const existing = byContext.get(props);

    if (existing) {
      return existing;
    }

    // `cell` last, so a column cannot accidentally displace the one input every
    // editor is defined by.
    const created = flexRenderComponent(editor, { inputs: { ...editorInputs, cell: props } });
    byContext.set(props, created);

    return created;
  };
}

/**
 * Index the registered slot templates by name, splitting the per-column ones out.
 *
 * A template that names a column for a slot which is not addressed per column —
 * `toolbar` "for the amount column" — is a question with no answer, so the column
 * is ignored and the template registers as the shared one rather than being
 * silently dropped into a bucket nothing ever reads.
 */
export function toNgeTableSlotRegistry(
  registrations: readonly NgeTableSlotRegistration[]
): NgeTableSlotRegistry {
  const registry = new Map<NgeTableSlotName, MutableSlotEntry>();

  for (const registration of registrations) {
    const name = registration.ngeTableSlot();
    const entry = registry.get(name) ?? { byColumn: new Map(), shared: null };
    const columnId = COLUMN_SLOT_NAMES.has(name) ? registration.ngeTableSlotColumn() : undefined;

    if (columnId === undefined) {
      entry.shared = registration.template;
    } else {
      entry.byColumn.set(columnId, registration.template);
    }

    registry.set(name, entry);
  }

  return registry;
}

/**
 * The template to render at one slot, or `null` when nothing is registered.
 *
 * A column-specific template beats the shared one, which is what lets a consumer
 * declare the general case and its exception side by side rather than enumerating
 * every column.
 */
export function ngeTableSlotTemplateFor(
  registry: NgeTableSlotRegistry,
  name: NgeTableSlotName,
  columnId?: string
): NgeTableSlotTemplate | null {
  const entry = registry.get(name);

  if (!entry) {
    return null;
  }

  const scoped = columnId === undefined ? undefined : entry.byColumn.get(columnId);

  return scoped ?? entry.shared;
}

/**
 * Translate one engine cell into the context a consumer's template receives.
 *
 * This function and its three siblings are the whole of the TanStack → Nge
 * translation on the render-slot axis, kept in one place for the same reason
 * `buildTableOptions` is the only place engine *option* names appear: a v9 rename
 * lands here and nowhere a consumer can see.
 *
 * `isSettled` and `edit` are required parameters rather than defaulted ones so that
 * every caller states which answer it means. A table hands its own live signal and
 * its own edit port; a caller with no viewport hands {@link NGE_CELL_ALWAYS_SETTLED}
 * and {@link NGE_CELL_NO_EDIT}. Defaulting would let a future caller inherit those
 * answers by omission — a deferred cell that never defers, or an editable cell that
 * cannot be activated — and both are failures that look like success.
 */
export function toNgeCellContext<TRow>(
  cell: Cell<TRow, unknown>,
  isSettled: Signal<boolean>,
  edit: NgeCellEditPort
): NgeCellContext<TRow> {
  const columnId = cell.column.id;
  const rowId = cell.row.id;

  return {
    ...edit.forCell(rowId, columnId),
    columnId,
    isSettled,
    row: cell.row.original,
    rowId,
    rowIndex: cell.row.index,
    value: cell.getValue(),
  };
}

/** Translate one engine header — or footer — into its template's context. */
export function toNgeHeaderContext(header: Header<unknown, unknown>): NgeHeaderContext {
  const sorted = header.column.getIsSorted();

  return {
    columnId: header.column.id,
    isPlaceholder: header.isPlaceholder,
    sortDirection: sorted === false ? null : sorted,
    width: header.getSize(),
  };
}

/**
 * Translate one engine row into the `row-detail` template's context.
 *
 * `toggleExpanded` arrives as an argument rather than being closed over here,
 * because this module is pure by design — the store owns the gesture, and the
 * capability check that goes with it. A band collapsing itself is the first thing a
 * consumer wants from one (ARCH-298), and a projected template resolves DI from its
 * declaration injector, so the action has to travel on the context.
 */
export function toNgeRowContext<TRow>(
  row: Row<TRow>,
  toggleExpanded: () => void
): NgeRowContext<TRow> {
  return {
    canExpand: row.getCanExpand(),
    isExpanded: row.getIsExpanded(),
    row: row.original,
    rowId: row.id,
    rowIndex: row.index,
    toggleExpanded,
  };
}

/** The context handed to the table-level slots — `empty`, `loading`, `toolbar`. */
export function toNgeTableContext(columnCount: number, rowCount: number): NgeTableContext {
  return { columnCount, rowCount };
}
