import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DlcInputComponent } from '../dlc-input/dlc-input.component';

/**
 * Which geo-narrowing mode the user picked for the active-property search
 * (REX-492). `null` = no geo override (the wire falls back to whatever else is
 * set — e.g. the REX-491 Places location boundingBox — or unscoped).
 */
export type DlcSearchAreaMode = 'bounds' | 'radius' | null;

/** Slider floor in miles — anything smaller is effectively no search at all. */
export const CG_RADIUS_MIN_MILES = 1;
/** Slider ceiling in miles — wider than this and the result set is noise. */
export const CG_RADIUS_MAX_MILES = 50;
/** Whole-mile increments on both the slider and the number input. */
export const CG_RADIUS_STEP_MILES = 1;
/** Default miles when the user toggles INTO radius mode with nothing set yet. */
export const CG_RADIUS_DEFAULT_MILES = 5;

/**
 * Search-radius + Map-Bounds filter (REX-492) — a two-mode geo-narrowing
 * control for the active-property search. Pairs a Map-Bounds toggle with a
 * miles input + slider; mutually-exclusive Radius / Map-Bounds modes mirror
 * the wire contract (the page-store enforces the same exclusion against the
 * REX-491 Places boundingBox — the dlc-radius-filter is the leaf for those
 * intents).
 *
 * Controlled component: the consumer owns the value (`mode` + `radiusMiles`
 * inputs) and receives every change via `modeChange` / `radiusMilesChange`.
 * Toggling the active pill emits `modeChange: null` (turn the filter off);
 * picking the inactive pill emits the new mode. Editing the slider / input
 * fires `radiusMilesChange` only — never `modeChange` — so the consumer can
 * keep the mode pinned across radius edits.
 *
 * **No Angular Material** — pure Tailwind + `dlc-*` design-library
 * primitives (`dlc-input`), per the REX-385 architectural lock. Built +
 * reviewed in Storybook in isolation; wired by the property-search header in
 * a separate page-integration step.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-radius-filter' },
  imports: [DlcInputComponent, FormsModule],
  selector: 'dlc-radius-filter',
  styleUrl: './dlc-radius-filter.component.scss',
  templateUrl: './dlc-radius-filter.component.html',
})
export class DlcRadiusFilterComponent {
  /** Currently active geo-narrowing mode (`null` = filter off). */
  readonly mode = input<DlcSearchAreaMode>(null);

  /**
   * Current radius in miles. `null` shows the default in the editor without
   * the consumer having to commit it — the consumer only sees a real value
   * once the user edits the input or slider.
   */
  readonly radiusMiles = input<null | number>(null);

  /**
   * Emits whenever the user picks a mode. Toggling the active pill emits
   * `null` (filter off); picking the inactive pill emits the new mode.
   */
  readonly modeChange = output<DlcSearchAreaMode>();

  /** Emits whenever the user edits the radius via the slider or input. */
  readonly radiusMilesChange = output<number>();

  /** Floor / ceiling / step are exposed to the template for the slider bindings. */
  protected readonly _sliderMin = CG_RADIUS_MIN_MILES;
  protected readonly _sliderMax = CG_RADIUS_MAX_MILES;
  protected readonly _sliderStep = CG_RADIUS_STEP_MILES;

  /** Live miles for the slider thumb + readout — falls back to the default. */
  protected readonly _milesView = computed(() => this.radiusMiles() ?? CG_RADIUS_DEFAULT_MILES);

  /** Editor input shows the same value the slider does. */
  protected readonly _milesInputValue = computed(() => this._milesView());

  /** Selected-fill bar width as a % of the slider track. */
  protected readonly _fillWidthPct = computed(() => {
    const span = CG_RADIUS_MAX_MILES - CG_RADIUS_MIN_MILES;
    const pos = Math.max(0, Math.min(span, this._milesView() - CG_RADIUS_MIN_MILES));
    return (pos / span) * 100;
  });

  /** "5 mi" readout in the radius panel. */
  protected readonly _formattedMiles = computed(() => `${this._milesView()} mi`);

  /** Mode toggle handler — clicking the active pill turns the filter off. */
  protected onModeClick(next: Exclude<DlcSearchAreaMode, null>): void {
    this.modeChange.emit(this.mode() === next ? null : next);
  }

  /** Slider edit — clamps to the per-mile range before emitting. */
  protected onSliderChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    const parsed = Number(el.value);
    if (!Number.isFinite(parsed)) return;
    const clamped = Math.max(CG_RADIUS_MIN_MILES, Math.min(CG_RADIUS_MAX_MILES, parsed));
    this.radiusMilesChange.emit(clamped);
  }

  /**
   * Number-input edit — same clamp as the slider; empty / non-numeric text
   * snaps to the floor so the consumer never sees `NaN`.
   */
  protected onInputChange(value: null | string): void {
    const trimmed = `${value ?? ''}`.trim();
    if (trimmed === '') {
      this.radiusMilesChange.emit(CG_RADIUS_MIN_MILES);
      return;
    }
    const parsed = Number(trimmed);
    if (!Number.isFinite(parsed)) {
      this.radiusMilesChange.emit(CG_RADIUS_MIN_MILES);
      return;
    }
    const clamped = Math.max(CG_RADIUS_MIN_MILES, Math.min(CG_RADIUS_MAX_MILES, parsed));
    this.radiusMilesChange.emit(clamped);
  }
}
