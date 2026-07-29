import type { ComponentFixture } from '@angular/core/testing';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeCellContext } from '../lib/slots';
import type { NgeCellSelectOption } from './nge-cell-select-option';

import { NGE_CELL_ALWAYS_SETTLED } from '../lib/nge-table/store';
import { NgeCellSelectComponent, ngeCellSelectEdit } from './nge-cell-select.component';

const OPTIONS: readonly NgeCellSelectOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Pending', value: 'pending' },
  { disabled: true, label: 'Archived', value: 'archived' },
  { label: 'Failed', value: 'failed' },
];

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
    columnId: 'status',
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

describe('NgeCellSelectComponent', () => {
  let cancelled: { count: number };
  let committed: unknown[];
  let editing: ReturnType<typeof signal<boolean>>;
  let fixture: ComponentFixture<NgeCellSelectComponent>;

  function render(value: unknown, startEditing = false): void {
    cancelled = { count: 0 };
    committed = [];
    editing = signal(startEditing);
    fixture = TestBed.createComponent(NgeCellSelectComponent);
    fixture.componentRef.setInput('cell', contextWith(editing, value, committed, cancelled));
    fixture.componentRef.setInput('options', OPTIONS);
    fixture.detectChanges();
  }

  function activate(): void {
    editing.set(true);
    fixture.detectChanges();
  }

  function trigger(): HTMLButtonElement {
    const found = (fixture.nativeElement as HTMLElement).querySelector('button');

    if (found === null) {
      throw new Error('no trigger rendered');
    }

    return found;
  }

  /** The panel lives on the body, not under the fixture — that is the whole point. */
  function panel(): HTMLElement | null {
    return document.querySelector('.nge-cell-select__panel');
  }

  function optionElements(): HTMLElement[] {
    return [...(panel()?.querySelectorAll<HTMLElement>('[role="option"]') ?? [])];
  }

  function open(): void {
    trigger().click();
    fixture.detectChanges();
  }

  function pressInPanel(key: string): KeyboardEvent {
    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key });

    (panel() ?? document.body).dispatchEvent(event);
    fixture.detectChanges();

    return event;
  }

  afterEach(() => {
    fixture?.destroy();
  });

  it('shows the matching option label as read-only text until the cell is being edited', () => {
    render('pending');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Pending');
    expect((fixture.nativeElement as HTMLElement).querySelector('button')).toBeNull();

    activate();

    expect(trigger().textContent).toContain('Pending');
  });

  it('falls back to the placeholder when the value matches no declared option', () => {
    render('something-else');

    expect((fixture.nativeElement as HTMLElement).textContent).toContain('—');
  });

  // The role is the entire cost of ARCH-294's "a range drag on the trigger selects
  // no cells" criterion — `INTERACTIVE_ROLES` already matches `combobox`, so the
  // guard, cmd/ctrl-A and Shift+arrow containment all come free with this attribute.
  it('declares role="combobox" on the trigger and role="listbox" on the panel', () => {
    render('active', true);

    expect(trigger().getAttribute('role')).toBe('combobox');
    expect(trigger().getAttribute('aria-expanded')).toBe('false');

    open();

    expect(panel()?.getAttribute('role')).toBe('listbox');
    expect(trigger().getAttribute('aria-expanded')).toBe('true');
  });

  it('renders the declared options only once opened', () => {
    render('active', true);

    expect(panel()).toBeNull();

    open();

    expect(optionElements().map(option => option.textContent?.trim())).toEqual([
      'Active',
      'Pending',
      'Archived',
      'Failed',
    ]);
  });

  it('proposes the chosen option and closes', () => {
    render('active', true);
    open();
    optionElements()[1].click();
    fixture.detectChanges();

    expect(committed).toEqual(['pending']);
    expect(panel()).toBeNull();
  });

  it('proposes nothing for a disabled option and stays open', () => {
    render('active', true);
    open();
    optionElements()[2].click();
    fixture.detectChanges();

    expect(committed).toEqual([]);
    expect(panel()).not.toBeNull();
  });

  it('commits the active option on Enter', () => {
    render('active', true);
    open();
    pressInPanel('ArrowDown');
    pressInPanel('Enter');

    expect(committed).toEqual(['pending']);
  });

  it('skips disabled options when arrowing', () => {
    render('pending', true);
    open();
    // Active starts on `pending` (index 1); one step down must land on `failed`
    // (index 3) because `archived` (index 2) is disabled.
    pressInPanel('ArrowDown');
    pressInPanel('Enter');

    expect(committed).toEqual(['failed']);
  });

  it('jumps to an option by type-ahead', () => {
    render('active', true);
    open();
    pressInPanel('f');
    pressInPanel('Enter');

    expect(committed).toEqual(['failed']);
  });

  // ─── The two-stage Escape ─────────────────────────────────────────────────

  it('closes the panel on Escape without cancelling the edit', () => {
    render('active', true);
    open();

    expect(panel()).not.toBeNull();

    pressInPanel('Escape');

    expect(panel()).toBeNull();
    expect(cancelled.count).toBe(0);
    expect(editing()).toBe(true);
  });

  // ⚠️ THE assertion this story exists to make. ARCH-269's range and ARCH-250's
  // highlight addon both bind an unconditional document-level `Escape`, and
  // ARCH-292's containment sits on the CELL — which a body-level overlay's keydown
  // never passes through. Without the panel's own `stopPropagation()`, closing a
  // dropdown would silently clear the user's cell range.
  it('never lets a panel Escape reach a document-level listener', () => {
    const documentListener = jest.fn();

    document.addEventListener('keydown', documentListener);

    try {
      render('active', true);
      open();
      pressInPanel('Escape');

      expect(documentListener).not.toHaveBeenCalled();
    } finally {
      document.removeEventListener('keydown', documentListener);
    }
  });

  // Stage two. With no panel to close there is nothing to claim, so the key is left
  // entirely alone and reaches ARCH-292's containment on the cell exactly as it does
  // for `<nge-cell-input>` — which is what keeps this from being the second
  // claimant ARCH-293 rejected.
  it('leaves Escape untouched on the trigger when no panel is open', () => {
    render('active', true);

    const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'Escape' });

    trigger().dispatchEvent(event);
    fixture.detectChanges();

    expect(event.defaultPrevented).toBe(false);
    expect(committed).toEqual([]);
  });

  // ─── Lifecycle ────────────────────────────────────────────────────────────

  // A panel outlives its trigger by default: it is attached to the body, while the
  // component is destroyed the moment an edit commits or cancels — including when
  // ARCH-292 cancels an edit whose row left the virtualized window.
  it('disposes an open panel when the editor is destroyed', () => {
    render('active', true);
    open();

    expect(panel()).not.toBeNull();

    fixture.destroy();

    expect(panel()).toBeNull();
  });
});

describe('ngeCellSelectEdit', () => {
  // `editorInputs` is `Record<string, unknown>` and the adapter applies only the
  // keys a component declares as inputs, so a misspelled one is dropped in silence
  // and the panel renders empty. Going through the helper is what makes that a
  // compile error instead.
  it('names the select as the column editor and passes the options through', () => {
    const edit = ngeCellSelectEdit(OPTIONS, { label: 'Edit status' });

    expect(edit.enabled).toBe(true);
    expect(edit.editor).toBe(NgeCellSelectComponent);
    expect(edit.editorInputs).toEqual({ label: 'Edit status', options: OPTIONS });
  });

  // A cell rendering as bare text gives a user no way to know the column is a
  // select, and activation would cost a click before the click that opens. The
  // expensive half — the overlay — is deferred either way, so the saving activation
  // buys here is one `<button>` per visible row.
  it('declares the column always-live by default', () => {
    expect(ngeCellSelectEdit(OPTIONS).alwaysLive).toBe(true);
  });

  it('lets a column opt back into activation', () => {
    const edit = ngeCellSelectEdit(OPTIONS, { alwaysLive: false });

    expect(edit.alwaysLive).toBe(false);
    // `alwaysLive` steers the table, so it must not leak into the component's
    // inputs — the adapter would drop it, but silently, and a reader would be left
    // unsure which layer owns the flag.
    expect(edit.editorInputs).toEqual({ options: OPTIONS });
  });
});
