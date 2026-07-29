import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: 8 });

/** Three rows ticked from the start, so every section shows its selected tint at rest. */
function seededSelection(): NgeTableState {
  return createNgeTableState({
    rowSelection: Object.fromEntries(rows.slice(1, 4).map(row => [row.id, true])),
  });
}

/** The same, with columns pinned — for the sections about the sticky lanes. */
function seededPinnedSelection(): NgeTableState {
  return createNgeTableState({
    columnPinning: { left: ['name'], right: ['owner'] },
    rowSelection: Object.fromEntries(rows.slice(1, 4).map(row => [row.id, true])),
  });
}

/**
 * Theming the selection affordance — **and the substance of this story is its SCSS.**
 *
 * There is no `config.theme` on `NgeTableConfig`. The table themes exclusively
 * through `--nge-table-*` custom properties, so each section below is a scoped
 * wrapper class re-declaring tokens — which is exactly what a consumer writes.
 * The component is little more than the configs those wrappers wrap, which is why
 * one config is reused almost everywhere: theming changes nothing about
 * configuration.
 *
 * Selection reads two tokens of its own — `--nge-table-row-surface-selected` and
 * `--nge-table-selection-accent` — plus the shared `--nge-table-focus-ring-*`
 * pair, which the focusable row picks up.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-selection-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent],
  selector: 'nge-table-selection-theming',
  standalone: true,
  styleUrl: './selection-theming.component.scss',
  templateUrl: './selection-theming.component.html',
})
export class NgeTableSelectionThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/selection/theming';

  /** The one config nearly every section reuses. */
  readonly config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  /**
   * Pinning switched on, for the section that shows the tint repainted on the
   * sticky lanes. A capability the section needs, so it earns its own config.
   */
  readonly pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enablePinning: true,
    enableRowSelection: true,
    getRowId: row => row.id,
  });

  readonly defaultState = signal<NgeTableState>(seededSelection());
  readonly brandState = signal<NgeTableState>(seededSelection());
  readonly subtleState = signal<NgeTableState>(seededSelection());
  readonly pinnedState = signal<NgeTableState>(seededPinnedSelection());

  /**
   * The dark section pins columns too, and that is the section doing its own job
   * rather than a copy-paste: its warning is that an un-restated pinned surface
   * shows up as a pale rectangle punched through a dark table, which is only
   * visible if there are pinned lanes to look at. Its own state signal, because
   * two tables sharing one would move together.
   */
  readonly darkState = signal<NgeTableState>(seededPinnedSelection());

  readonly focusState = signal<NgeTableState>(createNgeTableState());

  onDefaultState(next: NgeTableState): void {
    this.defaultState.set(next);
  }

  onBrandState(next: NgeTableState): void {
    this.brandState.set(next);
  }

  onSubtleState(next: NgeTableState): void {
    this.subtleState.set(next);
  }

  onDarkState(next: NgeTableState): void {
    this.darkState.set(next);
  }

  onPinnedState(next: NgeTableState): void {
    this.pinnedState.set(next);
  }

  onFocusState(next: NgeTableState): void {
    this.focusState.set(next);
  }
}
