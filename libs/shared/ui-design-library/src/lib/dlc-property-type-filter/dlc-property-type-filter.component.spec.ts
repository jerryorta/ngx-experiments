import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { DlcPropertyTypeOption } from './dlc-property-type-filter.component';

import {
  CG_PROPERTY_TYPE_OPTIONS,
  DlcPropertyTypeFilterComponent,
} from './dlc-property-type-filter.component';

describe('DlcPropertyTypeFilterComponent', () => {
  let component: DlcPropertyTypeFilterComponent;
  let fixture: ComponentFixture<DlcPropertyTypeFilterComponent>;
  let emissions: string[][];

  function queryOptionRows(): HTMLElement[] {
    return Array.from(
      fixture.nativeElement.querySelectorAll('[data-testid^="property-type-option-"]')
    );
  }

  function queryCheckbox(value: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      `[data-testid="property-type-option-${value}"] input[type="checkbox"]`
    );
  }

  function queryAction(testid: string): HTMLElement {
    const el = fixture.nativeElement.querySelector(`[data-testid="${testid}"]`);
    if (!el) throw new Error(`No element with data-testid "${testid}"`);
    return el;
  }

  function toggleViaChange(value: string): void {
    const checkbox = queryCheckbox(value);
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcPropertyTypeFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcPropertyTypeFilterComponent);
    component = fixture.componentInstance;
    emissions = [];
    component.selectedChange.subscribe((selection: string[]) => emissions.push(selection));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-property-type-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-property-type-filter')).toBe(true);
  });

  it('should render the 9 default RESO property-type rows with labels', () => {
    const rows = queryOptionRows();
    expect(rows.length).toBe(9);
    expect(
      rows.map(r => r.querySelector('.dlc-property-type-filter__label')?.textContent?.trim())
    ).toEqual(CG_PROPERTY_TYPE_OPTIONS.map(o => o.label));
  });

  it('should render a per-type icon glyph in each row', () => {
    const rows = queryOptionRows();
    // First icon span inside the row after the checkbox box is the type icon.
    const residentialIcons = rows[0].querySelectorAll('.material-symbols-outlined');
    const glyphs = Array.from(residentialIcons).map(i => i.textContent);
    expect(glyphs).toContain('home');
  });

  it('should check the boxes for the selected input values', () => {
    fixture.componentRef.setInput('selected', ['Land', 'Farm']);
    fixture.detectChanges();

    expect(queryCheckbox('Land').checked).toBe(true);
    expect(queryCheckbox('Farm').checked).toBe(true);
    expect(queryCheckbox('Residential').checked).toBe(false);
  });

  it('should emit the selection plus the toggled type on check', () => {
    fixture.componentRef.setInput('selected', ['Residential']);
    fixture.detectChanges();

    toggleViaChange('Land');
    expect(emissions.pop()).toEqual(['Residential', 'Land']);
  });

  it('should emit the selection minus the toggled type on uncheck', () => {
    fixture.componentRef.setInput('selected', ['Residential', 'Land']);
    fixture.detectChanges();

    toggleViaChange('Residential');
    expect(emissions.pop()).toEqual(['Land']);
  });

  it('should preserve options ordering in emissions regardless of toggle order', () => {
    fixture.componentRef.setInput('selected', ['CommercialSale']);
    fixture.detectChanges();

    toggleViaChange('Residential');
    // 'Residential' precedes 'CommercialSale' in the options list.
    expect(emissions.pop()).toEqual(['Residential', 'CommercialSale']);
  });

  it('should emit every option value on Select All', () => {
    queryAction('property-type-select-all').click();
    expect(emissions.pop()).toEqual(CG_PROPERTY_TYPE_OPTIONS.map(o => o.value));
  });

  it('should emit an empty selection on Clear All', () => {
    fixture.componentRef.setInput('selected', ['Residential', 'Land']);
    fixture.detectChanges();

    queryAction('property-type-clear-all').click();
    expect(emissions.pop()).toEqual([]);
  });

  it('should disable Clear All when nothing is selected', () => {
    const clearAll = queryAction('property-type-clear-all');
    expect(clearAll.querySelector('button')?.disabled).toBe(true);

    fixture.componentRef.setInput('selected', ['Residential']);
    fixture.detectChanges();
    expect(clearAll.querySelector('button')?.disabled).toBe(false);
  });

  it('should emit the residential-sale preset on For Sale', () => {
    queryAction('property-type-for-sale').click();
    expect(emissions.pop()).toEqual(['Residential']);
  });

  it('should emit the residential-lease preset on For Rent', () => {
    queryAction('property-type-for-rent').click();
    expect(emissions.pop()).toEqual(['ResidentialLease']);
  });

  it('should mark the For Sale preset active only on an exact selection match', () => {
    fixture.componentRef.setInput('selected', ['Residential']);
    fixture.detectChanges();
    expect(queryAction('property-type-for-sale').classList).toContain('dlc-button--primary');
    expect(queryAction('property-type-for-rent').classList).toContain('dlc-button--ghost');

    fixture.componentRef.setInput('selected', ['Residential', 'Land']);
    fixture.detectChanges();
    expect(queryAction('property-type-for-sale').classList).toContain('dlc-button--ghost');
  });

  it('should mark the For Rent preset active on an exact selection match', () => {
    fixture.componentRef.setInput('selected', ['ResidentialLease']);
    fixture.detectChanges();
    expect(queryAction('property-type-for-rent').classList).toContain('dlc-button--primary');
  });

  it('should render the selection count footer only when types are selected', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="property-type-count"]')).toBeNull();

    fixture.componentRef.setInput('selected', ['Residential']);
    fixture.detectChanges();
    expect(queryAction('property-type-count').textContent).toContain('1 type selected');

    fixture.componentRef.setInput('selected', ['Residential', 'Land']);
    fixture.detectChanges();
    expect(queryAction('property-type-count').textContent).toContain('2 types selected');
  });

  it('should render custom options instead of the defaults', () => {
    const custom: DlcPropertyTypeOption[] = [
      { icon: 'home', label: 'Homes', value: 'Residential' },
      { icon: 'landscape', label: 'Lots', value: 'Land' },
    ];
    fixture.componentRef.setInput('options', custom);
    fixture.detectChanges();

    const rows = queryOptionRows();
    expect(rows.length).toBe(2);
    expect(
      rows.map(r => r.querySelector('.dlc-property-type-filter__label')?.textContent?.trim())
    ).toEqual(['Homes', 'Lots']);

    queryAction('property-type-select-all').click();
    expect(emissions.pop()).toEqual(['Residential', 'Land']);
  });

  it('should apply the selected row modifier class to checked rows', () => {
    fixture.componentRef.setInput('selected', ['Farm']);
    fixture.detectChanges();

    const farmRow = fixture.nativeElement.querySelector(
      '[data-testid="property-type-option-Farm"]'
    ) as HTMLElement;
    expect(farmRow.classList.contains('dlc-property-type-filter__option--selected')).toBe(true);
  });
});
