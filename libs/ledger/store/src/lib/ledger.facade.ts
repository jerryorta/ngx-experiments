import { inject, Injectable, Injector, type Signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { Store } from '@ngrx/store';

import type { Account, Bill, Budget, Category, Transaction } from '@nge/ledger-models';

import type { CashflowPeriod, CategoryBudgetActual, CategorySpending, NetWorthPoint } from '@nge/ledger-utils';

import { LedgerActions } from './ledger.actions';
import { ledgerFeature, type LedgerStatus } from './ledger.feature';

/**
 * The demo's fixed "today" for the Budgets screen's default month — the seed
 * spans Feb-Jul 2026 (see `docs/demos/ledger-build-plan.md`), so July is the
 * most recent complete month.
 */
const DEFAULT_BUDGET_MONTH = '2026-07';

/**
 * The single entry point components use to read and drive Ledger state —
 * inject THIS, never `Store` directly. Wraps every `ledgerFeature` selector
 * as a zoneless-friendly signal and exposes `load()` to kick off the mock
 * "backend" fetch.
 */
@Injectable({ providedIn: 'root' })
export class LedgerFacade {
  private readonly store = inject(Store);
  // Captured so `budgetVsActual()` can build a signal outside an injection
  // context (e.g. called from a component method rather than a field
  // initializer) — `toSignal` needs one or the other.
  private readonly injector = inject(Injector);

  readonly accounts: Signal<Account[]> = toSignal(this.store.select(ledgerFeature.selectAllAccounts), {
    initialValue: [],
  });
  readonly bills: Signal<Bill[]> = toSignal(this.store.select(ledgerFeature.selectAllBills), { initialValue: [] });
  readonly budgets: Signal<Budget[]> = toSignal(this.store.select(ledgerFeature.selectAllBudgets), {
    initialValue: [],
  });
  readonly categories: Signal<Category[]> = toSignal(this.store.select(ledgerFeature.selectAllCategories), {
    initialValue: [],
  });
  readonly transactions: Signal<Transaction[]> = toSignal(this.store.select(ledgerFeature.selectAllTransactions), {
    initialValue: [],
  });
  readonly status: Signal<LedgerStatus> = toSignal(this.store.select(ledgerFeature.selectStatus), {
    initialValue: 'idle',
  });
  readonly error: Signal<string | null> = toSignal(this.store.select(ledgerFeature.selectError), {
    initialValue: null,
  });

  readonly cashflow: Signal<CashflowPeriod[]> = toSignal(this.store.select(ledgerFeature.selectCashflow), {
    initialValue: [],
  });
  readonly netWorthSeries: Signal<NetWorthPoint[]> = toSignal(this.store.select(ledgerFeature.selectNetWorthSeries), {
    initialValue: [],
  });
  readonly spendingByCategory: Signal<CategorySpending[]> = toSignal(
    this.store.select(ledgerFeature.selectSpendingByCategory),
    { initialValue: [] }
  );

  /** Dispatches the one bulk load — call once, e.g. from the app shell's root component. */
  load(): void {
    this.store.dispatch(LedgerActions.load());
  }

  /**
   * Budget-vs-actual for `month` ('YYYY-MM'), defaulting to the demo's
   * current month. Call once per month you need (e.g. in a field
   * initializer or `computed`), not on every template read — each call
   * subscribes anew.
   */
  budgetVsActual(month: string = DEFAULT_BUDGET_MONTH): Signal<CategoryBudgetActual[]> {
    return toSignal(this.store.select(ledgerFeature.selectBudgetVsActual(month)), {
      initialValue: [],
      injector: this.injector,
    });
  }
}
