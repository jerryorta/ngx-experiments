import type { OverlayRef } from '@angular/cdk/overlay';
import type { AfterViewInit, OnDestroy } from '@angular/core';

import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  input,
  output,
  signal,
  TemplateRef,
  ViewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';

/** Concierge theme classes — propagated into the CDK overlay pane. */
const CG_THEME_CLASSES = [
  'dlc-professional-light',
  'dlc-professional-dark',
  'dlc-home-light',
  'dlc-home-dark',
  'dlc-service-provider-light',
  'dlc-service-provider-dark',
];

/**
 * Reusable note-entry overlay anchored to its host element.
 *
 * Usage:
 * ```html
 * <dlc-note-overlay
 *   placeholder="Type a note…"
 *   (saved)="onNoteSaved($event)"
 * >
 *   <button type="button">Open</button>
 * </dlc-note-overlay>
 * ```
 *
 * Clicking ANY element inside the component (via event bubbling to the host)
 * opens the CDK overlay.  The overlay is anchored to the host and prefers to
 * open below-start, falling back to above-start, below-end, above-end — always
 * pushed back inside the viewport with `withPush(true)`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '(click)': 'open($event)',
    class: 'dlc-note-overlay',
  },
  imports: [],
  selector: 'dlc-note-overlay',
  styleUrl: './dlc-note-overlay.component.scss',
  templateUrl: './dlc-note-overlay.component.html',
})
export class DlcNoteOverlayComponent implements AfterViewInit, OnDestroy {
  private readonly elementRef = inject(ElementRef);
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('panelTpl', { read: TemplateRef }) private panelTpl!: TemplateRef<unknown>;

  private overlayRef: null | OverlayRef = null;

  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  /** Textarea placeholder text. */
  readonly placeholder = input('Type a note…');

  /** Label for the save/confirm button. */
  readonly saveLabel = input('Save');

  /** Label for the cancel/dismiss button. */
  readonly cancelLabel = input('Cancel');

  /**
   * Pre-fills the textarea when the overlay opens.
   * Pass the existing note text to edit an existing note.
   */
  readonly initialValue = input('');

  /**
   * When non-empty, shows an optional single-line header input above the
   * textarea. The string is used as the input's placeholder.
   */
  readonly headerPlaceholder = input('');

  /** Pre-fills the header input when editing an existing custom note. */
  readonly initialHeaderValue = input('');

  /**
   * When true, the overlay opens automatically on `ngAfterViewInit`.
   * Use this to programmatically trigger the panel after mounting the component.
   */
  readonly autoOpen = input(false);

  /**
   * When false, the textarea is hidden and the header input becomes the sole
   * required field. Use when you only need a single-line title entry.
   * Defaults to true (normal note mode).
   */
  readonly showTextarea = input(true);

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  /** Emits the trimmed note text when the user saves. */
  readonly saved = output<string>();

  /** Emits when the user cancels without saving. */
  readonly cancelled = output<void>();

  /**
   * Emits `{ header, note }` when the user saves and `headerPlaceholder` is set.
   * Use this output instead of `saved` when you need both fields.
   */
  readonly savedFull = output<{ header: string; note: string }>();

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  protected readonly draftText = signal('');
  protected readonly headerDraft = signal('');

  // ---------------------------------------------------------------------------
  // Lifecycle
  // ---------------------------------------------------------------------------

  ngAfterViewInit(): void {
    if (this.autoOpen()) {
      // Defer one frame so the host has been laid out and has a bounding rect.
      requestAnimationFrame(() => { this.open(); });
    }
  }

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  open(event?: MouseEvent): void {
    if (this.overlayRef) return; // already open
    this.draftText.set(this.initialValue());
    this.headerDraft.set(this.initialHeaderValue());
    // Anchor to the clicked element (button / link) so the overlay appears
    // directly adjacent to the trigger, not to the invisible host box.
    // Falls back to the first child element or the host itself.
    const target = event?.target as Element | null;
    const anchor: Element =
      target?.closest('button, a, [role="button"]') ??
      (this.elementRef.nativeElement as HTMLElement).firstElementChild ??
      this.elementRef.nativeElement;
    this.createOverlay(anchor);
  }

  close(): void {
    this.destroyOverlay();
  }

  // ---------------------------------------------------------------------------
  // Template handlers
  // ---------------------------------------------------------------------------

  protected onSave(): void {
    if (!this.showTextarea()) {
      // Header-only mode — header is the required field
      const header = this.headerDraft().trim();
      if (!header) return;
      this.savedFull.emit({ header, note: '' });
      this.close();
      return;
    }
    const text = this.draftText().trim();
    if (!text) {
      this.close();
      return;
    }
    this.saved.emit(text);
    if (this.headerPlaceholder()) {
      this.savedFull.emit({ header: this.headerDraft().trim(), note: text });
    }
    this.close();
  }

  protected onCancel(): void {
    this.cancelled.emit();
    this.close();
  }

  protected onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      event.stopPropagation();
      this.onCancel();
    } else if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      event.stopPropagation();
      this.onSave();
    }
  }

  ngOnDestroy(): void {
    this.destroyOverlay();
  }

  // ---------------------------------------------------------------------------
  // CDK overlay
  // ---------------------------------------------------------------------------

  private createOverlay(anchor: Element): void {
    const themeClass = this.resolveThemeClass();
    const panelClasses = ['dlc-note-overlay__panel'];
    if (themeClass) panelClasses.push(themeClass);

    this.overlayRef = this.overlay.create({
      backdropClass: 'dlc-note-overlay__backdrop',
      hasBackdrop: true,
      panelClass: panelClasses,
      positionStrategy: this.overlay
        .position()
        .flexibleConnectedTo(anchor)
        .withPositions([
          // Preferred: open below-start
          { offsetY: 4, originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
          // Fallback: open above-start
          { offsetY: -4, originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
          // Fallback: open below-end (near right viewport edge)
          { offsetY: 4, originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
          // Fallback: open above-end
          { offsetY: -4, originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
        ])
        .withFlexibleDimensions(false)
        .withPush(true),
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });

    // Click-outside-to-cancel — but exclude clicks on the host itself
    // (handled by the host click handler which calls open(), which is a no-op
    // while the overlay is already open).
    this.overlayRef.backdropClick().subscribe(() => this.onCancel());

    const portal = new TemplatePortal(this.panelTpl, this.viewContainerRef);
    this.overlayRef.attach(portal);

    // Focus the first input on the next frame after the panel has been rendered.
    // In textarea mode focus the textarea; in header-only mode focus the header input.
    requestAnimationFrame(() => {
      const panel = this.overlayRef?.overlayElement;
      if (!panel) return;
      const focusTarget =
        panel.querySelector<HTMLTextAreaElement>('textarea') ??
        panel.querySelector<HTMLInputElement>('input');
      focusTarget?.focus();
    });
  }

  private destroyOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  /**
   * Walks up the DOM tree to find the active Concierge theme class and
   * propagate it into the CDK overlay pane so CSS variables resolve correctly.
   */
  private resolveThemeClass(): null | string {
    let el: Element | null = this.elementRef.nativeElement;
    while (el) {
      for (const cls of CG_THEME_CLASSES) {
        if (el.classList.contains(cls)) return cls;
      }
      el = el.parentElement;
    }
    for (const cls of CG_THEME_CLASSES) {
      if (document.body.classList.contains(cls)) return cls;
    }
    return null;
  }
}
