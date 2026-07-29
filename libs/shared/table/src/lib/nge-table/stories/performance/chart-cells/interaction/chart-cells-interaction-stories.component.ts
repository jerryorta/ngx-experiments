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

import type { NgeScrollBenchmarkReport, NgeTableFixtureRow } from '../../../../../../testing';
import type { NgeTableColumn } from '../../../../../nge-table-column';

import {
  createNgeTableFixture,
  formatNgeScrollBenchmarkRuns,
  NGE_SCROLL_BENCHMARK_DEFAULTS,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
  haveSameNgeBenchmarkOptions,
  medianOf,
  runNgeScrollBenchmark,
} from '../../../../../../testing';
import { NgeCellShellComponent } from '../../../../../cell-shell';
import { createNgeTableConfig } from '../../../../../nge-table-config';
import { NgeCellDirective } from '../../../../../slots';
import { NgeTableComponent } from '../../../../nge-table.component';

/**
 * Row height this story measures at — **taller than the ARCH-289 baseline's 40px**,
 * because a chart needs room the baseline's plain text cells do not.
 * `nge-cell-shell.component.scss` already assumes this exact figure ("correct for a
 * 40px text row and a 96px chart row alike"), so it is not a number invented here.
 */
const CHART_CELLS_ROW_HEIGHT = 96;

/**
 * Pixels advanced per measured frame — **not** `NGE_SCROLL_BENCHMARK_DEFAULTS.stepPx`
 * (240), because 240 is not a whole number of 96px rows (240 ÷ 96 = 2.5). 288 is the
 * next multiple of 96 above 240, so every step still crosses a whole number of rows —
 * 3 of them — and `expectedRowsBuilt` below stays an exact figure instead of `null`.
 */
const CHART_CELLS_STEP_PX = 288;

/**
 * Frames of scrolling that precede a settle-burst measurement.
 *
 * Enough to guarantee `isScrolling` is true and every chart has unmounted, so the
 * burst measured afterwards is a real mount rather than a repaint of charts that
 * were already there. Deliberately short — this phase is setup, not measurement.
 */
const BURST_FLICK_FRAMES = 20;

/**
 * Frames timed after the flick stops.
 *
 * Must comfortably outlast `virtual-core`'s 150ms `isScrollingResetDelay` (~9 frames
 * at 60Hz) plus the mount, plus `<nge-chart>`'s own 16ms render debounce, plus
 * enough idle frames afterwards to show the table has returned to rest. 45 frames is
 * ~750ms at 60Hz, which covers all of it with room to spare on a slower display.
 */
const BURST_SETTLE_FRAMES = 45;

/** One decimal is the resolution a frame budget is argued at; more digits imply precision the clock lacks. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * What one settle burst cost.
 *
 * ⚠️ **This — not the scroll — is the number ARCH-291's acceptance criterion is really
 * asking for.** Read literally, "a scripted scroll with the chart column present stays
 * inside the frame budget" passes vacuously: the harness advances `scrollTop` on every
 * measured frame, so `isScrolling` never clears, `isSettled()` is false throughout, and
 * not one chart is ever built. The harness would time a column of grey shells and report
 * a pass.
 *
 * The cost this feature actually creates arrives the moment the user stops: N charts
 * mounting in a single frame, each attaching a shadow root, constructing a
 * `ResizeObserver` and running a full render. That is the burst.
 *
 * ⚠️ **What it measured (2026-07-28, M5 Max / 60Hz): nothing.** 19 charts mounted,
 * `to first chart` 150.3 / 150.2ms — within 0.3ms of the engine's 150ms
 * `isScrollingResetDelay`, which is the settle contract confirmed rather than asserted —
 * and a worst frame of 17.6 / 17.7ms, indistinguishable from the 16.7ms idle frame, with
 * zero dropped. The burst fits inside a single frame at sparkline weight.
 *
 * **So state the value as headroom, not as a saving.** `isSettled` does not make a chart
 * cheaper; it moves work off the scroll onto the settle, and at this content weight it
 * does not measurably do even that — the scroll benchmark reports the same p95 with the
 * gate engaged and with it defeated. ⚠️ And `p95` on a vsync-locked display cannot
 * separate 1ms of work from 15ms; it moves only when work *exceeds* the budget, so
 * "identical" means "both fit", not "both cost the same". The seam earns its place
 * against heavier cells and slower machines, and claiming more than that did not survive
 * being measured.
 */
interface ChartCellsBurstReport {
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
  /**
   * The worst single frame in the settle window — the burst itself.
   *
   * ⚠️ Read this against the idle interval, never against the scroll benchmark's p95.
   * One long frame here is the expected shape of the result, not a regression: it is the
   * cost being deliberately relocated to a moment when nothing is moving.
   */
  readonly worstFrameMs: number;
}

/**
 * Thousands separators without `toLocaleString`, so the readout does not change
 * shape with the machine's locale — the numbers here get pasted into a ticket.
 */
function withThousands(value: number): string {
  return Math.round(value)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/**
 * Share of frames that may drop before it stops being ordinary.
 *
 * Mirrors the baseline story's own allowance exactly — see
 * `stories/performance/baseline/interaction` for the full reasoning. A real machine
 * occasionally misses a vsync for reasons that have nothing to do with the table, so a
 * strict `=== 0` check would paint a healthy machine red.
 */
const DROPPED_FRAME_ALLOWANCE = 0.01;

/**
 * The chart column ARCH-291 adds — declared here, **never** in
 * `NGE_TABLE_FIXTURE_COLUMNS`.
 *
 * That array is still exactly the seven columns the frozen ARCH-289 baseline renders
 * wholesale; adding a column there would change the epic's reference measurement by
 * the back door, with nothing to flag it. This story instead builds its own column set
 * — see {@link CHART_CELLS_COLUMNS} — so the baseline's subject never moves and this
 * story's subject is exactly one column heavier.
 *
 * `enableSorting: false` because ordering a `readonly number[]` by its default
 * `String(value)` comparison answers no question a user asked
 * (`nge-array-cell.spec.ts` pins the sortable-by-default case this opts out of).
 */
const seriesColumn: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'series',
  enableSorting: false,
  header: 'Trend',
  id: 'series',
};

/**
 * The one column this story exists to measure, **leading**, then the shared seven.
 *
 * Leading rather than trailing on purpose: it is the subject, and a reader scanning the
 * table should meet it first. It also makes the measurement marginally more honest — a
 * leading column is the one a horizontal scroll is least likely to push out of view, so
 * the charts stay in the window for the whole run rather than depending on where the
 * table happens to be scrolled sideways.
 */
const CHART_CELLS_COLUMNS: NgeTableColumn<NgeTableFixtureRow>[] = [
  seriesColumn,
  ...NGE_TABLE_FIXTURE_COLUMNS,
];

/** The virtualization preset — the frame budget only means anything under a window. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * The three cell-rendering strategies {@link NgeTableChartCellsInteractionStoriesComponent.cellMode}
 * can measure — see that field's doc comment for what each one is for.
 */
type ChartCellsMode = 'always-chart' | 'always-shell' | 'gated';

/**
 * ARCH-291's chart-cells cost, measured against ARCH-289's frozen baseline —
 * **`Performance/Chart Cells/Interaction`**, the sibling `Performance/Baseline/Interaction`
 * exists for.
 *
 * The baseline story measures a plain virtualized table so a later feature's cost could
 * be read against it. This is that feature: the same ten-thousand-row fixture,
 * virtualized, with one extra column whose cell renders a `<nge-chart>` sparkline once
 * `cell.isSettled()` says the scroll has been quiet long enough (ARCH-291) — and
 * nothing else different from the baseline's plain table. The acceptance criterion this
 * story exists to check is a **number**, not an impression: a scripted scroll with the
 * chart column present stays inside ARCH-289's frame budget, measured with the
 * identical harness.
 *
 * ⚠️ **This story carries no hardcoded reference run, unlike the baseline.** The
 * baseline's `REFERENCE_RUN` is a real figure someone actually measured and is offered
 * purely as a "same ballpark" sanity check — never a threshold. This story has no such
 * figure to offer yet, and inventing a plausible-looking one would be worse than
 * omitting it: a fabricated number reads as measured. Section 3 below compares against
 * a **live** re-run of the baseline story instead — see its doc comment.
 *
 * ⚠️ **A hidden tab suspends `requestAnimationFrame`.** The harness refuses to start,
 * and abandons a run already in flight, rather than hang on a promise that can never
 * settle — see `runNgeScrollBenchmark`.
 *
 * ⚠️ **The protocol is three runs, back to back, on the same machine, in the same
 * session**: the baseline story, then this story in `'gated'` mode, then this story in
 * `'always-chart'` mode — two runs of each before quoting anything (section 2).
 * `'always-shell'` is an optional floor reading, not part of that required set. The
 * noise floor is not a constant either — the baseline's own runs spread 1.8% on a warm
 * machine and 4.2–4.8% shortly after a cold `nx reset` rebuild — so comparing against a
 * figure recorded on another day risks attributing the machine's mood to the chart
 * column rather than to the column itself.
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
  ],
  selector: 'nge-table-chart-cells-interaction-stories',
  standalone: true,
  styleUrl: './chart-cells-interaction-stories.component.scss',
  templateUrl: './chart-cells-interaction-stories.component.html',
})
export class NgeTableChartCellsInteractionStoriesComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/table/src/lib/nge-table/stories/performance/chart-cells/interaction';

  /** Frames to measure. Same default as the baseline story — only the row geometry differs. */
  readonly steps = input(NGE_SCROLL_BENCHMARK_DEFAULTS.steps);

  /** Pixels advanced per frame — an exact multiple of {@link CHART_CELLS_ROW_HEIGHT}, not the baseline's 240. */
  readonly stepPx = input(CHART_CELLS_STEP_PX);

  /**
   * Which of three measurements this run takes — a `select`, not a boolean, because
   * two of the three answer different questions and the third is a floor reading
   * rather than a rendering choice a consumer would ever actually make.
   *
   * - `'gated'` (the default) — the shipped ARCH-291 pattern exactly:
   *   `@if (cell.isSettled()) { chart } @else { shell }`. This is the acceptance
   *   criterion's subject — what a consumer actually ships.
   * - `'always-chart'` — ⚠️ **a measurement control that deliberately defeats the
   *   seam, not a supported pattern.** It bypasses `cell.isSettled()` entirely and
   *   mounts `<nge-chart>` unconditionally, so every row a window slide recycles
   *   rebuilds a live chart whether or not the scroll has settled. Never copy this
   *   branch into a consumer table — it exists here only to produce the counterfactual
   *   `'gated'` is measured against.
   * - `'always-shell'` — the settle gate bypassed the other way: always
   *   `<nge-cell-shell>`, never a chart. An optional floor reading, not part of the
   *   required three-run protocol (see the class doc comment).
   *
   * ⚠️ **`'gated'` and `'always-shell'` are expected to read alike during this specific
   * run**, and that sameness is not a flaw. This schedule advances the viewport on
   * every single measured frame with no pause, so the scroll never goes quiet for the
   * 150ms `isSettled` requires — "a fast flick shells the whole way" is the
   * settle-signal's own documented contract (`nge-table-slot-context.ts` →
   * `NgeCellContext.isSettled`). `'gated'` therefore spends the entire run in its
   * shell branch too. **`'always-chart'` is what breaks that symmetry** — it never
   * consults `isSettled`, so it pays the full chart-render cost on every slide
   * regardless of how the scroll behaves. Comparing `'gated'` against `'always-chart'`
   * is what the settle signal's own value looks like as a number, rather than as a
   * claim.
   */
  readonly cellMode = input<ChartCellsMode>('gated');

  readonly totalRowCount = NGE_TABLE_FIXTURE_SIZES.large;

  /** The type carrier `[ngeCellOf]` binds, so `let-cell` knows its row shape. */
  readonly rows = largeRows;

  /**
   * Ten thousand rows, virtualized, over the shared seven columns plus `series`.
   *
   * ⚠️ `rowHeight` is the one geometry field this config sets that the baseline's does
   * not — {@link CHART_CELLS_ROW_HEIGHT}, not `NGE_TABLE_DEFAULTS.rowHeight`. Everything
   * else — `enableVirtualization`, `getRowId` — matches the baseline's config exactly,
   * so the chart column is the only variable this measurement introduces.
   */
  readonly config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: CHART_CELLS_COLUMNS,
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
    rowHeight: CHART_CELLS_ROW_HEIGHT,
  });

  /** Every run this session, newest last — the record the variance check reads. */
  readonly runs = signal<readonly NgeScrollBenchmarkReport[]>([]);

  readonly isRunning = signal(false);

  /**
   * Every settle burst this session, newest last.
   *
   * Kept separate from {@link runs} rather than folded into it: a burst and a scroll are
   * different measurements with different units and different verdicts, and putting them
   * in one history is how someone ends up averaging them. A *list* rather than a single
   * report for the same reason the scroll keeps one — two runs is the minimum before a
   * figure is worth quoting, and a readout showing only the latest silently discards the
   * half that says whether the instrument is stable.
   */
  readonly burstRuns = signal<readonly ChartCellsBurstReport[]>([]);

  /** The latest burst, for the readout tiles. */
  readonly burst = computed<ChartCellsBurstReport | null>(() => {
    const all = this.burstRuns();

    return all.length === 0 ? null : all[all.length - 1];
  });

  /**
   * Why the last run produced nothing.
   *
   * The harness refuses to run in a hidden tab, because a browser suspends
   * `requestAnimationFrame` there and the loop would never advance. Showing the
   * reason matters more than it sounds: without it the button sits on "Running…"
   * with an empty console, which reads as the table having hung.
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
   * different options — the controls are adjustable mid-session (including
   * {@link cellMode}, which does not affect this figure at all but does affect what
   * the numbers mean), and a drift across a changed `stepPx` measures the change rather
   * than the table while looking exactly like a tolerance.
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
  readonly rowHeightPx = CHART_CELLS_ROW_HEIGHT;

  /**
   * How many row elements a correct run must build — **machine-independent**, and
   * **not** the baseline's 714.
   *
   * Same geometry as the baseline — `(steps - 1) × (stepPx / rowHeight)` — evaluated
   * against this story's own 96px rows and 288px steps: `(120 - 1) × (288 / 96)` =
   * `119 × 3` = **357**. `null` when `stepPx` is not a whole number of rows, exactly as
   * the baseline computes it.
   *
   * ⚠️ **This figure does not depend on {@link cellMode} and should hold identically
   * across all three** — a window slide builds the same row elements whatever a cell
   * renders inside them, so `'gated'`, `'always-chart'` and `'always-shell'` all owe
   * the same 357. A run that disagrees is not a mode-specific result to shrug off; it
   * is a finding (most likely a harness or memoisation bug), because geometry has no
   * opinion on cell contents.
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
   * Three states rather than a boolean, because 0 and "1 in 480" mean the same
   * thing about the table and something different about the machine.
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

  /**
   * **Every** run of this session as plain text, ready to paste into a ticket.
   *
   * ⚠️ The pasted text does not carry {@link cellMode} — the harness has no notion of a
   * rendering mode, only of frames and rows. Note which mode was active on whichever
   * run is being quoted; the story does not track that pairing for you.
   */
  /**
   * The scroll report, headed by what actually produced it.
   *
   * ⚠️ **The label is not decoration.** This story runs three modes at identical
   * `steps` / `stepPx`, so without it all three paste with byte-identical headers AND
   * byte-identical option lines — distinguishable only by the very numbers they were
   * meant to be compared on. A report that cannot say what it measured is worse than
   * no report, because it looks authoritative.
   */
  readonly reportText = computed<string>(() =>
    formatNgeScrollBenchmarkRuns(
      this.runs(),
      `NgeTable chart cells · scroll · ${this.cellMode()}`
    )
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
      `NgeTable chart cells · settle burst · ${this.cellMode()} — ${all.length} run${all.length === 1 ? '' : 's'}`,
      `options           ${BURST_FLICK_FRAMES} flick frames x ${this.stepPx()}px, then ${BURST_SETTLE_FRAMES} timed frames`,
      `geometry          ${CHART_CELLS_ROW_HEIGHT}px rows, ${withThousands(NGE_TABLE_FIXTURE_SIZES.large)} rows virtualized`,
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
   * Chart configs, memoised against the **row object**.
   *
   * ⚠️ **This memo is load-bearing, not an optimisation.** `<nge-chart>` re-renders on
   * config *reference* change — it pipes `toObservable(config)` merged with its resize
   * trigger through a `debounceTime(16)` — so `createSparklineChartConfig` called
   * straight from the template would allocate a new object on every change-detection
   * pass of this component, and a row hover or a selection change would re-render every
   * visible chart. The seam in Decision 1's sketch is right; the binding in it is not.
   *
   * **The row is the correct key, and the reason is not memory.** It survives a sort, a
   * filter and a DOM recycle alike, because the engine reorders and rewraps rows without
   * replacing the datum underneath. Keying by `Cell` — which is what the library's own
   * context cache uses — would be *wrong here*: the engine rebuilds every `Cell` when the
   * row model rebuilds, so a sort would re-run every transform. Keying by `row.id` in a
   * plain `Map` would work but retain an entry for every row ever scrolled past: 10,000
   * configs held for the life of the component. A `WeakMap` keyed by the object releases
   * with it.
   *
   * ⚠️ **Eager precompute is not the alternative.** Building all 10,000 configs up front
   * trades a scroll stall for a startup stall. Lazy-on-miss is the shape.
   */
  private readonly chartConfigs = new WeakMap<NgeTableFixtureRow, NgeChartConfig>();

  /**
   * Build (once) or return (thereafter) one row's sparkline config.
   *
   * `animationMs: 0` because virtualization recreates the cell on every window slide —
   * an enter animation would replay per slide and read as a strobe rather than as
   * progress, the same reason `nge-cell-shell` never animates either. `yDomain`
   * is the fixture's own shared bound (`NgeTableFixtureRow.series` is always
   * `[0, 100]`), so every row's trend reads on the same scale.
   */
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

  async copyReport(): Promise<void> {
    await this.copyText(this.reportText(), this.justCopied);
  }

  async copyBurstReport(): Promise<void> {
    await this.copyText(this.burstReportText(), this.justCopiedBurst);
  }

  /**
   * Shared by both copy buttons.
   *
   * A blocked clipboard is not worth an error state — each report is also rendered as a
   * selectable `<pre>`, which is exactly why they are shown rather than hidden behind
   * their buttons.
   */
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

    // A missing viewport means the table has not rendered — which under jsdom is
    // the normal case, and is worth saying rather than throwing.
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
   * ⚠️ Only meaningful in `gated` mode. In `always-chart` the charts never unmount, so
   * there is no burst to measure; in `always-shell` one never mounts.
   */
  async runSettleBurst(): Promise<void> {
    const viewport = this.host.nativeElement.querySelector<HTMLElement>('.nge-table__viewport');

    if (viewport === null || this.isRunning()) {
      return;
    }

    const view = viewport.ownerDocument.defaultView;

    // Same refusal the scroll harness makes, and for the same reason: a hidden tab
    // suspends `requestAnimationFrame`, so the loop below would never advance and the
    // promise would never settle. Saying so beats hanging on "Running…".
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
   * what happens next.
   *
   * The flick is setup, not measurement — it exists only to guarantee the burst that
   * follows is a genuine mount rather than a repaint of charts that never left. It also
   * removes the artifact the design pass flagged in the scroll benchmark: charts mounted
   * before the first scroll event all unmount on it, so a run that starts from rest times
   * a mount-and-destroy burst in its opening frames instead of steady state.
   */
  private async measureSettleBurst(
    view: Window,
    viewport: HTMLElement
  ): Promise<ChartCellsBurstReport> {
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

      // Polled rather than observed: a `MutationObserver` delivers on a microtask, so
      // its records would arrive interleaved with the frames being timed. Querying stops
      // the moment a chart is found, and the subtree is one window of rows.
      if (framesToFirstChart === -1 && viewport.querySelector('nge-chart') !== null) {
        framesToFirstChart = frame;
        msToFirstChart = elapsed;
      }
    }

    // The tail is quiet by construction — the burst is long over by then — so it is the
    // honest place to read this display's own interval, exactly as the scroll harness
    // calibrates against idle frames rather than assuming 60Hz.
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
