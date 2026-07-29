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
import { NgeTableRangeDemoComponent } from '../../cell-range/range-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Ten thousand rows — where "selects the cells nobody has scrolled to" is falsifiable. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * Column selection, driven — and the page where this story's central design decision
 * is actually checked.
 *
 * **A header click already toggles the sort.** Two gestures therefore share one
 * element, and the resolution is a dedicated affordance: a thin strip on the header's
 * **leading** edge, transparent at rest and revealed on hover, the same bargain
 * ARCH-244's resize grip strikes. Both gestures stay unmodified, so `shift` and
 * `cmd`/`ctrl` mean here exactly what ARCH-269 already made them mean.
 *
 * ⚠️ **A selected column is not a new concept.** It is an ordinary `NgeCellRange`
 * with its row endpoints set to `null` — "every row of the view" rather than a span
 * between the two records that happened to be first and last. That is why the body
 * overlay paints it with nothing extra wired, why the export predicate covers it, and
 * why a sort cannot shrink it.
 *
 * ⚠️ Every table is wrapped in its own `<nge-table-range-demo>`. A range is
 * **per-table** — the providers create one bridge per injector — so several tables in
 * one injector would share one bridge and a gesture in the first section would resolve
 * against the last section's table.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-column-selection-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableRangeDemoComponent],
  selector: 'nge-table-column-selection-interaction-stories',
  standalone: true,
  styleUrl: './column-selection-interaction-stories.component.scss',
  templateUrl: './column-selection-interaction-stories.component.html',
})
export class NgeTableColumnSelectionInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/column-selection/interaction';

  // ============================================
  // EXAMPLE 1: Click the strip
  // ============================================
  /**
   * ⚠️ `getRowId` is **mandatory** here, not merely advisable.
   *
   * A whole-column mark names no record, so this looks like the one case that could
   * do without it — but the moment the user shift-clicks into the body, or a saved
   * view carries a cell rectangle, the ids are load-bearing again. The check sits on
   * the first write and fails loudly under `ngDevMode`.
   */
  basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly basicRows = rows.slice(0, 12);

  readonly basicState = signal<NgeTableState>(createNgeTableState());

  /** The slice itself — four strings for a column of any height. */
  readonly basicRangeJson = computed(() =>
    JSON.stringify(this.basicState().ngeRange ?? null, null, 2)
  );

  // ============================================
  // EXAMPLE 2: The strip selects, the header still sorts
  // ============================================
  /**
   * ⚠️ **Resizing is on here, and it is the point of this section rather than
   * decoration.** The header is the crowded element — sort indicator, resize grip,
   * and now a selection strip — and the ticket's constraint is that the new
   * affordance must not clip the grip or collide with a slotted control. The two live
   * at opposite ends: the grip half-overhangs the **trailing** edge, the strip owns
   * the **leading** one. Drag a boundary and click a strip on the same header to see
   * that neither takes the other's gesture.
   */
  sortConflictConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enableColumnResizing: true,
    getRowId: row => row.id,
  });

  readonly sortConflictRows = rows.slice(0, 12);

  readonly sortConflictState = signal<NgeTableState>(createNgeTableState());

  /** Both gestures' state side by side — the evidence that neither triggers the other. */
  readonly sortConflictJson = computed(() =>
    JSON.stringify(
      {
        ngeRange: this.sortConflictState().ngeRange ?? null,
        sorting: this.sortConflictState().sorting,
      },
      null,
      2
    )
  );

  // ============================================
  // EXAMPLE 3: shift takes the span of columns
  // ============================================
  spanConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly spanRows = rows.slice(0, 12);

  readonly spanState = signal<NgeTableState>(createNgeTableState());

  readonly spanRangeJson = computed(() =>
    JSON.stringify(this.spanState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 4: cmd/ctrl toggles a disjoint column
  // ============================================
  disjointConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly disjointRows = rows.slice(0, 12);

  readonly disjointState = signal<NgeTableState>(createNgeTableState());

  /** How many disjoint columns are held — the reason `ranges` is an array. */
  readonly disjointCount = computed(() => this.disjointState().ngeRange?.ranges.length ?? 0);

  readonly disjointRangeJson = computed(() =>
    JSON.stringify(this.disjointState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 5: The keyboard route
  // ============================================
  keyboardConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly keyboardRows = rows.slice(0, 12);

  readonly keyboardState = signal<NgeTableState>(createNgeTableState());

  readonly keyboardRangeJson = computed(() =>
    JSON.stringify(this.keyboardState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 6: A sort cannot shrink it
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
  // EXAMPLE 7: Pinned columns and visual order
  // ============================================
  pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly pinnedRows = rows.slice(0, 12);

  readonly pinnedState = signal<NgeTableState>(createNgeTableState());

  /** Whether `status` currently sits in the left lane — the section's toggle. */
  readonly statusPinned = computed(() =>
    (this.pinnedState().columnPinning.left ?? []).includes('status')
  );

  // ============================================
  // EXAMPLE 8: Ten thousand rows
  // ============================================
  /**
   * The scalability claim, as something a reviewer can read off the page.
   *
   * Select a column, scroll to row 9,000, and every cell is selected there too —
   * because membership is a predicate over a descriptor rather than a map of cells.
   * Enumerating one column of this table would be roughly 270 KB of JSON re-emitted
   * on every `stateChange`; the readout below shows what it costs instead.
   */
  virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  readonly virtualRows = largeRows;

  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  readonly virtualCounts = computed(() => {
    const slice = this.virtualState().ngeRange;

    return {
      bytes: JSON.stringify(slice ?? {}).length,
      ranges: slice?.ranges.length ?? 0,
    };
  });

  // ============================================
  // EXAMPLE 9: Composing with cell ranges, and exporting
  // ============================================
  exportConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
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

  /**
   * Push a whole-column mark in from outside, with no gesture at all.
   *
   * The other half of the controlled-state round trip. Note the shape: two `null`
   * row endpoints, and no row id anywhere — which is what a saved view persists and
   * why restoring one after the data has been re-fetched still selects the column
   * rather than two records that no longer exist.
   */
  seedColumn(): void {
    this.basicState.update(state => ({
      ...state,
      ngeRange: {
        ranges: [
          {
            anchorColumnId: 'amount',
            anchorRowId: null,
            focusColumnId: 'amount',
            focusRowId: null,
          },
        ],
      },
    }));
  }

  sortExternally(columnId: string, desc: boolean): void {
    this.sortableState.update(state => ({ ...state, sorting: [{ desc, id: columnId }] }));
  }

  clearSort(): void {
    this.sortableState.update(state => ({ ...state, sorting: [] }));
  }

  /** Move `status` in and out of the left pinned lane. */
  toggleStatusPin(): void {
    this.pinnedState.update(state => {
      const left = state.columnPinning.left ?? [];

      return {
        ...state,
        columnPinning: {
          ...state.columnPinning,
          left: left.includes('status') ? left.filter(id => id !== 'status') : [...left, 'status'],
        },
      };
    });
  }

  exportSelected(): void {
    this.exportResult.set(this.exportDemo().exportSelected());
  }

  exportEverything(): void {
    this.exportResult.set(this.exportDemo().exportEverything());
  }

  clearExportResult(): void {
    this.exportResult.set(null);
  }

  private readonly exportDemo =
    viewChild.required<NgeTableRangeDemoComponent<NgeTableFixtureRow>>('exportDemo');
}
