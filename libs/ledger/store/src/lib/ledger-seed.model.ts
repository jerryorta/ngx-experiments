import type { Account, Bill, Budget, Category, Transaction } from '@nge/ledger-models';

/**
 * The whole mock "backend" response: every entity collection arrives
 * together in one bulk load (there's no per-entity fetch — see
 * `LedgerActions.load`). Structurally matches `@nge/ledger-mocks`'
 * `ledgerSeed` constant.
 */
export interface LedgerSeed {
  accounts: Account[];
  bills: Bill[];
  budgets: Budget[];
  categories: Category[];
  transactions: Transaction[];
}
