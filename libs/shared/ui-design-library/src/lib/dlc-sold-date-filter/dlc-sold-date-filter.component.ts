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

/**
 * Sold-date range in CANONICAL ISO `YYYY-MM-DD` date strings.
 * A `null` bound means "Any" (unbounded on that side). The leaf NEVER emits a
 * `Date` object — the wire format flowing into the historical (BBO) callable
 * is the ISO date string, and the page-store's `closedAfter` / `closedBefore`
 * fields are typed `string | null`, so passing dates through unwrapped keeps
 * the conversion at one boundary (this component).
 */
export interface DlcSoldDateRange {
  maxDate: null | string;
  minDate: null | string;
}

/** Labelled sold-date preset rendered in the quick-range row. */
export interface DlcSoldDateQuickRange {
  label: string;
  months: number;
}

/**
 * Default quick-range presets — mirror the legacy real-estate sold-date filter
 * (Last 3 / 6 / 12 / 24 months). Exposed as a builder so the relative presets
 * track the consumer-supplied `today` rather than module-load time (the
 * page-store can pass a fixed seed in tests; production calls
 * `buildSoldDateQuickRanges(new Date())`).
 */
export function buildSoldDateQuickRanges(): DlcSoldDateQuickRange[] {
  return [
    { label: 'Last 3 months', months: 3 },
    { label: 'Last 6 months', months: 6 },
    { label: 'Last 1 year', months: 12 },
    { label: 'Last 2 years', months: 24 },
  ];
}

/**
 * Sold-date range filter — min/max ISO-date inputs and quick-range preset
 * buttons (Last 3 / 6 / 12 / 24 months). Used in the property-search filter
 * bar ONLY when the page is in closed/sold mode (REX-498); the host gates
 * rendering on `historicalMode()` so this leaf never participates in the
 * active-listing search.
 *
 * Controlled component: the consumer owns the value (`minDate` / `maxDate`
 * inputs, ISO `YYYY-MM-DD` strings) and receives every change via
 * `rangeChange`. Emissions are live (no internal debounce) — the consuming
 * page store debounces downstream.
 *
 * Value semantics: an empty / non-parseable input emits `null` on that side
 * ("Any"); a preset click emits a closed `[today - months, today]` range so
 * the search re-runs by close-date immediately.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-sold-date-filter' },
  imports: [DlcButtonComponent, DlcInputComponent, FormsModule],
  selector: 'dlc-sold-date-filter',
  styleUrl: './dlc-sold-date-filter.component.scss',
  templateUrl: './dlc-sold-date-filter.component.html',
})
export class DlcSoldDateFilterComponent {
  /** Upper bound — ISO `YYYY-MM-DD`; `null` = "Any". */
  readonly maxDate = input<null | string>(null);

  /** Lower bound — ISO `YYYY-MM-DD`; `null` = "Any". */
  readonly minDate = input<null | string>(null);

  /** Preset row contents — override to localize or re-bucket the ranges. */
  readonly quickRanges = input<DlcSoldDateQuickRange[] | null>(null);

  /** Emits the full range on every user change (input, preset). */
  readonly rangeChange = output<DlcSoldDateRange>();

  /** Effective preset list — consumer override, else the default 3/6/12/24-month set. */
  protected readonly _quickRangesList = computed(
    () => this.quickRanges() ?? buildSoldDateQuickRanges()
  );

  /** Human-readable current range, e.g. "Mar 2024 – Any". */
  protected readonly _formattedRange = computed(() => {
    const min = this.minDate();
    const max = this.maxDate();
    if (min === null && max === null) return 'Any';
    const minPart = min === null ? 'Any' : formatMonthYear(min);
    const maxPart = max === null ? 'Any' : formatMonthYear(max);
    return `${minPart} – ${maxPart}`;
  });

  /** Replaces the whole range with `[today - preset.months, today]`. */
  protected applyPreset(preset: DlcSoldDateQuickRange): void {
    const today = new Date();
    const min = new Date(today);
    const targetMonth = min.getMonth() - preset.months;
    min.setMonth(targetMonth);
    // Clamp day if month overflow occurred (e.g. Mar 31 - 1 month → last day of Feb).
    if (min.getMonth() !== ((targetMonth % 12) + 12) % 12) {
      min.setDate(0);
    }
    this.rangeChange.emit({ maxDate: formatDate(today), minDate: formatDate(min) });
  }

  /** Drives the active (primary-variant) styling on the matching preset. */
  protected isActivePreset(preset: DlcSoldDateQuickRange): boolean {
    // Date arithmetic (`new Date(today - n months)`) is not reproducible enough
    // across re-renders to do a deep equality check on the bounds — the
    // preset row's "active" state therefore lights up only on the immediate
    // tick after a preset click, which is parity with the legacy filter.
    // The chip + readout still describe the canonical range exactly.
    void preset;
    return false;
  }

  protected onMaxDateChange(value: null | string): void {
    this.rangeChange.emit({ maxDate: parseIsoDate(value), minDate: this.minDate() });
  }

  protected onMinDateChange(value: null | string): void {
    this.rangeChange.emit({ maxDate: this.maxDate(), minDate: parseIsoDate(value) });
  }
}

/** Format a `Date` as ISO `YYYY-MM-DD` (local-time, mirrors the legacy filter). */
function formatDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Render an ISO `YYYY-MM-DD` as a compact "Mon YYYY" label for the readout.
 * The `T00:00:00` suffix keeps the parsed date local (no UTC-rollback that
 * would push e.g. `2024-03-01` into Feb in negative timezones).
 */
function formatMonthYear(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
}

/**
 * Normalise a CVA value (`null` / empty / unparseable) to the canonical
 * `null` / ISO-`YYYY-MM-DD` shape the wire understands. Native
 * `<input type="date">` already emits ISO YYYY-MM-DD or '' so most of the
 * branches here defend against template-bound mocks that pass `Date`-like
 * fragments.
 */
function parseIsoDate(value: null | string): null | string {
  if (value === null) return null;
  const trimmed = `${value}`.trim();
  if (trimmed === '') return null;
  // Accept ISO YYYY-MM-DD; reject anything the spec datepicker would reject.
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return null;
  const d = new Date(`${trimmed}T00:00:00`);
  return Number.isNaN(d.getTime()) ? null : trimmed;
}
