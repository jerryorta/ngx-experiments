import type { NgeTableResizeStart } from './nge-table-resize';

import { NGE_TABLE_DEFAULTS } from '../../nge-table-defaults';
import { clampColumnWidth, resizeColumnSizing } from './nge-table-resize';

const { columnMaxWidth, columnMinWidth } = NGE_TABLE_DEFAULTS;

/** A drag grabbed at x=500 on a single 160px column with the default bounds. */
function singleColumnStart(overrides: Partial<NgeTableResizeStart> = {}): NgeTableResizeStart {
  return {
    boundsById: { name: { max: columnMaxWidth, min: columnMinWidth } },
    columnId: 'name',
    leafSizes: [['name', 160]],
    pointerId: 1,
    startSize: 160,
    startX: 500,
    ...overrides,
  };
}

describe('clampColumnWidth', () => {
  const bounds = { max: 300, min: 80 };

  it.each([
    [200, 200],
    [40, 80],
    [900, 300],
    [80, 80],
    [300, 300],
  ])('holds %p inside the bounds as %p', (width, expected) => {
    expect(clampColumnWidth(width, bounds)).toBe(expected);
  });

  // A column the engine does not know about should still never go negative —
  // a negative width is not a narrow column, it is a broken layout.
  it('floors an unbounded column at zero', () => {
    expect(clampColumnWidth(-40, undefined)).toBe(0);
    expect(clampColumnWidth(240, undefined)).toBe(240);
  });
});

describe('resizeColumnSizing', () => {
  it('widens a column by the pointer travel', () => {
    expect(resizeColumnSizing(singleColumnStart(), 560)).toEqual({ name: 220 });
  });

  it('narrows a column when the pointer travels left', () => {
    expect(resizeColumnSizing(singleColumnStart(), 440)).toEqual({ name: 100 });
  });

  it('returns the starting width when the pointer has not moved', () => {
    expect(resizeColumnSizing(singleColumnStart(), 500)).toEqual({ name: 160 });
  });

  // The clamp lives on the write, not only on the read: the engine's own
  // `getSize()` would render these correctly while leaving the raw numbers in
  // the state a consumer persists.
  it('clamps at the minimum however far left the pointer goes', () => {
    expect(resizeColumnSizing(singleColumnStart(), 0)).toEqual({ name: columnMinWidth });
    expect(resizeColumnSizing(singleColumnStart(), -5000)).toEqual({ name: columnMinWidth });
  });

  it('clamps at the maximum however far right the pointer goes', () => {
    expect(resizeColumnSizing(singleColumnStart(), 50_000)).toEqual({ name: columnMaxWidth });
  });

  it('honours a per-column bound tighter than the library default', () => {
    const start = singleColumnStart({ boundsById: { name: { max: 200, min: 120 } } });

    expect(resizeColumnSizing(start, 800)).toEqual({ name: 200 });
    expect(resizeColumnSizing(start, 300)).toEqual({ name: 120 });
  });

  // Only a group can land on a fraction — a single column's share of the travel
  // is the whole of it, so its widths are already integral.
  it('rounds to whole pixels so a persisted width stays readable', () => {
    const start = singleColumnStart({
      boundsById: {
        amount: { max: columnMaxWidth, min: columnMinWidth },
        quantity: { max: columnMaxWidth, min: columnMinWidth },
      },
      leafSizes: [
        ['quantity', 100],
        ['amount', 301],
      ],
      startSize: 401,
    });

    // +10px over 401 is 2.49% — 102.49 and 308.51 before rounding.
    expect(resizeColumnSizing(start, 510)).toEqual({ amount: 309, quantity: 102 });
  });

  // A grouped header hands the drag to its leaves in proportion, so the columns
  // under it keep their relative widths instead of one absorbing the whole delta.
  describe('a grouped header', () => {
    const groupStart: NgeTableResizeStart = {
      boundsById: {
        amount: { max: columnMaxWidth, min: columnMinWidth },
        quantity: { max: columnMaxWidth, min: columnMinWidth },
      },
      columnId: 'figures',
      leafSizes: [
        ['quantity', 100],
        ['amount', 300],
      ],
      pointerId: 1,
      startSize: 400,
      startX: 500,
    };

    it('distributes the drag across its leaves in proportion', () => {
      // +200 on a 400px group is +50%, so each leaf grows by half its own width.
      expect(resizeColumnSizing(groupStart, 700)).toEqual({ amount: 450, quantity: 150 });
    });

    it('clamps each leaf against its own bounds, not the group total', () => {
      const bounded: NgeTableResizeStart = {
        ...groupStart,
        boundsById: {
          ...groupStart.boundsById,
          amount: { max: 320, min: columnMinWidth },
        },
      };

      expect(resizeColumnSizing(bounded, 700)).toEqual({ amount: 320, quantity: 150 });
    });
  });

  // Guards the one input that would otherwise produce Infinity or NaN and put a
  // non-numeric width into state.
  it('treats a zero-width header as a no-op rather than dividing by it', () => {
    const start = singleColumnStart({ leafSizes: [['name', 0]], startSize: 0 });

    expect(resizeColumnSizing(start, 900)).toEqual({ name: columnMinWidth });
  });
});
