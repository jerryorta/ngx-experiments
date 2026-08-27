# Testing Strategy

## Overview
- Unit tests: Jest with Angular preset (NOT Jasmine - this workspace uses Jest exclusively)
- E2E tests: Playwright
- All libraries and apps have test configurations
- Run specific tests with `nx test [project-name]`
- Test coverage outputs to `{workspaceRoot}/coverage/{projectRoot}`

## Jest Configuration
Projects in the workspace are configured with:
- **Zoneless test env** - `setupZonelessTestEnv` from `jest-preset-angular/setup-env/zoneless` is the required setup (`docs/ai/CONSTRAINTS.md` § Zoneless Change Detection). 32 `test-setup.ts` files use it; 37 legacy ones still call `setupZoneTestEnv` and are pending migration — that section lists them.
- **Firebase polyfills** - fetch and Response polyfills for Firebase compatibility
- **ESM module support** - Proper transformIgnorePatterns for modern ES modules (GSAP, D3, es-toolkit, etc.)
- **Module name mapping** - Handles GSAP and other library imports correctly

## Node 24 jest-worker SIGSEGV

Under Node 24, any jest target in this workspace can fail with no assertion failure at all:

```
● Test suite failed to run
  A jest worker process (pid=N) was terminated by another process:
  signal=SIGSEGV, exitCode=null.
```

Nx labels the target "a flaky task". The suite named in the failure is innocent — a worker
process died and whichever suite it happened to be running is what gets reported, so the
blame lands on a different spec each time.

**Cause — an upstream V8 defect, not workspace code.** Every such crash on this stack carries one
signature: `ClearStaleLeftTrimmedPointerVisitor::VisitRootPointers` → `InternalFrame::Iterate`,
faulting on a near-null address while V8 iterates stack roots. A garbage collection triggered from
a half-built Sparkplug ("baseline" tier) frame — the `Builtins_BaselineOutOfLinePrologue` stack
check — walks that frame as though it were complete and dereferences its uninitialised stack slots.
The collector underneath is usually `MarkCompactCollector::MarkRoots` (23 of 24 crash reports
sampled) and occasionally `ScavengerCollector::CollectGarbage`; both reach the same visitor through
`Heap::IterateRoots`, so the GC generation is incidental. Tracked as nodejs/node#62393 (V8 issue
483731079); fixed in Node 25 / V8 14.1 and **not** backported to Node 24. Node 20 and 22 are
unaffected.

**Mitigation — two halves, and the second is not optional.** `--no-sparkplug` removes the frame
shape the collector trips over. The flag is rejected inside `NODE_OPTIONS`, so it has to arrive as
a real exec argument; `jest-worker` forks its children with `process.execArgv`, so `jest.preset.js`
pushes it there before the worker farm is created.

That reaches workers only — a V8 flag applies at process start, and jest's own process is already
running by the time it loads the preset. Which matters more than it sounds, because jest schedules
in-band far more often than the `--runInBand` flag suggests: `shouldRunInBand` in `@jest/core` also
returns true for a single test file, and for any project under 21 specs once a warm `perf-cache`
says they run fast. Both would put the whole suite in the unprotected parent, with no flag typed by
anyone. So the preset also sets `workerIdleMemoryLimit`, which is the documented opt-out — jest
skips the entire heuristic when a memory limit is configured. Measured: a single-file run reports
`process.argv[1]` as `.../jest-worker/build/processChild.js` with the limit set, and
`.../node_modules/.bin/jest` without it. The limit value is incidental; the scheduling is the point.

Together those two lines cover all 82 Nx jest projects. Five configs sit outside the preset —
the concierge and got-you backends' `functions/jest.config.cjs`, their `jest.rules.config.cjs`,
and got-you's `jest.tools.config.cjs` — and each carries the same guard inline; those backends pin
Node 22 in their own `.nvmrc`, where the bug does not exist, so their copy only matters in a shell
that skipped `nvm use`. Every copy is gated on `process.versions.node.startsWith('24.')` and goes
inert by itself once the workspace moves off Node 24 — at which point all six can be deleted.
Losing the baseline tier costs nothing measurable here: `cognition-design-library:test` averaged
2.83 s over 12 runs without the flag and 3.00 s over 20 runs with it, on a target whose wall clock
is dominated by process startup.

Enumerating those configs is easy to get wrong twice over: three of the five are named
`jest.rules.config.cjs` / `jest.tools.config.cjs`, so a `jest.config.*` sweep misses them, and
`libs/` still holds 18 stale `jest.config.*.bak` files that inflate any naive count. The inventory
to trust is

```
find . -not -path "*/node_modules/*" -iname "jest*.config.*" ! -name "*.bak"
```

which returns 88 today: 82 preset consumers, the 5 standalone backend configs, and the root
`jest.config.ts` aggregator.

**Re-verify the mechanism on any `jest` / `jest-worker` bump.** Worker inheritance rests on
`jest-worker` defaulting its forks to `execArgv: process.execArgv.filter(...)` — verified in
`jest-worker@30.4.1` at `node_modules/jest-worker/build/index.js:767`. That is an implementation
detail, not a documented config surface. If a later version stops forwarding the parent's exec
args, the flag silently stops reaching workers and the SIGSEGV returns looking like a fresh bug,
with nothing in lint or the suites pointing back here. Confirm after an upgrade with a throwaway
spec that logs `process.execArgv`; it should print `["--no-sparkplug"]` from inside the worker.

**What is still not covered.** `shouldRunInBand` short-circuits to `true` on explicit `--runInBand`
or `--detectOpenHandles` before it ever consults `workerIdleMemoryLimit`, so those two flags still
run the suite in the unprotected parent. Launch such a run with the flag directly instead:

```
node --no-sparkplug ./node_modules/nx/dist/bin/nx.js run <project>:test --runInBand
```

The mitigation also assumes jest's default **fork**-based worker pool. `jest-worker`'s
`worker_threads` backend (`workerThreads: true`) never reads `process.execArgv` when it constructs
a `Worker`, so turning threads on would silently strip the flag. Nothing in this workspace sets it
and jest's default is `false`; if that ever changes, this mitigation has to change with it.

The five standalone backend configs deliberately take only the `execArgv` half, not
`workerIdleMemoryLimit`. Those backends run on Node 22, where the bug does not exist, so forcing
their suites off jest's default scheduling would change how they execute and buy nothing.

**Measured, so the next person does not re-derive it.** Failure rate over 12–25 `--skip-nx-cache`
runs per target, before the mitigation: `cognition-design-library` 3/12, `cognition-ui` 3/15,
`concierge-design-library` 2/15, `got-you-design-library` 1/15. It was never cognition-specific.
With the mitigation the same four ran over **200 consecutive times clean** —
`cognition-design-library` alone accounting for 138, of which 45 were against the final two-half
version — and three full workspace-wide `nx run-many -t test --skip-nx-cache` sweeps produced no
SIGSEGV at all. Node 22 was clean across 25 runs of the same target.

**Ruled out, with the evidence:**

- **A workspace code change.** The 3/12 baseline above was measured on an unmodified checkout of
  `main`, and the macOS crash reports carrying this signature go back a week further still.
- **`--runInBand` / lowering `maxWorkers`.** Does not fix it — it relocates it. In-band, the crash
  takes the main jest process instead, and the task dies with no jest output at all (1/15). Process
  count changes the odds, not the hazard.
- **`--max-semi-space-size=64`.** Measured at 4/25 — no help. Enlarging the young generation
  changes how often each collector runs, but the fault is in the root iteration both of them
  share, so rescheduling GC only reshuffles the odds.
- **`--jitless`.** Removes the baseline tier, but takes WebAssembly with it, and every one of 25
  runs died before a single test with
  `Error [ERR_WEBASSEMBLY_NOT_SUPPORTED]: WebAssembly is not supported in this environment, but is
  required for TypeScript`.
- **Memory pressure and native modules under jsdom** (the initial hypotheses). The dying processes
  are 1–6 s old with the heap still in its startup growth phase, and the fault is inside V8's own
  root iteration, above any native binding.

## Writing Tests
When writing tests:
- Use Jest matchers (e.g., `expect().toBe()`, `expect().toEqual()`)
- Use `jest.fn()` for mocks, NOT `jasmine.createSpy()` or `jasmine.SpyObj`
- Use `jest.spyOn()` for spying on existing objects
- Import testing utilities from `@angular/core/testing`
- Mock external dependencies to avoid complex import chains
- Use `@Component` mock components for simpler isolated testing

## Test Commands
- **Run tests for a library**: `nx test [library-name]` (e.g., `nx test shared-api`)
- **Run tests for an app**: `nx test [app-name]`
- **Run all tests**: `npm test`
- **Run affected tests**: `npm run affected:test` - Test only affected projects

## Type-checking a `.spec.ts`

`lint` and `test` both pass straight over a **type** error in a spec file, so neither gate can see
one. The spec type-check is a separate command:

```bash
npx tsc -p libs/<lib>/tsconfig.spec.json --noEmit
```

Cognition's libraries wire this to an nx target that covers the library source too, so it can be run
without remembering either path:

```bash
npx nx run-many -t typecheck -p cognition-models,cognition-store,cognition-ui,cognition-utils,cognition-design-library
```

Reach for it whenever a spec's stub or fixture shape changes. It is also the cheapest way to catch
the `createFeature` optional-property trap (COG-121) — seconds, against a full app build — and it is
the only automated reader of `tsconfig.lib.json` for any library with no `build` target
(`cognition-store` and `cognition-ui` among them).

⚠️ **A `tsconfig.spec.json` must not override its library's `moduleResolution`.** `node10` cannot
resolve `exports`-map subpaths, so `@angular/core/testing`, `@ngrx/store/testing` and
`@ngrx/effects/testing` all fail `TS2307` and cascade implicit-`any` noise across files that are
otherwise clean — enough of it to make the command unreadable and therefore unrunnable. The spec
config inherits `bundler` / `preserve` from the library's own `tsconfig.json`; leave it alone.
`jest-preset-angular` reads that same config as its transform tsconfig and is content with it
(COG-150).

## Test File Structure
- Test files are colocated with source files using `.spec.ts` extension
- Each library has its own `jest.config.ts` and `project.json`

## Best Practices
1. Write tests alongside implementation
2. Focus on behavior, not implementation details
3. Use meaningful test descriptions
4. Keep tests isolated and independent
5. Mock external dependencies appropriately
6. Aim for high code coverage but prioritize meaningful tests