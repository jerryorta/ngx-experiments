import type { StateSignals, WritableStateSource } from '@ngrx/signals';

import type { NgeTableStoreState } from './nge-table-store.state';

/**
 * What every `with-nge-table-*` feature can count on: the store's own state
 * signals, plus the `WritableStateSource` brand `patchState` needs.
 *
 * Each feature declares its own `…Deps` interface extending this one with the
 * props and methods an *earlier* feature contributed — `table`, `headerRows`,
 * `emitTableEvent`, and so on. That interface is the feature's contract with the
 * composition root, and it is what makes the root's ordering a compile-time
 * question rather than a runtime surprise: reorder two features and the deps of
 * the later one stop being satisfied.
 *
 * The store injects `NGE_TABLE_FEATURES` and nothing else, and that injection
 * belongs to the engine feature alone — so, unlike the CMA reference store, there
 * is no services interface mixed in here.
 */
export type NgeTableBaseStore = StateSignals<NgeTableStoreState> &
  WritableStateSource<NgeTableStoreState>;
