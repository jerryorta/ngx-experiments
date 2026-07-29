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

/**
 * Theming the zebra surface — which is one token, so nearly all of this story
 * lives in its SCSS.
 *
 * `NgeTableConfig` has no `theme` field: the table themes exclusively through
 * `--nge-table-*`, so every section below is a scoped wrapper class setting the
 * property, which is exactly what a consumer writes. Striping changes nothing
 * about configuration, so most sections reuse one config — only the sections
 * needing a capability switched on (pinning, selection) carry their own.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-striping-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent],
  selector: 'nge-table-striping-theming',
  standalone: true,
  styleUrl: './striping-theming.component.scss',
  templateUrl: './striping-theming.component.html',
})
export class NgeTableStripingThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/striping/theming';

  /** Reused by every section that needs nothing switched on. */
  readonly baseConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableStriping: true,
    getRowId: row => row.id,
  });

  /** The pinned lanes have their own opacity requirement worth theming against. */
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

  /** Selection, so the stripe can be seen losing to a themed mark. */
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
