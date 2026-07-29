/**
 * Frame-timing instrument for a scrolling virtualized `<nge-table>`.
 *
 * The library claims a virtualized table scrolls without perceptible lag, and
 * every story that adds weight to a cell — a chart, an editor — leans on that
 * claim. Without a measurement the claim is untestable, so "it feels fine"
 * becomes the standard and a regression is only noticed once it is severe.
 * This turns the claim into a number a later story can be held to.
 *
 * It is deliberately split in two. The statistics — {@link summarizeNgeFrameTimings},
 * {@link medianOf}, {@link countNgeDroppedFrames}, {@link formatNgeScrollBenchmark} —
 * are pure and covered by Jest; {@link runNgeScrollBenchmark} is the browser-only
 * shell that produces the durations they reduce. jsdom has no layout, does not
 * scroll, and its `requestAnimationFrame` timings mean nothing, so the shell
 * cannot be unit-tested at all — keeping the arithmetic out of it is what leaves
 * anything verifiable.
 */

/** Class names the harness reads. They are core's BEM names, the same dependency a theme has. */
const BODY_SELECTOR = '.nge-table__body';
const ROW_SELECTOR = '.nge-table__row';

/**
 * How far past the display's own frame interval a frame must go to count as
 * dropped.
 *
 * ⚠️ **A frame is not late for taking slightly longer than one refresh interval.**
 * On a 60Hz display frames arrive every ~16.67ms and ordinary jitter puts many of
 * them at 16.9–17.7ms; those frames hit their vsync and dropped nothing. Counting
 * them as failures buries a real regression inside a large baseline of noise —
 * measured on a 60Hz machine, a perfectly smooth scroll reported 20% of frames
 * "over budget". Missing a vsync means roughly doubling the interval, so 1.5×
 * separates a dropped frame from a jittery one.
 */
const DROPPED_FRAME_TOLERANCE = 1.5;

/** Frame durations, in milliseconds, reduced to the shape a regression check reads. */
export interface NgeFrameSummary {
  /** How many frames were measured. */
  readonly frames: number;
  /**
   * 95th percentile duration, by nearest rank.
   *
   * Reported alongside the worst frame because a single stall is ordinary — a
   * garbage collection, the browser doing something else — while a p95 well above
   * the refresh interval means most frames are late, which is what a user
   * actually perceives.
   */
  readonly p95FrameMs: number;
  /** The slowest single frame. */
  readonly worstFrameMs: number;
}

/** Knobs for {@link runNgeScrollBenchmark}. Every one is fixed, never sampled — see `steps`. */
export interface NgeScrollBenchmarkOptions {
  /**
   * Idle frames timed before scrolling starts.
   *
   * They do two jobs: they let the table settle after the scroll reset, and their
   * median duration is the display's own frame interval — which is what makes a
   * recorded baseline interpretable on a machine other than the one that took it.
   */
  readonly calibrationFrames?: number;
  /** Pixels to advance per frame. */
  readonly stepPx?: number;
  /**
   * How many frames to measure.
   *
   * Fixed, because a benchmark that ran "until the user stopped scrolling" could
   * not be compared against itself. Same steps and same seeded fixture means two
   * runs measure the same work.
   */
  readonly steps?: number;
}

/** Resolved defaults, exported so a caller can quote the conditions of a baseline. */
export const NGE_SCROLL_BENCHMARK_DEFAULTS: Required<NgeScrollBenchmarkOptions> = {
  calibrationFrames: 20,
  stepPx: 240,
  steps: 120,
};

/** What one run reports. */
export interface NgeScrollBenchmarkReport {
  /**
   * Frames that missed a vsync — slower than {@link DROPPED_FRAME_TOLERANCE} ×
   * {@link idleFrameMs}.
   *
   * The honest "did it stutter" number, because it is measured against this
   * display's own cadence rather than against an assumed 60Hz.
   */
  readonly droppedFrames: number;
  /** The duration a frame had to exceed to count as dropped — {@link idleFrameMs} × 1.5. */
  readonly droppedThresholdMs: number;
  /** The display's frame rate, derived from {@link idleFrameMs}. */
  readonly estimatedRefreshHz: number;
  /** Median duration of the idle calibration frames — this display's frame interval. */
  readonly idleFrameMs: number;
  /** The options actually used, so a recorded number carries its conditions. */
  readonly options: Required<NgeScrollBenchmarkOptions>;
  /** Rows in the DOM when the run finished, against a dataset of any size. */
  readonly renderedRowCount: number;
  /**
   * Row elements the browser had to build during the run.
   *
   * This is the cost that deferring a cell's *contents* cannot remove: a window
   * slide destroys the rows leaving it and creates the rows entering it whatever
   * those rows contain. It is therefore the number that decides whether row
   * recycling is worth its own story, rather than a matter of opinion.
   *
   * It is *geometry*, so it should equal `(steps - 1) × (stepPx / rowHeight)` on any
   * machine — 714 for the default schedule. ⚠️ That holds only because the record
   * queue is drained before the observer disconnects; a run reporting fewer is a
   * dropped-record bug rather than a table that built fewer rows.
   */
  readonly rowsAdded: number;
  /** Row elements torn down during the run — the other half of {@link rowsAdded}. */
  readonly rowsRemoved: number;
  /** How far the viewport actually travelled. Short of `steps × stepPx` if it hit the end. */
  readonly scrolledPx: number;
  /** The frame durations, reduced. */
  readonly summary: NgeFrameSummary;
}

/**
 * Middle value of `values`, or `0` when there are none.
 *
 * Median rather than mean for the refresh estimate: one long frame during
 * calibration — a stray layout, an extension waking up — would drag a mean far
 * enough to misjudge the display, and the whole point of the number is to be a
 * property of the hardware.
 */
export function medianOf(values: readonly number[]): number {
  if (values.length === 0) {
    return 0;
  }

  const ascending = [...values].sort((a, b) => a - b);
  const middle = Math.floor(ascending.length / 2);

  return ascending.length % 2 === 0
    ? (ascending[middle - 1] + ascending[middle]) / 2
    : ascending[middle];
}

/**
 * Count frames that missed a vsync, relative to this display's frame interval.
 *
 * @param timings Frame durations in milliseconds.
 * @param idleFrameMs The display's frame interval, from {@link medianOf} over idle frames.
 * @param tolerance Multiple of the interval a frame must exceed. Defaults to
 *   {@link DROPPED_FRAME_TOLERANCE}.
 */
export function countNgeDroppedFrames(
  timings: readonly number[],
  idleFrameMs: number,
  tolerance: number = DROPPED_FRAME_TOLERANCE
): number {
  // With no usable calibration there is no cadence to be late against, and
  // inventing 60Hz would report drops that may not have happened.
  if (idleFrameMs <= 0) {
    return 0;
  }

  return timings.filter(duration => duration > idleFrameMs * tolerance).length;
}

/**
 * Reduce raw frame durations to {@link NgeFrameSummary}.
 *
 * Pure and synchronous on purpose: this is the half of the harness a spec can
 * hold, so the percentile cannot drift unnoticed.
 *
 * ⚠️ There is deliberately **no fixed-budget count** here. A "frames slower than
 * 16.7ms" tally was measured at 29%–48% across identical runs while p95, worst
 * frame and dropped frames all held still — the threshold sat *on* the 60Hz
 * refresh interval, so jitter relocated dozens of frames across it. Lateness is
 * only meaningful relative to the display's own cadence, which is what
 * {@link countNgeDroppedFrames} measures.
 *
 * @param timings Frame durations in milliseconds, in the order they occurred.
 */
export function summarizeNgeFrameTimings(timings: readonly number[]): NgeFrameSummary {
  const frames = timings.length;

  // An empty run is a legitimate outcome — a viewport with nothing to scroll
  // measures nothing — and reporting zeros keeps a caller from having to branch
  // before reading the numbers.
  if (frames === 0) {
    return { frames: 0, p95FrameMs: 0, worstFrameMs: 0 };
  }

  const ascending = [...timings].sort((a, b) => a - b);

  // Nearest-rank percentile: the smallest value at or above which 95% of the
  // samples fall. Interpolating between neighbours would invent a duration no
  // frame actually took, which is the wrong trade for a number quoted as
  // evidence.
  const rank = Math.ceil(0.95 * frames) - 1;
  const p95Index = Math.min(Math.max(rank, 0), frames - 1);

  return {
    frames,
    p95FrameMs: ascending[p95Index],
    worstFrameMs: ascending[frames - 1],
  };
}

/** One decimal — the resolution a frame budget is argued at. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

/**
 * Render a report as plain text for pasting into a ticket or a doc.
 *
 * A baseline is only useful if it travels with the conditions that produced it,
 * and a person copying seven tiles out of a browser by hand will drop one. This
 * emits every number *and* every resolved option in one block, so a pasted
 * baseline is self-describing.
 */
export function formatNgeScrollBenchmark(
  report: NgeScrollBenchmarkReport,
  label = 'NgeTable scroll baseline'
): string {
  const { droppedFrames, estimatedRefreshHz, idleFrameMs, options, summary } = report;

  return [
    `${label} — 1 run`,
    `frames            ${summary.frames}`,
    `dropped frames    ${droppedFrames}   (> ${round(report.droppedThresholdMs)}ms)`,
    `p95 frame         ${round(summary.p95FrameMs)}ms`,
    `worst frame       ${round(summary.worstFrameMs)}ms`,
    `idle frame        ${round(idleFrameMs)}ms  (~${Math.round(estimatedRefreshHz)}Hz)`,
    `rows built        ${report.rowsAdded} built / ${report.rowsRemoved} torn down`,
    `rows in DOM       ${report.renderedRowCount}`,
    `scrolled          ${report.scrolledPx}px`,
    `options           ${options.steps} frames x ${options.stepPx}px, ${options.calibrationFrames} calibration frames`,
  ].join('\n');
}

/**
 * Whether two runs measured the same work, and can therefore be compared.
 *
 * ⚠️ The options are adjustable per run (a Storybook control, a different call
 * site), so "the last two runs" is not automatically "two comparable runs". A
 * drift figure computed across a changed `stepPx` describes the change, not the
 * table, while looking exactly like a tolerance.
 */
export function haveSameNgeBenchmarkOptions(
  a: NgeScrollBenchmarkReport,
  b: NgeScrollBenchmarkReport
): boolean {
  return (
    a.options.calibrationFrames === b.options.calibrationFrames &&
    a.options.stepPx === b.options.stepPx &&
    a.options.steps === b.options.steps
  );
}

/**
 * Render every run of a session as one paste-ready block.
 *
 * A baseline is a *set* of runs, not one: the spread across them is what says
 * whether the instrument can detect anything, so a paste carrying only the latest
 * run drops the half that makes the other half meaningful. Emitting the runs
 * together also puts the comparability check somewhere a reader will see it.
 *
 * ⚠️ **Pass a `label` from any story that is not the baseline.** These blocks exist
 * to be pasted into a ticket, and a report that cannot say which story or which mode
 * produced it is a trap: ARCH-291 measured three modes at identical options, so all
 * three pasted with byte-identical headers *and* byte-identical option lines,
 * distinguishable only by the numbers they were meant to be compared on. The default
 * keeps the frozen ARCH-289 baseline's output unchanged.
 *
 * @param reports Every run of the session, oldest first.
 * @param label Header line identifying what was measured.
 */
export function formatNgeScrollBenchmarkRuns(
  reports: readonly NgeScrollBenchmarkReport[],
  label = 'NgeTable scroll baseline'
): string {
  if (reports.length === 0) {
    return '';
  }

  if (reports.length === 1) {
    return formatNgeScrollBenchmark(reports[0], label);
  }

  const first = reports[0];
  const comparable = reports.every(report => haveSameNgeBenchmarkOptions(first, report));
  const lines: string[] = [`${label} — ${reports.length} runs`];

  if (comparable) {
    const { calibrationFrames, stepPx, steps } = first.options;

    lines.push(
      `options           ${steps} frames x ${stepPx}px, ${calibrationFrames} calibration frames`
    );
  } else {
    // Stated rather than silently averaged: a reader comparing these numbers to a
    // feature story's needs to know they are not one measurement.
    lines.push('options           ⚠️ MIXED — runs used different options, not comparable');
  }

  const refresh = medianOf(reports.map(report => report.idleFrameMs));

  lines.push(
    `display           ${round(refresh)}ms idle frame (~${Math.round(refresh > 0 ? 1000 / refresh : 0)}Hz), dropped above ${round(refresh * DROPPED_FRAME_TOLERANCE)}ms`,
    '',
    'run  frames  dropped  p95      worst    rows built'
  );

  reports.forEach((report, index) => {
    const { summary } = report;

    lines.push(
      [
        String(index + 1).padEnd(5),
        String(summary.frames).padEnd(8),
        String(report.droppedFrames).padEnd(9),
        `${round(summary.p95FrameMs)}ms`.padEnd(9),
        `${round(summary.worstFrameMs)}ms`.padEnd(9),
        String(report.rowsAdded),
      ].join('')
    );
  });

  const p95s = reports.map(report => report.summary.p95FrameMs);
  const lowest = Math.min(...p95s);
  const highest = Math.max(...p95s);
  const spread = lowest > 0 ? (highest - lowest) / lowest : 0;
  const dropped = reports.reduce((total, report) => total + report.droppedFrames, 0);

  lines.push(
    '',
    `p95 median        ${round(medianOf(p95s))}ms`,
    comparable
      ? `p95 spread        ${round(spread * 100)}% across ${reports.length} runs (${round(lowest)}–${round(highest)}ms)`
      : 'p95 spread        not reported — runs are not comparable',
    `dropped frames    ${dropped} across all runs`
  );

  return lines.join('\n');
}

/**
 * Scroll a `<nge-table>` viewport on a fixed schedule and measure every frame.
 *
 * Resolve the element with `document.querySelector('.nge-table__viewport')`, or
 * from a `viewChild` in a story wrapper. Reaching it by class name is the same
 * documented dependency the cell-range addon's hit-test and every theme accept.
 *
 * ⚠️ **Browser only.** Under jsdom this resolves against a viewport that never
 * scrolls and frame timings that are an artefact of the fake clock.
 *
 * @param viewport The table's scroll container.
 * @param options Overrides for {@link NGE_SCROLL_BENCHMARK_DEFAULTS}.
 */
export function runNgeScrollBenchmark(
  viewport: HTMLElement,
  options: NgeScrollBenchmarkOptions = {}
): Promise<NgeScrollBenchmarkReport> {
  const resolved: Required<NgeScrollBenchmarkOptions> = {
    ...NGE_SCROLL_BENCHMARK_DEFAULTS,
    ...options,
  };

  // The frame clock must come from the view that owns the element, not from a
  // module-scope `window`: Storybook renders a story inside an iframe, and
  // timing one document's frames while scrolling another's element would report
  // numbers unrelated to the table on screen.
  const view = viewport.ownerDocument.defaultView;

  if (view === null) {
    return Promise.reject(
      new Error('runNgeScrollBenchmark: the viewport is not attached to a window.')
    );
  }

  // ⚠️ A browser suspends `requestAnimationFrame` in a hidden tab, so the frame
  // loop would never advance and this promise would never settle — the caller
  // sits on "running" forever with nothing in the console to explain it. Refusing
  // up front turns a silent hang into a sentence. This is the ordinary case under
  // browser automation, where the driven tab is usually not the foreground one.
  if (viewport.ownerDocument.visibilityState === 'hidden') {
    return Promise.reject(
      new Error(
        'runNgeScrollBenchmark: the document is hidden, and a hidden tab suspends requestAnimationFrame. Bring the window to the foreground and run again.'
      )
    );
  }

  const body = viewport.querySelector<HTMLElement>(BODY_SELECTOR);

  return new Promise<NgeScrollBenchmarkReport>((resolve, reject) => {
    const idleTimings: number[] = [];
    const timings: number[] = [];
    let rowsAdded = 0;
    let rowsRemoved = 0;

    const countRows = (nodes: NodeList): number => {
      let matched = 0;

      nodes.forEach(node => {
        if (node instanceof Element && node.matches(ROW_SELECTOR)) {
          matched += 1;
        }
      });

      return matched;
    };

    // Row churn is observed rather than reported by the table, which is what
    // keeps this harness out of the library's own source: a MutationObserver
    // sees exactly what the browser was asked to build.
    const observer = new MutationObserver(records => {
      for (const record of records) {
        rowsAdded += countRows(record.addedNodes);
        rowsRemoved += countRows(record.removedNodes);
      }
    });

    viewport.scrollTop = 0;

    const startedAt = viewport.scrollTop;

    // ⚠️ `disconnect()` DISCARDS the observer's pending record queue, and records are
    // delivered on a microtask — so disconnecting straight away loses whatever the
    // last frames produced and under-counts the churn by a varying amount. One run
    // in sixteen reported 712 rows where the geometry demands 714, which is exactly
    // this. `takeRecords()` drains the queue synchronously first.
    const drainObserver = (): void => {
      for (const record of observer.takeRecords()) {
        rowsAdded += countRows(record.addedNodes);
        rowsRemoved += countRows(record.removedNodes);
      }
    };

    const cleanup = (): void => {
      drainObserver();
      observer.disconnect();
      viewport.ownerDocument.removeEventListener('visibilitychange', onVisibilityChange);
    };

    const finish = (): void => {
      cleanup();

      const idleFrameMs = medianOf(idleTimings);

      resolve({
        droppedFrames: countNgeDroppedFrames(timings, idleFrameMs),
        droppedThresholdMs: idleFrameMs * DROPPED_FRAME_TOLERANCE,
        estimatedRefreshHz: idleFrameMs > 0 ? 1000 / idleFrameMs : 0,
        idleFrameMs,
        options: resolved,
        renderedRowCount: body === null ? 0 : body.querySelectorAll(ROW_SELECTOR).length,
        rowsAdded,
        rowsRemoved,
        scrolledPx: viewport.scrollTop - startedAt,
        summary: summarizeNgeFrameTimings(timings),
      });
    };

    // A tab backgrounded *mid-run* is the same suspension as starting hidden, and
    // resuming later would fold the whole hidden interval into one frame duration —
    // a worst-frame of several seconds that describes the user switching tabs
    // rather than the table. Abandoning the run is the honest outcome.
    function onVisibilityChange(): void {
      if (viewport.ownerDocument.visibilityState === 'hidden') {
        cleanup();
        reject(
          new Error(
            'runNgeScrollBenchmark: the document was hidden mid-run, which suspends requestAnimationFrame. Discarding the run rather than reporting a frame that spans the pause.'
          )
        );
      }
    }

    viewport.ownerDocument.addEventListener('visibilitychange', onVisibilityChange);

    let calibrating = resolved.calibrationFrames;
    let measured = 0;
    let previousTimestamp = view.performance.now();

    // The observer starts only once calibration is over: the scroll reset above
    // rebuilds the window, and counting that against the run would report rows
    // the scroll never caused.
    const beginMeasuring = (): void => {
      if (body !== null) {
        observer.observe(body, { childList: true });
      }
    };

    const onFrame = (timestamp: number): void => {
      const duration = timestamp - previousTimestamp;

      previousTimestamp = timestamp;

      // Calibration frames are timed but nothing is scrolled, so their median is
      // the display's own frame interval rather than a measure of this table.
      if (calibrating > 0) {
        calibrating -= 1;
        idleTimings.push(duration);

        if (calibrating === 0) {
          beginMeasuring();
        }

        view.requestAnimationFrame(onFrame);

        return;
      }

      timings.push(duration);
      measured += 1;

      if (measured >= resolved.steps) {
        finish();

        return;
      }

      const before = viewport.scrollTop;

      viewport.scrollTop = before + resolved.stepPx;

      // Reaching the end early is a real outcome — a short dataset, or a step
      // large enough to consume it — and continuing would measure a viewport
      // that is no longer moving, quietly flattering the result.
      if (viewport.scrollTop === before) {
        finish();

        return;
      }

      view.requestAnimationFrame(onFrame);
    };

    view.requestAnimationFrame(onFrame);
  });
}
