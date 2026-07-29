import {
  Component,
  computed,
  inject,
  input,
  model,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeTableEvent } from '../../../events';
import type { NgeTableExportData } from '../../../export';
import type { NgeTableConfig } from '../../../nge-table-config';
import type { NgeTableState } from '../../../nge-table-state';

import {
  NgeHighlightBridge,
  NgeHighlightOverlayComponent,
  provideNgeCellHighlighting,
} from '../../../highlight';
import { NgeTableSlotDirective } from '../../../slots';
import { NgeTableComponent } from '../../nge-table.component';

/**
 * One highlight-enabled table, with its own provider scope.
 *
 * ⚠️ **This component exists because highlighting is per-table, and that is a
 * correctness constraint rather than tidiness.** `provideNgeCellHighlighting()`
 * registers one {@link NgeHighlightBridge} per *injector*, and the bridge holds
 * the engine instance handed to it by its companion feature. Put the providers on a
 * story component that renders six tables and all six share one bridge — the last
 * to attach wins, so a click in the first section would resolve its cell against
 * the sixth section's table and write to the wrong state. Giving each table its own
 * component gives each its own injector, which is exactly what
 * `provideNgeCellHighlighting`'s own guidance says ("put it on the component that
 * hosts the table, never in an application's root providers").
 *
 * It is also the shape a real consumer ends up with: a feature component that owns
 * one table, its state, and its interactions.
 *
 * @typeParam TRow - The shape of one row of data.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-highlight-demo',
  },
  imports: [NgeHighlightOverlayComponent, NgeTableComponent, NgeTableSlotDirective],
  providers: [provideNgeCellHighlighting()],
  selector: 'nge-table-highlight-demo',
  standalone: true,
  styleUrl: './highlight-demo-table.component.scss',
  templateUrl: './highlight-demo-table.component.html',
})
export class NgeTableHighlightDemoComponent<TRow> {
  /** The addon's view-side reader, one per instance of this component. */
  protected readonly highlight = inject(NgeHighlightBridge);

  readonly config = input.required<NgeTableConfig<TRow>>();

  /** How tall the scroll viewport is. Bound to `nge-table` itself, never a wrapper. */
  readonly maxHeight = input<number>(420);

  /**
   * The type carrier for the projected slot template.
   *
   * Never read at runtime — it exists so `TRow` has somewhere to be inferred from,
   * without which `let-cell` resolves to `NgeCellContext<unknown>` and any field
   * access on `cell.row` fails to compile. ⚠️ That failure surfaces only in
   * Storybook's own build: `shared-table` has no build target, so nothing else runs
   * `ngtsc` over a story template.
   */
  readonly rows = input.required<readonly TRow[]>();

  /**
   * Whether to render the "Clear highlighting" control.
   *
   * On by default: a section a reviewer can mark but not unmark is a dead end. The
   * theming story turns it off — its tables are seeded for comparison rather than
   * driven, and seven buttons would be noise.
   */
  readonly showClear = input<boolean>(true);

  /** Two-way, so a section can read the slice back out for its readout. */
  readonly state = model.required<NgeTableState>();

  /**
   * Whether anything is marked, for the control's disabled state.
   *
   * Reads `state()` first and deliberately: that is what makes this recompute. The
   * bridge holds the raw engine instance and is not reactive, so `hasMarks()` alone
   * would answer once and never update.
   */
  readonly hasMarks = computed(() => {
    const slice = this.state().ngeHighlight;

    return (slice?.cells.length ?? 0) > 0 || (slice?.ranges.length ?? 0) > 0;
  });

  /**
   * Whether `shift` was down when the gesture started.
   *
   * Read on `mousedown` because `cell-click` carries a `NgeCellContext` and no
   * keyboard modifiers — deliberate, since the event union describes what happened
   * to the *table*, not what the pointer was doing. `mousedown` precedes `click`, so
   * capturing it here is enough. ARCH-269, which owns drag-selection, is where a
   * richer pointer contract belongs if one is wanted.
   */
  private shiftHeld = false;

  captureModifier(event: MouseEvent): void {
    this.shiftHeld = event.shiftKey;

    // ⚠️ Suppress the browser's own shift-click behaviour, which is to extend the
    // document's TEXT selection from the last caret anchor. Without this, extending
    // a highlight paints the addon's tint and a native blue selection over the same
    // cells at once, and the result reads as a rendering bug rather than a feature.
    //
    // Gated on `shiftKey` rather than applied unconditionally, and both halves of
    // that matter:
    //
    // - A blanket `user-select: none` on cells would suppress it too, but would also
    //   stop a user selecting and copying a single cell's value — which is the exact
    //   trade ARCH-269's constraints already rule out ("suppress during the drag
    //   without disabling it for a user who wants to copy a single cell's text").
    // - `preventDefault()` on `mousedown` also suppresses **focus**, so doing it on
    //   every click would break an `<input>` inside a cell — and inline editing is a
    //   cell pattern this library explicitly supports. A shift-click into an input is
    //   not a meaningful editing gesture, so gating on the modifier costs nothing.
    //
    // `click` still fires after a prevented `mousedown`, so the cell-click event the
    // range gesture rides on is unaffected.
    if (event.shiftKey) {
      event.preventDefault();
    }
  }

  /**
   * The whole integration: one event binding, one call.
   *
   * No `@tanstack/*` import, no reach into the table, and no mark held against a DOM
   * element — marks live in `state`, which is what makes them survive a virtualized
   * scroll and a sort alike.
   */
  onNgeTableEvent(event: NgeTableEvent<TRow>): void {
    if (event.kind !== 'cell-click') {
      return;
    }

    const { columnId, rowId } = event.cell;

    if (this.shiftHeld) {
      this.highlight.extendTo(rowId, columnId);
    } else {
      this.highlight.toggle(rowId, columnId);
    }
  }

  clear(): void {
    this.highlight.clear();
  }

  /**
   * Export only the highlighted cells — **the whole of the ARCH-251 composition.**
   *
   * One seam supplies a `NgeCellContext → boolean`; the other consumes it. The
   * export reader has never heard of highlighting and this addon has never heard of
   * exporting; they meet on the table instance and nowhere else.
   */
  exportHighlighted(): NgeTableExportData {
    return this.table().readNgeExportData({ cellPredicate: this.highlight.predicate() });
  }

  /** The same table, unfiltered — for the contrast. */
  exportEverything(): NgeTableExportData {
    return this.table().readNgeExportData();
  }

  /**
   * The table this component wraps.
   *
   * `readNgeExportData` is a method on `<nge-table>` rather than a service, so
   * reaching it is an ordinary view query — and nothing here imports `@tanstack/*`
   * to hold the result.
   */
  private readonly table = viewChild.required(NgeTableComponent<TRow>);
}
