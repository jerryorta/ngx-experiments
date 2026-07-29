import { DOCUMENT } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeCsvOptions, NgeCsvValues } from '../../../../csv';
import type { NgeTableExportData } from '../../../../export';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { toNgeCsv, toNgeCsvBlob } from '../../../../csv';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableHighlightDemoComponent } from '../../highlight/highlight-demo-table.component';

/** One two-column row of the escaping demo, the same text in both readings. */
function dangerousRow(
  id: string,
  label: string,
  value: string
): NgeTableExportData['rows'][number] {
  return {
    cells: [
      { columnId: 'label', formatted: label, raw: label },
      { columnId: 'value', formatted: value, raw: value },
    ],
    id,
  };
}

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small }).slice(0, 12);

/**
 * Export, driven — and the second half of the epic's **extensibility gate** (ARCH-251).
 *
 * Nothing on this page is a table feature. Three independent pieces meet here and
 * none of them imports another:
 *
 * - the **highlight addon** (ARCH-250) supplies a `NgeCellContext → boolean`,
 * - the **export seam** (ARCH-248) consumes it as an anonymous `cellPredicate`,
 * - the **CSV formatter** (this story) reads the neutral shape that comes back and
 *   knows nothing else — not the table, not Angular, not highlighting.
 *
 * ⚠️ The tables below are `<nge-table-highlight-demo>` **exactly as ARCH-250 left
 * it**, reused rather than re-implemented. That reuse is the gate's evidence: the
 * only new code this story needed was a pure function and a toolbar. Each section
 * gets its own instance because the highlight bridge is per-injector — six tables in
 * one injector would share one bridge, and a click in the first would write to the
 * last one's state.
 *
 * ⚠️ Several highlight-enabled tables on one page also means several `Escape`
 * listeners, so one `Escape` clears them all. That is the documented behaviour of
 * `provideNgeCellHighlighting()` at its defaults; a real consumer with more than one
 * such table passes `{ clearOnEscape: false }` on all but the owning table.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-export-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableHighlightDemoComponent],
  selector: 'nge-table-export-interaction-stories',
  standalone: true,
  styleUrl: './export-interaction-stories.component.scss',
  templateUrl: './export-interaction-stories.component.html',
})
export class NgeTableExportInteractionStoriesComponent {
  private readonly document = inject(DOCUMENT);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/export/interaction';

  // ── Storybook controls — the formatter's whole option surface ────────────────

  /** Prepend U+FEFF. Off by default; Excel on Windows needs it to read UTF-8. */
  readonly byteOrderMark = input<boolean>(false);

  /** The field separator. Quoting is decided against **this**, never a literal comma. */
  readonly delimiter = input<string>(',');

  /**
   * Prefix a formula-shaped field with `'`. Off by default; it alters the data.
   *
   * ⚠️ Toggling this over the fixture changes **nothing** — no fixture value is
   * formula-shaped, which is the honest demonstration rather than a broken control.
   * Example 7 supplies its own values to show the flag doing something.
   */
  readonly escapeFormulas = input<boolean>(false);

  /** Emit the header record from the export's columns. */
  readonly header = input<boolean>(true);

  /** Which reading of each cell becomes its text. */
  readonly values = input<NgeCsvValues>('formatted');

  /** The live options object every section below writes through. */
  readonly csvOptions = computed<NgeCsvOptions>(() => ({
    byteOrderMark: this.byteOrderMark(),
    delimiter: this.delimiter(),
    escapeFormulas: this.escapeFormulas(),
    header: this.header(),
    values: this.values(),
  }));

  // ============================================
  // EXAMPLE 1: Highlight some cells, export them as CSV
  // ============================================
  /**
   * ⚠️ `getRowId` is **mandatory** the moment anything marks a cell — every mark is
   * keyed by it, and without one the engine keys rows by array index, so a sort
   * silently moves the user's marks onto different records.
   */
  mainConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly mainRows = rows;

  readonly mainState = signal<NgeTableState>(createNgeTableState());

  /**
   * The last export, held as the **neutral shape** rather than as text.
   *
   * Deliberate: it is what lets every section below re-render its CSV the moment a
   * Storybook control moves, without re-reading the table. An export is a read taken
   * at a moment; the formatting of it is not.
   */
  readonly exportData = signal<NgeTableExportData | null>(null);

  /** The CSV under the live controls. */
  readonly csv = computed(() => {
    const data = this.exportData();

    return data ? toNgeCsv(data, this.csvOptions()) : '';
  });

  readonly exportSummary = computed(() => {
    const data = this.exportData();

    return data
      ? `${data.columns.length} columns × ${data.rows.length} rows`
      : 'nothing exported yet';
  });

  /** The highlight slice, so the mark and the CSV can be read side by side. */
  readonly mainHighlightJson = computed(() =>
    JSON.stringify(this.mainState().ngeHighlight ?? null, null, 2)
  );

  /** **The whole composition.** One predicate out, one predicate in, one string back. */
  exportHighlighted(): void {
    this.exportData.set(this.mainDemo().exportHighlighted());
  }

  exportEverything(): void {
    this.exportData.set(this.mainDemo().exportEverything());
  }

  clearExport(): void {
    this.exportData.set(null);
  }

  // ============================================
  // EXAMPLE 2: formatted vs raw, on the same export
  // ============================================
  /**
   * Both readings of the last export, rendered together.
   *
   * Independent of the controls above on purpose — the point is the contrast, and a
   * control that could collapse the two sides would hide it.
   */
  readonly formattedCsv = computed(() => {
    const data = this.exportData();

    return data ? toNgeCsv(data, { values: 'formatted' }) : '';
  });

  readonly rawCsv = computed(() => {
    const data = this.exportData();

    return data ? toNgeCsv(data, { values: 'raw' }) : '';
  });

  // ============================================
  // EXAMPLE 3: quoting follows the delimiter
  // ============================================
  readonly commaCsv = computed(() => {
    const data = this.exportData();

    return data ? toNgeCsv(data, { delimiter: ',' }) : '';
  });

  readonly semicolonCsv = computed(() => {
    const data = this.exportData();

    return data ? toNgeCsv(data, { delimiter: ';' }) : '';
  });

  // ============================================
  // EXAMPLE 4: the CSV follows the view
  // ============================================
  viewConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  readonly viewRows = rows;

  readonly viewState = signal<NgeTableState>(createNgeTableState());

  readonly viewCsv = signal<string>('');

  sortExternally(columnId: string, desc: boolean): void {
    this.viewState.update(state => ({ ...state, sorting: [{ desc, id: columnId }] }));
  }

  clearSort(): void {
    this.viewState.update(state => ({ ...state, sorting: [] }));
  }

  toggleQuantityColumn(): void {
    this.viewState.update(state => ({
      ...state,
      columnVisibility: {
        ...state.columnVisibility,
        quantity: state.columnVisibility['quantity'] === false,
      },
    }));
  }

  /** Re-read after changing the view — the CSV reorders and narrows with no formatter change. */
  exportView(): void {
    this.viewCsv.set(toNgeCsv(this.viewDemo().exportEverything(), this.csvOptions()));
  }

  // ============================================
  // EXAMPLE 5: a ragged block comes out rectangular
  // ============================================
  raggedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 6),
    getRowId: row => row.id,
  });

  readonly raggedRows = rows.slice(0, 6);

  readonly raggedState = signal<NgeTableState>(createNgeTableState());

  readonly raggedCsv = signal<string>('');

  exportRagged(): void {
    this.raggedCsv.set(toNgeCsv(this.raggedDemo().exportHighlighted(), this.csvOptions()));
  }

  // ============================================
  // EXAMPLE 6: handing it to the host
  // ============================================
  /**
   * Downloading is the **host's** concern, and this is what that looks like.
   *
   * The formatter returns a `Blob`; the object URL, the anchor, the filename and the
   * revoke are all application decisions. A library reaching for `document` here
   * would stop working under SSR for no benefit — which is why this lives in a story
   * rather than in `nge-csv.ts`.
   */
  downloadCsv(): void {
    const data = this.exportData();

    if (!data) {
      return;
    }

    const url = URL.createObjectURL(toNgeCsvBlob(data, this.csvOptions()));
    const link = this.document.createElement('a');

    link.download = 'nge-table-export.csv';
    link.href = url;
    link.click();
    URL.revokeObjectURL(url);
  }

  // ============================================
  // EXAMPLE 7: formula-injection escaping
  // ============================================
  /**
   * A hand-built export carrying the values the `escapeFormulas` flag exists for.
   *
   * The fixture cannot serve here — nothing in it is formula-shaped, which is what
   * makes the flag a no-op over real data and is worth demonstrating in its own
   * right, but leaves nothing to see. Building the neutral shape directly is not a
   * breach of ARCH-241's never-inline-rows rule either: that rule governs table *row
   * data*, and nothing here is fed to a table.
   *
   * The last row is the one to watch — an ordinary negative that a naive
   * prefix-only check would corrupt.
   */
  readonly dangerousExport: NgeTableExportData = {
    columns: [
      { header: 'Label', id: 'label' },
      { header: 'Value', id: 'value' },
    ],
    rows: [
      dangerousRow('d1', 'A formula', '=SUM(A1:A2)'),
      dangerousRow('d2', 'A payload', "-2+3+cmd|'/C calc'!A0"),
      dangerousRow('d3', 'A phone number', '+1 555 0100'),
      dangerousRow('d4', 'A handle', '@analyst'),
      dangerousRow('d5', 'An ordinary negative', '-1234.5'),
    ],
  };

  /** The same export under the live `escapeFormulas` control, so the toggle is visible. */
  readonly dangerousCsv = computed(() =>
    toNgeCsv(this.dangerousExport, { escapeFormulas: this.escapeFormulas() })
  );

  private readonly mainDemo =
    viewChild.required<NgeTableHighlightDemoComponent<NgeTableFixtureRow>>('mainDemo');

  private readonly raggedDemo =
    viewChild.required<NgeTableHighlightDemoComponent<NgeTableFixtureRow>>('raggedDemo');

  private readonly viewDemo =
    viewChild.required<NgeTableHighlightDemoComponent<NgeTableFixtureRow>>('viewDemo');
}
