import type { ComponentFixture } from '@angular/core/testing';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeCellContext } from '../lib/slots';

import { NGE_CELL_ALWAYS_SETTLED } from '../lib/nge-table/store';
import { NgeCellInputComponent } from './nge-cell-input.component';

/** What each callback on a context recorded, so a test can assert on the proposal. */
interface EditSpy {
  cancelled: number;
  committed: unknown[];
}

/**
 * A cell context whose editing flag a test can move.
 *
 * ⚠️ `isEditing` is a signal for the reason ARCH-291 settled and ARCH-292
 * inherited: the real context is memoised against its engine cell, so a plain
 * boolean would be read once and served stale forever. A stub that used one would
 * pass while the shipped behaviour was broken.
 */
function contextWith(
  isEditing: ReturnType<typeof signal<boolean>>,
  value: unknown,
  spy: EditSpy
): NgeCellContext<unknown> {
  return {
    beginEdit: () => undefined,
    cancelEdit: () => {
      spy.cancelled += 1;
      isEditing.set(false);
    },
    columnId: 'quantity',
    commitEdit: next => {
      spy.committed.push(next);
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

describe('NgeCellInputComponent', () => {
  let spy: EditSpy;
  let editing: ReturnType<typeof signal<boolean>>;
  let fixture: ComponentFixture<NgeCellInputComponent>;

  function render(value: unknown, type: 'number' | 'text' = 'text'): void {
    spy = { cancelled: 0, committed: [] };
    editing = signal(false);
    fixture = TestBed.createComponent(NgeCellInputComponent);
    fixture.componentRef.setInput('cell', contextWith(editing, value, spy));
    fixture.componentRef.setInput('type', type);
    fixture.detectChanges();
  }

  function field(): HTMLInputElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('input');
  }

  function typeInto(text: string): void {
    const input = field();

    if (input === null) {
      throw new Error('no field is open');
    }

    input.value = text;
  }

  // The activation model, as the component's half of it. Thirty visible rows across
  // three editable columns is ninety controls this branch never creates.
  it('renders read-only text until the cell says it is being edited', () => {
    render('Widget');

    expect(field()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('Widget');

    editing.set(true);
    fixture.detectChanges();

    expect(field()).not.toBeNull();
  });

  it('starts the field at the cell value', () => {
    render('Widget');
    editing.set(true);
    fixture.detectChanges();

    expect(field()?.value).toBe('Widget');
  });

  it('proposes what was typed on blur', () => {
    render('Widget');
    editing.set(true);
    fixture.detectChanges();

    typeInto('Gadget');
    field()?.dispatchEvent(new Event('blur'));

    expect(spy.committed).toEqual(['Gadget']);
  });

  // `Enter` blurs rather than committing directly, so both routes into a commit are
  // one route with one guard on it.
  it('proposes what was typed on Enter', () => {
    render('Widget');
    editing.set(true);
    fixture.detectChanges();

    typeInto('Gadget');
    field()?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

    expect(spy.committed).toEqual(['Gadget']);
  });

  // ⚠️ THE ONE THAT MATTERS. Removing a focused element fires a native blur on it,
  // and `Escape` does exactly that: it clears the edit, which tears this field down
  // a moment later. Without the `isEditing()` guard, that teardown blur commits the
  // very draft `Escape` discarded — and it looks like `Escape` simply not working.
  it('proposes nothing when a blur arrives after the edit was already cancelled', () => {
    render('Widget');
    editing.set(true);
    fixture.detectChanges();

    typeInto('abandoned');
    editing.set(false);
    field()?.dispatchEvent(new Event('blur'));

    expect(spy.committed).toEqual([]);
  });

  it('commits a number rather than its text for a number field', () => {
    render(3, 'number');
    editing.set(true);
    fixture.detectChanges();

    typeInto('42');
    field()?.dispatchEvent(new Event('blur'));

    expect(spy.committed).toEqual([42]);
  });

  // A `NaN` proposal is worse than none: a host applying it writes it into the row.
  it.each(['', 'not a number'])('abandons a number field holding %p', text => {
    render(3, 'number');
    editing.set(true);
    fixture.detectChanges();

    typeInto(text);
    field()?.dispatchEvent(new Event('blur'));

    expect(spy.committed).toEqual([]);
    expect(spy.cancelled).toBe(1);
  });

  // ⚠️ Without this, `Enter` on a focused row opens an editor a keyboard-only user
  // cannot type into — activation focuses nothing on its own (ARCH-292).
  it('focuses the field when activation creates it', () => {
    render('Widget');
    editing.set(true);
    fixture.detectChanges();

    expect(document.activeElement).toBe(field());
  });

  // The row's click selects and the cell's click activates, so a click inside the
  // field must not read as either.
  it('keeps a click inside the field from reaching the table', () => {
    render('Widget');
    editing.set(true);
    fixture.detectChanges();

    const click = new MouseEvent('click', { bubbles: true, cancelable: true });
    const reachedTheHost = jest.fn();
    (fixture.nativeElement as HTMLElement).addEventListener('click', reachedTheHost);

    field()?.dispatchEvent(click);

    expect(reachedTheHost).not.toHaveBeenCalled();
  });

  it('labels the field for a screen reader, falling back to the column', () => {
    render('Widget');
    editing.set(true);
    fixture.detectChanges();

    expect(field()?.getAttribute('aria-label')).toBe('Edit quantity');

    fixture.componentRef.setInput('label', 'Units on hand');
    fixture.detectChanges();

    expect(field()?.getAttribute('aria-label')).toBe('Units on hand');
  });

  it('renders an empty cell for a null value rather than the word', () => {
    render(null);

    expect((fixture.nativeElement as HTMLElement).textContent?.trim()).toBe('');
  });
});
