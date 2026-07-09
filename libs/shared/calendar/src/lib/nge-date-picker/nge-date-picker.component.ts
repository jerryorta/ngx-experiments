import type { OverlayRef } from '@angular/cdk/overlay';
import type { ElementRef, TemplateRef } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';
import type { WeekStartsOn } from '@nge/date';

import { A11yModule } from '@angular/cdk/a11y';
import { ESCAPE } from '@angular/cdk/keycodes';
import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import {
  afterNextRender,
  ChangeDetectionStrategy,
  Component,
  computed,
  DestroyRef,
  forwardRef,
  inject,
  Injector,
  input,
  output,
  signal,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  addDays,
  addMonths,
  getMonthMatrix,
  getWeekDays,
  isSameDay,
  isSameMonth,
  startOfDay,
  startOfMonth,
} from '@nge/date';
import { filter as rxFilter } from 'rxjs/operators';

import { coerceToDate } from '../core/normalize/coerce-date';

/** Public value contract of `nge-date-picker`: an ISO `YYYY-MM-DD` calendar date, or null. */
export type NgeDatePickerValue = null | string;

/** A date-like value the picker will accept on `[min]` / `[max]` / a written form value. */
type DatePickerDateInput = Date | string;

/** Matches a bare ISO calendar date (`YYYY-MM-DD`) — no time/zone component. */
const ISO_DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** A full grid row is one week, so vertical arrow nav steps by this many days. */
const DAYS_PER_WEEK = 7;

/** Year-view grid width — vertical arrow nav steps by this many years. */
const YEARS_PER_ROW = 3;

/** Default years shown BEFORE the current year when no `min` bounds it (covers birthdays). */
const DEFAULT_YEARS_BACK = 100;

/** Default years shown AFTER the current year when no `max` bounds it. */
const DEFAULT_YEARS_FORWARD = 10;

/**
 * Themed, accessible overlay **date picker** primitive (ARCH-166).
 *
 * A drop-in, lossless replacement for the raw native `<input type="date">`: a
 * themed trigger shows the formatted selected value and opens a CDK-Overlay
 * single-month day grid for selection. It is a {@link ControlValueAccessor}, so it
 * works with `formControlName` / `[formControl]` / `[(ngModel)]`; the value is an
 * ISO `YYYY-MM-DD` string (the native control's contract).
 *
 * Theming is self-sufficient: every visual property reads a `--nge-calendar-*`
 * token (see `theme/_nge-calendar-tokens.scss`) with a literal fallback. NO
 * Angular Material.
 *
 * It is a self-contained design-library primitive, so its interaction state
 * (`value` / `isOpen` / `visibleMonth` / `focusedDate`) lives as component signals
 * — the intrinsic-widget-mechanics exemption to the component-store rule, mirroring
 * {@link NgeCalendarFilterComponent}. The month grid + weekday labels reuse the
 * shared `getMonthMatrix` / `getWeekDays` primitives (no re-implemented date math),
 * and `coerceToDate` normalizes non-`YYYY-MM-DD` inputs.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-date-picker' },
  imports: [A11yModule],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NgeDatePickerComponent),
    },
  ],
  selector: 'nge-date-picker',
  standalone: true,
  styleUrl: './nge-date-picker.component.scss',
  templateUrl: './nge-date-picker.component.html',
})
export class NgeDatePickerComponent implements ControlValueAccessor {
  /** Inclusive lower bound — earlier days are disabled. ISO `YYYY-MM-DD` or `Date`. */
  readonly min = input<DatePickerDateInput | null>(null);

  /** Inclusive upper bound — later days are disabled. ISO `YYYY-MM-DD` or `Date`. */
  readonly max = input<DatePickerDateInput | null>(null);

  /** Trigger text shown when no date is selected. */
  readonly placeholder = input<string>('Select date');

  /** Day the week grid starts on (`0` = Sunday … `6` = Saturday). */
  readonly weekStartsOn = input<WeekStartsOn>(0);

  /** Template-driven disabled flag, merged with the reactive-forms disabled state. */
  readonly disabled = input<boolean>(false);

  /** BCP-47 locale for the weekday labels, month title, and formatted trigger value. */
  readonly locale = input<string>();

  /** Emits the newly-selected ISO `YYYY-MM-DD` whenever the user picks a day. */
  readonly dateChange = output<string>();

  /** Canonical selected value — always `YYYY-MM-DD` or null (the CVA model value). */
  protected readonly value = signal<NgeDatePickerValue>(null);

  /** Whether the overlay panel is open (drives `aria-expanded` + active trigger state). */
  protected readonly isOpen = signal(false);

  /** First-of-month currently rendered in the panel. */
  protected readonly visibleMonth = signal<Date>(startOfMonth(new Date()));

  /** Roving keyboard-focus target within the grid, or null before the panel opens. */
  protected readonly focusedDate = signal<Date | null>(null);

  /** Which sub-view the panel shows: the day grid, or the year picker. */
  protected readonly panelView = signal<'days' | 'years'>('days');

  /** Roving keyboard-focus target within the YEAR grid (year-view only). */
  protected readonly focusedYear = signal<null | number>(null);

  /** Disabled state pushed by reactive forms via {@link setDisabledState}. */
  private readonly disabledByForm = signal(false);

  /** Effective disabled = the `[disabled]` input OR a reactive-forms disable. */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  /** The selected value parsed to a LOCAL calendar `Date`, or null. */
  protected readonly selectedDate = computed(() => this.toLocalDay(this.value()));

  /** Formatted trigger label (medium date style), or the placeholder when empty. */
  protected readonly displayLabel = computed(() => {
    const date = this.selectedDate();
    return date
      ? new Intl.DateTimeFormat(this.locale(), { dateStyle: 'medium' }).format(date)
      : this.placeholder();
  });

  /** Six week rows of seven dates for the visible month (shared month-math primitive). */
  protected readonly weeks = computed(() =>
    getMonthMatrix(this.visibleMonth(), this.weekStartsOn())
  );

  /** Localised short weekday header labels in display order. */
  protected readonly weekdayLabels = computed(() =>
    getWeekDays(this.weekStartsOn(), this.locale())
  );

  /** Month + year title for the panel header (e.g. "June 2026"). */
  protected readonly monthLabel = computed(() =>
    new Intl.DateTimeFormat(this.locale(), { month: 'long', year: 'numeric' }).format(
      this.visibleMonth()
    )
  );

  /** Selectable years, bounded by `min`/`max` when set, else a generous default window. */
  protected readonly years = computed<number[]>(() => {
    const todayYear = this.today.getFullYear();
    const min = this.minDate();
    const max = this.maxDate();
    const lo = min ? min.getFullYear() : todayYear - DEFAULT_YEARS_BACK;
    const hi = max ? max.getFullYear() : todayYear + DEFAULT_YEARS_FORWARD;
    const list: number[] = [];
    for (let year = Math.min(lo, hi); year <= Math.max(lo, hi); year++) {
      list.push(year);
    }
    return list;
  });

  /** {@link years} chunked into rows for the year grid (mirrors the day-grid week rows). */
  protected readonly yearRows = computed<number[][]>(() => {
    const list = this.years();
    const rows: number[][] = [];
    for (let i = 0; i < list.length; i += YEARS_PER_ROW) {
      rows.push(list.slice(i, i + YEARS_PER_ROW));
    }
    return rows;
  });

  /** Store-agnostic "today" for highlighting (read once; the picker is a leaf widget). */
  private readonly today = startOfDay(new Date());

  private readonly minDate = computed(() => this.toLocalDay(this.min()));

  private readonly maxDate = computed(() => this.toLocalDay(this.max()));

  private readonly destroyRef = inject(DestroyRef);

  private readonly injector = inject(Injector);

  private readonly overlay = inject(Overlay);

  /** Hidden `<ng-template>` holding the panel card, portalled into the overlay pane. */
  private readonly panelTemplate = viewChild.required<TemplateRef<unknown>>('panelTemplate');

  /** The trigger button — the overlay anchor. */
  private readonly trigger = viewChild.required<ElementRef<HTMLButtonElement>>('trigger');

  private readonly vcr = inject(ViewContainerRef);

  /** The live CDK overlay, or null when closed. */
  private overlayRef: null | OverlayRef = null;

  /** The trigger element captured on open — the focus-restore target on close. */
  private triggerEl: HTMLElement | null = null;

  private onChange: (value: NgeDatePickerValue) => void = () => {
    // Replaced by Angular forms via registerOnChange.
  };

  private onTouched: () => void = () => {
    // Replaced by Angular forms via registerOnTouched.
  };

  constructor() {
    // Tear the overlay down on destroy (also returns focus to the trigger).
    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  // ── ControlValueAccessor ─────────────────────────────────────────────────────

  /** Seed the model from a form value (any accepted shape → canonical `YYYY-MM-DD`). */
  writeValue(value: unknown): void {
    const date = this.toLocalDay(value as DatePickerDateInput | null | undefined);
    this.value.set(date ? formatIsoLocal(date) : null);
    if (date) {
      this.visibleMonth.set(startOfMonth(date));
    }
  }

  registerOnChange(fn: (value: NgeDatePickerValue) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabledByForm.set(isDisabled);
  }

  // ── trigger ──────────────────────────────────────────────────────────────────

  /** Toggle the panel open / closed from the trigger (no-op while disabled). */
  protected toggle(): void {
    if (this.isDisabled()) {
      return;
    }
    if (this.isOpen()) {
      this.close();
    } else {
      this.open();
    }
  }

  // ── per-cell grid state (mirrors NgeMonthViewComponent) ─────────────────────

  protected isToday(date: Date): boolean {
    return isSameDay(date, this.today);
  }

  protected isSelected(date: Date): boolean {
    const selected = this.selectedDate();
    return selected !== null && isSameDay(date, selected);
  }

  protected isOutsideMonth(date: Date): boolean {
    return !isSameMonth(date, this.visibleMonth());
  }

  /** True when `date` falls outside the optional `[min]` / `[max]` bounds (inclusive). */
  protected isDisabledDay(date: Date): boolean {
    const day = startOfDay(date).getTime();
    const min = this.minDate();
    const max = this.maxDate();
    if (min && day < startOfDay(min).getTime()) {
      return true;
    }
    return Boolean(max && day > startOfDay(max).getTime());
  }

  /** Exactly one cell is in the tab order: the roving-focus cell, else the selected/today cell. */
  protected cellTabIndex(date: Date): -1 | 0 {
    const focused = this.focusedDate();
    if (focused !== null) {
      return isSameDay(date, focused) ? 0 : -1;
    }
    const anchor = this.selectedDate() ?? this.today;
    return isSameDay(date, anchor) ? 0 : -1;
  }

  /** Canonical ISO key for a cell — the `data-date` DOM seam used for focus management. */
  protected cellKey(date: Date): string {
    return formatIsoLocal(date);
  }

  /** Full accessible date label for a cell (e.g. "Monday, June 15, 2026"). */
  protected cellLabel(date: Date): string {
    return new Intl.DateTimeFormat(this.locale(), { dateStyle: 'full' }).format(date);
  }

  // ── selection + paging ───────────────────────────────────────────────────────

  /** Commit a day selection: set the value, notify forms, emit, and close. */
  protected selectDay(date: Date): void {
    if (this.isDisabledDay(date)) {
      return;
    }
    const iso = formatIsoLocal(date);
    this.value.set(iso);
    this.focusedDate.set(date);
    this.onChange(iso);
    this.dateChange.emit(iso);
    // `close()` marks the control touched, so no explicit `onTouched()` here.
    this.close();
  }

  protected prevMonth(): void {
    this.visibleMonth.update(month => startOfMonth(addMonths(month, -1)));
  }

  protected nextMonth(): void {
    this.visibleMonth.update(month => startOfMonth(addMonths(month, 1)));
  }

  /**
   * Grid keyboard navigation (mirrors {@link NgeMonthViewComponent.onGridKeydown}):
   * arrows move the roving focus by ±1 day / ±1 week and PageUp/PageDown by ∓1 month,
   * paging the grid when focus crosses the visible month. The day cells are native
   * `<button>`s, so Enter/Space activate them through the browser (→ `selectDay` via
   * the `(click)` binding); Escape is handled by the overlay's `keydownEvents`.
   */
  protected onGridKeydown(event: KeyboardEvent): void {
    const current = this.focusedDate() ?? this.selectedDate() ?? this.today;
    switch (event.key) {
      case 'ArrowLeft':
        this.moveFocus(event, addDays(current, -1));
        break;
      case 'ArrowRight':
        this.moveFocus(event, addDays(current, 1));
        break;
      case 'ArrowUp':
        this.moveFocus(event, addDays(current, -DAYS_PER_WEEK));
        break;
      case 'ArrowDown':
        this.moveFocus(event, addDays(current, DAYS_PER_WEEK));
        break;
      case 'PageUp':
        this.moveFocus(event, addMonths(current, -1));
        break;
      case 'PageDown':
        this.moveFocus(event, addMonths(current, 1));
        break;
      default:
        // Enter / Space activate the focused day button natively (→ selectDay);
        // every other key (typing, browser shortcuts) passes through.
        break;
    }
  }

  // ── year view ────────────────────────────────────────────────────────────────

  /** Flip the panel between the day grid and the year picker. */
  protected toggleYearView(): void {
    if (this.panelView() === 'years') {
      this.showDays(this.focusedDate() ?? this.selectedDate() ?? this.today);
      return;
    }
    const year = this.visibleMonth().getFullYear();
    this.panelView.set('years');
    this.focusedYear.set(year);
    afterNextRender(() => this.focusYear(year), { injector: this.injector });
  }

  /** Jump the day grid to `year` (keeping the visible month + clamped day) and return to days. */
  protected selectYear(year: number): void {
    const month = this.visibleMonth().getMonth();
    const reference = this.focusedDate() ?? this.selectedDate() ?? this.today;
    const lastDay = new Date(year, month + 1, 0).getDate();
    const target = new Date(year, month, Math.min(reference.getDate(), lastDay));
    this.visibleMonth.set(startOfMonth(target));
    this.showDays(target);
  }

  /** True when `year` is the year the day grid is currently showing. */
  protected isSelectedYear(year: number): boolean {
    return year === this.visibleMonth().getFullYear();
  }

  /** True when `year` is the real current year. */
  protected isCurrentYear(year: number): boolean {
    return year === this.today.getFullYear();
  }

  /** Exactly one year cell is in the tab order: the roving-focus year, else the shown year. */
  protected yearTabIndex(year: number): -1 | 0 {
    const focused = this.focusedYear();
    if (focused !== null) {
      return year === focused ? 0 : -1;
    }
    return this.isSelectedYear(year) ? 0 : -1;
  }

  /**
   * Year-grid keyboard navigation: arrows move the roving focus by ±1 year / ±1 row
   * (clamped to the range); Enter/Space activate the focused year button natively
   * (→ `selectYear`); Escape returns to the day view (via the overlay's `onEscape`).
   */
  protected onYearKeydown(event: KeyboardEvent): void {
    const list = this.years();
    const current = this.focusedYear() ?? this.visibleMonth().getFullYear();
    let next: number;
    switch (event.key) {
      case 'ArrowLeft':
        next = current - 1;
        break;
      case 'ArrowRight':
        next = current + 1;
        break;
      case 'ArrowUp':
        next = current - YEARS_PER_ROW;
        break;
      case 'ArrowDown':
        next = current + YEARS_PER_ROW;
        break;
      default:
        // Enter / Space activate the focused year button natively (→ selectYear).
        return;
    }
    event.preventDefault();
    next = Math.max(list[0], Math.min(list[list.length - 1], next));
    this.focusedYear.set(next);
    afterNextRender(() => this.focusYear(next), { injector: this.injector });
  }

  // ── overlay lifecycle (mirrors NgeCalendarFilterComponent) ──────────────────

  /** Seed the grid on the selected month (or today) and open the anchored CDK overlay. */
  private open(): void {
    if (this.overlayRef) {
      return;
    }
    this.panelView.set('days');
    const seed = this.clampToBounds(this.selectedDate() ?? this.today);
    this.visibleMonth.set(startOfMonth(seed));
    this.focusedDate.set(seed);

    const anchor = this.trigger().nativeElement;
    this.triggerEl = anchor;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(anchor)
      .withPositions([
        { offsetY: 4, originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { offsetY: -4, originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        { offsetY: 4, originX: 'end', originY: 'bottom', overlayX: 'end', overlayY: 'top' },
        { offsetY: -4, originX: 'end', originY: 'top', overlayX: 'end', overlayY: 'bottom' },
      ])
      .withPush(true);

    const ref = this.overlay.create({
      hasBackdrop: true,
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });
    ref.attach(new TemplatePortal(this.panelTemplate(), this.vcr));

    // Propagate any ancestor `--nge-calendar-*` overrides onto the body-mounted pane
    // so a consumer token override themes the floating panel just like the trigger.
    this.propagateAncestorTheme(ref, anchor);

    ref
      .backdropClick()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.close());
    ref
      .keydownEvents()
      .pipe(
        rxFilter(event => event.keyCode === ESCAPE),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.onEscape());

    this.overlayRef = ref;
    this.isOpen.set(true);

    // WAI-ARIA date-grid: move focus to the active day cell once the panel renders.
    // `cdkTrapFocusAutoCapture` lands on the first tabbable (the prev-month button),
    // so refine it to the roving cell — arrow-key nav is then reachable immediately.
    afterNextRender(() => this.focusCellForDate(seed), { injector: this.injector });
  }

  /** Close the panel (no selection), mark the control touched. */
  private close(): void {
    if (!this.isOpen()) {
      return;
    }
    this.closeOverlay();
    this.isOpen.set(false);
    this.onTouched();
  }

  /** Detach + dispose the live overlay and return focus to the trigger element. */
  private closeOverlay(): void {
    if (!this.overlayRef) {
      return;
    }
    this.overlayRef.detach();
    this.overlayRef.dispose();
    this.overlayRef = null;

    const trigger = this.triggerEl;
    this.triggerEl = null;
    trigger?.focus();
  }

  /**
   * Move the roving focus to `next`: write the new target (re-running `cellTabIndex`
   * so it becomes the tab stop), page the grid if it crossed the visible month, then
   * move real DOM focus to the cell AFTER the tabindex binding updates.
   */
  private moveFocus(event: KeyboardEvent, next: Date): void {
    event.preventDefault();
    this.focusedDate.set(next);
    if (!isSameMonth(next, this.visibleMonth())) {
      this.visibleMonth.set(startOfMonth(next));
    }
    afterNextRender(() => this.focusCellForDate(next), { injector: this.injector });
  }

  /** Move DOM focus to the day button rendering `date` in the overlay pane (no-op if absent). */
  private focusCellForDate(date: Date): void {
    const selector = `[data-testid="nge-date-picker-day"][data-date="${formatIsoLocal(date)}"]`;
    this.overlayRef?.overlayElement.querySelector<HTMLElement>(selector)?.focus();
  }

  /** Switch to the day view and move roving focus to `focus`'s cell once it renders. */
  private showDays(focus: Date): void {
    this.focusedDate.set(focus);
    this.panelView.set('days');
    afterNextRender(() => this.focusCellForDate(focus), { injector: this.injector });
  }

  /** Escape: step back from the year view to the day grid, or close the picker from days. */
  private onEscape(): void {
    if (this.panelView() === 'years') {
      this.showDays(this.focusedDate() ?? this.selectedDate() ?? this.today);
    } else {
      this.close();
    }
  }

  /** Scroll the `year` cell into view and move DOM focus to it (no-op if absent). */
  private focusYear(year: number): void {
    const el = this.overlayRef?.overlayElement.querySelector<HTMLElement>(
      `[data-testid="nge-date-picker-year"][data-year="${year}"]`
    );
    el?.scrollIntoView({ block: 'center' });
    el?.focus();
  }

  /** Clamp `date` into the optional `[min]` / `[max]` bounds so the panel opens in-range. */
  private clampToBounds(date: Date): Date {
    const min = this.minDate();
    const max = this.maxDate();
    if (min && date.getTime() < min.getTime()) {
      return min;
    }
    if (max && date.getTime() > max.getTime()) {
      return max;
    }
    return date;
  }

  /**
   * Walk up from the anchor copying any inline `--nge-calendar-*` custom props onto
   * the overlay pane, so a token override on an ancestor of the trigger themes the
   * body-mounted panel too (it is not a DOM descendant of that ancestor).
   */
  private propagateAncestorTheme(ref: OverlayRef, anchor: HTMLElement): void {
    let el: HTMLElement | null = anchor;
    while (el) {
      const style = el.style;
      for (let i = 0; i < style.length; i++) {
        const prop = style.item(i);
        if (
          prop.startsWith('--nge-calendar-') &&
          ref.overlayElement.style.getPropertyValue(prop) === ''
        ) {
          ref.overlayElement.style.setProperty(prop, style.getPropertyValue(prop));
        }
      }
      el = el.parentElement;
    }
  }

  /**
   * Coerce any accepted value to a LOCAL calendar `Date` (midnight local), or null.
   *
   * A bare `YYYY-MM-DD` is parsed with local Y/M/D so it lands on the intended
   * calendar day in EVERY timezone — `coerceToDate('2026-06-15')` would parse as UTC
   * midnight and shift a day in negative-offset zones, breaking the native
   * `<input type="date">` contract. Everything else (`Date` / full datetime string)
   * routes through the shared `coerceToDate`, then floors to the local day.
   */
  private toLocalDay(value: DatePickerDateInput | null | undefined): Date | null {
    if (typeof value === 'string' && ISO_DATE_ONLY.test(value.trim())) {
      const [year, month, day] = value.trim().split('-').map(Number);
      return new Date(year, month - 1, day);
    }
    const coerced = coerceToDate(value ?? null);
    return coerced ? startOfDay(coerced) : null;
  }
}

/** Pad a 1–2 digit number to two digits. */
function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/**
 * Format a `Date` as a LOCAL ISO calendar date (`YYYY-MM-DD`). Uses the local
 * Y/M/D components (never `toISOString()`, which is UTC) so the emitted value
 * matches the day the user sees — the native `<input type="date">` contract.
 */
function formatIsoLocal(date: Date): string {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}
