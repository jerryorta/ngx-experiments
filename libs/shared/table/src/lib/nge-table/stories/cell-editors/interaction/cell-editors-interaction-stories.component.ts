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
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/** A private copy per section, so editing one table leaves the others alone. */
function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * Driving the library's own cell editors — **the primary facet**, because nothing
 * here is visible at rest.
 *
 * Activation is the default, so a screenshot of a table with editors and a
 * screenshot of one without are the same picture. Every section asks the reviewer to
 * *do* something and says what should happen.
 *
 * ⚠️ **Several of these cannot be checked by automation at all.** An untrusted event
 * triggers no browser default, so a scripted `Space` never types a character and a
 * scripted drag never selects text; and an automation tab is
 * `visibilityState: 'hidden'`, which suspends `requestAnimationFrame` so zoneless
 * change detection never flushes — activation would look broken when it is not.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-editors-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableEditorsDemoComponent],
  selector: 'nge-table-cell-editors-interaction-stories',
  standalone: true,
  styleUrl: './cell-editors-interaction-stories.component.scss',
  templateUrl: './cell-editors-interaction-stories.component.html',
})
export class NgeTableCellEditorsInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-editors/interaction';

  // 1 — the input, with no template written
  readonly inputRows = signal(seed(8));
  readonly inputState = signal<NgeTableState>(createNgeTableState());

  // 2 — the checkbox, always live
  readonly checkboxRows = signal(seed(8));
  readonly checkboxState = signal<NgeTableState>(createNgeTableState());

  // 3 — the checkbox left on activation
  readonly activatedBoxRows = signal(seed(8));
  readonly activatedBoxState = signal<NgeTableState>(createNgeTableState());

  // 4 — a projected template beating the library editor
  readonly overrideRows = signal(seed(8));
  readonly overrideState = signal<NgeTableState>(createNgeTableState());

  // 5 — the keyboard collisions, with cell ranges switched on
  readonly keyboardRows = signal(seed(10));
  readonly keyboardState = signal<NgeTableState>(createNgeTableState());

  // 6 — scrolling an in-progress edit out of the window
  readonly virtualRows = signal(largeRows.slice(0, 2000).map(row => ({ ...row })));
  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  // 7 — a host that ignores the intent
  readonly ignoreRows = signal(seed(8));
  readonly ignoreState = signal<NgeTableState>(createNgeTableState());
}
