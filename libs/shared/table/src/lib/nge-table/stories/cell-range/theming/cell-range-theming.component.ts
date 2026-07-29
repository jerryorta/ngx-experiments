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
import { NgeTableRangeDemoComponent } from '../range-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** The rows every section renders. Small, so a whole table fits in a comparison box. */
const themedRows = rows.slice(0, 6);

/** The four columns every section shows: name, status, quantity, amount. */
const themedColumns = NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4);

/**
 * A rectangle seeded rather than dragged.
 *
 * A theming story is read by comparing sections side by side, and requiring a drag
 * in each before anything is comparable would defeat that. It doubles as the restore
 * path: this is exactly the shape a persisted view hands back in.
 *
 * Spans `status` → `amount` across three rows, so both the block tint and the
 * heavier **focus** ring on its moving corner are visible in one glance.
 *
 * A factory rather than a shared constant, because each section owns its own state
 * and must not share a mutable object with the others.
 */
function seedState(): NgeTableState {
  return createNgeTableState({
    ngeRange: {
      ranges: [
        {
          anchorColumnId: 'status',
          anchorRowId: themedRows[1].id,
          focusColumnId: 'amount',
          focusRowId: themedRows[3].id,
        },
      ],
    },
  });
}

/**
 * The `--nge-table-range-*` tokens, demonstrated the only way they can be.
 *
 * **There is no `config.theme`** — the table themes entirely through CSS custom
 * properties, so a table theming story's substance lives in its **SCSS** and the
 * component is little more than the configs those wrappers wrap. This is the one
 * place a table story diverges hard from its charts counterpart, where a palette
 * rides on the config as TypeScript.
 *
 * Almost every section therefore reuses one config and one pre-seeded range: theming
 * changes nothing about configuration. The two that do not are the sections
 * demonstrating something a *capability* has to be switched on for (pinning) and the
 * one demonstrating the geometry tokens, which are unreachable from CSS unless the
 * config omits them — see {@link themableGeometryConfig}.
 *
 * The addon declares **no defaults in a token partial**. Editing core's
 * `_table-tokens.scss` would be a core edit, so every token is paired with a literal
 * fallback at its use site — which means a range renders correctly with no theme
 * applied, and a consumer overrides it exactly as below.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-range-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableRangeDemoComponent],
  selector: 'nge-table-cell-range-theming',
  standalone: true,
  styleUrl: './cell-range-theming.component.scss',
  templateUrl: './cell-range-theming.component.html',
})
export class NgeTableCellRangeThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-range/theming';

  /** The config every palette section shares. */
  baseConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: themedColumns,
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
   * range bridge is per-table — which is what `<nge-table-range-demo>` gives each
   * of them.
   */
  readonly blueState = signal<NgeTableState>(seedState());

  readonly darkState = signal<NgeTableState>(seedState());

  /** Section 2's table, distinct from the comparison grid's default box. */
  readonly defaultState = signal<NgeTableState>(seedState());

  readonly denseState = signal<NgeTableState>(seedState());

  readonly mintState = signal<NgeTableState>(seedState());

  readonly subtleState = signal<NgeTableState>(seedState());

  readonly violetState = signal<NgeTableState>(seedState());

  /** A pinned config, for the section proving a selected pinned cell stays opaque. */
  pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: themedRows,
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly pinnedState = signal<NgeTableState>(
    createNgeTableState({
      columnPinning: { left: ['name'] },
      ngeRange: {
        ranges: [
          {
            anchorColumnId: 'name',
            anchorRowId: themedRows[1].id,
            focusColumnId: 'quantity',
            focusRowId: themedRows[3].id,
          },
        ],
      },
    })
  );

  /**
   * ⚠️ **Hand-authored, and the omission is the whole point.**
   *
   * `createNgeTableConfig()` fills in `rowHeight` and `headerHeight` from
   * `NGE_TABLE_DEFAULTS` *unconditionally*, and `<nge-table>` then publishes both
   * as **inline custom properties on the host** — where they beat a wrapper class
   * outright, because an inline declaration outranks a class selector regardless of
   * specificity. So a density section built on the factory does not work, and it
   * fails silently: the class is there, the token is there, and nothing moves.
   *
   * Omitting the two fields hands them back to the theme. This is a supported path —
   * the factory exists for convenience, not as the only constructor.
   *
   * ⚠️ It does **not** compose with virtualization. The virtualizer positions rows
   * it has not rendered, at `index × rowHeight`, so with `enableVirtualization: true`
   * the resolved height is always written inline and row height is a config concern
   * whatever the theme says.
   */
  readonly themableGeometryConfig: NgeTableConfig<NgeTableFixtureRow> = {
    columns: themedColumns,
    data: themedRows,
    getRowId: row => row.id,
  };
}
