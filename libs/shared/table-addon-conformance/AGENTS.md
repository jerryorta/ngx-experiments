# Shared Table Addon Conformance — Contributor Notes

> **Table guide**: `docs/architecture/table.md` — § The extensibility gate, § An addon's own state slice (axis 1, continued)
> **Table library notes**: `libs/shared/table/AGENTS.md` — § Addon state and the extensibility gate (ARCH-250, corrected by ARCH-274)
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

**Bespoke shared library** — outside the auto-injected lib-type standard system; these notes are
the guidance. The directory name matches no `libs/*/<type>/**` glob, so for a file written here
`.claude/hooks/inject-standards.sh` injects only the global constraints and anti-patterns plus this
file — no lib-type standard. The `type:design-library` tag in `project.json` is there because the
lib extends a component kit (`@nge/table`) and must sit on that kit's rung of the dependency ladder;
it routes ESLint's boundaries, not the hook (`docs/ai-instructions/standards/lib-types/design-library.md`
applies to `libs/*/design-library/**` only, and it is written for a kit of components — this lib ships
none).

## Shared specifics

- **Purpose**: a standing conformance test for `@nge/table`'s first extension axis — a stateful
  TanStack `TableFeature` (`acmeRowFlagging`, `src/lib/acme-row-flagging/`) that ships from a
  _different Nx project_ than `libs/shared/table`, plus the spec that proves it works. It ships no
  product code; being a separate project is the whole of what it demonstrates. `README.md` here says
  what is under test and why the addon is named `acme`.
- **What it proves**: from outside the library, a package can declaration-merge one optional,
  `acme`-namespaced slice (`acmeRowFlag?: AcmeRowFlagState`) into both `NgeTableState` (through the
  public `@nge/table` specifier) and TanStack's `TableState` (through `@tanstack/angular-table`),
  register through `provideNgeTableFeatures(acmeRowFlagging)` alone, and have its writes land in the
  **host-owned** state and leave through the component's `stateChange`. If that property breaks,
  this project's spec fails before a real external addon discovers it.
- **Consumed as** `@nge/table-addon-conformance` (`tsconfig.base.json`). Nothing in the workspace
  imports it — its consumer is its own spec, which registers the addon on the TestBed module the way
  a host component registers it in `providers` (`provideNgeTableFeatures` must resolve from an
  ancestor injector of `NgeTableComponent`). A host that switches it on must set `config.getRowId`:
  flags are keyed by row id, and without one a sort or re-fetch moves them onto different records.
- **Tags** `scope:shared` + `type:design-library`. The root `eslint.config.mjs` `depConstraints` let
  `type:design-library` depend only on `type:models`, `type:themes`, `type:utils`, `type:mocks`,
  `type:storybook` and `type:design-library` (`@nge/table` is a peer kit, so it is allowed), and
  `scope:shared` only on `scope:shared`. Never `type:store`, `type:ui`, an app, or anything under
  `libs/ledger/`. External deps: `@tanstack/angular-table` only — **never `@tanstack/table-core`**,
  which is not a declared dependency; the adapter's `index.d.ts` is
  `export * from '@tanstack/table-core'`, so augmenting the adapter merges into the core's `TableState`.
- **Rules the addon file encodes** (each has a `⚠️` comment at the site):
  - augment through **public specifiers**, never a relative path — the star-export is what makes the
    merge land on the library's own interface;
  - the augmenting file must `import` the module it augments, or TypeScript raises TS2664 and
    silently drops the augmentation;
  - both slice fields stay **optional** — `createNgeTableState()` cannot know about an addon's slice,
    so every updater normalises `undefined` rather than assuming `getInitialState` ran;
  - no instance member named `get*` — `@tanstack/angular-table` proxies the instance and turns every
    `get*` accessor into a computed, which swallows arguments (hence `readAcmeRowFlags`);
  - a clear on an unflagged table returns the **same reference**, so `makeStateUpdater` does not
    churn the host's state or emit a `stateChange`;
  - the spec asserts `store.tableState()` and `stateChange`, **never the instance** — an addon can
    render and toggle while `NgeTableState` never moves.
- **Targets**: `test`, `lint`, `typecheck` — no `build`, so lint + test never run `tsc`; the
  `typecheck` target covers `tsconfig.lib.json` and `tsconfig.spec.json`. Run it with the library it
  guards: `npx nx run-many -t lint test typecheck -p shared-table shared-table-addon-conformance`.
  Tests are zoneless (`setupZonelessTestEnv` in `src/test-setup.ts`).
- Test: `npx nx run shared-table-addon-conformance:test` · Lint: `npx nx run shared-table-addon-conformance:lint` · Typecheck: `npx nx run shared-table-addon-conformance:typecheck`
