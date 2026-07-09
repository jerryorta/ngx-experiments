import type { CdkDragDrop } from '@angular/cdk/drag-drop';

import { CdkDrag, CdkDropList, CdkDropListGroup } from '@angular/cdk/drag-drop';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  ViewEncapsulation,
} from '@angular/core';
import { addDays, endOfDay, isSameDay, startOfDay } from '@nge/date';

import type { NormalizedCalendarEvent } from '../../core/models/nge-calendar-event.model';
import type {
  MonthDayCell,
  MonthEventBar,
  MonthWeekRow,
} from '../../core/view-model/month-view-model.model';

import { NgeCalendarStore } from '../../nge-calendar/store';

/** Columns per week — the month grid is always 7 wide. */
const DAYS_PER_WEEK = 7;
/** Percentage basis for the spanning-bar geometry. */
const PERCENT = 100;
/** Horizontal inset (px) applied to each side of a bar so it clears the cell edges. */
const BAR_INSET_PX = 2;
/** Milliseconds in a calendar day — used to derive a whole-day drag delta. */
const MS_PER_DAY = 86_400_000;
/** A full grid row is one week, so vertical arrow nav steps by this many days. */
const DAYS_PER_ROW = 7;

/**
 * Month grid view (ARCH-66 / S6) — the first real `<nge-calendar>` view.
 *
 * Pure rendering + delegation: it reads the already-built
 * {@link NgeCalendarStore.monthViewModel} computed (six week rows of day cells +
 * spanning bars, all layout maths pre-computed in the pure core) and drives the
 * existing store methods (`selectEvent` / `openPopover` / `closePopover`). It
 * writes **zero** layout maths and **zero** new state.
 *
 * It owns NO public boundary and NO `providers`: it `inject()`s the SAME ambient
 * {@link NgeCalendarStore} the shell provides (a local `providers` here would
 * create a second, un-seeded store). "Today" lives on the store because the core
 * is now-agnostic, so today-highlighting is derived from `store.today()`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-month-view' },
  imports: [CdkDrag, CdkDropList, CdkDropListGroup],
  selector: 'nge-month-view',
  standalone: true,
  styleUrl: './nge-month-view.component.scss',
  templateUrl: './nge-month-view.component.html',
})
export class NgeMonthViewComponent {
  protected readonly store = inject(NgeCalendarStore);

  /** Host element — queried to move DOM focus to the roving-tabindex cell. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Injector for the deferred `afterNextRender` that follows a keyboard move. */
  private readonly injector = inject(Injector);

  /**
   * A spanning bar is absolutely overlaid on the week (NOT a grid row) so it can
   * cross day columns without inserting a row that would break the cell grid. These
   * helpers map the view-model's 0-indexed `startCol` / `span` / `rowIndex` to inline
   * geometry: left + width as a percentage of the week width (inset a couple of px
   * each side), and a vertical offset by lane in `--nge-month-bar-step` units.
   */
  protected barLeft(bar: MonthEventBar): string {
    return `calc(${(bar.startCol / DAYS_PER_WEEK) * PERCENT}% + ${BAR_INSET_PX}px)`;
  }

  protected barTop(bar: MonthEventBar): string {
    return `calc(${bar.rowIndex} * var(--nge-month-bar-step))`;
  }

  protected barWidth(bar: MonthEventBar): string {
    return `calc(${(bar.span / DAYS_PER_WEEK) * PERCENT}% - ${BAR_INSET_PX * 2}px)`;
  }

  /**
   * Whether a single-day chip may be dragged. Mirrors the store's `startDrag`
   * gating (global `editable()` AND the event's own `editable !== false`) so the
   * CDK affordance is only offered when a drop would actually commit. `startDrag`
   * re-checks this, so a stray drag is still a harmless no-op.
   */
  protected canDrag(event: NormalizedCalendarEvent): boolean {
    return this.store.editable() && event.editable !== false;
  }

  /** Per-event colour for a chip dot / bar fill, or `null` to fall back to the token. */
  protected chipColor(event: NormalizedCalendarEvent): null | string {
    return event.color ?? null;
  }

  /** True when this cell's date is the cell whose "+N more" popover is open. */
  protected isPopoverCell(date: Date): boolean {
    const open = this.store.popoverDate();
    return open !== null && isSameDay(date, open);
  }

  /** True when this cell's date is store-owned "today" (null today ⇒ never). */
  protected isToday(date: Date): boolean {
    const today = this.store.today();
    return today !== null && isSameDay(date, today);
  }

  /**
   * Commit a chip drop onto a day cell. CDK gives us the dragged event
   * (`e.item.data`) and the SOURCE day's date as the previous drop-list's data
   * (`e.previousContainer.data`) — cleaner than threading the origin through the
   * drag payload. A drop back on the same cell is a no-op.
   *
   * The day delta is the whole-day difference between the source and target
   * dates (no `differenceInDays` helper exists in `@nge/date`, so it's
   * computed inline from the `startOfDay` epoch gap). We do NOT mutate the day
   * arrays — they're readonly computed view-model data — we just drive the store
   * (`startDrag` → `updateDrag` → `commitDrag`); `commitDrag()` snaps to the slot
   * and sets the signal the shell bridges to the public `eventDrop` output, after
   * which the consumer re-renders the moved event from config. If `startDrag` was
   * refused (not editable), `commitDrag()` returns null harmlessly.
   */
  protected onChipDropped(e: CdkDragDrop<Date>, targetDay: MonthDayCell): void {
    if (e.previousContainer === e.container) {
      return;
    }
    const event = e.item.data as NormalizedCalendarEvent;
    const sourceDate = e.previousContainer.data;
    const deltaDays = Math.round(
      (startOfDay(targetDay.date).getTime() - startOfDay(sourceDate).getTime()) / MS_PER_DAY
    );

    this.store.startDrag({ eventId: event.id, mode: 'move' });
    this.store.updateDrag({ deltaDays, deltaMinutes: 0 });
    this.store.commitDrag();
  }

  /**
   * ─── Keyboard navigation + slot click + roving focus (ARCH-70 / S10) ─────────
   *
   * Managed-focus grid (WAI-ARIA grid pattern): exactly ONE day cell is in the
   * tab order (`tabindex="0"`) — the {@link NgeCalendarStore.focusedDate} cell,
   * or the anchor cell while focus is unset — and the rest are `-1`. Arrow keys
   * move the roving focus by ±1 day (L/R) / ±1 week (U/D) WITHOUT clamping to the
   * visible month (out-of-month padding days are real dates and valid targets);
   * Enter/Space activate the focused day as an empty slot (`slotClick`); Escape
   * closes the "+N more" popover. The component writes the focus target to the
   * store and then moves real DOM focus to the matching cell; `focusCellForDate`
   * is the small DOM seam tests drive directly.
   *
   * `onGridKeydown` is bound on each day cell (the roving-tabindex element that
   * actually holds focus) rather than the grid container, so the focused cell is
   * both focusable and key-activatable — keeping the markup a11y-clean (no
   * grid-level interaction handler on a non-focusable element). It still reads
   * the current target from the store, so behaviour is grid-level: it's a
   * managed-focus grid, not 42 independent widgets.
   */
  protected cellTabIndex(day: MonthDayCell): -1 | 0 {
    const focused = this.store.focusedDate();
    if (focused !== null) {
      return isSameDay(day.date, focused) ? 0 : -1;
    }
    // No roving focus yet → the anchor cell is the single tab stop.
    return day.isAnchor ? 0 : -1;
  }

  protected onCellClick(event: MouseEvent, day: MonthDayCell): void {
    // Clicks that land on an interactive child (chip / "+N more" / bar / popover
    // control) are handled by that child (selectEvent / openPopover) — only a
    // click on the empty cell body creates a slot.
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    this.store.setFocusedDate(day.date);
    this.store.slotClick({ end: endOfDay(day.date), start: startOfDay(day.date) });
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    // Don't fight an in-flight pointer drag.
    if (this.store.drag()) {
      return;
    }

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
        // Enter/Space on a day cell = create-in-slot for the whole focused day.
        event.preventDefault();
        this.store.slotClick({ end: endOfDay(current), start: startOfDay(current) });
        break;
      case 'Escape':
        this.store.closePopover();
        break;
      default:
        // Let every other key through (typing, browser shortcuts, etc.).
        break;
    }
  }

  /**
   * Move DOM focus to the day cell rendering `date`. Extracted as a tiny seam so
   * tests can assert focus management without synthesizing a render cycle: it
   * queries the host for the cell whose `data-date` is `date`'s ISO string and
   * focuses it. A no-match (e.g. a date outside the six rendered week rows) is a
   * harmless no-op.
   */
  protected focusCellForDate(date: Date): void {
    const selector = `[data-testid="nge-month-day"][data-date="${date.toISOString()}"]`;
    this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
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
   * (deferred via `afterNextRender`, the same render-timed DOM hook the time-grid
   * uses for its initial scroll).
   */
  private moveFocus(event: KeyboardEvent, next: Date): void {
    event.preventDefault();
    this.store.setFocusedDate(next);
    afterNextRender(() => this.focusCellForDate(next), { injector: this.injector });
  }

  /** Lanes a week needs reserved above its day content for spanning bars (0 = none). */
  protected weekBarLanes(week: MonthWeekRow): number {
    let lanes = 0;
    for (const bar of week.bars) {
      lanes = Math.max(lanes, bar.rowIndex + 1);
    }
    return lanes;
  }
}
