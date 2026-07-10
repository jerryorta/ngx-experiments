import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withMethods, withProps, withState } from '@ngrx/signals';
import type { NgeCalendarConfig, NgeCalendarEvent } from '@nge/calendar';
import type { Bill, Category } from '@nge/ledger-models';
import { LedgerFacade } from '@nge/ledger-store';
import { formatMoney } from '@nge/ledger-utils';

/** One category's budget-vs-spent row on the grid — a `Budget`/`CategoryBudgetActual` joined with its `Category`. */
export interface BudgetRow {
  category: Category;
  limitCents: number;
  spentCents: number;
}

/**
 * The demo's fixed budget month — the seed only carries `Budget` rows for
 * July 2026 (matches `LedgerFacade.budgetVsActual`'s own default), so V1 has
 * no month switcher.
 */
const BUDGET_MONTH = '2026-07';

/** Mid-July anchor so the bills calendar opens on the month the seed's bills live in. */
const CALENDAR_ANCHOR_DATE = new Date(2026, 6, 15);

interface BudgetsState {
  /** The edit dialog's in-progress limit value (integer cents), or `null` when its field is empty. */
  draftLimitCents: number | null;
  /** Category id currently open in the edit dialog, or `null` when it's closed. */
  editingCategoryId: string | null;
  /** The bill surfaced from a calendar event click, or `null` when no detail is shown. */
  selectedBill: Bill | null;
}

const INITIAL_STATE: BudgetsState = {
  draftLimitCents: null,
  editingCategoryId: null,
  selectedBill: null,
};

/**
 * Parses a `'YYYY-MM-DD'` date-only string into a LOCAL-midnight `Date`.
 * Handing the bare string straight to the calendar would coerce it via
 * `new Date(str)`, which JS/the calendar's `coerceToDate` parse as UTC
 * midnight — a full day early in any negative-UTC-offset timezone. Bills are
 * calendar-day events, so they must land on their local calendar day.
 */
function localDateFromIsoDate(iso: string): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Component-scoped store for the Budgets screen. Joins `LedgerFacade`'s
 * budget-vs-actual + category data into display-ready rows, drives the
 * edit-budget dialog's draft state, and builds the bills calendar config.
 * Provide via `providers: [BudgetsStore]` on `LdgBudgetsComponent` — NEVER
 * `providedIn: 'root'`.
 */
export const BudgetsStore = signalStore(
  withState(INITIAL_STATE),

  // Captured ONCE: `budgetVsActual()` opens a fresh `toSignal` subscription on
  // every call, so it must never be invoked from inside a computed (which
  // would re-subscribe on every read instead of once per store instance).
  withProps(() => ({
    _budgetActuals: inject(LedgerFacade).budgetVsActual(BUDGET_MONTH),
  })),

  withComputed((store, facade = inject(LedgerFacade)) => ({
    /** Budget-vs-spent rows for the grid — one per category with a budget this month. */
    budgetRows: computed<BudgetRow[]>(() => {
      const categoriesById = new Map(facade.categories().map(category => [category.id, category]));
      return store._budgetActuals().flatMap((actual): BudgetRow[] => {
        const category = categoriesById.get(actual.categoryId);
        return category ? [{ category, limitCents: actual.budgetCents, spentCents: actual.spentCents }] : [];
      });
    }),

    /** The category currently open in the edit dialog, or `null` when it's closed. */
    editingCategory: computed<Category | null>(() => {
      const id = store.editingCategoryId();
      return id ? (facade.categories().find(category => category.id === id) ?? null) : null;
    }),

    /** Bills mapped to calendar events — bills are always outflows, so each is tinted + shown negative. */
    calendarConfig: computed<NgeCalendarConfig<Bill>>(() => ({
      date: CALENDAR_ANCHOR_DATE,
      events: facade.bills().map(
        (bill): NgeCalendarEvent<Bill> => ({
          allDay: true,
          color: 'var(--ldg-money-negative)',
          data: bill,
          id: bill.id,
          start: localDateFromIsoDate(bill.dueDate),
          title: `${bill.name} · ${formatMoney(-bill.amountCents)}`,
        })
      ),
      view: 'month',
    })),

    /** Formatted (negative, outflow) amount for the surfaced bill detail, or `null` when none is selected. */
    selectedBillAmount: computed<string | null>(() => {
      const bill = store.selectedBill();
      return bill ? formatMoney(-bill.amountCents) : null;
    }),
  })),

  withMethods(store => ({
    /** Opens the edit dialog for `row`'s category, seeding the draft with its current limit. */
    startEdit(row: BudgetRow): void {
      patchState(store, { draftLimitCents: row.limitCents, editingCategoryId: row.category.id });
    },

    /** Updates the in-progress draft from `ldg-amount-input`'s (cents) output. */
    updateDraft(cents: number | null): void {
      patchState(store, { draftLimitCents: cents });
    },

    /** Closes the edit dialog without saving. */
    cancelEdit(): void {
      patchState(store, { draftLimitCents: null, editingCategoryId: null });
    },

    /**
     * Validates and closes the edit dialog. demo: persistence out of scope —
     * mock read-only store (Wave 3); there's no global-store action to write
     * the new limit back to, so this never mutates `budgets()`.
     */
    saveEdit(): void {
      if (store.draftLimitCents() === null) return; // empty field — nothing to save, leave the dialog open
      patchState(store, { draftLimitCents: null, editingCategoryId: null });
    },

    /** Surfaces `bill`'s detail after a calendar event click. */
    selectBill(bill: Bill): void {
      patchState(store, { selectedBill: bill });
    },

    /** Dismisses the surfaced bill detail. */
    clearBill(): void {
      patchState(store, { selectedBill: null });
    },
  }))
);
