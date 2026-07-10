import type { Account, Bill, Budget, Category, Transaction } from '@nge/ledger-models';

import { LedgerActions } from './ledger.actions';
import type { LedgerSeed } from './ledger-seed.model';
import { ledgerFeature } from './ledger.feature';

const account: Account = {
  balanceCents: 1000,
  currency: 'USD',
  id: 'a1',
  institution: 'Chase',
  name: 'Checking',
  type: 'checking',
};
const category: Category = { accent: 'chart-1', id: 'c1', kind: 'expense', name: 'Groceries' };
const transaction: Transaction = {
  accountId: 'a1',
  amountCents: -500,
  categoryId: 'c1',
  date: '2026-01-05',
  id: 't1',
  merchant: 'Store',
};
const budget: Budget = { categoryId: 'c1', id: 'b1', limitCents: 10000, month: '2026-01' };
const bill: Bill = { amountCents: 2000, dueDate: '2026-01-15', id: 'bill1', name: 'Rent', recurrence: 'monthly' };

const seed: LedgerSeed = {
  accounts: [account],
  bills: [bill],
  budgets: [budget],
  categories: [category],
  transactions: [transaction],
};

describe('ledgerFeature', () => {
  describe('reducer', () => {
    it('starts idle with empty collections', () => {
      const state = ledgerFeature.reducer(undefined, { type: '[Test] Noop' });
      expect(state.status).toBe('idle');
      expect(state.accounts.ids).toEqual([]);
    });

    it('load sets status to loading', () => {
      const state = ledgerFeature.reducer(undefined, LedgerActions.load());
      expect(state.status).toBe('loading');
    });

    it('loadSuccess populates all five collections and sets status to loaded', () => {
      const state = ledgerFeature.reducer(undefined, LedgerActions.loadSuccess({ seed }));
      expect(state.status).toBe('loaded');
      expect(state.error).toBeNull();
      expect(state.accounts.ids).toEqual(['a1']);
      expect(state.accounts.entities['a1']).toEqual(account);
      expect(state.transactions.ids).toEqual(['t1']);
      expect(state.categories.ids).toEqual(['c1']);
      expect(state.budgets.ids).toEqual(['b1']);
      expect(state.bills.ids).toEqual(['bill1']);
    });

    it('loadFailure sets status to error and records the message', () => {
      const state = ledgerFeature.reducer(undefined, LedgerActions.loadFailure({ error: 'boom' }));
      expect(state.status).toBe('error');
      expect(state.error).toBe('boom');
    });
  });

  describe('selectors', () => {
    const rootState = { ledger: ledgerFeature.reducer(undefined, LedgerActions.loadSuccess({ seed })) };

    it('selectAllAccounts/Transactions/Categories/Budgets/Bills return the entity lists', () => {
      expect(ledgerFeature.selectAllAccounts(rootState)).toEqual([account]);
      expect(ledgerFeature.selectAllTransactions(rootState)).toEqual([transaction]);
      expect(ledgerFeature.selectAllCategories(rootState)).toEqual([category]);
      expect(ledgerFeature.selectAllBudgets(rootState)).toEqual([budget]);
      expect(ledgerFeature.selectAllBills(rootState)).toEqual([bill]);
    });

    it('selectAccountEntities exposes the id-keyed dictionary', () => {
      expect(ledgerFeature.selectAccountEntities(rootState)['a1']).toEqual(account);
    });

    it('selectSpendingByCategory delegates to the spendingByCategory util', () => {
      // The one transaction is -500 cents on the expense category c1.
      expect(ledgerFeature.selectSpendingByCategory(rootState)).toEqual([
        { accent: 'chart-1', categoryId: 'c1', name: 'Groceries', totalCents: 500 },
      ]);
    });

    it('selectCashflow delegates to the cashflow util', () => {
      expect(ledgerFeature.selectCashflow(rootState)).toEqual([
        { inflowCents: 0, netCents: -500, outflowCents: 500, period: '2026-01' },
      ]);
    });

    it('selectNetWorthSeries delegates to the netWorthSeries util', () => {
      expect(ledgerFeature.selectNetWorthSeries(rootState)).toEqual([{ date: '2026-01-05', valueCents: 1000 }]);
    });

    it('selectBudgetVsActual(month) delegates to the budgetVsActual util for that month', () => {
      expect(ledgerFeature.selectBudgetVsActual('2026-01')(rootState)).toEqual([
        { budgetCents: 10000, categoryId: 'c1', spentCents: 500 },
      ]);
      expect(ledgerFeature.selectBudgetVsActual('2026-02')(rootState)).toEqual([]);
    });
  });
});
