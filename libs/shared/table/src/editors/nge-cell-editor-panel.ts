/**
 * The `--nge-table-editor-*` members a body-level panel reads.
 *
 * ⚠️ **One list for every panel editor, and that is the point rather than tidiness.**
 * ARCH-294's rule is that a token the panel reads must join this array in the same
 * change, or it works at `:root` and silently fails under a theme. Held once, the
 * rule is structural: a second editor cannot forget a list it does not own. Held per
 * component, it is a thing to remember, and the failure is invisible until someone
 * loads a theme.
 *
 * Members are the union of what the two panels read, not a per-editor subset. An
 * unresolved token is skipped rather than written empty (see
 * {@link applyNgeEditorPanelTokens}), so a name only one editor uses costs the other
 * a lookup and nothing else — far cheaper than two lists drifting apart.
 */
export const NGE_EDITOR_PANEL_TOKENS = [
  '--nge-table-editor-accent',
  '--nge-table-editor-border-color',
  '--nge-table-editor-border-color-focus',
  '--nge-table-editor-border-width',
  '--nge-table-editor-font-size',
  '--nge-table-editor-on-accent',
  '--nge-table-editor-on-surface',
  '--nge-table-editor-option-hover-surface',
  '--nge-table-editor-option-selected-surface',
  '--nge-table-editor-padding-x',
  '--nge-table-editor-panel-border-color',
  '--nge-table-editor-panel-max-height',
  '--nge-table-editor-panel-min-width',
  '--nge-table-editor-panel-padding',
  '--nge-table-editor-panel-shadow',
  '--nge-table-editor-panel-surface',
  '--nge-table-editor-radius',
  '--nge-table-editor-readonly-opacity',
  '--nge-table-editor-surface',
  '--nge-table-focus-ring-color',
  '--nge-table-focus-ring-width',
  '--nge-table-font-family',
  '--nge-table-row-height',
] as const;

/**
 * Copy the resolved `--nge-table-editor-*` values from a trigger onto an overlay pane.
 *
 * ⚠️ **The panel sits outside the table's DOM subtree, so it inherits none of the
 * table's own scoping.** Literal defaults declared at `:root` do reach it — the
 * overlay container is a child of `<body>`, itself a descendant of `:root` — which is
 * what makes a panel render correctly with no theme at all, and why that case proves
 * nothing. What does *not* reach it is anything scoped tighter: a theme class on a
 * wrapper, and `<nge-table>`'s own inline host geometry, which outranks a class
 * anyway.
 *
 * Resolving through `getComputedStyle` at the trigger's position answers all of those
 * at once, which copying a theme class cannot: it works for a token set by a `:root`
 * default, a theme class, a wrapper, or an inline style, and it needs no knowledge of
 * any domain's theme-class naming. One read per open — on a control the user has just
 * engaged — rather than anything per frame.
 *
 * @param source - The in-cell element the panel belongs to, where the table's own
 *   scoping still applies.
 * @param pane - The overlay pane to write the resolved values onto.
 */
export function applyNgeEditorPanelTokens(source: HTMLElement, pane: HTMLElement): void {
  const resolved = getComputedStyle(source);

  for (const token of NGE_EDITOR_PANEL_TOKENS) {
    const value = resolved.getPropertyValue(token).trim();

    // An unresolved token is left unset so the panel's own literal fallback in SCSS
    // applies. Writing an empty string would shadow it with nothing.
    if (value !== '') {
      pane.style.setProperty(token, value);
    }
  }
}
