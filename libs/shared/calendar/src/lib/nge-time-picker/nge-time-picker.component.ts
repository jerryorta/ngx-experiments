import type { OverlayRef } from '@angular/cdk/overlay';
import type { ElementRef, TemplateRef } from '@angular/core';
import type { ControlValueAccessor } from '@angular/forms';

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
import { filter as rxFilter } from 'rxjs/operators';

import {
  angleToHourIndex,
  angleToMinute,
  hourIndexToAngle,
  minuteToAngle,
  pointerAngle,
  polarToXy,
} from './clock-geometry';

/** Public value contract of `nge-time-picker`: a 24-hour clock time `HH:mm`, or null. */
export type NgeTimePickerValue = null | string;

/**
 * Which selection surface the open panel renders. `'columns'` (scrollable hour / minute /
 * meridiem lists) is the only surface implemented today; `'clock'` is **reserved** for a future
 * analog-clock face and currently falls back to the columns surface.
 */
export type NgeTimePickerSurface = 'clock' | 'columns';

/** A time-like value the picker accepts on `[min]` / `[max]` / a written form value. */
type TimePickerTimeInput = Date | string;

/** The AM / PM half of a 12-hour clock. */
type Meridiem = 'am' | 'pm';

/** Which scrollable column a keyboard event came from (drives inter-column arrow nav). */
type TimeColumn = 'hour' | 'meridiem' | 'minute';

/** Which value the analog clock is currently editing (two-step hour → minute flow). */
type ClockStep = 'hour' | 'minute';

/** A single rendered number on the analog dial. */
interface DialNumber {
  angle: number;
  disabled: boolean;
  label: string;
  selected: boolean;
  value: number;
  x: number;
  y: number;
}

/** Matches `HH:mm` or `HH:mm:ss` — the native `<input type="time">` value shapes. */
const HH_MM = /^(\d{1,2}):(\d{2})(?::\d{2})?$/;

/** Minutes in an hour — the wrap point for the range arithmetic + minute list. */
const MINUTES_PER_HOUR = 60;

/** Hours in a half-day — the AM↔PM shift the meridiem column applies to the 24h hour. */
const HOURS_PER_HALF_DAY = 12;

/** Analog-dial SVG viewBox edge length (square). */
const DIAL_SIZE = 240;

/** Center of the dial in viewBox units (face center, hand origin, center dot). */
const DIAL_CENTER = 120;

/** Radius of the number ring + the selection-puck center, in viewBox units. */
const NUMBER_RADIUS = 92;

/** Selection-puck radius, in viewBox units. */
const PUCK_RADIUS = 18;

/** The minute dial labels a number every 5 minutes (selection still snaps to `minuteStep`). */
const MINUTE_LABEL_STEP = 5;

/**
 * Themed, accessible overlay **time picker** primitive (sibling of {@link NgeDatePickerComponent}).
 *
 * A drop-in, lossless replacement for the raw native `<input type="time">`: a themed trigger shows
 * the formatted selected value and opens a CDK-Overlay panel of scrollable hour / minute / meridiem
 * columns. It is a {@link ControlValueAccessor}, so it works with `formControlName` /
 * `[formControl]` / `[(ngModel)]`; the value is a canonical 24-hour `HH:mm` string (the native
 * control's contract), regardless of whether a 12- or 24-hour clock is displayed.
 *
 * Theming is self-sufficient: every visual property reads a `--nge-calendar-*` token (see
 * `theme/_nge-calendar-tokens.scss`) with a literal fallback. NO Angular Material.
 *
 * It is a self-contained design-library primitive, so its interaction state (`value` / `isOpen` /
 * the `draftHour` / `draftMinute` selection draft) lives as component signals — the
 * intrinsic-widget-mechanics exemption to the component-store rule, mirroring the date picker.
 *
 * The **selection surface is swappable**: the shell (CVA, overlay lifecycle, draft state, min/max,
 * the Done/Cancel footer, theming, the a11y dialog scaffold) is surface-agnostic, and the inner
 * surface is chosen by {@link selectionMode}. A future analog `'clock'` face drops into the
 * template's `@switch` reading the same `draftHour` / `draftMinute` and committing via the same
 * `confirm()` — no shell changes (mirrors how the date picker swaps its day ↔ year surfaces).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-time-picker' },
  imports: [A11yModule],
  providers: [
    {
      multi: true,
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => NgeTimePickerComponent),
    },
  ],
  selector: 'nge-time-picker',
  standalone: true,
  styleUrl: './nge-time-picker.component.scss',
  templateUrl: './nge-time-picker.component.html',
})
export class NgeTimePickerComponent implements ControlValueAccessor {
  /** Inclusive lower bound — earlier times are disabled. `HH:mm` or `Date`. */
  readonly min = input<null | TimePickerTimeInput>(null);

  /** Inclusive upper bound — later times are disabled. `HH:mm` or `Date`. */
  readonly max = input<null | TimePickerTimeInput>(null);

  /** Trigger text shown when no time is selected. */
  readonly placeholder = input<string>('Select time');

  /** Minute-column granularity (1 = every minute). An off-step written value stays selectable. */
  readonly minuteStep = input<number>(1);

  /** Force a 12- (`true`) or 24-hour (`false`) clock. When unset, derived from {@link locale}. */
  readonly hour12 = input<boolean>();

  /** Selection surface to render. `'clock'` is reserved (future) and falls back to `'columns'`. */
  readonly selectionMode = input<NgeTimePickerSurface>('columns');

  /** Template-driven disabled flag, merged with the reactive-forms disabled state. */
  readonly disabled = input<boolean>(false);

  /** BCP-47 locale for the formatted trigger value, meridiem labels, and 12/24-hour derivation. */
  readonly locale = input<string>();

  /** Emits the newly-committed 24-hour `HH:mm` whenever the user confirms a time with Done. */
  readonly timeChange = output<string>();

  /** Canonical committed value — always `HH:mm` (24h) or null (the CVA model value). */
  protected readonly value = signal<NgeTimePickerValue>(null);

  /** Whether the overlay panel is open (drives `aria-expanded` + active trigger state). */
  protected readonly isOpen = signal(false);

  /** Draft hour (24h, 0–23) edited while the panel is open — committed to `value` only on Done. */
  protected readonly draftHour = signal(0);

  /** Draft minute (0–59) edited while the panel is open — committed to `value` only on Done. */
  protected readonly draftMinute = signal(0);

  /** Which value the analog dial is editing (hour first, then auto-advance to minute). */
  protected readonly clockStep = signal<ClockStep>('hour');

  /** The surface currently shown — seeded from `selectionMode`, flipped by the in-panel toggle. */
  protected readonly activeSurface = signal<NgeTimePickerSurface>('columns');

  /** The two meridiem options, in display order (12h mode only). */
  protected readonly meridiems: readonly Meridiem[] = ['am', 'pm'];

  /** SVG viewBox for the analog dial. */
  protected readonly dialViewBox = `0 0 ${DIAL_SIZE} ${DIAL_SIZE}`;

  /** Dial center (viewBox units) — the face center, hand origin, and center dot. */
  protected readonly dialCenter = DIAL_CENTER;

  /** Dial face circle radius (viewBox units). */
  protected readonly dialFaceRadius = DIAL_CENTER - 2;

  /** Selection-puck radius (viewBox units). */
  protected readonly puckRadius = PUCK_RADIUS;

  /** Disabled state pushed by reactive forms via {@link setDisabledState}. */
  private readonly disabledByForm = signal(false);

  /** Effective disabled = the `[disabled]` input OR a reactive-forms disable. */
  protected readonly isDisabled = computed(() => this.disabled() || this.disabledByForm());

  /** The committed value parsed to `{ h, m }`, or null. */
  protected readonly selectedTime = computed(() => parseHm(this.value()));

  /** Whether to present a 12-hour clock: the explicit `[hour12]`, else derived from the locale. */
  protected readonly effectiveHour12 = computed(() => {
    const explicit = this.hour12();
    return explicit === undefined ? localeUsesHour12(this.locale()) : explicit;
  });

  /** Whether the meridiem (AM/PM) column shows — only on a 12-hour clock. */
  protected readonly showMeridiem = computed(() => this.effectiveHour12());

  /** Formatted trigger label (locale clock style), or the placeholder when empty. */
  protected readonly displayLabel = computed(() => {
    const time = this.selectedTime();
    return time ? this.formatTime(time.h, time.m) : this.placeholder();
  });

  /** Live formatted preview of the draft shown in the panel header. */
  protected readonly draftLabel = computed(() =>
    this.formatTime(this.draftHour(), this.draftMinute())
  );

  /** The AM/PM half the draft hour falls in (12h column selection state). */
  protected readonly draftMeridiem = computed<Meridiem>(() =>
    this.draftHour() >= HOURS_PER_HALF_DAY ? 'pm' : 'am'
  );

  /** Hour options in display order: `0…23` in 24h mode, the active meridiem's half in 12h mode. */
  protected readonly hours = computed<number[]>(() => {
    if (!this.effectiveHour12()) {
      return range(0, 23);
    }
    // 12-hour display order is 12, 1…11 — i.e. the half-day base then +1…+11.
    const base = this.draftMeridiem() === 'pm' ? HOURS_PER_HALF_DAY : 0;
    return range(0, HOURS_PER_HALF_DAY - 1).map(offset => base + offset);
  });

  /** Minute options `0…59` stepped by {@link minuteStep}; an off-step draft minute is spliced in. */
  protected readonly minutes = computed<number[]>(() => {
    const step = normalizeStep(this.minuteStep());
    const list: number[] = [];
    for (let minute = 0; minute < MINUTES_PER_HOUR; minute += step) {
      list.push(minute);
    }
    const draft = this.draftMinute();
    if (!list.includes(draft)) {
      list.push(draft);
      list.sort((left, right) => left - right);
    }
    return list;
  });

  /** Whether the current draft time is within the optional `[min]` / `[max]` (gates Done). */
  protected readonly isDraftInRange = computed(() =>
    this.inRange(this.draftHour() * MINUTES_PER_HOUR + this.draftMinute())
  );

  /** Whether the analog clock surface is offered — 12-hour only (24h stays on columns for now). */
  protected readonly canUseClock = computed(() => this.effectiveHour12());

  /** Angle (deg) of the dial hand: the draft hour position, or the draft minute. */
  protected readonly clockHandAngle = computed(() =>
    this.clockStep() === 'hour'
      ? hourIndexToAngle(this.draftHour() % HOURS_PER_HALF_DAY)
      : minuteToAngle(this.draftMinute())
  );

  /** The hand tip / puck center in dial coordinates. */
  protected readonly handTip = computed(() =>
    polarToXy(this.clockHandAngle(), NUMBER_RADIUS, DIAL_CENTER, DIAL_CENTER)
  );

  /** Numbers rendered on the current dial step (hours, or 5-minute marks). */
  protected readonly dialNumbers = computed<DialNumber[]>(() =>
    this.clockStep() === 'hour' ? this.hourDialNumbers() : this.minuteDialNumbers()
  );

  /** Dial slider `aria-valuenow` — the 12-hour hour, or the minute. */
  protected readonly dialValueNow = computed(() => {
    if (this.clockStep() === 'minute') {
      return this.draftMinute();
    }
    const h12 = this.draftHour() % HOURS_PER_HALF_DAY;
    return h12 === 0 ? HOURS_PER_HALF_DAY : h12;
  });

  /** Dial slider `aria-valuemin` (1 for hours, 0 for minutes). */
  protected readonly dialValueMin = computed(() => (this.clockStep() === 'hour' ? 1 : 0));

  /** Dial slider `aria-valuemax` (12 for hours, 59 for minutes). */
  protected readonly dialValueMax = computed(() => (this.clockStep() === 'hour' ? 12 : 59));

  /** `[min]` as minutes-since-midnight, or null when unset/invalid. */
  private readonly minMinutes = computed(() => toMinutes(this.min()));

  /** `[max]` as minutes-since-midnight, or null when unset/invalid. */
  private readonly maxMinutes = computed(() => toMinutes(this.max()));

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

  /** Whether a dial drag is in progress (the pointer is captured by the dial). */
  private dragging = false;

  private onChange: (value: NgeTimePickerValue) => void = () => {
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

  /** Seed the model from a form value (any accepted shape → canonical 24h `HH:mm`). */
  writeValue(value: unknown): void {
    const time = parseHm(value as null | TimePickerTimeInput | undefined);
    this.value.set(time ? formatHm(time.h, time.m) : null);
  }

  registerOnChange(fn: (value: NgeTimePickerValue) => void): void {
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

  // ── per-option state ───────────────────────────────────────────────────────────

  protected isSelectedHour(hour24: number): boolean {
    return hour24 === this.draftHour();
  }

  protected isSelectedMinute(minute: number): boolean {
    return minute === this.draftMinute();
  }

  protected isSelectedMeridiem(meridiem: Meridiem): boolean {
    return meridiem === this.draftMeridiem();
  }

  /** True when EVERY minute of `hour24` is out of `[min]`/`[max]` (so the hour is disabled). */
  protected isHourDisabled(hour24: number): boolean {
    const start = hour24 * MINUTES_PER_HOUR;
    return !this.rangeOverlaps(start, start + MINUTES_PER_HOUR - 1);
  }

  /** True when `minute` paired with the current draft hour falls outside `[min]`/`[max]`. */
  protected isMinuteDisabled(minute: number): boolean {
    return !this.inRange(this.draftHour() * MINUTES_PER_HOUR + minute);
  }

  /** True when the whole AM/PM half-day is out of `[min]`/`[max]`. */
  protected isMeridiemDisabled(meridiem: Meridiem): boolean {
    const start = (meridiem === 'pm' ? HOURS_PER_HALF_DAY : 0) * MINUTES_PER_HOUR;
    return !this.rangeOverlaps(start, start + HOURS_PER_HALF_DAY * MINUTES_PER_HOUR - 1);
  }

  /** Exactly one hour option is in the tab order: the selected (draft) hour. */
  protected hourTabIndex(hour24: number): -1 | 0 {
    return this.isSelectedHour(hour24) ? 0 : -1;
  }

  protected minuteTabIndex(minute: number): -1 | 0 {
    return this.isSelectedMinute(minute) ? 0 : -1;
  }

  protected meridiemTabIndex(meridiem: Meridiem): -1 | 0 {
    return this.isSelectedMeridiem(meridiem) ? 0 : -1;
  }

  /** Display label for an hour option — `00–23` in 24h mode, `12, 1–11` in 12h mode. */
  protected hourLabel(hour24: number): string {
    if (!this.effectiveHour12()) {
      return pad2(hour24);
    }
    const h12 = hour24 % HOURS_PER_HALF_DAY;
    return String(h12 === 0 ? HOURS_PER_HALF_DAY : h12);
  }

  protected minuteLabel(minute: number): string {
    return pad2(minute);
  }

  /** Locale-correct AM/PM label (e.g. "AM" / "pm" / "午後"). */
  protected meridiemLabel(meridiem: Meridiem): string {
    const sampleHour = meridiem === 'pm' ? 13 : 1;
    const parts = new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      hour12: true,
    }).formatToParts(new Date(2000, 0, 1, sampleHour));
    return parts.find(part => part.type === 'dayPeriod')?.value ?? meridiem.toUpperCase();
  }

  // ── selection (draft only — never commits or closes) ─────────────────────────

  protected selectHour(hour24: number): void {
    if (this.isHourDisabled(hour24)) {
      return;
    }
    this.draftHour.set(hour24);
  }

  protected selectMinute(minute: number): void {
    if (this.isMinuteDisabled(minute)) {
      return;
    }
    this.draftMinute.set(minute);
  }

  /** Flip the draft to the other half-day, shifting the 24h hour by ±12 (12h mode). */
  protected setMeridiem(meridiem: Meridiem): void {
    if (this.isMeridiemDisabled(meridiem) || this.draftMeridiem() === meridiem) {
      return;
    }
    const shift = meridiem === 'pm' ? HOURS_PER_HALF_DAY : -HOURS_PER_HALF_DAY;
    this.draftHour.update(hour => hour + shift);
  }

  // ── commit / cancel ────────────────────────────────────────────────────────────

  /** Commit the draft: set the value, notify forms, emit, and close. No-op when out of range. */
  protected confirm(): void {
    if (!this.isDraftInRange()) {
      return;
    }
    const iso = formatHm(this.draftHour(), this.draftMinute());
    this.value.set(iso);
    this.onChange(iso);
    this.timeChange.emit(iso);
    // `close()` marks the control touched, so no explicit `onTouched()` here.
    this.close();
  }

  /** Dismiss the panel discarding the draft (Cancel button — Escape/backdrop route here too). */
  protected cancel(): void {
    this.close();
  }

  // ── column keyboard navigation ─────────────────────────────────────────────────

  /**
   * Listbox-column keyboard navigation: Up/Down move the selection within a column (skipping
   * disabled options), Left/Right move focus to the adjacent column's selected option. The option
   * `<button>`s are native, so Enter/Space activate them through the browser (→ `select*`).
   */
  protected onColumnKeydown(event: KeyboardEvent, column: TimeColumn): void {
    switch (event.key) {
      case 'ArrowUp':
        this.step(event, column, -1);
        break;
      case 'ArrowDown':
        this.step(event, column, 1);
        break;
      case 'ArrowLeft':
        event.preventDefault();
        this.focusColumn(column, -1);
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.focusColumn(column, 1);
        break;
      default:
        // Enter / Space activate the focused option natively; other keys pass through.
        break;
    }
  }

  // ── analog clock surface ─────────────────────────────────────────────────────

  /** Flip between the dial and the columns at runtime (the in-panel surface toggle). */
  protected toggleSurface(): void {
    const next: NgeTimePickerSurface = this.activeSurface() === 'clock' ? 'columns' : 'clock';
    if (next === 'clock' && !this.canUseClock()) {
      return;
    }
    this.activeSurface.set(next);
    if (next === 'clock') {
      this.clockStep.set('hour');
      this.focusDial();
    } else {
      this.focusOption('hour', this.draftHour());
    }
  }

  /** Switch the dial between editing the hour and the minute (the H : M step tabs). */
  protected setClockStep(step: ClockStep): void {
    this.clockStep.set(step);
    this.focusDial();
  }

  /** Begin a tap/drag on the dial: select the value under the pointer and capture the pointer. */
  protected onDialPointerDown(event: PointerEvent): void {
    this.dragging = true;
    (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
    this.applyPointer(event);
    event.preventDefault();
  }

  /** While dragging, live-update the value under the pointer. */
  protected onDialPointerMove(event: PointerEvent): void {
    if (this.dragging) {
      this.applyPointer(event);
    }
  }

  /** End the drag; picking the hour auto-advances the dial to the minute step. */
  protected onDialPointerUp(event: PointerEvent): void {
    if (!this.dragging) {
      return;
    }
    this.dragging = false;
    (event.currentTarget as Element).releasePointerCapture?.(event.pointerId);
    if (this.clockStep() === 'hour') {
      this.clockStep.set('minute');
      this.focusDial();
    }
  }

  /**
   * Dial keyboard support (it is a `role="slider"`): arrows step the current value by one
   * position / `minuteStep`; Enter/Space advances hour → minute (Done commits from minutes).
   */
  protected onDialKeydown(event: KeyboardEvent): void {
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        event.preventDefault();
        this.stepClock(1);
        break;
      case 'ArrowDown':
      case 'ArrowLeft':
        event.preventDefault();
        this.stepClock(-1);
        break;
      case ' ':
      case 'Enter':
        if (this.clockStep() === 'hour') {
          event.preventDefault();
          this.clockStep.set('minute');
          this.focusDial();
        }
        break;
      default:
        break;
    }
  }

  // ── overlay lifecycle (mirrors NgeDatePickerComponent) ──────────────────────

  /** Seed the draft on the selected time (or "now"), clamp into bounds, and open the overlay. */
  private open(): void {
    if (this.overlayRef) {
      return;
    }
    const seed = this.clampToRange(this.seedTime());
    this.draftHour.set(seed.h);
    this.draftMinute.set(seed.m);
    this.clockStep.set('hour');
    this.activeSurface.set(
      this.canUseClock() && this.selectionMode() === 'clock' ? 'clock' : 'columns'
    );

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

    // Propagate any ancestor `--nge-calendar-*` overrides onto the body-mounted pane so a
    // consumer token override themes the floating panel just like the trigger.
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
      .subscribe(() => this.close());

    this.overlayRef = ref;
    this.isOpen.set(true);

    // `cdkTrapFocusAutoCapture` lands on the first tabbable; refine it to the active surface so
    // keyboard nav is reachable immediately (mirrors the date picker's focus refinement).
    this.focusInitialSurface();
  }

  /** Close the panel discarding any draft, and mark the control touched. */
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
   * Move the selection within a column to the next non-disabled option in `delta`'s direction
   * (selection-follows-focus), then move DOM focus to it once the tabindex binding updates.
   */
  private step(event: KeyboardEvent, column: TimeColumn, delta: number): void {
    event.preventDefault();
    if (column === 'meridiem') {
      const next: Meridiem = this.draftMeridiem() === 'am' ? 'pm' : 'am';
      if (!this.isMeridiemDisabled(next)) {
        this.setMeridiem(next);
        this.focusOption('meridiem', next);
      }
      return;
    }
    const list = column === 'hour' ? this.hours() : this.minutes();
    const current = column === 'hour' ? this.draftHour() : this.draftMinute();
    const isDisabled = (value: number): boolean =>
      column === 'hour' ? this.isHourDisabled(value) : this.isMinuteDisabled(value);
    for (let next = list.indexOf(current) + delta; next >= 0 && next < list.length; next += delta) {
      if (!isDisabled(list[next])) {
        if (column === 'hour') {
          this.draftHour.set(list[next]);
        } else {
          this.draftMinute.set(list[next]);
        }
        this.focusOption(column, list[next]);
        return;
      }
    }
  }

  /** Move DOM focus to the selected option of the column `delta` steps from `column` (no wrap). */
  private focusColumn(column: TimeColumn, delta: number): void {
    const order = this.columnOrder();
    const next = order[order.indexOf(column) + delta];
    if (next === undefined) {
      return;
    }
    const value =
      next === 'hour'
        ? this.draftHour()
        : next === 'minute'
          ? this.draftMinute()
          : this.draftMeridiem();
    this.focusOption(next, value);
  }

  /** Move DOM focus to (and scroll into view) a column option in the overlay pane, once rendered. */
  private focusOption(column: TimeColumn, value: number | string): void {
    afterNextRender(
      () => {
        const selector = `[data-testid="nge-time-picker-${column}"][data-${column}="${value}"]`;
        const el = this.overlayRef?.overlayElement.querySelector<HTMLElement>(selector);
        el?.scrollIntoView({ block: 'center' });
        el?.focus();
      },
      { injector: this.injector }
    );
  }

  /** The visible columns, left to right (the meridiem column only shows on a 12-hour clock). */
  private columnOrder(): TimeColumn[] {
    return this.showMeridiem() ? ['hour', 'minute', 'meridiem'] : ['hour', 'minute'];
  }

  /** Apply the pointer's dial angle to the draft (hour or minute, snapped to `minuteStep`). */
  private applyPointer(event: PointerEvent): void {
    const svg = event.currentTarget as null | SVGElement;
    if (!svg) {
      return;
    }
    const rect = svg.getBoundingClientRect();
    const angle = pointerAngle(
      event.clientX,
      event.clientY,
      rect.left + rect.width / 2,
      rect.top + rect.height / 2
    );
    if (this.clockStep() === 'hour') {
      const base = this.draftMeridiem() === 'pm' ? HOURS_PER_HALF_DAY : 0;
      this.selectHour(base + angleToHourIndex(angle));
    } else {
      this.selectMinute(angleToMinute(angle, normalizeStep(this.minuteStep())));
    }
  }

  /** Step the dial value by `delta` positions (hour) or `delta * minuteStep` (minute), wrapping. */
  private stepClock(delta: number): void {
    if (this.clockStep() === 'hour') {
      const base = this.draftMeridiem() === 'pm' ? HOURS_PER_HALF_DAY : 0;
      const index =
        ((((this.draftHour() % HOURS_PER_HALF_DAY) + delta) % HOURS_PER_HALF_DAY) +
          HOURS_PER_HALF_DAY) %
        HOURS_PER_HALF_DAY;
      this.selectHour(base + index);
    } else {
      const step = normalizeStep(this.minuteStep());
      const next =
        (((this.draftMinute() + delta * step) % MINUTES_PER_HOUR) + MINUTES_PER_HOUR) %
        MINUTES_PER_HOUR;
      this.selectMinute(next);
    }
  }

  /** Move DOM focus to the dial (the slider) once it renders. */
  private focusDial(): void {
    afterNextRender(
      () => {
        this.overlayRef?.overlayElement
          .querySelector<HTMLElement>('[data-testid="nge-time-picker-dial"]')
          ?.focus();
      },
      { injector: this.injector }
    );
  }

  /** Focus the active surface on open (the dial, or the selected hour column option). */
  private focusInitialSurface(): void {
    if (this.activeSurface() === 'clock') {
      this.focusDial();
    } else {
      this.focusOption('hour', this.draftHour());
    }
  }

  /** Hour numbers (12-hour) for the dial, each mapped to its 24h value via the active meridiem. */
  private hourDialNumbers(): DialNumber[] {
    const base = this.draftMeridiem() === 'pm' ? HOURS_PER_HALF_DAY : 0;
    return range(0, HOURS_PER_HALF_DAY - 1).map(index => {
      const value = base + index;
      const angle = hourIndexToAngle(index);
      const point = polarToXy(angle, NUMBER_RADIUS, DIAL_CENTER, DIAL_CENTER);
      return {
        angle,
        disabled: this.isHourDisabled(value),
        label: String(index === 0 ? HOURS_PER_HALF_DAY : index),
        selected: value === this.draftHour(),
        value,
        x: point.x,
        y: point.y,
      };
    });
  }

  /** Minute numbers (every 5 min) for the dial; selection still snaps to `minuteStep`. */
  private minuteDialNumbers(): DialNumber[] {
    const count = MINUTES_PER_HOUR / MINUTE_LABEL_STEP;
    return range(0, count - 1).map(index => {
      const value = index * MINUTE_LABEL_STEP;
      const angle = minuteToAngle(value);
      const point = polarToXy(angle, NUMBER_RADIUS, DIAL_CENTER, DIAL_CENTER);
      return {
        angle,
        disabled: this.isMinuteDisabled(value),
        label: pad2(value),
        selected: value === this.draftMinute(),
        value,
        x: point.x,
        y: point.y,
      };
    });
  }

  /** Seed for an opening panel: the committed value, else "now" rounded to the minute step. */
  private seedTime(): { h: number; m: number } {
    const selected = this.selectedTime();
    if (selected) {
      return selected;
    }
    const now = new Date();
    const step = normalizeStep(this.minuteStep());
    const minute = Math.min(MINUTES_PER_HOUR - step, Math.round(now.getMinutes() / step) * step);
    return { h: now.getHours(), m: minute };
  }

  /** Clamp an `h:m` into the `[min]`/`[max]` window (minute resolution) so the panel opens in range. */
  private clampToRange(time: { h: number; m: number }): { h: number; m: number } {
    const min = this.minMinutes();
    const max = this.maxMinutes();
    let total = time.h * MINUTES_PER_HOUR + time.m;
    if (min !== null && total < min) {
      total = min;
    }
    if (max !== null && total > max) {
      total = max;
    }
    return { h: Math.floor(total / MINUTES_PER_HOUR), m: total % MINUTES_PER_HOUR };
  }

  /** Whether a single minutes-since-midnight value is within the optional `[min]` / `[max]`. */
  private inRange(totalMinutes: number): boolean {
    const min = this.minMinutes();
    const max = this.maxMinutes();
    if (min !== null && totalMinutes < min) {
      return false;
    }
    return !(max !== null && totalMinutes > max);
  }

  /** Whether the inclusive `[lo, hi]` minute span intersects the `[min]` / `[max]` bounds. */
  private rangeOverlaps(lo: number, hi: number): boolean {
    const min = this.minMinutes();
    const max = this.maxMinutes();
    if (min !== null && hi < min) {
      return false;
    }
    return !(max !== null && lo > max);
  }

  /** Locale-format an `h:m` as a clock time (e.g. "2:30 PM" / "14:30"), honouring `effectiveHour12`. */
  private formatTime(hour: number, minute: number): string {
    return new Intl.DateTimeFormat(this.locale(), {
      hour: 'numeric',
      hour12: this.effectiveHour12(),
      minute: '2-digit',
    }).format(new Date(2000, 0, 1, hour, minute));
  }

  /**
   * Walk up from the anchor copying any inline `--nge-calendar-*` custom props onto the overlay
   * pane, so a token override on an ancestor of the trigger themes the body-mounted panel too (it is
   * not a DOM descendant of that ancestor).
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
}

/** Pad a 1–2 digit number to two digits. */
function pad2(value: number): string {
  return String(value).padStart(2, '0');
}

/** Format an hour + minute as a canonical 24-hour `HH:mm` string (the native time-input contract). */
function formatHm(hour: number, minute: number): string {
  return `${pad2(hour)}:${pad2(minute)}`;
}

/**
 * Parse any accepted value to `{ h, m }` (24-hour), or null.
 *
 * - `null` / `undefined` / `''` → null
 * - `Date` → its local clock time (or null for an Invalid Date)
 * - `HH:mm` / `HH:mm:ss` string → validated hour (0–23) + minute (0–59)
 * - any other string → tolerantly parsed as a `Date` (e.g. a full datetime), reading its clock time
 */
function parseHm(value: null | TimePickerTimeInput | undefined): null | { h: number; m: number } {
  if (value === null || value === undefined) {
    return null;
  }
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : { h: value.getHours(), m: value.getMinutes() };
  }
  const trimmed = value.trim();
  if (trimmed === '') {
    return null;
  }
  const match = HH_MM.exec(trimmed);
  if (match) {
    const h = Number(match[1]);
    const m = Number(match[2]);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59 ? { h, m } : null;
  }
  const date = new Date(trimmed);
  return Number.isNaN(date.getTime()) ? null : { h: date.getHours(), m: date.getMinutes() };
}

/** A `[min]` / `[max]` input as minutes-since-midnight, or null when absent/invalid. */
function toMinutes(value: null | TimePickerTimeInput | undefined): null | number {
  const time = parseHm(value);
  return time ? time.h * MINUTES_PER_HOUR + time.m : null;
}

/** Whether a locale presents a 12-hour clock (defaults to true if the runtime cannot resolve it). */
function localeUsesHour12(locale: string | undefined): boolean {
  return new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions().hour12 ?? true;
}

/** Coerce a `minuteStep` input to a sane positive integer (1 when invalid). */
function normalizeStep(step: number): number {
  return Number.isFinite(step) && step >= 1 ? Math.floor(step) : 1;
}

/** Inclusive integer range `[start, end]`. */
function range(start: number, end: number): number[] {
  const list: number[] = [];
  for (let n = start; n <= end; n++) {
    list.push(n);
  }
  return list;
}
