import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableSelectDemoComponent } from '../select-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** A private copy per section, so editing one table leaves the others alone. */
function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * How a column declares a select editor, as documentation.
 *
 * The counterpart to the interaction story: that one is about what happens when you
 * drive the control, this one is about the four lines a consumer writes to get it.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-select-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableSelectDemoComponent],
  selector: 'nge-table-cell-select-usage-stories',
  standalone: true,
  styleUrl: './cell-select-usage-stories.component.scss',
  templateUrl: './cell-select-usage-stories.component.html',
})
export class NgeTableCellSelectUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-select/usage';

  readonly basicRows = signal(seed(6));
  readonly basicState = signal<NgeTableState>(createNgeTableState());

  readonly intentRows = signal(seed(6));
  readonly intentState = signal<NgeTableState>(createNgeTableState());

  readonly overrideRows = signal(seed(6));
  readonly overrideState = signal<NgeTableState>(createNgeTableState());
}
