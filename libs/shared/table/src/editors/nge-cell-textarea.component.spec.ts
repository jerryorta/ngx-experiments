import type { ComponentFixture } from '@angular/core/testing';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeCellContext } from '../lib/slots';

import { NGE_CELL_ALWAYS_SETTLED } from '../lib/nge-table/store';
import { NgeCellTextareaComponent, ngeCellTextareaEdit } from './nge-cell-textarea.component';

const ORIGINAL = 'The original description, as the row holds it.';

function contextWith(
  isEditing: ReturnType<typeof signal<boolean>>,
  value: unknown,
  committed: unknown[],
  cancelled: { count: number }
): NgeCellContext<unknown> {
  return {
    beginEdit: () => undefined,
    cancelEdit: () => {
      cancelled.count += 1;
      isEditing.set(false);
    },
    columnId: 'description',
    commitEdit: next => {
      committed.push(next);
      isEditing.set(false);
    },
    isEditing: isEditing.asReadonly(),
    isSettled: NGE_CELL_ALWAYS_SETTLED,
    row: {},
    rowId: 'row-1',
    rowIndex: 0,
    value,
  };
}

describe('NgeCellTextareaComponent', () => {
  let cancelled: { count: number };
  let committed: unknown[];
  let editing: ReturnType<typeof signal<boolean>>;
  let fixture: ComponentFixture<NgeCellTextareaComponent>;

  function render(value: unknown = ORIGINAL): void {
    cancelled = { count: 0 };
    committed = [];
    editing = signal(false);
    fixture = TestBed.createComponent(NgeCellTextareaComponent);
    fixture.componentRef.setInput('cell', contextWith(editing, value, committed, cancelled));
    fixture.detectChanges();
  }

  /** The panel lives on the body, not under the fixture — that is the whole point. */
  function panel(): HTMLElement | null {
    return document.querySelector('.nge-cell-textarea__panel');
  }

  function field(): HTMLTextAreaElement {
    const found = panel()?.querySelector('textarea');

    if (found == null) {
      throw new Error('no field rendered');
    }

    return found;
  }

  function buttons(): HTMLButtonElement[] {
    return [...(panel()?.querySelectorAll<HTMLButtonElement>('button') ?? [])];
  }

  function cancelButton(): HTMLButtonElement {
    return buttons()[0];
  }

  function applyButton(): HTMLButtonElement {
    return buttons()[1];
  }

  /** Activation is a TRANSITION, and the panel opens on it rather than on presence. */
  function activate(): void {
    editing.set(true);
    fixture.detectChanges();
  }

  function type(text: string): void {
    const element = field();

    element.value = text;
    element.dispatchEvent(new Event('input', { bubbles: true }));
    fixture.detectChanges();
  }

  function pressInPanel(key: string, modifiers: Partial<KeyboardEventInit> = {}): KeyboardEvent {
    const event = new KeyboardEvent('keydown', {
      bubbles: true,
      cancelable: true,
      key,
      ...modifiers,
    });

    (panel() ?? document.body).dispatchEvent(event);
    fixture.detectChanges();

    return event;
  }

  function clickBackdrop(): void {
    document.querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
    fixture.detectChanges();
  }

  afterEach(() => {
    fixture?.destroy();
  });

  // ─── Activation ───────────────────────────────────────────────────────────

  it('shows read-only text until the cell is being edited, then opens the panel', () => {
    render();

    expect((fixture.nativeElement as HTMLElement).textContent).toContain(ORIGINAL);
    expect(panel()).toBeNull();

    activate();

    expect(panel()).not.toBeNull();
    expect(field().value).toBe(ORIGINAL);
  });

  // ⚠️ Focus has to land in the FIELD, not on the trigger, and not nowhere. `Enter` on
  // a focused row activates the first editable column and focuses nothing (ARCH-292),
  // so without this the keyboard route dead-ends at an editor the user cannot type
  // into. It is also what puts panel keys on the path to CDK's `body` listener, which
  // the Escape containment below depends on.
  it('puts focus in the field as the panel opens', () => {
    render();
    activate();

    expect(document.activeElement).toBe(field());
  });

  // The role is the entire cost of ARCH-296's "a range drag started on the trigger
  // selects no cells" criterion — `INTERACTIVE_ROLES` already matches `textbox`, so
  // the guard, cmd/ctrl-A and Shift+arrow containment all come free with it.
  it('declares role="textbox" on the trigger once activated', () => {
    render();
    activate();

    const trigger = (fixture.nativeElement as HTMLElement).querySelector('[role="textbox"]');

    expect(trigger).not.toBeNull();
    expect(trigger?.getAttribute('aria-expanded')).toBe('true');
  });

  // ─── Apply is the only route to a commit ──────────────────────────────────

  it('proposes what was typed when Apply is pressed', () => {
    render();
    activate();
    type('Rewritten by hand.');
    applyButton().click();
    fixture.detectChanges();

    expect(committed).toEqual(['Rewritten by hand.']);
    expect(panel()).toBeNull();
  });

  it('proposes nothing until Apply is pressed, however much is typed', () => {
    render();
    activate();
    type('A draft nobody has committed.');

    expect(committed).toEqual([]);
    expect(cancelled.count).toBe(0);
  });

  // ─── Cancel and blur propose nothing ──────────────────────────────────────

  it('proposes nothing when Cancel is pressed, against a host that would apply', () => {
    render();
    activate();
    type('Discarded.');
    cancelButton().click();
    fixture.detectChanges();

    expect(committed).toEqual([]);
    expect(cancelled.count).toBe(1);
    expect(panel()).toBeNull();
  });

  // ⚠️ THE assertion this story exists to make, and the INVERSE of ARCH-293's.
  // `<nge-cell-input>` needed a blur handler guarded on `isEditing()`; here a blur
  // handler must not exist at all, because clicking Cancel blurs the field on its way
  // to the button. Each of the three routes below fires a real blur.
  describe('blur proposes nothing', () => {
    it('when the field blurs on the way to Cancel', () => {
      render();
      activate();
      field().focus();
      type('Typed, then abandoned.');
      field().blur();
      fixture.detectChanges();

      expect(committed).toEqual([]);

      cancelButton().click();
      fixture.detectChanges();

      expect(committed).toEqual([]);
      expect(cancelled.count).toBe(1);
    });

    it('when focus moves to the Apply button without pressing it', () => {
      render();
      activate();
      field().focus();
      type('Tabbed away from.');
      applyButton().focus();
      fixture.detectChanges();

      expect(committed).toEqual([]);
      expect(panel()).not.toBeNull();
    });

    // ⚠️ **Weaker than its two siblings, and worth saying so rather than reading as
    // equal cover.** jsdom does not move focus on a synthesized backdrop click, so no
    // native blur fires and adding a `(blur)="apply()"` handler leaves this one GREEN
    // while the two above go red. What it does assert on its own is real — that the
    // backdrop path proposes nothing — but the blur half of this route is verified in
    // a browser, not here.
    it('when the click lands outside the panel', () => {
      render();
      activate();
      field().focus();
      type('Clicked away from.');
      clickBackdrop();

      expect(committed).toEqual([]);
    });
  });

  // ─── The draft's fate — the failure mode this story owns ──────────────────

  // ⚠️ A test proving only "the panel closed" is not evidence (ARCH-250's lesson,
  // restated by ARCH-294). These assert on the DRAFT and on the proposal.
  describe('an outside click protects a dirty draft', () => {
    it('keeps the panel, the text and the focus when the draft has diverged', () => {
      render();
      activate();
      field().focus();
      type('Half a sentence the user is still writ');
      clickBackdrop();

      expect(panel()).not.toBeNull();
      expect(field().value).toBe('Half a sentence the user is still writ');
      expect(document.activeElement).toBe(field());
      expect(committed).toEqual([]);
      expect(cancelled.count).toBe(0);
    });

    it('tells the user why, rather than refusing silently', () => {
      render();
      activate();

      expect(panel()?.querySelector('.nge-cell-textarea__hint')).toBeNull();

      type('Now dirty.');

      expect(panel()?.querySelector('.nge-cell-textarea__hint')).not.toBeNull();
    });

    // A panel that refuses to close when there is nothing at stake is just a trap.
    it('closes when the draft is clean, proposing nothing', () => {
      render();
      activate();
      clickBackdrop();

      expect(panel()).toBeNull();
      expect(committed).toEqual([]);
      expect(cancelled.count).toBe(1);
    });

    // Typing back to the original is not a draft worth protecting — dirtiness is a
    // comparison against the cell, not a record that a key was pressed.
    it('closes again once the text is typed back to what the cell holds', () => {
      render();
      activate();
      type('Diverged.');
      type(ORIGINAL);
      clickBackdrop();

      expect(panel()).toBeNull();
      expect(committed).toEqual([]);
    });
  });

  // The backdrop is what keeps the row inside the virtualized window, which is what
  // keeps the draft alive at all. Its PRESENCE is assertable here; that it actually
  // blocks a wheel over the table is a real-browser check, since jsdom lays nothing
  // out and scrolls nothing.
  it('attaches a backdrop, which is what stops the row scrolling out from under the draft', () => {
    render();
    activate();

    expect(document.querySelector('.cdk-overlay-backdrop')).not.toBeNull();
  });

  // ─── Keyboard ─────────────────────────────────────────────────────────────

  it('leaves a bare Enter alone so it inserts a newline', () => {
    render();
    activate();
    type('First line.');

    const event = pressInPanel('Enter');

    expect(event.defaultPrevented).toBe(false);
    expect(committed).toEqual([]);
    expect(panel()).not.toBeNull();
  });

  it.each([
    ['meta', { metaKey: true }],
    ['ctrl', { ctrlKey: true }],
  ])('applies on %s + Enter', (_name, modifiers) => {
    render();
    activate();
    type('Committed by accelerator.');
    pressInPanel('Enter', modifiers);

    expect(committed).toEqual(['Committed by accelerator.']);
    expect(panel()).toBeNull();
  });

  // One stage, not ARCH-294's two: the column is never always-live, so a closed panel
  // with the edit still live would leave the cell as bare text with no way back in.
  it('cancels outright on Escape, proposing nothing', () => {
    render();
    activate();
    type('Abandoned by Escape.');
    pressInPanel('Escape');

    expect(panel()).toBeNull();
    expect(committed).toEqual([]);
    expect(cancelled.count).toBe(1);
    expect(editing()).toBe(false);
  });

  // ⚠️ THE containment assertion. ARCH-269's range and ARCH-250's highlight addon both
  // bind an unconditional document-level `Escape`, and ARCH-292's containment sits on
  // the CELL — which a body-level overlay's keydown never passes through. Without the
  // panel's own `stopPropagation()`, closing this editor would silently clear the
  // user's cell range, and every other assertion in this file would still pass.
  it('never lets a panel Escape reach a document-level listener', () => {
    const documentListener = jest.fn();

    document.addEventListener('keydown', documentListener);

    try {
      render();
      activate();
      pressInPanel('Escape');

      expect(documentListener).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', documentListener);
    }
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  // A panel outlives its trigger by default: it is attached to the body, while the
  // component is destroyed the moment an edit commits or cancels — including when
  // ARCH-292 cancels an edit whose row left the virtualized window.
  it('disposes an open panel when the editor is destroyed', () => {
    render();
    activate();

    expect(panel()).not.toBeNull();

    fixture.destroy();

    expect(panel()).toBeNull();
    expect(document.querySelector('.cdk-overlay-backdrop')).toBeNull();
  });

  // ⚠️ The panel opens on the TRANSITION into editing. A cell already editing at first
  // render — which is what `alwaysLive` produces, for every visible row at once —
  // must open nothing, or a column becomes one body-level overlay per row.
  it('opens no panel for a cell that is already editing at first render', () => {
    cancelled = { count: 0 };
    committed = [];
    editing = signal(true);
    fixture = TestBed.createComponent(NgeCellTextareaComponent);
    fixture.componentRef.setInput('cell', contextWith(editing, ORIGINAL, committed, cancelled));
    fixture.detectChanges();

    expect(panel()).toBeNull();
  });
});

describe('ngeCellTextareaEdit', () => {
  // `editorInputs` is `Record<string, unknown>` and the adapter applies only the keys
  // a component declares as inputs, so a misspelled one is dropped in silence — the
  // field renders with defaults and reads as the option not working. Going through
  // the helper is what makes that a compile error instead.
  it('names the textarea as the column editor and passes the options through', () => {
    const edit = ngeCellTextareaEdit({ label: 'Edit description', maxlength: 280, rows: 6 });

    expect(edit.enabled).toBe(true);
    expect(edit.editor).toBe(NgeCellTextareaComponent);
    expect(edit.editorInputs).toEqual({ label: 'Edit description', maxlength: 280, rows: 6 });
  });

  // ⚠️ The only editor for which always-live is INCOHERENT rather than a poor trade:
  // the control is a body-level overlay opened on activation, so an always-live column
  // would mean one panel per visible row. The helper offers no way to ask for it.
  it('always declares the column activated, and offers no way to opt out', () => {
    expect(ngeCellTextareaEdit().alwaysLive).toBe(false);
    expect(ngeCellTextareaEdit({ rows: 3 }).alwaysLive).toBe(false);
  });

  it('leaves editorInputs empty when a column declares no options', () => {
    expect(ngeCellTextareaEdit().editorInputs).toEqual({});
  });
});
