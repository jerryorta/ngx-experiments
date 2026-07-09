import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';

import { DlcPersonaCardComponent } from './dlc-persona-card.component';

describe('DlcPersonaCardComponent', () => {
  let component: DlcPersonaCardComponent;
  let fixture: ComponentFixture<DlcPersonaCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcPersonaCardComponent],
      providers: [provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcPersonaCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-persona-card host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-persona-card')).toBe(true);
  });

  it('should apply broker modifier class by default', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-persona-card--broker')).toBe(true);
  });

  it('should apply buyer modifier class when persona is buyer', () => {
    fixture.componentRef.setInput('persona', 'buyer');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-persona-card--buyer')).toBe(true);
    expect(el.classList.contains('dlc-persona-card--broker')).toBe(false);
  });

  it('should apply service-provider modifier class when persona is service-provider', () => {
    fixture.componentRef.setInput('persona', 'service-provider');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-persona-card--service-provider')).toBe(true);
    expect(el.classList.contains('dlc-persona-card--broker')).toBe(false);
  });

  it('should display the correct icon for broker', () => {
    fixture.componentRef.setInput('persona', 'broker');
    fixture.detectChanges();
    expect(component.iconName()).toBe('real_estate_agent');
  });

  it('should display the correct icon for buyer', () => {
    fixture.componentRef.setInput('persona', 'buyer');
    fixture.detectChanges();
    expect(component.iconName()).toBe('diversity_3');
  });

  it('should display the correct icon for service-provider', () => {
    fixture.componentRef.setInput('persona', 'service-provider');
    fixture.detectChanges();
    expect(component.iconName()).toBe('handshake');
  });

  it('should display title and description', () => {
    fixture.componentRef.setInput('title', 'Test Title');
    fixture.componentRef.setInput('description', 'Test description text');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-persona-card__title')?.textContent?.trim()).toBe('Test Title');
    expect(el.querySelector('.dlc-persona-card__description')?.textContent?.trim()).toBe(
      'Test description text'
    );
  });

  it('should render CTA link with ctaRoute as href', () => {
    fixture.componentRef.setInput('ctaRoute', '/for-brokers');
    fixture.componentRef.setInput('ctaLabel', 'Learn more');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const anchor = el.querySelector('.dlc-persona-card__cta') as HTMLAnchorElement;
    expect(anchor).toBeTruthy();
    expect(anchor.getAttribute('href')).toBe('/for-brokers');
    expect(anchor.textContent?.trim()).toContain('Learn more');
  });

  // REX-514 — contact-mode (listing-agent card on the property detail panel).

  it('suppresses the CTA link when ctaRoute is empty (contact-mode default)', () => {
    // Default fixture has empty ctaRoute.
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-persona-card__cta')).toBeNull();
  });

  it('does not render the contact-info block when all contact inputs are null', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="dlc-persona-card-contact-info"]')).toBeNull();
  });

  it('renders the contact-info block with every populated contact field (REX-514)', () => {
    fixture.componentRef.setInput('title', 'Marcus Webb');
    fixture.componentRef.setInput('brokerage', 'Heritage Realty Group');
    fixture.componentRef.setInput('directPhone', '(512) 555-0142');
    fixture.componentRef.setInput('officePhone', '(512) 555-2100');
    fixture.componentRef.setInput('email', 'marcus.webb@heritage-realty.example');
    fixture.componentRef.setInput('license', 'TX-RE-739201');
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const info = el.querySelector('[data-testid="dlc-persona-card-contact-info"]');
    expect(info).not.toBeNull();
    expect(
      el.querySelector('[data-testid="dlc-persona-card-brokerage"]')?.textContent?.trim()
    ).toContain('Heritage Realty Group');
    const directPhone = el.querySelector(
      '[data-testid="dlc-persona-card-direct-phone"] a'
    ) as HTMLAnchorElement | null;
    expect(directPhone?.getAttribute('href')).toBe('tel:(512) 555-0142');
    const officePhone = el.querySelector(
      '[data-testid="dlc-persona-card-office-phone"] a'
    ) as HTMLAnchorElement | null;
    expect(officePhone?.getAttribute('href')).toBe('tel:(512) 555-2100');
    const email = el.querySelector(
      '[data-testid="dlc-persona-card-email"] a'
    ) as HTMLAnchorElement | null;
    expect(email?.getAttribute('href')).toBe('mailto:marcus.webb@heritage-realty.example');
    expect(
      el.querySelector('[data-testid="dlc-persona-card-license"]')?.textContent?.trim()
    ).toContain('TX-RE-739201');
  });

  it('renders only the populated contact rows; null rows are suppressed (REX-514)', () => {
    fixture.componentRef.setInput('brokerage', 'Heritage Realty Group');
    fixture.componentRef.setInput('email', 'marcus.webb@heritage-realty.example');
    // directPhone / officePhone / license stay null.
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('[data-testid="dlc-persona-card-brokerage"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="dlc-persona-card-email"]')).not.toBeNull();
    expect(el.querySelector('[data-testid="dlc-persona-card-direct-phone"]')).toBeNull();
    expect(el.querySelector('[data-testid="dlc-persona-card-office-phone"]')).toBeNull();
    expect(el.querySelector('[data-testid="dlc-persona-card-license"]')).toBeNull();
  });
});
