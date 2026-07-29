import type { Column, ColumnDef } from '@tanstack/angular-table';

import {
  NGE_CELL_NEVER_EDITING,
  NGE_CELL_NO_EDIT,
  ngeColumnEdit,
  isNgeCellColumnEditable,
  isNgeColumnAlwaysLive,
  isNgeColumnEditable,
} from './nge-cell-edit';

type Row = { name: string };

const plain = { accessorKey: 'name', id: 'name' } as ColumnDef<Row, unknown>;

const editable = {
  accessorKey: 'name',
  id: 'name',
  meta: { ngeEdit: { enabled: true } },
} as ColumnDef<Row, unknown>;

const alwaysLive = {
  accessorKey: 'quantity',
  id: 'quantity',
  meta: { ngeEdit: { alwaysLive: true, enabled: true } },
} as ColumnDef<Row, unknown>;

describe('column readers', () => {
  it('reads the namespaced options a column declared', () => {
    expect(ngeColumnEdit(editable)).toEqual({ enabled: true });
    expect(ngeColumnEdit(plain)).toBeUndefined();
    expect(ngeColumnEdit(undefined)).toBeUndefined();
  });

  it('treats a column with no ngeEdit key as not editable', () => {
    expect(isNgeColumnEditable(plain)).toBe(false);
    expect(isNgeColumnEditable(undefined)).toBe(false);
    expect(isNgeColumnEditable(editable)).toBe(true);
  });

  // `enabled` is the switch and `alwaysLive` only says *when* the control appears, so
  // a column declaring the second without the first is still not editable. Otherwise
  // `alwaysLive: true` alone would be a second, undocumented way to opt in.
  it('requires enabled for always-live, not just the flag', () => {
    const orphan = { id: 'x', meta: { ngeEdit: { alwaysLive: true } } } as ColumnDef<Row, unknown>;

    expect(isNgeColumnAlwaysLive(orphan)).toBe(false);
    expect(isNgeColumnEditable(orphan)).toBe(false);
    expect(isNgeColumnAlwaysLive(alwaysLive)).toBe(true);
    expect(isNgeColumnAlwaysLive(editable)).toBe(false);
  });

  it('answers the same question for a live engine column', () => {
    const column = { columnDef: editable } as unknown as Column<unknown, unknown>;

    expect(isNgeCellColumnEditable(column)).toBe(true);
    expect(
      isNgeCellColumnEditable({ columnDef: plain } as unknown as Column<unknown, unknown>)
    ).toBe(false);
  });
});

describe('NGE_CELL_NO_EDIT', () => {
  it('reads as never editing', () => {
    expect(NGE_CELL_NEVER_EDITING()).toBe(false);
    expect(NGE_CELL_NO_EDIT.forCell('row-1', 'name').isEditing()).toBe(false);
  });

  // ⚠️ **The allocation claim, pinned.** ARCH-289's budget must be unchanged by the
  // feature being available but unused, and this is what makes that structural: a
  // table with no editable column hands every cell the SAME frozen bundle, so there
  // is no per-cell allocation left to regress. Rebuilding it per call would put one
  // back on every non-editing table in the workspace and nothing else would notice.
  it('hands every cell one shared frozen bundle', () => {
    const first = NGE_CELL_NO_EDIT.forCell('row-1', 'name');
    const second = NGE_CELL_NO_EDIT.forCell('row-9999', 'amount');

    expect(first).toBe(second);
    expect(first.isEditing).toBe(NGE_CELL_NEVER_EDITING);
    expect(Object.isFrozen(first)).toBe(true);
  });

  it('has callbacks that do nothing rather than throw', () => {
    const members = NGE_CELL_NO_EDIT.forCell('row-1', 'name');

    expect(() => {
      members.beginEdit();
      members.commitEdit('anything');
      members.cancelEdit();
    }).not.toThrow();
  });
});
