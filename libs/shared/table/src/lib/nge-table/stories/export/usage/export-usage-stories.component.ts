import { Component, computed, signal, viewChild, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableExportData } from '../../../../export';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { toNgeCsv } from '../../../../csv';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableComponent } from '../../../nge-table.component';
import { NgeTableHighlightDemoComponent } from '../../highlight/highlight-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small }).slice(0, 8);

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

/**
 * Export and CSV, documented — every snippet is the code running beside it.
 *
 * The claim each example is quietly making: **no snippet on this page imports
 * `@tanstack/*`**. A consumer sees `readNgeExportData`, `NgeTableExportData` and
 * `toNgeCsv`, which is what keeps a future engine migration internal to the
 * library.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-export-usage-stories',
  },
  imports: [
    NgeStorybookReviewContainerComponent,
    NgeTableComponent,
    NgeTableHighlightDemoComponent,
  ],
  selector: 'nge-table-export-usage-stories',
  standalone: true,
  styleUrl: './export-usage-stories.component.scss',
  templateUrl: './export-usage-stories.component.html',
})
export class NgeTableExportUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/export/usage';

  // ============================================
  // The shared table these examples read from
  // ============================================
  basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  readonly basicRows = rows;

  readonly basicState = signal<NgeTableState>(createNgeTableState());

  /** The last read, held as the neutral shape so each example can format it its own way. */
  readonly captured = signal<NgeTableExportData | null>(null);

  readonly defaultCsv = computed(() => {
    const data = this.captured();

    return data ? toNgeCsv(data) : '';
  });

  readonly rawCsv = computed(() => {
    const data = this.captured();

    return data ? toNgeCsv(data, { values: 'raw' }) : '';
  });

  readonly semicolonCsv = computed(() => {
    const data = this.captured();

    return data ? toNgeCsv(data, { delimiter: ';' }) : '';
  });

  readonly headerlessCsv = computed(() => {
    const data = this.captured();

    return data ? toNgeCsv(data, { header: false }) : '';
  });

  readonly shapePreview = computed(() => {
    const data = this.captured();

    return data
      ? JSON.stringify({ columns: data.columns, rows: data.rows.slice(0, 2) }, null, 2)
      : '';
  });

  read(): void {
    this.captured.set(this.basicTable().readNgeExportData());
  }

  // ============================================
  // The composition example
  // ============================================
  compositionConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    getRowId: row => row.id,
  });

  readonly compositionRows = rows;

  readonly compositionState = signal<NgeTableState>(createNgeTableState());

  readonly compositionCsv = signal<string>('');

  exportHighlighted(): void {
    this.compositionCsv.set(toNgeCsv(this.compositionDemo().exportHighlighted()));
  }

  // ============================================
  // Formula-injection escaping
  // ============================================
  /**
   * A hand-built export carrying the values the flag exists for.
   *
   * Not from the shared fixture, and not a breach of ARCH-241's never-inline-rows
   * rule — that rule governs table *row data*, and nothing here is fed to a table.
   * It is also forced twice over: no fixture value is formula-shaped (which is the
   * point of the "changes nothing over the fixture" spec), and adding one would
   * shift every draw in the fixture's single PRNG stream and re-baseline every story
   * in the epic.
   *
   * The rows are the cases worth seeing together — a formula, a payload that opens
   * with the same character as an ordinary negative, a phone number and a handle
   * that are false positives waiting to happen, and last the ordinary negative a
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

  readonly unescapedCsv = toNgeCsv(this.dangerousExport);

  readonly escapedCsv = toNgeCsv(this.dangerousExport, { escapeFormulas: true });

  private readonly basicTable =
    viewChild.required<NgeTableComponent<NgeTableFixtureRow>>('basicTable');

  private readonly compositionDemo =
    viewChild.required<NgeTableHighlightDemoComponent<NgeTableFixtureRow>>('compositionDemo');
}
