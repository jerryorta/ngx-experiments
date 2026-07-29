import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableEditorsDemoComponent } from '../editors-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * How a consumer adopts the table's own editors — the documentation facet.
 *
 * Each section's code block is the code running above it. A usage story whose
 * snippet has drifted from its example is worse than no snippet.
 *
 * ⚠️ **No example imports `@tanstack/*`.** That insulation is what keeps a future
 * v9 migration internal to the library, and an editor does not weaken it: a column
 * names a component and the adapter is never mentioned.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-editors-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableEditorsDemoComponent],
  selector: 'nge-table-cell-editors-usage-stories',
  standalone: true,
  styleUrl: './cell-editors-usage-stories.component.scss',
  templateUrl: './cell-editors-usage-stories.component.html',
})
export class NgeTableCellEditorsUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-editors/usage';

  // 1 — naming an editor on a column
  readonly basicRows = signal(seed(6));
  readonly basicState = signal<NgeTableState>(createNgeTableState());

  // 3 — the boolean column
  readonly booleanRows = signal(seed(6));
  readonly booleanState = signal<NgeTableState>(createNgeTableState());

  // 5 — shadowing with a template of your own
  readonly overrideRows = signal(seed(6));
  readonly overrideState = signal<NgeTableState>(createNgeTableState());
}
