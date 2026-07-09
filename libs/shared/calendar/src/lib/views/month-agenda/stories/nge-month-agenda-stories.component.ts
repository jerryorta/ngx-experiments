import { ChangeDetectionStrategy, Component, input, ViewEncapsulation } from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from '../../../nge-calendar/nge-calendar.component';

/**
 * ARCH-148 — mobile month-agenda layout harness.
 *
 * Every story renders the public `<nge-calendar [config]>` shell; the shell
 * routes the `month` view to the compact day-grouped agenda list whenever
 * `config.monthLayout === 'agenda'`, so the agenda layout is driven purely
 * through config (the internal view component is never imported here).
 *
 * The `variant` input selects which fixture config the template binds:
 *  • `agenda`     — a normal month with events scattered across several days.
 *  • `themed`     — the same month under a `--nge-calendar-*` host override,
 *                   proving the agenda layout themes through the calendar's
 *                   own CSS-variable namespace.
 *  • `manyEvents` — a densely populated month so the agenda body scrolls.
 *  • `empty`      — a month with zero events, exercising the empty state.
 *
 * The wrapper constrains the calendar height (see the SCSS) so the agenda's
 * internal scroll is demonstrable, and frames it at a mobile-ish width since
 * the layout targets mobile.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-month-agenda-stories' },
  imports: [NgeStorybookReviewContainerComponent, NgeCalendarComponent],
  selector: 'nge-month-agenda-stories',
  standalone: true,
  styleUrl: './nge-month-agenda-stories.component.scss',
  templateUrl: './nge-month-agenda-stories.component.html',
})
export class NgeMonthAgendaStoriesComponent {
  readonly reviewStatus = REVIEW_STATUS.DRAFT;
  readonly storybookFilePath = 'libs/shared/calendar/src/lib/views/month-agenda/stories';

  /** Which agenda scenario to render. */
  readonly variant = input<'agenda' | 'empty' | 'manyEvents' | 'themed'>('agenda');

  /** A normal month with a handful of events across several days (June 2026). */
  readonly config: NgeCalendarConfig = {
    date: new Date(2026, 5, 15),
    events: [
      {
        color: '#2563eb',
        end: new Date(2026, 5, 10, 10, 0),
        id: 'sync',
        start: new Date(2026, 5, 10, 9, 0),
        title: 'Morning sync',
      },
      {
        color: '#16a34a',
        end: new Date(2026, 5, 12, 15, 0),
        id: 'review',
        start: new Date(2026, 5, 12, 14, 0),
        title: 'Design review',
      },
      {
        allDay: true,
        color: '#d97706',
        id: 'holiday',
        start: new Date(2026, 5, 15),
        title: 'Company holiday',
      },
      {
        color: '#7c3aed',
        end: new Date(2026, 5, 18, 12, 0),
        id: '1on1',
        start: new Date(2026, 5, 18, 11, 0),
        title: '1:1 with manager',
      },
      {
        color: '#dc2626',
        end: new Date(2026, 5, 23, 17, 0),
        id: 'release',
        start: new Date(2026, 5, 23, 16, 0),
        title: 'Release cut',
      },
    ],
    monthLayout: 'agenda',
    view: 'month',
  };

  /** Same month under a `--nge-calendar-*` host override (themed variant). */
  readonly themedConfig: NgeCalendarConfig = {
    ...this.config,
    theme: {
      '--nge-calendar-accent': '#7c3aed',
      '--nge-calendar-event-bg': '#7c3aed',
      '--nge-calendar-on-accent': '#ffffff',
      '--nge-calendar-on-surface': '#2e1065',
      '--nge-calendar-on-surface-variant': '#6d28d9',
      '--nge-calendar-outline-variant': '#d8b4fe',
      '--nge-calendar-surface': '#faf5ff',
      '--nge-calendar-surface-container': '#f3e8ff',
    },
  };

  /**
   * A densely populated month — 3 events on most weekdays across the whole
   * month — so the agenda body overflows its constrained height and scrolls.
   */
  readonly manyEventsConfig: NgeCalendarConfig = {
    date: new Date(2026, 5, 15),
    events: Array.from({ length: 28 }, (_unused, dayOffset) => {
      // Spread across days 1–28; 3 events per day to densely fill the agenda.
      const day = dayOffset + 1;
      return [
        {
          color: '#2563eb',
          end: new Date(2026, 5, day, 9, 30),
          id: `d${day}-standup`,
          start: new Date(2026, 5, day, 9, 0),
          title: `Day ${day} standup`,
        },
        {
          color: '#16a34a',
          end: new Date(2026, 5, day, 13, 0),
          id: `d${day}-lunch`,
          start: new Date(2026, 5, day, 12, 0),
          title: `Day ${day} lunch & learn`,
        },
        {
          color: '#d97706',
          end: new Date(2026, 5, day, 16, 0),
          id: `d${day}-review`,
          start: new Date(2026, 5, day, 15, 0),
          title: `Day ${day} review`,
        },
      ];
    }).flat(),
    monthLayout: 'agenda',
    view: 'month',
  };

  /** A month with zero events — exercises the agenda empty state. */
  readonly emptyConfig: NgeCalendarConfig = {
    date: new Date(2026, 5, 15),
    events: [],
    monthLayout: 'agenda',
    view: 'month',
  };
}
