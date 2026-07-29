import type { Cell, Row, Table } from '@tanstack/angular-table';

import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withMethods } from '@ngrx/signals';

import type { NgeTableContext } from '../../../slots';
import type { NgeTableHeaderRow, NgeTableLane, NgeTableLaneWidths } from '../nge-table-lane';
import type { NgeCellTemplate, NgeTableSlotRegistry } from '../nge-table-slot-registry';
import type { NgeTableBaseStore } from '../nge-table-store.types';

import { toNgeTableLanes } from '../nge-table-lane';
import {
  toNgeCellTemplateMap,
  toNgeEditorTemplateMap,
  toNgeTableContext,
  toNgeTableSlotRegistry,
} from '../nge-table-slot-registry';

interface NgeTableLanesDeps extends NgeTableBaseStore {
  table: Table<unknown>;
}

/**
 * The column-shaped half of what the template renders: the header and footer split
 * into lanes, the lane widths, the a11y counts, and the two template registries a
 * cell is resolved through.
 *
 * Everything here derives from the engine's columns, so it is the first feature
 * after the engine and the one most other features read.
 */
export function withNgeTableLanes(store: NgeTableLanesDeps) {
  return signalStoreFeature(
    withComputed(() => ({
      /**
       * How many columns the grid claims to have, for `aria-colcount`.
       *
       * Worth declaring even while every column is in the DOM, because pinning
       * splits a row across three wrappers and virtualization (ARCH-245) will stop
       * rendering all the rows — at which point an assistive technology counting
       * what it can see would be counting the wrong thing.
       */
      ariaColumnCount: computed(() => store.table.getVisibleLeafColumns().length),

      /** Header rows plus body rows, for `aria-rowcount` — header rows count. */
      ariaRowCount: computed(
        () => store.table.getHeaderGroups().length + store.table.getRowModel().rows.length
      ),

      /**
       * The projected `[ngeCell]` templates, indexed by the column each names
       * (ARCH-246).
       *
       * Recomputed only when the projected set changes, which is what keeps each
       * template's `content` thunk stable — `*flexRender` clears its view container
       * and rebuilds the embedded view whenever that input changes identity, so a
       * thunk allocated per change-detection pass would recreate every custom cell
       * on every cycle.
       */
      cellTemplateById: computed<ReadonlyMap<string, NgeCellTemplate>>(() =>
        toNgeCellTemplateMap(store.cellTemplates())
      ),

      /**
       * Column id → its 1-based position in the grid, counted across the lanes in
       * visual order.
       *
       * Pinning is exactly the feature that makes DOM order diverge from the order
       * the columns were defined in: a column pinned right moves to the end of the
       * row whatever its index in `columns`. `aria-colindex` is what stops that
       * being a lie to a screen reader, and deriving it once here keeps the template
       * free of running totals.
       */
      columnIndexById: computed<Record<string, number>>(() => {
        const positions: Record<string, number> = {};

        [
          ...store.table.getLeftVisibleLeafColumns(),
          ...store.table.getCenterVisibleLeafColumns(),
          ...store.table.getRightVisibleLeafColumns(),
        ].forEach((column, index) => {
          positions[column.id] = index + 1;
        });

        return positions;
      }),

      /**
       * The editor components the columns named, indexed by column id (ARCH-293).
       *
       * A `computed` for exactly the reason {@link cellTemplateById} is: the thunks
       * inside have to keep their identity between change-detection passes, or every
       * editor cell is torn down and rebuilt on each one. `getAllLeafColumns()` is
       * memoised by the engine, so this recomputes only when the columns themselves
       * move — which already rebuilds every cell anyway.
       */
      editorTemplateById: computed<ReadonlyMap<string, NgeCellTemplate>>(() =>
        toNgeEditorTemplateMap(store.table.getAllLeafColumns())
      ),

      /**
       * The footer, split into lanes exactly as {@link headerRows} splits the header
       * (ARCH-246).
       *
       * The engine gives footers the same three lane-scoped accessors it gives
       * headers (`core/headers.ts` → `getLeft/Center/RightFooterGroups`), so the
       * `footer-cell` slot reuses `toNgeTableLanes` and inherits pinning for free.
       * That the substrate generalized without a change is the point of ARCH-243
       * having iterated lanes rather than branching on them.
       */
      footerRows: computed<NgeTableHeaderRow[]>(() => {
        const left = store.table.getLeftFooterGroups();
        const center = store.table.getCenterFooterGroups();
        const right = store.table.getRightFooterGroups();

        return store.table.getFooterGroups().map((group, depth) => ({
          id: group.id,
          lanes: toNgeTableLanes(
            left[depth]?.headers ?? [],
            center[depth]?.headers ?? [],
            right[depth]?.headers ?? []
          ),
        }));
      }),

      /**
       * The header, split into one entry per grouping level and each of those into
       * lanes.
       *
       * Depth comes from `getHeaderGroups()` rather than from any single lane
       * because a lane can legitimately be empty. It is safe to key off: the engine
       * derives header depth from *all* columns (`core/headers.ts` →
       * `findMaxDepth(allColumns)`), so the three lanes always report the same
       * number of groups and grouped columns line up across them without help.
       */
      headerRows: computed<NgeTableHeaderRow[]>(() => {
        const left = store.table.getLeftHeaderGroups();
        const center = store.table.getCenterHeaderGroups();
        const right = store.table.getRightHeaderGroups();

        return store.table.getHeaderGroups().map((group, depth) => ({
          id: group.id,
          lanes: toNgeTableLanes(
            left[depth]?.headers ?? [],
            center[depth]?.headers ?? [],
            right[depth]?.headers ?? []
          ),
        }));
      }),

      /**
       * Lane widths, straight from the engine.
       *
       * `<nge-table>` writes these onto its host as `--nge-table-internal-*`
       * properties and the stylesheet sizes every lane and row from them — one write
       * per state change rather than an inline width on each of 3 × (rows + 1)
       * elements, which is the difference that matters once 10,000 rows are in play.
       */
      laneWidths: computed<NgeTableLaneWidths>(() => ({
        center: store.table.getCenterTotalSize(),
        left: store.table.getLeftTotalSize(),
        right: store.table.getRightTotalSize(),
        total: store.table.getTotalSize(),
      })),

      /**
       * The column being dragged, or `null`. Drives the handle's active styling and
       * the host's `--resizing` class.
       *
       * Read from our own drag state rather than the engine's `getIsResizing()`,
       * because this library owns the gesture: `columnSizingInfo` is only populated
       * by the engine's own `getResizeHandler`, which is deliberately unused here.
       */
      resizingColumnId: computed<null | string>(() => store.resize()?.columnId ?? null),

      /**
       * The projected `[ngeTableSlot]` templates, indexed by name and by column
       * (ARCH-246).
       *
       * One map for every slot rather than one query per slot is what makes adding a
       * name cost a name: nothing here mentions `empty` or `toolbar`, so a ninth
       * entry in `NGE_TABLE_SLOT_NAMES` reaches its anchor without this computed —
       * or the directive, or the resolver in the slots feature — changing a line.
       */
      slotRegistry: computed<NgeTableSlotRegistry>(() =>
        toNgeTableSlotRegistry(store.slotTemplates())
      ),

      /**
       * The outlet context for the table-level slots — `empty`, `loading`, `toolbar`.
       *
       * A computed rather than a method because it depends on nothing but the table,
       * so all three bands share one object and it is rebuilt only when the counts it
       * reports actually move.
       */
      tableSlotContext: computed<{ $implicit: NgeTableContext }>(() => ({
        $implicit: toNgeTableContext(
          store.table.getVisibleLeafColumns().length,
          store.table.getRowModel().rows.length
        ),
      })),
    })),

    withMethods(() => ({
      /**
       * Split one row's cells into lanes.
       *
       * A method rather than a computed because the rows it applies to are whatever
       * the current row model holds; the template calls it inside its row loop and
       * the underlying cell lists are memoised by the engine, so the only thing
       * allocated per call is the three-element lane array.
       */
      laneCellsFor(row: Row<unknown>): NgeTableLane<Cell<unknown, unknown>>[] {
        return toNgeTableLanes(
          row.getLeftVisibleCells(),
          row.getCenterVisibleCells(),
          row.getRightVisibleCells()
        );
      },
    }))
  );
}
