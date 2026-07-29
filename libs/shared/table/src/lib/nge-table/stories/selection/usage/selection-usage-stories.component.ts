import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/**
 * Row selection, as a consumer writes it.
 *
 * Two config flags and a `getRowId`; the leading checkbox column is injected by
 * the library rather than declared. **No example here imports `@tanstack/*`** —
 * that insulation is what keeps a future engine upgrade internal to the library.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-selection-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent],
  selector: 'nge-table-selection-usage-stories',
  standalone: true,
  styleUrl: './selection-usage-stories.component.scss',
  templateUrl: './selection-usage-stories.component.html',
})
export class NgeTableSelectionUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/selection/usage';

  /** 1. The whole of switching selection on. */
  readonly basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly basicState = signal<NgeTableState>(createNgeTableState());

  /** 2. One row at a time. */
  readonly singleConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableMultiRowSelection: false,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly singleState = signal<NgeTableState>(createNgeTableState());

  /** 3. A restored view — the reason selection is host-owned JSON at all. */
  readonly restoredConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly restoredState = signal<NgeTableState>(
    createNgeTableState({
      rowSelection: Object.fromEntries(rows.slice(1, 4).map(row => [row.id, true])),
      sorting: [{ desc: false, id: 'name' }],
    })
  );

  /** 4. Selection with pinning and resizing, to show it composes. */
  readonly composedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableColumnResizing: true,
    enablePinning: true,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly composedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'], right: [] } })
  );

  /** 5. Selection off — the default, and the contrast. */
  readonly plainConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
  });

  onBasicState(next: NgeTableState): void {
    this.basicState.set(next);
  }

  onSingleState(next: NgeTableState): void {
    this.singleState.set(next);
  }

  onRestoredState(next: NgeTableState): void {
    this.restoredState.set(next);
  }

  onComposedState(next: NgeTableState): void {
    this.composedState.set(next);
  }
}
