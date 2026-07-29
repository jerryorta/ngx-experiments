import type { NgeCellEditTarget } from '../../edit';
import type { NgeTableConfig } from '../../nge-table-config';
import type { NgeTableState } from '../../nge-table-state';
import type { NgeTableResizeStart } from './nge-table-resize';
import type { NgeCellRegistration, NgeTableSlotRegistration } from './nge-table-slot-registry';

import { NGE_TABLE_INITIAL_STATE } from '../../nge-table-state';

/**
 * What the component-scoped store holds.
 *
 * The config is **payload-agnostic** (`unknown` rather than a generic `TRow`).
 * `signalStore()` produces a concrete class and cannot carry a type parameter, so
 * the generic is narrowed away at the `<nge-table>` boundary and re-narrowed on
 * the way out — the same arrangement the calendar store uses. The runtime object
 * is untouched either way; only the phantom type moves.
 *
 * `tableState` rather than `state` because `state` is already the vocabulary
 * `@ngrx/signals` uses for the store as a whole, and confusing the two is how a
 * `patchState(store, { state })` typo becomes a silent no-op.
 */
export interface NgeTableStoreState {
  /**
   * The `[ngeCell]` templates a consumer projected, in content order (ARCH-246).
   *
   * Pushed in by `<nge-table>` for the same reason
   * {@link NgeTableStoreState.scrollElement} is: the store has no view, so it
   * cannot run a `contentChildren` query of its own. Held as the structural
   * registration shape rather than as `NgeCellDirective` instances so the
   * indexing that reads them can be exercised without standing up a component.
   */
  cellTemplates: readonly NgeCellRegistration[];
  config: NgeTableConfig<unknown> | null;
  /**
   * The cell whose editor is open (ARCH-292), or `null` when none is.
   *
   * Scratch, like {@link NgeTableStoreState.resize}, and deliberately NOT part of
   * {@link NgeTableState}: an in-progress edit records what the user is *doing*,
   * not what the table *is*. ARCH-268 made exactly this call for its selection
   * anchor, and a saved view restoring an open editor would be the worse version of
   * the same mistake — it would re-open one on a row the user never touched. What
   * the host owns is the *outcome*, and it does not travel through state at all: it
   * arrives as an `edit-intent` event for the host to apply to its own data.
   *
   * ⚠️ **Keyed by ids, never a DOM flag and never a field on the datum.**
   * Virtualization recycles rows, so a draft held on an element belongs to whichever
   * record that element is showing *now* — and `config.data` belongs to the host
   * (rows from an NgRx store are frozen under `strictStateImmutability` and would
   * throw outright).
   *
   * ⚠️ **Dropped when the edited row leaves the rendered window.** Cancelling is the
   * honest outcome of scrolling away mid-edit; carrying the draft would land it on a
   * recycled row, which reads as data corruption rather than as a bug.
   */
  editing: NgeCellEditTarget | null;
  /**
   * The column-resize drag in flight, or `null` between drags.
   *
   * Deliberately NOT part of {@link NgeTableState}: it is scratch state for one
   * gesture, meaningless the instant a pointer is released and worthless in a
   * saved view. The engine keeps its own equivalent (`columnSizingInfo`) for the
   * same reason, and ARCH-242 excluded that from the persisted contract too. What
   * the host owns is the *outcome* — `columnSizing`.
   */
  resize: NgeTableResizeStart | null;
  /**
   * The element that scrolls — `.nge-table__viewport` — once the view has been
   * created, `null` before it.
   *
   * Pushed in by `<nge-table>` rather than looked up here, because the store has
   * no view of its own to query. The row virtualizer windows over whatever this
   * holds, and holding `null` for the first render is the normal path, not an
   * error state: the virtualizer simply observes nothing until the viewport
   * exists. Scratch, like {@link NgeTableStoreState.resize} — a DOM node is
   * nothing a saved view could carry.
   */
  scrollElement: HTMLElement | null;
  /**
   * The row a shift-click extends *from* — the last row the user selected
   * deliberately (ARCH-268), or `null` before the first gesture.
   *
   * Scratch, like {@link NgeTableStoreState.resize}, and deliberately NOT part of
   * {@link NgeTableState}: it is where a gesture started, not what the table is,
   * and a saved view restoring an anchor would have a user's next shift-click
   * extend from a row they never touched in this session. The *outcome* —
   * `rowSelection` — is what the host owns.
   *
   * Cleared whenever the selection is emptied, so a later shift-click cannot
   * extend from a row that is no longer marked. ARCH-250 reached the same
   * conclusion about its highlight anchor for the same reason.
   */
  selectionAnchorRowId: null | string;
  /** The `[ngeTableSlot]` templates a consumer projected, in content order (ARCH-246). */
  slotTemplates: readonly NgeTableSlotRegistration[];
  tableState: NgeTableState;
}

/**
 * The pre-config baseline. `config` is null until `<nge-table>` pushes the
 * consumer's config in, so the store can be constructed before there is anything
 * to render — a table with no rows is a valid intermediate state, not an error.
 */
export const initialNgeTableStoreState: NgeTableStoreState = {
  cellTemplates: [],
  config: null,
  editing: null,
  resize: null,
  scrollElement: null,
  selectionAnchorRowId: null,
  slotTemplates: [],
  tableState: NGE_TABLE_INITIAL_STATE,
};
