import type { Signal } from '@angular/core';
import type { Table } from '@tanstack/angular-table';
import type { AngularVirtualizer } from '@tanstack/angular-virtual';

import { computed, effect } from '@angular/core';
import { signalStoreFeature, withComputed, withProps } from '@ngrx/signals';
import { injectVirtualizer } from '@tanstack/angular-virtual';

import type { NgeTableHeaderRow } from '../nge-table-lane';
import type { NgeTableBaseStore } from '../nge-table-store.types';
import type { NgeTableRenderedRow } from '../nge-table-virtual';

import { NGE_TABLE_DEFAULTS } from '../../../nge-table-defaults';
import { ngeRowDetailOffset } from '../nge-table-expansion';
import {
  NGE_TABLE_DEFAULT_OVERSCAN,
  toNgeTableRenderedRows,
  toNgeTableVirtualRows,
} from '../nge-table-virtual';

interface NgeTableRowsDeps extends NgeTableBaseStore {
  headerRows: Signal<NgeTableHeaderRow[]>;
  table: Table<unknown>;
}

/**
 * The rows the template renders — their geometry, the virtual window they are cut
 * from, and the two facts that decide how they are painted.
 *
 * Ordered after the lanes feature because {@link NgeTableRowsDeps.headerRows} is
 * what tells the virtualizer how much space sits above the first row.
 *
 * Everything is a local `const` and exposed once at the end. That is not a style
 * preference: `scrollMargin` reads `headerRows`, `renderedRows` reads the
 * virtualizer, and the virtualizer reads three computeds above it — expressing
 * those as plain bindings makes the order the compiler's problem instead of a
 * `signalStore` composition rule to remember.
 */
export function withNgeTableRows(store: NgeTableRowsDeps) {
  // ─── Row virtualization (ARCH-245) ─────────────────────────────────────────
  //
  // The three numbers the virtualizer needs, resolved once. Each pairs a config
  // field with its `NGE_TABLE_DEFAULTS` fallback in exactly one place, so the
  // arithmetic below and the CSS the component writes cannot end up disagreeing
  // about how tall a row is.

  /**
   * Row height in pixels — presentation until virtualization is on, arithmetic
   * afterwards, because a windowed row is positioned rather than laid out.
   */
  const rowHeight = computed(() => store.config()?.rowHeight ?? NGE_TABLE_DEFAULTS.rowHeight);

  /**
   * How much taller an **expanded** row is than a plain one — the `row-detail`
   * band's height (ARCH-298).
   *
   * ⚠️ **Declared, never measured, and that is the decision this feature turns
   * on.** Virtualization positions a row it has not rendered, so every row's size
   * has to be computable in advance; measuring the band would make row height
   * variable, which is a different and far larger feature (and one ARCH-289's frozen
   * scroll baseline would have to be re-read against). A number a consumer keeps
   * true is the price of a band that composes with a windowed table at all.
   */
  const rowDetailHeight = computed(
    () => store.config()?.rowDetailHeight ?? NGE_TABLE_DEFAULTS.rowDetailHeight
  );

  /**
   * The expansion slice on its own, lifted out of `tableState` deliberately.
   *
   * `tableState` gets a new object on **every** state write — a sort, a resize, a
   * pin — so anything depending on the whole of it re-runs constantly. The slice's
   * own reference moves only when expansion does, which is what lets the re-measure
   * effect below stay quiet through the rest of the table's life.
   */
  const expandedRows = computed(() => store.tableState().expanded);

  /**
   * How far down the scrollable content the rows begin.
   *
   * The header shares the body's scroll viewport (ARCH-243 chose one scroller so
   * header lanes stay aligned with body lanes structurally), and it is sticky
   * *in flow* — so it occupies real space above the first row. The virtualizer
   * compares its window against the viewport's `scrollTop`, and without being
   * told about that space its window sits a header's height too low: rows are
   * dropped from the top of what is visible and a blank strip appears under the
   * header mid-scroll.
   *
   * Multiplied by the number of header rows rather than assuming one, so a table
   * with grouped columns — which stacks a header row per grouping level — stays
   * correct.
   */
  const scrollMargin = computed(
    () =>
      store.headerRows().length * (store.config()?.headerHeight ?? NGE_TABLE_DEFAULTS.headerHeight)
  );

  /**
   * Whether alternate rows take the zebra surface. Off unless asked.
   *
   * Gates only the class binding: parity itself is computed for every rendered
   * row regardless, because it is one modulo on an index the window already
   * carries and branching on the flag would buy nothing.
   */
  const stripingEnabled = computed(() => store.config()?.enableStriping ?? false);

  /** Whether the consumer asked for windowing. Off unless asked. */
  const virtualizationEnabled = computed(() => store.config()?.enableVirtualization ?? false);

  /**
   * The row virtualizer, windowing over the **processed** row model.
   *
   * Reading `getRowModel()` — the post-sort, post-filter rows — rather than
   * `config.data` is what makes virtualization compose with every feature
   * downstream of it for free: a sort reorders the rows the window is cut from,
   * so the window follows without knowing sorting exists. That is the
   * data-pipeline extension axis being honoured rather than bypassed.
   *
   * **`enabled` is a real capability gate, not a hint.** `virtual-core` reads it
   * in `_willUpdate` (`getScrollElement()` is skipped outright when it is false)
   * and again in `getMeasurements`, which returns `[]` and clears its caches. So
   * with virtualization off the instance exists but installs no `ResizeObserver`,
   * attaches no scroll listener, and measures nothing — the flag gates the
   * *effect*, which is the check this epic has had to make by hand for pinning.
   * Here the engine gets it right on its own.
   *
   * Never `transform: translateY`. The rows this produces are positioned with
   * `top`, because a transform creates a stacking context and a stacking context
   * breaks the sticky pinned lanes. See {@link toNgeTableVirtualRows}.
   */
  const rowVirtualizer = injectVirtualizer<HTMLElement, HTMLElement>(() => {
    const rows = store.table.getRowModel().rows;

    // Read here rather than inside `estimateSize`, because THIS closure is the
    // reactive context — the engine calls `estimateSize` lazily, outside any
    // computation Angular is tracking, so a signal read in there would be a
    // dependency nothing re-runs on.
    const height = rowHeight();
    const detailHeight = rowDetailHeight();
    const expanded = expandedRows();

    return {
      count: rows.length,
      enabled: virtualizationEnabled(),
      // Still never *measured* — the rows being positioned are precisely the ones
      // not yet rendered — but no longer uniform: an expanded row is exactly one
      // detail band taller, so the rows beneath it move down by that much instead
      // of being overlapped by it (ARCH-298). Computable-without-rendering is the
      // property virtualization needs; identical-for-every-row was only ever the
      // simplest way to have it.
      //
      // ⚠️ Changing what this RETURNS does not on its own change what the
      // virtualizer reads — see the re-measure effect below.
      estimateSize: index =>
        height + ngeRowDetailOffset(expanded, rows[index]?.id ?? '', detailHeight),
      // The row's own id, so the window keeps its identity across a sort rather
      // than re-keying every rendered row to a new position.
      getItemKey: index => rows[index]?.id ?? index,
      overscan: store.config()?.virtualOverscan ?? NGE_TABLE_DEFAULT_OVERSCAN,
      // `undefined` before the view exists — the adapter reads it as "nothing to
      // observe yet" and picks the element up on the render after it arrives.
      scrollElement: store.scrollElement() ?? undefined,
      scrollMargin: scrollMargin(),
    };
  }) as AngularVirtualizer<HTMLElement, HTMLElement>;

  /**
   * Make the virtualizer re-read the sizes above when what they answer changes.
   *
   * ⚠️ **`estimateSize` is not one of the options the measurement memo watches.**
   * `getMeasurements` memoises on `[getMeasurementOptions(), itemSizeCacheVersion]`
   * and `getMeasurementOptions` lists count, padding, `scrollMargin`, `getItemKey`,
   * `enabled`, lanes and gap — not `estimateSize` (`virtual-core`
   * `index.js:538,571`). So nothing about a size changing invalidates anything on
   * its own. `measure()` clears `itemSizeCache` and bumps that version (`:1108`),
   * which is the supported way to say "the sizes changed".
   *
   * ⚠️ **It is belt-and-braces TODAY, and that is stated rather than discovered.**
   * `getItemKey` above is a fresh arrow on every options rebuild, and the options
   * rebuild whenever the expansion slice moves — so its identity already
   * invalidates the memo, and deleting this effect breaks nothing. Both halves were
   * checked by disabling each in turn: neither alone fails, and the pair fails
   * together. The reason to keep the explicit one is that the incidental one is a
   * performance bug waiting to be fixed — memoising `getItemKey` is an obvious
   * optimisation on ten thousand rows, and whoever makes it would otherwise
   * silently take expanded rows back to overlapping their neighbours.
   *
   * Row height is watched for the same reason, and covers a case that predates
   * expansion: a config changing `rowHeight` alone rests on the identical accident.
   *
   * Skipped while virtualization is off — nothing is measured or positioned there,
   * so there is nothing to invalidate. The reads still happen first, so switching
   * the flag on afterwards picks up whatever moved in the meantime.
   */
  effect(() => {
    // ⚠️ The three reads ARE the subscription. This effect exists to notice when
    // any of them moves, and it uses none of the values — deleting a line here
    // silently stops the virtualizer hearing about that one.
    rowHeight();
    rowDetailHeight();
    expandedRows();

    if (virtualizationEnabled()) {
      rowVirtualizer.measure();
    }
  });

  /**
   * The rows the template actually renders — the window when virtualization is
   * on, every row when it is off.
   *
   * One computed with one shape either way, which is what keeps the row loop in
   * the template free of a branch: `top` is bound unconditionally and Angular
   * drops the property when it is `null`.
   */
  const renderedRows = computed<NgeTableRenderedRow[]>(() => {
    const rows = store.table.getRowModel().rows;
    const headerRowCount = store.headerRows().length;

    return virtualizationEnabled()
      ? toNgeTableVirtualRows(
          rows,
          headerRowCount,
          rowVirtualizer.getVirtualItems(),
          scrollMargin()
        )
      : toNgeTableRenderedRows(rows, headerRowCount);
  });

  /**
   * Whether the scroll has been quiet long enough for a cell to render expensive
   * content — the signal every `NgeCellContext.isSettled` closes over (ARCH-291).
   *
   * **The engine already answers this, so nothing here listens to a scroll.**
   * `virtual-core` sets `isScrolling` on the first scroll event and clears it
   * after `isScrollingResetDelay` of quiet (150ms by default, and
   * `useScrollendEvent` is off so the debounce — not a browser-dependent
   * `scrollend` — is the path taken). That *is* "quiet for N ms" with exactly one
   * knob, so adding a second scroll listener beside the engine's would be
   * inventing here what TanStack already provides — the same reasoning that makes
   * behaviour extensibility a `TableFeature` rather than a switch of our own.
   *
   * ⚠️ **Deliberately not surfaced on `NgeTableConfig`.** The delay is the one
   * tuning constant this contract is allowed, and the story that added it settled
   * that no velocity or timing knob enters the public config: a consumer setting
   * it badly is a worse failure than the default being imperfect.
   *
   * ⚠️ **`true` forever when virtualization is off, and that is correct rather
   * than degraded.** `enabled: false` makes `virtual-core` skip its scroll
   * listener outright, so `isScrolling` never moves — and a table rendering every
   * row builds each cell once and never recycles it, so there is no per-slide cost
   * to defer. A shell there would cost a frame and save nothing.
   */
  const scrollSettled = computed(() => !rowVirtualizer.isScrolling());

  /**
   * How tall the body has to be for the scrollbar to describe the whole dataset,
   * or `null` when the rows size it themselves.
   *
   * The virtualizer's own total excludes {@link scrollMargin}, so this is the
   * height of the rows alone — which is exactly what the body element, sitting
   * below the header, needs to be.
   */
  const virtualTotalHeight = computed<null | number>(() => {
    // No rows means no spacer: the empty band has its own height, and pinning
    // the body to a total size of zero would collapse the box it sits in.
    if (!virtualizationEnabled() || store.table.getRowModel().rows.length === 0) {
      return null;
    }

    return rowVirtualizer.getTotalSize();
  });

  return signalStoreFeature(
    withProps(() => ({ rowVirtualizer })),

    withComputed(() => ({
      renderedRows,
      rowDetailHeight,
      rowHeight,
      scrollMargin,
      scrollSettled,
      stripingEnabled,
      virtualizationEnabled,
      virtualTotalHeight,
    }))
  );
}
