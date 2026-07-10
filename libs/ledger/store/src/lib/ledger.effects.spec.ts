import { TestBed } from '@angular/core/testing';
import { provideMockActions } from '@ngrx/effects/testing';

import { ledgerSeed } from '@nge/ledger-mocks';

import { firstValueFrom, of, type Observable } from 'rxjs';

import { LedgerActions } from './ledger.actions';
import { LEDGER_LOAD_LATENCY_MS, LedgerEffects } from './ledger.effects';

describe('LedgerEffects', () => {
  // delay(0) still resolves on a real macrotask (rxjs' asyncScheduler), so
  // firstValueFrom + await is enough — no fakeAsync/tick under zoneless.
  function setup(actions$Source: Observable<unknown>): LedgerEffects {
    TestBed.configureTestingModule({
      providers: [
        LedgerEffects,
        provideMockActions(() => actions$Source),
        { provide: LEDGER_LOAD_LATENCY_MS, useValue: 0 },
      ],
    });
    return TestBed.inject(LedgerEffects);
  }

  it('load$ resolves to loadSuccess carrying the mock seed', async () => {
    const effects = setup(of(LedgerActions.load()));

    const result = await firstValueFrom(effects.load$);

    expect(result).toEqual(LedgerActions.loadSuccess({ seed: ledgerSeed }));
  });

  it('ignores actions other than load', async () => {
    const effects = setup(of({ type: '[Test] Unrelated' }));

    // The filtered+switchMapped stream just completes without emitting for
    // an action ofType(load) doesn't match — assert that directly rather
    // than via firstValueFrom, which would reject (EmptyError) on an empty
    // completion.
    const emissions: unknown[] = [];
    await new Promise<void>(resolve => {
      effects.load$.subscribe({ complete: resolve, next: action => emissions.push(action) });
    });

    expect(emissions).toEqual([]);
  });
});
