import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { NormalizedCalendarEvent } from '../../core/models/nge-calendar-event.model';

import { NgeCalendarDefaultEventOverlayComponent } from './nge-calendar-default-event-overlay.component';

function timedEvent(overrides: Partial<NormalizedCalendarEvent> = {}): NormalizedCalendarEvent {
  return {
    allDay: false,
    color: '#ff0000',
    end: new Date(2026, 0, 15, 10, 0),
    id: 'a',
    start: new Date(2026, 0, 15, 9, 0),
    title: 'Morning sync',
    ...overrides,
  };
}

describe('NgeCalendarDefaultEventOverlayComponent', () => {
  function setup(event: NormalizedCalendarEvent): {
    el: HTMLElement;
    fixture: ComponentFixture<NgeCalendarDefaultEventOverlayComponent>;
  } {
    TestBed.configureTestingModule({ imports: [NgeCalendarDefaultEventOverlayComponent] });
    const fixture = TestBed.createComponent(NgeCalendarDefaultEventOverlayComponent);
    fixture.componentRef.setInput('event', event);
    fixture.componentRef.setInput('locale', 'en-US');
    fixture.detectChanges();
    return { el: fixture.nativeElement as HTMLElement, fixture };
  }

  function timeText(el: HTMLElement): string {
    return (
      el.querySelector('[data-testid="nge-calendar-default-event-overlay-time"]')?.textContent ??
      ''
    ).trim();
  }

  it('renders the event title', () => {
    const { el } = setup(timedEvent());
    expect(
      el.querySelector('[data-testid="nge-calendar-default-event-overlay-title"]')?.textContent
    ).toContain('Morning sync');
  });

  it('renders the swatch with the event colour', () => {
    const { el } = setup(timedEvent({ color: '#ff0000' }));
    const swatch = el.querySelector<HTMLElement>(
      '[data-testid="nge-calendar-default-event-overlay-swatch"]'
    );
    // jsdom normalises the hex to rgb in the style attribute.
    expect(swatch?.style.background).toBe('rgb(255, 0, 0)');
  });

  it('shows "All day" for an all-day event', () => {
    const { el } = setup(timedEvent({ allDay: true }));
    expect(timeText(el)).toBe('All day');
  });

  it('formats a timed event as a start – end range', () => {
    const { el } = setup(timedEvent());
    const text = timeText(el);
    // en-US 9 AM–10 AM; assert on the stable parts + the en-dash separator.
    expect(text).toContain('9:00');
    expect(text).toContain('10:00');
    expect(text).toContain('–');
    expect(text).toContain('AM');
  });

  it('formats a single time when the event has no end', () => {
    const { el } = setup(timedEvent({ end: null }));
    const text = timeText(el);
    expect(text).toContain('9:00');
    expect(text).toContain('AM');
    expect(text).not.toContain('–');
  });
});
