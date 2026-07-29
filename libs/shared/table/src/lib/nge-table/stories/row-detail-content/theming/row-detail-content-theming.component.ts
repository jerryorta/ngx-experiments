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
import type { NgeTableConfig } from '../../../../nge-table-config';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SERIES_LENGTH,
} from '../../../../../testing';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableSlotDirective } from '../../../../slots';
import { NgeTableComponent } from '../../../nge-table.component';

const rows = createNgeTableFixture({ rows: 4 });

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

function buildTrendSeries(row: NgeTableFixtureRow): NgeLineDataPoint[] {
  const target = (row.quantity % 60) + 20;

  return row.series.flatMap((value, index) => [
    { seriesId: 'Observed', x: DAY_LABELS[index], y: value },
    { seriesId: 'Smoothed', x: DAY_LABELS[index], y: trailingMean(row.series, index) },
    { seriesId: 'Target', x: DAY_LABELS[index], y: target },
  ]);
}

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
 * A band's slice of the `--nge-table-*` contract, and the seam where it meets
 * another library's.
 *
 * ⚠️ **There is no `config.theme` on `NgeTableConfig`, so the substance of this
 * story is its SCSS.** Each section is a scoped wrapper class re-declaring
 * tokens, which is exactly what a consumer overriding them would write.
 *
 * The band is the one surface in the table where a **second** token family shows
 * up. `--nge-table-row-detail-surface` paints the band; the chart sitting on it
 * reads `--nge-chart-*` and knows nothing about the table. A theme that moves
 * only one of the two produces the failure this story exists to make visible: a
 * dark band with a bright white chart punched through it.
 *
 * ⚠️ **`--nge-table-row-detail-height` is the geometry trap in a new place.**
 * `createNgeTableConfig()` fills `rowDetailHeight` in from `NGE_TABLE_DEFAULTS`
 * unconditionally, and `<nge-table>` then publishes it as an **inline** custom
 * property on the host — where it beats a wrapper class outright, because an
 * inline declaration outranks a class selector regardless of specificity. So the
 * band height is a *config* concern by default, and only becomes themeable when
 * the config omits the field (see {@link themableHeightConfig}).
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-row-detail-content-theming',
  },
  imports: [
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  selector: 'nge-table-row-detail-content-theming',
  standalone: true,
  styleUrl: './row-detail-content-theming.component.scss',
  templateUrl: './row-detail-content-theming.component.html',
})
export class NgeTableRowDetailContentThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/row-detail-content/theming';

  /** The type carrier every `let-` binding below infers its row shape from. */
  readonly rows = rows;

  /**
   * One config, reused by every section that is only re-declaring colours —
   * theming changes nothing about configuration.
   */
  readonly config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 3),
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
    rowDetailHeight: 300,
  });

  /**
   * Hand-authored, and **`rowDetailHeight` is deliberately absent** — which is
   * what hands `--nge-table-row-detail-height` back to the theme. Written
   * through `createNgeTableConfig()` the factory would fill the field in and the
   * component would pin it inline, beating any wrapper class.
   *
   * This is a supported path: the factory exists for convenience, not as the only
   * constructor.
   */
  readonly themableHeightConfig: NgeTableConfig<NgeTableFixtureRow> = {
    columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 3),
    data: rows,
    enableRowExpansion: true,
    getRowId: row => row.id,
  };

  readonly surfaceState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [rows[0].id]: true } })
  );

  readonly bridgedState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [rows[0].id]: true } })
  );

  readonly unbridgedState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [rows[0].id]: true } })
  );

  readonly shortState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [rows[0].id]: true } })
  );

  readonly tallState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [rows[0].id]: true } })
  );

  readonly darkState = signal<NgeTableState>(
    createNgeTableState({ expanded: { [rows[0].id]: true } })
  );

  private readonly trendConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  private readonly lagConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  trendConfigFor(row: NgeTableFixtureRow): NgeChartConfig {
    const cached = this.trendConfigs.get(row);

    if (cached) {
      return cached;
    }

    const config = createLineChartConfig({
      curveType: 'monotone',
      data: buildTrendSeries(row),
      legend: { enabled: true, position: 'bottom' },
      // Matches the other two facets: `right` past the preset's default 10 so the
      // last x tick label is not half-clipped by the plot edge.
      margin: { bottom: 45, left: 52, right: 26, top: 16 },
      seriesColors: SERIES_COLORS,
      showXAxis: true,
      showXGrid: true,
      showYAxis: true,
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
      margin: { bottom: 45, left: 58, right: 24, top: 16 },
      pointRadius: 5,
      seriesColors: SERIES_COLORS,
      showXAxis: true,
      showYAxis: true,
      xDomain: [0, 100],
      yDomain: [0, 100],
    });

    this.lagConfigs.set(row, config);

    return config;
  }

  onSurfaceState(next: NgeTableState): void {
    this.surfaceState.set(next);
  }

  onBridgedState(next: NgeTableState): void {
    this.bridgedState.set(next);
  }

  onUnbridgedState(next: NgeTableState): void {
    this.unbridgedState.set(next);
  }

  onShortState(next: NgeTableState): void {
    this.shortState.set(next);
  }

  onTallState(next: NgeTableState): void {
    this.tallState.set(next);
  }

  onDarkState(next: NgeTableState): void {
    this.darkState.set(next);
  }
}
