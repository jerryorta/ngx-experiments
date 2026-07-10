import type { Budget } from '@nge/ledger-models';

export const ledgerBudgets: Budget[] = [
  // July 2026 budgets for expense categories
  {
    id: 'budget-2026-07-groceries',
    categoryId: 'cat-groceries',
    month: '2026-07',
    limitCents: 45000, // $450
  },
  {
    id: 'budget-2026-07-dining',
    categoryId: 'cat-dining',
    month: '2026-07',
    limitCents: 35000, // $350
  },
  {
    id: 'budget-2026-07-housing',
    categoryId: 'cat-housing',
    month: '2026-07',
    limitCents: 150000, // $1500
  },
  {
    id: 'budget-2026-07-transportation',
    categoryId: 'cat-transportation',
    month: '2026-07',
    limitCents: 35000, // $350
  },
  {
    id: 'budget-2026-07-utilities',
    categoryId: 'cat-utilities',
    month: '2026-07',
    limitCents: 15000, // $150
  },
  {
    id: 'budget-2026-07-health',
    categoryId: 'cat-health',
    month: '2026-07',
    limitCents: 12000, // $120
  },
  {
    id: 'budget-2026-07-entertainment',
    categoryId: 'cat-entertainment',
    month: '2026-07',
    limitCents: 18000, // $180
  },
  {
    id: 'budget-2026-07-shopping',
    categoryId: 'cat-shopping',
    month: '2026-07',
    limitCents: 25000, // $250
  },

  // June 2026 budgets (optional, for trend data)
  {
    id: 'budget-2026-06-groceries',
    categoryId: 'cat-groceries',
    month: '2026-06',
    limitCents: 45000, // $450
  },
  {
    id: 'budget-2026-06-dining',
    categoryId: 'cat-dining',
    month: '2026-06',
    limitCents: 35000, // $350
  },
  {
    id: 'budget-2026-06-housing',
    categoryId: 'cat-housing',
    month: '2026-06',
    limitCents: 150000, // $1500
  },
  {
    id: 'budget-2026-06-transportation',
    categoryId: 'cat-transportation',
    month: '2026-06',
    limitCents: 35000, // $350
  },
  {
    id: 'budget-2026-06-utilities',
    categoryId: 'cat-utilities',
    month: '2026-06',
    limitCents: 15000, // $150
  },
  {
    id: 'budget-2026-06-health',
    categoryId: 'cat-health',
    month: '2026-06',
    limitCents: 12000, // $120
  },
  {
    id: 'budget-2026-06-entertainment',
    categoryId: 'cat-entertainment',
    month: '2026-06',
    limitCents: 18000, // $180
  },
  {
    id: 'budget-2026-06-shopping',
    categoryId: 'cat-shopping',
    month: '2026-06',
    limitCents: 25000, // $250
  },
];
