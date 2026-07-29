import type { OverlayRef } from '@angular/cdk/overlay';
import type { ElementRef, TemplateRef } from '@angular/core';

import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  afterRenderEffect,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  inject,
  input,
  signal,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeColumnEdit } from '../lib/edit';
import type { NgeCellContext } from '../lib/slots';

import { applyNgeEditorPanelTokens } from './nge-cell-editor-panel';

/** Distinguishes one open panel's ids from another's. */
let sequence = 0;

/**
 * `<nge-cell-textarea>` — the table's own long-text editor, and the first whose
 * commit is EXPLICIT (ARCH-296).
 *
 * A column names it and declares its options, with no template to write:
 *
 * ```ts
 * { accessorKey: 'description', header: 'Description', id: 'description',
 *   meta: { ngeEdit: ngeCellTextareaEdit({ rows: 5, maxlength: 280 }) } }
 * ```
 *
 * ⚠️ **Cancel and Apply exist because every implicit commit is unavailable here, not
 * because a panel looks better with buttons.** `<nge-cell-input>` commits on blur,
 * `<nge-cell-checkbox>` on toggle, `<nge-cell-select>` on selection. `Enter` cannot
 * commit — it inserts a newline, which is the entire reason a consumer reaches for a
 * textarea. And blur cannot commit **at all**: clicking Cancel blurs the field on its
 * way to the button, so a commit-on-blur would apply the very edit Cancel exists to
 * discard.
 *
 * ⚠️ **That makes this the exact INVERSE of ARCH-293's finding, and copying that
 * editor is the mistake.** There a blur handler *guarded* on `isEditing()` was the
 * fix, because a teardown blur would otherwise commit what `Escape` had discarded.
 * Here the guard is not enough — **the handler must not exist**, and there is none in
 * this class or its template. A control whose natural gestures are all ambiguous
 * needs explicit affordances; adding them is cheaper than inventing a rule about
 * which keystroke means "done".
 *
 * ⚠️ **`hasBackdrop: true` is the whole answer to this story's failure mode, and it
 * is load-bearing rather than a nicety.** Rows are `@for`-tracked by `rendered.row.id`
 * (`nge-table.component.html`), so a row leaving the virtualized window is DESTROYED
 * — this component dies with it and the `DestroyRef` teardown disposes the panel.
 * For ARCH-294's select that costs a closed list and is genuinely benign. Here it
 * would cost however much prose the user had typed, silently, mid-sentence, because
 * they scrolled: the failure that reads as data loss rather than as a UI quirk.
 *
 * A backdrop removes it structurally. `.cdk-overlay-backdrop` is a hit-testable
 * full-viewport child of the overlay container on `<body>`, so a wheel event over it
 * targets the backdrop, whose scroll chain runs container → `body` → `html` and
 * **never** includes `.nge-table__viewport`. The row therefore cannot leave the
 * window while the panel is open, and the draft can stay where every other editor
 * keeps it — in the control's own DOM value, with no scratch state anywhere.
 *
 * ⚠️ **`scrollStrategies.block()` is NOT the route, and it is a verified no-op here.**
 * It operates on `document.documentElement` and its own `disable()` doc comment says
 * it unblocks *page-level* scroll; this table scrolls in an inner viewport. It would
 * read as implemented and change nothing — the third time this epic has hit CDK's
 * browser-viewport assumption, after ARCH-294's `autoClose`.
 *
 * ⚠️ **Do NOT "unify" this with the select by making both block.** The asymmetry is
 * one rule applied to different stakes: an editor holding unsaved prose protects it,
 * one holding a closed list has nothing to protect and keeps the nicer
 * follow-the-trigger behaviour.
 *
 * ⚠️ **The panel is modal only while the draft is DIRTY.** A clean draft has nothing
 * to lose, so an outside click closes it exactly as the select's does. A dirty one
 * keeps the panel and returns focus to the field, and the panel says why — the hint
 * beside the buttons is the "what the user is told" half of the contract, and it is
 * also what explains a click that did not dismiss.
 *
 * ⚠️ **`Tab` is deliberately NOT trapped, and the asymmetry with the pointer is the
 * story's own principle rather than an oversight.** `cdkTrapFocus` gated on
 * {@link isDirty} was considered and rejected. A click outside is refused because it
 * would *destroy* the draft; tabbing out destroys nothing — the panel stays open, the
 * field keeps its text, and `Shift`+`Tab` comes back. Trapping would restrict a user
 * for no protective gain, which is the same argument this editor makes for not
 * blocking the select's scroll. `role="dialog"` therefore carries no `aria-modal`,
 * which would claim an inertness that is true for the pointer and false for focus.
 *
 * ⚠️ **The open flag stays a component signal rather than moving to a
 * component-scoped SignalStore, under the by-KIND exemption** — the intrinsic widget
 * mechanic of a design-library primitive, held the same way in all four editors. A
 * store instance per rendered editable cell would be precisely the per-cell cost
 * activation and `NGE_CELL_NO_EDIT` exist to avoid.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-cell-textarea',
  },
  selector: 'nge-cell-textarea',
  standalone: true,
  styleUrl: './nge-cell-textarea.component.scss',
  templateUrl: './nge-cell-textarea.component.html',
})
export class NgeCellTextareaComponent {
  private readonly destroyRef = inject(DestroyRef);

  private readonly overlay = inject(Overlay);

  private readonly viewContainerRef = inject(ViewContainerRef);

  /** The whole cell context — what the table hands an editor as its one input. */
  readonly cell = input.required<NgeCellContext<unknown>>();

  /** What the commit button says. An input so a non-English consumer is not stuck. */
  readonly applyLabel = input<string>('Apply');

  readonly cancelLabel = input<string>('Cancel');

  /**
   * What a screen reader announces the field as.
   *
   * Defaults to the column id for the reason the other three editors' does: a
   * header's text never reaches a cell context.
   */
  readonly label = input<string>();

  /** Caps what the field will accept, mirroring the native attribute. */
  readonly maxlength = input<number>();

  readonly placeholder = input<string>();

  /**
   * How tall the field is, in lines.
   *
   * ⚠️ **The field is in the PANEL, so this does not touch row height.** An in-cell
   * `<textarea>` would either be one line — defeating the point — or force the row to
   * grow, which virtualization forbids: the virtualizer positions rows it has not
   * rendered and so needs a height it can compute without measuring content. That
   * constraint is why this editor is an overlay at all.
   */
  readonly rows = input<number>(4);

  /** What the cell shows, and what the field starts at. */
  readonly display = computed(() => {
    const value = this.cell().value;

    return value === null || value === undefined ? '' : String(value);
  });

  // ─── Panel ────────────────────────────────────────────────────────────────

  /**
   * Whether the field holds something other than what the cell does.
   *
   * ⚠️ **A signal fed by the field's `input` event, not a stored draft.** The DOM
   * value remains the only copy — this just mirrors *whether* it has diverged, which
   * is what the hint and the outside-click guard both branch on. Keeping the text
   * itself here would be a second copy to hold in step, and would outlive the field
   * on a row the window recycled.
   */
  protected readonly isDirty = signal(false);

  /** Whether the panel is attached. */
  protected readonly isOpen = signal(false);

  protected readonly panelId = `nge-cell-textarea-panel-${++sequence}`;

  private readonly field = viewChild<ElementRef<HTMLTextAreaElement>>('field');

  private readonly panelTemplate = viewChild<TemplateRef<unknown>>('panel');

  private readonly trigger = viewChild<ElementRef<HTMLElement>>('trigger');

  /**
   * Open the panel on the TRANSITION into editing, never on presence.
   *
   * ⚠️ **The distinction is the same one `focusNgeEditorOnActivation` holds, and it
   * matters more here than it does for focus.** A column declaring `alwaysLive`
   * reports `isEditing()` true from its first render for every cell at once — so
   * opening on presence would attach one body-level overlay per visible row.
   * {@link ngeCellTextareaEdit} refuses to declare `alwaysLive` at all, and this is
   * the second lock: a hand-written `meta.ngeEdit` setting it degrades to no panel
   * rather than to thirty. The `null` start is what makes a first observation never
   * count as a transition.
   */
  private readonly openOnActivation = afterRenderEffect(() => {
    const editing = this.cell().isEditing();
    const activated = this.wasEditing === false && editing;

    this.wasEditing = editing;

    if (activated) {
      this.open();
    }
  });

  private overlayRef: null | OverlayRef = null;

  private wasEditing: boolean | null = null;

  constructor() {
    // The panel lives on the body and would outlive this component, which is
    // destroyed the moment an edit commits or cancels — including when ARCH-292
    // cancels an edit whose row left the virtualized window.
    this.destroyRef.onDestroy(() => this.close());
  }

  /** Propose what was typed. The ONLY route to a commit in this editor. */
  protected apply(): void {
    const value = this.field()?.nativeElement.value ?? '';

    this.close();
    this.cell().commitEdit(value);
  }

  /** Abandon the edit, proposing nothing. What Cancel and `Escape` both call. */
  protected cancel(): void {
    this.close();
    this.cell().cancelEdit();
  }

  /** Mirror whether the field has diverged from the cell — see {@link isDirty}. */
  protected onInput(value: string): void {
    this.isDirty.set(value !== this.display());
  }

  private close(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.isOpen.set(false);
    this.isDirty.set(false);
  }

  /**
   * A click on the backdrop — outside the panel, and it proposes nothing either way.
   *
   * ⚠️ **Dismissing a DIRTY panel here would reintroduce the failure the backdrop
   * exists to remove**, only by a stray click instead of by a scroll. So a dirty
   * draft keeps its panel and takes focus back, and the hint beside the buttons says
   * why. A clean one has nothing to protect and behaves like the select's, because a
   * panel that refuses to close when there is nothing at stake is just a trap.
   */
  private onBackdropClick(): void {
    if (this.isDirty()) {
      this.field()?.nativeElement.focus();

      return;
    }

    this.cancel();
  }

  /**
   * Keys raised INSIDE the panel, dispatched by CDK from its `body` listener.
   *
   * ⚠️ **`stopPropagation()` on `Escape` is the containment, inherited from ARCH-294
   * rather than re-derived.** `OverlayKeyboardDispatcher` listens on `body` — one node
   * before `document` — so stopping here starves ARCH-269's cell-range and ARCH-250's
   * highlight addons' document-level listeners at once, without core ever enumerating
   * which addons currently bind the key. Closing an editor must never clear the user's
   * cell range. ⚠️ The panel closing is NOT evidence this works: delete the line and
   * every "the panel closed" assertion still passes, which is exactly why the spec
   * asserting on a document listener is the one that matters.
   *
   * ⚠️ **`Escape` cancels outright — ONE stage, and the collapse is forced rather than
   * chosen.** ARCH-294's two stages were "close the panel", then "cancel the edit",
   * both free. Here the column is never always-live, so a closed panel with the edit
   * still live would leave the cell as bare read-only text with no way back into it —
   * not a state worth having. `Escape` is the keyboard twin of Cancel, and neither
   * asks for confirmation: both are deliberate abandonments.
   *
   * There is no trigger-level `Escape` handler, and none is needed: the panel opens
   * on activation and focus goes into the field, so a key never reaches the trigger
   * while an edit is live. That is the half ARCH-294 needed only because its trigger
   * is where a user stands with the panel shut.
   */
  private onPanelKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      event.preventDefault();
      this.cancel();

      return;
    }

    // ⚠️ Modified `Enter` only. A bare one inserts a newline and is deliberately left
    // alone — taking it would remove the single reason a column chose a textarea.
    if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
      event.preventDefault();
      this.apply();
    }
  }

  private open(): void {
    const template = this.panelTemplate();
    const origin = this.trigger();

    if (template === undefined || origin === undefined || this.overlayRef !== null) {
      return;
    }

    const overlayRef = this.overlay.create({
      // ⚠️ THE decision this story turns on — see the class doc. The backdrop is what
      // keeps the row inside the virtualized window, which is what keeps the draft
      // alive. Transparent because an inline cell editor dimming the whole page would
      // claim a weight it does not have.
      backdropClass: 'cdk-overlay-transparent-backdrop',
      hasBackdrop: true,
      minWidth: origin.nativeElement.getBoundingClientRect().width,
      panelClass: 'nge-cell-textarea-overlay',
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(origin)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        ])
        .withFlexibleDimensions(false)
        .withPush(false),
      // Not the scroll defence — the backdrop is. This only keeps the panel on its
      // trigger through a window resize or a programmatic scroll, neither of which the
      // backdrop intercepts.
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    this.overlayRef = overlayRef;
    overlayRef.attach(new TemplatePortal(template, this.viewContainerRef));

    // Resolved at the TRIGGER, which is still inside the table and so still carries
    // the table's own scoping — the pane is not.
    applyNgeEditorPanelTokens(origin.nativeElement, overlayRef.overlayElement);

    this.isOpen.set(true);

    overlayRef.keydownEvents().subscribe(event => this.onPanelKeydown(event));
    overlayRef.backdropClick().subscribe(() => this.onBackdropClick());

    // A strategy that detaches rather than disposing would otherwise leave this
    // component believing a panel it can no longer see is open.
    overlayRef.detachments().subscribe(() => this.close());

    // Focus moves INTO the field, which is both what a user expects on activation and
    // what puts panel keys on the path to CDK's `body` listener.
    //
    // ⚠️ **Read off the attached pane rather than through the `field` view query, and
    // the difference is a timing one.** `attach` builds the embedded view
    // synchronously, so the element is in the DOM on the next line — but the signal
    // backing a `viewChild` is updated by change detection, which has not run yet.
    // Reading it here can hand back `undefined` on the very pass that needs it, and
    // the failure is the quiet kind: the panel opens correctly and simply never takes
    // focus. Every other reader of `field` runs from a user gesture, long after the
    // query has settled. Same reason `<nge-cell-select>` queries its pane for the
    // listbox.
    this.fieldIn(overlayRef)?.focus();
  }

  /** The panel's field, read off the attached pane — see the call in {@link open}. */
  private fieldIn(overlayRef: OverlayRef): HTMLTextAreaElement | null {
    return overlayRef.overlayElement.querySelector<HTMLTextAreaElement>('textarea');
  }
}

/**
 * Declare a column's textarea editor and its options, type-checked.
 *
 * ⚠️ **The reason this exists rather than a hand-written object literal**:
 * `editorInputs` is `Record<string, unknown>` and the adapter applies only the keys a
 * component actually declares as inputs, so `{ row: 5 }` or `{ maxLength: 280 }` is
 * dropped in silence — the field renders with defaults and reads as the option not
 * working rather than as a typo. Going through here makes the key a compile error.
 *
 * ```ts
 * meta: { ngeEdit: ngeCellTextareaEdit({ rows: 6, placeholder: 'Describe the item' }) }
 * ```
 *
 * ⚠️ **`alwaysLive` is not accepted, and this is the only editor for which it is
 * INCOHERENT rather than merely a poor trade.** `ngeCellSelectEdit` offers it because
 * a select's trigger *is* the reading and costs one `<button>` per row. This editor's
 * control is a body-level overlay that opens on activation, so an always-live column
 * would mean one panel per visible row — which is not a rendering of a column at all.
 * A textarea column's reading is its text; the affordance a user needs is "this cell
 * can be edited", which a hover or focus cue carries.
 */
export function ngeCellTextareaEdit(extra?: {
  applyLabel?: string;
  cancelLabel?: string;
  label?: string;
  maxlength?: number;
  placeholder?: string;
  rows?: number;
}): NgeColumnEdit {
  return {
    alwaysLive: false,
    editor: NgeCellTextareaComponent,
    editorInputs: { ...extra },
    enabled: true,
  };
}
