import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { DlcStatusFilterOption } from './dlc-status-filter.component';

import {
  CG_STATUS_FILTER_ACTIVE_ONLY,
  CG_STATUS_FILTER_OPTIONS,
  DlcStatusFilterComponent,
} from './dlc-status-filter.component';

describe('DlcStatusFilterComponent', () => {
  let component: DlcStatusFilterComponent;
  let fixture: ComponentFixture<DlcStatusFilterComponent>;
  let emissions: string[][];

  function queryOptionRows(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[data-testid^="status-option-"]'));
  }

  function queryGroupHeaders(): HTMLElement[] {
    return Array.from(fixture.nativeElement.querySelectorAll('[data-testid^="status-group-"]'));
  }

  function queryCheckbox(value: string): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      `[data-testid="status-option-${value}"] input[type="checkbox"]`
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
      imports: [DlcStatusFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcStatusFilterComponent);
    component = fixture.componentInstance;
    emissions = [];
    component.selectedChange.subscribe((selection: string[]) => emissions.push(selection));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-status-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-status-filter')).toBe(true);
  });

  it('should render the 4 default RESO status rows with labels', () => {
    const rows = queryOptionRows();
    expect(rows.length).toBe(4);
    expect(rows.map(r => r.querySelector('.dlc-status-filter__label')?.textContent?.trim())).toEqual(
      CG_STATUS_FILTER_OPTIONS.map(o => o.label)
    );
  });

  it('should render a one-line description under each label', () => {
    const rows = queryOptionRows();
    expect(
      rows.map(r => r.querySelector('.dlc-status-filter__description')?.textContent?.trim())
    ).toEqual(CG_STATUS_FILTER_OPTIONS.map(o => o.description));
  });

  it('should group the rows under Active listings / Pending category headers', () => {
    const headers = queryGroupHeaders();
    expect(headers.map(h => h.textContent?.trim())).toEqual(['Active listings', 'Pending']);

    // The three active-category rows render under the first header's group.
    const activeGroup = headers[0].parentElement as HTMLElement;
    const activeValues = Array.from(
      activeGroup.querySelectorAll('[data-testid^="status-option-"]')
    ).map(r => r.getAttribute('data-testid'));
    expect(activeValues).toEqual([
      'status-option-Active',
      'status-option-ActiveUnderContract',
      'status-option-ComingSoon',
    ]);

    const pendingGroup = headers[1].parentElement as HTMLElement;
    expect(pendingGroup.querySelectorAll('[data-testid^="status-option-"]').length).toBe(1);
  });

  it('should check the boxes for the selected input values', () => {
    fixture.componentRef.setInput('selected', ['Active', 'ComingSoon']);
    fixture.detectChanges();

    expect(queryCheckbox('Active').checked).toBe(true);
    expect(queryCheckbox('ComingSoon').checked).toBe(true);
    expect(queryCheckbox('Pending').checked).toBe(false);
  });

  it('should emit the selection plus the toggled status on check', () => {
    fixture.componentRef.setInput('selected', ['Active']);
    fixture.detectChanges();

    toggleViaChange('Pending');
    expect(emissions.pop()).toEqual(['Active', 'Pending']);
  });

  it('should emit the selection minus the toggled status on uncheck', () => {
    fixture.componentRef.setInput('selected', ['Active', 'Pending']);
    fixture.detectChanges();

    toggleViaChange('Active');
    expect(emissions.pop()).toEqual(['Pending']);
  });

  it('should preserve options ordering in emissions regardless of toggle order', () => {
    fixture.componentRef.setInput('selected', ['Pending']);
    fixture.detectChanges();

    toggleViaChange('ActiveUnderContract');
    // 'ActiveUnderContract' precedes 'Pending' in the options list.
    expect(emissions.pop()).toEqual(['ActiveUnderContract', 'Pending']);
  });

  it('should emit every option value on Select All', () => {
    queryAction('status-select-all').click();
    expect(emissions.pop()).toEqual(CG_STATUS_FILTER_OPTIONS.map(o => o.value));
  });

  it('should emit an empty selection on Clear All', () => {
    fixture.componentRef.setInput('selected', ['Active', 'Pending']);
    fixture.detectChanges();

    queryAction('status-clear-all').click();
    expect(emissions.pop()).toEqual([]);
  });

  it('should disable Clear All when nothing is selected', () => {
    const clearAll = queryAction('status-clear-all');
    expect(clearAll.querySelector('button')?.disabled).toBe(true);

    fixture.componentRef.setInput('selected', ['Active']);
    fixture.detectChanges();
    expect(clearAll.querySelector('button')?.disabled).toBe(false);
  });

  it('should emit exactly the three active-category statuses on Active Only', () => {
    fixture.componentRef.setInput('selected', ['Pending']);
    fixture.detectChanges();

    queryAction('status-active-only').click();
    expect(emissions.pop()).toEqual(CG_STATUS_FILTER_ACTIVE_ONLY);
    expect(CG_STATUS_FILTER_ACTIVE_ONLY).toEqual(['Active', 'ActiveUnderContract', 'ComingSoon']);
  });

  it('should mark the Active Only preset active only on an exact selection match', () => {
    fixture.componentRef.setInput('selected', ['ComingSoon', 'ActiveUnderContract', 'Active']);
    fixture.detectChanges();
    expect(queryAction('status-active-only').classList).toContain('dlc-button--primary');

    fixture.componentRef.setInput('selected', ['Active', 'Pending']);
    fixture.detectChanges();
    expect(queryAction('status-active-only').classList).toContain('dlc-button--ghost');
  });

  it('should render the selection count footer only when statuses are selected', () => {
    expect(fixture.nativeElement.querySelector('[data-testid="status-count"]')).toBeNull();

    fixture.componentRef.setInput('selected', ['Active']);
    fixture.detectChanges();
    expect(queryAction('status-count').textContent).toContain('1 status selected');

    fixture.componentRef.setInput('selected', ['Active', 'Pending']);
    fixture.detectChanges();
    expect(queryAction('status-count').textContent).toContain('2 statuses selected');
  });

  it('should render custom options instead of the defaults', () => {
    const custom: DlcStatusFilterOption[] = [
      { category: 'On market', description: 'For sale', label: 'Live', value: 'Active' },
      { category: 'Closed', description: 'Sold and closed', label: 'Sold', value: 'Closed' },
    ];
    fixture.componentRef.setInput('options', custom);
    fixture.detectChanges();

    const rows = queryOptionRows();
    expect(rows.length).toBe(2);
    expect(rows.map(r => r.querySelector('.dlc-status-filter__label')?.textContent?.trim())).toEqual(
      ['Live', 'Sold']
    );
    expect(queryGroupHeaders().map(h => h.textContent?.trim())).toEqual(['On market', 'Closed']);

    queryAction('status-select-all').click();
    expect(emissions.pop()).toEqual(['Active', 'Closed']);
  });

  it('should apply the selected row modifier class to checked rows', () => {
    fixture.componentRef.setInput('selected', ['ComingSoon']);
    fixture.detectChanges();

    const row = fixture.nativeElement.querySelector(
      '[data-testid="status-option-ComingSoon"]'
    ) as HTMLElement;
    expect(row.classList.contains('dlc-status-filter__option--selected')).toBe(true);
  });
});
