import { createEntityAdapter, type EntityAdapter, type EntityState } from '@ngrx/entity';
import { createFeature, createReducer, createSelector, on } from '@ngrx/store';

import type { Account, Bill, Budget, Category, Transaction } from '@nge/ledger-models';

import { budgetVsActual, cashflow, netWorthSeries, spendingByCategory } from '@nge/ledger-utils';

import { LedgerActions } from './ledger.actions';

/** Where the mock "backend" load stands. */
export type LedgerStatus = 'idle' | 'loading' | 'loaded' | 'error';

/** The Ledger feature's root shape: one `@ngrx/entity` collection per model, plus load status. */
export interface LedgerState {
  accounts: EntityState<Account>;
  bills: EntityState<Bill>;
  budgets: EntityState<Budget>;
  categories: EntityState<Category>;
  error: string | null;
  status: LedgerStatus;
  transactions: EntityState<Transaction>;
}

// Every model's `id` field is exactly what EntityAdapter's default selectId
// expects, so none of these need a custom selectId/sortComparer.
const accountsAdapter: EntityAdapter<Account> = createEntityAdapter<Account>();
const billsAdapter: EntityAdapter<Bill> = createEntityAdapter<Bill>();
const budgetsAdapter: EntityAdapter<Budget> = createEntityAdapter<Budget>();
const categoriesAdapter: EntityAdapter<Category> = createEntityAdapter<Category>();
const transactionsAdapter: EntityAdapter<Transaction> = createEntityAdapter<Transaction>();

const initialState: LedgerState = {
  accounts: accountsAdapter.getInitialState(),
  bills: billsAdapter.getInitialState(),
  budgets: budgetsAdapter.getInitialState(),
  categories: categoriesAdapter.getInitialState(),
  error: null,
  status: 'idle',
  transactions: transactionsAdapter.getInitialState(),
};

/**
 * The global Ledger slice — classic `@ngrx/store` + `@ngrx/entity`,
 * registered app-wide via `provideLedgerStore()`. Components should go
 * through `LedgerFacade`, not these selectors directly.
 */
export const ledgerFeature = createFeature({
  name: 'ledger',
  reducer: createReducer(
    initialState,
    on(LedgerActions.load, (state): LedgerState => ({ ...state, status: 'loading' })),
    on(
      LedgerActions.loadSuccess,
      (state, { seed }): LedgerState => ({
        accounts: accountsAdapter.setAll(seed.accounts, state.accounts),
        bills: billsAdapter.setAll(seed.bills, state.bills),
        budgets: budgetsAdapter.setAll(seed.budgets, state.budgets),
        categories: categoriesAdapter.setAll(seed.categories, state.categories),
        error: null,
        status: 'loaded',
        transactions: transactionsAdapter.setAll(seed.transactions, state.transactions),
      })
    ),
    on(LedgerActions.loadFailure, (state, { error }): LedgerState => ({ ...state, error, status: 'error' }))
  ),
  extraSelectors: ({ selectAccounts, selectBills, selectBudgets, selectCategories, selectTransactions }) => {
    const accountsSelectors = accountsAdapter.getSelectors(selectAccounts);
    const billsSelectors = billsAdapter.getSelectors(selectBills);
    const budgetsSelectors = budgetsAdapter.getSelectors(selectBudgets);
    const categoriesSelectors = categoriesAdapter.getSelectors(selectCategories);
    const transactionsSelectors = transactionsAdapter.getSelectors(selectTransactions);

    const selectAllAccounts = accountsSelectors.selectAll;
    const selectAllBills = billsSelectors.selectAll;
    const selectAllBudgets = budgetsSelectors.selectAll;
    const selectAllCategories = categoriesSelectors.selectAll;
    const selectAllTransactions = transactionsSelectors.selectAll;

    return {
      selectAccountEntities: accountsSelectors.selectEntities,
      selectAllAccounts,
      selectAllBills,
      selectAllBudgets,
      selectAllCategories,
      selectAllTransactions,
      selectBillEntities: billsSelectors.selectEntities,
      selectBudgetEntities: budgetsSelectors.selectEntities,
      selectCategoryEntities: categoriesSelectors.selectEntities,
      selectTransactionEntities: transactionsSelectors.selectEntities,

      // Derived selectors — thin, memoized wrappers over `@nge/ledger-utils`'
      // pure aggregations. This is the only place those functions get called.
      selectBudgetVsActual: (month: string) =>
        createSelector(selectAllBudgets, selectAllTransactions, (budgets, transactions) =>
          budgetVsActual(budgets, transactions, month)
        ),
      selectCashflow: createSelector(selectAllTransactions, transactions => cashflow(transactions)),
      selectNetWorthSeries: createSelector(selectAllAccounts, selectAllTransactions, (accounts, transactions) =>
        netWorthSeries(accounts, transactions)
      ),
      selectSpendingByCategory: createSelector(selectAllTransactions, selectAllCategories, (transactions, categories) =>
        spendingByCategory(transactions, categories)
      ),
    };
  },
});
