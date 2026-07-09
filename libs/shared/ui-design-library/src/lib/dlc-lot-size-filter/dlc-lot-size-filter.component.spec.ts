import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import type { DlcLotSizeRange, DlcLotSizeUnit } from './dlc-lot-size-filter.component';

import { acresToSqft, DlcLotSizeFilterComponent, sqftToAcres } from './dlc-lot-size-filter.component';

describe('DlcLotSizeFilterComponent', () => {
  let component: DlcLotSizeFilterComponent;
  let fixture: ComponentFixture<DlcLotSizeFilterComponent>;
  let rangeEmissions: DlcLotSizeRange[];
  let unitEmissions: DlcLotSizeUnit[];

  function queryMinInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="lot-size-min-input"] input');
  }

  function queryMaxInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="lot-size-max-input"] input');
  }

  function querySliderMin(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="lot-size-slider-min"]');
  }

  function querySliderMax(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="lot-size-slider-max"]');
  }

  function queryUnitButton(unit: DlcLotSizeUnit): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-testid="lot-size-unit-${unit}"]`);
  }

  function queryReadout(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="lot-size-range-readout"]');
  }

  function queryFillBar(): HTMLElement {
    // The fill bar is the only element carrying an inline `left` style binding.
    return fixture.nativeElement.querySelector('[style*="left"]');
  }

  function setNativeValue(el: HTMLInputElement, value: string): void {
    el.value = value;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  }

  async function stabilize(): Promise<void> {
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcLotSizeFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcLotSizeFilterComponent);
    component = fixture.componentInstance;
    rangeEmissions = [];
    unitEmissions = [];
    component.rangeChange.subscribe((range: DlcLotSizeRange) => rangeEmissions.push(range));
    component.unitChange.subscribe((unit: DlcLotSizeUnit) => unitEmissions.push(unit));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-lot-size-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-lot-size-filter')).toBe(true);
  });

  it('should configure both sliders with the sqft ceiling and step by default', () => {
    expect(querySliderMin().max).toBe('50000');
    expect(querySliderMin().step).toBe('1000');
    expect(querySliderMax().max).toBe('50000');
    expect(querySliderMax().step).toBe('1000');
  });

  it('should configure both sliders with the acres ceiling and step in acres mode', () => {
    fixture.componentRef.setInput('unit', 'acres');
    fixture.detectChanges();

    expect(querySliderMin().max).toBe('10');
    expect(querySliderMin().step).toBe('0.1');
    expect(querySliderMax().max).toBe('10');
    expect(querySliderMax().step).toBe('0.1');
  });

  it('should emit unitChange only — never rangeChange — on unit toggle', () => {
    queryUnitButton('acres').click();
    fixture.detectChanges();

    expect(unitEmissions).toEqual(['acres']);
    expect(rangeEmissions).toEqual([]);
  });

  it('should emit nothing when clicking the already-active unit button', () => {
    queryUnitButton('sqft').click();
    fixture.detectChanges();

    expect(unitEmissions).toEqual([]);
    expect(rangeEmissions).toEqual([]);
  });

  it('should round-trip the canonical min across unit toggles without drift', async () => {
    fixture.componentRef.setInput('min', 22000);
    fixture.componentRef.setInput('unit', 'acres');
    await stabilize();

    expect(queryMinInput().value).toBe('0.51');

    fixture.componentRef.setInput('unit', 'sqft');
    await stabilize();

    expect(queryMinInput().value).toBe('22000');
    expect(rangeEmissions).toEqual([]);
  });

  it('should convert typed acres to canonical sqft on emit', () => {
    fixture.componentRef.setInput('unit', 'acres');
    fixture.detectChanges();

    setNativeValue(queryMinInput(), '0.5');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: 21780 });

    setNativeValue(queryMaxInput(), '1');
    expect(rangeEmissions.pop()).toEqual({ max: 43560, min: null });
  });

  it('should pass typed sqft through unconverted', () => {
    setNativeValue(queryMinInput(), '5000');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: 5000 });
  });

  it('should emit min null when the min input is cleared', () => {
    setNativeValue(queryMinInput(), '5000');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: 5000 });

    setNativeValue(queryMinInput(), '');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit min null when the min input is cleared in acres mode', () => {
    fixture.componentRef.setInput('unit', 'acres');
    fixture.detectChanges();

    setNativeValue(queryMinInput(), '0.5');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: 21780 });

    setNativeValue(queryMinInput(), '');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit min null for non-numeric input text', () => {
    // type="number" sanitizes 'abc' to '' at the native-DOM level, so drive the
    // template's ngModelChange binding directly to exercise the parse helper's
    // Number.isFinite branch.
    const minInput = fixture.debugElement.query(By.css('[data-testid="lot-size-min-input"]'));
    minInput.triggerEventHandler('ngModelChange', 'abc');

    expect(rangeEmissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit max null when the sqft max thumb sits at the sqft ceiling', () => {
    setNativeValue(querySliderMax(), '50000');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit max null when the acres max thumb sits at the acres ceiling', () => {
    fixture.componentRef.setInput('unit', 'acres');
    fixture.detectChanges();

    setNativeValue(querySliderMax(), '10');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: null });
  });

  it('should emit min null when the acres min thumb sits at 0', () => {
    fixture.componentRef.setInput('unit', 'acres');
    fixture.componentRef.setInput('min', 21780);
    fixture.detectChanges();

    setNativeValue(querySliderMin(), '0');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: null });
  });

  it('should round acres thumb values to whole canonical sqft', () => {
    fixture.componentRef.setInput('unit', 'acres');
    fixture.detectChanges();

    setNativeValue(querySliderMin(), '0.3');
    expect(rangeEmissions.pop()).toEqual({ max: null, min: 13068 });
  });

  it('should clamp the min thumb to the max thumb in display units before emitting', () => {
    fixture.componentRef.setInput('unit', 'acres');
    fixture.componentRef.setInput('max', 21780);
    fixture.detectChanges();

    const sliderMin = querySliderMin();
    setNativeValue(sliderMin, '5');
    expect(sliderMin.value).toBe('0.5');
    expect(rangeEmissions.pop()).toEqual({ max: 21780, min: 21780 });
  });

  it('should reflect canonical bounds into the rendered controls in acres mode', async () => {
    fixture.componentRef.setInput('min', 10890);
    fixture.componentRef.setInput('max', 21780);
    fixture.componentRef.setInput('unit', 'acres');
    await stabilize();

    expect(queryMinInput().value).toBe('0.25');
    expect(queryMaxInput().value).toBe('0.5');
    expect(querySliderMin().value).toBe('0.25');
    expect(querySliderMax().value).toBe('0.5');
    expect(queryReadout().textContent?.trim()).toBe('0.25 – 0.5');
  });

  it('should render "Any" in the readout for a null upper bound', async () => {
    fixture.componentRef.setInput('min', 10890);
    fixture.componentRef.setInput('max', null);
    fixture.componentRef.setInput('unit', 'acres');
    await stabilize();

    expect(queryReadout().textContent?.trim()).toBe('0.25 – Any');
  });

  it('should size the fill bar against the per-unit slider ceiling', () => {
    fixture.componentRef.setInput('min', 21780);
    fixture.componentRef.setInput('unit', 'acres');
    fixture.detectChanges();

    expect(queryFillBar().style.left).toBe('5%');

    fixture.componentRef.setInput('unit', 'sqft');
    fixture.detectChanges();

    expect(queryFillBar().style.left).toBe('43.56%');
  });

  describe('pure conversion helpers', () => {
    it('should round acresToSqft after conversion', () => {
      expect(acresToSqft(0.5)).toBe(21780);
      expect(acresToSqft(0.25)).toBe(10890);
      expect(acresToSqft(0.3)).toBe(13068);
    });

    it('should keep sqftToAcres unrounded and round-trip stable', () => {
      expect(sqftToAcres(21780)).toBe(0.5);
      expect(acresToSqft(sqftToAcres(21780))).toBe(21780);
    });

    it('should keep sqftToAcres genuinely unrounded for non-exact values', () => {
      expect(sqftToAcres(10000)).toBeCloseTo(10000 / 43560, 10);
      expect(Number.isInteger(sqftToAcres(10000))).toBe(false);
      // Not rounded to 2 display decimals — rounding happens only at display.
      expect(sqftToAcres(10000)).not.toBe(0.23);
    });
  });
});
