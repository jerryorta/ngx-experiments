import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { LdgAmountInputComponent } from './ldg-amount-input.component';

function setInputValue(fixture: ComponentFixture<LdgAmountInputComponent>, value: string): HTMLInputElement {
  const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
  input.value = value;
  input.dispatchEvent(new Event('input'));
  fixture.detectChanges();
  return input;
}

describe('LdgAmountInputComponent', () => {
  let fixture: ComponentFixture<LdgAmountInputComponent>;
  let component: LdgAmountInputComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgAmountInputComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgAmountInputComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('writeValue(123456) displays 1234.56', () => {
    component.writeValue(123456);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('1234.56');
  });

  it('writeValue(null) displays an empty field', () => {
    component.writeValue(123456);
    component.writeValue(null);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.value).toBe('');
  });

  it('typing "50" commits 5000 cents via the registered onChange', () => {
    let emitted: null | number | undefined;
    component.registerOnChange(v => (emitted = v));

    setInputValue(fixture, '50');

    expect(emitted).toBe(5000);
  });

  it('tolerates $ and commas on commit (paste-resilience)', () => {
    let emitted: null | number | undefined;
    component.registerOnChange(v => (emitted = v));

    setInputValue(fixture, '$1,234.56');

    expect(emitted).toBe(123456);
  });

  it('normalizes the display on blur (e.g. "12" -> "12.00")', () => {
    const input = setInputValue(fixture, '12');
    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();
    expect(input.value).toBe('12.00');
  });

  it('empty input commits null', () => {
    let emitted: null | number | undefined;
    component.writeValue(500); // start non-empty so null is an observable change
    component.registerOnChange(v => (emitted = v));

    setInputValue(fixture, '');

    expect(emitted).toBeNull();
  });

  it('leaves an unparseable value uncommitted and reverts the display on blur', () => {
    let emitted: null | number | undefined;
    component.writeValue(500); // last good value: $5.00
    component.registerOnChange(v => (emitted = v));

    const input = setInputValue(fixture, 'abc');
    expect(emitted).toBeUndefined(); // never called for the bad intermediate state

    input.dispatchEvent(new Event('blur'));
    fixture.detectChanges();

    expect(input.value).toBe('5.00'); // reverted to the last committed value
  });

  it('clamps a negative amount to 0 when allowNegative is false (the default)', () => {
    let emitted: null | number | undefined;
    component.registerOnChange(v => (emitted = v));

    setInputValue(fixture, '-12.34');

    expect(emitted).toBe(0);
  });

  it('permits a negative amount when allowNegative is true', () => {
    fixture.componentRef.setInput('allowNegative', true);
    let emitted: null | number | undefined;
    component.registerOnChange(v => (emitted = v));

    setInputValue(fixture, '-12.34');

    expect(emitted).toBe(-1234);
  });

  it('setDisabledState disables the native input', () => {
    component.setDisabledState(true);
    fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
    expect(input.disabled).toBe(true);
  });
});
