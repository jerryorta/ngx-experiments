import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcInputComponent } from './dlc-input.component';

describe('DlcInputComponent', () => {
  let component: DlcInputComponent;
  let fixture: ComponentFixture<DlcInputComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-input host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-input')).toBe(true);
  });

  it('should render label when label input is set', () => {
    fixture.componentRef.setInput('label', 'Email Address');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const label = el.querySelector('.dlc-input__label');
    expect(label?.textContent?.trim()).toBe('Email Address');
  });

  it('should show error text when errorText is set', () => {
    fixture.componentRef.setInput('errorText', 'This field is required');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const errorEl = el.querySelector('.dlc-input__error');
    expect(errorEl?.textContent?.trim()).toBe('This field is required');
  });

  it('should update value via writeValue (CVA)', () => {
    component.writeValue('hello');
    fixture.detectChanges();
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    expect(input.value).toBe('hello');
  });

  it('does not render the visibility toggle when allowVisibilityToggle is false', () => {
    fixture.componentRef.setInput('type', 'password');
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector(
      '[data-testid="dlc-input-visibility-toggle"]'
    );
    expect(toggle).toBeNull();
  });

  it('does not render the visibility toggle for non-password fields', () => {
    fixture.componentRef.setInput('type', 'email');
    fixture.componentRef.setInput('allowVisibilityToggle', true);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector(
      '[data-testid="dlc-input-visibility-toggle"]'
    );
    expect(toggle).toBeNull();
  });

  it('renders the visibility toggle for password fields when allowVisibilityToggle is true', () => {
    fixture.componentRef.setInput('type', 'password');
    fixture.componentRef.setInput('allowVisibilityToggle', true);
    fixture.detectChanges();
    const toggle = fixture.nativeElement.querySelector(
      '[data-testid="dlc-input-visibility-toggle"]'
    ) as HTMLButtonElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    expect(toggle).not.toBeNull();
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
    expect(input.type).toBe('password');
  });

  it('toggles input type and aria state when the visibility button is clicked', () => {
    fixture.componentRef.setInput('type', 'password');
    fixture.componentRef.setInput('allowVisibilityToggle', true);
    fixture.detectChanges();

    const toggle = fixture.nativeElement.querySelector(
      '[data-testid="dlc-input-visibility-toggle"]'
    ) as HTMLButtonElement;
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;

    toggle.click();
    fixture.detectChanges();

    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');
    expect(toggle.getAttribute('aria-pressed')).toBe('true');

    toggle.click();
    fixture.detectChanges();

    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-pressed')).toBe('false');
  });
});
