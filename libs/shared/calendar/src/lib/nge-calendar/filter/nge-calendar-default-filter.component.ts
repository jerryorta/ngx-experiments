import {
  ChangeDetectionStrategy,
  Component,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import type { NgeCalendarFilter } from '../../core/models/nge-calendar-filter.model';

/** The three timing segments the default filter offers. */
interface TimingOption {
  label: string;
  value: NgeCalendarFilter['timing'];
}

/**
 * DEFAULT body for the cross-view filter popover (ARCH-149) — the equivalent of
 * {@link NgeCalendarDefaultEventOverlayComponent} for the funnel. The
 * {@link NgeCalendarFilterComponent} renders this inside the popover whenever the
 * host does NOT supply a `#ngeCalendarFilter` template.
 *
 * Pure, fully-controlled presentation: it owns NO state and touches NO store. It
 * renders three facet controls from its `filter` + `availableColors` inputs —
 * a title search box, a colour-swatch toggle list, and an all-day / timed
 * segmented group — and emits each change as a `valueChange` partial. The
 * popover wrapper merges those partials into its draft.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-calendar-default-filter' },
  selector: 'nge-calendar-default-filter',
  standalone: true,
  styleUrl: './nge-calendar-default-filter.component.scss',
  templateUrl: './nge-calendar-default-filter.component.html',
})
export class NgeCalendarDefaultFilterComponent {
  /** The current filter the controls reflect (fully controlled — no local copy). */
  readonly filter = input.required<NgeCalendarFilter>();

  /** FULL distinct colour set to render as toggle swatches (unfiltered). */
  readonly availableColors = input<string[]>([]);

  /** Emitted with a partial facet change whenever a control is interacted with. */
  readonly valueChange = output<Partial<NgeCalendarFilter>>();

  /** The timing segments rendered as a labelled `aria-pressed` toggle group. */
  protected readonly timingOptions: readonly TimingOption[] = [
    { label: 'All', value: 'all' },
    { label: 'All day', value: 'allDay' },
    { label: 'Timed', value: 'timed' },
  ];

  /** Emit the new query substring on each keystroke (debounce is the wrapper's job). */
  protected onQueryInput(value: string): void {
    this.valueChange.emit({ query: value });
  }

  /** Toggle a colour in/out of the active colour set and emit the new array. */
  protected onColorToggle(color: string): void {
    const current = this.filter().colors;
    const next = current.includes(color) ? current.filter(c => c !== color) : [...current, color];
    this.valueChange.emit({ colors: next });
  }

  /** Emit the chosen timing segment. */
  protected onTimingChange(timing: NgeCalendarFilter['timing']): void {
    this.valueChange.emit({ timing });
  }

  /** Whether a colour swatch is currently selected (in `filter.colors`). */
  protected isColorSelected(color: string): boolean {
    return this.filter().colors.includes(color);
  }
}
