import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';

import type { Transaction } from '@nge/ledger-models';

import type { IsoDateRange } from '@nge/ledger-utils';

import type { DlcSelectOption } from '@nge/ui-design-library';

import { LedgerFacade } from '@nge/ledger-store';

/** The Transactions table's sortable dimensions. */
export type TransactionSortField = 'amount' | 'date' | 'merchant';
export type TransactionSortDirection = 'asc' | 'desc';

/** The table's current sort — always a concrete field, never "unsorted". */
export interface TransactionSort {
  direction: TransactionSortDirection;
  field: TransactionSortField;
}

/** Every bit of local UI/interaction state the Transactions screen needs. */
export interface TransactionsState {
  /** Inclusive ISO date-range filter bound, or null when unset. */
  dateRange: IsoDateRange | null;
  /** Whether the add/edit dialog is open. */
  dialogOpen: boolean;
  /** The transaction being added/edited in the dialog, or null when it's closed. */
  editDraft: Partial<Transaction> | null;
  /** Merchant/notes search text. */
  searchQuery: string;
  /** Multi-select category-chip filter — empty means "all categories". */
  selectedCategoryIds: string[];
  /** The row shown in the detail drawer, or null when the drawer is closed. */
  selectedRowId: string | null;
  sort: TransactionSort;
}

const initialState: TransactionsState = {
  dateRange: null,
  dialogOpen: false,
  editDraft: null,
  searchQuery: '',
  selectedCategoryIds: [],
  selectedRowId: null,
  sort: { direction: 'desc', field: 'date' },
};

/**
 * Component-scoped store for the Transactions screen — owns every bit of
 * filter/sort/selection/dialog interaction state so `LdgTransactionsComponent`
 * stays template glue. Provide it on the screen component
 * (`providers: [TransactionsStore]`), never `providedIn: 'root'`; descendants
 * `inject()` it directly rather than receiving it via `input()`.
 *
 * Reads domain data through `LedgerFacade` (injected here, not by the
 * component) and never mutates it — `saveDraft()` is a demo no-op because the
 * global store is mock/read-only (see its own doc comment).
 */
export const TransactionsStore = signalStore(
  withState(initialState),

  withComputed((store, facade = inject(LedgerFacade)) => {
    /** `facade.transactions()` narrowed by search/category/date-range, then sorted. */
    const visibleTransactions = computed<Transaction[]>(() => {
      const query = store.searchQuery().trim().toLowerCase();
      const categoryIds = store.selectedCategoryIds();
      const range = store.dateRange();
      const { direction, field } = store.sort();

      const filtered = facade.transactions().filter(txn => {
        if (query) {
          const haystack = `${txn.merchant} ${txn.notes ?? ''}`.toLowerCase();
          if (!haystack.includes(query)) return false;
        }
        if (categoryIds.length > 0 && !categoryIds.includes(txn.categoryId)) return false;
        if (range && (txn.date < range.start || txn.date > range.end)) return false;
        return true;
      });

      const dir = direction === 'asc' ? 1 : -1;
      // `.filter()` above always returns a fresh array, so sorting it in
      // place never mutates `facade.transactions()`.
      return filtered.sort((a, b) => {
        switch (field) {
          case 'amount':
            return (a.amountCents - b.amountCents) * dir;
          case 'merchant':
            return a.merchant.localeCompare(b.merchant) * dir;
          default:
            return a.date.localeCompare(b.date) * dir;
        }
      });
    });

    const selectedRow = computed<Transaction | null>(() => {
      const id = store.selectedRowId();
      return id ? (facade.transactions().find(txn => txn.id === id) ?? null) : null;
    });

    const hasActiveFilters = computed<boolean>(
      () =>
        store.searchQuery().trim() !== '' ||
        store.selectedCategoryIds().length > 0 ||
        store.dateRange() !== null
    );

    const activeFilterCount = computed<number>(() => {
      let count = 0;
      if (store.searchQuery().trim() !== '') count++;
      if (store.selectedCategoryIds().length > 0) count++;
      if (store.dateRange() !== null) count++;
      return count;
    });

    const categoryOptions = computed<DlcSelectOption[]>(() =>
      facade.categories().map(cat => ({ label: cat.name, value: cat.id }))
    );

    const accountOptions = computed<DlcSelectOption[]>(() =>
      facade.accounts().map(acc => ({ label: acc.name, value: acc.id }))
    );

    return {
      accountOptions,
      activeFilterCount,
      categoryOptions,
      hasActiveFilters,
      selectedRow,
      visibleTransactions,
    };
  }),

  withMethods(store => {
    /** Shared tail of `closeDialog`/`saveDraft` — both return to the closed, draft-less state. */
    function resetDialog(): void {
      patchState(store, { dialogOpen: false, editDraft: null });
    }

    return {
      clearDateRange(): void {
        patchState(store, { dateRange: null });
      },

      /** Resets search/category/date-range — leaves sort, selection, and the dialog untouched. */
      clearFilters(): void {
        patchState(store, { dateRange: null, searchQuery: '', selectedCategoryIds: [] });
      },

      closeDialog(): void {
        resetDialog();
      },

      closeDrawer(): void {
        patchState(store, { selectedRowId: null });
      },

      openAddDialog(): void {
        patchState(store, { dialogOpen: true, editDraft: {} });
      },

      openEditDialog(txn: Transaction): void {
        patchState(store, { dialogOpen: true, editDraft: { ...txn } });
      },

      saveDraft(): void {
        // demo: persistence out of scope — mock read-only store (Wave 3)
        resetDialog();
      },

      selectRow(id: string): void {
        patchState(store, { selectedRowId: id });
      },

      setDateRange(range: IsoDateRange | null): void {
        patchState(store, { dateRange: range });
      },

      setSearch(query: string): void {
        patchState(store, { searchQuery: query });
      },

      setSort(sort: TransactionSort): void {
        patchState(store, { sort });
      },

      toggleCategory(id: string): void {
        const current = store.selectedCategoryIds();
        patchState(store, {
          selectedCategoryIds: current.includes(id)
            ? current.filter(existing => existing !== id)
            : [...current, id],
        });
      },

      updateDraft(partial: Partial<Transaction>): void {
        patchState(store, { editDraft: { ...store.editDraft(), ...partial } });
      },
    };
  })
);
