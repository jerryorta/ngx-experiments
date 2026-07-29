import type { WritableSignal } from '@angular/core';
import type { NgeChartConfig } from '@nge/charts';

import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { createSparklineChartConfig, NgeChartComponent } from '@nge/charts';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeCellSelectOption } from '../../../../../../editors';
import type {
  NgeScrollBenchmarkReport,
  NgeTableFixtureRow,
  NgeTableFixtureStatus,
} from '../../../../../../testing';
import type { NgeTableEvent } from '../../../../../events';
import type { NgeTableColumn } from '../../../../../nge-table-column';
import type { NgeTableState } from '../../../../../nge-table-state';

import {
  NgeCellCheckboxComponent,
  NgeCellInputComponent,
  ngeCellSelectEdit,
  ngeCellTextareaEdit,
} from '../../../../../../editors';
import {
  createNgeTableFixture,
  formatNgeScrollBenchmarkRuns,
  NGE_SCROLL_BENCHMARK_DEFAULTS,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
  NGE_TABLE_FIXTURE_STATUSES,
  haveSameNgeBenchmarkOptions,
  medianOf,
  runNgeScrollBenchmark,
} from '../../../../../../testing';
import { NgeCellShellComponent } from '../../../../../cell-shell';
import { createNgeTableConfig } from '../../../../../nge-table-config';
import { createNgeTableState } from '../../../../../nge-table-state';
import {
  NgeHighlightBridge,
  NgeHighlightOverlayComponent,
  provideNgeCellHighlighting,
} from '../../../../../highlight';
import {
  NgeFillHandleComponent,
  NgeRangeBridge,
  NgeRangeColumnHandleComponent,
  NgeRangeOverlayComponent,
  provideNgeCellRange,
} from '../../../../../range';
import { NgeCellDirective, NgeTableSlotDirective } from '../../../../../slots';
import { NgeTableComponent } from '../../../../nge-table.component';

/**
 * Row height this story measures at — the same 96px `Performance/Chart Cells` uses, and
 * for the identical reason: the chart column needs the room a 40px text row does not.
 * `nge-cell-shell.component.scss` already assumes this exact figure, so it is not a
 * number invented for this story.
 */
const SHOWCASE_ROW_HEIGHT = 96;

/**
 * Pixels advanced per measured frame — a whole multiple of {@link SHOWCASE_ROW_HEIGHT},
 * not `NGE_SCROLL_BENCHMARK_DEFAULTS.stepPx` (240, which is 2.5 rows at this height).
 * 288 is the next multiple of 96 above 240, so `expectedRowsBuilt` below stays an exact
 * figure instead of `null` — identical reasoning, and the identical value, as
 * chart-cells' `CHART_CELLS_STEP_PX`.
 */
const SHOWCASE_STEP_PX = 288;

/**
 * Height of an expanded row's detail band, in pixels.
 *
 * Comfortably taller than the `description` column's ellipsis-truncated width would
 * suggest, so the expanded band reads as a real disclosure rather than a sliver.
 */
const SHOWCASE_ROW_DETAIL_HEIGHT = 160;

/**
 * Frames of scrolling that precede a settle-burst measurement.
 *
 * Same figure and the same reason as `Performance/Chart Cells`' identical constant:
 * enough to guarantee `isScrolling` is true and every chart has unmounted, so the burst
 * measured afterwards is a real mount rather than a repaint of charts already there.
 */
const BURST_FLICK_FRAMES = 20;

/**
 * Frames timed after the flick stops.
 *
 * Same figure as `Performance/Chart Cells`: comfortably past `virtual-core`'s 150ms
 * `isScrollingResetDelay`, the chart's own 16ms render debounce, and a quiet tail
 * afterwards.
 */
const BURST_SETTLE_FRAMES = 45;

/** One decimal is the resolution a frame budget is argued at; more digits imply precision the clock lacks. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Thousands separators without `toLocaleString`, so the readout does not change shape
 * with the machine's locale — the numbers here get pasted into a ticket.
 */
function withThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** One entry in {@link SHOWCASE_FEATURES}. */
interface ShowcaseFeature {
  /** What the on-screen bulleted list reads. */
  readonly label: string;
  /** Compact, space-free — what the pasted report header enumerates. */
  readonly token: string;
}

/**
 * Every shipped feature this table turns on at once.
 *
 * ⚠️ **This list is what makes the report self-describing.** {@link SHOWCASE_FEATURE_LABEL}
 * joins every {@link ShowcaseFeature.token} into the header `formatNgeScrollBenchmarkRuns`
 * pastes — the same reason `Performance/Chart Cells` labels its `cellMode`: a ceiling figure
 * that cannot say what produced it is worse than no figure, because it still reads as
 * authoritative.
 */
const SHOWCASE_FEATURES: readonly ShowcaseFeature[] = [
  {
    label: 'Row selection — click, cmd/ctrl-click, shift-click, and the header select-all',
    token: 'rowSelection',
  },
  {
    label: 'Column pinning on both edges — the chart and Name pinned left, Owner pinned right',
    token: 'pinning',
  },
  { label: "Column resizing — drag any header's trailing edge", token: 'columnResizing' },
  { label: 'Zebra striping', token: 'striping' },
  { label: 'Sorting — click a header to cycle it', token: 'sorting' },
  { label: 'Row expansion — a detail band under any row', token: 'rowExpansion' },
  { label: 'Cell highlighting — click or shift-click a cell', token: 'cellHighlighting' },
  {
    label: 'Cell ranges — drag a rectangle, shift-click to extend, cmd/ctrl-drag to add a block',
    token: 'cellRange',
  },
  {
    label: "Column selection handles — the header's own whole-column affordance",
    token: 'columnHandles',
  },
  { label: "The fill handle — drag the active range's corner grip", token: 'fillHandle' },
  {
    label: `A chart cell, gated on the scroll-settle signal — the same ${SHOWCASE_ROW_HEIGHT}px row 'Performance/Chart Cells' uses`,
    token: 'chartCell',
  },
  {
    label: 'All four shipped editors at once — input (text + numeric), checkbox, select, textarea',
    token: 'editors',
  },
];

/** `+`-joined, no spaces, so a pasted report header stays one line per run. */
const SHOWCASE_FEATURE_LABEL = SHOWCASE_FEATURES.map(feature => feature.token).join('+');

/** What the status select's panel offers, built from the fixture's own enum. */
const STATUS_LABELS: Record<NgeTableFixtureStatus, string> = {
  active: 'Active',
  archived: 'Archived',
  failed: 'Failed',
  pending: 'Pending',
};

const STATUS_OPTIONS: readonly NgeCellSelectOption[] = NGE_TABLE_FIXTURE_STATUSES.map(status => ({
  label: STATUS_LABELS[status],
  value: status,
}));

/**
 * The chart column — same shape as `Performance/Chart Cells`' own `seriesColumn`,
 * declared HERE rather than added to {@link NGE_TABLE_FIXTURE_COLUMNS} for the identical
 * reason: that array backs the frozen ARCH-289 baseline, and a column landing there would
 * change the epic's reference measurement by the back door.
 *
 * `enableSorting: false` for the reason chart-cells' own copy is: ordering a
 * `readonly number[]` by `String(value)` answers no question a user asked.
 * `meta.ngeFill.enabled: false` keeps the fill handle from proposing to overwrite a trend
 * with a copied scalar — an array column is a valid fill *source* (it can seed a
 * neighbour) but not a sane *target*.
 */
const seriesColumn: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'series',
  enableSorting: false,
  header: 'Trend',
  id: 'series',
  meta: { ngeFill: { enabled: false } },
};

/**
 * The long-text column — same reasoning as ARCH-292's inline-edit demo: declared HERE,
 * never added to {@link NGE_TABLE_FIXTURE_COLUMNS}, for the identical frozen-baseline
 * reason {@link seriesColumn} is. It is also the textarea editor's target — the one
 * column of the four whose control cannot fit inside the row itself.
 */
const descriptionColumn: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'description',
  header: 'Description',
  id: 'description',
  meta: { ngeEdit: ngeCellTextareaEdit({ placeholder: 'Add a description…', rows: 5 }) },
};

/**
 * The shared seven, with four of them wired to the four shipped editors — `name` (text
 * input), `quantity` (numeric input), `status` (select, over the fixture's own enum),
 * `isActive` (checkbox, `alwaysLive` so the toggle is visible without a click to find it
 * first). `amount`, `createdAt` and `owner` are left exactly as the fixture declares them,
 * the same as `Performance/Cell Editors` leaves its untouched four.
 */
const SHOWCASE_EDITABLE_COLUMNS: NgeTableColumn<NgeTableFixtureRow>[] =
  NGE_TABLE_FIXTURE_COLUMNS.map(column => {
    if (column.id === 'name') {
      return { ...column, meta: { ngeEdit: { editor: NgeCellInputComponent, enabled: true } } };
    }

    if (column.id === 'status') {
      return { ...column, meta: { ngeEdit: ngeCellSelectEdit(STATUS_OPTIONS) } };
    }

    if (column.id === 'quantity') {
      return {
        ...column,
        meta: {
          ngeEdit: {
            editor: NgeCellInputComponent,
            editorInputs: { type: 'number' },
            enabled: true,
          },
        },
      };
    }

    if (column.id === 'isActive') {
      return {
        ...column,
        meta: {
          ngeEdit: { alwaysLive: true, editor: NgeCellCheckboxComponent, enabled: true },
        },
      };
    }

    return column;
  });

/**
 * The chart leading, the editable shared seven, the long-text column trailing — nine in
 * all, none of them touching {@link NGE_TABLE_FIXTURE_COLUMNS} itself.
 */
const SHOWCASE_COLUMNS: NgeTableColumn<NgeTableFixtureRow>[] = [
  seriesColumn,
  ...SHOWCASE_EDITABLE_COLUMNS,
  descriptionColumn,
];

/** The virtualization preset — the frame budget only means anything under a window. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * What one settle burst cost — the same measurement `Performance/Chart Cells` takes,
 * because this table's chart column defers to the identical `cell.isSettled()` signal
 * and a scripted continuous scroll cannot see its cost any other way (see the class doc's
 * ⚠️ on what such a scroll structurally hides).
 *
 * ⚠️ **Only the chart column defers to the settle signal.** The two always-live editors
 * (the checkbox, the select trigger) and the two activation-gated ones (the text input,
 * the textarea) build or skip on their own terms — activation, never scroll quiet — so
 * whatever they cost is already inside the scroll figures above, not hidden in this burst.
 */
interface ShowcaseBurstReport {
  /** Charts in the DOM once the burst finished — the window's worth. */
  readonly chartsMounted: number;
  /** Frames past 1.5× the idle interval, across the whole settle window. */
  readonly droppedFrames: number;
  /** Frames from the flick stopping to the first chart appearing in the DOM. */
  readonly framesToFirstChart: number;
  /** The display's own idle interval, measured during the quiet tail. */
  readonly idleFrameMs: number;
  /** …and the same in milliseconds, which is what a person perceives. */
  readonly msToFirstChart: number;
  /** Every frame timed after the flick stopped. */
  readonly timings: readonly number[];
  /** The worst single frame in the settle window — the burst itself. */
  readonly worstFrameMs: number;
}

/**
 * Share of frames that may drop before it stops being ordinary.
 *
 * Mirrors the baseline story's own allowance exactly — a real machine occasionally
 * misses a vsync for reasons that have nothing to do with the table.
 */
const DROPPED_FRAME_ALLOWANCE = 0.01;

/**
 * Every shipped NgeTable feature, switched on at once, over the same ten-thousand-row
 * fixture `Performance/Baseline` and `Performance/Chart Cells` measure —
 * **`Performance/Showcase/Interaction`**.
 *
 * ⚠️⚠️ **THE READING IS A CEILING, NOT A COST, AND IT IS NEVER ATTRIBUTABLE TO ANY ONE
 * FEATURE.** This table turns on all twelve of {@link SHOWCASE_FEATURES} at once, so
 * whatever the scroll benchmark reports below is "a fully-loaded table, on this machine" —
 * full stop. It is not "selection costs X" or "the chart costs Y minus the baseline". A
 * single feature's own cost is a controlled comparison against a same-session baseline
 * RE-RUN, which is exactly what each `Performance/<feature>/Interaction` story exists for;
 * this one does not replace any of them, and it answers a different question — does the
 * fully-loaded table, as a whole, still fit inside a frame budget once nobody is looking
 * at just one thing at a time.
 *
 * ⚠️ **The row is 96px here, not the baseline's 40px** — the same figure and the same
 * reason `Performance/Chart Cells` uses it: the chart column needs room a plain text row
 * does not, and every other feature in this table is equally happy at either height. That
 * alone moves the rows-per-step geometry away from the baseline's 714 — see
 * {@link expectedRowsBuilt} for this story's own figure, and never read the two
 * `rowsAdded` numbers as comparable.
 *
 * ⚠️ **The pasted report header enumerates every active feature** —
 * {@link SHOWCASE_FEATURE_LABEL} — for the identical reason `Performance/Chart Cells`
 * labels its `cellMode`: a number that cannot say what produced it is worse than no
 * number, because it still reads as authoritative. There is no mode control here —
 * unlike chart-cells, this story is not isolating one axis, so there is nothing to
 * switch between.
 *
 * ⚠️ **This story carries no hardcoded reference run.** Run
 * `Performance/Baseline/Interaction` in the same session, back to back with this one, and
 * read ITS p95 / worst frame / display against this run's — section 3 below is built
 * around that live comparison rather than a number written down on an earlier day, for
 * the identical reason `Performance/Chart Cells` and `Performance/Cell Editors` both give.
 *
 * ⚠️ **A hidden tab suspends `requestAnimationFrame`.** Both the scroll benchmark and the
 * settle burst refuse to start, or abandon a run already in flight, rather than hang on a
 * promise that can never settle.
 *
 * The table itself: ten thousand rows, virtualized, nine columns (a leading chart plus the
 * shared seven — four of them wired to the four shipped editors — plus a trailing
 * long-text column), pinned on both edges, resizable, striped, sortable, selectable,
 * expandable, with cell highlighting and cell ranges — plus column-selection handles and
 * the fill handle — both live over the same cells. Every one of those is a real, working
 * feature on this page: click a cell, drag a range, expand a row, sort a header. This is
 * not a static mock-up assembled only to look busy for the benchmark.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-showcase-interaction-stories',
  },
  imports: [
    NgeCellDirective,
    NgeCellShellComponent,
    NgeChartComponent,
    NgeFillHandleComponent,
    NgeHighlightOverlayComponent,
    NgeRangeColumnHandleComponent,
    NgeRangeOverlayComponent,
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  providers: [provideNgeCellHighlighting(), provideNgeCellRange()],
  selector: 'nge-table-showcase-interaction-stories',
  standalone: true,
  styleUrl: './showcase-interaction-stories.component.scss',
  templateUrl: './showcase-interaction-stories.component.html',
})
export class NgeTableShowcaseInteractionStoriesComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  protected readonly highlight = inject(NgeHighlightBridge);

  protected readonly range = inject(NgeRangeBridge);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/table/src/lib/nge-table/stories/performance/showcase/interaction';

  /** Frames to measure. Same default as the baseline story — only the row geometry differs. */
  readonly steps = input(NGE_SCROLL_BENCHMARK_DEFAULTS.steps);

  /** Pixels advanced per measured frame — an exact multiple of {@link SHOWCASE_ROW_HEIGHT}. */
  readonly stepPx = input(SHOWCASE_STEP_PX);

  readonly totalRowCount = NGE_TABLE_FIXTURE_SIZES.large;

  /** The type carrier `[ngeCellOf]` / `[ngeTableSlotOf]` bind, so every `let-` knows its row shape. */
  readonly rows = largeRows;

  /** Every feature this table turns on — read by the template for the on-screen bulleted list. */
  readonly features = SHOWCASE_FEATURES;

  readonly featureLabel = SHOWCASE_FEATURE_LABEL;

  /**
   * Ten thousand rows, virtualized, over all twelve of {@link SHOWCASE_FEATURES}.
   *
   * ⚠️ Every flag below is deliberately spelled out, including the ones the factory would
   * already default to `true` (`enableSorting`) — a reader scanning this object should see
   * the whole feature set in one place rather than checking `createNgeTableConfig`'s
   * defaults to confirm sorting is really on.
   */
  readonly config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: SHOWCASE_COLUMNS,
    data: largeRows,
    enableColumnResizing: true,
    enablePinning: true,
    enableRowExpansion: true,
    enableRowSelection: true,
    enableSorting: true,
    enableStriping: true,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowDetailHeight: SHOWCASE_ROW_DETAIL_HEIGHT,
    rowHeight: SHOWCASE_ROW_HEIGHT,
  });

  /**
   * Starts with both pinned lanes populated and nothing else — no pre-selected row, no
   * pre-expanded band, no pre-existing mark or range. Keeping every OTHER slice at its
   * `createNgeTableState()` default is what keeps {@link expectedRowsBuilt} exact: an
   * expanded row's height is `rowHeight + rowDetailHeight`, so a pre-expanded row would
   * quietly change how many rows a fixed scroll distance crosses. Pinning carries no such
   * risk — it reorders lanes, never row height.
   */
  readonly state = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['series', 'name'], right: ['owner'] } })
  );

  /** Every run this session, newest last — the record the variance check reads. */
  readonly runs = signal<readonly NgeScrollBenchmarkReport[]>([]);

  readonly isRunning = signal(false);

  /**
   * Every settle burst this session, newest last.
   *
   * Kept separate from {@link runs} for the same reason `Performance/Chart Cells` keeps
   * them apart: a burst and a scroll are different measurements with different units and
   * different verdicts, and one history would invite averaging them together.
   */
  readonly burstRuns = signal<readonly ShowcaseBurstReport[]>([]);

  /** The latest burst, for the readout tiles. */
  readonly burst = computed<null | ShowcaseBurstReport>(() => {
    const all = this.burstRuns();

    return all.length === 0 ? null : all[all.length - 1];
  });

  /**
   * Why the last run produced nothing.
   *
   * The harness refuses to run in a hidden tab, because a browser suspends
   * `requestAnimationFrame` there and the loop would never advance. Showing the reason
   * matters: without it the button sits on "Running…" with an empty console, which reads
   * as the table having hung.
   */
  readonly failure = signal<null | string>(null);

  readonly latest = computed<NgeScrollBenchmarkReport | null>(() => {
    const all = this.runs();

    return all.length === 0 ? null : all[all.length - 1];
  });

  /**
   * How far apart the last two runs' p95 landed, as a fraction of the earlier one.
   *
   * `null` until there are two runs to compare, and `null` again when the two runs used
   * different options — the controls are adjustable mid-session, and a drift across a
   * changed `stepPx` measures the change rather than the table while looking exactly like
   * a tolerance.
   */
  readonly p95Drift = computed<null | number>(() => {
    const all = this.runs();

    if (all.length < 2) {
      return null;
    }

    const previous = all[all.length - 2];
    const current = all[all.length - 1];

    if (!haveSameNgeBenchmarkOptions(previous, current)) {
      return null;
    }

    return previous.summary.p95FrameMs === 0
      ? null
      : Math.abs(current.summary.p95FrameMs - previous.summary.p95FrameMs) /
          previous.summary.p95FrameMs;
  });

  /** `true` when the session holds runs that cannot be compared to each other. */
  readonly hasMixedOptions = computed<boolean>(() => {
    const all = this.runs();

    return all.length > 1 && !all.every(report => haveSameNgeBenchmarkOptions(all[0], report));
  });

  readonly rounded = round;
  readonly counted = withThousands;

  /** The row height the expected-rows arithmetic divides by — shown so the sum is checkable. */
  readonly rowHeightPx = SHOWCASE_ROW_HEIGHT;

  /**
   * How many row elements a correct run must build — **machine-independent**, and
   * **not** the baseline's 714.
   *
   * Same geometry as the baseline — `(steps - 1) × (stepPx / rowHeight)` — evaluated
   * against this story's own 96px rows and 288px steps: `(120 - 1) × (288 / 96)` =
   * `119 × 3` = **357**. `null` when `stepPx` is not a whole number of rows.
   *
   * ⚠️ **This figure does not depend on which features are on — it never can.** A window
   * slide builds the same row elements whatever eleven other features are switched on, so
   * a run that disagrees is not "the showcase costs more rows" — it is a harness or
   * memoisation finding, because geometry has no opinion on cell contents or on how many
   * addons are watching them.
   */
  readonly expectedRowsBuilt = computed<null | number>(() => {
    const rowHeight = this.rowHeightPx;
    const step = this.stepPx();

    if (step % rowHeight !== 0) {
      return null;
    }

    return (this.steps() - 1) * (step / rowHeight);
  });

  /**
   * How to read this run's dropped-frame count: clean, tolerable, or a problem.
   *
   * Three states rather than a boolean, because 0 and "1 in 480" mean the same thing
   * about the table and something different about the machine.
   */
  readonly droppedVerdict = computed<'clean' | 'problem' | 'tolerable' | null>(() => {
    const report = this.latest();

    if (report === null) {
      return null;
    }

    if (report.droppedFrames === 0) {
      return 'clean';
    }

    return report.droppedFrames / report.summary.frames <= DROPPED_FRAME_ALLOWANCE
      ? 'tolerable'
      : 'problem';
  });

  /** `true` when the latest run built exactly the number of rows geometry demands. */
  readonly rowsBuiltMatches = computed<boolean | null>(() => {
    const report = this.latest();
    const expected = this.expectedRowsBuilt();

    return report === null || expected === null ? null : report.rowsAdded === expected;
  });

  /** How many rows are currently selected — proof the selection slice is live under everything else. */
  readonly selectedRowCount = computed(() => Object.keys(this.state().rowSelection).length);

  /** How many rows are currently expanded, honouring the `true` expand-all shorthand. */
  readonly expandedRowCount = computed(() => {
    const { expanded } = this.state();

    return expanded === true ? this.totalRowCount : Object.keys(expanded).length;
  });

  /** Whether anything is highlighted right now, for the clear button's disabled state. */
  readonly hasHighlightMarks = computed(() => {
    const slice = this.state().ngeHighlight;

    return (slice?.cells.length ?? 0) > 0 || (slice?.ranges.length ?? 0) > 0;
  });

  /** Whether a cell range is currently selected, for its clear button's disabled state. */
  readonly hasRangeSelection = computed(() => (this.state().ngeRange?.ranges.length ?? 0) > 0);

  /**
   * The scroll report, headed by the full feature enumeration.
   *
   * ⚠️ **The label is not decoration.** Every run of this story measures the same twelve
   * features at once, so without it every pasted run would carry an identical header —
   * distinguishable only by the very numbers the header exists to identify.
   */
  readonly reportText = computed<string>(() =>
    formatNgeScrollBenchmarkRuns(this.runs(), `NgeTable showcase · scroll · ${this.featureLabel}`)
  );

  /**
   * The burst report, same contract: it says what it measured, in its own units.
   *
   * Hand-rolled rather than routed through `formatNgeScrollBenchmarkRuns`, because a
   * burst is not a scroll — no `rowsAdded`, no p95 over 120 frames, and a `worst frame`
   * that means the opposite thing (there, a stutter; here, the whole point).
   */
  readonly burstReportText = computed<string>(() => {
    const all = this.burstRuns();

    if (all.length === 0) {
      return '';
    }

    const lines = [
      `NgeTable showcase · settle burst · ${this.featureLabel} — ${all.length} run${all.length === 1 ? '' : 's'}`,
      `options           ${BURST_FLICK_FRAMES} flick frames x ${this.stepPx()}px, then ${BURST_SETTLE_FRAMES} timed frames`,
      `geometry          ${SHOWCASE_ROW_HEIGHT}px rows, ${withThousands(NGE_TABLE_FIXTURE_SIZES.large)} rows virtualized`,
      '',
      'run  charts  to first chart  worst    dropped  idle',
    ];

    all.forEach((report, index) => {
      lines.push(
        `${String(index + 1).padEnd(5)}${String(report.chartsMounted).padEnd(8)}${`${report.msToFirstChart}ms`.padEnd(16)}${`${report.worstFrameMs}ms`.padEnd(9)}${String(report.droppedFrames).padEnd(9)}${report.idleFrameMs}ms`
      );
    });

    return lines.join('\n');
  });

  /** `true` briefly after a successful copy, so the button can confirm itself. */
  readonly justCopied = signal(false);

  /** The same, for the burst's own copy button — separate so one does not flash the other. */
  readonly justCopiedBurst = signal(false);

  /**
   * Chart configs, memoised against the **row object** — same reasoning, same shape, as
   * `Performance/Chart Cells`' identical map: `<nge-chart>` re-renders on config
   * *reference* change, so an un-memoised factory called from the template would
   * re-render every visible chart on any change-detection pass this fully-loaded table
   * has more reasons than most to run (a sort, a selection, a resize, a highlight).
   */
  private readonly chartConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  /** Whether `shift` was down when the current gesture started — read on `mousedown`, before `cell-click` fires. */
  private shiftHeld = false;

  /** Build (once) or return (thereafter) one row's sparkline config. */
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

  /**
   * Captures the shift modifier for the highlight gesture and suppresses the browser's
   * own text-selection drag — identical to `stories/highlight/highlight-demo-table`'s
   * `captureModifier`. Gated on `shiftKey` alone, never applied unconditionally: an
   * unconditional `preventDefault` would suppress focus too, which would break the text
   * input and textarea editors this same table ships.
   */
  captureModifier(event: MouseEvent): void {
    this.shiftHeld = event.shiftKey;

    if (event.shiftKey) {
      event.preventDefault();
    }
  }

  /** The highlight half of the event stream — cell ranges and the fill handle run their own delegated gesture. */
  onNgeTableEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
    if (event.kind !== 'cell-click') {
      return;
    }

    const { columnId, rowId } = event.cell;

    if (this.shiftHeld) {
      this.highlight.extendTo(rowId, columnId);
    } else {
      this.highlight.toggle(rowId, columnId);
    }
  }

  onStateChange(next: NgeTableState): void {
    this.state.set(next);
  }

  clearHighlight(): void {
    this.highlight.clear();
  }

  clearCellRange(): void {
    this.range.clear();
  }

  async copyReport(): Promise<void> {
    await this.copyText(this.reportText(), this.justCopied);
  }

  async copyBurstReport(): Promise<void> {
    await this.copyText(this.burstReportText(), this.justCopiedBurst);
  }

  /** Shared by both copy buttons. A blocked clipboard is not worth an error state — each report also renders as a selectable `<pre>`. */
  private async copyText(text: string, flag: WritableSignal<boolean>): Promise<void> {
    if (text === '') {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      flag.set(true);
      setTimeout(() => flag.set(false), 1500);
    } catch {
      flag.set(false);
    }
  }

  async runBenchmark(): Promise<void> {
    const viewport = this.host.nativeElement.querySelector<HTMLElement>('.nge-table__viewport');

    // A missing viewport means the table has not rendered — which under jsdom is the
    // normal case, and is worth saying rather than throwing.
    if (viewport === null || this.isRunning()) {
      return;
    }

    this.isRunning.set(true);
    this.failure.set(null);

    try {
      const report = await runNgeScrollBenchmark(viewport, {
        stepPx: this.stepPx(),
        steps: this.steps(),
      });

      this.runs.update(all => [...all, report]);
    } catch (error) {
      this.failure.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.isRunning.set(false);
    }
  }

  /**
   * Flick, stop, and time the settle — the measurement the scroll benchmark cannot take.
   *
   * A scripted, uninterrupted scroll never lets `isSettled()` go true, so the chart column
   * shells the whole way through the run above and the benchmark alone would report a
   * ceiling with the one deferred feature never actually paying its cost. This is what
   * fixes that: flick hard enough to clear every chart, stop dead, and time the frame the
   * visible window's charts mount in.
   */
  async runSettleBurst(): Promise<void> {
    const viewport = this.host.nativeElement.querySelector<HTMLElement>('.nge-table__viewport');

    if (viewport === null || this.isRunning()) {
      return;
    }

    const view = viewport.ownerDocument.defaultView;

    if (view === null || viewport.ownerDocument.visibilityState === 'hidden') {
      this.failure.set(
        'The settle burst needs a visible, foregrounded tab — a hidden tab suspends requestAnimationFrame.'
      );

      return;
    }

    this.isRunning.set(true);
    this.failure.set(null);

    try {
      const burstReport = await this.measureSettleBurst(view, viewport);

      this.burstRuns.update(all => [...all, burstReport]);
    } catch (error) {
      this.failure.set(error instanceof Error ? error.message : String(error));
    } finally {
      this.isRunning.set(false);
    }
  }

  clearRuns(): void {
    this.runs.set([]);
    this.burstRuns.set([]);
    this.failure.set(null);
  }

  /** One frame, resolved after the browser's next paint opportunity. */
  private nextFrame(view: Window): Promise<number> {
    return new Promise<number>(resolve =>
      view.requestAnimationFrame(() => resolve(view.performance.now()))
    );
  }

  /**
   * Phase 1 then phase 2: scroll hard enough to clear every chart, stop dead, and time
   * what happens next. Identical shape to `Performance/Chart Cells`' own
   * `measureSettleBurst` — the flick is setup, never measurement.
   */
  private async measureSettleBurst(
    view: Window,
    viewport: HTMLElement
  ): Promise<ShowcaseBurstReport> {
    for (let frame = 0; frame < BURST_FLICK_FRAMES; frame++) {
      viewport.scrollTop += this.stepPx();
      await this.nextFrame(view);
    }

    const timings: number[] = [];
    let framesToFirstChart = -1;
    let msToFirstChart = 0;
    let elapsed = 0;
    let previous = await this.nextFrame(view);

    for (let frame = 0; frame < BURST_SETTLE_FRAMES; frame++) {
      const now = await this.nextFrame(view);
      const delta = now - previous;

      previous = now;
      timings.push(delta);
      elapsed += delta;

      if (framesToFirstChart === -1 && viewport.querySelector('nge-chart') !== null) {
        framesToFirstChart = frame;
        msToFirstChart = elapsed;
      }
    }

    const tail = timings.slice(-10);
    const idleFrameMs = tail.length === 0 ? 0 : medianOf(tail);
    const droppedThresholdMs = idleFrameMs * 1.5;

    return {
      chartsMounted: viewport.querySelectorAll('nge-chart').length,
      droppedFrames:
        idleFrameMs === 0 ? 0 : timings.filter(timing => timing > droppedThresholdMs).length,
      framesToFirstChart,
      idleFrameMs: round(idleFrameMs),
      msToFirstChart: round(msToFirstChart),
      timings,
      worstFrameMs: round(Math.max(...timings)),
    };
  }
}
