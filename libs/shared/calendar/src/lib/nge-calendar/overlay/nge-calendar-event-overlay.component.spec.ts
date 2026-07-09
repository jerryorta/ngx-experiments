import type { ComponentFixture } from '@angular/core/testing';

import { Component, signal, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NgeCalendarEventOverlayComponent } from './nge-calendar-event-overlay.component';

/** Host that projects content into the frame to exercise `<ng-content/>`. */
@Component({
  encapsulation: ViewEncapsulation.None,
  imports: [NgeCalendarEventOverlayComponent],
  selector: 'nge-calendar-event-overlay-host',
  standalone: true,
  template: `
    <nge-calendar-event-overlay
      [ariaLabel]="label()"
      (closed)="closedCount.set(closedCount() + 1)"
    >
      <p class="projected">Projected body</p>
    </nge-calendar-event-overlay>
  `,
})
class HostComponent {
  readonly closedCount = signal(0);
  readonly label = signal('Event details');
}

describe('NgeCalendarEventOverlayComponent', () => {
  function setup(): {
    el: HTMLElement;
    fixture: ComponentFixture<HostComponent>;
    host: HostComponent;
  } {
    TestBed.configureTestingModule({ imports: [HostComponent] });
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();
    return {
      el: fixture.nativeElement as HTMLElement,
      fixture,
      host: fixture.componentInstance,
    };
  }

  it('creates and tags the host element with the frame class + role=dialog', () => {
    const { el } = setup();
    const frame = el.querySelector('.nge-calendar-event-overlay');
    expect(frame).toBeTruthy();
    expect(frame?.getAttribute('role')).toBe('dialog');
  });

  it('projects content into the frame body', () => {
    const { el } = setup();
    const projected = el.querySelector('.nge-calendar-event-overlay__body .projected');
    expect(projected?.textContent).toContain('Projected body');
  });

  it('reflects the ariaLabel input onto the host aria-label attribute', () => {
    const { el, fixture, host } = setup();
    expect(el.querySelector('.nge-calendar-event-overlay')?.getAttribute('aria-label')).toBe(
      'Event details'
    );

    host.label.set('Appointment');
    fixture.detectChanges();
    expect(el.querySelector('.nge-calendar-event-overlay')?.getAttribute('aria-label')).toBe(
      'Appointment'
    );
  });

  it('emits closed when the close button is clicked', () => {
    const { el, fixture, host } = setup();
    const close = el.querySelector<HTMLButtonElement>(
      '[data-testid="nge-calendar-event-overlay-close"]'
    );
    expect(close).toBeTruthy();

    close?.click();
    fixture.detectChanges();
    expect(host.closedCount()).toBe(1);
  });
});
