import type { NgeScrollBenchmarkReport } from './nge-scroll-benchmark';

import {
  countNgeDroppedFrames,
  formatNgeScrollBenchmark,
  formatNgeScrollBenchmarkRuns,
  haveSameNgeBenchmarkOptions,
  medianOf,
  runNgeScrollBenchmark,
  summarizeNgeFrameTimings,
} from './nge-scroll-benchmark';

/**
 * Only the pure half is covered here, and that is the point of the split.
 *
 * `runNgeScrollBenchmark` drives `requestAnimationFrame` against a scrolling
 * element; jsdom neither lays out nor scrolls, so a spec around it would assert
 * on the fake clock rather than on the table. The statistics are where a silent
 * error would actually hide — an off-by-one percentile, or a dropped-frame threshold
 * measured against the wrong cadence — so they are the part held down.
 */
describe('summarizeNgeFrameTimings', () => {
  it('reports zeros for a run that measured nothing', () => {
    expect(summarizeNgeFrameTimings([])).toEqual({
      frames: 0,
      p95FrameMs: 0,
      worstFrameMs: 0,
    });
  });

  it('counts frames and finds the worst', () => {
    const summary = summarizeNgeFrameTimings([8, 42, 12, 9]);

    expect(summary.frames).toBe(4);
    expect(summary.worstFrameMs).toBe(42);
  });

  describe('p95, by nearest rank', () => {
    // Nearest rank rather than interpolation: an interpolated p95 is a duration
    // no frame took, and this number is quoted as evidence in the epic plan.
    it('picks an observed sample, never an interpolated one', () => {
      const summary = summarizeNgeFrameTimings([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

      expect(summary.p95FrameMs).toBe(10);
    });

    it('lands below the worst frame once there are enough samples', () => {
      const timings = Array.from({ length: 20 }, (_unused, index) => index + 1);
      const summary = summarizeNgeFrameTimings(timings);

      expect(summary.p95FrameMs).toBe(19);
      expect(summary.worstFrameMs).toBe(20);
    });

    it('collapses onto the only sample there is', () => {
      const summary = summarizeNgeFrameTimings([42]);

      expect(summary.p95FrameMs).toBe(42);
      expect(summary.worstFrameMs).toBe(42);
    });

    it('does not depend on the order frames arrived in', () => {
      const ordered = summarizeNgeFrameTimings([1, 2, 3, 4, 5]);
      const shuffled = summarizeNgeFrameTimings([4, 1, 5, 3, 2]);

      expect(shuffled).toEqual(ordered);
    });
  });

  // The caller owns the array — it is the run's raw record, and a harness that
  // sorted it in place would leave the timings no longer in frame order.
  it('leaves the caller’s array untouched', () => {
    const timings = [9, 3, 27];

    summarizeNgeFrameTimings(timings);

    expect(timings).toEqual([9, 3, 27]);
  });
});

describe('medianOf', () => {
  it('returns 0 for no samples', () => {
    expect(medianOf([])).toBe(0);
  });

  it('takes the middle of an odd count', () => {
    expect(medianOf([9, 1, 5])).toBe(5);
  });

  it('averages the two middles of an even count', () => {
    expect(medianOf([1, 2, 3, 4])).toBe(2.5);
  });

  // ⚠️ Median rather than mean, because this number is meant to describe the
  // display. One stray long frame during calibration — an extension waking up, a
  // layout — would drag a mean far enough to misjudge the refresh rate, and every
  // dropped-frame count is then measured against the wrong cadence.
  it('is not dragged by a single outlier', () => {
    expect(medianOf([16.6, 16.7, 16.7, 16.8, 400])).toBe(16.7);
  });
});

describe('countNgeDroppedFrames', () => {
  // The finding this function exists for: on a 60Hz display a smooth scroll
  // produces frames at 16.9–17.7ms, and a 16.7ms budget calls 20% of them
  // failures. None of them missed a vsync.
  it('does not count ordinary jitter above one frame interval', () => {
    const jittery = [16.7, 16.9, 17.2, 17.6, 17.7];

    expect(countNgeDroppedFrames(jittery, 16.7)).toBe(0);
  });

  it('counts a frame past 1.5x the interval', () => {
    expect(countNgeDroppedFrames([16.7, 25.1, 33.4], 16.7)).toBe(2);
  });

  it('scales with the display, not with an assumed 60Hz', () => {
    // 120Hz: 8.3ms interval, so 13ms is a drop that 60Hz maths would have missed.
    expect(countNgeDroppedFrames([13], 8.3)).toBe(1);
    expect(countNgeDroppedFrames([13], 16.7)).toBe(0);
  });

  it('honours an explicit tolerance', () => {
    expect(countNgeDroppedFrames([20], 16.7, 1.1)).toBe(1);
  });

  // Without a calibration there is no cadence to be late against, and assuming
  // one would report drops that may never have happened.
  it('reports nothing when calibration produced no interval', () => {
    expect(countNgeDroppedFrames([100, 200], 0)).toBe(0);
  });
});

describe('formatNgeScrollBenchmark', () => {
  const report: NgeScrollBenchmarkReport = {
    droppedFrames: 0,
    droppedThresholdMs: 25.05,
    estimatedRefreshHz: 59.9,
    idleFrameMs: 16.7,
    options: { calibrationFrames: 20, stepPx: 240, steps: 120 },
    renderedRowCount: 26,
    rowsAdded: 751,
    rowsRemoved: 751,
    scrolledPx: 29299,
    summary: {
      frames: 120,
      p95FrameMs: 17.2,
      worstFrameMs: 17.6,
    },
  };

  // The block is pasted into a ticket, so it has to carry the conditions as well
  // as the numbers — a p95 without the refresh rate and the step schedule cannot
  // be compared against anything.
  it('carries every number and every resolved option', () => {
    const text = formatNgeScrollBenchmark(report);

    expect(text).toContain('frames            120');
    expect(text).toContain('dropped frames    0');
    expect(text).toContain('p95 frame         17.2ms');
    expect(text).toContain('worst frame       17.6ms');
    expect(text).toContain('~60Hz');
    expect(text).toContain('rows built        751 built / 751 torn down');
    expect(text).toContain('rows in DOM       26');
    expect(text).toContain('120 frames x 240px');
    // ⚠️ No fixed-budget count anywhere: it ranged 29%-48% across identical runs
    // while every other metric held, so it was removed rather than demoted.
    expect(text).not.toContain('over budget');
    expect(text).not.toContain('budget');
  });

  // The threshold is stated so a reader can see it came from the display's 16.7ms
  // interval (× 1.5 ≈ 25ms) rather than from any fixed ceiling. Asserted loosely
  // because the
  // exact last digit is float-rounding noise on a label.
  it('states the dropped-frame threshold it used, not just the count', () => {
    const text = formatNgeScrollBenchmark(report);

    expect(text).toMatch(/dropped frames\s+0\s+\(> 25(\.\d)?ms\)/);
  });
});

describe('formatNgeScrollBenchmarkRuns', () => {
  const runWith = (
    p95FrameMs: number,
    overrides: Partial<NgeScrollBenchmarkReport> = {}
  ): NgeScrollBenchmarkReport => ({
    droppedFrames: 0,
    droppedThresholdMs: 25.05,
    estimatedRefreshHz: 59.9,
    idleFrameMs: 16.7,
    options: { calibrationFrames: 20, stepPx: 240, steps: 120 },
    renderedRowCount: 26,
    rowsAdded: 714,
    rowsRemoved: 714,
    scrolledPx: 29299,
    summary: {
      frames: 120,
      p95FrameMs,
      worstFrameMs: 17.6,
    },
    ...overrides,
  });

  it('returns nothing for no runs', () => {
    expect(formatNgeScrollBenchmarkRuns([])).toBe('');
  });

  it('falls back to the single-run block for one run', () => {
    const only = runWith(17.2);

    expect(formatNgeScrollBenchmarkRuns([only])).toBe(formatNgeScrollBenchmark(only));
  });

  // The spread across runs is the half of a baseline that says whether the
  // instrument can detect anything, so a paste that dropped it would leave the p95
  // uninterpretable.
  it('lists every run and reports the spread across them', () => {
    const text = formatNgeScrollBenchmarkRuns([runWith(16.9), runWith(17), runWith(17.2)]);

    expect(text).toContain('3 runs');
    expect(text).toMatch(/^1\s+120/m);
    expect(text).toMatch(/^3\s+120/m);
    expect(text).toContain('p95 median        17ms');
    expect(text).toContain('16.9–17.2ms');
  });

  // ⚠️ The options are per-run adjustable, so "the last two runs" is not
  // automatically "two comparable runs". Averaging across a changed stepPx would
  // describe the change while looking like a tolerance.
  it('refuses to report a spread across runs with different options', () => {
    const text = formatNgeScrollBenchmarkRuns([
      runWith(17),
      runWith(30, { options: { calibrationFrames: 20, stepPx: 999, steps: 120 } }),
    ]);

    expect(text).toContain('MIXED');
    expect(text).toContain('not reported — runs are not comparable');
    expect(text).not.toMatch(/p95 spread\s+\d/);
  });
});

describe('haveSameNgeBenchmarkOptions', () => {
  const base: NgeScrollBenchmarkReport['options'] = {
    calibrationFrames: 20,
    stepPx: 240,
    steps: 120,
  };
  const report = (options: NgeScrollBenchmarkReport['options']) =>
    ({ options }) as NgeScrollBenchmarkReport;

  it('accepts identical options', () => {
    expect(haveSameNgeBenchmarkOptions(report(base), report({ ...base }))).toBe(true);
  });

  it.each(['calibrationFrames', 'stepPx', 'steps'] as const)(
    'rejects a difference in %s',
    field => {
      const changed = { ...base, [field]: base[field] + 1 };

      expect(haveSameNgeBenchmarkOptions(report(base), report(changed))).toBe(false);
    }
  );
});

/**
 * The one part of the shell that IS reachable from jsdom: its refusals.
 *
 * Both are guards against a run that would otherwise never settle or would
 * report a fabricated number, and both were found by driving the story in an
 * automation tab — where `visibilityState` is `'hidden'`, `requestAnimationFrame`
 * never fires, and the first version of this harness hung silently forever.
 */
describe('runNgeScrollBenchmark refusals', () => {
  it('rejects a viewport that is not attached to a window', async () => {
    const detached = document.implementation.createHTMLDocument('detached').createElement('div');

    await expect(runNgeScrollBenchmark(detached)).rejects.toThrow(/not attached to a window/);
  });

  // ⚠️ A hidden tab suspends requestAnimationFrame, so the frame loop cannot
  // advance. Refusing beats hanging: the caller gets a sentence instead of a
  // spinner and an empty console.
  it('rejects while the document is hidden', async () => {
    const visibility = jest.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');

    try {
      await expect(runNgeScrollBenchmark(document.createElement('div'))).rejects.toThrow(/hidden/);
    } finally {
      visibility.mockRestore();
    }
  });
});
