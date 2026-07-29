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

/**
 * The chart column, local to this story and never added to
 * `NGE_TABLE_FIXTURE_COLUMNS`. Carries both opt-outs an array-valued accessor
 * needs: `enableSorting: false` (ordering a `number[]` is meaningless) and
 * `meta.ngeExport.format` (the default `String(value)` comma-joins the array —
 * legible, but not what belongs in an exported file). `nge-array-cell.spec.ts`
 * pins both answers.
 */
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
 * How to adopt a chart in a cell, as documentation.
 *
 * One column, one config, for every example below — chart-cells changes nothing
 * else about the table, and no example imports `@tanstack/*`. The Interaction
 * story is where the shell↔chart switch is actually *driven*; this table is not
 * virtualized, so `isSettled()` is always `true` and only the chart branch below
 * ever runs.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-chart-cells-usage-stories',
  },
  imports: [
    NgeCellDirective,
    NgeCellShellComponent,
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
  ],
  selector: 'nge-table-chart-cells-usage-stories',
  standalone: true,
  styleUrl: './chart-cells-usage-stories.component.scss',
  templateUrl: './chart-cells-usage-stories.component.html',
})
export class NgeTableChartCellsUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/chart-cells/usage';

  // ============================================
  // EXAMPLE 1: Basic usage
  // ============================================
  config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: [seriesColumn, ...NGE_TABLE_FIXTURE_COLUMNS.slice(0, 3)],
    data: rows.slice(0, 8),
    getRowId: row => row.id,
    rowHeight: 96,
  });

  readonly exampleRows = rows.slice(0, 8);

  /**
   * Row → chart config, memoised by the ROW OBJECT.
   *
   * ⚠️ The memo is the load-bearing half. A factory called straight from the
   * template allocates a new config on every change-detection pass, so
   * `<nge-chart>`'s `config` input changes identity and the chart re-renders —
   * which under virtualization is exactly the cost the settle signal exists to
   * avoid.
   *
   * A `WeakMap` keyed by `row`, not a `Map` keyed by `row.id` — a `Map` never
   * forgets a row it has seen, so a full virtualized scroll would end up
   * holding a config for every row in the dataset. `row` is also the correct
   * key on its own merits: the engine reorders and rewraps rows under sorting
   * and filtering, but never replaces the underlying datum. Building every
   * config eagerly, up front, is not the alternative — it only trades a
   * scroll stall for a startup stall.
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

  // ============================================
  // EXAMPLE 3: The array-valued column's opt-outs
  // ============================================
  /**
   * Computed once, directly, rather than through a button — the claim is about
   * what the formatter returns, not about driving anything. `chartFor` is not
   * involved; this is the export seam reading the same column's `meta` field,
   * called the same way `nge-table-export.ts` calls it: value, then row.
   */
  readonly sampleFormattedSeries =
    seriesColumn.meta?.ngeExport?.format?.(rows[0].series, rows[0]) ?? '';
}
