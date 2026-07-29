import { Component, computed, input, model, signal, ViewEncapsulation } from '@angular/core';

import type { NgeTableFixtureRow } from '../../../../testing';
import type { NgeCellPatch, NgeTableEvent } from '../../../events';
import type { NgeTableColumn } from '../../../nge-table-column';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';
import type { NgeCellContext } from '../../../slots';

import { NGE_TABLE_FIXTURE_COLUMNS } from '../../../../testing';
import { createNgeTableConfig } from '../../../nge-table-config';
import { NgeRangeOverlayComponent, provideNgeCellRange } from '../../../range';
import { NgeCellDirective, NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';
import { NgeTableEditDemoSliderComponent } from './edit-demo-slider.component';

/** The columns a section can switch editing on for, by id. */
export type NgeTableEditDemoColumn = 'description' | 'name' | 'quantity';

/**
 * The long-text column, declared **here** rather than added to the shared fixture.
 *
 * ⚠️ `description` is a field on every fixture row (ARCH-290) but deliberately not a
 * member of `NGE_TABLE_FIXTURE_COLUMNS`, and adding it there would be the wrong fix
 * for a story that wants it. ARCH-289's frozen scroll baseline renders that array
 * wholesale, so an eighth shared column silently changes what the baseline measures —
 * and a performance baseline that quietly starts measuring a different table is worth
 * less than no baseline at all.
 *
 * Declaring it locally is also the honest demonstration: a consumer wanting an
 * editable long-text column writes exactly this.
 */
const DESCRIPTION_COLUMN: NgeTableColumn<NgeTableFixtureRow> = {
  accessorKey: 'description',
  header: 'Description',
  id: 'description',
  size: 260,
};

/**
 * One editing-enabled table **that owns its own rows** — which is the whole point.
 *
 * ⚠️ **This component is the host, and the host is what makes an edit happen.** The
 * library activates a control, collects a value and announces `edit-intent`; nothing
 * changes until the code below applies it and hands new `data` back in. Delete
 * {@link applyPatches} and every gesture still works, every intent still arrives, and
 * the table never changes. That is the correct behaviour for a host that has not opted
 * into editing, and it is what every section of the interaction story is really
 * demonstrating.
 *
 * ⚠️ **No editor ships from the library in ARCH-292**, so the controls below are the
 * consumer's own — a plain `<input>` for the text columns and a composed
 * `role="slider"` for the always-live one. ARCH-293 and ARCH-294 add the library's
 * defaults; a `[ngeCell]` template like this one shadows them either way.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-edit-demo',
  },
  imports: [
    NgeCellDirective,
    NgeRangeOverlayComponent,
    NgeTableComponent,
    NgeTableEditDemoSliderComponent,
    NgeTableSlotDirective,
  ],
  // ⚠️ `clearOnEscape` stays ON here, unlike the fill demo. The point of the `Escape`
  // section is that an editor's own cancel must NOT reach this addon — a table that had
  // opted out of the key would demonstrate nothing.
  providers: [provideNgeCellRange({ clearOnEscape: true })],
  selector: 'nge-table-edit-demo',
  standalone: true,
  styleUrl: './edit-demo-table.component.scss',
  templateUrl: './edit-demo-table.component.html',
})
export class NgeTableEditDemoComponent {
  /** The rows this table owns. A signal, because an applied edit replaces them. */
  readonly rows = model.required<NgeTableFixtureRow[]>();

  readonly state = model.required<NgeTableState>();

  /** How tall the scroll viewport is. Bound to `nge-table` itself, never a wrapper. */
  readonly maxHeight = input<number>(360);

  /** Which columns accept an edit. Empty leaves the table entirely read-only. */
  readonly editableColumns = input<readonly NgeTableEditDemoColumn[]>(['name', 'description']);

  /** Whether `quantity` renders its slider without waiting to be activated. */
  readonly alwaysLiveQuantity = input<boolean>(false);

  readonly enableRowSelection = input<boolean>(false);

  /** Whether the projected `<nge-range-overlay>` is rendered at all. */
  readonly enableCellRange = input<boolean>(false);

  /**
   * Whether the rows are windowed.
   *
   * The section that scrolls an open editor out of view needs this on — without it
   * every row stays rendered, nothing recycles, and there is no window to leave.
   */
  readonly enableVirtualization = input<boolean>(false);

  /**
   * Whether to apply an incoming `edit-intent`.
   *
   * Off in the section that demonstrates a host **ignoring** the event — where the
   * editor opens, the value is typed, the proposal arrives, and the table stays exactly
   * as it was.
   */
  readonly applyIntents = input<boolean>(true);

  /**
   * Whether `rowHeight` / `headerHeight` are left for a theme to set.
   *
   * ⚠️ **`createNgeTableConfig()` cannot serve the "compact rows" theming section**,
   * and this is the reason a second construction path exists rather than a bug in the
   * factory. It fills both fields in from `NGE_TABLE_DEFAULTS` *unconditionally*, and
   * `<nge-table>`'s `applyGeometry` then writes the resolved numbers as *inline*
   * properties on the host — which outrank a wrapper class regardless of specificity.
   * A theming section built on the factory would therefore render at the library
   * default no matter what `--nge-table-row-height` a `.compact` class declared, and
   * fail silently: no error, just a class that looks like it does nothing. Hand-authoring
   * the config and omitting the two fields is the supported path this trades down to —
   * the factory is a convenience, not the only constructor.
   */
  readonly themableGeometry = input<boolean>(false);

  /** The last proposal, so a section can show what arrived and offer an undo. */
  readonly lastIntent = signal<null | readonly NgeCellPatch[]>(null);

  /**
   * ⚠️ **`getRowId` is not optional here.** An edit is keyed by `rowId` + `columnId`,
   * so without one the engine keys rows by array index and a sort would land the patch
   * on a different record. The library throws in dev rather than degrade.
   */
  readonly config = computed<NgeTableConfig<NgeTableFixtureRow>>(() => {
    const columns = this.columns();
    const data = this.rows();
    const enableRowSelection = this.enableRowSelection();
    const enableVirtualization = this.enableVirtualization();

    if (this.themableGeometry()) {
      return { columns, data, enableRowSelection, enableVirtualization, getRowId: row => row.id };
    }

    return createNgeTableConfig<NgeTableFixtureRow>({
      columns,
      data,
      enableRowSelection,
      enableVirtualization,
      getRowId: row => row.id,
    });
  });

  readonly intentSummary = computed(() => {
    const cells = this.lastIntent();

    return cells === null ? 'nothing proposed yet' : `${cells.length} cell proposed`;
  });

  readonly intentJson = computed(() => JSON.stringify(this.lastIntent() ?? [], null, 2));

  /**
   * The fixture's columns with `meta.ngeEdit` applied to whichever a section named.
   *
   * ⚠️ **A namespaced meta key, never a bare field** — `ColumnMeta` is one globally
   * merged interface shared by every addon and every domain in the workspace, so
   * `ngeEdit` sits beside `ngeExport` (ARCH-248) and `ngeFill` (ARCH-271) rather
   * than claiming a name like `editable` that anyone might want.
   */
  private readonly columns = computed<NgeTableColumn<NgeTableFixtureRow>[]>(() => {
    const editable = new Set(this.editableColumns());
    const alwaysLive = this.alwaysLiveQuantity();

    return [...NGE_TABLE_FIXTURE_COLUMNS, DESCRIPTION_COLUMN].map(column => {
      if (column.id === undefined || !editable.has(column.id as NgeTableEditDemoColumn)) {
        return column;
      }

      return {
        ...column,
        meta: {
          ngeEdit: { alwaysLive: column.id === 'quantity' && alwaysLive, enabled: true },
        },
      };
    });
  });

  /**
   * The whole host side of the contract.
   *
   * `edit-intent` is one of only two kinds a listener is expected to ACT on — the other
   * being `fill-intent`, whose payload is the same `NgeCellPatch`. One handler could
   * serve both; they stay distinct kinds so a host that wants only one has somewhere to
   * say so.
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

  /**
   * Commit an `<input>`'s text. Bound to `Enter` (via a synthetic blur, see the
   * template) and to blur itself — the quantity slider commits its own number
   * directly against `cell.commitEdit`, so this only ever sees a string.
   *
   * ⚠️ **The `isEditing()` guard is load-bearing, not defensive filler.** Removing a
   * focused element from the DOM fires a native `blur` on it — the browser's own
   * focus-fixup step — and `Escape` does exactly that: it clears `store.editing`, which
   * flips `isEditing()` to `false` and tears this very `<input>` down via the template's
   * `@else` branch a moment later. Without the guard, that teardown-triggered blur would
   * commit the abandoned draft `Escape` was meant to discard.
   */
  commitText(cell: NgeCellContext<NgeTableFixtureRow>, value: string): void {
    if (cell.isEditing()) {
      cell.commitEdit(value);
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
