# table-addon-conformance

A **stateful NgeTable addon that lives outside `libs/shared/table`**, and the spec that proves it
works. This library ships no product code — it is a standing conformance test for the table's first
extension axis, kept as its own Nx project because being a *different project* is the whole of what
it demonstrates.

## What it guards

`libs/shared/table` is built so a new behaviour lands as an addon rather than a core edit
(`docs/architecture/table.md` § An addon's own state slice). An addon that carries **state** has to
declaration-merge two interfaces — TanStack's `TableState`, so `makeStateUpdater` and `setState`
type-check, and `NgeTableState`, so the host sees the slice. Whether a package that is not the
library can do that is the property this project pins down:

- the addon registers through `provideNgeTableFeatures` alone — no test-only hook, no privileged
  wiring;
- its writes land in the **host-owned** `NgeTableState` and leave through the component's
  `stateChange`;
- the slice stays JSON-serialisable, so a user's view survives being persisted and restored.

⚠️ The assertions read the host's state, never the instance. ARCH-250 found that an addon can
render, toggle, and even survive a virtualized scroll while `NgeTableState` never moves, because the
Angular adapter keeps an internal state signal that absorbs the write. A rendering addon is not
evidence that a state seam works.

## The two augmentations

Both name **public specifiers** — that is the point:

```ts
declare module '@nge/table'     { interface NgeTableState { acmeRowFlag?: AcmeRowFlagState } }
declare module '@tanstack/angular-table' { interface TableState     { acmeRowFlag?: AcmeRowFlagState } }
```

Each library re-exports the interface with `export *`, and TypeScript resolves an augmentation's name
through a star-export to the declaration behind it — so both merge into the one interface the
library's own `applyTableState` and `stateChange` are typed against. The adapter is used rather than
`@tanstack/table-core` because it is the workspace's declared dependency; the core is only its
transitive one.

⚠️ The augmenting file must also `import` the module it augments, or TypeScript raises `TS2664` and
drops the augmentation whole — which reads as the merge silently not happening.

## Why `acme`, not `nge`

`Nge` marks what the table library owns. This addon is deliberately named as a third party's, since
an addon namespacing its own slice key is the contract every addon owes: `NgeTableState` is globally
merged, so one name space is shared by every addon and every consuming domain, and a bare `flagged`
would be claimed by whoever declared it first.

## Background

ARCH-274, under the NgeTable epic (ARCH-239). It corrected a limit ARCH-250 had recorded — that a
stateful addon must ship from inside `libs/shared/table` because "a re-export cannot be augmented" —
which turned out not to be a TypeScript rule. Full reasoning, and the options rejected along the way,
in `libs/shared/table/AGENTS.md` § Addon state and the extensibility gate.

## Running unit tests

```
npx nx run shared-table-addon-conformance:test
```
