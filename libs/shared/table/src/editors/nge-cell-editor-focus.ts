import type { ElementRef, Signal } from '@angular/core';

import { afterRenderEffect } from '@angular/core';

/**
 * Focus a field the moment activation creates it, and at no other time.
 *
 * ⚠️ **Both halves are requirements, and the second is the one that is easy to get
 * wrong.** `Enter` on a focused row activates the row's first editable column
 * (ARCH-292) and focuses nothing, so without the first half a keyboard-only user
 * opens an editor they cannot type into.
 *
 * But "the field exists" is **not** the condition. A column declaring
 * `meta.ngeEdit.alwaysLive` reports `isEditing()` true from its very first render,
 * for every cell at once — so focusing on presence would have thirty rendered rows
 * each grab focus as they painted, and the last one to render would win. The
 * condition is the **transition** into editing, which an always-live column never
 * makes.
 *
 * The `null` start is what distinguishes the two: a first observation is never a
 * transition, whichever value it holds.
 *
 * Call from a field initializer, which runs in an injection context; keep the
 * returned handle so the effect is retained by the component that owns it.
 *
 * `HTMLElement` rather than `HTMLInputElement` because `<nge-cell-select>`'s
 * focus target is its `<button>` trigger. `focus()` is the only member this
 * reaches for, so the widening costs the two field-based editors nothing.
 */
export function focusNgeEditorOnActivation(
  isEditing: () => boolean,
  field: Signal<ElementRef<HTMLElement> | undefined>
): unknown {
  let previous: boolean | null = null;

  return afterRenderEffect(() => {
    const editing = isEditing();
    const activated = previous === false && editing;

    previous = editing;

    if (activated) {
      field()?.nativeElement.focus();
    }
  });
}
