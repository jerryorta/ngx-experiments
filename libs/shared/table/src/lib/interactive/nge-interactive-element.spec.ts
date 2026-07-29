import {
  NGE_INTERACTIVE_ATTRIBUTE,
  NGE_INTERACTIVE_SELECTOR,
  isNgeInteractiveElement,
} from './nge-interactive-element';

/** Build a detached tree from HTML and hand back the element carrying `id="target"`. */
function targetIn(html: string): Element {
  const host = document.createElement('div');

  host.innerHTML = html;

  const target = host.querySelector('#target');

  if (!target) {
    throw new Error('fixture has no #target');
  }

  return target;
}

describe('isNgeInteractiveElement', () => {
  it.each([
    ['a native input', '<input id="target" />'],
    ['a native button', '<button id="target">Go</button>'],
    ['a native select', '<select id="target"></select>'],
    ['a native textarea', '<textarea id="target"></textarea>'],
    ['a contenteditable', '<div contenteditable id="target"></div>'],
    ['a real link', '<a href="/x" id="target">x</a>'],
  ])('matches %s', (_label, html) => {
    expect(isNgeInteractiveElement(targetIn(html))).toBe(true);
  });

  // ⚠️ The gap ARCH-292 exists to close. A design-library control — and every one of
  // the table's own editors — is a composed element carrying a role, not an `<input>`,
  // so a native-tags-only guard let a drag on a slider's thumb start a cell-range
  // selection instead of moving the control.
  it.each(['slider', 'combobox', 'checkbox', 'switch', 'spinbutton', 'textbox', 'listbox'])(
    'matches a div-based control with role="%s"',
    role => {
      expect(isNgeInteractiveElement(targetIn(`<div role="${role}" id="target"></div>`))).toBe(
        true
      );
    }
  );

  it('matches a control that opts in by attribute', () => {
    expect(
      isNgeInteractiveElement(targetIn(`<div ${NGE_INTERACTIVE_ATTRIBUTE} id="target"></div>`))
    ).toBe(true);
  });

  it('matches from a descendant, so an icon inside a button counts as the button', () => {
    expect(isNgeInteractiveElement(targetIn('<button><span id="target">x</span></button>'))).toBe(
      true
    );
  });

  it.each([
    ['plain cell markup', '<div id="target">42</div>'],
    ['an anchor with no href', '<a id="target">x</a>'],
    ['an explicitly untabbable node', '<div tabindex="-1" id="target"></div>'],
  ])('does not match %s', (_label, html) => {
    expect(isNgeInteractiveElement(targetIn(html))).toBe(false);
  });

  // ⚠️ **The regression this guard would fail totally rather than subtly.** The
  // table's own row carries `tabindex="0"` whenever selection is on, and the match is
  // a `closest()` walk — so a `[tabindex]` clause in the selector would resolve from
  // EVERY cell to an "interactive" ancestor and disable cell ranges outright. It reads
  // as the obvious generalisation, which is exactly why it is pinned here.
  it('does not match a cell inside a focusable row', () => {
    const cell = targetIn(
      '<div class="nge-table__row" role="row" tabindex="0">' +
        '<div class="nge-table__cell" role="gridcell" id="target">42</div>' +
        '</div>'
    );

    expect(isNgeInteractiveElement(cell)).toBe(false);
    expect(NGE_INTERACTIVE_SELECTOR).not.toContain('[tabindex]');
  });

  // The table's structural roles describe the substrate, not a control. Matching one
  // would make every cell interactive and produce the same total failure.
  it.each(['grid', 'row', 'gridcell', 'columnheader', 'rowgroup', 'presentation'])(
    'does not match the table\'s own role="%s"',
    role => {
      expect(isNgeInteractiveElement(targetIn(`<div role="${role}" id="target"></div>`))).toBe(
        false
      );
    }
  );

  it('tolerates a target that is not an element', () => {
    expect(isNgeInteractiveElement(null)).toBe(false);
    expect(isNgeInteractiveElement(document)).toBe(false);
  });
});
