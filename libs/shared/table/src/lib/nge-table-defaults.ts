/**
 * Geometry the table must agree on in **both** SCSS and TypeScript.
 *
 * Most of the `--nge-table-*` contract is pure presentation and lives only in
 * `styles/_table-tokens.scss`. These few values cannot: virtualization computes
 * scroll offsets arithmetically from the row height, and the column-resize drag
 * clamps against the width bounds — neither can measure a DOM node, because the
 * rows being positioned are precisely the ones not yet rendered.
 *
 * Duplicating the numbers here is therefore deliberate, and the paired spec
 * asserts them so the two sources cannot drift silently.
 */
export interface NgeTableDefaults {
  /** Width applied to a column whose definition supplies none. */
  readonly columnDefaultWidth: number;
  /** Widest a column may be dragged. */
  readonly columnMaxWidth: number;
  /** Narrowest a column may be dragged. */
  readonly columnMinWidth: number;
  /**
   * Width of the injected expansion column (ARCH-298).
   *
   * A number for the same reason {@link NgeTableDefaults.selectionColumnWidth} is
   * one: the column is built in TypeScript and its `size` is what the engine clamps
   * `getSize()` against.
   */
  readonly expansionColumnWidth: number;
  /** Height of the header band, in pixels. Offsets the first row's sticky top. */
  readonly headerHeight: number;
  /**
   * Height of an expanded row's `row-detail` band, in pixels (ARCH-298).
   *
   * Presentation until virtualization is on, arithmetic afterwards — an expanded
   * row is positioned and sized as `rowHeight + rowDetailHeight`, so this is the
   * number that keeps the row beneath it from being overlapped. Cannot be measured
   * for the same reason {@link NgeTableDefaults.rowHeight} cannot: the rows being
   * positioned are precisely the ones not yet rendered.
   */
  readonly rowDetailHeight: number;
  /** Height of a single data row, in pixels. Drives virtual scroll offsets. */
  readonly rowHeight: number;
  /**
   * Width of the injected selection column (ARCH-268).
   *
   * Needed as a number because the column is built in TypeScript and its `size`
   * is what the engine clamps `getSize()` against — the token alone would style a
   * lane the engine still measured at the default column width.
   */
  readonly selectionColumnWidth: number;
}

/**
 * The shipped defaults. Consumers override per-table through `NgeTableConfig`
 * (ARCH-242) rather than mutating this object — it is frozen by `as const` so an
 * accidental write is a compile error rather than a cross-table side effect.
 */
export const NGE_TABLE_DEFAULTS: NgeTableDefaults = {
  columnDefaultWidth: 160,
  columnMaxWidth: 800,
  columnMinWidth: 60,
  expansionColumnWidth: 44,
  headerHeight: 44,
  rowDetailHeight: 120,
  rowHeight: 40,
  selectionColumnWidth: 44,
} as const;
