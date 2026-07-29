import type { ComponentFixture } from '@angular/core/testing';
import type { NgeTableConfig, NgeTableState } from '@nge/table';
import type { NgeTableFixtureRow } from '@nge/table/testing';

import { TestBed } from '@angular/core/testing';
import {
  createNgeTableConfig,
  createNgeTableState,
  NgeTableComponent,
  NgeTableStore,
  provideNgeTableFeatures,
} from '@nge/table';
import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS } from '@nge/table/testing';

import { acmeRowFlagging, readAcmeRowFlagsFromState } from './acme-row-flagging';

const rows = createNgeTableFixture({ rows: 12 });

type Store = InstanceType<typeof NgeTableStore>;

function tableConfig(): NgeTableConfig<unknown> {
  return createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    // ⚠️ Not optional once anything marks a row — without it the engine keys rows by
    // array index and a sort moves every flag onto a different record.
    getRowId: row => row.id,
  }) as NgeTableConfig<unknown>;
}

/**
 * A store with the addon registered exactly the way a consumer registers it.
 *
 * Through `provideNgeTableFeatures` and nothing else — no test-only hook and no
 * privileged wiring. That this is the whole of the setup *from a different Nx
 * project* is the claim under test, so the setup is part of what is being tested.
 */
function createStore(): Store {
  TestBed.configureTestingModule({
    providers: [NgeTableStore, provideNgeTableFeatures(acmeRowFlagging)],
  });

  const store = TestBed.inject(NgeTableStore);
  store.setConfig(tableConfig());

  return store;
}

describe('acmeRowFlagging — registration from another Nx project', () => {
  it('reaches the instance through _features alone', () => {
    const store = createStore();

    expect(typeof store.table.readAcmeRowFlags).toBe('function');
    expect(typeof store.table.toggleAcmeRowFlag).toBe('function');
    expect(typeof store.table.writeAcmeRowFlag).toBe('function');
  });

  it('starts with nothing flagged', () => {
    expect(createStore().table.readAcmeRowFlags()).toEqual({ flagged: [] });
  });
});

describe('acmeRowFlagging — the controlled-state round trip', () => {
  // ⚠️ THE assertion this project exists for, and it reads the HOST's state rather
  // than the instance. ARCH-250 found that an addon can render, toggle, and survive a
  // virtualized scroll while `NgeTableState` never moves — the Angular adapter keeps
  // an internal state signal that absorbs the write. A passing `readAcmeRowFlags()` is
  // therefore not evidence the seam works; `store.tableState()` is.
  it('lands a flag in the host-owned state', () => {
    const store = createStore();

    store.table.toggleAcmeRowFlag(rows[0].id);

    expect(store.tableState().acmeRowFlag?.flagged).toEqual([rows[0].id]);
  });

  it('reads back through the published helper', () => {
    const store = createStore();

    store.table.toggleAcmeRowFlag(rows[2].id);

    expect(readAcmeRowFlagsFromState(store.tableState()).flagged).toEqual([rows[2].id]);
  });

  it('toggles back off', () => {
    const store = createStore();

    store.table.toggleAcmeRowFlag(rows[0].id);
    store.table.toggleAcmeRowFlag(rows[0].id);

    expect(store.tableState().acmeRowFlag?.flagged).toEqual([]);
  });

  // A host that built its state the documented way carries no `acmeRowFlag` key at
  // all, so the first write is handed `undefined`. The updaters normalise rather than
  // assuming `getInitialState` seeded the host's object — it seeds the engine's.
  it('accepts a host state that has never carried the slice', () => {
    const store = createStore();

    store.setTableState(createNgeTableState());
    store.table.toggleAcmeRowFlag(rows[3].id);

    expect(store.tableState().acmeRowFlag?.flagged).toEqual([rows[3].id]);
  });

  it('restores a slice the host hands back in', () => {
    const store = createStore();

    store.setTableState(createNgeTableState({ acmeRowFlag: { flagged: [rows[5].id] } }));

    expect(store.table.readAcmeRowFlags().flagged).toEqual([rows[5].id]);
  });

  it('leaves the other state slices alone', () => {
    const store = createStore();

    store.setTableState(createNgeTableState({ sorting: [{ desc: true, id: 'amount' }] }));
    store.table.toggleAcmeRowFlag(rows[0].id);

    expect(store.tableState().sorting).toEqual([{ desc: true, id: 'amount' }]);
    expect(store.tableState().pagination).toEqual(createNgeTableState().pagination);
  });

  // `makeStateUpdater` allocates a new top-level state object whether or not the slice
  // moved, so an updater that decides to do nothing would still churn the host's state
  // and emit a `stateChange` without the addon's identity short-circuit.
  it('writes nothing when a clear finds nothing flagged', () => {
    const store = createStore();
    const before = store.tableState();

    store.table.clearAcmeRowFlags();

    expect(store.tableState()).toBe(before);
  });

  it('clears flags that are actually there', () => {
    const store = createStore();

    store.table.toggleAcmeRowFlag(rows[1].id);
    store.table.clearAcmeRowFlags();

    expect(store.tableState().acmeRowFlag?.flagged).toEqual([]);
  });
});

describe('acmeRowFlagging — the component contract', () => {
  function createFixture(): ComponentFixture<NgeTableComponent<NgeTableFixtureRow>> {
    TestBed.configureTestingModule({
      providers: [provideNgeTableFeatures(acmeRowFlagging)],
    });

    const fixture =
      TestBed.createComponent<NgeTableComponent<NgeTableFixtureRow>>(NgeTableComponent);
    fixture.componentRef.setInput('config', tableConfig());
    fixture.componentRef.setInput('state', createNgeTableState());
    fixture.detectChanges();

    return fixture;
  }

  // The public surface an external consumer actually binds: state in, state out. The
  // store-level tests above prove the slice reaches the host's object; this proves it
  // leaves through the component's own `stateChange`.
  it('emits the addon slice through stateChange', () => {
    const fixture = createFixture();
    const emitted: NgeTableState[] = [];
    fixture.componentInstance.stateChange.subscribe(state => emitted.push(state));

    fixture.debugElement.injector.get(NgeTableStore).table.toggleAcmeRowFlag(rows[4].id);
    fixture.detectChanges();

    expect(emitted).toHaveLength(1);
    expect(emitted[0].acmeRowFlag?.flagged).toEqual([rows[4].id]);
  });

  it('accepts a slice handed in through the state input', () => {
    const fixture = createFixture();

    fixture.componentRef.setInput(
      'state',
      createNgeTableState({ acmeRowFlag: { flagged: [rows[7].id] } })
    );
    fixture.detectChanges();

    const store = fixture.debugElement.injector.get(NgeTableStore);

    expect(store.table.readAcmeRowFlags().flagged).toEqual([rows[7].id]);
  });
});

describe('acmeRowFlagging — the persistability promise', () => {
  // The reason `NgeTableState` is declared rather than aliased to the engine's own
  // type: a user's view can be written to Firestore and restored. An addon slice
  // holding a `Date`, a `Map`, or a class instance would break that silently, and the
  // library's own spec can only assert it for the slices it can see.
  it('keeps the host state JSON-serialisable with the addon slice present', () => {
    const store = createStore();

    store.table.toggleAcmeRowFlag(rows[0].id);
    store.table.toggleAcmeRowFlag(rows[6].id);

    const state = store.tableState();

    expect(JSON.parse(JSON.stringify(state))).toEqual(state);
  });

  // Persist from one table, then restore into a genuinely fresh one — the shape of
  // "a user's view is saved and comes back", rather than merely re-reading the object
  // that was never serialised.
  it('survives a round trip through JSON and back into another table', () => {
    const store = createStore();
    store.table.toggleAcmeRowFlag(rows[8].id);

    const persisted = JSON.parse(JSON.stringify(store.tableState())) as NgeTableState;

    TestBed.resetTestingModule();
    const restored = createStore();
    restored.setTableState(persisted);

    expect(restored.table.readAcmeRowFlags().flagged).toEqual([rows[8].id]);
  });
});
