import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import {
  NGE_SELECT_DEMO_LONG_OPTIONS,
  NgeTableSelectDemoComponent,
} from '../select-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** A private copy per section, so editing one table leaves the others alone. */
function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * Theming `<nge-cell-select>` — and the one theming problem the other two editors
 * do not have.
 *
 * ⚠️ **The panel is not in the table's DOM subtree.** It renders in a CDK overlay
 * container appended to `<body>`, so nothing scoped to the table — or to any wrapper
 * around it — inherits into it. The `:root` literal defaults DO, since `<body>` is a
 * descendant of `:root`, which is why the panel looks right with no theme loaded at
 * all and why that case is the least informative one to check.
 *
 * ⚠️ **Every wrapper class below therefore works only because the component resolves
 * this token family off its trigger and copies the values onto the pane.** That is
 * the substance of this story: without `applyPanelTokens`, each section would style
 * the trigger and leave the panel stubbornly light. If a section's trigger changes
 * and its panel does not, that mechanism is what broke — not the token.
 *
 * ⚠️ **Verify by measuring the rendered panel, never the wrapper's declared token.**
 * A wrapper can declare a value the panel never receives, and devtools will happily
 * show it on the wrapper. `getComputedStyle(document.querySelector('.nge-cell-select__panel'))`
 * is the honest reading.
 *
 * The component is little more than the state each section needs — there is no
 * `config.theme` on `NgeTableConfig` and none is coming; the substance is the SCSS.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-select-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableSelectDemoComponent],
  selector: 'nge-table-cell-select-theming',
  standalone: true,
  styleUrl: './cell-select-theming.component.scss',
  templateUrl: './cell-select-theming.component.html',
})
export class NgeTableCellSelectThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-select/theming';

  /** The options a tall panel needs — the only section that swaps them. */
  readonly longOptions = NGE_SELECT_DEMO_LONG_OPTIONS;

  readonly defaultRows = signal(seed(5));
  readonly defaultState = signal<NgeTableState>(createNgeTableState());

  readonly surfaceRows = signal(seed(5));
  readonly surfaceState = signal<NgeTableState>(createNgeTableState());

  readonly optionRows = signal(seed(5));
  readonly optionState = signal<NgeTableState>(createNgeTableState());

  readonly heightRows = signal(seed(5));
  readonly heightState = signal<NgeTableState>(createNgeTableState());

  readonly darkRows = signal(seed(5));
  readonly darkState = signal<NgeTableState>(createNgeTableState());
}
