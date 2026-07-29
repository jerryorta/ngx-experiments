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
import { NgeTableHighlightDemoComponent } from '../highlight-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/**
 * How to adopt cell highlighting, as documentation.
 *
 * The interaction story is where the feature is *driven*; this one is where the
 * three lines it takes to switch on are written down. Every snippet below is the
 * code actually running beside it, and no example imports `@tanstack/*` — that
 * insulation is what lets the engine move to v9 without touching an application
 * file.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-highlight-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableHighlightDemoComponent],
  selector: 'nge-table-highlight-usage-stories',
  standalone: true,
  styleUrl: './highlight-usage-stories.component.scss',
  templateUrl: './highlight-usage-stories.component.html',
})
export class NgeTableHighlightUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/highlight/usage';

  /** One config for every example — highlighting changes nothing about configuration. */
  config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 8),
    getRowId: row => row.id,
  });

  readonly exampleRows = rows.slice(0, 8);

  readonly state = signal<NgeTableState>(createNgeTableState());

  readonly stateJson = computed(() => JSON.stringify(this.state().ngeHighlight ?? null, null, 2));
}
