import type { NgeChartConfig } from '@nge/charts';

import { Component, ViewEncapsulation } from '@angular/core';
import { createSparklineChartConfig, NgeChartComponent } from '@nge/charts';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableColumn } from '../../../../nge-table-column';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { NgeCellShellComponent } from '../../../../cell-shell';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { NgeCellDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Ten thousand rows — what it takes to keep a scroll gesture from settling immediately. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/** The chart column, local to this story and never added to `NGE_TABLE_FIXTURE_COLUMNS`. */
const seriesColumn: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'series',
  enableSorting: false,
  header: 'Trend',
  id: 'series',
  meta: {
    ngeExport: {
      format: value => (Array.isArray(value) ? `${value.length} points` : ''),
    },
  },
  size: 220,
};

/**
 * The `--nge-table-shell-*` tokens, demonstrated the only way most of them can
 * be.
 *
 * **There is no `config.theme`**, matching every other table theming story — the
 * shell themes entirely through CSS custom properties, paired with literal
 * fallbacks at their use site. But it diverges from `core/theming` a second way,
 * specific to this feature: `isSettled` is only ever `false` while a virtualized
 * table is actively scrolling, so a section that required a live scroll gesture
 * before anything was comparable would defeat the point of a theming story —
 * the same reasoning `highlight/theming` reached for seeding its marks rather
 * than requiring a click in each section. Sections 3 and 4 below render
 * `<nge-cell-shell>` directly rather than through a busy table, which is
 * exactly the shape a consumer's own skeleton row takes.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-chart-cells-theming',
  },
  imports: [
    NgeCellDirective,
    NgeCellShellComponent,
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
  ],
  selector: 'nge-table-chart-cells-theming',
  standalone: true,
  styleUrl: './chart-cells-theming.component.scss',
  templateUrl: './chart-cells-theming.component.html',
})
export class NgeTableChartCellsThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/chart-cells/theming';

  // ============================================
  // SECTION 1: The resolved chart cell
  // ============================================
  /** Not virtualized, so `isSettled()` is always `true` and only the chart ever renders. */
  resolvedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: [seriesColumn, NGE_TABLE_FIXTURE_COLUMNS[0]],
    data: rows.slice(0, 4),
    getRowId: row => row.id,
    rowHeight: 96,
  });

  readonly resolvedRows = rows.slice(0, 4);

  /**
   * Row → chart config, memoised by the ROW OBJECT — a `Map` keyed by
   * `row.id` would never forget a row it had seen, holding one config per row
   * for the life of the component. `row` also survives sorting and filtering,
   * because the engine reorders and rewraps rows without replacing the
   * underlying datum.
   */
  private readonly chartConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  chartFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.chartConfigs.get(row);
    if (cached) {
      return cached;
    }

    const config = createSparklineChartConfig({
      animationMs: 0,
      data: row.series.map((y, x) => ({ x, y })),
      yDomain: [0, 100],
    });

    this.chartConfigs.set(row, config);

    return config;
  }

  /** One row, reused across Section 3's three "and the chart" boxes — the point is the wrapper's colour, not the data. */
  readonly tokenDemoRow = rows[0];

  // ============================================
  // SECTION 2: The shell, in situ
  // ============================================
  /** Virtualized and tall, with the DEFAULT shell tokens — no wrapper class on this section. */
  inSituConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: [seriesColumn, NGE_TABLE_FIXTURE_COLUMNS[0]],
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowHeight: 96,
  });

  readonly inSituRows = largeRows;
}
