import type { ElementRef } from '@angular/core';

import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeCellContext } from '../lib/slots';

import { focusNgeEditorOnActivation } from './nge-cell-editor-focus';

/**
 * `<nge-cell-checkbox>` — the table's own boolean editor (ARCH-293).
 *
 * ```ts
 * { accessorKey: 'isActive', header: 'Active', id: 'isActive',
 *   meta: { ngeEdit: { alwaysLive: true, editor: NgeCellCheckboxComponent, enabled: true } } }
 * ```
 *
 * ⚠️ **Not ARCH-268's selection checkbox, and the two must not be reused for one
 * another.** That one is a *pointer affordance* — `tabindex="-1"`, `aria-hidden`,
 * driven by `state.rowSelection`, announced by the row it sits in. This one is a
 * focusable control that proposes a value, so it is a real tab stop with a real
 * label.
 *
 * ⚠️ **`alwaysLive: true` is the arrangement this control is for**, and stating it
 * is the difference between a working column and a puzzling one. Activation exists
 * to avoid instantiating controls nobody engaged; a checkbox is the cheapest
 * control there is, so the saving is nil while the cost — a click to activate
 * before the click that toggles — is real. A column left on activation still works,
 * and reads as a disabled box until it is engaged.
 *
 * ⚠️ **A toggle IS the commit, and deferring it to blur would be a recycling bug
 * rather than a nicety.** A half-typed string is worth holding; a flipped checkbox
 * is not, and holding one is unsafe: `[checked]` re-derives from the cell, and
 * Angular writes a property binding only when the *bound* value changes — so a box
 * the user unchecked on a `true` row, scrolled away from, and recycled onto another
 * `true` row would keep showing the stale unchecked state, because `true → true` is
 * no change at all. Committing on `change` leaves nothing to go stale. `Enter`
 * commits too, since a browser fires no `change` for it.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-cell-checkbox',
  },
  selector: 'nge-cell-checkbox',
  standalone: true,
  styleUrl: './nge-cell-checkbox.component.scss',
  templateUrl: './nge-cell-checkbox.component.html',
})
export class NgeCellCheckboxComponent {
  /** The whole cell context — what the table hands an editor as its one input. */
  readonly cell = input.required<NgeCellContext<unknown>>();

  /**
   * What a screen reader announces the box as.
   *
   * Defaults to the column id for the reason {@link NgeCellInputComponent.label}
   * does: a header's text never reaches a cell context.
   */
  readonly label = input<string>();

  /** The cell's value as the box's state. Anything truthy is checked. */
  readonly checked = computed(() => Boolean(this.cell().value));

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  /** Focus on activation, never on an always-live render — see the helper. */
  private readonly focusOnActivation = focusNgeEditorOnActivation(
    () => this.cell().isEditing(),
    this.field
  );

  /** Propose the box's new state. Closes an activated editor; an always-live one stays. */
  protected commit(next: boolean): void {
    this.cell().commitEdit(next);
  }
}
