import { type ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import { DlcPricingCardComponent } from './dlc-pricing-card.component';

describe('DlcPricingCardComponent', () => {
  let component: DlcPricingCardComponent;
  let fixture: ComponentFixture<DlcPricingCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcPricingCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcPricingCardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-pricing-card host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-pricing-card')).toBe(true);
  });

  it('should apply dlc-pricing-card--featured when featured is true', () => {
    fixture.componentRef.setInput('featured', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-pricing-card--featured')).toBe(true);
  });

  it('should display planName', () => {
    fixture.componentRef.setInput('planName', 'Solo');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Solo');
  });

  it('should show "Custom" when price is \'custom\'', () => {
    fixture.componentRef.setInput('price', 'custom');
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Custom');
  });

  it('should emit ctaClick when CTA button clicked', () => {
    const emitSpy = jest.spyOn(component.ctaClick, 'emit');
    const button = fixture.debugElement.query(By.css('button'));
    button.nativeElement.click();
    expect(emitSpy).toHaveBeenCalled();
  });
});
