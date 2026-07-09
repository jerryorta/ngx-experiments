import type { ComponentFixture } from '@angular/core/testing';

import { ESCAPE } from '@angular/cdk/keycodes';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { FormControl, ReactiveFormsModule } from '@angular/forms';

import { NgeDatePickerComponent } from './nge-date-picker.component';

// jsdom does not implement scrollIntoView; the year view calls it when focusing a year.
HTMLElement.prototype.scrollIntoView = jest.fn();

// Pin "today" so the seeded visible month + today highlight are deterministic. A
// far-from-boundary noon avoids any DST / day-rollover edge while the suite runs.
const TODAY = new Date('2026-06-15T12:00:00');

/** Mount the bare component; `en-US` locale keeps formatted text assertions stable. */
function setup(): {
  component: NgeDatePickerComponent;
  el: HTMLElement;
  fixture: ComponentFixture<NgeDatePickerComponent>;
} {
  TestBed.configureTestingModule({ imports: [NgeDatePickerComponent] });
  const fixture = TestBed.createComponent(NgeDatePickerComponent);
  fixture.componentRef.setInput('locale', 'en-US');
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
  return overlayContainerEl().querySelector<HTMLElement>('[data-testid="nge-date-picker-panel"]');
}

function trigger(el: HTMLElement): HTMLButtonElement {
  return el.querySelector<HTMLButtonElement>(
    '[data-testid="nge-date-picker-trigger"]'
  ) as HTMLButtonElement;
}

/** A day cell button in the open panel, by its ISO `data-date`. */
function dayCell(iso: string): HTMLButtonElement | null {
  return overlayContainerEl().querySelector<HTMLButtonElement>(
    `[data-testid="nge-date-picker-day"][data-date="${iso}"]`
  );
}

function open(fixture: ComponentFixture<unknown>, el: HTMLElement): void {
  trigger(el).click();
  fixture.detectChanges();
}

/** Reactive-forms host exercising the ControlValueAccessor through `[formControl]`. */
@Component({
  imports: [NgeDatePickerComponent, ReactiveFormsModule],
  selector: 'nge-date-picker-host',
  standalone: true,
  template: `<nge-date-picker
    [formControl]="control"
    locale="en-US"
    (dateChange)="changes.push($event)"
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

describe('NgeDatePickerComponent', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(TODAY);
  });

  afterEach(() => {
    TestBed.inject(OverlayContainer).ngOnDestroy();
    jest.useRealTimers();
  });

  describe('creation + trigger', () => {
    it('creates and tags the host with the nge-date-picker class', () => {
      const { el, fixture } = setup();
      expect(fixture.componentInstance).toBeTruthy();
      expect(el.classList.contains('nge-date-picker')).toBe(true);
    });

    it('shows the placeholder when no value is selected', () => {
      const { el, fixture } = setup();
      fixture.componentRef.setInput('placeholder', 'Pick a day');
      fixture.detectChanges();
      expect(trigger(el).textContent).toContain('Pick a day');
      expect(trigger(el).classList.contains('nge-date-picker__trigger--placeholder')).toBe(true);
    });

    it('shows the formatted value after writeValue', () => {
      const { component, el, fixture } = setup();
      component.writeValue('2026-06-15');
      fixture.detectChanges();
      expect(trigger(el).textContent).toContain('Jun');
      expect(trigger(el).textContent).toContain('15');
      expect(trigger(el).textContent).toContain('2026');
      expect(trigger(el).classList.contains('nge-date-picker__trigger--placeholder')).toBe(false);
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

    it('seeds the visible month from today when there is no value', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      expect(
        overlayContainerEl().querySelector('[data-testid="nge-date-picker-month-label"]')
          ?.textContent
      ).toContain('June 2026');
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
      const backdrop = overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-backdrop');
      backdrop?.click();
      fixture.detectChanges();
      expect(panel()).toBeNull();
    });

    it('returns focus to the trigger when the panel closes', () => {
      const { el, fixture } = setup();
      const focusSpy = jest.spyOn(trigger(el), 'focus');
      open(fixture, el);
      const pane = overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-pane');
      pane?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, keyCode: ESCAPE } as KeyboardEventInit)
      );
      fixture.detectChanges();
      expect(focusSpy).toHaveBeenCalled();
    });
  });

  describe('selection', () => {
    it('selects a day: sets the value, emits dateChange, and closes', () => {
      const { component, el, fixture } = setup();
      const emitted: string[] = [];
      component.dateChange.subscribe(value => emitted.push(value));

      open(fixture, el);
      dayCell('2026-06-20')?.click();
      fixture.detectChanges();

      expect(emitted).toEqual(['2026-06-20']);
      expect(trigger(el).textContent).toContain('Jun');
      expect(trigger(el).textContent).toContain('20');
      expect(panel()).toBeNull();
    });

    it('marks the selected day with aria-selected + the selected modifier', () => {
      const { component, el, fixture } = setup();
      component.writeValue('2026-06-15');
      fixture.detectChanges();
      open(fixture, el);

      const cell = dayCell('2026-06-15');
      expect(cell?.getAttribute('aria-selected')).toBe('true');
      expect(cell?.classList.contains('nge-date-picker__day--selected')).toBe(true);
    });

    it('pages months with the prev / next nav buttons', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      const monthLabel = () =>
        overlayContainerEl().querySelector('[data-testid="nge-date-picker-month-label"]')
          ?.textContent ?? '';

      overlayContainerEl()
        .querySelector<HTMLButtonElement>('[data-testid="nge-date-picker-next"]')
        ?.click();
      fixture.detectChanges();
      expect(monthLabel()).toContain('July 2026');

      overlayContainerEl()
        .querySelector<HTMLButtonElement>('[data-testid="nge-date-picker-prev"]')
        ?.click();
      overlayContainerEl()
        .querySelector<HTMLButtonElement>('[data-testid="nge-date-picker-prev"]')
        ?.click();
      fixture.detectChanges();
      expect(monthLabel()).toContain('May 2026');
    });
  });

  describe('ControlValueAccessor', () => {
    it('round-trips an ISO value through a reactive FormControl', () => {
      const { fixture, host } = setupHost('2026-06-10');
      const el = fixture.nativeElement as HTMLElement;
      expect(trigger(el).textContent).toContain('Jun');
      expect(trigger(el).textContent).toContain('2026');

      open(fixture, el);
      dayCell('2026-06-22')?.click();
      fixture.detectChanges();

      expect(host.control.value).toBe('2026-06-22');
    });

    it('reflects a programmatic control.setValue onto the trigger', () => {
      const { fixture, host } = setupHost();
      const el = fixture.nativeElement as HTMLElement;
      host.control.setValue('2026-12-25');
      fixture.detectChanges();
      expect(trigger(el).textContent).toContain('Dec');
      expect(trigger(el).textContent).toContain('25');
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

  describe('min / max bounds', () => {
    it('disables out-of-range days and blocks their selection', () => {
      const { component, el, fixture } = setup();
      const emitted: string[] = [];
      component.dateChange.subscribe(value => emitted.push(value));
      fixture.componentRef.setInput('min', '2026-06-10');
      fixture.componentRef.setInput('max', '2026-06-20');
      fixture.detectChanges();
      open(fixture, el);

      const below = dayCell('2026-06-05');
      expect(below?.getAttribute('aria-disabled')).toBe('true');
      expect(below?.classList.contains('nge-date-picker__day--disabled')).toBe(true);

      below?.click();
      fixture.detectChanges();
      expect(emitted).toHaveLength(0);
      expect(panel()).toBeTruthy();
    });

    it('allows selecting an in-range day', () => {
      const { component, el, fixture } = setup();
      const emitted: string[] = [];
      component.dateChange.subscribe(value => emitted.push(value));
      fixture.componentRef.setInput('min', '2026-06-10');
      fixture.componentRef.setInput('max', '2026-06-20');
      fixture.detectChanges();
      open(fixture, el);

      const inRange = dayCell('2026-06-15');
      expect(inRange?.getAttribute('aria-disabled')).toBeNull();
      inRange?.click();
      fixture.detectChanges();
      expect(emitted).toEqual(['2026-06-15']);
    });
  });

  describe('keyboard navigation', () => {
    it('moves roving focus with ArrowRight, then activates the focused day', () => {
      const { component, el, fixture } = setup();
      const emitted: string[] = [];
      component.dateChange.subscribe(value => emitted.push(value));
      open(fixture, el);

      // The anchor (today, Jun 15) is the single tab stop.
      const anchor = dayCell('2026-06-15');
      expect(anchor?.getAttribute('tabindex')).toBe('0');
      anchor?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowRight' })
      );
      fixture.detectChanges();

      // Roving focus advanced to Jun 16, which is now the single tab stop.
      const next = dayCell('2026-06-16');
      expect(next?.getAttribute('tabindex')).toBe('0');
      expect(anchor?.getAttribute('tabindex')).toBe('-1');

      // The day cell is a native <button>; Enter / Space / click all activate it.
      next?.click();
      fixture.detectChanges();

      expect(emitted).toEqual(['2026-06-16']);
      expect(panel()).toBeNull();
    });

    it('pages to the next month when ArrowDown crosses the month boundary', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      // Jun 30 is the last in-month anchor candidate; from today (Jun 15) ArrowDown
      // twice (Jun 29) then once more lands in July, paging the grid.
      dayCell('2026-06-15')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' })
      );
      fixture.detectChanges();
      dayCell('2026-06-22')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' })
      );
      fixture.detectChanges();
      dayCell('2026-06-29')?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, cancelable: true, key: 'ArrowDown' })
      );
      fixture.detectChanges();
      expect(
        overlayContainerEl().querySelector('[data-testid="nge-date-picker-month-label"]')
          ?.textContent
      ).toContain('July 2026');
    });
  });

  describe('timezone-safe value boundary', () => {
    it('parses a bare YYYY-MM-DD as a LOCAL day (no off-by-one)', () => {
      const { component, el, fixture } = setup();
      component.writeValue('2026-03-01');
      fixture.detectChanges();
      open(fixture, el);

      // Local parsing keeps the panel on March and selects Mar 1; a UTC parse would
      // shift to Feb 28 in negative-offset zones.
      expect(
        overlayContainerEl().querySelector('[data-testid="nge-date-picker-month-label"]')
          ?.textContent
      ).toContain('March 2026');
      expect(dayCell('2026-03-01')?.classList.contains('nge-date-picker__day--selected')).toBe(
        true
      );
    });
  });

  describe('weekStartsOn', () => {
    it('starts the weekday header on Monday when weekStartsOn=1', () => {
      const { el, fixture } = setup();
      fixture.componentRef.setInput('weekStartsOn', 1);
      fixture.detectChanges();
      open(fixture, el);

      const labels = Array.from(
        overlayContainerEl().querySelectorAll('.nge-date-picker__weekday')
      ).map(node => node.textContent?.trim());
      expect(labels).toHaveLength(7);
      expect(labels[0]).toBe('Mon');
    });
  });

  describe('out-of-month padding days', () => {
    it('selects a padding day from the adjacent month (a real, valid target)', () => {
      const { component, el, fixture } = setup();
      const emitted: string[] = [];
      component.dateChange.subscribe(value => emitted.push(value));
      open(fixture, el);

      // June 1 2026 is a Monday, so with the default Sunday start the first grid cell
      // is Sun May 31 2026 — flagged out-of-month but still a selectable date.
      const padding = dayCell('2026-05-31');
      expect(padding?.classList.contains('nge-date-picker__day--out-of-month')).toBe(true);
      padding?.click();
      fixture.detectChanges();

      expect(emitted).toEqual(['2026-05-31']);
      expect(panel()).toBeNull();
    });
  });

  describe('CVA notifications', () => {
    it('marks the control touched when the panel closes', () => {
      const { fixture, host } = setupHost();
      const el = fixture.nativeElement as HTMLElement;
      expect(host.control.touched).toBe(false);

      open(fixture, el);
      overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-backdrop')?.click();
      fixture.detectChanges();

      expect(host.control.touched).toBe(true);
    });

    it('does NOT emit dateChange on a programmatic control.setValue', () => {
      const { fixture, host } = setupHost();
      host.control.setValue('2026-06-18');
      fixture.detectChanges();
      expect(host.changes).toHaveLength(0);
    });

    it('reflects a Date written through the form onto the trigger (coerceToDate path)', () => {
      const { fixture, host } = setupHost();
      const el = fixture.nativeElement as HTMLElement;
      host.control.setValue(new Date(2026, 5, 9) as unknown as string);
      fixture.detectChanges();
      expect(trigger(el).textContent).toContain('Jun');
      expect(trigger(el).textContent).toContain('9');
    });
  });

  describe('year selection', () => {
    function titleButton(): HTMLButtonElement | null {
      return overlayContainerEl().querySelector<HTMLButtonElement>(
        '[data-testid="nge-date-picker-title"]'
      );
    }

    function yearGrid(): HTMLElement | null {
      return overlayContainerEl().querySelector<HTMLElement>(
        '[data-testid="nge-date-picker-years"]'
      );
    }

    function yearCell(year: number): HTMLButtonElement | null {
      return overlayContainerEl().querySelector<HTMLButtonElement>(
        `[data-testid="nge-date-picker-year"][data-year="${year}"]`
      );
    }

    function anyDayCell(): HTMLElement | null {
      return overlayContainerEl().querySelector<HTMLElement>(
        '[data-testid="nge-date-picker-day"]'
      );
    }

    function monthLabelText(): string {
      return (
        overlayContainerEl().querySelector('[data-testid="nge-date-picker-month-label"]')
          ?.textContent ?? ''
      );
    }

    it('flips from the day grid to the year grid when the title is tapped', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      expect(yearGrid()).toBeNull();
      expect(anyDayCell()).toBeTruthy();

      titleButton()?.click();
      fixture.detectChanges();

      expect(yearGrid()).toBeTruthy();
      expect(anyDayCell()).toBeNull();
    });

    it('marks the shown year as selected (and the real year current)', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      titleButton()?.click();
      fixture.detectChanges();

      const cell = yearCell(2026);
      expect(cell?.getAttribute('aria-selected')).toBe('true');
      expect(cell?.classList.contains('nge-date-picker__year--selected')).toBe(true);
    });

    it('jumps the day grid to the picked year and returns to the day view', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      titleButton()?.click();
      fixture.detectChanges();

      yearCell(2030)?.click();
      fixture.detectChanges();

      expect(yearGrid()).toBeNull();
      expect(anyDayCell()).toBeTruthy();
      expect(monthLabelText()).toContain('June 2030');
    });

    it('does NOT commit a date (no dateChange) when only the year is changed', () => {
      const { component, el, fixture } = setup();
      const emitted: string[] = [];
      component.dateChange.subscribe(value => emitted.push(value));
      open(fixture, el);
      titleButton()?.click();
      fixture.detectChanges();

      yearCell(2030)?.click();
      fixture.detectChanges();

      expect(emitted).toHaveLength(0);
      expect(panel()).toBeTruthy();
    });

    it('bounds the year list by min/max when set', () => {
      const { el, fixture } = setup();
      fixture.componentRef.setInput('min', '2020-01-01');
      fixture.componentRef.setInput('max', '2024-12-31');
      fixture.detectChanges();
      open(fixture, el);
      titleButton()?.click();
      fixture.detectChanges();

      expect(yearCell(2019)).toBeNull();
      expect(yearCell(2020)).toBeTruthy();
      expect(yearCell(2024)).toBeTruthy();
      expect(yearCell(2025)).toBeNull();
    });

    it('defaults to a wide range (~100 years back) for birthdays', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      titleButton()?.click();
      fixture.detectChanges();

      // today is pinned to 2026 → default window 1926..2036.
      expect(yearCell(1926)).toBeTruthy();
      expect(yearCell(2036)).toBeTruthy();
    });

    it('returns to the day view (without closing) on Escape from the year view', () => {
      const { el, fixture } = setup();
      open(fixture, el);
      titleButton()?.click();
      fixture.detectChanges();
      expect(yearGrid()).toBeTruthy();

      const pane = overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-pane');
      pane?.dispatchEvent(
        new KeyboardEvent('keydown', { bubbles: true, keyCode: ESCAPE } as KeyboardEventInit)
      );
      fixture.detectChanges();

      expect(yearGrid()).toBeNull();
      expect(anyDayCell()).toBeTruthy();
      expect(panel()).toBeTruthy();
    });
  });
});
