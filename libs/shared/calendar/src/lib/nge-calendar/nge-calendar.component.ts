import type { OverlayRef } from '@angular/cdk/overlay';
import type { TemplateRef } from '@angular/core';

import { A11yModule } from '@angular/cdk/a11y';
import { ESCAPE } from '@angular/cdk/keycodes';
import { Overlay } from '@angular/cdk/overlay';
import { TemplatePortal } from '@angular/cdk/portal';
import { NgTemplateOutlet } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  contentChild,
  DestroyRef,
  effect,
  ElementRef,
  inject,
  input,
  output,
  viewChild,
  ViewContainerRef,
  ViewEncapsulation,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { startOfDay } from '@nge/date';
import { filter } from 'rxjs/operators';

import type {
  EventClick,
  EventDrop,
  EventResize,
  RangeChange,
  SlotClick,
  ViewChange,
} from '../core/models/calendar-output.model';
import type {
  NgeCalendarConfig,
  NgeCalendarView,
} from '../core/models/nge-calendar-config.model';
import type { NormalizedCalendarEvent } from '../core/models/nge-calendar-event.model';
import type { NgeCalendarFilterContext } from '../core/models/nge-calendar-filter.model';
import type { NgeCalendarEventOverlayContext } from '../core/models/nge-calendar-overlay.model';

import { NgeMonthAgendaViewComponent } from '../views/month-agenda/nge-month-agenda-view.component';
import { NgeMonthViewComponent } from '../views/month/nge-month-view.component';
import { NgeTimeGridComponent } from '../views/time-grid/nge-time-grid.component';
import { NgeYearViewComponent } from '../views/year/nge-year-view.component';
import { NgeCalendarFilterComponent } from './filter/nge-calendar-filter.component';
import { NgeCalendarDefaultEventOverlayComponent } from './overlay/nge-calendar-default-event-overlay.component';
import { NgeCalendarEventOverlayComponent } from './overlay/nge-calendar-event-overlay.component';
import { NgeCalendarStore } from './store';

/**
 * Root shell for the reusable `<nge-calendar>` (ARCH-65 / S5).
 *
 * It is the **only** place the public boundary lives: it owns the `config`
 * `input()` and the six `output()`s, **provides** the component-scoped
 * {@link NgeCalendarStore} (never `providedIn: 'root'`), and bridges between the
 * two — config flows into the store, store state flows back out as outputs. Each
 * `@switch` case renders a real `<nge-*-view>` (month / week+day time-grid /
 * year) that simply `inject()`s the same provided store, so no `input()`/`output()`
 * is prop-drilled.
 *
 * Theming is self-sufficient: every visual property reads a `--nge-calendar-*`
 * token (see `theme/_nge-calendar-tokens.scss`) that falls back to a literal
 * default and can be overridden by an ancestor `--nge-calendar-*` class **or**
 * the inline `config.theme` map this component applies to the host.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-calendar' },
  imports: [
    A11yModule,
    NgeCalendarDefaultEventOverlayComponent,
    NgeCalendarEventOverlayComponent,
    NgeCalendarFilterComponent,
    NgeMonthAgendaViewComponent,
    NgeMonthViewComponent,
    NgeTimeGridComponent,
    NgeYearViewComponent,
    NgTemplateOutlet,
  ],
  providers: [NgeCalendarStore],
  selector: 'nge-calendar',
  standalone: true,
  styleUrl: './nge-calendar.component.scss',
  templateUrl: './nge-calendar.component.html',
})
export class NgeCalendarComponent<T = unknown> {
  /** The full public calendar configuration (boundary lives ONLY on the shell). */
  readonly config = input.required<NgeCalendarConfig<T>>();

  /** User activated (selected) an event. Bridged from `store.selectedEvent`. */
  readonly eventClick = output<EventClick<T>>();
  /** User dragged an event to a new time. Bridged from `store.lastEventDrop`. */
  readonly eventDrop = output<EventDrop<T>>();
  /** User resized an event by its end edge. Bridged from `store.lastEventResize`. */
  readonly eventResize = output<EventResize<T>>();
  /** The visible date range changed (paging / view switch). */
  readonly rangeChange = output<RangeChange>();
  /** User activated an empty slot. Bridged from `store.lastSlotClick`. */
  readonly slotClick = output<SlotClick>();
  /** The active view and/or its anchor date changed. */
  readonly viewChange = output<ViewChange>();

  protected readonly store = inject(NgeCalendarStore);

  /** Order of the view-switcher buttons in the header. */
  protected readonly views: readonly NgeCalendarView[] = ['month', 'week', 'day', 'year'];

  /** Header title for the active view + anchor (e.g. "January 2026"). */
  protected readonly headerLabel = computed(() =>
    formatHeaderLabel(this.store.anchorDate(), this.store.view(), this.store.config()?.locale)
  );

  /**
   * Host-supplied overlay body template (ARCH-147). When present it replaces the
   * default body; rendered via `ngTemplateOutlet` with the typed
   * {@link NgeCalendarEventOverlayContext} `$implicit` context, so the generic
   * `T` flows from `[config]` into the host's `let-event` binding.
   */
  readonly eventOverlay = contentChild<TemplateRef<NgeCalendarEventOverlayContext<T>>>(
    'ngeCalendarEventOverlay'
  );

  /**
   * Host-supplied cross-view filter panel template (ARCH-149). Passed down to the
   * `<nge-calendar-filter>` funnel as its `hostPanel`; when present it replaces
   * the default funnel body. Mirrors {@link eventOverlay}, keeping the generic
   * `T` flowing from `[config]` into the host's `let-ctx` binding.
   */
  readonly eventFilter =
    contentChild<TemplateRef<NgeCalendarFilterContext<T>>>('ngeCalendarFilter');

  /** True unless the consumer opts out via `config.eventOverlay === false`. */
  protected readonly eventOverlayEnabled = computed(() => this.config().eventOverlay !== false);

  /** Typed render context for the overlay template, or null when nothing is selected. */
  protected readonly overlayContext = computed<NgeCalendarEventOverlayContext<T> | null>(() => {
    const event = this.store.selectedEvent();
    return event
      ? {
          $implicit: event as NormalizedCalendarEvent<T>,
          close: () => this.store.clearSelection(),
          event: event as NormalizedCalendarEvent<T>,
          view: this.store.view(),
        }
      : null;
  });

  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);

  /** `--nge-calendar-*` custom-property names currently applied to the host. */
  private appliedThemeKeys = new Set<string>();

  private readonly destroyRef = inject(DestroyRef);

  private readonly overlay = inject(Overlay);

  /** The hidden `<ng-template>` holding the frame + projected body, portalled into the pane. */
  private readonly overlayTemplate = viewChild<TemplateRef<unknown>>('ngeCalendarOverlayTemplate');

  /** The live CDK overlay, or null when closed. */
  private overlayRef: null | OverlayRef = null;

  /** The clicked event element to return focus to when the overlay closes. */
  private triggerEl: HTMLElement | null = null;

  private readonly vcr = inject(ViewContainerRef);

  constructor() {
    // ── config → store ───────────────────────────────────────────────────────
    // Re-sync whenever the public config changes; `setConfig` seeds config +
    // anchorDate + view in one patch. The store is payload-agnostic
    // (`NgeCalendarConfig<unknown>`); narrow the phantom `T` AWAY at this
    // boundary (same runtime object — a sound cast). The cast is needed because
    // `config.eventFilter`'s `NormalizedCalendarEvent<T>` parameter (ARCH-149)
    // puts `T` in a contravariant position, so `NgeCalendarConfig<T>` is not
    // structurally assignable to the `<unknown>` store config.
    effect(() => this.store.setConfig(this.config() as NgeCalendarConfig));

    // ── seed "now" ───────────────────────────────────────────────────────────
    // The boundary owns "today" because the pure core is now-agnostic. Now-line
    // ticking / `currentTime` stays in S7 (per the store's state comment).
    this.store.setToday(startOfDay(new Date()));

    // ── theme input → host ────────────────────────────────────────────────────
    // Apply `config.theme` as inline custom properties on the host, clearing any
    // key that was set on a previous run but is absent now.
    effect(() => this.applyTheme(this.config().theme));

    // ── store → outputs (each skipping the initial, seed-driven emission) ──────
    this.bridgeViewChange();
    this.bridgeRangeChange();
    this.bridgeEventClick();
    this.bridgeEventDrop();
    this.bridgeEventResize();
    this.bridgeSlotClick();

    // ── selection → overlay popup (ARCH-147) ───────────────────────────────────
    // React to `selectedEvent` (the same signal `bridgeEventClick` reads): open an
    // anchored CDK overlay when an event is selected AND the popup is enabled,
    // otherwise tear it down. Dispose any in-flight ref before re-opening so a
    // A→B selection change (no intermediate null) can't leak.
    effect(() => this.syncOverlay());

    // Tear the overlay down on destroy (also returns focus to the trigger).
    this.destroyRef.onDestroy(() => this.closeOverlay());
  }

  /** Open / re-open / close the event overlay to match the current selection. */
  private syncOverlay(): void {
    const event = this.store.selectedEvent();
    const template = this.overlayTemplate();

    // Always dispose the previous ref first — covers close, opt-out, and A→B.
    this.closeOverlay();

    if (!event || !this.eventOverlayEnabled() || !template) {
      return;
    }

    // Anchor to the clicked event element; bail (do not open) if it's not in the DOM.
    const anchor = this.host.nativeElement.querySelector<HTMLElement>(
      `[data-event-id="${escapeCssIdent(event.id)}"]`
    );
    if (!anchor) {
      return;
    }
    this.triggerEl = anchor;

    const positionStrategy = this.overlay
      .position()
      .flexibleConnectedTo(anchor)
      .withPositions([
        { originX: 'start', originY: 'bottom', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'start', overlayY: 'bottom' },
        { originX: 'end', originY: 'top', overlayX: 'start', overlayY: 'top' },
        { originX: 'start', originY: 'top', overlayX: 'end', overlayY: 'top' },
      ])
      .withPush(true);

    const ref = this.overlay.create({
      positionStrategy,
      scrollStrategy: this.overlay.scrollStrategies.reposition(),
    });
    ref.attach(new TemplatePortal(template, this.vcr));

    // Propagate the host's inline theme props onto the (body-portalled) pane so a
    // `config.theme` override themes the overlay just like the in-flow calendar.
    for (const prop of this.appliedThemeKeys) {
      ref.overlayElement.style.setProperty(
        prop,
        this.host.nativeElement.style.getPropertyValue(prop)
      );
    }

    // Dismiss on an outside pointer press or the Escape key.
    ref
      .outsidePointerEvents()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(() => this.store.clearSelection());
    ref
      .keydownEvents()
      .pipe(
        filter(e => e.keyCode === ESCAPE),
        takeUntilDestroyed(this.destroyRef)
      )
      .subscribe(() => this.store.clearSelection());

    this.overlayRef = ref;
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

  /** Diff `theme` against the previously-applied keys, set/remove accordingly. */
  private applyTheme(theme: NgeCalendarConfig['theme']): void {
    const style = this.host.nativeElement.style;
    const next = new Set<string>();

    for (const [prop, value] of Object.entries(theme ?? {})) {
      style.setProperty(prop, value);
      next.add(prop);
    }

    for (const prop of this.appliedThemeKeys) {
      if (!next.has(prop)) {
        style.removeProperty(prop);
      }
    }

    this.appliedThemeKeys = next;
  }

  /** Emit `viewChange` after the first (seed) value of (view, anchorDate). */
  private bridgeViewChange(): void {
    let seeded = false;
    effect(() => {
      const view = this.store.view();
      const date = this.store.anchorDate();
      if (!seeded) {
        seeded = true;
        return;
      }
      this.viewChange.emit({ date, view });
    });
  }

  /** Emit `rangeChange` from `visibleRange`, skipping its first non-null value. */
  private bridgeRangeChange(): void {
    let seeded = false;
    effect(() => {
      const range = this.store.visibleRange();
      if (!range) {
        return;
      }
      if (!seeded) {
        seeded = true;
        return;
      }
      this.rangeChange.emit({ end: range.end, start: range.start });
    });
  }

  /** Emit `eventClick` from `selectedEvent`, skipping the initial null. */
  private bridgeEventClick(): void {
    let seeded = false;
    effect(() => {
      const event = this.store.selectedEvent();
      if (!seeded) {
        seeded = true;
        return;
      }
      if (event) {
        // The store stays payload-agnostic (`NormalizedCalendarEvent<unknown>`);
        // re-narrow the phantom `T` at the public emit boundary (same runtime
        // object — a sound cast).
        this.eventClick.emit({ event: event as NormalizedCalendarEvent<T> });
      }
    });
  }

  /** Emit `eventDrop` from each fresh `lastEventDrop`, skipping the initial null. */
  private bridgeEventDrop(): void {
    let seeded = false;
    effect(() => {
      const drop = this.store.lastEventDrop();
      if (!seeded) {
        seeded = true;
        return;
      }
      if (drop) {
        // Store payload stays `unknown`; re-narrow the phantom `T` at the
        // boundary (same runtime object — a sound cast).
        this.eventDrop.emit(drop as EventDrop<T>);
      }
    });
  }

  /** Emit `eventResize` from each fresh `lastEventResize`, skipping the initial null. */
  private bridgeEventResize(): void {
    let seeded = false;
    effect(() => {
      const resize = this.store.lastEventResize();
      if (!seeded) {
        seeded = true;
        return;
      }
      if (resize) {
        // Store payload stays `unknown`; re-narrow the phantom `T` at the
        // boundary (same runtime object — a sound cast).
        this.eventResize.emit(resize as EventResize<T>);
      }
    });
  }

  /** Emit `slotClick` from each fresh `lastSlotClick`, skipping the initial null. */
  private bridgeSlotClick(): void {
    let seeded = false;
    effect(() => {
      const slot = this.store.lastSlotClick();
      if (!seeded) {
        seeded = true;
        return;
      }
      if (slot) {
        this.slotClick.emit(slot);
      }
    });
  }
}

/** Intl options per view for the header label. */
const HEADER_LABEL_OPTIONS: Record<NgeCalendarView, Intl.DateTimeFormatOptions> = {
  day: { month: 'long', year: 'numeric' },
  month: { month: 'long', year: 'numeric' },
  week: { month: 'long', year: 'numeric' },
  year: { year: 'numeric' },
};

/** Format the header title for the anchor date under the active view. */
function formatHeaderLabel(anchorDate: Date, view: NgeCalendarView, locale?: string): string {
  return new Intl.DateTimeFormat(locale, HEADER_LABEL_OPTIONS[view]).format(anchorDate);
}

/**
 * Escape an event id for use inside a `[data-event-id="…"]` attribute selector.
 * Prefers the native `CSS.escape` (browsers); falls back to a quote/backslash
 * escape where `CSS` is absent (e.g. the jsdom test environment).
 */
function escapeCssIdent(value: string): string {
  const css = (globalThis as { CSS?: { escape?: (v: string) => string } }).CSS;
  return css?.escape ? css.escape(value) : value.replace(/["\\]/g, '\\$&');
}
