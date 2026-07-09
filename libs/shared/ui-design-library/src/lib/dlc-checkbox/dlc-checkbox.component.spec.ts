import type { ComponentFixture } from '@angular/core/testing';

import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { DlcCheckboxComponent } from './dlc-checkbox.component';

@Component({
  imports: [DlcCheckboxComponent],
  template: `
    <dlc-checkbox [checked]="checked()" ariaLabel="Test option" (checkedChange)="onChange($event)">
      <span class="projected-label">Test option</span>
    </dlc-checkbox>
  `,
})
class ControlledHostComponent {
  readonly checked = signal(false);
  lastEmitted: boolean | undefined;

  onChange(next: boolean): void {
    this.lastEmitted = next;
    this.checked.set(next);
  }
}

describe('DlcCheckboxComponent', () => {
  describe('standalone', () => {
    let fixture: ComponentFixture<DlcCheckboxComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [DlcCheckboxComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(DlcCheckboxComponent);
      fixture.detectChanges();
    });

    it('should create', () => {
      expect(fixture.componentInstance).toBeTruthy();
    });

    it('should default to unchecked', () => {
      expect(fixture.componentInstance['_checked']()).toBe(false);
    });

    it('should render a sr-only native checkbox driving a visual box', () => {
      const input: HTMLInputElement = fixture.nativeElement.querySelector(
        'input[type="checkbox"].dlc-checkbox__input'
      );
      const box = fixture.nativeElement.querySelector('.dlc-checkbox__box');
      expect(input).toBeTruthy();
      expect(box).toBeTruthy();
    });

    it('should apply the aria label to the native input', () => {
      fixture.componentRef.setInput('ariaLabel', 'Coming Soon');
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      expect(input.getAttribute('aria-label')).toBe('Coming Soon');
    });

    it('should apply aria-describedby to the native input when provided', () => {
      fixture.componentRef.setInput('ariaDescribedby', 'status-option-desc-ComingSoon');
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      expect(input.getAttribute('aria-describedby')).toBe('status-option-desc-ComingSoon');
    });

    it('should snap the input back when a controlled consumer ignores the change', () => {
      let emitted: boolean | undefined;
      fixture.componentInstance.checkedChange.subscribe((v: boolean) => (emitted = v));
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');

      input.checked = true;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      // The toggle was emitted but never echoed into `checked` — the visual
      // state must not desync from the (unchanged) controlled state.
      expect(emitted).toBe(true);
      expect(input.checked).toBe(false);
      expect(fixture.componentInstance['_checked']()).toBe(false);
    });

    it('should writeValue and reflect form state over the checked input', () => {
      fixture.componentRef.setInput('checked', false);
      fixture.componentInstance.writeValue(true);
      expect(fixture.componentInstance['_checked']()).toBe(true);
    });

    it('should self-apply user toggles when form-bound', () => {
      fixture.componentInstance.registerOnChange(() => {
        // form binding registered
      });
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      input.checked = true;
      input.dispatchEvent(new Event('change'));
      expect(fixture.componentInstance['_checked']()).toBe(true);
    });

    it('should disable the native input via setDisabledState', () => {
      fixture.componentInstance.setDisabledState(true);
      fixture.detectChanges();
      const input: HTMLInputElement = fixture.nativeElement.querySelector('input');
      expect(input.disabled).toBe(true);
    });
  });

  describe('controlled', () => {
    let fixture: ComponentFixture<ControlledHostComponent>;

    beforeEach(async () => {
      await TestBed.configureTestingModule({
        imports: [ControlledHostComponent],
      }).compileComponents();

      fixture = TestBed.createComponent(ControlledHostComponent);
      fixture.detectChanges();
    });

    function queryInput(): HTMLInputElement {
      return fixture.nativeElement.querySelector('input[type="checkbox"]');
    }

    it('should emit checkedChange and re-sync from the parent', () => {
      const input = queryInput();
      input.checked = true;
      input.dispatchEvent(new Event('change'));
      fixture.detectChanges();

      expect(fixture.componentInstance.lastEmitted).toBe(true);
      expect(queryInput().checked).toBe(true);
    });

    it('should follow parent-driven checked changes (e.g. Clear All)', () => {
      fixture.componentInstance.checked.set(true);
      fixture.detectChanges();
      expect(queryInput().checked).toBe(true);

      fixture.componentInstance.checked.set(false);
      fixture.detectChanges();
      expect(queryInput().checked).toBe(false);
    });

    it('should render projected label content inside the label click target', () => {
      const projected = fixture.nativeElement.querySelector(
        'label.dlc-checkbox__label .projected-label'
      );
      expect(projected?.textContent).toContain('Test option');
    });
  });
});
