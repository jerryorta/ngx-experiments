import { DatePipe } from '@angular/common';
import { Component, computed, signal, viewChild, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableEvent, NgeTableEventKind } from '../../../../events';
import type { NgeTableExportData, NgeTableExportSlice } from '../../../../export';
import type { NgeTableColumnPinning, NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { NGE_TABLE_EVENT_KINDS } from '../../../../events';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeCellDirective, NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** How many announcements the event log keeps. A demo panel, not a transcript. */
const EVENT_LOG_LIMIT = 40;

/** One line in the event log (ARCH-247). */
interface NgeTableLogEntry {
  /** Everything but the discriminant, stringified for display. */
  detail: string;
  kind: NgeTableEventKind;
  /** Monotonic, so the newest-first order is readable at a glance. */
  seq: number;
}

/**
 * Ten thousand rows — the count virtualization has to survive, and the reason the
 * fixture is a generator rather than a literal.
 */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/** Which edge a column can be dragged to, plus the way back off. */
type PinTarget = 'left' | 'right' | 'unpinned';

/**
 * Drives the controlled-state contract, which is the only way to see it: sorting
 * and state round-tripping are behaviour, and behaviour is not visible in a
 * static render. This is why table stories lead with interaction while chart
 * stories lead with usage.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-interaction-stories',
  },
  imports: [
    DatePipe,
    NgeCellDirective,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  selector: 'nge-table-interaction-stories',
  standalone: true,
  styleUrl: './nge-table-interaction-stories.component.scss',
  templateUrl: './nge-table-interaction-stories.component.html',
})
export class NgeTableInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/core/interaction';

  config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  // ============================================
  // EXAMPLE 1: Uncontrolled
  // ============================================
  /** Emissions the host chose to observe but not own — the table still works. */
  readonly observedSorting = signal<string>('none');

  onUncontrolledStateChange(state: NgeTableState): void {
    this.observedSorting.set(
      state.sorting.map(sort => `${sort.id} ${sort.desc ? 'desc' : 'asc'}`).join(', ') || 'none'
    );
  }

  // ============================================
  // EXAMPLE 2: Controlled round trip
  // ============================================
  readonly controlledState = signal<NgeTableState>(createNgeTableState());

  readonly controlledStateJson = computed(() => JSON.stringify(this.controlledState(), null, 2));

  sortExternally(columnId: string, desc: boolean): void {
    this.controlledState.set(createNgeTableState({ sorting: [{ desc, id: columnId }] }));
  }

  clearSort(): void {
    this.controlledState.set(createNgeTableState());
  }

  // ============================================
  // EXAMPLE 3: Persist and restore a view
  // ============================================
  /** Stands in for Firestore — the round trip is a string, not an object graph. */
  readonly savedView = signal<null | string>(null);

  saveView(): void {
    this.savedView.set(JSON.stringify(this.controlledState()));
  }

  restoreView(): void {
    const saved = this.savedView();
    if (saved) {
      this.controlledState.set(JSON.parse(saved) as NgeTableState);
    }
  }

  // ============================================
  // EXAMPLE 4: Pinning, driven live
  // ============================================
  /**
   * Pinning has no in-table affordance yet — the first header control is
   * ARCH-244's resize grip — so these buttons stand in for one, and drive pinning
   * the same way any future header menu will: through the public `state` input.
   */
  pinnableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enablePinning: true,
    getRowId: row => row.id,
  });

  /** Same columns and rows, with the capability withheld. */
  unpinnableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    ...this.pinnableConfig,
    enablePinning: false,
  });

  readonly pinningState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'] } })
  );

  readonly pinningJson = computed(() => JSON.stringify(this.pinningState().columnPinning, null, 2));

  /** The columns worth offering a control for — enough to prove three-deep pinning. */
  readonly pinnableColumns = ['name', 'status', 'quantity', 'owner'];

  /** Where a column currently sits, so a control can show its own state. */
  pinTargetOf(columnId: string): PinTarget {
    const { left, right } = this.pinningState().columnPinning;

    if (left?.includes(columnId)) {
      return 'left';
    }

    return right?.includes(columnId) ? 'right' : 'unpinned';
  }

  /**
   * Move one column to an edge, or off both.
   *
   * Rebuilding both arrays rather than splicing one is what keeps a column from
   * ending up pinned to two edges at once, and the append order is why a lane
   * renders in the order the user pinned things rather than the order they were
   * declared.
   */
  pinColumn(columnId: string, target: PinTarget): void {
    const { left = [], right = [] } = this.pinningState().columnPinning;

    const without = (ids: string[]): string[] => ids.filter(id => id !== columnId);

    const columnPinning: NgeTableColumnPinning = {
      left: target === 'left' ? [...without(left), columnId] : without(left),
      right: target === 'right' ? [...without(right), columnId] : without(right),
    };

    this.pinningState.update(state => ({ ...state, columnPinning }));
  }

  clearPinning(): void {
    this.pinningState.update(state => ({ ...state, columnPinning: { left: [], right: [] } }));
  }

  // ============================================
  // EXAMPLE 5: Column drag-to-resize
  // ============================================
  /**
   * `status` carries tight bounds so the clamp is reachable in a short drag —
   * every other column uses the library defaults (60–800px).
   */
  resizableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.map(column =>
      column.id === 'status' ? { ...column, maxSize: 220, minSize: 120 } : column
    ),
    data: rows.slice(0, 12),
    enableColumnResizing: true,
    getRowId: row => row.id,
  });

  readonly resizeState = signal<NgeTableState>(createNgeTableState());

  readonly resizeSizingJson = computed(() =>
    JSON.stringify(this.resizeState().columnSizing, null, 2)
  );

  /** Widths arriving from outside — the half of the round trip a drag cannot show. */
  applyPresetWidths(): void {
    this.resizeState.update(state => ({
      ...state,
      columnSizing: { amount: 90, name: 320, status: 200 },
    }));
  }

  clearWidths(): void {
    this.resizeState.update(state => ({ ...state, columnSizing: {} }));
  }

  // ============================================
  // EXAMPLE 6: Resizing a pinned column
  // ============================================
  /** The combination the flexbox substrate had to prove it could carry. */
  resizablePinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enableColumnResizing: true,
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly resizePinnedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name', 'status'], right: ['owner'] } })
  );

  // ============================================
  // EXAMPLE 7: Ten thousand rows
  // ============================================
  /**
   * The whole dataset, with only the rows near the viewport in the DOM.
   *
   * `max-height` belongs on `nge-table` itself (see the SCSS) — virtualization
   * has no window to compute without a bounded viewport, and a height on a
   * wrapper is simply overflowed.
   */
  virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  /** How many rows are in the dataset, for the readout to compare against. */
  readonly totalRowCount = NGE_TABLE_FIXTURE_SIZES.large;

  /**
   * Rows currently in the DOM, sampled on demand.
   *
   * Sampled rather than streamed because the scroll happens inside the table's
   * own viewport and does not bubble out to this component — and because the
   * point being made is a *bound*, which reads better as "scroll anywhere you
   * like, then look" than as a number ticking past.
   */
  readonly renderedRowCount = signal<null | number>(null);

  countRenderedRows(container: HTMLElement): void {
    this.renderedRowCount.set(container.querySelectorAll('.nge-table__row').length);
  }

  // ============================================
  // EXAMPLE 8: Virtualization with pinned columns
  // ============================================
  /**
   * The collision this story exists to prove is survivable.
   *
   * Virtualized rows are absolutely positioned, and pinned lanes are
   * `position: sticky` inside them. Positioning with `top` is what keeps those
   * two compatible — a `transform` would create a stacking context and strand
   * every sticky lane inside it.
   */
  virtualPinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    ...this.virtualConfig,
    enablePinning: true,
  });

  readonly virtualPinnedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
  );

  // ============================================
  // EXAMPLE 9: Resizing a pinned column mid-scroll
  // ============================================
  /** All three at once — windowed rows, frozen lanes, and a draggable edge. */
  virtualResizablePinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    ...this.virtualPinnedConfig,
    enableColumnResizing: true,
  });

  readonly virtualResizablePinnedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name', 'status'], right: ['owner'] } })
  );

  // ============================================
  // EXAMPLE 10: Inline editing, as a cell pattern (ARCH-246)
  // ============================================
  /**
   * The reframing the render-slot seam makes real: **inline editing is a cell
   * containing an input**, not a feature the table has to grow.
   *
   * `getRowId` is load-bearing here rather than a nicety — edits are keyed by row
   * id, and without it the engine keys rows by array index, so sorting the table
   * would move every edit onto a different record.
   */
  editableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 10),
    getRowId: row => row.id,
  });

  /** The type carrier `[ngeCellOf]` binds, so `let-cell` knows its row shape. */
  readonly editableRows = rows.slice(0, 10);

  /**
   * Edits, keyed by row id and held **outside** the cell.
   *
   * Not an implementation detail of the story — it is the constraint. Virtualization
   * recycles DOM, so the node showing row 12 is the node that showed row 4 a moment
   * ago; a cell holding its own draft would hand row 12 row 4's text. Cell content
   * must re-derive everything it shows from the context it is handed.
   */
  readonly editedNames = signal<Record<string, string>>({});

  readonly editedNamesJson = computed(() => JSON.stringify(this.editedNames(), null, 2));

  nameFor(rowId: string, original: string): string {
    return this.editedNames()[rowId] ?? original;
  }

  editName(rowId: string, value: string): void {
    this.editedNames.update(edits => ({ ...edits, [rowId]: value }));
  }

  clearEdits(): void {
    this.editedNames.set({});
  }

  // ============================================
  // EXAMPLE 11: Row detail, driven by state.expanded
  // ============================================
  /**
   * The `row-detail` slot with a real signal to gate on.
   *
   * `state.expanded` was routed through `buildTableOptions` in ARCH-242 even though
   * the expansion row model is not wired, which is exactly what shipping the whole
   * state contract in Wave 0 bought: the detail band works today, and switching the
   * feature on later changes nothing here.
   *
   * Virtualization is off. A windowed row is *positioned* at `index × rowHeight`,
   * so a detail band taller than one row would overlap the row beneath it — the two
   * do not compose until variable row heights land.
   */
  expandableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 6),
    getRowId: row => row.id,
  });

  readonly expandableRows = rows.slice(0, 6);

  readonly expansionState = signal<NgeTableState>(createNgeTableState());

  readonly expandedJson = computed(() => JSON.stringify(this.expansionState().expanded, null, 2));

  toggleExpanded(rowId: string): void {
    this.expansionState.update(state => {
      const expanded = state.expanded === true ? {} : { ...state.expanded };
      expanded[rowId] = !expanded[rowId];
      return { ...state, expanded };
    });
  }

  collapseAll(): void {
    this.expansionState.update(state => ({ ...state, expanded: {} }));
  }

  expandAll(): void {
    this.expansionState.update(state => ({ ...state, expanded: true }));
  }

  // ============================================
  // EXAMPLE 12: A control in a header slot
  // ============================================
  /**
   * `header-cell` replaces the label outright rather than wrapping it, because
   * these slots exist for the sort and filter forms a later story will host and
   * must not assume text-only content.
   *
   * The footgun that comes with that: the header cell's own click toggles the sort,
   * so a control inside it needs `$event.stopPropagation()` — the same arrangement
   * the resize grip has used since ARCH-244. Both buttons below stop propagation;
   * the third column deliberately does not, to make the difference visible.
   */
  headerSlotConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
    data: rows.slice(0, 6),
    getRowId: row => row.id,
  });

  readonly headerSlotState = signal<NgeTableState>(createNgeTableState());

  readonly headerSortJson = computed(() => JSON.stringify(this.headerSlotState().sorting, null, 2));

  sortFromHeader(event: Event, columnId: string, desc: boolean): void {
    event.stopPropagation();
    this.headerSlotState.update(state => ({ ...state, sorting: [{ desc, id: columnId }] }));
  }

  // ============================================
  // EXAMPLE 13: The event stream (ARCH-247)
  // ============================================
  /**
   * Extension axis 4 of 4, driven by a host that does nothing but listen.
   *
   * Everything below this line is ordinary consumer code — one binding, one
   * handler, and a list. That is the claim the seam makes: a host observes the
   * table without reaching into it, and a new event kind reaches this log without
   * a line of it changing.
   *
   * Sorting, resizing, and pinning are all switched on so the live kinds are
   * reachable from one table.
   */
  eventConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enableColumnResizing: true,
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly eventState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'] } })
  );

  /**
   * The same log, fed by ten thousand virtualized rows.
   *
   * Here to make one claim falsifiable rather than merely documented: scrolling
   * re-windows the DOM many times a second, and `render-complete` describes the
   * **row model**, not the scroll position — so the log must not move. jsdom
   * cannot exercise this at all (it lays nothing out and the window is empty), so
   * this table is the only place the guarantee can actually be checked.
   */
  virtualEventConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  /** Every kind, straight from the library — nothing here restates the union. */
  readonly eventKinds = NGE_TABLE_EVENT_KINDS;

  /** Which kinds the log is showing. Starts as all of them. */
  readonly mutedKinds = signal<ReadonlySet<NgeTableEventKind>>(new Set());

  /**
   * The log, newest first and capped.
   *
   * Capped because a table is a long-lived component and this is a demo panel,
   * not a transcript — an uncapped list would grow for as long as the story is
   * open.
   */
  readonly eventLog = signal<readonly NgeTableLogEntry[]>([]);

  readonly visibleEventLog = computed(() => {
    const muted = this.mutedKinds();
    return this.eventLog().filter(entry => !muted.has(entry.kind));
  });

  /** Per-kind totals, so the throttling contract is visible as a number. */
  readonly eventCounts = computed<Partial<Record<NgeTableEventKind, number>>>(() => {
    const counts: Partial<Record<NgeTableEventKind, number>> = {};

    for (const entry of this.eventLog()) {
      counts[entry.kind] = (counts[entry.kind] ?? 0) + 1;
    }

    return counts;
  });

  /**
   * The whole integration: one binding, one handler.
   *
   * The `kind` is pulled out for the summary line and the rest is stringified —
   * a real host would `switch` on it instead, and the compiler would narrow the
   * payload to that kind's own fields.
   */
  onNgeTableEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
    const { kind, ...payload } = event;

    this.eventLog.update(log =>
      [{ detail: JSON.stringify(payload), kind, seq: log.length + 1 }, ...log].slice(
        0,
        EVENT_LOG_LIMIT
      )
    );
  }

  toggleEventKind(kind: NgeTableEventKind): void {
    this.mutedKinds.update(muted => {
      const next = new Set(muted);

      if (!next.delete(kind)) {
        next.add(kind);
      }

      return next;
    });
  }

  /**
   * Pin from outside the table — and hear nothing back.
   *
   * The half of the contract that is easiest to get wrong: a host pushing state
   * in through `[state]` is not the table doing something, so it announces
   * nothing. Were it otherwise, restoring a saved view would replay as a burst of
   * user activity, and `[(state)]` would look like an event source.
   */
  pinFromEventStory(columnId: string): void {
    this.eventState.update(state => {
      const { left = [], right = [] } = state.columnPinning;
      const pinned = left.includes(columnId);

      return {
        ...state,
        columnPinning: {
          left: pinned ? left.filter(id => id !== columnId) : [...left, columnId],
          right,
        },
      };
    });
  }

  clearEventLog(): void {
    this.eventLog.set([]);
  }

  // ============================================
  // EXAMPLE 14: The export seam (ARCH-248)
  // ============================================
  /**
   * Extension axis 3 of 4, and the composition it exists for — demonstrated with
   * **nothing but consumer code**.
   *
   * Clicking a cell marks it (through the ARCH-247 event stream); exporting with
   * the marked set as a `cellPredicate` returns only those cells. That is exactly
   * the shape ARCH-250's highlight addon and ARCH-251's CSV formatter will take:
   * one side marks, one side exports, and neither imports the other — both talk to
   * the table.
   *
   * Pinning is on so the export's column order can be made to diverge from the
   * declaration order live, which is the difference between "reflects the columns"
   * and "reflects the columns the user can see".
   */
  exportConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enablePinning: true,
    getRowId: row => row.id,
  });

  /** The type carrier `[ngeCellOf]` binds, so `let-cell` knows its row shape. */
  readonly exportRows = rows.slice(0, 12);

  readonly exportState = signal<NgeTableState>(createNgeTableState());

  /**
   * Marked cells, keyed `rowId|columnId`.
   *
   * The key is the constraint, not a convenience: virtualization recycles DOM, so
   * a mark held against an element survives neither a scroll nor a sort. An addon
   * doing this for real keeps the same shape, in `NgeTableState`.
   */
  readonly markedCells = signal<ReadonlySet<string>>(new Set());

  readonly markedOnly = signal(false);

  readonly exportResult = signal<NgeTableExportData | null>(null);

  readonly exportSlice = signal<NgeTableExportSlice>('all');

  /** Columns × rows, so the effect of every toggle is one glance. */
  readonly exportSummary = computed(() => {
    const data = this.exportResult();

    return data
      ? `${data.columns.length} columns × ${data.rows.length} rows`
      : 'nothing exported yet';
  });

  /** The shape itself, trimmed to two rows — the whole thing is 12 × 7 cells. */
  readonly exportPreview = computed(() => {
    const data = this.exportResult();

    return data
      ? JSON.stringify({ columns: data.columns, rows: data.rows.slice(0, 2) }, null, 2)
      : '';
  });

  isMarked(rowId: string, columnId: string): boolean {
    return this.markedCells().has(`${rowId}|${columnId}`);
  }

  /** Mark or unmark the clicked cell. One binding, no library code involved. */
  onExportEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
    if (event.kind !== 'cell-click') {
      return;
    }

    const key = `${event.cell.rowId}|${event.cell.columnId}`;

    this.markedCells.update(marked => {
      const next = new Set(marked);

      if (!next.delete(key)) {
        next.add(key);
      }

      return next;
    });
  }

  /**
   * The whole integration.
   *
   * Note what the predicate is: an ordinary closure over this component's own
   * state. The seam never learns what "marked" means, which is why a highlight
   * addon can supply the same thing without either side importing the other.
   */
  runExport(slice: NgeTableExportSlice): void {
    this.exportSlice.set(slice);
    this.exportResult.set(
      this.exportTable().readNgeExportData({
        cellPredicate: this.markedOnly()
          ? cell => this.isMarked(cell.rowId, cell.columnId)
          : undefined,
        slice,
      })
    );
  }

  toggleMarkedOnly(): void {
    this.markedOnly.update(only => !only);
  }

  clearMarks(): void {
    this.markedCells.set(new Set());
  }

  /** Hide or show a column, so the export can be watched losing one. */
  toggleExportColumn(columnId: string): void {
    this.exportState.update(state => ({
      ...state,
      columnVisibility: {
        ...state.columnVisibility,
        [columnId]: state.columnVisibility[columnId] === false,
      },
    }));
  }

  /** Pin a column left, so the export's column order can be watched moving. */
  toggleExportPin(columnId: string): void {
    this.exportState.update(state => {
      const { left = [] } = state.columnPinning;

      return {
        ...state,
        columnPinning: {
          ...state.columnPinning,
          left: left.includes(columnId) ? left.filter(id => id !== columnId) : [...left, columnId],
        },
      };
    });
  }

  /** Selection has no in-table affordance yet, so this stands in for one. */
  toggleExportSelection(rowId: string): void {
    this.exportState.update(state => ({
      ...state,
      rowSelection: { ...state.rowSelection, [rowId]: !state.rowSelection[rowId] },
    }));
  }

  /**
   * The table this example exports from.
   *
   * `readNgeExportData` is a method on `<nge-table>` rather than a service, so
   * reaching it is an ordinary view query — and notably, nothing here imports
   * `@tanstack/*` to hold the result.
   */
  private readonly exportTable =
    viewChild.required<NgeTableComponent<NgeTableFixtureRow>>('exportTable');
}
