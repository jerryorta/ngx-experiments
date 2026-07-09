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

/** Year-built range. A `null` bound means "Any" (unbounded on that side). */
export interface DlcYearBuiltRange {
  max: null | number;
  min: null | number;
}

/** Labelled year-built preset rendered in the quick-range row. */
export interface DlcYearBuiltQuickRange {
  label: string;
  max: null | number;
  min: null | number;
}

/**
 * Default quick-range presets relative to `currentYear` — mirrors the legacy
 * real-estate year-built filter (Last 5 / Last 10 / 2000+ / 1990s / Before 1990).
 * Exposed as a builder (not a const) so the relative presets track the
 * component's configurable year ceiling instead of module-load time.
 */
export function buildYearBuiltQuickRanges(currentYear: number): DlcYearBuiltQuickRange[] {
  return [
    { label: 'Last 5 years', max: null, min: currentYear - 5 },
    { label: 'Last 10 years', max: null, min: currentYear - 10 },
    { label: '2000+', max: null, min: 2000 },
    { label: '1990s', max: 1999, min: 1990 },
    { label: 'Before 1990', max: 1989, min: null },
  ];
}

/**
 * Year-built range filter — min/max year inputs, a dual-thumb slider, and
 * quick-range preset buttons (REX-486).
 *
 * Controlled component: the consumer owns the value (`min` / `max` inputs)
 * and receives every change via `rangeChange`. Emissions are live (no
 * internal debounce) — the consuming page store debounces downstream.
 *
 * Value semantics: min thumb parked at `sliderMin()` emits `min: null`; max
 * thumb parked at `sliderMax()` emits `max: null` — both mean "Any" on that
 * bound. Unlike the sqft/lot-size filters the slider floor is a year
 * (default 1900), not 0.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-year-built-filter' },
  imports: [DlcButtonComponent, DlcInputComponent, FormsModule],
  selector: 'dlc-year-built-filter',
  styleUrl: './dlc-year-built-filter.component.scss',
  templateUrl: './dlc-year-built-filter.component.html',
})
export class DlcYearBuiltFilterComponent {
  /** Upper bound year; `null` = "Any". */
  readonly max = input<null | number>(null);

  /** Lower bound year; `null` = "Any". */
  readonly min = input<null | number>(null);

  /** Preset row contents — override to localize or re-bucket the ranges. */
  readonly quickRanges = input<DlcYearBuiltQuickRange[] | null>(null);

  /** Slider ceiling; the max thumb parked here means "no upper bound". */
  readonly sliderMax = input(new Date().getFullYear());

  /** Slider floor; the min thumb parked here means "no lower bound". */
  readonly sliderMin = input(1900);

  /** Slider thumb increment in years. */
  readonly sliderStep = input(1);

  /** Emits the full range on every user change (input, thumb drag, preset). */
  readonly rangeChange = output<DlcYearBuiltRange>();

  /** Max thumb view value — `null` upper bound parks the thumb at sliderMax. */
  protected readonly _maxView = computed(() => this.max() ?? this.sliderMax());

  /** Min thumb view value — `null` lower bound parks the thumb at sliderMin. */
  protected readonly _minView = computed(() => this.min() ?? this.sliderMin());

  /** Effective preset list — consumer override, else defaults off the ceiling. */
  protected readonly _quickRangesList = computed(
    () => this.quickRanges() ?? buildYearBuiltQuickRanges(this.sliderMax())
  );

  /** Left edge of the selected-range fill bar, as a % of the track. */
  protected readonly _fillLeftPct = computed(() =>
    Math.max(0, Math.min(100, this.toTrackPct(this._minView())))
  );

  /** Width of the selected-range fill bar, as a % of the track. */
  protected readonly _fillWidthPct = computed(() => {
    const left = this._fillLeftPct();
    const right = Math.max(0, Math.min(100, this.toTrackPct(this._maxView())));
    return Math.max(0, right - left);
  });

  /** Human-readable current range, e.g. "1990 – Any". Years carry no separators. */
  protected readonly _formattedRange = computed(() => {
    const max = this.max();
    const maxPart = max === null ? 'Any' : `${max}`;
    return `${this._minView()} – ${maxPart}`;
  });

  /** Replaces the whole range with the preset's bounds. */
  protected applyPreset(preset: DlcYearBuiltQuickRange): void {
    this.rangeChange.emit({ max: preset.max, min: preset.min });
  }

  /** Drives the active (primary-variant) styling on the matching preset. */
  protected isActivePreset(preset: DlcYearBuiltQuickRange): boolean {
    return this.max() === preset.max && this.min() === preset.min;
  }

  protected onMaxInputChange(value: string): void {
    this.rangeChange.emit({ max: this.parseYear(value), min: this.min() });
  }

  protected onMinInputChange(value: string): void {
    this.rangeChange.emit({ max: this.max(), min: this.parseYear(value) });
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

  /** Min thumb: clamps to the max thumb; at sliderMin emits `min: null`. */
  protected onSliderMinChange(event: Event): void {
    const el = event.target as HTMLInputElement;
    const clamped = Math.min(Number(el.value), this._maxView());
    el.value = `${clamped}`;
    this.rangeChange.emit({
      max: this.max(),
      min: clamped <= this.sliderMin() ? null : clamped,
    });
  }

  /** '' or non-numeric text means "Any" — normalized to `null`. */
  private parseYear(value: string): null | number {
    const trimmed = `${value ?? ''}`.trim();
    if (trimmed === '') return null;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : null;
  }

  /** Maps a year onto the track % accounting for the non-zero floor. */
  private toTrackPct(year: number): number {
    const floor = this.sliderMin();
    const span = this.sliderMax() - floor;
    return span <= 0 ? 0 : ((year - floor) / span) * 100;
  }
}
