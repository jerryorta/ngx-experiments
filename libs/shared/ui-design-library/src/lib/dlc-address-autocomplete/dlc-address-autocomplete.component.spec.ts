import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { DlcAddressPrediction } from './dlc-address-autocomplete.model';

import {
  CG_ADDRESS_QUERY_DEBOUNCE_MS,
  DlcAddressAutocompleteComponent,
} from './dlc-address-autocomplete.component';

const PREDICTIONS: DlcAddressPrediction[] = [
  { id: 'place-1', mainText: '450 Sutter Street', secondaryText: 'San Francisco, CA' },
  { id: 'place-2', mainText: '451 Lexington Avenue', secondaryText: 'New York, NY' },
  { id: 'place-3', mainText: '4501 N Lamar Boulevard', secondaryText: 'Austin, TX' },
];

describe('DlcAddressAutocompleteComponent', () => {
  let component: DlcAddressAutocompleteComponent;
  let fixture: ComponentFixture<DlcAddressAutocompleteComponent>;

  const inputEl = (): HTMLInputElement =>
    fixture.nativeElement.querySelector('.dlc-address-autocomplete__field');

  const listboxEl = (): HTMLElement | null =>
    fixture.nativeElement.querySelector('[data-testid="address-autocomplete-listbox"]');

  const optionEls = (): HTMLElement[] =>
    Array.from(fixture.nativeElement.querySelectorAll('.dlc-address-autocomplete__option'));

  const typeText = (text: string): void => {
    const el = inputEl();
    el.value = text;
    el.dispatchEvent(new Event('input'));
    fixture.detectChanges();
  };

  const focusInput = (): void => {
    inputEl().dispatchEvent(new Event('focus'));
    fixture.detectChanges();
  };

  const pressKey = (key: string): void => {
    inputEl().dispatchEvent(new KeyboardEvent('keydown', { key }));
    fixture.detectChanges();
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcAddressAutocompleteComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcAddressAutocompleteComponent);
    component = fixture.componentInstance;
    // Connect the host so real `.focus()` updates `document.activeElement` (jsdom
    // only tracks activeElement for elements attached to the document).
    document.body.appendChild(fixture.nativeElement);
    fixture.detectChanges();
  });

  afterEach(() => {
    fixture.nativeElement.remove();
    jest.useRealTimers();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(fixture.nativeElement.classList.contains('dlc-address-autocomplete')).toBe(true);
  });

  it('should render predictions from the predictions input when focused', () => {
    fixture.componentRef.setInput('predictions', PREDICTIONS);
    fixture.detectChanges();
    focusInput();

    const options = optionEls();
    expect(options.length).toBe(3);
    expect(options[0].textContent).toContain('450 Sutter Street');
    expect(options[0].textContent).toContain('San Francisco, CA');
    expect(listboxEl()?.getAttribute('role')).toBe('listbox');
    expect(options[0].getAttribute('role')).toBe('option');
  });

  it('should keep the dropdown closed when not focused even with predictions', () => {
    fixture.componentRef.setInput('predictions', PREDICTIONS);
    fixture.detectChanges();
    expect(listboxEl()).toBeNull();
  });

  describe('queryChange debounce', () => {
    it('should emit the typed query once after the debounce window', () => {
      jest.useFakeTimers();
      const emitted: string[] = [];
      component.queryChange.subscribe((q: string) => emitted.push(q));

      typeText('450 Sutter');
      expect(emitted).toEqual([]);

      jest.advanceTimersByTime(CG_ADDRESS_QUERY_DEBOUNCE_MS - 1);
      expect(emitted).toEqual([]);

      jest.advanceTimersByTime(1);
      expect(emitted).toEqual(['450 Sutter']);
    });

    it('should debounce rapid keystrokes into a single trailing emission', () => {
      jest.useFakeTimers();
      const emitted: string[] = [];
      component.queryChange.subscribe((q: string) => emitted.push(q));

      typeText('450');
      jest.advanceTimersByTime(100);
      typeText('450 S');
      jest.advanceTimersByTime(100);
      typeText('450 Su');
      jest.advanceTimersByTime(CG_ADDRESS_QUERY_DEBOUNCE_MS);

      expect(emitted).toEqual(['450 Su']);
    });

    it('should swallow 1-2 character queries but emit the empty string', () => {
      jest.useFakeTimers();
      const emitted: string[] = [];
      component.queryChange.subscribe((q: string) => emitted.push(q));

      typeText('au');
      jest.advanceTimersByTime(CG_ADDRESS_QUERY_DEBOUNCE_MS);
      expect(emitted).toEqual([]);

      typeText('aus');
      jest.advanceTimersByTime(CG_ADDRESS_QUERY_DEBOUNCE_MS);
      expect(emitted).toEqual(['aus']);

      typeText('');
      jest.advanceTimersByTime(CG_ADDRESS_QUERY_DEBOUNCE_MS);
      expect(emitted).toEqual(['aus', '']);
    });

    it('should NOT emit when the value input is set programmatically', () => {
      jest.useFakeTimers();
      const emitted: string[] = [];
      component.queryChange.subscribe((q: string) => emitted.push(q));

      fixture.componentRef.setInput('value', '1600 Pennsylvania Avenue NW');
      fixture.detectChanges();

      expect(inputEl().value).toBe('1600 Pennsylvania Avenue NW');
      jest.advanceTimersByTime(CG_ADDRESS_QUERY_DEBOUNCE_MS * 2);
      expect(emitted).toEqual([]);
    });
  });

  describe('selection', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('predictions', PREDICTIONS);
      fixture.detectChanges();
      focusInput();
    });

    it('should emit predictionSelected on option click, fill the input, and close the dropdown', () => {
      let selected: DlcAddressPrediction | null = null;
      component.predictionSelected.subscribe((p: DlcAddressPrediction) => (selected = p));

      optionEls()[1].click();
      fixture.detectChanges();

      expect(selected).toEqual(PREDICTIONS[1]);
      expect(inputEl().value).toBe('451 Lexington Avenue, New York, NY');
      expect(listboxEl()).toBeNull();
    });

    it('should emit predictionSelected on Enter over the highlighted option', () => {
      let selected: DlcAddressPrediction | null = null;
      component.predictionSelected.subscribe((p: DlcAddressPrediction) => (selected = p));

      pressKey('ArrowDown');
      pressKey('ArrowDown');
      pressKey('Enter');

      expect(selected).toEqual(PREDICTIONS[1]);
      expect(inputEl().value).toBe('451 Lexington Avenue, New York, NY');
      expect(listboxEl()).toBeNull();
    });

    it('should not select on Enter when nothing is highlighted', () => {
      let emitted = false;
      component.predictionSelected.subscribe(() => (emitted = true));

      pressKey('Enter');

      expect(emitted).toBe(false);
      expect(listboxEl()).toBeTruthy();
    });
  });

  describe('keyboard navigation', () => {
    beforeEach(() => {
      fixture.componentRef.setInput('predictions', PREDICTIONS);
      fixture.detectChanges();
      focusInput();
    });

    it('should move the highlight down/up and expose it via aria-activedescendant', () => {
      pressKey('ArrowDown');
      expect(inputEl().getAttribute('aria-activedescendant')).toMatch(/-option-0$/);
      expect(optionEls()[0].classList.contains('dlc-address-autocomplete__option--active')).toBe(
        true
      );

      pressKey('ArrowDown');
      expect(inputEl().getAttribute('aria-activedescendant')).toMatch(/-option-1$/);

      pressKey('ArrowUp');
      expect(inputEl().getAttribute('aria-activedescendant')).toMatch(/-option-0$/);
    });

    it('should wrap the highlight at both ends', () => {
      pressKey('ArrowUp');
      expect(inputEl().getAttribute('aria-activedescendant')).toMatch(/-option-2$/);

      pressKey('ArrowDown');
      expect(inputEl().getAttribute('aria-activedescendant')).toMatch(/-option-0$/);
    });

    it('should close the dropdown and clear the highlight on Escape', () => {
      pressKey('ArrowDown');
      pressKey('Escape');

      expect(listboxEl()).toBeNull();
      expect(inputEl().getAttribute('aria-expanded')).toBe('false');
      expect(inputEl().getAttribute('aria-activedescendant')).toBeNull();
    });
  });

  describe('clear affordance', () => {
    it('should show the clear button only when there is text', () => {
      expect(
        fixture.nativeElement.querySelector('[data-testid="address-autocomplete-clear"]')
      ).toBeNull();

      typeText('450 Sutter');
      expect(
        fixture.nativeElement.querySelector('[data-testid="address-autocomplete-clear"]')
      ).toBeTruthy();
    });

    it('should emit cleared, empty the input, close the dropdown, and refocus on clear', () => {
      let emitted = false;
      component.cleared.subscribe(() => (emitted = true));

      fixture.componentRef.setInput('predictions', PREDICTIONS);
      fixture.detectChanges();
      focusInput();
      typeText('450 Sutter');

      const clearBtn: HTMLButtonElement = fixture.nativeElement.querySelector(
        '[data-testid="address-autocomplete-clear"]'
      );
      clearBtn.click();
      fixture.detectChanges();

      expect(emitted).toBe(true);
      expect(inputEl().value).toBe('');
      expect(listboxEl()).toBeNull();
      expect(document.activeElement).toBe(inputEl());
    });
  });

  describe('loading and empty-results states', () => {
    it('should render the loading row while loading is true', () => {
      fixture.componentRef.setInput('loading', true);
      fixture.detectChanges();
      focusInput();

      expect(
        fixture.nativeElement.querySelector('.dlc-address-autocomplete__loading')?.textContent
      ).toContain('Searching…');
      expect(fixture.nativeElement.querySelector('.dlc-address-autocomplete__empty')).toBeNull();
    });

    it('should render the empty-results row for a >= 3 char query with no predictions', () => {
      focusInput();
      typeText('123 Nowhere Lane');

      expect(
        fixture.nativeElement.querySelector('.dlc-address-autocomplete__empty')?.textContent
      ).toContain('No matching addresses');
    });

    it('should NOT render the empty-results row for a short query', () => {
      focusInput();
      typeText('12');

      expect(listboxEl()).toBeNull();
    });
  });
});
