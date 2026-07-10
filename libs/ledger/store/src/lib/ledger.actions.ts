import { createActionGroup, emptyProps, props } from '@ngrx/store';

import type { LedgerSeed } from './ledger-seed.model';

/**
 * The Ledger feature's one load lifecycle: request the mock seed, then
 * either it lands (`loadSuccess`) or it doesn't (`loadFailure`). There's no
 * per-entity loading — `loadSuccess` always carries the whole seed at once.
 */
export const LedgerActions = createActionGroup({
  source: 'Ledger',
  events: {
    Load: emptyProps(),
    'Load Success': props<{ seed: LedgerSeed }>(),
    'Load Failure': props<{ error: string }>(),
  },
});
