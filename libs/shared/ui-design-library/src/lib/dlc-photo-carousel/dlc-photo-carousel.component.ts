import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/**
 * Read-only photo-gallery carousel for the concierge property detail panel
 * (REX-497 — Detail-panel enrichment 1/3). Renders a single hero image with
 * prev / next controls, an optional thumbnail strip, and a full-screen
 * lightbox; **no upload or delete affordance**. Driven by a plain `string[]`
 * of image URLs so it can sit beside any property view-model without coupling.
 *
 * Empty / single-photo states render gracefully: the image area falls back to
 * an icon placeholder; carousel controls + thumbnail strip hide when there is
 * less than two photos.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-photo-carousel' },
  imports: [DlcIconDirective],
  selector: 'dlc-photo-carousel',
  styleUrl: './dlc-photo-carousel.component.scss',
  templateUrl: './dlc-photo-carousel.component.html',
})
export class DlcPhotoCarouselComponent {
  /** Ordered photo URLs to display. Empty array renders a placeholder. */
  readonly photos = input<string[]>([]);

  /**
   * Accessible alt text base; combined with the 1-based position when there
   * is more than one photo (e.g. `"4821 Elmwood Terrace — photo 2 of 5"`).
   */
  readonly altText = input('Photo');

  /** Emitted when the user navigates to a different photo. */
  readonly indexChange = output<number>();

  /** 0-based index of the photo currently displayed. */
  protected readonly currentIndex = signal(0);

  /** Whether the lightbox overlay is open. */
  protected readonly lightboxOpen = signal(false);

  /** Clamped photo URL — `null` when the photos list is empty. */
  readonly currentUrl = computed((): null | string => {
    const photos = this.photos();
    if (photos.length === 0) {
      return null;
    }
    return photos[Math.min(this.currentIndex(), photos.length - 1)];
  });

  /** Carousel controls + thumbnail strip render only when there are 2+ photos. */
  readonly hasMultiplePhotos = computed(() => this.photos().length > 1);

  /** `2 / 5` position label — `null` when there is one or zero photos. */
  readonly positionLabel = computed((): null | string => {
    const count = this.photos().length;
    if (count <= 1) {
      return null;
    }
    const oneBased = Math.min(this.currentIndex(), count - 1) + 1;
    return `${oneBased} / ${count}`;
  });

  /** Per-image alt text, with position suffix when there is more than one. */
  readonly currentAltText = computed((): string => {
    const base = this.altText();
    const label = this.positionLabel();
    return label ? `${base} — photo ${label}` : base;
  });

  constructor() {
    // Keep currentIndex in-range when the photos list shortens.
    effect(() => {
      const count = this.photos().length;
      if (count === 0) {
        this.currentIndex.set(0);
        return;
      }
      if (this.currentIndex() >= count) {
        this.currentIndex.set(0);
      }
    });
  }

  protected next(): void {
    const count = this.photos().length;
    if (count <= 1) {
      return;
    }
    this.currentIndex.update(i => (i + 1) % count);
    this.indexChange.emit(this.currentIndex());
  }

  protected prev(): void {
    const count = this.photos().length;
    if (count <= 1) {
      return;
    }
    this.currentIndex.update(i => (i - 1 + count) % count);
    this.indexChange.emit(this.currentIndex());
  }

  protected goTo(index: number): void {
    const count = this.photos().length;
    if (count === 0 || index < 0 || index >= count) {
      return;
    }
    this.currentIndex.set(index);
    this.indexChange.emit(index);
  }

  protected openLightbox(): void {
    if (this.photos().length === 0) {
      return;
    }
    this.lightboxOpen.set(true);
  }

  protected closeLightbox(): void {
    this.lightboxOpen.set(false);
  }

  protected onLightboxKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'Escape':
        this.closeLightbox();
        break;
      case 'ArrowRight':
        this.next();
        break;
      case 'ArrowLeft':
        this.prev();
        break;
    }
  }

  protected onLightboxBackdropClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dlc-photo-carousel__lightbox')) {
      this.closeLightbox();
    }
  }
}
