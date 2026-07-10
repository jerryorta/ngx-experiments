import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { LdgIconButtonComponent } from './ldg-icon-button.component';

describe('LdgIconButtonComponent', () => {
  let component: LdgIconButtonComponent;
  let fixture: ComponentFixture<LdgIconButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgIconButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgIconButtonComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('icon', 'delete');
    fixture.componentRef.setInput('ariaLabel', 'Delete transaction');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply ldg-icon-button host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-icon-button')).toBe(true);
  });

  it('should default to the ghost variant', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-icon-button--ghost')).toBe(true);
    expect(el.classList.contains('ldg-icon-button--solid')).toBe(false);
  });

  it('should apply the solid variant class', () => {
    fixture.componentRef.setInput('variant', 'solid');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('ldg-icon-button--solid')).toBe(true);
    expect(el.classList.contains('ldg-icon-button--ghost')).toBe(false);
  });

  it('should render a native button with type="button"', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button?.getAttribute('type')).toBe('button');
  });

  it('should set aria-label on the button', () => {
    const button = fixture.nativeElement.querySelector('button');
    expect(button?.getAttribute('aria-label')).toBe('Delete transaction');
  });

  it('should render the icon glyph via dlcIcon', () => {
    const icon = fixture.nativeElement.querySelector('.ldg-icon-button__icon');
    expect(icon?.textContent?.trim()).toBe('delete');
  });

  it('should not be disabled by default', () => {
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(false);
  });

  it('should disable the native button when disabled is true', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.disabled).toBe(true);
  });

  it('should emit pressed when clicked', () => {
    let emitted = false;
    component.pressed.subscribe(() => (emitted = true));
    fixture.nativeElement.querySelector('button').click();
    expect(emitted).toBe(true);
  });

  it('should not emit pressed when disabled and clicked', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    let emitted = false;
    component.pressed.subscribe(() => (emitted = true));
    fixture.nativeElement.querySelector('button').click();
    expect(emitted).toBe(false);
  });
});
