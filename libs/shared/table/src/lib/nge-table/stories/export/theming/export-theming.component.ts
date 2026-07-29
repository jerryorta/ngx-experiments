import { Component, computed, signal, viewChild, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_COLUMNS,
  NGE_TABLE_FIXTURE_SIZES,
} from '../../../../../testing';
import { toNgeCsv } from '../../../../csv';
import { createNgeTableConfig } from '../../../../nge-table-config';
import { createNgeTableState } from '../../../../nge-table-state';
import { ngeHighlightCellKey } from '../../../../highlight';
import { NgeTableHighlightDemoComponent } from '../../highlight/highlight-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** The rows every section renders. Small, so a whole table fits in a comparison box. */
const themedRows = rows.slice(0, 6);

/**
 * Marks seeded rather than clicked.
 *
 * A theming story is read by comparing sections side by side, and requiring a click
 * in each before anything is comparable would defeat that. It doubles as proof of the
 * persistable-view property: this is exactly the shape a saved view hands back in,
 * and the export that follows is identical to one produced by clicking.
 *
 * A factory rather than a shared constant, because each section owns its own state
 * and must not share a mutable object with the others.
 */
function seedState(): NgeTableState {
  return createNgeTableState({
    ngeHighlight: {
      anchor: ngeHighlightCellKey(themedRows[1].id, 'amount'),
      cells: [
        ngeHighlightCellKey(themedRows[1].id, 'amount'),
        ngeHighlightCellKey(themedRows[3].id, 'name'),
      ],
      exclusions: [],
      ranges: [
        {
          anchorRowId: themedRows[4].id,
          columnIds: ['status', 'quantity'],
          focusRowId: themedRows[5].id,
        },
      ],
    },
  });
}

/**
 * Export theming — and the honest answer is that **there is almost nothing to theme.**
 *
 * A CSV is text. It has no rendered surface, reads no CSS custom property, and carries
 * no `--nge-table-*` token. Inventing sections for tokens nothing consumes would
 * render as no-ops and teach a false contract, which is exactly what the story
 * conventions warn against — so this page does not.
 *
 * What *is* themeable is the surface a user exports **from**: the table, and the
 * highlight tint that picks the cells. Both already have their own theming stories
 * (`Core/Theming` and `Highlight/Theming`), so this page does not restate their token
 * tables. It shows the one thing neither of those can — that the CSV is **byte-identical**
 * under any theme, because the formatter reads state and values and never styles.
 *
 * ⚠️ Like every table theming story, the substance lives in the **SCSS**: there is no
 * `config.theme`, so a "theme" here is a scoped wrapper class re-declaring
 * `--nge-table-*`. One config and one seeded state serve every section, because
 * theming changes nothing about configuration.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-export-theming',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableHighlightDemoComponent],
  selector: 'nge-table-export-theming',
  standalone: true,
  styleUrl: './export-theming.component.scss',
  templateUrl: './export-theming.component.html',
})
export class NgeTableExportThemingComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/export/theming';

  /** One config for every section — theming changes nothing about configuration. */
  themedConfig = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: themedRows,
    getRowId: row => row.id,
  });

  readonly themedRows = themedRows;

  readonly lightState = signal<NgeTableState>(seedState());

  readonly darkState = signal<NgeTableState>(seedState());

  readonly denseState = signal<NgeTableState>(seedState());

  readonly lightCsv = signal<string>('');

  readonly darkCsv = signal<string>('');

  readonly denseCsv = signal<string>('');

  /**
   * Whether all three agree — the claim this page exists to make, as a boolean.
   *
   * Guarded on all three having run, so it reads "not yet" rather than a vacuous
   * "identical" before the button is pressed.
   */
  readonly verdict = computed(() => {
    const light = this.lightCsv();

    if (!light || !this.darkCsv() || !this.denseCsv()) {
      return 'Press “Export from all three” to compare.';
    }

    return light === this.darkCsv() && light === this.denseCsv()
      ? '✓ All three CSVs are byte-identical — the theme reached the pixels, not the data.'
      : '✗ The three CSVs differ, which would mean styling had leaked into the export.';
  });

  /**
   * Read all three tables through the real seam.
   *
   * Through `exportHighlighted()` on each demo rather than resolving the seeded
   * descriptors by hand: a story that re-implemented the predicate and the reader
   * could drift from them and would then "prove" its claim against a copy rather than
   * against the library.
   */
  exportAll(): void {
    this.lightCsv.set(toNgeCsv(this.lightDemo().exportHighlighted()));
    this.darkCsv.set(toNgeCsv(this.darkDemo().exportHighlighted()));
    this.denseCsv.set(toNgeCsv(this.denseDemo().exportHighlighted()));
  }

  private readonly darkDemo =
    viewChild.required<NgeTableHighlightDemoComponent<NgeTableFixtureRow>>('darkDemo');

  private readonly denseDemo =
    viewChild.required<NgeTableHighlightDemoComponent<NgeTableFixtureRow>>('denseDemo');

  private readonly lightDemo =
    viewChild.required<NgeTableHighlightDemoComponent<NgeTableFixtureRow>>('lightDemo');
}
