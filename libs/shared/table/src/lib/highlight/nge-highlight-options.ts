import { InjectionToken } from '@angular/core';

/** Per-table options for {@link provideNgeCellHighlighting}. */
export interface NgeCellHighlightingOptions {
  /**
   * Clear this table's highlighting when `Escape` is pressed. Defaults to `true`.
   *
   * ⚠️ **The listener is on the document, so with two highlight-enabled tables on one
   * page a single `Escape` clears both.** That is the right answer for the common
   * case — one table, where `Escape` means "give up what I marked" — and the wrong
   * one for a dashboard, where a user thinks in terms of the table they were working
   * in. Scoping it properly is not currently possible: nothing in the table body is
   * focusable (keyboard grid navigation is a later story), so there is no reliable
   * signal for *which* table the key was meant for, and a document listener is the
   * only one that fires at all.
   *
   * Set `false` on every table but the one that should own the key — or on all of
   * them, if the host would rather wire its own handler.
   */
  clearOnEscape?: boolean;
}

/**
 * The resolved options one bridge reads.
 *
 * Its own module rather than living beside `provideNgeCellHighlighting`, because
 * the bridge consumes it and the provider imports the bridge — putting it there
 * would close an import cycle.
 */
export const NGE_HIGHLIGHT_OPTIONS = new InjectionToken<Required<NgeCellHighlightingOptions>>(
  'NGE_HIGHLIGHT_OPTIONS',
  { factory: () => ({ clearOnEscape: true }) }
);
