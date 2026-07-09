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

/** Display unit for the lot-size filter UI — values stay canonical sqft regardless. */
export type DlcLotSizeUnit = 'acres' | 'sqft';

/**
 * Lot-size range in CANONICAL square feet — regardless of the display unit.
 * A `null` bound means "Any" (unbounded on that side).
 */
export interface DlcLotSizeRange {
  max: null | number;
  min: null | number;
}

export const SQFT_PER_ACRE = 43_560;

/** Acres → canonical sqft. Rounds AFTER conversion to whole sqft. */
export function acresToSqft(acres: number): number {
  return Math.round(acres * SQFT_PER_ACRE);
}

/** Canonical sqft → acres, UNROUNDED. Rounding happens only at display. */
export function sqftToAcres(sqft: number): number {
  return sqft / SQFT_PER_ACRE;
}

/** Slider ceiling in acres mode; the max thumb parked here means "Any". */
const SLIDER_MAX_ACRES = 10;

/** Slider ceiling in sqft mode; the max thumb parked here means "Any". */
const SLIDER_MAX_SQFT = 50_000;

/** Slider thumb increment in acres mode (display units). */
const SLIDER_STEP_ACRES = 0.1;

/** Slider thumb increment in sqft mode (display units). */
const SLIDER_STEP_SQFT = 1_000;

/**
 * Lot-size range filter — a sqft/acres unit toggle, min/max number inputs,
 * and a dual-thumb slider. Drives the lot-size facet of the property-search
 * filter bar.
 *
 * Controlled component: the consumer owns the value (`min` / `max` inputs,
 * always CANONICAL square feet) and receives every change via `rangeChange`
 * (also canonical sqft). When `unit` is `'acres'` the component converts
 * sqft → acres for display and user-entered acres → sqft on emit.
 *
 * Anti-drift rule: the unit toggle emits `unitChange` ONLY — never
 * `rangeChange` — so canonical values are immutable across unit toggles.
 *
 * Value semantics: min thumb at 0 emits `min: null`; max thumb at the
 * per-unit slider ceiling emits `max: null` — both mean "Any" on that bound.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-lot-size-filter' },
  imports: [DlcInputComponent, FormsModule],
  selector: 'dlc-lot-size-filter',
  styleUrl: './dlc-lot-size-filter.component.scss',
  templateUrl: './dlc-lot-size-filter.component.html',
})
export class DlcLotSizeFilterComponent {
  /** Upper bound in CANONICAL square feet; `null` = "Any". */
  readonly max = input<null | number>(null);

  /** Lower bound in CANONICAL square feet; `null` = "Any". */
  readonly min = input<null | number>(null);

  /** Display unit only — toggling it never mutates the canonical sqft bounds. */
  readonly unit = input<DlcLotSizeUnit>('sqft');

  /** Emits the full range in CANONICAL sqft on every user value change. */
  readonly rangeChange = output<DlcLotSizeRange>();

  /** Emits when the user picks the other display unit; never paired with `rangeChange`. */
  readonly unitChange = output<DlcLotSizeUnit>();

  /** Per-unit slider ceiling, in display units. */
  protected readonly _sliderMax = computed(() =>
    this.unit() === 'acres' ? SLIDER_MAX_ACRES : SLIDER_MAX_SQFT
  );

  /** Per-unit slider thumb increment, in display units. */
  protected readonly _sliderStep = computed(() =>
    this.unit() === 'acres' ? SLIDER_STEP_ACRES : SLIDER_STEP_SQFT
  );

  /** Max text-input value in DISPLAY units — `null` keeps the input empty ("Any"). */
  protected readonly _maxInputValue = computed(() => {
    const max = this.max();
    return max === null ? null : this.toDisplay(max);
  });

  /** Max thumb view value in DISPLAY units — `null` parks the thumb at the ceiling. */
  protected readonly _maxView = computed(() => {
    const max = this.max();
    return max === null ? this._sliderMax() : this.toDisplay(max);
  });

  /** Min text-input value in DISPLAY units — `null` keeps the input empty ("Any"). */
  protected readonly _minInputValue = computed(() => {
    const min = this.min();
    return min === null ? null : this.toDisplay(min);
  });

  /** Min thumb view value in DISPLAY units — `null` parks the thumb at 0. */
  protected readonly _minView = computed(() => {
    const min = this.min();
    return min === null ? 0 : this.toDisplay(min);
  });

  /** Left edge of the selected-range fill bar, as a % of the per-unit track. */
  protected readonly _fillLeftPct = computed(() =>
    Math.max(0, Math.min(100, (this._minView() / this._sliderMax()) * 100))
  );

  /** Width of the selected-range fill bar, as a % of the per-unit track. */
  protected readonly _fillWidthPct = computed(() => {
    const left = this._fillLeftPct();
    const right = Math.max(0, Math.min(100, (this._maxView() / this._sliderMax()) * 100));
    return Math.max(0, right - left);
  });

  /** Human-readable current range in display units, e.g. "0.25 – Any". */
  protected readonly _formattedRange = computed(() => {
    const minPart = this.formatDisplay(this._minView());
    const maxPart = this.max() === null ? 'Any' : this.formatDisplay(this._maxView());
    return `${minPart} – ${maxPart}`;
  });

  /** Unit toggle — emits `unitChange` ONLY; no-ops on the already-active unit. */
  protected selectUnit(unit: DlcLotSizeUnit): void {
    if (unit === this.unit()) return;
    this.unitChange.emit(unit);
  }

  protected onMaxInputChange(value: string): void {
    const parsed = this.parseDisplayValue(value);
    this.rangeChange.emit({
      max: parsed === null ? null : this.toCanonical(parsed),
      min: this.min(),
    });
  }

  protected onMinInputChange(value: string): void {
    const parsed = this.parseDisplayValue(value);
    this.rangeChange.emit({
      max: this.max(),
      min: parsed === null ? null : this.toCanonical(parsed),
    });
  }

  /** Max thumb: clamps to the min thumb (display units); at the ceiling emits `max: null`. */
  protected onSliderMaxChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    const clamped = Math.max(Number(el.value), this._minView());
    el.value = `${clamped}`;
    this.rangeChange.emit({
      max: clamped >= this._sliderMax() ? null : this.toCanonical(clamped),
      min: this.min(),
    });
  }

  /** Min thumb: clamps to the max thumb (display units); at 0 emits `min: null`. */
  protected onSliderMinChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    const clamped = Math.min(Number(el.value), this._maxView());
    el.value = `${clamped}`;
    this.rangeChange.emit({
      max: this.max(),
      min: clamped === 0 ? null : this.toCanonical(clamped),
    });
  }

  /** Acres get 2 fraction digits; sqft renders as a plain grouped integer. */
  private formatDisplay(value: number): string {
    return this.unit() === 'acres'
      ? value.toLocaleString('en-US', { maximumFractionDigits: 2 })
      : value.toLocaleString('en-US');
  }

  /** '' or non-numeric text means "Any" — normalized to `null`. */
  private parseDisplayValue(value: string): null | number {
    const trimmed = `${value ?? ''}`.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** Display units → canonical sqft (identity in sqft mode). */
  private toCanonical(display: number): number {
    return this.unit() === 'sqft' ? display : acresToSqft(display);
  }

  /** Canonical sqft → display units; acres rounded to 2 decimals for display only. */
  private toDisplay(sqft: number): number {
    return this.unit() === 'sqft' ? sqft : Math.round(sqftToAcres(sqft) * 100) / 100;
  }
}
