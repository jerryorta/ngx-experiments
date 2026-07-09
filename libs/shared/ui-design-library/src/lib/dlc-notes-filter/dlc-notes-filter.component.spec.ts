import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import { DlcNotesFilterComponent } from './dlc-notes-filter.component';

describe('DlcNotesFilterComponent', () => {
  let component: DlcNotesFilterComponent;
  let fixture: ComponentFixture<DlcNotesFilterComponent>;
  let emissions: boolean[];

  function queryCheckbox(): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="notes-toggle"] input[type="checkbox"]'
    );
  }

  function queryBadge(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="notes-count"]');
  }

  function toggleViaChange(): void {
    const checkbox = queryCheckbox();
    checkbox.checked = !checkbox.checked;
    checkbox.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcNotesFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcNotesFilterComponent);
    component = fixture.componentInstance;
    emissions = [];
    component.enabledChange.subscribe((enabled: boolean) => emissions.push(enabled));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply the dlc-notes-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-notes-filter')).toBe(true);
  });

  it('should default to unchecked', () => {
    expect(queryCheckbox().checked).toBe(false);
  });

  it('should reflect the enabled input on the checkbox', () => {
    fixture.componentRef.setInput('enabled', true);
    fixture.detectChanges();
    expect(queryCheckbox().checked).toBe(true);
  });

  it('should emit true when toggled on', () => {
    toggleViaChange();
    expect(emissions.pop()).toBe(true);
  });

  it('should emit false when toggled off', () => {
    fixture.componentRef.setInput('enabled', true);
    fixture.detectChanges();

    toggleViaChange();
    expect(emissions.pop()).toBe(false);
  });

  it('should hide the count badge when count is null (default)', () => {
    expect(queryBadge()).toBeNull();
  });

  it('should render the count badge with the notes count', () => {
    fixture.componentRef.setInput('count', 3);
    fixture.detectChanges();

    const badge = queryBadge();
    expect(badge).not.toBeNull();
    expect(badge?.textContent?.trim()).toContain('3');
  });

  it('should render a zero count badge (no noted properties in the current results)', () => {
    fixture.componentRef.setInput('count', 0);
    fixture.detectChanges();
    expect(queryBadge()).not.toBeNull();
  });
});
