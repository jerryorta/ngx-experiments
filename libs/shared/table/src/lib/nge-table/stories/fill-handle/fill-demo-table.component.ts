import {
  Component,
  computed,
  inject,
  input,
  model,
  signal,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeTableFixtureRow } from '../../../../testing';
import type { NgeCellPatch, NgeTableEvent } from '../../../events';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';

import { NGE_TABLE_FIXTURE_COLUMNS } from '../../../../testing';
import { createNgeTableConfig } from '../../../nge-table-config';
import {
  NgeFillHandleComponent,
  NgeRangeBridge,
  NgeRangeOverlayComponent,
  provideNgeCellRange,
} from '../../../range';
import { NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';

/**
 * One fill-enabled table **that owns its own rows** — which is the whole point.
 *
 * ⚠️ **This component is the host, and the host is what makes a fill happen.** The
 * library computes an intent and announces it; nothing changes until the code below
 * applies it and hands new `data` back in. Delete {@link applyFill} and the handle
 * still drags, still outlines, still emits — and the table never changes. That is the
 * correct behaviour for a host that has not opted into editing, and it is the property
 * every section of the interaction story is really demonstrating.
 *
 * ⚠️ **Both cell components ride ONE `cell-overlay` template**, not two registrations.
 * The slot resolves to one template per column plus one shared fallback, so a second
 * `ngeTableSlot="cell-overlay"` would silently replace the first. With three
 * cell-marking components in the library that limit is now load-bearing, and this
 * wrapper is what it looks like in practice.
 *
 * ⚠️ Providers are per-table for the reason `<nge-table-range-demo>` records: one
 * bridge per injector, and it holds both the engine instance and the delegated gesture.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-fill-demo',
  },
  imports: [
    NgeFillHandleComponent,
    NgeRangeOverlayComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  providers: [provideNgeCellRange({ clearOnEscape: false, selectAllOnModifierA: false })],
  selector: 'nge-table-fill-demo',
  standalone: true,
  styleUrl: './fill-demo-table.component.scss',
  templateUrl: './fill-demo-table.component.html',
})
export class NgeTableFillDemoComponent {
  /** The rows this table owns. A signal, because a fill replaces them. */
  readonly rows = model.required<NgeTableFixtureRow[]>();

  /** How tall the scroll viewport is. Bound to `nge-table` itself, never a wrapper. */
  readonly maxHeight = input<number>(360);

  /**
   * Whether to apply an incoming `fill-intent`.
   *
   * Off in the section that demonstrates a host **ignoring** the event — where the
   * drag works, the proposal arrives, and the table stays exactly as it was.
   */
  readonly applyIntents = input<boolean>(true);

  readonly state = model.required<NgeTableState>();

  /** The last proposal, so a section can show what arrived and offer an undo. */
  readonly lastIntent = signal<null | readonly NgeCellPatch[]>(null);

  /** Recomputed when the rows change — which is how an applied fill reaches the table. */
  readonly config = computed<NgeTableConfig<NgeTableFixtureRow>>(() =>
    createNgeTableConfig<NgeTableFixtureRow>({
      columns: NGE_TABLE_FIXTURE_COLUMNS,
      data: this.rows(),
      // ⚠️ Not optional: every proposed cell is named by `getRowId(row)`, and without
      // one the engine keys rows by array index — so a sort would land the fill on
      // different records.
      getRowId: row => row.id,
      ...this.configOverrides(),
    })
  );

  /** Columns and flags a section wants on top of the defaults. */
  readonly configOverrides = input<Partial<NgeTableConfig<NgeTableFixtureRow>>>({});

  readonly intentSummary = computed(() => {
    const cells = this.lastIntent();

    return cells === null ? 'nothing proposed yet' : `${cells.length} cells proposed`;
  });

  readonly intentJson = computed(() =>
    JSON.stringify((this.lastIntent() ?? []).slice(0, 6), null, 2)
  );

  /**
   * Whether to show the live readout of the selected cells' **values**.
   *
   * ⚠️ **Off for the ten-thousand-row section, and that is not a style choice.**
   * `readNgeExportData` walks every row of the processed model — ~170–230 ms at 10,000
   * rows × 7 columns — and this readout is recomputed on every state change, which
   * during a fill drag means every frame. On a twelve-row table that is 84 cells and
   * free; on the large fixture it would make the drag unusable.
   */
  readonly showSelectedData = input<boolean>(true);

  /** The addon's view-side reader, for the export predicate. */
  private readonly range = inject(NgeRangeBridge);

  /** Non-required: the query is empty on the first computed pass, before the view exists. */
  private readonly table = viewChild(NgeTableComponent<NgeTableFixtureRow>);

  /**
   * The selected cells, as data — **the ARCH-248 composition, read live**.
   *
   * The same `readNgeExportData({ cellPredicate })` the export stories put behind a
   * button, recomputed as the selection moves. It answers "what have I actually got
   * hold of" *before* a fill rather than after, which is the question a user judging a
   * fill is asking.
   *
   * ⚠️ Reads `state()` first and deliberately. Both the predicate and the reader go
   * through the raw engine instance, so this signal is what tells the computed the
   * selection may have moved — the same arrangement `<nge-range-overlay>` documents.
   *
   * ⚠️ Guards on an empty selection **before** calling, because the walk is O(rows)
   * whether or not the predicate matches anything.
   */
  readonly selectedData = computed(() => {
    const state = this.state();

    if (!this.showSelectedData() || (state.ngeRange?.ranges.length ?? 0) === 0) {
      return null;
    }

    return this.table()?.readNgeExportData({ cellPredicate: this.range.predicate() }) ?? null;
  });

  readonly selectedSummary = computed(() => {
    const data = this.selectedData();

    return data === null
      ? 'nothing selected'
      : `${data.columns.length} columns × ${data.rows.length} rows`;
  });

  /** The values themselves, trimmed — a readout, not a data dump. */
  readonly selectedJson = computed(() => {
    const data = this.selectedData();

    if (data === null) {
      return '';
    }

    return JSON.stringify(
      {
        columns: data.columns.map(column => column.id),
        rows: data.rows.slice(0, 6).map(row => ({
          [row.id]: row.cells.map(cell => cell.raw),
        })),
      },
      null,
      2
    );
  });

  /**
   * The whole host side of the contract.
   *
   * A `fill-intent` is the one kind a listener is expected to act on; every other kind
   * reports something already done. Nothing else in this switch needs a case.
   */
  onEvent(event: NgeTableEvent<NgeTableFixtureRow>): void {
    if (event.kind !== 'fill-intent') {
      return;
    }

    this.lastIntent.set(event.cells);

    if (this.applyIntents()) {
      this.applyFill(event.cells, cell => cell.value);
    }
  }

  /**
   * Put back what was there — the reason the intent carries `previousValue`.
   *
   * Undo belongs to the host because the data does. This is the whole implementation:
   * the same walk, reading the other field.
   */
  undo(): void {
    const cells = this.lastIntent();

    if (cells !== null) {
      this.applyFill(cells, cell => cell.previousValue);
    }
  }

  /** Rewrite the rows a proposal names, leaving every other row's identity untouched. */
  private applyFill(cells: readonly NgeCellPatch[], pick: (cell: NgeCellPatch) => unknown): void {
    const patches = new Map<string, Record<string, unknown>>();

    for (const cell of cells) {
      const patch = patches.get(cell.rowId) ?? {};
      patch[cell.columnId] = pick(cell);
      patches.set(cell.rowId, patch);
    }

    // A new array with new objects only where something changed. Rows the fill did not
    // touch keep their identity, so the engine's memoisation survives the edit.
    this.rows.update(rows =>
      rows.map(row => {
        const patch = patches.get(row.id);

        return patch ? ({ ...row, ...patch } as NgeTableFixtureRow) : row;
      })
    );
  }
}
