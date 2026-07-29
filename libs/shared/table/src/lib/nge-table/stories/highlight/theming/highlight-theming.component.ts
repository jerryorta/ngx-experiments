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
import { ngeHighlightCellKey } from '../../../../highlight';
import { NgeTableHighlightDemoComponent } from '../highlight-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** The rows every section renders. Small, so a whole table fits in a comparison box. */
const themedRows = rows.slice(0, 6);

/**
 * Marks seeded rather than clicked.
 *
 * A theming story is read by comparing sections side by side, and requiring a click
 * in each before anything is comparable would defeat that. It doubles as the
 * restore path: this is exactly the shape a persisted view hands back in.
 *
 * A factory rather than a shared constant, because each section owns its own state
 * and must not share a mutable object with the others.
 */
function seedState(): NgeTableState {
  return createNgeTableState({
    ngeHighlight: {
      anchor: ngeHighlightCellKey(themedRows[1].id, 'amount'),
      cells: [
        ngeHighlightCellKey(themedRows[1].id, 'amount'),
        ngeHighlightCellKey(themedRows[3].id, 'name'),
      ],
      exclusions: [],
      ranges: [
        {
          anchorRowId: themedRows[4].id,
          columnIds: ['status', 'quantity'],
          focusRowId: themedRows[5].id,
        },
      ],
    },
  });
}

/**
 * The `--nge-table-highlight-*` tokens, demonstrated the only way they can be.
 *
 * **There is no `config.theme`** — the table themes entirely through CSS custom
 * properties, so a table theming story's substance lives in its **SCSS** and the
 * component is little more than the configs those wrappers wrap. This is the one
 * place a table story diverges hard from its charts counterpart, where a palette
 * rides on the config as TypeScript.
 *
 * Every section therefore reuses one config and one pre-seeded highlight state:
 * theming changes nothing about configuration, and seeding the marks rather than
 * requiring a click is what lets a reviewer compare six palettes at a glance.
 *
 * The addon declares **no defaults in a token partial**. Editing core's
 * `_table-tokens.scss` would be a core edit, so every token is paired with a
 * literal fallback at its use site — which means highlighting renders correctly
 * with no theme applied, and a consumer overrides it exactly as below.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-highlight-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableHighlightDemoComponent],
  selector: 'nge-table-highlight-theming',
  standalone: true,
  styleUrl: './highlight-theming.component.scss',
  templateUrl: './highlight-theming.component.html',
})
export class NgeTableHighlightThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/highlight/theming';

  /** The config every section shares. */
  baseConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
    data: themedRows,
    getRowId: row => row.id,
  });

  readonly themedRows = themedRows;

  /**
   * Each themed section gets its **own** state signal, seeded identically.
   *
   * Two reasons, and both are correctness rather than style. `[(state)]` is two-way,
   * so sections sharing one signal would move together the moment any of them was
   * clicked. And each table needs its own provider scope regardless, because the
   * highlight bridge is per-table — which is what `<nge-table-highlight-demo>`
   * gives each of them.
   */
  readonly amberState = signal<NgeTableState>(seedState());

  readonly darkState = signal<NgeTableState>(seedState());

  /** Section 2's table, distinct from the comparison grid's amber box. */
  readonly defaultState = signal<NgeTableState>(seedState());

  readonly mintState = signal<NgeTableState>(seedState());

  readonly subtleState = signal<NgeTableState>(seedState());

  readonly violetState = signal<NgeTableState>(seedState());

  /** A pinned config, for the section proving a pinned highlight stays opaque. */
  pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
    data: themedRows,
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly pinnedState = signal<NgeTableState>(
    createNgeTableState({
      columnPinning: { left: ['name'] },
      ngeHighlight: {
        anchor: null,
        cells: [
          ngeHighlightCellKey(themedRows[1].id, 'name'),
          ngeHighlightCellKey(themedRows[3].id, 'name'),
        ],
        exclusions: [],
        ranges: [],
      },
    })
  );
}
