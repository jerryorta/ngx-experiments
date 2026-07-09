import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import type { DlcSqftRange } from './dlc-sqft-filter.component';

import { DlcSqftFilterComponent } from './dlc-sqft-filter.component';

describe('DlcSqftFilterComponent', () => {
  let component: DlcSqftFilterComponent;
  let fixture: ComponentFixture<DlcSqftFilterComponent>;
  let emissions: DlcSqftRange[];

  function queryMinInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="sqft-min-input"] input');
  }

  function queryMaxInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="sqft-max-input"] input');
  }

  function querySliderMin(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="sqft-slider-min"]');
  }

  function querySliderMax(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="sqft-slider-max"]');
  }

  function queryPresets(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[data-testid^="sqft-preset-"]'));
  }

  function setNativeValue(el: HTMLInputElement, value: string): void {
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcSqftFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcSqftFilterComponent);
    component = fixture.componentInstance;
    emissions = [];
    component.rangeChange.subscribe((range: DlcSqftRange) => emissions.push(range));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-sqft-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-sqft-filter')).toBe(true);
  });

  it('should render the 4 default quick-range presets', () => {
    const presets = queryPresets();
    expect(presets.length).toBe(4);
    expect(presets[0].textContent?.trim()).toBe('Under 1,500');
    expect(presets[1].textContent?.trim()).toBe('1,500–2,500');
    expect(presets[2].textContent?.trim()).toBe('2,500–3,500');
    expect(presets[3].textContent?.trim()).toBe('3,500+');
  });

  it('should emit the exact preset range on preset click', () => {
    const presets = queryPresets();

    presets[1].click();
    expect(emissions.pop()).toEqual({ max: 2500, min: 1500 });

    presets[0].click();
    expect(emissions.pop()).toEqual({ max: 1500, min: null });

    presets[3].click();
    expect(emissions.pop()).toEqual({ max: null, min: 3500 });
  });

  it('should mark the preset matching the current min/max as active', () => {
    fixture.componentRef.setInput('min', 1500);
    fixture.componentRef.setInput('max', 2500);
    fixture.detectChanges();

    const presets = queryPresets();
    expect(presets[1].classList.contains('dlc-button--primary')).toBe(true);
    expect(presets[0].classList.contains('dlc-button--ghost')).toBe(true);
    expect(presets[2].classList.contains('dlc-button--ghost')).toBe(true);
    expect(presets[3].classList.contains('dlc-button--ghost')).toBe(true);
  });

  it('should emit parsed min with current max preserved on min input change', () => {
    fixture.componentRef.setInput('max', 3000);
    fixture.detectChanges();

    setNativeValue(queryMinInput(), '2000');
    expect(emissions.pop()).toEqual({ max: 3000, min: 2000 });
  });

  it('should emit min null when the min input is cleared', () => {
    setNativeValue(queryMinInput(), '2000');
    expect(emissions.pop()).toEqual({ max: null, min: 2000 });

    setNativeValue(queryMinInput(), '');
    expect(emissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit parsed max with current min preserved on max input change', () => {
    fixture.componentRef.setInput('min', 1000);
    fixture.detectChanges();

    setNativeValue(queryMaxInput(), '4500');
    expect(emissions.pop()).toEqual({ max: 4500, min: 1000 });
  });

  it('should emit a typed max below the current min as-is (no clamping)', () => {
    // Typed values pass through unclamped — intentional parity with the price facet's min/max inputs.
    fixture.componentRef.setInput('min', 5000);
    fixture.detectChanges();

    setNativeValue(queryMaxInput(), '1000');
    expect(emissions.pop()).toEqual({ max: 1000, min: 5000 });
  });

  it('should emit min null for non-numeric input text', () => {
    // type="number" sanitizes 'abc' to '' at the native-DOM level, so drive the
    // template's ngModelChange binding directly to exercise parseSqft's
    // Number.isFinite branch.
    const minInput = fixture.debugElement.query(By.css('[data-testid="sqft-min-input"]'));
    minInput.triggerEventHandler('ngModelChange', 'abc');

    expect(emissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit max null when the max slider thumb sits at sliderMax', () => {
    setNativeValue(querySliderMax(), '10000');
    expect(emissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit min null when the min slider thumb sits at 0', () => {
    fixture.componentRef.setInput('min', 1500);
    fixture.detectChanges();

    setNativeValue(querySliderMin(), '0');
    expect(emissions.pop()).toEqual({ max: null, min: null });
  });

  it('should clamp the min thumb to the max thumb before emitting', () => {
    fixture.componentRef.setInput('max', 2000);
    fixture.detectChanges();

    const sliderMin = querySliderMin();
    setNativeValue(sliderMin, '5000');
    expect(sliderMin.value).toBe('2000');
    expect(emissions.pop()).toEqual({ max: 2000, min: 2000 });
  });

  it('should clamp the max thumb to the min thumb before emitting', () => {
    fixture.componentRef.setInput('min', 4000);
    fixture.detectChanges();

    const sliderMax = querySliderMax();
    setNativeValue(sliderMax, '1000');
    expect(sliderMax.value).toBe('4000');
    expect(emissions.pop()).toEqual({ max: 4000, min: 4000 });
  });

  it('should reflect min/max inputs into the rendered controls', async () => {
    fixture.componentRef.setInput('min', 1500);
    fixture.componentRef.setInput('max', 3500);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();

    expect(queryMinInput().value).toBe('1500');
    expect(queryMaxInput().value).toBe('3500');
    expect(querySliderMin().value).toBe('1500');
    expect(querySliderMax().value).toBe('3500');

    const readout: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="sqft-range-readout"]'
    );
    expect(readout.textContent?.trim()).toBe('1,500 – 3,500');
  });

  it('should render "Any" in the readout for a null upper bound', () => {
    fixture.componentRef.setInput('min', 1500);
    fixture.detectChanges();

    const readout: HTMLElement = fixture.nativeElement.querySelector(
      '[data-testid="sqft-range-readout"]'
    );
    expect(readout.textContent?.trim()).toBe('1,500 – Any');
  });
});
