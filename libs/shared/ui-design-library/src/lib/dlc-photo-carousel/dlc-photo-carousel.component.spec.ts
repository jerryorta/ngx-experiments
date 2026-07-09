import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcPhotoCarouselComponent } from './dlc-photo-carousel.component';

describe('DlcPhotoCarouselComponent', () => {
  const PHOTOS = ['https://img.test/a.jpg', 'https://img.test/b.jpg', 'https://img.test/c.jpg'];

  let component: DlcPhotoCarouselComponent;
  let fixture: ComponentFixture<DlcPhotoCarouselComponent>;
  let el: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcPhotoCarouselComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcPhotoCarouselComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  function img(): HTMLImageElement | null {
    return el.querySelector('.dlc-photo-carousel__photo');
  }

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('applies the dlc-photo-carousel host class', () => {
    expect(el.classList.contains('dlc-photo-carousel')).toBe(true);
  });

  describe('empty state', () => {
    it('renders the placeholder icon and no controls when photos is empty', () => {
      expect(img()).toBeNull();
      expect(el.querySelector('[data-testid="photo-carousel-next"]')).toBeNull();
      expect(el.querySelector('[data-testid="photo-carousel-prev"]')).toBeNull();
      expect(el.querySelector('[data-testid="photo-carousel-position"]')).toBeNull();
      expect(el.querySelector('.dlc-photo-carousel__thumbnails')).toBeNull();
    });
  });

  describe('single photo', () => {
    it('renders the photo with no carousel controls', () => {
      fixture.componentRef.setInput('photos', [PHOTOS[0]]);
      fixture.detectChanges();
      expect(img()?.src).toBe(PHOTOS[0]);
      expect(el.querySelector('[data-testid="photo-carousel-next"]')).toBeNull();
      expect(el.querySelector('[data-testid="photo-carousel-prev"]')).toBeNull();
      expect(el.querySelector('[data-testid="photo-carousel-position"]')).toBeNull();
      expect(el.querySelector('.dlc-photo-carousel__thumbnails')).toBeNull();
    });
  });

  describe('multi-photo carousel', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('photos', PHOTOS);
      fixture.detectChanges();
    });

    it('renders the first photo + the 1 / N position label', () => {
      expect(img()?.src).toBe(PHOTOS[0]);
      expect(el.querySelector('[data-testid="photo-carousel-position"]')?.textContent?.trim()).toBe(
        '1 / 3'
      );
    });

    it('renders a thumbnail strip with one entry per photo', () => {
      const thumbs = el.querySelectorAll('[data-testid="photo-carousel-thumbnail"]');
      expect(thumbs.length).toBe(PHOTOS.length);
    });

    it('cycles forward and wraps with the next button, emitting indexChange', () => {
      const emitted: number[] = [];
      component.indexChange.subscribe((v: number) => emitted.push(v));
      const next: HTMLButtonElement = el.querySelector('[data-testid="photo-carousel-next"]')!;

      next.click();
      fixture.detectChanges();
      expect(img()?.src).toBe(PHOTOS[1]);

      next.click();
      next.click();
      fixture.detectChanges();
      // 3 clicks from index 0 wraps back to the first photo.
      expect(img()?.src).toBe(PHOTOS[0]);
      expect(emitted).toEqual([1, 2, 0]);
    });

    it('cycles backward and wraps with the prev button', () => {
      const prev: HTMLButtonElement = el.querySelector('[data-testid="photo-carousel-prev"]')!;
      prev.click();
      fixture.detectChanges();
      expect(img()?.src).toBe(PHOTOS[2]);
    });

    it('jumps to a specific photo via thumbnail click', () => {
      const emitted: number[] = [];
      component.indexChange.subscribe((v: number) => emitted.push(v));
      const thumbs = el.querySelectorAll<HTMLButtonElement>(
        '[data-testid="photo-carousel-thumbnail"]'
      );
      thumbs[2].click();
      fixture.detectChanges();
      expect(img()?.src).toBe(PHOTOS[2]);
      expect(emitted).toEqual([2]);
    });

    it('rebases currentIndex to 0 when the photos list shortens past the current position', () => {
      // Move to index 2 first.
      const next: HTMLButtonElement = el.querySelector('[data-testid="photo-carousel-next"]')!;
      next.click();
      next.click();
      fixture.detectChanges();
      expect(img()?.src).toBe(PHOTOS[2]);

      // Now shrink the list to one photo — the carousel should fall back to the first.
      fixture.componentRef.setInput('photos', [PHOTOS[0]]);
      fixture.detectChanges();
      expect(img()?.src).toBe(PHOTOS[0]);
    });
  });

  describe('lightbox', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('photos', PHOTOS);
      fixture.detectChanges();
    });

    function lightbox(): HTMLElement | null {
      return el.querySelector('.dlc-photo-carousel__lightbox');
    }

    it('opens on hero-image click and closes on the close button', () => {
      const hero: HTMLButtonElement = el.querySelector('.dlc-photo-carousel__photo')
        ?.parentElement as HTMLButtonElement;
      hero.click();
      fixture.detectChanges();
      expect(lightbox()).not.toBeNull();

      const close: HTMLButtonElement = el.querySelector(
        '[data-testid="photo-carousel-lightbox-close"]'
      )!;
      close.click();
      fixture.detectChanges();
      expect(lightbox()).toBeNull();
    });

    it('navigates with arrow keys and closes with Escape', () => {
      const hero: HTMLButtonElement = el.querySelector('.dlc-photo-carousel__photo')
        ?.parentElement as HTMLButtonElement;
      hero.click();
      fixture.detectChanges();

      lightbox()!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowRight' }));
      fixture.detectChanges();
      expect(img()?.src).toBe(PHOTOS[1]);

      lightbox()!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowLeft' }));
      fixture.detectChanges();
      expect(img()?.src).toBe(PHOTOS[0]);

      lightbox()!.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' }));
      fixture.detectChanges();
      expect(lightbox()).toBeNull();
    });
  });

  describe('alt text', () => {
    it('combines altText with a "photo X / Y" suffix when there are multiple photos', () => {
      fixture.componentRef.setInput('altText', '4821 Elmwood Terrace');
      fixture.componentRef.setInput('photos', PHOTOS);
      fixture.detectChanges();
      expect(img()?.alt).toBe('4821 Elmwood Terrace — photo 1 / 3');
    });

    it('uses the bare altText when there is exactly one photo', () => {
      fixture.componentRef.setInput('altText', 'Hero photo');
      fixture.componentRef.setInput('photos', [PHOTOS[0]]);
      fixture.detectChanges();
      expect(img()?.alt).toBe('Hero photo');
    });
  });
});
