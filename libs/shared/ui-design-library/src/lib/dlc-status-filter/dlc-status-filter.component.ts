import {
  ChangeDetectionStrategy,
  Component,
  computed,
  input,
  output,
  ViewEncapsulation,
} from '@angular/core';

import { DlcButtonComponent } from '../dlc-button/dlc-button.component';
import { DlcCheckboxComponent } from '../dlc-checkbox/dlc-checkbox.component';

/** A selectable listing-status row: RESO value + display label + description + group. */
export interface DlcStatusFilterOption {
  /** Visible group header this status renders under (e.g. `'Active listings'`). */
  category: string;
  /** One-line plain-language meaning shown under the label. */
  description: string;
  label: string;
  /** RESO `StandardStatus` member (e.g. `'ActiveUnderContract'`). */
  value: string;
}

/** A rendered checklist group: header label + the options filed under it. */
export interface DlcStatusFilterGroup {
  category: string;
  options: DlcStatusFilterOption[];
}

/**
 * Default checklist contents — the four on-market RESO `StandardStatus`
 * members the active property search surfaces, grouped Active listings /
 * Pending. Consumers with their own facet config (e.g. the property-search
 * page) pass `options` instead.
 */
export const CG_STATUS_FILTER_OPTIONS: DlcStatusFilterOption[] = [
  {
    category: 'Active listings',
    description: 'Available for sale and showings',
    label: 'Active',
    value: 'Active',
  },
  {
    category: 'Active listings',
    description: 'Accepted offer, still showing for backup offers',
    label: 'Active Under Contract',
    value: 'ActiveUnderContract',
  },
  {
    category: 'Active listings',
    description: 'Pre-marketing phase, not yet available for showings',
    label: 'Coming Soon',
    value: 'ComingSoon',
  },
  {
    category: 'Pending',
    description: 'Under contract, no longer showing',
    label: 'Pending',
    value: 'Pending',
  },
];

/** "Active Only" shortcut preset — the three active-category RESO statuses. */
export const CG_STATUS_FILTER_ACTIVE_ONLY: string[] = [
  'Active',
  'ActiveUnderContract',
  'ComingSoon',
];

/**
 * Listing-status multi-select checklist (REX-488) — one checkbox row per RESO
 * standard status with a short description, grouped under visible category
 * headers (Active listings / Pending), plus Select All / Clear All and an
 * Active Only shortcut preset. Upgrades the property-search status facet from
 * the flat `dlc-chip-selector`, porting the legacy `dlc-mls-status-filter`
 * grouping + copy to concierge conventions (no Material — `dlc-checkbox` rows
 * with surface-token row shifts, mirroring `dlc-property-type-filter`).
 *
 * Controlled component: the consumer owns the selection (`selected` input)
 * and receives every change via `selectedChange`. Emissions are live (no
 * internal debounce) — the consuming page store debounces downstream.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-status-filter' },
  imports: [DlcButtonComponent, DlcCheckboxComponent],
  selector: 'dlc-status-filter',
  styleUrl: './dlc-status-filter.component.scss',
  templateUrl: './dlc-status-filter.component.html',
})
export class DlcStatusFilterComponent {
  /** "Active Only" preset selection — override to re-map the shortcut. */
  readonly activeOnlyValues = input<string[]>(CG_STATUS_FILTER_ACTIVE_ONLY);

  /** Checklist rows; defaults to the four on-market RESO statuses. */
  readonly options = input<DlcStatusFilterOption[]>(CG_STATUS_FILTER_OPTIONS);

  /** Currently selected status values; `[]` = default status narrowing. */
  readonly selected = input<string[]>([]);

  /** Emits the full selection on every user change (row toggle or preset). */
  readonly selectedChange = output<string[]>();

  /** Options bucketed under their category headers, preserving input order. */
  protected readonly _groups = computed<DlcStatusFilterGroup[]>(() => {
    const groups: DlcStatusFilterGroup[] = [];
    const byCategory = new Map<string, DlcStatusFilterOption[]>();
    for (const option of this.options()) {
      let bucket = byCategory.get(option.category);
      if (!bucket) {
        bucket = [];
        byCategory.set(option.category, bucket);
        groups.push({ category: option.category, options: bucket });
      }
      bucket.push(option);
    }
    return groups;
  });

  /** Selection as a Set for O(1) row-checked lookups. */
  protected readonly _selectedSet = computed(() => new Set(this.selected()));

  protected readonly _selectedCount = computed(() => this._selectedSet().size);

  /** Drives the active (primary-variant) styling on the Active Only preset. */
  protected readonly _isActiveOnlyActive = computed(() =>
    this.matchesPreset(this.activeOnlyValues())
  );

  protected clearAll(): void {
    // dlc-button disables the inner <button> but the (click) sits on the host,
    // so guard the disabled state here too.
    if (this._selectedCount() === 0) return;
    this.selectedChange.emit([]);
  }

  protected isSelected(value: string): boolean {
    return this._selectedSet().has(value);
  }

  protected selectActiveOnly(): void {
    this.selectedChange.emit([...this.activeOnlyValues()]);
  }

  protected selectAll(): void {
    this.selectedChange.emit(this.options().map(o => o.value));
  }

  /** Adds or removes one status, preserving the `options` ordering in the emit. */
  protected toggle(value: string): void {
    const next = new Set(this._selectedSet());
    if (next.has(value)) {
      next.delete(value);
    } else {
      next.add(value);
    }
    this.selectedChange.emit(
      this.options()
        .map(o => o.value)
        .filter(v => next.has(v))
    );
  }

  /** True when the current selection equals the preset exactly (order-insensitive). */
  private matchesPreset(preset: string[]): boolean {
    const current = this._selectedSet();
    return current.size === preset.length && preset.every(v => current.has(v));
  }
}
