import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';
import type { Category } from '@nge/ledger-models';

import { LdgBudgetCardComponent } from './ldg-budget-card.component';

const GROCERIES: Category = {
  accent: 'var(--ldg-category-1)',
  icon: 'shopping_cart',
  id: 'cat-groceries',
  kind: 'expense',
  name: 'Groceries',
};

describe('LdgBudgetCardComponent', () => {
  let component: LdgBudgetCardComponent;
  let fixture: ComponentFixture<LdgBudgetCardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgBudgetCardComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgBudgetCardComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('category', GROCERIES);
    fixture.componentRef.setInput('limitCents', 45000);
    fixture.componentRef.setInput('spentCents', 22500);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders the category name and the accent dot color', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-budget-card__name')?.textContent?.trim()).toBe('Groceries');
    const dot = el.querySelector('.ldg-budget-card__dot') as HTMLElement;
    expect(dot.style.backgroundColor).toContain('--ldg-category-1');
  });

  it('formats spent-of-limit with formatMoney', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-budget-card__spent')?.textContent?.trim()).toBe(
      '$225.00 of $450.00'
    );
  });

  it('computes pct under budget and shows the remaining amount as "left"', () => {
    expect(component.pct()).toBe(50);
    expect(component.isOver()).toBe(false);
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.ldg-budget-card__remaining')?.textContent?.trim()).toBe(
      '$225.00 left'
    );
  });

  it('passes pct through to the reused dlc-progress-bar', () => {
    const bar = fixture.nativeElement.querySelector('dlc-progress-bar');
    expect(bar?.getAttribute('aria-valuenow')).toBe('50');
  });

  it('clamps pct at 100 and flags the over-budget state once spent exceeds the limit', () => {
    fixture.componentRef.setInput('spentCents', 60000);
    fixture.detectChanges();

    expect(component.pct()).toBe(100);
    expect(component.isOver()).toBe(true);

    const el: HTMLElement = fixture.nativeElement;
    expect(
      el.querySelector('.ldg-budget-card__card')?.classList.contains('ldg-budget-card__card--over')
    ).toBe(true);
    const remaining = el.querySelector('.ldg-budget-card__remaining');
    expect(remaining?.classList.contains('ldg-budget-card__remaining--over')).toBe(true);
    expect(remaining?.textContent?.trim()).toBe('$150.00 over');
  });

  it('does not flag over-budget when spent exactly equals the limit', () => {
    fixture.componentRef.setInput('spentCents', 45000);
    fixture.detectChanges();

    expect(component.pct()).toBe(100);
    expect(component.isOver()).toBe(false);
    expect(fixture.nativeElement.querySelector('.ldg-budget-card__remaining')?.textContent?.trim()).toBe(
      '$0.00 left'
    );
  });

  it('guards against a zero limit', () => {
    fixture.componentRef.setInput('limitCents', 0);
    fixture.componentRef.setInput('spentCents', 0);
    fixture.detectChanges();
    expect(component.pct()).toBe(0);
    expect(component.isOver()).toBe(false);

    fixture.componentRef.setInput('spentCents', 100);
    fixture.detectChanges();
    expect(component.pct()).toBe(100);
    expect(component.isOver()).toBe(true);
  });
});
