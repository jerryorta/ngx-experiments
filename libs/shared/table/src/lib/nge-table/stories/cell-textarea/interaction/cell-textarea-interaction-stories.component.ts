import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableTextareaDemoComponent } from '../textarea-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/** A private copy per section, so editing one table leaves the others alone. */
function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * Driving `<nge-cell-textarea>` — **the primary facet**, and for this editor almost
 * the only one.
 *
 * Nothing this story is about is visible at rest. The panel does not exist until the
 * cell is activated, and every property that took the work is about what *does not*
 * happen: Cancel proposes nothing, blur proposes nothing, an outside click on a dirty
 * draft changes nothing, and a wheel over the backdrop moves nothing. A screenshot of
 * this table and a screenshot of a plain one are the same picture.
 *
 * ⚠️ **Negatives need readouts, or they are not evidence.** Every section below shows
 * the last `edit-intent` — and several show `state.ngeRange` — because "the table
 * proposed nothing" and "the wiring was never connected" look identical on screen.
 * ARCH-250's lesson, which this epic keeps re-learning.
 *
 * ⚠️ **Several of these cannot be checked by automation at all.** An untrusted event
 * triggers no browser default, so a scripted drag never selects and a scripted wheel
 * does not scroll; and an automation tab is `visibilityState: 'hidden'`, which suspends
 * `requestAnimationFrame` so zoneless change detection never flushes — an open panel
 * would look broken when it is not. Drive these by hand.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-textarea-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableTextareaDemoComponent],
  selector: 'nge-table-cell-textarea-interaction-stories',
  standalone: true,
  styleUrl: './cell-textarea-interaction-stories.component.scss',
  templateUrl: './cell-textarea-interaction-stories.component.html',
})
export class NgeTableCellTextareaInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-textarea/interaction';

  // 1 — Apply is the only commit
  readonly applyRows = signal(seed(6));
  readonly applyState = signal<NgeTableState>(createNgeTableState());

  // 2 — Cancel proposes nothing
  readonly cancelRows = signal(seed(6));
  readonly cancelState = signal<NgeTableState>(createNgeTableState());

  // 3 — a host that ignores the intent, so "proposed" and "applied" stay distinct
  readonly ignoreRows = signal(seed(6));
  readonly ignoreState = signal<NgeTableState>(createNgeTableState());

  // 4 — blur proposes nothing, by all three routes
  readonly blurRows = signal(seed(6));
  readonly blurState = signal<NgeTableState>(createNgeTableState());

  // 5 — a dirty draft survives an outside click; a clean one does not detain the user
  readonly dirtyRows = signal(seed(6));
  readonly dirtyState = signal<NgeTableState>(createNgeTableState());

  /**
   * 6 — the section this story exists for: scrolling cannot destroy a draft.
   *
   * ⚠️ **2,000 rows and a short viewport are load-bearing.** The claim is that the
   * backdrop stops the edited row leaving the virtualized window; a section that could
   * not scroll in the first place would demonstrate nothing at all, which is the trap
   * the theming guidance records for the pinning sections.
   */
  readonly virtualRows = signal(largeRows.slice(0, 2000).map(row => ({ ...row })));
  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  // 7 — keyboard, with cell ranges on so Escape's containment is observable
  readonly keyboardRows = signal(seed(8));
  readonly keyboardState = signal<NgeTableState>(createNgeTableState());

  // 8 — a range drag started on the trigger selects no cells
  readonly dragRows = signal(seed(8));
  readonly dragState = signal<NgeTableState>(createNgeTableState());

  // 9 — a projected template beating the library editor
  readonly overrideRows = signal(seed(6));
  readonly overrideState = signal<NgeTableState>(createNgeTableState());

  // 10 — the declared options, so a column can shape the field
  readonly optionsRows = signal(seed(6));
  readonly optionsState = signal<NgeTableState>(createNgeTableState());
}
