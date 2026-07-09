import type { AfterViewInit, OnDestroy } from '@angular/core';

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  signal,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/**
 * Horizontal, scrollable filter bar — lays out projected filter triggers
 * (typically `dlc-filter-popover`s) in a single overflow-x row with scroll
 * affordances: left/right chevron buttons + edge gradient masks that appear
 * only when there is more content to scroll to in that direction.
 *
 * Store- and Firebase-agnostic; the bar just projects `<ng-content>` and owns
 * the scroll mechanics. Ported (pattern only, no Material) from the legacy
 * real-estate `dlc-mls-property-search` scrollable filter bar.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-filter-bar',
  },
  imports: [DlcIconDirective],
  selector: 'dlc-filter-bar',
  styleUrl: './dlc-filter-bar.component.scss',
  templateUrl: './dlc-filter-bar.component.html',
})
export class DlcFilterBarComponent implements AfterViewInit, OnDestroy {
  /** Scroll distance (px) per chevron click. */
  private static readonly SCROLL_STEP = 240;

  @ViewChild('scroll', { read: ElementRef }) private scrollRef!: ElementRef<HTMLElement>;

  private resizeObserver: null | ResizeObserver = null;

  /** True when scrollable content is hidden to the left / right of the track. */
  protected readonly showLeft = signal(false);
  protected readonly showRight = signal(false);

  ngAfterViewInit(): void {
    this.updateIndicators();
    // Recompute affordances whenever the bar or its content resizes.
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(() => this.updateIndicators());
      this.resizeObserver.observe(this.scrollRef.nativeElement);
    }
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.resizeObserver = null;
  }

  protected onScroll(): void {
    this.updateIndicators();
  }

  protected scrollByStep(direction: -1 | 1): void {
    this.scrollRef.nativeElement.scrollBy({
      behavior: 'smooth',
      left: direction * DlcFilterBarComponent.SCROLL_STEP,
    });
  }

  private updateIndicators(): void {
    const el = this.scrollRef.nativeElement;
    const maxScroll = el.scrollWidth - el.clientWidth;
    this.showLeft.set(el.scrollLeft > 1);
    this.showRight.set(el.scrollLeft < maxScroll - 1);
  }
}
