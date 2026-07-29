import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableFillDemoComponent } from '../fill-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * How a consumer switches the fill handle on, and what they owe it.
 *
 * The integration is one more component in the `cell-overlay` template — but unlike
 * every other feature in this library, **switching it on is not enough**. The host has
 * to listen for `fill-intent` and apply it, because the library owns no data. That
 * obligation is the subject of this page.
 *
 * ⚠️ No example imports `@tanstack/*`.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-fill-handle-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableFillDemoComponent],
  selector: 'nge-table-fill-handle-usage-stories',
  standalone: true,
  styleUrl: './fill-handle-usage-stories.component.scss',
  templateUrl: './fill-handle-usage-stories.component.html',
})
export class NgeTableFillHandleUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/fill-handle/usage';

  readonly basicRows = signal(seed(10));
  readonly basicState = signal<NgeTableState>(createNgeTableState());

  readonly undoRows = signal(seed(10));
  readonly undoState = signal<NgeTableState>(createNgeTableState());
}
