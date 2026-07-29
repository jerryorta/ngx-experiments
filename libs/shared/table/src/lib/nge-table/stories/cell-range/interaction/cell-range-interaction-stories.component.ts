import { Component, computed, signal, viewChild, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableExportData } from '../../../../export';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableRangeKeysDemoComponent } from '../range-demo-keys.component';
import { NgeTableRangeDemoComponent } from '../range-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Ten thousand rows — where "survives a virtualized scroll" becomes falsifiable. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * Cell range selection, driven — and driving it is the only way to see any of it.
 *
 * Nearly every claim on this page is a **gesture**: a drag across cells, a drag past
 * the viewport edge that keeps going, a shift-click that grows *and shrinks* a
 * block, a cmd/ctrl-drag that adds a disjoint one. jsdom exercises none of that — it
 * lays nothing out, so it has no scroll geometry, no sticky offsets, and no pointer
 * capture — which is why interaction is the primary facet for a table feature and
 * why this story is the acceptance evidence rather than a showcase of it.
 *
 * Everything below is an addon registered through `provideNgeCellRange()`,
 * decorating the same `<nge-table>` every other story uses. Nothing in the library
 * core names cell ranges.
 *
 * ⚠️ Every table is wrapped in its own `<nge-table-range-demo>` rather than
 * declared inline. A range is **per-table** — the providers create one bridge per
 * injector, and that bridge holds both the engine instance and the delegated
 * gesture — so nine tables sharing one injector would share one bridge, and a drag
 * in the first section would resolve its cells against the ninth section's table.
 *
 * ⚠️ Only section 5's table takes `Escape` and cmd/ctrl-`A`. Both listeners are on
 * the document, so every other table on this page opts out via
 * `provideNgeCellRange({ clearOnEscape: false, selectAllOnModifierA: false })` — or
 * one `Escape` would clear all nine at once.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-range-interaction-stories',
  },
  imports: [
    NgeStorybookReviewContainerComponent,
    NgeTableRangeDemoComponent,
    NgeTableRangeKeysDemoComponent,
  ],
  selector: 'nge-table-cell-range-interaction-stories',
  standalone: true,
  styleUrl: './cell-range-interaction-stories.component.scss',
  templateUrl: './cell-range-interaction-stories.component.html',
})
export class NgeTableCellRangeInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-range/interaction';

  // ============================================
  // EXAMPLE 1: Drag out a rectangle
  // ============================================
  /**
   * ⚠️ `getRowId` is **mandatory** for this feature, not merely advisable.
   *
   * Every rectangle names its corners by row id; without one the engine keys rows by
   * array index, so a sort silently moves the user's selection onto different
   * records — the failure that reads as data corruption rather than as a bug. It
   * fails loudly under `ngDevMode` rather than degrading.
   */
  basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly basicRows = rows.slice(0, 12);

  readonly basicState = signal<NgeTableState>(createNgeTableState());

  /** The slice itself — the contract being demonstrated, not decoration. */
  readonly basicRangeJson = computed(() =>
    JSON.stringify(this.basicState().ngeRange ?? null, null, 2)
  );

  // ============================================
  // EXAMPLE 2: Shift-click extends, and the anchor stays put
  // ============================================
  extendConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly extendRows = rows.slice(0, 12);

  readonly extendState = signal<NgeTableState>(createNgeTableState());

  readonly extendRangeJson = computed(() =>
    JSON.stringify(this.extendState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 3: cmd/ctrl-drag adds a disjoint block
  // ============================================
  additiveConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly additiveRows = rows.slice(0, 12);

  readonly additiveState = signal<NgeTableState>(createNgeTableState());

  /** How many disjoint rectangles are in flight — the reason `ranges` is an array. */
  readonly additiveCount = computed(() => this.additiveState().ngeRange?.ranges.length ?? 0);

  readonly additiveRangeJson = computed(() =>
    JSON.stringify(this.additiveState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 4: Auto-scroll past the viewport edge
  // ============================================
  /**
   * Deliberately more rows and more columns than the bounded viewport can show.
   *
   * Auto-scroll is only demonstrable against a viewport something is *outside* of.
   * The section's wrapper narrows the table as well, because the fixture's seven
   * columns come to roughly 1120px and would otherwise fit the story panel — leaving
   * a section whose prose says "drag past the right-hand edge" and a table with no
   * right-hand edge to drag past.
   */
  autoScrollConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  readonly autoScrollRows = rows;

  readonly autoScrollState = signal<NgeTableState>(createNgeTableState());

  readonly autoScrollRangeJson = computed(() =>
    JSON.stringify(this.autoScrollState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 5: Escape and cmd/ctrl-A
  // ============================================
  keysConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly keysRows = rows.slice(0, 12);

  readonly keysState = signal<NgeTableState>(createNgeTableState());

  readonly keysRangeJson = computed(() =>
    JSON.stringify(this.keysState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 6: Ten thousand rows
  // ============================================
  /**
   * The acceptance criterion that cannot be checked anywhere but a browser.
   *
   * Drag out a block, scroll it far out of the window, scroll back. It is still
   * selected — because the recycled node re-derives from `state` on every pass and
   * holds nothing of its own. jsdom lays nothing out, so the virtual window is empty
   * there and a spec proves nothing about this.
   */
  virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  readonly virtualRows = largeRows;

  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  /** Rectangles and the slice's size — the scalability claim as a number. */
  readonly virtualCounts = computed(() => {
    const slice = this.virtualState().ngeRange;

    return {
      bytes: JSON.stringify(slice ?? {}).length,
      ranges: slice?.ranges.length ?? 0,
    };
  });

  // ============================================
  // EXAMPLE 7: Pinned columns
  // ============================================
  /**
   * A pinned lane is `position: sticky` and scrolls over the center lane, so a
   * selected pinned cell must stay **opaque** — a translucent tint would show the
   * center cells sliding underneath it.
   *
   * The column axis is the one ARCH-250's highlighting never had: a block names two
   * *columns* and resolves everything between them against **visual** order across
   * the three lanes, so pinning re-shapes a rectangle exactly as sorting does.
   */
  pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly pinnedRows = rows.slice(0, 12);

  readonly pinnedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
  );

  /** Whether `quantity` currently sits in the left lane — the section's toggle. */
  readonly quantityPinned = computed(() =>
    (this.pinnedState().columnPinning.left ?? []).includes('quantity')
  );

  // ============================================
  // EXAMPLE 8: A block follows the view
  // ============================================
  sortableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly sortableRows = rows.slice(0, 12);

  readonly sortableState = signal<NgeTableState>(createNgeTableState());

  readonly sortableRangeJson = computed(() =>
    JSON.stringify(this.sortableState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 9: Exporting only the selected cells
  // ============================================
  exportConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly exportRows = rows.slice(0, 12);

  readonly exportState = signal<NgeTableState>(createNgeTableState());

  readonly exportResult = signal<NgeTableExportData | null>(null);

  readonly exportSummary = computed(() => {
    const data = this.exportResult();

    return data
      ? `${data.columns.length} columns × ${data.rows.length} rows`
      : 'nothing exported yet';
  });

  readonly exportPreview = computed(() => {
    const data = this.exportResult();

    return data
      ? JSON.stringify({ columns: data.columns, rows: data.rows.slice(0, 3) }, null, 2)
      : '';
  });

  // ============================================
  // EXAMPLE 10: Persist and restore
  // ============================================
  /** Stands in for Firestore — the round trip is a string, not an object graph. */
  readonly savedView = signal<null | string>(null);

  /**
   * Push a rectangle in from outside, with no gesture at all.
   *
   * The other half of the controlled-state round trip, and the half a drag never
   * shows. Host-driven state is deliberately **silent**: it emits no
   * `NgeTableEvent`, so restoring a saved view does not replay as user activity.
   */
  seedRange(): void {
    this.basicState.update(state => ({
      ...state,
      ngeRange: {
        ranges: [
          {
            anchorColumnId: 'status',
            anchorRowId: this.basicRows[1].id,
            focusColumnId: 'amount',
            focusRowId: this.basicRows[4].id,
          },
        ],
      },
    }));
  }

  saveView(): void {
    this.savedView.set(JSON.stringify(this.basicState()));
  }

  restoreView(): void {
    const saved = this.savedView();

    if (saved) {
      this.basicState.set(JSON.parse(saved) as NgeTableState);
    }
  }

  /** Move `quantity` in and out of the left pinned lane. */
  toggleQuantityPin(): void {
    this.pinnedState.update(state => {
      const left = state.columnPinning.left ?? [];

      return {
        ...state,
        columnPinning: {
          ...state.columnPinning,
          left: left.includes('quantity')
            ? left.filter(id => id !== 'quantity')
            : [...left, 'quantity'],
        },
      };
    });
  }

  sortExternally(columnId: string, desc: boolean): void {
    this.sortableState.update(state => ({ ...state, sorting: [{ desc, id: columnId }] }));
  }

  clearSort(): void {
    this.sortableState.update(state => ({ ...state, sorting: [] }));
  }

  exportSelected(): void {
    this.exportResult.set(this.exportDemo().exportSelected());
  }

  exportEverything(): void {
    this.exportResult.set(this.exportDemo().exportEverything());
  }

  /**
   * Clears the exported payload only — the selection has its own control.
   *
   * Two buttons rather than one because they undo different things: the demo's
   * "Clear selection" gives up the rectangles, this gives up the last export.
   */
  clearExportResult(): void {
    this.exportResult.set(null);
  }

  private readonly exportDemo =
    viewChild.required<NgeTableRangeDemoComponent<NgeTableFixtureRow>>('exportDemo');
}
