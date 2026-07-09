import type { FocusTrap } from '@angular/cdk/a11y';
import type { OnDestroy } from '@angular/core';

import { A11yModule, FocusTrapFactory } from '@angular/cdk/a11y';
import { DOCUMENT } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  HostListener,
  inject,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

export type DlcDialogSize = 'lg' | 'md' | 'sm';

/**
 * Generic, themed, accessible modal dialog shell for the Concierge domain.
 *
 * Composes the template-picker visual shell (overlay + rounded panel + close
 * affordance) with CDK focus-trap mechanics, and adds two affordances no other
 * concierge modal provides: focus is restored to the element that opened the
 * dialog on close, and body scroll is locked while the dialog is open. Feature
 * code projects its own header / body / footer via the
 * `[dlc-dialog-title]` / `[dlc-dialog-content]` / `[dlc-dialog-actions]` slots so
 * it never has to hand-roll visible/dismiss/Escape/backdrop scaffolding (or
 * reach for the forbidden `@angular/material/dialog`).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-dialog' },
  imports: [A11yModule, DlcIconDirective],
  selector: 'dlc-dialog',
  styleUrl: './dlc-dialog.component.scss',
  templateUrl: './dlc-dialog.component.html',
})
export class DlcDialogComponent implements OnDestroy {
  /** Whether the dialog is currently shown. Drives DOM presence + focus trap. */
  readonly visible = input(false);

  /** Panel width preset — `sm` (400px), `md` (520px), `lg` (720px). */
  readonly size = input<DlcDialogSize>('md');

  /** Accessible label applied to the dialog element via `aria-label`. */
  readonly ariaLabel = input('');

  /** When true (default), clicking the scrim outside the panel dismisses. */
  readonly dismissOnBackdropClick = input(true);

  /** When true (default), pressing Escape dismisses. */
  readonly dismissOnEscape = input(true);

  /** When true (default), renders the top-right close button. */
  readonly showCloseButton = input(true);

  /** Emits when the user requests dismissal (backdrop, Escape, or close button). */
  readonly dismissed = output<void>();

  readonly #document = inject(DOCUMENT);
  readonly #el = inject(ElementRef<HTMLElement>);
  readonly #focusTrapFactory = inject(FocusTrapFactory);

  #focusTrap: FocusTrap | null = null;
  /** Element focused immediately before the dialog opened — restored on close. */
  #trigger: HTMLElement | null = null;
  /** Body `overflow` value captured before scroll-lock — restored on close. */
  #prevOverflow = '';
  /** Tracks whether scroll-lock + focus-restore are pending teardown. */
  #engaged = false;

  constructor() {
    effect(() => {
      if (this.visible()) {
        this.#engage();
      } else {
        this.#release();
      }
    });
  }

  ngOnDestroy(): void {
    this.#release();
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.visible() && this.dismissOnEscape()) {
      this.dismissed.emit();
    }
  }

  protected onBackdropClick(event: MouseEvent): void {
    if (!this.dismissOnBackdropClick()) return;
    if ((event.target as HTMLElement).classList.contains('dlc-dialog__overlay')) {
      this.dismissed.emit();
    }
  }

  protected onCloseClick(): void {
    this.dismissed.emit();
  }

  /** Capture trigger, lock scroll, and engage the focus trap after paint. */
  #engage(): void {
    if (this.#engaged) return;
    this.#engaged = true;

    this.#trigger = this.#document.activeElement as HTMLElement | null;

    const body = this.#document.body;
    this.#prevOverflow = body.style.overflow;
    body.style.overflow = 'hidden';

    // Run after the panel is painted so the focus trap can find a target.
    requestAnimationFrame(() => {
      const panel = this.#el.nativeElement.querySelector('.dlc-dialog__panel') as HTMLElement | null;
      if (panel) {
        this.#destroyFocusTrap();
        this.#focusTrap = this.#focusTrapFactory.create(panel);
        this.#focusTrap.focusInitialElementWhenReady();
      }
    });
  }

  /** Tear down the focus trap, unlock scroll, and restore focus to the trigger. */
  #release(): void {
    if (!this.#engaged) return;
    this.#engaged = false;

    this.#destroyFocusTrap();
    this.#document.body.style.overflow = this.#prevOverflow;
    this.#prevOverflow = '';

    const trigger = this.#trigger;
    this.#trigger = null;
    trigger?.focus();
  }

  #destroyFocusTrap(): void {
    if (this.#focusTrap) {
      this.#focusTrap.destroy();
      this.#focusTrap = null;
    }
  }
}
