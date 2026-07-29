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
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * Zebra striping as a consumer meets it: one flag, one token, and two
 * properties worth knowing before switching it on.
 *
 * The interaction story is where striping is verified; this one documents the
 * surface. No example here imports `@tanstack/*` — a consumer sees
 * `NgeTableConfig` and the `nge`-prefixed surface only.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-striping-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent],
  selector: 'nge-table-striping-usage-stories',
  standalone: true,
  styleUrl: './striping-usage-stories.component.scss',
  templateUrl: './striping-usage-stories.component.html',
})
export class NgeTableStripingUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/striping/usage';

  /** 1. The flag, and nothing else. */
  readonly basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableStriping: true,
    getRowId: row => row.id,
  });

  /** 2. The default — unchanged from before the feature existed. */
  readonly plainConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  /** 4. Striping over a windowed row model. */
  readonly virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableStriping: true,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  /** 5. Striping across the three lanes. */
  readonly pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enablePinning: true,
    enableStriping: true,
    getRowId: row => row.id,
  });

  readonly pinnedState = createNgeTableState({
    columnPinning: { left: ['name'], right: ['owner'] },
  });

  /** 6. Striping under a mark. */
  readonly selectableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    enableStriping: true,
    getRowId: row => row.id,
  });

  readonly selectedState = createNgeTableState({
    rowSelection: { [rows[1].id]: true, [rows[4].id]: true },
  });
}
