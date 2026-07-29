import type { TemplateRef } from '@angular/core';
import type { Cell, Column, Header, Row } from '@tanstack/angular-table';

import { Component, input, signal } from '@angular/core';
import { FlexRenderComponent } from '@tanstack/angular-table';

import type { NgeCellContext, NgeCellTemplateContext, NgeTableSlotName } from '../../slots';
import type {
  NgeCellRegistration,
  NgeTableSlotRegistration,
  NgeTableSlotTemplate,
} from './nge-table-slot-registry';

import { NGE_CELL_NEVER_EDITING, NGE_CELL_NO_EDIT } from '../../edit';
import {
  NGE_CELL_ALWAYS_SETTLED,
  ngeTableSlotTemplateFor,
  toNgeCellContext,
  toNgeCellTemplateMap,
  toNgeEditorTemplateMap,
  toNgeHeaderContext,
  toNgeRowContext,
  toNgeTableContext,
  toNgeTableSlotRegistry,
} from './nge-table-slot-registry';

/**
 * A stand-in `TemplateRef`, identified by a label.
 *
 * The registry only ever stores and returns these — it never renders one — so a
 * labelled object proves identity more legibly than a real `TemplateRef` obtained
 * from a `TestBed`, and keeps every test here free of a component.
 */
function templateStub(label: string): TemplateRef<NgeCellTemplateContext<unknown>> {
  return { label } as unknown as TemplateRef<NgeCellTemplateContext<unknown>>;
}

function cellRegistration(columnId: string, label: string): NgeCellRegistration {
  return { ngeCell: () => columnId, template: templateStub(label) };
}

function slotRegistration(
  name: NgeTableSlotName,
  label: string,
  columnId?: string
): NgeTableSlotRegistration {
  return {
    ngeTableSlot: () => name,
    ngeTableSlotColumn: () => columnId,
    template: templateStub(label) as unknown as NgeTableSlotTemplate,
  };
}

/** Read a stub's label back, for assertions that care about *which* template landed. */
function labelOf(template: unknown): string | undefined {
  return (template as null | { label: string })?.label;
}

/**
 * The one argument a content thunk takes.
 *
 * A plain object rather than a built context: what the thunk does with it is
 * either "ignore it" (a projected template) or "hand it over as an input" (an
 * editor), and neither reads a field.
 */
function contextStub(rowId = 'row-1'): NgeCellContext<unknown> {
  return {
    beginEdit: () => undefined,
    cancelEdit: () => undefined,
    columnId: 'amount',
    commitEdit: () => undefined,
    isEditing: NGE_CELL_NEVER_EDITING,
    isSettled: NGE_CELL_ALWAYS_SETTLED,
    row: {},
    rowId,
    rowIndex: 0,
    value: 1,
  };
}

/**
 * A real component, because `flexRenderComponent` reflects the class it is given
 * and throws on anything that is not one — so a stub object cannot stand in here.
 */
@Component({
  selector: 'nge-test-editor',
  standalone: true,
  template: '',
})
class TestEditorComponent {
  readonly cell = input.required<NgeCellContext<unknown>>();
}

/** An engine column carrying whatever `ngeEdit` a test wants to declare. */
function editableColumn(
  id: string,
  editor?: typeof TestEditorComponent,
  editorInputs?: Record<string, unknown>
): Column<unknown, unknown> {
  return {
    columnDef: { meta: { ngeEdit: { editor, editorInputs, enabled: true } } },
    id,
  } as unknown as Column<unknown, unknown>;
}

describe('toNgeCellTemplateMap', () => {
  it('indexes each template by the column it names', () => {
    const map = toNgeCellTemplateMap([
      cellRegistration('amount', 'amount-template'),
      cellRegistration('status', 'status-template'),
    ]);

    expect(labelOf(map.get('amount')?.template)).toBe('amount-template');
    expect(labelOf(map.get('status')?.template)).toBe('status-template');
    expect(map.get('name')).toBeUndefined();
  });

  // Two templates for one column is a mistake either way; taking the later one is
  // what lets a wrapper component project a default that its own caller can
  // replace, since content order puts the caller's second.
  it('takes the last declaration when two name the same column', () => {
    const map = toNgeCellTemplateMap([
      cellRegistration('amount', 'first'),
      cellRegistration('amount', 'second'),
    ]);

    expect(map.size).toBe(1);
    expect(labelOf(map.get('amount')?.template)).toBe('second');
  });

  // The whole reason the thunk is built here rather than in the template.
  // `*flexRender` clears its view container whenever `content` changes identity,
  // so a thunk allocated per change-detection pass would destroy and rebuild every
  // custom cell on every cycle.
  it('pairs each template with a content thunk of stable identity', () => {
    const map = toNgeCellTemplateMap([cellRegistration('amount', 'amount-template')]);
    const entry = map.get('amount');

    expect(entry?.content).toBe(map.get('amount')?.content);
    expect(entry?.content(contextStub())).toBe(entry?.template);
  });

  it('produces an empty map when nothing is registered', () => {
    expect(toNgeCellTemplateMap([]).size).toBe(0);
  });
});

describe('toNgeEditorTemplateMap', () => {
  it('indexes each editor by the column that named it', () => {
    const map = toNgeEditorTemplateMap([
      editableColumn('amount', TestEditorComponent),
      editableColumn('status'),
    ]);

    expect(map.has('amount')).toBe(true);
    expect(map.has('status')).toBe(false);
  });

  it('renders the named component, with the cell context as its input', () => {
    const map = toNgeEditorTemplateMap([editableColumn('amount', TestEditorComponent)]);
    const context = contextStub();
    const content = map.get('amount')?.content(context);

    expect(content).toBeInstanceOf(FlexRenderComponent);
    expect((content as FlexRenderComponent<unknown>).component).toBe(TestEditorComponent);
    expect((content as FlexRenderComponent<unknown>).inputs).toEqual({ cell: context });
  });

  it('carries the extra inputs a column declared for its editor', () => {
    const map = toNgeEditorTemplateMap([
      editableColumn('quantity', TestEditorComponent, { label: 'Units', type: 'number' }),
    ]);
    const context = contextStub();
    const content = map.get('quantity')?.content(context) as FlexRenderComponent<unknown>;

    expect(content.inputs).toEqual({ cell: context, label: 'Units', type: 'number' });
  });

  // `cell` is written last for a reason: it is the one input every editor is defined
  // by, and a column that could displace it would produce a control with no cell.
  it('refuses to let a declared input displace the cell', () => {
    const map = toNgeEditorTemplateMap([
      editableColumn('quantity', TestEditorComponent, { cell: 'not a context' }),
    ]);
    const context = contextStub();
    const content = map.get('quantity')?.content(context) as FlexRenderComponent<unknown>;

    expect(content.inputs).toEqual({ cell: context });
  });

  // ⚠️ The half of the cost claim a spec can hold. `*flexRender` calls this thunk on
  // every change-detection pass of every rendered editable cell, and a fresh
  // `FlexRenderComponent` each time means a `reflectComponentType` per cell per pass
  // AND a changed memo key — the churn the context cache and the stable-thunk rule
  // both exist to avoid. This fails the day the `WeakMap` is dropped.
  it('reuses one rendered component per cell context', () => {
    const map = toNgeEditorTemplateMap([editableColumn('amount', TestEditorComponent)]);
    const content = map.get('amount')?.content;
    const context = contextStub();

    expect(content?.(context)).toBe(content?.(context));
    expect(content?.(context)).not.toBe(content?.(contextStub('row-2')));
  });

  // The thunk itself has to be stable for the same reason its sibling's is —
  // `*flexRender` clears its view container whenever `content` changes identity.
  it('pairs each editor with a content thunk of stable identity', () => {
    const map = toNgeEditorTemplateMap([editableColumn('amount', TestEditorComponent)]);

    expect(map.get('amount')?.content).toBe(map.get('amount')?.content);
  });

  it('carries no template, because no template produced it', () => {
    const map = toNgeEditorTemplateMap([editableColumn('amount', TestEditorComponent)]);

    expect(map.get('amount')?.template).toBeUndefined();
  });

  it('produces an empty map when no column named an editor', () => {
    expect(toNgeEditorTemplateMap([]).size).toBe(0);
  });
});

describe('toNgeTableSlotRegistry', () => {
  it('registers a template with no column as the slot-wide one', () => {
    const registry = toNgeTableSlotRegistry([slotRegistration('empty', 'empty-template')]);

    expect(labelOf(registry.get('empty')?.shared)).toBe('empty-template');
    expect(registry.get('empty')?.byColumn.size).toBe(0);
  });

  it('keeps a column-scoped template under its column', () => {
    const registry = toNgeTableSlotRegistry([
      slotRegistration('header-cell', 'amount-header', 'amount'),
    ]);

    expect(registry.get('header-cell')?.shared).toBeNull();
    expect(labelOf(registry.get('header-cell')?.byColumn.get('amount'))).toBe('amount-header');
  });

  it('carries a shared and a column-scoped template for one name side by side', () => {
    const registry = toNgeTableSlotRegistry([
      slotRegistration('header-cell', 'every-header'),
      slotRegistration('header-cell', 'amount-header', 'amount'),
    ]);

    expect(labelOf(registry.get('header-cell')?.shared)).toBe('every-header');
    expect(labelOf(registry.get('header-cell')?.byColumn.get('amount'))).toBe('amount-header');
  });

  // "A toolbar for the amount column" is a question with no answer. Registering it
  // as the shared template is better than dropping it into a bucket nothing reads,
  // which would show up as a slot that silently never renders.
  it('ignores a column named for a slot that is not addressed per column', () => {
    const registry = toNgeTableSlotRegistry([
      slotRegistration('toolbar', 'toolbar-template', 'amount'),
    ]);

    expect(labelOf(registry.get('toolbar')?.shared)).toBe('toolbar-template');
    expect(registry.get('toolbar')?.byColumn.size).toBe(0);
  });

  it('registers nothing for a name no template claimed', () => {
    const registry = toNgeTableSlotRegistry([slotRegistration('empty', 'empty-template')]);

    expect(registry.has('loading')).toBe(false);
  });
});

describe('ngeTableSlotTemplateFor', () => {
  const registry = toNgeTableSlotRegistry([
    slotRegistration('empty', 'empty-template'),
    slotRegistration('header-cell', 'every-header'),
    slotRegistration('header-cell', 'amount-header', 'amount'),
  ]);

  it('returns null when nothing is registered for the name', () => {
    expect(ngeTableSlotTemplateFor(registry, 'loading')).toBeNull();
  });

  it('returns the shared template when no column is asked for', () => {
    expect(labelOf(ngeTableSlotTemplateFor(registry, 'empty'))).toBe('empty-template');
  });

  // The property that lets a consumer declare the general case and its exception
  // together rather than enumerating every column.
  it('prefers a column-scoped template over the shared one', () => {
    expect(labelOf(ngeTableSlotTemplateFor(registry, 'header-cell', 'amount'))).toBe(
      'amount-header'
    );
  });

  it('falls back to the shared template for a column with none of its own', () => {
    expect(labelOf(ngeTableSlotTemplateFor(registry, 'header-cell', 'status'))).toBe(
      'every-header'
    );
  });
});

// The TanStack → Nge translation. Everything a consumer's `let-` binding can see
// is built here, which is what keeps `@tanstack/*` out of their templates.
describe('context builders', () => {
  it('describes a cell by its column, its row and its value', () => {
    const cell = {
      column: { id: 'amount' },
      getValue: () => 42,
      row: { id: 'row-3', index: 7, original: { name: 'Third' } },
    } as unknown as Cell<{ name: string }, unknown>;

    expect(toNgeCellContext(cell, NGE_CELL_ALWAYS_SETTLED, NGE_CELL_NO_EDIT)).toEqual({
      beginEdit: expect.any(Function),
      cancelEdit: expect.any(Function),
      columnId: 'amount',
      commitEdit: expect.any(Function),
      isEditing: NGE_CELL_NEVER_EDITING,
      isSettled: NGE_CELL_ALWAYS_SETTLED,
      row: { name: 'Third' },
      rowId: 'row-3',
      rowIndex: 7,
      value: 42,
    });
  });

  // The settled flag is handed in rather than derived, so the builder stays pure and
  // a caller with no viewport can say so. Passed through by reference on purpose:
  // one signal serves every cell of a table, and a per-cell wrapper would be the
  // allocation the context cache exists to avoid.
  it('passes the settled signal through by reference', () => {
    const isSettled = signal(false).asReadonly();
    const cell = {
      column: { id: 'series' },
      getValue: () => [1, 2, 3],
      row: { id: 'row-1', index: 0, original: { name: 'First' } },
    } as unknown as Cell<{ name: string }, unknown>;

    const context = toNgeCellContext(cell, isSettled, NGE_CELL_NO_EDIT);

    expect(context.isSettled).toBe(isSettled);
    expect(context.isSettled()).toBe(false);
  });

  it('reads NGE_CELL_ALWAYS_SETTLED as settled', () => {
    expect(NGE_CELL_ALWAYS_SETTLED()).toBe(true);
  });

  // ⚠️ The half of ARCH-292's cost claim a spec can hold. `isEditing` describes the
  // CELL, so an opted-in table pays a `computed` per cell — and a table that opted
  // into nothing must pay nothing. `NGE_CELL_NO_EDIT` returns one frozen bundle by
  // reference, so this fails the day someone rebuilds it per call and quietly puts a
  // per-cell allocation back on every non-editing table in the workspace.
  it('gives every cell of a non-editing table the same edit members', () => {
    const cellOf = (id: string): Cell<{ name: string }, unknown> =>
      ({
        column: { id: 'amount' },
        getValue: () => 1,
        row: { id, index: 0, original: { name: 'First' } },
      }) as unknown as Cell<{ name: string }, unknown>;

    const first = toNgeCellContext(cellOf('row-1'), NGE_CELL_ALWAYS_SETTLED, NGE_CELL_NO_EDIT);
    const second = toNgeCellContext(cellOf('row-2'), NGE_CELL_ALWAYS_SETTLED, NGE_CELL_NO_EDIT);

    expect(first.isEditing).toBe(second.isEditing);
    expect(first.beginEdit).toBe(second.beginEdit);
    expect(first.isEditing()).toBe(false);
  });

  // ⚠️ ARCH-291's assertion pair, applied to the field ARCH-292 added. `isEditing`
  // moves under a memoised context exactly as `isSettled` does, so it is a signal
  // for the same reason — and this is the spec that fails the day someone
  // "simplifies" it to a boolean. The failure that would otherwise ship is silent:
  // the cell renders, the read-only text stays, and activation never appears.
  it('keeps one context object while the editing flag moves under it', () => {
    const editing = signal(false);
    const members = {
      beginEdit: (): void => undefined,
      cancelEdit: (): void => undefined,
      commitEdit: (): void => undefined,
      isEditing: editing.asReadonly(),
    };
    const cell = {
      column: { id: 'name' },
      getValue: () => 'First',
      row: { id: 'row-1', index: 0, original: { name: 'First' } },
    } as unknown as Cell<{ name: string }, unknown>;

    const context = toNgeCellContext(cell, NGE_CELL_ALWAYS_SETTLED, {
      forCell: () => members,
    });
    const identity = context;

    expect(context.isEditing()).toBe(false);

    editing.set(true);

    expect(context).toBe(identity);
    expect(context.isEditing()).toBe(true);
  });

  it('closes the edit callbacks over the cell they were built for', () => {
    const calls: string[] = [];
    const cell = {
      column: { id: 'quantity' },
      getValue: () => 5,
      row: { id: 'row-9', index: 2, original: { name: 'Ninth' } },
    } as unknown as Cell<{ name: string }, unknown>;

    const context = toNgeCellContext(cell, NGE_CELL_ALWAYS_SETTLED, {
      forCell: (rowId, columnId) => ({
        beginEdit: () => calls.push(`begin:${rowId}:${columnId}`),
        cancelEdit: () => calls.push('cancel'),
        commitEdit: value => calls.push(`commit:${rowId}:${columnId}:${String(value)}`),
        isEditing: NGE_CELL_NEVER_EDITING,
      }),
    });

    context.beginEdit();
    context.commitEdit(11);
    context.cancelEdit();

    expect(calls).toEqual(['begin:row-9:quantity', 'commit:row-9:quantity:11', 'cancel']);
  });

  // ⚠️ ARCH-291's central design question, pinned in one assertion pair. Cell
  // contexts are memoised against the engine `Cell`, so ANY plain field on this
  // object is frozen at first build — a boolean `isSettled` would be read once and
  // served stale for the life of the row model, which is the failure that looks
  // like success (it renders, it just never resolves). Carrying the flag as a
  // signal is what lets both halves be true at once, and this is the spec that
  // would fail the day someone "simplifies" it back to a boolean.
  it('keeps one context object while the settled flag moves under it', () => {
    const isSettled = signal(false);
    const cell = {
      column: { id: 'series' },
      getValue: () => [1, 2, 3],
      row: { id: 'row-1', index: 0, original: { name: 'First' } },
    } as unknown as Cell<{ name: string }, unknown>;

    const context = toNgeCellContext(cell, isSettled.asReadonly(), NGE_CELL_NO_EDIT);
    const identity = context;

    expect(context.isSettled()).toBe(false);

    isSettled.set(true);

    expect(context).toBe(identity);
    expect(context.isSettled()).toBe(true);
  });

  it('describes a header by its column, its width and its sort', () => {
    const header = {
      column: { getIsSorted: () => 'desc', id: 'status' },
      getSize: () => 220,
      isPlaceholder: false,
    } as unknown as Header<unknown, unknown>;

    expect(toNgeHeaderContext(header)).toEqual({
      columnId: 'status',
      isPlaceholder: false,
      sortDirection: 'desc',
      width: 220,
    });
  });

  // The engine says `false` for "not sorted"; a template reads `null` far more
  // naturally, and `@if (header.sortDirection)` then means what it looks like.
  it('reports an unsorted column as null rather than false', () => {
    const header = {
      column: { getIsSorted: () => false, id: 'status' },
      getSize: () => 160,
      isPlaceholder: true,
    } as unknown as Header<unknown, unknown>;

    expect(toNgeHeaderContext(header)).toEqual({
      columnId: 'status',
      isPlaceholder: true,
      sortDirection: null,
      width: 160,
    });
  });

  // The detail band's own view of the row: who it is, whether it is open, and
  // whether it may be — plus the callback that lets it close itself, which is the
  // first thing a consumer wants from a band (ARCH-298).
  it('describes a row by its identity, its expansion, and how to toggle it', () => {
    const row = {
      getCanExpand: () => true,
      getIsExpanded: () => true,
      id: 'row-1',
      index: 1,
      original: { name: 'First' },
    } as unknown as Row<{ name: string }>;
    const toggleExpanded = jest.fn();

    expect(toNgeRowContext(row, toggleExpanded)).toEqual({
      canExpand: true,
      isExpanded: true,
      row: { name: 'First' },
      rowId: 'row-1',
      rowIndex: 1,
      toggleExpanded,
    });
  });

  // The callback is handed over rather than built here, which is what keeps this
  // module pure: the store owns the gesture and the capability check that goes
  // with it, and a projected template could not reach either by DI.
  it('passes the toggle through untouched rather than wrapping it', () => {
    const row = {
      getCanExpand: () => false,
      getIsExpanded: () => false,
      id: 'row-2',
      index: 2,
      original: { name: 'Second' },
    } as unknown as Row<{ name: string }>;
    const toggleExpanded = jest.fn();

    toNgeRowContext(row, toggleExpanded).toggleExpanded();

    expect(toggleExpanded).toHaveBeenCalledTimes(1);
  });

  it('describes the table by its counts alone', () => {
    expect(toNgeTableContext(7, 25)).toEqual({ columnCount: 7, rowCount: 25 });
  });
});
