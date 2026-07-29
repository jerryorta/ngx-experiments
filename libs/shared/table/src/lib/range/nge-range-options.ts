import { InjectionToken } from '@angular/core';

/** Per-table options for {@link provideNgeCellRange}. */
export interface NgeCellRangeOptions {
  /**
   * How far one auto-scroll frame moves the viewport, in pixels. Defaults to `12`.
   *
   * The ceiling rather than the constant: the speed ramps from nothing at the edge
   * of the threshold to this at the viewport's boundary and beyond, so nudging a
   * drag towards the edge creeps and shoving it past the edge runs. A flat speed
   * makes a long selection either unbearable or uncontrollable — there is no single
   * value that is both.
   */
  autoScrollSpeed?: number;
  /**
   * How close to a viewport edge a drag starts auto-scrolling, in pixels. Defaults
   * to `48`.
   *
   * Wide enough that a user does not have to hit the boundary exactly, narrow
   * enough that the middle of a short table is not one continuous scroll zone.
   */
  autoScrollThreshold?: number;
  /**
   * Clear this table's selection when `Escape` is pressed. Defaults to `true`.
   *
   * ⚠️ **The listener is on the document, so with two range-enabled tables on one
   * page a single `Escape` clears both.** That is the right answer for the common
   * case — one table, where `Escape` means "give up what I selected" — and the wrong
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
  /**
   * Take cmd/ctrl + `A` as "select every cell". Defaults to `true`.
   *
   * ⚠️ Unlike `Escape`, this shortcut **cannot** be polite by being a no-op: taking
   * the key means calling `preventDefault()` on it, or the browser also selects the
   * whole document's text underneath. It is therefore scoped by *engagement* rather
   * than by focus — the key is only taken once the user has started a gesture in
   * this table, which is the same rule a spreadsheet applies by requiring the grid
   * to be active. A page whose table nobody has clicked into keeps its own cmd-A.
   *
   * Set `false` where an application would rather own the shortcut outright.
   */
  selectAllOnModifierA?: boolean;
  /**
   * Take cmd/ctrl + `Space` on a focused header as "select this column" — the
   * spreadsheet standard. Defaults to `true`.
   *
   * The keyboard route to what the header strip does with a pointer, and the only
   * one of the three shortcuts that is genuinely **scoped by focus**: a header cell
   * is a tab stop (it carries the sort and resize keys), so the key is only taken
   * when the event's target is inside a header this addon has stamped. `shift`
   * extends the span of columns instead of replacing it.
   *
   * ⚠️ It cannot collide with the header's own `Enter` / `Space` sort toggle:
   * Angular's `keydown.space` binding matches only when **no** modifiers are held
   * (`KeyEventsPlugin.matchEventFullKeyCode` appends every pressed modifier before
   * comparing), so a cmd/ctrl-modified press never reaches it. That is structural,
   * not luck — but a spec pins it, because it is the kind of thing a template edit
   * could quietly undo.
   */
  selectColumnOnModifierSpace?: boolean;
}

/**
 * What every option falls back to.
 *
 * Named and exported so the token's factory and {@link provideNgeCellRange} read
 * the same four numbers — a default written twice is a default that eventually
 * disagrees with itself.
 */
export const NGE_RANGE_DEFAULT_OPTIONS: Required<NgeCellRangeOptions> = {
  autoScrollSpeed: 12,
  autoScrollThreshold: 48,
  clearOnEscape: true,
  selectAllOnModifierA: true,
  selectColumnOnModifierSpace: true,
};

/**
 * The resolved options one bridge reads.
 *
 * Its own module rather than living beside `provideNgeCellRange`, because the
 * bridge consumes it and the provider imports the bridge — putting it there would
 * close an import cycle.
 */
export const NGE_RANGE_OPTIONS = new InjectionToken<Required<NgeCellRangeOptions>>(
  'NGE_RANGE_OPTIONS',
  { factory: () => NGE_RANGE_DEFAULT_OPTIONS }
);
