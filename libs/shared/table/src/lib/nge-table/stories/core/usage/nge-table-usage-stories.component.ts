import { CurrencyPipe } from '@angular/common';
import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeCellDirective, NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-usage-stories',
  },
  imports: [
    CurrencyPipe,
    NgeCellDirective,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  selector: 'nge-table-usage-stories',
  standalone: true,
  styleUrl: './nge-table-usage-stories.component.scss',
  templateUrl: './nge-table-usage-stories.component.html',
})
export class NgeTableUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/core/usage';

  // ============================================
  // EXAMPLE 1: Basic Usage
  // ============================================
  basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
  });

  // ============================================
  // EXAMPLE 2: Custom Geometry
  // ============================================
  roomyConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 8),
    headerHeight: 56,
    rowHeight: 64,
  });

  // ============================================
  // EXAMPLE 3: Sorting Off
  // ============================================
  readOnlyConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 8),
    enableSorting: false,
  });

  // ============================================
  // EXAMPLE 4: Stable Row Identity
  // ============================================
  identifiedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 8),
    getRowId: row => row.id,
  });

  // ============================================
  // EXAMPLE 5: Empty State
  // ============================================
  emptyConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: [],
  });

  // ============================================
  // EXAMPLE 6: Three pinned-left columns
  // ============================================
  /**
   * The config half of pinning: switch the capability on. Which columns are
   * actually frozen is state, not config, because it is something a user changes.
   */
  pinnableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 10),
    enablePinning: true,
  });

  readonly threePinnedLeft = createNgeTableState({
    columnPinning: { left: ['name', 'status', 'quantity'] },
  });

  // ============================================
  // EXAMPLE 7: Both edges at once
  // ============================================
  readonly bothEdgesPinned = createNgeTableState({
    columnPinning: { left: ['name', 'status'], right: ['amount'] },
  });

  // ============================================
  // EXAMPLE 8: Pinning switched off
  // ============================================
  /** Same columns and rows as example 7, with the capability withheld. */
  unpinnableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 6),
    enablePinning: false,
  });

  // ============================================
  // EXAMPLE 9: Resizable columns
  // ============================================
  /**
   * Resizing is off by default — a table that silently let every column be
   * dragged would be a surprise, not a feature. `quantity` shows per-column
   * bounds overriding the library's 60–800px defaults.
   */
  resizableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.map(column =>
      column.id === 'quantity' ? { ...column, maxSize: 160, minSize: 80 } : column
    ),
    data: rows.slice(0, 8),
    enableColumnResizing: true,
  });

  // ============================================
  // EXAMPLE 10: A custom cell for one column (ARCH-246)
  // ============================================
  /**
   * Templates are looked up per column, so a table with one custom cell renders
   * its other six exactly as it did before the seam existed. `getRowId` is
   * supplied because a cell template is handed `rowId`, and without it the engine
   * keys rows by array index.
   */
  slottedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 8),
    getRowId: row => row.id,
  });

  /** The type carrier `[ngeCellOf]` binds, so `let-cell` knows its row shape. */
  readonly slottedRows = rows.slice(0, 8);

  // ============================================
  // EXAMPLE 11: The empty slot
  // ============================================
  /** Same config as example 5, so the difference on screen is the slot alone. */
  slottedEmptyConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: [],
  });

  // ============================================
  // EXAMPLE 12: Bands around the table
  // ============================================
  /** Rows kept few so the toolbar, the table and the footer all fit on screen. */
  bandedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 5),
    getRowId: row => row.id,
  });

  /** The total the footer reports — computed here because a slot renders, it does not calculate. */
  readonly bandedTotal = rows.slice(0, 5).reduce((total, row) => total + row.amount, 0);
}
