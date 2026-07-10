import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ledgerBills, ledgerBudgets, ledgerCategories } from '@nge/ledger-mocks';
import { LedgerFacade } from '@nge/ledger-store';
import type { CategoryBudgetActual } from '@nge/ledger-utils';
import { formatMoney } from '@nge/ledger-utils';

import { BudgetsStore } from './budgets.store';

type Store = InstanceType<typeof BudgetsStore>;

const JULY_BUDGETS = ledgerBudgets.filter(budget => budget.month === '2026-07');

// One actual per July budget — dining is deliberately over its limit so the
// join is exercised with a realistic mix (isOver/pct math is
// `ldg-budget-card`'s concern, not the store's — this just checks the join).
const JULY_ACTUALS: CategoryBudgetActual[] = JULY_BUDGETS.map(budget => ({
  budgetCents: budget.limitCents,
  categoryId: budget.categoryId,
  spentCents: budget.categoryId === 'cat-dining' ? budget.limitCents + 5000 : Math.round(budget.limitCents / 2),
}));

/** Builds a `BudgetsStore` wired to a stubbed `LedgerFacade` — `budgetVsActual` is a spy so tests can assert it's called exactly once. */
function createStore(actuals: CategoryBudgetActual[] = JULY_ACTUALS): { budgetVsActualSpy: jest.Mock; store: Store } {
  const budgetVsActualSpy = jest.fn(() => signal(actuals));
  const fakeFacade = {
    bills: signal(ledgerBills),
    budgets: signal(ledgerBudgets),
    budgetVsActual: budgetVsActualSpy,
    categories: signal(ledgerCategories),
  } as unknown as LedgerFacade;

  TestBed.configureTestingModule({ providers: [BudgetsStore, { provide: LedgerFacade, useValue: fakeFacade }] });
  return { budgetVsActualSpy, store: TestBed.inject(BudgetsStore) };
}

describe('BudgetsStore', () => {
  describe('budgetRows', () => {
    it('joins budget-vs-actual rows with their category', () => {
      const { store } = createStore();
      const rows = store.budgetRows();

      expect(rows).toHaveLength(JULY_ACTUALS.length);
      const groceries = rows.find(row => row.category.id === 'cat-groceries');
      expect(groceries).toEqual({
        category: ledgerCategories.find(category => category.id === 'cat-groceries'),
        limitCents: 45000,
        spentCents: 22500,
      });
    });

    it('drops an actual whose category is not in the category list', () => {
      const actualsWithOrphan: CategoryBudgetActual[] = [
        ...JULY_ACTUALS,
        { budgetCents: 1000, categoryId: 'cat-does-not-exist', spentCents: 500 },
      ];
      const { store } = createStore(actualsWithOrphan);

      expect(store.budgetRows()).toHaveLength(JULY_ACTUALS.length);
      expect(store.budgetRows().some(row => row.category.id === 'cat-does-not-exist')).toBe(false);
    });

    it('calls LedgerFacade.budgetVsActual exactly once for "2026-07", regardless of how many times computeds are read', () => {
      const { budgetVsActualSpy, store } = createStore();

      store.budgetRows();
      store.budgetRows();
      store.calendarConfig();

      expect(budgetVsActualSpy).toHaveBeenCalledTimes(1);
      expect(budgetVsActualSpy).toHaveBeenCalledWith('2026-07');
    });
  });

  describe('calendarConfig', () => {
    it('maps one calendar event per bill, carrying the Bill in data', () => {
      const { store } = createStore();
      const config = store.calendarConfig();

      expect(config.view).toBe('month');
      expect(config.events).toHaveLength(ledgerBills.length);

      const rentEvent = config.events.find(event => event.id === 'bill-rent');
      expect(rentEvent?.data?.name).toBe('Rent');
      expect(rentEvent?.data?.amountCents).toBe(150000);
      expect(rentEvent?.allDay).toBe(true);
      expect(rentEvent?.title).toBe(`Rent · ${formatMoney(-150000)}`);
    });

    it("lands each event on its bill's local calendar day (not shifted a day early by UTC coercion)", () => {
      const { store } = createStore();
      const rentEvent = store.calendarConfig().events.find(event => event.id === 'bill-rent');
      const start = rentEvent?.start as Date;

      expect(start.getFullYear()).toBe(2026);
      expect(start.getMonth()).toBe(6); // July is month index 6
      expect(start.getDate()).toBe(5); // bill-rent's dueDate is '2026-07-05'
    });
  });

  describe('edit flow', () => {
    it('startEdit seeds editingCategoryId/draftLimitCents, and editingCategory resolves the Category', () => {
      const { store } = createStore();
      const row = store.budgetRows()[0]; // groceries — first July budget in the seed

      store.startEdit(row);

      expect(store.editingCategoryId()).toBe(row.category.id);
      expect(store.draftLimitCents()).toBe(row.limitCents);
      expect(store.editingCategory()?.id).toBe(row.category.id);
    });

    it('updateDraft overwrites the in-progress value', () => {
      const { store } = createStore();
      store.startEdit(store.budgetRows()[0]);

      store.updateDraft(50000);

      expect(store.draftLimitCents()).toBe(50000);
    });

    it('cancelEdit clears editingCategoryId and draftLimitCents', () => {
      const { store } = createStore();
      store.startEdit(store.budgetRows()[0]);

      store.cancelEdit();

      expect(store.editingCategoryId()).toBeNull();
      expect(store.draftLimitCents()).toBeNull();
      expect(store.editingCategory()).toBeNull();
    });

    it('saveEdit closes the dialog when the draft is a valid amount (no mutation — persistence is out of scope)', () => {
      const { store } = createStore();
      store.startEdit(store.budgetRows()[0]);
      store.updateDraft(60000);

      store.saveEdit();

      expect(store.editingCategoryId()).toBeNull();
      expect(store.draftLimitCents()).toBeNull();
    });

    it('saveEdit leaves the dialog open when the draft has been cleared to null', () => {
      const { store } = createStore();
      store.startEdit(store.budgetRows()[0]);
      store.updateDraft(null);

      store.saveEdit();

      expect(store.editingCategoryId()).not.toBeNull();
      expect(store.draftLimitCents()).toBeNull();
    });
  });

  describe('bill detail', () => {
    it('selectBill/clearBill set and clear selectedBill + selectedBillAmount', () => {
      const { store } = createStore();
      const bill = ledgerBills[0];

      store.selectBill(bill);

      expect(store.selectedBill()).toBe(bill);
      expect(store.selectedBillAmount()).toBe(formatMoney(-bill.amountCents));

      store.clearBill();

      expect(store.selectedBill()).toBeNull();
      expect(store.selectedBillAmount()).toBeNull();
    });
  });
});
