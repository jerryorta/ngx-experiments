/**
 * Every position, other than a cell, where a consumer can plug an Angular
 * template into the table.
 *
 * The whole list ships with the seam even where nothing fills a name yet, which
 * is the point of shipping the seam in Wave 0 at all: a slot the renderer has no
 * anchor for is a slot the renderer has to be restructured to gain, and
 * restructuring the renderer is precisely the rewrite this epic exists to avoid.
 * Adding a name later is this array, an entry in `NgeTableSlotContexts`, and one
 * `ngTemplateOutlet` — never a change to the directive, the registry, or either
 * resolver.
 *
 * Cells are deliberately absent. They are the one position keyed by *column*
 * rather than by name, they are the common case by a wide margin, and they go
 * through `flexRender` rather than an outlet — so they get their own directive,
 * `NgeCellDirective`, and a `[ngeCell]` reads better at a use site than
 * `[ngeTableSlot]="'cell'" [ngeTableSlotColumn]="'amount'"` would.
 */
export const NGE_TABLE_SLOT_NAMES = [
  'cell-overlay',
  'empty',
  'expand-cell',
  'expand-header',
  'footer',
  'footer-cell',
  'header-cell',
  'header-overlay',
  'loading',
  'row-detail',
  'selection-cell',
  'selection-header',
  'toolbar',
] as const;

/** One of {@link NGE_TABLE_SLOT_NAMES}. */
export type NgeTableSlotName = (typeof NGE_TABLE_SLOT_NAMES)[number];

/**
 * The slots addressed per column rather than per table.
 *
 * A template registered for one of these without a `ngeTableSlotColumn` applies
 * to every column; one *with* it applies to that column alone and wins over the
 * shared template. Every other name ignores the column entirely — asking for a
 * `toolbar` "for the amount column" is a question with no answer, so the registry
 * does not pretend to have one.
 */
export const NGE_TABLE_COLUMN_SLOT_NAMES = [
  'cell-overlay',
  'footer-cell',
  'header-cell',
  'header-overlay',
] as const satisfies readonly NgeTableSlotName[];

/** One of {@link NGE_TABLE_COLUMN_SLOT_NAMES}. */
export type NgeTableColumnSlotName = (typeof NGE_TABLE_COLUMN_SLOT_NAMES)[number];
