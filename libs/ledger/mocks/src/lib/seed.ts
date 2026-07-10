import type {
  Account,
  Bill,
  Budget,
  Category,
  Transaction,
} from '@nge/ledger-models';
import { ledgerAccounts } from './accounts.seed';
import { ledgerBills } from './bills.seed';
import { ledgerBudgets } from './budgets.seed';
import { ledgerCategories } from './categories.seed';
import { ledgerTransactions } from './transactions.seed';

/**
 * Deterministic seed dataset for the Ledger demo.
 * Contains accounts, categories, transactions (Feb-Jul 2026),
 * budgets, and bills for testing charts and data flows.
 */
export const ledgerSeed = {
  accounts: ledgerAccounts,
  bills: ledgerBills,
  budgets: ledgerBudgets,
  categories: ledgerCategories,
  transactions: ledgerTransactions,
} as const;

// Re-export named constants for direct access
export type { Account, Bill, Budget, Category, Transaction };
export {
  ledgerAccounts,
  ledgerBills,
  ledgerBudgets,
  ledgerCategories,
  ledgerTransactions,
};
