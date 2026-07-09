import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import type { DlcSoldDateRange } from './dlc-sold-date-filter.component';

import { DlcSoldDateFilterComponent } from './dlc-sold-date-filter.component';

describe('DlcSoldDateFilterComponent', () => {
  let component: DlcSoldDateFilterComponent;
  let fixture: ComponentFixture<DlcSoldDateFilterComponent>;
  let emissions: DlcSoldDateRange[];

  function queryMinInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="sold-date-min-input"] input');
  }

  function queryMaxInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="sold-date-max-input"] input');
  }

  function queryPresets(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[data-testid^="sold-date-preset-"]'));
  }

  function setNativeValue(el: HTMLInputElement, value: string): void {
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcSoldDateFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcSoldDateFilterComponent);
    component = fixture.componentInstance;
    emissions = [];
    component.rangeChange.subscribe((range: DlcSoldDateRange) => emissions.push(range));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-sold-date-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-sold-date-filter')).toBe(true);
  });

  it('should render the 4 default quick-range presets', () => {
    const presets = queryPresets();
    expect(presets.length).toBe(4);
    expect(presets[0].textContent?.trim()).toBe('Last 3 months');
    expect(presets[1].textContent?.trim()).toBe('Last 6 months');
    expect(presets[2].textContent?.trim()).toBe('Last 1 year');
    expect(presets[3].textContent?.trim()).toBe('Last 2 years');
  });

  it('should emit a closed [today - months, today] range on preset click', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 5, 15)); // 2024-06-15

    queryPresets()[0].click(); // Last 3 months → 2024-03-15 → 2024-06-15
    expect(emissions.pop()).toEqual({ maxDate: '2024-06-15', minDate: '2024-03-15' });

    queryPresets()[2].click(); // Last 1 year → 2023-06-15 → 2024-06-15
    expect(emissions.pop()).toEqual({ maxDate: '2024-06-15', minDate: '2023-06-15' });

    jest.useRealTimers();
  });

  it('should clamp the day when the months-back jump overflows the month', () => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date(2024, 2, 31)); // 2024-03-31

    queryPresets()[0].click(); // Last 3 months → Dec 31 2023; no overflow
    expect(emissions.pop()).toEqual({ maxDate: '2024-03-31', minDate: '2023-12-31' });

    // From Mar 31 going back 1 month would overflow into Mar 2/3 — exercise
    // the day-clamp branch via a consumer preset.
    fixture.componentRef.setInput('quickRanges', [{ label: 'Last 1 month', months: 1 }]);
    fixture.detectChanges();
    queryPresets()[0].click();
    expect(emissions.pop()).toEqual({ maxDate: '2024-03-31', minDate: '2024-02-29' });

    jest.useRealTimers();
  });

  it('should emit parsed minDate with current max preserved on min input change', () => {
    fixture.componentRef.setInput('maxDate', '2024-06-15');
    fixture.detectChanges();

    setNativeValue(queryMinInput(), '2024-01-01');
    expect(emissions.pop()).toEqual({ maxDate: '2024-06-15', minDate: '2024-01-01' });
  });

  it('should emit minDate null when the min input is cleared', () => {
    setNativeValue(queryMinInput(), '2024-01-01');
    expect(emissions.pop()).toEqual({ maxDate: null, minDate: '2024-01-01' });

    setNativeValue(queryMinInput(), '');
    expect(emissions.pop()).toEqual({ maxDate: null, minDate: null });
  });

  it('should emit parsed maxDate with current min preserved on max input change', () => {
    fixture.componentRef.setInput('minDate', '2024-01-01');
    fixture.detectChanges();

    setNativeValue(queryMaxInput(), '2024-06-15');
    expect(emissions.pop()).toEqual({ maxDate: '2024-06-15', minDate: '2024-01-01' });
  });

  it('should emit null for non-ISO input text', () => {
    // Drive ngModelChange directly with a non-ISO string — the native date
    // input itself would sanitise this, but the parser is the contract.
    const minInput = fixture.debugElement.query(By.css('[data-testid="sold-date-min-input"]'));
    minInput.triggerEventHandler('ngModelChange', 'not-a-date');
    expect(emissions.pop()).toEqual({ maxDate: null, minDate: null });
  });

  it('should reflect minDate/maxDate inputs into the rendered controls', async () => {
    fixture.componentRef.setInput('minDate', '2024-01-01');
    fixture.componentRef.setInput('maxDate', '2024-06-15');
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(queryMinInput().value).toBe('2024-01-01');
    expect(queryMaxInput().value).toBe('2024-06-15');

    const readout: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="sold-date-range-readout"]'
    );
    // Locale-aware "Jan 2024 – Jun 2024".
    expect(readout.textContent?.trim()).toBe('Jan 2024 – Jun 2024');
  });

  it('should render "Any" in the readout when both bounds are null', () => {
    const readout: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="sold-date-range-readout"]'
    );
    expect(readout.textContent?.trim()).toBe('Any');
  });

  it('should render "<min> – Any" when only the upper bound is null', () => {
    fixture.componentRef.setInput('minDate', '2024-01-01');
    fixture.detectChanges();

    const readout: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="sold-date-range-readout"]'
    );
    expect(readout.textContent?.trim()).toBe('Jan 2024 – Any');
  });

  it('should accept consumer-supplied quickRanges and emit their months', () => {
    fixture.componentRef.setInput('quickRanges', [
      { label: 'Last 1 month', months: 1 },
      { label: 'Last 4 months', months: 4 },
    ]);
    fixture.detectChanges();

    const presets = queryPresets();
    expect(presets.length).toBe(2);
    expect(presets[0].textContent?.trim()).toBe('Last 1 month');

    presets[0].click();
    const emission = emissions.pop()!;
    // We can't assert exact dates without freezing time; assert the shape +
    // that both bounds parse and min < max.
    expect(emission.minDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(emission.maxDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(emission.minDate! < emission.maxDate!).toBe(true);
  });
});
