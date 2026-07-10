import { TestBed } from '@angular/core/testing';
import { Actions, ofType } from '@ngrx/effects';
import { provideStore } from '@ngrx/store';

import { firstValueFrom } from 'rxjs';

import { LedgerActions } from './ledger.actions';
import { LEDGER_LOAD_LATENCY_MS } from './ledger.effects';
import { LedgerFacade } from './ledger.facade';
import { provideLedgerStore } from './provide-ledger-store';

describe('LedgerFacade', () => {
  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideStore(), provideLedgerStore(), { provide: LEDGER_LOAD_LATENCY_MS, useValue: 0 }],
    });
  });

  it('starts idle with empty collections', () => {
    const facade = TestBed.inject(LedgerFacade);

    expect(facade.status()).toBe('idle');
    expect(facade.error()).toBeNull();
    expect(facade.accounts()).toEqual([]);
  });

  it('load() dispatches load synchronously, then reflects loaded state once the effect resolves', async () => {
    const facade = TestBed.inject(LedgerFacade);
    const actions$ = TestBed.inject(Actions);
    const loadSuccess = firstValueFrom(actions$.pipe(ofType(LedgerActions.loadSuccess)));

    facade.load();
    // Store dispatch -> reducer is synchronous, so this is already 'loading'
    // before the (delayed) effect has resolved.
    expect(facade.status()).toBe('loading');

    await loadSuccess;

    expect(facade.status()).toBe('loaded');
    expect(facade.accounts().length).toBeGreaterThan(0);
    expect(facade.transactions().length).toBeGreaterThan(0);
    expect(facade.categories().length).toBeGreaterThan(0);
  });

  it('budgetVsActual(month) returns an independent signal per month', async () => {
    const facade = TestBed.inject(LedgerFacade);
    const actions$ = TestBed.inject(Actions);
    const loadSuccess = firstValueFrom(actions$.pipe(ofType(LedgerActions.loadSuccess)));

    facade.load();
    await loadSuccess;

    const defaultMonth = facade.budgetVsActual();
    const noBudgetsMonth = facade.budgetVsActual('1999-01'); // well outside the seed's Feb-Jul 2026 range

    expect(Array.isArray(defaultMonth())).toBe(true);
    expect(noBudgetsMonth()).toEqual([]);
  });
});
