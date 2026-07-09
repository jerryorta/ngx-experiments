import type { ComponentFixture } from '@angular/core/testing';

import { OverlayContainer } from '@angular/cdk/overlay';
import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import type { DlcSortDirection, DlcSortField, DlcSortSelection } from './dlc-sort-control.component';

import { DlcSortControlComponent } from './dlc-sort-control.component';

@Component({
  imports: [DlcSortControlComponent],
  template: `
    <dlc-sort-control
      [field]="field()"
      [direction]="direction()"
      (sortChange)="onSortChange($event)"
    />
  `,
})
class HostComponent {
  readonly direction = signal<DlcSortDirection>('asc');
  readonly field = signal<DlcSortField | null>(null);

  readonly emissions: DlcSortSelection[] = [];

  /** Reflects emissions back into the inputs — the controlled-component contract. */
  onSortChange(sort: DlcSortSelection): void {
    this.emissions.push(sort);
    this.field.set(sort.field);
    this.direction.set(sort.direction);
  }
}

describe('DlcSortControlComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  let overlayContainer: OverlayContainer;
  let containerEl: HTMLElement;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    overlayContainer = TestBed.inject(OverlayContainer);
    containerEl = overlayContainer.getContainerElement();
    fixture.detectChanges();
  });

  afterEach(() => {
    overlayContainer.ngOnDestroy();
  });

  function trigger(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[data-testid="sort-control-trigger"]');
  }

  function openPanel(): void {
    trigger().click();
    fixture.detectChanges();
  }

  function panel(): HTMLElement | null {
    return containerEl.querySelector('.dlc-sort-control__card');
  }

  function fieldButton(field: DlcSortField): HTMLElement {
    const el = containerEl.querySelector<HTMLElement>(`[data-testid="sort-field-${field}"]`);
    if (!el) throw new Error(`No sort-field button for "${field}"`);
    return el;
  }

  function directionButton(direction: DlcSortDirection): HTMLElement | null {
    return containerEl.querySelector<HTMLElement>(`[data-testid="sort-direction-${direction}"]`);
  }

  it('should create with the dlc-sort-control host class', () => {
    const el: HTMLElement = fixture.nativeElement.querySelector('dlc-sort-control');
    expect(el.classList.contains('dlc-sort-control')).toBe(true);
  });

  it('shows the default label on the trigger while no field is selected', () => {
    expect(trigger().textContent).toContain('Sort: Newest');
    expect(trigger().classList).not.toContain('dlc-sort-control__trigger--active');
  });

  it('opens the panel with all six default fields on trigger click', () => {
    openPanel();

    expect(panel()).toBeTruthy();
    const labels = Array.from(containerEl.querySelectorAll('[data-testid^="sort-field-"]'), el =>
      el.textContent?.trim()
    );
    expect(labels).toEqual(['Price', 'Beds', 'Baths', 'Sq Ft', 'Lot Size', 'Year Built']);
  });

  it('closes on a second trigger click', () => {
    openPanel();
    trigger().click();
    fixture.detectChanges();

    expect(panel()).toBeFalsy();
  });

  it('closes on backdrop click', () => {
    openPanel();

    containerEl.querySelector<HTMLElement>('.dlc-sort-control__backdrop')?.click();
    fixture.detectChanges();

    expect(panel()).toBeFalsy();
  });

  it('emits the field ascending on first selection', () => {
    openPanel();

    fieldButton('price').click();
    fixture.detectChanges();

    expect(host.emissions.pop()).toEqual({ direction: 'asc', field: 'price' });
  });

  it('flips the direction when the selected field is clicked again', () => {
    host.field.set('price');
    host.direction.set('asc');
    fixture.detectChanges();
    openPanel();

    fieldButton('price').click();
    fixture.detectChanges();
    expect(host.emissions.pop()).toEqual({ direction: 'desc', field: 'price' });

    fieldButton('price').click();
    fixture.detectChanges();
    expect(host.emissions.pop()).toEqual({ direction: 'asc', field: 'price' });
  });

  it('switching to a new field resets the direction to ascending', () => {
    host.field.set('price');
    host.direction.set('desc');
    fixture.detectChanges();
    openPanel();

    fieldButton('year').click();
    fixture.detectChanges();

    expect(host.emissions.pop()).toEqual({ direction: 'asc', field: 'year' });
  });

  it('hides the direction toggle until a field is selected', () => {
    openPanel();
    expect(directionButton('asc')).toBeNull();
    expect(directionButton('desc')).toBeNull();

    fieldButton('beds').click();
    fixture.detectChanges();

    expect(directionButton('asc')).toBeTruthy();
    expect(directionButton('desc')).toBeTruthy();
  });

  it('emits the selected field with the chosen direction from the toggle', () => {
    host.field.set('sqft');
    host.direction.set('asc');
    fixture.detectChanges();
    openPanel();

    directionButton('desc')?.click();
    fixture.detectChanges();

    expect(host.emissions.pop()).toEqual({ direction: 'desc', field: 'sqft' });
  });

  it('does not re-emit when the active direction is clicked again', () => {
    host.field.set('sqft');
    host.direction.set('desc');
    fixture.detectChanges();
    openPanel();

    directionButton('desc')?.click();
    fixture.detectChanges();

    expect(host.emissions).toEqual([]);
  });

  it('Clear emits a null field and closes the panel', () => {
    host.field.set('lot');
    host.direction.set('desc');
    fixture.detectChanges();
    openPanel();

    containerEl.querySelector<HTMLElement>('[data-testid="sort-clear"]')?.click();
    fixture.detectChanges();

    expect(host.emissions.pop()).toEqual({ direction: 'asc', field: null });
    expect(panel()).toBeFalsy();
  });

  it('Done closes the panel without emitting', () => {
    openPanel();

    containerEl.querySelector<HTMLElement>('[data-testid="sort-done"]')?.click();
    fixture.detectChanges();

    expect(host.emissions).toEqual([]);
    expect(panel()).toBeFalsy();
  });

  it('reflects the selected field + direction on the trigger', () => {
    host.field.set('price');
    host.direction.set('desc');
    fixture.detectChanges();

    expect(trigger().textContent).toContain('Sort: Price');
    expect(trigger().classList).toContain('dlc-sort-control__trigger--active');
    expect(
      trigger().querySelector('[data-testid="sort-trigger-direction"]')?.textContent
    ).toContain('arrow_downward');
  });

  it('marks the selected field row in the open panel', () => {
    host.field.set('baths');
    fixture.detectChanges();
    openPanel();

    expect(fieldButton('baths').classList).toContain('dlc-sort-control__field--selected');
    expect(fieldButton('price').classList).not.toContain('dlc-sort-control__field--selected');
  });
});
