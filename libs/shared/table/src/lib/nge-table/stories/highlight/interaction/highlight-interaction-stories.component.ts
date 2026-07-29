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
import { NgeTableHighlightDemoComponent } from '../highlight-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** Ten thousand rows — where "survives a virtualized scroll" becomes falsifiable. */
const largeRows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

/**
 * Cell highlighting, driven — and driving it is the only way to see any of it.
 *
 * This is the epic's **extensibility gate** (ARCH-250) as a story: everything below
 * is an addon registered through `provideNgeCellHighlighting()`, decorating the
 * same `<nge-table>` every other story uses. Nothing in the library core names
 * highlighting.
 *
 * Three of the four extension axes are on show at once, which is why highlighting
 * was chosen for the gate rather than something simpler: **behaviour/state** (the
 * `TableFeature` and its slice of `NgeTableState`), **render slots** (the overlay,
 * projected into `cell-overlay`), and the **data pipeline** (Example 6, where a
 * highlight predicate narrows an export without either addon importing the other).
 *
 * ⚠️ Every table is wrapped in its own `<nge-table-highlight-demo>` rather than
 * declared inline. Highlighting is **per-table** — the providers create one bridge
 * per injector — so six tables sharing one injector would share one bridge, and a
 * click in the first section would write to the sixth section's state.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-highlight-interaction-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableHighlightDemoComponent],
  selector: 'nge-table-highlight-interaction-stories',
  standalone: true,
  styleUrl: './highlight-interaction-stories.component.scss',
  templateUrl: './highlight-interaction-stories.component.html',
})
export class NgeTableHighlightInteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/highlight/interaction';

  // ============================================
  // EXAMPLE 1: Click to highlight, shift-click to extend
  // ============================================
  /**
   * ⚠️ `getRowId` is **mandatory** the moment anything marks a cell.
   *
   * Every mark is keyed by it; without one the engine keys rows by array index, so
   * a sort silently moves the user's highlights onto different records — the
   * failure that reads as data corruption rather than as a bug.
   */
  basicConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly basicRows = rows.slice(0, 12);

  readonly basicState = signal<NgeTableState>(createNgeTableState());

  /** The slice itself — the contract being demonstrated, not decoration. */
  readonly basicHighlightJson = computed(() =>
    JSON.stringify(this.basicState().ngeHighlight ?? null, null, 2)
  );

  // ============================================
  // EXAMPLE 2: Persist and restore a highlight
  // ============================================
  /** Stands in for Firestore — the round trip is a string, not an object graph. */
  readonly savedView = signal<null | string>(null);

  saveView(): void {
    this.savedView.set(JSON.stringify(this.basicState()));
  }

  /**
   * Restoring is deliberately **silent** — a host pushing state in through `[state]`
   * is not the table doing something, so it announces nothing on the event stream.
   * Were it otherwise, restoring a saved view would replay as a burst of user
   * activity.
   */
  restoreView(): void {
    const saved = this.savedView();

    if (saved) {
      this.basicState.set(JSON.parse(saved) as NgeTableState);
    }
  }

  // ============================================
  // EXAMPLE 3: Ten thousand rows
  // ============================================
  /**
   * The acceptance criterion that cannot be checked anywhere but a browser.
   *
   * Highlight a cell, scroll it far out of the window, scroll back. It is still
   * highlighted — because the recycled node re-derives from `state` on every pass
   * and holds nothing of its own. jsdom lays nothing out, so the window is empty
   * there and a spec proves nothing about this.
   */
  virtualConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: largeRows,
    enableVirtualization: true,
    getRowId: row => row.id,
  });

  readonly virtualRows = largeRows;

  readonly virtualState = signal<NgeTableState>(createNgeTableState());

  /** Marks, ranges, and the slice's size — the scalability claim as a number. */
  readonly virtualCounts = computed(() => {
    const slice = this.virtualState().ngeHighlight;

    return {
      bytes: JSON.stringify(slice ?? {}).length,
      cells: slice?.cells.length ?? 0,
      ranges: slice?.ranges.length ?? 0,
    };
  });

  // ============================================
  // EXAMPLE 4: Highlighting a pinned column
  // ============================================
  /**
   * A pinned lane is `position: sticky` and scrolls over the center lane, so its
   * cells must stay opaque — a translucent highlight would show the center cells
   * sliding underneath. The addon's stylesheet restates the surface for exactly
   * this reason.
   */
  pinnedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly pinnedRows = rows.slice(0, 12);

  readonly pinnedState = signal<NgeTableState>(
    createNgeTableState({ columnPinning: { left: ['name'], right: ['owner'] } })
  );

  // ============================================
  // EXAMPLE 5: A range follows the view
  // ============================================
  /**
   * The documented consequence of storing a block as a **descriptor**.
   *
   * The endpoints are row *ids*, so they follow their records across a scroll, a
   * filter and a re-fetch. Which rows lie *between* them is resolved against the
   * processed row model at read time — so sorting re-shapes the block rather than
   * carrying it. That is the deliberate reading of "the block the user dragged
   * out", and ARCH-269 and ARCH-270 inherit it.
   */
  sortableConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    getRowId: row => row.id,
  });

  readonly sortableRows = rows.slice(0, 12);

  readonly sortableState = signal<NgeTableState>(createNgeTableState());

  readonly sortableRangeJson = computed(() =>
    JSON.stringify(this.sortableState().ngeHighlight?.ranges ?? [], null, 2)
  );

  sortExternally(columnId: string, desc: boolean): void {
    this.sortableState.update(state => ({ ...state, sorting: [{ desc, id: columnId }] }));
  }

  clearSort(): void {
    this.sortableState.update(state => ({ ...state, sorting: [] }));
  }

  // ============================================
  // EXAMPLE 6: Highlighted-cell export (ARCH-251's composition)
  // ============================================
  exportConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows.slice(0, 12),
    enablePinning: true,
    getRowId: row => row.id,
  });

  readonly exportRows = rows.slice(0, 12);

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

  exportHighlighted(): void {
    this.exportResult.set(this.exportDemo().exportHighlighted());
  }

  exportEverything(): void {
    this.exportResult.set(this.exportDemo().exportEverything());
  }

  /**
   * Clears the exported payload only — the marks have their own control now.
   *
   * Two buttons rather than one because they undo different things: the demo's
   * "Clear highlighting" gives up the marks, this gives up the last export. Wiring
   * one button to both made "Clear" ambiguous the moment the section grew a second
   * kind of output.
   */
  clearExportResult(): void {
    this.exportResult.set(null);
  }

  private readonly exportDemo =
    viewChild.required<NgeTableHighlightDemoComponent<NgeTableFixtureRow>>('exportDemo');
}
