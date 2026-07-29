/**
 * Any value that survives a `JSON.stringify` / `JSON.parse` round trip unchanged.
 *
 * Filter payloads are the one place a consumer can put arbitrary data into table
 * state, so they are the one place that could quietly break persistence. Typing
 * them as JSON rather than `unknown` (TanStack's choice) makes "this state can be
 * written to Firestore" a compile-time property instead of a convention nobody
 * checks until a `Date` comes back as a string.
 */
export type NgeTableJsonValue =
  boolean | NgeTableJsonValue[] | null | number | string | { [key: string]: NgeTableJsonValue };

/** One entry in the sort stack — `desc` rather than a direction string, matching the engine. */
export interface NgeTableColumnSort {
  desc: boolean;
  id: string;
}

/** A single column's active filter, keyed by column id. */
export interface NgeTableColumnFilter {
  id: string;
  value: NgeTableJsonValue;
}

/** Which columns are frozen to which edge. Ids only — geometry is derived, never stored. */
export interface NgeTableColumnPinning {
  left?: string[];
  right?: string[];
}

/** Zero-based page index plus page size. */
export interface NgeTablePagination {
  pageIndex: number;
  pageSize: number;
}

/**
 * Expansion state: a per-row map, or `true` meaning "everything is expanded".
 *
 * The `true` shorthand comes from the engine and is worth keeping — expand-all on
 * a 10,000-row tree should not have to materialise 10,000 map entries.
 */
export type NgeTableExpanded = Record<string, boolean> | true;

/**
 * Selection state: row id → selected (ARCH-268).
 *
 * ⚠️ **An unselected row is an ABSENT key, never a `false` one.** That is the
 * engine's own convention — `mutateRowIsSelected` deselects with `delete` and
 * `getIsSelected` tests truthiness — and it is what stops the map growing without
 * bound across a session of clicking rows on and off, which matters here more than
 * it does for the engine because this object is the one a host persists.
 *
 * A row id is whatever `config.getRowId` returns. ⚠️ Without one the engine keys
 * rows by array index, so a re-fetch that reorders rows moves the user's selection
 * onto different records — which is why switching selection on without a
 * `getRowId` fails loudly in dev rather than degrading quietly.
 */
export type NgeTableRowSelection = Record<string, boolean>;

/**
 * The complete interaction state of a table, owned by the **host**, not the table.
 *
 * This is the load-bearing type of the whole library. The engine is perfectly
 * happy to keep sorting / filtering / pagination inside itself, and client-side
 * the two arrangements are indistinguishable — which is exactly the trap. Only
 * host-owned state makes server-side mode a later `manualSorting` /
 * `manualFiltering` / `manualPagination` flag flip rather than a rewrite of every
 * feature that touched the internal copy. So state lives here, is handed in, and
 * is re-emitted on every change; nothing in the library reads it back off the
 * table instance as a source of truth.
 *
 * Every field is plain JSON, and a spec asserts the round trip. That is what lets
 * a consumer persist a user's view — their sort, their column widths, their
 * pinned columns — to Firestore and restore it later.
 *
 * Declared here rather than aliased to TanStack's `TableState` on purpose. The
 * engine's type is a feature-by-feature union that also carries derived scratch
 * state (`columnSizingInfo`, for one), and it is not something consumers should
 * be pinned to across a v9 upgrade. The shapes are structurally identical, so
 * they interoperate without conversion.
 *
 * Fields are mutable so they stay assignable to the engine's own state slices;
 * the library nonetheless treats every value as immutable and replaces rather
 * than mutates.
 *
 * ## Addon slices
 *
 * An addon `TableFeature` adds its own slice by **declaration-merging this
 * interface** — the same move the library already makes on TanStack's `Table` and
 * `ColumnMeta` (`export/nge-table-export-feature.ts`, `export/nge-table-export.ts`):
 *
 * ```ts
 * declare module '../nge-table-state' {
 *   interface NgeTableState {
 *     ngeHighlight?: NgeHighlightState;
 *   }
 * }
 * ```
 *
 * ⚠️ **An in-library addon uses the relative specifier above**, because a library
 * cannot import its own barrel: the import is circular, and Nx's module-boundary
 * rule rejects a project reaching itself through its own path alias.
 *
 * An addon shipping from **another project** augments `@nge/table`
 * instead. `src/index.ts` re-exports this interface with `export *`, and
 * TypeScript resolves the name in an augmentation through a star-export to the
 * declaration behind it — so both specifiers merge into this one interface, and an
 * external slice is visible to `applyTableState` and `stateChange` exactly like an
 * in-library one. ⚠️ The augmenting file must also **import** the module it
 * augments, or TypeScript raises TS2664 and the augmentation is dropped whole.
 * `libs/shared/table-addon-conformance` is the worked example and the regression
 * guard for both halves.
 *
 * Three rules, each load-bearing:
 *
 * - **Optional.** {@link createNgeTableState} builds a complete state from the
 *   fields it knows about, and it cannot know about an addon's. A required field
 *   would make every construction of a state object fail to compile the moment an
 *   addon is imported anywhere in the program.
 * - **`nge`-namespaced.** This interface is globally merged, so every addon and
 *   every consuming domain in the workspace shares one name space; a bare
 *   `highlight` would be claimed by whoever declared it first.
 * - **JSON-valued.** The persistability promise above is the whole point of the
 *   type being declared rather than aliased. An addon storing a `Date`, a `Map`,
 *   or a class instance silently breaks it, and `nge-table-state.spec.ts` only
 *   asserts the round trip for the slices it can see.
 *
 * Writes reach here through the engine's own `makeStateUpdater`, which
 * `buildTableOptions` routes back via `onStateChange` — so an addon slice
 * round-trips through `state` / `stateChange` exactly like a built-in one, and the
 * addon needs no privileged access to the store. ⚠️ An addon's updater is handed
 * whatever this state currently holds for its key, which is `undefined` until the
 * first write; normalise it rather than assuming `getInitialState` seeded it, or a
 * host that hands in a state built by {@link createNgeTableState} breaks on the
 * first interaction.
 */
export interface NgeTableState {
  columnFilters: NgeTableColumnFilter[];
  columnOrder: string[];
  columnPinning: NgeTableColumnPinning;
  /** Column id → pixel width, written by drag-to-resize (ARCH-244). */
  columnSizing: Record<string, number>;
  /** Column id → visible. Absent means visible. */
  columnVisibility: Record<string, boolean>;
  expanded: NgeTableExpanded;
  /** The cross-column search term. `null` when no global filter is active. */
  globalFilter: NgeTableJsonValue;
  pagination: NgeTablePagination;
  /** Row id → selected, written by the selection UI (ARCH-268). */
  rowSelection: NgeTableRowSelection;
  sorting: NgeTableColumnSort[];
}

/** Page size applied when a consumer supplies no pagination of its own. */
export const NGE_TABLE_DEFAULT_PAGE_SIZE = 50;

/**
 * A fresh, empty {@link NgeTableState}, optionally seeded.
 *
 * Always returns a new object with new nested collections, so two tables built
 * from the same call can never end up sharing a sort array.
 */
export function createNgeTableState(overrides: Partial<NgeTableState> = {}): NgeTableState {
  return {
    columnFilters: [],
    columnOrder: [],
    columnPinning: { left: [], right: [] },
    columnSizing: {},
    columnVisibility: {},
    expanded: {},
    globalFilter: null,
    pagination: { pageIndex: 0, pageSize: NGE_TABLE_DEFAULT_PAGE_SIZE },
    rowSelection: {},
    sorting: [],
    ...overrides,
  };
}

/**
 * The shared empty state used as the `state` input's default, so a consumer that
 * does not care about state can still render a table.
 *
 * Safe to share because the library never mutates state in place — every change
 * produces a replacement object. Call {@link createNgeTableState} instead when
 * you need something you intend to own and modify.
 */
export const NGE_TABLE_INITIAL_STATE: NgeTableState = createNgeTableState();
