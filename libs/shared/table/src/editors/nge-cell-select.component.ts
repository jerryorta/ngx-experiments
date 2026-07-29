import type { OverlayRef } from '@angular/cdk/overlay';
import type { ElementRef, TemplateRef } from '@angular/core';

import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
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
import type { NgeCellSelectOption } from './nge-cell-select-option';

import { focusNgeEditorOnActivation } from './nge-cell-editor-focus';
import { applyNgeEditorPanelTokens } from './nge-cell-editor-panel';

/** How long a type-ahead buffer survives without another keystroke. */
const TYPE_AHEAD_MS = 500;

/** Distinguishes one open panel's option ids from another's. */
let sequence = 0;

/**
 * `<nge-cell-select>` — the table's own enum editor, over a CDK overlay (ARCH-294).
 *
 * A column names it and declares its choices, with no template to write:
 *
 * ```ts
 * { accessorKey: 'status', header: 'Status', id: 'status',
 *   meta: { ngeEdit: ngeCellSelectEdit([
 *     { label: 'Active', value: 'active' },
 *     { label: 'Archived', value: 'archived' },
 *   ]) } }
 * ```
 *
 * ⚠️ **A body-level overlay is the whole reason `.nge-table__cell` keeps
 * `overflow: hidden`.** A cell's content is arbitrary and must not spill, and the
 * cell is deliberately unpositioned so pinned lanes stay sticky (ARCH-243) — both
 * stay. The CDK attaches its panel to a container appended to `<body>`, so cell
 * clipping is simply irrelevant to it. ARCH-271's fill handle hit the other side of
 * this wall and had to ride the slot's flow position instead.
 *
 * ⚠️ **A flat `@for` over a signal, and the cheapness is the point.** No per-option
 * `TemplateRef`, no content projection, no `ControlValueAccessor`, no validation —
 * those are most of what makes a design-system select expensive to instantiate, and
 * a cell editor is not a form control. Grouping, per-option templates and async
 * loading are a later story; a consumer needing them today writes a `[ngeCell]`
 * template, which is what that seam is for.
 *
 * ⚠️ **{@link ngeCellSelectEdit} declares this column `alwaysLive` by default**, so
 * the trigger renders at rest and a user can see the column is a select without
 * clicking to find out. That is ARCH-293's checkbox argument, not a new one: what
 * activation saves here is a `<button>` per visible row, and what it costs is a click
 * before the click that opens. **The expensive half is deferred either way** — the
 * overlay, the portal and the option list are built on open and never before.
 * A column passing `alwaysLive: false` gets the read-only text branch below instead.
 *
 * ⚠️ **The open flag stays a component signal rather than moving to a
 * component-scoped SignalStore, under the by-KIND exemption.** It is the intrinsic
 * widget mechanic of a design-library primitive — the same category as a reveal
 * toggle or hover state — and the two sibling editors hold their state the same way.
 * A store instance per rendered editable cell would also be precisely the per-cell
 * cost activation and `NGE_CELL_NO_EDIT` exist to avoid, which would trade this
 * directory's whole thesis for a rule it is exempt from.
 *
 * ⚠️ **`RepositionScrollStrategy`, and the panel closing on scroll-out is a
 * CONSEQUENCE of it rather than a strategy of its own.** The obvious fear is that
 * virtualization destroys the trigger while the panel is open, leaving CDK measuring
 * a detached element — which is why `CloseScrollStrategy` looks like the safe answer.
 * It does not happen here, and the reason is one line in
 * `nge-table.component.html`: rows are `@for`-tracked by **`rendered.row.id`**, so a
 * row leaving the window is DESTROYED rather than recycled onto another record. This
 * component dies with it and the `DestroyRef` teardown below disposes the overlay.
 *
 * So the panel tracks its trigger while the row is visible and vanishes the moment
 * the row is gone — measured frame-by-frame at 25px/frame: thirteen frames tracking
 * exactly, zero frames positioned at the detached `{0,0,0,0}` origin, clean close on
 * the fourteenth. Closing on the *first* scroll event, by contrast, loses a dropdown
 * to an inertial trackpad brush.
 *
 * ⚠️ **This is load-bearing on rows being destroyed rather than recycled.** Row
 * recycling is an unticketed backlog item for this epic ("reuse row controllers
 * across window slides"); if it ever lands, a recycled trigger stays connected while
 * showing a different record, and this strategy would track the wrong row. Revisit
 * here before that ships.
 *
 * ⚠️ **`autoClose` is deliberately NOT set.** It measures the overlay against the
 * *browser viewport* and carries an upstream TODO about ancestor scroll containers
 * (`reposition-scroll-strategy.ts`), so in a table whose scrolling happens in an
 * inner viewport it would almost never fire — an inconsistent half-measure on top of
 * a teardown that already covers the case.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-cell-select',
  },
  selector: 'nge-cell-select',
  standalone: true,
  styleUrl: './nge-cell-select.component.scss',
  templateUrl: './nge-cell-select.component.html',
})
export class NgeCellSelectComponent {
  private readonly destroyRef = inject(DestroyRef);

  private readonly overlay = inject(Overlay);

  private readonly viewContainerRef = inject(ViewContainerRef);

  /** The whole cell context — what the table hands an editor as its one input. */
  readonly cell = input.required<NgeCellContext<unknown>>();

  /**
   * What a screen reader announces the control as.
   *
   * Defaults to the column id for the reason the other two editors' does: a
   * header's text never reaches a cell context.
   */
  readonly label = input<string>();

  /**
   * The choices, declared by the column through `meta.ngeEdit.editorInputs`.
   *
   * ⚠️ **`editorInputs` rather than a top-level `meta.ngeSelect` key, and the
   * difference is not cosmetic.** `meta.ngeExport` (ARCH-248) and `meta.ngeFill`
   * (ARCH-271) are top-level because *core* reads them — the export seam and the
   * fill feature respectively. A `NgeCellContext` carries no column (`columnId` is
   * a string), so an editor cannot read column meta at all; its only channel is the
   * inputs the adapter spreads for it. Plumbing a `ngeSelect` key through to a
   * component would mean core learning what a select is, which is the central switch
   * the extensibility gate exists to catch.
   *
   * Declare them through {@link ngeCellSelectEdit} — `editorInputs` is
   * `Record<string, unknown>` and the adapter drops a misspelled key in silence.
   */
  readonly options = input<readonly NgeCellSelectOption[]>([]);

  /** What the trigger shows when the cell's value matches no declared option. */
  readonly placeholder = input<string>('—');

  // ─── Selection ────────────────────────────────────────────────────────────

  /** Which option the cell currently holds, or `-1` when its value matches none. */
  readonly selectedIndex = computed(() => {
    const value = this.cell().value;

    return this.options().findIndex(option => option.value === value);
  });

  /** What the trigger and the read-only cell show. */
  readonly displayLabel = computed(() => {
    const selected = this.selectedIndex();

    return selected === -1 ? this.placeholder() : this.options()[selected].label;
  });

  // ─── Panel ────────────────────────────────────────────────────────────────

  /** Which option the keyboard is on. Drives `aria-activedescendant`, not focus. */
  protected readonly activeIndex = signal(-1);

  /** Whether the panel is attached. */
  protected readonly isOpen = signal(false);

  protected readonly panelId = `nge-cell-select-panel-${++sequence}`;

  private readonly panelTemplate = viewChild<TemplateRef<unknown>>('panel');

  private readonly trigger = viewChild<ElementRef<HTMLButtonElement>>('trigger');

  /** Focus the trigger on activation, never on an always-live render — see the helper. */
  private readonly focusOnActivation = focusNgeEditorOnActivation(
    () => this.cell().isEditing(),
    this.trigger
  );

  private overlayRef: null | OverlayRef = null;

  private typeAhead = '';

  private typeAheadTimer: null | ReturnType<typeof setTimeout> = null;

  constructor() {
    // The component is destroyed the moment an edit commits or cancels — including
    // when ARCH-292 cancels an edit whose row left the virtualized window. An
    // overlay lives on the body and would outlive all three.
    this.destroyRef.onDestroy(() => this.close(false));
  }

  /** The id of the option `aria-activedescendant` points at, or `null`. */
  protected activeOptionId(): null | string {
    const active = this.activeIndex();

    return active === -1 ? null : this.optionId(active);
  }

  /** Propose an option's value and close. A disabled option proposes nothing. */
  protected choose(option: NgeCellSelectOption): void {
    if (option.disabled === true) {
      return;
    }

    this.close(false);
    this.cell().commitEdit(option.value);
  }

  protected optionId(index: number): string {
    return `${this.panelId}-option-${index}`;
  }

  /**
   * `Escape` raised on the TRIGGER, which the panel's own handler never sees.
   *
   * ⚠️ **This is the half of the two-stage contract that is easy to miss, and
   * without it the first press cancels the edit outright.** CDK dispatches panel
   * keys from a `body` listener, so a key raised on the trigger — which sits inside
   * the cell — is stopped by ARCH-292's containment one node earlier and never
   * arrives. Stage one therefore has to be claimed here as well.
   *
   * ⚠️ **Guarded on the panel being open, which is what keeps it from being the
   * second claimant ARCH-293 rejected.** With no panel there is nothing to close, so
   * the key is left entirely alone and bubbles to the cell exactly as it does for
   * `<nge-cell-input>` and `<nge-cell-checkbox>` — stage two, ARCH-292 cancelling
   * the edit, is inherited rather than reimplemented.
   */
  protected onTriggerEscape(event: Event): void {
    if (!this.isOpen()) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    this.close(true);
  }

  /** `Enter`, `Space` and the arrows open the panel from the closed trigger. */
  protected onTriggerOpenKey(event: Event): void {
    if (this.isOpen()) {
      return;
    }

    event.preventDefault();
    this.open();
  }

  protected toggle(): void {
    if (this.isOpen()) {
      this.close(true);
    } else {
      this.open();
    }
  }

  private clearTypeAhead(): void {
    if (this.typeAheadTimer !== null) {
      clearTimeout(this.typeAheadTimer);
      this.typeAheadTimer = null;
    }

    this.typeAhead = '';
  }

  private close(returnFocus: boolean): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
    this.isOpen.set(false);
    this.activeIndex.set(-1);
    this.clearTypeAhead();

    if (returnFocus) {
      this.trigger()?.nativeElement.focus();
    }
  }

  /** Step the active option, skipping disabled ones, without wrapping past the ends. */
  private moveActive(delta: number): void {
    const options = this.options();
    let next = this.activeIndex();

    for (let step = 0; step < options.length; step += 1) {
      next += delta;

      if (next < 0 || next >= options.length) {
        return;
      }

      if (options[next].disabled !== true) {
        this.activeIndex.set(next);

        return;
      }
    }
  }

  /**
   * Keys raised INSIDE the panel, dispatched by CDK from its `body` listener.
   *
   * ⚠️ **`stopPropagation()` on `Escape` here is the containment, and it works for
   * the same reason ARCH-292's does.** `OverlayKeyboardDispatcher` listens on `body`
   * — one node before `document` — so stopping here starves the cell-range and
   * highlight addons' document-level listeners at once, without core ever
   * enumerating which addons currently bind the key. Closing a dropdown must never
   * clear the user's cell range.
   */
  private onPanelKeydown(event: KeyboardEvent): void {
    const options = this.options();

    switch (event.key) {
      case 'ArrowDown':
        event.preventDefault();
        this.moveActive(1);
        break;
      case 'ArrowUp':
        event.preventDefault();
        this.moveActive(-1);
        break;
      case 'End':
        event.preventDefault();
        this.activeIndex.set(options.length);
        this.moveActive(-1);
        break;
      case 'Enter': {
        const active = this.activeIndex();

        event.preventDefault();

        if (active === -1) {
          this.close(true);
        } else {
          this.choose(options[active]);
        }

        break;
      }
      case 'Escape':
        // Stage one: the panel closes and the edit survives. Stage two is the next
        // press, which lands on the trigger and reaches ARCH-292 through the cell.
        event.stopPropagation();
        event.preventDefault();
        this.close(true);
        break;
      case 'Home':
        event.preventDefault();
        this.activeIndex.set(-1);
        this.moveActive(1);
        break;
      default:
        this.onTypeAhead(event);
    }
  }

  /** Jump to the first option whose label starts with what was typed. */
  private onTypeAhead(event: KeyboardEvent): void {
    // A modified key is a shortcut rather than a search, and anything longer than
    // one character is a named key (`Shift`, `F3`) rather than a typed one.
    if (event.key.length !== 1 || event.altKey || event.ctrlKey || event.metaKey) {
      return;
    }

    this.typeAhead += event.key.toLowerCase();

    if (this.typeAheadTimer !== null) {
      clearTimeout(this.typeAheadTimer);
    }

    this.typeAheadTimer = setTimeout(() => this.clearTypeAhead(), TYPE_AHEAD_MS);

    const match = this.options().findIndex(
      option => option.disabled !== true && option.label.toLowerCase().startsWith(this.typeAhead)
    );

    if (match !== -1) {
      event.preventDefault();
      this.activeIndex.set(match);
    }
  }

  private open(): void {
    const template = this.panelTemplate();
    const origin = this.trigger();

    if (template === undefined || origin === undefined || this.overlayRef !== null) {
      return;
    }

    const overlayRef = this.overlay.create({
      hasBackdrop: false,
      minWidth: origin.nativeElement.getBoundingClientRect().width,
      panelClass: 'nge-cell-select-overlay',
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(origin)
        .withPositions([
          { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
          { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        ])
        .withFlexibleDimensions(false)
        .withPush(false),
      // ⚠️ Reposition rather than close, and the panel still disappears the moment
      // its row leaves the window — see the class doc. That teardown comes from the
      // row being DESTROYED (tracked by `row.id`) rather than from this strategy, so
      // the two are not alternatives here: reposition buys smooth tracking and keeps
      // the close-on-exit for free.
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    this.overlayRef = overlayRef;
    overlayRef.attach(new TemplatePortal(template, this.viewContainerRef));
    // Resolved at the TRIGGER, which is still inside the table and so still carries
    // the table's own scoping — the pane is not.
    applyNgeEditorPanelTokens(origin.nativeElement, overlayRef.overlayElement);

    this.isOpen.set(true);
    this.activeIndex.set(this.selectedIndex());

    overlayRef.keydownEvents().subscribe(event => this.onPanelKeydown(event));

    overlayRef.outsidePointerEvents().subscribe(event => {
      // The trigger's own click toggles; closing here too would close and reopen.
      if (origin.nativeElement.contains(event.target as Node)) {
        return;
      }

      this.close(false);
    });

    // `CloseScrollStrategy` detaches rather than disposing, so without this the
    // component would still believe a panel it can no longer see is open.
    overlayRef.detachments().subscribe(() => this.close(false));

    // Focus moves INTO the panel so its keys reach CDK's `body` listener. Left on
    // the trigger, an `Escape` would be stopped at the cell one node earlier and
    // stage one would never run.
    overlayRef.overlayElement.querySelector<HTMLElement>('[role="listbox"]')?.focus();
  }
}

/**
 * Declare a column's select editor and its choices, type-checked.
 *
 * ⚠️ **The reason this exists rather than a hand-written object literal**:
 * `editorInputs` is `Record<string, unknown>` and the adapter applies only the keys
 * a component actually declares as inputs, so `{ option: [...] }` or
 * `{ items: [...] }` is dropped in silence — the panel renders empty and reads as a
 * data problem rather than a typo. Going through here makes the key a compile error
 * instead.
 *
 * ```ts
 * meta: { ngeEdit: ngeCellSelectEdit(STATUS_OPTIONS, { label: 'Edit status' }) }
 * ```
 *
 * ⚠️ **`alwaysLive` defaults to `true` here, unlike every other editor**, and the
 * reason is ARCH-293's checkbox argument rather than a new one. Activation exists to
 * avoid building controls nobody engaged; what it saves for a select is a `<button>`
 * per visible row, while what it costs is a click to activate *before* the click that
 * opens — and a cell that renders as bare text gives a user no way to know the column
 * is a select at all. **The expensive half is deferred regardless**: the overlay, the
 * portal and the option list are constructed on open and never before, so thirty
 * visible rows still cost zero panels.
 *
 * Pass `alwaysLive: false` for the opposite trade — a dense read-mostly grid where the
 * triggers would be visual noise. Note that this also makes the two-stage `Escape`
 * fully observable, since there is then an activation for the second press to cancel.
 */
export function ngeCellSelectEdit(
  options: readonly NgeCellSelectOption[],
  extra?: { alwaysLive?: boolean; label?: string; placeholder?: string }
): NgeColumnEdit {
  const { alwaysLive = true, ...inputs } = extra ?? {};

  return {
    alwaysLive,
    editor: NgeCellSelectComponent,
    editorInputs: { options, ...inputs },
    enabled: true,
  };
}
