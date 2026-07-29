import type { ComponentFixture } from '@angular/core/testing';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { NgeCellContext } from '../lib/slots';

import { NGE_CELL_ALWAYS_SETTLED } from '../lib/nge-table/store';
import { NgeCellCheckboxComponent } from './nge-cell-checkbox.component';

function contextWith(
  isEditing: ReturnType<typeof signal<boolean>>,
  value: unknown,
  committed: unknown[]
): NgeCellContext<unknown> {
  return {
    beginEdit: () => undefined,
    cancelEdit: () => isEditing.set(false),
    columnId: 'isActive',
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

describe('NgeCellCheckboxComponent', () => {
  let committed: unknown[];
  let editing: ReturnType<typeof signal<boolean>>;
  let fixture: ComponentFixture<NgeCellCheckboxComponent>;

  function render(value: unknown, startEditing = false): void {
    committed = [];
    editing = signal(startEditing);
    fixture = TestBed.createComponent(NgeCellCheckboxComponent);
    fixture.componentRef.setInput('cell', contextWith(editing, value, committed));
    fixture.detectChanges();
  }

  function box(): HTMLInputElement {
    const found = (fixture.nativeElement as HTMLElement).querySelector('input');

    if (found === null) {
      throw new Error('no checkbox rendered');
    }

    return found as HTMLInputElement;
  }

  function activate(): void {
    editing.set(true);
    fixture.detectChanges();
  }

  it('shows the value as a disabled box until the cell is being edited', () => {
    render(true);

    expect(box().checked).toBe(true);
    expect(box().disabled).toBe(true);

    activate();

    expect(box().disabled).toBe(false);
  });

  // ⚠️ A toggle IS the commit. Deferring it to blur would leave the DOM `checked` as
  // the draft, and `[checked]` only rewrites when the BOUND value changes — so a box
  // unchecked on a `true` row and recycled onto another `true` row would stay
  // unchecked, because `true → true` is no change at all.
  it('proposes the new state as soon as the box is toggled', () => {
    render(false);
    activate();

    const control = box();
    control.checked = true;
    control.dispatchEvent(new Event('change'));

    expect(committed).toEqual([true]);
  });

  // A browser fires no `change` for Enter on a checkbox, so the key is bound rather
  // than inherited.
  it('proposes the current state on Enter', () => {
    render(false);
    activate();

    const control = box();
    control.checked = true;
    control.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));

    expect(committed).toEqual([true]);
  });

  it('keeps a click on the box from reaching the table', () => {
    render(false);
    activate();

    const reachedTheHost = jest.fn();
    (fixture.nativeElement as HTMLElement).addEventListener('click', reachedTheHost);

    box().dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));

    expect(reachedTheHost).not.toHaveBeenCalled();
  });

  it('focuses the box when activation creates it', () => {
    render(false);
    activate();

    expect(document.activeElement).toBe(box());
  });

  // ⚠️ THE REGRESSION THIS GUARDS. An always-live column reports `isEditing()` true
  // from its first render, for every cell at once — so focusing on the field's
  // PRESENCE rather than on the transition into editing would have every rendered
  // row grab focus as it painted, and the last to render would win. A user's caret
  // would leave whatever they were doing the moment such a table appeared.
  it('takes no focus from a column that is always live', () => {
    const elsewhere = document.createElement('input');
    document.body.append(elsewhere);
    elsewhere.focus();

    render(false, true);

    expect(box().disabled).toBe(false);
    expect(document.activeElement).toBe(elsewhere);

    elsewhere.remove();
  });

  it('labels the box for a screen reader, falling back to the column', () => {
    render(false);

    expect(box().getAttribute('aria-label')).toBe('Edit isActive');

    fixture.componentRef.setInput('label', 'Active');
    fixture.detectChanges();

    expect(box().getAttribute('aria-label')).toBe('Active');
  });
});
