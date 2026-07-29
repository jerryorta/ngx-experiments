import type { Cell, Row, Table, TableFeature } from '@tanstack/angular-table';

import { DOCUMENT } from '@angular/common';
import { DestroyRef, inject, Injectable, signal } from '@angular/core';

import type { NgeCellContext } from '../slots';
import type { NgeHighlightRowOrder } from './nge-highlight-state';

import { NGE_HIGHLIGHT_OPTIONS } from './nge-highlight-options';

/**
 * What lets a projected `cell-overlay` template answer a question only the table
 * can answer.
 *
 * The render-slot seam hands a template a {@link NgeCellContext} — `rowId`,
 * `columnId`, the row, the value — and deliberately nothing else, so a consumer's
 * markup never sees a `@tanstack/*` type. That insulation has a consequence this
 * addon is the first to meet: a **range** descriptor is resolved against the
 * processed row model, and a template has no route to it. A projected
 * `ng-template` is instantiated with its *declaration* injector — the consumer's —
 * so it cannot reach `NgeTableStore` either, and it should not: the store belongs
 * to one table and the template belongs to the component that wrote it.
 *
 * So the addon supplies its own route. {@link provideNgeCellHighlighting}
 * registers this in the **consumer's** injector alongside the feature, and a tiny
 * companion `TableFeature` hands it the engine instance the moment one exists. The
 * overlay component then resolves through the same injector its template was
 * declared in, and finds it.
 *
 * ⚠️ **This holds the RAW instance, not the adapter's proxy, so nothing it reads is
 * reactive.** `createTable` is called by the engine with the real object; the proxy
 * — which is what turns `get*` accessors into computeds — belongs to the store. The
 * reactivity therefore comes from the *host's own* `state` signal, which the
 * overlay takes as an input and which every highlight change flows through by
 * construction. That is not a workaround: it is the controlled-state contract doing
 * exactly its job, and it means a sort (which also moves `state`) re-resolves every
 * range without this class subscribing to anything.
 */
@Injectable()
export class NgeHighlightBridge {
  private readonly destroyRef = inject(DestroyRef);

  /** `optional` so the bridge stays constructible outside a browser (SSR, a bare spec). */
  private readonly document = inject(DOCUMENT, { optional: true });

  private readonly options = inject(NGE_HIGHLIGHT_OPTIONS);

  private readonly table = signal<null | Table<unknown>>(null);

  /**
   * Clear on `Escape` — the conventional "give up the selection" gesture.
   *
   * ⚠️ **The listener is on the document, and it has to be.** A scoped handler is
   * the obvious instinct and would almost never fire: nothing in the table body is
   * focusable (cells carry no `tabindex` — keyboard grid navigation is a later
   * story), so a `keydown` bound to a wrapper receives nothing unless the user
   * happens to have tabbed to a sortable header.
   *
   * ⚠️ **It is unconditional, and stays polite by being a no-op rather than by
   * guarding.** `Escape` belongs to whatever is on top — a dialog, a menu, an inline
   * editor — so this must never take the key away. It does not: `preventDefault()`
   * is never called, and on an unmarked table `clearNgeHighlight` returns the same
   * slice while `writeNgeHighlight` skips an unchanged write, so nothing is written
   * and no `stateChange` is emitted. Guarding on a `hasMarks()` read instead would
   * have been the buggier design — see {@link clear} on why that read cannot be
   * trusted from this class.
   *
   * A constructor rather than a field initializer because registering a listener
   * with matching teardown is precisely the setup a field cannot express. Teardown
   * rides `DestroyRef` — a service has no lifecycle hooks, and this one is scoped to
   * the consumer component that provided it, so it unregisters with that component.
   */
  constructor() {
    const doc = this.document;

    if (!doc || !this.options.clearOnEscape) {
      return;
    }

    const onKeydown = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        this.clear();
      }
    };

    doc.addEventListener('keydown', onKeydown);
    this.destroyRef.onDestroy(() => doc.removeEventListener('keydown', onKeydown));
  }

  /**
   * Row id → position in the **processed** row model, or an empty map before a
   * table has attached.
   *
   * Read at evaluation time rather than cached, because the caller's own re-
   * evaluation is the signal that something moved. The engine memoises the row
   * model, so this is one `Map` construction per call over an array it did not
   * have to rebuild.
   */
  rowOrder(): NgeHighlightRowOrder {
    const table = this.table();

    if (!table) {
      return new Map();
    }

    return new Map(table.getRowModel().rows.map((row: Row<unknown>, index) => [row.id, index]));
  }

  /**
   * Receive the engine instance. Called once, by the companion feature.
   *
   * Idempotent by assignment rather than guarded, so a table rebuilt under the same
   * consumer — a `<nge-table>` inside an `@if`, for instance — replaces the stale
   * instance instead of holding a detached one.
   */
  attach(table: Table<unknown>): void {
    this.table.set(table);
  }

  // ─── the consumer-facing write API ─────────────────────────────────────────
  //
  // The cell-level methods (`toggleNgeHighlight`, `extendNgeHighlight`) live on
  // the engine's `Cell`, which a consumer never holds: the `cell-click` event and
  // the render slots both hand over a `NgeCellContext` — ids and values — because
  // keeping `@tanstack/*` out of consumer code is the point of that boundary. So
  // the ergonomic path is by id, and it resolves to the very same cell methods
  // rather than reimplementing them.

  /** Add or remove one cell, and make it the shift-click anchor. */
  toggle(rowId: string, columnId: string): void {
    this.cellAt(rowId, columnId)?.toggleNgeHighlight();
  }

  /** Extend the block from the anchor to one cell — the shift-click path. */
  extendTo(rowId: string, columnId: string): void {
    this.cellAt(rowId, columnId)?.extendNgeHighlight();
  }

  /**
   * Drop every mark and the anchor. A no-op when nothing is marked.
   *
   * Unconditionally safe to call, which is what lets the `Escape` handler below stay
   * this simple: `clearNgeHighlight` returns the same slice when there is nothing to
   * give up, and `writeNgeHighlight` skips a write whose result is unchanged, so a
   * key press on an unmarked table produces no state change and no `stateChange`.
   *
   * ⚠️ **There is deliberately no `hasMarks()` on this class.** The obvious version
   * reads `readNgeHighlightState()` off the instance the bridge holds — which is the
   * RAW engine object, whose `options` are only refreshed when the adapter's *proxy*
   * is read. In an app that happens constantly (rendering reads the proxy), so the
   * staleness is invisible; in a spec nothing does, and the answer is wrong. The same
   * trap `AGENTS.md` records for a `Column` captured before a state change. A
   * consumer wanting a disabled state should derive it from the `state` they already
   * own — see `stories/highlight/highlight-demo-table.component.ts` → `hasMarks`.
   */
  clear(): void {
    this.table()?.clearNgeHighlight();
  }

  /**
   * The export seam's `cellPredicate`, ready to hand over.
   *
   * `<nge-table>` deliberately does not expose the engine instance, so this is a
   * consumer's route to the composition ARCH-251 builds on:
   *
   * ```ts
   * table.readNgeExportData({ cellPredicate: highlight.predicate() });
   * ```
   *
   * Matches nothing before a table has attached, which is the right answer for
   * "export what is highlighted" on a table that does not exist yet.
   */
  predicate(): (cell: NgeCellContext<unknown>) => boolean {
    const table = this.table();

    return table ? table.ngeHighlightPredicate() : () => false;
  }

  /**
   * One cell of the current row model, by id.
   *
   * `getRow` throws on an unknown id rather than returning `undefined`, and an id
   * that has been filtered out is an ordinary thing for a stale click to carry — so
   * the lookup is guarded rather than trusted.
   */
  private cellAt(rowId: string, columnId: string): Cell<unknown, unknown> | undefined {
    const table = this.table();

    if (!table) {
      return undefined;
    }

    return table
      .getRowModel()
      .rows.find(row => row.id === rowId)
      ?.getAllCells()
      .find(cell => cell.column.id === columnId);
  }
}

/**
 * The `TableFeature` that performs the hand-off.
 *
 * Separate from `ngeCellHighlighting` so that feature stays a plain object with no
 * dependencies — registerable on its own by anyone who wants highlight state and
 * export composition without the rendered overlay.
 */
export function createNgeHighlightBridgeFeature(bridge: NgeHighlightBridge): TableFeature {
  return {
    createTable: (table: Table<unknown>): void => {
      bridge.attach(table);
    },
  };
}
