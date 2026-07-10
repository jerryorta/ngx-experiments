import { inject, Injectable, InjectionToken } from '@angular/core';
import { Actions, createEffect, ofType } from '@ngrx/effects';

import { ledgerSeed } from '@nge/ledger-mocks';

import { catchError, delay, map, of, switchMap } from 'rxjs';

import { LedgerActions } from './ledger.actions';

/**
 * Simulated network latency for the mock "load" effect, in milliseconds.
 * Override to `0` in tests so specs resolve on the next macrotask instead of
 * waiting out a real 300ms delay — no `fakeAsync`/`tick` needed under
 * zoneless.
 */
export const LEDGER_LOAD_LATENCY_MS = new InjectionToken<number>('LEDGER_LOAD_LATENCY_MS', {
  factory: () => 300,
  providedIn: 'root',
});

/**
 * Loads the Ledger demo's mock "backend". There's no real API — `load$`
 * resolves `@nge/ledger-mocks`' static seed behind an artificial delay, to
 * exercise the same loading/loaded/error state machine a real HTTP call
 * would. `catchError` exists for that state machine's sake: the seed is a
 * static import, so in practice `loadFailure` never actually fires.
 */
@Injectable()
export class LedgerEffects {
  private readonly actions$ = inject(Actions);
  private readonly latencyMs = inject(LEDGER_LOAD_LATENCY_MS);

  load$ = createEffect(() =>
    this.actions$.pipe(
      ofType(LedgerActions.load),
      switchMap(() =>
        of(ledgerSeed).pipe(
          delay(this.latencyMs),
          map(seed => LedgerActions.loadSuccess({ seed })),
          catchError(error => of(LedgerActions.loadFailure({ error: String(error) })))
        )
      )
    )
  );
}
