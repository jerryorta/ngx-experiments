import type {
  NgeChartConfig,
  NgeLineDataPoint,
  NgeScatterDataPoint,
} from '@nge/charts';

import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  createLineChartConfig,
  createScatterChartConfig,
  NgeChartComponent,
} from '@nge/charts';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SERIES_LENGTH,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: 6 });

const windowedRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

const SERIES_COLORS = ['#1E88E5', '#43A047', '#FB8C00'];

const DAY_LABELS = Array.from(
  { length: NGE_TABLE_FIXTURE_SERIES_LENGTH },
  (_, index) => `Day ${index + 1}`
);

const SCATTER_LAGS = [1, 2, 3] as const;

function trailingMean(series: readonly number[], index: number): number {
  const window = series.slice(Math.max(0, index - 2), index + 1);
  return Math.round(window.reduce((total, value) => total + value, 0) / window.length);
}

/** Pure function of the row — see Example 5 for why that is a requirement. */
function buildTrendSeries(row: NgeTableFixtureRow): NgeLineDataPoint[] {
  const target = (row.quantity % 60) + 20;

  return row.series.flatMap((value, index) => [
    { seriesId: 'Observed', x: DAY_LABELS[index], y: value },
    { seriesId: 'Smoothed', x: DAY_LABELS[index], y: trailingMean(row.series, index) },
    { seriesId: 'Target', x: DAY_LABELS[index], y: target },
  ]);
}

/** Pure function of the row — see Example 5 for why that is a requirement. */
function buildLagCloud(row: NgeTableFixtureRow): NgeScatterDataPoint[] {
  return SCATTER_LAGS.flatMap(lag =>
    row.series.slice(0, -lag).map((value, index) => ({
      seriesId: `Lag ${lag}`,
      x: value,
      y: row.series[index + lag],
    }))
  );
}

/**
 * How to put rich content in a `row-detail` band, as documentation.
 *
 * The band is the widest surface the table has, and since ARCH-298 it is also one
 * with a **declared height** — which together are what let it hold something a
 * cell cannot. Nothing below is a table feature: a band's content is the
 * consumer's own markup, and this whole story adds no library code.
 *
 * **No example here imports `@tanstack/*`.**
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-row-detail-content-usage-stories',
  },
  imports: [
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  selector: 'nge-table-row-detail-content-usage-stories',
  standalone: true,
  styleUrl: './row-detail-content-usage-stories.component.scss',
  templateUrl: './row-detail-content-usage-stories.component.html',
})
export class NgeTableRowDetailContentUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/row-detail-content/usage';

  /** The type carrier every `let-` binding below infers its row shape from. */
  readonly rows = rows;

  readonly windowedRows = windowedRows;

  /** 1. A band tall enough for two charts. */
  readonly bandConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
    rowDetailHeight: 320,
  });

  readonly bandState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [rows[0].id]: true } })
  );

  /** 6. The windowed regime, where the declared height is arithmetic. */
  readonly windowedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
    data: windowedRows,
    enableRowExpansion: true,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowDetailHeight: 320,
  });

  readonly windowedState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [windowedRows[1].id]: true } })
  );

  /** 7. The escape hatch when two band kinds genuinely want two heights. */
  readonly compactConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
    data: rows.slice(0, 4),
    enableRowExpansion: true,
    getRowId: row => row.id,
    rowDetailHeight: 160,
  });

  readonly compactState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [rows[0].id]: true } })
  );

  private readonly trendConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  private readonly lagConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  private readonly compactTrendConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  /**
   * Row → chart config, memoised by the ROW OBJECT (Example 4).
   *
   * A `WeakMap` keyed by `row`, not a `Map` keyed by `row.id`: a `Map` never
   * forgets a row it has seen, so a full virtualized scroll would end up holding
   * a config for every row in the dataset.
   */
  trendConfigFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.trendConfigs.get(row);

    if (cached) {
      return cached;
    }

    const config = createLineChartConfig({
      curveType: 'monotone',
      data: buildTrendSeries(row),
      legend: { enabled: true, position: 'bottom' },
      // ⚠️ `right` is widened past the preset's default 10: the last x tick label
      // is centred on the plot's right edge, so half of it renders in the right
      // margin and "Day 12" loses a digit at the default.
      margin: { bottom: 45, left: 52, right: 26, top: 16 },
      seriesColors: SERIES_COLORS,
      showPoints: true,
      showXAxis: true,
      showXGrid: true,
      showYAxis: true,
      xAxisLabel: 'Day',
      yAxisLabel: 'Value',
    });

    this.trendConfigs.set(row, config);

    return config;
  }

  lagConfigFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.lagConfigs.get(row);

    if (cached) {
      return cached;
    }

    const config = createScatterChartConfig({
      animationMs: 0,
      data: buildLagCloud(row),
      legend: { enabled: true, position: 'bottom' },
      // `left` clears the long rotated y-axis title; `right` keeps the terminal
      // "100" tick inside the SVG.
      margin: { bottom: 45, left: 58, right: 24, top: 16 },
      pointRadius: 5,
      seriesColors: SERIES_COLORS,
      showXAxis: true,
      showYAxis: true,
      xAxisLabel: 'Value at day i',
      xDomain: [0, 100],
      yAxisLabel: 'Value at day i + lag',
      yDomain: [0, 100],
    });

    this.lagConfigs.set(row, config);

    return config;
  }

  /**
   * The same series in a 160px band — Example 7's other half.
   *
   * ⚠️ **The band is shorter, so the CONTENT is simpler.** Legend, axis labels and
   * gridlines are ~75px of chrome that a 320px band affords and a 160px one does
   * not; kept, they would leave the plot a sliver. That is the per-table height
   * decision working as intended rather than a limitation worked around: you pick
   * one height for the table and pitch the content at it.
   */
  compactTrendConfigFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.compactTrendConfigs.get(row);

    if (cached) {
      return cached;
    }

    const config = createLineChartConfig({
      curveType: 'monotone',
      data: buildTrendSeries(row),
      legend: { enabled: false },
      // With no axes and no legend there is nothing for a margin to make room
      // FOR, so the preset's 45px gutters would spend a third of a short band on
      // empty space. Dropping the chrome and keeping its margin is the half-done
      // version of adapting content to the height.
      margin: { bottom: 8, left: 8, right: 8, top: 8 },
      seriesColors: SERIES_COLORS,
      showPoints: false,
      showXAxis: false,
      showYAxis: false,
    });

    this.compactTrendConfigs.set(row, config);

    return config;
  }

  onBandState(next: NgeTableState): void {
    this.bandState.set(next);
  }

  onWindowedState(next: NgeTableState): void {
    this.windowedState.set(next);
  }

  onCompactState(next: NgeTableState): void {
    this.compactState.set(next);
  }
}
