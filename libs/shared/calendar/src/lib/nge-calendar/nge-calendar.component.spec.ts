import type { ComponentFixture } from '@angular/core/testing';

import { ESCAPE } from '@angular/cdk/keycodes';
import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, ViewEncapsulation } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';

import type {
  EventClick,
  EventDrop,
  EventResize,
  RangeChange,
  SlotClick,
  ViewChange,
} from '../core/models/calendar-output.model';
import type { NgeCalendarConfig } from '../core/models/nge-calendar-config.model';

import { NgeCalendarComponent } from './nge-calendar.component';
import { NgeCalendarStore } from './store';

type Store = InstanceType<typeof NgeCalendarStore>;

const ANCHOR = new Date(2026, 0, 15); // Thu Jan 15 2026

/** A fixed month config with two single-day timed events on the anchor day. */
function sampleConfig(overrides: Partial<NgeCalendarConfig> = {}): NgeCalendarConfig {
  return {
    date: ANCHOR,
    events: [
      {
        end: new Date(2026, 0, 15, 10, 0),
        id: 'a',
        start: new Date(2026, 0, 15, 9, 0),
        title: 'Morning',
      },
      {
        end: new Date(2026, 0, 15, 15, 0),
        id: 'b',
        start: new Date(2026, 0, 15, 14, 0),
        title: 'Afternoon',
      },
    ],
    view: 'month',
    ...overrides,
  };
}

const SAMPLE_CONFIG: NgeCalendarConfig = sampleConfig();

function setup(config: NgeCalendarConfig = SAMPLE_CONFIG): {
  el: HTMLElement;
  fixture: ComponentFixture<NgeCalendarComponent>;
  store: Store;
} {
  TestBed.configureTestingModule({ imports: [NgeCalendarComponent] });
  const fixture = TestBed.createComponent(NgeCalendarComponent);
  fixture.componentRef.setInput('config', config);
  fixture.detectChanges();
  const store = fixture.debugElement.injector.get(NgeCalendarStore);
  return { el: fixture.nativeElement as HTMLElement, fixture, store };
}

/**
 * Host that projects a custom `#ngeCalendarEventOverlay` template into the
 * calendar (ARCH-147 AC3). The template reads the typed `let-event` ($implicit)
 * and `let-view` context, proving the host-customization branch wins over the
 * default body and the generic `T` context flows through.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  imports: [NgeCalendarComponent],
  selector: 'nge-calendar-overlay-host',
  standalone: true,
  template: `
    <nge-calendar [config]="config">
      <ng-template #ngeCalendarEventOverlay let-event let-view="view">
        <span class="custom-overlay-marker">{{ event.title }}|{{ view }}</span>
      </ng-template>
    </nge-calendar>
  `,
})
class OverlayHostComponent {
  config: NgeCalendarConfig = SAMPLE_CONFIG;
}

describe('NgeCalendarComponent', () => {
  // Pin the wall clock so the constructor's `setToday(startOfDay(new Date()))`
  // seed is deterministic — no test can become flaky on the real "today". A
  // far-from-boundary noon avoids any DST / day-rollover edge while the suite runs.
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-06-15T12:00:00'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('creation + structure', () => {
    it('creates and tags the host with the nge-calendar class', () => {
      const { el, fixture } = setup();
      expect(fixture.componentInstance).toBeTruthy();
      expect(el.classList.contains('nge-calendar')).toBe(true);
    });

    it('provides a component-scoped NgeCalendarStore seeded from the config', () => {
      const { store } = setup();
      expect(store).toBeTruthy();
      expect(store.config()).toEqual(SAMPLE_CONFIG);
      expect(store.view()).toBe('month');
      expect(store.anchorDate().getTime()).toBe(ANCHOR.getTime());
    });

    it('scopes the NgeCalendarStore per component instance (not root)', () => {
      // Two component instances must own DISTINCT stores — that only holds when
      // the store is `providers: [NgeCalendarStore]` on the component, never
      // `providedIn: 'root'` (which would share one singleton across instances).
      TestBed.configureTestingModule({ imports: [NgeCalendarComponent] });

      const f1 = TestBed.createComponent(NgeCalendarComponent);
      f1.componentRef.setInput('config', SAMPLE_CONFIG);
      f1.detectChanges();

      const f2 = TestBed.createComponent(NgeCalendarComponent);
      f2.componentRef.setInput('config', SAMPLE_CONFIG);
      f2.detectChanges();

      const store1 = f1.debugElement.injector.get(NgeCalendarStore);
      const store2 = f2.debugElement.injector.get(NgeCalendarStore);
      expect(store1).not.toBe(store2);
    });

    it('renders the @switch branch for the config view', () => {
      const { el } = setup();
      // The month case now renders the real <nge-month-view> (no placeholder).
      expect(el.querySelector('[data-testid="nge-month-view"]')).toBeTruthy();
    });

    it('renders its structure with no theme input (default tokens)', () => {
      // AC6: a config with NO `theme` exercises the bare / literal-token path.
      // The shell must still render its full structure; theming falls back to the
      // `--nge-calendar-*` token literals (no inline host props are applied).
      const config = sampleConfig();
      expect(config.theme).toBeUndefined();
      const { el } = setup(config);

      // Header + view-switcher buttons + the @switch viewport placeholder all exist.
      expect(el.querySelector('.nge-calendar__header')).toBeTruthy();
      for (const view of ['month', 'week', 'day', 'year']) {
        expect(el.querySelector(`[data-testid="nge-calendar-view-${view}"]`)).toBeTruthy();
      }
      expect(el.querySelector('[data-testid="nge-calendar-viewport"]')).toBeTruthy();
      expect(el.querySelector('[data-testid="nge-month-view"]')).toBeTruthy();

      // No theme → no inline custom property was set on the host.
      expect(el.style.getPropertyValue('--nge-calendar-accent')).toBe('');
    });
  });

  describe('view switching', () => {
    it('shows month + year only (no specific day) in the week and day view titles', () => {
      const { el, fixture, store } = setup();
      const title = () =>
        el.querySelector('[data-testid="nge-calendar-title"]')?.textContent ?? '';

      for (const view of ['week', 'day'] as const) {
        store.setView(view);
        fixture.detectChanges();
        // Anchor is Thu Jan 15 2026 — the title shows month + year only; the
        // specific day + weekday are dropped (the grid highlights the day instead).
        expect(title()).toContain('January 2026');
        expect(title()).not.toContain('15');
        expect(title()).not.toContain('Thursday');
      }
    });

    it('renders the shared time-grid when the week view-switcher button is clicked', () => {
      const { el, fixture } = setup();
      const weekBtn = el.querySelector<HTMLButtonElement>(
        '[data-testid="nge-calendar-view-week"]'
      );
      weekBtn?.click();
      fixture.detectChanges();
      // Week now renders the real <nge-time-grid> (no placeholder), month is gone.
      expect(el.querySelector('[data-testid="nge-time-grid"]')).toBeTruthy();
      expect(el.querySelector('[data-testid="nge-month-view"]')).toBeNull();
    });

    it('renders the shared time-grid on a programmatic setView("day")', () => {
      const { el, fixture, store } = setup();
      store.setView('day');
      fixture.detectChanges();
      expect(el.querySelector('[data-testid="nge-time-grid"]')).toBeTruthy();
    });

    it('renders the real <nge-year-view> (no placeholder) on setView("year")', () => {
      const { el, fixture, store } = setup();
      store.setView('year');
      fixture.detectChanges();
      // The year case now renders the real view; the S5 placeholder is gone.
      expect(el.querySelector('[data-testid="nge-year-view"]')).toBeTruthy();
      expect(el.querySelector('[data-testid="nge-calendar-placeholder"]')).toBeNull();
    });
  });

  describe('config sync', () => {
    it('re-seeds the store when the config input changes', () => {
      const { fixture, store } = setup();
      const next = sampleConfig({ date: new Date(2027, 5, 1), view: 'year' });
      fixture.componentRef.setInput('config', next);
      fixture.detectChanges();
      expect(store.config()).toEqual(next);
      expect(store.view()).toBe('year');
      expect(store.anchorDate().getFullYear()).toBe(2027);
    });
  });

  describe('output emission', () => {
    it('emits viewChange when the view changes (skipping the initial seed)', () => {
      const { fixture, store } = setup();
      const emitted: ViewChange[] = [];
      fixture.componentInstance.viewChange.subscribe(e => emitted.push(e));

      store.setView('week');
      fixture.detectChanges();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].view).toBe('week');
      expect(emitted[0].date.getTime()).toBe(ANCHOR.getTime());
    });

    it('emits rangeChange exactly once when navigation changes the visible range', () => {
      const { fixture, store } = setup();
      const emitted: RangeChange[] = [];
      // Subscribe AFTER the initial render, so the seed (first non-null) range
      // emission is intentionally skipped — only the navigation-driven change counts.
      fixture.componentInstance.rangeChange.subscribe(e => emitted.push(e));

      store.next(); // page to the next month → exactly one new visible range
      fixture.detectChanges();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].start).toBeInstanceOf(Date);
      expect(emitted[0].end.getTime()).toBeGreaterThan(emitted[0].start.getTime());
    });

    it('stays silent on initial render, then emits eventClick once on selection', () => {
      const { fixture, store } = setup();
      const emitted: EventClick[] = [];
      fixture.componentInstance.eventClick.subscribe(e => emitted.push(e));

      // Skip-seed property: the initial `selectedEvent` is null, so nothing fires
      // before any explicit selection — independent of the bridge's non-null guard.
      expect(emitted).toHaveLength(0);

      store.selectEvent('b');
      fixture.detectChanges();

      expect(emitted).toHaveLength(1);
      expect(emitted[0].event.id).toBe('b');
      expect(emitted[0].event.title).toBe('Afternoon');
    });

    it('round-trips the typed event.data payload through the eventClick bridge by reference', () => {
      const payload = { ref: 'order-42' };
      const config = sampleConfig({
        events: [
          {
            data: payload,
            end: new Date(2026, 0, 15, 10, 0),
            id: 'a',
            start: new Date(2026, 0, 15, 9, 0),
            title: 'Morning',
          },
        ],
      });
      const { fixture, store } = setup(config);
      const emitted: EventClick[] = [];
      fixture.componentInstance.eventClick.subscribe(e => emitted.push(e));

      store.selectEvent('a');
      fixture.detectChanges();

      expect(emitted).toHaveLength(1);
      // The bridge re-narrows the phantom type via a cast — it must NOT recreate
      // the event, so the data payload survives by reference.
      expect(emitted[0].event.data).toBe(payload);
    });

    it('stays silent on initial render, then emits eventDrop once on a commitDrag', () => {
      // An editable config so startDrag is not gated; slotMinutes pins the snap.
      const { fixture, store } = setup(sampleConfig({ editable: true, slotMinutes: 30 }));
      const emitted: EventDrop[] = [];
      fixture.componentInstance.eventDrop.subscribe(e => emitted.push(e));

      // No drag committed yet → the seed (initial null lastEventDrop) fires nothing.
      expect(emitted).toHaveLength(0);

      store.startDrag({ eventId: 'a', mode: 'move' });
      store.updateDrag({ deltaDays: 1, deltaMinutes: 30 });
      store.commitDrag();
      fixture.detectChanges(); // flush the bridge effect

      expect(emitted).toHaveLength(1);
      expect(emitted[0].event.id).toBe('a');
      expect(emitted[0].newStart.getTime()).toBe(new Date(2026, 0, 16, 9, 30).getTime());
      expect(emitted[0].newEnd?.getTime()).toBe(new Date(2026, 0, 16, 10, 30).getTime());
    });

    it('stays silent on initial render, then emits eventResize once on a commitResize', () => {
      const { fixture, store } = setup(sampleConfig({ editable: true, slotMinutes: 30 }));
      const emitted: EventResize[] = [];
      fixture.componentInstance.eventResize.subscribe(e => emitted.push(e));

      expect(emitted).toHaveLength(0);

      store.startDrag({ eventId: 'a', mode: 'resize' });
      store.updateDrag({ deltaMinutes: 30 }); // extend the 09:00–10:00 event by one slot
      store.commitResize();
      fixture.detectChanges(); // flush the bridge effect

      expect(emitted).toHaveLength(1);
      expect(emitted[0].event.id).toBe('a');
      expect(emitted[0].newEnd.getTime()).toBe(new Date(2026, 0, 15, 10, 30).getTime());
    });

    it('stays silent on initial render, then emits slotClick once on store.slotClick', () => {
      const { fixture, store } = setup();
      const emitted: SlotClick[] = [];
      fixture.componentInstance.slotClick.subscribe(e => emitted.push(e));

      // No slot activated yet → the seed (initial null lastSlotClick) fires nothing.
      expect(emitted).toHaveLength(0);

      const slot = { end: new Date(2026, 0, 15, 10, 0), start: new Date(2026, 0, 15, 9, 0) };
      store.slotClick(slot);
      fixture.detectChanges(); // flush the bridge effect

      expect(emitted).toHaveLength(1);
      expect(emitted[0].start.getTime()).toBe(slot.start.getTime());
      expect(emitted[0].end.getTime()).toBe(slot.end.getTime());
    });
  });

  describe('event-click overlay (ARCH-147)', () => {
    function overlayContainerEl(): HTMLElement {
      return TestBed.inject(OverlayContainer).getContainerElement();
    }

    /** The frame element inside the CDK overlay container, or null when closed. */
    function overlayPane(): HTMLElement | null {
      return overlayContainerEl().querySelector<HTMLElement>('.nge-calendar-event-overlay');
    }

    afterEach(() => {
      // Tear down the singleton overlay container the CDK creates in the DOM.
      TestBed.inject(OverlayContainer).ngOnDestroy();
    });

    it('opens an anchored overlay (role=dialog) when an event is selected', () => {
      const { el, fixture, store } = setup();
      // The month view must render the event element the overlay anchors to.
      const anchor = el.querySelector('[data-event-id="a"]');
      expect(anchor).toBeTruthy();
      expect(overlayPane()).toBeNull();

      store.selectEvent('a');
      fixture.detectChanges();

      const pane = overlayPane();
      expect(pane).toBeTruthy();
      expect(pane?.getAttribute('role')).toBe('dialog');
    });

    it('renders the default body (title + time) when no host template is supplied', () => {
      const { fixture, store } = setup();
      store.selectEvent('a');
      fixture.detectChanges();

      const container = overlayContainerEl();
      expect(
        container.querySelector('[data-testid="nge-calendar-default-event-overlay-title"]')
          ?.textContent
      ).toContain('Morning');
      expect(
        container.querySelector('[data-testid="nge-calendar-default-event-overlay-time"]')
      ).toBeTruthy();
    });

    it('closes the overlay when the selection is cleared', () => {
      const { fixture, store } = setup();
      store.selectEvent('a');
      fixture.detectChanges();
      expect(overlayPane()).toBeTruthy();

      store.clearSelection();
      fixture.detectChanges();
      expect(overlayPane()).toBeNull();
    });

    it('re-anchors (single pane) when selection changes A → B with no intermediate clear', () => {
      const { fixture, store } = setup();
      store.selectEvent('a');
      fixture.detectChanges();
      store.selectEvent('b');
      fixture.detectChanges();

      // Exactly one live frame — the A overlay was disposed before B opened.
      expect(overlayContainerEl().querySelectorAll('.nge-calendar-event-overlay')).toHaveLength(1);
    });

    it('clears the selection (closing the overlay) on the close button', () => {
      const { fixture, store } = setup();
      store.selectEvent('a');
      fixture.detectChanges();

      const close = overlayContainerEl().querySelector<HTMLButtonElement>(
        '[data-testid="nge-calendar-event-overlay-close"]'
      );
      close?.click();
      fixture.detectChanges();

      expect(store.selectedEvent()).toBeNull();
      expect(overlayPane()).toBeNull();
    });

    it('clears the selection (closing the overlay) on Escape', () => {
      const { fixture, store } = setup();
      store.selectEvent('a');
      fixture.detectChanges();

      // CDK routes keystrokes to the top overlay via a document-level dispatcher,
      // so the keydown must bubble out of the pane to reach it.
      const pane = overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-pane');
      const event = new KeyboardEvent('keydown', {
        bubbles: true,
        keyCode: ESCAPE,
      } as KeyboardEventInit);
      pane?.dispatchEvent(event);
      fixture.detectChanges();

      expect(store.selectedEvent()).toBeNull();
      expect(overlayPane()).toBeNull();
    });

    it('does not open the overlay when config.eventOverlay is false, but still emits eventClick', () => {
      const { fixture, store } = setup(sampleConfig({ eventOverlay: false }));
      const emitted: EventClick[] = [];
      fixture.componentInstance.eventClick.subscribe(e => emitted.push(e));

      store.selectEvent('a');
      fixture.detectChanges();

      expect(overlayPane()).toBeNull();
      expect(emitted).toHaveLength(1);
      expect(emitted[0].event.id).toBe('a');
    });

    it('copies the host --nge-calendar-* theme prop onto the overlay pane', () => {
      const { fixture, store } = setup(
        sampleConfig({ theme: { '--nge-calendar-surface': '#101010' } })
      );
      store.selectEvent('a');
      fixture.detectChanges();

      // The shell copies the host's inline theme props onto the pane wrapper
      // (`ref.overlayElement`); the frame inherits the custom property from it.
      const paneWrapper = overlayContainerEl().querySelector<HTMLElement>('.cdk-overlay-pane');
      expect(paneWrapper?.style.getPropertyValue('--nge-calendar-surface')).toBe('#101010');
    });

    it('clears the selection (closing the overlay) on an outside pointer press', () => {
      const { fixture, store } = setup();
      store.selectEvent('a');
      fixture.detectChanges();
      expect(overlayPane()).toBeTruthy();

      // CDK's outside-click dispatcher fires `outsidePointerEvents` from the
      // capture-phase `click` listener it binds to `body` (the `pointerdown`
      // listener only records the target, and falls back to the event target when
      // none was recorded) — so a body click outside the pane drives
      // `store.clearSelection()`. `PointerEvent` is absent in jsdom, so a plain
      // `MouseEvent('click')` is the reliable trigger here.
      document.body.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      fixture.detectChanges();

      expect(store.selectedEvent()).toBeNull();
      expect(overlayPane()).toBeNull();
    });

    it('returns focus to the trigger element when the overlay closes', () => {
      const { el, fixture, store } = setup();
      const anchor = el.querySelector<HTMLElement>('[data-event-id="a"]');
      expect(anchor).toBeTruthy();
      // Spy on the trigger's focus — jsdom does not honour real focus on a
      // non-attached fixture, so asserting the call is the robust signal that
      // `closeOverlay()` restored focus to the clicked event element.
      const focusSpy = jest.spyOn(anchor as HTMLElement, 'focus');

      store.selectEvent('a');
      fixture.detectChanges();

      store.clearSelection();
      fixture.detectChanges();

      expect(focusSpy).toHaveBeenCalledTimes(1);
    });

    it('renders the host #ngeCalendarEventOverlay template (typed ctx) over the default body', () => {
      TestBed.configureTestingModule({ imports: [OverlayHostComponent] });
      const fixture = TestBed.createComponent(OverlayHostComponent);
      fixture.detectChanges();

      // Reach the shell's component-scoped store via the <nge-calendar> injector.
      const calendarDe = fixture.debugElement.query(By.css('nge-calendar'));
      const store = calendarDe.injector.get(NgeCalendarStore);

      store.selectEvent('a');
      fixture.detectChanges();

      const container = overlayContainerEl();
      const marker = container.querySelector('.custom-overlay-marker');
      // The host branch (`@if (eventOverlay(); as tpl)`) wins: the typed
      // $implicit `event` + `view` context render, and the default body does not.
      expect(marker?.textContent).toBe('Morning|month');
      expect(
        container.querySelector('[data-testid="nge-calendar-default-event-overlay"]')
      ).toBeNull();
    });
  });

  describe('theme bridge', () => {
    it('applies config.theme values as inline custom properties on the host', () => {
      const { el, fixture } = setup(
        sampleConfig({ theme: { '--nge-calendar-accent': '#ff0000' } })
      );
      // setup() already ran detectChanges; assert the inline prop landed.
      expect((el as HTMLElement).style.getPropertyValue('--nge-calendar-accent')).toBe('#ff0000');

      // Clearing the theme removes the previously-applied prop.
      fixture.componentRef.setInput('config', sampleConfig());
      fixture.detectChanges();
      expect((el as HTMLElement).style.getPropertyValue('--nge-calendar-accent')).toBe('');
    });
  });
});
