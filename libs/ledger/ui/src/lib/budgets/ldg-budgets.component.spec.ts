import type { ComponentFixture } from '@angular/core/testing';

import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ledgerBills, ledgerBudgets, ledgerCategories } from '@nge/ledger-mocks';
import { LedgerFacade } from '@nge/ledger-store';
import type { CategoryBudgetActual } from '@nge/ledger-utils';

import { BudgetsStore } from './budgets.store';
import { LdgBudgetsComponent } from './ldg-budgets.component';

const JULY_BUDGETS = ledgerBudgets.filter(budget => budget.month === '2026-07');
const JULY_ACTUALS: CategoryBudgetActual[] = JULY_BUDGETS.map(budget => ({
  budgetCents: budget.limitCents,
  categoryId: budget.categoryId,
  spentCents: Math.round(budget.limitCents / 2),
}));

interface FakeFacadeOptions {
  actuals?: CategoryBudgetActual[];
  status?: 'error' | 'idle' | 'loaded' | 'loading';
}

function fakeFacade(opts: FakeFacadeOptions = {}): LedgerFacade {
  const { actuals = JULY_ACTUALS, status = 'loaded' } = opts;
  return {
    bills: signal(ledgerBills),
    budgets: signal(ledgerBudgets),
    budgetVsActual: () => signal(actuals),
    categories: signal(ledgerCategories),
    status: signal(status),
  } as unknown as LedgerFacade;
}

function setup(opts: FakeFacadeOptions = {}): ComponentFixture<LdgBudgetsComponent> {
  TestBed.configureTestingModule({
    imports: [LdgBudgetsComponent],
    providers: [{ provide: LedgerFacade, useValue: fakeFacade(opts) }],
  });
  const fixture = TestBed.createComponent(LdgBudgetsComponent);
  fixture.detectChanges();
  return fixture;
}

describe('LdgBudgetsComponent', () => {
  // dlc-dialog defers focus-trap engagement to a real requestAnimationFrame
  // (see DlcDialogComponent#engage) whenever it becomes visible. Left
  // un-mocked, that callback can fire asynchronously after a test — and
  // possibly this whole file — completes (dlc-dialog.component.spec.ts hits
  // the same hazard and mocks it for the same reason). None of these tests
  // assert on focus-trap behavior, so the callback is simply never invoked.
  let rafSpy: jest.SpyInstance;

  beforeEach(() => {
    rafSpy = jest.spyOn(window, 'requestAnimationFrame').mockReturnValue(0);
  });

  afterEach(() => {
    rafSpy.mockRestore();
    document.body.style.overflow = '';
  });

  it('creates', () => {
    const fixture = setup();
    expect(fixture.componentInstance).toBeTruthy();
  });

  it('renders one ldg-budget-card per budget row', () => {
    const fixture = setup();
    expect(fixture.nativeElement.querySelectorAll('ldg-budget-card')).toHaveLength(JULY_ACTUALS.length);
  });

  it('renders the loading message and no cards while the facade is loading', () => {
    const fixture = setup({ status: 'loading' });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.textContent).toContain('Loading budgets');
    expect(el.querySelectorAll('ldg-budget-card')).toHaveLength(0);
  });

  it('renders the empty state once loaded with no budgeted categories', () => {
    const fixture = setup({ actuals: [] });
    const el: HTMLElement = fixture.nativeElement;

    expect(el.querySelector('ldg-empty-state')).toBeTruthy();
    expect(el.querySelectorAll('ldg-budget-card')).toHaveLength(0);
  });

  it("opens the edit dialog for a card's category, pre-filled with its current limit", async () => {
    const fixture = setup();
    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.dlc-dialog__panel')).toBeNull();

    el.querySelector<HTMLButtonElement>('.ldg-budgets__card ldg-icon-button button')?.click();
    fixture.detectChanges();

    const panel = el.querySelector('.dlc-dialog__panel');
    expect(panel).toBeTruthy();

    // NgModel pushes its initial value to the CVA via a resolved-promise
    // microtask (see @angular/forms' NgModel#_updateValue), not synchronously
    // — flush it before reading the amount-input's rendered value.
    await Promise.resolve();
    fixture.detectChanges();

    const amountInput = panel?.querySelector<HTMLInputElement>('ldg-amount-input input');
    expect(amountInput?.value).toBe((JULY_ACTUALS[0].budgetCents / 100).toFixed(2));
  });

  it('Cancel closes the edit dialog and discards the draft', () => {
    const fixture = setup();
    const el: HTMLElement = fixture.nativeElement;

    el.querySelector<HTMLButtonElement>('.ldg-budgets__card ldg-icon-button button')?.click();
    fixture.detectChanges();

    const cancelButton = Array.from(
      el.querySelectorAll<HTMLButtonElement>('.dlc-dialog__panel dlc-button button')
    ).find(button => button.textContent?.trim() === 'Cancel');
    cancelButton?.click();
    fixture.detectChanges();

    expect(el.querySelector('.dlc-dialog__panel')).toBeNull();
  });

  it('Save closes the edit dialog (demo: no-op persistence)', () => {
    const fixture = setup();
    const el: HTMLElement = fixture.nativeElement;

    el.querySelector<HTMLButtonElement>('.ldg-budgets__card ldg-icon-button button')?.click();
    fixture.detectChanges();

    const saveButton = Array.from(el.querySelectorAll<HTMLButtonElement>('.dlc-dialog__panel dlc-button button')).find(
      button => button.textContent?.trim() === 'Save'
    );
    saveButton?.click();
    fixture.detectChanges();

    expect(el.querySelector('.dlc-dialog__panel')).toBeNull();
  });

  it('builds one calendar config event per bill (via the injected BudgetsStore)', () => {
    const fixture = setup();
    const store = fixture.debugElement.injector.get(BudgetsStore);

    expect(store.calendarConfig().events).toHaveLength(ledgerBills.length);
  });

  it("selecting a bill surfaces its detail, dismissible via the detail's close affordance", () => {
    const fixture = setup();
    const store = fixture.debugElement.injector.get(BudgetsStore);
    const el: HTMLElement = fixture.nativeElement;

    store.selectBill(ledgerBills[0]);
    fixture.detectChanges();
    expect(el.querySelector('.ldg-budgets__bill-detail')?.textContent).toContain(ledgerBills[0].name);

    const dismissButton = Array.from(el.querySelectorAll<HTMLButtonElement>('.ldg-budgets__bill-detail button')).find(
      button => button.getAttribute('aria-label') === 'Dismiss bill detail'
    );
    dismissButton?.click();
    fixture.detectChanges();

    expect(el.querySelector('.ldg-budgets__bill-detail')).toBeNull();
  });
});
