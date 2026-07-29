import {
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  ViewEncapsulation,
} from '@angular/core';

/**
 * A `div`-based slider, and the reason this story ships one.
 *
 * ⚠️ **Deliberately NOT `<input type="range">`.** A native range input was already
 * matched by the old tag-list guard, so it would demonstrate nothing. What a design
 * library actually ships — `cg-select`, a composed slider, and the table's own future
 * editors — is a composed element carrying an ARIA role, and *that* is what the guard
 * had to learn to recognise. Drag this thumb: the range addon must leave the gesture
 * alone and select no cells.
 *
 * It is also the always-live case in the flesh. `meta.ngeEdit.alwaysLive` exists for a
 * column whose control **is** the reading — a value a user scans down rather than opens
 * one at a time — and paying for an instance per visible row is the trade that buys.
 *
 * ⚠️ It proposes and never writes, exactly as a committed text edit does: the pointer
 * release calls `commitEdit`, the host applies the patch, and the value the thumb sits
 * at on the next frame is the host's answer rather than this component's memory.
 */
@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'nge-table-edit-demo-slider',
  },
  selector: 'nge-table-edit-demo-slider',
  standalone: true,
  styleUrl: './edit-demo-slider.component.scss',
  templateUrl: './edit-demo-slider.component.html',
})
export class NgeTableEditDemoSliderComponent {
  readonly value = input.required<number>();

  readonly max = input<number>(500);

  readonly label = input<string>('quantity');

  /** The proposed value, once per gesture. The host decides whether it becomes real. */
  readonly commit = output<number>();

  /**
   * Where the thumb sits *during* a drag, or `null` when none is in flight.
   *
   * ⚠️ **The reason a drag can commit once rather than per frame.** The rendered value
   * belongs to the host — it arrives back through `config.data` after the host applies
   * an intent — so a slider with no local preview would have to propose on every
   * `pointermove` just to appear to move. That is one `edit-intent` per animation frame,
   * and it contradicts the contract this story ships: an intent is emitted once, on
   * commit. ARCH-271's fill handle draws a pending outline for exactly the same reason
   * and proposes only on release.
   */
  private readonly draft = signal<null | number>(null);

  protected readonly displayValue = computed(() => this.draft() ?? this.value());

  protected readonly percent = computed(() =>
    Math.round((Math.min(this.displayValue(), this.max()) / this.max()) * 100)
  );

  private readonly host = inject(ElementRef<HTMLElement>);

  /** The pointer this drag owns, or `null` between drags. */
  private pointerId: null | number = null;

  /**
   * ⚠️ **No `stopPropagation()` here, and its absence is the point of the section this
   * control appears in.** The claim being demonstrated is that `NgeRangeBridge` stands
   * down on its own, because its guard matches `role="slider"` on the element below.
   * Stopping the event at the thumb would starve the bridge's delegated root listener
   * and the section would pass whether the guard worked or not — a demonstration that
   * cannot fail proves nothing. `preventDefault()` stays: it suppresses the browser's
   * own text-drag, which the guard has no opinion about.
   */
  protected onPointerDown(event: PointerEvent): void {
    event.preventDefault();

    this.pointerId = event.pointerId;
    (event.target as Element).setPointerCapture?.(event.pointerId);
    this.draft.set(this.valueAt(event.clientX));
  }

  protected onPointerMove(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) {
      return;
    }

    this.draft.set(this.valueAt(event.clientX));
  }

  /** One proposal per gesture, on release — the fill handle's arrangement. */
  protected onPointerUp(event: PointerEvent): void {
    if (this.pointerId !== event.pointerId) {
      return;
    }

    const proposed = this.draft();

    this.pointerId = null;
    this.draft.set(null);

    if (proposed !== null && proposed !== this.value()) {
      this.commit.emit(proposed);
    }
  }

  /**
   * Arrow keys, so the control is usable without a pointer.
   *
   * `preventDefault()` stops the page scrolling out from under the user; the event is
   * otherwise left alone for the same reason `onPointerDown` leaves it alone — the
   * range addon's own guard is what declines it, and masking that here would hide
   * whether the guard works.
   */
  protected onStep(event: KeyboardEvent, direction: number): void {
    event.preventDefault();

    const next = Math.max(0, Math.min(this.max(), this.value() + direction * 10));

    if (next !== this.value()) {
      this.commit.emit(next);
    }
  }

  private valueAt(clientX: number): number {
    const track = (this.host.nativeElement as HTMLElement).querySelector(
      '.nge-table-edit-demo-slider__track'
    );
    const box = track?.getBoundingClientRect();

    if (!box || box.width === 0) {
      return this.value();
    }

    const ratio = Math.max(0, Math.min(1, (clientX - box.left) / box.width));

    return Math.round(ratio * this.max());
  }
}
