import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';
import { FormsModule } from '@angular/forms';

import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcInputComponent } from '../dlc-input/dlc-input.component';

/** Square-footage range. A `null` bound means "Any" (unbounded on that side). */
export interface DlcSqftRange {
  max: null | number;
  min: null | number;
}

/** Labelled square-footage preset rendered in the quick-range row. */
export interface DlcSqftQuickRange {
  label: string;
  max: null | number;
  min: null | number;
}

/** Default quick-range presets — mirrors the legacy real-estate sqft filter. */
export const DEFAULT_SQFT_QUICK_RANGES: DlcSqftQuickRange[] = [
  { label: 'Under 1,500', max: 1500, min: null },
  { label: '1,500–2,500', max: 2500, min: 1500 },
  { label: '2,500–3,500', max: 3500, min: 2500 },
  { label: '3,500+', max: null, min: 3500 },
];

/**
 * Square-footage range filter — min/max number inputs, a dual-thumb slider,
 * and quick-range preset buttons.
 *
 * Controlled component: the consumer owns the value (`min` / `max` inputs)
 * and receives every change via `rangeChange`. Emissions are live (no
 * internal debounce) — the consuming page store debounces downstream.
 *
 * Value semantics: min thumb at 0 emits `min: null`; max thumb at
 * `sliderMax()` emits `max: null` — both mean "Any" on that bound.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-sqft-filter' },
  imports: [DlcButtonComponent, DlcInputComponent, FormsModule],
  selector: 'dlc-sqft-filter',
  styleUrl: './dlc-sqft-filter.component.scss',
  templateUrl: './dlc-sqft-filter.component.html',
})
export class DlcSqftFilterComponent {
  /** Upper bound in square feet; `null` = "Any". */
  readonly max = input<null | number>(null);

  /** Lower bound in square feet; `null` = "Any". */
  readonly min = input<null | number>(null);

  /** Preset row contents — override to localize or re-bucket the ranges. */
  readonly quickRanges = input<DlcSqftQuickRange[]>(DEFAULT_SQFT_QUICK_RANGES);

  /** Slider upper bound; the max thumb parked here means "no upper bound". */
  readonly sliderMax = input(10_000);

  /** Slider thumb increment in square feet. */
  readonly sliderStep = input(100);

  /** Emits the full range on every user change (input, thumb drag, preset). */
  readonly rangeChange = output<DlcSqftRange>();

  /** Max thumb view value — `null` upper bound parks the thumb at sliderMax. */
  protected readonly _maxView = computed(() => this.max() ?? this.sliderMax());

  /** Min thumb view value — `null` lower bound parks the thumb at 0. */
  protected readonly _minView = computed(() => this.min() ?? 0);

  /** Left edge of the selected-range fill bar, as a % of the track. */
  protected readonly _fillLeftPct = computed(() =>
    Math.max(0, Math.min(100, (this._minView() / this.sliderMax()) * 100))
  );

  /** Width of the selected-range fill bar, as a % of the track. */
  protected readonly _fillWidthPct = computed(() => {
    const left = this._fillLeftPct();
    const right = Math.max(0, Math.min(100, (this._maxView() / this.sliderMax()) * 100));
    return Math.max(0, right - left);
  });

  /** Human-readable current range, e.g. "1,500 – Any". */
  protected readonly _formattedRange = computed(() => {
    const max = this.max();
    const minPart = this._minView().toLocaleString('en-US');
    const maxPart = max === null ? 'Any' : max.toLocaleString('en-US');
    return `${minPart} – ${maxPart}`;
  });

  /** Replaces the whole range with the preset's bounds. */
  protected applyPreset(preset: DlcSqftQuickRange): void {
    this.rangeChange.emit({ max: preset.max, min: preset.min });
  }

  /** Drives the active (primary-variant) styling on the matching preset. */
  protected isActivePreset(preset: DlcSqftQuickRange): boolean {
    return this.max() === preset.max && this.min() === preset.min;
  }

  protected onMaxInputChange(value: string): void {
    this.rangeChange.emit({ max: this.parseSqft(value), min: this.min() });
  }

  protected onMinInputChange(value: string): void {
    this.rangeChange.emit({ max: this.max(), min: this.parseSqft(value) });
  }

  /** Max thumb: clamps to the min thumb; at sliderMax emits `max: null`. */
  protected onSliderMaxChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    const clamped = Math.max(Number(el.value), this._minView());
    el.value = `${clamped}`;
    this.rangeChange.emit({
      max: clamped >= this.sliderMax() ? null : clamped,
      min: this.min(),
    });
  }

  /** Min thumb: clamps to the max thumb; at 0 emits `min: null`. */
  protected onSliderMinChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    const clamped = Math.min(Number(el.value), this._maxView());
    el.value = `${clamped}`;
    this.rangeChange.emit({
      max: this.max(),
      min: clamped === 0 ? null : clamped,
    });
  }

  /** '' or non-numeric text means "Any" — normalized to `null`. */
  private parseSqft(value: string): null | number {
    const trimmed = `${value ?? ''}`.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }
}
