import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableEditDemoComponent } from '../edit-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * How a consumer switches inline editing on, and what they owe it.
 *
 * Two lines of integration — a column meta key and a `[ngeCell]` template — and one
 * obligation that is not optional: **the host applies the change, because the library
 * owns no data.** That obligation is the subject of this page, the same way it is for
 * ARCH-271's fill handle.
 *
 * ⚠️ No example imports `@tanstack/*`.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-inline-edit-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableEditDemoComponent],
  selector: 'nge-table-inline-edit-usage-stories',
  standalone: true,
  styleUrl: './inline-edit-usage-stories.component.scss',
  templateUrl: './inline-edit-usage-stories.component.html',
})
export class NgeTableInlineEditUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/inline-edit/usage';

  readonly basicRows = signal(seed(8));
  readonly basicState = signal<NgeTableState>(createNgeTableState());

  readonly undoRows = signal(seed(8));
  readonly undoState = signal<NgeTableState>(createNgeTableState());

  readonly liveRows = signal(seed(8));
  readonly liveState = signal<NgeTableState>(createNgeTableState());
}
