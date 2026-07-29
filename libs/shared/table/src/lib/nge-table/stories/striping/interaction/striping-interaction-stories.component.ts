import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
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
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Ten thousand rows — where "a stripe stays with its row" becomes falsifiable. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * Zebra striping, driven — and three of these examples say nothing until it is.
 *
 * Striping is the smallest feature in the library and the one whose two obvious
 * implementations both look correct in a screenshot. Examples 2 and 3 are the
 * ones that separate them: a `:nth-child` stripe passes a static screenshot and
 * fails a scroll, and a stripe keyed on the engine's `row.index` passes both and
 * fails a sort. Neither is reachable from jsdom, which lays nothing out and
 * therefore renders no virtual window at all.
 *
 * Examples 4 to 7 are the other half of the story: a stripe has to LOSE to every
 * mark. It never declares `background` — it only swaps the value the row's own
 * background already resolves through — so hover and selection keep beating that
 * declaration exactly as they did before striping existed. The cell-level marks
 * were never in the contest at all, a cell being a rendering descendant of its
 * row.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-striping-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent],
  selector: 'nge-table-striping-interaction-stories',
  standalone: true,
  styleUrl: './striping-interaction-stories.component.scss',
  templateUrl: './striping-interaction-stories.component.html',
})
export class NgeTableStripingInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/striping/interaction';

  // ============================================
  // EXAMPLE 1: The flag, on and off
  // ============================================
  //
  // The acceptance criterion that is easiest to state and easiest to skip: with
  // the flag off, the table must render exactly as it did before the feature
  // existed. Toggle the Storybook control and only the alternate rows move.

  readonly enableStriping = input<boolean>(true);

  readonly toggleConfig = computed(() =>
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: rows,
      enableStriping: this.enableStriping(),
      getRowId: row => row.id,
    })
  );

  // ============================================
  // EXAMPLE 2: A stripe survives a virtualized scroll
  // ============================================
  //
  // ⚠️ The example the whole implementation is shaped around. The DOM holds a
  // recycled window of about thirty rows out of ten thousand, and Angular's
  // `@for` reorders those nodes as the window slides — so `:nth-child` tracks
  // SCREEN POSITION, not the row. Under a `:nth-child` stripe the bands would
  // stand still while the rows travelled through them.
  //
  // Scroll slowly, one row at a time, and watch a single row: its stripe goes
  // with it. Scroll to the bottom and back and the pattern is unchanged.

  readonly virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableStriping: true,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  // ============================================
  // EXAMPLE 3: A sort re-stripes the rows
  // ============================================
  //
  // Parity is the row's place in the PROCESSED row model, so sorting re-cuts it
  // and the stripes come back out alternating. TanStack's own `row.index` is the
  // position in `config.data` and is copied through the sorted model unchanged,
  // so a stripe keyed on it would scatter into an arbitrary pattern here — the
  // one failure mode that survives a scroll and still ships broken.
  //
  // Click the "Name" header and the banding stays regular.

  readonly sortConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableStriping: true,
    getRowId: row => row.id,
  });

  readonly sortState = signal<NgeTableState>(createNgeTableState());

  readonly sortDescription = computed(() => {
    const [sort] = this.sortState().sorting;

    return sort ? `${sort.id} ${sort.desc ? 'descending' : 'ascending'}` : '(unsorted)';
  });

  // ============================================
  // EXAMPLE 4: Hover outranks the stripe
  // ============================================
  //
  // `.nge-table__row:hover` scores (0,2,0) against the stripe's (0,1,0), and the
  // stripe declares no `background` at all, so the hover surface wins outright.
  // Run the pointer down the table: every row lifts by the same amount, and an
  // alternate row is not "already hovered" nor immune to it.

  readonly hoverConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableStriping: true,
    getRowId: row => row.id,
  });

  // ============================================
  // EXAMPLE 5: Selection outranks the stripe
  // ============================================
  //
  // The case a naive implementation gets wrong, and it only shows on alternate
  // rows: select an odd row and an even one, and both must read as equally
  // selected. A stripe that out-ranked selection would leave every other
  // selected row looking untouched.

  readonly selectionConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    enableStriping: true,
    getRowId: row => row.id,
  });

  readonly selectionState = signal<NgeTableState>(createNgeTableState());

  readonly selectedCount = computed(() => Object.keys(this.selectionState().rowSelection).length);

  // ============================================
  // EXAMPLE 6: One band across three lanes
  // ============================================
  //
  // The pinned lanes are `position: sticky` and opaque by requirement, so they
  // scroll OVER the center lane and would hide the row's own surface. They read
  // the same resolved property by inheritance, which is what keeps a striped row
  // one continuous band rather than three.
  //
  // Scroll horizontally with the container narrowed: the stripe stays unbroken
  // across the pinned-left, center and pinned-right seams.

  readonly pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enablePinning: true,
    enableStriping: true,
    getRowId: row => row.id,
  });

  readonly pinnedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
  );

  // ============================================
  // EXAMPLE 7: All of it at once
  // ============================================
  //
  // Ten thousand rows, striped, virtualized, pinned and selectable together —
  // every axis the stripe has to survive, composed. Select a few rows near the
  // top, scroll to the bottom and back, then scroll sideways: the marks stay on
  // their records, the stripes stay on their rows, and the bands stay unbroken.

  readonly composedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enablePinning: true,
    enableRowSelection: true,
    enableStriping: true,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  readonly composedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
  );

  readonly composedSelectedCount = computed(
    () => Object.keys(this.composedState().rowSelection).length
  );

  onSortState(next: NgeTableState): void {
    this.sortState.set(next);
  }

  onSelectionState(next: NgeTableState): void {
    this.selectionState.set(next);
  }

  onPinnedState(next: NgeTableState): void {
    this.pinnedState.set(next);
  }

  onComposedState(next: NgeTableState): void {
    this.composedState.set(next);
  }

  /** Select the first three rows from outside, so the composition is visible immediately. */
  selectFirstThree(): void {
    this.composedState.update(state => ({
      ...state,
      rowSelection: Object.fromEntries(largeRows.slice(0, 3).map(row => [row.id, true])),
    }));
  }

  clearComposedSelection(): void {
    this.composedState.update(state => ({ ...state, rowSelection: {} }));
  }
}
