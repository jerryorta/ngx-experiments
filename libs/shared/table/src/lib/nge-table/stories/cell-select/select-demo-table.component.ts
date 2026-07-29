import { Component, computed, input, model, signal, ViewEncapsulation } from '@angular/core';

import type { NgeCellSelectOption } from '../../../../editors';
import type { NgeTableFixtureRow } from '../../../../testing';
import type { NgeCellPatch, NgeTableEvent } from '../../../events';
import type { NgeTableColumn } from '../../../nge-table-column';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';

import { ngeCellSelectEdit } from '../../../../editors';
import { NGE_TABLE_FIXTURE_COLUMNS, NGE_TABLE_FIXTURE_STATUSES } from '../../../../testing';
import { createNgeTableConfig } from '../../../nge-table-config';
import { NgeRangeOverlayComponent, provideNgeCellRange } from '../../../range';
import { NgeCellDirective, NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';

/**
 * The fixture's four status values, as a select's options.
 *
 * ⚠️ **Drawn from `NGE_TABLE_FIXTURE_STATUSES` rather than hand-listed**, so a
 * value added to the fixture cannot leave this demo showing a placeholder for rows
 * whose status is perfectly valid.
 *
 * `archived` is disabled to exercise the skip-on-arrow path — a real column would
 * more likely disable a terminal state than an archival one, but the mechanic is
 * what the story is showing.
 */
export const NGE_SELECT_DEMO_STATUS_OPTIONS: readonly NgeCellSelectOption[] =
  NGE_TABLE_FIXTURE_STATUSES.map(status => ({
    disabled: status === 'archived',
    label: status.charAt(0).toUpperCase() + status.slice(1),
    value: status,
  }));

/**
 * The four real statuses padded out to twenty, for the one section that needs a
 * panel taller than `--nge-table-editor-panel-max-height` caps it at.
 *
 * ⚠️ **A token whose section cannot overflow demonstrates nothing.** The same trap
 * the theming guidance records for the pinning sections — prose claiming something
 * scrolls, over a box that fits.
 */
export const NGE_SELECT_DEMO_LONG_OPTIONS: readonly NgeCellSelectOption[] = [
  ...NGE_SELECT_DEMO_STATUS_OPTIONS,
  ...Array.from({ length: 16 }, (_unused, index) => ({
    label: `Reserved ${String(index + 1).padStart(2, '0')}`,
    value: `reserved-${index + 1}`,
  })),
];

/**
 * One table whose `status` column is edited by the library's own `<nge-cell-select>`
 * (ARCH-294), with no `[ngeCell]` template in sight.
 *
 * ⚠️ **`status` is an EXISTING member of `NGE_TABLE_FIXTURE_COLUMNS`, and the meta
 * is mapped onto a copy rather than added to the shared array.** ARCH-289's frozen
 * scroll baseline renders that array wholesale, so mutating it would silently change
 * what the epic's reference measurement measures. This story is luckier than
 * ARCH-292's, which had to declare a `description` column locally because the fixture
 * deliberately carries that field without a shared column; here the column already
 * exists and only its `meta` is new.
 *
 * ⚠️ **The inverse failure is silent too**: naming a column id in an editable list
 * that no column declares makes the opt-in a no-op while the table renders perfectly.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-select-demo',
  },
  imports: [
    NgeCellDirective,
    NgeRangeOverlayComponent,
    NgeTableComponent,
    NgeTableSlotDirective,
  ],
  providers: [provideNgeCellRange({ clearOnEscape: true })],
  selector: 'nge-table-select-demo',
  standalone: true,
  styleUrl: './select-demo-table.component.scss',
  templateUrl: './select-demo-table.component.html',
})
export class NgeTableSelectDemoComponent {
  /** The rows this table owns. A signal, because an applied edit replaces them. */
  readonly rows = model.required<NgeTableFixtureRow[]>();

  readonly state = model.required<NgeTableState>();

  /**
   * Whether the status column renders its trigger at rest.
   *
   * ⚠️ **On is the default `ngeCellSelectEdit()` ships**, because a cell rendering
   * as bare text gives a user no way to know the column is a select — and activation
   * would cost a click before the click that opens. Off shows the other trade: read-only
   * text until engaged, which is also what makes the two-stage `Escape` fully
   * observable, since there is then an activation for the second press to cancel.
   */
  readonly alwaysLive = input<boolean>(true);

  /** Whether to apply an incoming `edit-intent`. Off shows a host ignoring the event. */
  readonly applyIntents = input<boolean>(true);

  readonly enableCellRange = input<boolean>(false);

  readonly enableVirtualization = input<boolean>(false);

  /** How tall the scroll viewport is. Bound to `nge-table` itself, never a wrapper. */
  readonly maxHeight = input<number>(320);

  /**
   * Whether a `[ngeCell]` template is projected for `status`.
   *
   * The acceptance criterion in one switch: with it on, the consumer's own markup
   * renders for that column and the library's select is never reached.
   */
  readonly overrideStatus = input<boolean>(false);

  /** The choices the status column offers. Swapped only to demonstrate a tall panel. */
  readonly selectOptions = input<readonly NgeCellSelectOption[]>(NGE_SELECT_DEMO_STATUS_OPTIONS);

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
   * ARCH-269's slice, so a section can show it did NOT move.
   *
   * ⚠️ **The negative is the assertion this story exists to make**, and a negative
   * needs a readout more than a positive does: "the drag selected nothing" and "the
   * drag was never wired up" look identical on screen without one.
   */
  readonly rangeJson = computed(() => JSON.stringify(this.state().ngeRange ?? null, null, 2));

  /**
   * The shared columns, with `status` given a select editor.
   *
   * ⚠️ **A namespaced meta key, never a bare field** — `ColumnMeta` is one globally
   * merged interface shared by every addon and every domain, so `ngeEdit` sits
   * beside `ngeExport` (ARCH-248) and `ngeFill` (ARCH-271). The options ride
   * `editorInputs` because an editor reads its own inputs and cannot reach column
   * meta at all; {@link ngeCellSelectEdit} is what makes that key a compile error
   * rather than a silent drop.
   */
  private readonly columns = computed<NgeTableColumn<NgeTableFixtureRow>[]>(() => {
    const edit = ngeCellSelectEdit(this.selectOptions(), {
      alwaysLive: this.alwaysLive(),
      label: 'Edit status',
    });

    return NGE_TABLE_FIXTURE_COLUMNS.map(column =>
      column.id === 'status' ? { ...column, meta: { ngeEdit: edit }, size: 160 } : column
    );
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
