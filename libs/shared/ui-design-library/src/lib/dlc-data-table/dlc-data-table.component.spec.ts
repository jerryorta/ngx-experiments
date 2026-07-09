import type { ComponentFixture } from '@angular/core/testing';

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { DlcTableColumn, DlcTableGroup } from './dlc-data-table.component';

import { DlcCellDirective } from './dlc-cell.directive';
import { DlcDataTableComponent } from './dlc-data-table.component';

// ---------------------------------------------------------------------------
// TestHostComponent for dlcCell directive integration tests
// ---------------------------------------------------------------------------

@Component({
  imports: [DlcDataTableComponent, DlcCellDirective],
  standalone: true,
  template: `
    <dlc-data-table [columns]="columns" [rows]="rows">
      <ng-template dlcCell="status" let-row let-value="value">
        <span class="custom-status">{{ value }}</span>
      </ng-template>
    </dlc-data-table>
  `,
})
class TestHostComponent {
  columns: DlcTableColumn[] = [
    { key: 'name', label: 'Name' },
    { key: 'status', label: 'Status' },
  ];
  rows = [{ name: 'Alice', status: 'active' }];
}

@Component({
  imports: [DlcDataTableComponent, DlcCellDirective],
  standalone: true,
  template: `<dlc-data-table [columns]="columns" [rows]="rows">
    <ng-template dlcCell="name" let-value="value">{{ value }}</ng-template>
  </dlc-data-table>`,
})
class MinimalDirectiveHostComponent {
  columns: DlcTableColumn[] = [{ key: 'name', label: 'Name' }];
  rows = [{ name: 'Bob' }];
}

// ---------------------------------------------------------------------------
// Direct component tests
// ---------------------------------------------------------------------------

describe('DlcDataTableComponent', () => {
  let component: DlcDataTableComponent;
  let fixture: ComponentFixture<DlcDataTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcDataTableComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcDataTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply dlc-data-table host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-data-table')).toBe(true);
  });

  it('should render column headers', () => {
    const cols: DlcTableColumn[] = [
      { key: 'name', label: 'Name' },
      { key: 'email', label: 'Email' },
    ];
    fixture.componentRef.setInput('columns', cols);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const headers = el.querySelectorAll('th');
    expect(headers.length).toBe(2);
    expect(headers[0].textContent?.trim()).toBe('Name');
    expect(headers[1].textContent?.trim()).toBe('Email');
  });

  it('should render rows in flat mode', () => {
    const cols: DlcTableColumn[] = [{ key: 'id', label: 'ID' }];
    const rows = [{ id: 1 }, { id: 2 }, { id: 3 }];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const dataRows = el.querySelectorAll('tbody tr');
    expect(dataRows.length).toBe(3);
  });

  it('should render grouped rows with group header', () => {
    const cols: DlcTableColumn[] = [{ key: 'name', label: 'Name' }];
    const groups: DlcTableGroup[] = [
      { label: 'Group A', rows: [{ name: 'Alice' }, { name: 'Bob' }] },
    ];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('groups', groups);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const groupHeaderRow = el.querySelector('.dlc-data-table__group-header-row');
    expect(groupHeaderRow).toBeTruthy();
    expect(groupHeaderRow?.textContent?.trim()).toContain('Group A');

    const dataRows = el.querySelectorAll('tr.dlc-data-table__row');
    expect(dataRows.length).toBe(2);
  });

  it('should fall back to plain text for columns without cell template', () => {
    const cols: DlcTableColumn[] = [{ key: 'city', label: 'City' }];
    const rows = [{ city: 'Portland' }];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const cell = el.querySelector('td.dlc-data-table__cell');
    expect(cell?.textContent?.trim()).toBe('Portland');
  });

  it('should toggle group collapse', () => {
    const cols: DlcTableColumn[] = [{ key: 'name', label: 'Name' }];
    const groups: DlcTableGroup[] = [
      { collapsible: true, label: 'Collapsible Group', rows: [{ name: 'Alice' }] },
    ];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('groups', groups);
    fixture.detectChanges();

    expect(component.isGroupCollapsed('Collapsible Group')).toBe(false);

    component.toggleGroup('Collapsible Group');
    expect(component.isGroupCollapsed('Collapsible Group')).toBe(true);

    component.toggleGroup('Collapsible Group');
    expect(component.isGroupCollapsed('Collapsible Group')).toBe(false);
  });

  it('should apply sticky class to sticky columns', () => {
    const cols: DlcTableColumn[] = [
      { key: 'name', label: 'Name', sticky: true },
      { key: 'email', label: 'Email' },
    ];
    const rows = [{ email: 'alice@example.com', name: 'Alice' }];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('rows', rows);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const stickyHeaders = el.querySelectorAll('.dlc-data-table__header-cell--sticky');
    expect(stickyHeaders.length).toBe(1);

    const stickyCells = el.querySelectorAll('.dlc-data-table__cell--sticky');
    expect(stickyCells.length).toBeGreaterThan(0);

    const nonStickyCells = el.querySelectorAll(
      '.dlc-data-table__cell:not(.dlc-data-table__cell--sticky)'
    );
    expect(nonStickyCells.length).toBe(1);
  });

  it('should render accent color on group header accent span', () => {
    const cols: DlcTableColumn[] = [{ key: 'name', label: 'Name' }];
    const groups: DlcTableGroup[] = [
      { accentColor: 'rgb(255, 0, 0)', label: 'Colored Group', rows: [{ name: 'Alice' }] },
    ];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('groups', groups);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const accentSpan = el.querySelector<HTMLElement>('.dlc-data-table__group-header-accent');
    expect(accentSpan).toBeTruthy();
    expect(accentSpan?.style.backgroundColor).toBe('rgb(255, 0, 0)');
  });

  it('should set --dlc-group-accent-color CSS variable on group header row when accentColor is provided', () => {
    const cols: DlcTableColumn[] = [{ key: 'name', label: 'Name' }];
    const groups: DlcTableGroup[] = [
      { accentColor: '#6366F1', label: 'Accented Group', rows: [{ name: 'Alice' }] },
    ];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('groups', groups);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const headerRow = el.querySelector<HTMLElement>('.dlc-data-table__group-header-row');
    expect(headerRow).toBeTruthy();
    expect(headerRow?.style.getPropertyValue('--dlc-group-accent-color')).toBe('#6366F1');
  });

  it('should not set --dlc-group-accent-color CSS variable on group header row when accentColor is absent', () => {
    const cols: DlcTableColumn[] = [{ key: 'name', label: 'Name' }];
    const groups: DlcTableGroup[] = [
      { label: 'Plain Group', rows: [{ name: 'Bob' }] },
    ];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('groups', groups);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const headerRow = el.querySelector<HTMLElement>('.dlc-data-table__group-header-row');
    expect(headerRow).toBeTruthy();
    expect(headerRow?.style.getPropertyValue('--dlc-group-accent-color')).toBe('');
  });

  it('should set --dlc-group-accent-color to CSS variable string when accentColor uses var()', () => {
    const cols: DlcTableColumn[] = [{ key: 'name', label: 'Name' }];
    const groups: DlcTableGroup[] = [
      { accentColor: 'var(--dlc-primary)', label: 'Token Group', rows: [{ name: 'Carol' }] },
    ];
    fixture.componentRef.setInput('columns', cols);
    fixture.componentRef.setInput('groups', groups);
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const headerRow = el.querySelector<HTMLElement>('.dlc-data-table__group-header-row');
    expect(headerRow?.style.getPropertyValue('--dlc-group-accent-color')).toBe('var(--dlc-primary)');
  });
});

// ---------------------------------------------------------------------------
// TestHostComponent integration tests (dlcCell directive)
// ---------------------------------------------------------------------------

describe('DlcDataTableComponent — dlcCell directive integration', () => {
  let fixture: ComponentFixture<TestHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    fixture.detectChanges();
  });

  it('should render custom cell template when dlcCell matches column key', () => {
    const el: HTMLElement = fixture.nativeElement;
    const customCell = el.querySelector('.custom-status');
    expect(customCell).toBeTruthy();
  });

  it('should pass value to custom template context', () => {
    const el: HTMLElement = fixture.nativeElement;
    const customCell = el.querySelector('.custom-status');
    expect(customCell?.textContent?.trim()).toBe('active');
  });

  it('should render plain text for columns without dlcCell template', () => {
    const el: HTMLElement = fixture.nativeElement;
    const cells = el.querySelectorAll<HTMLTableCellElement>('td.dlc-data-table__cell');
    // First cell is the 'name' column — no custom template, so plain text
    const nameCell = cells[0];
    expect(nameCell?.textContent?.trim()).toBe('Alice');
  });
});

// ---------------------------------------------------------------------------
// DlcCellDirective standalone test
// ---------------------------------------------------------------------------

describe('DlcCellDirective', () => {
  let fixture: ComponentFixture<MinimalDirectiveHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MinimalDirectiveHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(MinimalDirectiveHostComponent);
    fixture.detectChanges();
  });

  it('should create DlcCellDirective', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });
});
