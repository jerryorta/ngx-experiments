import type { NgeTableState } from '@nge/table';
import type { RowData, Table, TableFeature } from '@tanstack/angular-table';

import { makeStateUpdater } from '@tanstack/angular-table';

/**
 * Which rows a user has flagged, as an id-keyed slice of the host's table state.
 *
 * Deliberately trivial as a *feature* — flagging rows is the smallest thing that
 * still has to carry state — because what this library exists to demonstrate is
 * the packaging, not the behaviour. See the library README for what is under test.
 *
 * A row id is whatever `config.getRowId` returns, so the slice survives a sort or
 * a re-fetch. Plain JSON, so a host can persist it alongside the rest of the view.
 */
export interface AcmeRowFlagState {
  flagged: string[];
}

/**
 * The host's state, extended with this addon's slice.
 *
 * ⚠️ **Augmented through the library's PUBLIC specifier**, not a relative path.
 * `@nge/table` re-exports `NgeTableState` with `export *`, and TypeScript
 * resolves the name through a star-export to the original declaration and merges
 * there — so this reaches the same interface the library's own `applyTableState`
 * and `stateChange` are typed against. That is the whole claim this project exists
 * to prove, and it is why no first-party file had to change for this addon to work.
 *
 * ⚠️ **Optional, and `acme`-namespaced.** Optional because `createNgeTableState()`
 * builds a complete state from the slices it knows about and cannot know about this
 * one — a required field would break every construction of a state object the
 * moment this module is imported anywhere in the program. Namespaced because the
 * interface is globally merged, so one name space is shared by every addon and every
 * consuming domain in the workspace; a bare `flags` would be claimed by whoever
 * declared it first.
 */
declare module '@nge/table' {
  interface NgeTableState {
    acmeRowFlag?: AcmeRowFlagState;
  }
}

/**
 * The same slice on the engine's state, plus the instance API.
 *
 * ⚠️ **Augmented through `@tanstack/angular-table`, never `@tanstack/table-core`.**
 * The adapter is the workspace's declared dependency; the core is only its transitive
 * one, so naming it directly is an undeclared dep. The adapter's `index.d.ts` is
 * `export * from '@tanstack/table-core'`, so augmenting it merges into the core's own
 * `TableState` — which is what `makeStateUpdater<K extends keyof TableState>` requires
 * before it will accept this key.
 *
 * Declared on both states on purpose, and it is not duplication: `NgeTableState` and
 * TanStack's `TableState` are separate types that happen to be structurally identical.
 * The host reads and writes one, the engine reads the other.
 */
declare module '@tanstack/angular-table' {
  interface TableState {
    acmeRowFlag?: AcmeRowFlagState;
  }

  // `TData` is unused by the members below but cannot be dropped or renamed:
  // TypeScript requires every declaration of an interface to carry *identical* type
  // parameters (TS2428), names included, or the merge is rejected outright.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface Table<TData extends RowData> {
    /** Drop every flag. Returns the state unchanged when nothing is flagged. */
    clearAcmeRowFlags: () => void;
    /** The current slice, normalised. Never `undefined`. */
    readAcmeRowFlags: () => AcmeRowFlagState;
    /** Add or remove one row's flag, keyed by `config.getRowId`. */
    toggleAcmeRowFlag: (rowId: string) => void;
    /**
     * Write the slice through the engine's own updater plumbing.
     *
     * `makeStateUpdater` → `table.setState` → `options.onStateChange`, which the
     * library routes into the host's state. No privileged access to its store.
     */
    writeAcmeRowFlag: (updater: (state: AcmeRowFlagState) => AcmeRowFlagState) => void;
  }
}

/**
 * The shared empty slice.
 *
 * Safe to share because nothing here mutates — every change produces a replacement —
 * and returning one reference is what lets an unchanged write be detected by identity.
 */
const ACME_ROW_FLAG_EMPTY: AcmeRowFlagState = { flagged: [] };

/** A fresh, empty slice, optionally seeded. Always a new object. */
export function createAcmeRowFlagState(
  overrides: Partial<AcmeRowFlagState> = {}
): AcmeRowFlagState {
  return { flagged: [], ...overrides };
}

/**
 * The slice as it stands, tolerating the shapes a host can legitimately hand in.
 *
 * ⚠️ An addon's updater is handed whatever the state currently holds for its key,
 * which is `undefined` until the first write — `getInitialState` seeds the *engine's*
 * initial state, never the host's object. Normalising rather than assuming is what
 * keeps a host that built its state with `createNgeTableState()` from breaking on
 * the first interaction.
 */
export function normalizeAcmeRowFlagState(state: AcmeRowFlagState | undefined): AcmeRowFlagState {
  return state && Array.isArray(state.flagged) ? state : ACME_ROW_FLAG_EMPTY;
}

/** Read this addon's slice off a host-owned table state. */
export function readAcmeRowFlagsFromState(state: NgeTableState): AcmeRowFlagState {
  return normalizeAcmeRowFlagState(state.acmeRowFlag);
}

/** Add or remove one row id. */
export function toggleAcmeRowFlagIn(
  state: AcmeRowFlagState | undefined,
  rowId: string
): AcmeRowFlagState {
  const current = normalizeAcmeRowFlagState(state);

  return current.flagged.includes(rowId)
    ? { ...current, flagged: current.flagged.filter(id => id !== rowId) }
    : { ...current, flagged: [...current.flagged, rowId] };
}

/**
 * Drop every flag, returning the **same reference** when nothing is flagged.
 *
 * That identity is load-bearing rather than an optimisation: `makeStateUpdater`
 * allocates a new top-level state object whether or not the slice moved, so without
 * it a clear on an unflagged table would still churn the host's state and emit a
 * `stateChange` — the same discipline that keeps `columnSizing` quiet.
 */
export function clearAcmeRowFlagsIn(state: AcmeRowFlagState | undefined): AcmeRowFlagState {
  const current = normalizeAcmeRowFlagState(state);

  return current.flagged.length === 0 ? current : createAcmeRowFlagState();
}

/**
 * Row flagging as a `TableFeature`, shipped from **outside** `libs/shared/table`.
 *
 * ```ts
 * @Component({ providers: [provideNgeTableFeatures(acmeRowFlagging)], … })
 * ```
 *
 * Registered exactly the way a first-party feature is — through the `_features`
 * array, with no privileged status — and carrying state exactly the way the
 * first-party `ngeCellHighlighting` does, through two declaration merges and
 * `makeStateUpdater`. The only difference is that this file lives in a different Nx
 * project and names both modules by their public specifiers.
 *
 * ⚠️ **`config.getRowId` stops being optional once this is switched on.** Flags are
 * keyed by row id, so without one the engine keys rows by array index and a sort or a
 * re-fetch silently moves a user's flags onto different records.
 *
 * ⚠️ **No member may be named `get*`.** `@tanstack/angular-table` proxies the instance
 * and turns every `get*` accessor into a computed, which swallows arguments — hence
 * `readAcmeRowFlags` rather than `getAcmeRowFlags`.
 */
export const acmeRowFlagging: TableFeature = {
  createTable: <TData extends RowData>(table: Table<TData>): void => {
    // The engine's own helper rather than a hand-rolled `setState`, so a
    // value-versus-callback updater resolves with exactly the engine's semantics.
    // Built once per table.
    const write = makeStateUpdater('acmeRowFlag', table);

    table.readAcmeRowFlags = () => normalizeAcmeRowFlagState(table.getState().acmeRowFlag);

    // Reading through `getState()` is how every built-in feature reads its slice, and
    // it is not what the controlled-state contract forbids: `options.state` IS the
    // host's state, handed in on every recompute. What the contract rules out is
    // treating the instance as the source of truth — which is why the write below
    // leaves through `onStateChange` rather than staying here.
    table.writeAcmeRowFlag = updater => {
      const current = table.readAcmeRowFlags();

      if (updater(current) !== current) {
        write(state => updater(normalizeAcmeRowFlagState(state)));
      }
    };

    table.toggleAcmeRowFlag = rowId => {
      table.writeAcmeRowFlag(state => toggleAcmeRowFlagIn(state, rowId));
    };

    table.clearAcmeRowFlags = () => {
      table.writeAcmeRowFlag(clearAcmeRowFlagsIn);
    };
  },

  /**
   * Seeds the engine's `initialState`, so the instance can answer before the host has
   * ever written the slice.
   *
   * It does **not** reach `NgeTableState` — the host owns that object and the library
   * does not write to it uninvited. That asymmetry is why every updater above
   * normalises rather than assuming this ran.
   */
  getInitialState: (state): Record<string, unknown> => ({
    acmeRowFlag: createAcmeRowFlagState(),
    ...state,
  }),
};
