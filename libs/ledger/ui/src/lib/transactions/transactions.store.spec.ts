import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { LedgerFacade } from '@nge/ledger-store';
import { ledgerAccounts, ledgerCategories, ledgerTransactions } from '@nge/ledger-mocks';

import { TransactionsStore } from './transactions.store';

type Store = InstanceType<typeof TransactionsStore>;

// Stubbed facade — deterministic, and lets us assert filtering/sorting
// against the real seed data without a Store/effects round trip.
const fakeFacade = {
  accounts: signal(ledgerAccounts),
  categories: signal(ledgerCategories),
  transactions: signal(ledgerTransactions),
} as unknown as LedgerFacade;

function createStore(): Store {
  TestBed.configureTestingModule({
    providers: [TransactionsStore, { provide: LedgerFacade, useValue: fakeFacade }],
  });
  return TestBed.inject(TransactionsStore);
}

describe('TransactionsStore', () => {
  describe('initial state', () => {
    it('starts with no filters, the default sort, and every dialog/drawer closed', () => {
      const store = createStore();

      expect(store.searchQuery()).toBe('');
      expect(store.selectedCategoryIds()).toEqual([]);
      expect(store.dateRange()).toBeNull();
      expect(store.sort()).toEqual({ direction: 'desc', field: 'date' });
      expect(store.selectedRowId()).toBeNull();
      expect(store.dialogOpen()).toBe(false);
      expect(store.editDraft()).toBeNull();
      expect(store.hasActiveFilters()).toBe(false);
      expect(store.activeFilterCount()).toBe(0);
    });

    it('visibleTransactions defaults to every mock transaction, newest first', () => {
      const store = createStore();
      const visible = store.visibleTransactions();

      expect(visible.length).toBe(ledgerTransactions.length);
      for (let i = 1; i < visible.length; i++) {
        expect(visible[i - 1].date >= visible[i].date).toBe(true);
      }
    });
  });

  describe('search', () => {
    it('narrows to merchants matching the query, case-insensitively', () => {
      const store = createStore();
      store.setSearch('whole foods');

      const visible = store.visibleTransactions();
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.every(txn => txn.merchant.toLowerCase().includes('whole foods'))).toBe(true);
    });

    it('also matches against notes', () => {
      const store = createStore();
      store.setSearch('pending transaction');

      const visible = store.visibleTransactions();
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.every(txn => (txn.notes ?? '').toLowerCase().includes('pending transaction'))).toBe(true);
    });

    it('counts toward hasActiveFilters/activeFilterCount', () => {
      const store = createStore();
      store.setSearch('rent');

      expect(store.hasActiveFilters()).toBe(true);
      expect(store.activeFilterCount()).toBe(1);
    });

    it('blank/whitespace-only search does not count as an active filter', () => {
      const store = createStore();
      store.setSearch('   ');

      expect(store.hasActiveFilters()).toBe(false);
      expect(store.visibleTransactions().length).toBe(ledgerTransactions.length);
    });
  });

  describe('category filter', () => {
    it('toggling a category on narrows results to that category', () => {
      const store = createStore();
      store.toggleCategory('cat-groceries');

      expect(store.selectedCategoryIds()).toEqual(['cat-groceries']);
      const visible = store.visibleTransactions();
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.every(txn => txn.categoryId === 'cat-groceries')).toBe(true);
    });

    it('toggling the same category again removes it from the filter', () => {
      const store = createStore();
      store.toggleCategory('cat-groceries');
      store.toggleCategory('cat-groceries');

      expect(store.selectedCategoryIds()).toEqual([]);
      expect(store.visibleTransactions().length).toBe(ledgerTransactions.length);
    });

    it('multiple selected categories combine with OR semantics', () => {
      const store = createStore();
      store.toggleCategory('cat-groceries');
      store.toggleCategory('cat-dining');

      const visible = store.visibleTransactions();
      expect(visible.some(txn => txn.categoryId === 'cat-groceries')).toBe(true);
      expect(visible.some(txn => txn.categoryId === 'cat-dining')).toBe(true);
      expect(visible.every(txn => txn.categoryId === 'cat-groceries' || txn.categoryId === 'cat-dining')).toBe(true);
    });
  });

  describe('date-range filter', () => {
    it('keeps only transactions within the inclusive ISO bounds', () => {
      const store = createStore();
      store.setDateRange({ end: '2026-02-28', start: '2026-02-01' });

      const visible = store.visibleTransactions();
      expect(visible.length).toBeGreaterThan(0);
      expect(visible.every(txn => txn.date >= '2026-02-01' && txn.date <= '2026-02-28')).toBe(true);
    });

    it('clearDateRange removes the bound and restores the full list', () => {
      const store = createStore();
      store.setDateRange({ end: '2026-02-28', start: '2026-02-01' });
      store.clearDateRange();

      expect(store.dateRange()).toBeNull();
      expect(store.visibleTransactions().length).toBe(ledgerTransactions.length);
    });
  });

  describe('sort', () => {
    it('sorts by amount ascending then descending', () => {
      const store = createStore();

      store.setSort({ direction: 'asc', field: 'amount' });
      let visible = store.visibleTransactions();
      for (let i = 1; i < visible.length; i++) {
        expect(visible[i - 1].amountCents <= visible[i].amountCents).toBe(true);
      }

      store.setSort({ direction: 'desc', field: 'amount' });
      visible = store.visibleTransactions();
      for (let i = 1; i < visible.length; i++) {
        expect(visible[i - 1].amountCents >= visible[i].amountCents).toBe(true);
      }
    });

    it('sorts by merchant ascending then descending', () => {
      const store = createStore();

      store.setSort({ direction: 'asc', field: 'merchant' });
      let visible = store.visibleTransactions();
      for (let i = 1; i < visible.length; i++) {
        expect(visible[i - 1].merchant.localeCompare(visible[i].merchant)).toBeLessThanOrEqual(0);
      }

      store.setSort({ direction: 'desc', field: 'merchant' });
      visible = store.visibleTransactions();
      for (let i = 1; i < visible.length; i++) {
        expect(visible[i - 1].merchant.localeCompare(visible[i].merchant)).toBeGreaterThanOrEqual(0);
      }
    });

    it('sorts by date ascending then descending', () => {
      const store = createStore();

      store.setSort({ direction: 'asc', field: 'date' });
      let visible = store.visibleTransactions();
      for (let i = 1; i < visible.length; i++) {
        expect(visible[i - 1].date <= visible[i].date).toBe(true);
      }

      store.setSort({ direction: 'desc', field: 'date' });
      visible = store.visibleTransactions();
      for (let i = 1; i < visible.length; i++) {
        expect(visible[i - 1].date >= visible[i].date).toBe(true);
      }
    });
  });

  describe('row selection / drawer', () => {
    it('selectRow sets selectedRowId and resolves selectedRow to the matching transaction', () => {
      const store = createStore();
      const target = ledgerTransactions[0];

      store.selectRow(target.id);

      expect(store.selectedRowId()).toBe(target.id);
      expect(store.selectedRow()).toEqual(target);
    });

    it('selectedRow is null when nothing is selected', () => {
      const store = createStore();
      expect(store.selectedRow()).toBeNull();
    });

    it('closeDrawer clears the selection', () => {
      const store = createStore();
      store.selectRow(ledgerTransactions[0].id);

      store.closeDrawer();

      expect(store.selectedRowId()).toBeNull();
      expect(store.selectedRow()).toBeNull();
    });
  });

  describe('add/edit dialog', () => {
    it('openAddDialog opens the dialog with an empty draft', () => {
      const store = createStore();
      store.openAddDialog();

      expect(store.dialogOpen()).toBe(true);
      expect(store.editDraft()).toEqual({});
    });

    it('openEditDialog opens the dialog with a copy of the given transaction', () => {
      const store = createStore();
      const target = ledgerTransactions[0];

      store.openEditDialog(target);

      expect(store.dialogOpen()).toBe(true);
      expect(store.editDraft()).toEqual(target);
      expect(store.editDraft()).not.toBe(target); // a copy, never the live reference
    });

    it('updateDraft merges into the existing draft across multiple calls', () => {
      const store = createStore();
      store.openAddDialog();

      store.updateDraft({ merchant: 'Coffee Shop' });
      store.updateDraft({ amountCents: -500 });

      expect(store.editDraft()).toEqual({ amountCents: -500, merchant: 'Coffee Shop' });
    });

    it('closeDialog closes the dialog and clears the draft', () => {
      const store = createStore();
      store.openAddDialog();
      store.updateDraft({ merchant: 'Coffee Shop' });

      store.closeDialog();

      expect(store.dialogOpen()).toBe(false);
      expect(store.editDraft()).toBeNull();
    });

    it('saveDraft is a persistence no-op — it closes the dialog without changing the visible list', () => {
      const store = createStore();
      const countBefore = store.visibleTransactions().length;
      store.openAddDialog();
      store.updateDraft({ amountCents: -500, merchant: 'Coffee Shop' });

      store.saveDraft();

      expect(store.dialogOpen()).toBe(false);
      expect(store.editDraft()).toBeNull();
      expect(store.visibleTransactions().length).toBe(countBefore);
    });
  });

  describe('clearFilters', () => {
    it('resets search/category/date-range but leaves sort, selection, and the dialog untouched', () => {
      const store = createStore();
      store.setSearch('rent');
      store.toggleCategory('cat-housing');
      store.setDateRange({ end: '2026-02-28', start: '2026-02-01' });
      store.setSort({ direction: 'asc', field: 'amount' });
      store.selectRow(ledgerTransactions[0].id);
      store.openAddDialog();

      store.clearFilters();

      expect(store.searchQuery()).toBe('');
      expect(store.selectedCategoryIds()).toEqual([]);
      expect(store.dateRange()).toBeNull();
      expect(store.hasActiveFilters()).toBe(false);
      expect(store.activeFilterCount()).toBe(0);
      expect(store.sort()).toEqual({ direction: 'asc', field: 'amount' });
      expect(store.selectedRowId()).toBe(ledgerTransactions[0].id);
      expect(store.dialogOpen()).toBe(true);
    });
  });

  describe('select options', () => {
    it('categoryOptions maps every mock category to a {label, value} pair', () => {
      const store = createStore();
      expect(store.categoryOptions()).toEqual(ledgerCategories.map(cat => ({ label: cat.name, value: cat.id })));
    });

    it('accountOptions maps every mock account to a {label, value} pair', () => {
      const store = createStore();
      expect(store.accountOptions()).toEqual(ledgerAccounts.map(acc => ({ label: acc.name, value: acc.id })));
    });
  });
});
