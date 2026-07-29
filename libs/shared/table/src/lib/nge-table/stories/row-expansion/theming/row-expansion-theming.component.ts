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
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: 6 });

const virtualRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * Row expansion's slice of the `--nge-table-*` contract.
 *
 * ⚠️ **There is no `config.theme` on `NgeTableConfig`, so the substance of this
 * story is its SCSS.** Each section is a scoped wrapper class re-declaring tokens,
 * which is exactly what a consumer overriding them would write. The component is
 * little more than the configs those wrappers wrap — and most sections share one,
 * because theming changes nothing about configuration.
 *
 * ⚠️ **`--nge-table-row-detail-height` is the trap here, and it is the geometry
 * trap in a new place.** While virtualization is on, `<nge-table>` publishes the
 * resolved band height as an **inline** custom property on the host — where it
 * beats a wrapper class outright, because an inline declaration outranks a class
 * selector regardless of specificity. That is deliberate: a virtualized row is
 * *positioned* as `rowHeight + rowDetailHeight`, so a theme moving the band alone
 * would not restyle the table, it would put the band and the row beneath it in
 * disagreement about where the row ends. Off virtualization nothing is positioned
 * by arithmetic, so a theme owns the token outright — which is what the two
 * sections below demonstrate, side by side.
 *
 * The band's other token is `--nge-table-row-detail-duration`, and it is the one
 * tier the table above does not have: a value with no TypeScript counterpart at
 * all, so a wrapper class always wins. `0ms` is a supported value rather than an
 * edge case — it is how a consumer opts out of the motion without a media query.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-row-expansion-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent, NgeTableSlotDirective],
  selector: 'nge-table-row-expansion-theming',
  standalone: true,
  styleUrl: './row-expansion-theming.component.scss',
  templateUrl: './row-expansion-theming.component.html',
})
export class NgeTableRowExpansionThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/row-expansion/theming';

  /** The type carrier every `let-` binding below infers its row shape from. */
  readonly rows = rows;

  readonly virtualRows = virtualRows;

  /**
   * One config, shared by every section that is only changing colour.
   *
   * Expanded from the initial state rather than by a click, so a reviewer sees the
   * bands without having to open six tables.
   */
  readonly config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  });

  readonly expandedState = signal<NgeTableState>(createNgeTableState({ expanded: true }));

  /**
   * ⚠️ Hand-authored, NOT `createNgeTableConfig()`, and the omission is the point.
   *
   * The factory fills `rowDetailHeight` in from `NGE_TABLE_DEFAULTS`
   * unconditionally, and `<nge-table>` then publishes it inline on the host while
   * virtualizing. Only a config that leaves the field out hands the token back to
   * the theme — the same supported path the row-height sections in `core/theming`
   * take. Virtualization is off here, so nothing is positioned by arithmetic and
   * the band is free to be a `min-height` a class can move.
   */
  readonly themableBandConfig: NgeTableConfig<NgeTableFixtureRow> = {
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  };

  /**
   * The other half of the pair: virtualization on, so the height is the table's
   * and a wrapper class cannot reach it.
   */
  readonly virtualizedBandConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: virtualRows,
    enableRowExpansion: true,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowDetailHeight: 140,
  });

  readonly virtualizedState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [virtualRows[1].id]: true, [virtualRows[4].id]: true } })
  );

  /**
   * Section 6's state, shared by BOTH samples and starting closed.
   *
   * One chevron opens both bands in the same frame, which is what makes the pair
   * an A/B rather than two demonstrations a reviewer has to time by eye.
   */
  readonly motionState = signal<NgeTableState>(createNgeTableState());

  onExpandedState(next: NgeTableState): void {
    this.expandedState.set(next);
  }

  onMotionState(next: NgeTableState): void {
    this.motionState.set(next);
  }

  onVirtualizedState(next: NgeTableState): void {
    this.virtualizedState.set(next);
  }
}
