import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcBillingToggleComponent } from './dlc-billing-toggle.component';

describe('DlcBillingToggleComponent', () => {
  let component: DlcBillingToggleComponent;
  let fixture: ComponentFixture<DlcBillingToggleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcBillingToggleComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(DlcBillingToggleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-billing-toggle host class', () => {
    expect(fixture.nativeElement.classList.contains('dlc-billing-toggle')).toBe(true);
  });

  it('should default to monthly', () => {
    expect(
      fixture.nativeElement.querySelector('.dlc-billing-toggle__option--active')?.textContent?.trim()
    ).toContain('Monthly');
  });

  it('should show discount badge when annual', () => {
    fixture.componentRef.setInput('value', 'annual');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.dlc-billing-toggle__discount')).toBeTruthy();
  });
});
