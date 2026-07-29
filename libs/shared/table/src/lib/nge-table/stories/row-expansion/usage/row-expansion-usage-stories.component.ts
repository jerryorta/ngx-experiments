import { Component, signal, ViewEncapsulation } from '@angular/core';
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
import { NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/**
 * Row expansion, as a consumer writes it.
 *
 * The whole surface is two config fields, one slot, and a slice that was already
 * part of `NgeTableState` — which is the point of having shipped the state
 * contract whole in Wave 0. No example here imports `@tanstack/*`.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-row-expansion-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent, NgeTableSlotDirective],
  selector: 'nge-table-row-expansion-usage-stories',
  standalone: true,
  styleUrl: './row-expansion-usage-stories.component.scss',
  templateUrl: './row-expansion-usage-stories.component.html',
})
export class NgeTableRowExpansionUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/row-expansion/usage';

  /** The type carrier every `let-` binding below infers its row shape from. */
  readonly rows = rows;

  /** 1. The smallest thing that works: a flag, a `getRowId`, and a band. */
  readonly basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  });

  readonly basicState = signal<NgeTableState>(createNgeTableState());

  /** 2. A predicate over the row datum, so only some rows open. */
  readonly predicateConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: row => row.quantity > 250,
    getRowId: row => row.id,
  });

  readonly predicateState = signal<NgeTableState>(createNgeTableState());

  /** 3. A declared band height, which is what makes it compose with a window. */
  readonly sizedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowDetailHeight: 150,
  });

  readonly sizedState = signal<NgeTableState>(createNgeTableState());

  /** 4. A restored view — expansion is persistable state like any other slice. */
  readonly restoredConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  });

  readonly restoredState = signal<NgeTableState>(
    createNgeTableState({
      expanded: { [rows[1].id]: true },
      sorting: [{ desc: false, id: 'name' }],
    })
  );

  /** 5. A projected control, so the table wears a domain's own chevron. */
  readonly projectedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  });

  readonly projectedState = signal<NgeTableState>(createNgeTableState());

  onBasicState(next: NgeTableState): void {
    this.basicState.set(next);
  }

  onPredicateState(next: NgeTableState): void {
    this.predicateState.set(next);
  }

  onSizedState(next: NgeTableState): void {
    this.sizedState.set(next);
  }

  onRestoredState(next: NgeTableState): void {
    this.restoredState.set(next);
  }

  onProjectedState(next: NgeTableState): void {
    this.projectedState.set(next);
  }
}
