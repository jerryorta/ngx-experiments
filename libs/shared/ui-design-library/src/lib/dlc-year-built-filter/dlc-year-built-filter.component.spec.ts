import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import type { DlcYearBuiltRange } from './dlc-year-built-filter.component';

import { DlcYearBuiltFilterComponent } from './dlc-year-built-filter.component';

const CURRENT_YEAR = new Date().getFullYear();

describe('DlcYearBuiltFilterComponent', () => {
  let component: DlcYearBuiltFilterComponent;
  let fixture: ComponentFixture<DlcYearBuiltFilterComponent>;
  let emissions: DlcYearBuiltRange[];

  function queryMinInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="year-built-min-input"] input');
  }

  function queryMaxInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="year-built-max-input"] input');
  }

  function querySliderMin(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="year-built-slider-min"]');
  }

  function querySliderMax(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="year-built-slider-max"]');
  }

  function queryPresets(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid^="year-built-preset-"]')
    );
  }

  function setNativeValue(el: HTMLInputElement, value: string): void {
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcYearBuiltFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcYearBuiltFilterComponent);
    component = fixture.componentInstance;
    emissions = [];
    component.rangeChange.subscribe((range: DlcYearBuiltRange) => emissions.push(range));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-year-built-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-year-built-filter')).toBe(true);
  });

  it('should render the 5 default quick-range presets', () => {
    const presets = queryPresets();
    expect(presets.length).toBe(5);
    expect(presets[0].textContent?.trim()).toBe('Last 5 years');
    expect(presets[1].textContent?.trim()).toBe('Last 10 years');
    expect(presets[2].textContent?.trim()).toBe('2000+');
    expect(presets[3].textContent?.trim()).toBe('1990s');
    expect(presets[4].textContent?.trim()).toBe('Before 1990');
  });

  it('should emit the exact preset range on preset click', () => {
    const presets = queryPresets();

    presets[0].click();
    expect(emissions.pop()).toEqual({ max: null, min: CURRENT_YEAR - 5 });

    presets[1].click();
    expect(emissions.pop()).toEqual({ max: null, min: CURRENT_YEAR - 10 });

    presets[2].click();
    expect(emissions.pop()).toEqual({ max: null, min: 2000 });

    presets[3].click();
    expect(emissions.pop()).toEqual({ max: 1999, min: 1990 });

    presets[4].click();
    expect(emissions.pop()).toEqual({ max: 1989, min: null });
  });

  it('should mark the preset matching the current min/max as active', () => {
    fixture.componentRef.setInput('min', 1990);
    fixture.componentRef.setInput('max', 1999);
    fixture.detectChanges();

    const presets = queryPresets();
    expect(presets[3].classList.contains('dlc-button--primary')).toBe(true);
    expect(presets[0].classList.contains('dlc-button--ghost')).toBe(true);
    expect(presets[2].classList.contains('dlc-button--ghost')).toBe(true);
    expect(presets[4].classList.contains('dlc-button--ghost')).toBe(true);
  });

  it('should derive the relative presets from a custom sliderMax ceiling', () => {
    fixture.componentRef.setInput('sliderMax', 2020);
    fixture.detectChanges();

    queryPresets()[0].click();
    expect(emissions.pop()).toEqual({ max: null, min: 2015 });
  });

  it('should emit parsed min with current max preserved on min input change', () => {
    fixture.componentRef.setInput('max', 2010);
    fixture.detectChanges();

    setNativeValue(queryMinInput(), '1995');
    expect(emissions.pop()).toEqual({ max: 2010, min: 1995 });
  });

  it('should emit min null when the min input is cleared', () => {
    setNativeValue(queryMinInput(), '1995');
    expect(emissions.pop()).toEqual({ max: null, min: 1995 });

    setNativeValue(queryMinInput(), '');
    expect(emissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit parsed max with current min preserved on max input change', () => {
    fixture.componentRef.setInput('min', 1980);
    fixture.detectChanges();

    setNativeValue(queryMaxInput(), '2005');
    expect(emissions.pop()).toEqual({ max: 2005, min: 1980 });
  });

  it('should emit a typed max below the current min as-is (no clamping)', () => {
    // Typed values pass through unclamped — intentional parity with the sqft
    // and price facets' min/max inputs.
    fixture.componentRef.setInput('min', 2010);
    fixture.detectChanges();

    setNativeValue(queryMaxInput(), '1950');
    expect(emissions.pop()).toEqual({ max: 1950, min: 2010 });
  });

  it('should emit min null for non-numeric input text', () => {
    // type="number" sanitizes 'abc' to '' at the native-DOM level, so drive the
    // template's ngModelChange binding directly to exercise parseYear's
    // Number.isFinite branch.
    const minInput = fixture.debugElement.query(By.css('[data-testid="year-built-min-input"]'));
    minInput.triggerEventHandler('ngModelChange', 'abc');

    expect(emissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit max null when the max slider thumb sits at sliderMax', () => {
    setNativeValue(querySliderMax(), `${CURRENT_YEAR}`);
    expect(emissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit min null when the min slider thumb sits at the sliderMin floor', () => {
    fixture.componentRef.setInput('min', 1990);
    fixture.detectChanges();

    setNativeValue(querySliderMin(), '1900');
    expect(emissions.pop()).toEqual({ max: null, min: null });
  });

  it('should clamp the min thumb to the max thumb before emitting', () => {
    fixture.componentRef.setInput('max', 1995);
    fixture.detectChanges();

    const sliderMin = querySliderMin();
    setNativeValue(sliderMin, '2010');
    expect(sliderMin.value).toBe('1995');
    expect(emissions.pop()).toEqual({ max: 1995, min: 1995 });
  });

  it('should clamp the max thumb to the min thumb before emitting', () => {
    fixture.componentRef.setInput('min', 2005);
    fixture.detectChanges();

    const sliderMax = querySliderMax();
    setNativeValue(sliderMax, '1950');
    expect(sliderMax.value).toBe('2005');
    expect(emissions.pop()).toEqual({ max: 2005, min: 2005 });
  });

  it('should reflect min/max inputs into the rendered controls', async () => {
    fixture.componentRef.setInput('min', 1985);
    fixture.componentRef.setInput('max', 2015);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(queryMinInput().value).toBe('1985');
    expect(queryMaxInput().value).toBe('2015');
    expect(querySliderMin().value).toBe('1985');
    expect(querySliderMax().value).toBe('2015');

    const readout: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="year-built-range-readout"]'
    );
    expect(readout.textContent?.trim()).toBe('1985 – 2015');
  });

  it('should render "Any" in the readout for a null upper bound', () => {
    fixture.componentRef.setInput('min', 1990);
    fixture.detectChanges();

    const readout: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="year-built-range-readout"]'
    );
    expect(readout.textContent?.trim()).toBe('1990 – Any');
  });
});
