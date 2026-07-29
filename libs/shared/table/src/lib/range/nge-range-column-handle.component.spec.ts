import type { ComponentFixture } from '@angular/core/testing';

import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeTableFixtureRow } from '../../testing';
import type { NgeTableConfig } from '../nge-table-config';
import type { NgeTableState } from '../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '../../testing';
import { NgeTableComponent } from '../nge-table';
import { createNgeTableConfig } from '../nge-table-config';
import { createNgeTableState } from '../nge-table-state';
import { NgeTableSlotDirective } from '../slots';
import { NGE_RANGE_COLUMN_ATTRIBUTE } from './nge-range-bridge';
import { NgeRangeColumnHandleComponent } from './nge-range-column-handle.component';
import { NgeRangeOverlayComponent } from './nge-range-overlay.component';
import { provideNgeCellRange } from './provide-nge-cell-range';

const rows = createNgeTableFixture({ rows: 8 });

/**
 * A table wearing BOTH range templates, which is how a consumer who wants columns
 * and cells together registers them.
 *
 * The two are independently optional and neither needs the other — but running them
 * together is the arrangement that could go wrong, so it is the one under test.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    NgeTableComponent,
    NgeTableSlotDirective,
    NgeRangeColumnHandleComponent,
    NgeRangeOverlayComponent,
  ],
  providers: [provideNgeCellRange()],
  selector: 'nge-range-column-host',
  standalone: true,
  template: `
    <nge-table [config]="config()" [state]="tableState()" (stateChange)="onStateChange($event)">
      <ng-template ngeTableSlot="cell-overlay" [ngeTableSlotOf]="rows" let-cell>
        <nge-range-overlay [cell]="cell" [state]="tableState()" />
      </ng-template>
      <ng-template ngeTableSlot="header-overlay" [ngeTableSlotOf]="rows" let-header>
        <nge-range-column-handle [header]="header" [state]="tableState()" />
      </ng-template>
    </nge-table>
  `,
})
class ColumnHostComponent {
  readonly config = input.required<NgeTableConfig<NgeTableFixtureRow>>();

  /** Type carrier for the slot contexts; never read at runtime. */
  readonly rows = rows;

  readonly tableState = signal(createNgeTableState());

  onStateChange(state: NgeTableState): void {
    this.tableState.set(state);
  }
}

async function createHost(): Promise<ComponentFixture<ColumnHostComponent>> {
  TestBed.resetTestingModule();
  TestBed.configureTestingModule({ imports: [ColumnHostComponent] });

  const fixture = TestBed.createComponent(ColumnHostComponent);
  fixture.componentRef.setInput(
    'config',
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      // ⚠️ Not optional once anything marks a column — without it the engine keys
      // rows by array index and a re-fetch moves the selection onto other records.
      getRowId: row => row.id,
    })
  );
  fixture.detectChanges();
  // The handle publishes its column id from an `afterRenderEffect`, so nothing is
  // stamped until the render hooks have run.
  await fixture.whenStable();

  return fixture;
}

/** The strip a user clicks, for one column. */
function stripFor(fixture: ComponentFixture<ColumnHostComponent>, columnId: string): Element {
  const strip = (fixture.nativeElement as Element).querySelector(
    `[data-testid="nge-range-column-handle"][data-column-id="${columnId}"]`
  );

  if (!strip) {
    throw new Error(`no strip for ${columnId}`);
  }

  return strip;
}

/** The header cell around it — what the sort gesture belongs to. */
function headerFor(fixture: ComponentFixture<ColumnHostComponent>, columnId: string): Element {
  const header = (fixture.nativeElement as Element).querySelector(
    `.nge-table__header-cell[${NGE_RANGE_COLUMN_ATTRIBUTE}="${columnId}"]`
  );

  if (!header) {
    throw new Error(`no header for ${columnId}`);
  }

  return header;
}

/** Column ids whose headers are PAINTING as selected — what a user sees. */
function paintedColumnIds(fixture: ComponentFixture<ColumnHostComponent>): string[] {
  const handles: Element[] = Array.from(
    (fixture.nativeElement as Element).querySelectorAll('.nge-range-column-handle--on')
  );

  return handles.map(
    handle => handle.querySelector('[data-column-id]')?.getAttribute('data-column-id') ?? 'unknown'
  );
}

/** Row ids the body overlay is painting in one column. */
function paintedRowIds(fixture: ComponentFixture<ColumnHostComponent>): number {
  return (fixture.nativeElement as Element).querySelectorAll('.nge-range-overlay--on').length;
}

async function click(
  fixture: ComponentFixture<ColumnHostComponent>,
  target: Element,
  modifiers: MouseEventInit = {}
): Promise<void> {
  target.dispatchEvent(new MouseEvent('click', { bubbles: true, ...modifiers }));
  fixture.detectChanges();
  await fixture.whenStable();
}

describe('NgeRangeColumnHandleComponent — publishing', () => {
  it('stamps its column id on the enclosing header cell', async () => {
    const fixture = await createHost();

    expect(headerFor(fixture, 'status').getAttribute(NGE_RANGE_COLUMN_ATTRIBUTE)).toBe('status');
  });

  // ⚠️ **Deliberately NOT `data-nge-range-cell`.** The body's hit-test asks for that
  // attribute and must keep answering `null` for a header, or a click on a header
  // label would read as a click on a cell. Two names make that structural.
  it('does not stamp the body attribute on a header', async () => {
    const fixture = await createHost();

    expect(headerFor(fixture, 'status').hasAttribute('data-nge-range-cell')).toBe(false);
  });
});

// ⚠️ **The AC this story's central design decision exists to satisfy.** A header
// click already toggles the sort, so the two gestures share one element and must not
// reach each other. jsdom cannot exercise the strip's *position* — that it sits on
// the leading edge, clear of the resize grip, is browser-only — but which handler a
// click reaches is ordinary DOM and belongs here.
describe('NgeRangeColumnHandleComponent — the two header gestures cannot trigger each other', () => {
  it('selects the column from the strip without sorting', async () => {
    const fixture = await createHost();

    await click(fixture, stripFor(fixture, 'status'));

    expect(paintedColumnIds(fixture)).toEqual(['status']);
    expect(fixture.componentInstance.tableState().sorting).toEqual([]);
  });

  it('sorts from the header cell without selecting', async () => {
    const fixture = await createHost();

    await click(fixture, headerFor(fixture, 'status'));

    expect(fixture.componentInstance.tableState().sorting).toEqual([{ desc: false, id: 'status' }]);
    expect(paintedColumnIds(fixture)).toEqual([]);
    expect(paintedRowIds(fixture)).toBe(0);
  });

  // The strip is inside the header cell, so without `stopPropagation` its click would
  // bubble straight into the sort handler and every column selection would also sort.
  it('selects without sorting even after the column has been sorted once', async () => {
    const fixture = await createHost();

    await click(fixture, headerFor(fixture, 'status'));
    await click(fixture, stripFor(fixture, 'status'));

    expect(fixture.componentInstance.tableState().sorting).toEqual([{ desc: false, id: 'status' }]);
    expect(paintedColumnIds(fixture)).toEqual(['status']);
  });
});

describe('NgeRangeColumnHandleComponent — the gestures', () => {
  it('paints every cell of the column it selects', async () => {
    const fixture = await createHost();

    await click(fixture, stripFor(fixture, 'status'));

    expect(paintedRowIds(fixture)).toBe(rows.length);
  });

  it('takes the span of columns on a shift-click', async () => {
    const fixture = await createHost();

    await click(fixture, stripFor(fixture, 'name'));
    await click(fixture, stripFor(fixture, 'quantity'), { shiftKey: true });

    expect(paintedColumnIds(fixture)).toEqual(['name', 'status', 'quantity']);
  });

  it('adds a disjoint column on cmd/ctrl-click, and drops it on a second one', async () => {
    const fixture = await createHost();

    await click(fixture, stripFor(fixture, 'name'));
    await click(fixture, stripFor(fixture, 'amount'), { metaKey: true });

    expect(paintedColumnIds(fixture)).toEqual(['name', 'amount']);

    await click(fixture, stripFor(fixture, 'amount'), { metaKey: true });

    expect(paintedColumnIds(fixture)).toEqual(['name']);
  });

  // Fully, not partially — the header band has to distinguish "I selected this
  // column" from "my selection happens to touch it".
  it('leaves a header unpainted when a cell block merely passes through', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    host.tableState.set({
      ...host.tableState(),
      ngeRange: {
        ranges: [
          {
            anchorColumnId: 'name',
            anchorRowId: rows[1].id,
            focusColumnId: 'quantity',
            focusRowId: rows[3].id,
          },
        ],
      },
    });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(paintedRowIds(fixture)).toBeGreaterThan(0);
    expect(paintedColumnIds(fixture)).toEqual([]);
  });
});

// ⚠️ ARCH-269's finding, applied to the header: the handle binds the WHOLE
// `NgeTableState`, never `state().ngeRange`. A sort leaves the slice alone, so a
// slice-shaped input would have no dependency the sort changes — and the paint would
// silently stop following the view. Only the ROW axis discriminates this, and a
// re-sort is the way to see it.
describe('NgeRangeColumnHandleComponent — the paint follows the view', () => {
  it('keeps painting the whole column across a re-sort', async () => {
    const fixture = await createHost();
    const host = fixture.componentInstance;

    await click(fixture, stripFor(fixture, 'status'));

    host.tableState.set({ ...host.tableState(), sorting: [{ desc: true, id: 'amount' }] });
    fixture.detectChanges();
    await fixture.whenStable();

    expect(paintedColumnIds(fixture)).toEqual(['status']);
    expect(paintedRowIds(fixture)).toBe(rows.length);
  });
});
