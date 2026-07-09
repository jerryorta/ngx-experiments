import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcDeletedBadgeComponent } from './dlc-deleted-badge.component';

describe('DlcDeletedBadgeComponent', () => {
  let component: DlcDeletedBadgeComponent;
  let fixture: ComponentFixture<DlcDeletedBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcDeletedBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcDeletedBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display days remaining when provided', () => {
    fixture.componentRef.setInput('daysRemaining', 15);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent;
    expect(text).toContain('15 days left');
  });

  it('should display singular day when only 1 day remaining', () => {
    fixture.componentRef.setInput('daysRemaining', 1);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent;
    expect(text).toContain('1 day left');
  });

  it('should display "expires today" when 0 days remaining', () => {
    fixture.componentRef.setInput('daysRemaining', 0);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent;
    expect(text).toContain('expires today');
  });

  it('should only display "Deleted" when days remaining is null', () => {
    fixture.componentRef.setInput('daysRemaining', null);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const span = compiled.querySelector('span.font-medium');
    const text = span?.textContent?.trim();
    expect(text).toBe('Deleted');
  });
});
