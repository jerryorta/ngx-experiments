import { CdkScrollable } from '@angular/cdk/scrolling';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  effect,
  ElementRef,
  inject,
  Injector,
  ViewEncapsulation,
} from '@angular/core';
import { addDays, endOfDay, isSameDay, startOfDay } from '@nge/date';

import type { NormalizedCalendarEvent } from '../../core/models/nge-calendar-event.model';
import type { MonthAgendaDayGroup } from '../../core/view-model/month-agenda-view-model.model';
import type { MonthDayCell, MonthWeekRow } from '../../core/view-model/month-view-model.model';

import { NgeCalendarStore } from '../../nge-calendar/store';

/** A full grid row is one week, so vertical arrow nav steps by this many days. */
const DAYS_PER_ROW = 7;

/**
 * Compact mobile month layout (ARCH-148) — a date-only month grid over a
 * scrollable, day-grouped agenda list. The mobile counterpart to
 * {@link NgeMonthViewComponent}: the shell renders THIS view (instead of the
 * full month grid) when `config.monthLayout === 'agenda'`.
 *
 * Pure rendering + delegation: the compact grid scaffolds off the same
 * {@link NgeCalendarStore.monthViewModel} the desktop grid uses (so weekday
 * alignment + out-of-month padding stay identical), but each cell renders ONLY
 * the day number plus an event-presence dot (no chips / bars / drop-lists). The
 * agenda body reads {@link NgeCalendarStore.monthAgenda} (days-with-events-only,
 * pre-sorted in the pure core) and lists each day's events as cards. It writes
 * **zero** layout maths and **zero** new state.
 *
 * It owns NO public boundary and NO `providers`: it `inject()`s the SAME ambient
 * {@link NgeCalendarStore} the shell provides (a local `providers` here would
 * create a second, un-seeded store). All DOM access (managed keyboard focus +
 * the selected-day auto-scroll) lives HERE — the store holds no DOM refs.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-month-agenda-view' },
  imports: [CdkScrollable],
  selector: 'nge-month-agenda-view',
  standalone: true,
  styleUrl: './nge-month-agenda-view.component.scss',
  templateUrl: './nge-month-agenda-view.component.html',
})
export class NgeMonthAgendaViewComponent {
  protected readonly store = inject(NgeCalendarStore);

  /** Host element — queried to move DOM focus + scroll the selected day-group into view. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Injector for the deferred `afterNextRender` hooks (focus move + auto-scroll). */
  private readonly injector = inject(Injector);

  constructor() {
    // Auto-scroll the matching agenda day-group into view whenever a day is
    // selected (e.g. a grid-cell tap). DOM access is deferred to `afterNextRender`
    // so the group element exists; a null selection is a no-op. The store holds
    // NO DOM refs — all DOM access is owned here.
    effect(() => {
      const selected = this.store.selectedDate();
      if (selected === null) {
        return;
      }
      afterNextRender(() => this.scrollDayGroupIntoView(selected), { injector: this.injector });
    });
  }

  /** Per-event colour for the agenda card dot, or `null` to fall back to the token. */
  protected eventColor(event: NormalizedCalendarEvent): null | string {
    return event.color ?? null;
  }

  /**
   * Human-readable time line for an agenda card — mirrors the default event
   * overlay's `timeLabel`: "All day", a single start time, or a `start – end`
   * range, formatted with `Intl.DateTimeFormat` under the config's locale.
   */
  protected eventTimeLabel(event: NormalizedCalendarEvent): string {
    if (event.allDay) {
      return 'All day';
    }
    const format = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      minute: '2-digit',
    });
    const start = format.format(event.start);
    return event.end ? `${start} – ${format.format(event.end)}` : start;
  }

  /** A day-group's heading: full weekday + month + day, under the config's locale. */
  protected groupLabel(date: Date): string {
    return new Intl.DateTimeFormat(this.locale(), {
      day: 'numeric',
      month: 'long',
      weekday: 'long',
    }).format(date);
  }

  /**
   * Whether `day` (at column `colIndex` of `week`) has any events to surface as a
   * presence dot: single-day chips, hidden-overflow chips, OR a spanning bar that
   * covers this column in the week row. The compact grid renders only the dot, so
   * this is the one signal a cell needs about its events.
   */
  protected hasEvents(week: MonthWeekRow, day: MonthDayCell, colIndex: number): boolean {
    return (
      day.chips.length > 0 ||
      day.hiddenCount > 0 ||
      week.bars.some(bar => colIndex >= bar.startCol && colIndex <= bar.endCol)
    );
  }

  /** True when this cell's date is store-owned "today" (null today ⇒ never). */
  protected isToday(date: Date): boolean {
    const today = this.store.today();
    return today !== null && isSameDay(date, today);
  }

  /** True when this cell's date is the currently-selected day (null selection ⇒ never). */
  protected isSelected(date: Date): boolean {
    const selected = this.store.selectedDate();
    return selected !== null && isSameDay(date, selected);
  }

  /**
   * Roving tabindex for the compact grid (WAI-ARIA grid pattern): exactly ONE day
   * cell is in the tab order — the {@link NgeCalendarStore.focusedDate} cell, or
   * the anchor cell while focus is unset — and the rest are `-1`. Mirrors the
   * desktop month view's `cellTabIndex`.
   */
  protected cellTabIndex(day: MonthDayCell): -1 | 0 {
    const focused = this.store.focusedDate();
    if (focused !== null) {
      return isSameDay(day.date, focused) ? 0 : -1;
    }
    return day.isAnchor ? 0 : -1;
  }

  /**
   * Keyboard navigation on the compact grid. Arrow keys move the roving
   * {@link NgeCalendarStore.focusedDate} by ±1 day (L/R) / ±1 week (U/D) WITHOUT
   * clamping to the visible month (out-of-month padding days are real, valid
   * targets); Enter/Space SELECT the focused day (`selectDate` — which the agenda
   * auto-scroll effect reacts to), rather than the desktop view's slot-create. The
   * handler is bound on each day cell (the roving-tabindex element that holds
   * focus) but reads the current target from the store, so behaviour is grid-level.
   */
  protected onGridKeydown(event: KeyboardEvent): void {
    const current = this.store.focusedDate() ?? this.anchorDate();
    if (!current) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        this.moveFocus(event, addDays(current, DAYS_PER_ROW));
        break;
      case 'ArrowLeft':
        this.moveFocus(event, addDays(current, -1));
        break;
      case 'ArrowRight':
        this.moveFocus(event, addDays(current, 1));
        break;
      case 'ArrowUp':
        this.moveFocus(event, addDays(current, -DAYS_PER_ROW));
        break;
      case 'Enter':
      case ' ':
        // Enter/Space on a day cell activates it: select (drives the agenda
        // scroll) AND emit a day-spanning `slotClick` for the host (parity with
        // the desktop grid).
        event.preventDefault();
        this.activateDay(current);
        break;
      default:
        // Let every other key through (typing, browser shortcuts, etc.).
        break;
    }
  }

  /**
   * Activate a day cell: keep the agenda's inline behaviour (highlight + auto-scroll
   * to that day via `selectDate`) AND emit a day-spanning `slotClick` so the host can
   * act on a day tap (e.g. navigate to a day view) — parity with the desktop grid
   * ({@link NgeMonthViewComponent}). Additive: a consumer that doesn't wire
   * `slotClick` is unaffected; the inline selection still drives the auto-scroll.
   */
  protected activateDay(date: Date): void {
    this.store.selectDate(date);
    this.store.slotClick({ end: endOfDay(date), start: startOfDay(date) });
  }

  /**
   * Move DOM focus to the compact-grid cell rendering `date`. A tiny seam tests can
   * drive directly: it queries the host for the cell whose `data-date` is `date`'s
   * ISO string and focuses it. A no-match (a date outside the six rendered week
   * rows) is a harmless no-op.
   */
  protected focusCellForDate(date: Date): void {
    const selector = `[data-testid="nge-month-agenda-day"][data-date="${date.toISOString()}"]`;
    this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
  }

  /** The config's BCP-47 locale (falls back to the runtime default when unset). */
  private locale(): string | undefined {
    return this.store.config()?.locale;
  }

  /** The anchor cell's date (the keyboard-nav fallback when focus is unset), or null. */
  private anchorDate(): Date | null {
    const vm = this.store.monthViewModel();
    if (!vm) {
      return null;
    }
    for (const week of vm.weeks) {
      for (const day of week.days) {
        if (day.isAnchor) {
          return day.date;
        }
      }
    }
    return null;
  }

  /**
   * Commit an arrow-key move: prevent the default scroll, write the new roving
   * focus to the store (which re-runs `cellTabIndex` so the new cell becomes the
   * tab stop), then move real DOM focus to it AFTER the tabindex binding updates
   * (deferred via `afterNextRender`).
   */
  private moveFocus(event: KeyboardEvent, next: Date): void {
    event.preventDefault();
    this.store.setFocusedDate(next);
    afterNextRender(() => this.focusCellForDate(next), { injector: this.injector });
  }

  /**
   * Scroll the agenda day-group whose date matches `date` into view within the
   * `#agendaBody` scroll region. A no-match (the selected day has no events, so no
   * group is rendered) is a harmless no-op.
   */
  private scrollDayGroupIntoView(date: Date): void {
    const groups = this.host.nativeElement.querySelectorAll<HTMLElement>(
      '[data-testid="nge-month-agenda-group"]'
    );
    for (const group of Array.from(groups)) {
      const groupDate = group.getAttribute('data-date');
      if (groupDate && isSameDay(new Date(groupDate), date)) {
        group.scrollIntoView({ block: 'nearest' });
        return;
      }
    }
  }

  /** Track helper for the agenda day groups (`track group.date`). */
  protected trackGroup(group: MonthAgendaDayGroup): Date {
    return group.date;
  }
}
