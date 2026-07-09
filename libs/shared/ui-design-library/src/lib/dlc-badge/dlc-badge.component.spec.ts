import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcBadgeComponent } from './dlc-badge.component';

describe('DlcBadgeComponent', () => {
  let component: DlcBadgeComponent;
  let fixture: ComponentFixture<DlcBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-badge host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-badge')).toBe(true);
  });

  it('should apply dlc-badge--error class when variant is error', () => {
    fixture.componentRef.setInput('variant', 'error');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-badge--error')).toBe(true);
  });

  it('should apply dlc-badge--accent class when variant is accent', () => {
    fixture.componentRef.setInput('variant', 'accent');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-badge--accent')).toBe(true);
  });

  it('should apply dlc-badge--surface class when variant is surface', () => {
    fixture.componentRef.setInput('variant', 'surface');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-badge--surface')).toBe(true);
  });

  it('should apply dlc-badge--hidden class when visible is false', () => {
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-badge--hidden')).toBe(true);
  });

  it('should show count when count is a number', () => {
    fixture.componentRef.setInput('count', 5);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const countEl = el.querySelector('.dlc-badge__count');
    expect(countEl).toBeTruthy();
    expect(countEl?.textContent?.trim()).toBe('5');
  });

  it('should cap count at 99+', () => {
    fixture.componentRef.setInput('count', 100);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const countEl = el.querySelector('.dlc-badge__count');
    expect(countEl?.textContent?.trim()).toBe('99+');
  });

  it('should show dot only when count is null', () => {
    fixture.componentRef.setInput('count', null);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-badge__count')).toBeNull();
    expect(el.querySelector('.dlc-badge__dot')).toBeTruthy();
  });
});
