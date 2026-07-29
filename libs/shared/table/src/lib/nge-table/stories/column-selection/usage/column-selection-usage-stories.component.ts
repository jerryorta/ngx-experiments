import { Component, computed, signal, ViewEncapsulation } from '@angular/core';
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
import { NgeTableRangeDemoComponent } from '../../cell-range/range-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small }).slice(0, 12);

/**
 * How a consumer switches column selection on, and what they get.
 *
 * The whole integration is **one more projected template** on top of
 * `provideNgeCellRange()` — there is no `enableColumnSelection` flag, no second
 * provider, and no second slice. A column is a `NgeCellRange` whose row endpoints
 * are `null`, so everything already wired for cell ranges covers it.
 *
 * ⚠️ No example here imports `@tanstack/*`. A consumer sees `NgeTableConfig`,
 * `NgeTableState`, and the `nge`-prefixed surface only — the insulation that keeps
 * a future engine migration internal to the library.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-column-selection-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableRangeDemoComponent],
  selector: 'nge-table-column-selection-usage-stories',
  standalone: true,
  styleUrl: './column-selection-usage-stories.component.scss',
  templateUrl: './column-selection-usage-stories.component.html',
})
export class NgeTableColumnSelectionUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/column-selection/usage';

  readonly rows = rows;

  // ============================================
  // EXAMPLE 1: The whole integration
  // ============================================
  basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  readonly basicState = signal<NgeTableState>(createNgeTableState());

  // ============================================
  // EXAMPLE 2: The shape a selected column takes
  // ============================================
  shapeConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  readonly shapeState = signal<NgeTableState>(createNgeTableState());

  readonly shapeJson = computed(() =>
    JSON.stringify(this.shapeState().ngeRange?.ranges ?? [], null, 2)
  );

  // ============================================
  // EXAMPLE 4: Restoring a saved view
  // ============================================
  restoreConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  /**
   * Seeded from a string, exactly as a persisted view arrives.
   *
   * A whole-column mark carries no row id, so this survives a re-fetch that replaced
   * every record — which a materialised span could not.
   */
  readonly restoreState = signal<NgeTableState>(
    createNgeTableState({
      ngeRange: {
        ranges: [
          {
            anchorColumnId: 'status',
            anchorRowId: null,
            focusColumnId: 'quantity',
            focusRowId: null,
          },
        ],
      },
    })
  );

  // ============================================
  // EXAMPLE 6: Cell ranges without the header affordance
  // ============================================
  cellsOnlyConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  readonly cellsOnlyState = signal<NgeTableState>(createNgeTableState());
}
