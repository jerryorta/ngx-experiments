import { type EnvironmentProviders, makeEnvironmentProviders } from '@angular/core';
import { provideEffects } from '@ngrx/effects';
import { provideState } from '@ngrx/store';

import { LedgerEffects } from './ledger.effects';
import { ledgerFeature } from './ledger.feature';

/**
 * Registers the Ledger feature slice and its effect on the app's
 * environment injector. Call once, at the app root (e.g. `app.config.ts`'s
 * `providers` array) — never at a route/component level, since Ledger is
 * app-wide, persistent, mock-loaded data, not something scoped to one screen.
 */
export function provideLedgerStore(): EnvironmentProviders {
  return makeEnvironmentProviders([provideState(ledgerFeature), provideEffects(LedgerEffects)]);
}
