import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableConfig } from '../../../../nge-table-config';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { ngeWholeColumnRange } from '../../../../range';
import { NgeTableFillDemoComponent } from '../fill-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Each section owns its own copy, because a fill mutates the array it is handed. */
function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * The fill handle, driven — and driving it is the only way to see any of it.
 *
 * ⚠️ **The claim this page exists to demonstrate is a NEGATIVE one:** the table changes
 * nothing on its own. Every fill you see land below happens because the demo component
 * wrapping each table listens for `fill-intent` and writes its own rows. Section 5
 * turns that listener off, and the same drag produces the same event and no change at
 * all — which is the contract, not a bug.
 *
 * jsdom exercises none of this: no pointer capture, no auto-scroll, no `touch-action`.
 * This page is the acceptance evidence.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-fill-handle-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableFillDemoComponent],
  selector: 'nge-table-fill-handle-interaction-stories',
  standalone: true,
  styleUrl: './fill-handle-interaction-stories.component.scss',
  templateUrl: './fill-handle-interaction-stories.component.html',
})
export class NgeTableFillHandleInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/fill-handle/interaction';

  // 1 — copy fill
  readonly copyRows = signal(seed(12));
  readonly copyState = signal<NgeTableState>(createNgeTableState());

  // 2 — linear series
  readonly seriesRows = signal(seed(12));
  readonly seriesState = signal<NgeTableState>(createNgeTableState());

  // 3 — backwards, and sideways
  readonly directionRows = signal(seed(12));
  readonly directionState = signal<NgeTableState>(createNgeTableState());

  // 4 — cancel and no-op
  readonly cancelRows = signal(seed(12));
  readonly cancelState = signal<NgeTableState>(createNgeTableState());

  // 5 — a host that ignores the intent
  readonly inertRows = signal(seed(12));
  readonly inertState = signal<NgeTableState>(createNgeTableState());

  // 6 — the fill follows the view
  readonly sortedRows = signal(seed(12));
  readonly sortedState = signal<NgeTableState>(createNgeTableState());

  // 7 — a column that opts out
  readonly optOutRows = signal(seed(12));
  readonly optOutState = signal<NgeTableState>(createNgeTableState());

  /**
   * `status` refuses to be a fill target while staying perfectly usable as a source.
   *
   * Namespaced under `ngeFill` beside ARCH-248's `ngeExport`, because `ColumnMeta` is
   * one globally-merged interface every addon shares.
   */
  readonly optOutConfig: Partial<NgeTableConfig<NgeTableFixtureRow>> = {
    columns: NGE_TABLE_FIXTURE_COLUMNS.map(column =>
      column.id === 'status' ? { ...column, meta: { ngeFill: { enabled: false } } } : column
    ),
  };

  // 8 — no handle on a whole-column range
  readonly wholeColumnRows = signal(seed(12));

  /**
   * Seeded with a whole-column mark rather than asking the reviewer to press
   * cmd/ctrl-A.
   *
   * ⚠️ **Every table on this page passes `selectAllOnModifierA: false`**, because the
   * listener is on the document and nine of them would fight over the key. Seeding the
   * shape cmd/ctrl-A produces demonstrates the same fact without that conflict — and
   * the shape is the point: two `null` row endpoints, naming no record.
   */
  readonly wholeColumnState = signal<NgeTableState>(
    createNgeTableState({ ngeRange: { ranges: [ngeWholeColumnRange('quantity')] } })
  );

  // 9 — ten thousand rows
  readonly virtualRows = signal(
    createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large }).map(row => ({ ...row }))
  );
  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  readonly virtualConfig: Partial<NgeTableConfig<NgeTableFixtureRow>> = {
    enableVirtualization: true,
  };

  sortExternally(): void {
    this.sortedState.update(state => ({ ...state, sorting: [{ desc: true, id: 'amount' }] }));
  }

  clearSort(): void {
    this.sortedState.update(state => ({ ...state, sorting: [] }));
  }
}
