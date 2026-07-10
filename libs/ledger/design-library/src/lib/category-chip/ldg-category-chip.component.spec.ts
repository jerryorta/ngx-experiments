import type { ComponentFixture } from '@angular/core/testing';

import { TestBed } from '@angular/core/testing';

import type { Category } from '@nge/ledger-models';

import { LdgCategoryChipComponent } from './ldg-category-chip.component';

const category: Category = {
  accent: 'var(--ldg-category-1)',
  icon: 'shopping_cart',
  id: 'cat-groceries',
  kind: 'expense',
  name: 'Groceries',
};

describe('LdgCategoryChipComponent', () => {
  let fixture: ComponentFixture<LdgCategoryChipComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LdgCategoryChipComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(LdgCategoryChipComponent);
    fixture.componentRef.setInput('category', category);
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders the category name', () => {
    const el: HTMLElement = fixture.nativeElement;
    expect(el.textContent).toContain('Groceries');
  });

  it("renders the accent dot using category.accent as its background color", () => {
    const dot = fixture.nativeElement.querySelector('.ldg-category-chip__dot') as HTMLElement;
    expect(dot.style.backgroundColor).toContain('var(--ldg-category-1)');
  });

  it('renders the icon when category.icon is set', () => {
    const icon = fixture.nativeElement.querySelector('.ldg-category-chip__icon') as HTMLElement;
    expect(icon).not.toBeNull();
    expect(icon.textContent?.trim()).toBe('shopping_cart');
  });

  it('does not render an icon when category.icon is absent', () => {
    fixture.componentRef.setInput('category', { ...category, icon: undefined });
    fixture.detectChanges();
    const icon = fixture.nativeElement.querySelector('.ldg-category-chip__icon');
    expect(icon).toBeNull();
  });

  it('defaults to unselected', () => {
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('false');
    expect(button.classList.contains('ldg-category-chip__button--selected')).toBe(false);
  });

  it('reflects selected=true', () => {
    fixture.componentRef.setInput('selected', true);
    fixture.detectChanges();
    const button = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    expect(button.getAttribute('aria-pressed')).toBe('true');
    expect(button.classList.contains('ldg-category-chip__button--selected')).toBe(true);
  });

  it('emits toggled with the category on click', () => {
    let emitted: Category | undefined;
    fixture.componentInstance.toggled.subscribe(c => (emitted = c));

    (fixture.nativeElement.querySelector('button') as HTMLButtonElement).click();

    expect(emitted).toEqual(category);
  });
});
