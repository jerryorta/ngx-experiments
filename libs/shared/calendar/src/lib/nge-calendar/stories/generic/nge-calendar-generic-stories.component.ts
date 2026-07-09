import { ChangeDetectionStrategy, Component, signal, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type {
  EventClick,
  EventDrop,
  EventResize,
} from '../../../core/models/calendar-output.model';
import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar.component';

/**
 * A host's own domain object, attached to each event via the typed `data?: T`
 * cargo payload (ARCH-146). Nothing in the library knows this shape — it is pure
 * cargo that round-trips, correctly typed, to the event-bearing outputs.
 */
interface AppointmentMeta {
  attendees: number;
  ownerId: string;
}

/**
 * ARCH-146 — typed-payload guard host.
 *
 * Binds a `NgeCalendarConfig<AppointmentMeta>` to `[config]` on `<nge-calendar>`
 * and wires `(eventClick)`/`(eventDrop)`/`(eventResize)` to handlers whose
 * parameter is typed over `AppointmentMeta`. Each handler reads a DOMAIN field
 * off `$event.event.data` (e.g. `data.ownerId`), so Angular's template
 * type-checker (strictTemplates, exercised by `build-storybook`) FAILS the build
 * if the phantom `T` does NOT flow from `[config]` through to `$event` — exactly
 * the inference guard the ticket requires.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-calendar-generic-stories' },
  imports: [NgeStorybookReviewContainerComponent, NgeCalendarComponent],
  selector: 'nge-calendar-generic-stories',
  standalone: true,
  styleUrl: './nge-calendar-generic-stories.component.scss',
  templateUrl: './nge-calendar-generic-stories.component.html',
})
export class NgeCalendarGenericStoriesComponent {
  readonly reviewStatus = REVIEW_STATUS.DRAFT;
  readonly storybookFilePath = 'libs/shared/calendar/src/lib/nge-calendar/stories/generic';

  /** Config whose events carry a typed `data: AppointmentMeta` payload. */
  readonly config: NgeCalendarConfig<AppointmentMeta> = {
    date: new Date(2026, 0, 15),
    events: [
      {
        data: { attendees: 4, ownerId: 'user-7' },
        end: new Date(2026, 0, 15, 10, 0),
        id: 'a',
        start: new Date(2026, 0, 15, 9, 0),
        title: 'Morning sync',
      },
      {
        data: { attendees: 2, ownerId: 'user-3' },
        end: new Date(2026, 0, 17, 15, 0),
        id: 'b',
        start: new Date(2026, 0, 17, 14, 0),
        title: 'Design review',
      },
    ],
    view: 'month',
  };

  /** The last domain payload read back off a typed output (rendered for proof). */
  readonly lastPayload = signal<AppointmentMeta | undefined>(undefined);

  /** Reading `e.event.data.ownerId` only compiles because `T` flowed from `[config]`. */
  onClick(e: EventClick<AppointmentMeta>): void {
    this.lastPayload.set(e.event.data);
  }

  /** Same typed payload surfaces on the drag output. */
  onDrop(e: EventDrop<AppointmentMeta>): void {
    this.lastPayload.set(e.event.data);
  }

  /** Same typed payload surfaces on the resize output. */
  onResize(e: EventResize<AppointmentMeta>): void {
    this.lastPayload.set(e.event.data);
  }
}
