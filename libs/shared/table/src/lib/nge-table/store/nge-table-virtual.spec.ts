import type { Row } from '@tanstack/angular-table';
import type { VirtualItem } from '@tanstack/angular-virtual';

import {
  NGE_TABLE_DEFAULT_OVERSCAN,
  toNgeTableRenderedRows,
  toNgeTableVirtualRows,
} from './nge-table-virtual';

/** Only `id` is read here, so a stand-in keeps the arithmetic in view. */
function row(id: string): Row<unknown> {
  return { id } as Row<unknown>;
}

/**
 * A window item as the virtualizer reports it — `start` already carries the
 * scroll margin, which is exactly the detail these functions exist to undo.
 */
function item(index: number, start: number): VirtualItem {
  return { end: start + 40, index, key: `row-${index}`, lane: 0, size: 40, start };
}

const rows = [row('a'), row('b'), row('c'), row('d')];

describe('NGE_TABLE_DEFAULT_OVERSCAN', () => {
  // Zero would render exactly the visible rows, so any scroll at all outruns the
  // render. A large number quietly gives back the saving virtualizing bought.
  it('buffers a usable number of rows without undoing the point of windowing', () => {
    expect(NGE_TABLE_DEFAULT_OVERSCAN).toBeGreaterThan(0);
    expect(NGE_TABLE_DEFAULT_OVERSCAN).toBeLessThan(25);
  });
});

describe('toNgeTableRenderedRows', () => {
  it('renders every row in normal flow', () => {
    const rendered = toNgeTableRenderedRows(rows, 1);

    expect(rendered).toHaveLength(rows.length);
    expect(rendered.map(entry => entry.row.id)).toEqual(['a', 'b', 'c', 'd']);
  });

  // `null` rather than `0`: the template binds `top` unconditionally and Angular
  // removes the property on `null`, which is what leaves the un-virtualized table
  // in normal flow without the markup branching on it.
  it('leaves every row unpositioned', () => {
    expect(toNgeTableRenderedRows(rows, 1).every(entry => entry.top === null)).toBe(true);
  });

  it('numbers rows after the header rows', () => {
    expect(toNgeTableRenderedRows(rows, 2).map(entry => entry.ariaRowIndex)).toEqual([3, 4, 5, 6]);
  });

  it('renders nothing for no rows', () => {
    expect(toNgeTableRenderedRows([], 1)).toEqual([]);
  });
});

describe('toNgeTableVirtualRows', () => {
  it('renders only the rows inside the window', () => {
    const rendered = toNgeTableVirtualRows(rows, 1, [item(1, 84), item(2, 124)], 44);

    expect(rendered.map(entry => entry.row.id)).toEqual(['b', 'c']);
  });

  // The header shares the body's scroll viewport, so the virtualizer is told the
  // rows start a header's height down (`scrollMargin`) and folds that into every
  // `start`. The rows are positioned inside the body, which already sits below
  // the header — so the margin comes back off, or every row would be a header's
  // height too low.
  it('positions rows relative to the body, not the viewport', () => {
    const rendered = toNgeTableVirtualRows(rows, 1, [item(0, 44), item(1, 84)], 44);

    expect(rendered.map(entry => entry.top)).toEqual([0, 40]);
  });

  it('numbers rows by their index in the whole dataset, not their place in the window', () => {
    const rendered = toNgeTableVirtualRows(rows, 1, [item(2, 124), item(3, 164)], 44);

    expect(rendered.map(entry => entry.ariaRowIndex)).toEqual([4, 5]);
  });

  // The window is recomputed after render, so a shrinking dataset can be read one
  // frame before the virtualizer catches up. A stale index has to be skipped, not
  // dereferenced.
  it('skips window entries whose row the model no longer holds', () => {
    const rendered = toNgeTableVirtualRows(rows, 1, [item(3, 164), item(9, 404)], 44);

    expect(rendered.map(entry => entry.row.id)).toEqual(['d']);
  });

  it('renders nothing for an empty window', () => {
    expect(toNgeTableVirtualRows(rows, 1, [], 44)).toEqual([]);
  });
});

describe('zebra parity', () => {
  it('alternates by position in the row model', () => {
    expect(toNgeTableRenderedRows(rows, 1).map(entry => entry.isAlternate)).toEqual([
      false,
      true,
      false,
      true,
    ]);
  });

  // The trap this whole field exists to avoid. The DOM holds a recycled window,
  // so a row's position among its rendered siblings changes as the window
  // slides — a `:nth-child` stripe would follow that, and every stripe would
  // crawl a row at a time under the user's scroll while the rows moved through
  // them. Row `b` is the second rendered sibling in one window and the first in
  // the other, and it has to keep its stripe across the move.
  it('keeps a row on the same stripe as the window slides past it', () => {
    const firstWindow = toNgeTableVirtualRows(rows, 1, [item(0, 44), item(1, 84)], 44);
    const secondWindow = toNgeTableVirtualRows(rows, 1, [item(1, 84), item(2, 124)], 44);

    expect(firstWindow[1].row.id).toBe('b');
    expect(secondWindow[0].row.id).toBe('b');
    expect(firstWindow[1].isAlternate).toBe(true);
    expect(secondWindow[0].isAlternate).toBe(true);
  });

  // A window opening on an odd model index starts on a striped row; one opening
  // on an even index does not. Parity taken from the window's own offset would
  // start both the same way.
  it('reads parity from the row model rather than the window offset', () => {
    expect(toNgeTableVirtualRows(rows, 1, [item(1, 84)], 44)[0].isAlternate).toBe(true);
    expect(toNgeTableVirtualRows(rows, 1, [item(2, 124)], 44)[0].isAlternate).toBe(false);
  });

  it('gives a row the same stripe whether or not the window is on', () => {
    const everyRow = toNgeTableRenderedRows(rows, 1);
    const windowed = toNgeTableVirtualRows(rows, 1, [item(1, 84), item(2, 124)], 44);

    expect(windowed.map(entry => entry.isAlternate)).toEqual([
      everyRow[1].isAlternate,
      everyRow[2].isAlternate,
    ]);
  });
});
