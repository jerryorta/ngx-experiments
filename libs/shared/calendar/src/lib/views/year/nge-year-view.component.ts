import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  Injector,
  ViewEncapsulation,
} from '@angular/core';
import { isSameDay } from '@nge/date';

import type { MiniMonth, MiniMonthDay } from '../../core/view-model/year-view-model.model';

import { NgeCalendarStore } from '../../nge-calendar/store';

/** Twelve month tiles, indexed 0..11 — the keyboard nav clamps within this range. */
const FIRST_MONTH = 0;
const LAST_MONTH = 11;

/**
 * Mini-month tiles per grid row, assumed for ↑/↓ keyboard stepping. The SCSS lays
 * the grid out responsively (`repeat(auto-fill, minmax(13.5rem, 1fr))`), so the
 * real column count varies with the container width and can't be read statically.
 * Four is the typical wide-layout count; ↑/↓ steps by this many months and clamps
 * to 0..11, so an off-by-a-column at a narrow width is still a safe in-range move.
 */
const MONTH_COLUMNS = 4;

/**
 * Year overview view (ARCH-68 / S8) — twelve mini-month grids with a per-day
 * event-density affordance.
 *
 * Pure rendering + delegation: it reads the already-built
 * {@link NgeCalendarStore.yearViewModel} computed (twelve mini-months, each a
 * fixed 6×7 day matrix carrying a pre-derived `densityLevel` per day) and drives
 * the store's atomic `drillInto` method. Clicking a day cell OR a month header
 * drills into the month view anchored at the clicked date — a SINGLE store patch,
 * so the shell's `bridgeViewChange()` emits `viewChange` once. It writes ZERO
 * layout maths and ZERO new state.
 *
 * It owns NO public boundary and NO `providers`: it `inject()`s the SAME ambient
 * {@link NgeCalendarStore} the shell provides (a local `providers` here would
 * create a second, un-seeded store). "Today" lives on the store because the core
 * is now-agnostic, so today-highlighting derives from `store.today()` (distinct
 * from `isAnchor`, the view-model's clicked/anchor day).
 *
 * ─── Keyboard navigation + roving focus (ARCH-71 / S11) ──────────────────────
 *
 * The twelve month-header buttons form a managed-focus grid (WAI-ARIA roving
 * tabindex): exactly ONE header is in the tab order (`tabindex="0"`) — the one
 * whose month matches {@link NgeCalendarStore.focusedDate} in the displayed
 * year, or the FIRST tile while focus is unset / outside the year — and the rest
 * are `-1`. Arrow keys move the roving focus by ±1 month (L/R) / ±columns (U/D),
 * clamped to 0..11 (it does NOT cross years); Enter/Space drill into that month
 * (mirroring the header-click path). Keyboard nav operates at the month-tile
 * level only — the per-day click-drill is unchanged (mouse-only, no day-cell
 * keyboard target). The component writes the focus target's month to the store
 * (as a day-1 date in the displayed year) and then moves real DOM focus to the
 * matching header; `focusMonthTile` is the small DOM seam tests drive directly.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-year-view' },
  selector: 'nge-year-view',
  standalone: true,
  styleUrl: './nge-year-view.component.scss',
  templateUrl: './nge-year-view.component.html',
})
export class NgeYearViewComponent {
  protected readonly store = inject(NgeCalendarStore);

  /** Host element — queried to move DOM focus to the roving-tabindex month tile. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Injector for the deferred `afterNextRender` that follows a keyboard move. */
  private readonly injector = inject(Injector);

  /** True when this cell's date is store-owned "today" (null today ⇒ never). */
  protected isToday(date: Date): boolean {
    const today = this.store.today();
    return today !== null && isSameDay(date, today);
  }

  /**
   * Roving tabindex for a month tile: `0` when the store's `focusedDate` falls in
   * THIS month of the displayed year, else `-1`. When focus is unset (or sits in a
   * different year), the first tile (January) is the single tab stop.
   */
  protected monthTabIndex(monthIndex: number): -1 | 0 {
    const vm = this.store.yearViewModel();
    if (!vm) {
      return -1;
    }
    const focused = this.store.focusedDate();
    if (focused !== null && focused.getFullYear() === vm.year) {
      return focused.getMonth() === monthIndex ? 0 : -1;
    }
    // No roving focus yet (or focus is in another year) → January is the tab stop.
    return monthIndex === FIRST_MONTH ? 0 : -1;
  }

  /** Drill into the month containing the clicked day, anchored at that exact day. */
  protected onDayClick(day: MiniMonthDay): void {
    this.store.drillInto(day.date, 'month');
  }

  /** Drill into the clicked month, anchored at its first day. */
  protected onMonthClick(month: MiniMonth): void {
    const vm = this.store.yearViewModel();
    if (!vm) {
      return;
    }
    this.store.drillInto(new Date(vm.year, month.monthIndex, 1), 'month');
  }

  /**
   * Roving keyboard nav over the twelve month tiles. Arrow keys move the focus
   * month by ±1 (L/R) or ±columns (U/D), clamped to 0..11 so it never crosses
   * years; Enter/Space drill into the focused month. `preventDefault()` on handled
   * keys (so arrows don't scroll the grid and Space doesn't page). The current
   * month is read from the store's `focusedDate` (defaulting to January when unset
   * or in another year), matching the roving-tabindex tab stop.
   */
  protected onYearKeydown(event: KeyboardEvent): void {
    const vm = this.store.yearViewModel();
    if (!vm) {
      return;
    }
    const current = this.focusedMonthIndex(vm.year);

    switch (event.key) {
      case 'ArrowDown':
        this.moveFocus(event, vm.year, current + MONTH_COLUMNS);
        break;
      case 'ArrowLeft':
        this.moveFocus(event, vm.year, current - 1);
        break;
      case 'ArrowRight':
        this.moveFocus(event, vm.year, current + 1);
        break;
      case 'ArrowUp':
        this.moveFocus(event, vm.year, current - MONTH_COLUMNS);
        break;
      case 'Enter':
      case ' ':
        // Enter/Space on a month tile = drill into that month (same as a click).
        event.preventDefault();
        this.store.drillInto(new Date(vm.year, current, 1), 'month');
        break;
      default:
        // Let every other key through (typing, browser shortcuts, etc.).
        break;
    }
  }

  /**
   * Move DOM focus to the month tile at `monthIndex`. Extracted as a tiny seam so
   * tests can assert focus management without synthesizing a render cycle: it
   * queries the host for the header whose `data-month-index` matches and focuses
   * it. A no-match is a harmless no-op.
   */
  protected focusMonthTile(monthIndex: number): void {
    const selector = `[data-testid="nge-year-month"][data-month-index="${monthIndex}"]`;
    this.host.nativeElement.querySelector<HTMLElement>(selector)?.focus();
  }

  /**
   * The currently focused month index for `year`: the store's `focusedDate` month
   * when it falls in the displayed year, else January (the roving-tabindex default
   * tab stop). Always returns an in-range 0..11 index.
   */
  private focusedMonthIndex(year: number): number {
    const focused = this.store.focusedDate();
    if (focused !== null && focused.getFullYear() === year) {
      return focused.getMonth();
    }
    return FIRST_MONTH;
  }

  /**
   * Commit an arrow-key move: prevent the default scroll, clamp the target month
   * to 0..11 (no year crossing), write it to the store as a day-1 date in the
   * displayed year (which re-runs `monthTabIndex` so the new tile becomes the tab
   * stop), then move real DOM focus to it AFTER the tabindex binding updates
   * (deferred via `afterNextRender`, the same render-timed DOM hook the month view
   * uses for its roving focus).
   */
  private moveFocus(event: KeyboardEvent, year: number, target: number): void {
    event.preventDefault();
    const clamped = Math.min(LAST_MONTH, Math.max(FIRST_MONTH, target));
    this.store.setFocusedDate(new Date(year, clamped, 1));
    afterNextRender(() => this.focusMonthTile(clamped), { injector: this.injector });
  }
}
