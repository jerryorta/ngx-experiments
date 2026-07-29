/**
 * Every `role` this library treats as "the user is operating a control here".
 *
 * A cell is an arbitrary Angular render target, so the controls a table has to
 * step aside for are not only the native tags. A div-based slider, select or
 * toggle carrying the matching `role` is what a design-library control actually
 * looks like — `cg-select`, `gy-checkbox`, and the table's own editors all render
 * as composed elements rather than as an `<input>`.
 *
 * ⚠️ **Roles rather than component names, and that is load-bearing.** Naming our
 * own components in the guard would put a central switch in front of a seam — the
 * exact failure the extensibility gate exists to surface — and would leave every
 * consumer's own control unguarded. A role is something any control can declare,
 * including one written after this list.
 *
 * The table's own structural roles (`grid`, `row`, `gridcell`, `columnheader`)
 * are deliberately absent: they describe the substrate, not a control, and
 * matching one would make every cell in the table "interactive".
 */
const INTERACTIVE_ROLES = [
  'button',
  'checkbox',
  'combobox',
  'link',
  'listbox',
  'menu',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'option',
  'radio',
  'radiogroup',
  'searchbox',
  'slider',
  'spinbutton',
  'switch',
  'tab',
  'textbox',
  'treeitem',
] as const;

/**
 * Opt in a control this list cannot recognise.
 *
 * The escape hatch for something genuinely interactive that carries no useful
 * `role` — a canvas a user drags on, a third-party widget that manages its own
 * accessibility. One attribute, no library change.
 */
export const NGE_INTERACTIVE_ATTRIBUTE = 'data-nge-interactive';

/**
 * Where a table gesture must not begin, and which keys a table must not take.
 *
 * **One selector, two jobs, and they are the same question.** A `pointerdown`
 * inside a control belongs to that control rather than starting a cell-range drag
 * (`NgeRangeBridge.onPointerDown`), and a keystroke inside one belongs to it
 * rather than to a table shortcut (`NgeRangeBridge.takeKey`, and the row's
 * `Space`). Both are asking "is the user working inside a control right now", so
 * both read the same answer.
 *
 * ⚠️ **Core, not the range addon, even though the range addon is where it started
 * life.** Row selection's `Space` needs the same guard, and core must not import
 * from an addon — so the constant lives here and the addon reads it, rather than
 * core growing a second copy that drifts.
 *
 * ⚠️ **No bare `[tabindex]` clause, and the omission is deliberate.** It reads as
 * the obvious generalisation and it would disable cell ranges outright: the
 * table's own row is a tab stop whenever selection is on
 * (`nge-table.component.html`), the match is a `closest()` walk, so every cell in
 * every selectable table would resolve to an "interactive" ancestor. The failure
 * is total rather than subtle, which is the only reason it was caught. Add a
 * `role`, or `data-nge-interactive`.
 */
export const NGE_INTERACTIVE_SELECTOR = [
  'input',
  'button',
  'select',
  'textarea',
  '[contenteditable]',
  'a[href]',
  `[${NGE_INTERACTIVE_ATTRIBUTE}]`,
  ...INTERACTIVE_ROLES.map(role => `[role="${role}"]`),
].join(', ');

/**
 * Whether an event's target sits inside a control.
 *
 * `closest`, so a pointerdown on a slider's thumb, a keystroke in an input, or a
 * click on an icon inside a button all resolve to the control itself. Tolerates a
 * target that is not an `Element` — a `KeyboardEvent` fired at the document has
 * one, and `EventTarget` promises no `closest`.
 */
export function isNgeInteractiveElement(target: EventTarget | null): boolean {
  return (target as Element | null)?.closest?.(NGE_INTERACTIVE_SELECTOR) != null;
}
