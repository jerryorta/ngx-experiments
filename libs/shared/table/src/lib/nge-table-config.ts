import type { NgeTableColumn } from './nge-table-column';

import { NGE_TABLE_DEFAULTS } from './nge-table-defaults';

/**
 * Everything a consumer hands `<nge-table>` that is **not** interaction state.
 *
 * The split is the point. Config is what the table *is* — its rows, its columns,
 * its geometry, which capabilities are switched on. {@link NgeTableState} is what
 * the user has *done* to it. Config is owned by the component that renders the
 * table; state is owned by whoever wants to persist or drive it. Collapsing the
 * two is how tables end up unable to restore a saved view.
 *
 * This type is also the facade that keeps `@tanstack/*` out of consumer imports.
 * A consumer sees `NgeTableConfig` and `NgeTableColumn`; the engine underneath
 * can move to v9 without a single application file changing.
 *
 * @typeParam TRow - The shape of one row of data.
 */
export interface NgeTableConfig<TRow> {
  /** Width a column takes when its definition supplies none. */
  columnDefaultWidth?: number;

  /** Widest a column may be dragged (ARCH-244). */
  columnMaxWidth?: number;

  /** Narrowest a column may be dragged (ARCH-244). */
  columnMinWidth?: number;

  /** Column definitions, in their natural order. Every column needs an explicit `id`. */
  columns: NgeTableColumn<TRow>[];

  /** The rows to render. */
  data: TRow[];

  /**
   * Lets the user drag a column edge to resize it (ARCH-244). Widths land in
   * `state.columnSizing`, so they persist with the rest of the view.
   */
  enableColumnResizing?: boolean;

  /** Lets columns be hidden. Visibility lands in `state.columnVisibility`. */
  enableHiding?: boolean;

  /** Allows more than one row to be selected at a time. */
  enableMultiRowSelection?: boolean;

  /** Lets columns be frozen to an edge (ARCH-243). Pinning lands in `state.columnPinning`. */
  enablePinning?: boolean;

  /**
   * Lets rows be expanded to reveal a `row-detail` band (ARCH-298). Expansion
   * lands in `state.expanded`, so it persists with the rest of the view.
   *
   * Switching it on injects a leading disclosure column; what the band *contains*
   * is a `row-detail` template the consumer projects, and a table with the flag on
   * and no such template expands to an empty band.
   *
   * A **predicate** instead of `true` makes expandability per-row, exactly as
   * {@link NgeTableConfig.enableRowSelection} does: rows it rejects render a
   * disabled control rather than none, because a control that silently vanishes
   * reads as a rendering bug where a disabled one reads as a rule. It receives the
   * row datum, never an engine row.
   *
   * ⚠️ **Not tree data.** This reveals a detail band beneath a row; it does not
   * flatten sub-rows into the visible row model. Hierarchical rows are their own
   * story and bring `getSubRows` and `row.depth` with them.
   *
   * ⚠️ Requires {@link NgeTableConfig.getRowId}, and fails loudly in dev without
   * one — `state.expanded` is keyed by row id, so an array-index key would move the
   * user's opened rows onto different records after a sort or a re-fetch.
   */
  enableRowExpansion?: ((row: TRow) => boolean) | boolean;

  /**
   * Lets rows be selected. Selection lands in `state.rowSelection`.
   *
   * A **predicate** instead of `true` makes selectability per-row: rows it rejects
   * render a disabled control rather than none, because a control that silently
   * vanishes reads as a rendering bug where a disabled one reads as a rule. The
   * answer also reaches a projected `selection-cell` template as `canSelect`.
   *
   * It receives the row datum, never an engine row — that insulation is why the
   * library adapts it rather than handing it straight to TanStack.
   */
  enableRowSelection?: ((row: TRow) => boolean) | boolean;

  /** Lets a header click cycle the sort. Sorting lands in `state.sorting`. */
  enableSorting?: boolean;

  /**
   * Paints alternate rows on `--nge-table-row-surface-alt`, so the eye can
   * follow one record across a table wider than it is tall.
   *
   * Off by default: a stripe is a strong thing to impose on a table that may
   * already be carrying marks of its own. It never competes with one — striping
   * changes only the surface a row resolves to, so hover, selection, ranges,
   * highlighting and the fill region all read on an alternate row exactly as they
   * do on a plain one.
   *
   * Carries no state and is not persisted: parity is the row's position in the
   * processed row model, never a field on the datum.
   */
  enableStriping?: boolean;

  /**
   * Renders only the rows near the viewport instead of all of them (ARCH-245).
   *
   * Switch it on for the thousands-of-rows case; leave it off for a table whose
   * rows all fit. Off by default because it changes what the table *is* rather
   * than what it can do: rows become absolutely positioned, and their geometry is
   * arithmetic from {@link rowHeight} rather than whatever the browser laid out.
   * That trade is worth making when the alternative is ten thousand rows in the
   * DOM, and not worth making for twenty.
   *
   * Two consequences worth knowing before switching it on. The table needs a
   * bounded height — set `height` or `max-height` on `<nge-table>` itself, not on
   * a wrapper — because there is no window to compute without one. And the row
   * height is pinned to the resolved config value while this is on, so a theme
   * cannot move `--nge-table-row-height` out from under the arithmetic.
   */
  enableVirtualization?: boolean;

  /**
   * Stable identity for a row.
   *
   * Worth supplying whenever selection, expansion, or sizing state outlives the
   * data: without it the engine keys state by array index, so a re-fetch that
   * reorders rows silently moves the user's selection onto different records.
   */
  getRowId?: (row: TRow, index: number) => string;

  /** Height of the header band, in pixels. */
  headerHeight?: number;

  /**
   * Height of an expanded row's `row-detail` band, in pixels (ARCH-298).
   *
   * ⚠️ **Declared rather than measured, and that is the trade this feature makes.**
   * Virtualization depends on every row's size being *computable* before it is
   * rendered — so an expanded row is sized `rowHeight + rowDetailHeight` and the
   * rows beneath it move down by exactly that much. Measuring the band instead
   * would make row height variable, which is a different and much larger feature.
   *
   * The cost is a number a consumer has to keep true: a band whose content is
   * taller than this scrolls inside itself while virtualization is on, and grows
   * past it while virtualization is off (where nothing is positioned by
   * arithmetic, so nothing can be overlapped).
   */
  rowDetailHeight?: number;

  /**
   * Height of a single data row, in pixels.
   *
   * Presentation while {@link enableVirtualization} is off; load-bearing once it
   * is on, because a windowed row is positioned at `index × rowHeight` rather
   * than laid out.
   */
  rowHeight?: number;

  /**
   * How many rows to render beyond each edge of the window (ARCH-245).
   *
   * The buffer that decides whether a fast scroll shows rows or shows blank: too
   * few and the user out-scrolls the render, too many and the saving that
   * justified virtualizing shrinks. Left undefined here rather than defaulted
   * alongside the geometry, because unlike row height it has no
   * `--nge-table-*` counterpart to stay in step with — the library's own value
   * applies and is the only place to change it.
   */
  virtualOverscan?: number;
}

/**
 * Build a {@link NgeTableConfig} with the library defaults filled in.
 *
 * Mirrors the charts preset idiom: hand-authoring the interface is perfectly
 * valid, and `<nge-table>` defaults every optional field anyway — this exists so
 * a consumer that wants a fully-resolved, inspectable config (to diff it, log it,
 * or persist it) gets one without restating `NGE_TABLE_DEFAULTS`.
 *
 * The `Nge` prefix is carried here because a bare `createTableConfig` would be
 * indistinguishable from any other table library's.
 */
export function createNgeTableConfig<TRow>(options: NgeTableConfig<TRow>): NgeTableConfig<TRow> {
  return {
    columnDefaultWidth: NGE_TABLE_DEFAULTS.columnDefaultWidth,
    columnMaxWidth: NGE_TABLE_DEFAULTS.columnMaxWidth,
    columnMinWidth: NGE_TABLE_DEFAULTS.columnMinWidth,
    enableColumnResizing: false,
    enableHiding: true,
    enableMultiRowSelection: true,
    enablePinning: false,
    enableRowExpansion: false,
    enableRowSelection: false,
    enableSorting: true,
    enableStriping: false,
    enableVirtualization: false,
    headerHeight: NGE_TABLE_DEFAULTS.headerHeight,
    rowDetailHeight: NGE_TABLE_DEFAULTS.rowDetailHeight,
    rowHeight: NGE_TABLE_DEFAULTS.rowHeight,
    ...options,
  };
}
