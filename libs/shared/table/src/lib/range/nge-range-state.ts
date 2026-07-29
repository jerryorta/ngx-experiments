/**
 * The separator between a row id and a column id in a cell key.
 *
 * Two colons rather than one, and the same pair `src/lib/highlight/` uses, because
 * a row id is `getRowId(row)` — the consumer's own value, frequently a Firestore
 * document path, which contains single slashes and colons far more often than it
 * contains this pair. The two addons agreeing on the convention costs nothing and
 * means a consumer reading one key format has read both.
 */
export const NGE_RANGE_KEY_SEPARATOR = '::';

/** One cell, as `rowId::columnId`. */
export type NgeRangeCellKey = string;

/**
 * A rectangular block of selected cells, stored as a **descriptor**.
 *
 * ⚠️ **Four ids, symmetric on both axes — and that is a deliberate divergence from
 * `NgeHighlightRange` (`src/lib/highlight/nge-highlight-state.ts`), whose shape
 * is `{ anchorRowId, focusRowId, columnIds }`.** Highlighting materialises its
 * column span at write time; a range
 * keeps both endpoints as *cells* and resolves both spans at **read** time — rows
 * against the processed row model, columns against the visible leaf columns in
 * visual order. Three things follow, and each is why the divergence is worth the
 * asymmetry between two sibling addons:
 *
 * - A column reorder or a pin re-shapes the block exactly as a sort does. The epic
 *   settled that a re-sort re-shapes a block rather than carrying or clearing it;
 *   this applies the same reading to the axis ARCH-250 never had one for.
 * - Hiding a column narrows the block instead of leaving a materialised id
 *   describing a column nobody can see.
 * - There is a focus **cell** rather than a focus row, which is what keyboard
 *   extension moves and what a later fill handle (ARCH-271) hangs off.
 *
 * ⚠️ **The scalability lock is unchanged.** Selecting one column of the 10,000-row
 * fixture as a per-cell map is ~270 KB of JSON re-emitted on every `stateChange`,
 * and a few such columns exceed Firestore's 1 MiB document limit — which destroys
 * the "a user's view can be persisted and restored" property rather than merely
 * costing frames. A descriptor is four strings regardless of how much it covers.
 *
 * ⚠️ **The anchor here is the RECTANGLE's corner, not the gesture's origin.** They
 * coincide most of the time and are conceptually distinct: this one is persisted
 * and is what the block is resolved from, while where the user's *current* gesture
 * started is scratch on `NgeRangeBridge` (`./nge-range-bridge.ts`) and never
 * reaches state. See that class for why an anchor must not survive a reload.
 *
 * ⚠️ **A `null` row endpoint means "the view's boundary", NOT "missing".** It is
 * what expresses a whole column (ARCH-270) — `{ anchorRowId: null, focusRowId:
 * null }` — in one object rather than as a span between the two records that
 * happened to be first and last when the user clicked. The distinction is the whole
 * point: a materialised span is anchored on those two records, so a sort moves them
 * and the "column" silently shrinks to whatever now lies between. `null` is
 * resolved against the row order on every read, so it survives a sort by
 * construction, and the degeneracy rules below still apply to an id that has
 * genuinely left the model.
 *
 * The **column** endpoints stay non-nullable. A whole-row mark would be their
 * mirror image and has no story yet; minting the capability before the semantics
 * are decided is exactly the speculative seam this epic avoids.
 */
export interface NgeCellRange {
  /** The column of the corner the block is anchored on. */
  anchorColumnId: string;
  /** The row of that corner, or `null` for the first row of the view. */
  anchorRowId: null | string;
  /** The column of the moving corner — where a drag or a shift-click last reached. */
  focusColumnId: string;
  /** The row of that corner, or `null` for the last row of the view. */
  focusRowId: null | string;
}

/**
 * The cell-range slice of {@link NgeTableState}, owned by the host like every
 * other slice.
 *
 * An **array** of rectangles rather than one, because cmd/ctrl-drag adds disjoint
 * blocks the way a spreadsheet does. The **last** entry is the active range — the
 * one a shift-click and a keyboard extension move — which is the only ordering
 * fact anything in this addon relies on.
 *
 * Plain JSON by construction — strings, arrays, and plain objects — so it inherits
 * the persistability promise `NgeTableState` makes and a spec asserts.
 */
export interface NgeRangeState {
  /** Disjoint rectangles, oldest first. The last one is active. */
  ranges: NgeCellRange[];
}

/** The key one cell is stored under. */
export function ngeRangeCellKey(rowId: string, columnId: string): NgeRangeCellKey {
  return `${rowId}${NGE_RANGE_KEY_SEPARATOR}${columnId}`;
}

/**
 * Split a cell key back into its parts.
 *
 * Splits on the **last** separator, not the first. A row id is the consumer's own
 * `getRowId(row)` output and may contain anything; a column id is an identifier the
 * consumer wrote in a `NgeTableColumn`, and cannot contain the separator without
 * the key being ambiguous in the first place. So the right-hand side is the
 * trustworthy end to anchor on — which matters more here than for highlighting,
 * because these keys make a round trip through a DOM attribute the gesture reads
 * back.
 */
export function parseNgeRangeCellKey(key: NgeRangeCellKey): {
  columnId: string;
  rowId: string;
} {
  const at = key.lastIndexOf(NGE_RANGE_KEY_SEPARATOR);

  return at === -1
    ? { columnId: '', rowId: key }
    : {
        columnId: key.slice(at + NGE_RANGE_KEY_SEPARATOR.length),
        rowId: key.slice(0, at),
      };
}

/** A fresh, empty range slice, optionally seeded. */
export function createNgeRangeState(overrides: Partial<NgeRangeState> = {}): NgeRangeState {
  return { ranges: [], ...overrides };
}

/**
 * Fill in a slice the host has not written yet.
 *
 * ⚠️ **Every entry point must go through this.** `createNgeTableState()` cannot
 * know about an addon's slice, so a host handing in a perfectly valid state leaves
 * `ngeRange` `undefined` until the first write — and the feature's updaters are
 * handed exactly that. Assuming `getInitialState` seeded it is the bug that only
 * shows up against a host that built its state the documented way.
 */
export function normalizeNgeRangeState(state: NgeRangeState | undefined): NgeRangeState {
  return state ?? createNgeRangeState();
}

/**
 * Row id → its position in the **processed** row model.
 *
 * What resolves a {@link NgeCellRange}'s row endpoints into a span. Built from the
 * post-filter, post-sort rows, so a range means the block the user can currently
 * see rather than a slice of the source array.
 */
export type NgeRangeRowOrder = ReadonlyMap<string, number>;

/**
 * Column id → its position in **visual** order, across the three lanes.
 *
 * The column-axis counterpart of {@link NgeRangeRowOrder}, and the reason this
 * addon's descriptor can name two columns instead of listing them all: pinning is
 * precisely what makes DOM order diverge from declaration order, so a block that
 * spans "everything between these two columns" has to be resolved against the same
 * composition the table draws with.
 */
export type NgeRangeColumnOrder = ReadonlyMap<string, number>;

/**
 * The range a shift-click or a keyboard extension moves, or `null`.
 *
 * The last entry, because that is the one the user most recently started. Reading
 * it through a function rather than indexing at the call sites keeps that fact in
 * one place, so multi-range ordering could change without hunting for `at(-1)`.
 */
export function activeNgeCellRange(state: NgeRangeState): NgeCellRange | null {
  return state.ranges.length === 0 ? null : state.ranges[state.ranges.length - 1];
}

/**
 * Whether one cell falls inside any selected rectangle — the seam's whole read
 * path.
 *
 * A predicate rather than a lookup into a materialised set, which is what lets a
 * range stay a descriptor. Called once per rendered cell, so an empty slice answers
 * on a single length check before either order map is consulted.
 *
 * The degeneracy rules are inherited verbatim from `ngeSelectionRangeIds`
 * (ARCH-268), applied to both axes:
 *
 * - A **focus** that is not in the current model matches nothing. A filter that
 *   hid the moving corner has removed the block's boundary, and inventing one would
 *   select cells the user never dragged across.
 * - An **anchor** that is not in the current model degenerates to the focus alone,
 *   rather than throwing or selecting from index zero. A filtered-away anchor is an
 *   ordinary thing for a restored view to carry.
 */
export function isNgeCellInRange(
  state: NgeRangeState,
  rowId: string,
  columnId: string,
  rowOrder: NgeRangeRowOrder,
  columnOrder: NgeRangeColumnOrder
): boolean {
  if (state.ranges.length === 0) {
    return false;
  }

  const rowIndex = rowOrder.get(rowId);
  const columnIndex = columnOrder.get(columnId);

  if (rowIndex === undefined || columnIndex === undefined) {
    return false;
  }

  return state.ranges.some(range =>
    coversCell(range, rowIndex, columnIndex, rowOrder, columnOrder)
  );
}

/**
 * Whether one cell is the **focus** of the active range.
 *
 * What a spreadsheet draws differently from the rest of the block: the cell the
 * next keyboard extension moves from, and where a fill handle would sit. A pure
 * string comparison — no order map — because the focus is a cell, not a span.
 */
export function isNgeRangeFocusCell(
  state: NgeRangeState,
  rowId: string,
  columnId: string
): boolean {
  const active = activeNgeCellRange(state);

  return active !== null && active.focusRowId === rowId && active.focusColumnId === columnId;
}

/**
 * Begin a range at one cell — the plain-click and cmd/ctrl-click path.
 *
 * A 1×1 rectangle rather than a separate "single cell" representation, so
 * everything downstream has exactly one shape to read and a drag is just this
 * followed by {@link extendNgeRangeTo}.
 *
 * `additive` is cmd/ctrl: it **appends** a disjoint rectangle instead of replacing
 * what is there, which is the whole reason `ranges` is an array. A plain start
 * replaces, because that is what clicking into a spreadsheet does.
 *
 * Returns the **same reference** when a plain start lands on a selection that is
 * already exactly that one cell, so clicking the same cell twice writes nothing and
 * emits no `stateChange`.
 */
export function startNgeRange(
  state: NgeRangeState,
  rowId: string,
  columnId: string,
  options: { additive?: boolean } = {}
): NgeRangeState {
  const range: NgeCellRange = {
    anchorColumnId: columnId,
    anchorRowId: rowId,
    focusColumnId: columnId,
    focusRowId: rowId,
  };

  if (options.additive) {
    return { ...state, ranges: [...state.ranges, range] };
  }

  if (state.ranges.length === 1 && isSameNgeCellRange(state.ranges[0], range)) {
    return state;
  }

  return { ...state, ranges: [range] };
}

/**
 * Move the active range's focus to one cell — the shift-click, drag, and keyboard
 * path.
 *
 * ⚠️ **The anchor deliberately does not move.** That is what lets a block be grown
 * *and shrunk* rather than only ratcheted: dragging back towards the anchor makes
 * the rectangle smaller, and a second shift-click is how a user corrects an
 * over-shoot. It is the same rule ARCH-268 records for row ranges and ARCH-250 for
 * highlight blocks.
 *
 * Only the **active** (last) range moves, so a disjoint block added with cmd/ctrl
 * stays where it was put while the newest one follows the pointer.
 *
 * With no range at all this is a no-op — a shift-click on a table nobody has
 * clicked into has nothing to extend from. The gesture layer decides what to do
 * about that; see `NgeRangeBridge`, which starts a range instead.
 */
export function extendNgeRangeTo(
  state: NgeRangeState,
  rowId: string,
  columnId: string
): NgeRangeState {
  const active = activeNgeCellRange(state);

  if (active === null) {
    return state;
  }

  return replaceActiveNgeRange(state, active, {
    ...active,
    focusColumnId: columnId,
    focusRowId: rowId,
  });
}

/** One arrow press, as a signed step on each axis. */
export interface NgeRangeStep {
  /** Columns to move the focus by, in visual order. Negative is leftward. */
  column: number;
  /** Rows to move the focus by, in the processed row order. Negative is upward. */
  row: number;
}

/**
 * Move the active rectangle's focus by one cell — the `Shift`+arrow path.
 *
 * **Delegates to {@link extendNgeRangeTo} rather than reimplementing it, and that
 * is the whole design.** A keyboard extension is a third entry point into one state,
 * and ARCH-268 shipped a defect precisely because two entry points into row
 * selection disagreed. Here they cannot: the arrows only decide *which cell*, and
 * the extension itself is the same function shift-click and drag already go through
 * — so the anchor stays put, a repeat towards the anchor shrinks the block, and an
 * unchanged result returns the same reference, all inherited rather than restated.
 *
 * Positions come from the **current** view — the processed row order and the visible
 * columns in visual order — so an arrow means "one row down the table as it stands",
 * which after a sort is a different record than it was before.
 *
 * **Clamped at the ends, never wrapped.** Arrowing off the last row is a no-op, not
 * a jump to the first: a selection that teleports across the table is never what the
 * key meant.
 *
 * Two no-ops, both deliberate: nothing selected means there is nothing to extend
 * (the gesture layer must *not* invent a rectangle here — a stray `Shift`+arrow on
 * an untouched table should do nothing), and a focus that has been filtered out of
 * the view has no position to step from, so guessing one would move the block
 * somewhere the user cannot see.
 */
export function stepNgeRangeFocus(
  state: NgeRangeState,
  step: NgeRangeStep,
  rowIdsInOrder: readonly string[],
  columnIdsInOrder: readonly string[]
): NgeRangeState {
  const active = activeNgeCellRange(state);

  if (active === null) {
    return state;
  }

  // ⚠️ A `null` focus row is a whole-column mark, which has no cell to step FROM —
  // so this is a no-op rather than a guess. Materialising the row axis at the top or
  // the bottom of the view would silently turn "this whole column" into "these rows
  // of it", discarding the property the null endpoint exists to hold. Giving the
  // gesture a real starting cell is ARCH-271's fill handle, not this.
  const rowIndex = active.focusRowId === null ? -1 : rowIdsInOrder.indexOf(active.focusRowId);
  const columnIndex = columnIdsInOrder.indexOf(active.focusColumnId);

  if (rowIndex === -1 || columnIndex === -1) {
    return state;
  }

  return extendNgeRangeTo(
    state,
    rowIdsInOrder[clampIndex(rowIndex + step.row, rowIdsInOrder.length)],
    columnIdsInOrder[clampIndex(columnIndex + step.column, columnIdsInOrder.length)]
  );
}

/**
 * One whole column, as a rectangle unbounded on the row axis (ARCH-270).
 *
 * The canonical constructor, so "what shape is a selected column" has one answer.
 * It is an ordinary {@link NgeCellRange} — there is no separate column concept in
 * the slice, which is what keeps `isNgeCellInRange`, the export predicate, and the
 * overlay working on a selected column with no knowledge that columns can be
 * selected.
 */
export function ngeWholeColumnRange(columnId: string): NgeCellRange {
  return {
    anchorColumnId: columnId,
    anchorRowId: null,
    focusColumnId: columnId,
    focusRowId: null,
  };
}

/**
 * Select one whole column, replacing everything — the plain header-strip click.
 *
 * Delegates to {@link setNgeRange} rather than reimplementing the replace, so a
 * repeat click on an already-selected column returns the same reference and writes
 * nothing.
 */
export function startNgeColumnRange(state: NgeRangeState, columnId: string): NgeRangeState {
  return setNgeRange(state, ngeWholeColumnRange(columnId));
}

/**
 * The plain header-strip click, which SELECTS a column or clears it when that
 * column is already the whole selection.
 *
 * ⚠️ **Distinct from {@link toggleNgeColumnRange}, and the difference is what
 * happens to everything else.** The cmd/ctrl path toggles one column in or out of a
 * multi-block selection and leaves the rest alone. This one replaces — a plain
 * click has always meant "just this", so clicking a *second* column drops the first
 * rather than adding to it, and only the already-alone case has anywhere left to go
 * but empty.
 *
 * Returns the same reference when it replaces nothing, so `applyTableState`'s
 * identity short-circuit still suppresses a no-op write.
 */
export function selectOrClearNgeColumnRange(
  state: NgeRangeState,
  columnId: string
): NgeRangeState {
  const range = ngeWholeColumnRange(columnId);

  if (state.ranges.length === 1 && isSameNgeCellRange(state.ranges[0], range)) {
    return { ...state, ranges: [] };
  }

  return setNgeRange(state, range);
}

/**
 * Clear the selection when it is exactly this one cell — the plain click that lands
 * on a lone selected cell without becoming a drag.
 *
 * ⚠️ **A no-op in every other case, and deliberately so.** With a block selected,
 * a plain click on a cell inside it already collapses the block to that cell
 * (`startNgeRange` replaces), which is the "start over" half of the gesture; only
 * the already-alone cell has anywhere further to go. Widening this to clear any
 * covered cell would make a click inside a block ambiguous between re-anchoring and
 * clearing.
 *
 * ⚠️ **The caller must resolve this INSIDE `writeNgeRange`'s updater**, never from
 * a pre-read off the raw engine instance — that instance's `options.state` refreshes
 * only when the adapter's proxy is read, and a guard decided from a stale read is
 * the silently-swallowed write ARCH-269 records.
 */
export function clearNgeCellIfSole(
  state: NgeRangeState,
  rowId: string,
  columnId: string
): NgeRangeState {
  if (isNgeCellSoleSelection(state, rowId, columnId)) {
    return { ...state, ranges: [] };
  }

  return state;
}

/**
 * Whether the selection is exactly this one cell and nothing else.
 *
 * ⚠️ **The gesture layer reads this BEFORE a press, to tell "click the cell that was
 * already alone" from "click a fresh cell".** By release the two are
 * indistinguishable — `startNgeRange` has made the pressed cell the sole selection
 * either way — so a release-time test alone would clear on a first click and select
 * nothing. `nge-cell-range.spec.ts`'s entry-point agreement specs catch exactly
 * that, and did.
 *
 * A stale answer here is safe in one direction only, which is why it is allowed to
 * be a read: {@link clearNgeCellIfSole} re-decides inside its own updater, so a
 * false positive costs a no-op write and never a wrong clear.
 */
export function isNgeCellSoleSelection(
  state: NgeRangeState,
  rowId: string,
  columnId: string
): boolean {
  const range: NgeCellRange = {
    anchorColumnId: columnId,
    anchorRowId: rowId,
    focusColumnId: columnId,
    focusRowId: rowId,
  };

  return state.ranges.length === 1 && isSameNgeCellRange(state.ranges[0], range);
}

/**
 * Take the contiguous span of columns from the active anchor out to one column —
 * the `shift`-click on a header strip.
 *
 * ⚠️ **It unbounds the ROW axis of whatever was active**, which is the one place
 * anything moves an anchor. The anchor *column* stays put, exactly as it does for a
 * cell extension — but a user who shift-clicks a header is asking for columns, so a
 * cell block that was two rows tall becomes full-height rather than staying a
 * two-row band under the new headers. That is what a spreadsheet does, and the
 * alternative (refusing to extend from a cell anchor) would make the same gesture
 * mean different things depending on what the user did a moment earlier.
 *
 * A no-op with nothing selected; the gesture layer starts a column instead.
 */
export function extendNgeColumnRangeTo(state: NgeRangeState, columnId: string): NgeRangeState {
  const active = activeNgeCellRange(state);

  if (active === null) {
    return state;
  }

  return replaceActiveNgeRange(state, active, {
    ...active,
    anchorRowId: null,
    focusColumnId: columnId,
    focusRowId: null,
  });
}

/**
 * Add a disjoint whole column, or drop it when it is already selected — the
 * cmd/ctrl-click on a header strip.
 *
 * ⚠️ **This TOGGLES where {@link startNgeRange}'s additive path only appends**, and
 * the asymmetry is the interaction rather than an oversight. A column is a named
 * thing a user picks off a list, so clicking it again to unpick it is the obvious
 * reading; a cmd-clicked *cell* is the corner of a rectangle they are about to drag,
 * and removing it would fight the drag that follows.
 *
 * Removal matches the whole column exactly, so a cmd-click never dismantles a
 * rectangle the user dragged out that happens to cover this column.
 */
export function toggleNgeColumnRange(state: NgeRangeState, columnId: string): NgeRangeState {
  const range = ngeWholeColumnRange(columnId);
  const at = state.ranges.findIndex(entry => isSameNgeCellRange(entry, range));

  if (at === -1) {
    return { ...state, ranges: [...state.ranges, range] };
  }

  return { ...state, ranges: [...state.ranges.slice(0, at), ...state.ranges.slice(at + 1)] };
}

/**
 * Whether every cell of one column is selected — what tints a header.
 *
 * ⚠️ **Fully, not partially.** A column one corner of a dragged block passes through
 * is not a selected column, and tinting its header would make the header band say
 * the same thing for "I selected this column" and "my selection happens to touch
 * it". A second, weaker state for the partial case is a real design, but it is one
 * this story does not need and did not decide.
 *
 * A block dragged from the first visible row to the last therefore *does* count —
 * the question is what the rectangle covers, not which gesture produced it.
 */
export function isNgeColumnSelected(
  state: NgeRangeState,
  columnId: string,
  rowOrder: NgeRangeRowOrder,
  columnOrder: NgeRangeColumnOrder
): boolean {
  if (state.ranges.length === 0) {
    return false;
  }

  const columnIndex = columnOrder.get(columnId);

  if (columnIndex === undefined) {
    return false;
  }

  return state.ranges.some(range => {
    const columns = resolveSpan(range.anchorColumnId, range.focusColumnId, columnOrder);

    return (
      columns !== null &&
      isBetween(columnIndex, columns.anchor, columns.focus) &&
      spansEveryRow(range, rowOrder)
    );
  });
}

/**
 * Replace everything with one rectangle — what cmd/ctrl-A writes.
 *
 * Separate from {@link startNgeRange} because select-all is not a gesture origin:
 * it names both corners at once, and neither of them is where the user's pointer
 * is.
 */
export function setNgeRange(state: NgeRangeState, range: NgeCellRange): NgeRangeState {
  if (state.ranges.length === 1 && isSameNgeCellRange(state.ranges[0], range)) {
    return state;
  }

  return { ...state, ranges: [range] };
}

/**
 * Replace the **active** rectangle, leaving any disjoint siblings alone.
 *
 * The sibling of {@link setNgeRange}, which replaces the whole selection. This one
 * exists for an operation that reshapes the block a user is working in without
 * disturbing the other blocks they cmd/ctrl-added — the fill handle (ARCH-271) being
 * the first: filling from one rectangle of a multi-block selection should not silently
 * drop the rest.
 *
 * A no-op when nothing is selected, and same-reference when the shape has not changed.
 */
export function setActiveNgeCellRange(
  state: NgeRangeState,
  range: NgeCellRange
): NgeRangeState {
  const active = activeNgeCellRange(state);

  return active === null ? state : replaceActiveNgeRange(state, active, range);
}

/**
 * Drop every rectangle.
 *
 * Returns the **same reference** when there is nothing to clear, so a consumer
 * wiring this to a key can call it freely without churning state — which is what
 * lets the `Escape` handler stay unconditional and still be polite.
 */
export function clearNgeRange(state: NgeRangeState): NgeRangeState {
  return hasNgeRange(state) ? createNgeRangeState() : state;
}

/** Whether anything is currently selected. */
export function hasNgeRange(state: NgeRangeState): boolean {
  return state.ranges.length > 0;
}

/** Two descriptors describing the same rectangle, corner for corner. */
export function isSameNgeCellRange(a: NgeCellRange, b: NgeCellRange): boolean {
  return (
    a.anchorColumnId === b.anchorColumnId &&
    a.anchorRowId === b.anchorRowId &&
    a.focusColumnId === b.focusColumnId &&
    a.focusRowId === b.focusRowId
  );
}

/**
 * Whether one rectangle covers a cell, given both endpoints resolved.
 *
 * Private because the public question is always "is this cell selected *at all*",
 * which has to consider every range; a caller reaching for one range in isolation
 * would be reimplementing {@link isNgeCellInRange} badly.
 */
function coversCell(
  range: NgeCellRange,
  rowIndex: number,
  columnIndex: number,
  rowOrder: NgeRangeRowOrder,
  columnOrder: NgeRangeColumnOrder
): boolean {
  const rows = resolveSpan(range.anchorRowId, range.focusRowId, rowOrder);
  const columns = resolveSpan(range.anchorColumnId, range.focusColumnId, columnOrder);

  if (rows === null || columns === null) {
    return false;
  }

  return (
    isBetween(rowIndex, rows.anchor, rows.focus) &&
    isBetween(columnIndex, columns.anchor, columns.focus)
  );
}

/**
 * Swap the active rectangle for a reshaped one, or return the state untouched.
 *
 * The single place the no-op discipline lives, shared by every extension. A drag
 * fires a move per frame and most of them land on the cell the focus is already on;
 * returning the **same reference** is what keeps that from churning the host's state
 * sixty times a second — the same discipline `columnSizing`'s event silence exists
 * for, and what `writeNgeRange`'s identity short-circuit is looking for.
 */
function replaceActiveNgeRange(
  state: NgeRangeState,
  active: NgeCellRange,
  next: NgeCellRange
): NgeRangeState {
  if (isSameNgeCellRange(active, next)) {
    return state;
  }

  return { ...state, ranges: [...state.ranges.slice(0, -1), next] };
}

/**
 * Whether a rectangle's row axis covers the whole view.
 *
 * Two null endpoints answer `true` without consulting the order at all, which is
 * what makes a whole-column mark read as selected on a table with no rows — the user
 * picked the column, and an empty result set is not a reason to un-pick it.
 */
function spansEveryRow(range: NgeCellRange, rowOrder: NgeRangeRowOrder): boolean {
  if (range.anchorRowId === null && range.focusRowId === null) {
    return true;
  }

  const rows = resolveSpan(range.anchorRowId, range.focusRowId, rowOrder);

  return (
    rows !== null &&
    Math.min(rows.anchor, rows.focus) === 0 &&
    Math.max(rows.anchor, rows.focus) === rowOrder.size - 1
  );
}

/** One axis of a rectangle, resolved to positions in the current view. */
interface NgeRangeSpan {
  anchor: number;
  focus: number;
}

/**
 * Resolve one axis of a rectangle against the order it is expressed in, or `null`
 * when the axis names nothing the view still holds.
 *
 * Three cases, and keeping them distinct is the whole of the descriptor's
 * correctness:
 *
 * - **`null` is the view's boundary**, not a missing id — the anchor end resolves to
 *   the first position and the focus end to the last. That is what makes a
 *   whole-column mark (ARCH-270) survive a sort: it names no record, so there is no
 *   record for a sort to move.
 * - A **focus** that is not in the current model matches nothing. A filter that hid
 *   the moving corner has removed the block's boundary, and inventing one would
 *   select cells the user never dragged across.
 * - An **anchor** that is not in the current model degenerates to the focus alone,
 *   rather than throwing or spanning from position zero. A filtered-away anchor is
 *   an ordinary thing for a restored view to carry.
 *
 * ⚠️ The two `undefined` checks are therefore **not** interchangeable with the
 * `null` ones, and collapsing them with `??` would make a filtered-away focus select
 * to the end of the table.
 */
function resolveSpan(
  anchorId: null | string,
  focusId: null | string,
  order: ReadonlyMap<string, number>
): NgeRangeSpan | null {
  const focus = focusId === null ? order.size - 1 : order.get(focusId);

  if (focus === undefined) {
    return null;
  }

  return { anchor: anchorId === null ? 0 : (order.get(anchorId) ?? focus), focus };
}

/** Inclusive, and either way round — a focus may sit above or below its anchor. */
function isBetween(index: number, a: number, b: number): boolean {
  return index >= Math.min(a, b) && index <= Math.max(a, b);
}

/** Hold an index inside the view. Clamping, never wrapping — see {@link stepNgeRangeFocus}. */
function clampIndex(index: number, length: number): number {
  return Math.min(Math.max(index, 0), length - 1);
}
