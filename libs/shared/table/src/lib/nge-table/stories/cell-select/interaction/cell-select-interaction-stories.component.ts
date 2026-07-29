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
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/** A private copy per section, so editing one table leaves the others alone. */
function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * Driving `<nge-cell-select>` — **the primary facet**, and more so here than for the
 * other two editors.
 *
 * Nothing this story is about is visible at rest: the panel does not exist until the
 * user opens it, and the three properties that took the work — it is not clipped, it
 * closes on scroll, and its `Escape` does not reach the cell range — are each about
 * what happens to an overlay that only exists mid-gesture. A screenshot of this table
 * and a screenshot of a plain one are the same picture.
 *
 * ⚠️ **Several of these cannot be checked by automation at all.** An untrusted event
 * triggers no browser default, so a scripted drag never selects; and an automation tab
 * is `visibilityState: 'hidden'`, which suspends `requestAnimationFrame` so zoneless
 * change detection never flushes — an open panel would look broken when it is not.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-select-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableSelectDemoComponent],
  selector: 'nge-table-cell-select-interaction-stories',
  standalone: true,
  styleUrl: './cell-select-interaction-stories.component.scss',
  templateUrl: './cell-select-interaction-stories.component.html',
})
export class NgeTableCellSelectInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-select/interaction';

  // 1 — the select, with no template written
  readonly basicRows = signal(seed(8));
  readonly basicState = signal<NgeTableState>(createNgeTableState());

  // 2 — the panel overhanging a cell that still clips its own content
  readonly clippingRows = signal(seed(4));
  readonly clippingState = signal<NgeTableState>(createNgeTableState());

  // 3 — scrolling a virtualized table with a panel open
  readonly virtualRows = signal(largeRows.slice(0, 2000).map(row => ({ ...row })));
  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  // 4 — the two-stage Escape, with cell ranges switched on
  readonly escapeRows = signal(seed(10));
  readonly escapeState = signal<NgeTableState>(createNgeTableState());

  // 5 — a range drag started on the trigger
  readonly dragRows = signal(seed(10));
  readonly dragState = signal<NgeTableState>(createNgeTableState());

  // 6 — keyboard: arrows, Home/End, type-ahead, disabled skipping
  readonly keyboardRows = signal(seed(8));
  readonly keyboardState = signal<NgeTableState>(createNgeTableState());

  // 7 — a projected template beating the library editor
  readonly overrideRows = signal(seed(8));
  readonly overrideState = signal<NgeTableState>(createNgeTableState());

  // 8 — a host that ignores the intent
  readonly ignoreRows = signal(seed(8));
  readonly ignoreState = signal<NgeTableState>(createNgeTableState());

  // 9 — the other trade: left on activation
  readonly activatedRows = signal(seed(8));
  readonly activatedState = signal<NgeTableState>(createNgeTableState());
}
