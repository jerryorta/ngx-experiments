import type { ComponentFixture } from '@angular/core/testing';

import { ChangeDetectionStrategy, Component, input, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeTableFixtureRow } from '../../testing';
import type { NgeTableEvent } from '../events';
import type { NgeTableConfig } from '../nge-table-config';
import type { NgeTableState } from '../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '../../testing';
import { createNgeTableConfig } from '../nge-table-config';
import { NGE_TABLE_DEFAULTS } from '../nge-table-defaults';
import { createNgeTableState } from '../nge-table-state';
import { NgeCellDirective, NgeTableSlotDirective } from '../slots';
import { NgeTableComponent } from './nge-table.component';

const rows = createNgeTableFixture({ rows: 8 });

const config = createNgeTableConfig<NgeTableFixtureRow>({
  columns: NGE_TABLE_FIXTURE_COLUMNS,
  data: rows,
});

/** Same columns and rows, with pinning switched on so `state.columnPinning` bites. */
const pinnableConfig = createNgeTableConfig<NgeTableFixtureRow>({
  columns: NGE_TABLE_FIXTURE_COLUMNS,
  data: rows,
  enablePinning: true,
});

const allColumnIds = NGE_TABLE_FIXTURE_COLUMNS.map(column => column.id).filter(
  (id): id is string => id !== undefined
);

type Harness = ComponentFixture<NgeTableComponent<NgeTableFixtureRow>>;

function createFixtureWith(
  tableConfig: NgeTableConfig<NgeTableFixtureRow>,
  state?: NgeTableState
): Harness {
  const fixture =
    TestBed.createComponent<NgeTableComponent<NgeTableFixtureRow>>(NgeTableComponent);
  fixture.componentRef.setInput('config', tableConfig);
  if (state) {
    fixture.componentRef.setInput('state', state);
  }
  fixture.detectChanges();
  return fixture;
}

function createFixture(): Harness {
  return createFixtureWith(config);
}

function headerCells(fixture: Harness): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.nge-table__header-cell'));
}

function bodyRows(fixture: Harness): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll('.nge-table__row'));
}

function columnText(fixture: Harness, columnIndex: number): string[] {
  return bodyRows(fixture).map(
    row => row.querySelectorAll('.nge-table__cell')[columnIndex]?.textContent?.trim() ?? ''
  );
}

/** Every lane of one kind in the whole table — header lane included. */
function lanes(fixture: Harness, kind: string): HTMLElement[] {
  return Array.from(fixture.nativeElement.querySelectorAll(`.nge-table__lane--${kind}`));
}

/** The lanes of the first body row, in DOM order. */
function firstRowLanes(fixture: Harness): HTMLElement[] {
  return Array.from(bodyRows(fixture)[0].querySelectorAll('.nge-table__lane'));
}

/** Header labels inside one lane kind, in DOM order. */
function laneHeaderLabels(fixture: Harness, kind: string): string[] {
  const headerLane = fixture.nativeElement.querySelector(
    `.nge-table__header-row .nge-table__lane--${kind}`
  ) as HTMLElement | null;

  return Array.from(headerLane?.querySelectorAll('.nge-table__header-label') ?? []).map(
    label => (label as HTMLElement).textContent?.trim() ?? ''
  );
}

beforeEach(() => {
  TestBed.configureTestingModule({ imports: [NgeTableComponent] });
});

describe('NgeTableComponent', () => {
  it('renders a row per fixture row and a header per column', () => {
    const fixture = createFixture();

    expect(bodyRows(fixture)).toHaveLength(rows.length);
    expect(headerCells(fixture)).toHaveLength(NGE_TABLE_FIXTURE_COLUMNS.length);
  });

  it('labels headers from the column definitions', () => {
    const fixture = createFixture();

    expect(headerCells(fixture).map(cell => cell.textContent?.trim().split(/\s+/)[0])).toEqual([
      'Name',
      'Status',
      'Quantity',
      'Amount',
      'Created',
      'Active',
      'Owner',
    ]);
  });

  it('renders the accessor-function column, not just the flat keys', () => {
    const fixture = createFixture();
    const ownerIndex = NGE_TABLE_FIXTURE_COLUMNS.findIndex(column => column.id === 'owner');

    expect(columnText(fixture, ownerIndex)).toEqual(rows.map(row => row.owner.name));
  });

  it('shows an empty state rather than a bare header when there are no rows', () => {
    const fixture =
      TestBed.createComponent<NgeTableComponent<NgeTableFixtureRow>>(NgeTableComponent);
    fixture.componentRef.setInput(
      'config',
      createNgeTableConfig<NgeTableFixtureRow>({ columns: NGE_TABLE_FIXTURE_COLUMNS, data: [] })
    );
    fixture.detectChanges();

    expect(bodyRows(fixture)).toHaveLength(0);
    expect(fixture.nativeElement.querySelector('.nge-table__empty')).not.toBeNull();
  });

  it('applies the config geometry as inline --nge-table-* overrides', () => {
    const fixture = createFixtureWith(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        headerHeight: 56,
        rowHeight: 72,
      })
    );

    const host = fixture.nativeElement as HTMLElement;
    expect(host.style.getPropertyValue('--nge-table-row-height')).toBe('72px');
    expect(host.style.getPropertyValue('--nge-table-header-height')).toBe('56px');
  });
});

// jsdom does not lay out, so nothing here asserts a sticky position or a resolved
// offset — those belong in the browser (Storybook interaction stories). What is
// assertable is the STRUCTURE, and the structure is the whole fix: pinned cells
// are children of one lane wrapper, so there is no per-cell offset to collide.
describe('NgeTableComponent lane substrate', () => {
  it('renders a single center lane when nothing is pinned', () => {
    const fixture = createFixture();

    expect(firstRowLanes(fixture)).toHaveLength(1);
    expect(lanes(fixture, 'center')).toHaveLength(bodyRows(fixture).length + 1);
    expect(lanes(fixture, 'pinned-left')).toHaveLength(0);
    expect(lanes(fixture, 'pinned-right')).toHaveLength(0);
  });

  // The defect this substrate exists to fix, in the form jsdom can see it:
  // the earlier data table supported exactly one sticky column because each pinned cell
  // carried its own `left: 0`. Here three pinned columns are three flex children
  // of ONE sticky wrapper — there is no per-cell offset at all.
  it('puts three pinned-left columns in one lane, with no per-cell offset', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: ['owner', 'status', 'name'] } })
    );

    const leftLanes = lanes(fixture, 'pinned-left');
    expect(leftLanes).toHaveLength(bodyRows(fixture).length + 1);

    for (const lane of leftLanes) {
      expect(lane.querySelectorAll('.nge-table__header-cell, .nge-table__cell')).toHaveLength(3);
    }

    const pinnedCells = Array.from(leftLanes[1].querySelectorAll<HTMLElement>('.nge-table__cell'));
    expect(pinnedCells.map(cell => cell.style.left)).toEqual(['', '', '']);
    expect(pinnedCells.map(cell => cell.style.position)).toEqual(['', '', '']);
  });

  // Lane order is the state array's order, not the column definitions' — which is
  // what lets a user reorder their own frozen columns.
  it('orders a lane by the pinning state, not by the column definitions', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: ['owner', 'status', 'name'] } })
    );

    expect(laneHeaderLabels(fixture, 'pinned-left')).toEqual(['Owner', 'Status', 'Name']);
  });

  it('moves pinned columns out of the center lane', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: ['name', 'status'], right: ['owner'] } })
    );

    expect(laneHeaderLabels(fixture, 'center')).toEqual([
      'Quantity',
      'Amount',
      'Created',
      'Active',
    ]);
  });

  it('renders both edges at once, in visual order', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: ['name', 'status'], right: ['owner'] } })
    );

    expect(firstRowLanes(fixture).map(lane => lane.getAttribute('data-testid'))).toEqual([
      'nge-table-lane-pinned-left',
      'nge-table-lane-center',
      'nge-table-lane-pinned-right',
    ]);
  });

  // Every column pinned is a legitimate state, not an edge case to crash on — the
  // center lane simply drops out rather than rendering an empty sticky box.
  it('drops the center lane when every column is pinned', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: allColumnIds } })
    );

    expect(lanes(fixture, 'center')).toHaveLength(0);
    expect(firstRowLanes(fixture)).toHaveLength(1);
    expect(headerCells(fixture)).toHaveLength(NGE_TABLE_FIXTURE_COLUMNS.length);
  });

  // `enableSorting: false` already suppresses state-driven sorting, because the
  // engine filters `state.sorting` through `getCanSort()`. It does not do the
  // equivalent for pinning, so the library does — a capability flag has to gate the
  // effect, not just a future affordance.
  it('suppresses the lanes when pinning is disabled, whatever the state asks for', () => {
    const fixture = createFixtureWith(
      config,
      createNgeTableState({ columnPinning: { left: ['name', 'status'], right: ['owner'] } })
    );

    expect(lanes(fixture, 'pinned-left')).toHaveLength(0);
    expect(lanes(fixture, 'pinned-right')).toHaveLength(0);
    expect(firstRowLanes(fixture)).toHaveLength(1);
  });

  it('publishes the lane widths as --nge-table-internal-* properties on the host', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: ['name', 'status'], right: ['owner'] } })
    );

    const { columnDefaultWidth } = NGE_TABLE_DEFAULTS;
    const host = fixture.nativeElement as HTMLElement;

    expect(host.style.getPropertyValue('--nge-table-internal-pinned-left-width')).toBe(
      `${columnDefaultWidth * 2}px`
    );
    expect(host.style.getPropertyValue('--nge-table-internal-center-width')).toBe(
      `${columnDefaultWidth * 4}px`
    );
    expect(host.style.getPropertyValue('--nge-table-internal-pinned-right-width')).toBe(
      `${columnDefaultWidth}px`
    );
    expect(host.style.getPropertyValue('--nge-table-internal-total-width')).toBe(
      `${columnDefaultWidth * NGE_TABLE_FIXTURE_COLUMNS.length}px`
    );
  });
});

describe('NgeTableComponent ARIA grid', () => {
  it('exposes the viewport as a grid, sized for a partially-rendered table', () => {
    const fixture = createFixture();
    const viewport = fixture.nativeElement.querySelector('.nge-table__viewport') as HTMLElement;

    expect(viewport.getAttribute('role')).toBe('grid');
    expect(viewport.getAttribute('aria-colcount')).toBe(`${NGE_TABLE_FIXTURE_COLUMNS.length}`);
    // One header row plus one per data row — a header row counts.
    expect(viewport.getAttribute('aria-rowcount')).toBe(`${rows.length + 1}`);
  });

  // A lane is layout, not structure. Marking it presentational re-parents its cells
  // onto the row in the accessibility tree, which is what keeps a `gridcell` owned
  // by a `row` even though the DOM puts a wrapper in between.
  it('keeps the lane wrappers out of the accessibility tree', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
    );

    for (const lane of Array.from<HTMLElement>(
      fixture.nativeElement.querySelectorAll('.nge-table__lane')
    )) {
      expect(lane.getAttribute('role')).toBe('presentation');
    }
  });

  it('marks cells as gridcell, not cell', () => {
    const fixture = createFixture();

    expect(bodyRows(fixture)[0].querySelector('.nge-table__cell')?.getAttribute('role')).toBe(
      'gridcell'
    );
  });

  // Pinning is precisely what makes DOM order diverge from definition order:
  // `owner` is defined last and `name` first, but pinning them to opposite edges
  // swaps them. Without aria-colindex a screen reader would report the definition
  // order it can no longer see.
  it('numbers columns by their visual position across the lanes', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: ['owner'], right: ['name'] } })
    );

    // `Owner` is defined last and `Name` first; pinning them to opposite edges
    // reverses that, and the indices follow where they actually are.
    expect(
      headerCells(fixture).map(cell => [
        cell.querySelector('.nge-table__header-label')?.textContent?.trim(),
        cell.getAttribute('aria-colindex'),
      ])
    ).toEqual([
      ['Owner', '1'],
      ['Status', '2'],
      ['Quantity', '3'],
      ['Amount', '4'],
      ['Created', '5'],
      ['Active', '6'],
      ['Name', '7'],
    ]);
  });

  it('numbers the cells of a row the same way as its headers', () => {
    const fixture = createFixtureWith(
      pinnableConfig,
      createNgeTableState({ columnPinning: { left: ['owner'], right: ['name'] } })
    );

    const cells = Array.from<HTMLElement>(
      bodyRows(fixture)[0].querySelectorAll('.nge-table__cell')
    );

    expect(cells.map(cell => cell.getAttribute('aria-colindex'))).toEqual(
      headerCells(fixture).map(cell => cell.getAttribute('aria-colindex'))
    );
  });
});

describe('NgeTableComponent controlled state', () => {
  it('reflects state pushed in from the host', () => {
    const fixture = createFixture();
    const unsorted = columnText(fixture, 0);

    fixture.componentRef.setInput(
      'state',
      createNgeTableState({ sorting: [{ desc: false, id: 'name' }] })
    );
    fixture.detectChanges();

    expect(columnText(fixture, 0)).toEqual([...unsorted].sort());
  });

  it('emits the same shape when the user sorts by clicking a header', () => {
    const fixture = createFixture();
    const emitted: NgeTableState[] = [];
    fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

    headerCells(fixture)[0].click();
    fixture.detectChanges();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].sorting).toEqual([{ desc: false, id: 'name' }]);
  });

  it('emits state that still round-trips through JSON', () => {
    const fixture = createFixture();
    const emitted: NgeTableState[] = [];
    fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

    headerCells(fixture)[2].click();
    fixture.detectChanges();

    expect(JSON.parse(JSON.stringify(emitted[0]))).toEqual(emitted[0]);
  });

  // The two-way binding case: whatever we emit comes straight back in. If the
  // inbound effect did not recognise its own object the pair would oscillate.
  it('does not re-emit state the host hands back', () => {
    const fixture = createFixture();
    const emitted: NgeTableState[] = [];
    fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

    headerCells(fixture)[0].click();
    fixture.detectChanges();
    fixture.componentRef.setInput('state', emitted[0]);
    fixture.detectChanges();

    expect(emitted).toHaveLength(1);
  });

  it('does not emit for host-seeded state', () => {
    const fixture = createFixture();
    const emitted: NgeTableState[] = [];
    fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

    fixture.componentRef.setInput(
      'state',
      createNgeTableState({ sorting: [{ desc: true, id: 'amount' }] })
    );
    fixture.detectChanges();

    expect(emitted).toHaveLength(0);
  });

  it('marks the sorted header for assistive technology', () => {
    const fixture = createFixture();

    headerCells(fixture)[0].click();
    fixture.detectChanges();

    expect(headerCells(fixture)[0].getAttribute('aria-sort')).toBe('ascending');
    expect(headerCells(fixture)[1].getAttribute('aria-sort')).toBe('none');
  });

  // `aria-sort` describes a sortable column's current direction; on a column that
  // cannot sort at all, even "none" is a claim that isn't true.
  it('omits aria-sort and the focus stop when sorting is off', () => {
    const fixture =
      TestBed.createComponent<NgeTableComponent<NgeTableFixtureRow>>(NgeTableComponent);
    fixture.componentRef.setInput(
      'config',
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        enableSorting: false,
      })
    );
    fixture.detectChanges();

    expect(headerCells(fixture)[0].getAttribute('aria-sort')).toBeNull();
    expect(headerCells(fixture)[0].getAttribute('tabindex')).toBeNull();
  });
});

// jsdom does not lay out, so nothing here asserts a rendered width, a cursor, or
// where the grip actually sits — those belong in the browser. What is assertable
// is that the gesture reaches the store and that the emitted state is right,
// which is where the interesting failures live anyway.
describe('NgeTableComponent column resizing', () => {
  const { columnDefaultWidth, columnMinWidth } = NGE_TABLE_DEFAULTS;

  const resizableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableColumnResizing: true,
  });

  function resizeHandles(fixture: Harness): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('.nge-table__resize-handle'));
  }

  /** jsdom lacks PointerEvent — a MouseEvent of the same name reaches the handler. */
  function pointer(type: string, clientX: number, pointerId = 1): MouseEvent {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    return event;
  }

  function key(name: string): KeyboardEvent {
    return new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key: name,
      shiftKey: true,
    });
  }

  /** Grab column `index` at x=500 and drag to `clientX`, releasing unless told not to. */
  function drag(fixture: Harness, index: number, clientX: number, release = true): void {
    const handle = resizeHandles(fixture)[index];
    handle.dispatchEvent(pointer('pointerdown', 500));
    handle.dispatchEvent(pointer('pointermove', clientX));
    if (release) {
      handle.dispatchEvent(pointer('pointerup', clientX));
    }
    fixture.detectChanges();
  }

  describe('the affordance', () => {
    it('renders a grip per column once resizing is enabled', () => {
      const fixture = createFixtureWith(resizableConfig);

      expect(resizeHandles(fixture)).toHaveLength(NGE_TABLE_FIXTURE_COLUMNS.length);
    });

    it('renders no grip at all by default', () => {
      expect(resizeHandles(createFixture())).toHaveLength(0);
    });

    // The grip is pointer-only: the keyboard path lives on the header cell, so a
    // focusable grip would double the header's tab stops for nothing.
    it('keeps the grip out of the tab order and the accessibility tree', () => {
      const handle = resizeHandles(createFixtureWith(resizableConfig))[0];

      expect(handle.getAttribute('tabindex')).toBeNull();
      expect(handle.getAttribute('aria-hidden')).toBe('true');
    });

    // Without this a resize-only table would have no keyboard path at all.
    it('makes a header focusable when it can only be resized, not sorted', () => {
      const fixture = createFixtureWith(
        createNgeTableConfig<NgeTableFixtureRow>({
          columns: NGE_TABLE_FIXTURE_COLUMNS,
          data: rows,
          enableColumnResizing: true,
          enableSorting: false,
        })
      );

      expect(headerCells(fixture)[0].getAttribute('tabindex')).toBe('0');
    });

    it('flags the dragged grip and the host while a drag is in flight', () => {
      const fixture = createFixtureWith(resizableConfig);

      drag(fixture, 0, 560, false);

      expect(resizeHandles(fixture)[0].classList).toContain('nge-table__resize-handle--active');
      expect((fixture.nativeElement as HTMLElement).classList).toContain('nge-table--resizing');

      resizeHandles(fixture)[0].dispatchEvent(pointer('pointerup', 560));
      fixture.detectChanges();

      expect(resizeHandles(fixture)[0].classList).not.toContain(
        'nge-table__resize-handle--active'
      );
      expect((fixture.nativeElement as HTMLElement).classList).not.toContain(
        'nge-table--resizing'
      );
    });

    it('gives up the drag on pointercancel as well as pointerup', () => {
      const fixture = createFixtureWith(resizableConfig);
      drag(fixture, 0, 560, false);

      resizeHandles(fixture)[0].dispatchEvent(pointer('pointercancel', 560));
      fixture.detectChanges();

      expect((fixture.nativeElement as HTMLElement).classList).not.toContain(
        'nge-table--resizing'
      );
    });
  });

  describe('the drag', () => {
    it('emits the new width', () => {
      const fixture = createFixtureWith(resizableConfig);
      const emitted: NgeTableState[] = [];
      fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

      drag(fixture, 0, 560);

      expect(emitted.at(-1)?.columnSizing).toEqual({ name: columnDefaultWidth + 60 });
    });

    it('applies the new width to the header and its column of cells', () => {
      const fixture = createFixtureWith(resizableConfig);

      drag(fixture, 0, 560);

      expect(headerCells(fixture)[0].style.width).toBe(`${columnDefaultWidth + 60}px`);
      expect(
        (bodyRows(fixture)[0].querySelector('.nge-table__cell') as HTMLElement).style.width
      ).toBe(`${columnDefaultWidth + 60}px`);
    });

    it('emits a clamped width, not merely a clamped render', () => {
      const fixture = createFixtureWith(resizableConfig);
      const emitted: NgeTableState[] = [];
      fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

      drag(fixture, 0, -3000);

      expect(emitted.at(-1)?.columnSizing).toEqual({ name: columnMinWidth });
    });

    // The header cell's click toggles the sort, and the grip sits inside it. A
    // drag that also re-sorted the table would be unusable.
    it('does not sort the column it resized', () => {
      const fixture = createFixtureWith(resizableConfig);
      const emitted: NgeTableState[] = [];
      fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

      drag(fixture, 0, 560);
      resizeHandles(fixture)[0].dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(headerCells(fixture)[0].getAttribute('aria-sort')).toBe('none');
      expect(emitted.every(state => state.sorting.length === 0)).toBe(true);
    });

    // The lane totals are the engine's own reduction, so the sticky offsets follow
    // a resize without any arithmetic of ours — the story's stated risk, checked.
    it('moves the pinned lane geometry when a pinned column is dragged', () => {
      const fixture = createFixtureWith(
        createNgeTableConfig<NgeTableFixtureRow>({
          columns: NGE_TABLE_FIXTURE_COLUMNS,
          data: rows,
          enableColumnResizing: true,
          enablePinning: true,
        }),
        createNgeTableState({ columnPinning: { left: ['name'] } })
      );
      const host = fixture.nativeElement as HTMLElement;
      expect(host.style.getPropertyValue('--nge-table-internal-pinned-left-width')).toBe(
        `${columnDefaultWidth}px`
      );

      drag(fixture, 0, 600);

      expect(host.style.getPropertyValue('--nge-table-internal-pinned-left-width')).toBe(
        `${columnDefaultWidth + 100}px`
      );
      expect(host.style.getPropertyValue('--nge-table-internal-total-width')).toBe(
        `${columnDefaultWidth * NGE_TABLE_FIXTURE_COLUMNS.length + 100}px`
      );
    });
  });

  describe('the keyboard and reset paths', () => {
    it('resizes with shift and an arrow key on a focused header', () => {
      const fixture = createFixtureWith(resizableConfig);
      const emitted: NgeTableState[] = [];
      fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

      headerCells(fixture)[0].dispatchEvent(key('ArrowRight'));
      fixture.detectChanges();

      expect(emitted.at(-1)?.columnSizing).toEqual({ name: columnDefaultWidth + 16 });

      headerCells(fixture)[0].dispatchEvent(key('ArrowLeft'));
      fixture.detectChanges();

      expect(emitted.at(-1)?.columnSizing).toEqual({ name: columnDefaultWidth });
    });

    it('restores a column when its grip is double-clicked', () => {
      const fixture = createFixtureWith(resizableConfig);
      drag(fixture, 0, 560);

      resizeHandles(fixture)[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();

      expect(headerCells(fixture)[0].style.width).toBe(`${columnDefaultWidth}px`);
    });

    it('restores a column with shift and Home', () => {
      const fixture = createFixtureWith(resizableConfig);
      const emitted: NgeTableState[] = [];
      fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));
      drag(fixture, 0, 560);

      headerCells(fixture)[0].dispatchEvent(key('Home'));
      fixture.detectChanges();

      expect(emitted.at(-1)?.columnSizing).toEqual({});
    });

    // Double-click bubbles to the header cell, whose click toggles the sort.
    it('does not sort the column it reset', () => {
      const fixture = createFixtureWith(resizableConfig);
      drag(fixture, 0, 560);

      resizeHandles(fixture)[0].dispatchEvent(new MouseEvent('dblclick', { bubbles: true }));
      fixture.detectChanges();

      expect(headerCells(fixture)[0].getAttribute('aria-sort')).toBe('none');
    });
  });

  // A width the HOST set must survive the flag being off — the flag governs what
  // the user may do, not whether the table honours its own state. Deliberately the
  // opposite of `enablePinning`, which does suppress the state it is given.
  it('still applies a host-set width when resizing is switched off', () => {
    const fixture = createFixtureWith(
      config,
      createNgeTableState({ columnSizing: { name: 320 } })
    );

    expect(resizeHandles(fixture)).toHaveLength(0);
    expect(headerCells(fixture)[0].style.width).toBe('320px');
  });
});

// ─── Row virtualization (ARCH-245) ───────────────────────────────────────────
//
// jsdom lays nothing out, and the virtualizer is honest about it: a viewport that
// measures zero produces no window at all. So these specs feed `offsetHeight` —
// the one property `virtual-core` reads to size the viewport — and assert the
// SHAPE of what comes back: that it is a window rather than the dataset, that
// every row in it is positioned with `top` and numbered against the whole set,
// and that the body is sized to the rows the user cannot see. Whether the window
// lands in the right place, and whether pinned lanes survive scrolling it, is
// browser-only and is what the Storybook interaction story exists for.
describe('NgeTableComponent row virtualization', () => {
  const VIEWPORT_HEIGHT = 400;
  const ROW_COUNT = 200;

  const virtualRows = createNgeTableFixture({ rows: ROW_COUNT });

  const virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: virtualRows,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  let originalOffsetHeight: PropertyDescriptor | undefined;

  beforeEach(() => {
    originalOffsetHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'offsetHeight');
    Object.defineProperty(HTMLElement.prototype, 'offsetHeight', {
      configurable: true,
      get: () => VIEWPORT_HEIGHT,
    });
  });

  afterEach(() => {
    if (originalOffsetHeight) {
      Object.defineProperty(HTMLElement.prototype, 'offsetHeight', originalOffsetHeight);
    }
  });

  function body(fixture: Harness): HTMLElement {
    return fixture.nativeElement.querySelector('.nge-table__body');
  }

  it('renders a window rather than the whole dataset', () => {
    const rendered = bodyRows(createFixtureWith(virtualConfig));

    expect(rendered.length).toBeGreaterThan(0);
    expect(rendered.length).toBeLessThan(ROW_COUNT);
  });

  // The gesture the whole story turns on: `top`, never `transform`. A transform
  // creates a stacking context and a stacking context breaks the sticky pinned
  // lanes inside the row.
  it('positions every rendered row with top and never with a transform', () => {
    const rendered = bodyRows(createFixtureWith(virtualConfig));

    expect(rendered.every(row => row.style.top !== '')).toBe(true);
    expect(rendered.every(row => row.style.transform === '')).toBe(true);
  });

  it('stacks the rows a row height apart', () => {
    const rendered = bodyRows(createFixtureWith(virtualConfig));
    const tops = rendered.map(row => Number.parseFloat(row.style.top));

    expect(tops[0]).toBe(0);
    expect(tops[1] - tops[0]).toBe(NGE_TABLE_DEFAULTS.rowHeight);
  });

  // With most rows absent, counting the ones on screen would tell a screen reader
  // "row 4 of 12" about a table of two hundred.
  it('numbers rows against the whole dataset, header rows included', () => {
    const fixture = createFixtureWith(virtualConfig);
    const headerRowCount = fixture.nativeElement.querySelectorAll('.nge-table__header-row').length;

    expect(bodyRows(fixture)[0].getAttribute('aria-rowindex')).toBe(`${headerRowCount + 1}`);
    expect(
      fixture.nativeElement.querySelector('.nge-table__header-row').getAttribute('aria-rowindex')
    ).toBe('1');
  });

  it('sizes the body to the whole dataset so the scrollbar describes it', () => {
    const fixture = createFixtureWith(virtualConfig);

    expect(body(fixture).style.height).toBe(`${ROW_COUNT * NGE_TABLE_DEFAULTS.rowHeight}px`);
    expect(body(fixture).classList).toContain('nge-table__body--virtualized');
  });

  // Pinning splits a row across sticky lane wrappers; virtualization decides which
  // rows exist. jsdom can prove they compose structurally — that a windowed row
  // still carries its three lanes — and a browser proves they compose visually.
  it('splits a windowed row into lanes exactly as an unwindowed one', () => {
    const fixture = createFixtureWith(
      createNgeTableConfig<NgeTableFixtureRow>({
        ...virtualConfig,
        enablePinning: true,
      }),
      createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
    );

    const laneKinds = Array.from(bodyRows(fixture)[0].querySelectorAll('.nge-table__lane')).map(
      lane => lane.getAttribute('data-testid')
    );

    expect(laneKinds).toEqual([
      'nge-table-lane-pinned-left',
      'nge-table-lane-center',
      'nge-table-lane-pinned-right',
    ]);
  });

  // The row height is arithmetic now, not presentation, so it is written to the
  // host whether the consumer named one or not — a theme moving the token out
  // from under the offsets would overlap the rows rather than restyle them.
  it('pins the row height token even when the config names none', () => {
    const fixture = createFixtureWith(virtualConfig);

    expect(fixture.nativeElement.style.getPropertyValue('--nge-table-row-height')).toBe(
      `${NGE_TABLE_DEFAULTS.rowHeight}px`
    );
  });

  describe('with the capability withheld', () => {
    it('renders every row, unpositioned and unsized', () => {
      const fixture = createFixtureWith(
        createNgeTableConfig<NgeTableFixtureRow>({
          ...virtualConfig,
          enableVirtualization: false,
        })
      );

      expect(bodyRows(fixture)).toHaveLength(ROW_COUNT);
      expect(bodyRows(fixture).every(row => row.style.top === '')).toBe(true);
      expect(body(fixture).style.height).toBe('');
      expect(body(fixture).classList).not.toContain('nge-table__body--virtualized');
    });
  });
});

// ─── The render-slot seam (ARCH-246) ─────────────────────────────────────────
//
// A consumer projects `ng-template`s into `<nge-table>`; the table looks each one
// up by column or by name and renders it where it belongs. These specs assert what
// jsdom can see — which template landed where, and that the context it was handed
// is OURS rather than the engine's. What a slot looks like is browser-only, which
// is what the Storybook interaction story is for.
//
// The last spec in this block is the acceptance criterion in test form: a table
// nobody projected into renders exactly what it rendered before the seam existed.
describe('NgeTableComponent render slots', () => {
  @Component({
    imports: [NgeCellDirective, NgeTableComponent, NgeTableSlotDirective],
    selector: 'nge-slot-host',
    standalone: true,
    template: `
      <nge-table [config]="config()" [state]="tableState()">
        <ng-template ngeCell="amount" [ngeCellOf]="rows" let-cell>
          <span class="spec-cell">{{ cell.columnId }}|{{ cell.row.name }}|{{ cell.rowId }}</span>
        </ng-template>

        <ng-template ngeTableSlot="header-cell" ngeTableSlotColumn="status" let-header>
          <span class="spec-header"
            >{{ header.columnId }}|{{ header.sortDirection ?? 'unsorted' }}</span
          >
        </ng-template>

        <ng-template ngeTableSlot="header-overlay" ngeTableSlotColumn="name" let-header>
          <span class="spec-header-overlay">{{ header.columnId }}</span>
        </ng-template>

        <ng-template ngeTableSlot="cell-overlay" ngeTableSlotColumn="quantity" let-cell>
          <span class="spec-cell-overlay">{{ cell.rowId }}</span>
        </ng-template>

        <ng-template ngeTableSlot="row-detail" [ngeTableSlotOf]="rows" let-row>
          <span class="spec-row-detail">{{ row.rowId }}|{{ row.isExpanded }}</span>
        </ng-template>

        <ng-template ngeTableSlot="footer-cell" ngeTableSlotColumn="amount" let-footer>
          <span class="spec-footer">{{ footer.columnId }}</span>
        </ng-template>

        <ng-template ngeTableSlot="toolbar" let-table>
          <span class="spec-toolbar">{{ table.rowCount }}|{{ table.columnCount }}</span>
        </ng-template>

        <ng-template ngeTableSlot="empty" let-table>
          <span class="spec-empty">nothing across {{ table.columnCount }} columns</span>
        </ng-template>

        <ng-template ngeTableSlot="loading">
          <span class="spec-loading">Loading</span>
        </ng-template>
      </nge-table>
    `,
  })
  class SlotHostComponent {
    readonly config = input.required<NgeTableConfig<NgeTableFixtureRow>>();

    /** Named `tableState` so it does not shadow the table's own `state` input. */
    readonly tableState = input<NgeTableState>(createNgeTableState());

    /** The type carrier the `let-` bindings infer their row shape from. */
    readonly rows = rows;
  }

  const emptyConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: [],
  });

  function createHost(
    hostConfig: NgeTableConfig<NgeTableFixtureRow> = config
  ): ComponentFixture<SlotHostComponent> {
    const fixture = TestBed.createComponent(SlotHostComponent);
    fixture.componentRef.setInput('config', hostConfig);
    fixture.detectChanges();
    return fixture;
  }

  function textOf(fixture: ComponentFixture<unknown>, selector: string): string[] {
    return Array.from(fixture.nativeElement.querySelectorAll(selector)).map(
      node => (node as HTMLElement).textContent?.trim() ?? ''
    );
  }

  const amountIndex = NGE_TABLE_FIXTURE_COLUMNS.findIndex(column => column.id === 'amount');
  const statusIndex = NGE_TABLE_FIXTURE_COLUMNS.findIndex(column => column.id === 'status');

  it('renders the projected template for its column and leaves the rest alone', () => {
    const fixture = createHost();
    const firstRow = fixture.nativeElement.querySelector('.nge-table__row') as HTMLElement;
    const cells = firstRow.querySelectorAll('.nge-table__cell');

    expect(cells[amountIndex].querySelector('.spec-cell')).not.toBeNull();
    expect(cells[statusIndex].querySelector('.spec-cell')).toBeNull();
    expect(cells[statusIndex].textContent?.trim()).toBe(rows[0].status);
  });

  // The point of owning the context object: a consumer's `let-` binding sees the
  // column id, the whole row, and the row's identity — and no TanStack shape.
  it('hands a cell template our own context, not the engine one', () => {
    const fixture = createHost();

    expect(textOf(fixture, '.spec-cell')).toEqual(
      rows.map(row => `amount|${row.name}|${rows.indexOf(row)}`)
    );
  });

  it('replaces the header label for the slotted column only', () => {
    const fixture = createHost();
    const headers = Array.from(
      fixture.nativeElement.querySelectorAll('.nge-table__header-cell')
    ) as HTMLElement[];

    expect(headers[statusIndex].querySelector('.nge-table__header-label')).toBeNull();
    expect(headers[amountIndex].querySelector('.nge-table__header-label')).not.toBeNull();

    // `?? 'unsorted'` is the assertion, not decoration: the engine reports an
    // unsorted column as `false`, which would fall through the coalesce and render
    // "false". Seeing the fallback proves the context translated it to `null`.
    expect(headers[statusIndex].querySelector('.spec-header')?.textContent).toBe('status|unsorted');
  });

  it('renders an overlay beside the default content, never instead of it', () => {
    const fixture = createHost();
    const nameHeader = fixture.nativeElement.querySelector(
      '.nge-table__header-cell'
    ) as HTMLElement;

    expect(nameHeader.querySelector('.nge-table__header-label')).not.toBeNull();
    expect(nameHeader.querySelector('.spec-header-overlay')).not.toBeNull();
    expect(textOf(fixture, '.spec-cell-overlay')).toHaveLength(rows.length);
  });

  it('fills the empty band from the slot instead of the built-in text', () => {
    const fixture = createHost(emptyConfig);
    const empty = fixture.nativeElement.querySelector('.nge-table__empty') as HTMLElement;

    expect(empty.textContent?.trim()).toBe(
      `nothing across ${NGE_TABLE_FIXTURE_COLUMNS.length} columns`
    );
    expect(empty.textContent).not.toContain('No rows');
  });

  it('reports the processed row and column counts to a table-level slot', () => {
    expect(textOf(createHost(), '.spec-toolbar')).toEqual([
      `${rows.length}|${NGE_TABLE_FIXTURE_COLUMNS.length}`,
    ]);
  });

  // `state.expanded` is already routed, so the detail slot has a real signal to
  // gate on before the expansion row model is wired.
  it('gives a row-detail template the row identity and its expansion state', () => {
    const fixture = createHost();

    expect(textOf(fixture, '.spec-row-detail')).toEqual(rows.map((_, index) => `${index}|false`));
  });

  // The footer band exists only because something asked for it — and when it does,
  // it reuses the lane split, so a pinned column's footer lands in the pinned lane
  // with nothing in the footer code knowing pinning exists.
  it('renders a footer row only when a footer-cell template is registered', () => {
    const fixture = createHost();

    expect(fixture.nativeElement.querySelectorAll('.nge-table__footer-row')).toHaveLength(1);
    expect(textOf(fixture, '.spec-footer')).toEqual(['amount']);
    expect(createFixture().nativeElement.querySelector('.nge-table__footer-row')).toBeNull();
  });

  it('lets the toolbar and the loading overlay sit outside the scroll viewport', () => {
    const fixture = createHost();
    const viewport = fixture.nativeElement.querySelector('.nge-table__viewport') as HTMLElement;

    expect(fixture.nativeElement.querySelector('.nge-table__toolbar')).not.toBeNull();
    expect(viewport.querySelector('.nge-table__toolbar')).toBeNull();
    expect(viewport.querySelector('.nge-table__loading')).toBeNull();
    expect(fixture.nativeElement.querySelector('.nge-table__loading')).not.toBeNull();
  });

  // The footer band reuses `toNgeTableLanes` through `store.footerRows()`, which
  // is the claim worth pinning: a pinned column's footer cell lands in the pinned
  // lane without a line of footer code knowing pinning exists. jsdom cannot prove
  // the lane is sticky, but it can prove the cell is inside the right one.
  it('puts a pinned column footer cell in the pinned lane', () => {
    const fixture = TestBed.createComponent(SlotHostComponent);
    fixture.componentRef.setInput(
      'config',
      createNgeTableConfig<NgeTableFixtureRow>({ ...config, enablePinning: true })
    );
    fixture.componentRef.setInput(
      'tableState',
      createNgeTableState({ columnPinning: { left: ['amount'] } })
    );
    fixture.detectChanges();

    const footerRow = fixture.nativeElement.querySelector('.nge-table__footer-row') as HTMLElement;
    const pinnedLane = footerRow.querySelector('.nge-table__lane--pinned-left') as HTMLElement;

    expect(pinnedLane.querySelector('.spec-footer')?.textContent).toBe('amount');
    expect(
      footerRow.querySelector('.nge-table__lane--center')?.querySelector('.spec-footer')
    ).toBeNull();
  });

  // The seam has to cost nothing when nobody uses it: a table with no projected
  // content renders byte-for-byte what it rendered before ARCH-246.
  it('adds no band at all to a table nothing was projected into', () => {
    const fixture = createFixture();

    for (const selector of [
      '.nge-table__toolbar',
      '.nge-table__loading',
      '.nge-table__footer-row',
      '.nge-table__row-detail',
      '.nge-table__cell-overlay',
      '.nge-table__header-overlay',
    ]) {
      expect(fixture.nativeElement.querySelector(selector)).toBeNull();
    }
  });
});

describe('NgeTableComponent event stream', () => {
  const resizableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableColumnResizing: true,
  });

  /** A table wired to a listener, plus everything it has announced so far. */
  function observed(tableConfig: NgeTableConfig<NgeTableFixtureRow> = config): {
    events: NgeTableEvent<NgeTableFixtureRow>[];
    fixture: Harness;
  } {
    const fixture =
      TestBed.createComponent<NgeTableComponent<NgeTableFixtureRow>>(NgeTableComponent);
    const events: NgeTableEvent<NgeTableFixtureRow>[] = [];

    fixture.componentInstance.ngeTableEvent.subscribe(event => events.push(event));
    fixture.componentRef.setInput('config', tableConfig);
    fixture.detectChanges();

    return { events, fixture };
  }

  function kinds(events: NgeTableEvent<NgeTableFixtureRow>[]): string[] {
    return events.map(event => event.kind);
  }

  /** jsdom lacks PointerEvent — a MouseEvent of the same name reaches the handler. */
  function pointer(type: string, clientX: number, pointerId = 1): MouseEvent {
    const event = new MouseEvent(type, { bubbles: true, cancelable: true, clientX });
    Object.defineProperty(event, 'pointerId', { value: pointerId });
    return event;
  }

  it('announces a sort with the resulting stack when a header is clicked', () => {
    const { events, fixture } = observed();
    events.length = 0;

    headerCells(fixture)[0].click();
    fixture.detectChanges();

    // Sorting also rebuilds the row model, so the lifecycle pair follows — their
    // ordering is pinned in its own case below.
    expect(events.filter(event => event.kind === 'sort-change')).toEqual([
      { kind: 'sort-change', sorting: [{ desc: false, id: 'name' }] },
    ]);
  });

  // Events describe what the TABLE did. A host restoring a saved view must not
  // hear its own write come back as user activity.
  it('says nothing about state the host pushes in', () => {
    const { events, fixture } = observed();
    events.length = 0;

    fixture.componentRef.setInput(
      'state',
      createNgeTableState({ sorting: [{ desc: true, id: 'name' }] })
    );
    fixture.detectChanges();

    expect(kinds(events)).not.toContain('sort-change');
  });

  describe('a click', () => {
    it('announces the cell and then the row', () => {
      const { events, fixture } = observed();
      events.length = 0;

      (bodyRows(fixture)[0].querySelector('.nge-table__cell') as HTMLElement).click();
      fixture.detectChanges();

      expect(kinds(events)).toEqual(['cell-click', 'row-click']);
    });

    it('carries the row a template would have been handed', () => {
      const { events, fixture } = observed();
      events.length = 0;

      (bodyRows(fixture)[0].querySelector('.nge-table__cell') as HTMLElement).click();
      fixture.detectChanges();

      expect(events[0]).toMatchObject({ cell: { columnId: 'name', row: rows[0], rowIndex: 0 } });
      expect(events[1]).toMatchObject({ row: { isExpanded: false, row: rows[0], rowIndex: 0 } });
    });

    // A click on the row outside any cell is a row click and nothing else.
    it('announces the row alone when no cell was under the pointer', () => {
      const { events, fixture } = observed();
      events.length = 0;

      bodyRows(fixture)[0].click();
      fixture.detectChanges();

      expect(kinds(events)).toEqual(['row-click']);
    });

    // A header click is a sort, not a cell click — the header band is not a row.
    it('is not raised by the header', () => {
      const { events, fixture } = observed();
      events.length = 0;

      headerCells(fixture)[0].click();
      fixture.detectChanges();

      expect(kinds(events)).not.toContain('cell-click');
      expect(kinds(events)).not.toContain('row-click');
    });
  });

  describe('a resize gesture', () => {
    // ⚠️ THE THROTTLING CONTRACT, END TO END. Every `pointermove` writes a width
    // — that is what makes the column follow the pointer — and exactly one of
    // them reaches the stream, on release.
    it('announces once on release and never mid-drag', () => {
      const { events, fixture } = observed(resizableConfig);
      const handle = fixture.nativeElement.querySelector(
        '.nge-table__resize-handle'
      ) as HTMLElement;
      events.length = 0;

      handle.dispatchEvent(pointer('pointerdown', 500));
      handle.dispatchEvent(pointer('pointermove', 520));
      handle.dispatchEvent(pointer('pointermove', 540));
      handle.dispatchEvent(pointer('pointermove', 560));
      fixture.detectChanges();

      expect(events).toEqual([]);

      handle.dispatchEvent(pointer('pointerup', 560));
      fixture.detectChanges();

      expect(events).toEqual([
        {
          columnId: 'name',
          columnSizing: { name: NGE_TABLE_DEFAULTS.columnDefaultWidth + 60 },
          kind: 'column-resize',
          width: NGE_TABLE_DEFAULTS.columnDefaultWidth + 60,
        },
      ]);
    });

    it('announces a keyboard step', () => {
      const { events, fixture } = observed(resizableConfig);
      events.length = 0;

      headerCells(fixture)[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'ArrowRight',
          shiftKey: true,
        })
      );
      fixture.detectChanges();

      expect(events).toEqual([
        {
          columnId: 'name',
          columnSizing: { name: NGE_TABLE_DEFAULTS.columnDefaultWidth + 16 },
          kind: 'column-resize',
          width: NGE_TABLE_DEFAULTS.columnDefaultWidth + 16,
        },
      ]);
    });
  });

  describe('the lifecycle pair', () => {
    it('announces the loaded row model, then the painted one', async () => {
      const { events, fixture } = observed();
      await fixture.whenStable();

      expect(kinds(events).filter(kind => kind.endsWith('-complete'))).toEqual([
        'load-complete',
        'render-complete',
      ]);
    });

    it('counts the processed rows and the visible columns', async () => {
      const { events, fixture } = observed();
      await fixture.whenStable();

      expect(events.find(event => event.kind === 'load-complete')).toEqual({
        columnCount: NGE_TABLE_FIXTURE_COLUMNS.length,
        kind: 'load-complete',
        rowCount: rows.length,
      });
    });

    // Every row is in the DOM without virtualization, so the two counts agree —
    // and the gap between them is precisely what a virtualized table would show.
    it('reports how many of those rows actually reached the DOM', async () => {
      const { events, fixture } = observed();
      await fixture.whenStable();

      expect(events.find(event => event.kind === 'render-complete')).toEqual({
        columnCount: NGE_TABLE_FIXTURE_COLUMNS.length,
        kind: 'render-complete',
        renderedRowCount: rows.length,
        rowCount: rows.length,
      });
    });

    // The row model is what these describe, so a sort — which reorders it —
    // re-announces both, in the same order.
    it('re-announces both when a sort rebuilds the row model', async () => {
      const { events, fixture } = observed();
      await fixture.whenStable();
      events.length = 0;

      headerCells(fixture)[0].click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(kinds(events)).toEqual(['sort-change', 'load-complete', 'render-complete']);
    });

    // A resize recomputes plenty, but not which rows exist — and the guard is on
    // the row model's identity precisely so it can tell the difference.
    it('stays quiet when a change leaves the row model alone', async () => {
      const { events, fixture } = observed(resizableConfig);
      await fixture.whenStable();
      events.length = 0;

      headerCells(fixture)[0].dispatchEvent(
        new KeyboardEvent('keydown', {
          bubbles: true,
          cancelable: true,
          key: 'ArrowRight',
          shiftKey: true,
        })
      );
      fixture.detectChanges();
      await fixture.whenStable();

      expect(kinds(events)).toEqual(['column-resize']);
    });

    // A table nobody has described yet has not "loaded" an empty result — it has
    // not been asked anything. The store's config is null for the first effect
    // flush (the effect that pushes it in is created after this one), so without
    // the guard the very first thing a consumer would hear is a phantom
    // `load-complete` reporting zero rows.
    it('announces the loaded rows once, never an empty result first', async () => {
      const { events, fixture } = observed();
      await fixture.whenStable();

      expect(events.filter(event => event.kind === 'load-complete')).toEqual([
        {
          columnCount: NGE_TABLE_FIXTURE_COLUMNS.length,
          kind: 'load-complete',
          rowCount: rows.length,
        },
      ]);
    });
  });

  // The constraint the story carries: emissions must not fire during change
  // detection in a way an OnPush host can trip over. Every kind is driven here
  // against a host whose handler writes a signal a binding reads.
  describe('with an OnPush host that writes state from its handler', () => {
    @Component({
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [NgeTableComponent],
      selector: 'nge-event-host',
      standalone: true,
      template: `
        <nge-table [config]="config()" (ngeTableEvent)="onEvent($event)" />
        <p class="spec-last-event">{{ lastKind() }}</p>
      `,
    })
    class EventHostComponent {
      readonly config = input.required<NgeTableConfig<NgeTableFixtureRow>>();

      readonly lastKind = signal('none');

      readonly seen: string[] = [];

      onEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
        this.seen.push(event.kind);
        this.lastKind.set(event.kind);
      }
    }

    it('renders every announcement without an ExpressionChanged error', async () => {
      const fixture = TestBed.createComponent(EventHostComponent);
      fixture.componentRef.setInput('config', resizableConfig);
      fixture.detectChanges();
      await fixture.whenStable();

      const table = fixture.nativeElement.querySelector('nge-table') as HTMLElement;
      const handle = table.querySelector('.nge-table__resize-handle') as HTMLElement;

      handle.dispatchEvent(pointer('pointerdown', 500));
      handle.dispatchEvent(pointer('pointermove', 560));
      handle.dispatchEvent(pointer('pointerup', 560));
      (table.querySelector('.nge-table__header-cell') as HTMLElement).click();
      (table.querySelector('.nge-table__cell') as HTMLElement).click();
      fixture.detectChanges();
      await fixture.whenStable();

      expect(fixture.componentInstance.seen).toEqual(
        expect.arrayContaining([
          'cell-click',
          'column-resize',
          'load-complete',
          'render-complete',
          'row-click',
          'sort-change',
        ])
      );
      expect(
        (fixture.nativeElement.querySelector('.spec-last-event') as HTMLElement).textContent
      ).toBe(fixture.componentInstance.seen.at(-1));
    });
  });
});

// ─── Row selection (ARCH-268) ────────────────────────────────────────────────

describe('NgeTableComponent row selection', () => {
  const selectableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  function selectAllBox(fixture: Harness): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="nge-table-select-all"]'
    ) as HTMLInputElement;
  }

  function rowBoxes(fixture: Harness): HTMLInputElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="nge-table-select-row"]')
    );
  }

  /**
   * Click a native checkbox the way a user would, optionally with modifiers.
   *
   * A real click, not a synthesised `change`: the library handles the checkbox on
   * `click` precisely because that is the event carrying the modifier keys, and it
   * `preventDefault()`s so `checked` is driven by state rather than by the browser.
   */
  function tick(box: HTMLInputElement, modifiers: MouseEventInit = {}): void {
    box.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true, ...modifiers }));
  }

  function selectedRowIndexes(fixture: Harness): number[] {
    return bodyRows(fixture)
      .map((row, index) => (row.getAttribute('aria-selected') === 'true' ? index : -1))
      .filter(index => index !== -1);
  }

  it('injects a leading selection column with a checkbox per row', () => {
    const fixture = createFixtureWith(selectableConfig);

    expect(headerCells(fixture)).toHaveLength(NGE_TABLE_FIXTURE_COLUMNS.length + 1);
    expect(rowBoxes(fixture)).toHaveLength(rows.length);
    // Leading: the first cell of the first row is the checkbox's.
    expect(
      bodyRows(fixture)[0].querySelectorAll('.nge-table__cell')[0].contains(rowBoxes(fixture)[0])
    ).toBe(true);
  });

  it('renders no selection column at all when selection is off', () => {
    const fixture = createFixture();

    expect(rowBoxes(fixture)).toHaveLength(0);
    expect(selectAllBox(fixture)).toBeNull();
    expect(bodyRows(fixture)[0].getAttribute('aria-selected')).toBeNull();
  });

  // Both halves of the controlled-state contract, which is the acceptance
  // criterion this story turns on.
  describe('the controlled-state round trip', () => {
    it('emits the same state a host would have pushed in', () => {
      const fixture = createFixtureWith(selectableConfig);
      const emitted: NgeTableState[] = [];
      fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

      tick(rowBoxes(fixture)[1]);
      fixture.detectChanges();

      expect(emitted.at(-1)?.rowSelection).toEqual({ [rows[1].id]: true });
    });

    it('updates the checkboxes from state the host pushes in', () => {
      const fixture = createFixtureWith(
        selectableConfig,
        createNgeTableState({ rowSelection: { [rows[2].id]: true } })
      );

      expect(rowBoxes(fixture)[2].checked).toBe(true);
      expect(selectedRowIndexes(fixture)).toEqual([2]);
    });
  });

  describe('the header checkbox', () => {
    it('selects and clears every row', () => {
      const fixture = createFixtureWith(selectableConfig);

      tick(selectAllBox(fixture));
      fixture.detectChanges();
      expect(selectedRowIndexes(fixture)).toHaveLength(rows.length);

      tick(selectAllBox(fixture));
      fixture.detectChanges();
      expect(selectedRowIndexes(fixture)).toEqual([]);
    });

    it('reads as indeterminate while only some rows are ticked', () => {
      const fixture = createFixtureWith(selectableConfig);

      tick(rowBoxes(fixture)[0]);
      fixture.detectChanges();

      expect(selectAllBox(fixture).indeterminate).toBe(true);
      expect(selectAllBox(fixture).checked).toBe(false);
    });

    // There is no such thing as "all" when only one row can be held.
    it('is absent when multi-row selection is off', () => {
      const fixture = createFixtureWith(
        createNgeTableConfig<NgeTableFixtureRow>({
          columns: NGE_TABLE_FIXTURE_COLUMNS,
          data: rows,
          enableMultiRowSelection: false,
          enableRowSelection: true,
          getRowId: row => row.id,
        })
      );

      expect(selectAllBox(fixture)).toBeNull();
      // The column itself still renders — one row at a time is still selection.
      expect(rowBoxes(fixture)).toHaveLength(rows.length);
    });
  });

  describe('clicking a row', () => {
    it('replaces the selection', () => {
      const fixture = createFixtureWith(selectableConfig);

      bodyRows(fixture)[1].click();
      fixture.detectChanges();
      bodyRows(fixture)[4].click();
      fixture.detectChanges();

      expect(selectedRowIndexes(fixture)).toEqual([4]);
    });

    it('takes the range on shift-click', () => {
      const fixture = createFixtureWith(selectableConfig);

      bodyRows(fixture)[1].click();
      fixture.detectChanges();
      bodyRows(fixture)[4].dispatchEvent(
        new MouseEvent('click', { bubbles: true, shiftKey: true })
      );
      fixture.detectChanges();

      expect(selectedRowIndexes(fixture)).toEqual([1, 2, 3, 4]);
    });

    // ⚠️ THE ACCEPTANCE CRITERION: selection must not cost the event a consumer
    // was already listening for.
    it('still emits row-click', () => {
      const fixture = createFixtureWith(selectableConfig);
      const seen: NgeTableEvent<NgeTableFixtureRow>[] = [];
      fixture.componentInstance.ngeTableEvent.subscribe(event => seen.push(event));

      bodyRows(fixture)[0].click();
      fixture.detectChanges();

      expect(seen.map(event => event.kind)).toContain('row-click');
      // ...and the selection change precedes it, so a listener reading the state
      // in a `row-click` handler sees the row already selected.
      expect(seen.findIndex(event => event.kind === 'selection-change')).toBeLessThan(
        seen.findIndex(event => event.kind === 'row-click')
      );
    });

    // The checkbox lives inside the row, so `stopPropagation` on it is what keeps
    // the two gestures apart. The proof is ADDITIVE vs REPLACING: a checkbox
    // click adds row 2 and leaves row 0 alone, whereas a leaked row click would
    // have replaced the whole selection with row 2. Asserting merely that row 2
    // ends up selected would pass either way.
    it('does not also read as a click on the row', () => {
      const fixture = createFixtureWith(selectableConfig);

      tick(rowBoxes(fixture)[0]);
      fixture.detectChanges();
      tick(rowBoxes(fixture)[2]);
      fixture.detectChanges();

      expect(selectedRowIndexes(fixture)).toEqual([0, 2]);
    });
  });

  // ⚠️ THE TWO HALVES OF ONE AFFORDANCE MUST AGREE. A shift-click on the row body
  // extends the range; one on the checkbox inside that row has to do the same, or
  // a user reads the range as broken rather than as two separate gestures — and
  // the checkbox is the control that most looks like a multi-select affordance.
  describe('shift-clicking the checkbox', () => {
    it('extends the range exactly as shift-clicking the row does', () => {
      const fixture = createFixtureWith(selectableConfig);

      tick(rowBoxes(fixture)[1]);
      fixture.detectChanges();
      tick(rowBoxes(fixture)[5], { shiftKey: true });
      fixture.detectChanges();

      expect(selectedRowIndexes(fixture)).toEqual([1, 2, 3, 4, 5]);
    });

    it('agrees with the row body for the same pair of rows', () => {
      const viaBox = createFixtureWith(selectableConfig);
      tick(rowBoxes(viaBox)[2]);
      viaBox.detectChanges();
      tick(rowBoxes(viaBox)[6], { shiftKey: true });
      viaBox.detectChanges();

      const viaRow = createFixtureWith(selectableConfig);
      bodyRows(viaRow)[2].click();
      viaRow.detectChanges();
      bodyRows(viaRow)[6].dispatchEvent(new MouseEvent('click', { bubbles: true, shiftKey: true }));
      viaRow.detectChanges();

      expect(selectedRowIndexes(viaBox)).toEqual(selectedRowIndexes(viaRow));
    });

    // A plain checkbox click stays ADDITIVE — a per-item switch must never clear
    // the rest — which is the one place it deliberately differs from the row body.
    it('leaves a plain click additive rather than replacing', () => {
      const fixture = createFixtureWith(selectableConfig);

      tick(rowBoxes(fixture)[0]);
      fixture.detectChanges();
      tick(rowBoxes(fixture)[4]);
      fixture.detectChanges();

      expect(selectedRowIndexes(fixture)).toEqual([0, 4]);
    });

    it('falls back to a plain toggle when multi-row selection is off', () => {
      const fixture = createFixtureWith(
        createNgeTableConfig<NgeTableFixtureRow>({
          columns: NGE_TABLE_FIXTURE_COLUMNS,
          data: rows,
          enableMultiRowSelection: false,
          enableRowSelection: true,
          getRowId: row => row.id,
        })
      );

      tick(rowBoxes(fixture)[1]);
      fixture.detectChanges();
      tick(rowBoxes(fixture)[5], { shiftKey: true });
      fixture.detectChanges();

      expect(selectedRowIndexes(fixture)).toEqual([5]);
    });

    // State drives `checked`, so the browser must not also toggle it — otherwise a
    // shift-click flips the box against what the range write is about to say.
    it('lets state drive the box rather than the browser', () => {
      const fixture = createFixtureWith(selectableConfig);
      const box = rowBoxes(fixture)[3];
      const event = new MouseEvent('click', { bubbles: true, cancelable: true });

      box.dispatchEvent(event);
      fixture.detectChanges();

      expect(event.defaultPrevented).toBe(true);
      expect(box.checked).toBe(true);
    });
  });

  // One tab stop per rendered row, and the checkbox is a pointer affordance only
  // — the same call ARCH-244 made about the resize grip. Two tab stops per row
  // would be the anti-pattern the cell-level a11y suppression already documents.
  describe('keyboard and a11y', () => {
    it('makes the row the tab stop, not the checkbox', () => {
      const fixture = createFixtureWith(selectableConfig);

      expect(bodyRows(fixture)[0].getAttribute('tabindex')).toBe('0');
      expect(rowBoxes(fixture)[0].getAttribute('tabindex')).toBe('-1');
      expect(rowBoxes(fixture)[0].getAttribute('aria-hidden')).toBe('true');
    });

    it('leaves rows unfocusable when selection is off', () => {
      expect(bodyRows(createFixture())[0].getAttribute('tabindex')).toBeNull();
    });

    it('toggles the focused row on Space', () => {
      const fixture = createFixtureWith(selectableConfig);
      const row = bodyRows(fixture)[3];

      row.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      fixture.detectChanges();
      expect(selectedRowIndexes(fixture)).toEqual([3]);

      row.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: ' ' }));
      fixture.detectChanges();
      expect(selectedRowIndexes(fixture)).toEqual([]);
    });

    it('labels the select-all checkbox', () => {
      expect(selectAllBox(createFixtureWith(selectableConfig)).getAttribute('aria-label')).toBe(
        'Select all rows'
      );
    });
  });

  // ─── A consumer's own control (ARCH-278) ───────────────────────────────────
  //
  // The library ships a native checkbox as the DEFAULT; a consuming app projects
  // its own — `dlc-checkbox`, `dlc-checkbox` — through two named slots. The stand-in
  // below is a plain <button> rather than a real design-library component
  // deliberately: `libs/shared/table` must not depend on a domain library, and the
  // seam being exercised is the context and the callback, not the control.
  describe('a projected selection control', () => {
    @Component({
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [NgeTableComponent, NgeTableSlotDirective],
      selector: 'nge-selection-slot-host',
      standalone: true,
      template: `
        <nge-table [config]="config()" [state]="tableState()">
          <ng-template ngeTableSlot="selection-cell" [ngeTableSlotOf]="rows" let-selection>
            <button
              class="spec-select-row"
              type="button"
              [attr.data-row-id]="selection.rowId"
              [attr.data-selected]="selection.isSelected"
              [disabled]="!selection.canSelect"
              (click)="$event.stopPropagation(); selection.toggle()"
            >
              {{ selection.row.name }}
            </button>
          </ng-template>

          <ng-template ngeTableSlot="selection-header" let-selection>
            <button
              class="spec-select-all"
              type="button"
              [attr.data-all]="selection.allSelected"
              [attr.data-some]="selection.someSelected"
              (click)="$event.stopPropagation(); selection.toggleAll()"
            >
              {{ selection.selectedCount }}/{{ selection.rowCount }}
            </button>
          </ng-template>
        </nge-table>
      `,
    })
    class SelectionSlotHostComponent {
      readonly config = input.required<NgeTableConfig<NgeTableFixtureRow>>();

      /** Named `tableState` so it does not shadow the table's own `state` input. */
      readonly tableState = input<NgeTableState>(createNgeTableState());

      /** The type carrier the `let-` bindings infer their row shape from. */
      readonly rows = rows;
    }

    type SlotHarness = ComponentFixture<SelectionSlotHostComponent>;

    function createSlotHost(
      hostConfig: NgeTableConfig<NgeTableFixtureRow> = selectableConfig,
      state?: NgeTableState
    ): SlotHarness {
      const fixture = TestBed.createComponent(SelectionSlotHostComponent);
      fixture.componentRef.setInput('config', hostConfig);
      if (state) {
        fixture.componentRef.setInput('tableState', state);
      }
      fixture.detectChanges();
      return fixture;
    }

    const rowButtons = (fixture: SlotHarness): HTMLButtonElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.spec-select-row'));

    const allButton = (fixture: SlotHarness): HTMLButtonElement =>
      fixture.nativeElement.querySelector('.spec-select-all');

    it('replaces the native checkbox rather than sitting beside it', () => {
      const fixture = createSlotHost();

      expect(rowButtons(fixture)).toHaveLength(rows.length);
      expect(allButton(fixture)).not.toBeNull();
      expect(
        fixture.nativeElement.querySelectorAll('[data-testid="nge-table-select-row"]')
      ).toHaveLength(0);
      expect(
        fixture.nativeElement.querySelector('[data-testid="nge-table-select-all"]')
      ).toBeNull();
    });

    // The whole point: a consumer's control drives the same slice the native one
    // would, so selection is not a second contract for projected controls.
    it('drives real selection through the context callback', () => {
      const fixture = createSlotHost();

      rowButtons(fixture)[2].click();
      fixture.detectChanges();

      expect(rowButtons(fixture)[2].getAttribute('data-selected')).toBe('true');
      expect(bodyRows(fixture as unknown as Harness)[2].getAttribute('aria-selected')).toBe('true');
    });

    it('reads state the host pushed in', () => {
      const fixture = createSlotHost(
        selectableConfig,
        createNgeTableState({ rowSelection: { [rows[1].id]: true } })
      );

      expect(rowButtons(fixture)[1].getAttribute('data-selected')).toBe('true');
      expect(rowButtons(fixture)[0].getAttribute('data-selected')).toBe('false');
    });

    it('hands the header control the tri-state and the counts', () => {
      const fixture = createSlotHost();

      expect(allButton(fixture).textContent?.trim()).toBe(`0/${rows.length}`);

      rowButtons(fixture)[0].click();
      fixture.detectChanges();
      expect(allButton(fixture).getAttribute('data-some')).toBe('true');
      expect(allButton(fixture).getAttribute('data-all')).toBe('false');

      allButton(fixture).click();
      fixture.detectChanges();
      expect(allButton(fixture).getAttribute('data-all')).toBe('true');
      expect(allButton(fixture).textContent?.trim()).toBe(`${rows.length}/${rows.length}`);
    });

    // `canSelect` reaches the template so a consumer can DISABLE rather than hide:
    // a control that vanishes reads as a rendering bug, a disabled one reads as a
    // rule.
    it('reports canSelect so a consumer can disable rather than hide', () => {
      const fixture = createSlotHost(
        createNgeTableConfig<NgeTableFixtureRow>({
          columns: NGE_TABLE_FIXTURE_COLUMNS,
          data: rows,
          enableRowSelection: row => row.status !== 'archived',
          getRowId: row => row.id,
        })
      );

      const archived = rows
        .map((row, index) => (row.status === 'archived' ? index : -1))
        .filter(index => index >= 0);

      expect(archived.length).toBeGreaterThan(0);
      expect(rowButtons(fixture)[archived[0]].disabled).toBe(true);
      expect(rowButtons(fixture).filter(button => !button.disabled).length).toBe(
        rows.length - archived.length
      );
    });

    it('withholds both slots entirely when selection is off', () => {
      const fixture = createSlotHost(config);

      expect(rowButtons(fixture)).toHaveLength(0);
      expect(allButton(fixture)).toBeNull();
    });

    // Single-row mode has no "all", so the header slot is withheld with the native
    // checkbox it replaces — a projected control must not resurrect an affordance
    // the config switched off.
    it('withholds the header slot when multi-row selection is off', () => {
      const fixture = createSlotHost(
        createNgeTableConfig<NgeTableFixtureRow>({
          columns: NGE_TABLE_FIXTURE_COLUMNS,
          data: rows,
          enableMultiRowSelection: false,
          enableRowSelection: true,
          getRowId: row => row.id,
        })
      );

      expect(allButton(fixture)).toBeNull();
      expect(rowButtons(fixture)).toHaveLength(rows.length);
    });
  });
});

describe('NgeTableComponent zebra striping', () => {
  const stripedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableStriping: true,
    getRowId: row => row.id,
  });

  function stripedFlags(fixture: Harness): boolean[] {
    return bodyRows(fixture).map(row => row.classList.contains('nge-table__row--alt'));
  }

  it('stripes alternate rows when asked', () => {
    expect(stripedFlags(createFixtureWith(stripedConfig))).toEqual([
      false,
      true,
      false,
      true,
      false,
      true,
      false,
      true,
    ]);
  });

  it('stripes nothing by default', () => {
    expect(stripedFlags(createFixture()).some(Boolean)).toBe(false);
  });

  // Parity follows the PROCESSED row model, so a sort re-stripes the rows in
  // their new order. Taken off the engine's `row.index` — the position in
  // `config.data`, which a sort carries through unchanged — the stripes would
  // come out in whatever arbitrary pattern the sort happened to produce.
  it('keeps stripes alternating after a sort reorders the rows', () => {
    const fixture = createFixtureWith(
      stripedConfig,
      createNgeTableState({ sorting: [{ desc: false, id: 'name' }] })
    );

    expect(columnText(fixture, 0)).toEqual([...columnText(fixture, 0)].sort());
    expect(stripedFlags(fixture)).toEqual([false, true, false, true, false, true, false, true]);
  });

  // The precedence contract, as far as the DOM can carry it. The stripe is a
  // class that sets one custom property; an inline background would out-rank
  // every rule in the stylesheet and silently beat all five marks at once.
  it('adds no inline background to a striped row', () => {
    const striped = bodyRows(createFixtureWith(stripedConfig))[1];

    expect(striped.classList.contains('nge-table__row--alt')).toBe(true);
    expect(striped.style.background).toBe('');
    expect(striped.style.backgroundColor).toBe('');
  });

  // A striped row that is also selected keeps BOTH classes, which is what lets
  // the selection rule win as an ordinary later declaration. The cascade itself
  // is not observable here — jsdom resolves none of it — so the browser check in
  // the interaction story is what proves the colour; this pins the DOM contract
  // that check depends on.
  it('marks a selected alternate row as both striped and selected', () => {
    const fixture = createFixtureWith(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        enableRowSelection: true,
        enableStriping: true,
        getRowId: row => row.id,
      }),
      createNgeTableState({ rowSelection: { [rows[1].id]: true } })
    );
    const striped = bodyRows(fixture)[1];

    expect(striped.classList.contains('nge-table__row--alt')).toBe(true);
    expect(striped.classList.contains('nge-table__row--selected')).toBe(true);
    expect(striped.getAttribute('aria-selected')).toBe('true');
  });

  // Every cell-level mark — range, column selection, highlighting, the fill
  // region — paints `.nge-table__cell`, and this containment is the whole
  // reason none of them has to out-rank the stripe: a cell's background paints
  // over its row's whatever the cascade says.
  it('nests every cell inside the row it belongs to', () => {
    const fixture = createFixtureWith(stripedConfig);
    const cells = Array.from(
      fixture.nativeElement.querySelectorAll('.nge-table__cell')
    ) as HTMLElement[];

    expect(cells.length).toBeGreaterThan(0);
    expect(cells.every(cell => cell.closest('.nge-table__row') !== null)).toBe(true);
  });

  // A pinned row would band at the lane seams if the lanes could not see the
  // row's resolved surface. They read it by inheritance, so the property has to
  // be set on the ROW rather than on the lanes.
  it('carries the stripe on the row, above all three lanes', () => {
    const fixture = createFixtureWith(
      createNgeTableConfig<NgeTableFixtureRow>({
        columns: NGE_TABLE_FIXTURE_COLUMNS,
        data: rows,
        enablePinning: true,
        enableStriping: true,
        getRowId: row => row.id,
      }),
      createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
    );
    const striped = bodyRows(fixture)[1];

    expect(striped.classList.contains('nge-table__row--alt')).toBe(true);
    expect(striped.querySelectorAll('.nge-table__lane')).toHaveLength(3);
    expect(
      Array.from(striped.querySelectorAll('.nge-table__lane')).every(
        lane => !lane.classList.contains('nge-table__row--alt')
      )
    ).toBe(true);
  });
});

// ─── Inline editing (ARCH-292) ───────────────────────────────────────────────
//
// ⚠️ **The keyboard half of this feature cannot be fully proven here, and saying so
// is part of the test.** An untrusted event triggers no browser default, so a
// synthetic `Space` never types a character and a synthetic drag never selects text
// — ARCH-268 recorded that no spec catches a regression in that area. What IS
// assertable is the arrangement those defaults depend on: whether the table takes
// the key, and whether it lets the event past. The rest is verified in a browser.
describe('NgeTableComponent inline editing', () => {
  const editableColumns = NGE_TABLE_FIXTURE_COLUMNS.map(column =>
    column.id === 'name' ? { ...column, meta: { ngeEdit: { enabled: true } } } : column
  );

  const editableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: editableColumns,
    data: rows,
    getRowId: row => row.id,
  });

  const editableSelectableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: editableColumns,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  function firstNameCell(fixture: Harness): HTMLElement {
    const cells = Array.from(
      bodyRows(fixture)[0].querySelectorAll<HTMLElement>('.nge-table__cell')
    );

    // The fixture's first column is `name`, which is the editable one here.
    return cells[0];
  }

  /** Put a real focusable input inside the first editable cell, as an editor would. */
  function inputInFirstCell(fixture: Harness): HTMLInputElement {
    const input = document.createElement('input');

    firstNameCell(fixture).append(input);

    return input;
  }

  describe('the row tab stop', () => {
    it('is absent while the table can neither select nor edit', () => {
      const fixture = createFixture();

      expect(bodyRows(fixture)[0].getAttribute('tabindex')).toBeNull();
    });

    // A row that does nothing when activated should not be in the tab order; a row
    // that opens an editor should. Without arrow-key grid navigation this is the
    // only keyboard route into an editable table.
    it('appears once a column is editable, even with selection off', () => {
      const fixture = createFixtureWith(editableConfig);

      expect(bodyRows(fixture)[0].getAttribute('tabindex')).toBe('0');
    });
  });

  describe('activation', () => {
    it('opens the editor when the cell is clicked', () => {
      const fixture = createFixtureWith(editableConfig);

      firstNameCell(fixture).click();

      expect(fixture.componentInstance['store'].editing()).toEqual({
        columnId: 'name',
        rowId: rows[0].id,
      });
    });

    it('opens nothing when a read-only cell is clicked', () => {
      const fixture = createFixtureWith(editableConfig);
      const cells = Array.from(
        bodyRows(fixture)[0].querySelectorAll<HTMLElement>('.nge-table__cell')
      );

      cells[cells.length - 1].click();

      expect(fixture.componentInstance['store'].editing()).toBeNull();
    });

    it('opens the first editable column of the row on Enter', () => {
      const fixture = createFixtureWith(editableConfig);

      bodyRows(fixture)[0].dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })
      );

      expect(fixture.componentInstance['store'].editing()).toEqual({
        columnId: 'name',
        rowId: rows[0].id,
      });
    });

    // ⚠️ An editor commits on `Enter`, and the row is its ancestor. Without the
    // guard the same keystroke bubbles out and immediately re-opens the row.
    it('ignores Enter raised from inside a control', () => {
      const fixture = createFixtureWith(editableConfig);

      inputInFirstCell(fixture).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' })
      );

      expect(fixture.componentInstance['store'].editing()).toBeNull();
    });
  });

  // The four collisions ARCH-292 owns. Three of them are about NOT acting.
  describe('keyboard containment', () => {
    it('lets Space toggle row selection from the row itself', () => {
      const fixture = createFixtureWith(editableSelectableConfig);
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' });

      bodyRows(fixture)[0].dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
      expect(Object.keys(fixture.componentInstance['store'].tableState().rowSelection)).toEqual([
        rows[0].id,
      ]);
    });

    // ⚠️ A `Space` typed into an editor is a space. Taking the key here would both
    // toggle the row and — via `preventDefault()` — stop the character appearing.
    it('leaves Space alone when it comes from inside a control', () => {
      const fixture = createFixtureWith(editableSelectableConfig);
      const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: ' ' });

      inputInFirstCell(fixture).dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
      expect(fixture.componentInstance['store'].tableState().rowSelection).toEqual({});
    });

    it('cancels the edit on Escape', () => {
      const fixture = createFixtureWith(editableConfig);

      firstNameCell(fixture).click();
      expect(fixture.componentInstance['store'].editing()).not.toBeNull();

      inputInFirstCell(fixture).dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
      );

      expect(fixture.componentInstance['store'].editing()).toBeNull();
    });

    // ⚠️ The containment itself. Three addons bind an unconditional document-level
    // `Escape` (cell range, highlighting, and whatever registers next), and document
    // is LAST in the bubble path — so stopping the event at the cell is what starves
    // all of them at once without core knowing any of them exist.
    it('stops Escape reaching a document listener', () => {
      const fixture = createFixtureWith(editableConfig);
      const heard: string[] = [];
      const listener = (event: Event): void => {
        heard.push((event as KeyboardEvent).key);
      };

      document.addEventListener('keydown', listener);

      try {
        firstNameCell(fixture).dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
        );
      } finally {
        document.removeEventListener('keydown', listener);
      }

      expect(heard).toEqual([]);
    });

    // `Escape` belongs to whatever is on top — a dialog or a menu above the table
    // must still receive it, so the key is declined rather than consumed.
    it('does not consume Escape', () => {
      const fixture = createFixtureWith(editableConfig);
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        cancelable: true,
        key: 'Escape',
      });

      firstNameCell(fixture).dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    // A table with no editable column has nothing to cancel and no business
    // interfering, so the addons keep their key.
    it('leaves Escape alone on a table with no editable column', () => {
      const fixture = createFixture();
      const heard: string[] = [];
      const listener = (event: Event): void => {
        heard.push((event as KeyboardEvent).key);
      };

      document.addEventListener('keydown', listener);

      try {
        const cell = bodyRows(fixture)[0].querySelector<HTMLElement>('.nge-table__cell');
        cell?.dispatchEvent(
          new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' })
        );
      } finally {
        document.removeEventListener('keydown', listener);
      }

      expect(heard).toEqual(['Escape']);
    });
  });

  // ⚠️ Gated on `shiftKey` precisely because an unconditional `preventDefault()` on
  // `mousedown` suppresses FOCUS as well, which would break an `<input>` in a cell —
  // the failure inline editing would otherwise ship into. ARCH-268 recorded it; this
  // is the spec that keeps it recorded.
  describe('the modifier-gated preventDefault', () => {
    it('leaves a plain mousedown alone so a cell editor can take focus', () => {
      const fixture = createFixtureWith(editableSelectableConfig);
      const event = new MouseEvent('mousedown', { bubbles: true, cancelable: true });

      firstNameCell(fixture).dispatchEvent(event);

      expect(event.defaultPrevented).toBe(false);
    });

    it('still suppresses the text drag on a shift-click', () => {
      const fixture = createFixtureWith(editableSelectableConfig);
      const event = new MouseEvent('mousedown', {
        bubbles: true,
        cancelable: true,
        shiftKey: true,
      });

      firstNameCell(fixture).dispatchEvent(event);

      expect(event.defaultPrevented).toBe(true);
    });
  });
});

// ─── Row expansion (ARCH-298) ────────────────────────────────────────────────
//
// The affordance and its slot. ⚠️ The GEOMETRY half — whether an expanded band
// overlaps the row beneath it — cannot be tested here at all: jsdom lays nothing
// out, so a height, an offset and a sticky position all read as zero. The
// arithmetic that decides it is unit-tested in `nge-table-expansion.spec.ts`, and
// the rendered result is a Storybook interaction story.
describe('NgeTableComponent row expansion', () => {
  const expandableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  });

  function expandAllButton(fixture: Harness): HTMLButtonElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="nge-table-expand-all"]'
    ) as HTMLButtonElement;
  }

  function rowButtons(fixture: Harness): HTMLButtonElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid="nge-table-expand-row"]')
    );
  }

  describe('the affordance', () => {
    it('renders one chevron per row plus the header control', () => {
      const fixture = createFixtureWith(expandableConfig);

      expect(rowButtons(fixture)).toHaveLength(rows.length);
      expect(expandAllButton(fixture)).not.toBeNull();
    });

    it('renders nothing at all when expansion is off', () => {
      const fixture = createFixture();

      expect(rowButtons(fixture)).toHaveLength(0);
      expect(expandAllButton(fixture)).toBeNull();
    });

    it('opens a row and closes it again', () => {
      const fixture = createFixtureWith(expandableConfig);

      rowButtons(fixture)[2].click();
      fixture.detectChanges();
      expect(rowButtons(fixture)[2].getAttribute('aria-expanded')).toBe('true');

      rowButtons(fixture)[2].click();
      fixture.detectChanges();
      expect(rowButtons(fixture)[2].getAttribute('aria-expanded')).toBe('false');
    });

    // ⚠️ Disabled rather than absent: a control that silently vanishes reads as a
    // rendering bug where a disabled one reads as a rule. Same call ARCH-278 made
    // about `canSelect`.
    it('disables the chevron on a row the predicate rejects rather than hiding it', () => {
      const fixture = createFixtureWith(
        createNgeTableConfig<NgeTableFixtureRow>({
          columns: NGE_TABLE_FIXTURE_COLUMNS,
          data: rows,
          enableRowExpansion: row => row.id === rows[0].id,
          getRowId: row => row.id,
        })
      );

      expect(rowButtons(fixture)).toHaveLength(rows.length);
      expect(rowButtons(fixture)[0].disabled).toBe(false);
      expect(rowButtons(fixture)[1].disabled).toBe(true);
    });

    // The chevron sits inside a row whose click may select, so without the guard a
    // click would expand and then immediately be replaced by the row's own handler.
    it('does not let a chevron click reach the row', () => {
      const fixture = createFixtureWith(
        createNgeTableConfig<NgeTableFixtureRow>({
          columns: NGE_TABLE_FIXTURE_COLUMNS,
          data: rows,
          enableRowExpansion: true,
          enableRowSelection: true,
          getRowId: row => row.id,
        })
      );

      rowButtons(fixture)[1].click();
      fixture.detectChanges();

      expect(rowButtons(fixture)[1].getAttribute('aria-expanded')).toBe('true');
      expect(bodyRows(fixture)[1].getAttribute('aria-selected')).toBe('false');
    });

    it('reads expansion the host pushed in', () => {
      const fixture = createFixtureWith(
        expandableConfig,
        createNgeTableState({ expanded: { [rows[3].id]: true } })
      );

      expect(rowButtons(fixture)[3].getAttribute('aria-expanded')).toBe('true');
      expect(rowButtons(fixture)[0].getAttribute('aria-expanded')).toBe('false');
    });

    // ⚠️ The shorthand has to reach the RENDER path, not only the state: a table
    // whose slice is `true` must draw every chevron open.
    it('reads the true shorthand as every row open', () => {
      const fixture = createFixtureWith(expandableConfig, createNgeTableState({ expanded: true }));

      expect(
        rowButtons(fixture).every(button => button.getAttribute('aria-expanded') === 'true')
      ).toBe(true);
    });
  });

  describe('expand-all', () => {
    it('opens every row and closes them again', () => {
      const fixture = createFixtureWith(expandableConfig);

      expandAllButton(fixture).click();
      fixture.detectChanges();
      expect(expandAllButton(fixture).getAttribute('aria-expanded')).toBe('true');
      expect(rowButtons(fixture).every(b => b.getAttribute('aria-expanded') === 'true')).toBe(true);

      expandAllButton(fixture).click();
      fixture.detectChanges();
      expect(expandAllButton(fixture).getAttribute('aria-expanded')).toBe('false');
      expect(rowButtons(fixture).some(b => b.getAttribute('aria-expanded') === 'true')).toBe(false);
    });

    // Unlike the per-row control, this IS a real tab stop — one per table, and the
    // only keyboard route to expand-all.
    it('is reachable and activatable from the keyboard', () => {
      const fixture = createFixtureWith(expandableConfig);
      const button = expandAllButton(fixture);

      expect(button.tabIndex).toBe(0);
      expect(button.getAttribute('aria-label')).toBe('Expand all rows');
    });
  });

  describe('the emitted event', () => {
    it('announces an expansion change with the whole resulting slice', () => {
      const fixture = createFixtureWith(expandableConfig);
      const events: NgeTableEvent<NgeTableFixtureRow>[] = [];
      fixture.componentInstance.ngeTableEvent.subscribe(event => events.push(event));

      rowButtons(fixture)[1].click();
      fixture.detectChanges();

      expect(events).toContainEqual({
        expanded: { [rows[1].id]: true },
        kind: 'expansion-change',
      });
    });
  });

  describe('a projected expand control', () => {
    @Component({
      changeDetection: ChangeDetectionStrategy.OnPush,
      imports: [NgeTableComponent, NgeTableSlotDirective],
      selector: 'nge-expand-slot-host',
      standalone: true,
      template: `
        <nge-table [config]="config()" [state]="tableState()">
          <ng-template ngeTableSlot="expand-cell" [ngeTableSlotOf]="rows" let-expand>
            <button
              class="spec-expand-row"
              type="button"
              [attr.data-expanded]="expand.isExpanded"
              [attr.data-row-id]="expand.rowId"
              [disabled]="!expand.canExpand"
              (click)="$event.stopPropagation(); expand.toggle()"
            >
              {{ expand.row.name }}
            </button>
          </ng-template>

          <ng-template ngeTableSlot="expand-header" let-expand>
            <button
              class="spec-expand-all"
              type="button"
              [attr.data-all]="expand.allExpanded"
              [attr.data-some]="expand.someExpanded"
              (click)="$event.stopPropagation(); expand.toggleAll()"
            >
              {{ expand.rowCount }}
            </button>
          </ng-template>

          <ng-template ngeTableSlot="row-detail" [ngeTableSlotOf]="rows" let-detail>
            @if (detail.isExpanded) {
              <button
                class="spec-detail-close"
                type="button"
                [attr.data-row-id]="detail.rowId"
                (click)="detail.toggleExpanded()"
              >
                close {{ detail.row.name }}
              </button>
            }
          </ng-template>
        </nge-table>
      `,
    })
    class ExpandSlotHostComponent {
      readonly config = input.required<NgeTableConfig<NgeTableFixtureRow>>();

      /** Named `tableState` so it does not shadow the table's own `state` input. */
      readonly tableState = input<NgeTableState>(createNgeTableState());

      /** The type carrier the `let-` bindings infer their row shape from. */
      readonly rows = rows;
    }

    type SlotHarness = ComponentFixture<ExpandSlotHostComponent>;

    function createSlotHost(state?: NgeTableState): SlotHarness {
      const fixture = TestBed.createComponent(ExpandSlotHostComponent);
      fixture.componentRef.setInput('config', expandableConfig);
      if (state) {
        fixture.componentRef.setInput('tableState', state);
      }
      fixture.detectChanges();
      return fixture;
    }

    const projectedRows = (fixture: SlotHarness): HTMLButtonElement[] =>
      Array.from(fixture.nativeElement.querySelectorAll('.spec-expand-row'));

    const projectedAll = (fixture: SlotHarness): HTMLButtonElement =>
      fixture.nativeElement.querySelector('.spec-expand-all');

    // ⚠️ The ordering rule: the slot is consulted BEFORE the column branch, so a
    // consumer's template wins. Branching the other way round is what silently
    // forecloses the seam — the failure ARCH-278 documented.
    it('replaces the native chevron rather than sitting beside it', () => {
      const fixture = createSlotHost();

      expect(projectedRows(fixture)).toHaveLength(rows.length);
      expect(projectedAll(fixture)).not.toBeNull();
      expect(
        fixture.nativeElement.querySelectorAll('[data-testid="nge-table-expand-row"]')
      ).toHaveLength(0);
      expect(
        fixture.nativeElement.querySelector('[data-testid="nge-table-expand-all"]')
      ).toBeNull();
    });

    it('drives real expansion through the context callback', () => {
      const fixture = createSlotHost();

      projectedRows(fixture)[2].click();
      fixture.detectChanges();

      expect(projectedRows(fixture)[2].getAttribute('data-expanded')).toBe('true');
    });

    it('hands the header control the counts and drives expand-all', () => {
      const fixture = createSlotHost();

      expect(projectedAll(fixture).getAttribute('data-all')).toBe('false');

      projectedAll(fixture).click();
      fixture.detectChanges();

      expect(projectedAll(fixture).getAttribute('data-all')).toBe('true');
      expect(projectedAll(fixture).getAttribute('data-some')).toBe('true');
    });

    // ⚠️ THE ONE THING JSDOM CAN HOLD ABOUT THE GEOMETRY, and the browser caught it
    // first. The band renders for EVERY row whose table registered a template —
    // that is the slot contract, and the template does its own gating — so a height
    // applied to the band itself reserves one on every CLOSED row too. Off
    // virtualization that is a table of triple-height rows; on it, the window
    // budgets a row's height while the DOM hands back that plus a band, and every
    // row overlaps the next. jsdom cannot measure a height, but it can hold the
    // class the height hangs off.
    describe('the band only reserves space when it is open', () => {
      const bands = (fixture: SlotHarness): HTMLElement[] =>
        Array.from(fixture.nativeElement.querySelectorAll('.nge-table__row-detail'));

      const openBands = (fixture: SlotHarness): HTMLElement[] =>
        Array.from(fixture.nativeElement.querySelectorAll('.nge-table__row-detail--open'));

      it('renders a band per row but marks none open while every row is closed', () => {
        const fixture = createSlotHost();

        expect(bands(fixture)).toHaveLength(rows.length);
        expect(openBands(fixture)).toHaveLength(0);
      });

      it('marks exactly the open rows', () => {
        const fixture = createSlotHost(
          createNgeTableState({ expanded: { [rows[1].id]: true, [rows[5].id]: true } })
        );

        expect(openBands(fixture)).toHaveLength(2);
      });

      it('marks every band open under the true shorthand', () => {
        const fixture = createSlotHost(createNgeTableState({ expanded: true }));

        expect(openBands(fixture)).toHaveLength(rows.length);
      });

      it('follows a click', () => {
        const fixture = createSlotHost();

        projectedRows(fixture)[0].click();
        fixture.detectChanges();

        expect(openBands(fixture)).toHaveLength(1);
      });
    });

    // The first thing a consumer wants from a detail band, and the reason
    // `toggleExpanded` rides on `NgeRowContext` rather than being injectable: a
    // projected template resolves DI from its DECLARATION injector.
    it('lets the detail band collapse itself', () => {
      const fixture = createSlotHost(createNgeTableState({ expanded: { [rows[0].id]: true } }));

      const close = fixture.nativeElement.querySelector('.spec-detail-close') as HTMLButtonElement;
      expect(close).not.toBeNull();

      close.click();
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelector('.spec-detail-close')).toBeNull();
    });
  });
});
