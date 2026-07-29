import type { Row, TableFeature, TableOptions, Updater } from '@tanstack/angular-table';

import { getCoreRowModel, getSortedRowModel } from '@tanstack/angular-table';

import type { NgeTableConfig } from '../../nge-table-config';
import type {
  NgeTableColumnFilter,
  NgeTableColumnPinning,
  NgeTableState,
} from '../../nge-table-state';

import { isNgeColumnEditable } from '../../edit';
import { NGE_TABLE_CORE_FEATURES } from '../../features';
import { NGE_TABLE_DEFAULTS } from '../../nge-table-defaults';
import { createNgeExpansionColumn, NGE_TABLE_EXPANSION_COLUMN_ID } from './nge-table-expansion';
import { createNgeSelectionColumn, NGE_TABLE_SELECTION_COLUMN_ID } from './nge-table-selection';

/**
 * The one store capability {@link buildTableOptions} needs.
 *
 * Declared as its own interface so the options builder can be exercised with a
 * plain spy — the engine wiring is the part most worth testing directly, and it
 * should not require standing up a component to do it.
 *
 * It is also what lets the engine feature hand the builder its writers before the
 * store has any: the two methods are ordinary closures there, collected into an
 * object of this shape, so nothing has to reach back through a store that is still
 * being composed.
 */
export interface NgeTableStateWriter {
  applyTableState(updater: Updater<NgeTableState>): void;
  applyTableStateChange<TKey extends keyof NgeTableState>(
    key: TKey,
    updater: Updater<NgeTableState[TKey]>
  ): void;
}

/** Nothing pinned. Shared so the disabled path allocates nothing per rebuild. */
const NO_COLUMN_PINNING: NgeTableColumnPinning = { left: [], right: [] };

/**
 * Fail loudly when selection is switched on without a stable row identity
 * (ARCH-268).
 *
 * Without `getRowId` the engine keys `rowSelection` by **array index**
 * (`table-core/src/core/row.ts` → `getRowId` defaults to the index path), so a
 * sort, a filter, or a re-fetch leaves the user's ticks sitting on whichever
 * records happen to occupy those positions afterwards. Nothing throws, nothing
 * renders wrong, and the table quietly reports a selection of different rows than
 * the one the user made — which reads as data corruption rather than as a bug, and
 * is exactly the class of failure worth spending a dev-mode throw on.
 *
 * Dev-only, because in production a thrown error here would take out a table over
 * a misconfiguration that has already shipped; the `ngDevMode` guard is compiled
 * out of a production build entirely.
 */
function assertSelectableRowsAreIdentified(config: NgeTableConfig<unknown> | null): void {
  if (ngDevMode && config?.enableRowSelection && !config.getRowId) {
    throw new Error(
      '[nge-table] `enableRowSelection: true` requires `config.getRowId`. Without it the ' +
        'engine keys row selection by array index, so a sort, a filter, or a re-fetch moves ' +
        "the user's selection onto different records."
    );
  }
}

/**
 * Fail loudly when a column is editable without a stable row identity (ARCH-292).
 *
 * The sibling of {@link assertSelectableRowsAreIdentified}, and the reasoning
 * transfers whole: an edit is keyed by `rowId` + `columnId`, so without `getRowId`
 * the engine's array-index keys leave an open editor — and the patch it commits —
 * pointing at whichever record occupies that position after the next sort, filter or
 * re-fetch. Selection puts a tick on the wrong row; editing proposes a **write** to
 * it, so the same class of failure lands one layer worse.
 *
 * Dev-only, for the reason its sibling is: in production a throw here would take out
 * a table over a misconfiguration that has already shipped, and the `ngDevMode` guard
 * compiles out of a production build entirely.
 */
function assertEditableRowsAreIdentified(config: NgeTableConfig<unknown> | null): void {
  if (!ngDevMode || config?.getRowId) {
    return;
  }

  const editable = (config?.columns ?? []).some(column => isNgeColumnEditable(column));

  if (editable) {
    throw new Error(
      '[nge-table] An editable column (`meta.ngeEdit.enabled`) requires `config.getRowId`. ' +
        'Without it the engine keys rows by array index, so a sort, a filter, or a re-fetch ' +
        'moves an open editor — and the value it commits — onto a different record.'
    );
  }
}

/**
 * Fail loudly when expansion is switched on without a stable row identity
 * (ARCH-298).
 *
 * The third sibling of {@link assertSelectableRowsAreIdentified}, and the reasoning
 * is unchanged: `state.expanded` is keyed by row id, so without `getRowId` the
 * engine's array-index keys leave the rows a user opened sitting on whichever
 * records occupy those positions after the next sort, filter or re-fetch. The band
 * stays open and shows a different record's detail, which is the failure that reads
 * as data corruption rather than as a bug.
 *
 * Dev-only, for the reason its siblings are: in production a throw here would take
 * out a table over a misconfiguration that has already shipped, and the `ngDevMode`
 * guard compiles out of a production build entirely.
 */
function assertExpandableRowsAreIdentified(config: NgeTableConfig<unknown> | null): void {
  if (ngDevMode && config?.enableRowExpansion && !config.getRowId) {
    throw new Error(
      '[nge-table] `enableRowExpansion` requires `config.getRowId`. Without it the engine ' +
        'keys `state.expanded` by array index, so a sort, a filter, or a re-fetch moves the ' +
        "user's opened rows onto different records."
    );
  }
}

/**
 * Keep the columns the library injects at the head of an explicit column order.
 *
 * The sibling of {@link applyPinningCapability}, and it exists for the same kind
 * of reason: `orderColumns` walks `state.columnOrder` and **appends** whatever it
 * did not find (`table-core/src/features/ColumnOrdering.ts`), so a host that hands
 * in an order listing only its own columns would push the library's own columns to
 * the far end of the row. Prepending them to `columns` makes them lead by
 * construction; this is what makes them lead once a consumer has an opinion about
 * order too.
 *
 * `injected` arrives in the order the columns should appear, so the two of them
 * cannot disagree about which leads — the failure a per-column sibling of this
 * function would have, each forcing itself to index 0.
 *
 * The **same reference** comes back whenever there is nothing to do — no injected
 * column, no explicit order, or one that already leads with them — which is the
 * overwhelmingly common case and is what keeps the boundary's echo check
 * identity-based.
 */
function applyInjectedColumnOrder(
  tableState: NgeTableState,
  injected: readonly string[]
): NgeTableState {
  const { columnOrder } = tableState;

  if (
    injected.length === 0 ||
    columnOrder.length === 0 ||
    injected.every((id, index) => columnOrder[index] === id)
  ) {
    return tableState;
  }

  return {
    ...tableState,
    columnOrder: [...injected, ...columnOrder.filter(id => !injected.includes(id))],
  };
}

/**
 * Blank out `columnPinning` when the config has pinning switched off.
 *
 * This papers over a genuine inconsistency in the engine. `getSortedRowModel`
 * filters `state.sorting` through `column.getCanSort()`, so `enableSorting:
 * false` suppresses sorting even when the state asks for it — a capability flag
 * gates the *effect*, not merely the affordance. `getLeftHeaderGroups()` does
 * not do the equivalent: it reads `state.columnPinning` raw and never consults
 * `getCanPin()`, so without this a table with `enablePinning: false` would still
 * grow pinned lanes. One transform here, in the single place engine-shaped
 * concerns live, is what makes the two flags mean the same kind of thing.
 *
 * The host's own state is never rewritten — a saved view keeps its pinned
 * columns across a toggle of the flag, and `stateChange` still emits them. And
 * the *same reference* comes back when there is nothing to strip, which is the
 * common case and is what lets the boundary's echo check stay identity-based.
 */
function applyPinningCapability(
  tableState: NgeTableState,
  pinningEnabled: boolean
): NgeTableState {
  if (pinningEnabled) {
    return tableState;
  }

  const { left, right } = tableState.columnPinning;

  return left?.length || right?.length
    ? { ...tableState, columnPinning: NO_COLUMN_PINNING }
    : tableState;
}

/**
 * Translate a `NgeTableConfig` plus the current state into engine options.
 *
 * The only place `@tanstack/*` option names appear, which is what makes the facade
 * real rather than nominal: a v9 rename lands here and nowhere else. It sits in its
 * own module for the same reason — the composition root imports it, and so does the
 * engine feature that owns the instance, so neither has to import the other.
 *
 * Only the core and sorted row models are wired. The remaining built-in features
 * (filtering + faceting, selection, expansion, grouping, pagination) each arrive
 * with their own story; every one of their state slices and `onXChange` handlers
 * is already routed, so switching one on is an options line rather than a
 * redesign — that is the whole reason the full contract ships in Wave 0.
 *
 * The state handed over is passed through {@link applyPinningCapability}, the one
 * place this library does not forward host state verbatim, and the only reason is
 * to make `enablePinning` behave the way the engine already makes `enableSorting`
 * behave.
 *
 * `features` are the `TableFeature`s to register — extension axis 1 of 4. They
 * arrive as an argument rather than being read off `config` because the engine
 * consumes `_features` **once**, when it constructs the instance, and at that
 * moment `config` is still `null`; see `NGE_TABLE_FEATURES` for the whole story.
 */
export function buildTableOptions(
  config: NgeTableConfig<unknown> | null,
  tableState: NgeTableState,
  writer: NgeTableStateWriter,
  features: readonly TableFeature[] = NGE_TABLE_CORE_FEATURES
): TableOptions<unknown> {
  const pinningEnabled = config?.enablePinning ?? false;
  // The raw options, which may be per-row predicates, kept apart from the plain
  // "is the feature on at all" answers the column injection and ordering need.
  const rowSelection = config?.enableRowSelection ?? false;
  const selectionEnabled = Boolean(rowSelection);
  const rowExpansion = config?.enableRowExpansion ?? false;
  const expansionEnabled = Boolean(rowExpansion);

  // In the order they render. The disclosure control leads because it describes
  // the row's own shape — whether it is showing more of itself — where a checkbox
  // describes the row's membership in a set the user is building.
  const injectedColumns = [
    ...(expansionEnabled ? [createNgeExpansionColumn()] : []),
    ...(selectionEnabled ? [createNgeSelectionColumn()] : []),
  ];

  // The same two, as ids. Taken from the constants rather than read back off the
  // definitions above because `ColumnDef.id` is optional in the engine's own type,
  // and a cast to paper over that would be asserting exactly what these constants
  // already state.
  const injectedColumnIds = [
    ...(expansionEnabled ? [NGE_TABLE_EXPANSION_COLUMN_ID] : []),
    ...(selectionEnabled ? [NGE_TABLE_SELECTION_COLUMN_ID] : []),
  ];

  assertSelectableRowsAreIdentified(config);
  assertEditableRowsAreIdentified(config);
  assertExpandableRowsAreIdentified(config);

  return {
    // Appended to the engine's fourteen built-ins, which carry no privileged
    // status — the library's own export seam and a consumer's addon register by
    // the identical route. `readonly` is dropped because the engine's own option
    // type is mutable; nothing writes to it.
    _features: features as TableFeature[],
    // The selection (ARCH-268) and expansion (ARCH-298) columns are injected rather
    // than declared, and here rather than anywhere else because this is the single
    // place a `NgeTableConfig` becomes engine options — the same reason every
    // `@tanstack/*` option name is confined to this function. Prepended, so they
    // lead without depending on `columnOrder`; `applyInjectedColumnOrder` covers
    // the case where a host has supplied one.
    columns:
      injectedColumns.length > 0
        ? [...injectedColumns, ...(config?.columns ?? [])]
        : (config?.columns ?? []),
    data: config?.data ?? [],
    // Bounds for any column whose definition omits them — this is what keeps the
    // `--nge-table-column-*-width` tokens and their TypeScript mirror agreeing.
    defaultColumn: {
      maxSize: config?.columnMaxWidth ?? NGE_TABLE_DEFAULTS.columnMaxWidth,
      minSize: config?.columnMinWidth ?? NGE_TABLE_DEFAULTS.columnMinWidth,
      size: config?.columnDefaultWidth ?? NGE_TABLE_DEFAULTS.columnDefaultWidth,
    },
    enableColumnResizing: config?.enableColumnResizing ?? false,
    enableHiding: config?.enableHiding ?? true,
    enableMultiRowSelection: config?.enableMultiRowSelection ?? true,
    enablePinning: pinningEnabled,
    // A consumer's predicate takes the row DATUM; the engine hands its own `Row`
    // wrapper to the option. Adapting here rather than exposing `Row` is the same
    // insulation every other part of this facade keeps — a consumer writing
    // `row => row.status !== 'archived'` must never need a `@tanstack/*` import.
    enableRowSelection:
      typeof rowSelection === 'function'
        ? (row: Row<unknown>) => rowSelection(row.original)
        : rowSelection,
    enableSorting: config?.enableSorting ?? true,
    getCoreRowModel: getCoreRowModel(),
    // ⚠️ **Supplying this is what switches expansion on, not `enableExpanding`.**
    // `row.getCanExpand()` falls back to `(enableExpanding ?? true) &&
    // !!row.subRows?.length` (`table-core/src/features/RowExpanding.ts:329`), and
    // flat data has no `subRows` — so without an override every row of every table
    // in this library answers `false` and nothing can ever be opened. The engine's
    // default is written for tree data; a detail band is the other half of the
    // feature and has to say so explicitly.
    //
    // A consumer's predicate takes the row DATUM, adapted here exactly as
    // `enableRowSelection` is above, so writing one never needs a `@tanstack/*`
    // import. `undefined` when the feature is off, which restores the engine's own
    // answer rather than pinning it to `false` — a host driving `state.expanded`
    // itself keeps working, the arrangement Wave 0 shipped and this story extends
    // rather than replaces.
    getRowCanExpand: expansionEnabled
      ? typeof rowExpansion === 'function'
        ? (row: Row<unknown>) => rowExpansion(row.original)
        : () => true
      : undefined,
    getRowId: config?.getRowId,
    getSortedRowModel: getSortedRowModel(),
    // The two filter slices are the only ones where our type is *narrower* than
    // the engine's. The engine treats a filter payload as opaque (`unknown`);
    // `NgeTableState` narrows it to JSON so "this state can be persisted" is a
    // compile-time property. The cast is where that promise is imposed — the
    // engine never reads the value, it only carries it.
    onColumnFiltersChange: updater =>
      writer.applyTableStateChange('columnFilters', updater as Updater<NgeTableColumnFilter[]>),
    onColumnOrderChange: updater => writer.applyTableStateChange('columnOrder', updater),
    onColumnPinningChange: updater => writer.applyTableStateChange('columnPinning', updater),
    onColumnSizingChange: updater => writer.applyTableStateChange('columnSizing', updater),
    onColumnVisibilityChange: updater => writer.applyTableStateChange('columnVisibility', updater),
    onExpandedChange: updater => writer.applyTableStateChange('expanded', updater),
    onGlobalFilterChange: updater =>
      writer.applyTableStateChange(
        'globalFilter',
        updater as Updater<NgeTableState['globalFilter']>
      ),
    onPaginationChange: updater => writer.applyTableStateChange('pagination', updater),
    onRowSelectionChange: updater => writer.applyTableStateChange('rowSelection', updater),
    onSortingChange: updater => writer.applyTableStateChange('sorting', updater),
    // The route an ADDON's state slice takes home, and the only reason it is not
    // redundant with the eleven handlers above. `makeStateUpdater` — the engine's
    // own helper, and what a `TableFeature`'s `getDefaultOptions` reaches for —
    // writes through `table.setState`, which forwards to this and to nothing else
    // (`table-core/src/core/table.ts` → `setState`). Leave it unwired and an addon
    // still *appears* to work: the Angular adapter keeps an internal state signal
    // and absorbs the write, so the slice renders and even survives a scroll while
    // never reaching `NgeTableState`, never emitting on `stateChange`, and never
    // round-tripping. Failing that quietly is what made this worth one line.
    //
    // The built-ins never arrive here. Each one's `getDefaultOptions` supplies its
    // own `onXChange` as a *default*, and every one of them is overridden above —
    // so sorting, pinning, and sizing route per-slice, and only a feature keeping
    // `makeStateUpdater` (i.e. an addon) reaches this.
    // The cast is the same promise the two filter handlers above impose, arriving
    // by the same route: the engine's `TableState` types a filter payload as
    // `unknown` where ours narrows it to JSON, so a whole-state updater is the one
    // shape where that difference surfaces. The engine never reads the value, it
    // only carries it.
    onStateChange: updater => writer.applyTableState(updater as Updater<NgeTableState>),
    state: applyInjectedColumnOrder(
      applyPinningCapability(tableState, pinningEnabled),
      injectedColumnIds
    ),
  };
}
