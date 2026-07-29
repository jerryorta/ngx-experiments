import { Component, computed, input, model, signal, ViewEncapsulation } from '@angular/core';

import type { NgeTableFixtureRow } from '../../../../testing';
import type { NgeCellPatch, NgeTableEvent } from '../../../events';
import type { NgeTableColumn } from '../../../nge-table-column';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';

import { NgeCellCheckboxComponent, NgeCellInputComponent } from '../../../../editors';
import { NGE_TABLE_FIXTURE_COLUMNS } from '../../../../testing';
import { createNgeTableConfig } from '../../../nge-table-config';
import { NgeRangeOverlayComponent, provideNgeCellRange } from '../../../range';
import { NgeCellDirective, NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';

/**
 * The long-text column, declared **here** rather than added to the shared fixture.
 *
 * ⚠️ `description` is a field on every fixture row (ARCH-290) and deliberately not a
 * member of `NGE_TABLE_FIXTURE_COLUMNS`. ARCH-289's frozen scroll baseline renders
 * that array wholesale, so an eighth shared column silently changes what the epic's
 * reference measurement measures — and a baseline that quietly starts measuring a
 * different table is worth less than no baseline at all.
 */
const DESCRIPTION_COLUMN: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'description',
  header: 'Description',
  id: 'description',
  size: 260,
};

/**
 * One table edited with the **library's own** editors, and no `[ngeCell]` template
 * in sight (ARCH-293).
 *
 * ⚠️ **The whole point is what this component does NOT contain.** ARCH-292's demo
 * writes a template per editable column and an `<input>` inside each; here a column
 * names a component in `meta.ngeEdit.editor` and the table resolves it through the
 * same render-slot registry a projected template goes through. Section by section
 * this file is the columns, the intent handler, and nothing else.
 *
 * ⚠️ **It is still the host that makes an edit happen.** The library activates a
 * control, collects a value and announces `edit-intent`; nothing changes until
 * {@link applyPatches} below applies it and hands new `data` back in. Delete that
 * method and every gesture still works, every intent still arrives, and the table
 * never changes.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-editors-demo',
  },
  imports: [
    NgeCellDirective,
    NgeRangeOverlayComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  providers: [provideNgeCellRange({ clearOnEscape: true })],
  selector: 'nge-table-editors-demo',
  standalone: true,
  styleUrl: './editors-demo-table.component.scss',
  templateUrl: './editors-demo-table.component.html',
})
export class NgeTableEditorsDemoComponent {
  /** The rows this table owns. A signal, because an applied edit replaces them. */
  readonly rows = model.required<NgeTableFixtureRow[]>();

  readonly state = model.required<NgeTableState>();

  /** How tall the scroll viewport is. Bound to `nge-table` itself, never a wrapper. */
  readonly maxHeight = input<number>(360);

  /**
   * Whether the boolean column skips activation.
   *
   * ⚠️ **The arrangement `<nge-cell-checkbox>` is for.** Activation exists to avoid
   * building controls nobody engaged, and a checkbox is the cheapest control there
   * is — so the saving is nil while the cost, a click to activate before the click
   * that toggles, is real. Off, the column still works and reads as a disabled box.
   */
  readonly alwaysLiveActive = input<boolean>(true);

  /**
   * Whether a `[ngeCell]` template is projected for `name`.
   *
   * The acceptance criterion in one switch: with it on, the consumer's own control
   * renders for that column and the library's editor is never reached.
   */
  readonly overrideName = input<boolean>(false);

  readonly enableCellRange = input<boolean>(false);

  readonly enableVirtualization = input<boolean>(false);

  /** Whether to apply an incoming `edit-intent`. Off shows a host ignoring the event. */
  readonly applyIntents = input<boolean>(true);

  /** The last proposal, so a section can show what arrived and offer an undo. */
  readonly lastIntent = signal<null | readonly NgeCellPatch[]>(null);

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
   * Four editable columns, each naming the component that edits it.
   *
   * ⚠️ **A namespaced meta key, never a bare field** — `ColumnMeta` is one globally
   * merged interface shared by every addon and every domain, so `ngeEdit` sits
   * beside `ngeExport` (ARCH-248) and `ngeFill` (ARCH-271).
   *
   * `editorInputs` is how a column configures the editor it named: `quantity` is a
   * number field, and both carry a label better than their column id. Without it an
   * option would only be reachable by projecting a template, which is the work this
   * route exists to remove.
   */
  private readonly columns = computed<NgeTableColumn<NgeTableFixtureRow>[]>(() => {
    const alwaysLive = this.alwaysLiveActive();

    const edits: Record<string, NgeTableColumn<NgeTableFixtureRow>['meta']> = {
      description: {
        ngeEdit: {
          editor: NgeCellInputComponent,
          editorInputs: { label: 'Edit description' },
          enabled: true,
        },
      },
      isActive: {
        ngeEdit: {
          alwaysLive,
          editor: NgeCellCheckboxComponent,
          editorInputs: { label: 'Active' },
          enabled: true,
        },
      },
      name: {
        ngeEdit: {
          editor: NgeCellInputComponent,
          editorInputs: { label: 'Edit name' },
          enabled: true,
        },
      },
      quantity: {
        ngeEdit: {
          editor: NgeCellInputComponent,
          editorInputs: { label: 'Edit quantity', type: 'number' },
          enabled: true,
        },
      },
    };

    return [...NGE_TABLE_FIXTURE_COLUMNS, DESCRIPTION_COLUMN].map(column => {
      const meta = column.id === undefined ? undefined : edits[column.id];

      return meta ? { ...column, meta } : column;
    });
  });

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

    // A new array with new objects only where something changed. Rows the edit did
    // not touch keep their identity, so the engine's memoisation survives it.
    this.rows.update(rows =>
      rows.map(row => {
        const patch = patches.get(row.id);

        return patch ? ({ ...row, ...patch } as NgeTableFixtureRow) : row;
      })
    );
  }
}
