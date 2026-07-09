import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { DlcStarRating } from '../dlc-star-rating/dlc-star-rating.component';

import { DlcRatingsFilterComponent } from './dlc-ratings-filter.component';

describe('DlcRatingsFilterComponent', () => {
  let component: DlcRatingsFilterComponent;
  let fixture: ComponentFixture<DlcRatingsFilterComponent>;
  let emissions: DlcStarRating[][];

  function queryRowCheckbox(rating: DlcStarRating): HTMLInputElement {
    return fixture.nativeElement.querySelector(
      `[data-testid="ratings-option-${rating}"] input[type="checkbox"]`
    );
  }

  function queryBadge(rating: DlcStarRating): HTMLElement | null {
    return fixture.nativeElement.querySelector(`[data-testid="ratings-count-${rating}"]`);
  }

  function querySelectAll(): HTMLElement {
    return fixture.nativeElement.querySelector('[data-testid="ratings-select-all"] button');
  }

  function queryClearAll(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('[data-testid="ratings-clear-all"] button');
  }

  function querySummary(): HTMLElement | null {
    return fixture.nativeElement.querySelector('[data-testid="ratings-count"]');
  }

  function toggleRow(rating: DlcStarRating): void {
    const cb = queryRowCheckbox(rating);
    cb.checked = !cb.checked;
    cb.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DlcRatingsFilterComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(DlcRatingsFilterComponent);
    component = fixture.componentInstance;
    emissions = [];
    component.selectedChange.subscribe((next: DlcStarRating[]) => emissions.push(next));
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should apply the dlc-ratings-filter host class', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.classList.contains('dlc-ratings-filter')).toBe(true);
  });

  it('should render one row per star rating, top-down 5 → 1', () => {
    const rows = fixture.nativeElement.querySelectorAll(
      '[data-testid^="ratings-option-"]'
    ) as NodeListOf<HTMLElement>;
    const testIds = Array.from(rows).map(r => r.getAttribute('data-testid'));
    expect(testIds).toEqual([
      'ratings-option-5',
      'ratings-option-4',
      'ratings-option-3',
      'ratings-option-2',
      'ratings-option-1',
    ]);
  });

  it('should default to no selection (every row unchecked, no summary)', () => {
    for (const r of [1, 2, 3, 4, 5] as DlcStarRating[]) {
      expect(queryRowCheckbox(r).checked).toBe(false);
    }
    expect(querySummary()).toBeNull();
  });

  it('should reflect the selected input on the matching row checkboxes', () => {
    fixture.componentRef.setInput('selected', [3, 5]);
    fixture.detectChanges();
    expect(queryRowCheckbox(5).checked).toBe(true);
    expect(queryRowCheckbox(3).checked).toBe(true);
    expect(queryRowCheckbox(4).checked).toBe(false);
  });

  it('should render zero counts when counts input omitted', () => {
    for (const r of [1, 2, 3, 4, 5] as DlcStarRating[]) {
      expect(queryBadge(r)?.textContent?.trim()).toContain('0');
    }
  });

  it('should render per-bucket counts from the counts input', () => {
    fixture.componentRef.setInput('counts', { 1: 1, 3: 7, 5: 12 });
    fixture.detectChanges();
    expect(queryBadge(5)?.textContent?.trim()).toContain('12');
    expect(queryBadge(3)?.textContent?.trim()).toContain('7');
    expect(queryBadge(1)?.textContent?.trim()).toContain('1');
    // Missing keys fall back to 0.
    expect(queryBadge(4)?.textContent?.trim()).toContain('0');
    expect(queryBadge(2)?.textContent?.trim()).toContain('0');
  });

  it('should emit selection in descending-rating order when a row is toggled on', () => {
    fixture.componentRef.setInput('selected', [5]);
    fixture.detectChanges();
    toggleRow(3);
    // Descending row order preserved in the emit: [5, 3].
    expect(emissions.pop()).toEqual([5, 3]);
  });

  it('should emit selection without the rating when an already-selected row is toggled off', () => {
    fixture.componentRef.setInput('selected', [5, 4, 3]);
    fixture.detectChanges();
    toggleRow(4);
    expect(emissions.pop()).toEqual([5, 3]);
  });

  it('should emit every rating on Select All', () => {
    querySelectAll().click();
    fixture.detectChanges();
    expect(emissions.pop()).toEqual([5, 4, 3, 2, 1]);
  });

  it('should emit [] on Clear All when ratings are selected', () => {
    fixture.componentRef.setInput('selected', [4, 2]);
    fixture.detectChanges();
    queryClearAll().click();
    fixture.detectChanges();
    expect(emissions.pop()).toEqual([]);
  });

  it('should NOT emit on Clear All when nothing is selected', () => {
    queryClearAll().click();
    fixture.detectChanges();
    expect(emissions).toEqual([]);
  });

  it('should render the selection summary when ratings are selected', () => {
    fixture.componentRef.setInput('selected', [5]);
    fixture.detectChanges();
    expect(querySummary()?.textContent?.trim()).toBe('1 rating selected');

    fixture.componentRef.setInput('selected', [5, 4]);
    fixture.detectChanges();
    expect(querySummary()?.textContent?.trim()).toBe('2 ratings selected');
  });
});
