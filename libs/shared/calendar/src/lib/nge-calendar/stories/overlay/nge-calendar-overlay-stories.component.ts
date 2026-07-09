import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../nge-calendar.component';

/**
 * Host domain payload attached to each event via the typed `data?: T` cargo
 * (ARCH-146). The CustomOverlay story reads `event.data?.<field>` inside its
 * `#ngeCalendarEventOverlay` template, so `build-storybook` (strictTemplates)
 * proves the generic `T` flows from `[config]` into the overlay context.
 */
export interface OverlayAppointmentMeta {
  location: string;
  organizer: string;
}

/**
 * ARCH-147 — event-click overlay harness.
 *
 * Drives `<nge-calendar>` in three modes via the `variant` input:
 *  • `default` — no host template, so selecting an event opens the built-in
 *    `<nge-calendar-default-event-overlay>` body.
 *  • `custom`  — supplies a `#ngeCalendarEventOverlay` template that reads the
 *    typed `event.data` payload (the strict-template inference guard).
 *  • `themed`  — default body under a `config.theme` override, proving the pane
 *    inherits the host's `--nge-calendar-*` props.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-calendar-overlay-stories' },
  imports: [NgeStorybookReviewContainerComponent, NgeCalendarComponent],
  selector: 'nge-calendar-overlay-stories',
  standalone: true,
  styleUrl: './nge-calendar-overlay-stories.component.scss',
  templateUrl: './nge-calendar-overlay-stories.component.html',
})
export class NgeCalendarOverlayStoriesComponent {
  readonly reviewStatus = REVIEW_STATUS.DRAFT;
  readonly storybookFilePath = 'libs/shared/calendar/src/lib/nge-calendar/stories/overlay';

  /** Which overlay scenario to render. */
  readonly variant = input<'custom' | 'default' | 'themed'>('default');

  /** Base config used by the `default` and `custom` variants. */
  readonly config: NgeCalendarConfig<OverlayAppointmentMeta> = {
    date: new Date(2026, 0, 15),
    events: [
      {
        color: '#2563eb',
        data: { location: 'Room 4B', organizer: 'Ada' },
        end: new Date(2026, 0, 15, 10, 0),
        id: 'a',
        start: new Date(2026, 0, 15, 9, 0),
        title: 'Morning sync',
      },
      {
        color: '#16a34a',
        data: { location: 'Online', organizer: 'Lin' },
        end: new Date(2026, 0, 15, 15, 0),
        id: 'b',
        start: new Date(2026, 0, 15, 14, 0),
        title: 'Design review',
      },
    ],
    view: 'month',
  };

  /** Same events under a `--nge-calendar-*` theme override (themed variant). */
  readonly themedConfig: NgeCalendarConfig<OverlayAppointmentMeta> = {
    ...this.config,
    theme: {
      '--nge-calendar-on-surface': '#f8fafc',
      '--nge-calendar-on-surface-variant': '#cbd5e1',
      '--nge-calendar-outline-variant': '#334155',
      '--nge-calendar-surface': '#0f172a',
    },
  };
}
