import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableEditDemoComponent } from '../edit-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

function seed(): NgeTableFixtureRow[] {
  return rows.slice(0, 6).map(row => ({ ...row }));
}

/**
 * Theming an editable cell — **which is entirely SCSS**.
 *
 * ⚠️ There is no `config.theme` on `NgeTableConfig`. The table themes exclusively
 * through `--nge-table-*` custom properties, so every section is one scoped wrapper
 * class re-declaring tokens — exactly what a consuming app writes.
 *
 * ⚠️ **This story adds no tokens of its own, and that is the point.** ARCH-292 ships no
 * editor, so there is nothing here for a `--nge-table-editor-*` namespace to describe
 * yet; declaring one now would leave it inert across ten domain themes, which is the
 * mistake ARCH-277 had to undo and ARCH-286 had to finish. The controls below read the
 * tokens the table already publishes — surface, border, focus ring — and the sections
 * demonstrate that an activated cell follows a theme without needing its own vocabulary.
 * ARCH-293 introduces `--nge-table-editor-*` together with the editors that consume it.
 *
 * ⚠️ **An activated cell is only visible while it is activated**, so unlike a striping
 * or a pinning story this page cannot show its subject at rest. Every section asks the
 * reviewer to click a cell.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-inline-edit-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableEditDemoComponent],
  selector: 'nge-table-inline-edit-theming',
  standalone: true,
  styleUrl: './inline-edit-theming.component.scss',
  templateUrl: './inline-edit-theming.component.html',
})
export class NgeTableInlineEditThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/inline-edit/theming';

  readonly defaultRows = signal(seed());
  readonly defaultState = signal<NgeTableState>(createNgeTableState());

  readonly brandedRows = signal(seed());
  readonly brandedState = signal<NgeTableState>(createNgeTableState());

  readonly darkRows = signal(seed());
  readonly darkState = signal<NgeTableState>(createNgeTableState());

  readonly compactRows = signal(seed());
  readonly compactState = signal<NgeTableState>(createNgeTableState());

  readonly liveRows = signal(seed());
  readonly liveState = signal<NgeTableState>(createNgeTableState());
}
