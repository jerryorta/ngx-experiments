import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import {
  type DlcTemplatePickerItem,
  DlcTemplatePickerModalComponent,
} from './dlc-template-picker-modal.component';

const MOCK_TEMPLATES: DlcTemplatePickerItem[] = [
  {
    description: 'Standard buyer-side workflow with 12 essential tasks.',
    icon: 'home',
    id: 'buyer-standard',
    label: 'Buyer Standard',
    taskCount: 12,
  },
  {
    description: 'Seller-side listing workflow covering all pre-close steps.',
    icon: 'sell',
    id: 'seller-listing',
    label: 'Seller Listing',
    taskCount: 9,
  },
];

describe('DlcTemplatePickerModalComponent', () => {
  let component: DlcTemplatePickerModalComponent;
  let fixture: ComponentFixture<DlcTemplatePickerModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcTemplatePickerModalComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcTemplatePickerModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-template-picker-modal host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-template-picker-modal')).toBe(true);
  });

  it('should not render the dlc-dialog overlay when visible is false', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-dialog__overlay')).toBeNull();
  });

  it('should render the dlc-dialog overlay when visible is true', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-dialog__overlay')).toBeTruthy();
  });

  it('should emit dismissed when the dlc-dialog close button is clicked', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));
    const closeBtn = fixture.nativeElement.querySelector(
      'button[aria-label="Close dialog"]'
    ) as HTMLButtonElement;
    closeBtn.click();
    expect(emitted).toBe(true);
  });

  it('should emit dismissed when the dlc-dialog backdrop is clicked', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));
    const overlay = fixture.nativeElement.querySelector('.dlc-dialog__overlay') as HTMLElement;
    overlay.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(emitted).toBe(true);
  });

  it('should NOT emit dismissed when a click originates inside the dlc-dialog panel', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));
    const panel = fixture.nativeElement.querySelector('.dlc-dialog__panel') as HTMLElement;
    panel.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(emitted).toBe(false);
  });

  it('should emit dismissed when Escape routes through dlc-dialog', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();
    let emitted = false;
    component.dismissed.subscribe(() => (emitted = true));
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(emitted).toBe(true);
  });

  it('should emit templateSelected with template id when Apply is clicked after selection', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', MOCK_TEMPLATES);
    fixture.detectChanges();

    let emittedId: string | undefined;
    component.templateSelected.subscribe((id: string) => (emittedId = id));

    // Select the first template card
    const cards = fixture.nativeElement.querySelectorAll(
      '.dlc-template-picker-modal__template-card'
    ) as NodeListOf<HTMLButtonElement>;
    cards[0].click();
    fixture.detectChanges();

    // Click Apply Template
    const applyBtn = Array.from(fixture.nativeElement.querySelectorAll('dlc-button')).find(
      (el: Element) => el.textContent?.includes('Apply Template')
    ) as HTMLElement | undefined;
    applyBtn?.click();

    expect(emittedId).toBe('buyer-standard');
  });

  it('should have Apply button disabled when no template is selected', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', MOCK_TEMPLATES);
    fixture.detectChanges();

    // DlcButtonComponent reflects disabled state via the dlc-button--disabled CSS class on the host
    const applyBtn = Array.from(fixture.nativeElement.querySelectorAll('dlc-button')).find(
      (el: Element) => el.textContent?.includes('Apply Template')
    ) as HTMLElement | undefined;

    expect(applyBtn?.classList.contains('dlc-button--disabled')).toBe(true);
  });

  it('should reset selectedId when visible transitions from true to false (REX-449)', () => {
    fixture.componentRef.setInput('visible', true);
    fixture.componentRef.setInput('templates', MOCK_TEMPLATES);
    fixture.detectChanges();

    // Select the first template — Apply becomes enabled.
    const cards = fixture.nativeElement.querySelectorAll(
      '.dlc-template-picker-modal__template-card'
    ) as NodeListOf<HTMLButtonElement>;
    cards[0].click();
    fixture.detectChanges();
    expect(component['selectedId']()).toBe('buyer-standard');

    // Close the modal (visible → false), then reopen.
    fixture.componentRef.setInput('visible', false);
    fixture.detectChanges();
    fixture.componentRef.setInput('visible', true);
    fixture.detectChanges();

    // Selection cleared and Apply Template disabled again.
    expect(component['selectedId']()).toBeNull();
    const applyBtn = Array.from(fixture.nativeElement.querySelectorAll('dlc-button')).find(
      (el: Element) => el.textContent?.includes('Apply Template')
    ) as HTMLElement | undefined;
    expect(applyBtn?.classList.contains('dlc-button--disabled')).toBe(true);
  });
});
