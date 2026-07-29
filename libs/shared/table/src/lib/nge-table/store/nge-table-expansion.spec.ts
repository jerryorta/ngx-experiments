import { NGE_TABLE_DEFAULTS } from '../../nge-table-defaults';
import {
  createNgeExpansionColumn,
  NGE_TABLE_EXPANSION_COLUMN_ID,
  ngeRowDetailOffset,
  hasNgeExpandedRows,
  isNgeRowIdExpanded,
} from './nge-table-expansion';

describe('createNgeExpansionColumn', () => {
  it('is a display column under the namespaced id', () => {
    const column = createNgeExpansionColumn();

    expect(column.id).toBe(NGE_TABLE_EXPANSION_COLUMN_ID);
    expect(NGE_TABLE_EXPANSION_COLUMN_ID.startsWith('nge-table-')).toBe(true);
    // No accessor of any kind — what it renders is not data.
    expect(column).not.toHaveProperty('accessorKey');
    expect(column).not.toHaveProperty('accessorFn');
  });

  it('withholds sorting, resizing, and hiding', () => {
    expect(createNgeExpansionColumn()).toMatchObject({
      enableHiding: false,
      enableResizing: false,
      enableSorting: false,
    });
  });

  // The engine clamps inside `column.getSize()`, so equal bounds fix the width at
  // the level the RENDERER reads rather than only at the level of the affordance.
  it('pins its width at the level the renderer reads', () => {
    const { maxSize, minSize, size } = createNgeExpansionColumn();

    expect(size).toBe(NGE_TABLE_DEFAULTS.expansionColumnWidth);
    expect(minSize).toBe(size);
    expect(maxSize).toBe(size);
  });

  it('carries an empty header, so the expand-all control is not announced twice', () => {
    expect(createNgeExpansionColumn().header).toBe('');
  });
});

describe('isNgeRowIdExpanded', () => {
  it('reads a per-row map', () => {
    expect(isNgeRowIdExpanded({ 'row-1': true }, 'row-1')).toBe(true);
    expect(isNgeRowIdExpanded({ 'row-1': true }, 'row-2')).toBe(false);
  });

  // ⚠️ The whole reason this function exists rather than an inline lookup. A cast
  // to `Record` compiles and then answers `false` for every row of an expand-all.
  it('reads the true shorthand as every row', () => {
    expect(isNgeRowIdExpanded(true, 'row-1')).toBe(true);
    expect(isNgeRowIdExpanded(true, 'anything-at-all')).toBe(true);
  });

  // The engine deselects with `delete`, and so does this library — but a host
  // restoring a persisted view may well hand back an explicit `false`.
  it('treats an explicitly false entry as closed', () => {
    expect(isNgeRowIdExpanded({ 'row-1': false }, 'row-1')).toBe(false);
  });
});

describe('hasNgeExpandedRows', () => {
  it.each([
    [{}, false],
    [{ 'row-1': false }, false],
    [{ 'row-1': true }, true],
  ] as const)('answers %j with %s', (expanded, result) => {
    expect(hasNgeExpandedRows(expanded)).toBe(result);
  });

  it('answers the true shorthand without walking anything', () => {
    expect(hasNgeExpandedRows(true)).toBe(true);
  });
});

describe('ngeRowDetailOffset', () => {
  // The arithmetic the virtualizer is handed: an expanded row is exactly one
  // detail band taller, so the rows beneath it move down by that much rather than
  // being overlapped by it.
  it('adds the band height for an expanded row and nothing for a closed one', () => {
    expect(ngeRowDetailOffset({ 'row-1': true }, 'row-1', 120)).toBe(120);
    expect(ngeRowDetailOffset({ 'row-1': true }, 'row-2', 120)).toBe(0);
  });

  it('adds the band height to every row under the true shorthand', () => {
    expect(ngeRowDetailOffset(true, 'row-1', 96)).toBe(96);
    expect(ngeRowDetailOffset(true, 'row-9999', 96)).toBe(96);
  });

  // A row the virtualizer asks about before the row model has caught up has no id
  // to look up; the honest answer is the plain row height, not a crash.
  it('answers zero for a row it cannot identify', () => {
    expect(ngeRowDetailOffset({ 'row-1': true }, '', 120)).toBe(0);
  });
});
