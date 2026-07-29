import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID } from '../../../store';
import { NgeTableShowcaseDemoComponent } from '../showcase-demo-table.component';

/** A private copy per instance, so an edit in one section leaves the other alone. */
function seed(count: number): NgeTableFixtureRow[] {
  return createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small })
    .slice(0, count)
    .map(row => ({ ...row }));
}

/**
 * How `NgeTableShowcaseDemoComponent` is put together, as documentation.
 *
 * Every section below reads a real excerpt of that component's own source —
 * there is nothing to author here, because the composition being explained
 * lives one file over. Both live tables are the ARGUMENT for that: what runs
 * above a section is exactly the code quoted in it, since the demo component
 * is the code.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-showcase-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableShowcaseDemoComponent],
  selector: 'nge-table-showcase-usage-stories',
  standalone: true,
  styleUrl: './showcase-usage-stories.component.scss',
  templateUrl: './showcase-usage-stories.component.html',
})
export class NgeTableShowcaseUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/showcase/usage';

  // ⚠️ Section 1 is the FULL table — ten thousand rows, virtualized, with a chart
  // in every row's detail band. It leads the page deliberately: the first thing a
  // reader meets should be the thing the library is being shown off for, at the
  // scale it is claimed to work at, rather than a twelve-row miniature they have
  // to take on trust. Everything below it is small on purpose — those sections
  // teach one seam each, and scale would only get in the way.
  readonly basicRows = signal(createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large }));

  // ⚠️ The two INJECTED columns are pinned explicitly. Pinning is a separate axis
  // from `applyInjectedColumnOrder`, so omitting them leaves the chevron and the
  // checkbox in the scrolling centre lane — the row's own controls scroll away
  // while a data column stays pinned. § 4 of this story explains it.
  readonly basicState = signal<NgeTableState>(
    createNgeTableState({
      columnPinning: {
        left: [NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID, 'name'],
        right: ['createdAt'],
      },
    })
  );

  // Section 9's export pair gets its own table so a download from one section
  // never reads as depending on what a reviewer did in another.
  readonly exportRows = signal(seed(10));

  readonly exportState = signal<NgeTableState>(createNgeTableState());
}
