/**
 * One choice in a `<nge-cell-select>` panel.
 *
 * ⚠️ **Primitive values only, and the restriction is what keeps the control
 * cheap.** A select whose options carried arbitrary objects would need an
 * identity function, a display function, and a comparator before it could render
 * a single row — which is most of what makes a design-system select expensive to
 * instantiate. Here `value` is what {@link NgeCellContext.commitEdit} proposes
 * and `label` is what the user reads, and that is the whole contract.
 *
 * A consumer needing grouped options, per-option templates or async loading
 * writes a `[ngeCell]` template instead; that seam exists precisely so this
 * component does not have to grow into one.
 */
export interface NgeCellSelectOption {
  /**
   * Renders the option unselectable while still showing it.
   *
   * Present because the alternative — filtering the value out of `options`
   * altogether — also removes the label, so a cell already holding that value
   * would render blank and read as missing data rather than as a choice no
   * longer on offer.
   */
  readonly disabled?: boolean;
  /** What the user reads, in the panel and on the closed trigger. */
  readonly label: string;
  /** What `commitEdit` proposes when this option is chosen. */
  readonly value: boolean | null | number | string;
}
