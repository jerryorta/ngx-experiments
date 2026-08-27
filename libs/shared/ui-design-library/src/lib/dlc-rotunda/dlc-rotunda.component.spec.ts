import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import { gsap } from 'gsap';

import type { RotundaDoorway } from './dlc-rotunda.component';

import { DlcRotundaComponent } from './dlc-rotunda.component';

const HALLS: RotundaDoorway[] = [
  { accent: '#d4a843', id: 'notes', label: 'Notes', monogram: 'N' },
  { accent: '#2dd4bf', id: 'quizzes', label: 'Quiz', monogram: 'Q' },
  { accent: '#a78bfa', id: 'groups', label: 'Groups', monogram: 'G' },
  { accent: '#60a5fa', id: 'classrooms', label: 'Class', monogram: 'C' },
  { accent: '#d4a843', id: 'journal', label: 'Journal', monogram: 'J' },
];

/** The bloom is scheduled on the next frame, so tests have to wait one out. */
function flushAnimationFrame(): Promise<void> {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => resolve());
  });
}

/** Listeners the narrow-viewport stub has been handed, so a test can fire a change. */
let narrowViewportListeners: ((event: MediaQueryListEvent) => void)[] = [];

/**
 * One stub for BOTH media queries the component asks about.
 *
 * Query-aware on purpose: a blanket `matches` would make every reduced-motion test
 * silently also assert the narrow-phone fan, which is a different claim entirely — and
 * one that would pass by accident, since at five halls both tile sizes produce the same
 * arc.
 */
function mockMediaQueries({ narrow = false, reduce = false } = {}): void {
  narrowViewportListeners = [];

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: (query: string) => {
      const isReducedMotion = query.includes('prefers-reduced-motion');

      return {
        addEventListener: (
          _: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          if (!isReducedMotion) {
            narrowViewportListeners.push(listener);
          }
        },
        addListener: jest.fn(),
        dispatchEvent: jest.fn(),
        matches: isReducedMotion ? reduce : narrow,
        media: query,
        onchange: null,
        removeEventListener: (
          _: string,
          listener: (event: MediaQueryListEvent) => void,
        ) => {
          narrowViewportListeners = narrowViewportListeners.filter(
            (l) => l !== listener,
          );
        },
        removeListener: jest.fn(),
      };
    },
    writable: true,
  });
}

function mockReducedMotion(reduce: boolean): void {
  mockMediaQueries({ reduce });
}

/** Tell the component the screen just crossed the narrow-viewport threshold. */
function fireViewportChange(matches: boolean): void {
  narrowViewportListeners.forEach((listener) =>
    listener({ matches } as MediaQueryListEvent),
  );
}

describe('DlcRotundaComponent', () => {
  let component: DlcRotundaComponent;
  let fixture: ComponentFixture<DlcRotundaComponent>;
  let hostEl: HTMLElement;

  function doorwayButtons(): HTMLElement[] {
    return Array.from(
      hostEl.querySelectorAll<HTMLElement>('.dlc-rotunda__doorway'),
    );
  }

  function oculusButton(): HTMLElement {
    return hostEl.querySelector('.dlc-rotunda__oculus') as HTMLElement;
  }

  function pressKey(key: string): void {
    doorwayButtons()[0].dispatchEvent(
      new KeyboardEvent('keydown', { bubbles: true, key }),
    );
    fixture.detectChanges();
  }

  async function openRotunda(): Promise<void> {
    fixture.componentRef.setInput('open', true);
    fixture.detectChanges();
    await fixture.whenStable();
    await flushAnimationFrame();
    fixture.detectChanges();
  }

  beforeEach(async () => {
    mockReducedMotion(false);

    await TestBed.configureTestingModule({
      imports: [DlcRotundaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcRotundaComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('doorways', HALLS);
    fixture.detectChanges();
    await fixture.whenStable();
    hostEl = fixture.debugElement.nativeElement as HTMLElement;
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should have the dlc-rotunda host class', () => {
    expect(hostEl.classList.contains('dlc-rotunda')).toBe(true);
  });

  it('should render one doorway per hall', () => {
    expect(doorwayButtons().length).toBe(HALLS.length);
  });

  it('should name each doorway after its hall', () => {
    expect(doorwayButtons().map((el) => el.getAttribute('aria-label'))).toEqual(
      ['Notes', 'Quiz', 'Groups', 'Class', 'Journal'],
    );
  });

  it('should engrave the serif monogram on each doorway', () => {
    const glyphs = hostEl.querySelectorAll('.dlc-rotunda__doorway-glyph');

    expect(glyphs[0].textContent?.trim()).toBe('N');
    expect(glyphs[1].textContent?.trim()).toBe('Q');
  });

  it('should tint each doorway glyph with its hall accent', () => {
    const glyph = hostEl.querySelector(
      '.dlc-rotunda__doorway-glyph',
    ) as HTMLElement;

    expect(glyph.style.color).toBe('rgb(212, 168, 67)');
  });

  it('should fall back to an icon glyph when a hall has no monogram', async () => {
    fixture.componentRef.setInput('doorways', [
      { accent: '#d4a843', icon: 'menu_book', id: 'notes', label: 'Notes' },
    ]);
    fixture.detectChanges();
    await fixture.whenStable();

    expect(hostEl.querySelector('.material-symbols-outlined')).toBeTruthy();
  });

  describe('when closed', () => {
    it('should report the oculus as collapsed', () => {
      expect(oculusButton().getAttribute('aria-expanded')).toBe('false');
    });

    it('should label the oculus as the way in', () => {
      expect(oculusButton().getAttribute('aria-label')).toBe(
        'Open the rotunda',
      );
    });

    it('should take the bloom out of the document', () => {
      const bloom = hostEl.querySelector('.dlc-rotunda__bloom');

      expect(bloom?.hasAttribute('inert')).toBe(true);
    });

    it('should not pair inert with aria-hidden', () => {
      // Both together trip axe's aria-hidden-focus rule, and `inert` already removes
      // the subtree from the accessibility tree. Do not re-add aria-hidden here.
      const bloom = hostEl.querySelector('.dlc-rotunda__bloom');

      expect(bloom?.hasAttribute('aria-hidden')).toBe(false);
    });

    it('should offer no tab stop while collapsed', () => {
      const tabStops = doorwayButtons().filter(
        (el) => el.getAttribute('tabindex') === '0',
      );

      expect(tabStops.length).toBe(0);
    });

    it('should leave the scrim invisible', () => {
      const scrim = hostEl.querySelector('.dlc-rotunda__scrim');

      expect(scrim?.classList.contains('dlc-rotunda__scrim--visible')).toBe(
        false,
      );
    });
  });

  describe('when open', () => {
    beforeEach(async () => {
      await openRotunda();
    });

    it('should report the oculus as expanded', () => {
      expect(oculusButton().getAttribute('aria-expanded')).toBe('true');
    });

    it('should label the oculus as the way out', () => {
      expect(oculusButton().getAttribute('aria-label')).toBe(
        'Close the rotunda',
      );
    });

    it('should point the oculus at the bloom it controls', () => {
      const bloom = hostEl.querySelector('.dlc-rotunda__bloom');

      expect(oculusButton().getAttribute('aria-controls')).toBe(
        bloom?.getAttribute('id'),
      );
    });

    it('should expose the bloom as a menu of halls', () => {
      const bloom = hostEl.querySelector('.dlc-rotunda__bloom');

      expect(bloom?.getAttribute('role')).toBe('menu');
      expect(bloom?.getAttribute('aria-label')).toBe('Halls');
      expect(bloom?.hasAttribute('inert')).toBe(false);
    });

    it('should expose each doorway as a menu item', () => {
      doorwayButtons().forEach((el) => {
        expect(el.getAttribute('role')).toBe('menuitem');
      });
    });

    it('should show the scrim', () => {
      const scrim = hostEl.querySelector('.dlc-rotunda__scrim');

      expect(scrim?.classList.contains('dlc-rotunda__scrim--visible')).toBe(
        true,
      );
    });

    it('should move focus into the bloom', () => {
      expect(document.activeElement).toBe(doorwayButtons()[0]);
    });
  });

  describe('opening and closing', () => {
    it('should bloom when the oculus is tapped', () => {
      oculusButton().click();
      fixture.detectChanges();

      expect(component.open()).toBe(true);
    });

    it('should collapse when the oculus is tapped again', async () => {
      await openRotunda();

      oculusButton().click();
      fixture.detectChanges();

      expect(component.open()).toBe(false);
    });

    it('should collapse when the scrim is tapped', async () => {
      await openRotunda();

      (hostEl.querySelector('.dlc-rotunda__scrim') as HTMLElement).click();
      fixture.detectChanges();

      expect(component.open()).toBe(false);
    });

    it('should collapse on Escape', async () => {
      await openRotunda();

      pressKey('Escape');

      expect(component.open()).toBe(false);
    });

    it('should hand focus back to the oculus on dismissal', async () => {
      await openRotunda();

      pressKey('Escape');

      expect(document.activeElement).toBe(oculusButton());
    });

    it('should ignore keys while collapsed', () => {
      pressKey('Escape');

      expect(component.open()).toBe(false);
    });
  });

  describe('choosing a hall', () => {
    beforeEach(async () => {
      await openRotunda();
    });

    it('should emit the chosen doorway', () => {
      let chosen: RotundaDoorway | undefined;
      component.doorwaySelect.subscribe((doorway: RotundaDoorway) => {
        chosen = doorway;
      });

      doorwayButtons()[1].click();

      expect(chosen).toEqual(HALLS[1]);
    });

    it('should collapse the bloom after a hall is chosen', () => {
      doorwayButtons()[1].click();
      fixture.detectChanges();

      expect(component.open()).toBe(false);
    });
  });

  // A route-aware caller re-projects its doorways on navigation, so choosing a hall
  // changes the hall set and clears `open` in the SAME tick. The choreography is dropped
  // for the new set before the close can reverse it — and a killed timeline leaves its
  // last frame written inline, so without a revert the doorways stay painted at their
  // bloomed positions over a page that has already moved on, inert and unclickable
  // (COG-57). Reduced motion is what makes the open state deterministic here: it settles
  // the timeline at progress 1 instead of leaving it mid-tween.
  describe('when the halls change as the bloom closes', () => {
    beforeEach(async () => {
      mockReducedMotion(true);
      await openRotunda();
    });

    it('paints the bloom fully open first', () => {
      expect(
        doorwayButtons().every((doorway) => doorway.style.opacity === '1'),
      ).toBe(true);
    });

    it('leaves no doorway painted open', async () => {
      doorwayButtons()[1].click();
      fixture.componentRef.setInput('doorways', HALLS.slice(0, 4));
      fixture.detectChanges();
      await fixture.whenStable();

      for (const doorway of doorwayButtons()) {
        expect(doorway.style.opacity).not.toBe('1');
      }
    });

    it('leaves the scrim clear of the page beneath', async () => {
      const scrim = hostEl.querySelector('.dlc-rotunda__scrim') as HTMLElement;
      expect(scrim.style.opacity).toBe('1');

      doorwayButtons()[1].click();
      fixture.componentRef.setInput('doorways', HALLS.slice(0, 4));
      fixture.detectChanges();
      await fixture.whenStable();

      expect(scrim.style.opacity).not.toBe('1');
    });
  });

  describe('roving focus', () => {
    beforeEach(async () => {
      await openRotunda();
    });

    it('should start on the first doorway', () => {
      expect(doorwayButtons().map((el) => el.getAttribute('tabindex'))).toEqual(
        ['0', '-1', '-1', '-1', '-1'],
      );
    });

    it('should walk the arc with the right arrow', () => {
      pressKey('ArrowRight');

      expect(document.activeElement).toBe(doorwayButtons()[1]);
      expect(doorwayButtons()[1].getAttribute('tabindex')).toBe('0');
    });

    it('should walk the arc with the down arrow too', () => {
      pressKey('ArrowDown');

      expect(document.activeElement).toBe(doorwayButtons()[1]);
    });

    it('should wrap around the end of the arc', () => {
      pressKey('ArrowLeft');

      expect(document.activeElement).toBe(doorwayButtons()[HALLS.length - 1]);
    });

    it('should jump to the last doorway on End', () => {
      pressKey('End');

      expect(document.activeElement).toBe(doorwayButtons()[HALLS.length - 1]);
    });

    it('should jump back to the first doorway on Home', () => {
      pressKey('End');
      pressKey('Home');

      expect(document.activeElement).toBe(doorwayButtons()[0]);
    });

    it('should keep exactly one tab stop when the bloom loses halls', async () => {
      pressKey('End');

      fixture.componentRef.setInput('doorways', HALLS.slice(0, 2));
      fixture.detectChanges();
      await fixture.whenStable();

      const tabStops = doorwayButtons().filter(
        (el) => el.getAttribute('tabindex') === '0',
      );

      expect(tabStops.length).toBe(1);
    });
  });

  describe('motion', () => {
    type ArcVars = { x: number; y: number };

    /** The doorway tweens are the ones carrying an arc position. */
    function doorwayTweens(timeline: gsap.core.Timeline) {
      return timeline
        .getChildren()
        .filter((child) => (child.vars as { x?: number }).x !== undefined);
    }

    function capturedTimeline(spy: jest.SpyInstance): gsap.core.Timeline {
      return spy.mock.results[0].value as gsap.core.Timeline;
    }

    it('should fly each doorway out to its place on the arc', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();

      // getChildren() is ordered by start time, not by hall, so compare as a set.
      const places = doorwayTweens(capturedTimeline(timelineSpy)).map(
        (child) => ({
          x: (child.vars as ArcVars).x,
          y: (child.vars as ArcVars).y,
        }),
      );

      expect(places).toHaveLength(HALLS.length);
      expect(places).toEqual(
        expect.arrayContaining([
          { x: -89, y: -36 },
          { x: 0, y: -96 },
          { x: 89, y: -36 },
        ]),
      );
    });

    it('should hold the centre doorway back so the bloom opens outside-in', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();

      const tweens = doorwayTweens(capturedTimeline(timelineSpy));
      const lastToStart = tweens.reduce((latest, child) =>
        child.startTime() > latest.startTime() ? child : latest,
      );
      const outermost = tweens.filter(
        (child) => Math.abs((child.vars as ArcVars).x) === 89,
      );

      // The centre doorway is the one that lands last.
      expect((lastToStart.vars as ArcVars).x).toBe(0);
      expect(outermost).toHaveLength(2);
      expect(outermost[0].startTime()).toBe(outermost[1].startTime());
      outermost.forEach((child) => {
        expect(child.startTime()).toBeLessThan(lastToStart.startTime());
      });
    });

    it('should sweep the scrim, oculus and doorways on one clock', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();

      const timeline = capturedTimeline(timelineSpy);

      // scrim + oculus + glow + pupil, plus one tween per doorway
      expect(timeline.getChildren()).toHaveLength(4 + HALLS.length);
      expect(timeline.paused()).toBe(false);
    });

    it('should flare the candlelight by scale only, leaving the flicker its opacity', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();

      const glow = capturedTimeline(timelineSpy)
        .getChildren()
        .find((child) =>
          (child.targets() as Element[]).some((target) =>
            target.classList?.contains('dlc-rotunda__oculus-glow'),
          ),
        );

      expect(glow).toBeDefined();
      expect(glow?.vars).toMatchObject({ scale: 1.32 });
      expect((glow?.vars as { opacity?: number }).opacity).toBeUndefined();
    });

    it('should reverse the one timeline rather than rebuild it on close', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();
      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();

      expect(timelineSpy).toHaveBeenCalledTimes(1);
      expect(capturedTimeline(timelineSpy).reversed()).toBe(true);
    });

    it('should re-choreograph when the halls themselves change', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();
      fixture.componentRef.setInput('doorways', HALLS.slice(0, 3));
      fixture.detectChanges();
      await fixture.whenStable();
      await flushAnimationFrame();

      expect(timelineSpy).toHaveBeenCalledTimes(2);
      expect(doorwayTweens(timelineSpy.mock.results[1].value)).toHaveLength(3);
    });

    it('should place doorways without flight when reduced motion is asked for', async () => {
      mockReducedMotion(true);
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();

      const timeline = capturedTimeline(timelineSpy);

      expect(timeline.progress()).toBe(1);
      expect(timeline.paused()).toBe(true);
    });

    it('should drop a queued bloom the reader closes before it lands', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();
      await flushAnimationFrame();

      expect(timelineSpy).not.toHaveBeenCalled();
    });

    it('should not animate a collapse that never bloomed', () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      fixture.componentRef.setInput('open', false);
      fixture.detectChanges();

      expect(timelineSpy).not.toHaveBeenCalled();
    });

    it('should keep every move on the measured 200ms standard (COG-61)', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();

      // The Atheneum's motion is "measured, never jumpy" — no single move may drift back
      // into the half-second territory the pre-COG-61 constants had crept to. The sequence
      // reads as longer than any of these only because the doorways are staggered.
      capturedTimeline(timelineSpy)
        .getChildren()
        .forEach((child) => {
          expect(child.duration()).toBeLessThanOrEqual(0.28);
        });
    });

    it('should ease the doorways rather than fling them', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();

      doorwayTweens(capturedTimeline(timelineSpy)).forEach((child) => {
        expect((child.vars as { ease?: string }).ease).toBe('power2.out');
      });
    });
  });

  // COG-61: the fan has to fit the phone it is drawn on. The geometry itself is covered in
  // dlc-rotunda-arc.spec.ts — what matters here is that the component measures the screen,
  // hands the SAME number to CSS and to the arc, and re-measures when the screen changes.
  describe('cross-device sizing', () => {
    /** Rebuild the fixture so the component reads the media queries currently stubbed. */
    async function remountWith(options: {
      narrow?: boolean;
      reduce?: boolean;
    }): Promise<void> {
      mockMediaQueries(options);
      fixture = TestBed.createComponent(DlcRotundaComponent);
      component = fixture.componentInstance;
      fixture.componentRef.setInput('doorways', HALLS);
      fixture.detectChanges();
      await fixture.whenStable();
      hostEl = fixture.debugElement.nativeElement as HTMLElement;
    }

    function doorwaySizeVar(): string {
      return hostEl.style.getPropertyValue('--dlc-rotunda-doorway-size');
    }

    it('should draw the full-size tile on an ordinary phone', () => {
      expect(doorwaySizeVar()).toBe('52px');
    });

    it('should draw the narrow tile on a 320px phone', async () => {
      await remountWith({ narrow: true });

      expect(doorwaySizeVar()).toBe('46px');
    });

    it('should seed the narrow tile at construction, never a frame of the wide one', async () => {
      // A default-then-correct would paint one frame of the 52px fan on a narrow phone.
      await remountWith({ narrow: true });

      expect(doorwaySizeVar()).toBe('46px');
      expect(
        hostEl.querySelector<HTMLElement>('.dlc-rotunda__doorway'),
      ).toBeTruthy();
    });

    it('should re-measure when the screen crosses the threshold', async () => {
      fireViewportChange(true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(doorwaySizeVar()).toBe('46px');
    });

    it('should re-choreograph the bloom when the tile size changes under it', async () => {
      const timelineSpy = jest.spyOn(gsap, 'timeline');

      await openRotunda();
      fireViewportChange(true);
      fixture.detectChanges();
      await fixture.whenStable();
      await flushAnimationFrame();

      // A timeline built against the old tile would leave the doorways at positions the
      // arc no longer places them at — the same class of bug COG-57 found on hall changes.
      expect(timelineSpy).toHaveBeenCalledTimes(2);
    });

    it('should stop listening once the rotunda is gone', () => {
      expect(narrowViewportListeners).toHaveLength(1);

      fixture.destroy();

      expect(narrowViewportListeners).toHaveLength(0);
    });

    it('should draw a short caption without shortening the accessible name', async () => {
      fixture.componentRef.setInput('doorways', [
        {
          accent: '#60a5fa',
          id: 'classrooms',
          label: 'Classrooms',
          shortLabel: 'Classes',
        },
      ]);
      fixture.detectChanges();
      await fixture.whenStable();

      const doorway = doorwayButtons()[0];

      expect(
        doorway
          .querySelector('.dlc-rotunda__doorway-label')
          ?.textContent?.trim(),
      ).toBe('Classes');
      // What is announced stays the name the rest of the app uses.
      expect(doorway.getAttribute('aria-label')).toBe('Classrooms');
    });

    it('should caption a hall with no short name with its full one', () => {
      const doorway = doorwayButtons()[0];

      expect(
        doorway
          .querySelector('.dlc-rotunda__doorway-label')
          ?.textContent?.trim(),
      ).toBe(HALLS[0].label);
      expect(doorway.getAttribute('aria-label')).toBe(HALLS[0].label);
    });

    it('should give every hall caption the class that bounds it to its doorway', () => {
      // "Classrooms" rendered 71px wide in a 52px tile and landed on the halls either side
      // of it, because the arc only guarantees the doorway's own width between adjacent
      // centres. The containment itself is CSS (width/clamp/overflow-wrap) and jsdom lays
      // out no text, so what is assertable here is that every caption is hooked up to it.
      const labels = hostEl.querySelectorAll('.dlc-rotunda__doorway-label');

      expect(labels).toHaveLength(HALLS.length);
    });

    it('should measure the screen independently of the reduced-motion setting', async () => {
      // The two queries are unrelated: a reader on a wide screen who asks for less motion
      // must still get the full-size fan.
      await remountWith({ narrow: false, reduce: true });

      expect(doorwaySizeVar()).toBe('52px');
    });
  });

  describe('first-run coaching (COG-60)', () => {
    function coachCallout(): HTMLElement | null {
      return hostEl.querySelector<HTMLElement>('.dlc-rotunda__coach');
    }

    function coachDismissButton(): HTMLElement | null {
      return hostEl.querySelector<HTMLElement>('.dlc-rotunda__coach-dismiss');
    }

    async function startCoaching(): Promise<void> {
      fixture.componentRef.setInput('coachMark', true);
      fixture.detectChanges();
      await fixture.whenStable();
    }

    it('should stay silent for a reader who does not need coaching', () => {
      expect(coachCallout()).toBeNull();
      expect(hostEl.querySelector('.dlc-rotunda__coach-pulse')).toBeNull();
    });

    it('should show the cue when the caller asks for it', async () => {
      await startCoaching();

      expect(coachCallout()?.textContent).toContain('Tap to open the halls');
    });

    it('should announce the cue rather than leave it for the reader to notice', async () => {
      await startCoaching();

      expect(coachCallout()?.getAttribute('role')).toBe('status');
    });

    it('should let the caller word the cue', async () => {
      fixture.componentRef.setInput(
        'coachMarkLabel',
        'Press here for the rooms',
      );
      await startCoaching();

      expect(coachCallout()?.textContent).toContain('Press here for the rooms');
    });

    it('should pulse alongside the cue, out of the reach of assistive tech', async () => {
      await startCoaching();

      const pulse = hostEl.querySelector('.dlc-rotunda__coach-pulse');

      expect(pulse).toBeTruthy();
      expect(pulse?.getAttribute('aria-hidden')).toBe('true');
    });

    it('should treat taking the hint as the dismissal', async () => {
      const dismissed = jest.fn();
      component.coachMarkDismiss.subscribe(dismissed);
      await startCoaching();

      oculusButton().click();
      fixture.detectChanges();

      expect(dismissed).toHaveBeenCalledTimes(1);
    });

    it('should still open the bloom on the tap that dismissed the cue', async () => {
      await startCoaching();

      oculusButton().click();
      fixture.detectChanges();

      expect(component.open()).toBe(true);
    });

    it('should withdraw the cue while the halls are out', async () => {
      await startCoaching();

      fixture.componentRef.setInput('open', true);
      fixture.detectChanges();
      await fixture.whenStable();

      expect(coachCallout()).toBeNull();
    });

    it('should report a dismissal from the cue’s own button', async () => {
      const dismissed = jest.fn();
      component.coachMarkDismiss.subscribe(dismissed);
      await startCoaching();

      coachDismissButton()?.click();
      fixture.detectChanges();

      expect(dismissed).toHaveBeenCalledTimes(1);
    });

    it('should leave the bloom closed when the reader waves the cue away', async () => {
      await startCoaching();

      coachDismissButton()?.click();
      fixture.detectChanges();

      expect(component.open()).toBe(false);
    });

    it('should offer the dismiss control to the keyboard', async () => {
      await startCoaching();

      const dismiss = coachDismissButton();
      dismiss?.focus();

      expect(dismiss?.tagName).toBe('BUTTON');
      expect(document.activeElement).toBe(dismiss);
      expect(dismiss?.getAttribute('aria-label')).toBe('Dismiss the hint');
    });

    it('should not report a dismissal from a reader who was never coached', () => {
      const dismissed = jest.fn();
      component.coachMarkDismiss.subscribe(dismissed);

      oculusButton().click();
      fixture.detectChanges();

      expect(dismissed).not.toHaveBeenCalled();
    });
  });
});
