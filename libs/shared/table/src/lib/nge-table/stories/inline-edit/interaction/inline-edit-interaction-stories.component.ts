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
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * Driving inline editing — **the primary facet**, because almost nothing here is
 * visible at rest.
 *
 * A screenshot of an editable table and a screenshot of a read-only one are the same
 * picture: activation is the default, so a cell that can be edited looks exactly like a
 * cell that cannot until someone engages it. Every section below therefore asks the
 * reviewer to *do* something, and says what should happen.
 *
 * ⚠️ **Several of these cannot be checked by automation at all.** An untrusted event
 * triggers no browser default, so a scripted `Space` never types a character and a
 * scripted drag never selects text; and an automation tab is `visibilityState: 'hidden'`,
 * which suspends `requestAnimationFrame` so zoneless change detection never flushes —
 * activation would look broken when it is not. These sections are for a human in a
 * foregrounded tab.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-inline-edit-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableEditDemoComponent],
  selector: 'nge-table-inline-edit-interaction-stories',
  standalone: true,
  styleUrl: './inline-edit-interaction-stories.component.scss',
  templateUrl: './inline-edit-interaction-stories.component.html',
})
export class NgeTableInlineEditInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/inline-edit/interaction';

  // 1 — activation, the default
  readonly activateRows = signal(seed(8));
  readonly activateState = signal<NgeTableState>(createNgeTableState());

  // 2 — a host that ignores the intent
  readonly ignoreRows = signal(seed(8));
  readonly ignoreState = signal<NgeTableState>(createNgeTableState());

  // 3 — always-live, and the role-based control the guard exists for
  readonly sliderRows = signal(seed(8));
  readonly sliderState = signal<NgeTableState>(createNgeTableState());

  // 4 — the keyboard collisions, with selection and cell ranges both switched on
  readonly keyboardRows = signal(seed(10));
  readonly keyboardState = signal<NgeTableState>(createNgeTableState());

  // 5 — scrolling an in-progress edit out of the window
  readonly virtualRows = signal(largeRows.slice(0, 2000).map(row => ({ ...row })));
  readonly virtualState = signal<NgeTableState>(createNgeTableState());
}
