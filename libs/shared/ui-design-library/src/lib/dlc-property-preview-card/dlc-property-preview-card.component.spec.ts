import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { DlcPropertyPreviewCardData } from './dlc-property-preview-card.model';

import { DlcPropertyPreviewCardComponent } from './dlc-property-preview-card.component';

const FIXTURE: DlcPropertyPreviewCardData = {
  addressLine1: '4821 Elmwood Terrace',
  addressLine2: 'Austin, TX 78745',
  baths: 3,
  beds: 4,
  id: 'mls-501',
  photoUrl: 'https://img/photo.jpg',
  price: 875000,
  sqft: 2640,
};

describe('DlcPropertyPreviewCardComponent', () => {
  let component: DlcPropertyPreviewCardComponent;
  let fixture: ComponentFixture<DlcPropertyPreviewCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcPropertyPreviewCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcPropertyPreviewCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('property', FIXTURE);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-property-preview-card host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-property-preview-card')).toBe(true);
  });

  it('should render the photo with the street address as alt text', () => {
    const img: HTMLImageElement | null = fixture.nativeElement.querySelector(
      '.dlc-property-preview-card__photo'
    );
    expect(img?.src).toBe(FIXTURE.photoUrl);
    expect(img?.alt).toBe(FIXTURE.addressLine1);
    expect(
      fixture.nativeElement.querySelector('.dlc-property-preview-card__photo-fallback')
    ).toBeNull();
  });

  it('should render the no-photo fallback when photoUrl is null', () => {
    fixture.componentRef.setInput('property', { ...FIXTURE, photoUrl: null });
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dlc-property-preview-card__photo')).toBeNull();
    expect(
      fixture.nativeElement.querySelector('.dlc-property-preview-card__photo-fallback')
    ).toBeTruthy();
  });

  it('should render the formatted price', () => {
    expect(
      fixture.nativeElement.querySelector('.dlc-property-preview-card__price')?.textContent
    ).toContain('$875,000');
  });

  it('should render beds, baths, and formatted sqft', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-property-preview-card__beds')?.textContent).toContain('4 bd');
    expect(el.querySelector('.dlc-property-preview-card__baths')?.textContent).toContain('3 ba');
    expect(el.querySelector('.dlc-property-preview-card__sqft')?.textContent).toContain(
      '2,640 sqft'
    );
  });

  it('should hide individual specs when null', () => {
    fixture.componentRef.setInput('property', { ...FIXTURE, baths: null, sqft: null });
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-property-preview-card__beds')?.textContent).toContain('4 bd');
    expect(el.querySelector('.dlc-property-preview-card__baths')).toBeNull();
    expect(el.querySelector('.dlc-property-preview-card__sqft')).toBeNull();
  });

  it('should render both address lines', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-property-preview-card__address')?.textContent).toContain(
      FIXTURE.addressLine1
    );
    expect(el.querySelector('.dlc-property-preview-card__address-secondary')?.textContent).toContain(
      'Austin, TX 78745'
    );
  });

  it('should hide the secondary address line when absent', () => {
    fixture.componentRef.setInput('property', { ...FIXTURE, addressLine2: null });
    fixture.detectChanges();
    expect(
      fixture.nativeElement.querySelector('.dlc-property-preview-card__address-secondary')
    ).toBeNull();
  });

  it('should emit closed when the close affordance is clicked', () => {
    let emitted = false;
    component.closed.subscribe(() => {
      emitted = true;
    });
    const closeBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
      '[data-testid="property-preview-close"]'
    );
    closeBtn.click();
    expect(emitted).toBe(true);
  });

  it('should emit seeDetails with the listing id when the CTA is clicked', () => {
    let emitted: null | string = null;
    component.seeDetails.subscribe((id: string) => {
      emitted = id;
    });
    const cta: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="property-preview-see-details"] button'
    );
    cta.click();
    expect(emitted).toBe(FIXTURE.id);
  });
});
