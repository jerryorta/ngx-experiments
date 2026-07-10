import type { WritableSignal } from '@angular/core';

import { Component, computed, Input, signal, ViewEncapsulation } from '@angular/core';
import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';

import type { Category } from '@nge/ledger-models';

import { LdgBudgetCardComponent } from '../ldg-budget-card.component';

interface BudgetState {
  category: Category;
  limitCents: number;
  spentCents: number;
}

const BUDGET_STATES: BudgetState[] = [
  {
    category: {
      accent: 'var(--ldg-category-1)',
      icon: 'shopping_cart',
      id: 'cat-groceries',
      kind: 'expense',
      name: 'Groceries',
    },
    limitCents: 45000,
    spentCents: 15000,
  },
  {
    category: {
      accent: 'var(--ldg-category-2)',
      icon: 'restaurant',
      id: 'cat-dining',
      kind: 'expense',
      name: 'Dining',
    },
    limitCents: 35000,
    spentCents: 31500,
  },
  {
    category: {
      accent: 'var(--ldg-category-5)',
      icon: 'bolt',
      id: 'cat-utilities',
      kind: 'expense',
      name: 'Utilities',
    },
    limitCents: 15000,
    spentCents: 15000,
  },
  {
    category: {
      accent: 'var(--ldg-category-7)',
      icon: 'movie',
      id: 'cat-entertainment',
      kind: 'expense',
      name: 'Entertainment',
    },
    limitCents: 18000,
    spentCents: 24000,
  },
];

@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'ldg-budget-card-stories' },
  imports: [LdgBudgetCardComponent, NgeStorybookReviewContainerComponent],
  selector: 'ldg-budget-card-stories',
  standalone: true,
  styleUrl: './ldg-budget-card-stories.component.scss',
  templateUrl: './ldg-budget-card-stories.component.html',
})
export class LdgBudgetCardStoriesComponent {
  readonly categoryNameSig: WritableSignal<string> = signal('Groceries');
  readonly accentIndexSig: WritableSignal<number> = signal(1);
  readonly limitCentsSig: WritableSignal<number> = signal(45000);
  readonly spentCentsSig: WritableSignal<number> = signal(22500);

  readonly category = computed<Category>(() => ({
    accent: `var(--ldg-category-${this.accentIndexSig()})`,
    icon: 'shopping_cart',
    id: 'cat-storybook',
    kind: 'expense',
    name: this.categoryNameSig(),
  }));

  readonly budgetStates = BUDGET_STATES;

  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/ledger/design-library/src/lib/budget-card/stories';

  @Input()
  set categoryName(v: string) {
    this.categoryNameSig.set(v);
  }

  @Input()
  set accentIndex(v: number) {
    this.accentIndexSig.set(v);
  }

  @Input()
  set limitCents(v: number) {
    this.limitCentsSig.set(v);
  }

  @Input()
  set spentCents(v: number) {
    this.spentCentsSig.set(v);
  }
}
