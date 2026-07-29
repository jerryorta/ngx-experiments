import type {
  NgeTableColumnFilter,
  NgeTableColumnPinning,
  NgeTableColumnSort,
  NgeTableExpanded,
  NgeTableJsonValue,
  NgeTablePagination,
  NgeTableRowSelection,
} from '../nge-table-state';
import type { NgeCellContext, NgeRowContext } from '../slots';

/**
 * Everything the table announces, as one `kind`-discriminated union.
 *
 * **One output carrying a union, never N outputs.** With N outputs every new
 * event is a public API change on `<nge-table>` — a new `@Output`, a new binding
 * a consumer has to know exists, and a component signature that grows for the
 * lifetime of the library. With one output a new event is a *member*: consumers
 * that already bind `(ngeTableEvent)` receive it without changing a line, and
 * the ones that do not care keep ignoring the kinds they do not switch on. That
 * is extension axis 4 of 4, and the property ARCH-250 / ARCH-251 audit.
 *
 * **Events are notifications, not the state contract.** They describe what the
 * table *did*; {@link NgeTableState} describes what the table *is*. State still
 * flows through the `state` / `stateChange` pair, and nothing here is a second
 * place to read it from — an event carries the resulting slice so a listener can
 * act without a follow-up query, not so it can be accumulated into a rival copy.
 *
 * ⚠️ **The `*-intent` kinds are the exception, and it is deliberate** (ARCH-271,
 * ARCH-292). Every other kind reports something the table has already done; those two
 * report something the table is *proposing* and will not do on its own. A host that
 * ignores one sees no fill, or no edit, at all. That is the shape every "the library
 * wants to change your data" kind takes, because the library owns no data and must
 * never acquire any — so the only honest move it has is to ask.
 *
 * They stay **distinct kinds over a shared payload** ({@link NgeCellPatch}), so one
 * host handler can serve both while a host that accepts fills and rejects edits still
 * has somewhere to draw the line. Collapsing them would remove that choice.
 *
 * **Only the table's own changes emit.** State a host pushes in through `state`
 * is silent, because an echo of the host's own write is not news and would make a
 * two-way binding look like user activity.
 *
 * @typeParam TRow - The shape of one row of data.
 */
export type NgeTableEvent<TRow> =
  | {
      /**
       * A click landed on a row.
       *
       * Emitted after the `cell-click` for the same click. A click on a row's own
       * padding or on a `row-detail` band emits this alone, because no cell was
       * under the pointer.
       */
      kind: 'row-click';
      /** The clicked row, in the same shape a `row-detail` template is handed. */
      row: NgeRowContext<TRow>;
    }
  | {
      /**
       * The cells the edit proposes to change.
       *
       * An array for one committed cell today, and an array anyway: it is what lets a
       * host's `fill-intent` handler serve this kind unchanged, and what a future
       * multi-cell commit — a paste, an edit applied down a selection — would need
       * without a second shape.
       */
      cells: readonly NgeCellPatch[];
      /**
       * A cell editor committed, proposing a new value (ARCH-292).
       *
       * ⚠️ **The table has changed nothing.** It owns no data, so it announces the
       * cell it would write and waits for the host to apply it and hand new `data`
       * back in — the contract `fill-intent` established, extended to editing rather
       * than re-decided. Ignore this event and the edit does not happen, which is the
       * correct behaviour for a host that has not opted into editing.
       *
       * Emitted **once, on commit**. A cancelled edit (`Escape`), and one scrolled out
       * of the virtualized window mid-flight, emit nothing at all.
       */
      kind: 'edit-intent';
    }
  | {
      /**
       * The clicked cell, in the same shape a `[ngeCell]` template is handed —
       * and, for a cell already rendered through the slot seam, the very same
       * memoised object. Two seams, one vocabulary for "what a cell is".
       */
      cell: NgeCellContext<TRow>;
      /**
       * A click landed inside a cell.
       *
       * Emitted before {@link NgeTableEvent} `row-click` for the same click,
       * because the cell is inside the row and the two ride ordinary DOM
       * bubbling. A control inside a cell that should not read as a click on the
       * table needs `$event.stopPropagation()` — the same arrangement ARCH-244's
       * resize grip and ARCH-246's header slots already use.
       */
      kind: 'cell-click';
    }
  | {
      /**
       * The set of selected rows changed (ARCH-268).
       *
       * Emitted for every route the user can take — a checkbox, a click, a
       * cmd/ctrl-click, a shift-click range, `Space` on a focused row, and the
       * header's select-all — because all of them land in `state.rowSelection`
       * through the same slice write. A **range is one event, not one per row**:
       * the gesture writes the whole slice once.
       */
      kind: 'selection-change';
      /**
       * The whole resulting `state.rowSelection` slice, ready to persist.
       *
       * The slice rather than "the row the user clicked", for the same reason
       * `sort-change` carries the stack: the clicked row is ill-defined for a
       * range and does not exist at all for select-all. ⚠️ An unselected row is an
       * absent key, never a `false` one.
       */
      rowSelection: NgeTableRowSelection;
    }
  | {
      /**
       * The whole resulting `state.expanded` slice, ready to persist.
       *
       * ⚠️ **May be the literal `true`, not only a map.** That is the engine's own
       * shorthand for "everything is open", kept because expand-all over ten
       * thousand rows should not have to materialise ten thousand keys — so a
       * listener that reads this as a `Record` is wrong for exactly the gesture
       * most likely to produce a large payload.
       */
      expanded: NgeTableExpanded;
      /**
       * The set of expanded rows changed (ARCH-298).
       *
       * Emitted for every route the user can take — the disclosure control, a
       * keyboard activation of it, the header's expand-all, and a `row-detail`
       * band collapsing itself — because all of them land in `state.expanded`
       * through the same slice write.
       *
       * ⚠️ **An observation, not an intent.** Unlike `edit-intent` and
       * `fill-intent`, the table has already changed the state this describes:
       * expansion is interaction state the library owns end to end, not a proposed
       * change to a host's data. A host that ignores this event still gets a
       * working table.
       */
      kind: 'expansion-change';
    }
  | {
      /** Every cell the fill proposes to change, in view order. */
      cells: readonly NgeCellPatch[];
      /**
       * A fill handle was dragged and released, proposing new values (ARCH-271).
       *
       * ⚠️ **The first kind a host is expected to ACT on rather than observe.** The
       * table has changed nothing and will change nothing: it owns no data, so it
       * announces the cells it would write and waits for the host to apply them and
       * hand new `data` back in. Ignore this event and the fill simply does not
       * happen — which is the correct behaviour for a host that has not opted into
       * editing, not a bug.
       *
       * Emitted **once, on release**. A cancelled drag (`Escape`) and a release back
       * on the origin cell emit nothing at all, so a listener never has to filter out
       * empty proposals.
       */
      kind: 'fill-intent';
      /** The columns the values were extended from, in visual order. */
      sourceColumnIds: readonly string[];
      /** The rows the values were extended from, in the processed order. */
      sourceRowIds: readonly string[];
    }
  | {
      /** Page changed, or the page size did. */
      kind: 'pagination-change';
      /** The whole resulting `state.pagination` slice. */
      pagination: NgeTablePagination;
    }
  | {
      /** The sort changed. */
      kind: 'sort-change';
      /**
       * The whole resulting sort stack, innermost first — empty when the sort was
       * cleared.
       *
       * The stack rather than "the column the user clicked", because that column
       * is ill-defined for a multi-column sort and does not exist at all when a
       * toggle *clears* one. In the ordinary single-column case it is
       * `sorting[0].id`.
       */
      sorting: NgeTableColumnSort[];
    }
  | {
      /** The whole resulting `state.columnFilters` slice. */
      columnFilters: NgeTableColumnFilter[];
      /** The resulting `state.globalFilter` — `null` when no cross-column term is active. */
      globalFilter: NgeTableJsonValue;
      /**
       * A filter changed — per-column or global.
       *
       * One kind for both because a consumer reacting to "the visible rows may
       * have moved" does not care which of the two moved, and both resulting
       * slices are carried so the one that does care need not ask.
       */
      kind: 'filter-change';
    }
  | {
      /** The whole resulting `state.columnOrder` slice. */
      columnOrder: string[];
      /** Columns were reordered. */
      kind: 'column-reorder';
    }
  | {
      /** The whole resulting `state.columnPinning` slice. */
      columnPinning: NgeTableColumnPinning;
      /** A column was frozen to an edge, or released from one. */
      kind: 'column-pin';
    }
  | {
      /** Visible leaf columns, matching the grid's `aria-colcount`. */
      columnCount: number;
      /**
       * The **processed** row model settled — rows arrived, or a sort or filter
       * re-ran over them.
       *
       * "Complete for the current row model", deliberately, rather than "after
       * virtualized paint": it is the *data* being ready, which is what a
       * consumer wanting to hide a spinner or measure a fetch is actually waiting
       * for. Scrolling never re-emits it, and neither does a resize or a pin —
       * none of those change which rows exist.
       *
       * Always precedes the matching `render-complete`.
       */
      kind: 'load-complete';
      /** Rows in the processed model — what the user would see, not what was supplied. */
      rowCount: number;
    }
  | {
      /** Visible leaf columns, matching the grid's `aria-colcount`. */
      columnCount: number;
      /**
       * The DOM for the current row model has been committed.
       *
       * The paint half of the pair `load-complete` opens. Emitted from an
       * after-render hook, so a listener may measure the table, scroll it, or
       * screenshot it and find the rows actually there.
       *
       * ⚠️ It describes the **row model**, not the scroll position: scrolling a
       * virtualized table re-windows the DOM many times a second and does **not**
       * re-emit this. Per-frame render notifications are deliberately absent.
       * {@link NgeTableEvent} `render-complete`'s `renderedRowCount` is therefore
       * the window as first painted for this row model — which is exactly the
       * number that shows virtualization working.
       */
      kind: 'render-complete';
      /** Rows actually in the DOM — the window, or every row when virtualization is off. */
      renderedRowCount: number;
      /** Rows in the processed model. */
      rowCount: number;
    }
  | {
      /** Which column changed width. */
      columnId: string;
      /** The whole resulting `state.columnSizing` slice, ready to persist. */
      columnSizing: Record<string, number>;
      /**
       * A column's width was **committed** — a drag released, an arrow-key step,
       * or a reset.
       *
       * ⚠️ Emitted on commit, never per `pointermove`. A drag writes
       * `state.columnSizing` on every frame (that is what makes the column follow
       * the pointer), and mirroring that into the event stream would hand a
       * consumer sixty events per second to debounce. `stateChange` still carries
       * every intermediate width for anyone who genuinely wants the live value.
       */
      kind: 'column-resize';
      /** The column's width after the change, already clamped to its bounds. */
      width: number;
    };

/**
 * One cell the library proposes to change — the payload `fill-intent` (ARCH-271) and
 * `edit-intent` (ARCH-292) share.
 *
 * Shared rather than duplicated so a host writes **one** apply function and points
 * both kinds at it; the kinds stay distinct so a host that wants only one still has
 * somewhere to say so.
 *
 * Lives here rather than with the fill addon because the **event union is core** and
 * must not import from an addon — the dependency runs the other way, exactly as it
 * does for `NgeCellContext`. It is plain data on purpose: ids and values, nothing
 * that would make a host reach for a `@tanstack/*` type or resolve a descriptor.
 */
export interface NgeCellPatch {
  columnId: string;
  /**
   * What the cell holds today, so the host can reverse the proposal.
   *
   * ⚠️ **This is the epic's answer to "undo belongs to the host".** The host owns the
   * data and could snapshot it itself, but an intent carrying only the new values
   * forces every consumer to build the same before-image independently — and to build
   * it *before* applying, which is easy to get wrong exactly once. Carrying it costs
   * one read per cell on a walk already reading every cell.
   *
   * It is not a guarantee of reversibility: a host whose data moved between the
   * emission and the undo is reversing against a table that no longer matches. That is
   * inherent to owning the data, and is the host's to reason about.
   */
  previousValue: unknown;
  rowId: string;
  /** What the fill or the edit proposes it should hold. */
  value: unknown;
}

/** The discriminant of {@link NgeTableEvent}. */
export type NgeTableEventKind = NgeTableEvent<never>['kind'];

/**
 * Every kind the table can emit, as a value.
 *
 * The runtime mirror of {@link NgeTableEventKind}, for the same reason
 * `NGE_TABLE_SLOT_NAMES` is the runtime mirror of the slot-name union: a
 * consumer building a log, a filter, or a debug panel needs the list at runtime
 * and should not have to restate it. `nge-table-event.spec.ts` holds a
 * compile-time exhaustiveness gate, so a union member added without an entry here
 * fails the build rather than quietly going missing from every consumer's UI.
 */
export const NGE_TABLE_EVENT_KINDS = [
  'cell-click',
  'column-pin',
  'column-reorder',
  'column-resize',
  'edit-intent',
  'expansion-change',
  'fill-intent',
  'filter-change',
  'load-complete',
  'pagination-change',
  'render-complete',
  'row-click',
  'selection-change',
  'sort-change',
] as const satisfies readonly NgeTableEventKind[];

/**
 * Where the table hands an event over.
 *
 * The whole emission pipeline: one function, set once by `<nge-table>` to its
 * own `ngeTableEvent` output. Adding a kind never touches it — that is what
 * "additive" means on this axis. Payload-agnostic (`unknown` rather than `TRow`)
 * because the store that calls it is; the phantom type is re-narrowed at the
 * component boundary, exactly as it is for `config`.
 */
export type NgeTableEventSink = (event: NgeTableEvent<unknown>) => void;
