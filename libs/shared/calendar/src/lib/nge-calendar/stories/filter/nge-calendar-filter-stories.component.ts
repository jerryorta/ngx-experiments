import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import {
  NgeStorybookReviewContainerComponent,
  REVIEW_STATUS,
} from '@nge/storybook';

import type { NgeCalendarConfig } from '../../../core/models/nge-calendar-config.model';
import type { NgeCalendarEventPredicate } from '../../../core/models/nge-calendar-filter.model';

import { NgeCalendarComponent } from '../../nge-calendar.component';

/**
 * Host domain payload attached to each event via the typed `data?: T` cargo
 * (ARCH-146). The HostCustomPanel story reads `event.data?.<field>` inside its
 * `#ngeCalendarFilter` predicate, so `build-storybook` (strictTemplates) proves
 * the generic `T` flows from `[config]` into the filter context.
 */
export interface FilterEventMeta {
  priority: 'high' | 'low';
}

/** A small varied event set spread across the month so every facet has effect. */
function buildEvents(): NgeCalendarConfig<FilterEventMeta>['events'] {
  return [
    {
      color: '#2563eb',
      data: { priority: 'high' },
      end: new Date(2026, 0, 6, 10, 0),
      id: 'a',
      start: new Date(2026, 0, 6, 9, 0),
      title: 'Morning sync',
    },
    {
      color: '#16a34a',
      data: { priority: 'low' },
      end: new Date(2026, 0, 8, 15, 0),
      id: 'b',
      start: new Date(2026, 0, 8, 14, 0),
      title: 'Design review',
    },
    {
      allDay: true,
      color: '#f59e0b',
      data: { priority: 'low' },
      id: 'c',
      start: new Date(2026, 0, 12),
      title: 'Company holiday',
    },
    {
      color: '#ef4444',
      data: { priority: 'high' },
      end: new Date(2026, 0, 14, 11, 30),
      id: 'd',
      start: new Date(2026, 0, 14, 11, 0),
      title: 'Incident review',
    },
    {
      allDay: true,
      color: '#2563eb',
      data: { priority: 'high' },
      id: 'e',
      start: new Date(2026, 0, 20),
      title: 'Release day',
    },
  ];
}

/**
 * ARCH-149 — cross-view filter funnel harness.
 *
 * Drives `<nge-calendar>` in four modes via the `variant` input:
 *  • `default` — the built-in funnel narrows every view with no host config.
 *  • `host`    — a `#ngeCalendarFilter` template calls `ctx.apply(predicate)` /
 *                `ctx.setFilter`, reading the typed `event.data` payload.
 *  • `config`  — a `config.eventFilter` predicate toggled from outside the funnel.
 *  • `themed`  — the default funnel under a `config.theme` override; the popover
 *                pane inherits the host's `--nge-calendar-*` props.
 *
 * Story state is signal-backed (Storybook's Angular renderer snapshots prop
 * getters ONCE), and the calendar binds `[config]="config()"` so toggles re-render.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-calendar-filter-stories' },
  imports: [NgeStorybookReviewContainerComponent, NgeCalendarComponent],
  selector: 'nge-calendar-filter-stories',
  standalone: true,
  styleUrl: './nge-calendar-filter-stories.component.scss',
  templateUrl: './nge-calendar-filter-stories.component.html',
})
export class NgeCalendarFilterStoriesComponent {
  readonly reviewStatus = REVIEW_STATUS.DRAFT;
  readonly storybookFilePath = 'libs/shared/calendar/src/lib/nge-calendar/stories/filter';

  /** Which filter scenario to render. */
  readonly variant = input<'config' | 'default' | 'host' | 'themed'>('default');

  /** The shared event set (stable across re-renders). */
  protected readonly events = buildEvents();

  /** Predicate a host panel applies — keeps only the high-priority events. */
  protected readonly highPriorityPredicate: NgeCalendarEventPredicate<FilterEventMeta> = event =>
    event.data?.priority === 'high';

  /** Whether the `config` variant's external `eventFilter` is engaged. */
  protected readonly onlyAllDay = signal(false);

  /** Base config (default / host / config variants), recomputed when toggles flip. */
  protected readonly config = computed<NgeCalendarConfig<FilterEventMeta>>(() => ({
    date: new Date(2026, 0, 15),
    events: this.events,
    view: 'month',
    ...(this.variant() === 'config' && this.onlyAllDay()
      ? {
          eventFilter: (event =>
            event.allDay === true) as NgeCalendarEventPredicate<FilterEventMeta>,
        }
      : {}),
  }));

  /** Same events under a `--nge-calendar-*` theme override (themed variant). */
  protected readonly themedConfig = computed<NgeCalendarConfig<FilterEventMeta>>(() => ({
    ...this.config(),
    theme: {
      '--nge-calendar-accent': '#a855f7',
      '--nge-calendar-on-surface': '#f8fafc',
      '--nge-calendar-on-surface-variant': '#cbd5e1',
      '--nge-calendar-outline-variant': '#334155',
      '--nge-calendar-surface': '#0f172a',
      '--nge-calendar-surface-container': '#1e293b',
    },
  }));

  /** Toggle the external `config.eventFilter` for the `config` variant. */
  protected toggleAllDay(): void {
    this.onlyAllDay.update(v => !v);
  }
}
