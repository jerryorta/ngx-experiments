import { Component, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableConfig } from '../../../../nge-table-config';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/**
 * The `--nge-table-*` token contract, demonstrated the only way it can be.
 *
 * **There is no `config.theme`.** This is the one place a table story diverges
 * hard from its charts counterpart: a chart carries its palette in a `theme`
 * object on the config, so a chart theming story is TypeScript. The table has no
 * such field — it themes entirely through CSS custom properties — so every
 * section below is one wrapper class in the SCSS setting tokens, and the
 * component is little more than the configs those wrappers wrap.
 *
 * That is also why almost every section reuses `baseConfig`: theming a table
 * changes nothing about its configuration. Only the sections demonstrating a
 * token that a *capability* has to switch on — pinning, resizing, the row-detail
 * band, the loading scrim — need a config of their own.
 *
 * No `themeGroup` parameter and no dependency on the Storybook theme toolbar.
 * Six persona themes do bridge `--nge-table-*` (ARCH-277), so the toolbar moves
 * these tokens — but the subject here is the contract itself rather than any one
 * domain's mapping of it. Each section re-declares the properties from a scoped
 * selector, which is exactly what a consumer overriding them writes.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent, NgeTableSlotDirective],
  selector: 'nge-table-theming',
  standalone: true,
  styleUrl: './nge-table-theming.component.scss',
  templateUrl: './nge-table-theming.component.html',
})
export class NgeTableThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/core/theming';

  /**
   * The config nearly every section uses.
   *
   * Reused rather than duplicated to make the point above concrete: surfaces,
   * borders, density, typography and the dark theme are all the *same table*
   * under a different wrapper class.
   */
  baseConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 8),
    getRowId: row => row.id,
  });

  /** Four rows, for the side-by-side comparison boxes. */
  compactConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 3),
    data: rows.slice(0, 4),
    getRowId: row => row.id,
  });

  // ============================================
  // Density tokens
  // ============================================
  /**
   * Hand-authored **on purpose** — this is the one config here that does not go
   * through `createNgeTableConfig`.
   *
   * ⚠️ The factory fills in `rowHeight` / `headerHeight` from
   * `NGE_TABLE_DEFAULTS` unconditionally, and `applyGeometry` then writes both as
   * **inline custom properties on the host element** — where they beat any wrapper
   * class, because an inline declaration outranks a class selector no matter how
   * specific. So a table built by the factory has geometry that CSS cannot reach;
   * only a config that *omits* the fields hands the tokens back to the theme, and
   * `applyGeometry` removes the properties precisely so it can.
   *
   * Hand-authoring the interface is a supported path (see the factory's own
   * doc comment), which is what makes this demonstrable rather than a workaround.
   */
  readonly themableGeometryConfig: NgeTableConfig<NgeTableFixtureRow> = {
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 8),
    getRowId: row => row.id,
  };

  // ============================================
  // Pinning tokens
  // ============================================
  /**
   * Pinned lanes, in a box narrow enough to force a horizontal scroll.
   *
   * The pinning tokens are only legible against real movement: a lane's shadow
   * and its opaque surface exist so the frozen columns read as sitting *above*
   * the scrolling ones, which a table that fits its container never demonstrates.
   */
  pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 6),
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly pinnedState = createNgeTableState({
    columnPinning: { left: ['name'], right: ['owner'] },
  });

  // ============================================
  // Interaction tokens
  // ============================================
  /**
   * Resizing on, so the grip tokens have something to colour.
   *
   * The grip is `transparent` at rest by design — the header band stays quiet and
   * the affordance is the cursor — so a story that only screenshots it proves
   * nothing. Hover a header edge to see `--nge-table-resize-handle-color-hover`,
   * drag to see `-active`, and tab into a header to see the focus ring.
   */
  resizableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
    data: rows.slice(0, 5),
    enableColumnResizing: true,
    getRowId: row => row.id,
  });

  // ============================================
  // Slot-chrome tokens
  // ============================================
  /**
   * The bands a consumer's `[ngeTableSlot]` templates render into.
   *
   * Only the *chrome* is tokenised — the padding around a toolbar, the surface
   * under a detail band, the scrim over a loading table. What a slot renders is
   * the consumer's markup carrying the consumer's styles, so the library has
   * nothing to say about it.
   */
  slotConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
    data: rows.slice(0, 4),
    getRowId: row => row.id,
  });

  /**
   * The type carrier `[ngeTableSlotOf]` binds, so `let-detail` knows its row shape.
   *
   * Without it `TRow` resolves to `unknown` and `detail.row.name` does not
   * compile — and note where that failure would surface: `shared-table` has no
   * build target, so `tsc -p tsconfig.lib.json` never runs `ngtsc` over these
   * templates. Storybook's own compile is the only thing that checks them.
   */
  readonly slotRows = rows.slice(0, 4);

  /**
   * Expanded from the initial state rather than by a click.
   *
   * A theming story should render its subject without being driven — the detail
   * band's surface token cannot be judged from a table whose bands are all shut.
   */
  readonly slotExpandedState = createNgeTableState({ expanded: true });

  /**
   * The loading overlay is projected permanently here.
   *
   * `loading` needs no `config.loading` flag: the *presence* of the template is
   * the signal (see `nge-table.component.html` § loading). Leaving it on is what
   * makes the scrim token judgeable — the two boxes below differ only in the
   * scrim they set.
   */
  loadingConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 3),
    data: rows.slice(0, 4),
    getRowId: row => row.id,
  });
}
