import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  model,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeTableFixtureRow } from '../../../../testing';
import type { NgeCellPatch, NgeTableEvent } from '../../../events';
import type { NgeTableColumn } from '../../../nge-table-column';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';

import { ngeCellTextareaEdit } from '../../../../editors';
import { NGE_TABLE_FIXTURE_COLUMNS } from '../../../../testing';
import { createNgeTableConfig } from '../../../nge-table-config';
import { NgeRangeOverlayComponent, provideNgeCellRange } from '../../../range';
import { NgeCellDirective, NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';

/**
 * The long-text column, declared **here** rather than added to the shared fixture.
 *
 * ⚠️ `description` is a field on every fixture row (ARCH-290) but deliberately not a
 * member of `NGE_TABLE_FIXTURE_COLUMNS`, and adding it there would be the wrong fix
 * for a story that wants it. ARCH-289's frozen scroll baseline renders that array
 * wholesale, so an eighth shared column silently changes what the baseline measures —
 * and a performance baseline that quietly starts measuring a different table is worth
 * less than no baseline at all. ARCH-292 hit this first; the trap is unchanged.
 *
 * Declaring it locally is also the honest demonstration: a consumer wanting an
 * editable long-text column writes exactly this.
 */
const DESCRIPTION_COLUMN: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'description',
  header: 'Description',
  id: 'description',
  size: 280,
};

/**
 * One table whose `description` column is edited by the library's own
 * `<nge-cell-textarea>` (ARCH-296), with no `[ngeCell]` template in sight.
 *
 * ⚠️ **This component is the host, and the host is what makes an edit happen.** The
 * library activates a control, collects a value and announces `edit-intent`; nothing
 * changes until the code below applies it and hands new `data` back in. Delete
 * {@link applyPatches} and every gesture still works, every intent still arrives, and
 * the table never changes — correct behaviour for a host that has not opted into
 * editing, and what several sections here are really demonstrating.
 *
 * ⚠️ **The editor proposes on Apply and on nothing else.** Cancel, `Escape`, blur and
 * an outside click all leave the cell alone, which is the whole of ARCH-296. The
 * readouts below are what make those negatives legible: "nothing was proposed" and
 * "the wiring is broken" look identical on screen without one.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-textarea-demo',
  },
  imports: [
    NgeCellDirective,
    NgeRangeOverlayComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  providers: [provideNgeCellRange({ clearOnEscape: true })],
  selector: 'nge-table-textarea-demo',
  standalone: true,
  styleUrl: './textarea-demo-table.component.scss',
  templateUrl: './textarea-demo-table.component.html',
})
export class NgeTableTextareaDemoComponent {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** The rows this table owns. A signal, because an applied edit replaces them. */
  readonly rows = model.required<NgeTableFixtureRow[]>();

  readonly state = model.required<NgeTableState>();

  /** Whether to apply an incoming `edit-intent`. Off shows a host ignoring the event. */
  readonly applyIntents = input<boolean>(true);

  readonly enableCellRange = input<boolean>(false);

  readonly enableVirtualization = input<boolean>(false);

  /** How tall the scroll viewport is. Bound to `nge-table` itself, never a wrapper. */
  readonly maxHeight = input<number>(320);

  /** Caps the field, mirroring the native attribute. Unset leaves it uncapped. */
  readonly maxlength = input<number>();

  /**
   * Whether a `[ngeCell]` template is projected for `description`.
   *
   * The acceptance criterion in one switch: with it on, the consumer's own markup
   * renders for that column and the library's textarea is never reached.
   */
  readonly overrideDescription = input<boolean>(false);

  readonly placeholder = input<string>();

  /** How many lines the panel's field shows. */
  readonly editorRows = input<number>(4);

  /** The last proposal, so a section can show what arrived and offer an undo. */
  readonly lastIntent = signal<null | readonly NgeCellPatch[]>(null);

  /**
   * The viewport's scroll offset at the moment it was last sampled.
   *
   * ⚠️ **The readout the backdrop claim needs, and a negative that is worthless
   * without one.** "The wheel did not scroll the table" and "the table was never
   * scrollable" are the same picture; sampling before and after a wheel gesture is
   * what separates them.
   */
  readonly scrollSample = signal<null | number>(null);

  /**
   * ⚠️ **`getRowId` is not optional here.** An edit is keyed by `rowId` + `columnId`,
   * so without one the engine keys rows by array index and a sort would land the patch
   * on a different record. The library throws in dev rather than degrade.
   */
  readonly config = computed<NgeTableConfig<NgeTableFixtureRow>>(() =>
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: this.columns(),
      data: this.rows(),
      enableVirtualization: this.enableVirtualization(),
      getRowId: row => row.id,
    })
  );

  readonly intentJson = computed(() => JSON.stringify(this.lastIntent() ?? [], null, 2));

  readonly intentSummary = computed(() => {
    const cells = this.lastIntent();

    return cells === null ? 'nothing proposed yet' : `${cells.length} cell proposed`;
  });

  /**
   * ARCH-269's slice, so a section can show it did NOT move.
   *
   * ⚠️ **The negative is the assertion these sections exist to make**, and a negative
   * needs a readout more than a positive does: "`Escape` left the range alone" and
   * "the range was never wired up" look identical on screen without one.
   */
  readonly rangeJson = computed(() => JSON.stringify(this.state().ngeRange ?? null, null, 2));

  /**
   * The shared columns plus a local `description`, given a textarea editor.
   *
   * ⚠️ **A namespaced meta key, never a bare field** — `ColumnMeta` is one globally
   * merged interface shared by every addon and every domain, so `ngeEdit` sits beside
   * `ngeExport` (ARCH-248) and `ngeFill` (ARCH-271). The options ride `editorInputs`
   * because an editor reads its own inputs and cannot reach column meta at all;
   * {@link ngeCellTextareaEdit} is what makes a misspelled key a compile error rather
   * than a silent drop.
   *
   * ⚠️ **There is no `alwaysLive` to pass.** The helper does not offer it, because this
   * editor's control is a body-level overlay: an always-live column would mean one
   * panel per visible row.
   */
  private readonly columns = computed<NgeTableColumn<NgeTableFixtureRow>[]>(() => [
    ...NGE_TABLE_FIXTURE_COLUMNS,
    {
      ...DESCRIPTION_COLUMN,
      meta: {
        ngeEdit: ngeCellTextareaEdit({
          label: 'Edit description',
          maxlength: this.maxlength(),
          placeholder: this.placeholder(),
          rows: this.editorRows(),
        }),
      },
    },
  ]);

  /**
   * The whole host side of the contract.
   *
   * `edit-intent` is one of only two kinds a listener is expected to ACT on — the
   * other being `fill-intent`, whose payload is the same `NgeCellPatch`.
   */
  onEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
    if (event.kind !== 'edit-intent') {
      return;
    }

    this.lastIntent.set(event.cells);

    if (this.applyIntents()) {
      this.applyPatches(event.cells, cell => cell.value);
    }
  }

  /** Read the scroll offset off the real viewport — see {@link scrollSample}. */
  sampleScroll(): void {
    const viewport = this.host.nativeElement.querySelector<HTMLElement>('.nge-table__viewport');

    this.scrollSample.set(viewport === null ? null : Math.round(viewport.scrollTop));
  }

  /** Put back what was there — the reason the intent carries `previousValue`. */
  undo(): void {
    const cells = this.lastIntent();

    if (cells !== null) {
      this.applyPatches(cells, cell => cell.previousValue);
    }
  }

  /** Rewrite the rows a proposal names, leaving every other row's identity untouched. */
  private applyPatches(
    cells: readonly NgeCellPatch[],
    pick: (cell: NgeCellPatch) => unknown
  ): void {
    const patches = new Map<string, Record<string, unknown>>();

    for (const cell of cells) {
      const patch = patches.get(cell.rowId) ?? {};
      patch[cell.columnId] = pick(cell);
      patches.set(cell.rowId, patch);
    }

    // A new array with new objects only where something changed. Rows the edit did not
    // touch keep their identity, so the engine's memoisation survives it.
    this.rows.update(rows =>
      rows.map(row => {
        const patch = patches.get(row.id);

        return patch ? ({ ...row, ...patch } as NgeTableFixtureRow) : row;
      })
    );
  }
}
