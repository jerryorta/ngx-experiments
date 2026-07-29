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
 * `<nge-cell-input>` — the table's own text and number editor (ARCH-293).
 *
 * A column names it and the table renders it, with no template to write:
 *
 * ```ts
 * { accessorKey: 'name', header: 'Name', id: 'name',
 *   meta: { ngeEdit: { editor: NgeCellInputComponent, enabled: true } } }
 * ```
 *
 * ⚠️ **It is a default, not a fixture.** A `[ngeCell]` template for the same
 * column shadows it (`NgeTableStore.cellTemplate` consults the projected
 * templates first), which is ARCH-278's resolution order applied to editors. A
 * consumer wanting their own control writes one and this is simply not reached.
 *
 * ⚠️ **A cell editor is not a form control, and that is what makes it cheap.** No
 * `ControlValueAccessor`, no `NgControl`, no label, no validation, no touched or
 * dirty tracking — there is no form. Signal inputs and `OnPush` only. That
 * per-instance saving is the justification for the table owning an editor at all
 * rather than reaching for a design-library input.
 *
 * ⚠️ **It holds no draft.** The `<input>`'s own DOM value is the draft, which is
 * safe precisely because activation bounds the element's life: the field exists
 * only while `isEditing()` is true, and ARCH-292 cancels an edit whose row leaves
 * the virtualized window. A draft kept on this class would outlive that — the node
 * showing row 12 is the node that showed row 4 a moment ago.
 *
 * ⚠️ **`Escape` is not bound here, and the omission is the design.** ARCH-292
 * contains the key at the cell (`nge-table.component.html`), which is the one
 * position from which a `stopPropagation()` starves the range and highlight addons'
 * document-level listeners at once. A second claimant on the same key inside the
 * editor would be the coordination that finding rejected.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-cell-input',
  },
  selector: 'nge-cell-input',
  standalone: true,
  styleUrl: './nge-cell-input.component.scss',
  templateUrl: './nge-cell-input.component.html',
})
export class NgeCellInputComponent {
  /** The whole cell context — what the table hands an editor as its one input. */
  readonly cell = input.required<NgeCellContext<unknown>>();

  /**
   * What a screen reader announces the field as.
   *
   * Defaults to the column id, which is a poor label and a great deal better than
   * none: a table's header text is not on the cell context, and a column named
   * through `meta.ngeEdit.editor` has nowhere else to say what its field is for.
   */
  readonly label = input<string>();

  /**
   * Which of the two fields this is.
   *
   * `number` is a distinct mode rather than a formatting nicety: it commits a
   * `number` where `text` commits a `string`, so a host applying the patch writes
   * the type its row already had instead of quietly turning a quantity into a
   * numeric string.
   */
  readonly type = input<'number' | 'text'>('text');

  /** What the cell shows when it is not being edited, and what the field starts at. */
  readonly display = computed(() => {
    const value = this.cell().value;

    return value === null || value === undefined ? '' : String(value);
  });

  private readonly field = viewChild<ElementRef<HTMLInputElement>>('field');

  /** Focus on activation, never on an always-live render — see the helper. */
  private readonly focusOnActivation = focusNgeEditorOnActivation(
    () => this.cell().isEditing(),
    this.field
  );

  /**
   * Propose what was typed, and close the editor.
   *
   * ⚠️ **The `isEditing()` guard is load-bearing rather than defensive filler.**
   * Removing a focused element fires a native `blur` on it — the browser's own
   * focus-fixup step — and `Escape` does exactly that: it clears the edit, which
   * flips `isEditing()` false and tears this field down a moment later. Without the
   * guard, that teardown blur would commit the very draft `Escape` discarded.
   */
  protected commit(value: string): void {
    const cell = this.cell();

    if (!cell.isEditing()) {
      return;
    }

    const parsed = this.parse(value);

    // An unparsable number proposes nothing rather than a `NaN` a host would write
    // into its row. Abandoning the edit is the honest outcome: the cell keeps the
    // value it had, which is what the user sees the moment the field closes.
    if (parsed === undefined) {
      cell.cancelEdit();

      return;
    }

    cell.commitEdit(parsed);
  }

  /** What `type` means for the committed value. `undefined` where there is nothing to propose. */
  private parse(value: string): number | string | undefined {
    if (this.type() === 'text') {
      return value;
    }

    const parsed = Number(value);

    return value.trim() === '' || !Number.isFinite(parsed) ? undefined : parsed;
  }
}
