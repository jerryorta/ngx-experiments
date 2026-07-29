import type { NgeChartConfig } from '@nge/charts';

import { Component, signal, ViewEncapsulation } from '@angular/core';
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
import { NgeCellDirective, NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Ten thousand rows — the count that makes a scroll gesture actually windowed. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * The chart column — local to this story, never added to
 * `NGE_TABLE_FIXTURE_COLUMNS`. `enableSorting: false` because ordering a
 * `number[]` is meaningless (`nge-array-cell.spec.ts` pins the same answer for
 * the library), and `meta.ngeExport.format` because the default `String(value)`
 * comma-joins the array — legible, but not what belongs in an exported file.
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
 * Driving the shell↔chart switch — the only way to see any of it, since jsdom
 * lays nothing out and a static render shows exactly one of the two states.
 *
 * ⚠️ This feature carries no slice of `NgeTableState`. `isSettled` is derived
 * purely from the virtualizer's own scroll-activity detection (ARCH-291) —
 * nothing persists, nothing a host restores, and nothing to push in from
 * outside. What follows are runtime signal readouts rather than a state JSON,
 * because the signal itself is the whole contract.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-chart-cells-interaction-stories',
  },
  imports: [
    NgeCellDirective,
    NgeCellShellComponent,
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  selector: 'nge-table-chart-cells-interaction-stories',
  standalone: true,
  styleUrl: './chart-cells-interaction-stories.component.scss',
  templateUrl: './chart-cells-interaction-stories.component.html',
})
export class NgeTableChartCellsInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/chart-cells/interaction';

  // ============================================
  // EXAMPLE 1: The shell↔chart switch, driven by scroll
  // ============================================
  /**
   * Tall rows (96px) and virtualization on — the two conditions under which
   * `isSettled` ever reports `false`. `getRowId` is not optional here either: the
   * chart transform below is memoised per row id.
   */
  switchConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: [seriesColumn, ...NGE_TABLE_FIXTURE_COLUMNS.slice(0, 3)],
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowHeight: 96,
  });

  readonly switchRows = largeRows;

  readonly totalRowCount = NGE_TABLE_FIXTURE_SIZES.large;

  /**
   * Row → chart config, memoised by the ROW OBJECT.
   *
   * ⚠️ The memo is the load-bearing half. A factory called straight from the
   * template allocates a new config on every change-detection pass, so
   * `<nge-chart>`'s `config` input changes identity and the chart re-renders —
   * which under virtualization is exactly the cost the settle signal exists to
   * avoid.
   *
   * ⚠️ A `WeakMap` keyed by `row`, not a `Map` keyed by `row.id`. A
   * `Map<string, …>` never forgets — every row ever scrolled past stays in it
   * for the life of the component, so a full scroll of this 10,000-row dataset
   * would end up holding all ten thousand configs. The row object is also the
   * *correct* key on its own merits, not only for memory: the engine reorders
   * and rewraps rows under sorting and filtering, but it never replaces the
   * underlying datum, so the object survives a sort exactly where a DOM node
   * or a cell reference would not.
   *
   * Building every config eagerly, up front, is not the alternative it looks
   * like — it trades a scroll stall for a startup stall. The memo's whole
   * point is to spend the cost only on rows the user actually scrolls to.
   */
  private readonly chartConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  /**
   * How many distinct configs `chartFor` has actually built.
   *
   * ⚠️ A PLAIN field, not a signal. `chartFor` runs from inside a template
   * binding (`[config]="chartFor(cell.row)"`), and Angular forbids writing a
   * signal while the template that reads it is still rendering (`NG0600`) —
   * incrementing a `signal` here trips that the moment a cache miss happens
   * mid-render. The count is real either way; it is only ever *read* into a
   * signal from `sampleCells`, an event handler, where a write is safe.
   */
  private chartBuildCount = 0;

  chartFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.chartConfigs.get(row);
    if (cached) {
      return cached;
    }

    const config = createSparklineChartConfig({
      // The warm trend accent, resolved from `.chart-cell` — a `var()` REFERENCE so the
      // browser re-resolves it when the persona changes. See the SCSS for the pair.
      seriesColors: ['var(--nge-trend-accent, #c2410c)'],
      // ⚠️ animationMs: 0 — virtualization recreates the cell on every window
      // slide, so an entrance animation replays per slide and reads as a strobe.
      animationMs: 0,
      data: row.series.map((y, x) => ({ x, y })),
      // The fixture's shared [0, 100] domain, fixed so two cells in one column can
      // be read against each other (ARCH-290 chose the shared domain for exactly
      // this). Without it each sparkline auto-scales to its own range and the
      // column becomes twelve unrelated pictures.
      yDomain: [0, 100],
    });

    this.chartConfigs.set(row, config);
    this.chartBuildCount += 1;

    return config;
  }

  /** Sampled on demand, same reasoning as the virtualization story in `core/interaction`. */
  readonly sampledCounts = signal<null | { charts: number; configsBuilt: number; shells: number }>(
    null
  );

  sampleCells(container: HTMLElement): void {
    this.sampledCounts.set({
      charts: container.querySelectorAll('.chart-cell').length,
      configsBuilt: this.chartBuildCount,
      shells: container.querySelectorAll('nge-cell-shell').length,
    });
  }

  // ============================================
  // EXAMPLE 2: Permanently settled without virtualization
  // ============================================
  /**
   * Same column, same transform, `enableVirtualization` simply absent. A table
   * that renders every row builds each cell once and never recycles it, so there
   * is no per-slide cost to defer — the honest degradation the doc comment on
   * `NgeCellContext.isSettled` describes, not a gap.
   */
  alwaysSettledConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: [seriesColumn, ...NGE_TABLE_FIXTURE_COLUMNS.slice(0, 3)],
    data: rows.slice(0, 6),
    getRowId: row => row.id,
    rowHeight: 96,
  });

  readonly alwaysSettledRows = rows.slice(0, 6);

  // ============================================
  // EXAMPLE 3: Row height gives the chart its room
  // ============================================
  /**
   * The library's own default — no `rowHeight` override, so it falls to
   * `NGE_TABLE_DEFAULTS.rowHeight` (40px). `<nge-chart>`'s shadow root injects
   * `:host, svg { width: 100%; height: 100% }`, and that percentage resolves
   * against `.nge-table__cell`'s own height — which is always definite (the
   * row's `--nge-table-row-height`), never `auto`. So the chart never
   * *collapses* here; it is simply squeezed into whatever the row allows.
   */
  shortRowConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: [seriesColumn, NGE_TABLE_FIXTURE_COLUMNS[0]],
    data: rows.slice(0, 4),
    getRowId: row => row.id,
  });

  readonly shortRowRows = rows.slice(0, 4);

  /** Same column, same rows — only `rowHeight` differs, matching every other example here. */
  tallRowConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: [seriesColumn, NGE_TABLE_FIXTURE_COLUMNS[0]],
    data: rows.slice(0, 4),
    getRowId: row => row.id,
    rowHeight: 96,
  });

  readonly tallRowRows = rows.slice(0, 4);
}
