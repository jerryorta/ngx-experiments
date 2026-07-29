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
import { ngeWholeColumnRange } from '../../../../range';
import { NgeTableRangeDemoComponent } from '../../cell-range/range-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small }).slice(0, 8);

/** A selection every section starts with, so the tokens are visible without a gesture. */
function seeded(...columnIds: string[]): NgeTableState {
  return createNgeTableState({ ngeRange: { ranges: columnIds.map(ngeWholeColumnRange) } });
}

/**
 * Theming column selection — **which is entirely SCSS.**
 *
 * ⚠️ **There is no `config.theme` on `NgeTableConfig`.** The table themes exclusively
 * through `--nge-table-*` custom properties, so every section below is one scoped
 * wrapper class re-declaring tokens — exactly what a consumer writes. The configs are
 * near-identical on purpose: theming changes nothing about configuration, and the
 * comparison makes that point better than prose.
 *
 * ⚠️ The namespace is `--nge-table-range-column-*`, **under ARCH-269's
 * `--nge-table-range-*`** rather than beside it, because a selected column IS a
 * range. It is emphatically not `--nge-table-selection-*`, which ARCH-268 owns for
 * row selection.
 *
 * Every table is seeded rather than driven, and its controls are off: eight toolbars
 * would be noise on a page whose subject is colour.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-column-selection-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableRangeDemoComponent],
  selector: 'nge-table-column-selection-theming',
  standalone: true,
  styleUrl: './column-selection-theming.component.scss',
  templateUrl: './column-selection-theming.component.html',
})
export class NgeTableColumnSelectionThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/column-selection/theming';

  readonly rows = rows;

  /**
   * One config for every section but the pinned one.
   *
   * Reused deliberately: if a section needed its own config to demonstrate a token,
   * that token would not be a theming concern.
   */
  readonly config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  /** Pinning is a capability, so this section genuinely needs a config of its own. */
  readonly pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly defaultState = signal(seeded('status'));

  readonly alwaysVisibleState = signal(seeded('status'));

  readonly wideState = signal(seeded('status'));

  readonly brandedState = signal(seeded('status', 'amount'));

  readonly darkState = signal(seeded('status', 'amount'));

  readonly pinnedState = signal<NgeTableState>({
    ...seeded('status'),
    columnPinning: { left: ['status'], right: [] },
  });
}
