import type { Row } from '@tanstack/angular-table';
import type { VirtualItem } from '@tanstack/angular-virtual';

/**
 * How many rows are rendered beyond each edge of the window when a consumer
 * supplies no `virtualOverscan`.
 *
 * A buffer, and the number decides which way it fails: too small and a fast
 * scroll outruns the render, showing blank where rows should be; too large and
 * the saving that justified virtualizing at all starts shrinking. Six rows is
 * roughly a third of a screen at the default 40px row height — enough to cover a
 * flick, cheap enough not to matter.
 *
 * A plain constant rather than an entry in `NGE_TABLE_DEFAULTS`, because that
 * object is specifically the geometry mirrored into `_table-tokens.scss` and
 * asserted for parity against it. Overscan has no `--nge-table-*` counterpart —
 * it is not a length the browser ever sees.
 */
export const NGE_TABLE_DEFAULT_OVERSCAN = 6;

/**
 * One row on its way to the DOM: the row itself, where to put it, and what to
 * call it.
 *
 * The same shape whether or not virtualization is on, which is the point. The
 * template renders one row loop and binds `top` unconditionally; Angular drops
 * the property when it is `null`, so the un-virtualized table lays out in normal
 * flow with no branch anywhere in the markup. Turning virtualization on changes
 * what this array *contains*, never how the template reads it.
 */
export interface NgeTableRenderedRow {
  /**
   * The row's 1-based position in the whole grid, header rows included.
   *
   * Only matters once virtualization is on, and then it matters a lot: the rows
   * an assistive technology can see are a window onto ten thousand, so without
   * `aria-rowindex` the grid announces row 4 of 10,000 as row 4 of 27. Present
   * unconditionally so the announcement does not change with the flag.
   */
  ariaRowIndex: number;
  /**
   * Whether this row takes the alternate zebra surface (ARCH-286).
   *
   * Parity is the row's position in the **processed** row model, and no other
   * position works. `:nth-child` reads the DOM, which under virtualization holds
   * a recycled window — it would stripe screen position, so every stripe would
   * crawl a row at a time as the user scrolled. TanStack's `row.index` is the
   * position in `config.data` and is copied through the sorted row model
   * unchanged, so it would scramble the stripes the moment a column was sorted.
   * The position used here is the one the window itself is built from, which is
   * the only one stable under both.
   */
  isAlternate: boolean;
  row: Row<unknown>;
  /** Offset within the body, in pixels — or `null` when the row is in normal flow. */
  top: null | number;
}

/**
 * Every row, in normal flow — the un-virtualized path.
 */
export function toNgeTableRenderedRows(
  rows: readonly Row<unknown>[],
  headerRowCount: number
): NgeTableRenderedRow[] {
  return rows.map((row, index) => ({
    ariaRowIndex: headerRowCount + index + 1,
    isAlternate: index % 2 === 1,
    row,
    top: null,
  }));
}

/**
 * The rows inside the current window, each positioned with a `top` offset.
 *
 * **`scrollMargin` is subtracted, and that subtraction is the whole trick.** The
 * header shares one scroll viewport with the body (ARCH-243), so the rows begin a
 * header's height down the scrollable content and the virtualizer is told as much
 * — otherwise its window sits that far too low and leaves a blank strip under the
 * header mid-scroll. TanStack folds the margin into every measurement's `start`
 * (`../open-source/table` sibling `virtual-core/src/index.ts:1248`) while leaving
 * it out of `getTotalSize()` (`:1882`), so `start` is an offset within the
 * *viewport* and `start - scrollMargin` is the offset within the *body*, which is
 * what the row is positioned inside.
 *
 * Rows the current row model no longer holds are skipped rather than trusted: the
 * virtualizer's window is recomputed after render, so a data change can be read
 * one frame before the window catches up, and an index past the end would
 * otherwise be a crash rather than a missing row.
 */
export function toNgeTableVirtualRows(
  rows: readonly Row<unknown>[],
  headerRowCount: number,
  items: readonly VirtualItem[],
  scrollMargin: number
): NgeTableRenderedRow[] {
  const rendered: NgeTableRenderedRow[] = [];

  for (const item of items) {
    const row = rows[item.index];

    if (row) {
      rendered.push({
        ariaRowIndex: headerRowCount + item.index + 1,
        isAlternate: item.index % 2 === 1,
        row,
        top: item.start - scrollMargin,
      });
    }
  }

  return rendered;
}
