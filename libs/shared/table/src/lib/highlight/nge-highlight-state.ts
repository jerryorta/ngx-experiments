/**
 * The separator between a row id and a column id in a cell key.
 *
 * Two colons rather than one because a row id is `getRowId(row)` — the consumer's
 * own value, frequently a Firestore document path, which contains single slashes
 * and colons far more often than it contains this pair.
 */
export const NGE_HIGHLIGHT_KEY_SEPARATOR = '::';

/** One individually-picked cell, as `rowId::columnId`. */
export type NgeHighlightCellKey = string;

/**
 * A contiguous block of highlighted cells, stored as a **descriptor**.
 *
 * ⚠️ **This shape is the epic's scalability lock, not a convenience.** Highlighting
 * one column of the 10,000-row fixture as a per-cell map is ~270 KB of JSON, built
 * in ~25 ms and re-emitted on every `stateChange`; three or four such columns
 * exceed Firestore's 1 MiB document limit. That does not merely slow the table
 * down — it destroys the "a user's view can be persisted and restored" property the
 * controlled-state contract exists for. A descriptor is one object regardless of
 * row count, and `columnIds.includes(id)` is cheaper per cell than the string key a
 * map form has to build before it can even look up.
 *
 * ⚠️ **Membership follows the current view order.** The endpoints are row *ids*, so
 * they follow their records across a scroll, a filter, and a re-fetch — but which
 * rows lie *between* them is resolved against the processed row model at read time,
 * so a re-sort changes which cells the range covers. That is the deliberate reading
 * of "the block the user dragged out", and it is the half AG Grid's coordinate-based
 * `CellRange` gets wrong in the other direction (it survives a scroll but not a
 * sort, because its endpoints are positions rather than records). ARCH-269 and
 * ARCH-270 inherit this reading.
 */
export interface NgeHighlightRange {
  /** Where the user started. Resolved through the processed row model. */
  anchorRowId: string;
  /** Every column the block spans, in no particular order. */
  columnIds: string[];
  /** Where the user shift-clicked. May sort above or below the anchor. */
  focusRowId: string;
}

/**
 * The highlight slice of {@link NgeTableState}, owned by the host like every
 * other slice.
 *
 * Two collections rather than one, and the split is the epic's lock in code:
 * *enumerate only what the user picked one at a time*. A cell clicked on its own is
 * one short string; a block dragged or shift-clicked across is a descriptor. Both
 * are answered by {@link isNgeCellHighlighted} rather than by materialising either
 * into the other.
 *
 * Plain JSON by construction — strings, arrays, and plain objects — so it inherits
 * the persistability promise `NgeTableState` makes and a spec asserts.
 */
export interface NgeHighlightState {
  /**
   * The cell a shift-click extends from, or `null`.
   *
   * State rather than a field on the feature because it has to survive being
   * persisted and restored with the rest of the view: a user who reloads mid-
   * selection and shift-clicks should extend from where they left off, not from
   * nowhere. It is also why the anchor is not simply "the last entry of `cells`" —
   * un-highlighting a cell removes it from `cells` without meaning the user
   * abandoned it as an anchor.
   */
  anchor: NgeHighlightCellKey | null;
  /** Individually-picked cells. Enumerated, because the user enumerated them. */
  cells: NgeHighlightCellKey[];
  /**
   * Individually-*removed* cells. Beats {@link ranges}.
   *
   * The counterpart to `cells`, and what makes a click a genuine toggle rather than
   * one that only works on cells the user picked one at a time. Clicking a cell that
   * a range covers has to be able to un-highlight it — and a rectangle minus a cell
   * is not a rectangle, so the block cannot simply be reshaped. Subtracting instead
   * keeps the descriptor intact and records the hole.
   *
   * Enumerated for the same reason `cells` is, and it is the same bounded cost: a
   * user removes cells one at a time, so this grows by one per gesture. Nothing ever
   * materialises a range into it.
   */
  exclusions: NgeHighlightCellKey[];
  /**
   * Contiguous blocks.
   *
   * An array even though shift-click maintains exactly one today, so ARCH-269 can
   * add additive multi-range selection without migrating a persisted state shape.
   */
  ranges: NgeHighlightRange[];
}

/** The key one cell is stored under. */
export function ngeHighlightCellKey(rowId: string, columnId: string): NgeHighlightCellKey {
  return `${rowId}${NGE_HIGHLIGHT_KEY_SEPARATOR}${columnId}`;
}

/**
 * Split a cell key back into its parts.
 *
 * Splits on the **last** separator, not the first. A row id is the consumer's own
 * `getRowId(row)` output and may contain anything; a column id is an identifier the
 * consumer wrote in a `NgeTableColumn`, and cannot contain the separator without
 * the key being ambiguous in the first place. So the right-hand side is the
 * trustworthy end to anchor on.
 */
export function parseNgeHighlightCellKey(key: NgeHighlightCellKey): {
  columnId: string;
  rowId: string;
} {
  const at = key.lastIndexOf(NGE_HIGHLIGHT_KEY_SEPARATOR);

  return at === -1
    ? { columnId: '', rowId: key }
    : {
        columnId: key.slice(at + NGE_HIGHLIGHT_KEY_SEPARATOR.length),
        rowId: key.slice(0, at),
      };
}

/** A fresh, empty highlight slice, optionally seeded. */
export function createNgeHighlightState(
  overrides: Partial<NgeHighlightState> = {}
): NgeHighlightState {
  return { anchor: null, cells: [], exclusions: [], ranges: [], ...overrides };
}

/**
 * Fill in a slice the host has not written yet.
 *
 * ⚠️ **Every entry point must go through this.** `createNgeTableState()` cannot
 * know about an addon's slice, so a host handing in a perfectly valid state leaves
 * `ngeHighlight` `undefined` until the first write — and the feature's updaters
 * are handed exactly that. Assuming `getInitialState` seeded it is the bug that
 * only shows up against a host that built its state the documented way.
 */
export function normalizeNgeHighlightState(
  state: NgeHighlightState | undefined
): NgeHighlightState {
  return state ?? createNgeHighlightState();
}

/**
 * Row id → its position in the **processed** row model.
 *
 * What resolves a {@link NgeHighlightRange}'s endpoints into a span. Built from
 * the post-filter, post-sort rows, which is what makes a range mean the block the
 * user can currently see rather than a slice of the source array.
 */
export type NgeHighlightRowOrder = ReadonlyMap<string, number>;

/**
 * Whether one cell is highlighted — the seam's whole read path.
 *
 * A predicate rather than a lookup into a materialised set, which is what lets a
 * range stay a descriptor. Called once per rendered cell, so it is deliberately
 * cheap in the common case: an empty slice answers on two length checks, and the
 * enumerated set is consulted before any range arithmetic runs.
 *
 * A range whose endpoints are not both in `rowOrder` matches nothing. That is the
 * honest answer rather than a guess — a filter that hides an endpoint has removed
 * the block's boundary, and inventing one would highlight rows the user never
 * dragged across.
 */
export function isNgeCellHighlighted(
  state: NgeHighlightState,
  rowId: string,
  columnId: string,
  rowOrder: NgeHighlightRowOrder
): boolean {
  const key = ngeHighlightCellKey(rowId, columnId);

  // Exclusions are checked first and win outright — a cell the user explicitly
  // removed stays removed even though the block around it is still described.
  if (state.exclusions.length > 0 && state.exclusions.includes(key)) {
    return false;
  }

  if (state.cells.length > 0 && state.cells.includes(key)) {
    return true;
  }

  return isCoveredByNgeHighlightRange(state, rowId, columnId, rowOrder);
}

/**
 * Whether a **range** covers a cell, ignoring `cells` and `exclusions`.
 *
 * Split out because a toggle needs to ask a different question from a render: the
 * renderer wants "is this cell highlighted", while the toggle wants "if I drop this
 * from `cells`, will a block still be holding it up?" — which is what decides
 * whether an exclusion has to be recorded.
 */
export function isCoveredByNgeHighlightRange(
  state: NgeHighlightState,
  rowId: string,
  columnId: string,
  rowOrder: NgeHighlightRowOrder
): boolean {
  if (state.ranges.length === 0) {
    return false;
  }

  const index = rowOrder.get(rowId);

  if (index === undefined) {
    return false;
  }

  return state.ranges.some(range => {
    if (!range.columnIds.includes(columnId)) {
      return false;
    }

    const anchor = rowOrder.get(range.anchorRowId);
    const focus = rowOrder.get(range.focusRowId);

    if (anchor === undefined || focus === undefined) {
      return false;
    }

    return index >= Math.min(anchor, focus) && index <= Math.max(anchor, focus);
  });
}

/**
 * Add or remove one individually-picked cell, and make it the anchor.
 *
 * Toggling always re-anchors, including when it un-highlights: the user's last
 * interaction is where a subsequent shift-click should reach from, whichever way
 * that interaction went.
 */
export function toggleNgeHighlightCell(
  state: NgeHighlightState,
  rowId: string,
  columnId: string,
  rowOrder: NgeHighlightRowOrder
): NgeHighlightState {
  const key = ngeHighlightCellKey(rowId, columnId);

  // ⚠️ Toggles the cell's EFFECTIVE state, not just its membership of `cells`.
  // Testing `cells.includes(key)` alone is the obvious version and it is a dead end:
  // clicking a cell a range covers would add a duplicate entry that changes nothing
  // on screen, and clicking it again would remove that entry and leave the cell lit
  // by the range — so a range-covered cell could never be un-highlighted at all.
  if (isNgeCellHighlighted(state, rowId, columnId, rowOrder)) {
    const cells = state.cells.filter(entry => entry !== key);

    return {
      ...state,
      anchor: key,
      cells,
      // An exclusion is only needed when a block would otherwise keep the cell lit.
      // Recording one unconditionally would leave the slice full of entries that
      // subtract from nothing, and each of those would have to survive persistence.
      exclusions: isCoveredByNgeHighlightRange({ ...state, cells }, rowId, columnId, rowOrder)
        ? [...state.exclusions, key]
        : state.exclusions,
    };
  }

  const wasExcluded = state.exclusions.includes(key);

  return {
    ...state,
    anchor: key,
    // Re-including an excluded cell is enough on its own: the block that was already
    // describing it takes over again. Adding it to `cells` as well would leave the
    // slice holding the same fact twice.
    cells: wasExcluded ? state.cells : [...state.cells, key],
    exclusions: wasExcluded ? state.exclusions.filter(entry => entry !== key) : state.exclusions,
  };
}

/**
 * Extend the highlight from the anchor to one cell, as a descriptor.
 *
 * Replaces the block rather than appending, so dragging the focus around re-shapes
 * one selection instead of leaving a trail — the behaviour a spreadsheet has. The
 * anchor deliberately does **not** move: shift-clicking twice from the same origin
 * is how a user corrects an over-shoot.
 *
 * With no anchor set this is a no-op, which is what a shift-click on a table nobody
 * has clicked yet should do.
 */
export function extendNgeHighlightToCell(
  state: NgeHighlightState,
  rowId: string,
  columnIds: string[]
): NgeHighlightState {
  if (!state.anchor) {
    return state;
  }

  const { rowId: anchorRowId } = parseNgeHighlightCellKey(state.anchor);
  const next: NgeHighlightRange = { anchorRowId, columnIds, focusRowId: rowId };

  // Shift-clicking the same focus twice takes the block back off, which is what
  // makes the gesture its own undo. Without it a mis-aimed shift-click could only be
  // corrected by aiming again — there was no way to end up with no block at all.
  if (state.ranges.some(range => isSameNgeHighlightRange(range, next))) {
    const ranges = state.ranges.filter(range => !isSameNgeHighlightRange(range, next));

    return {
      ...state,
      // Exclusions only ever subtract from a block, so once no block remains they
      // would silently suppress a later re-selection of the same cells. Gated on
      // there being none left rather than cleared outright: ARCH-269 brings multiple
      // ranges, and an exclusion belonging to a block that survived must survive too.
      exclusions: ranges.length === 0 ? [] : state.exclusions,
      ranges,
    };
  }

  return { ...state, ranges: [next] };
}

/** Two descriptors describing the same block. Column order is not significant. */
export function isSameNgeHighlightRange(a: NgeHighlightRange, b: NgeHighlightRange): boolean {
  return (
    a.anchorRowId === b.anchorRowId &&
    a.focusRowId === b.focusRowId &&
    a.columnIds.length === b.columnIds.length &&
    a.columnIds.every(id => b.columnIds.includes(id))
  );
}

/**
 * Drop everything — every mark **and** the anchor.
 *
 * The anchor goes deliberately. Keeping it would leave a subsequent shift-click
 * extending from a cell the user can no longer see, which is a worse surprise than
 * losing an origin they just asked to throw away; the next plain click re-anchors
 * anyway. Returns the **same reference** when there is nothing to clear, so a
 * consumer wiring this to a key can call it freely without churning state.
 */
export function clearNgeHighlight(state: NgeHighlightState): NgeHighlightState {
  return hasNgeHighlight(state) ? createNgeHighlightState() : state;
}

/**
 * Whether anything is currently marked.
 *
 * Deliberately ignores the anchor: an anchor is where the *next* gesture would
 * start, not something the user can see, so a table whose only state is an anchor
 * has nothing to clear. That distinction is what lets an `Escape` handler stay out
 * of the way — it must not swallow the key from a dialog when the table has nothing
 * to give up.
 */
export function hasNgeHighlight(state: NgeHighlightState): boolean {
  return state.cells.length > 0 || state.ranges.length > 0 || state.exclusions.length > 0;
}
