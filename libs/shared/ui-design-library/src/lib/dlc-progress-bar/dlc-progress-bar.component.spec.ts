import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcProgressBarComponent } from './dlc-progress-bar.component';

describe('DlcProgressBarComponent', () => {
  let component: DlcProgressBarComponent;
  let fixture: ComponentFixture<DlcProgressBarComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcProgressBarComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcProgressBarComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-progress-bar host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-progress-bar')).toBe(true);
  });

  it('should have role="progressbar"', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('role')).toBe('progressbar');
  });

  it('should set aria-valuemin and aria-valuemax', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('aria-valuemin')).toBe('0');
    expect(el.getAttribute('aria-valuemax')).toBe('100');
  });

  it('should set aria-valuenow for determinate mode', () => {
    fixture.componentRef.setInput('mode', 'determinate');
    fixture.componentRef.setInput('value', 42);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('aria-valuenow')).toBe('42');
  });

  it('should not set aria-valuenow for indeterminate mode', () => {
    fixture.componentRef.setInput('mode', 'indeterminate');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.getAttribute('aria-valuenow')).toBeNull();
  });

  it('should apply width% for determinate mode', () => {
    fixture.componentRef.setInput('mode', 'determinate');
    fixture.componentRef.setInput('value', 75);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    const fill = el.querySelector<HTMLElement>('.dlc-progress-bar__fill');
    expect(fill?.style.width).toBe('75%');
  });

  it('should apply dlc-progress-bar--indeterminate class when mode is indeterminate', () => {
    fixture.componentRef.setInput('mode', 'indeterminate');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-progress-bar--indeterminate')).toBe(true);
  });
});
