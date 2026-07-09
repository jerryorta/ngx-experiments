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
import { DlcIconDirective } from '../dlc-icon/dlc-icon.directive';

/** A selectable property-type row: RESO value + display label + Material Symbols icon. */
export interface DlcPropertyTypeOption {
  /** Material Symbols glyph name rendered next to the label. */
  icon: string;
  label: string;
  /** RESO `PropertyType` member (e.g. `'Residential'`, `'CommercialSale'`). */
  value: string;
}

/**
 * Default checklist contents — the nine RESO `ResoPropertyType` members with
 * human-readable labels and per-type icons. Consumers with their own facet
 * config (e.g. the property-search page) pass `options` instead.
 */
export const CG_PROPERTY_TYPE_OPTIONS: DlcPropertyTypeOption[] = [
  { icon: 'home', label: 'Residential', value: 'Residential' },
  { icon: 'apartment', label: 'Residential Income', value: 'ResidentialIncome' },
  { icon: 'house', label: 'Residential Lease', value: 'ResidentialLease' },
  { icon: 'landscape', label: 'Land', value: 'Land' },
  { icon: 'agriculture', label: 'Farm', value: 'Farm' },
  { icon: 'holiday_village', label: 'Manufactured In Park', value: 'ManufacturedInPark' },
  { icon: 'store', label: 'Commercial Sale', value: 'CommercialSale' },
  { icon: 'storefront', label: 'Commercial Lease', value: 'CommercialLease' },
  { icon: 'business_center', label: 'Business Opportunity', value: 'BusinessOpportunity' },
];

/** "For Sale" shortcut preset — the residential-sale RESO type. */
export const CG_PROPERTY_TYPE_FOR_SALE: string[] = ['Residential'];

/** "For Rent" shortcut preset — the residential-lease RESO type. */
export const CG_PROPERTY_TYPE_FOR_RENT: string[] = ['ResidentialLease'];

/**
 * Property-type multi-select checklist (REX-487) — one checkbox row per RESO
 * property type with a per-type icon, plus Select All / Clear All and
 * For Sale / For Rent shortcut presets. Ports the legacy
 * `dlc-property-type-filter` form factor to concierge conventions (no
 * Material — `dlc-checkbox` rows with surface-token row shifts).
 *
 * Controlled component: the consumer owns the selection (`selected` input)
 * and receives every change via `selectedChange`. Emissions are live (no
 * internal debounce) — the consuming page store debounces downstream.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { class: 'dlc-property-type-filter' },
  imports: [DlcButtonComponent, DlcCheckboxComponent, DlcIconDirective],
  selector: 'dlc-property-type-filter',
  styleUrl: './dlc-property-type-filter.component.scss',
  templateUrl: './dlc-property-type-filter.component.html',
})
export class DlcPropertyTypeFilterComponent {
  /** "For Rent" preset selection — override to re-map the shortcut. */
  readonly forRentValues = input<string[]>(CG_PROPERTY_TYPE_FOR_RENT);

  /** "For Sale" preset selection — override to re-map the shortcut. */
  readonly forSaleValues = input<string[]>(CG_PROPERTY_TYPE_FOR_SALE);

  /** Checklist rows; defaults to the nine RESO property types. */
  readonly options = input<DlcPropertyTypeOption[]>(CG_PROPERTY_TYPE_OPTIONS);

  /** Currently selected property-type values; `[]` = no type narrowing. */
  readonly selected = input<string[]>([]);

  /** Emits the full selection on every user change (row toggle or preset). */
  readonly selectedChange = output<string[]>();

  /** Selection as a Set for O(1) row-checked lookups. */
  protected readonly _selectedSet = computed(() => new Set(this.selected()));

  protected readonly _selectedCount = computed(() => this._selectedSet().size);

  /** Drives the active (primary-variant) styling on the For Rent preset. */
  protected readonly _isForRentActive = computed(() => this.matchesPreset(this.forRentValues()));

  /** Drives the active (primary-variant) styling on the For Sale preset. */
  protected readonly _isForSaleActive = computed(() => this.matchesPreset(this.forSaleValues()));

  protected clearAll(): void {
    // dlc-button disables the inner <button> but the (click) sits on the host,
    // so guard the disabled state here too.
    if (this._selectedCount() === 0) return;
    this.selectedChange.emit([]);
  }

  protected isSelected(value: string): boolean {
    return this._selectedSet().has(value);
  }

  protected selectAll(): void {
    this.selectedChange.emit(this.options().map(o => o.value));
  }

  protected selectForRent(): void {
    this.selectedChange.emit([...this.forRentValues()]);
  }

  protected selectForSale(): void {
    this.selectedChange.emit([...this.forSaleValues()]);
  }

  /** Adds or removes one type, preserving the `options` ordering in the emit. */
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
