import { Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeTableFixtureRow } from '../../../../../testing';
import type { NgeTableState } from '../../../../nge-table-state';

import { createNgeTableFixture, NGE_TABLE_FIXTURE_SIZES } from '../../../../../testing';
import { createNgeTableState } from '../../../../nge-table-state';
import { NgeTableTextareaDemoComponent } from '../textarea-demo-table.component';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });

/** A private copy per section, so editing one table leaves the others alone. */
function seed(count: number): NgeTableFixtureRow[] {
  return rows.slice(0, count).map(row => ({ ...row }));
}

/**
 * How a column declares `<nge-cell-textarea>`, and what the host owes it.
 *
 * The code samples are the point of this story rather than the tables — the tables are
 * there so a reader can confirm the snippet beside them produces what they are
 * looking at. Driving the editor belongs to the interaction story, which is the primary
 * facet for every table feature.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-cell-textarea-usage-stories',
  },
  imports: [NgeStorybookReviewContainerComponent, NgeTableTextareaDemoComponent],
  selector: 'nge-table-cell-textarea-usage-stories',
  standalone: true,
  styleUrl: './cell-textarea-usage-stories.component.scss',
  templateUrl: './cell-textarea-usage-stories.component.html',
})
export class NgeTableCellTextareaUsageStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/cell-textarea/usage';

  readonly basicRows = signal(seed(6));
  readonly basicState = signal<NgeTableState>(createNgeTableState());

  readonly optionsRows = signal(seed(6));
  readonly optionsState = signal<NgeTableState>(createNgeTableState());

  readonly hostRows = signal(seed(6));
  readonly hostState = signal<NgeTableState>(createNgeTableState());

  /** Declaring the column — the whole of the consumer's side. */
  readonly declareSnippet = `import { ngeCellTextareaEdit } from '@nge/table/editors';

const columns: NgeTableColumn<Row>[] = [
  // …
  {
    accessorKey: 'description',
    header: 'Description',
    id: 'description',
    size: 280,
    meta: { ngeEdit: ngeCellTextareaEdit() },
  },
];`;

  /** The options, all of them optional. */
  readonly optionsSnippet = `meta: {
  ngeEdit: ngeCellTextareaEdit({
    rows: 8,                        // how tall the panel's field is, in lines
    maxlength: 120,                 // caps the field, as the native attribute does
    placeholder: 'Describe this…',
    label: 'Edit description',      // what a screen reader announces
    cancelLabel: 'Discard',         // both buttons are relabelable
    applyLabel: 'Save',
  }),
}

// ⚠️ There is no \`alwaysLive\`. The control is a body-level overlay opened on
// activation, so an always-live column would mean one panel per visible row.`;

  /** The host's side: the table proposes, the host applies. */
  readonly hostSnippet = `<nge-table
  [config]="config()"
  [state]="state()"
  (ngeTableEvent)="onEvent($event)"
  (stateChange)="state.set($event)"
/>

onEvent(event: NgeTableEvent<Row>): void {
  if (event.kind !== 'edit-intent') {
    return;
  }

  // \`config.data\` belongs to you. The table announces a patch and writes nothing;
  // a host that ignores this sees no edit, which is correct rather than broken.
  this.rows.update(rows => applyPatches(rows, event.cells));
}`;

  /** ⚠️ The trap a story is where consumers meet it. */
  readonly getRowIdSnippet = `createNgeTableConfig<Row>({
  columns,
  data: rows(),
  // ⚠️ NOT optional once any column sets \`meta.ngeEdit\`. An edit is keyed by
  // rowId + columnId, so without this the engine keys rows by array INDEX and a
  // sort would land the patch on a different record. The library throws in dev
  // rather than degrade quietly.
  getRowId: row => row.id,
})`;
}
