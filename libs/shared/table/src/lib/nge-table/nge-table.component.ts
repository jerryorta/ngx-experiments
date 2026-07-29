import type { Cell, Header, Row, SortDirection } from '@tanstack/angular-table';

import { NgTemplateOutlet } from '@angular/common';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  contentChildren,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { FlexRenderDirective } from '@tanstack/angular-table';

import type { NgeTableEvent } from '../events';
import type { NgeTableExportData, NgeTableExportOptions } from '../export';
import type { NgeTableConfig } from '../nge-table-config';
import type { NgeTableState } from '../nge-table-state';

import { isNgeCellColumnEditable } from '../edit';
import { NGE_TABLE_INITIAL_STATE } from '../nge-table-state';
import { isNgeInteractiveElement } from '../interactive';
import { NgeCellDirective, NgeTableSlotDirective } from '../slots';
import { NgeTableStore } from './store';

/** `aria-sort` values, keyed by the engine's sort direction. */
const ARIA_SORT_BY_DIRECTION: Record<SortDirection, 'ascending' | 'descending'> = {
  asc: 'ascending',
  desc: 'descending',
};

/**
 * How far one `Shift`+arrow press moves a column edge.
 *
 * Large enough that resizing a column by keyboard is not a hundred keystrokes,
 * small enough to land on a chosen width. Matches the step Excel and Numbers use
 * for the same gesture.
 */
const KEYBOARD_RESIZE_STEP_PX = 16;

/**
 * `<nge-table>` — the entry point, and the only public boundary of the library.
 *
 * Everything a consumer needs meets here: the `config` input describes the table,
 * the `state` / `stateChange` pair carries interaction state, and nothing else
 * leaks. In particular no `@tanstack/*` type appears in a consumer's imports —
 * that insulation is what lets the engine move to v9 without touching a single
 * application file.
 *
 * **State flows through, never into, this component.** `state` seeds the
 * component-scoped {@link NgeTableStore}; every change the user makes routes back
 * out through `stateChange`. Bind both (`[(state)]` works — the names line up) and
 * the host owns the table's sort, filters, widths, and pinning, ready to persist
 * and restore. Bind neither and the store's own copy keeps the table usable out of
 * the box. What never happens is the engine becoming the source of truth, because
 * that is the arrangement which has to be unpicked feature by feature the day
 * server-side paging arrives.
 *
 * Rendering is **three flexbox lanes per row** — pinned-left, center,
 * pinned-right — and pinning is `position: sticky` on the lane wrapper, never on
 * a cell (ARCH-243). That is what makes more than one pinned column work at all.
 * Drag-to-resize (ARCH-244), virtualization (ARCH-245), and the `TemplateRef`
 * slot registry (ARCH-246) each extend this substrate in their own story.
 *
 * @typeParam TRow - The shape of one row of data.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    // Lets the resize cursor apply table-wide for the duration of a drag, so it
    // does not flicker as the pointer crosses cells with opinions of their own.
    '[class.nge-table--resizing]': 'store.resizingColumnId() !== null',
    class: 'nge-table',
  },
  imports: [FlexRenderDirective, NgTemplateOutlet],
  providers: [NgeTableStore],
  selector: 'nge-table',
  standalone: true,
  styleUrl: './nge-table.component.scss',
  templateUrl: './nge-table.component.html',
})
export class NgeTableComponent<TRow> {
  protected readonly store = inject(NgeTableStore);

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Rows, columns, geometry, and which capabilities are switched on. */
  readonly config = input.required<NgeTableConfig<TRow>>();

  /**
   * The host-owned interaction state. Defaults to the shared empty state, so a
   * consumer that does not care about state still gets a working table.
   */
  readonly state = input<NgeTableState>(NGE_TABLE_INITIAL_STATE);

  /** Emitted whenever the user changes a state slice. Never echoes a value the host just set. */
  readonly stateChange = output<NgeTableState>();

  /**
   * Everything the table announces, as one discriminated stream (ARCH-247).
   *
   * One output rather than ten. A new event kind is then a member on
   * {@link NgeTableEvent} rather than a new binding on this component, which is
   * what keeps this class's public surface — `config`, `state`, `stateChange`,
   * and this — fixed for the lifetime of the library.
   */
  readonly ngeTableEvent = output<NgeTableEvent<TRow>>();

  // ─── the event stream (ARCH-247) ───────────────────────────────────────────
  //
  // Events originate wherever they happen — mostly in the store, which owns the
  // interactions — and leave through here, because an `output()` belongs to a
  // component. The constructor connects the two once. The two lifecycle events
  // are the exception that lives in this class outright: only the component knows
  // when Angular has painted.

  constructor() {
    // The store is payload-agnostic, so `TRow` is re-narrowed on the way out —
    // the same phantom-type dance `syncConfig` performs on the way in, and the
    // same runtime object either way.
    this.store.setEventSink(event => this.ngeTableEvent.emit(event as NgeTableEvent<TRow>));
  }

  /**
   * The row model whose arrival has been announced, by identity.
   *
   * The engine memoises `getRowModel()`, so a new array means the rows genuinely
   * moved — data arrived, or a sort or filter re-ran. A resize or a pin recomputes
   * plenty of other things and leaves this reference alone, which is exactly the
   * discrimination `load-complete` needs and could not get from a count.
   */
  private lastLoadedRows: null | readonly Row<unknown>[] = null;

  private lastRenderedRows: null | readonly Row<unknown>[] = null;

  /**
   * `load-complete` — the processed row model settled.
   *
   * Silent until a config exists, because a table nobody has described yet has
   * not "loaded" an empty result; it has not been asked anything. An ordinary
   * `effect` rather than an after-render hook, because this event is about the
   * data being ready, not about pixels.
   */
  private readonly emitLoadComplete = effect(() => {
    const rows = this.store.table.getRowModel().rows;

    if (!this.store.config() || rows === this.lastLoadedRows) {
      return;
    }

    this.lastLoadedRows = rows;
    this.store.emitTableEvent({
      columnCount: this.store.ariaColumnCount(),
      kind: 'load-complete',
      rowCount: rows.length,
    });
  });

  /**
   * `render-complete` — the DOM for that same row model has been committed.
   *
   * `afterRenderEffect` rather than `effect`, so a listener may measure, scroll,
   * or screenshot the table and find the rows actually there. It always follows
   * the matching `load-complete`: effects run during change detection, after-render
   * hooks run past it.
   *
   * ⚠️ Guarded on the **row model**, not on the window. Scrolling a virtualized
   * table re-renders many times a second, and mirroring that into the stream would
   * hand every consumer a throttling problem. `renderedRowCount` is therefore the
   * window as first painted for this row model — which is the number that shows
   * virtualization doing its job.
   */
  private readonly emitRenderComplete = afterRenderEffect(() => {
    const rows = this.store.table.getRowModel().rows;

    if (!this.store.config() || rows === this.lastRenderedRows) {
      return;
    }

    this.lastRenderedRows = rows;
    this.store.emitTableEvent({
      columnCount: this.store.ariaColumnCount(),
      kind: 'render-complete',
      renderedRowCount: this.store.renderedRows().length,
      rowCount: rows.length,
    });
  });

  // ─── config → store ────────────────────────────────────────────────────────

  /**
   * The store is payload-agnostic (`signalStore()` cannot carry a type parameter),
   * so the phantom `TRow` is narrowed away here and re-narrowed on the way out.
   * Same runtime object; the cast is needed only because `getRowId` puts `TRow` in
   * a contravariant position.
   */
  private readonly syncConfig = effect(() =>
    this.store.setConfig(this.config() as NgeTableConfig<unknown>)
  );

  private readonly syncGeometry = effect(() => this.applyGeometry(this.config()));

  private readonly syncLaneGeometry = effect(() => this.applyLaneGeometry());

  // ─── the scroll viewport (ARCH-245) ────────────────────────────────────────

  /**
   * The element the table scrolls inside — what the row virtualizer windows over.
   *
   * The store cannot resolve this itself; it has no view. Handing the node over
   * rather than letting the store reach into the DOM is what keeps every reactive
   * derivation on one side of the boundary and every DOM reference on the other.
   */
  private readonly viewport = viewChild.required<ElementRef<HTMLElement>>('viewport');

  private readonly syncScrollElement = effect(() =>
    this.store.setScrollElement(this.viewport().nativeElement)
  );

  // ─── the projected templates (ARCH-246) ────────────────────────────────────
  //
  // The render-slot seam's only presence in this class: collect what the consumer
  // projected and hand it to the store, which does the indexing. Same division as
  // the viewport above — the component owns the view, the store owns everything
  // derived from it — and it is what keeps an Angular query signal off the store's
  // props, where it would break the library's declaration emit.

  /** `[ngeCell]` templates, in content order. Indexed by column in the store. */
  private readonly cellTemplates = contentChildren(NgeCellDirective, { descendants: true });

  /** `[ngeTableSlot]` templates, in content order. Indexed by name in the store. */
  private readonly slotTemplates = contentChildren(NgeTableSlotDirective, { descendants: true });

  private readonly syncCellTemplates = effect(() =>
    this.store.setCellTemplates(this.cellTemplates())
  );

  private readonly syncSlotTemplates = effect(() =>
    this.store.setSlotTemplates(this.slotTemplates())
  );

  // ─── the controlled-state round trip ───────────────────────────────────────

  /**
   * The last state object that crossed this boundary, in either direction.
   *
   * Reference identity is what closes the loop: an emitted object comes straight
   * back in through `state`, and comparing references is how the inbound effect
   * recognises its own echo instead of patching the store and emitting again.
   */
  private lastSyncedState: NgeTableState = NGE_TABLE_INITIAL_STATE;

  private readonly acceptHostState = effect(() => {
    const incoming = this.state();
    if (incoming === this.lastSyncedState) {
      return;
    }
    this.lastSyncedState = incoming;
    this.store.setTableState(incoming);
  });

  private readonly emitStoreState = effect(() => {
    const current = this.store.tableState();
    if (current === this.lastSyncedState) {
      return;
    }
    this.lastSyncedState = current;
    this.stateChange.emit(current);
  });

  // ─── the data-pipeline seam (ARCH-248) ─────────────────────────────────────

  /**
   * Read what the table currently shows as neutral export data.
   *
   * The application-facing half of the export seam: a `viewChild(NgeTableComponent)`
   * reaches it without ever naming a `@tanstack/*` type, which is the insulation
   * every other part of this boundary keeps. Addons take the other half —
   * `table.readNgeExportData(…)` on the engine instance — because that is where
   * two independent addons can compose without importing each other.
   *
   * A pure read: it reflects the current filters, sort, column order, and
   * visibility, and changes nothing. See {@link toNgeTableExportData}.
   */
  readNgeExportData(options?: NgeTableExportOptions<TRow>): NgeTableExportData {
    // The store is payload-agnostic, so `TRow` is narrowed away on the way in —
    // the same phantom-type dance `syncConfig` performs, and the same runtime
    // object either way. Only `cellPredicate` puts `TRow` in a contravariant
    // position, which is what makes the cast necessary rather than merely tidy.
    return this.store.table.readNgeExportData(options as NgeTableExportOptions<unknown>);
  }

  // ─── template glue ─────────────────────────────────────────────────────────

  /** Map the engine's sort direction onto the `aria-sort` vocabulary. */
  protected ariaSort(direction: false | SortDirection): 'ascending' | 'descending' | 'none' {
    return direction ? ARIA_SORT_BY_DIRECTION[direction] : 'none';
  }

  // ─── row selection (ARCH-268) ──────────────────────────────────────────────
  //
  // Event translation only; every decision about what a gesture means lives in
  // the store, exactly as it does for the resize handlers above.

  /**
   * A click on a row: select, **then** announce.
   *
   * Both, in that order, and the order is the contract — `row-click` fired before
   * the write would hand a listener the selection as it was a moment ago. That
   * selection happens at all must not cost the event: a consumer who was already
   * listening for `row-click` keeps hearing it after switching selection on.
   */
  protected onRowClick(event: MouseEvent, row: Row<unknown>): void {
    this.store.selectRowFromClick(row, {
      ctrlKey: event.ctrlKey,
      metaKey: event.metaKey,
      shiftKey: event.shiftKey,
    });
    this.store.rowClicked(row);
  }

  /**
   * A click on the per-row checkbox.
   *
   * Handled on `click` rather than `change` because only the click carries the
   * **modifier keys**, and a shift-click on the checkbox has to extend the range
   * exactly as one on the row body does — the checkbox is, after all, the control
   * that most looks like a multi-select affordance.
   *
   * `preventDefault()` keeps the browser from toggling `checked` itself, so the
   * box is driven purely by `state.rowSelection` through its `[checked]` binding.
   * Without it a shift-click briefly flips the box against what the range write is
   * about to say, and the two race visibly. `stopPropagation()` keeps the row's own
   * handler out of it, which would otherwise replace the selection the checkbox
   * just added to.
   *
   * The `MouseEvent` is passed straight through as the modifiers: it structurally
   * satisfies the narrow shape the store reads, so nothing has to be repacked.
   */
  protected onSelectionBoxClick(event: MouseEvent, row: Row<unknown>): void {
    event.stopPropagation();
    event.preventDefault();
    this.store.toggleRowSelection(row, event);
  }

  /**
   * `Space` on a focused row — the keyboard half of selection.
   *
   * A *toggle* rather than the click's replace, because a keyboard user reaching a
   * row by tabbing has no modifier convention to lean on and would otherwise be
   * unable to build a selection at all. `preventDefault()` stops the page
   * scrolling out from under them.
   *
   * Deliberately just this much: full arrow-key navigation over a roving tabindex
   * belongs to the later a11y story, and half of it now would be something that
   * story has to unpick.
   */
  protected onRowSelectKey(event: KeyboardEvent, row: Row<unknown>): void {
    // ⚠️ A `Space` typed into a cell editor is a space, not a selection toggle
    // (ARCH-292). The row is the editor's ancestor, so without this the keystroke
    // bubbles out of the field and both `preventDefault()` and the toggle land.
    // Guarded in core rather than left to each editor's `stopPropagation()`, so a
    // consumer's own projected control inherits the rule without knowing it exists.
    if (!this.store.selectionEnabled() || isNgeInteractiveElement(event.target)) {
      return;
    }

    event.preventDefault();
    this.store.toggleRowSelection(row);
  }

  /**
   * `Enter` on a focused row — the keyboard route into editing (ARCH-292).
   *
   * ⚠️ **Activates the row's FIRST editable column**, because without arrow-key
   * grid navigation there is no focused cell to mean instead. Stated plainly rather
   * than left as a gap: the alternative is an editable table a keyboard-only user
   * cannot open at all. The later a11y story replaces this with the focused cell.
   *
   * Ignored from inside a control, so `Enter` committing an open editor does not
   * bubble out and immediately re-activate the same row.
   */
  protected onRowEditKey(event: KeyboardEvent, row: Row<unknown>): void {
    if (!this.store.editEnabled() || isNgeInteractiveElement(event.target)) {
      return;
    }

    const cell = row.getAllCells().find(candidate => isNgeCellColumnEditable(candidate.column));

    if (!cell) {
      return;
    }

    event.preventDefault();
    this.store.beginCellEdit(row.id, cell.column.id);
  }

  /**
   * A click landed inside a cell — the `cell-click` event, and activation.
   *
   * Both, because a click on an editable cell means the same thing to a host that
   * is listening and to the editor that is about to open, and splitting them into
   * two bindings would put the two in an order someone has to remember.
   * `beginCellEdit` is a no-op for a column that has not opted in, so there is no
   * branch here — the only switch on "is this column editable" is the config flag
   * the store reads.
   */
  protected onCellClick(cell: Cell<unknown, unknown>): void {
    this.store.cellClicked(cell);
    this.store.beginCellEdit(cell.row.id, cell.column.id);
  }

  /**
   * `Escape` inside a cell — cancel the edit, and let nothing else have the key.
   *
   * ⚠️ **`stopPropagation()` runs whether or not an edit was open, and that is
   * deliberate.** The addons binding `Escape` do so on the *document*, which is last
   * in the bubble path, so this is the one position from which a cell can decline on
   * their behalf. Making it conditional would mean an `Escape` typed into an
   * always-live control — which is never "open" — still cleared the user's cell
   * range, which is the behaviour this exists to prevent.
   *
   * `preventDefault()` is deliberately NOT called: `Escape` belongs to whatever is
   * on top, and a dialog or a menu above the table must still receive it.
   */
  protected onCellEscape(event: KeyboardEvent): void {
    if (!this.store.editEnabled()) {
      return;
    }

    event.stopPropagation();
    this.store.cancelCellEdit();
  }

  /**
   * Stop a shift-click from also dragging the browser's text selection.
   *
   * Without this, extending a row range paints the selected-row tint and a native
   * blue selection band over the same rows, and the result reads as a rendering
   * bug rather than as a feature.
   *
   * ⚠️ Gated on `shiftKey`, and both halves of that matter — the same reasoning
   * ARCH-250 recorded for cell highlighting, moved into the table itself so no
   * consumer has to rediscover it:
   *
   * - A blanket `user-select: none` on rows would suppress it too, and would also
   *   stop a user selecting and copying a single cell's text.
   * - `preventDefault()` on `mousedown` suppresses **focus** as well, so applying
   *   it unconditionally would break an `<input>` inside a cell — and inline
   *   editing is a cell pattern this library explicitly supports. A shift-click
   *   into an input is not a meaningful editing gesture, so the modifier gate
   *   costs nothing.
   *
   * `click` still fires after a prevented `mousedown`, so the selection gesture is
   * unaffected. ⚠️ A synthetic `MouseEvent` triggers no browser default at all, so
   * a spec cannot catch a regression here — verify it with a real pointer.
   */
  protected onRowPointerDown(event: MouseEvent): void {
    if (event.shiftKey && this.store.selectionEnabled()) {
      event.preventDefault();
    }
  }

  // ─── column resizing (ARCH-244) ────────────────────────────────────────────
  //
  // Pointer events, one path for mouse, trackpad, touch and pen. The engine's
  // own `header.getResizeHandler()` is deliberately unused: despite the name it
  // is a mouse-and-touch handler that attaches document listeners
  // (`table-core/src/features/ColumnSizing.ts:343-513`), which would mean two
  // bindings, no pointer capture, and a gesture this component could not reason
  // about. The arithmetic it uses is kept — see `store/nge-table-resize.ts`.
  //
  // These four methods are pure event translation; every decision lives in the
  // store.

  /** Grab a column edge. */
  protected onResizeStart(event: PointerEvent, header: Header<unknown, unknown>): void {
    // The grip sits inside a header cell whose click toggles the sort, and a
    // drag must not also re-sort the table.
    event.preventDefault();
    event.stopPropagation();

    this.capturePointer(event);
    this.store.beginColumnResize(header, event.pointerId, event.clientX);
  }

  /** Track the drag. A move with no drag in flight is a no-op in the store. */
  protected onResizeMove(event: PointerEvent): void {
    this.store.updateColumnResize(event.pointerId, event.clientX);
  }

  /** Release the drag, on either `pointerup` or `pointercancel`. */
  protected onResizeEnd(event: PointerEvent): void {
    this.releasePointer(event);
    this.store.endColumnResize();
  }

  /** Double-click a grip to hand the column back to its definition's width. */
  protected onResizeReset(event: MouseEvent, columnId: string): void {
    event.stopPropagation();
    this.store.resetColumnSize(columnId);
  }

  /**
   * `Shift`+arrow on a focused header cell — the keyboard equivalent of a drag.
   *
   * On the cell rather than on the grip so the header keeps one tab stop per
   * column; `Shift` keeps the plain arrows free for the grid navigation a later
   * a11y story will add.
   */
  protected onResizeKey(event: KeyboardEvent, columnId: string, direction: number): void {
    event.preventDefault();
    this.store.nudgeColumnSize(columnId, direction * KEYBOARD_RESIZE_STEP_PX);
  }

  /** `Shift`+Home — the keyboard equivalent of double-clicking a grip. */
  protected onResetKey(event: KeyboardEvent, columnId: string): void {
    event.preventDefault();
    this.store.resetColumnSize(columnId);
  }

  /**
   * Route the rest of the gesture to the grip itself.
   *
   * Capture is what lets `pointermove` / `pointerup` be bound on the element
   * instead of the document: the pointer keeps reporting to this node even once
   * it has left the cell, so a fast drag does not slip off and stall, and there
   * is no document listener to leak if the header is torn down mid-drag.
   */
  private capturePointer(event: PointerEvent): void {
    try {
      (event.target as Element).setPointerCapture?.(event.pointerId);
    } catch {
      // jsdom and detached nodes have no capture. It is a robustness measure,
      // not a requirement — the drag still works without it.
    }
  }

  private releasePointer(event: PointerEvent): void {
    try {
      const target = event.target as Element;
      if (target.hasPointerCapture?.(event.pointerId)) {
        target.releasePointerCapture(event.pointerId);
      }
    } catch {
      // Releasing is best-effort; the browser drops capture on its own anyway.
    }
  }

  // ─── host bindings ─────────────────────────────────────────────────────────

  /**
   * Apply the config's row / header heights as inline `--nge-table-*` overrides.
   *
   * Inline rather than compiled in because these two values must agree with
   * `NGE_TABLE_DEFAULTS` in TypeScript — virtualization (ARCH-245) computes
   * offsets from the row height and cannot measure a row it has not rendered.
   * Clearing an absent value hands the token back to the theme rather than
   * pinning it to a stale number.
   *
   * **Except while virtualization is on**, where the resolved row height is
   * written whether the consumer named one or not. A windowed row is *positioned*
   * at `index × rowHeight`, not laid out, so a theme moving
   * `--nge-table-row-height` out from under that arithmetic would not restyle the
   * table — it would overlap its rows. Switching virtualization on is what buys
   * that constraint; a table without it keeps the theme's say.
   *
   * The detail-band height (ARCH-298) is the same arrangement for the same reason,
   * one row further out: an expanded row is *positioned* as
   * `rowHeight + rowDetailHeight`, so a theme moving the band's height alone would
   * leave the band and the row beneath it disagreeing about where the row ends.
   * Off virtualization it stays a `min-height` the theme owns, and a band taller
   * than it simply grows — nothing is positioned by arithmetic there, so nothing
   * can be overlapped.
   */
  private applyGeometry(config: NgeTableConfig<TRow>): void {
    const style = this.host.nativeElement.style;
    const virtualized = config.enableVirtualization;
    const rowHeight = virtualized ? this.store.rowHeight() : config.rowHeight;
    const rowDetailHeight = virtualized ? this.store.rowDetailHeight() : config.rowDetailHeight;

    for (const [property, value] of [
      ['--nge-table-header-height', config.headerHeight],
      ['--nge-table-row-detail-height', rowDetailHeight],
      ['--nge-table-row-height', rowHeight],
    ] as const) {
      if (value === undefined) {
        style.removeProperty(property);
      } else {
        style.setProperty(property, `${value}px`);
      }
    }
  }

  /**
   * Publish the lane widths as `--nge-table-internal-*` properties on the host.
   *
   * **One write per state change, not one per element.** The stylesheet sizes
   * every lane and every row by reading these four properties, so a pin, a resize,
   * or a reorder costs four `setProperty` calls no matter how many rows are on
   * screen. Writing the widths inline instead would mean touching 3 × (rows + 1)
   * elements, which is the shape that stops scaling exactly when virtualization
   * (ARCH-245) makes it matter. AG Grid does the same thing with
   * `--ag-internal-pinned-left-sticky-offset`
   * (`packages/ag-grid-community/src/gridBodyComp/gridBodyCtrl.ts`).
   *
   * The `internal` segment marks these as runtime output rather than part of the
   * themeable `--nge-table-*` contract: they carry live measurements, so there is
   * nothing for a theme to say about them and overriding one would break layout
   * rather than restyle it. That is why they are absent from
   * `styles/_table-tokens.scss`.
   *
   * The numbers are the engine's own (`getLeftTotalSize()` and friends), never
   * arithmetic of ours, so they stay right across resize and reorder for free.
   */
  private applyLaneGeometry(): void {
    const { center, left, right, total } = this.store.laneWidths();
    const style = this.host.nativeElement.style;

    for (const [property, value] of [
      ['--nge-table-internal-center-width', center],
      ['--nge-table-internal-pinned-left-width', left],
      ['--nge-table-internal-pinned-right-width', right],
      ['--nge-table-internal-total-width', total],
    ] as const) {
      style.setProperty(property, `${value}px`);
    }
  }
}
