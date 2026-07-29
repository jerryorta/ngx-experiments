import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { ngeWholeColumnRange } from '../../../../range';
import { NgeTableFillDemoComponent } from '../fill-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

function seed(): NgeTableFixtureRow[] {
  return rows.slice(0, 8).map(row => ({ ...row }));
}

/**
 * A range whose corner carries the grip, so every section shows one without a gesture.
 *
 * ⚠️ **Seeded rather than driven, and that is the one real limit of this page.** The
 * grip is visible at rest, but the *pending* outline only exists while a pointer is
 * down — no seeded state can produce it, because the target is cleared the moment a
 * drag ends. The section demonstrating those tokens says so and asks the reviewer to
 * drag.
 */
function seededSelection(): NgeTableState {
  return createNgeTableState({
    ngeRange: {
      ranges: [
        {
          anchorColumnId: 'quantity',
          anchorRowId: rows[1].id,
          focusColumnId: 'quantity',
          focusRowId: rows[3].id,
        },
      ],
    },
  });
}

/**
 * Theming the fill handle — **which is entirely SCSS**.
 *
 * ⚠️ There is no `config.theme` on `NgeTableConfig`. The table themes exclusively
 * through `--nge-table-*` custom properties, so every section is one scoped wrapper
 * class re-declaring tokens — exactly what a consuming app writes.
 *
 * ⚠️ The namespace is `--nge-table-fill-*`, not `--nge-table-range-*`: a fill is an
 * operation ON a range rather than a kind of range, and a theme will want the grip and
 * the pending outline to read differently from the selection they extend.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-fill-handle-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableFillDemoComponent],
  selector: 'nge-table-fill-handle-theming',
  standalone: true,
  styleUrl: './fill-handle-theming.component.scss',
  templateUrl: './fill-handle-theming.component.html',
})
export class NgeTableFillHandleThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/fill-handle/theming';

  readonly defaultRows = signal(seed());
  readonly defaultState = signal(seededSelection());

  readonly largeRows = signal(seed());
  readonly largeState = signal(seededSelection());

  readonly brandedRows = signal(seed());
  readonly brandedState = signal(seededSelection());

  readonly darkRows = signal(seed());
  readonly darkState = signal(seededSelection());

  readonly pendingRows = signal(seed());
  readonly pendingState = signal(seededSelection());

  /** A whole-column mark, to show the grip's absence rather than its colour. */
  readonly absentRows = signal(seed());
  readonly absentState = signal(
    createNgeTableState({ ngeRange: { ranges: [ngeWholeColumnRange('quantity')] } })
  );
}
