import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcButtonComponent } from './dlc-button.component';

describe('DlcButtonComponent', () => {
  let component: DlcButtonComponent;
  let fixture: ComponentFixture<DlcButtonComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcButtonComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcButtonComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-button host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-button')).toBe(true);
  });

  it('should apply variant class', () => {
    fixture.componentRef.setInput('variant', 'ghost');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-button--ghost')).toBe(true);
    expect(el.classList.contains('dlc-button--primary')).toBe(false);
  });

  it('should apply size class', () => {
    fixture.componentRef.setInput('size', 'lg');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-button--lg')).toBe(true);
  });

  it('should apply disabled class and disable native button', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-button--disabled')).toBe(true);
    const button = el.querySelector('button');
    expect(button?.hasAttribute('disabled')).toBe(true);
  });

  it('should apply loading class and show spinner', () => {
    fixture.componentRef.setInput('loading', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-button--loading')).toBe(true);
    expect(el.querySelector('.dlc-button__spinner')).toBeTruthy();
  });

  it('should default to primary variant and md size', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-button--primary')).toBe(true);
    expect(el.classList.contains('dlc-button--md')).toBe(true);
  });
});
