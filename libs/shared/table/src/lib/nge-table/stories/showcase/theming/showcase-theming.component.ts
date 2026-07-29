import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID } from '../../../store';
import { NgeTableShowcaseDemoComponent } from '../showcase-demo-table.component';

/** A private copy per section, so one theme's edits and marks never bleed into another's. */
function seed(count: number): NgeTableFixtureRow[] {
  return createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small })
    .slice(0, count)
    .map(row => ({ ...row }));
}

/**
 * ⚠️ The two INJECTED columns are pinned alongside `name`. Pinning is a separate
 * axis from `applyInjectedColumnOrder`, so leaving them out drops the chevron and
 * the checkbox into the scrolling centre lane — which for a THEMING story would
 * also mean the pinned-lane surfaces never had to cover them.
 */
const pinning = {
  left: [NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID, 'name'],
  right: ['createdAt'],
};

/**
 * The `--nge-table-*` contract, demonstrated on the fully-loaded table rather
 * than the plain fixture — the harder and more honest proof, because every
 * wrapper class below has to reach a pinned lane, a stripe, a selection accent,
 * a highlight tint, a range outline, an editor panel, AND a chart-bearing
 * detail band all at once, or the comparison would prove nothing.
 *
 * There is no `config.theme` — the table themes exclusively through CSS custom
 * properties, so every section is one scoped wrapper class re-declaring tokens,
 * exactly what a consumer overriding them would write. No `themeGroup` and no
 * dependency on the Storybook theme toolbar: six persona themes DO bridge
 * `--nge-table-*` (ARCH-277) and the toolbar does move these tokens, but the
 * subject here is the contract itself, not one domain's mapping of it.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-showcase-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableShowcaseDemoComponent],
  selector: 'nge-table-showcase-theming',
  standalone: true,
  styleUrl: './showcase-theming.component.scss',
  templateUrl: './showcase-theming.component.html',
})
export class NgeTableShowcaseThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/showcase/theming';

  // ============================================
  // Light vs dark — every surface restated
  // ============================================
  readonly lightRows = signal(seed(6));

  readonly lightState = signal(createNgeTableState({ columnPinning: pinning }));

  readonly darkRows = signal(seed(6));

  readonly darkState = signal(createNgeTableState({ columnPinning: pinning }));

  // ============================================
  // Pinning & lane tokens, forced to scroll
  // ============================================
  readonly pinnedRows = signal(seed(8));

  readonly pinnedState = signal(createNgeTableState({ columnPinning: pinning }));

  // ============================================
  // A brand accent — interaction tokens under a gesture
  // ============================================
  readonly brandRows = signal(seed(6));

  readonly brandState = signal(createNgeTableState());

  // ============================================
  // Editor panel tokens
  // ============================================
  readonly editorRows = signal(seed(4));

  readonly editorState = signal(createNgeTableState());
}
