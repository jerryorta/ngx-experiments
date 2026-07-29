import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableTextareaDemoComponent } from '../textarea-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** A private copy per section, so editing one table leaves the others alone. */
function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * Theming `<nge-cell-textarea>` — sharing the select's one theming problem, and
 * adding the tokens ARCH-296 brought with it.
 *
 * ⚠️ **The panel is not in the table's DOM subtree.** It renders in a CDK overlay
 * container appended to `<body>`, so nothing scoped to the table — or to any wrapper
 * around it — inherits into it. The `:root` literal defaults DO, since `<body>` is a
 * descendant of `:root`, which is why the panel looks right with no theme loaded at all
 * and why that case is the least informative one to check.
 *
 * ⚠️ **Every wrapper class below therefore works only because the component resolves
 * this token family off its trigger and copies the values onto the pane**
 * (`applyNgeEditorPanelTokens`). If a section's trigger changes and its panel does not,
 * that mechanism is what broke — not the token. A token missing from
 * `NGE_EDITOR_PANEL_TOKENS` fails in exactly that shape, which is why a spec now
 * asserts the list covers every `var(--nge-…)` the panel stylesheets read.
 *
 * ⚠️ **Verify by measuring the rendered panel, never the wrapper's declared token.** A
 * wrapper can declare a value the panel never receives, and devtools will happily show
 * it on the wrapper.
 * `getComputedStyle(document.querySelector('.nge-cell-textarea__panel'))` is the honest
 * reading.
 *
 * The component is little more than the state each section needs — there is no
 * `config.theme` on `NgeTableConfig` and none is coming; the substance is the SCSS.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-textarea-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableTextareaDemoComponent],
  selector: 'nge-table-cell-textarea-theming',
  standalone: true,
  styleUrl: './cell-textarea-theming.component.scss',
  templateUrl: './cell-textarea-theming.component.html',
})
export class NgeTableCellTextareaThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-textarea/theming';

  readonly defaultRows = signal(seed(5));
  readonly defaultState = signal<NgeTableState>(createNgeTableState());

  readonly accentRows = signal(seed(5));
  readonly accentState = signal<NgeTableState>(createNgeTableState());

  readonly geometryRows = signal(seed(5));
  readonly geometryState = signal<NgeTableState>(createNgeTableState());

  readonly surfaceRows = signal(seed(5));
  readonly surfaceState = signal<NgeTableState>(createNgeTableState());

  readonly darkRows = signal(seed(5));
  readonly darkState = signal<NgeTableState>(createNgeTableState());
}
