import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeScrollBenchmarkReport, NgeTableFixtureRow } from '../../../../../../testing';

import {
  createNgeTableFixture,
  formatNgeScrollBenchmarkRuns,
  NGE_SCROLL_BENCHMARK_DEFAULTS,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
  haveSameNgeBenchmarkOptions,
  runNgeScrollBenchmark,
} from '../../../../../../testing';
import { createNgeTableConfig } from '../../../../../nge-table-config';
import { NGE_TABLE_DEFAULTS } from '../../../../../nge-table-defaults';
import { NgeTableComponent } from '../../../../nge-table.component';

/** The virtualization preset, because the frame budget only means anything under a window. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * One recorded run of this story, kept **for orientation only**.
 *
 * ⚠️ These timings are **not a threshold and not a gate.** Frame durations belong
 * to the CPU, the display and whatever else the machine is doing; on other
 * hardware they will differ and that is not a regression. They are here so a first
 * run on a new machine has something to be sanity-checked against — "same
 * ballpark" or "something is badly wrong" — and no more than that.
 *
 * ⚠️ **The noise floor is not a constant either.** These runs spread 1.8% on a warm,
 * quiet machine and 4.2–4.8% minutes after a cold `nx reset` rebuild — the same
 * table, twice the apparent noise. So never compare a feature story against a
 * figure recorded on another day: run this story and the feature story back to
 * back, and compare those two.
 */
/**
 * Share of frames that may drop before it stops being ordinary.
 *
 * ⚠️ **Zero is the expectation, not a requirement.** A real machine occasionally
 * misses a vsync for reasons that have nothing to do with the table — a
 * collection, another process, the compositor. One dropped frame in 480 was
 * observed on a healthy machine, so a strict `=== 0` check would paint that red
 * and teach the reader to ignore the indicator. A *sustained* rate is the signal.
 */
const DROPPED_FRAME_ALLOWANCE = 0.01;

const REFERENCE_RUN = {
  droppedFrames: 0,
  machine: 'Apple M5 Max · 60Hz · Chrome',
  p95MedianMs: 17,
  p95SpreadPercent: 1.8,
  recordedOn: '2026-07-28',
  runs: 12,
  worstFrameMs: 17.6,
} as const;

/** One decimal is the resolution a frame budget is argued at; more digits imply precision the clock lacks. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
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
 * The **reference measurement** for a scrolling virtualized table — the number
 * every later performance claim is compared against.
 *
 * Every other story in this library demonstrates a behaviour; this one produces a
 * **number**, and it exists because the epic had been asserting scroll
 * performance for five waves with nothing to check it against. Wave 6 puts charts
 * and editors inside virtualized cells on the promise of no perceptible lag — a
 * promise only worth making if the promise before it was measured.
 *
 * ⚠️⚠️ **THIS STORY IS FROZEN. Never add a feature to it.** No striping, no
 * selection, no editors, no charts in cells, no extra columns — and no new flag on
 * {@link NgeTableBaselineInteractionStoriesComponent.config} however small. Its
 * entire value is that it measures a *plain* virtualized table, so a feature
 * story's numbers can be read against it. The moment this table gains a feature it
 * stops being a baseline and silently becomes just another measurement, and every
 * comparison drawn from it afterwards is wrong in a way nothing will flag.
 * Demonstrate a feature's cost in **that feature's own** story, measured with the
 * same harness, against a baseline re-run on the same machine.
 *
 * ⚠️ **A baseline is per-machine and measured fresh, never hard-coded.** Frame
 * timings are a property of the CPU, the display's refresh rate and what else the
 * machine is doing. A number committed here would be wrong on every other machine
 * and would quietly become wrong on this one. So: run this story, then run the
 * feature story, and compare the two on the machine in front of you. The report
 * carries `estimatedRefreshHz` precisely so a pasted figure can be checked for
 * comparability.
 *
 * Two further things are deliberate and easy to undo by accident:
 *
 * - **It must be run in a real browser.** jsdom lays nothing out, so the
 *   virtualizer renders no window, so there is nothing to scroll and no frame to
 *   time. There is no spec behind this story — the arithmetic is unit-tested in
 *   `nge-scroll-benchmark.spec.ts` and the driving is not testable at all.
 * - **Run it twice before quoting it.** A single run is an anecdote. The second
 *   run is what says whether the instrument's own noise is smaller than the effect
 *   a later story will try to measure with it.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-baseline-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent],
  selector: 'nge-table-baseline-interaction-stories',
  standalone: true,
  styleUrl: './baseline-interaction-stories.component.scss',
  templateUrl: './baseline-interaction-stories.component.html',
})
export class NgeTableBaselineInteractionStoriesComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/table/src/lib/nge-table/stories/performance/baseline/interaction';

  /** Frames to measure. Fixed rather than open-ended, so two runs measure the same work. */
  readonly steps = input(NGE_SCROLL_BENCHMARK_DEFAULTS.steps);

  /** Pixels advanced per frame — how hard the window is being made to slide. */
  readonly stepPx = input(NGE_SCROLL_BENCHMARK_DEFAULTS.stepPx);

  readonly totalRowCount = NGE_TABLE_FIXTURE_SIZES.large;

  /**
   * A plain virtualized table over ten thousand rows. **Nothing else, ever.**
   *
   * ⚠️ `enableVirtualization` and `getRowId` are the only two switches this config
   * may ever carry. Adding a third — striping, selection, pinning, resizing —
   * changes what the baseline measures while leaving it named "baseline", which is
   * the one failure here that nothing detects.
   *
   * The `max-height` lives on `nge-table` itself rather than on a wrapper (see the
   * SCSS): the host is a flex column whose scroller shrinks to fit, so a height on
   * an ancestor `div` is simply overflowed and nothing scrolls.
   */
  readonly config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  /** Every run this session, newest last — the record the variance check reads. */
  readonly runs = signal<readonly NgeScrollBenchmarkReport[]>([]);

  readonly isRunning = signal(false);

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
   * This is the number that decides whether the harness can detect anything: an
   * instrument whose run-to-run spread exceeds the regression it is watching for
   * reports noise with a straight face. `null` until there are two runs to
   * compare.
   *
   * ⚠️ **`null` also when the two runs used different options** — the controls are
   * adjustable mid-session, and a drift across a changed `stepPx` measures the
   * change rather than the table while looking exactly like a tolerance.
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
  readonly reference = REFERENCE_RUN;

  /** The row height the expected-rows arithmetic divides by — shown so the sum is checkable. */
  readonly rowHeightPx = NGE_TABLE_DEFAULTS.rowHeight;

  /**
   * How many row elements a correct run must build — **machine-independent**.
   *
   * This is geometry, not performance: each step slides the window `stepPx`, every
   * `rowHeight` of that brings one new row in, and the final frame finishes without
   * scrolling. So `(steps - 1) × (stepPx / rowHeight)` holds on every machine and
   * every display, which makes it the one number a feature story can assert
   * *exactly* rather than within a tolerance.
   *
   * `null` when `stepPx` is not a whole number of rows — the count is then split
   * across partial rows and no exact expectation exists.
   */
  readonly expectedRowsBuilt = computed<null | number>(() => {
    const rowHeight = NGE_TABLE_DEFAULTS.rowHeight;
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
   * All runs rather than the latest, because the spread across them is what says
   * whether the instrument can detect anything — pasting one run drops the half
   * that makes the other half meaningful. The conditions travel with the numbers
   * too: copying seven tiles out of a browser by hand loses one, and a p95 without
   * its refresh rate and step schedule cannot be compared to anything.
   *
   * The `<pre>` renders the same text so it stays selectable where the clipboard
   * API is blocked.
   */
  readonly reportText = computed<string>(() => formatNgeScrollBenchmarkRuns(this.runs()));

  /** `true` briefly after a successful copy, so the button can confirm itself. */
  readonly justCopied = signal(false);

  async copyReport(): Promise<void> {
    const text = this.reportText();

    if (text === '') {
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      this.justCopied.set(true);
      setTimeout(() => this.justCopied.set(false), 1500);
    } catch {
      // A blocked clipboard is not worth an error state — the `<pre>` below is
      // already selectable, which is why it is rendered rather than hidden behind
      // the button.
      this.justCopied.set(false);
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

  clearRuns(): void {
    this.runs.set([]);
    this.failure.set(null);
  }
}
