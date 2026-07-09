import type { StateSignals, WritableStateSource } from '@ngrx/signals';

import type { NgeCalendarStoreState } from './nge-calendar-store.state';

/**
 * Base store type passed to feature functions via `withFeature`.
 *
 * Exposes the state signals plus `WritableStateSource` (for `patchState`). The
 * calendar store injects NOTHING, so — unlike the CMA reference — there is no
 * services interface mixed in here.
 */
export type NgeCalendarBaseStore = StateSignals<NgeCalendarStoreState> &
  WritableStateSource<NgeCalendarStoreState>;
