import type { ComponentFixture } from '@angular/core/testing';

import { ESCAPE } from '@angular/cdk/keycodes';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { NgeTimePickerComponent } from './nge-time-picker.component';

// jsdom does not implement scrollIntoView; the picker calls it when focusing a column option.
HTMLElement.prototype.scrollIntoView = jest.fn();

// Pin "now" so the seeded draft (when there is no value) is deterministic: 14:37 local.
const NOW = new Date('2026-06-15T14:37:00');

/** Mount the bare component; locale defaults to `en-US` (12-hour) for stable text assertions. */
function setup(locale = 'en-US'): {
  component: NgeTimePickerComponent;
  el: HTMLElement;
  fixture: ComponentFixture<NgeTimePickerComponent>;
} {
  TestBed.configureTestingModule({ imports: [NgeTimePickerComponent] });
  const fixture = TestBed.createComponent(NgeTimePickerComponent);
  fixture.componentRef.setInput('locale', locale);
  fixture.detectChanges();
  return {
    component: fixture.componentInstance,
    el: fixture.nativeElement as HTMLElement,
    fixture,
  };
}

function overlayContainerEl(): HTMLElement {
  return TestBed.inject(OverlayContainer).getContainerElement();
}

/** The open panel inside the CDK overlay container, or null when closed. */
function panel(): HTMLElement | null {
  return overlayContainerEl().querySelector<HTMLElement>('[data-testid="nge-time-picker-panel"]');
}

function trigger(el: HTMLElement): HTMLButtonElement {
  return el.querySelector<HTMLButtonElement>(
    '[data-testid="nge-time-picker-trigger"]'
  ) as HTMLButtonElement;
}

function hourCell(hour24: number): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    `[data-testid="nge-time-picker-hour"][data-hour="${hour24}"]`
  );
}

function minuteCell(minute: number): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    `[data-testid="nge-time-picker-minute"][data-minute="${minute}"]`
  );
}

function meridiemCell(period: 'am' | 'pm'): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    `[data-testid="nge-time-picker-meridiem"][data-meridiem="${period}"]`
  );
}

function meridiemColumn(): HTMLElement | null {
  return overlayContainerEl().querySelector<HTMLElement>(
    '[data-testid="nge-time-picker-meridiems"]'
  );
}

function dial(): HTMLElement | null {
  return overlayContainerEl().querySelector<HTMLElement>('[data-testid="nge-time-picker-dial"]');
}

function surfaceToggle(): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    '[data-testid="nge-time-picker-surface-toggle"]'
  );
}

function clockHourTab(): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    '[data-testid="nge-time-picker-clock-hour-tab"]'
  );
}

function clockMinuteTab(): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    '[data-testid="nge-time-picker-clock-minute-tab"]'
  );
}

function doneBtn(): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    '[data-testid="nge-time-picker-done"]'
  );
}

function cancelBtn(): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    '[data-testid="nge-time-picker-cancel"]'
  );
}

function open(fixture: ComponentFixture<unknown>, el: HTMLElement): void {
  trigger(el).click();
  fixture.detectChanges();
}

function keydown(target: Element | null, key: string): void {
  target?.dispatchEvent(new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key }));
}

/** Reactive-forms host exercising the ControlValueAccessor through `[formControl]`. */
@Component({
  imports: [NgeTimePickerComponent, ReactiveFormsModule],
  selector: 'nge-time-picker-host',
  standalone: true,
  template: `<nge-time-picker
    [formControl]="control"
    locale="en-US"
    (timeChange)="changes.push($event)"
  />`,
})
class HostComponent {
  readonly changes: string[] = [];
  readonly control = new FormControl<null | string>(null);
}

function setupHost(initial: null | string = null): {
  fixture: ComponentFixture<HostComponent>;
  host: HostComponent;
} {
  TestBed.configureTestingModule({ imports: [HostComponent] });
  const fixture = TestBed.createComponent(HostComponent);
  fixture.componentInstance.control.setValue(initial);
  fixture.detectChanges();
  return { fixture, host: fixture.componentInstance };
}

describe('NgeTimePickerComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(NOW);
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
    jest.useRealTimers();
  });

  describe('creation + trigger', () => {
    it('creates and tags the host with the nge-time-picker class', () => {
      const { el, fixture } = setup();
      expect(fixture.componentInstance).toBeTruthy();
      expect(el.classList.contains('nge-time-picker')).toBe(true);
    });

    it('shows the placeholder when no value is selected', () => {
      const { el, fixture } = setup();
      fixture.componentRef.setInput('placeholder', 'Pick a time');
      fixture.detectChanges();
      expect(trigger(el).textContent).toContain('Pick a time');
      expect(trigger(el).classList.contains('nge-time-picker__trigger--placeholder')).toBe(true);
    });

    it('shows the 12-hour formatted value after writeValue (en-US)', () => {
      const { component, el, fixture } = setup('en-US');
      component.writeValue('14:30');
      fixture.detectChanges();
      expect(trigger(el).textContent).toContain('2:30');
      expect(trigger(el).textContent).toContain('PM');
      expect(trigger(el).classList.contains('nge-time-picker__trigger--placeholder')).toBe(false);
    });

    it('shows the 24-hour formatted value after writeValue (en-GB)', () => {
      const { component, el, fixture } = setup('en-GB');
      component.writeValue('14:30');
      fixture.detectChanges();
      expect(trigger(el).textContent).toContain('14:30');
    });
  });

  describe('open / close', () => {
    it('opens an anchored dialog panel on the trigger click', () => {
      const { el, fixture } = setup();
      expect(panel()).toBeNull();
      open(fixture, el);
      const opened = panel();
      expect(opened).toBeTruthy();
      expect(opened?.getAttribute('role')).toBe('dialog');
      expect(trigger(el).getAttribute('aria-expanded')).toBe('true');
    });

    it('closes the panel on a second trigger click', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      expect(panel()).toBeTruthy();
      open(fixture, el);
      expect(panel()).toBeNull();
    });

    it('closes the panel on Escape', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      const pane = overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-pane');
      pane?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, keyCode: ESCAPE } as KeyboardEventInit)
      );
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('closes the panel on a backdrop (outside) click', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('returns focus to the trigger when the panel closes', () => {
      const { el, fixture } = setup();
      const focusSpy = jest.spyOn(trigger(el), 'focus');
      open(fixture, el);
      cancelBtn()?.click();
      fixture.detectChanges();
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('draft + commit (Done / Cancel)', () => {
    it('does not change the value while editing the draft — only on Done', () => {
      const { component, el, fixture } = setup('en-GB');
      const emitted: string[] = [];
      component.timeChange.subscribe(value => emitted.push(value));
      open(fixture, el);

      hourCell(9)?.click();
      minuteCell(15)?.click();
      fixture.detectChanges();

      // Draft moved (the preview reflects it) but nothing committed yet.
      expect(emitted).toHaveLength(0);
      expect(trigger(el).classList.contains('nge-time-picker__trigger--placeholder')).toBe(true);

      doneBtn()?.click();
      fixture.detectChanges();

      // The emitted value is canonical 24h `HH:mm`; the trigger shows the locale display (en-GB → 9:15).
      expect(emitted).toEqual(['09:15']);
      expect(trigger(el).textContent).toContain('9:15');
      expect(panel()).toBeNull();
    });

    it('discards the draft when Cancel is pressed', () => {
      const { component, el, fixture } = setup('en-GB');
      const emitted: string[] = [];
      component.timeChange.subscribe(value => emitted.push(value));
      open(fixture, el);

      hourCell(9)?.click();
      cancelBtn()?.click();
      fixture.detectChanges();

      expect(emitted).toHaveLength(0);
      expect(trigger(el).classList.contains('nge-time-picker__trigger--placeholder')).toBe(true);
      expect(panel()).toBeNull();
    });

    it('discards the draft when Escape is pressed', () => {
      const { component, el, fixture } = setup('en-GB');
      const emitted: string[] = [];
      component.timeChange.subscribe(value => emitted.push(value));
      open(fixture, el);

      hourCell(9)?.click();
      const pane = overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-pane');
      pane?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, keyCode: ESCAPE } as KeyboardEventInit)
      );
      fixture.detectChanges();

      expect(emitted).toHaveLength(0);
      expect(panel()).toBeNull();
    });
  });

  describe('ControlValueAccessor', () => {
    it('round-trips a value through a reactive FormControl', () => {
      const { fixture, host } = setupHost('09:30');
      const el = fixture.nativeElement as HTMLElement;
      expect(trigger(el).textContent).toContain('9:30');
      expect(trigger(el).textContent).toContain('AM');

      open(fixture, el);
      hourCell(10)?.click();
      doneBtn()?.click();
      fixture.detectChanges();

      expect(host.control.value).toBe('10:30');
      expect(host.changes).toEqual(['10:30']);
    });

    it('reflects a programmatic control.setValue onto the trigger', () => {
      const { fixture, host } = setupHost();
      const el = fixture.nativeElement as HTMLElement;
      host.control.setValue('23:45');
      fixture.detectChanges();
      expect(trigger(el).textContent).toContain('11:45');
      expect(trigger(el).textContent).toContain('PM');
    });

    it('disables the trigger when the control is disabled (setDisabledState)', () => {
      const { fixture, host } = setupHost();
      const el = fixture.nativeElement as HTMLElement;
      host.control.disable();
      fixture.detectChanges();
      expect(trigger(el).disabled).toBe(true);

      trigger(el).click();
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });
  });

  describe('disabled input', () => {
    it('does not open while [disabled] is true', () => {
      const { el, fixture } = setup();
      fixture.componentRef.setInput('disabled', true);
      fixture.detectChanges();
      expect(trigger(el).disabled).toBe(true);
      trigger(el).click();
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });
  });

  describe('12-hour vs 24-hour presentation', () => {
    it('shows the meridiem column and 12-hour labels for a 12-hour locale (en-US)', () => {
      const { el, fixture } = setup('en-US');
      open(fixture, el);
      // Seed is 14:37 → PM half; the hour column shows 12, 1…11 mapped to 12…23.
      expect(meridiemColumn()).toBeTruthy();
      expect(meridiemCell('am')).toBeTruthy();
      expect(meridiemCell('pm')).toBeTruthy();
      expect(hourCell(12)?.textContent?.trim()).toBe('12');
      expect(hourCell(13)?.textContent?.trim()).toBe('1');
      expect(hourCell(23)?.textContent?.trim()).toBe('11');
    });

    it('hides the meridiem column and uses 24-hour labels for a 24-hour locale (en-GB)', () => {
      const { el, fixture } = setup('en-GB');
      open(fixture, el);
      expect(meridiemColumn()).toBeNull();
      expect(hourCell(0)?.textContent?.trim()).toBe('00');
      expect(hourCell(9)?.textContent?.trim()).toBe('09');
      expect(hourCell(13)?.textContent?.trim()).toBe('13');
    });

    it('honours an explicit [hour12]=false override on a 12-hour locale', () => {
      const { el, fixture } = setup('en-US');
      fixture.componentRef.setInput('hour12', false);
      fixture.detectChanges();
      open(fixture, el);
      expect(meridiemColumn()).toBeNull();
      expect(hourCell(13)?.textContent?.trim()).toBe('13');
    });
  });

  describe('meridiem (AM / PM)', () => {
    it('shifts the committed 24-hour value by 12 hours when PM is chosen', () => {
      const { component, el, fixture } = setup('en-US');
      const emitted: string[] = [];
      component.timeChange.subscribe(value => emitted.push(value));
      component.writeValue('09:30');
      fixture.detectChanges();
      open(fixture, el);

      meridiemCell('pm')?.click();
      doneBtn()?.click();
      fixture.detectChanges();

      expect(emitted).toEqual(['21:30']);
    });
  });

  describe('min / max bounds', () => {
    it('disables out-of-range hour + minute options', () => {
      const { el, fixture } = setup('en-GB');
      fixture.componentRef.setInput('min', '10:00');
      fixture.componentRef.setInput('max', '12:00');
      fixture.detectChanges();
      open(fixture, el);

      // Seed 14:37 clamps to the max 12:00, so the draft hour is 12.
      expect(hourCell(12)?.getAttribute('aria-selected')).toBe('true');
      // 09:xx and 13:xx are wholly outside [10:00, 12:00].
      expect(hourCell(9)?.getAttribute('aria-disabled')).toBe('true');
      expect(hourCell(13)?.getAttribute('aria-disabled')).toBe('true');
      expect(hourCell(11)?.getAttribute('aria-disabled')).toBeNull();
      // With the draft hour at 12, only minute 00 is in range (12:00 = max).
      expect(minuteCell(0)?.getAttribute('aria-disabled')).toBeNull();
      expect(minuteCell(1)?.getAttribute('aria-disabled')).toBe('true');
    });

    it('clamps an out-of-range written value into bounds on open', () => {
      const { component, el, fixture } = setup('en-GB');
      fixture.componentRef.setInput('max', '12:00');
      fixture.detectChanges();
      component.writeValue('14:00');
      fixture.detectChanges();
      open(fixture, el);
      expect(hourCell(12)?.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('minuteStep', () => {
    it('lists minutes in steps of the configured size', () => {
      const { component, el, fixture } = setup('en-GB');
      fixture.componentRef.setInput('minuteStep', 15);
      component.writeValue('14:30');
      fixture.detectChanges();
      open(fixture, el);

      const minutes = overlayContainerEl().querySelectorAll(
        '[data-testid="nge-time-picker-minute"]'
      );
      expect(minutes).toHaveLength(4);
      expect(minuteCell(30)?.getAttribute('aria-selected')).toBe('true');
      expect(minuteCell(7)).toBeNull();
    });

    it('keeps an off-step written minute selectable', () => {
      const { component, el, fixture } = setup('en-GB');
      fixture.componentRef.setInput('minuteStep', 15);
      component.writeValue('14:37');
      fixture.detectChanges();
      open(fixture, el);

      const minutes = overlayContainerEl().querySelectorAll(
        '[data-testid="nge-time-picker-minute"]'
      );
      expect(minutes).toHaveLength(5);
      expect(minuteCell(37)?.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('keyboard navigation', () => {
    it('moves the hour selection with ArrowDown (selection follows focus)', () => {
      const { el, fixture } = setup('en-GB');
      open(fixture, el);
      // Seed 14:37 → hour 14 is the single tab stop.
      expect(hourCell(14)?.getAttribute('tabindex')).toBe('0');

      keydown(hourCell(14), 'ArrowDown');
      fixture.detectChanges();

      expect(hourCell(15)?.getAttribute('aria-selected')).toBe('true');
      expect(hourCell(15)?.getAttribute('tabindex')).toBe('0');
      expect(hourCell(14)?.getAttribute('tabindex')).toBe('-1');
    });

    it('moves the minute selection with ArrowUp', () => {
      const { el, fixture } = setup('en-GB');
      open(fixture, el);
      expect(minuteCell(37)?.getAttribute('aria-selected')).toBe('true');

      keydown(minuteCell(37), 'ArrowUp');
      fixture.detectChanges();

      expect(minuteCell(36)?.getAttribute('aria-selected')).toBe('true');
    });
  });

  describe('selection surface', () => {
    it('renders the scrollable columns surface by default', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      expect(overlayContainerEl().querySelector('.nge-time-picker__columns')).toBeTruthy();
      expect(
        overlayContainerEl().querySelector('[data-testid="nge-time-picker-hours"]')
      ).toBeTruthy();
    });

    it('renders the analog clock surface for selectionMode="clock" (12-hour)', () => {
      const { el, fixture } = setup('en-US');
      fixture.componentRef.setInput('selectionMode', 'clock');
      fixture.detectChanges();
      open(fixture, el);
      expect(dial()).toBeTruthy();
      expect(overlayContainerEl().querySelector('.nge-time-picker__columns')).toBeNull();
    });

    it('keeps a 24-hour locale on columns and hides the surface toggle', () => {
      const { el, fixture } = setup('en-GB');
      fixture.componentRef.setInput('selectionMode', 'clock');
      fixture.detectChanges();
      open(fixture, el);
      expect(dial()).toBeNull();
      expect(overlayContainerEl().querySelector('.nge-time-picker__columns')).toBeTruthy();
      expect(surfaceToggle()).toBeNull();
    });
  });

  describe('analog clock', () => {
    it('flips columns → clock via the toggle, preserving the draft', () => {
      const { component, el, fixture } = setup('en-US');
      component.writeValue('09:30');
      fixture.detectChanges();
      open(fixture, el);
      expect(overlayContainerEl().querySelector('.nge-time-picker__columns')).toBeTruthy();

      surfaceToggle()?.click();
      fixture.detectChanges();

      expect(dial()).toBeTruthy();
      expect(overlayContainerEl().querySelector('.nge-time-picker__columns')).toBeNull();
      // The shared draft carries across the switch.
      expect(clockHourTab()?.textContent?.trim()).toBe('9');
      expect(clockMinuteTab()?.textContent?.trim()).toBe('30');
    });

    it('steps the dial with the keyboard (two-step) and commits on Done', () => {
      const { component, el, fixture } = setup('en-US');
      const emitted: string[] = [];
      component.timeChange.subscribe(value => emitted.push(value));
      fixture.componentRef.setInput('selectionMode', 'clock');
      fixture.detectChanges();
      open(fixture, el); // seed 14:37 → 2:37 PM, editing the hour

      keydown(dial(), 'ArrowUp'); // hour 2 → 3
      fixture.detectChanges();
      expect(clockHourTab()?.textContent?.trim()).toBe('3');

      keydown(dial(), 'Enter'); // advance to the minute step
      fixture.detectChanges();
      keydown(dial(), 'ArrowDown'); // minute 37 → 36
      fixture.detectChanges();

      doneBtn()?.click();
      fixture.detectChanges();
      expect(emitted).toEqual(['15:36']);
    });

    it('shifts the committed hour when AM/PM is toggled on the clock', () => {
      const { component, el, fixture } = setup('en-US');
      const emitted: string[] = [];
      component.timeChange.subscribe(value => emitted.push(value));
      component.writeValue('09:30');
      fixture.componentRef.setInput('selectionMode', 'clock');
      fixture.detectChanges();
      open(fixture, el); // 9:30 AM

      meridiemCell('pm')?.click();
      doneBtn()?.click();
      fixture.detectChanges();
      expect(emitted).toEqual(['21:30']);
    });
  });
});
