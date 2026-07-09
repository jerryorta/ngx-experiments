import type { OverlayRef } from '@angular/cdk/overlay';
import type { OnDestroy } from '@angular/core';

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

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/** Concierge theme classes — propagated into the CDK overlay pane so the
 *  panel's `--dlc-*` tokens resolve against the active theme. */
const CG_THEME_CLASSES = [
  'dlc-professional-light',
  'dlc-professional-dark',
  'dlc-home-light',
  'dlc-home-dark',
  'dlc-service-provider-light',
  'dlc-service-provider-dark',
];

/**
 * Compact filter-popover primitive — a labelled trigger button that opens an
 * anchored CDK overlay hosting projected filter controls.
 *
 * Two-component pattern (REX-483): this primitive owns ONLY the trigger button
 * and the overlay shell. The filter body is projected via `<ng-content>` and
 * binds to whatever the consumer wires it to — the primitive is store- and
 * Firebase-agnostic, reviewable in Storybook in isolation.
 *
 * ```html
 * <dlc-filter-popover label="Beds" [active]="bedsActive()" valueLabel="3+">
 *   <dlc-select … />
 * </dlc-filter-popover>
 * ```
 *
 * The overlay anchors to the trigger and prefers below-start, falling back to
 * above-start / below-end / above-end, always pushed back inside the viewport
 * (`withPush(true)`). Closes on backdrop click, Escape, or a second trigger
 * click. Mirrors the established `dlc-note-overlay` CDK pattern.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-filter-popover',
  },
  imports: [DlcIconDirective],
  selector: 'dlc-filter-popover',
  styleUrl: './dlc-filter-popover.component.scss',
  templateUrl: './dlc-filter-popover.component.html',
})
export class DlcFilterPopoverComponent implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly viewContainerRef = inject(ViewContainerRef);

  @ViewChild('trigger', { read: ElementRef }) private triggerRef!: ElementRef<HTMLElement>;
  @ViewChild('panelTpl', { read: TemplateRef }) private panelTpl!: TemplateRef<unknown>;

  private overlayRef: null | OverlayRef = null;

  // ---------------------------------------------------------------------------
  // Inputs
  // ---------------------------------------------------------------------------

  /** Trigger label (e.g. "Price", "Beds"). */
  readonly label = input.required<string>();

  /** Drives the active/selected visual state on the trigger. */
  readonly active = input(false);

  /** Short summary of the current value, shown on the trigger when `active`. */
  readonly valueLabel = input('');

  /** When true, the panel renders a "Clear" affordance that emits `cleared`. */
  readonly clearable = input(false);

  // ---------------------------------------------------------------------------
  // Outputs
  // ---------------------------------------------------------------------------

  /** Emits when the panel opens. */
  readonly opened = output<void>();

  /** Emits when the panel closes (backdrop / Escape / toggle / clear / done). */
  readonly closed = output<void>();

  /** Emits when the user clicks the in-panel "Clear" button. */
  readonly cleared = output<void>();

  // ---------------------------------------------------------------------------
  // Internal state
  // ---------------------------------------------------------------------------

  protected readonly isOpen = signal(false);

  // ---------------------------------------------------------------------------
  // Public API
  // ---------------------------------------------------------------------------

  toggle(): void {
    if (this.overlayRef) this.close();
    else this.open();
  }

  open(): void {
    if (this.overlayRef) return;
    this.createOverlay(this.triggerRef.nativeElement);
    this.isOpen.set(true);
    this.opened.emit();
  }

  close(): void {
    if (!this.overlayRef) return;
    this.destroyOverlay();
    this.isOpen.set(false);
    this.closed.emit();
  }

  // ---------------------------------------------------------------------------
  // Template handlers
  // ---------------------------------------------------------------------------

  protected onClear(): void {
    this.cleared.emit();
    this.close();
  }

  ngOnDestroy(): void {
    this.destroyOverlay();
  }

  // ---------------------------------------------------------------------------
  // CDK overlay
  // ---------------------------------------------------------------------------

  private createOverlay(anchor: Element): void {
    const themeClass = this.resolveThemeClass();
    const panelClasses = ['dlc-filter-popover__panel'];
    if (themeClass) panelClasses.push(themeClass);

    this.overlayRef = this.overlay.create({
      backdropClass: 'dlc-filter-popover__backdrop',
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

    // Close on backdrop click and on Escape (subscriptions auto-complete on dispose).
    this.overlayRef.backdropClick().subscribe(() => this.close());
    this.overlayRef.keydownEvents().subscribe(event => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        this.close();
      }
    });

    const portal = new TemplatePortal(this.panelTpl, this.viewContainerRef);
    this.overlayRef.attach(portal);
  }

  private destroyOverlay(): void {
    if (this.overlayRef) {
      this.overlayRef.dispose();
      this.overlayRef = null;
    }
  }

  /**
   * Walks up the DOM tree from the trigger to find the active Concierge theme
   * class and propagate it into the CDK overlay pane so its CSS variables
   * resolve correctly (the pane is rendered outside the themed host subtree).
   */
  private resolveThemeClass(): null | string {
    let el: Element | null = this.triggerRef.nativeElement;
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
