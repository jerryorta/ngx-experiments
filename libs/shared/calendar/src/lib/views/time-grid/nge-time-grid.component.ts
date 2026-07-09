import type { CdkDragEnd } from '@angular/cdk/drag-drop';

import { CdkDrag } from '@angular/cdk/drag-drop';
import { CdkScrollable } from '@angular/cdk/scrolling';
import { DatePipe } from '@angular/common';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  inject,
  Injector,
  viewChild,
  ViewEncapsulation,
} from '@angular/core';
import { addDays, isSameDay, startOfDay } from '@nge/date';

import type { NormalizedCalendarEvent } from '../../core/models/nge-calendar-event.model';
import type { MonthEventBar } from '../../core/view-model/month-view-model.model';
import type {
  TimeGridColumn,
  TimeGridViewModel,
} from '../../core/view-model/time-grid-view-model.model';

import { NgeCalendarStore } from '../../nge-calendar/store';

/** How often the now-line clock re-reads wall time (ms). */
const CLOCK_TICK_MS = 60_000;
/** Keep the auto-scroll target a third of the way down, not flush to the top. */
const SCROLL_LEAD_FRACTION = 1 / 3;
/** Minutes in an hour — converts the focused-slot minute-of-day to/from clock time. */
const MINUTES_PER_HOUR = 60;
/** Milliseconds in a minute — builds a slot `Date` from a minute-of-day offset. */
const MS_PER_MINUTE = 60_000;
/** Percentage basis for the focus-band `top%` / `height%` geometry. */
const PERCENT = 100;

/** The rendered pixel geometry a vertical/horizontal drag is measured against. */
interface GridGeometry {
  /** Pixel height of the time canvas — maps a vertical drag to a minute delta. */
  canvasPx: number;
  /** Pixel width of one day column — maps a horizontal drag to a whole-day delta. */
  colPx: number;
}

/**
 * Convert a vertical pixel delta to a raw minute delta against the rendered grid.
 * Pure (no DOM): `canvasPx` is the rendered height of the full day window, which
 * spans `totalMinutes`. Guards a zero/invalid `canvasPx` (e.g. jsdom returns 0 for
 * `getBoundingClientRect`) so the conversion never divides by zero.
 */
export function minuteDeltaFromPixels(
  deltaPx: number,
  canvasPx: number,
  totalMinutes: number
): number {
  if (canvasPx <= 0) {
    return 0;
  }
  return (deltaPx / canvasPx) * totalMinutes;
}

/**
 * Convert a horizontal pixel delta to a whole-day column delta (rounded to the
 * nearest column). Pure (no DOM). A zero/invalid `colPx` yields no day movement.
 */
export function dayDeltaFromPixels(deltaPx: number, colPx: number): number {
  if (colPx <= 0) {
    return 0;
  }
  return Math.round(deltaPx / colPx);
}

/**
 * Shared week + day time-grid view (ARCH-67 / S7; drag + resize ARCH-69 / S9).
 *
 * ONE primitive renders both views: the store's {@link NgeCalendarStore.timeGridViewModel}
 * resolves to the week (7 columns) or day (1 column) {@link TimeGridViewModel}, so
 * the shell points both `@switch` cases here. Pure rendering + delegation — every
 * coordinate (lane left/width, minute offsets, hour lines, all-day bars) is
 * pre-computed in the core; this component only maps the view-model to inline
 * percentage geometry and forwards interactions to the store.
 *
 * **Drag / resize (S9).** A timed block is a standalone `cdkDrag` (free positioning,
 * NOT a `cdkDropList`): on drop we convert the raw pixel distance to a day + minute
 * delta against the *rendered* geometry (canvas height, column width) and drive
 * `startDrag('move') → updateDrag → commitDrag`, then `reset()` the CDK transform so
 * the block snaps back to its config-derived position (the consumer re-feeds config
 * to make the move stick). The bottom-edge resize handle is **pointer-based** — a
 * nested `cdkDrag` inside the block's own `cdkDrag` is fragile, so the handle stops
 * the block's drag on `pointerdown` and drives `startDrag('resize') → updateDrag →
 * commitResize` from raw `pointermove`/`pointerup`. `commitDrag`/`commitResize` snap
 * to `slotMinutes`, enforce the editable gate + min-one-slot, and set the signals the
 * shell bridges to the public `eventDrop` / `eventResize` outputs.
 *
 * It owns NO public boundary and NO `providers`: it `inject()`s the SAME ambient
 * {@link NgeCalendarStore} the shell provides. Because it is only mounted while a
 * time-grid view is active, it also **owns the now-line clock** — seeding
 * `currentTime` and ticking it once a minute (cleaned up on destroy), so month /
 * year never pay for a running timer. Day-highlighting reads the stable
 * store-owned `today`; the now-line reads the ticking `currentTime`.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-time-grid' },
  imports: [DatePipe, CdkDrag, CdkScrollable],
  selector: 'nge-time-grid',
  standalone: true,
  styleUrl: './nge-time-grid.component.scss',
  templateUrl: './nge-time-grid.component.html',
})
export class NgeTimeGridComponent {
  protected readonly store = inject(NgeCalendarStore);

  /** The scroll container — auto-scrolled to now / first event on first render. */
  private readonly body = viewChild<ElementRef<HTMLElement>>('body');

  /** The time canvas inside the scroller (its offsetTop = the sticky header height). */
  private readonly canvas = viewChild<ElementRef<HTMLElement>>('canvas');

  private readonly destroyRef = inject(DestroyRef);

  /** Host element — queried to move DOM focus to the roving-tabindex column. */
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** Injector for the deferred `afterNextRender` that follows a keyboard day-move. */
  private readonly injector = inject(Injector);

  /** In-flight pointer-resize gesture: origin Y + the geometry it is measured against. */
  private resizeGesture: null | { canvasPx: number; startY: number } = null;

  constructor() {
    // Own the now-line clock: seed once, then tick per minute. A signal write
    // re-runs `nowIndicator` and re-renders under OnPush (no zone needed). Only
    // alive while a time-grid view is mounted, so month / year never tick.
    this.store.setCurrentTime(new Date());
    const timer = setInterval(() => this.store.setCurrentTime(new Date()), CLOCK_TICK_MS);
    this.destroyRef.onDestroy(() => clearInterval(timer));

    // Belt-and-braces: tear down any in-flight resize listeners if the view is
    // destroyed mid-gesture (the pointerup handler also removes them on a clean end).
    this.destroyRef.onDestroy(() => this.endResizeGesture());

    // Auto-scroll to the now-line (if today is visible) else the first event.
    afterNextRender(() => this.scrollToInitial());
  }

  /** Vertical offset (in lane steps) of an all-day bar stacked by its `rowIndex`. */
  protected allDayBarTop(bar: MonthEventBar): string {
    return `calc(${bar.rowIndex} * var(--nge-tg-allday-step))`;
  }

  /** Lanes the all-day strip needs reserved for its bars (min 1 so the row shows). */
  protected allDayLaneCount(bars: ReadonlyArray<MonthEventBar>): number {
    let lanes = 1;
    for (const bar of bars) {
      lanes = Math.max(lanes, bar.rowIndex + 1);
    }
    return lanes;
  }

  /**
   * Whether a timed block may be dragged to a new time / day. Mirrors the store's
   * `startDrag` gating (global `editable()` AND the event's own `editable !== false`)
   * so the CDK affordance is only offered when a drop would actually commit;
   * `startDrag` re-checks this, so a stray drag is still a harmless no-op.
   */
  protected canDrag(event: NormalizedCalendarEvent): boolean {
    return this.store.editable() && event.editable !== false;
  }

  /**
   * Whether a timed block may be resized by its bottom edge: draggable AND it has an
   * `end` (an open-ended event has no edge to drag). Drives whether the resize handle
   * renders at all; the store's `startDrag('resize')` independently refuses a no-end
   * event, so an out-of-band call is still a no-op.
   */
  protected canResize(event: NormalizedCalendarEvent): boolean {
    return this.canDrag(event) && event.end !== null;
  }

  /** Per-event colour for a timed block / all-day bar, or `null` to use the token. */
  protected eventColor(event: NormalizedCalendarEvent): null | string {
    return event.color ?? null;
  }

  /**
   * The `grid-template-columns` for the header + body grids: a fixed time gutter
   * then one equal column per day. Built here (literal `repeat(N, …)`) rather than
   * in SCSS because `repeat(var(--n), …)` is not valid — the count can't be a
   * custom property.
   */
  protected gridTemplateColumns(columnCount: number): string {
    return `var(--nge-tg-gutter) repeat(${columnCount}, minmax(0, 1fr))`;
  }

  /** True when the now-line belongs in this column: same calendar day as `currentTime`. */
  protected isNowColumn(date: Date): boolean {
    const now = this.store.currentTime();
    return now !== null && isSameDay(date, now);
  }

  /** True when this column's date is store-owned "today" (null today ⇒ never). */
  protected isToday(date: Date): boolean {
    const today = this.store.today();
    return today !== null && isSameDay(date, today);
  }

  /**
   * Commit a free-drag move of a timed block. CDK gives us the total pixel distance
   * (`e.distance` = {x, y}); we convert it against the *rendered* geometry — the
   * canvas pixel height (full day window = `totalMinutes`) and one column's pixel
   * width (one whole day) — into a minute + day delta, then drive the store
   * (`startDrag → updateDrag → commitDrag`). `commitDrag()` snaps to the slot and
   * sets the signal the shell bridges to the public `eventDrop` output, after which
   * the consumer re-renders the moved event from config.
   *
   * Crucially we then `reset()` the CDK transform so the block returns to its
   * config-derived position — we do NOT keep the dropped pixel offset (no drop list /
   * `moveItemInArray`); the move "sticks" only via the re-fed config. If `startDrag`
   * was refused (not editable), `commitDrag()` returns null harmlessly and `reset()`
   * still snaps the block back.
   */
  protected onEventDragEnd(e: CdkDragEnd): void {
    const vm = this.store.timeGridViewModel();
    if (vm) {
      const { canvasPx, colPx } = this.dragGeometry(e.source.element.nativeElement);
      const deltaMinutes = minuteDeltaFromPixels(e.distance.y, canvasPx, vm.totalMinutes);
      const deltaDays = dayDeltaFromPixels(e.distance.x, colPx);
      this.store.updateDrag({ deltaDays, deltaMinutes });
      this.store.commitDrag();
    }
    // Always snap the CDK transform back; the move sticks via re-fed config, not the
    // live pixel offset. Done outside the `vm` guard so a stray drop still resets.
    e.source.reset();
  }

  /** Begin a free-drag move: capture the origin in the store (gated by `canDrag`). */
  protected onEventDragStart(event: NormalizedCalendarEvent): void {
    this.store.startDrag({ eventId: event.id, mode: 'move' });
  }

  /**
   * Begin a bottom-edge pointer resize. We `stopPropagation` + `preventDefault` so
   * the block's own `cdkDrag` does NOT start (a nested CDK drag would be fragile),
   * capture the pointer + the start Y + the canvas pixel height, and open the resize
   * gesture in the store (`startDrag('resize')`). `pointermove` → `updateDrag`,
   * `pointerup` → `commitResize`; both are bound on the handle (which has pointer
   * capture) and removed when the gesture ends.
   */
  protected onResizeHandleDown(e: PointerEvent, event: NormalizedCalendarEvent): void {
    e.preventDefault();
    e.stopPropagation();

    const vm = this.store.timeGridViewModel();
    if (!vm) {
      return;
    }
    this.store.startDrag({ eventId: event.id, mode: 'resize' });
    if (!this.store.drag()) {
      return; // startDrag refused (not editable / no end) — nothing to drive.
    }

    this.resizeGesture = { canvasPx: this.canvasHeightPx(), startY: e.clientY };

    const handle = e.target as HTMLElement;
    handle.setPointerCapture?.(e.pointerId);
    handle.addEventListener('pointermove', this.onResizePointerMove);
    handle.addEventListener('pointerup', this.onResizePointerUp);
    handle.addEventListener('pointercancel', this.onResizePointerUp);
  }

  /**
   * ─── Keyboard navigation + slot click + roving focus (ARCH-70 / S10) ─────────
   *
   * The time grid has NO per-slot DOM (only the day column + absolutely-positioned
   * event blocks), so the **column** is the managed-focus element and the store's
   * {@link NgeCalendarStore.focusedDate} carries BOTH the focused day AND the
   * minute-of-day within it. Exactly one column is in the tab order
   * (`tabindex="0"`) — the one whose calendar day matches `focusedDate`, or the
   * anchor column while focus is unset; the rest are `-1`. Arrow Up/Down move the
   * focused *time* by one slot (clamped to the day window, same column / DOM focus);
   * Arrow Left/Right move the focused *day* keeping the time-of-day (and shift DOM
   * focus to the new column); Enter/Space activate the focused slot
   * (`slotClick(start … start+slotMinutes)`); Escape closes an open popover.
   *
   * `onGridKeydown` / `onColumnClick` are bound on each column (the focusable
   * roving-tabindex element that actually holds focus) rather than the non-focusable
   * scroll container, so the focused element is both focusable and key-activatable —
   * keeping the markup a11y-clean (no interaction handler on a non-focusable
   * element). The handlers still read the current target from the store, so
   * behaviour is grid-level: a managed-focus grid, not N independent widgets.
   */
  protected colTabIndex(column: TimeGridColumn): -1 | 0 {
    const focused = this.store.focusedDate();
    const vm = this.store.timeGridViewModel();
    // Roving focus on a rendered day → that column is the tab stop. If `focusedDate`
    // is unset OR (defensively) falls outside the rendered columns, fall back to the
    // anchor so a tab stop always exists (focus is never stranded).
    if (focused !== null && vm && this.hasColumnForDay(vm, focused)) {
      return isSameDay(column.date, focused) ? 0 : -1;
    }
    return column.isAnchor ? 0 : -1;
  }

  /** True when this column owns the roving focus (drives the focus-band render). */
  protected isFocusedColumn(column: TimeGridColumn): boolean {
    const focused = this.store.focusedDate();
    return focused !== null && isSameDay(column.date, focused);
  }

  /**
   * Whether the focused-slot band should paint in `column`: this is the focused
   * column AND `focusedDate`'s minute-of-day falls inside the rendered window
   * `[dayStartHour, dayEndHour)`. A focus time outside the window (e.g. focus seeded
   * by a click then the window narrowed) simply hides the band — the column still
   * keeps its `:focus-visible` outline.
   */
  protected isFocusBandVisible(column: TimeGridColumn): boolean {
    const vm = this.store.timeGridViewModel();
    const focused = this.store.focusedDate();
    if (!vm || focused === null || !this.isFocusedColumn(column)) {
      return false;
    }
    const minute = this.minuteOfDay(focused);
    return minute >= vm.dayStartHour * MINUTES_PER_HOUR && minute < this.windowEndMinute(vm);
  }

  /** Top of the focus band as a `%` of the canvas: `(minuteOffset / totalMinutes)`. */
  protected focusBandTopPct(): number {
    const vm = this.store.timeGridViewModel();
    const focused = this.store.focusedDate();
    if (!vm || focused === null) {
      return 0;
    }
    const offset = this.minuteOfDay(focused) - vm.dayStartHour * MINUTES_PER_HOUR;
    return (offset / vm.totalMinutes) * PERCENT;
  }

  /** Height of the focus band as a `%` of the canvas: one slot tall. */
  protected focusBandHeightPct(): number {
    const vm = this.store.timeGridViewModel();
    return vm ? (vm.slotMinutes / vm.totalMinutes) * PERCENT : 0;
  }

  /**
   * Empty-area click in a column → activate that slot. A click that lands on an
   * interactive child (an event block / its resize handle / an all-day bar) is left
   * to that child (`selectEvent`) — only a click on the bare column body creates a
   * slot. The pointer Y is converted to a snapped minute-of-day via the
   * {@link clickMinuteOfDay} seam, then we set the roving focus to that slot and emit
   * the slot click (`start … start + slotMinutes`).
   */
  protected onColumnClick(event: MouseEvent, column: TimeGridColumn): void {
    if ((event.target as HTMLElement).closest('button')) {
      return;
    }
    const vm = this.store.timeGridViewModel();
    if (!vm) {
      return;
    }
    const minute = this.clickMinuteOfDay(event, vm);
    const start = this.slotStart(column.date, minute);
    this.store.setFocusedDate(start);
    this.store.slotClick({ end: this.slotEnd(start, vm), start });
  }

  protected onGridKeydown(event: KeyboardEvent): void {
    // Don't fight an in-flight pointer drag / resize.
    if (this.store.drag()) {
      return;
    }
    const vm = this.store.timeGridViewModel();
    if (!vm) {
      return;
    }

    const current = this.store.focusedDate() ?? this.seedFocusDate(vm);
    if (!current) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
        this.moveTime(event, current, vm, vm.slotMinutes);
        break;
      case 'ArrowLeft':
        this.moveDay(event, current, -1);
        break;
      case 'ArrowRight':
        this.moveDay(event, current, 1);
        break;
      case 'ArrowUp':
        this.moveTime(event, current, vm, -vm.slotMinutes);
        break;
      case 'Enter':
      case ' ': {
        // Enter/Space activate the focused slot (start … start + one slot).
        event.preventDefault();
        const start = this.slotStart(current, this.minuteOfDay(current));
        this.store.slotClick({ end: this.slotEnd(start, vm), start });
        break;
      }
      case 'Escape':
        this.store.closePopover();
        break;
      default:
        // Let every other key through (typing, browser shortcuts, etc.).
        break;
    }
  }

  /**
   * Move DOM focus to the column rendering `date`'s day. Extracted as a tiny seam so
   * tests can assert focus management without synthesizing a render cycle: it finds
   * the column whose `data-date` is the SAME calendar day as `date` (the ISO string
   * carries the focused time, so an exact-string match would miss) and focuses it. A
   * no-match (a date outside the rendered columns) is a harmless no-op.
   */
  protected focusCellForDate(date: Date): void {
    const cols = this.host.nativeElement.querySelectorAll<HTMLElement>(
      '[data-testid="nge-time-grid-column"]'
    );
    for (const col of Array.from(cols)) {
      const colDate = col.getAttribute('data-date');
      if (colDate && isSameDay(new Date(colDate), date)) {
        col.focus();
        return;
      }
    }
  }

  /**
   * Convert a column click's pointer Y to a snapped minute-of-day. A protected seam:
   * it reads the column geometry via `getBoundingClientRect()`, which returns zeros
   * in jsdom, so the spec overrides it to inject a deterministic minute. The raw
   * offset (pointer Y − column top) is mapped to minutes against the rendered canvas
   * height, snapped to `slotMinutes`, then shifted into clock minutes by the window
   * start and clamped to the last whole slot.
   */
  protected clickMinuteOfDay(event: MouseEvent, vm: TimeGridViewModel): number {
    const col = (event.target as HTMLElement).closest<HTMLElement>('.nge-time-grid__col');
    const rect = col?.getBoundingClientRect();
    const offsetPx = rect ? event.clientY - rect.top : 0;
    const rawMinute = minuteDeltaFromPixels(offsetPx, rect?.height ?? 0, vm.totalMinutes);
    const snapped = Math.round(rawMinute / vm.slotMinutes) * vm.slotMinutes;
    return this.clampMinute(vm.dayStartHour * MINUTES_PER_HOUR + snapped, vm);
  }

  /** The 0..1 vertical fraction to centre on load: the now-line, else the first event. */
  private initialScrollFraction(vm: TimeGridViewModel): null | number {
    const now = this.store.nowIndicator();
    if (now) {
      return now.topPct / 100;
    }
    let earliest = Number.POSITIVE_INFINITY;
    for (const column of vm.columns) {
      for (const event of column.timed) {
        earliest = Math.min(earliest, event.startMinute);
      }
    }
    return Number.isFinite(earliest) ? earliest / vm.totalMinutes : null;
  }

  /**
   * Live pixel height of the time canvas (0 if not yet rendered / in jsdom). A
   * protected seam: the resize gesture reads it via `getBoundingClientRect()`, which
   * returns 0 in jsdom, so the spec overrides it to inject a deterministic height.
   */
  protected canvasHeightPx(): number {
    return this.canvas()?.nativeElement.getBoundingClientRect().height ?? 0;
  }

  /**
   * Resolve the rendered pixel geometry a move drag is measured against: the canvas
   * height (vertical → minutes) and one column's width (horizontal → days). Read off
   * the live DOM via `getBoundingClientRect()` — the column from the dragged block's
   * nearest `.nge-time-grid__col` ancestor, the canvas from its `viewChild`. A
   * protected seam: the spec overrides it to inject deterministic pixels because
   * jsdom's `getBoundingClientRect()` returns zeros.
   */
  protected dragGeometry(eventEl: HTMLElement): GridGeometry {
    const col = eventEl.closest<HTMLElement>('.nge-time-grid__col');
    return {
      canvasPx: this.canvasHeightPx(),
      colPx: col?.getBoundingClientRect().width ?? 0,
    };
  }

  /** The anchor column's date (the keyboard-nav fallback's day), or null. */
  private anchorColumnDate(vm: TimeGridViewModel): Date | null {
    for (const column of vm.columns) {
      if (column.isAnchor) {
        return column.date;
      }
    }
    return null;
  }

  /** Clamp a minute-of-day to the last whole slot inside the rendered window. */
  private clampMinute(minute: number, vm: TimeGridViewModel): number {
    const min = vm.dayStartHour * MINUTES_PER_HOUR;
    const max = this.windowEndMinute(vm) - vm.slotMinutes;
    return Math.min(Math.max(minute, min), max);
  }

  /** Detach the in-flight resize listeners (clean end OR destroy) and clear the gesture. */
  private endResizeGesture(): void {
    this.resizeGesture = null;
  }

  /** Minutes-since-midnight of `date` (its local hour/minute). */
  private minuteOfDay(date: Date): number {
    return date.getHours() * MINUTES_PER_HOUR + date.getMinutes();
  }

  /** True when a rendered column matches `date`'s calendar day (e.g. week range). */
  private hasColumnForDay(vm: TimeGridViewModel, date: Date): boolean {
    return vm.columns.some(column => isSameDay(column.date, date));
  }

  /**
   * Arrow Left/Right: move the focused DAY by `deltaDays` keeping the time-of-day.
   * Clamped to the rendered columns — the week renders the neighbour day so the move
   * lands; the **day view** has a single column, so a horizontal move has nowhere to
   * go and is a no-op (NOT moving focus to an unrendered day, which would strand the
   * roving tab stop). On a valid move we write the store (so `colTabIndex` re-points
   * the tab stop) and move real DOM focus to the new column AFTER the tabindex binding
   * updates (deferred via `afterNextRender`, the render-timed hook the scroll uses).
   */
  private moveDay(event: KeyboardEvent, current: Date, deltaDays: number): void {
    const next = addDays(current, deltaDays);
    const vm = this.store.timeGridViewModel();
    if (!vm || !this.hasColumnForDay(vm, next)) {
      return; // No column for the target day (e.g. day view) — don't strand focus.
    }
    event.preventDefault();
    this.store.setFocusedDate(next);
    afterNextRender(() => this.focusCellForDate(next), { injector: this.injector });
  }

  /**
   * Arrow Up/Down: move the focused TIME by `deltaMinutes` (∓ one slot), clamped to
   * the day window, keeping the same day. DOM focus stays on the current column
   * (only the time within it changes), so no re-focus is needed — the focus band
   * just re-paints at the new minute.
   */
  private moveTime(
    event: KeyboardEvent,
    current: Date,
    vm: TimeGridViewModel,
    deltaMinutes: number
  ): void {
    event.preventDefault();
    const minute = this.clampMinute(this.minuteOfDay(current) + deltaMinutes, vm);
    this.store.setFocusedDate(this.slotStart(current, minute));
  }

  /** The seed focus target when none is set: the anchor day at the first slot. */
  private seedFocusDate(vm: TimeGridViewModel): Date | null {
    const anchor = this.anchorColumnDate(vm);
    return anchor ? this.slotStart(anchor, vm.dayStartHour * MINUTES_PER_HOUR) : null;
  }

  /** The slot's exclusive end: `start + slotMinutes`. */
  private slotEnd(start: Date, vm: TimeGridViewModel): Date {
    return new Date(start.getTime() + vm.slotMinutes * MS_PER_MINUTE);
  }

  /**
   * The `Date` for `minuteOfDay` on `date`'s calendar day. No `addMinutes` exists in
   * `@nge/date`, so it's built from the day-start epoch + the minute offset.
   */
  private slotStart(date: Date, minuteOfDay: number): Date {
    return new Date(startOfDay(date).getTime() + minuteOfDay * MS_PER_MINUTE);
  }

  /** The exclusive end of the rendered day window, in minutes-since-midnight. */
  private windowEndMinute(vm: TimeGridViewModel): number {
    return vm.dayEndHour * MINUTES_PER_HOUR;
  }

  /** Live pointer move during a resize: convert the Y travel to a raw minute delta. */
  private readonly onResizePointerMove = (e: PointerEvent): void => {
    const gesture = this.resizeGesture;
    const vm = this.store.timeGridViewModel();
    if (!gesture || !vm) {
      return;
    }
    const deltaMinutes = minuteDeltaFromPixels(
      e.clientY - gesture.startY,
      gesture.canvasPx,
      vm.totalMinutes
    );
    this.store.updateDrag({ deltaMinutes });
  };

  /** Resize pointer release: commit (snaps + min-one-slot in the store) and clean up. */
  private readonly onResizePointerUp = (e: PointerEvent): void => {
    if (this.resizeGesture) {
      this.store.commitResize();
    }
    const handle = e.target as HTMLElement;
    handle.releasePointerCapture?.(e.pointerId);
    handle.removeEventListener('pointermove', this.onResizePointerMove);
    handle.removeEventListener('pointerup', this.onResizePointerUp);
    handle.removeEventListener('pointercancel', this.onResizePointerUp);
    this.endResizeGesture();
  };

  /** Scroll so the now-line / first event sits a third of the way down the body. */
  private scrollToInitial(): void {
    const vm = this.store.timeGridViewModel();
    const scroll = this.body()?.nativeElement;
    const canvas = this.canvas()?.nativeElement;
    if (!vm || !scroll || !canvas) {
      return;
    }
    const fraction = this.initialScrollFraction(vm);
    if (fraction === null) {
      return;
    }
    // `canvas.offsetTop` is the sticky header height (its offsetParent is the
    // position:relative scroll container); offset into the canvas by `fraction`.
    const target =
      canvas.offsetTop +
      canvas.clientHeight * fraction -
      scroll.clientHeight * SCROLL_LEAD_FRACTION;
    scroll.scrollTop = Math.max(0, target);
  }
}
