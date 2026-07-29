import type {
  NgeChartConfig,
  NgeCrosshairConfig,
  NgeLineDataPoint,
  NgeScatterDataPoint,
  NgeTooltipContent,
  NgeTooltipRow,
} from '@nge/charts';

import { Component, computed, input, signal, ViewEncapsulation } from '@angular/core';
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

const windowedRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

const flowRows = createNgeTableFixture({ rows: 6 });

/** Shared across both hosts, so a series keeps one colour in both pictures. */
const SERIES_COLORS = ['#1E88E5', '#43A047', '#FB8C00'];

/** The categorical x the crosshair guide snaps between — one node per fixture point. */
const DAY_LABELS = Array.from(
  { length: NGE_TABLE_FIXTURE_SERIES_LENGTH },
  (_, index) => `Day ${index + 1}`
);

/** Lags the scatter plots the series against itself at. */
const SCATTER_LAGS = [1, 2, 3] as const;

/** Trailing 3-point mean of the row's own series. Nothing is invented. */
function trailingMean(series: readonly number[], index: number): number {
  const window = series.slice(Math.max(0, index - 2), index + 1);
  return Math.round(window.reduce((total, value) => total + value, 0) / window.length);
}

/**
 * The row's twelve numbers as a trend: what they were, where they were heading,
 * and the level they were aiming at.
 *
 * ⚠️ **A pure function of the row, and that is a hard requirement rather than a
 * stylistic one.** Virtualization recycles DOM, so this runs again every time the
 * band's element is handed a different row — anything drawn from `Math.random()`
 * would redraw itself as the user scrolled.
 */
function buildTrendSeries(row: NgeTableFixtureRow): NgeLineDataPoint[] {
  const target = (row.quantity % 60) + 20;

  return row.series.flatMap((value, index) => [
    { seriesId: 'Observed', x: DAY_LABELS[index], y: value },
    { seriesId: 'Smoothed', x: DAY_LABELS[index], y: trailingMean(row.series, index) },
    { seriesId: 'Target', x: DAY_LABELS[index], y: target },
  ]);
}

/**
 * The same twelve numbers plotted against themselves at three lags — each point
 * is `(series[i], series[i + lag])`.
 *
 * Deliberately a different *kind* of picture from the trend beside it rather than
 * a second copy of it: a lag plot answers "does this row repeat itself?", which
 * reading down a sparkline column cannot. That contrast is the story's actual
 * subject — a band is wide enough to hold two views of one row at once.
 */
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
 * Two charts side by side in one `row-detail` band, driven live.
 *
 * The subject is the **band**, not the charts: what a surface a whole table wide
 * can hold, and how the height it declares reaches the content inside it. Both
 * hosts are the ones the charts library already documents — the scatter from
 * `Charts/NgeChart/Scatter Chart/Interaction`, the crosshair line from
 * `Charts/NgeChart/Crosshair/Interaction` — so what is new here is the surface
 * they are sitting on.
 *
 * ⚠️ **`<nge-chart>` collapses to nothing in a zero-height parent** — its shadow
 * root injects `:host, svg { width: 100%; height: 100% }`, and a percentage
 * resolves against nothing when the parent's height is `auto`. The band declares
 * a height (`config.rowDetailHeight`), and `.detail-band` claims it by reading
 * `--nge-table-row-detail-height` directly. See the SCSS — that one rule is the
 * whole height contract, and `align-self: stretch` (what a chart *cell* uses)
 * does not substitute for it, because the band is a block rather than a flex item
 * on a definite-height line.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-row-detail-content-interaction-stories',
  },
  imports: [
    NgeChartComponent,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  selector: 'nge-table-row-detail-content-interaction-stories',
  standalone: true,
  styleUrl: './row-detail-content-interaction-stories.component.scss',
  templateUrl: './row-detail-content-interaction-stories.component.html',
})
export class NgeTableRowDetailContentInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/row-detail-content/interaction';

  /**
   * The declared band height, in pixels. **The headline control** — drag it and
   * both charts re-lay-out to the new box, because they read the height rather
   * than carrying one.
   */
  readonly rowDetailHeight = input<number>(320);

  /** Draw the crosshair's vertical guide, snapped to the nearest day. */
  readonly crosshairX = input<boolean>(true);

  /** Draw the crosshair's horizontal guide at the pointer y. */
  readonly crosshairY = input<boolean>(false);

  /** One shared card listing all three series at the snapped day. */
  readonly sharedTooltip = input<boolean>(true);

  /** Marker radius on the lag cloud. */
  readonly pointRadius = input<number>(5);

  /** Space between the two charts, in pixels. */
  readonly chartGap = input<number>(16);

  /** The type carrier every `let-` binding in the template infers its row from. */
  readonly windowedRows = windowedRows;

  /** The un-virtualized comparison's rows. */
  readonly flowRows = flowRows;

  /** 10,000 rows, windowed — the regime where the band's height is arithmetic. */
  readonly windowedConfig = computed(() =>
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: windowedRows,
      enableRowExpansion: true,
      enableVirtualization: true,
      getRowId: row => row.id,
      rowDetailHeight: this.rowDetailHeight(),
    })
  );

  readonly windowedState = signal<NgeTableState>(createNgeTableState());

  /**
   * Six rows, un-windowed — where the band takes the same declared height it takes
   * in a window. The same band markup renders in both.
   */
  readonly flowConfig = computed(() =>
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS.slice(0, 4),
      data: flowRows,
      enableRowExpansion: true,
      getRowId: row => row.id,
      rowDetailHeight: this.rowDetailHeight(),
    })
  );

  readonly flowState = signal<NgeTableState>(createNgeTableState());

  /** The expansion slice alone — the contract this story is really demonstrating. */
  readonly windowedExpandedJson = computed(() =>
    JSON.stringify(this.windowedState().expanded, null, 2)
  );

  /** How many rows are open, without enumerating a `true` shorthand. */
  readonly windowedOpenCount = computed(() => {
    const expanded = this.windowedState().expanded;
    return expanded === true ? windowedRows.length : Object.keys(expanded ?? {}).length;
  });

  private readonly crosshair = computed<NgeCrosshairConfig>(() => ({
    shared: this.sharedTooltip(),
    snap: 'datum',
    x: this.crosshairX(),
    y: this.crosshairY(),
  }));

  /**
   * Row → chart config, memoised **by the row object**, with the cache itself
   * rebuilt whenever a control the config reads moves.
   *
   * ⚠️ Two separate hazards, and each half addresses one. A factory called
   * straight from the template allocates a new config on every change-detection
   * pass, so `<nge-chart>`'s `config` input changes identity and the chart
   * re-renders — which under virtualization is precisely the cost worth avoiding.
   * But a cache that never invalidated would serve a config built under the *old*
   * control values forever, so the control would appear dead. Returning the
   * dependency alongside the map is what makes the invalidation a use rather than
   * a side effect.
   *
   * A `WeakMap` keyed by `row`, not a `Map` keyed by `row.id`: a `Map` never
   * forgets a row it has seen, so scrolling 10,000 rows would end up holding a
   * config for every one of them.
   */
  private readonly trendCache = computed(() => ({
    cache: new WeakMap<NgeTableFixtureRow, NgeChartConfig>(),
    crosshair: this.crosshair(),
  }));

  private readonly lagCache = computed(() => ({
    cache: new WeakMap<NgeTableFixtureRow, NgeChartConfig>(),
    pointRadius: this.pointRadius(),
  }));

  trendConfigFor(row: NgeTableFixtureRow): NgeChartConfig {
    const { cache, crosshair } = this.trendCache();
    const cached = cache.get(row);

    if (cached) {
      return cached;
    }

    const preset = createLineChartConfig({
      curveType: 'monotone',
      data: buildTrendSeries(row),
      legend: { enabled: true, position: 'bottom' },
      // ⚠️ `right` is widened well past the preset's default 10. The last x tick
      // label is CENTRED on the plot's right edge, so half of it renders inside
      // the right margin — at 10px "Day 12" loses its second digit, which reads
      // as a rendering bug rather than as a margin that is too small. `left`
      // clears the rotated y-axis title plus two-digit ticks.
      margin: { bottom: 45, left: 52, right: 26, top: 16 },
      seriesColors: SERIES_COLORS,
      showPoints: true,
      showXAxis: true,
      showXGrid: true,
      showYAxis: true,
      xAxisLabel: 'Day',
      yAxisLabel: 'Value',
    });

    // The crosshair is opt-in and merges onto the preset's `base`; no preset
    // factory takes one, so every host that wants it spreads it on this way.
    const config: NgeChartConfig = { ...preset, base: { ...preset.base, crosshair } };

    cache.set(row, config);

    return config;
  }

  lagConfigFor(row: NgeTableFixtureRow): NgeChartConfig {
    const { cache, pointRadius } = this.lagCache();
    const cached = cache.get(row);

    if (cached) {
      return cached;
    }

    const config = createScatterChartConfig({
      animationMs: 0,
      data: buildLagCloud(row),
      legend: { enabled: true, interactive: true, position: 'bottom' },
      // `left` clears the long rotated y-axis title; `right` keeps the terminal
      // "100" tick label inside the SVG rather than half-clipped by its edge.
      margin: { bottom: 45, left: 58, right: 24, top: 16 },
      pointRadius,
      seriesColors: SERIES_COLORS,
      showXAxis: true,
      showYAxis: true,
      tooltip: { enabled: true, position: 'follow-mouse' },
      xAxisLabel: 'Value at day i',
      // Both axes carry the fixture's own bound on `series`, so the cloud is
      // read against a fixed square and rows stay comparable to each other.
      xDomain: [0, 100],
      yAxisLabel: 'Value at day i + lag',
      yDomain: [0, 100],
    });

    cache.set(row, config);

    return config;
  }

  /** Type-safe accessor for the shared tooltip rows in the `#ngeChartTooltip` template. */
  rowsOf(content: NgeTooltipContent | null): NgeTooltipRow[] {
    return content?.rows ?? [];
  }

  onWindowedState(next: NgeTableState): void {
    this.windowedState.set(next);
  }

  onFlowState(next: NgeTableState): void {
    this.flowState.set(next);
  }

  /**
   * Open a row from OUTSIDE the table — the other half of the controlled-state
   * round trip, which a click on the chevron never shows. Host-pushed state is
   * deliberately silent: it emits no `NgeTableEvent`.
   */
  openFromHost(index: number): void {
    const id = windowedRows[index].id;
    this.windowedState.update(state => ({ ...state, expanded: { [id]: true } }));
  }

  collapseAll(): void {
    this.windowedState.update(state => ({ ...state, expanded: {} }));
  }
}
