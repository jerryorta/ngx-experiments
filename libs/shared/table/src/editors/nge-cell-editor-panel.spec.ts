import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { NGE_EDITOR_PANEL_TOKENS } from './nge-cell-editor-panel';

/** This file's directory — `src/editors/`, where both panel editors live. */
const EDITORS = __dirname;

/**
 * The editors whose control renders in a body-level CDK overlay, and the class their
 * panel rules are written against.
 *
 * A field editor is deliberately absent: it renders inside the cell, where the
 * table's own token scoping still reaches it, so it needs no forwarding at all.
 */
const PANEL_EDITORS = [
  { panelClass: '.nge-cell-select__panel', stylesheet: 'nge-cell-select.component.scss' },
  { panelClass: '.nge-cell-textarea__panel', stylesheet: 'nge-cell-textarea.component.scss' },
] as const;

/**
 * Every `--nge-*` custom property a stylesheet READS, in source order.
 *
 * Matches the `var(` form only, so a token the file *declares* is not mistaken for one
 * it consumes — the distinction that makes this a list of what must be forwarded
 * rather than a list of what exists.
 */
function tokensReadBy(stylesheet: string): Set<string> {
  const source = readFileSync(join(EDITORS, stylesheet), 'utf8');

  return new Set([...source.matchAll(/var\(\s*(--nge-[a-z0-9-]+)/g)].map(match => match[1]));
}

/**
 * ⚠️ **"A token the panel reads must be forwarded" is a rule that fails SILENTLY, so
 * it is asserted rather than remembered.**
 *
 * A body-level panel inherits `:root` defaults — the overlay container is a child of
 * `<body>` — and nothing scoped tighter: not a theme class on a wrapper, not
 * `<nge-table>`'s inline host geometry. So a token left out of
 * {@link NGE_EDITOR_PANEL_TOKENS} works perfectly in the no-theme case, which is
 * exactly the case a developer checks first, and is simply absent under every theme.
 * Nothing about that announces itself: the panel renders, the specs pass, and one
 * colour is quietly wrong for whoever loads a theme.
 *
 * ARCH-294 wrote the rule down and ARCH-296 gave it one shared list to be true of.
 * This is what makes it structural — adding a `var(--nge-…)` to either panel's rules
 * without adding it to the array fails here, naming the token and the file.
 */
describe('editor panel tokens', () => {
  it.each(PANEL_EDITORS)(
    'forwards every token $stylesheet reads for its panel',
    ({ panelClass, stylesheet }) => {
      const forwarded = new Set<string>(NGE_EDITOR_PANEL_TOKENS);
      const missing = [...tokensReadBy(stylesheet)].filter(token => !forwarded.has(token)).sort();

      // The class name rides along in the failure so the message says WHERE to look,
      // not only what is absent.
      expect({ missing, panelClass }).toEqual({ missing: [], panelClass });
    }
  );

  // ⚠️ The falsifiability guard this library writes by habit. An extractor whose regex
  // quietly matched nothing would pass the assertions above against every possible
  // tree — the shape of a green suite that tests air.
  it('reads the tokens the stylesheets genuinely use', () => {
    for (const { stylesheet } of PANEL_EDITORS) {
      const tokens = tokensReadBy(stylesheet);

      expect(tokens.size).toBeGreaterThan(5);
      expect(tokens).toContain('--nge-table-editor-panel-surface');
    }
  });

  // And that it distinguishes a READ from a declaration, which is the whole reason the
  // pattern anchors on `var(`. The token partial declares dozens of these; none of them
  // is a forwarding obligation.
  it('ignores a token a stylesheet declares rather than reads', () => {
    const declaredOnly = '--nge-table-editor-does-not-exist';

    expect([...tokensReadBy('nge-cell-textarea.component.scss')]).not.toContain(declaredOnly);
  });

  // Sorted, because the array is edited by hand across two editors and a merge that
  // appends to the wrong place is easier to spot than to debug.
  it('keeps the forwarded list sorted', () => {
    expect([...NGE_EDITOR_PANEL_TOKENS]).toEqual([...NGE_EDITOR_PANEL_TOKENS].sort());
  });
});
