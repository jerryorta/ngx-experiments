import type { Category } from '@nge/ledger-models';

export const ledgerCategories: Category[] = [
  // Income categories
  {
    id: 'cat-salary',
    name: 'Salary',
    kind: 'income',
    accent: 'var(--ldg-money-positive)',
    icon: 'payments',
  },
  {
    id: 'cat-interest',
    name: 'Interest',
    kind: 'income',
    accent: 'var(--ldg-money-positive)',
    icon: 'savings',
  },

  // Expense categories (slots 1-7 for distinct hues, slot 8 for catch-all)
  {
    id: 'cat-groceries',
    name: 'Groceries',
    kind: 'expense',
    accent: 'var(--ldg-category-1)',
    icon: 'shopping_cart',
  },
  {
    id: 'cat-dining',
    name: 'Dining',
    kind: 'expense',
    accent: 'var(--ldg-category-2)',
    icon: 'restaurant',
  },
  {
    id: 'cat-housing',
    name: 'Housing',
    kind: 'expense',
    accent: 'var(--ldg-category-3)',
    icon: 'home',
  },
  {
    id: 'cat-transportation',
    name: 'Transportation',
    kind: 'expense',
    accent: 'var(--ldg-category-4)',
    icon: 'directions_car',
  },
  {
    id: 'cat-utilities',
    name: 'Utilities',
    kind: 'expense',
    accent: 'var(--ldg-category-5)',
    icon: 'bolt',
  },
  {
    id: 'cat-health',
    name: 'Health',
    kind: 'expense',
    accent: 'var(--ldg-category-6)',
    icon: 'health_and_safety',
  },
  {
    id: 'cat-entertainment',
    name: 'Entertainment',
    kind: 'expense',
    accent: 'var(--ldg-category-7)',
    icon: 'movie',
  },
  {
    id: 'cat-shopping',
    name: 'Shopping',
    kind: 'expense',
    accent: 'var(--ldg-category-8)',
    icon: 'shopping_bag',
  },
];
