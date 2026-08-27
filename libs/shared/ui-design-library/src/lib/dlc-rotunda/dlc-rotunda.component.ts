import {
  A11yModule,
  type FocusTrap,
  FocusTrapFactory,
} from '@angular/cdk/a11y';
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  ElementRef,
  inject,
  input,
  model,
  type OnDestroy,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';
import { gsap } from 'gsap';

import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';
import {
  computeRotundaArc,
  ROTUNDA_DOORWAY_SIZE,
  ROTUNDA_NARROW_DOORWAY_SIZE,
  ROTUNDA_NARROW_VIEWPORT_QUERY,
  type RotundaArcPosition,
} from './dlc-rotunda-arc';

/** One hall in the bloom — a doorway the reader can step through. */
export interface RotundaDoorway {
  /** The hall's entity accent; any CSS colour, e.g. the Quizzes teal. */
  accent: string;
  /** The hall's glyph — a Material Symbols name drawn by `dlcIcon`, and the default treatment. */
  icon?: string;
  id: string;
  /** The hall's name, and the doorway's accessible name. Always the full one. */
  label: string;
  /**
   * Serif initial as an alternate treatment ('N', 'Q', 'G', 'C', 'J'). Takes
   * precedence over `icon` when both are supplied.
   */
  monogram?: string;
  /**
   * A shorter caption for the 52px tile, where a name like "Classrooms" is 71px wide and
   * overlaps the halls either side of it on the arc (COG-61).
   *
   * The CAPTION only — `label` remains the accessible name, so shortening what is drawn
   * never shortens what is announced.
   */
  shortLabel?: string;
}

/** A doorway paired with the place on the arc it blooms to. */
export interface RotundaPlacedDoorway {
  doorway: RotundaDoorway;
  position: RotundaArcPosition;
}

/**
 * The gesture's clock, tuned as one piece against the Atheneum's 200ms motion standard
 * (COG-61) — measured, never jumpy.
 *
 * Each part is at or near 200ms; the sequence reads as longer than any of them because the
 * doorways are staggered, not because any single move is slow. The glow outlasts the rest
 * deliberately: candlelight settles after the shutter has stopped moving.
 */
const BLOOM_DURATION_S = 0.22;
const SCRIM_DURATION_S = 0.2;
const OCULUS_DURATION_S = 0.2;
const PUPIL_DURATION_S = 0.16;
const GLOW_DURATION_S = 0.28;
const OCULUS_OPEN_ROTATION = 45;
const GLOW_OPEN_SCALE = 1.32;
const CLOSED_SCALE = 0.4;

let bloomIdCounter = 0;

function nextBloomId(): string {
  bloomIdCounter += 1;

  return `dlc-rotunda-bloom-${bloomIdCounter}`;
}

/**
 * A reader who has learned where the oculus is should never have to learn again, so
 * motion is the only thing that yields here — the anchor and the gesture do not.
 */
function prefersReducedMotion(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

/** Whether the screen is too narrow for the full-size fan (COG-61). */
function matchesNarrowViewport(): boolean {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia(ROTUNDA_NARROW_VIEWPORT_QUERY).matches
  );
}

/**
 * The Rotunda — a fixed brass oculus that blooms its halls as an arc of doorways
 * under the thumb.
 *
 * Purely presentational: the halls come in via `doorways`, the chosen one goes out via
 * `doorwaySelect`. What the bloom *contains* is the caller's business, which is what
 * lets those contents be context-aware without the anchor ever moving.
 *
 * Expects a positioned ancestor — it overlays its container rather than occupying flow.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '(keydown)': 'onKeydown($event)',
    // Handed to CSS so the tile drawn and the geometry measured can never disagree.
    '[style.--dlc-rotunda-doorway-size]': 'doorwaySizePx()',
    class: 'dlc-rotunda',
  },
  imports: [A11yModule, DlcIconDirective],
  selector: 'dlc-rotunda',
  styleUrl: './dlc-rotunda.component.scss',
  templateUrl: './dlc-rotunda.component.html',
})
export class DlcRotundaComponent implements OnDestroy {
  private readonly el = inject(ElementRef<HTMLElement>);
  private readonly focusTrapFactory = inject(FocusTrapFactory);

  readonly doorways = input.required<RotundaDoorway[]>();
  readonly closeLabel = input<string>('Close the rotunda');
  readonly menuLabel = input<string>('Halls');
  readonly openLabel = input<string>('Open the rotunda');

  /**
   * Show the first-run cue (COG-60). Whether a reader still needs coaching is the
   * caller's to know — the primitive only draws it and reports the dismissal.
   */
  readonly coachMark = input<boolean>(false);
  readonly coachMarkDismissLabel = input<string>('Dismiss the hint');
  readonly coachMarkLabel = input<string>('Tap to open the halls');

  /** Two-way, so the bloom self-manages by default but a shell can still drive it. */
  readonly open = model<boolean>(false);

  /**
   * The cue has done its job — either the reader took the hint or waved it away.
   *
   * Emitted once per gesture, never persisted here: remembering it across sessions is the
   * caller's business, for the same reason the doorways' routes are.
   */
  readonly coachMarkDismiss = output<void>();
  readonly doorwaySelect = output<RotundaDoorway>();

  // ─── Cross-device: the fan has to fit the phone it is drawn on ───

  /**
   * Whether the screen is narrow enough to need the smaller tile (COG-61).
   *
   * Watched rather than read once, so a reader who rotates the phone gets the fan
   * re-measured — and because {@link placedDoorways} feeds the bloom effect, a change
   * mid-session re-choreographs the timeline instead of leaving it sized for the old
   * screen. Seeded from the query rather than defaulted to `false`, so a narrow phone
   * never paints one frame of the wide fan.
   */
  private readonly narrowViewport = signal(matchesNarrowViewport());

  private readonly onNarrowViewportChange = (
    event: MediaQueryListEvent,
  ): void => {
    this.narrowViewport.set(event.matches);
  };

  private readonly narrowViewportQuery = this.watchNarrowViewport();

  /** The doorway edge length in play, and the metric the whole arc is measured against. */
  protected readonly doorwaySize = computed(() =>
    this.narrowViewport() ? ROTUNDA_NARROW_DOORWAY_SIZE : ROTUNDA_DOORWAY_SIZE,
  );

  protected readonly doorwaySizePx = computed(() => `${this.doorwaySize()}px`);

  private watchNarrowViewport(): MediaQueryList | null {
    if (
      typeof window === 'undefined' ||
      typeof window.matchMedia !== 'function'
    ) {
      return null;
    }

    const query = window.matchMedia(ROTUNDA_NARROW_VIEWPORT_QUERY);

    query.addEventListener('change', this.onNarrowViewportChange);

    return query;
  }

  // ─── The arc: which hall rests where ───

  protected readonly bloomId = nextBloomId();

  protected readonly placedDoorways = computed<RotundaPlacedDoorway[]>(() => {
    const doorways = this.doorways();
    const positions = computeRotundaArc(doorways.length, {
      doorwaySize: this.doorwaySize(),
    });

    return doorways.map((doorway, index) => ({
      doorway,
      position: positions[index],
    }));
  });

  // ─── Opening and closing ───

  /** Suppresses a collapse on first render, when nothing has bloomed yet. */
  private hasOpened = false;

  private pendingBloomFrame: null | number = null;

  /**
   * One paused timeline for the whole gesture — scrim, oculus, pupil and every
   * doorway on a single clock. Opening plays it and closing reverses it, so a reader
   * who taps again mid-bloom folds the halls back from wherever they had reached
   * instead of watching the animation restart.
   */
  private timeline: gsap.core.Timeline | null = null;

  /** The hall set the current timeline was choreographed against. */
  private choreographedHalls: null | RotundaPlacedDoorway[] = null;

  private readonly bloomOnOpen = effect(() => {
    // Tracked so a bloom whose halls change underneath it — which is exactly what a
    // route-aware caller does — is re-choreographed rather than left collapsed.
    const halls = this.placedDoorways();

    if (halls !== this.choreographedHalls) {
      this.disposeTimeline();
    }

    if (this.open()) {
      this.hasOpened = true;
      this.openBloom(halls);
    } else if (this.hasOpened) {
      this.closeBloom();
    }
  });

  protected onOculusClick(): void {
    // Taking the hint is the best possible dismissal — the reader has just performed the
    // gesture the cue exists to teach, so it has nothing left to say.
    this.dismissCoachMark();
    this.open.update((isOpen) => !isOpen);
  }

  protected onScrimClick(): void {
    this.open.set(false);
  }

  /**
   * The focus trap keeps keys inside the bloom, so this rarely fires — it exists so
   * the dismiss affordance is reachable by keyboard as well as by tap.
   */
  protected onScrimKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.open.set(false);
    }
  }

  protected onDoorwayClick(placed: RotundaPlacedDoorway): void {
    this.doorwaySelect.emit(placed.doorway);
    this.open.set(false);
  }

  private openBloom(halls: RotundaPlacedDoorway[]): void {
    this.cancelPendingBloom();

    // Deferred a frame so the doorways exist to be choreographed against.
    this.pendingBloomFrame = requestAnimationFrame(() => {
      this.pendingBloomFrame = null;

      const bloomEl = (
        this.el.nativeElement as HTMLElement
      ).querySelector<HTMLElement>('.dlc-rotunda__bloom');

      if (!bloomEl) {
        return;
      }

      this.destroyFocusTrap();
      this.focusTrap = this.focusTrapFactory.create(bloomEl);

      this.runTimeline(this.buildTimeline(halls), true);
      this.focusDoorway(0);
    });
  }

  private closeBloom(): void {
    // A bloom queued for the next frame must not land after the reader has closed it.
    this.cancelPendingBloom();

    // Nothing choreographed yet means nothing has moved off its resting state.
    if (this.timeline) {
      this.runTimeline(this.timeline, false);
    }

    this.destroyFocusTrap();
    this.restoreFocusToOculus();
  }

  /**
   * Choreograph the whole gesture once, paused at the closed state. Everything is
   * placed at an absolute position on the timeline rather than given its own delay,
   * which is what lets the sequence be reversed as one piece.
   */
  private buildTimeline(halls: RotundaPlacedDoorway[]): gsap.core.Timeline {
    if (this.timeline) {
      return this.timeline;
    }

    const root = this.el.nativeElement as HTMLElement;
    const timeline = gsap.timeline({ paused: true });

    const scrimEl = root.querySelector<HTMLElement>('.dlc-rotunda__scrim');
    const oculusEl = root.querySelector<HTMLElement>('.dlc-rotunda__oculus');
    const glowEl = root.querySelector<HTMLElement>('.dlc-rotunda__oculus-glow');
    const pupilEl = root.querySelector<SVGElement>(
      '.dlc-rotunda__oculus-pupil',
    );

    if (scrimEl) {
      timeline.to(
        scrimEl,
        { duration: SCRIM_DURATION_S, ease: 'power1.out', opacity: 1 },
        0,
      );
    }

    if (oculusEl) {
      timeline.to(
        oculusEl,
        {
          duration: OCULUS_DURATION_S,
          ease: 'power2.out',
          rotation: OCULUS_OPEN_ROTATION,
        },
        0,
      );
    }

    // The light well flares as it opens. Scale only — the idle flicker owns opacity,
    // so the candlelight keeps breathing right through the gesture.
    if (glowEl) {
      timeline.to(
        glowEl,
        {
          duration: GLOW_DURATION_S,
          ease: 'power2.out',
          scale: GLOW_OPEN_SCALE,
        },
        0,
      );
    }

    // The pupil closes as the halls open.
    if (pupilEl) {
      timeline.to(
        pupilEl,
        { duration: PUPIL_DURATION_S, ease: 'power1.out', opacity: 0 },
        0,
      );
    }

    this.queryDoorways().forEach((doorwayEl, index) => {
      const position = halls[index]?.position;

      if (!position) {
        return;
      }

      timeline.fromTo(
        doorwayEl,
        { opacity: 0, scale: CLOSED_SCALE, x: 0, y: 0 },
        {
          duration: BLOOM_DURATION_S,
          // Measured rather than flung: power3's hard front-load reads as a snap, which is
          // the one thing the Atheneum's motion is not meant to do.
          ease: 'power2.out',
          opacity: 1,
          scale: 1,
          x: position.x,
          y: position.y,
        },
        position.delayMs / 1000,
      );
    });

    this.timeline = timeline;
    this.choreographedHalls = halls;

    return timeline;
  }

  /** Reduced motion keeps the choreography but skips the travel. */
  private runTimeline(timeline: gsap.core.Timeline, forward: boolean): void {
    if (prefersReducedMotion()) {
      timeline.progress(forward ? 1 : 0).pause();

      return;
    }

    if (forward) {
      timeline.play();
    } else {
      timeline.reverse();
    }
  }

  /**
   * Drop the choreography, putting back everything it had inline.
   *
   * `revert()` before `kill()` matters: a killed timeline leaves its last frame written to
   * the elements as inline styles, and a route-aware caller disposes at exactly the moment
   * the bloom is closing — the chosen doorway changes the hall set and clears `open` in the
   * same tick, so the close has no timeline left to reverse. Without the revert the doorways
   * stay painted at their bloomed positions over a page that has already changed, `inert`
   * and unclickable. Reverting hands them back to the CSS resting state instead.
   */
  private disposeTimeline(): void {
    if (this.timeline) {
      this.timeline.revert();
      this.timeline.kill();
      this.timeline = null;
    }

    this.choreographedHalls = null;
  }

  // ─── First-run coaching ───

  protected onCoachMarkDismissClick(): void {
    this.dismissCoachMark();
  }

  /**
   * Guarded so the event means what it says: the cue was up, and now it is done. The
   * oculus calls this on every tap, and without the guard a reader who never needed
   * coaching would emit a dismissal on each one.
   */
  private dismissCoachMark(): void {
    if (this.coachMark()) {
      this.coachMarkDismiss.emit();
    }
  }

  // ─── Keyboard and focus ───

  /**
   * Clamped so a bloom that loses halls still offers exactly one tab stop — an
   * out-of-range index would silently leave the whole menu unreachable by keyboard.
   */
  protected readonly focusedIndex = computed(() => {
    const lastIndex = Math.max(0, this.placedDoorways().length - 1);

    return Math.min(this.activeIndex(), lastIndex);
  });

  private readonly activeIndex = signal(0);

  private focusTrap: FocusTrap | null = null;

  protected onKeydown(event: KeyboardEvent): void {
    if (!this.open()) {
      return;
    }

    switch (event.key) {
      case 'ArrowDown':
      case 'ArrowRight':
        event.preventDefault();
        this.moveFocus(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        this.moveFocus(-1);
        break;
      case 'End':
        event.preventDefault();
        this.focusDoorway(this.placedDoorways().length - 1);
        break;
      case 'Escape':
        event.preventDefault();
        this.open.set(false);
        break;
      case 'Home':
        event.preventDefault();
        this.focusDoorway(0);
        break;
      default:
        break;
    }
  }

  private moveFocus(delta: number): void {
    const count = this.placedDoorways().length;

    if (count === 0) {
      return;
    }

    this.focusDoorway((this.focusedIndex() + delta + count) % count);
  }

  private focusDoorway(index: number): void {
    if (index < 0) {
      return;
    }

    this.activeIndex.set(index);
    this.queryDoorways()[index]?.focus();
  }

  /**
   * Only reclaim focus if we still hold it. A shell that closed the bloom on navigation
   * has already put the reader somewhere else; yanking them back would be worse than
   * doing nothing.
   */
  private restoreFocusToOculus(): void {
    const root = this.el.nativeElement as HTMLElement;

    if (!root.contains(document.activeElement)) {
      return;
    }

    root.querySelector<HTMLElement>('.dlc-rotunda__oculus')?.focus();
  }

  private queryDoorways(): HTMLElement[] {
    return Array.from(
      (this.el.nativeElement as HTMLElement).querySelectorAll<HTMLElement>(
        '.dlc-rotunda__doorway',
      ),
    );
  }

  private destroyFocusTrap(): void {
    if (this.focusTrap) {
      this.focusTrap.destroy();
      this.focusTrap = null;
    }
  }

  private cancelPendingBloom(): void {
    if (this.pendingBloomFrame !== null) {
      cancelAnimationFrame(this.pendingBloomFrame);
      this.pendingBloomFrame = null;
    }
  }

  // ─── Lifecycle ───

  ngOnDestroy(): void {
    this.cancelPendingBloom();
    this.disposeTimeline();
    this.destroyFocusTrap();
    this.narrowViewportQuery?.removeEventListener(
      'change',
      this.onNarrowViewportChange,
    );
  }
}
