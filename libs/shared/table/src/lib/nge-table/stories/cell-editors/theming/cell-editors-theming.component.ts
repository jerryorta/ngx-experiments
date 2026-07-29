import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableEditorsDemoComponent } from '../editors-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * The `--nge-table-editor-*` contract, demonstrated from scoped wrapper classes —
 * which is exactly what a consumer overriding it writes.
 *
 * ⚠️ **There is no `config.theme` on `NgeTableConfig`.** The table themes
 * exclusively through CSS custom properties, so this story's substance is in its
 * SCSS and the component is little more than the rows its sections share.
 *
 * Every token below is one an editor actually reads. A section for a token nothing
 * consumes renders as a no-op and teaches a false contract — the defect ARCH-286
 * exists to have fixed.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-editors-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableEditorsDemoComponent],
  selector: 'nge-table-cell-editors-theming',
  standalone: true,
  styleUrl: './cell-editors-theming.component.scss',
  templateUrl: './cell-editors-theming.component.html',
})
export class NgeTableCellEditorsThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-editors/theming';

  // 1 — the library defaults, with nothing applied
  readonly defaultRows = signal(seed(5));
  readonly defaultState = signal<NgeTableState>(createNgeTableState());

  // 2 — surface, content and border
  readonly surfaceRows = signal(seed(5));
  readonly surfaceState = signal<NgeTableState>(createNgeTableState());

  // 3 — the accent and the focus border
  readonly accentRows = signal(seed(5));
  readonly accentState = signal<NgeTableState>(createNgeTableState());

  // 4 — geometry
  readonly geometryRows = signal(seed(5));
  readonly geometryState = signal<NgeTableState>(createNgeTableState());

  // 5 — a dark section, the shape a domain bridge takes
  readonly darkRows = signal(seed(5));
  readonly darkState = signal<NgeTableState>(createNgeTableState());
}
