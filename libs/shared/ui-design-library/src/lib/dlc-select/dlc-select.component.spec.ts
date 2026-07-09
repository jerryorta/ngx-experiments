import { OverlayContainer } from '@angular/cdk/overlay';
import { TestBed } from '@angular/core/testing';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';

import { DlcSelectComponent } from './dlc-select.component';

const TEST_OPTIONS = [
  { label: 'Option Alpha', value: 'alpha' },
  { label: 'Option Beta', value: 'beta' },
  { label: 'Option Gamma', value: 'gamma' },
];

describe('DlcSelectComponent', () => {
  let component: DlcSelectComponent;
  let fixture: ComponentFixture<DlcSelectComponent>;
  let el: HTMLElement;
  let overlayContainerEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcSelectComponent],
      providers: [provideAnimationsAsync()],
    }).compileComponents();

    overlayContainerEl = TestBed.inject(OverlayContainer).getContainerElement();
    fixture = TestBed.createComponent(DlcSelectComponent);
    component = fixture.componentInstance;
    el = fixture.nativeElement;
    fixture.detectChanges();
  });

  afterEach(() => {
    // Ensure the overlay is cleaned up between tests.
    fixture.destroy();
  });

  // ---------------------------------------------------------------------------
  // Basic rendering
  // ---------------------------------------------------------------------------

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-select host class', () => {
    expect(el.classList.contains('dlc-select')).toBe(true);
  });

  it('should render the trigger button with aria-haspopup listbox', () => {
    const trigger = el.querySelector('.dlc-select__trigger');
    expect(trigger).toBeTruthy();
    expect(trigger?.tagName.toLowerCase()).toBe('button');
    expect(trigger?.getAttribute('aria-haspopup')).toBe('listbox');
  });

  it('should show placeholder when no value is selected', () => {
    fixture.componentRef.setInput('placeholder', 'Pick one');
    fixture.detectChanges();
    const placeholder = el.querySelector('.dlc-select__placeholder');
    expect(placeholder?.textContent?.trim()).toBe('Pick one');
  });

  it('should not show panel initially', () => {
    expect(overlayContainerEl.querySelector('.dlc-select__panel')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Opening and closing
  // ---------------------------------------------------------------------------

  it('should open the panel on trigger click', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    const trigger = el.querySelector<HTMLElement>('.dlc-select__trigger')!;
    trigger.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);
    expect(overlayContainerEl.querySelector('.dlc-select__panel')).toBeTruthy();
  });

  it('should close the panel on second trigger click', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    const trigger = el.querySelector<HTMLElement>('.dlc-select__trigger')!;
    trigger.click();
    fixture.detectChanges();
    trigger.click();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
    expect(overlayContainerEl.querySelector('.dlc-select__panel')).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Rendering options
  // ---------------------------------------------------------------------------

  it('should render all options when panel is open', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    const options = overlayContainerEl.querySelectorAll('.dlc-select__option');
    expect(options.length).toBe(3);
    expect(options[0].textContent?.trim()).toContain('Option Alpha');
    expect(options[1].textContent?.trim()).toContain('Option Beta');
    expect(options[2].textContent?.trim()).toContain('Option Gamma');
  });

  it('should set role="option" and aria-selected on each option', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    const options = overlayContainerEl.querySelectorAll('.dlc-select__option');
    options.forEach(opt => {
      expect(opt.getAttribute('role')).toBe('option');
      expect(opt.getAttribute('aria-selected')).not.toBeNull();
    });
  });

  // ---------------------------------------------------------------------------
  // Selecting an option
  // ---------------------------------------------------------------------------

  it('should select an option on click and close panel', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    const options = overlayContainerEl.querySelectorAll<HTMLElement>('.dlc-select__option');
    options[1].click();
    fixture.detectChanges();
    expect(component.selectedValue()).toBe('beta');
    expect(component.isOpen()).toBe(false);
  });

  it('should show the selected label in the trigger after selection', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    const options = overlayContainerEl.querySelectorAll<HTMLElement>('.dlc-select__option');
    options[0].click();
    fixture.detectChanges();
    const trigger = el.querySelector('.dlc-select__trigger')!;
    expect(trigger.textContent).toContain('Option Alpha');
  });

  it('should mark selected option with dlc-select__option--selected class', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.selectOption('gamma');
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    const options = overlayContainerEl.querySelectorAll('.dlc-select__option');
    expect(options[2].classList.contains('dlc-select__option--selected')).toBe(true);
    expect(options[0].classList.contains('dlc-select__option--selected')).toBe(false);
  });

  it('should emit selectedValueChange when an option is selected', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    const emitted: (null | string)[] = [];
    component.selectedValueChange.subscribe((v: null | string) => emitted.push(v));
    component.open();
    fixture.detectChanges();
    component.selectOption('beta');
    expect(emitted).toEqual(['beta']);
  });

  it('should call onChange (CVA) when an option is selected', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    const changes: (null | string)[] = [];
    component.registerOnChange((v: null | string) => changes.push(v));
    component.selectOption('alpha');
    expect(changes).toEqual(['alpha']);
  });

  // ---------------------------------------------------------------------------
  // CVA — writeValue
  // ---------------------------------------------------------------------------

  it('should reflect written value via CVA writeValue', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.writeValue('gamma');
    fixture.detectChanges();
    expect(component.selectedValue()).toBe('gamma');
    expect(component.selectedLabel()).toBe('Option Gamma');
  });

  it('should clear selection when writeValue is called with null', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.writeValue('alpha');
    fixture.detectChanges();
    component.writeValue(null);
    fixture.detectChanges();
    expect(component.selectedValue()).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Disabled state
  // ---------------------------------------------------------------------------

  it('should not open when disabled input is true', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    component.toggleOpen();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('should not open when setDisabledState(true) is called via CVA', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.setDisabledState(true);
    fixture.detectChanges();
    component.toggleOpen();
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('should add dlc-select__trigger--disabled class when disabled', () => {
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(el.querySelector('.dlc-select__trigger--disabled')).toBeTruthy();
  });

  it('should not select option when disabled', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    component.selectOption('alpha');
    expect(component.selectedValue()).toBeNull();
  });

  // ---------------------------------------------------------------------------
  // Keyboard interaction
  // ---------------------------------------------------------------------------

  it('should open panel on Enter key when closed', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' });
    el.dispatchEvent(event);
    fixture.detectChanges();
    expect(component.isOpen()).toBe(true);
  });

  it('should close panel on Escape key', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { bubbles: true, key: 'Escape' });
    el.dispatchEvent(event);
    fixture.detectChanges();
    expect(component.isOpen()).toBe(false);
  });

  it('should navigate options with ArrowDown', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    expect(component.focusedIndex()).toBe(-1);
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(component.focusedIndex()).toBe(0);
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(component.focusedIndex()).toBe(1);
  });

  it('should navigate options with ArrowUp', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    component.focusedIndex.set(2);
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(component.focusedIndex()).toBe(1);
  });

  it('should select focused option on Enter when panel is open', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    component.focusedIndex.set(1);
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'Enter' }));
    fixture.detectChanges();
    expect(component.selectedValue()).toBe('beta');
    expect(component.isOpen()).toBe(false);
  });

  it('should not navigate below last option with ArrowDown', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    component.focusedIndex.set(2);
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowDown' }));
    fixture.detectChanges();
    expect(component.focusedIndex()).toBe(2);
  });

  it('should not navigate above first option with ArrowUp', () => {
    fixture.componentRef.setInput('options', TEST_OPTIONS);
    fixture.detectChanges();
    component.open();
    fixture.detectChanges();
    component.focusedIndex.set(0);
    el.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, key: 'ArrowUp' }));
    fixture.detectChanges();
    expect(component.focusedIndex()).toBe(0);
  });
});
