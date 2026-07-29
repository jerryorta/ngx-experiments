import { Component, computed, signal, viewChild, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableEvent } from '../../../../events';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Ten thousand rows — where "a selection survives a virtualized scroll" is falsifiable. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * Row selection, driven — and driving it is the only way to see any of it.
 *
 * Nine examples covering both directions of the controlled-state contract: the
 * gestures that write `state.rowSelection` (Examples 1, 2, 5) and a host writing
 * the same slice from outside (Example 3), plus the properties that only a real
 * browser can falsify — surviving a sort (4), a virtualized scroll (6), and a
 * horizontal scroll across pinned lanes (7).
 *
 * ⚠️ **Every config here supplies `getRowId`, and it is not optional decoration.**
 * Selection is id-keyed state; without a stable row identity the engine keys it by
 * array index, so Example 4's sort would leave the user's ticks sitting on
 * whichever records happened to move into those positions. The library throws in
 * dev rather than let that ship.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-selection-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent, NgeTableSlotDirective],
  selector: 'nge-table-selection-interaction-stories',
  standalone: true,
  styleUrl: './selection-interaction-stories.component.scss',
  templateUrl: './selection-interaction-stories.component.html',
})
export class NgeTableSelectionInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/selection/interaction';

  // ============================================
  // EXAMPLE 1: The three click gestures
  // ============================================

  readonly gesturesConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly gesturesState = signal<NgeTableState>(createNgeTableState());

  readonly gesturesSelectedIds = computed(() =>
    Object.keys(this.gesturesState().rowSelection).sort()
  );

  // ============================================
  // EXAMPLE 2: The header checkbox and its indeterminate state
  // ============================================

  readonly selectAllConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly selectAllState = signal<NgeTableState>(createNgeTableState());

  readonly selectAllCount = computed(() => Object.keys(this.selectAllState().rowSelection).length);

  // ============================================
  // EXAMPLE 3: The host drives the selection
  // ============================================
  //
  // The other half of the round trip, and the half a gesture never demonstrates.
  // Writing `state` from outside is deliberately SILENT — it emits no
  // `NgeTableEvent`, because an echo of the host's own write is not news.

  readonly hostDrivenConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly hostDrivenState = signal<NgeTableState>(createNgeTableState());

  // ============================================
  // EXAMPLE 4: A selection survives a sort
  // ============================================
  //
  // The ticks follow the RECORDS, not the positions — which is what id-keyed
  // state buys and what an index-keyed one would silently get wrong.

  readonly sortConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly sortState = signal<NgeTableState>(createNgeTableState());

  readonly sortSelectedNames = computed(() => {
    const selected = this.sortState().rowSelection;

    return rows.filter(row => selected[row.id]).map(row => row.name);
  });

  // ============================================
  // EXAMPLE 5: One row at a time
  // ============================================

  readonly singleConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableMultiRowSelection: false,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly singleState = signal<NgeTableState>(createNgeTableState());

  readonly singleSelectedIds = computed(() => Object.keys(this.singleState().rowSelection));

  // ============================================
  // EXAMPLE 6: Selection across a virtualized scroll
  // ============================================
  //
  // ⚠️ The example that cannot be written as a unit test — jsdom lays nothing out,
  // so it renders no virtual window at all. Virtualization recycles DOM, so a mark
  // held on an element would belong to whichever row that element is showing NOW.
  // Select rows near the top, scroll to the bottom and back, and the same records
  // are still ticked — because the mark was never on the element.

  readonly virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableRowSelection: true,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  readonly virtualCount = computed(() => Object.keys(this.virtualState().rowSelection).length);

  // ============================================
  // EXAMPLE 7: Selection and pinning together
  // ============================================
  //
  // The selection tint has to be repainted on the pinned lanes: they are `position:
  // sticky` and opaque by requirement, so they scroll OVER the center lane and
  // would otherwise hide it. Scroll horizontally with rows selected to check.

  readonly pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enablePinning: true,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly pinnedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
  );

  // ============================================
  // EXAMPLE 8: The selection-change event
  // ============================================
  //
  // A RANGE is one event, not one per row — the gesture writes the whole slice
  // once. Shift-click across five rows and exactly one line appears below.

  readonly eventConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly eventState = signal<NgeTableState>(createNgeTableState());

  readonly selectionEvents = signal<string[]>([]);

  // ============================================
  // EXAMPLE 9: Exporting exactly what the user picked
  // ============================================
  //
  // ARCH-248's reader, unchanged, reading a selection ARCH-268 now lets a user
  // make. Neither feature imports the other — they meet on the table instance.

  readonly exportConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly exportState = signal<NgeTableState>(createNgeTableState());

  readonly exportedRowCount = signal<null | number>(null);

  private readonly exportTable =
    viewChild.required<NgeTableComponent<NgeTableFixtureRow>>('exportTable');

  // ============================================
  // EXAMPLE 10: A consuming app's own control
  // ============================================
  //
  // The native checkbox is the DEFAULT, not the only option. Projecting
  // `selection-cell` / `selection-header` replaces it with whatever the consuming
  // domain ships — `dlc-checkbox`, `dlc-checkbox` — bound to a context carrying
  // `isSelected`, `canSelect`, and a `toggle` callback.
  //
  // ⚠️ The control below is a local stand-in, NOT a real design-library import,
  // and that is deliberate: `libs/shared/table` importing a domain library would
  // invert the dependency graph and drag that domain into every consumer of the
  // table. The seam under demonstration is the context and the callback, which a
  // stand-in exercises exactly as a real control would.
  //
  // `enableRowSelection` is a PREDICATE here, so archived rows report
  // `canSelect: false` and the control renders disabled rather than absent.

  readonly projectedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: row => row.status !== 'archived',
    getRowId: row => row.id,
  });

  readonly projectedState = signal<NgeTableState>(createNgeTableState());

  /**
   * The type carrier for the projected slot template.
   *
   * Never read at runtime — it exists so `TRow` has somewhere to be inferred from,
   * without which `let-selection` resolves to `NgeSelectionCellContext<unknown>`
   * and any field access on `selection.row` fails to compile. ⚠️ That failure
   * surfaces only in Storybook's own build: `shared-table` has no build target, so
   * nothing else runs `ngtsc` over a story template.
   */
  readonly fixtureRows: readonly NgeTableFixtureRow[] = rows;

  readonly projectedSelectedCount = computed(
    () => Object.keys(this.projectedState().rowSelection).length
  );

  onProjectedState(next: NgeTableState): void {
    this.projectedState.set(next);
  }

  onGesturesState(next: NgeTableState): void {
    this.gesturesState.set(next);
  }

  onSelectAllState(next: NgeTableState): void {
    this.selectAllState.set(next);
  }

  onHostDrivenState(next: NgeTableState): void {
    this.hostDrivenState.set(next);
  }

  /** Select the first three rows from outside the table. */
  selectFirstThree(): void {
    this.hostDrivenState.update(state => ({
      ...state,
      rowSelection: Object.fromEntries(rows.slice(0, 3).map(row => [row.id, true])),
    }));
  }

  /** Clear the selection from outside the table. */
  clearHostSelection(): void {
    this.hostDrivenState.update(state => ({ ...state, rowSelection: {} }));
  }

  onSortState(next: NgeTableState): void {
    this.sortState.set(next);
  }

  onSingleState(next: NgeTableState): void {
    this.singleState.set(next);
  }

  onVirtualState(next: NgeTableState): void {
    this.virtualState.set(next);
  }

  onPinnedState(next: NgeTableState): void {
    this.pinnedState.set(next);
  }

  onEventState(next: NgeTableState): void {
    this.eventState.set(next);
  }

  onEventEmitted(event: NgeTableEvent<NgeTableFixtureRow>): void {
    if (event.kind !== 'selection-change') {
      return;
    }

    const count = Object.keys(event.rowSelection).length;

    this.selectionEvents.update(seen =>
      [`selection-change — ${count} row(s)`, ...seen].slice(0, 8)
    );
  }

  onExportState(next: NgeTableState): void {
    this.exportState.set(next);
  }

  exportSelected(): void {
    this.exportedRowCount.set(
      this.exportTable().readNgeExportData({ slice: 'selected' }).rows.length
    );
  }
}
