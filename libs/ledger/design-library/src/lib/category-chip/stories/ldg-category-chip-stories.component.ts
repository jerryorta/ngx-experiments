import type { WritableSignal } from '@angular/core';

import { Component, Input, signal, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import type { Category } from '@nge/ledger-models';

import { LdgCategoryChipComponent } from '../ldg-category-chip.component';

// A small hand-built palette spanning the 8-slot category accent scale plus
// one income category — enough to eyeball every accent color at once.
// Not sourced from @nge/ledger-mocks: the design library only depends on
// @nge/ledger-models (the type), never the mock data.
const CATEGORIES: readonly Category[] = [
  { accent: 'var(--ldg-category-1)', icon: 'shopping_cart', id: 'cat-groceries', kind: 'expense', name: 'Groceries' },
  { accent: 'var(--ldg-category-2)', icon: 'restaurant', id: 'cat-dining', kind: 'expense', name: 'Dining' },
  { accent: 'var(--ldg-category-3)', icon: 'home', id: 'cat-housing', kind: 'expense', name: 'Housing' },
  {
    accent: 'var(--ldg-category-4)',
    icon: 'directions_car',
    id: 'cat-transportation',
    kind: 'expense',
    name: 'Transportation',
  },
  { accent: 'var(--ldg-category-5)', icon: 'bolt', id: 'cat-utilities', kind: 'expense', name: 'Utilities' },
  { accent: 'var(--ldg-category-6)', icon: 'health_and_safety', id: 'cat-health', kind: 'expense', name: 'Health' },
  { accent: 'var(--ldg-category-7)', icon: 'movie', id: 'cat-entertainment', kind: 'expense', name: 'Entertainment' },
  { accent: 'var(--ldg-category-8)', icon: 'shopping_bag', id: 'cat-shopping', kind: 'expense', name: 'Shopping' },
  { accent: 'var(--ldg-money-positive)', icon: 'payments', id: 'cat-salary', kind: 'income', name: 'Salary' },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-category-chip-stories' },
  imports: [LdgCategoryChipComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-category-chip-stories',
  standalone: true,
  styleUrl: './ldg-category-chip-stories.component.scss',
  templateUrl: './ldg-category-chip-stories.component.html',
})
export class LdgCategoryChipStoriesComponent {
  readonly demoCategory: Category = CATEGORIES[0];
  readonly allCategories = CATEGORIES;

  readonly selectedSig: WritableSignal<boolean> = signal(false);
  readonly clickSelectedIdSig: WritableSignal<null | string> = signal(null);

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/category-chip/stories';

  @Input()
  set selected(v: boolean) {
    this.selectedSig.set(v);
  }

  protected onToggled(category: Category): void {
    this.clickSelectedIdSig.update(current => (current === category.id ? null : category.id));
  }
}
