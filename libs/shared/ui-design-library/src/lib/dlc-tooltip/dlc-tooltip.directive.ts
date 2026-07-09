import type { ConnectionPositionPair, OverlayRef } from '@angular/cdk/overlay';
import type { OnDestroy } from '@angular/core';

import { Overlay } from '@angular/cdk/overlay';
import { ComponentPortal } from '@angular/cdk/portal';
import { Directive, ElementRef, HostListener, inject, input } from '@angular/core';

import { DlcTooltipContentComponent } from './dlc-tooltip-content.component';

@Directive({
  selector: '[dlcTooltip]',
  standalone: true,
})
export class DlcTooltipDirective implements OnDestroy {
  private readonly overlay = inject(Overlay);
  private readonly elementRef = inject(ElementRef);
  private overlayRef: null | OverlayRef = null;

  readonly dlcTooltip = input('');
  readonly dlcTooltipPosition = input<'above' | 'below' | 'left' | 'right'>('above');

  @HostListener('mouseenter')
  onMouseEnter(): void {
    this.show();
  }

  @HostListener('mouseleave')
  onMouseLeave(): void {
    this.hide();
  }

  @HostListener('focus')
  onFocus(): void {
    this.show();
  }

  @HostListener('blur')
  onBlur(): void {
    this.hide();
  }

  ngOnDestroy(): void {
    this.hide();
  }

  private show(): void {
    if (this.overlayRef || !this.dlcTooltip()) return;
    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(this.elementRef)
      .withPositions([this.getPositionPair()]);
    this.overlayRef = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });
    const portal = new ComponentPortal(DlcTooltipContentComponent);
    const ref = this.overlayRef.attach(portal);
    ref.setInput('text', this.dlcTooltip());
  }

  private hide(): void {
    this.overlayRef?.dispose();
    this.overlayRef = null;
  }

  private getPositionPair(): ConnectionPositionPair {
    const pairs: Record<string, ConnectionPositionPair> = {
      above: {
        offsetY: -8,
        originX: 'center',
        originY: 'top',
        overlayX: 'center',
        overlayY: 'bottom',
      },
      below: {
        offsetY: 8,
        originX: 'center',
        originY: 'bottom',
        overlayX: 'center',
        overlayY: 'top',
      },
      left: {
        offsetX: -8,
        originX: 'start',
        originY: 'center',
        overlayX: 'end',
        overlayY: 'center',
      },
      right: {
        offsetX: 8,
        originX: 'end',
        originY: 'center',
        overlayX: 'start',
        overlayY: 'center',
      },
    };
    return pairs[this.dlcTooltipPosition()];
  }
}
