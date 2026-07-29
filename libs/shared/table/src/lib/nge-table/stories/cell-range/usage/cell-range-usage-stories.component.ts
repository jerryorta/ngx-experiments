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
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableRangeDemoComponent } from '../range-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/**
 * How to adopt cell range selection, as documentation.
 *
 * The interaction story is where the feature is *driven*; this one is where the
 * three things it takes to switch on are written down. Every snippet below is the
 * code actually running beside it, and no example imports `@tanstack/*` — that
 * insulation is what lets the engine move to v9 without touching an application
 * file.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-range-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableRangeDemoComponent],
  selector: 'nge-table-cell-range-usage-stories',
  standalone: true,
  styleUrl: './cell-range-usage-stories.component.scss',
  templateUrl: './cell-range-usage-stories.component.html',
})
export class NgeTableCellRangeUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-range/usage';

  /**
   * The config the worked examples share — ranges change nothing about
   * configuration beyond making `getRowId` compulsory.
   */
  config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 8),
    getRowId: row => row.id,
  });

  readonly exampleRows = rows.slice(0, 8);

  readonly state = signal<NgeTableState>(createNgeTableState());

  readonly stateJson = computed(() => JSON.stringify(this.state().ngeRange ?? null, null, 2));

  /** The export example's own table, so its selection is independent of the first. */
  readonly exportState = signal<NgeTableState>(createNgeTableState());

  readonly exportResult = signal<NgeTableExportData | null>(null);

  readonly exportSummary = computed(() => {
    const data = this.exportResult();

    return data
      ? `${data.columns.length} columns × ${data.rows.length} rows`
      : 'nothing exported yet';
  });

  readonly exportPreview = computed(() => {
    const data = this.exportResult();

    return data
      ? JSON.stringify({ columns: data.columns, rows: data.rows.slice(0, 3) }, null, 2)
      : '';
  });

  exportSelected(): void {
    this.exportResult.set(this.exportDemo().exportSelected());
  }

  private readonly exportDemo =
    viewChild.required<NgeTableRangeDemoComponent<NgeTableFixtureRow>>('exportDemo');
}
