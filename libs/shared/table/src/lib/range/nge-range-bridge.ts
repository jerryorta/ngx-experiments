import type { Cell, Column, Table, TableFeature } from '@tanstack/angular-table';

import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import type { NgeCellContext } from '../slots';
import type { NgeRangeColumnOrder, NgeRangeRowOrder, NgeRangeStep } from './nge-range-state';

import { isNgeInteractiveElement } from '../interactive';
import { ngeRangeColumnOrder, ngeRangeRowOrder } from './nge-cell-range';
import { NGE_RANGE_OPTIONS } from './nge-range-options';
import { activeNgeCellRange, parseNgeRangeCellKey } from './nge-range-state';

/**
 * The attribute `<nge-range-overlay>` stamps on every cell it covers, valued
 * `rowId::columnId`.
 *
 * **The gesture's only hit-test key, and the reason it depends on no core
 * attribute.** The table's own markup carries `role`, `aria-colindex` and a width —
 * nothing that identifies a cell by record — so an addon reading the DOM either
 * asks the core for an attribute it does not have (a core edit) or brings its own.
 * This is the second: the overlay is already inside every cell, so it writes the
 * key and the bridge reads it back.
 */
export const NGE_RANGE_CELL_ATTRIBUTE = 'data-nge-range-cell';

/**
 * Carried on the table root for the duration of a drag.
 *
 * What suppresses the browser's own text selection *while dragging only*, which is
 * the trade the ticket's constraints require: a permanent `user-select: none` on
 * cells would also stop a user selecting and copying a single cell's text.
 */
export const NGE_RANGE_DRAGGING_CLASS = 'nge-range-dragging';

const CELL_SELECTOR = `[${NGE_RANGE_CELL_ATTRIBUTE}]`;

/**
 * Core's own class names, and the one place this addon reaches for them.
 *
 * The same documented cost the overlay's `:has()` styling already accepts, and the
 * same dependency a theme has. There is no alternative that is not a core edit: the
 * scroll viewport is the element auto-scroll has to move, and only its class names
 * it.
 */
const ROOT_SELECTOR = '.nge-table';
const VIEWPORT_SELECTOR = '.nge-table__viewport';

// Where a drag must not begin, and which keys this addon must not take, is
// `isNgeInteractiveElement` — core's, not this addon's (ARCH-292). A cell is an
// arbitrary Angular render target and inline editing is a supported cell pattern,
// so a pointerdown inside a control belongs to that control; row selection's
// `Space` asks the identical question, and core may not import from an addon, so
// the answer lives in `lib/interactive` and both read it.
//
// The resize grip needs no entry there — `onResizeStart` already calls
// `stopPropagation()` (`nge-table.component.ts`), so its pointerdown never reaches
// a delegated listener on the root. Verified rather than assumed, and a redundant
// guard would silently outlive the day that changes.

/**
 * The attribute `<nge-range-column-handle>` stamps on the header cell it sits in.
 *
 * The header-side twin of {@link NGE_RANGE_CELL_ATTRIBUTE}, and deliberately a
 * **different** name rather than the same one: the body hit-test asks
 * `closest('[data-nge-range-cell]')` and must keep answering `null` for a header,
 * or a click on a header label would read as a click on a cell. Two names is what
 * makes that separation structural instead of a guard someone can forget.
 *
 * ⚠️ **Not the pointer hit-test.** The strip binds its own handlers and stops
 * propagation (the ARCH-244 grip precedent), because the whole header cell carries
 * this attribute and a pointer test on it would select the column from a plain
 * header click — which is the sort. This exists for the keyboard route, where the
 * focused element *is* the header cell.
 */
export const NGE_RANGE_COLUMN_ATTRIBUTE = 'data-nge-range-column';

const COLUMN_SELECTOR = `[${NGE_RANGE_COLUMN_ATTRIBUTE}]`;

/**
 * The fill handle's own class — where a pointerdown means "fill", not "select".
 *
 * ⚠️ **Checked BEFORE the cell hit-test, and that ordering is the whole guard.** The
 * handle sits inside a stamped cell, so `cellKeyAt` resolves it perfectly happily and
 * the drag would start a fresh one-cell range — destroying the very selection the fill
 * was about to extend. There is no way to tell the two gestures apart after that
 * point, which is why they are told apart before it.
 */
const FILL_HANDLE_SELECTOR = '.nge-fill-handle';

/** Which gesture a pointer drag is, while one is in flight. */
type NgeRangeDragMode = 'fill' | 'range';

/**
 * Where the user's current gesture started.
 *
 * ⚠️ **Only its null-ness is read today** — by `extendTo` / `extendToColumn`, to
 * decide whether there is anything to reach *from*, and by `takeKey`, as the
 * "is the user working in this table" test. It carries the origin anyway because a
 * field that stores a cell key while holding a column would be a lie the next reader
 * trips over, and because ARCH-271's fill handle needs to know which kind is live.
 */
type NgeRangeGestureAnchor =
  { columnId: string; kind: 'cell'; rowId: string } | { columnId: string; kind: 'column' };

/**
 * `Shift`+arrow, as a step on each axis.
 *
 * A lookup rather than a `switch`, so adding `Home` / `End` / `PageUp` later is an
 * entry rather than a branch — the same shape the event-stream and slot seams use.
 */
const ARROW_STEPS: Record<string, NgeRangeStep> = {
  ArrowDown: { column: 0, row: 1 },
  ArrowLeft: { column: -1, row: 0 },
  ArrowRight: { column: 1, row: 0 },
  ArrowUp: { column: 0, row: -1 },
};

/**
 * What turns pointer input and a projected overlay into cell-range state.
 *
 * Two jobs, and they are here together because both need the engine instance from
 * outside the table's own injector:
 *
 * - **The read path.** The render-slot seam hands a projected template a
 *   {@link NgeCellContext} — `rowId`, `columnId`, the row, the value — and
 *   deliberately nothing else, so a consumer's markup never sees a `@tanstack/*`
 *   type. A rectangle is resolved against the processed row model *and* the visible
 *   column order, and a template has no route to either. A projected `ng-template`
 *   is instantiated with its *declaration* injector — the consumer's — so it cannot
 *   reach `NgeTableStore` either, and it should not.
 * - **The gesture.** One delegated `pointerdown` on the table root, pointer
 *   capture, and `pointermove` hit-testing by {@link NGE_RANGE_CELL_ATTRIBUTE},
 *   plus the auto-scroll that lets a drag exceed the visible rows.
 *
 * {@link provideNgeCellRange} registers this in the **consumer's** injector
 * alongside the feature, and a tiny companion `TableFeature` hands it the engine
 * instance the moment one exists.
 *
 * ⚠️ **This holds the RAW instance, not the adapter's proxy, so nothing it reads is
 * reactive.** `createTable` is called by the engine with the real object; the proxy
 * — which is what turns `get*` accessors into computeds — belongs to the store. The
 * reactivity therefore comes from the *host's own* `state` signal, which the
 * overlay takes as an input and which every range change flows through by
 * construction. That is not a workaround: it is the controlled-state contract doing
 * exactly its job, and it means a sort or a pin (which also move `state`)
 * re-resolves every rectangle without this class subscribing to anything.
 */
@Injectable()
export class NgeRangeBridge {
  private readonly destroyRef = inject(DestroyRef);

  /** `optional` so the bridge stays constructible outside a browser (SSR, a bare spec). */
  private readonly document = inject(DOCUMENT, { optional: true });

  private readonly options = inject(NGE_RANGE_OPTIONS);

  private readonly table = signal<null | Table<unknown>>(null);

  /**
   * Where the user's **current gesture** started, or `null`.
   *
   * ⚠️ **Scratch on this class, and neither of the two precedents it sits between.**
   * ARCH-268 keeps its row anchor on `NgeTableStoreState` — a core file an addon
   * may not touch; ARCH-250 persists its anchor *in the slice*, on the opposite
   * rationale (a user who reloads mid-selection should extend from where they left
   * off). The third option honours ARCH-268's reasoning at zero core edits: an
   * anchor is where a gesture started, not what the table *is*, so a restored view
   * carrying one would have the user's next shift-click extend from a cell they
   * never touched.
   *
   * ⚠️ **Distinct from `NgeCellRange.anchorRowId` / `anchorColumnId`**, which are
   * the *rectangle's* corner: persisted, part of the descriptor, and what
   * membership is resolved from. The two coincide for the whole of a live gesture
   * and diverge exactly once — across a reload, which is the case this field exists
   * to get right. With no gesture anchor a shift-click therefore **starts** a range
   * rather than extending a stranger's rectangle; see {@link extendTo}.
   *
   * A plain field rather than a signal: nothing re-evaluates when it moves. It does
   * **not** move on a shift-click — that is what lets a rectangle be grown and
   * shrunk rather than only ratcheted — and it is dropped whenever the selection is
   * cleared.
   */
  private anchor: NgeRangeGestureAnchor | null = null;

  private root: Element | null = null;

  private releaseListeners: (() => void) | null = null;

  /** The in-flight drag's pointer, or `null` when no drag is in flight. */
  private pointerId: null | number = null;

  /**
   * What the in-flight drag is doing — selecting cells, or filling from them.
   *
   * Decided once, on `pointerdown`, and never re-examined: a gesture that changed its
   * mind halfway would be indistinguishable from a mis-hit, and the two write entirely
   * different state.
   */
  private dragMode: NgeRangeDragMode = 'range';

  /**
   * The cell a plain press landed on, held until release so a click can be told
   * from a drag. Non-null only between `pointerdown` and `pointerup`, and withdrawn
   * by `onPointerMove` the moment the gesture reaches a different cell.
   *
   * ⚠️ **Scratch state on the bridge, never a slice.** It records where a gesture
   * is, not what the table is — the same call ARCH-269 makes for the gesture anchor,
   * and a restored view carrying one would clear a cell the user never pressed.
   */
  private pendingClear: null | { columnId: string; rowId: string } = null;

  private pointerX = 0;

  private pointerY = 0;

  private autoScrollFrame: null | number = null;

  /**
   * Wire the two document-level keys, and make sure everything unwires.
   *
   * ⚠️ **The `keydown` listener is on the document, and it has to be.** A scoped
   * handler is the obvious instinct and would almost never fire: nothing in the
   * table body is focusable (cells carry no `tabindex` — keyboard grid navigation is
   * a later story), so a `keydown` bound to a wrapper receives nothing unless the
   * user happens to have tabbed to a sortable header.
   *
   * The three gestures are polite in two different ways, because they have to be.
   * `Escape` never calls `preventDefault()` and writes nothing on an unselected
   * table (`clearNgeRange` returns the same slice, `writeNgeRange` skips an
   * unchanged write), so it costs nothing when it was meant for a dialog. cmd/ctrl-A
   * and `Shift`+arrow *must* take their keys to be useful at all, so both are scoped
   * by engagement instead — see {@link takeKey}.
   *
   * A constructor rather than a field initializer because registering listeners with
   * matching teardown is precisely the setup a field cannot express. Teardown rides
   * `DestroyRef` — a service has no lifecycle hooks, and this one is scoped to the
   * consumer component that provided it, so it unregisters with that component.
   */
  constructor() {
    this.destroyRef.onDestroy(() => {
      this.releaseRoot();
      this.stopAutoScroll();
    });

    const doc = this.document;

    if (!doc) {
      return;
    }

    doc.addEventListener('keydown', this.onKeydown);
    this.destroyRef.onDestroy(() => doc.removeEventListener('keydown', this.onKeydown));
  }

  /**
   * Row id → position in the **processed** row model, or an empty map before a
   * table has attached.
   *
   * Shared with the feature rather than rebuilt here, so "which rows lie between
   * these two" has one answer inside the addon. The duplication that matters is the
   * one against the *core*, and that stays.
   */
  rowOrder(): NgeRangeRowOrder {
    const table = this.table();

    return table ? ngeRangeRowOrder(table) : new Map();
  }

  /**
   * Column id → position in **visual** order, or an empty map before a table has
   * attached.
   *
   * The axis ARCH-250 never needed, and what makes a pin or a reorder re-shape a
   * rectangle exactly as a sort does.
   */
  columnOrder(): NgeRangeColumnOrder {
    const table = this.table();

    return table ? ngeRangeColumnOrder(table) : new Map();
  }

  /**
   * Receive the engine instance. Called once, by the companion feature.
   *
   * Idempotent by assignment rather than guarded, so a table rebuilt under the same
   * consumer — a `<nge-table>` inside an `@if`, for instance — replaces the stale
   * instance instead of holding a detached one.
   */
  attach(table: Table<unknown>): void {
    this.table.set(table);
  }

  /**
   * Receive any element inside the table, and take the gesture over from there.
   *
   * Called by every `<nge-range-overlay>` with its own host element; the root is
   * `closest('.nge-table')` from there, and re-attaching the same root is a no-op,
   * so N overlays cost one wiring. Coupling the gesture to the overlay's presence is
   * deliberate rather than incidental: the overlay is what stamps
   * {@link NGE_RANGE_CELL_ATTRIBUTE}, so a table without one has nothing for the
   * hit-test to find — and a consumer who registers only the feature gets state and
   * export composition with no pointer behaviour, which is a supported arrangement.
   *
   * ⚠️ **No document listeners for the drag** (the ARCH-244 precedent). Everything
   * is on the root, and pointer capture is what keeps a fast drag from slipping off
   * — the pointer keeps reporting to the root even once it has left the table, so
   * there is nothing to leak if the table is torn down mid-gesture.
   */
  attachRoot(element: Element | null): void {
    const root = element?.closest(ROOT_SELECTOR) ?? null;

    if (root === this.root) {
      return;
    }

    this.releaseRoot();
    this.root = root;

    if (!root) {
      return;
    }

    // `mousedown` and `pointerdown` both, and they are not redundant. The shift
    // guard has to be on `mousedown`: cancelling `pointerdown` is only specified to
    // suppress the *compatibility* mouse events a touch produces, so for a mouse the
    // `mousedown` default — dragging the document's text selection — happens anyway.
    // Both ARCH-250 and ARCH-268 verified the `mousedown` form in a real browser.
    root.addEventListener('mousedown', this.onMouseDown);
    root.addEventListener('pointerdown', this.onPointerDown);
    // Bound once rather than per gesture, and a no-op while no drag is in flight —
    // the same shape `<nge-table>`'s resize handlers take.
    root.addEventListener('pointermove', this.onPointerMove);
    root.addEventListener('pointerup', this.onPointerUp);
    root.addEventListener('pointercancel', this.onPointerUp);

    this.releaseListeners = () => {
      root.removeEventListener('mousedown', this.onMouseDown);
      root.removeEventListener('pointerdown', this.onPointerDown);
      root.removeEventListener('pointermove', this.onPointerMove);
      root.removeEventListener('pointerup', this.onPointerUp);
      root.removeEventListener('pointercancel', this.onPointerUp);
      root.classList.remove(NGE_RANGE_DRAGGING_CLASS);
    };
  }

  // ─── the consumer-facing write API ─────────────────────────────────────────
  //
  // The cell-level methods (`startNgeRange`, `extendNgeRange`) live on the
  // engine's `Cell`, which a consumer never holds: the `cell-click` event and the
  // render slots both hand over a `NgeCellContext` — ids and values — because
  // keeping `@tanstack/*` out of consumer code is the point of that boundary. So
  // the ergonomic path is by id, and it resolves to the very same cell methods
  // rather than reimplementing them.

  /** Begin a rectangle at one cell. `additive` (cmd/ctrl) appends a disjoint one. */
  start(rowId: string, columnId: string, options: { additive?: boolean } = {}): void {
    this.anchor = { columnId, kind: 'cell', rowId };
    this.cellAt(rowId, columnId)?.startNgeRange(options);
  }

  /**
   * Select one whole column — the plain click on a header strip (ARCH-270).
   *
   * `additive` (cmd/ctrl) **toggles**: it adds a disjoint column, or drops it when
   * that exact column is already selected. Unlike {@link start}'s additive path,
   * which only appends — see `toggleNgeColumnRange` for why the two differ.
   */
  startColumn(columnId: string, options: { additive?: boolean } = {}): void {
    this.anchor = { columnId, kind: 'column' };
    this.columnAt(columnId)?.startNgeColumnRange(options);
  }

  /**
   * Take the span of columns out to one column — the `shift`-click on a header
   * strip.
   *
   * ⚠️ **With no gesture anchor this selects the column instead of extending**, for
   * the same reason {@link extendTo} starts a rectangle: a user who has not told
   * this table where to reach from is starting, not continuing.
   */
  extendToColumn(columnId: string): void {
    if (this.anchor === null) {
      this.startColumn(columnId);

      return;
    }

    this.columnAt(columnId)?.extendNgeColumnRange();
  }

  /**
   * Move the active rectangle's focus to one cell — shift-click, drag, keyboard.
   *
   * ⚠️ **With no gesture anchor this starts a rectangle instead of extending one.**
   * That is the whole consequence of keeping the anchor out of the persisted state:
   * a user who reloads a saved view and shift-clicks has not told this table where
   * to reach *from*, and silently reaching from the stored rectangle's corner would
   * extend from a cell they never touched. Replacing it is the honest reading of
   * "the user is starting again".
   */
  extendTo(rowId: string, columnId: string): void {
    if (this.anchor === null) {
      this.start(rowId, columnId);

      return;
    }

    this.cellAt(rowId, columnId)?.extendNgeRange();
  }

  /**
   * Select every cell of the current view — what a toolbar's "select all" calls.
   *
   * Anchors the gesture on the block's own leading column, so a following
   * shift-click narrows the selection rather than starting over. It is a **column**
   * anchor because the block select-all writes is unbounded on the row axis — there
   * is no corner record to name, which is exactly the property that makes it survive
   * a sort.
   */
  selectAll(): void {
    const table = this.table();

    if (!table) {
      return;
    }

    table.selectAllNgeRange();

    const active = activeNgeCellRange(table.readNgeRangeState());

    this.anchor = active ? { columnId: active.anchorColumnId, kind: 'column' } : null;
  }

  /**
   * Drop every rectangle and the gesture anchor. A no-op when nothing is selected.
   *
   * Unconditionally safe to call, which is what lets the `Escape` handler stay
   * simple: `clearNgeRange` returns the same slice when there is nothing to give
   * up, and `writeNgeRange` skips a write whose result is unchanged, so a key press
   * on an empty table produces no state change and no `stateChange`.
   *
   * The anchor goes with it. Keeping it would leave a later shift-click extending
   * from a cell the user can no longer see marked — the same call ARCH-268 and
   * ARCH-250 both made.
   *
   * ⚠️ **There is deliberately no `hasRanges()` on this class.** The obvious version
   * reads `readNgeRangeState()` off the instance this bridge holds — the RAW engine
   * object, whose `options` are only refreshed when the adapter's *proxy* is read.
   * In an app that happens constantly (rendering reads the proxy), so the staleness
   * is invisible; in a spec nothing does, and the answer is wrong. A consumer
   * wanting a disabled state should derive it from the `state` they already own.
   */
  clear(): void {
    this.anchor = null;
    this.table()?.clearNgeRange();
  }

  // ─── the fill handle (ARCH-271) ────────────────────────────────────────────
  //
  // Read paths for the projected `<nge-fill-handle>`, which — like every projected
  // template — resolves DI from the *consumer's* injector and so has no route to the
  // engine of its own.

  /** Whether this cell carries the handle, i.e. is the active range's bottom-right corner. */
  isFillHandle(rowId: string, columnId: string): boolean {
    return this.cellAt(rowId, columnId)?.isNgeFillHandle() ?? false;
  }

  /** Whether this cell sits in the block an in-flight fill drag would write into. */
  isFillTarget(rowId: string, columnId: string): boolean {
    return this.cellAt(rowId, columnId)?.isNgeFillTarget() ?? false;
  }

  /** Whether this cell is about to LEAVE the selection — a drag back into the block. */
  isFillDrop(rowId: string, columnId: string): boolean {
    return this.cellAt(rowId, columnId)?.isNgeFillDrop() ?? false;
  }

  /**
   * Abandon a fill without proposing anything — what `Escape` mid-drag calls.
   *
   * ⚠️ It drops the pending target and **leaves the range alone**. A user who gives up
   * on a fill has not given up on the selection they were filling from, and clearing
   * it would make `Escape` mean two different things depending on a gesture the table
   * has just cancelled.
   */
  cancelFill(): void {
    this.table()?.cancelNgeFill();
  }

  /**
   * The export seam's `cellPredicate`, ready to hand over.
   *
   * `<nge-table>` deliberately does not expose the engine instance, so this is a
   * consumer's route to the composition:
   *
   * ```ts
   * table.readNgeExportData({ cellPredicate: range.predicate() });
   * ```
   *
   * Matches nothing before a table has attached, which is the right answer for
   * "export what is selected" on a table that does not exist yet.
   *
   * ⚠️ **This is a READ off the raw instance, so it answers as of the last time
   * anything read the adapter's proxy** — the trap `AGENTS.md` records for a
   * `Column` captured before a state change. An application reads the proxy on every
   * change-detection pass, so an export triggered by a click after a selection is
   * always current; a spec that never renders is not, and would be asserting on the
   * wrong slice. Writes have no such exposure: they resolve inside `setState`
   * against the store's own state.
   */
  predicate(): (cell: NgeCellContext<unknown>) => boolean {
    const table = this.table();

    return table ? table.ngeRangePredicate() : () => false;
  }

  // ─── the gesture ───────────────────────────────────────────────────────────

  /**
   * Suppress the browser's text selection on a shift-click.
   *
   * ⚠️ Gated on `shiftKey` alone, and both halves of that matter — the reasoning
   * ARCH-250 recorded and ARCH-268 moved into `<nge-table>`, which does **not**
   * cover this gesture: its `onRowPointerDown` guard is gated on
   * `store.selectionEnabled()`, so a table with cell ranges and no row selection has
   * no guard at all until this one.
   *
   * - A blanket `user-select: none` on cells would also stop a user selecting and
   *   copying a single cell's text — a trade the ticket's constraints rule out.
   *   During a *drag* the same effect is achieved transiently by
   *   {@link NGE_RANGE_DRAGGING_CLASS}, which is removed on release.
   * - `preventDefault()` on `mousedown` suppresses **focus** as well, so applying it
   *   unconditionally would break an `<input>` inside a cell.
   *
   * `click` still fires after a prevented `mousedown`, so nothing downstream is
   * affected. ⚠️ A synthetic `MouseEvent` triggers no browser default at all, so a
   * spec cannot catch a regression here — verify it with a real pointer.
   */
  private readonly onMouseDown = (event: Event): void => {
    const mouse = event as MouseEvent;

    if (mouse.shiftKey && this.cellKeyAt(mouse.target)) {
      mouse.preventDefault();
    }
  };

  private readonly onPointerDown = (event: Event): void => {
    const pointer = event as PointerEvent;

    // ⚠️ **Touch is deliberately out of scope**, and the reason is the drag surface.
    // Making a gesture work on a touchscreen means `touch-action: none` on whatever
    // owns it (ARCH-244's grip carries exactly that), but *every cell* owns this one
    // — so the same treatment would make the table unscrollable by finger. A touch
    // range needs a small grip of its own to start from, which is ARCH-271's fill
    // handle. Do not add `touch-action: none` to cells.
    if (pointer.pointerType === 'touch') {
      return;
    }

    // Secondary buttons open context menus; neither starts nor clears a selection.
    if (pointer.button !== 0) {
      return;
    }

    const target = pointer.target as Element | null;

    // A cell is an arbitrary render target, so a pointerdown inside a control
    // belongs to that control.
    if (isNgeInteractiveElement(target)) {
      return;
    }

    // ⚠️ BEFORE the cell hit-test. The handle lives inside a stamped cell, so the
    // test below would resolve it and start a one-cell range — wiping the selection
    // this gesture exists to extend. See FILL_HANDLE_SELECTOR.
    if (target?.closest(FILL_HANDLE_SELECTOR)) {
      this.dragMode = 'fill';
      this.beginDrag(pointer);

      return;
    }

    const cell = this.cellKeyAt(target);

    if (!cell) {
      return;
    }

    const plain = !pointer.shiftKey && !pointer.metaKey && !pointer.ctrlKey;

    // ⚠️ Armed from the state BEFORE the press, and that ordering is the whole of
    // it. `start()` below makes the pressed cell the sole selection whatever it was
    // a moment ago, so asking the same question at release cannot tell "clicked the
    // cell that was already alone" from "clicked a fresh cell" — and a first click
    // would select, then immediately clear itself. The entry-point agreement specs
    // in `nge-cell-range.spec.ts` catch that, and did.
    //
    // The clear still happens on RELEASE, not here: this press may be the opening
    // frame of a drag, and clearing now would leave that drag nothing to extend, so
    // `extendTo` would silently re-anchor at whichever cell the pointer reached
    // first. `onPointerMove` withdraws the candidate once the gesture leaves the
    // cell it began on.
    this.pendingClear =
      plain && this.cellAt(cell.rowId, cell.columnId)?.isNgeSoleSelection() === true
        ? { columnId: cell.columnId, rowId: cell.rowId }
        : null;

    if (pointer.shiftKey) {
      this.extendTo(cell.rowId, cell.columnId);
    } else {
      this.start(cell.rowId, cell.columnId, { additive: pointer.metaKey || pointer.ctrlKey });
    }

    this.dragMode = 'range';
    this.beginDrag(pointer);
  };

  private readonly onPointerMove = (event: Event): void => {
    const pointer = event as PointerEvent;

    if (this.pointerId === null || pointer.pointerId !== this.pointerId) {
      return;
    }

    this.pointerX = pointer.clientX;
    this.pointerY = pointer.clientY;

    // The press became a drag the moment it resolved to a different cell, so it is
    // no longer a click and cannot clear. Compared by cell rather than by pixels:
    // a few pixels of tremor inside the cell that was pressed is still a click, and
    // a pixel threshold would need a magic number this has no way to justify.
    if (this.pendingClear !== null) {
      const cell = this.cellKeyAt(
        this.document?.elementFromPoint(this.pointerX, this.pointerY) ?? null
      );

      if (
        cell === null ||
        cell.rowId !== this.pendingClear.rowId ||
        cell.columnId !== this.pendingClear.columnId
      ) {
        this.pendingClear = null;
      }
    }

    this.extendToPoint(this.pointerX, this.pointerY);
    this.scheduleAutoScroll();
  };

  private readonly onPointerUp = (event: Event): void => {
    const pointer = event as PointerEvent;

    if (this.pointerId === null || pointer.pointerId !== this.pointerId) {
      return;
    }

    // ⚠️ The commit happens on RELEASE and nowhere else — one `fill-intent` per
    // gesture. It runs before the mode is reset so a re-entrant handler cannot see a
    // half-torn-down drag, and `commitNgeFill` is itself a no-op when the pointer
    // never left the source.
    if (this.dragMode === 'fill') {
      this.table()?.commitNgeFill();
    }

    // A plain press that never left its cell is a click, and on the cell that was
    // the whole selection it clears. `clearNgeRangeIfSole` decides that inside its
    // own updater, so this stays a gesture question and never reads state back.
    if (this.dragMode === 'range' && this.pendingClear !== null) {
      this.cellAt(this.pendingClear.rowId, this.pendingClear.columnId)?.clearNgeRangeIfSole();
    }

    this.pendingClear = null;

    this.releasePointer(pointer);
    this.endDrag();
  };

  /**
   * Tear the in-flight gesture down, whatever ended it.
   *
   * One place, because a release and an `Escape` must leave exactly the same state
   * behind — a drag that ended but left `pointerId` set would keep following the
   * pointer, and one that left `dragMode` on `'fill'` would make the *next* range drag
   * commit a fill. The pointer capture is released by the caller that has an event;
   * the browser releases it implicitly on `pointerup` anyway.
   */
  private endDrag(): void {
    this.dragMode = 'range';
    this.pointerId = null;
    this.stopAutoScroll();
    this.root?.classList.remove(NGE_RANGE_DRAGGING_CLASS);
  }

  private readonly onKeydown = (event: KeyboardEvent): void => {
    // ⚠️ **A fill in flight claims `Escape` first, and ignores `clearOnEscape`.** That
    // option governs whether this table gives up its *selection* to the key; a
    // cancelled fill gives up neither the selection nor anything else, so gating it
    // would leave a drag with no way out on precisely the tables that opted out. The
    // gesture ends here too — a cancelled drag that kept following the pointer would
    // re-propose the block on release.
    if (event.key === 'Escape' && this.dragMode === 'fill' && this.pointerId !== null) {
      this.cancelFill();
      this.endDrag();

      return;
    }

    if (event.key === 'Escape' && this.options.clearOnEscape) {
      this.clear();

      return;
    }

    // Ahead of the two engagement-scoped gestures, because this one is scoped by
    // FOCUS instead — a header cell is a real tab stop, so "which column did the
    // user mean" has an answer here that no other shortcut in this class has. It
    // therefore works on a table nobody has clicked into, which is what makes it a
    // usable keyboard route rather than a shadow of the pointer one.
    if (this.isSelectColumn(event)) {
      this.selectFocusedColumn(event);

      return;
    }

    if (this.isSelectAll(event)) {
      this.takeKey(event, () => this.selectAll());

      return;
    }

    const step = this.arrowStep(event);

    if (step) {
      this.takeKey(event, () => this.table()?.extendNgeRangeByStep(step));
    }
  };

  /** cmd/ctrl + `Space`, when the option allows it. */
  private isSelectColumn(event: KeyboardEvent): boolean {
    return (
      this.options.selectColumnOnModifierSpace &&
      event.key === ' ' &&
      (event.metaKey || event.ctrlKey)
    );
  }

  /**
   * Select the column of whichever header has focus — the keyboard route.
   *
   * ⚠️ **Scoped by the stamped header, and it does not go through
   * {@link takeKey}.** That helper's engagement rule exists because cmd-A and the
   * arrows have no other way to tell which table a key was meant for; this one has
   * a focused element inside a specific header, which is a stronger answer. Applying
   * the engagement rule as well would make the keyboard route unreachable until the
   * user had first used the pointer one.
   *
   * The key is consumed rather than left alone, because cmd/ctrl + `Space` is a
   * platform input-method shortcut. It is only consumed once a stamped header has
   * been found, so a press anywhere else on the page is untouched.
   */
  private selectFocusedColumn(event: KeyboardEvent): void {
    const header = (event.target as Element | null)?.closest?.(COLUMN_SELECTOR);
    const columnId = header?.getAttribute(NGE_RANGE_COLUMN_ATTRIBUTE);

    if (!columnId) {
      return;
    }

    event.preventDefault();

    if (event.shiftKey) {
      this.extendToColumn(columnId);
    } else {
      this.startColumn(columnId);
    }
  }

  /** cmd/ctrl + `A`, when the option allows it. */
  private isSelectAll(event: KeyboardEvent): boolean {
    return (
      this.options.selectAllOnModifierA &&
      event.key.toLowerCase() === 'a' &&
      (event.metaKey || event.ctrlKey)
    );
  }

  /**
   * `Shift`+arrow, as a step — or `null` when this is not that gesture.
   *
   * ⚠️ **`Shift` alone, with no other modifier.** cmd/ctrl/alt + `Shift` + arrow are
   * the platform's own "extend selection to the end of the line / document" gestures,
   * and a table that swallowed those would be taking keys it has no equivalent for.
   */
  private arrowStep(event: KeyboardEvent): NgeRangeStep | null {
    if (!event.shiftKey || event.metaKey || event.ctrlKey || event.altKey) {
      return null;
    }

    return ARROW_STEPS[event.key] ?? null;
  }

  /**
   * Consume a key on behalf of this table, or leave it entirely alone.
   *
   * ⚠️ **Scoped by ENGAGEMENT, and the gesture anchor is what that means.** Unlike
   * `Escape`, these two gestures cannot be polite by being no-ops: taking them
   * requires `preventDefault()`, or cmd-A also selects the whole document's text and
   * an arrow also scrolls whatever is behind the table. So an unscoped listener would
   * swallow every select-all and every arrow key on the page. The anchor is set by
   * the first click into this table and dropped by a clear, which makes it exactly
   * the question "is the user working in here?" — and it is this class's own field
   * rather than a read off the raw engine instance, so it is never stale.
   *
   * ⚠️ **A clamped arrow still consumes the key.** Holding `Shift`+`ArrowDown` at the
   * last row writes nothing, and letting the key through at that moment would make
   * the page lurch into a scroll mid-gesture — the one frame where the user is least
   * expecting it. Consumption follows whether the gesture *applies*, not whether it
   * changed anything.
   */
  private takeKey(event: KeyboardEvent, run: () => void): void {
    if (this.anchor === null) {
      return;
    }

    if (isNgeInteractiveElement(event.target)) {
      return;
    }

    event.preventDefault();
    run();
  }

  /**
   * Take the rest of the gesture over.
   *
   * Capture goes on the **root**, not on the cell: it retargets the whole pointer
   * stream to one element, which is what lets `pointermove` and `pointerup` be bound
   * there once. ⚠️ The same retargeting is why per-cell `pointerenter` cannot be
   * used to follow a drag, and why {@link extendToPoint} hit-tests with
   * `elementFromPoint` instead.
   */
  private beginDrag(event: PointerEvent): void {
    this.pointerId = event.pointerId;
    this.pointerX = event.clientX;
    this.pointerY = event.clientY;

    this.capturePointer(event);
    this.root?.classList.add(NGE_RANGE_DRAGGING_CLASS);
  }

  /**
   * Carry the in-flight gesture to whichever cell is under a viewport point.
   *
   * One hit-test serving both drags, because both follow the pointer over the same
   * stamped cells and both are driven by `pointermove` *and* by each auto-scroll frame.
   * Only what it writes differs.
   */
  private extendToPoint(clientX: number, clientY: number): void {
    const cell = this.cellKeyAt(this.document?.elementFromPoint(clientX, clientY) ?? null);

    if (!cell) {
      return;
    }

    if (this.dragMode === 'fill') {
      this.table()?.moveNgeFillTo(cell.rowId, cell.columnId);
    } else {
      this.extendTo(cell.rowId, cell.columnId);
    }
  }

  /**
   * The cell an element sits in, by the attribute the overlay stamped.
   *
   * `closest`, so a pointerdown on a cell's text, a projected template's markup, or
   * the overlay itself all resolve to the same cell. Returns `null` for anything
   * outside a stamped cell — a header, a lane's padding, the empty band — which the
   * callers treat as "not a gesture".
   */
  private cellKeyAt(target: EventTarget | null): null | { columnId: string; rowId: string } {
    const element = (target as Element | null)?.closest?.(CELL_SELECTOR);
    const key = element?.getAttribute(NGE_RANGE_CELL_ATTRIBUTE);

    return key ? parseNgeRangeCellKey(key) : null;
  }

  // ─── auto-scroll ───────────────────────────────────────────────────────────
  //
  // A drag that reaches a viewport edge keeps going: the viewport scrolls and the
  // range keeps extending against the cells that arrive, so a rectangle can exceed
  // the visible rows without the user letting go. It is a `requestAnimationFrame`
  // loop rather than an interval because it writes scroll offsets, and it
  // re-hit-tests at the *last known pointer position* each frame — the pointer is
  // not moving, the cells under it are.

  private scheduleAutoScroll(): void {
    const view = this.document?.defaultView;

    if (this.autoScrollFrame !== null || !view) {
      return;
    }

    this.autoScrollFrame = view.requestAnimationFrame(this.onAutoScrollFrame);
  }

  private readonly onAutoScrollFrame = (): void => {
    this.autoScrollFrame = null;

    const viewport = this.root?.querySelector(VIEWPORT_SELECTOR);

    if (this.pointerId === null || !viewport) {
      return;
    }

    const step = this.autoScrollStep(viewport.getBoundingClientRect());

    // Nothing to do this frame, so the loop stops rather than spinning; the next
    // `pointermove` restarts it. A drag held still in the middle of the table
    // therefore costs no frames at all.
    if (step.x === 0 && step.y === 0) {
      return;
    }

    viewport.scrollTop += step.y;
    viewport.scrollLeft += step.x;

    this.extendToPoint(this.pointerX, this.pointerY);
    this.scheduleAutoScroll();
  };

  /**
   * How far to scroll this frame, per axis.
   *
   * ⚠️ A viewport with no measured box cannot be scrolled towards an edge, and
   * every rect is zero in jsdom — so the guard is what keeps a spec that dispatches
   * a `pointermove` from starting a loop that scrolls nothing forever.
   */
  private autoScrollStep(rect: DOMRect): { x: number; y: number } {
    if (rect.height === 0 || rect.width === 0) {
      return { x: 0, y: 0 };
    }

    const { autoScrollSpeed, autoScrollThreshold } = this.options;

    return {
      x: autoScrollAxisStep(
        this.pointerX,
        rect.left,
        rect.right,
        autoScrollThreshold,
        autoScrollSpeed
      ),
      y: autoScrollAxisStep(
        this.pointerY,
        rect.top,
        rect.bottom,
        autoScrollThreshold,
        autoScrollSpeed
      ),
    };
  }

  private stopAutoScroll(): void {
    const view = this.document?.defaultView;

    if (this.autoScrollFrame !== null && view) {
      view.cancelAnimationFrame(this.autoScrollFrame);
    }

    this.autoScrollFrame = null;
  }

  // ─── plumbing ──────────────────────────────────────────────────────────────

  /**
   * One cell of the current row model, by id.
   *
   * `getRow` throws on an unknown id rather than returning `undefined`, and an id
   * that has been filtered out is an ordinary thing for a stale hit-test to carry —
   * so the lookup is guarded rather than trusted.
   */
  private cellAt(rowId: string, columnId: string): Cell<unknown, unknown> | undefined {
    const table = this.table();

    if (!table) {
      return undefined;
    }

    return table
      .getRowModel()
      .rows.find(row => row.id === rowId)
      ?.getAllCells()
      .find(cell => cell.column.id === columnId);
  }

  /**
   * One column of the current table, by id.
   *
   * `getColumn` returns `undefined` rather than throwing, so this needs no guard of
   * its own beyond the missing table — a stale id from a header that has since been
   * hidden is an ordinary thing for a keyboard route to carry.
   */
  private columnAt(columnId: string): Column<unknown, unknown> | undefined {
    return this.table()?.getColumn(columnId);
  }

  private capturePointer(event: PointerEvent): void {
    try {
      this.root?.setPointerCapture?.(event.pointerId);
    } catch {
      // jsdom and detached nodes have no capture. It is a robustness measure, not a
      // requirement — the drag still works without it, it just stalls if the pointer
      // leaves the table. Same shape as `<nge-table>`'s own `capturePointer`.
    }
  }

  private releasePointer(event: PointerEvent): void {
    try {
      if (this.root?.hasPointerCapture?.(event.pointerId)) {
        this.root.releasePointerCapture(event.pointerId);
      }
    } catch {
      // See `capturePointer`.
    }
  }

  private releaseRoot(): void {
    this.releaseListeners?.();
    this.releaseListeners = null;
    this.root = null;
  }
}

/**
 * How far one axis scrolls this frame.
 *
 * Ramped rather than flat: nothing at the threshold's inner edge, the configured
 * speed at the viewport's boundary and beyond. A constant speed makes a long
 * selection either unbearably slow or impossible to stop on the right row, and
 * there is no single value that is both.
 */
function autoScrollAxisStep(
  position: number,
  start: number,
  end: number,
  threshold: number,
  speed: number
): number {
  if (position < start + threshold) {
    return -ramp(start + threshold - position, threshold, speed);
  }

  if (position > end - threshold) {
    return ramp(position - (end - threshold), threshold, speed);
  }

  return 0;
}

function ramp(distance: number, threshold: number, speed: number): number {
  return Math.min(1, distance / threshold) * speed;
}

/**
 * The `TableFeature` that performs the hand-off.
 *
 * Separate from `ngeCellRange` so that feature stays a plain object with no
 * dependencies — registerable on its own by anyone who wants range state and export
 * composition without the gesture or the rendered overlay.
 */
export function createNgeRangeBridgeFeature(bridge: NgeRangeBridge): TableFeature {
  return {
    createTable: (table: Table<unknown>): void => {
      bridge.attach(table);
    },
  };
}
