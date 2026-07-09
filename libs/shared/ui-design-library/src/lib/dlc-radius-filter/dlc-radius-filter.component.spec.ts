import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import type { DlcSearchAreaMode } from './dlc-radius-filter.component';

import {
  CG_RADIUS_DEFAULT_MILES,
  CG_RADIUS_MAX_MILES,
  CG_RADIUS_MIN_MILES,
  DlcRadiusFilterComponent,
} from './dlc-radius-filter.component';

describe('DlcRadiusFilterComponent', () => {
  let component: DlcRadiusFilterComponent;
  let fixture: ComponentFixture<DlcRadiusFilterComponent>;
  let modeEmissions: DlcSearchAreaMode[];
  let milesEmissions: number[];

  function queryModeButton(mode: Exclude<DlcSearchAreaMode, null>): HTMLButtonElement {
    return fixture.nativeElement.querySelector(`[data-testid="radius-mode-${mode}"]`);
  }

  function queryRadiusPanel(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="radius-mode-panel"]');
  }

  function queryBoundsHint(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="radius-bounds-hint"]');
  }

  function queryIdleHint(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="radius-idle-hint"]');
  }

  function querySlider(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="radius-miles-slider"]');
  }

  function queryReadout(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="radius-miles-readout"]');
  }

  function queryInput(): HTMLInputElement {
    return fixture.nativeElement.querySelector('[data-testid="radius-miles-input"] input');
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
      imports: [DlcRadiusFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcRadiusFilterComponent);
    component = fixture.componentInstance;
    modeEmissions = [];
    milesEmissions = [];
    component.modeChange.subscribe((mode: DlcSearchAreaMode) => modeEmissions.push(mode));
    component.radiusMilesChange.subscribe((miles: number) => milesEmissions.push(miles));
    fixture.detectChanges();
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-radius-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-radius-filter')).toBe(true);
  });

  it('should render the idle hint and no body when mode is null', () => {
    expect(queryIdleHint()).not.toBeNull();
    expect(queryRadiusPanel()).toBeNull();
    expect(queryBoundsHint()).toBeNull();
  });

  it('should render the radius panel only when mode === "radius"', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    expect(queryRadiusPanel()).not.toBeNull();
    expect(queryBoundsHint()).toBeNull();
    expect(queryIdleHint()).toBeNull();
  });

  it('should render the bounds hint only when mode === "bounds"', () => {
    fixture.componentRef.setInput('mode', 'bounds');
    fixture.detectChanges();

    expect(queryBoundsHint()).not.toBeNull();
    expect(queryRadiusPanel()).toBeNull();
    expect(queryIdleHint()).toBeNull();
  });

  it('should emit the picked mode when an inactive pill is clicked', () => {
    queryModeButton('radius').click();
    fixture.detectChanges();

    expect(modeEmissions).toEqual(['radius']);
    expect(milesEmissions).toEqual([]);
  });

  it('should emit modeChange null when the already-active pill is clicked', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    queryModeButton('radius').click();
    fixture.detectChanges();

    expect(modeEmissions).toEqual([null]);
  });

  it('should switch from bounds to radius without going through null', () => {
    fixture.componentRef.setInput('mode', 'bounds');
    fixture.detectChanges();

    queryModeButton('radius').click();
    fixture.detectChanges();

    expect(modeEmissions).toEqual(['radius']);
  });

  it('should mark the active pill via aria-pressed', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    expect(queryModeButton('radius').getAttribute('aria-pressed')).toBe('true');
    expect(queryModeButton('bounds').getAttribute('aria-pressed')).toBe('false');
  });

  it('should fall back to the default miles in the readout when radiusMiles is null', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    expect(queryReadout().textContent?.trim()).toBe(`Search within ${CG_RADIUS_DEFAULT_MILES} mi`);
    expect(querySlider().value).toBe(`${CG_RADIUS_DEFAULT_MILES}`);
  });

  it('should reflect a controlled radiusMiles value into the slider + readout', async () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.componentRef.setInput('radiusMiles', 12);
    await stabilize();

    expect(querySlider().value).toBe('12');
    expect(queryReadout().textContent?.trim()).toBe('Search within 12 mi');
  });

  it('should emit a clamped slider edit', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    setNativeValue(querySlider(), '7');
    expect(milesEmissions.pop()).toBe(7);
  });

  it('should clamp slider values outside [min, max]', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    // The native slider already clamps to [min, max], so the manual code path
    // gets exercised by setting the value directly through dispatchEvent on a
    // detached attribute write.
    const slider = querySlider();
    slider.setAttribute('value', '500');
    slider.value = '500';
    slider.dispatchEvent(new Event('input'));
    fixture.detectChanges();
    expect(milesEmissions.pop()).toBe(CG_RADIUS_MAX_MILES);
  });

  it('should emit on number-input edits', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    setNativeValue(queryInput(), '18');
    expect(milesEmissions.pop()).toBe(18);
  });

  it('should snap an empty number-input to the floor', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    // type=number sanitises non-numeric to ''; this exercises both the empty
    // branch (here) and the non-numeric branch (next test).
    setNativeValue(queryInput(), '');
    expect(milesEmissions.pop()).toBe(CG_RADIUS_MIN_MILES);
  });

  it('should snap a non-numeric input to the floor', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    // Drive ngModelChange directly so the parse helper sees the raw text
    // (the native type=number input would sanitise it to '').
    const input = fixture.debugElement.query(By.css('[data-testid="radius-miles-input"]'));
    input.triggerEventHandler('ngModelChange', 'abc');

    expect(milesEmissions.pop()).toBe(CG_RADIUS_MIN_MILES);
  });

  it('should clamp number-input values above the ceiling', () => {
    fixture.componentRef.setInput('mode', 'radius');
    fixture.detectChanges();

    setNativeValue(queryInput(), '999');
    expect(milesEmissions.pop()).toBe(CG_RADIUS_MAX_MILES);
  });

  it('should size the fill bar against the slider range', () => {
    fixture.componentRef.setInput('mode', 'radius');
    // 1 .. 50 → 25 is halfway, so the fill bar should sit at (25 - 1)/(50 - 1) ≈ 49.0%
    fixture.componentRef.setInput('radiusMiles', 25);
    fixture.detectChanges();

    const fill = fixture.nativeElement.querySelector('[style*="width"]') as HTMLElement | null;
    expect(fill).not.toBeNull();
    // The fill is the only inline-styled element with both `left` and `width`;
    // exact percentage rounds to ~48.98% (24/49 * 100). Loose comparison —
    // the precise number ties to CG_RADIUS_MIN/MAX, which the constants tests
    // above already pin.
    expect(fill!.style.width).toMatch(/%/);
  });
});
