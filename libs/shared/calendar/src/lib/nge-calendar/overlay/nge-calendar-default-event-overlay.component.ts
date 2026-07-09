import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  ViewEncapsulation,
} from '@angular/core';

import type { NormalizedCalendarEvent } from '../../core/models/nge-calendar-event.model';

/**
 * DEFAULT body for the event-click overlay popup (ARCH-147) — the equivalent of
 * nge-chart's default tooltip content. The shell renders this inside the
 * {@link NgeCalendarEventOverlayComponent} frame whenever the host does NOT
 * supply a `#ngeCalendarEventOverlay` template.
 *
 * Pure presentation over a {@link NormalizedCalendarEvent}: a colour swatch, the
 * title, and a formatted time line ("All day", a single time, or a
 * `start – end` range) using `Intl.DateTimeFormat` under the optional `locale`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-calendar-default-event-overlay' },
  selector: 'nge-calendar-default-event-overlay',
  standalone: true,
  styleUrl: './nge-calendar-default-event-overlay.component.scss',
  templateUrl: './nge-calendar-default-event-overlay.component.html',
})
export class NgeCalendarDefaultEventOverlayComponent {
  /** The event whose details to render. */
  readonly event = input.required<NormalizedCalendarEvent>();

  /** BCP-47 locale for the time formatting (falls back to the runtime default). */
  readonly locale = input<string>();

  /** Human-readable time line: "All day", a single time, or a `start – end` range. */
  protected readonly timeLabel = computed(() => {
    const event = this.event();
    if (event.allDay) {
      return 'All day';
    }

    const format = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });
    const start = format.format(event.start);
    return event.end ? `${start} – ${format.format(event.end)}` : start;
  });
}
