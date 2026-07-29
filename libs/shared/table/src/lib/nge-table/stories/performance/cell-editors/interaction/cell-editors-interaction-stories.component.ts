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
import type { NgeTableColumn } from '../../../../../nge-table-column';

import { NgeCellCheckboxComponent, NgeCellInputComponent } from '../../../../../../editors';
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
import { NgeTableComponent } from '../../../../nge-table.component';

/**
 * Share of frames that may drop before it stops being ordinary. Mirrors the baseline
 * story's own allowance — a real machine occasionally misses a vsync for reasons that
 * have nothing to do with the table.
 */
const DROPPED_FRAME_ALLOWANCE = 0.01;

/** One decimal is the resolution a frame budget is argued at. */
function round(value: number): number {
  return Math.round(value * 10) / 10;
}

const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * The shared seven, with three of them made editable — **the same seven the frozen
 * baseline renders**, so this story's only variable is the editors.
 *
 * ⚠️ No column is added and none is removed. ARCH-291 had to add one (a chart needs a
 * column of its own) and paid for it with a different row height and a different
 * expected-rows figure; an editor renders *in place of* the text a cell already showed,
 * so the geometry stays byte-identical to the baseline's and the two are directly
 * comparable at 40px rows and 240px steps.
 */
const EDITOR_COLUMNS: NgeTableColumn<NgeTableFixtureRow>[] = NGE_TABLE_FIXTURE_COLUMNS.map(
  column => {
    if (column.id === 'name') {
      return { ...column, meta: { ngeEdit: { editor: NgeCellInputComponent, enabled: true } } };
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
  }
);

/**
 * ARCH-293's editor cost, measured against ARCH-289's frozen baseline —
 * **`Performance/Cell Editors/Interaction`**.
 *
 * The acceptance criterion is a **number**: a scripted scroll with editable columns
 * present stays inside the frame budget, measured with the identical harness on the
 * identical geometry. What the editors add per rendered cell is a component instance
 * where the baseline had a `*flexRender` primitive, three times per row — plus, on the
 * always-live boolean column, a live `<input type="checkbox">` in every one.
 *
 * ⚠️ **The always-live column is the honest subject, not the activated ones.**
 * Activation means an activated column builds no control at all while nobody is
 * editing, so measuring only those would measure almost nothing and report a pass. The
 * boolean column here is `alwaysLive`, so every rendered row really does construct a
 * control — which is the worst case a consumer can actually configure.
 *
 * ⚠️ **This story carries no hardcoded reference run.** The baseline's is a figure
 * someone measured; inventing a plausible-looking one here would read as measured. Run
 * the baseline story in the same session and compare — the noise floor is not a
 * constant, so a figure recorded on another day risks attributing the machine's mood to
 * the editors.
 *
 * ⚠️ **A hidden tab suspends `requestAnimationFrame`.** The harness refuses to start
 * rather than hang on a promise that can never settle.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-editors-performance-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent],
  selector: 'nge-table-cell-editors-performance-stories',
  standalone: true,
  styleUrl: './cell-editors-interaction-stories.component.scss',
  templateUrl: './cell-editors-interaction-stories.component.html',
})
export class NgeTableCellEditorsPerformanceStoriesComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath =
    'libs/shared/table/src/lib/nge-table/stories/performance/cell-editors/interaction';

  /** Frames to measure. The baseline's default — the two runs must agree on it. */
  readonly steps = input(NGE_SCROLL_BENCHMARK_DEFAULTS.steps);

  /** Pixels per measured frame. Also the baseline's, and 240 ÷ 40 is a whole 6 rows. */
  readonly stepPx = input(NGE_SCROLL_BENCHMARK_DEFAULTS.stepPx);

  /**
   * Whether the columns declare their editors at all.
   *
   * ⚠️ **The control that makes this story a measurement rather than a reading.** Off,
   * the identical seven columns render exactly what the baseline renders, on the same
   * geometry, in the same session — so the two settings are a controlled pair and the
   * difference between them is the editors and nothing else. Comparing against the
   * baseline story is still worth doing; comparing against this story's own `false` is
   * what removes the machine from the answer.
   */
  readonly withEditors = input<boolean>(true);

  readonly totalRowCount = NGE_TABLE_FIXTURE_SIZES.large;

  readonly config = computed(() =>
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: this.withEditors() ? EDITOR_COLUMNS : NGE_TABLE_FIXTURE_COLUMNS,
      data: largeRows,
      enableVirtualization: true,
      getRowId: row => row.id,
    })
  );

  /** Every run this session, newest last. */
  readonly runs = signal<readonly NgeScrollBenchmarkReport[]>([]);

  readonly isRunning = signal(false);

  /** Why the last run produced nothing — a hidden tab, most likely. */
  readonly failure = signal<null | string>(null);

  readonly latest = computed<NgeScrollBenchmarkReport | null>(() => {
    const all = this.runs();

    return all.length === 0 ? null : all[all.length - 1];
  });

  readonly rounded = round;

  /**
   * How many row elements a correct run must build — **machine-independent**, and the
   * baseline's own 714: `(120 - 1) × (240 / 40)`.
   *
   * ⚠️ It must not move with {@link withEditors}. A window slide builds the same row
   * elements whatever a cell renders inside them, so a run that disagrees is a finding
   * rather than a cost — geometry has no opinion on cell contents.
   */
  readonly expectedRowsBuilt = computed<null | number>(() => {
    const rowHeight = 40;
    const step = this.stepPx();

    return step % rowHeight === 0 ? (this.steps() - 1) * (step / rowHeight) : null;
  });

  readonly rowsBuiltMatches = computed<boolean | null>(() => {
    const report = this.latest();
    const expected = this.expectedRowsBuilt();

    return report === null || expected === null ? null : report.rowsAdded === expected;
  });

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

  /**
   * How far apart the last two runs' p95 landed. `null` until there are two, and `null`
   * again when they used different options — a drift across a changed `stepPx` measures
   * the change rather than the table while looking exactly like a tolerance.
   */
  readonly p95Drift = computed<null | number>(() => {
    const all = this.runs();

    if (all.length < 2) {
      return null;
    }

    const [previous, current] = [all[all.length - 2], all[all.length - 1]];

    if (!haveSameNgeBenchmarkOptions(previous, current) || previous.summary.p95FrameMs === 0) {
      return null;
    }

    return (
      Math.abs(current.summary.p95FrameMs - previous.summary.p95FrameMs) /
      previous.summary.p95FrameMs
    );
  });

  /**
   * Every run of this session as plain text, ready to paste into a ticket.
   *
   * ⚠️ The label carries {@link withEditors}, because the harness has no notion of it
   * and two runs at identical options would otherwise paste byte-identical headers —
   * distinguishable only by the very numbers they were meant to be compared on.
   */
  readonly reportText = computed<string>(() =>
    formatNgeScrollBenchmarkRuns(
      this.runs(),
      `NgeTable cell editors · scroll · editors ${this.withEditors() ? 'on' : 'off'}`
    )
  );

  clearRuns(): void {
    this.runs.set([]);
    this.failure.set(null);
  }

  async runBenchmark(): Promise<void> {
    const viewport = this.host.nativeElement.querySelector<HTMLElement>('.nge-table__viewport');

    // A missing viewport means the table has not rendered — the normal case under
    // jsdom, and worth saying rather than throwing.
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
}
