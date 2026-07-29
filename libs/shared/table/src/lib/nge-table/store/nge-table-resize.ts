import type { Column, Header } from '@tanstack/angular-table';

import { NGE_TABLE_DEFAULTS } from '../../nge-table-defaults';

/** The widths one column may be dragged between. */
export interface NgeTableColumnBounds {
  max: number;
  min: number;
}

/**
 * Everything a resize drag needs, captured once at `pointerdown`.
 *
 * Snapshotting rather than re-reading per move is what makes the gesture
 * self-consistent: every intermediate width is derived from the pointer's total
 * travel since the grab, so a re-render landing mid-drag — or a dropped move
 * event — cannot accumulate error the way an incremental `size += delta` would.
 */
export interface NgeTableResizeStart {
  /** Bounds per leaf column. Fixed for the drag, so they are resolved once. */
  boundsById: Record<string, NgeTableColumnBounds>;
  /** The column whose handle was grabbed — a group header resizes its leaves. */
  columnId: string;
  /** Leaf column id → width at `pointerdown`. */
  leafSizes: [string, number][];
  /** The pointer that owns this drag; every move and release is matched against it. */
  pointerId: number;
  /** Total width of the grabbed header at `pointerdown`. */
  startSize: number;
  /** Pointer x at `pointerdown`. */
  startX: number;
}

/**
 * The width bounds a column may be dragged between.
 *
 * Read off `columnDef` rather than the config because the engine has already
 * merged the two: a column def is built as `{ ...defaultColumn, ...columnDef }`
 * (`table-core/src/core/column.ts:71-74`), and `buildTableOptions` seeds
 * `defaultColumn` from `columnMinWidth` / `columnMaxWidth`. So a per-column
 * override wins and the config's bounds apply everywhere else, with no
 * precedence logic of our own to keep in step.
 */
export function columnBoundsOf(column: Column<unknown, unknown>): NgeTableColumnBounds {
  return {
    max: column.columnDef.maxSize ?? NGE_TABLE_DEFAULTS.columnMaxWidth,
    min: column.columnDef.minSize ?? NGE_TABLE_DEFAULTS.columnMinWidth,
  };
}

/**
 * Hold a width inside its column's bounds.
 *
 * **The clamp belongs on the write, not only on the read.** The engine clamps
 * inside `column.getSize()` (`table-core/src/features/ColumnSizing.ts:262-272`)
 * and its own drag math clamps to `>= 0` alone, so an engine-driven resize
 * renders correctly while leaving out-of-range numbers sitting in
 * `state.columnSizing` — which is precisely the object a consumer persists and
 * restores. Clamping here keeps the emitted state as honest as the render.
 */
export function clampColumnWidth(width: number, bounds: NgeTableColumnBounds | undefined): number {
  if (!bounds) {
    return Math.max(width, 0);
  }

  return Math.min(Math.max(width, bounds.min), bounds.max);
}

/**
 * Snapshot a header's geometry so {@link resizeColumnSizing} can run from it.
 *
 * `getLeafHeaders()` is the engine's own choice for this — it returns the header
 * itself for a leaf and its descendants for a group, so one code path covers
 * both and dragging a grouped header widens its children rather than doing
 * nothing.
 */
export function captureResizeStart(
  header: Header<unknown, unknown>,
  pointerId: number,
  clientX: number
): NgeTableResizeStart {
  const boundsById: Record<string, NgeTableColumnBounds> = {};
  const leafSizes: [string, number][] = [];

  for (const leaf of header.getLeafHeaders()) {
    boundsById[leaf.column.id] = columnBoundsOf(leaf.column);
    leafSizes.push([leaf.column.id, leaf.column.getSize()]);
  }

  return {
    boundsById,
    columnId: header.column.id,
    leafSizes,
    pointerId,
    startSize: header.getSize(),
    startX: clientX,
  };
}

/**
 * The widths a drag has reached, given where the pointer is now.
 *
 * Proportional rather than additive, matching the engine's own formula: the
 * pointer's travel is expressed as a fraction of the grabbed header's starting
 * width and applied to each leaf. For the ordinary single-column drag the two
 * are identical; for a grouped header the proportional form is what keeps the
 * children's relative widths intact instead of dumping the whole delta on one of
 * them. The `-0.999999` floor is the engine's guard against a drag past the left
 * edge inverting a column.
 *
 * Whole pixels, because a column width is a number a user reads back out of a
 * saved view — sub-pixel precision buys nothing here and makes persisted state
 * noisy.
 */
export function resizeColumnSizing(
  start: NgeTableResizeStart,
  clientX: number
): Record<string, number> {
  // A zero-width header would make the fraction meaningless (and infinite).
  // Nothing to scale from, so the drag is a no-op rather than a crash.
  const deltaPercentage =
    start.startSize > 0 ? Math.max((clientX - start.startX) / start.startSize, -0.999999) : 0;

  const sizing: Record<string, number> = {};

  for (const [columnId, startWidth] of start.leafSizes) {
    sizing[columnId] = clampColumnWidth(
      Math.round(startWidth + startWidth * deltaPercentage),
      start.boundsById[columnId]
    );
  }

  return sizing;
}
