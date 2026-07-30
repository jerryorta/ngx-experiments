# Shared Table — Contributor Notes

> **Table guide**: `docs/architecture/table.md`
> **Epic plan (ARCH-239)**: `~/Dev/gigasoftware-plans/arch/ARCH-239.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`
> **Published write-up**: <https://jerryorta.dev/concepts/table-library-architecture> — the
> architecture essay, authored in the source monorepo alongside the library. ⚠️ **It is the
> destination when a story surfaces something worth writing about.** The interesting parts of an
> epic are the places the obvious answer was wrong, and those are exactly what gets smoothed out of
> the source once settled: a comment records what is *true*, deliberately not what was *tried*.
> There is no scratch notes file — a finding either earns a paragraph in the essay or belongs in the
> guide above as a live constraint. Write it while the reasoning is fresh either way.

## This file is ported, not authored — and that is deliberate

Every other `AGENTS.md` in this repo is written here from scratch, because a copy from the source
repo names the wrong libraries, prefixes and personas. This one is the exception: at ~2,100 lines it
is the library's **design record**, not a thin pointer, and re-authoring it would throw away the
reasoning behind every locked decision. So it is copied, put through the `nge`→`nge` transform, and
then hand-corrected wherever the source repo's own shape leaked through — the theme-bridge table,
the design-library component names used as examples, a Storybook secrets warning that has no
meaning here, and the **published write-up** pointer above, which is a URL here because the essay
is authored in the source monorepo and its repo-relative path means nothing in this one. If you re-port it after an upstream change, redo those corrections; the transform
alone will not.

**ngx deltas that no transform can derive:**

- **This repo is zoneless — `zone.js` is not installed.** Never `fakeAsync` / `tick` /
  `waitForAsync` in a spec here. They throw at suite *load*, which surfaces as "test suite failed to
  run" with zero failing tests rather than as a test failure. Use `jest.useFakeTimers()` +
  `jest.advanceTimersByTime(...)`, `await fixture.whenStable()`, or
  `TestBed.inject(ApplicationRef).tick()` — the last is Angular's zoneless change-detection trigger
  and is used throughout `nge-table-store.spec.ts`, so do not mistake it for the zone helper.
- **`src/test-setup.ts` is ngx-owned.** It carries the guarded `ResizeObserver` stub row
  virtualization needs. Any consuming library's Jest setup needs its own copy — `test-setup.ts` is
  per-project and nothing here can supply it.
- **There is no `libs/shared/store` and no Firestore.** Guidance elsewhere in the workspace that
  reaches for either does not apply to this library.
- **Selector prefix is `nge`, tokens are `--nge-table-*`, and story-internal classes stay bare**
  (`.story-section`, `.table-container`) — the table runtime emits BEM `.nge-table__*`, so unlike
  charts there is no collision surface needing a second `nge-story-*` namespace. Do not "align"
  the two.

## Shared specifics

- **Holds**: `@nge/table` — the `<nge-table>` system built on the **headless**
  `@tanstack/table-core` engine. Architecture, the four extension axes, the naming
  convention, the `--nge-table-*` token contract, and the locked substrate decisions all
  live in `docs/architecture/table.md`. Read it before touching anything here.
- **Wave 0 is complete.** The shell, naming convention, and token contract exist
  (ARCH-240); the shared fixture exists (ARCH-241); `<nge-table>`, `NgeTableConfig`, and
  the controlled-state contract exist (ARCH-242); the three-lane substrate and multi-column
  pinning exist (ARCH-243); column drag-to-resize exists (ARCH-244); row virtualization exists
  (ARCH-245); the render-slot seam exists (ARCH-246); the event-stream seam exists (ARCH-247);
  the data-pipeline seam and the `TableFeature` registration path exist (ARCH-248), which
  opens the fourth and last extension axis; and the per-feature story conventions plus the
  `/create-table-storybook` generator exist (ARCH-249). **Wave 1 is complete and the gate has
  returned its verdict: the seams hold.** Its first half (ARCH-250, cell highlighting) found one
  problem — the state axis was not additive and needed a general seam fix; see § Addon state and
  the extensibility gate. Its second half (ARCH-251, the CSV formatter and highlighted-cell export)
  then needed **no core edit at all** — see § The CSV formatter addon. **Wave 2 is the selection
  interactions**, built on seams the gate validated: row selection exists (ARCH-268), cell ranges
  exist (ARCH-269, and needed no core edit either), and column selection exists (ARCH-270, which
  needed no core edit and no slice of its own — it widened ARCH-269's descriptor instead).
  **Wave 3 is editing**, where the library first proposes a change to *data* and still never writes
  it: the fill handle exists (ARCH-271), and it is the first story since Wave 1 to need a core edit —
  a real finding, because extension axis 4 turned out to be closed to addons. **Wave 4 bridged the
  tokens** into all six persona themes (ARCH-277) and **Wave 5 honoured the last unconsumed one** with
  zebra striping (ARCH-286). **Wave 6 — rich cells — is complete**: the scroll baseline harness
  exists (ARCH-289), the fixture carries the rich-cell fields (ARCH-290), and charts in cells plus
  the scroll-settle signal exist (ARCH-291, which needed no charts-library change and no scroll
  listener of its own), as does inline editing as a cell pattern (ARCH-292 — the activation model,
  the `edit-intent` kind, a role-based interactive-element guard and the keyboard containment, with
  no editor components) and the first two of the table's own editors (ARCH-293 — an input and a
  checkbox behind a third entry point, plus the route that lets a library editor be a default a
  consumer's template shadows), the select over a CDK overlay (ARCH-294), the store's composition
  root regrouped into six `signalStoreFeature` units so the next concern has somewhere to go
  (ARCH-297), and the textarea editor closing the wave with the library's first explicit-commit
  control, because every implicit moment the other three editors use is unavailable to it
  (ARCH-296). **Wave 7 — row expansion — is complete**: a disclosure column and `state.expanded`
  for a detail band (ARCH-298), rich content in the open band needing no library code at all
  (ARCH-299), the band animating open with the close deliberately suppressed under virtualization
  (ARCH-300) and confirmed rather than assumed (ARCH-302), and the platform-gated growth affordance
  found still blocked, with an `@supports` fork refused on principle (ARCH-303) — ARCH-281 fixed a
  re-sort defect shared by both cell-marking overlays along the way. **Wave 8 is the showcase**:
  every shipped feature composed onto one table rather than demonstrated in isolation, and the
  composition defects only a full table surfaces (ARCH-304). Do not invent a seam ahead of its
  story, and do not put per-story detail in the epic.

### Non-negotiables (each was argued and settled — see the guide for the reasoning)

- **Flexbox lanes, not CSS Grid, not a semantic `<table>`.** Pinning is `position: sticky`
  on the **lane wrapper**, never per-cell. Lane geometry comes from the engine —
  `table.getLeftTotalSize()` / `getCenterTotalSize()` / `getRightTotalSize()`, the same
  reduction that backs `column.getStart('left')` / `getAfter('right')` — never hand-rolled
  arithmetic. (With a sticky lane wrapper the per-column offsets are what is no longer
  needed; the lane sticks at `left: 0` and its cells flow normally inside it.)
- **Virtualized rows position with `top`, never `transform: translateY`** — a transform
  creates a stacking context that breaks sticky pinned cells.
- **Controlled state**: table state lives outside the instance and is handed in via
  `state`, with every `onXChange` wired and re-emitted. Never read state back off the
  table instance as a source of truth.
- **Consumers never import `@tanstack/*`.** Re-export what they need behind the `nge`
  surface — that insulation is what keeps a future v9 migration internal to this library.
  TanStack's own interfaces (`Table`, `Column`, `Row`, `Cell`, `Header`, `ColumnDef`,
  `TableFeature`) are used **as-is** internally and are never re-namespaced.
  ⚠️ **This binds APPLICATION code, not addon authors.** Authoring a `TableFeature` means
  implementing the engine's own contract, so an addon imports `TableFeature` and
  `makeStateUpdater` from `@tanstack/angular-table` and augments it — there is no way to write
  one without naming the engine, and pretending otherwise would mean re-exporting the whole
  adapter. The insulation still holds where it matters: an app binds `config` / `state` /
  `stateChange` and never sees a `@tanstack/*` type. An addon accepts engine coupling knowingly,
  in exchange for the four extension axes.
- **Angular Material is banned here.** Never `--mat-sys-*` / `mat-*`. The
  `--nge-table-*` literal defaults are what let the library render with no theme applied.
- ⚠️⚠️ **`stories/performance/baseline/` is FROZEN — never add a feature to it.** Not striping,
  not selection, not an editor, not a chart in a cell, and no new flag on its `config` however
  small. It measures a *plain* virtualized table, and that is its entire value: it is the
  unfeatured case every other measurement is read against. Add a feature and it keeps the name
  "baseline" while measuring something else — every comparison drawn from it afterwards is wrong,
  and nothing will flag it. **A new feature's cost goes in a NEW story**,
  `stories/performance/<feature>/` (`Table/NgeTable/Performance/<Feature>/Interaction`), using the
  same `runNgeScrollBenchmark` harness and read against a baseline **re-run on the same machine in
  the same session** — the noise floor is not a constant (1.8% warm vs 4.2–4.8% shortly after a
  cold rebuild), so a figure from another day charges the machine's state to the feature. Details:
  `docs/architecture/table.md` § The scroll baseline (ARCH-289).
  ⚠️ **It renders `NGE_TABLE_FIXTURE_COLUMNS` wholesale**, so a column added to the shared set is a
  feature added to the frozen story by the back door — the reason ARCH-290's row fields deliberately
  ship without columns. Adding row *fields* did not move it (re-captured after ARCH-290: p95 median
  17.1ms, 0 dropped, `rowsAdded` 714, all inside the recorded band); adding a *column* would, and
  whoever does it re-captures.

### `--nge-table-*` tokens

Defaults: `src/lib/styles/_table-tokens.scss` (a `:root` block of literal light-mode
values), forwarded through `_theming.scss` → `_index.scss`. At **use** sites always pair
the token with a literal fallback — `var(--nge-table-cell-padding-x, 12px)` — so the
table still renders if a consumer forgets to import the partial.

**Geometry is mirrored in TypeScript.** `NGE_TABLE_DEFAULTS`
(`src/lib/nge-table-defaults.ts`) duplicates the metric tokens because virtualization and
resize math need them as numbers and cannot measure un-rendered rows.
`nge-table-defaults.spec.ts` asserts parity — **change one, change both**, or that spec
fails.

**Two things have to be true for a theme to reach the table** (ARCH-277), and only the
second is obvious:

1. **The host loads this token partial, before its theme mixins.** `_table-tokens.scss`
   declares `:root`, and `:root` scores (0,1,0) — *equal* to a single class like
   `.dlc-professional-dark`, not lower. Source order breaks the tie, so a host that loads
   the partial after its themes has the defaults overriding every bridge. Charts paid for
   this once (ARCH-236). `apps/storybook-app/src/styles.scss` loads both libraries' partials
   above the theme `@use` lines; an app adopting the table must do the same.
2. **Each theme declares a bridge.** Six files carry a `// --- Table token bridge ---` block,
   the same six that carry a chart bridge:

| Domain | Files |
| --- | --- |
| professional | `libs/shared/themes/src/lib/styles/professional/_dlc-professional-{light,dark}.scss` |
| home | `libs/shared/themes/src/lib/styles/home/_dlc-home-{light,dark}.scss` |
| service-provider | `libs/shared/themes/src/lib/styles/service-provider/_dlc-service-provider-{light,dark}.scss` |

A bridge owns the ~23 tokens carrying colour, elevation or type, and maps them onto that
theme's own variables — never onto literals, or a later palette change never reaches the
table. **Every pinned surface is bridged explicitly in all six**, because a pinned lane is
`position: sticky` and opaque by requirement: one left on the light default is a pale
rectangle punched through a dark table.

Deliberately **not** bridged, and a bridge adding one is a bug rather than an improvement:
geometry (`row-height`, `header-height`, `cell-padding-*`) because `applyGeometry` writes it
**inline on the host** where no class can reach it and density belongs to `NgeTableConfig`;
the `column-*-width` / `selection-column-width` family because `NGE_TABLE_DEFAULTS` mirrors
it as TypeScript numbers; the `--nge-table-internal-*` family, z-indexes and sticky offsets
because they are structure; the font **sizes** because no domain theme has a type scale;
`row-detail-duration` for the same reason as the sizes — no domain theme has a motion scale, so a
bridge entry could only be a literal, and a consumer that wants a different tempo (or `0ms`) sets it
where it applies; and `row-surface` / `resize-handle-color`, whose `transparent` defaults are a
design decision the library owns (a row shows the surface through it, the resize grip is invisible
at rest).

**One test covers all of those:** *would a bridge entry here teach a contract the table does not
honour?* If yes, the token is not a theme's business — whether it is inert because the component
overrides it inline, because no mapping exists that is not a literal, or because no code reads it.

⚠️ **Editing a theme partial does not rebuild Storybook's CSS.** The theme files resolve through
`stylePreprocessorOptions.includePaths`, and webpack does not treat them as dependencies of
`apps/storybook-app/src/styles.scss`, so a changed bridge is **not** picked up: the page reloads with
the previous CSS and the bridge looks broken. `touch apps/storybook-app/src/styles.scss` to force the
rebuild, then reload. Verify by reading the token off the element the theme class sits on — in
Storybook that is `<body>`, not `<html>`.

All three personas bridge in both modes, so there is no unbridged theme here to exercise the
"renders with no theme applied" property. To see the literal defaults, render a story with no
persona class on `<body>` — the `:root` partial loaded by `apps/storybook-app/src/styles.scss`
is what supplies them.

### The entry component and controlled state (ARCH-242)

`<nge-table>` (`src/lib/nge-table/`) is the library's **only** public boundary:
`config` in, `state` / `stateChange` across, nothing else. Its component-scoped
`NgeTableStore` (`src/lib/nge-table/store/`, `providers: [NgeTableStore]`, never
`providedIn: 'root'`) owns the engine instance and the effective state.

- **`buildTableOptions` is the single translation point.** Every `@tanstack/*` option name
  in the library appears in that one function, which is what makes the facade real rather
  than nominal. Add a feature's row model and flags there; do not scatter engine options.
- **All ten state slices are already routed** through `applyTableStateChange`, even though
  only the core and sorted row models are wired. Switching on filtering / selection /
  expansion / grouping / pagination is an options line, not a redesign — that is the point
  of shipping the whole contract in Wave 0.
- **`NgeTableState` is declared, not aliased to TanStack's `TableState`.** It is narrower
  (filter payloads are `NgeTableJsonValue`, not `unknown`) so "this state can be persisted
  to Firestore" is a compile-time property; `nge-table-state.spec.ts` asserts the JSON
  round trip. The two casts in `buildTableOptions` are where that promise is imposed.
- **The `state` ↔ `stateChange` loop is closed by reference identity.** The component keeps
  a `lastSyncedState` and skips whichever direction already carries that exact object.
  Break that and a two-way `[(state)]` binding oscillates forever.

### The lane substrate (ARCH-243)

Three flexbox lanes per row — pinned-left, center, pinned-right — with pinning as
`position: sticky` on the **lane wrapper**. The DOM shape and the reasoning are in the guide
(`docs/architecture/table.md` § The lane substrate in practice). What bites in this directory:

- **Lane widths are host-level `--nge-table-internal-*` properties, never per-lane inline
  styles.** `<nge-table>`'s `syncLaneGeometry` effect writes four properties on the host and
  the stylesheet sizes everything from them — one write per state change instead of touching
  3 × (rows + 1) elements, which is the difference that decides whether virtualization
  (ARCH-245) scales. The numbers are the engine's own totals; never compute them here.
- **`--nge-table-internal-*` is deliberately absent from `_table-tokens.scss`.** The family
  holds values the table resolves for itself rather than reads — lane widths measured by the
  effect above, and `--nge-table-internal-row-surface`, which a CSS rule sets per row to pick
  the zebra surface (ARCH-286). Neither is a themeable contract: a theme sets
  `--nge-table-row-surface-alt` and the table decides which rows get it. Add a *themeable*
  value to the partial; add a *derived* one here.
- **Never put a `transform` on a row or a lane.** It creates a stacking context, and a
  stacking context breaks sticky positioning for everything inside it. This is the same wall
  AG Grid hit, and it is why virtualized rows position with `top` (ARCH-245).
- **Do not add `overflow: hidden` to a lane.** Cells already clip their own content, and
  clipping the lane would cut off ARCH-244's resize handle where it overhangs the last pinned
  cell.
- **The header band's background belongs to `.nge-table__header-row`, not
  `.nge-table__header`.** The sticky wrapper is a block child of the scroll viewport, so it
  is only ever as wide as the viewport; the row is as wide as the table. Painting the band on
  the wrapper leaves it running out mid-scroll.
- **Bound a table's height on `<nge-table>` itself, never on a wrapper around it.** The host
  is a flex column and `.nge-table__viewport` is `flex: 1 1 auto; min-height: 0`, so a
  `height` / `max-height` on the host constrains the scroller. A `max-height` on an ancestor
  `div` is simply overflowed — the scroller grows to fit every row, nothing scrolls
  vertically, and the sticky header has nothing to stick against. Both story SCSS files
  target `nge-table` for exactly this reason.
- **The template iterates lanes, it does not branch on them.** `store.headerRows()` and
  `store.laneCellsFor(row)` return `{ kind, items }` and drop the empty lanes, so the
  header-cell and cell markup exist once each. A fourth lane kind is a `toNgeTableLanes()`
  entry plus a CSS class — never a new template branch.
- **`enablePinning: false` suppresses the lanes, not just a future affordance.** The engine
  reads `state.columnPinning` raw and never consults `getCanPin()`, unlike sorting, which it
  filters through `getCanSort()`. `applyPinningCapability` in `buildTableOptions` closes that
  gap. It returns the *same reference* when nothing is pinned — do not "simplify" it into an
  unconditional spread, or every rebuild would look like a host state change to the
  boundary's identity check.
- **jsdom asserts structure, never geometry.** The specs can prove three pinned columns land
  in one lane and that no cell carries a `left`; `position: sticky` and resolved offsets are
  browser-only.

### Column drag-to-resize (ARCH-244)

`enableColumnResizing: true` puts a grip on each header's trailing edge; widths land in
`state.columnSizing`. The math is `store/nge-table-resize.ts` (pure, unit-tested), the gesture
is four `onResize*` methods on `<nge-table>`, the state lives in `NgeTableStore`. What bites:

- **Never reach for `header.getResizeHandler()`.** The name lies: it is a **mouse-and-touch**
  handler that attaches `mousemove` / `mouseup` *or* `touchmove` / `touchend` to the **document**
  (`../open-source/table/packages/table-core/src/features/ColumnSizing.ts:343-513`). Using it means
  two bindings, no pointer capture, and a document listener that outlives a header virtualization
  recycled. This library runs one `pointerdown` → `setPointerCapture` → `pointermove` → `pointerup`
  gesture instead — same shape as `libs/shared/charts/src/lib/core/gesture/range-axis-brush.ts`.
  Its *arithmetic* is kept, in `resizeColumnSizing()`.
- **`touch-action: none` on the grip is load-bearing, not cosmetic.** Without it the browser claims
  the gesture for scrolling and never delivers `pointermove` — the grip silently does nothing on a
  touchscreen and there is no error to explain why. jsdom cannot catch this; only a real touch can.
- **Clamp on the write, not only on the read.** The engine clamps inside `getSize()` and its own
  drag math clamps to `>= 0` alone, so an engine-driven resize renders fine while leaving
  out-of-range numbers in the state a consumer persists. Bounds come from `columnDef.minSize` /
  `maxSize`, which the engine has already merged with the config's `columnMinWidth` /
  `columnMaxWidth` — never re-derive that precedence.
- **A header cell must not clip.** `overflow: hidden` lives on `.nge-table__cell` alone; the grip
  half-overhangs the header cell's trailing edge and a shared `overflow` would cut it in two.
  `.nge-table__header-label` owns the ellipsis, so nothing is lost. Same reason a **lane** must
  never take `overflow: hidden`.
- **`stopPropagation` on the grip is what stops a drag re-sorting the column.** The grip sits inside
  a header cell whose click toggles the sort — `pointerdown`, `click`, and `dblclick` are all
  stopped. There is a spec for it; do not "tidy" them away.
- **The capability-flag asymmetry check, run and answered.** `column.getCanResize()` reads
  `columnDef.enableResizing ?? true` **&&** `options.enableColumnResizing ?? true`, so the engine
  already gates the affordance and no `applyPinningCapability` sibling is needed. A width the *host*
  set still applies with the flag off — deliberate, and the opposite of pinning: switching resizing
  off withdraws the *user's* ability to drag, it does not discard widths the application chose.
- **Keyboard lives on the header cell, not on the grip.** The grip is pointer-only and
  `aria-hidden`; the cell is focusable when sortable **or** resizable and handles `Shift`+`←`/`→`
  (16px steps) and `Shift`+`Home` (reset). A focusable grip would double the header's tab stops for
  a control the later a11y story will fold into roving-tabindex grid navigation anyway.
- **`columnSizingInfo` is not wired and should not be.** It is engine scratch state for the engine's
  own handler; our drag state is `NgeTableStoreState.resize`, and neither belongs in the persisted
  `NgeTableState`.

### Row virtualization (ARCH-245)

`enableVirtualization: true` renders only the rows near the viewport. The virtualizer lives in
`NgeTableStore` (`injectVirtualizer`, `@tanstack/angular-virtual`); the positioning arithmetic is
`store/nge-table-virtual.ts` (pure, unit-tested). The reasoning is in the guide
(`docs/architecture/table.md` § Row virtualization). What bites in this directory:

- **`top`, NEVER `transform: translateY`, and it fails invisibly.** A transform creates a stacking
  context which breaks `position: sticky` for every pinned lane inside the row. A transformed row
  looks perfectly correct until a column is pinned, so this is not something a later change can
  "optimize" and find out about from a test.
- **`scrollMargin` is the number to get wrong.** The header shares the body's scroll viewport and is
  sticky *in flow*, so the rows start a header's height down the scrollable content. Miss it and a
  blank strip appears under the header mid-scroll — a symptom that reads like a virtualization bug
  and is really an off-by-one-header. `NgeTableStore.scrollMargin` is *header-row count* × header
  height (grouped columns stack a header row per level), and `toNgeTableVirtualRows` subtracts it
  back off, because TanStack folds it into `start` but leaves it out of `getTotalSize()`.
- **The window comes from `table.getRowModel()`** — the processed rows. Never `config.data`, or
  sorting and filtering would stop reaching the window.
- **`enabled` is a genuine gate, so nothing needs an `applyPinningCapability` sibling here.**
  `virtual-core` skips `getScrollElement()` in `_willUpdate` and returns `[]` from `getMeasurements`
  when it is false — no `ResizeObserver`, no scroll listener, no measurements. Verified by reading
  the source, not assumed; every future flag still gets the same check.
- **`applyGeometry` pins `--nge-table-row-height` while virtualizing.** Normally an absent
  `config.rowHeight` hands the token back to the theme; here the resolved value is always written,
  because offsets are `index × rowHeight` and a theme moving the token would overlap the rows rather
  than restyle them.
- **One row loop, no template branch.** `store.renderedRows()` is the window or every row in the same
  `{ row, ariaRowIndex, top }` shape; `top: null` puts the un-virtualized table back in normal flow
  because Angular drops the property. Do not add a second loop.
- **`aria-rowindex` is on header rows and body rows both.** Without it a screen reader counts the
  rows it can see and announces "of 27" for a table of ten thousand.
- ⚠️ **jsdom renders NO window, and that is the engine being right.** `calculateRange` returns `null`
  the moment the viewport measures zero, and jsdom lays nothing out — so a virtualized store on its
  own renders nothing. The component spec works around it by stubbing `HTMLElement.prototype
  .offsetHeight` (the one property `virtual-core` reads to size the viewport) for the duration of the
  describe. Everything past that — where the window lands, whether pinned lanes survive a fast
  scroll — is browser-only.
- **`ResizeObserver` is shimmed in `src/test-setup.ts`.** `virtual-core` is null-safe about its
  absence so specs pass either way; the shim makes the observing path actually run. ⚠️ **A consuming
  library's Jest setup needs its own** — `test-setup.ts` is per-project. Same shape as the charts
  precedent in `libs/shared/charts/src/test-setup.ts`.
- **Row heights are COMPUTED, never measured** — and since ARCH-298 they are no longer uniform: an
  expanded row is `rowHeight + rowDetailHeight`. The property virtualization needs is that a size be
  knowable *before* the row is rendered, which a declared band height keeps and `measureElement`
  would give up. Header/column virtualization and `scrollToIndex` are still later stories — do not
  smuggle them in, and do not read "variable heights landed" into this.

### The render-slot seam (ARCH-246)

Consumers project `ng-template`s into `<nge-table>`: `[ngeCell]` keyed by column id,
`[ngeTableSlot]` keyed by one of eight names. The directives and contexts live in `src/lib/slots/`,
the indexing in `src/lib/nge-table/store/nge-table-slot-registry.ts` (pure, unit-tested), and the
lookups on `NgeTableStore`. The reasoning is in the guide (`docs/architecture/table.md` § Render
slots). What bites in this directory:

- **`flexRender`'s `content` input cannot take a bare `TemplateRef`** — its type is
  `string | number | ((props) => …) | null`, and only the *return* of that function may be a
  template. So a cell template travels as a thunk. ⚠️ **The thunk's identity must be stable.**
  `ngOnChanges` on `content` sets `ContentChanged`, which calls `viewContainerRef.clear()` and
  rebuilds the embedded view — so a thunk allocated per change-detection pass destroys and recreates
  every custom cell on every cycle. It is built once in `toNgeCellTemplateMap`, and
  `cellTemplateById` recomputes only when the projected set changes. A spec asserts the identity.
- **Cell contexts are memoised; header and row contexts are NOT, and that asymmetry is deliberate.**
  A `Cell` is created with its row model and its value cannot move under it — anything that changes
  a value rebuilds the row model and every cell with it. But a `Header` survives a sort *and* a
  resize while `sortDirection` and `width` both move, and a `Row` survives an expand while
  `isExpanded` moves. Caching those two would serve stale values; they are rebuilt per read, and
  `ngTemplateOutlet` updates a context object rather than recreating a view, so it costs nothing
  worth caching against.
- **`contentChildren` stays on the component, never on the store.** Same division as
  `setScrollElement`: the component owns the view, the store owns what is derived from it. It is
  also what keeps an Angular query signal off the store's props, where it would trip the
  TS4023/TS4029 declaration-emit trap below.
- **Nothing in the directives, the registry, or either resolver names a slot.** That is the property
  ARCH-250 / ARCH-251 audit, and it is what makes a ninth name cost a name. `NgeTableSlotContextByName`
  is a mapping over the name union rather than a loose interface, so **adding a name without deciding
  its context fails to compile** — keep it that way; flattening it into an interface would silently
  hand consumers an untyped binding.
- **The engine reports an unsorted column as `false`; the context translates it to `null`.** So
  `@if (header.sortDirection)` means what it looks like, and `?? 'x'` reaches the fallback. A spec
  pins this precisely because `false ?? 'x'` would not.
- **`header-cell` replaces the label, it does not wrap it** — these slots exist for the sort and
  filter forms a later story will host. The header cell's own click toggles the sort, so a control
  inside one needs `$event.stopPropagation()`, exactly like ARCH-244's grip. The interaction story
  shows both sides of that.
- **The `loading` band is a sibling of the viewport, not a child**, absolutely positioned against the
  host — it has to cover the sticky header too. The host takes `position: relative` for it. ⚠️ Never
  give the host a `z-index`: `position: relative` with `z-index: auto` is a containing block *without*
  being a stacking context, and a stacking context would strand every pinned lane inside it.
- **`.nge-table__row` gets `flex-wrap: wrap` only via `:has(.nge-table__row-detail)`.** A row's
  width is the engine's exact lane total, so its lanes fit by construction — but only just, and
  wrapping every row would let a sub-pixel rounding error drop a whole lane onto its own line.
- **`row-detail` composes with virtualization through a DECLARED height** (ARCH-298), not a measured
  one. `estimateSize` adds `config.rowDetailHeight` for an expanded row, so the rows beneath move
  down rather than being overlapped. See § Row expansion for the two things that keeps true.
- **Slot bands are styled, their contents are not.** What a slot renders is the consumer's markup
  carrying the consumer's styles. `ViewEncapsulation.None` means a rule reaching inside would
  actually land, which is exactly why there must not be one.

### The event stream (ARCH-247)

One `kind`-discriminated `NgeTableEvent` leaves through one `(ngeTableEvent)` output. The union and
the state-slice map live in `src/lib/events/` (pure, unit-tested); the sink is the first `withMethods`
block on `NgeTableStore`; the lifecycle pair is on `<nge-table>`. The reasoning is in the guide
(`docs/architecture/table.md` § The event stream). What bites in this directory:

- **`emitTableEvent` is the whole pipeline, and adding a kind must never touch it.** A closure sink
  (not signal state — an event is a notification, and holding it in state would make it replayable and
  invite a reader to treat the last one as truth), defaulted to a no-op and set once by
  `<nge-table>`. If a change to a new kind requires editing the sink, the seam is wrong.
- **⚠️ `columnSizing` is absent from `NGE_TABLE_STATE_EVENT_BY_SLICE` on purpose, and that absence
  IS the throttling contract.** A drag writes it on every `pointermove`; an entry there would emit
  sixty events a second for one gesture. `column-resize` comes from the three commit sites
  (`endColumnResize` / `nudgeColumnSize` / `resetColumnSize`), which are also the only places that
  know which column moved. A spec pins the absence — do not "complete the table".
- **⚠️ The change check is by VALUE, not by reference, and the engine is why.**
  `_autoResetPageIndex` fires on every row-model rebuild (`getSortedRowModel.ts:118` + 3 siblings) and
  calls `resetPageIndex()`, which writes a **new** `pagination` object holding the values it already
  held. With an `Object.is` guard every sort announced a phantom `pagination-change`. The value
  comparison is legitimate only because `NgeTableState` is JSON by construction — keep it that way.
- **⚠️ A `Column` captured before a state change does not see it.** The adapter's proxy is what
  re-applies the engine's options from current state, so a width read back after a write must go
  through `store.table.getColumn(id)` again. `resetColumnSize` reusing its own `column` reference
  reported the pre-reset width and silently emitted nothing — the bug a spec caught.
- **Host-driven state is silent.** `setTableState` emits nothing; only `applyTableStateChange`
  (everything the engine routes) does. Break that and `[(state)]` becomes an event source, and
  restoring a saved view replays as user activity.
- **`load-complete` / `render-complete` are guarded on the row model's reference identity**, which is
  what makes them mean "the rows moved" rather than "something recomputed". Consequences: a resize or
  a pin fires neither, and **scrolling a virtualized table does not re-emit `render-complete`**. The
  `!store.config()` guard matters too — `emitLoadComplete` is created *before* `syncConfig`, so
  without it the first thing a consumer would hear is a phantom load of zero rows.
- **`afterRenderEffect`, not `afterNextRender`, for `render-complete`** — it is reactive, so it
  re-runs when the row model changes without a hand-rolled re-registration. Specs must
  `await fixture.whenStable()` to see it; `detectChanges()` alone is not past the render.
- **The two `(click)` bindings carry an `eslint-disable` for `click-events-have-key-events` /
  `interactive-supports-focus`, with the reason inline.** The keyboard equivalent in a `role="grid"`
  is arrow navigation over a roving tabindex (the later a11y story), and satisfying the rule now would
  put a tab stop on every cell — worse for a keyboard user than the gap. Same call ARCH-244 made about
  the resize grip.

### The data-pipeline seam and feature registration (ARCH-248)

`readNgeExportData(options?)` reads the table as neutral export data; `provideNgeTableFeatures()`
registers addon `TableFeature`s. The reader is `src/lib/export/nge-table-export.ts` (pure,
unit-tested), the feature that puts it on the instance is its sibling, and the DI token is
`src/lib/features/`. The reasoning is in the guide (`docs/architecture/table.md` § The export seam).
What bites in this directory:

- ⚠️ **A feature method must NOT be named `get*`, and this is the trap the whole naming decision
  turns on.** `proxifyTable` converts every `get*` accessor on the instance into a computed
  (`../open-source/table/packages/angular-table/src/proxy.ts`). A zero-arity one — and `(options?) =>`
  **is** zero-arity, optional params do not count toward `fn.length` — becomes a `Signal`, so
  `table.getX({…})` silently discards the argument. A higher-arity one is cached by
  `JSON.stringify(args)`, and a function serialises to `{}`, so two different `cellPredicate`s collide
  on the key `[{}]` and the second caller gets the first one's cells. `readNgeExportData` sidesteps
  both: the proxy falls through to `target[prop] = table[prop]`, caching the raw closure once, and
  that closure reads the real table object which `setOptions` mutates in place. A spec pins it.
- ⚠️ **`_features` cannot come from `config`, and failing that way is silent.** `createTable` reads
  it once at construction, and `lazyInit` builds the instance from a `queueMicrotask` fired as soon
  as the store exists — before `syncConfig` has run, so `store.config()` is still `null`. The
  addon would simply never register. Hence the DI token, resolved in the same `withProps` factory
  that creates the table. This is the store's only injection; do not "simplify" it into a config
  field.
- ⚠️ **`selected` filters the processed rows; never `table.getSelectedRowModel()`.** That accessor is
  memoised off `getCoreRowModel()` (`table-core/src/features/RowSelection.ts`), so it answers in
  *source* order and includes rows the filters removed. `getFilteredSelectedRowModel()` fixes half of
  that and still needs the filtered row model wired, which it is not.
- **`getRowModel()` IS `getPaginationRowModel()`** (`table-core/src/core/table.ts`), which is why
  `page` reads it and `all` reaches one level up to `getPrePaginationRowModel()`. The two are
  identical until pagination is switched on — correct degradation, not a special case.
- **`formatted` is declared, never derived.** A cell is an arbitrary render target, so there is no
  general way to ask one what it displayed. It comes from `columnDef.meta.ngeExport.format`,
  namespaced because `ColumnMeta` is one globally-merged interface every addon shares. The
  `declare module '@tanstack/table-core'` blocks target the module that *declares* `ColumnMeta`,
  which is the most direct route and one of the few places the core package name appears here.
  Augmenting the `@tanstack/angular-table` that re-exports it merges just as well — a `export *`
  re-export resolves an augmentation's name through to the declaration behind it — and is what an
  addon outside this library uses, the adapter being the declared dependency (see ARCH-274).
- **Eager, ~170–230 ms for 10,000 rows × 7 columns** (70,000 cells) in one synchronous pass. Measured,
  and documented in the guide rather than silently shipped; a host exporting materially more should
  chunk. Do not add yielding here without a story for it.
- **Column order comes from the same three-lane composition as `columnIndexById`.** One definition of
  "visual order" backs both the export and `aria-colindex`; if one changes, change both.

### Addon state and the extensibility gate (ARCH-250, corrected by ARCH-274)

Cell highlighting (`src/lib/highlight/`) is the first addon, and building it *after* the core was
declared done is what the gate is. Three axes were additive as designed. **The state axis was
not**, and the way it failed is the part worth remembering.

- ⚠️ **An addon slice reaches the host through `onStateChange`, and leaving that unwired fails
  SILENTLY — in the direction that looks like success.** `makeStateUpdater` (what a
  `TableFeature`'s `getDefaultOptions` reaches for) writes via `table.setState`, which forwards to
  `options.onStateChange` and nowhere else. Before it was wired, the Angular adapter's own internal
  state signal absorbed every write, so highlighting rendered, toggled, and even survived a
  virtualized scroll while `NgeTableState` never moved and `stateChange` never fired. Reverting
  that one line today fails 7 specs — **and every `isNgeHighlighted()` assertion still passes.**
  A rendering addon is therefore not evidence the seam works; the host's state is.
- **`applyTableState` is the whole of the fix, and it names no slice.** It resolves a whole-state
  updater against `store.tableState()` — never `table.getState()`, which would fold the adapter's
  internal copy into the host's state and make the table a second source of truth — then runs every
  changed key through the existing `ngeTableStateEventFor` lookup. An addon key has no entry and
  so announces nothing, matching `columnSizing`'s deliberate silence.
- **Built-ins never reach it.** Each one's `getDefaultOptions` supplies its own `onXChange` as a
  *default*, and `buildTableOptions` overrides all eleven — so only a feature keeping
  `makeStateUpdater` (i.e. an addon) arrives. The handler is live despite the adapter capturing
  `resolvedOptions` once at construction, because it closes over the **store**, not over `config`.
  That is the opposite of `_features`, which is a *value* read once and therefore had to be DI.
- **An addon augments the interface's declaring module, and BOTH specifiers reach it.** In-library
  addons write `declare module '../nge-table-state'`, because a library cannot import its own
  barrel — the import is circular and Nx's module-boundary rule rejects a project reaching itself
  through its own alias. An addon in **another project** writes `declare module '@nge/table'`.
  `src/index.ts` re-exports the interface with `export *`, and TypeScript resolves an augmentation's
  name through a star-export to the declaration behind it, so both merge into one interface: an
  external slice is visible to `applyTableState` and `stateChange` exactly like an in-library one.
  ⚠️ **The augmenting file must also `import` the module it augments**, or TypeScript raises TS2664
  and drops that augmentation whole — which reads as the merge silently not happening.
- ⚠️ **A stateful addon augments `@tanstack/angular-table`, never `@tanstack/table-core`.**
  `makeStateUpdater<K extends keyof TableState>` refuses a key that is not on the engine's
  `TableState`, so the second augmentation is not optional; and the adapter is the workspace's
  *declared* dependency while the core is only its transitive one. The adapter's `index.d.ts` is
  `export * from '@tanstack/table-core'`, so augmenting it merges into the core's interface by the
  same star-export rule. An external addon therefore never names `table-core` at all.
- ⚠️ **`provideNgeTableFeatures` must resolve from an ANCESTOR injector.** `NgeTableComponent`
  provides `NgeTableStore` itself, so put the features on the hosting component — or, in a spec,
  on the TestBed module. `libs/shared/table-addon-conformance` is the worked example for all of
  this, and the regression guard: it is a *different Nx project* whose addon carries state, and its
  spec asserts the host's `tableState()` and the component's `stateChange`, never the instance.

  > **ARCH-274 corrected what ARCH-250 recorded here, and the correction is worth keeping.** The
  > limit as first written — "a re-export cannot be augmented, so a stateful addon must ship from
  > inside this library" — is not a TypeScript rule. It generalized an in-library *necessity* (the
  > circular self-import above) into a universal one. `tsc` disproves it directly, and so does the
  > precedent the note itself cited: augmenting `@tanstack/angular-table` does reach
  > `@tanstack/table-core`. Two options were weighed and rejected. A deep `@nge/table/state`
  > specifier: a second public identity for one type and a second sanctioned way to do the same
  > thing, buying nothing once the star-export rule is understood. A generic
  > `addons?: Record<string, NgeTableJsonValue>` bucket: gives up the per-slice typing the design
  > buys, and puts the JSON-by-construction property `nge-table-state.spec.ts` asserts under
  > permanent pressure. **The lesson generalises past this epic — a constraint discovered while
  > working around it is worth re-testing in isolation before it is written down as a rule.**
- ⚠️ **Two `declare module` blocks, not one.** The slice must exist on TanStack's `TableState`
  (so `makeStateUpdater` and `setState` type-check) *and* on `NgeTableState` (so the host sees
  it). Both **optional** — `createNgeTableState()` cannot know about an addon's slice, so a host
  building state the documented way hands in `undefined`, and every updater must normalise rather
  than assume `getInitialState` ran.
- ⚠️ **A `Cell` / `Table` augmentation must repeat the engine's type parameters verbatim** (TS2428),
  names included, even when unused — hence the scoped `no-unused-vars` disable in
  `nge-cell-highlighting.ts`. Renaming them to `_TData` rejects the merge.
- **Nothing may be named `get*`.** Same trap as `readNgeExportData`; the members are
  `isNgeHighlighted`, `readNgeHighlightState`, `writeNgeHighlight`, `ngeHighlightPredicate`.
- **Marks are id-keyed state, and a contiguous mark is a DESCRIPTOR.** `NgeHighlightState` holds
  enumerated `cells` for individually-picked ones, `ranges` (anchor row id, focus row id, column
  ids) for blocks, and `exclusions` for individually-*removed* ones; membership is a predicate,
  with exclusions checked first and winning outright.
- ⚠️ **A toggle must test the cell's EFFECTIVE state, never `cells.includes(key)`.** The naive
  version is a dead end that looks like nothing happening: clicking a range-covered cell adds a
  duplicate entry that changes nothing on screen, and clicking again removes it while the range
  keeps the cell lit — so such a cell can never be un-highlighted at all. That is why `exclusions`
  exists (a rectangle minus a cell is not a rectangle, so the block is subtracted from rather than
  reshaped) and why `toggleNgeHighlightCell` takes a row order. An exclusion is recorded **only**
  when a block would otherwise keep the cell lit, and they are dropped when no block remains.
  Shift-clicking the same block twice removes it — the gesture is its own undo. Enumerating one column of the 10k fixture is ~270 KB
  of JSON on every `stateChange` and a few columns exceed Firestore's 1 MiB limit — that breaks the
  persistable-view property, not merely the frame budget. ⚠️ **A range's membership follows the
  current view order**, so a re-sort re-shapes the block; the endpoints follow their records.
  ARCH-269 and ARCH-270 inherit this reading.
  ⚠️ **Re-deriving the membership is only half of it — the thing that PAINTS it has to re-run, and
  binding the addon's own slice is the intuitive choice that does not.** `isNgeCellHighlighted`
  re-derives correctly on every call, so an overlay whose `computed` depends on `cell` plus the
  `ngeHighlight` slice still freezes: a sort leaves the slice untouched, `getSortedRowModel`
  reorders the *same* `Row` instances, and the `@for`s track by id so the DOM moves rather than
  rebuilds — no input changes identity and the paint stays as it stood when the marks were made.
  `<nge-highlight-overlay>` therefore takes the **whole `NgeTableState`** (`[state]`, not the
  slice), which makes the dependency true by construction. ⚠️ Only a **re-sort** discriminates this
  in a test; see the range entry below for why a column reorder passes either way.
- ⚠️ **`config.getRowId` stops being optional** once anything marks a cell — without it the engine
  keys rows by array index and a sort moves every mark onto a different record.
- **A projected slot template cannot reach the table, and that is by design.** `cell-overlay` hands
  over a `NgeCellContext` and a template is instantiated with its *declaration* injector (the
  consumer's), so `NgeHighlightBridge` is provided in the consumer's injector by
  `provideNgeCellHighlighting()` and handed the instance by a companion feature. ⚠️ **The bridge
  is per-table** — one injector, one bridge, and the last table to attach wins. A component
  rendering several highlight-enabled tables must give each its own provider scope, which is what
  `stories/highlight/highlight-demo-table.component.ts` exists to do.
- **The addon paints the cell with `:has()` from its own stylesheet**, because `.nge-table__cell`
  is neither positioned nor a stacking context (ARCH-243 keeps it that way so pinned lanes stay
  sticky) and giving it `position: relative` would be a core edit. The cost is a documented
  dependency on core's BEM class names — the same dependency a theme has. Tokens carry literal
  fallbacks at their use sites rather than entries in `_table-tokens.scss`, for the same reason.
  No pinned-lane rule is needed: the tint sits on the cell, over the lane, and is opaque.
- ⚠️ **A shift-click gesture must `preventDefault()` the `mousedown`, or the browser extends the
  document's TEXT selection over the same cells.** The addon's tint and a native selection band
  render together and the result reads as a rendering bug. Gate it on `event.shiftKey` — do **not**
  reach for `user-select: none` on cells (that also kills selecting and copying a single cell's
  value, the trade ARCH-269's constraints already rule out), and do **not** call `preventDefault`
  unconditionally (it suppresses focus too, which breaks an `<input>` in a cell — inline editing is
  a supported cell pattern). `click` still fires after a prevented `mousedown`, so the gesture is
  unaffected. Reference: `stories/highlight/highlight-demo-table.component.ts` → `captureModifier`.
  ⚠️ **A synthetic `MouseEvent` cannot catch this** — untrusted events trigger no browser default,
  so a scripted click "passes" while a real one does not. Verify pointer gestures with real input.
- **Clearing is `Escape` plus `bridge.clear()`, and it resets the anchor too.** Keeping the anchor
  through a bulk clear would leave a later shift-click extending from a cell the user can no longer
  see. ⚠️ **The `Escape` listener is on the DOCUMENT and that is not laziness** — nothing in the
  table body is focusable, so a scoped `keydown` would never fire. It stays polite by being a
  *no-op* rather than by guarding: it never calls `preventDefault()`, `clearNgeHighlight` returns
  the same slice when nothing is marked, and `writeNgeHighlight` skips an unchanged write, so an
  `Escape` meant for a dialog costs nothing. ⚠️ **Two highlight-enabled tables on one page means
  two listeners, so one `Escape` clears both** — pass `provideNgeCellHighlighting({ clearOnEscape:
  false })` on all but the one that should own the key.
- ⚠️ **Do NOT add a `hasMarks()` to the bridge.** The obvious implementation reads
  `readNgeHighlightState()` off the instance the bridge holds — the RAW engine object, whose
  `options` refresh only when the adapter's *proxy* is read. An app reads the proxy constantly so
  the staleness is invisible; a spec does not, and the answer is wrong. (This was written, and the
  specs caught it.) Derive a disabled state from the `state` the host already owns instead — see
  `stories/highlight/highlight-demo-table.component.ts` → `hasMarks`.
- **The gate's own result:** one core file changed (`nge-table-store.ts`), plus a comment-only
  addition to `nge-table-state.ts` and one barrel line. Everything else is new.

### The CSV formatter addon (ARCH-251)

`toNgeCsv(data, options?)` / `toNgeCsvBlob(...)` in `src/lib/csv/` turn the ARCH-248 neutral shape
into text. The reasoning is in the guide (`docs/architecture/table.md` § The CSV formatter addon).
What bites in this directory:

- **It is a PURE FUNCTION, not a `TableFeature`, and that is the design.** It never holds a table
  instance, so it *cannot* reach highlighting — which is what makes the composition proof mean
  something. Making it a feature to gain a `table.readNgeCsv()` convenience would trade the only
  property it is here to demonstrate for a shorter call site. Don't.
- ⚠️ **Quote against `options.delimiter`, never a literal comma.** This is the classic CSV-writer
  bug and it fails in both directions at once: a comma gets needlessly quoted (harmless) *and* a
  semicolon is left bare, which silently splits one field into two on the reader's side. A lone `\r`
  also counts as a line break independently of `\n` (classic-Mac readers treat it as a record
  separator), so testing only for `\n` lets that one through. Specs pin both.
- ⚠️ **Quoting is CONDITIONAL, and a spec that forgets this passes only by luck of the seed.** The
  fixture's `amount` spans `$0–$2,500`, so `$127.80` needs no quotes and `$2,242.41` does. Three
  assertions were written expecting every currency record to be quoted and all three failed on
  `rows[0]`. Assert the branch (`formatted[i].startsWith('"') === (row.amount >= 1000)`), or pick a
  four-figure row deliberately with `rows.findIndex(row => row.amount >= 1000)`.
- **`String.prototype.replaceAll` is NOT available.** The workspace's `tsconfig.base.json` pins
  `lib: ["es2020", "dom"]` and `replaceAll` is ES2021 — the library's own tsconfig raises `target`
  to es2022 but leaves `lib` alone. Use `replace(/"/g, '""')`. Same trap for any other ES2021+ built-in.
- **Rows are re-aligned against `data.columns` via a per-row `Map`, never consumed positionally.**
  A predicate-narrowed export is ragged by design, so a column with no cell writes an empty field
  and a cell whose column was dropped is ignored. Scanning `row.cells` per column instead would be
  O(columns²) per row *and* wrong for the ragged case.
- **`values: 'raw'` is not `String(value)`.** A `Date` becomes ISO and an object becomes JSON —
  `raw` exists so something downstream can still use the value, and `Mon Jan 01 2026 …` /
  `[object Object]` serve nothing. `null` / `undefined` become `''`, matching the export seam.
- **The specs are deliberately two-tier.** The pure tier builds small `NgeTableExportData` literals
  directly; that is **not** a breach of ARCH-241's never-inline-rows rule, which governs table *row
  data* — nothing there is fed to a table. It is also forced: no fixture value contains a quote, a
  newline, or a non-ASCII character, and adding one would shift every draw in the fixture's single
  PRNG stream. The integration tier uses the real engine + the fixture for everything else.
- **The interaction story reuses `stories/highlight/highlight-demo-table.component` UNMODIFIED.**
  A story-to-story import, and it is the gate's evidence rather than an accident: the demo already
  exposes `exportHighlighted()`, so the only new code the composition needed was a pure function and
  a toolbar. Do not fork it — a copy would let the two drift and the proof would be against the copy.
- ⚠️ **`escapeFormulas` is OFF by default, and that is the decision (ARCH-273).** Escaping alters
  the user's data — the field gains a leading `'` and no longer round-trips — so the caller asks for
  it. Do not "fix" the default; flipping it changes the bytes under every existing consumer.
- ⚠️ **The escaping guard is prefix AND not-a-number, and the numeric half is the load-bearing one.**
  `-` and `+` open every negative and signed number as well as every payload, so a prefix-only test
  escapes `-1234.5` into `'-1234.5` and corrupts a whole currency column — not a security fix, and
  silent, because the file still opens. `NGE_CSV_PLAIN_NUMBER` is a regex rather than `Number()`,
  which reads `''` and `' '` as `0`. The residual cost is a *formatted* negative (`-$1,234.50`),
  which is not a plain number and so is escaped; a spec pins it deliberately.
- **Escaping runs BEFORE quoting, and the order is load-bearing.** The `'` has to land inside the
  quotes, where a reader looks for it. It also keeps the passes independent — `'` is not a character
  that triggers quoting, so neutralising can never change the quoting verdict.
- **It applies to every field written**, header row and both `values` readings. Scoping it to
  `formatted` is the tempting wrong axis: a `raw` *string* is as dangerous as a formatted one, while
  a `raw` *number* is safe because of the numeric guard rather than because of its path.
- **The gate's own result: ZERO core edits.** One barrel line in `src/index.ts`, a new `src/lib/csv/`,
  a new `stories/export/`. Nothing under `src/lib/nge-table/` (excluding stories), `src/lib/export/`,
  or `src/lib/highlight/` changed. Combined with ARCH-250's one-file finding, the honest reading is
  that the recorded augmentation limit binds addon **state**, not addons: a *stateless* addon is an
  ordinary function over a published type and could ship from any package.

### Row selection (ARCH-268)

`enableRowSelection: true` injects a leading checkbox column and lets a user write
`state.rowSelection` — click to replace, cmd/ctrl-click to add or remove, shift-click for the range,
`Space` on a focused row, plus the header's select-all. The pure parts are
`store/nge-table-selection.ts` (column factory, range walk, slice helpers); the gestures are on
`NgeTableStore`; the markup is inline in `nge-table.component.html`. What bites in this directory:

- **Reach for the engine's ROW API, not its setters.** `row.toggleSelected()` and
  `table.toggleAllRowsSelected()` both forward to `options.onRowSelectionChange`, which
  `buildTableOptions` routes back into `applyTableStateChange` — so they are in-contract exactly as
  `column.toggleSorting()` is. `table.setRowSelection` is the banned one: it is an engine *option*
  name, and `buildTableOptions` is the only place those may appear.
- **Single-row mode costs no code.** `mutateRowIsSelected` deletes every other key when
  `!row.getCanMultiSelect()` (`table-core/src/features/RowSelection.ts:562-568`), so
  `enableMultiRowSelection: false` falls out of using the row API. Both entry points inherit it.
- ⚠️ **Range selection is NOT in the engine** — `addRowSelectionRange` exists only as a commented-out
  block. `ngeSelectionRangeIds` walks `table.getRowModel().rows`, the **processed** model, so a
  shift-click after a sort takes what the user sees between the two clicks. It applies
  `getCanSelect()` itself, because a range is written as ONE `applyTableStateChange` (one state
  change, one event for one gesture) and so never reaches the engine's own capability check.
- ⚠️ **The row body and the checkbox are two halves of ONE affordance and must agree on shift.**
  Both route to `extendRangeTo`; a checkbox that only toggled while the row extended reads to a user
  as the range being broken, and the checkbox is the control most likely to be shift-clicked because
  it is the one that *looks* like a multi-select affordance. They differ in exactly one respect, by
  design: a **plain** checkbox click is additive where a plain row click replaces — a per-item switch
  must never clear the rest.
- **The native checkbox is handled on `click`, not `change`, and `preventDefault()`s.** Only `click`
  carries the modifier keys, and preventing the default keeps the browser from toggling `checked`
  against the range write that is about to land — state drives the box through `[checked]`. It is
  safe to drop `change` because the box is `tabindex="-1"` and `aria-hidden`: keyboard selection is
  the row's `Space`, never the box.
- **The capability-flag asymmetry check, run and answered — and it lands the OTHER way from
  pinning.** `getCanSelect()` gates the write, so with the flag off every gesture is already a
  no-op; but `getIsSelected()` reads `state.rowSelection` raw, so a selection the **host** pushed in
  still renders and still exports. That follows ARCH-244's resize precedent, not ARCH-243's pinning
  one: the flag withdraws the *user's* affordance, it does not discard what the *application* chose.
  No `applyPinningCapability` sibling is needed. A spec pins it.
- ⚠️ **`config.getRowId` is mandatory and fails loudly.** `buildTableOptions` throws under
  `ngDevMode`. Without it the engine keys selection by array index, so a re-fetch moves the user's
  ticks onto different records — the failure that reads as data corruption rather than a bug.
- **`applySelectionColumnOrder` is the second thing `state` is filtered through.** `orderColumns`
  *appends* whatever it does not find in `state.columnOrder`, so a host listing only its own columns
  would push the injected column to the far end of the row. Like `applyPinningCapability` it returns
  the **same reference** when there is nothing to do, and it never rewrites the host's own state.
- **The anchor is scratch state on `NgeTableStoreState`, never in `NgeTableState`** — where a
  gesture started, not what the table is. It is dropped whenever the selection empties, or a later
  shift-click would extend from a row the user can no longer see marked. It does **not** move on a
  shift-click, which is what lets a range be grown and shrunk rather than only ratcheted.
- **The row is the tab stop; the checkbox is `tabindex="-1"` and `aria-hidden`.** The row carries
  `aria-selected` and handles `Space`, so a focusable checkbox would double the tab stops and
  announce the same fact twice — the same call ARCH-244 made about the resize grip. The header's
  select-all checkbox *is* a real tab stop (one per table, and the only keyboard route to it), and it
  needs `(keydown.space)="$event.stopPropagation()"` or the header cell's own space handler
  `preventDefault()`s its activation.
- ⚠️ **A shift-click must `preventDefault()` the `mousedown`, or the browser drags the document's
  TEXT selection across the same rows** and the result reads as a rendering bug. Gate it on
  `event.shiftKey`: `user-select: none` would also kill copying a cell's text, and an unconditional
  `preventDefault` suppresses focus and breaks an `<input>` in a cell. **A synthetic `MouseEvent`
  cannot catch a regression here** — untrusted events trigger no browser default, so a scripted
  click passes while a real one does not. Verified in the browser: after a real shift-click,
  `getSelection().toString()` is empty.
- **The selected tint is repainted on the pinned lanes.** They are `position: sticky` and opaque by
  requirement, so they scroll *over* the center lane; without the sibling rule a selected row reads
  as selected in the middle and unselected at both edges.
- **`--nge-table-selection-column-width` is mirrored in `NGE_TABLE_DEFAULTS`** — the column's
  `size` is a TypeScript number the engine clamps `getSize()` against, so the token alone would style
  a lane the engine still measured at the default width. `nge-table-defaults.spec.ts` asserts
  parity in two places (a `toEqual` and an `it.each`); change one, change all three.

### The swappable selection control (ARCH-278)

The native checkbox is the **default**, not the only option. A consuming app projects
`selection-cell` / `selection-header` templates and the table renders that domain's control —
`dlc-checkbox`, `dlc-checkbox` — instead. What bites:

- ⚠️ **A slot method that calls a sibling store method needs its OWN `withMethods` block.** A
  `signalStore` feature's `store` argument carries only what *previous* features added, so
  `toggle: () => store.toggleRowSelection(row)` written inside the block that declares
  `toggleRowSelection` throws `is not a function` **at click time** — runtime, not compile time,
  because the object literal is still being built when the closure is created. Compiles, lints, and
  type-checks clean; only a spec that actually clicks catches it.
- **The action travels on the context, not through a bridge.** ARCH-250's overlay needed
  `NgeHighlightBridge` because a projected template resolves DI from its *declaration* injector and
  cannot reach the table. That constraint binds when the template must **ask the table a question**;
  here the table builds the context and closes over its own store, so `toggle` / `toggleAll` ride
  along and no per-table provider scope is needed. Prefer this shape whenever the table is the one
  constructing the context.
- **The projected template is consulted FIRST and the native control is the `@else`.** Getting that
  order wrong is not a style question: the original ARCH-268 markup branched on the selection column
  *before* consulting the slot, which silently foreclosed the seam — a consumer's template was
  ignored with no error. A central switch standing in front of a seam is exactly what ARCH-250 /
  ARCH-251 audit for.
- **A projected control owes itself `$event.stopPropagation()`**, same as the native one: it sits
  inside a row whose click selects, so without it a click toggles and is then immediately replaced
  by the row's own replace-the-selection handler.
- **`enableRowSelection` accepts a per-row predicate**, and that is what makes `canSelect` worth
  carrying — with a bare `true` it is always `true` and the field is dead weight. ⚠️ The predicate
  takes the row **datum**; the engine's option takes its own `Row` wrapper, so `buildTableOptions`
  adapts it (`row => predicate(row.original)`). A consumer must never need a `@tanstack/*` import to
  write one.
- **`selection-header` is withheld with the native checkbox it replaces** when
  `enableMultiRowSelection` is off. A projected control must not resurrect an affordance the config
  switched off.
- ⚠️ **Stories use a local stand-in, never a real design-library import.** `libs/shared/table`
  importing `@nge/ledger-design-library` would invert the dependency graph and drag that
  domain into every consumer of the table. No `depConstraints` are configured, so **nothing lints
  this** — it is a judgement the author has to make. The real-component proof belongs in a
  ledger-side story at adoption.

### Cell range selection (ARCH-269)

`provideNgeCellRange()` plus a projected `cell-overlay` template gives a spreadsheet's rectangle:
drag it out with the pointer, extend it with shift-click, add disjoint blocks with cmd/ctrl, take
everything with cmd/ctrl-A, drop it with `Escape`. The descriptor and the pure membership walk are
`src/lib/range/nge-range-state.ts`; the `TableFeature`, the cell API, and the export predicate are
`nge-cell-range.ts`; the gesture and its auto-scroll are `nge-range-bridge.ts`; the paint is
`nge-range-overlay.component.*`. **No core file changed** — the guide has the reasoning
(`docs/architecture/table.md` § Cell range selection). What bites in this directory:

- ⚠️ **The tokens are `--nge-table-range-*`, NOT `--nge-table-selection-*`.** ARCH-268 owns that
  prefix (`--nge-table-selection-column-width`, `--nge-table-selection-accent`) and a range is not
  a row selection. Literal fallbacks at the use sites and **no entry in `_table-tokens.scss`** —
  editing that partial is a core edit, which is the ARCH-250 addon precedent.
- **The descriptor is four ids, symmetric on both axes** — `{ anchorRowId, anchorColumnId,
  focusRowId, focusColumnId }` — where `NgeHighlightRange` materialises its column span as
  `columnIds`. Do not align the two. Both spans here resolve at **read** time (rows against the
  processed row model, columns against the visible leaf columns in visual order), which is what makes
  a column reorder or a pin re-shape a block exactly as a sort does, narrows a block when a column is
  hidden rather than stranding an id for a column nobody can see, and leaves a focus **cell** for
  keyboard extension and for ARCH-271's fill handle to hang off. A spec pins the pinning case, which
  is the one a materialised span gets wrong: endpoints `name`→`quantity` span three columns, and
  pinning `status` to the left lane moves it out from between them, so the block narrows to two.
- ⚠️ **Two anchors, and only one of them is state.** `NgeCellRange.anchorRowId` /
  `anchorColumnId` is the **rectangle's** corner: persisted, and what membership resolves from.
  `NgeRangeBridge`'s is the **gesture's** origin: a plain field on the addon's own per-table
  injectable, never in the slice. ARCH-268 put its anchor on `NgeTableStoreState` — a core file an
  addon may not touch — and ARCH-250 persists its own *in* the slice, on the opposite rationale; the
  third option honours ARCH-268's reasoning at zero core cost, because an anchor records where a
  gesture started, not what the table is, and a restored view carrying one would have the user's next
  shift-click extend from a cell they never touched. Neither anchor moves on a shift-click, which is
  what lets a block be grown and shrunk rather than only ratcheted. Consequence: with no gesture
  anchor `extendTo` **starts** a rectangle instead of extending whatever a saved view happens to
  carry.
- ⚠️ **`ngeSelectionRangeIds` is NOT reused, despite being exported and despite ARCH-268
  recommending it for this story.** It applies `.filter(row => row.getCanSelect())` — the
  *row-selection* capability. A row that cannot be row-selected can still sit inside a cell range, so
  reusing it would silently shrink ranges on exactly the tables ARCH-278's `enableRowSelection`
  predicate exists for. The walk here is its own, and what it inherits is the degeneracy rules,
  applied to both axes: a focus that has left the model matches nothing, a missing or filtered-away
  anchor degenerates to the focus cell alone.
- **`visibleColumnsInVisualOrder` is duplicated a THIRD time, deliberately.** It exists privately in
  `nge-cell-highlighting.ts` with the duplication already justified there. Importing it from
  `highlight/` is ruled out — the two addons must not import each other — and promoting it to core is
  a core edit, which is the one thing this story's result is that it does not need. Three copies of
  four lines is the price of the property. Do not tidy it away.
- ⚠️ **The updater resolves INSIDE `setState`, and `makeStateUpdater` cannot be used** — both the
  opposite of ARCH-250's `writeNgeHighlight`, and both load-bearing. Deciding from a pre-read means
  two writes in one synchronous burst see the same "before": the `pointerdown` that starts a
  rectangle and the drag's first `pointermove` would extend a range the second call cannot see, and
  silently do nothing. `makeStateUpdater` allocates a new top-level state object unconditionally, so
  `applyTableState`'s identity short-circuit never trips and every no-op — an `Escape` on an empty
  table, each drag frame that has not left the cell it is on — patches the host's state.
- **The gesture is delegated from the table root, reached by `closest('.nge-table')`.** A documented
  dependency on core's BEM class names, the same one ARCH-250 accepted for its `:has()` styling and
  the same one a theme has. The scrolling `.nge-table__viewport` is reached the same way, because
  `NgeTableStore` is provided at `<nge-table>` and an addon living in the consumer's injector
  cannot inject it.
- **The hit-test depends on NO core attribute.** The overlay stamps
  `data-nge-range-cell="<rowId>::<columnId>"` on the enclosing cell and `pointermove` resolves cells
  with `document.elementFromPoint`. That is forced rather than chosen: pointer capture retargets the
  whole stream to the root — which is what lets `pointermove` / `pointerup` be bound once — so a
  per-cell `pointerenter` never fires during a drag.
- **"A drag must not start on the resize grip" is free.** `onResizeStart` already
  `stopPropagation()`s (`src/lib/nge-table/nge-table.component.ts:412-416`), so its `pointerdown`
  never reaches a delegated listener on the root. Verify rather than re-guard — a redundant entry in
  `INTERACTIVE_SELECTOR` would silently outlive the day that changes.
- ⚠️ **Touch is deliberately out of scope**, gated on `pointerType !== 'touch'`. Making a pointer
  gesture work on a touchscreen means `touch-action: none` on whatever owns it — ARCH-244's grip
  carries exactly that — but the drag surface here is **every cell**, so what a naive reading of the
  constraint asks for is the thing that makes the table unscrollable on a touchscreen. Never put
  `touch-action: none` on a cell. That constraint belongs to ARCH-271's fill handle, which is a small
  grip like ARCH-244's.
- ⚠️ **The defect the specs caught: a write decided from a PRE-READ is silently swallowed.**
  `bridge.extendTo()` and `bridge.clear()` wrote nothing while the pointer path worked. The cause is
  not the affordances disagreeing — it is that the guard read `table.readNgeRangeState()` before
  deciding, and that read hits the **raw** engine instance, whose `options.state` refreshes only when
  the adapter's *proxy* is read. The bridge is handed the raw table by its companion feature during
  `createTable`, so after the first write nothing refreshed it: the guard saw the pre-write state, the
  updater returned the same reference, and the write was skipped. Resolve the updater **inside**
  `table.setState`, which is handed the state `applyTableState` is about to patch.
  ⚠️ **The green-versus-red split was an artefact of the harness, and that is the part to carry.** The
  pointer spec happened to call a helper that reads `store.table.getRowModel()` — a proxy read —
  between its two presses, refreshing the instance by accident; the id spec did not. Write the two the
  other way round and the colours swap. The real rule is **any two writes with no intervening proxy
  read**, which in an app is exactly `pointerdown` → first `pointermove`. A passing gesture spec is
  not evidence the write path is sound.
  ⚠️ **`writeNgeHighlight` (`src/lib/highlight/nge-cell-highlighting.ts:260-266`) has the same
  shape** and is latent only because highlighting is one write per click with a render in between.
  Anything that gives it a drag, a key repeat, or two programmatic calls in a tick will hit it.
- **"The entry points agree" still earns its own describe block**, ahead of anything gestural — cell
  body, bridge id API, and keyboard extend are three routes into one state, and rows only ever had
  two. It is what surfaced the bug above, even though the cause was not disagreement.
- ⚠️ **Assert on `stateChange`, not on rendering.** ARCH-250's finding still governs: the Angular
  adapter's internal state signal will absorb a write the host never sees, so a rendering addon is
  not evidence the seam works.
- ⚠️ **The overlay binds `[state]`, the WHOLE `NgeTableState`, and never the addon's own slice.**
  Binding the slice is the intuitive choice and is exactly wrong, because the slice is the one thing
  a sort leaves alone. Nothing else the overlay depends on changes either: `getSortedRowModel`
  reorders the **same** `Row` instances, `getAllCells` is memoised on `[table.getAllLeafColumns()]`
  (`core/row.ts:170-178`) which a sort does not touch, `cellSlotContext` is memoised per `Cell`, and
  both `@for`s track by id so Angular *moves* DOM rather than rebuilding it. A slice-bound `computed`
  therefore has no dependency a sort changes and keeps painting the block as it stood at drag time —
  visually identical to the enumeration the descriptor exists to avoid. Membership is a function of
  the rectangle **plus** the row order **plus** the column order, and the last two live in
  `sorting` / `filtering` / `columnPinning` / `columnOrder`; taking the whole state makes that
  dependency true by construction.
  ⚠️ **Only the ROW axis discriminates this bug — a pinning or reorder case will pass either way.**
  `getAllLeafColumns` is memoised on `[getAllColumns(), _getOrderColumnsFn()]`
  (`core/table.ts:499-506`) and `_getOrderColumnsFn` depends on `columnOrder`, so a reorder yields new
  leaf columns → new `Cell`s → a new context → the `cell` input changes and the computed re-runs
  *incidentally*. The column version of this spec was written expecting red and came back green.
  Regression-test it with a **re-sort**, asserting on painted DOM, with no `store.table` read between
  the sort and the assertion.
  ⚠️ **No unit spec catches it.** `cell.isNgeInRange()` re-derives correctly per call and always did;
  the defect is entirely at the component layer, and it took a real browser to see.
  ⚠️ **This is a CLASS, not an incident — it has been found in two independently-written overlays**
  (this one and ARCH-250's highlight overlay), so treat it as the default failure mode of any new
  one: **an overlay's `computed` must depend on something a sort actually changes.** Both bind
  `[state]`. Every future addon that paints a mark inherits the rule and does not get to re-decide it.
- ⚠️ **`config.getRowId` is mandatory, and the check has to sit on the WRITE.** ARCH-268 can throw
  from `buildTableOptions` because `enableRowSelection` is a config field it already reads; an addon
  has no such moment — the feature registers inside `createTable`, where a throw escapes through the
  adapter's `lazyInit` microtask rather than through the caller, and the read path runs once per
  rendered cell so a throw there takes out the render. The first write is both the earliest point
  reachable from a caller's own stack and the exact moment a key would be minted from an array index.
- **No pinned-lane rule is needed, and adding one would be dead code.** ARCH-268 repaints its tint on
  the lanes because *its* tint is on the row, which a sticky, opaque lane paints over. This one is on
  the **cell**, which paints over its own lane's background, and `--nge-table-range-surface` is
  opaque by the same requirement `--nge-table-pinned-surface` carries. Same conclusion as ARCH-250's
  overlay; a translucent tint is a fix on the token, not a new rule.
- ⚠️ **`Escape` can be polite by being a no-op; cmd/ctrl-A cannot.** `Escape` never
  `preventDefault()`s and writes nothing on an unselected table, so a document listener costs a dialog
  nothing. Taking cmd/ctrl-A means preventing the browser's own select-all, so it is scoped by
  *engagement* instead — only once the gesture anchor has been set by a click into this table. ⚠️ Two
  range-enabled tables on one page still means two `Escape` listeners and one key clearing both; pass
  `provideNgeCellRange({ clearOnEscape: false })` on all but one, the same call ARCH-250 makes.

### Column selection (ARCH-270)

A whole column is an ordinary `NgeCellRange` with **`null` row endpoints**, written by a strip
projected into `header-overlay` (`src/lib/range/nge-range-column-handle.component.*`). No new slice,
no new provider, no new flag — it lives inside ARCH-269's addon directory because it *is* ARCH-269's
state. The reasoning and the rejected options are in the guide (`docs/architecture/table.md` §
Column selection). What bites in this directory:

- ⚠️ **`null` is the view's BOUNDARY, never "missing".** `resolveSpan` keeps the two apart: a `null`
  endpoint resolves to the first/last position, while an id the model no longer holds keeps
  ARCH-269's degeneracy rules (a filtered-away focus matches nothing, a filtered-away anchor
  degenerates to the focus). Collapsing them with `??` would make a filtered-away focus select to the
  end of the table.
- ⚠️ **A span between the first and last ROW IDS is the defect this shape exists to prevent**, and it
  fails silently: those two records move under a sort and the "column" becomes whatever now lies
  between them. `selectAllNgeRange` carried it — a spec confirms cmd/ctrl-A used to shrink a
  twelve-row table to two rows after a sort. Never reach for `rows[0].id` / `rows.at(-1).id` to mean
  "everything".
- **The column endpoints stay non-nullable.** A whole-*row* mark would be their mirror image and has
  no story; the predicate would need no change, so mint it when something needs it rather than now.
- ⚠️ **`stopPropagation()` on the strip's click is what keeps sorting working**, and a spec goes red
  without it — the strip is inside the header cell, whose own click toggles the sort. Same
  arrangement as ARCH-244's grip and the select-all checkbox.
- **cmd/ctrl + `Space` cannot collide with the header's `Space` sort toggle, structurally.** Angular's
  `keydown.space` matches only with NO modifiers held (`KeyEventsPlugin.matchEventFullKeyCode` appends
  every pressed modifier before comparing, `../open-source/angular/packages/platform-browser/src/dom/
  events/key_events.ts`). A spec pins it anyway — a template edit could quietly undo it.
- **This shortcut is scoped by FOCUS, not by engagement**, unlike `Escape` and cmd-A. A header cell is
  a real tab stop, so it does not go through `takeKey` and needs no per-table opt-out on a page of
  several tables. Applying the engagement rule as well would make the keyboard route unreachable
  until the user had first used the pointer one.
- ⚠️ **`data-nge-range-column` is deliberately a SECOND attribute name.** The body hit-test asks for
  `data-nge-range-cell` and must keep answering `null` for a header. It is read by the keyboard route
  only: it sits on the whole header cell, so a pointer test against it would select the column from a
  plain header click.
- **The strip carries no `z-index`, and that is a decision.** The previous column's resize grip has
  `z-index: 1` and overhangs a couple of pixels; leaving this at `auto` gives the grip that sliver,
  which is the right precedence. It also carries **no `touch-action: none`** — ARCH-244's grip needs it
  because it drags, this is a click, and a finger must still scroll the header band.
- **`display: contents` on the handle host**, so the absolutely-positioned strip resolves against
  `.nge-table__header-cell` (already `position: relative` for the grip) while the host adds nothing to
  the header's flex row. `display: none` cannot work here — unlike `<nge-range-overlay>`, this one has
  something to paint.
- **A header tints only when the column is FULLY selected.** `isNgeColumnSelected` asks what the
  rectangle covers, not which gesture produced it — so a drag from the first visible row to the last
  counts, and a block merely passing through does not. A weaker "partial" state is a real design and
  deliberately not this story's.
- ⚠️ **Extending to a column unbounds the row axis of the active rectangle** — the one place anything
  moves an anchor. The anchor *column* stays put. Refusing to extend from a cell anchor was the
  alternative and is worse: the same gesture would mean different things depending on the previous one.
- **`Column` members follow the `Cell` rules**: no member may be named `get*` (the adapter proxies
  those into computeds), and the `declare module` block must repeat TanStack's type parameters
  verbatim (TS2428).
- **The story set reuses `<nge-table-range-demo>`** (`stories/cell-range/`) through an opt-in
  `showColumnHandles` input, defaulted `false` so ARCH-269's sections are unchanged. The `@if` is on
  the `ng-template` rather than inside it — `contentChildren` is a signal query with
  `descendants: true`, so an unregistered slot really is absent rather than registered-and-empty.

### The fill handle (ARCH-271)

`<nge-fill-handle>` in the `cell-overlay` slot puts a grip on the active range's corner; dragging it
**proposes** values through a new `fill-intent` event and changes nothing itself. The pure math is
`src/lib/range/nge-fill-state.ts` (region) and `nge-fill-values.ts` (series); the feature is
`nge-cell-fill.ts`; the gesture rides `nge-range-bridge.ts`. Reasoning in the guide
(`docs/architecture/table.md` § The fill handle). What bites in this directory:

- ⚠️ **This is the first feature that needed a CORE edit since Wave 1, and the reason is a real
  finding: axis 4 was closed to addons.** `emitTableEvent` is a closure on `NgeTableStore`, and an
  addon holds only the raw engine instance. `createNgeTableEmitterFeature`
  (`src/lib/events/`) publishes the sink onto the instance — the `readNgeExportData` precedent — so
  any `TableFeature` can announce. Kind-agnostic; do not add a second, feature-specific route.
- ⚠️ **The library must never write `config.data`, and this feature must never learn how.** It reads
  data and writes an *event*. If a future change makes it tempting to mutate rows "just here", the
  answer is a new event kind, not a write.
- ⚠️ **A pointerdown on the grip is checked BEFORE the cell hit-test** (`FILL_HANDLE_SELECTOR`). The
  grip sits inside a stamped cell, so the range gesture would otherwise resolve it and start a
  one-cell range — wiping the very selection the fill exists to extend. There is no way to tell the
  two apart after that point.
- ⚠️ **`Escape` mid-drag cancels the FILL and ignores `clearOnEscape`.** That option governs whether
  the table gives up its *selection*; a cancelled fill gives up neither, so gating it would leave a
  drag with no way out on exactly the tables that opted out.
- ⚠️ **`touch-action: none` belongs HERE and is forbidden on a cell.** ARCH-269's drag surface was
  every cell, so the same treatment would make the table unscrollable by finger; this is a 10px grip,
  which is what finally gives the library a touch gesture at all.
- **The grip does not overhang the corner**, and cannot: `.nge-table__cell` clips (`overflow: hidden`)
  and is unpositioned (ARCH-243). It rides the slot's flow position at the cell's trailing edge. Do
  not "fix" this by relaxing the cell's overflow or positioning it — both are core changes with
  consequences elsewhere.
- ⚠️ **`ngeFillRegion()` is a READ off the raw instance**, so it answers as of the last proxy read —
  the same caveat ARCH-269 records for `ngeRangePredicate`. An app renders constantly so it is always
  current; **a spec that never renders is not**, and asserting straight after a write asserts on the
  pre-write answer. `nge-cell-fill.spec.ts` has a `refresh(store)` helper for exactly this, and two
  specs went red before it existed.
- **A target INSIDE the source has zero reach**, which `reachBeyond` exists to get right. The obvious
  `index < from ? index - from : index - to` answers `-1` for the source's own top row and yields an
  inverted, empty region. A spec pins it; it was a real bug caught by writing the spec first.
- **`null` is a legitimate step answer, `0` is not** — `[5, 5, 5]` is an arithmetic sequence whose
  step is zero, and conflating "not a series" with "step zero" only happens to agree today.
- **No handle on a row-unbounded range** (a whole column, or cmd/ctrl-A). The gate lives in
  `resolveNgeFillRegion` / `ngeFillHandleCell` so the paint and the commit cannot disagree.
- ⚠️ **One `NgeFillPlan`, not a fill path and a retract path.** They were separate until the gesture
  went 2D, at which point they stopped being separable — a single drag can grow the rows and shrink
  the columns. The plan is `{ source, next }`; fill cells are `next \ source`, dropped cells are
  `source \ next`, either may be empty. Do NOT reintroduce a mode flag: a drag that only shrank
  proposes nothing because the difference is empty, not because a branch checked.
- ⚠️ **Dragging back INTO the block retracts it, and retracting is NOT a clear.** A spreadsheet clears
  the cells dragged back over; this shrinks the selection and proposes nothing, because clearing is a
  change to *data* and what "cleared" means belongs to a host's schema.
- ⚠️ **The fill is TWO-PASS, and the order is load-bearing.** Growing both axes leaves a corner
  quadrant belonging to neither the source's rows nor its columns. Pass 1 extends the rows over the
  source's columns; pass 2 extends the columns across every row of the new block, reading through an
  overlay so pass 1's values seed the corner. Swap the passes and the corner fills from the wrong
  axis; drop the overlay and it fills from stale data.
- ⚠️ **The source is fixed for the whole gesture, which is why a retraction commits on RELEASE.** A
  live-shrinking selection reads better for a frame and is wrong the moment the user drags back out:
  the fill would then extend from the momentarily-shrunken block rather than from where they started.
  A spec pins the dip-in-then-out case.
- **A dropped cell paints differently from a fill target** (`--drop` vs `--target`). They are opposite
  outcomes and the user is choosing between them mid-drag, so sharing a style would make the decision
  invisible at the moment it is being made.
- ⚠️ **A commit grows the selection to source ∪ swept, via `setActiveNgeCellRange` — never
  `setNgeRange`.** The latter replaces the *whole* selection and would silently drop any disjoint
  blocks the user cmd/ctrl-added; a spec goes red on exactly that swap. This is also the one place
  anything moves a rectangle's anchor, which is defensible only because a fill reshapes the block
  rather than re-aiming it. A commit that proposed nothing reshapes nothing.
- **`cell-overlay` now has three claimants** — this grip, ARCH-269's overlay, ARCH-250's highlight.
  The slot resolves to one template per column plus one shared fallback, so the consumer hosts them in
  ONE wrapper template. `stories/fill-handle/fill-demo-table.component.html` is the worked example.

### Zebra striping (ARCH-286)

`enableStriping` paints alternate rows on `--nge-table-row-surface-alt`. Two things about it
are load-bearing, and both are easy to get wrong in a way that looks fine in a screenshot.

- ⚠️ **Parity is the row's index in the processed row model — never `:nth-child`, never
  `row.index`.** `NgeTableRenderedRow.isAlternate` is computed in
  `toNgeTableRenderedRows` / `toNgeTableVirtualRows` from the position the window itself is
  built from. `:nth-child` reads the DOM, which under virtualization holds a recycled window,
  so it would stripe *screen position* and every stripe would crawl a row at a time as the user
  scrolled. TanStack's `row.index` is the position in `config.data` and is copied through the
  sorted row model unchanged, so it would scramble the stripes on the first sort. A spec pins a
  row's parity across a sliding window; a static screenshot proves neither case.
- ⚠️ **The stripe never declares `background`.** `.nge-table__row--alt` sets only
  `--nge-table-internal-row-surface`, which the base `.nge-table__row` rule already resolves
  through. That removes the contest rather than winning it: hover and selection stay the only
  other rules declaring the property and keep beating the base rule exactly as they did before —
  hover on specificity, selection on source order. Declaring a `background` on the modifier
  instead would score (0,1,0), a tie with `.nge-table__row--selected`, making every future
  row-level mark either a source-order obligation or an entry in a `:not()` chain — and the
  failure mode when one is forgotten is a stripe silently out-ranking that mark on alternate rows
  only. Cell-level marks (range, column selection, highlight, fill) never entered the contest at
  all: a cell is a rendering descendant of its row, so its background paints over the row's
  regardless of the cascade.
- **The pinned lanes read the same property**, so a striped row stays one continuous band
  instead of breaking into three at the lane seams. It inherits from the row, and the alternate
  surface is opaque in the library default and in all six bridges, so the pinned lane's opacity
  requirement still holds.
- Striping carries **no state**: it is not in `NgeTableState`, not persisted, and never a field
  on the datum. It is display, derived per render.

### Charts in cells, and the settle signal (ARCH-291)

`NgeCellContext.isSettled` is a `Signal<boolean>` meaning "the scroll has been quiet long
enough to render expensive content". A cell template branches on it to draw a
`<nge-cell-shell>` while the user flicks and the real thing once they stop. It is the first
exercise of "a cell is an arbitrary Angular render target", which had been a claim since
ARCH-239 and never code. What bites here:

- ⚠️ **It is a signal because cell contexts are memoised, and a plain boolean would fail
  silently in the worst direction.** The `WeakMap<Cell, NgeCellContext>` in
  `nge-table-store.ts` exists because a cell's *value* cannot move under it — which makes any
  plain field on that object frozen at first build. A boolean `isSettled` would be read once
  and served stale for the life of the row model: the cell renders, the shell appears, and it
  simply never resolves. Signal-valued keeps the identity the cache is for and the value live
  at the same time. `nge-table-slot-registry.spec.ts` pins exactly that pair, and it is the
  spec that fails the day someone "simplifies" the field back to a boolean.
- **Nothing in this library listens to a scroll, and nothing should start.** `virtual-core`
  already sets `isScrolling` on the first scroll event and clears it after
  `isScrollingResetDelay` of quiet — 150ms by default, and `useScrollendEvent` is off, so the
  debounce rather than a browser-dependent `scrollend` is the path taken. That *is* "quiet for
  N ms" with exactly one knob, so `NgeTableStore.scrollSettled` is one `computed` over
  `rowVirtualizer.isScrolling()` and no listener of our own. Same instinct as registering a
  `TableFeature` instead of editing a switch: the engine already had it.
- ⚠️ **The delay is deliberately NOT on `NgeTableConfig`.** It is the one tuning constant the
  contract permits, and the story that added it settled that no timing or velocity knob enters
  the public config — a consumer setting it badly is worse than the default being imperfect.
  Tiered rendering by scroll speed (shell → low fidelity → full) is a real technique and a
  later story, not a knob to add here.
- **`true` forever when virtualization is off, and that is the right answer rather than a
  gap.** `enabled: false` makes `virtual-core` skip its scroll listener outright, so
  `isScrolling` never moves — and a table rendering every row builds each cell once and never
  recycles it, so there is no per-slide cost to defer and a shell would cost a frame to save
  nothing.
- **`toNgeCellContext` takes the signal as a required parameter**, and the export seam passes
  `NGE_CELL_ALWAYS_SETTLED`. Required rather than defaulted on purpose: an export reads a row
  model rather than a viewport, so "always settled" is its *answer*, not its omission — and a
  future caller inheriting that answer by forgetting to pass one is a deferred cell that never
  defers.
- ⚠️ **`<nge-chart>` attaches a shadow root**, so the mark is not reachable from the light DOM.
  ⚠️ **And `document.querySelector('nge-chart svg')` does NOT return nothing — it returns a 0×0
  `<svg>`, which is worse.** That element is the tooltip's arrow: `<nge-chart-tooltip>` is
  *always* instantiated (its own template says so), it lives in the light DOM, and it carries an
  svg. So a probe written the obvious way finds an svg, measures `0×0`, and concludes the chart
  collapsed — a false negative that looks like a real finding. Measured, not assumed: 26 charts
  gave 26 light-DOM svgs, all zero-sized, while the real marks sat in the shadow roots at
  152×84. Reach the mark through
  `chart.querySelector('.nge-chart-container').shadowRoot.querySelector('svg')`, or verify
  visually. Its height is a **percentage**, so it needs an ancestor with
  a *definite* height and collapses in a `height: auto` or zero-height box. ⚠️ **A table cell
  already provides one** (`height: var(--nge-table-row-height)`, never `auto`), so the folklore
  "always wrap it in a fixed-height div" is wrong *inside a cell* — a bare `<nge-chart>` fills the
  row, and what gives a sparkline room is `config.rowHeight`. The `.chart-cell` wrapper earns its
  place for different reasons (the shell's inset and surface, below) plus portability to a context
  with no definite height, like a story panel. Verified in a browser, not
  inferred. ⚠️ **`align-self: stretch` is a *cell's* answer and does not generalise to a
  `row-detail` band** — a cell is a flex item on a row of definite height, a band is a block on its
  own line; see § Rich content in a row-detail band. A cell chart also wants **no chrome** —
  no axis, no legend, no margin — which the existing charts API already expresses: axes are
  opt-*in* (`showXAxis`/`showYAxis` default `false`), `legend` renders only when present, and
  `base.margin` is fully overridable. `createSparklineChartConfig` and its column / win-loss
  siblings are built for exactly this size. **No charts-library change was needed, and a story
  needing one should stop rather than reach for it.**
- ⚠️ **`animationMs: 0` in a cell.** Recycling re-creates the cell on every window slide, so an
  entrance animation replays per slide and reads as a strobe rather than as motion. The shell
  does not animate for the same reason plus a second one: a shimmer is a per-frame paint on
  every node in the window, requested at exactly the moment the frame budget is tightest.
- **The chart's data shape is the consumer's**, supplied as a pure transform they memoise —
  the library defines no chart vocabulary, no `chartType` enum, and no per-type branch. ⚠️ The
  memo is the load-bearing half: a factory called straight from a template allocates a new
  config on every change-detection pass, so `<nge-chart>`'s `config` input changes identity and
  the chart re-renders — which is precisely the cost the settle signal exists to avoid.
- **An array-valued accessor forces three per-column answers**, each pinned in
  `nge-array-cell.spec.ts`: export falls back to `String(value)` → `"1,2,3"` (which the CSV
  writer then quotes, because it contains the delimiter) unless the column declares
  `meta.ngeExport.format`; sorting a `number[]` is meaningless so the column sets
  `enableSorting: false`; and the fill infers copy-vs-series from finite numbers, so an array
  falls to the copy path without throwing and a column that should not be a fill target sets
  `meta.ngeFill.enabled: false`. These are *column* answers, not library rules — a transform
  reading three scalar fields faces none of them.
- **The chart column is never added to `NGE_TABLE_FIXTURE_COLUMNS`.** See the fixture section
  below: the frozen ARCH-289 baseline renders that array wholesale, so a column landing there
  changes the epic's reference measurement by the back door.
- ⚠️ **The settle flag is scroll-derived, so a column-resize drag is NOT covered — and that is the
  known limit, documented rather than measured.** A drag writes `columnSizing` every
  `pointermove` frame while the viewport sits perfectly still, so the flag reads *settled* and
  every visible chart's `ResizeObserver` fires at pointer rate — the storm arrives exactly when
  nothing is deferred. ARCH-289's instrument scrolls a viewport and cannot drive a pointer drag,
  so a number here needs a second instrument, not another run of the first. Treat chart cells plus
  drag-to-resize over a wide window as unmeasured rather than known-good. ⚠️ Do not "fix" it by
  adding a `isResizeSettled` beside `isSettled`: that doubles the context's vocabulary for one
  gesture and the next expensive gesture asks for a third. It is one general "is a live gesture in
  progress" question, and it belongs to its own story.
- ⚠️ **The settle transition cannot be verified by browser automation at all — not just the
  benchmark.** An automation tab is `visibilityState: 'hidden'`, which suspends
  `requestAnimationFrame`; with no frame callback, Angular's zoneless change detection never
  flushes, so nothing re-renders. Measured here: a scripted `scrollTop += 2880` **did** move the
  scroll, and the virtualization window did **not** slide, the chart count did **not** change, and
  a `requestAnimationFrame` callback registered alongside it never fired in 300ms. ⚠️ **The failure
  is silent and reads exactly like the feature being broken** — shells that never appear look
  identical to a gate that never opens. Any check of shell↔chart switching, and any frame timing,
  belongs in a **foregrounded** tab driven by a human. What automation *can* still verify is
  static: element counts, computed styles, geometry, shadow-root contents, console output. Use it
  for those and stop there. (Same root cause as `runNgeScrollBenchmark`'s own refusal to start
  when hidden, and it will bite ARCH-292's editor activation identically.)
- ⚠️ **The measured benefit at sparkline weight is ZERO, and the docs say so.** Five runs on an
  M5 Max / 60 Hz (2026-07-28, one warm session): baseline p95 **17.2 ms**, `gated` **17.0**,
  `always-chart` **17.1**, `always-shell` **17.2** — all within 0.2 ms, inside each run's own
  1.8–3 % spread, **0 dropped frames anywhere**, `rowsAdded` exactly 357 every chart-cells run.
  The settle burst: **19 charts mounted, to-first-chart 150.3 / 150.2 ms, worst frame 17.6 / 17.7 ms,
  0 dropped.** The gate defeated and the gate engaged are the same number.
  - **What that *does* prove:** `to first chart` lands within 0.3 ms of the engine's 150 ms
    `isScrollingResetDelay` on both runs — the settle contract, confirmed by measurement.
  - ⚠️ **What it does NOT prove:** that all four cost the same. **`p95` on a vsync-locked display
    cannot distinguish 1 ms of work from 15 ms** — both give a ~16.7 ms frame; it moves only when
    work *exceeds* the budget. Identical p95 means "all four fit inside the budget", nothing more.
    ⚠️ **The same blindness will hit ARCH-292 / 293 / 294** — this instrument will report "no cost"
    for editors too, until something overruns. To get a real number, make something exceed the
    budget first (raise `stepPx`, or use a heavier cell).
  - ⚠️ **Charts really do render mid-scroll in `always-chart`** — verified visually. An earlier
    hypothesis that `<nge-chart>`'s 16 ms debounce was suppressing the render during a fast scroll
    was **wrong**; do not resurrect it to explain the flat numbers.
  - **So state the value as headroom, not as a saving.** `isSettled` does not make a chart cheaper;
    it moves work off the scroll onto the settle, and at this content weight it does not measurably
    do even that. It earns its place against heavier cells, denser windows and slower machines.
    Anything stronger did not survive being measured.
- ⚠️ **A scripted scroll never lets the flag settle, so the scroll benchmark measures the SHELL
  path and the acceptance criterion passes vacuously if read literally.** The harness advances the
  viewport on every measured frame, so each frame resets the 150ms delay, `isScrolling` never
  clears, and not one chart is built — it would time a column of grey shells and report a pass.
  (A second artifact: charts mounted before the first scroll event all unmount on it, so a run
  starting from rest measures a mount-and-destroy burst in its opening frames.) The performance
  story therefore carries **two** measurements: a `cellMode` control whose `always-chart` setting
  bypasses the gate for the counterfactual, and a **settle-burst** routine that flicks, stops, and
  times the frame where a window's worth of charts mount at once. The burst is the cost the feature
  actually creates. ⚠️ `always-chart` is a measurement control that deliberately defeats the seam —
  never a pattern to copy into a consumer table.
- ⚠️ **Memoise the chart config against the ROW OBJECT in a `WeakMap`** — not against the `Cell`,
  and not by id in a `Map`. `<nge-chart>` re-renders on config *reference* change (it debounces
  `toObservable(config)` by 16ms), so an un-memoised factory called from a template re-renders every
  visible chart on any change-detection pass. The `Cell` is the wrong key because the engine rebuilds
  every one when the row model rebuilds, so a sort would re-run every transform — the library's own
  context cache is keyed that way and would be *worse* than the five lines a consumer writes. An id
  in a `Map` retains 10,000 entries after a full scroll. Eager precompute is not the alternative
  either: it trades a scroll stall for a startup stall.
- ⚠️ **The chart's wrapper takes the shell's geometry AND its surface.** Same `flex: 1 1 auto`,
  `align-self: stretch`, `min-width: 0` and `margin: var(--nge-table-shell-inset, 6px) 0`, or the
  content changes size the instant the scroll settles.
  ⚠️ **And `align-self: stretch` is silently defeated by an explicit `height` on the same
  element** — stretch only applies when the item's own cross size is `auto`. So putting the
  wrapper class on a box that already sets a height (a story's fixed-size demo cell, say) leaves
  the margin correctly *declared* and completely *inert*: the box sits at its stated height, the
  inset lands outside it, and the mismatch survives a careful reading of the stylesheet because
  every declaration in it is right. Nest the wrapper as a child instead, which is also how a real
  `.nge-table__cell` → `.chart-cell` → `<nge-chart>` is shaped. Caught by measuring
  `offsetHeight` (96px where 84px was intended), not by reading the CSS.
  The wrapper also needs the same
  `background: var(--nge-table-shell-surface, var(--nge-table-surface-variant, #f5f5f5))`,
  because no chart paints in the frame it mounts (the 16ms debounce again), so without it the
  transition reads shell → empty box → chart, a flash rather than content arriving in place.

### Inline editing (ARCH-292)

`meta.ngeEdit.enabled` puts a column into the activation model: a cell stays read-only until a
click or `Enter` on a focused row calls `beginEdit()`, at which point the consumer's own `[ngeCell]`
template swaps its read-only branch for a control, gated on `NgeCellContext.isEditing()`.
`commitEdit(value)` announces `edit-intent` and closes the editor; `cancelEdit()` abandons it. The
table writes nothing itself. The interactive-element guard is
`src/lib/interactive/nge-interactive-element.ts`; the editing types (`NgeColumnEdit`,
`NgeCellEditPort`, `NGE_CELL_NO_EDIT`) are `src/lib/edit/nge-cell-edit.ts`; activation, the scratch
state and the keyboard containment live on `NgeTableStore` and `<nge-table>` itself. No editor
ships in this story — ARCH-293 / ARCH-294 build the controls. Reasoning in the guide
(`docs/architecture/table.md` § Inline editing). What bites in this directory:

- **The four callbacks live on the context, not behind an injected bridge** — the same arrangement
  `NgeSelectionCellContext.toggle` uses (ARCH-278), and for the same reason: a projected
  `ng-template` resolves DI from its own declaration injector and can never reach `NgeTableStore`.
  The table is already building the context and can close over its own store, so no per-table
  provider scope is needed here, unlike ARCH-250's highlight bridge.
- **`edit-intent` and `fill-intent` share one `NgeCellPatch` shape** (`columnId`, `rowId`, `value`,
  `previousValue`), so a host writes one `applyPatches` for both — and they stay two `kind`s, not
  one, so a host may accept a fill and reject a hand-typed edit, or the reverse.
- **Activation is the default because the alternative is ninety controls nobody asked for.** Thirty
  visible rows across three editable columns, rendered unconditionally, is ninety instances
  activation never creates. `meta.ngeEdit.alwaysLive` opts a column OUT of that saving — the column
  of sliders case, where the control *is* the reading — and nothing else should set it.
- ⚠️ **`Enter` activates the row's FIRST editable column, and that is the honest answer rather than a
  placeholder for a better one.** There is no per-cell tab stop yet (arrow-key grid navigation is
  later and unticketed), so a focused row has no notion of "which cell" for `Enter` to resolve
  against. This is what "activate on `Enter`" can mean until that story lands.
- **Edit state is `NgeCellEditTarget` (`{ columnId, rowId }`) held as scratch on
  `NgeTableStoreState`, never a `NgeTableState` slice** — the same call ARCH-268 made for its
  selection anchor. A saved view is what the table *is*; an open editor is what a user is *doing*,
  and persisting the second inside the first would let a restored view reopen an editor nobody
  touched this session.
  ⚠️ **Corollary: scrolling the edited row out of the virtualized window cancels the edit.**
  Virtualization recycles DOM, so a draft tracked any other way would resurface against whatever row
  scrolls into the recycled slot — the shape of a bug that reads as data corruption rather than as an
  edit correctly abandoned.
- **`isEditing` is signal-valued, inherited from ARCH-291's `isSettled` rather than re-decided.** Cell
  contexts are memoised against the engine `Cell`, so a plain boolean would be read once and frozen:
  the cell activates and the flag never notices.
  ⚠️ **The cost profile is the opposite of `isSettled`'s, though.** That one describes the viewport,
  so one signal serves every cell; this one describes the *cell*, so an opted-in table allocates one
  `computed` each. A table with no editable column shares one frozen bundle, `NGE_CELL_NO_EDIT` (its
  always-false signal `NGE_CELL_NEVER_EDITING` mirrors `NGE_CELL_ALWAYS_SETTLED`), by reference —
  "available but unused" costs exactly what it cost before, which is what makes ARCH-289's
  frame-budget criterion structural rather than measured-and-hoped.
  `toNgeCellContext` takes `isSettled` AND `edit` as required parameters for the reason ARCH-291
  made the first one required: the export seam hands over `NGE_CELL_ALWAYS_SETTLED` and
  `NGE_CELL_NO_EDIT` explicitly, so a defaulted parameter never lets a future caller inherit either
  answer by omission.
- ⚠️ **THE FINDING: the interactive-element guard moves to core and goes role-based, and both moves
  were forced.** It lived in the range addon as a tag list (`input`, `button`, `select`, `textarea`,
  `[contenteditable]`). Core, because row selection's `Space` asks the identical question and core
  cannot import an addon. Role-based, because a cell's control is as often a `div` carrying
  `role="slider"` / `role="combobox"` as a native tag — a design-library control looks like that —
  and the tag list matched none of it, so dragging a composed control's thumb read as a pointerdown
  on bare cell text and started a cell-range drag instead. `NGE_INTERACTIVE_SELECTOR`
  (`src/lib/interactive/`) now matches roles plus a `data-nge-interactive` escape hatch.
  ⚠️ **The ticket proposed `[tabindex]` as one more generalisation, and it must never be added.**
  Selection puts `tabindex="0"` on the row, the guard is a `closest()` walk, so from any cell in a
  selectable table it resolves straight to the row — every cell reads as "inside a control" and
  cell-range dragging stops table-wide, not for one control. The failure is total, which is the only
  reason it was caught. Roles over component names for the same reason the extensibility gate audits
  for a central switch elsewhere: naming `dlc-select` would put one in front of a seam.
  The guard has exactly two call sites in the bridge — `onPointerDown` and `takeKey` — so
  generalising it fixes the drag guard and keeps cmd/ctrl-`A` and `Shift`+arrow out of an in-cell
  control's way in one change.
- ⚠️ **THE SECOND FINDING: `Escape` has three claimants, and the fix is containment, not
  coordination.** The ticket named the range addon's. The highlight addon (`nge-highlight-bridge.ts`)
  binds its own unconditional document-level `Escape` too. An editor's `Escape` calling
  `stopPropagation()` at the cell starves every document listener at once — `document` is last on the
  bubble path — without core ever enumerating which addons currently bind the key, and any future
  addon binding `Escape` inherits the containment for free. ARCH-294's two-stage `Escape` (close a
  panel, then cancel the edit) builds on top of this rather than around it.
- **The four keyboard collisions, and where each lands:**

  | Key | Already claimed by | What this story does |
  | --- | --- | --- |
  | `Space` | Row selection's toggle | Guarded by the shared interactive-element check |
  | `Escape` | Range addon + highlight addon (both document-level) | Contained at the cell — neither ever sees it |
  | cmd/ctrl-`A` | Cell range's select-all (`takeKey`) | Free — `takeKey` already consults the guard |
  | cmd/ctrl-`Space` | Column selection (`selectFocusedColumn`) | Free — scoped to a stamped header, never an in-cell editor |

  ⚠️ Do not regress ARCH-268's modifier-gated `preventDefault` on a row's `mousedown` — it is gated
  on `shiftKey` because an unconditional one suppresses focus and would keep a click from ever
  landing in an `<input>` inside a cell.
- **No core switch beyond the flag.** What renders during an edit is a `[ngeCell]` template through
  the existing registry, never a branch in `<nge-table>`'s markup. ARCH-293's library editors are
  defaults a `[ngeCell]` template shadows (ARCH-278's order) — the route that lets a library-shipped
  editor register as one is ARCH-293's question, not this story's.
- ⚠️ **`config.getRowId` stops being optional** the moment any column sets `meta.ngeEdit.enabled` —
  same dev-mode throw and the same reasoning as `assertSelectableRowsAreIdentified` (ARCH-268):
  editing is id-keyed scratch, and an array-index key would resolve a draft, or its cancellation,
  against the wrong record after a sort or a re-fetch.
- ⚠️ **The demo's `description` column is declared IN THE STORY, not added to
  `NGE_TABLE_FIXTURE_COLUMNS`.** ARCH-290 put `description` on every fixture *row* and deliberately
  left it out of the shared *column* array; ARCH-292 is the first story to render it, so this is
  where the trap goes live. ARCH-289's frozen baseline renders that array wholesale, so an eighth
  shared column silently changes what the baseline measures — and a performance baseline that
  quietly starts measuring a different table is worth less than no baseline at all. Declaring the
  column locally is also the honest demonstration, since it is exactly what a consumer writes.
  ⚠️ **The failure mode if you get this backwards is silent in the other direction too**: naming a
  column id in a demo's editable list that no column actually declares makes the opt-in a no-op, and
  the table renders perfectly while the feature is simply absent. Verified in the browser here —
  the inline-edit demo shows 8 columns, the frozen baseline still shows 7.
- ⚠️ **THE THIRD FINDING: `NgeTableStore` had reached `signalStore`'s hard ceiling of FIFTEEN
  features, and a sixteenth fails in a way that points everywhere except at the store.** `signalStore`
  is typed by overload and the widest one takes fifteen; past that, inference falls off the table,
  every store member collapses to an index signature and `store.table` reports as `Function`, so
  around forty `TS4111` errors appear in `nge-table.component.ts` — a file nobody touched.
  **ARCH-297 resolved this**: the root is now seven slots and a spec fails at ten. See § The store's
  composition root for where a new concern goes; do NOT follow this entry's original advice to squeeze
  one into an existing block.

### Cell editors (ARCH-293)

`@nge/table/editors` ships `<nge-cell-input>` (text / number) and
`<nge-cell-checkbox>`. A column **names** one — `meta.ngeEdit.editor`, configured through
`meta.ngeEdit.editorInputs` — and the table renders it; there is no template to write. Source is
`src/editors/`; the route that resolves it is `toNgeEditorTemplateMap`
(`store/nge-table-slot-registry.ts`) plus one extra lookup in `NgeTableStore.cellTemplate`.
Reasoning in the guide (`docs/architecture/table.md` § Cell editors). What bites in this directory:

- **The route is a second lookup, not a branch, and `nge-table.component.html` is untouched.**
  ARCH-292 ruled out `if (editable) renderOurInput()` in the markup, so an editor arrives through
  the same registry a `[ngeCell]` does: `cellTemplate(columnId)` returns the projected template if
  there is one, **then** the editor the column named. That order IS the "a consumer's template
  wins" criterion — reversing the two lines is ARCH-278's recorded failure, which "compiles, lints
  and renders perfectly while silently ignoring every consumer template".
- **What makes a component renderable there is the adapter, not us.** `FlexRenderContent` already
  accepts a `FlexRenderComponent` alongside a `TemplateRef`, so `NgeCellTemplate.content` widened
  to return either and nothing else moved. ⚠️ **A bare component `Type` does not work**: the
  adapter feeds it `props` as inputs *by name*, and a cell context has no `cell` key, so the one
  required input would silently never be set. It must be `flexRenderComponent(editor, { inputs: { cell } })`.
- ⚠️ **The per-cell `FlexRenderComponent` is memoised in a `WeakMap` keyed by the cell context, and
  that is load-bearing.** `*flexRender` calls the thunk on every change-detection pass of every
  rendered editable cell; a fresh wrapper each time means a `reflectComponentType` call per cell per
  pass *and* a changed memo key, which is the churn `cellContexts` and the stable-thunk rule already
  exist to avoid. `editorTemplateById` is a `computed` for the same reason its sibling is.
- ⚠️ **THE FINDING: focus follows the TRANSITION into editing, never the field's presence.** An
  editor must focus itself — `Enter` on a focused row activates the first editable column and
  focuses nothing, so without it the keyboard route dead-ends. But an `alwaysLive` column reports
  `isEditing()` true from its first render *for every cell at once*, so focusing on presence has
  thirty rendered rows each grab focus as they paint, and the last to render wins — a user's caret
  leaves whatever they were doing the moment such a table appears. `focusNgeEditorOnActivation`
  (`src/editors/nge-cell-editor-focus.ts`) holds the rule once for both editors; its `null` start
  is what makes a first observation never count as a transition.
- ⚠️ **Neither editor holds a draft, and the checkbox's reason is different from the input's.** The
  input's `<input>` DOM value *is* the draft, which is safe because activation bounds the element's
  life and ARCH-292 cancels an edit whose row leaves the window. A checkbox has no such bound when
  the column is always-live, and `[checked]` re-derives from the cell — Angular writes a property
  binding only when the **bound** value changes, so a box unchecked on a `true` row and recycled
  onto another `true` row would keep showing the stale state, because `true → true` is no change.
  **So a toggle is the commit.** `Enter` commits too (a browser fires no `change` for it); blur has
  nothing left to do. This reads ARCH-293's "commit on Enter / blur" in substance rather than to the
  letter, deliberately.
- ⚠️ **The blur handler's `isEditing()` guard is the one that ships a bug if dropped.** Removing a
  focused element fires a native blur, and `Escape` does exactly that — so without the guard the
  teardown blur commits the very draft `Escape` discarded, and it looks like `Escape` not working.
  Verified in a browser, not only in a spec.
- **`Escape` is NOT bound in either editor.** ARCH-292 contains it at the cell, which is the one
  position a `stopPropagation()` starves the range and highlight addons' document listeners from at
  once. A second claimant inside the editor is the coordination that finding rejected.
- **A cell editor is not a form control** — no CVA, no `NgControl`, no label element, no validation,
  no touched/dirty. That per-instance saving is the whole justification for owning them rather than
  reaching for `dlc-input`. ⚠️ And they are **not** ARCH-268's selection checkbox, which is a pointer
  affordance (`tabindex="-1"`, `aria-hidden`) announced by its row.
- **`--nge-table-editor-*` is a token family of its own, bridged in all six themes.** A field must
  read as sitting ON the row: on a themed table `--nge-table-surface` and the row routinely resolve
  to the same colour, so inheriting it would leave the field with only its border to say it is a
  control. Colour members are bridged; geometry and `font-size` (which defaults to `inherit`) are
  not, on ARCH-277's test — *would a bridge entry teach a contract the table does not honour?*
  ⚠️ The focus ring is `--nge-table-focus-ring-*` drawn **inset**: `.nge-table__cell` has
  `overflow: hidden` and no positioning (ARCH-243, both staying), so an outer ring is clipped away.
- **They cost nothing measurable, and the measurement is a controlled pair rather than a reading.**
  `Performance/Cell Editors/Interaction` has a `withEditors` toggle; off it renders exactly what the
  frozen baseline renders, so the editors are the only variable on one machine in one session. M5 Max
  / 60Hz, 2 runs each: p95 median **16.9ms on** vs **17.3ms off**, worst 17.6ms both, 0 dropped,
  `rowsBuilt` 714 across all four. ⚠️ **On measured marginally FASTER than off** — the gap (2.4%) is
  smaller than the off-pair's own spread (1.8%) and its sign is backwards, which settles it as noise
  more convincingly than a tolerance would. Read it as "both fit", not "both cost the same": p95 on
  a vsync-locked display moves only when work exceeds the budget. ⚠️ **The always-live column is the
  subject** — an activated column builds no control while nobody edits, so a story measuring only
  those would report a vacuous pass.
- **`src/entry-points.spec.ts` is what makes the third entry point structural.** It walks the
  transitive relative-import closure of `src/index.ts` and fails if it reaches `src/editors/` or
  `src/testing/`. ⚠️ Confirm it can fail before trusting it — append `export * from './editors'` to
  the barrel and watch it go red; a walker whose resolver silently returns nothing passes everything.
  ARCH-294 added the **package** half (`FORBIDDEN_PACKAGES`), which the directory half does not
  imply — see below.

### The select editor and its overlay (ARCH-294)

`@nge/table/editors` also ships `<nge-cell-select>`, a flat enum picker over a CDK
overlay, declared with `ngeCellSelectEdit(options, extra?)`. It is the story that brought
`@angular/cdk` into `shared-table`. Source is `src/editors/nge-cell-select.component.ts`;
reasoning in the guide (`docs/architecture/table.md` § The select editor). What bites here:

- ⚠️ **THE FINDING: options ride `editorInputs`, and a top-level `meta.ngeSelect` key is not
  merely unnecessary — it is unbuildable without a core edit.** `meta.ngeExport` (ARCH-248) and
  `meta.ngeFill` (ARCH-271) are top-level because **core** reads them. A `NgeCellContext` carries
  `columnId` as a *string* and no `Column` at all, so an editor cannot read column meta by any
  route; the inputs the adapter spreads are its only channel. Plumbing a `ngeSelect` key to a
  component would mean core learning what a select is. The ticket's wording pointed the other way,
  and following it to the letter would have put a central switch in front of the very seam
  ARCH-250 and ARCH-251 validated. `ngeCellSelectEdit()` exists because `editorInputs` is
  `Record<string, unknown>` and a misspelled key is dropped in silence — an empty panel reads as a
  data problem rather than a typo.
- ⚠️ **THE SECOND FINDING: ARCH-292's `Escape` containment does NOT reach a body-level panel, so
  the two-stage key needs claimants in two places.** CDK's `OverlayKeyboardDispatcher` listens on
  **`body`** (`overlay-keyboard-dispatcher.ts:31`), one node before `document` — so
  `stopPropagation()` inside `overlayRef.keydownEvents()` starves the range and highlight addons
  exactly as the cell-level containment does. That half is symmetric and cheap. But a key raised on
  the **trigger** bubbles through the *cell* first, where ARCH-292 stops it, so it never reaches
  `body` at all: without a second claimant the first `Escape` would cancel the edit outright
  instead of closing the panel. Hence a trigger handler **guarded on the panel being open** —
  which, with no panel, leaves the key completely alone and inherits stage two unchanged. This is
  the one place an editor legitimately binds `Escape`, and the guard is what keeps it from being
  the coordination ARCH-292's finding rejected.
- ⚠️ **The panel closing is NOT evidence the containment works** — the ARCH-250 lesson replayed.
  Deleting the `stopPropagation()` leaves the panel closing correctly, every keyboard assertion
  passing, and only one spec red. Keep `never lets a panel Escape reach a document-level listener`;
  it is the only thing standing between a working dropdown and a cleared cell range.
- ⚠️ **`RepositionScrollStrategy`, and the panel still closing on scroll-out is a CONSEQUENCE of
  the row model rather than a strategy choice.** The ticket specified `CloseScrollStrategy` against
  the fear that virtualization leaves CDK measuring a detached trigger. **That fear does not
  materialise here**, and one line decides it: `nge-table.component.html` `@for`-tracks rows by
  `rendered.row.id`, so a row leaving the window is **destroyed, not recycled onto another
  record** — the editor dies with it and its `DestroyRef` teardown disposes the overlay. Measured
  at 25px/frame: thirteen frames tracking exactly, **zero** frames positioned at the detached
  `{0,0,0,0}` origin, clean close on the fourteenth. Closing on the first scroll event instead
  loses a dropdown to an inertial trackpad brush, which is the actual cost being paid.
  ⚠️ **Load-bearing on destroy-not-recycle.** Row recycling is an unticketed backlog item for this
  epic; if it lands, a recycled trigger stays connected while showing a different record and the
  panel would track the wrong row. Revisit this before that ships.
  ⚠️ **`autoClose` is deliberately unset** — it measures against the *browser viewport* and carries
  an upstream TODO about ancestor scroll containers, so in a table that scrolls in an inner
  viewport it would almost never fire.
  Whatever the strategy, subscribe `detachments()`: a strategy that detaches rather than disposes
  otherwise leaves the component believing a panel it can no longer see is open.
- ⚠️ **Token inheritance into the panel is narrower than "does not reach it", and the precise
  version matters.** `:root` defaults *do* reach the overlay container — `<body>` is a descendant
  of `:root` — which is why the panel renders correctly under no theme and why that case proves
  nothing. What does not follow it out of the table is anything scoped tighter: a theme class on a
  wrapper, and `<nge-table>`'s inline host geometry. `applyNgeEditorPanelTokens`
  (`src/editors/nge-cell-editor-panel.ts`) resolves `NGE_EDITOR_PANEL_TOKENS` through
  `getComputedStyle` **at the trigger** and copies them onto the pane, which answers every
  scoping at once and needs no knowledge of a domain's theme-class naming — where copying a theme
  class, `dlc-select`'s approach, would need exactly that. **Add a token a panel reads and you
  must add it to `NGE_EDITOR_PANEL_TOKENS` in the same change**, or it will work at `:root` and
  silently not under a theme. Verify by measuring the rendered panel, never the wrapper's declared
  token. ⚠️ The list is shared by both panel editors and holds the union of what they read, which
  is what makes that rule structural rather than a thing to remember — see ARCH-296.
- ⚠️ **`ngeCellSelectEdit()` declares the column `alwaysLive` by DEFAULT — the only editor that
  does — and it is ARCH-293's checkbox argument rather than a new one.** What activation saves for
  a select is one `<button>` per visible row; what it costs is a click to activate *before* the
  click that opens, plus a cell that renders as bare text and tells a user nothing about the column
  being a select at all. **The expensive half is deferred either way**: the overlay, the portal and
  the option list are built on open and never before, so a table of triggers still holds zero
  panels — verified as `document.querySelectorAll('.cdk-overlay-pane').length === 0` with every row
  showing a trigger. Pass `alwaysLive: false` for a dense read-mostly grid.
  ⚠️ **A story section demonstrating the two-stage `Escape` must pass `alwaysLive: false`**, or
  there is no activation for the second press to cancel and stage two silently demonstrates
  nothing.
- **`role="combobox"` is the whole cost of the range-drag criterion.** `INTERACTIVE_ROLES` already
  carries `combobox`, `listbox` and `option`, so the guard, cmd/ctrl-`A` and `Shift`+arrow
  containment all arrive with the attribute — no core change, as ARCH-292 predicted.
- **Focus goes to the panel, not to a roving option.** `aria-activedescendant` announces the active
  option while focus stays on the listbox, which is what puts panel keydowns on the path to CDK's
  `body` listener. A roving `tabindex` would move focus per keystroke and defeat stage one.
- **`status` needed no new column.** It is already in `NGE_TABLE_FIXTURE_COLUMNS`, so the demo maps
  `meta` onto a copy and ARCH-289's frozen baseline is untouched — ARCH-292's `description` trap
  simply does not arise here.
- **The frame-budget criterion is structural, not measured.** A closed panel allocates no overlay,
  so there is nothing to regress; per ARCH-292's precedent and the ticket's own note, a green
  ARCH-289 harness run is not evidence either way on a vsync-locked display.
- **`focusNgeEditorOnActivation` now takes `ElementRef<HTMLElement>`** so a `<button>` trigger can
  reuse it. It only ever calls `focus()`, so the two field editors are unaffected.

### The textarea editor and explicit commit (ARCH-296)

`@nge/table/editors` also ships `<nge-cell-textarea>`, a long-text editor in a CDK
overlay, declared with `ngeCellTextareaEdit(options?)`. It is the first editor whose commit is
**explicit**. Source is `src/editors/nge-cell-textarea.component.ts`; reasoning in the guide
(`docs/architecture/table.md` § The textarea editor). What bites here:

- ⚠️ **THE FINDING: this is the exact INVERSE of ARCH-293's blur rule, and copying that editor is
  the mistake.** There, a blur handler *guarded* on `isEditing()` was the fix, because tearing a
  focused field down fires a native blur that would otherwise commit the draft `Escape` had
  discarded. Here **the handler must not exist at all**: clicking **Cancel** blurs the field on its
  way to the button, so a commit-on-blur applies the very edit Cancel exists to discard, and the
  guard does not help because the edit is genuinely still live at that moment. There is no `(blur)`
  in the class or the template, and the spec pins all three routes — Cancel, tab-to-Apply, and an
  outside click.
  ⚠️ **The third of those is weaker than its siblings and the spec says so**: jsdom moves no focus
  on a synthesized backdrop click, so adding a `(blur)="apply()"` fails the first two and leaves the
  third green. Do not read equal cover into three sibling `it`s.
- **The generalisable half:** `Enter` cannot commit either — it inserts a newline, which is the
  whole reason a column chose a textarea. **A control whose natural gestures are all ambiguous needs
  explicit affordances, and adding them is cheaper than inventing a rule about which keystroke means
  "done".** `commitEdit` fires from Apply and nowhere else; `cmd`/`ctrl`+`Enter` is the accelerator.
- ⚠️ **THE SECOND FINDING: `hasBackdrop: true` is the draft-protection mechanism, and it is the
  first thing in this epic that actually blocks the inner viewport.** A row leaving the virtualized
  window is destroyed (`@for`-tracked by `rendered.row.id`), taking its editor with it. For a select
  that costs a closed list; for a textarea it costs however much prose was typed — silently,
  mid-sentence, because the user scrolled. `.cdk-overlay-backdrop` is a hit-testable full-viewport
  child of the overlay container on `<body>`, so a wheel event over it has a scroll chain of
  container → `body` → `html` and **never** `.nge-table__viewport`. The row cannot leave the window
  while the panel is open, so the draft stays in the field's own DOM value with no scratch state
  anywhere and no `NgeTableStoreState` slice.
  ⚠️ **`scrollStrategies.block()` is NOT the route and is a verified no-op here** — it operates on
  `document.documentElement`. That is the **third** sighting of CDK's browser-viewport assumption in
  this epic, after ARCH-294's `autoClose`. Assume any CDK scroll API means the *page* until proven
  otherwise.
  **Measured, three legs, real wheel events on the virtualized story section** (2,000 rows,
  `scrollHeight` 80,045 / `clientHeight` 250): baseline with no panel `scrollTop` 0 → **500**; panel
  open, eight ticks at the same point → **500, unchanged**, panel and draft intact; after Cancel →
  **1,500**. ⚠️ The middle leg is only evidence because the *page* scrolled instead — a wheel that
  did nothing anywhere would prove the event never landed rather than that the backdrop caught it.
  `document.elementFromPoint` over the table's centre returns the backdrop, which is not inside
  `.nge-table__viewport`.
  ⚠️ **CDK adds `cdk-overlay-backdrop-showing` inside a `requestAnimationFrame`** (`_attachBackdrop`,
  unless animations are disabled), and until it lands the transparent backdrop computes to
  `visibility: hidden` and intercepts **nothing**. Two consequences. In a real browser it is a
  one-frame window, before the user can have typed anything — benign. In an **automation tab it never
  lands at all**, because a hidden tab suspends rAF: the measurement above required adding that class
  by hand, and anyone re-running it who skips that step will watch the table scroll and conclude the
  backdrop does not work.
  ⚠️ **Do not "unify" this with the select by making both block.** The asymmetry is one rule applied
  to different stakes: an editor holding unsaved prose protects it, one holding a closed list has
  nothing to protect and keeps the nicer follow-the-trigger behaviour.
- **The panel is modal only while the draft is DIRTY**, and that is both halves of the contract the
  ticket demanded. A clean draft closes on an outside click like the select's; a dirty one keeps the
  panel and returns focus, and an "Unsaved" hint appears beside the buttons — which is what tells the
  user *why* the click did not dismiss. Dirtiness is `field.value !== display()`, a local comparison,
  so typing back to the original makes the panel dismissible again.
  ⚠️ **`Tab` is NOT trapped, and that was decided rather than missed.** `cdkTrapFocus` gated on the
  dirty flag was considered and rejected: a click outside is refused because it would *destroy* the
  draft, while tabbing out destroys nothing — the panel stays, the text stays, `Shift`+`Tab` returns.
  Trapping restricts for no protective gain, which is the argument this editor already makes against
  blocking the select's scroll. `role="dialog"` carries no `aria-modal` for the same reason: it would
  claim an inertness that holds for the pointer and not for focus.
- **`Escape` cancels outright — ONE stage, and the collapse is forced rather than chosen.**
  ARCH-294's two stages were "close the panel", then "cancel the edit". Here the column is never
  always-live, so a closed panel with the edit still live would leave the cell as bare read-only text
  with no way back into it. `Escape` is the keyboard twin of Cancel and neither confirms. The
  containment is inherited unchanged — `stopPropagation()` in `overlayRef.keydownEvents()` — and
  **no trigger-level handler is needed**, unlike the select's, because the panel opens on activation
  and focus is never on the trigger while an edit is live.
  ⚠️ **Verified falsifiable**: deleting that one `stopPropagation()` fails exactly one spec
  (`never lets a panel Escape reach a document-level listener`) and leaves every "the panel closed"
  assertion green. ARCH-250's lesson, third confirmation.
- ⚠️ **`ngeCellTextareaEdit()` accepts no `alwaysLive`, and this is the only editor for which it is
  INCOHERENT rather than a poor trade.** The control is a body-level overlay opened on activation, so
  an always-live column would mean one panel per visible row — not a rendering of a column at all.
  The component takes a second lock: it opens on the **transition** into editing (the `null`-start
  rule `focusNgeEditorOnActivation` uses), so a hand-written `meta.ngeEdit.alwaysLive: true`
  degrades to *no* panel rather than to thirty. The trigger's click-stop exists only for that
  degraded state, where a trigger sits with nothing over it.
- **The panel token list moved to `src/editors/nge-cell-editor-panel.ts`** as
  `NGE_EDITOR_PANEL_TOKENS` + `applyNgeEditorPanelTokens`, a sibling of
  `nge-cell-editor-focus.ts`. One list holding the union of what both panels read is what turns
  ARCH-294's "add a token, add it to the list" from a rule into a structural fact: a second editor
  cannot forget a list it does not own. Neither helper is exported from the entry point — a consumer
  has no editor of ours to apply them to.
- ⚠️ **`nge-cell-editor-panel.spec.ts` now ENFORCES that rule instead of restating it.** It parses
  both panel stylesheets for `var(--nge-…)` reads and fails naming any token absent from the array,
  which is worth having because the rule's failure mode is the silent kind: a missing token works
  perfectly at `:root` — the case anyone checks first — and is simply absent under every theme.
  Anchoring on `var(` is what separates a token a file *reads* from one it *declares*. Carries the
  falsifiability guards this library writes by habit, since an extractor matching nothing would pass
  against every possible tree.
- **Three new tokens, one bridged.** `--nge-table-editor-on-accent` is a colour and is bridged in
  all six persona files (the Apply button is filled with `--nge-table-editor-accent` to mark it as the
  commit, so it needs a paired foreground; `--nge-calendar-on-accent` is the precedent).
  `--nge-table-editor-panel-padding` and `--nge-table-editor-panel-min-width` are geometry and stay
  unbridged on ARCH-277's test. A dropdown is sized to its trigger because its content is short
  labels; prose sized to a cell would be unusable, hence a floor of its own.
- **`role="textbox"` on the trigger is the whole cost of the range-drag criterion** — as ARCH-294
  found for `combobox`. `INTERACTIVE_ROLES` already carries it, so the guard, cmd/ctrl-`A` and
  `Shift`+arrow containment all arrive with the attribute.
- **The frame-budget criterion is structural, not measured**, per ARCH-292's and ARCH-294's
  precedent: an activated column builds no control until engaged and a closed panel allocates no
  overlay, so there is nothing to regress — and a green ARCH-289 run on a vsync-locked display is not
  evidence either way.
- **The demo's `description` column is declared IN THE STORY**, never added to
  `NGE_TABLE_FIXTURE_COLUMNS` — ARCH-292's trap, and the same reasoning: ARCH-289's frozen baseline
  renders that array wholesale.

### Row expansion (ARCH-298)

`enableRowExpansion` injects a leading disclosure column and lets a user write `state.expanded` —
the half Wave 0 deliberately left out, having shipped the slice, the `row-detail` slot and its token
on the principle that *a slot is a place, not a state*. The pure parts are
`store/nge-table-expansion.ts`; the gestures and slot contexts are `withNgeTableExpansion`; the
geometry lives with the virtualizer in `withNgeTableRows`. What bites in this directory:

- ⚠️ **`getRowCanExpand` is what switches expansion on at the engine, not `enableExpanding`.**
  `row.getCanExpand()` falls back to `(enableExpanding ?? true) && !!row.subRows?.length`
  (`table-core/src/features/RowExpanding.ts:329`) and flat data has no `subRows` — so without the
  override `buildTableOptions` supplies, **every row of every table answers `false` and nothing can
  ever open**. The engine's default is written for tree data; a detail band is the other half of the
  feature and has to say so.
- **`row.toggleExpanded()` and `table.toggleAllRowsExpanded()` are in-contract**, exactly as
  `row.toggleSelected()` is: both forward to `options.onExpandedChange`, which `buildTableOptions`
  routes back into `applyTableStateChange`. `table.setExpanded` is the banned one — an engine option
  name, and the builder is the only place those appear.
- ⚠️ **The capability check is ours, because `toggleExpanded` does not consult `getCanExpand()`.**
  Only `getToggleExpandedHandler()` does, and that returns a handler this library has no use for.
  Without the check a rejected row opens by keyboard while its control renders disabled.
- ⚠️ **`allRowsExpanded` is derived from `tableState`, NOT from `table.getIsAllRowsExpanded()`.**
  The engine's answer reads `table.getState()` — the options object the adapter last applied — so
  two writes inside one change-detection pass have the second deciding against the state before the
  first, and expand-all *expanded twice* instead of toggling. A spec caught it. This is the
  controlled-state lock ("never read state back off the table instance") being load-bearing rather
  than decorative, and the direction is passed to the engine explicitly for the same reason.
- ⚠️ **The slice may be the literal `true`.** That is the engine's shorthand for "everything", and
  `toggleAllRowsExpanded` writes it — which is what makes expand-all affordable on 10,000 rows.
  Every predicate has to handle it: `isNgeRowIdExpanded` exists so the check is in one place, and a
  cast past the union answers `false` for exactly the gesture most likely to produce a large payload.
- **`_autoResetExpanded` is unreachable here**, being called only from `getGroupedRowModel`
  (unwired), so expanded rows survive a sort. ⚠️ A later story wiring grouping would silently start
  collapsing the user's rows; a spec pins it.
- **Both injected columns lead, and they agree on the order rather than each forcing index 0.**
  `applyInjectedColumnOrder` (the generalisation of ARCH-268's selection-only version) takes them in
  render order — expansion, then selection. The chevron leads because it describes the row's own
  shape where a checkbox describes its membership in a set.
- **The chevron IS a tab stop where the selection checkbox is not**, and the asymmetry is deliberate:
  the row's `Space` is already selection's and its `Enter` is already editing's, so there is no key
  left for expansion. A `<button>` brings activation, disabled semantics and a focus ring with it.
- ⚠️ **`config.getRowId` is mandatory and fails loudly**, on the same reasoning as selection and
  editing. Without it the band stays open on a different record after a sort.

#### The geometry, which is the decision this story owned

A detail band is **declared** (`config.rowDetailHeight`), never measured. `estimateSize` returns
`rowHeight + (isExpanded ? rowDetailHeight : 0)`, so sizes stay computable *before* a row is
rendered — the property virtualization actually depends on. `measureElement` was rejected: it makes
row height variable, which every geometry computed from a running total assumes away, and ARCH-289's
frozen baseline would have to be re-read against it.

Three things keep it true, and the third is the one to know:

1. `applyGeometry` pins `--nge-table-row-detail-height` **inline on the host** while virtualizing,
   exactly as it pins the row height — so the DOM agrees with what the virtualizer was told. Off
   virtualization a theme owns the token outright, because nothing there is positioned by arithmetic.
2. An open band takes that value as a definite `height` + `overflow: auto`, in **both** regimes since
   ARCH-300. Content beyond the declared height scrolls — the honest failure, and a visible one.
3. ⚠️ **`estimateSize` is not among the options the measurement memo watches.** `getMeasurements`
   memoises on `[getMeasurementOptions(), itemSizeCacheVersion]` and `getMeasurementOptions` lists
   count, padding, `scrollMargin`, `getItemKey`, `enabled`, lanes and gap — *not* `estimateSize`
   (`virtual-core` `index.js:538,571`). A `measure()` effect in `withNgeTableRows` bumps that
   version when the slice, the row height or the band height moves.

⚠️ **That `measure()` is belt-and-braces today, and the spec cannot tell.** `getItemKey` is a fresh
arrow on every options rebuild, so its identity already invalidates the memo — disabling either
mechanism alone still passes, and only disabling both fails. It is kept because the incidental one is
a *performance bug waiting to be fixed*: memoising `getItemKey` is an obvious optimisation on 10,000
rows, and whoever makes it would otherwise silently take expanded rows back to overlapping their
neighbours. If you touch that code, disable `getItemKey`'s churn as well before trusting a green run.

**Out of scope, deliberately:** tree data / sub-rows. `getExpandedRowModel()` exists to flatten
sub-rows into the visible row model; a band needs none of it, only `getRowCanExpand` and
`row.getIsExpanded()`. Wiring it would drag `getSubRows`, `row.depth`, indentation and grouping into
a story about a disclosure control.

### Rich content in a row-detail band (ARCH-299)

The band is the only surface as wide as the table, which is what lets it hold what a cell cannot —
and since the height above it is declared, content that *needs* a height (a chart) works there.
**No library code was required for any of it**: a band's content is the consumer's markup, and the
extensibility result is that the render-slot axis needed nothing. What a consumer has to know is one
CSS rule and why it is not the one the cell case uses.

#### Band content claims the height; the band does not hand it down

⚠️ **`align-self: stretch` — `chart-cells`' answer — is a *cell's* answer and does not generalise.**
A cell is a flex **item** on a row whose height is already definite, so stretching resolves against
the line. `.nge-table__row-detail` is a plain **block** on its own line (the row carries
`flex-wrap: wrap` precisely so the band gets one), so there is no flex line to stretch against and
nothing above it to inherit from. A chart dropped in unwrapped therefore collapses to a 0px-tall
nothing — **silently, with no error anywhere**, which is the same failure mode `<nge-chart>` has
everywhere and the reason it is worth writing down here rather than rediscovering. (This was worse
before ARCH-300: the band was a fixed `height` while virtualizing and a `min-height` otherwise, so
a percentage child resolved against neither. The regimes now agree.)

The answer is one declaration, and it reads the same custom property the table was sized by, so it
is correct in both regimes and duplicates no number between SCSS and config:

```scss
.detail-band {
  box-sizing: border-box;
  display: flex;
  height: var(--nge-table-row-detail-height, 120px);
  padding: 12px 16px;
}
.detail-band__chart { display: flex; flex: 1 1 0; flex-direction: column; min-width: 0; }
.detail-band__plot  { flex: 1 1 auto; min-height: 0; }
```

That works because `applyGeometry` publishes `--nge-table-row-detail-height` **inline on the host**
whenever the config carries `rowDetailHeight` — and `createNgeTableConfig()` fills it in from
`NGE_TABLE_DEFAULTS` unconditionally, so in practice every factory-built table has it. ⚠️ The same
inline write is why a *theme* cannot move the band height of a factory-built table; a config that
omits the field hands the token back (`stories/row-detail-content/theming` § 3 demonstrates both).

⚠️ `min-height: 0` on the plot is load-bearing, not tidiness. A flex item's automatic minimum size
is its content and an SVG's is not small, so without it the plot refuses to shrink and pushes the
band's fixed height into a scrollbar instead of fitting inside it.

#### The height is per TABLE, not per row — and that was the open question

`config.rowDetailHeight` is one number for the whole table. The alternative considered and
**rejected** was a per-row `(row) => number` callback: `estimateSize` already takes an index, so it
is cheap to implement, and that is exactly what makes it dangerous. It converts a number a consumer
sets once into a function they can get wrong per row, and the failure is expanded rows overlapping
their neighbours — the class of bug ARCH-298's *declared, never measured* decision exists to
prevent. A uniform band is also what keeps a table readable: bands comparable down the column beat
bands that each size to their own content.

Two consequences follow, and the second is what makes the first liveable:

- **Two band kinds that genuinely want two heights are two tables.** It costs a config object and
  cannot go wrong per row.
- **Within a table, the content is pitched at the height that was chosen.** Legend, axis labels and
  gridlines are ~75px of chrome that a 320px band affords and a 160px one does not; the compact
  example in `stories/row-detail-content/usage` § 7 drops them rather than shrinking the plot to a
  sliver.

Reopening this needs a ticket of its own, not a quiet addition.

#### What else a band's content owes

- **It must be a pure function of the row.** Virtualization recycles DOM, so the template runs again
  against a different row as the user scrolls. Anything drawn from `Math.random()` redraws itself
  mid-scroll; anything cached on the element belongs to whichever row that element shows *now*.
- **Memoise a chart config in a `WeakMap` keyed by the row object.** A factory called from the
  template allocates a new config per change-detection pass, so the `config` input changes identity
  and the chart re-renders. Keyed by `row.id` in a `Map` it would never forget a row, so a full
  10,000-row scroll ends up holding 10,000 configs. If the config depends on something that can
  change, rebuild the whole cache when that dependency moves.
- ⚠️ **Two token contracts meet in the band.** The band is `--nge-table-row-detail-surface`; the
  chart on it reads `--nge-chart-*` and knows nothing about the table. A domain bridging only the
  table's tokens gets a dark band with a bright white chart punched through it — visible from across
  the room, and the theming story shows the pair side by side.
  ⚠️ **Demonstrating that inside Storybook requires writing the unbridged values out by hand.**
  Storybook bridges `--nge-chart-*` globally for its theme toolbar, so a "before" wrapper class
  that merely *omits* the family inherits the toolbar's themed values and the comparison shows
  nothing — both sides look bridged, and the section reads as proving the opposite of its point.
  `stories/row-detail-content/theming` § 2 restates the charts library's own literal fallbacks
  instead. The same trap waits for any story contrasting a *second* library's tokens.
  ⚠️ **It is not confined to a second library's tokens, and ARCH-304 hit it with the table's own.**
  Since ARCH-277 all six persona themes bridge `--nge-table-*` too, so a wrapper class omitting
  *this* family inherits the toolbar's values exactly as one omitting `--nge-chart-*` does — the
  showcase's "Default (light)" column rendered at `--nge-table-surface: #090b0d` under `dlc-professional-dark`.
  The general rule: **a theming section contrasting unthemed against themed writes the unthemed
  values out by hand, whichever family it is about**, and is checked by reading the resolved token
  rather than by looking at the page, since both sides look plausibly themed either way.
- **A band has no `isSettled`.** `NgeCellContext` carries the scroll-settle signal (ARCH-291);
  `NgeRowContext` deliberately does not, because a band renders once per *open* row inside the
  window rather than once per cell down a column, which is a different order of cost. If a case ever
  shows otherwise, note that the field would have to be signal-valued — the memo lock in ARCH-239
  applies to any context field that can move.

### Animating the detail band (ARCH-300)

The band opens over `--nge-table-row-detail-duration` (180ms) and the rows beneath it do not move
with it. **Half of this story is the second clause**, so the reasoning is here rather than only in the
ticket. Nothing in TypeScript changed: a token, three CSS rules, and a media query.

#### Why it is a plain transition, and what that cost

The usual accordion blocker is that **`height: auto` is not animatable**, which is what pushes
implementations into JS measurement, `max-height` guesswork, or a FLIP library. ARCH-298 declared the
band's height so the virtualizer could position rows without measuring it — and a declared height is
also a transitionable one. `0 → 120px` needs no measurement anywhere.

⚠️ **The price was the `min-height` off virtualization.** An un-virtualized band used to grow to
arbitrary content, and that cannot animate: a consumer's template un-gates its content in the same
frame the class flips, so the band jumps to content height whatever a `min-height` is doing. Both
regimes therefore take a definite `height` and taller content scrolls in both — which is what a
window already did. It is a real reversal of an ARCH-298 decision, and it pays for itself twice: the
regimes now agree, which retires the trap ARCH-299 had to write down about percentage children.

**Why giving up the growth was safe, which is the half worth stating.** Losing an affordance is
normally where a convergence goes wrong, and this one does not, for three reasons that hold
together rather than separately. The overflowing content is **reachable, not lost** — the band
scrolls, so nothing is hidden without a way to get at it. The regime it converged *onto* is the one
a window already had, so the change is confined to un-virtualized tables and no consumer's windowed
table moved. And the failure mode it inherits is ARCH-298's **honest-and-visible** one: content that
does not fit is seen not to fit, rather than silently overlapping the row beneath — which is the
failure the declared height exists to prevent, and the reason the height is declared rather than
measured. A `min-height` is the *unsafe* shape here even before the animation argument, because off
virtualization it made the two regimes disagree about what a band's height means, and ARCH-299 had
to write a trap down about exactly that. Taking the growth back is ARCH-303, and it is gated on the
platform rather than on appetite — see below.

⚠️ **It CLIPS, it does not squash**, and `height` + `overflow` is the only mechanism that does. The
content keeps its own height inside a shorter box, so a `<nge-chart>` in the band is laid out once
and progressively revealed. `grid-template-rows: 0fr → 1fr` — the animate-to-auto trick, and the one
way to keep the growth affordance — was **rejected for exactly this**: it stretches the item into the
collapsing track, which for a chart is thrash rather than motion, and charts collapse in a zero-height
parent. `interpolate-size: allow-keywords` would restore growth-with-animation honestly, and is the
thing to reach for when the platform allows — it is **Baseline limited as of 2026-07-29** and
therefore not usable here yet; the gate and its re-check trigger are recorded below.

⚠️ **The `overflow` flip is delayed by exactly the duration, and it is load-bearing.** ARCH-299's
contract has band content pitched at the declared height, so mid-animation it always exceeds the
growing box: an `overflow: auto` in force from the first frame shows a scrollbar for the whole
duration, and wherever that scrollbar takes layout space it narrows the content box and re-lays out
the chart the clip exists to protect. **Measured rather than theorised** — sweeping the band through
the heights the transition passes and reading the chart back gives an identical box at every height
with `hidden`, and an 8px swing on every frame with `auto`. ⚠️ Do not assume overlay scrollbars save
you: whether one takes layout space depends on the platform *and* the user's "show scroll bars"
setting, so this reproduces on macOS. `overflow` is discrete, so `transition-behavior: allow-discrete`
with a delay of the full duration flips it at the end instead of the midpoint.

#### The band animates in the direction where the space already exists

Off virtualization it animates **both** ways and the rows beneath follow it smoothly — free from
normal flow, no code involved. In a window it animates **open only**, and the close is suppressed by
`.nge-table__body--virtualized .nge-table__row-detail { transition: none }`.

⚠️ That is not a shortcut. A virtualized row is `position: absolute` at the running total of the sizes
the virtualizer was given, so on collapse the row beneath takes its closed `top` in ONE frame while an
animating band is still at full height — and rows are `background: transparent` by default, so the
closing band would go on painting through the row that has already moved over it. A smear, not a
collapse. Opening has the opposite shape: the rows make the space in one frame and the band grows into
it. Making the close animate means holding the row's declared size until the animation ends, which
puts the geometry and the state out of agreement for the duration — a much larger change than it
looks. ARCH-302 took that question and declined it; see below.

The rule is written on the CLOSED selector because a transition is chosen from the style the element
is moving **to**.

#### The close under virtualization: evaluated and declined (ARCH-302)

**The `transition: none` above is a decision, not an omission.** ARCH-302 asked whether the close can
animate in a window too, and the answer is no. Two measurements settle it, both taken in a browser
because neither is visible to jsdom.

**1. Every pixel the band still has is a pixel it paints through the row beneath.** With the row
collapsed — so the virtualizer has already placed the row beneath at its closed `top` — sweeping the
band through the heights a closing transition passes, on Example 9's two tables side by side:

| band height | overlap, virtualized | overlap, normal flow |
| --- | --- | --- |
| 140px | 141px | 0px |
| 105px | 106px | 0px |
| 70px | 71px | 0px |
| 35px | 36px | 0px |
| 0px | 1px | 0px |

Overlap is the band's height plus the 1px row border, exactly, at every step. In flow it is zero at
every step, because the rows beneath reflow to whatever height the band has. That is the asymmetry
above as a number rather than an assertion.

**2. ⚠️ The mechanism that would end the hold is the one the escapes remove.** A fix has to keep the
row's declared size at `rowHeight + rowDetailHeight` until the band finishes collapsing, and
something has to decide when that is. The only DOM-native answer is `transitionend` — and a
suppressed transition is never *created*, so it never fires:

| `transition` | transitions created |
| --- | --- |
| `height 1s ease` | 1 |
| `height 0s ease` | 0 |
| `height 0ms ease` | 0 |
| `none` | 0 |

Both escapes this library already ships land in the zero row: `prefers-reduced-motion: reduce`
applies `transition: none`, and `--nge-table-row-detail-duration: 0ms` is the `0ms` case. So a hold
keyed to `transitionend` never drains **for exactly the two users who asked for no motion**, and the
row stays budgeted one band taller than it renders — permanently, silently, and looking like success.
That is expanded rows overlapping their neighbours, the failure ARCH-298's declared height exists to
prevent. Draining it anyway means the store reading `matchMedia` and `getComputedStyle` to learn what
the CSS already decided, which is TypeScript duplicating a number kept only in CSS — and the duration
is kept only in CSS (`styles/_table-tokens.scss`, never `NGE_TABLE_DEFAULTS`) precisely so it cannot
drift. A row that scrolls out of the window mid-collapse has its element destroyed and fires nothing
at all, so the same leak is reachable with no setting changed.

**Two alternatives that avoid the geometry hold, and why neither works:**

- **An opaque row.** Give rows a solid background and the row that moved up hides the collapsing
  band. It removes the smear but not the snap — the cover arrives in the same frame, so the animation
  runs invisibly underneath it. It also spends the transparent-row default that zebra striping is
  layered over.
- **A ghost band**, an out-of-flow copy left painting at the old coordinates. To avoid smearing it has
  to paint *over* the rows that already moved up, so the gesture reads as the band sliding across the
  content beneath it rather than closing. It also re-instantiates the consumer's band template —
  for ARCH-299's case a second `<nge-chart>` built to be thrown away — and it keeps the same
  lifetime problem while adding a stacking context.

**What would change the answer**, so this is a dated decision rather than a verdict: a virtualizer
that accepts a transient per-row size override with a lifetime of its own, which would leave the
library nothing to hold. `interpolate-size: allow-keywords` (ARCH-303) would **not** — it restores
growth-to-content, and this is about the rows beneath.

#### The growth affordance: blocked, not declined (ARCH-303)

**Read this against the section above, because the two outcomes look alike and are not.** ARCH-302 is
a *decision*: the close will not animate under virtualization, and what would change the answer is a
different virtualizer. ARCH-303 is a *date*: growth-to-content off virtualization is wanted, the
mechanism is known and sound, and the only thing missing is browser support. Nothing about it needs
re-deciding when the platform moves — it needs re-checking.

**The mechanism, so it is not re-derived.** `interpolate-size: allow-keywords` makes `height: auto`
interpolable, which is precisely the second endpoint a transition needs and the one the un-virtualized
`min-height` never had. With it the open band off virtualization becomes `height: auto` +
`min-height: var(--nge-table-row-detail-height)` and still animates, scoped to the band rather than
declared at `:root`. **The windowed regime would not move at all** — the virtualizer is told the row
is `rowHeight + rowDetailHeight` tall and the DOM has to agree with it, so a definite height there is
not a limitation to be lifted. ARCH-299's contract (band content declaring
`height: var(--nge-table-row-detail-height)` on its own root) is untouched either way; this only
ever concerned content that declares no height.

**The support state, checked 2026-07-29.** Baseline **limited** — short of *widely available*, and
short of *newly* available too:

| Source | Result |
| --- | --- |
| `api.webstatus.dev/v1/features/interpolate-size` | `baseline.status: "limited"`, no `low_date`, no `high_date` |
| MDN browser-compat-data (`css/properties/interpolate-size.json`, `main`) | Chrome 129 · Edge mirror · **Firefox `false`** · **Safari `false`** · experimental |
| caniuse `mdn-css_properties_interpolate-size_allow-keywords` | Chromium only — Chrome/Edge 129+, Opera 115+, Samsung Internet 28+ |

Two engines of the Baseline core set have not shipped it at all (Firefox `bugzil.la/1945962`, WebKit
`webkit.org/b/295132`), and *widely available* is **newly available + 30 months**. So the earliest the
gate could open is roughly thirty months after the later of those two bugs closes — 2029 on today's
information, and no sooner.

⚠️ **`@supports` is refused, and this is the load-bearing part.** Progressive enhancement is the
reflex for a CSS feature with partial support, and it is the wrong reflex here: this feature decides a
**layout contract**, not a decoration. Behind an `@supports` fork the same table with the same data
grows its band on one engine and scrolls it on another — which is the regime split ARCH-300 just
retired, re-introduced along a worse axis, because a consumer can at least see which regime they
asked for and cannot see which engine a user brought. The convergence's second dividend was that the
two regimes finally agree. Ship this unconditionally or not at all.

**Re-check trigger**, so the next check is cheap: both tracking bugs closed *and* thirty months
elapsed since the later ship. Until then the definite height off virtualization stays, and the story
is re-minted as a fresh ticket rather than left open — see ARCH-239's "Later — not yet ticketed" list.

#### Why the rows beneath do not animate — and why GSAP is not the answer

1. ⚠️ **`transform: translateY` is banned in this library** (ARCH-245): it creates a stacking context
   that breaks the sticky pinned lanes. **This is what rules GSAP out**, and the reasoning is worth
   stating precisely because the answer looks like a library choice and is not. GSAP's FLIP plugin —
   the standard tool for exactly this problem — animates by applying transforms. The constraint is
   *no transforms*, not *sequencing is hard*, and GSAP only solves the latter. It would land on the
   same wall as a hand-rolled version, having added a runtime dependency no `libs/shared/*` currently
   carries at runtime.
2. **`top` is not compositor-friendly.** Transitioning it means layout on every rendered row every
   frame — roughly thirty of them — against the budget ARCH-289 froze.
3. ⚠️ **A blanket `transition: top` smears every re-order.** Rows are tracked by id
   (`@for (rendered of store.renderedRows(); track rendered.row.id)`), so a row entering the window is
   a *new* element rather than a recycled one and takes its first `top` without animating — that much
   is fine. What is not: an element that persists across a **sort or filter** gets a new `top` along
   with every other row, so the whole table would slide on every re-order. Gating the transition to
   the expand moment alone is possible and leaves a sort landing mid-animation looking broken.

**So: the band animates, the rows jump.** That is also what MUI's detail panel does, and it is the
honest shape rather than a compromise to apologise for. Reopening it means reopening ARCH-245's
transform ban first, which is an epic-level decision.

#### Reduced motion — the library's first, so it is the pattern

`@media (prefers-reduced-motion: reduce)` sits last in `nge-table.component.scss` and switches off
the band *and* the chevron together. Two things to carry forward:

- **Anything animated later joins that block on the day it lands.** A reduced-motion rule that covered
  the new animation and skipped one already in the file would be a worse precedent than extra
  selectors, which is why ARCH-298's chevron is listed there rather than left to its own story.
- ⚠️ **`transition: none`, never a zeroed duration token.** A consumer can set
  `--nge-table-row-detail-duration` inline on the host, and an inline custom property outranks
  anything a media query says about it — so the accessibility setting would lose to a theme. A
  declaration on the same element cannot be beaten that way. The token's `0ms` escape is the
  consumer-facing half of the same switch, and the two are deliberately independent: either alone
  stops the band moving.

The block is last in the file because every selector in it ties on specificity with the rule it
overrides, so source order is what settles it.

#### What it costs the scroll: nothing, and that is checkable

The whole feature is CSS, so there is no engine surface for it to cost anything through, and a
transition only runs when the property changes — never during a scroll. ARCH-289's baseline was re-run
against it anyway, because "should not move" and "did not move" are different claims: p95 median
**17.4ms** over 2 runs (0.6% spread), worst **17.7ms**, **0 dropped**, 714 rows built — all inside the
band recorded on 2026-07-28 (17ms / 17.6ms / 0 / 714).

### The showcase table (ARCH-304)

One `<nge-table>` with every shipped feature switched on at once, over the 10,000-row fixture,
virtualized — `stories/showcase/showcase-demo-table.component.*` plus its three facets
(`stories/showcase/{interaction,usage,theming}`, titled `Table/NgeTable/Showcase/<Facet>`) and a
fourth, `stories/performance/showcase/interaction`
(`Table/NgeTable/Performance/Showcase/Interaction`), reusing `runNgeScrollBenchmark`. No new
mechanism ships here — every feature already existed in isolation and several in pairs, and none
had ever shared one table. That is what this story is for: a composition test that can fail, with
the demo as only its visible half. The reasoning is in the guide (`docs/architecture/table.md` §
The showcase table). What composing all of them settled:

⚠️ **This story DOES modify core, and the distinction matters when reading it as gate evidence.**
The *composition* needed no core edit — every seam absorbed the full feature set as designed, which
is the result § below records. What needed one was a pair of **gesture gaps in ARCH-269 / ARCH-270
that only a person driving the composed table would find**: neither a lone selected cell nor a
selected column could be deselected. Three files under `src/lib/range/` changed for that (§ Plain-click
deselect below). So the honest reading is **composition clean, gestures not** — and quoting a bare
"zero core files" for ARCH-304, the way ARCH-251's result can be quoted, would be wrong.

- **The three `cell-overlay` claimants — highlighting, the range, the fill handle — share ONE
  wrapper template and compose with no core edit.** Verified in the browser on the 10,000-row
  showcase: 143 rendered cells each carry all three components. At rest `<nge-highlight-overlay>`
  and `<nge-range-overlay>` are `display: none` and `<nge-fill-handle>`'s host is
  `display: contents`; none declares a `z-index`, so all three are zero-sized with no stacking
  contest, and `elementFromPoint` at a cell's centre lands on the **cell** — exactly what
  `NgeRangeBridge`'s delegated hit-test against the stamped `data-nge-range-cell` needs. ARCH-271
  recorded the slot resolving to one template per column plus a shared fallback for **two**
  claimants; this is the first table to put a third one in it, and the registry did not need to
  change to hold it.
- **Six pointerdown claimants — select the row, start a cell range, toggle a highlight, activate an
  editor, grab the fill handle, hit the expansion toggle — inherit the guard shape unchanged.** Each
  was designed against a subset of the others, never against all six. `NGE_INTERACTIVE_SELECTOR`
  stays roles-plus-tags-plus-`data-nge-interactive`; `[tabindex]` is still never added, because it
  would resolve every cell in a selectable table to the row and kill cell dragging table-wide;
  ARCH-268's `shiftKey`-gated `preventDefault` on a row's `mousedown` stays gated, so a click still
  lands in an `<input>`. ⚠️ **Arbitration among the six is NOT verified by this story — do not read
  the unchanged guard as a passing test.** It needs a foregrounded, trusted pointer session; see §
  The verification limits below.
- **`Escape` clears both addons — both keep `clearOnEscape: true`.** One `Escape` puts everything
  down, which is what a user means by pressing it with nothing else focused. An active edit is
  unaffected regardless: ARCH-292 contains `Escape` at the cell, so neither document-level listener
  ever sees a keystroke an editor is still handling. The per-table opt-out ARCH-250 / ARCH-269 both
  carry exists for *several tables on one page*; a single table with two addons is not that case,
  and this story did not need to reach for it.
- **cmd/ctrl-`A` means all CELLS — `selectAllOnModifierA: true`.** There is no code collision: row
  selection never claims the key, and the range scopes its own select-all by engagement, so the two
  cannot fire on the same press. The ambiguity is conceptual, not mechanical, and it resolves by what
  each affordance already has: rows keep the header's select-all checkbox, a visible and discoverable
  route to "every row"; the cell range has no other gesture that means "everything", so the key goes
  to the one that would otherwise have none.
- **Row height 96px, `stepPx` 288 for the performance story.** 96px is what lets a chart cell render
  at all (`nge-cell-shell.component.scss:25`); 288 = 3 × 96 keeps `expectedRowsBuilt` an exact
  integer — `(120 − 1) × 3 = 357`, the same discipline `Performance/Chart Cells` established. ⚠️
  **The showcase's scroll figure is therefore comparable to `Performance/Chart Cells` and NOT to the
  40px `Performance/Baseline` figure** — the baseline builds 714 rows over the same 120 frames,
  nearly double. Verified in the browser: computed cell height 96px, `--nge-table-row-height: 96px`
  on the host, viewport `scrollHeight` ≈ 10,000 × 96 plus the header.
- **Both marking addons are ALWAYS provided; only the config-gated capabilities are controls.**
  `provideNgeCellHighlighting()` / `provideNgeCellRange()` sit in
  `NgeTableShowcaseDemoComponent`'s own `providers`, construction-time and therefore fixed — so
  addon *presence* cannot be a Storybook argType, and only `enableRowSelection`,
  `enableVirtualization`, `enableStriping`, `enableRowExpansion` and the rest of `NgeTableConfig`'s
  flags are exposed as one. The rejected alternative was a control that recreates the component to
  add or drop an addon, which would reset every other control's state on a toggle nobody meant to
  touch the rest of — the wrong price for one addon changing.
- **A chart column exports `"N points"`, reusing `chart-cells/usage`'s existing answer rather than
  minting a second.** `meta.ngeExport.format: value => Array.isArray(value) ? \`${value.length}
  points\` : ''`, plus `enableSorting: false` (ordering a `number[]` answers no question a user
  asked) and `meta.ngeFill.enabled: false` (a series is a fine fill source and a meaningless fill
  target). The decision worth keeping is the **reuse**: two stories independently answering "what
  does an array-valued column export" differently is exactly the drift the shared fixture exists to
  prevent, and the showcase is the first table carrying both stories' columns at once.
- **The detail band carries TWO charts, the pair `stories/row-detail-content` established** — a
  monotone line of the row's twelve numbers, and a scatter of the same series against itself at lags
  1/2/3, each point `(series[i], series[i + lag])` with both axes pinned to the fixture's own
  `[0, 100]` bound so one row stays comparable to the next. One plot never makes the band's point:
  the band is the only surface as wide as the table, and two side-by-side columns are what
  demonstrate that rather than assert it. Both are pure functions of the row and memoised in their
  own `WeakMap`s keyed by the **row object** — the ARCH-291 / ARCH-299 rule inherited, not
  re-decided. `.detail-band` is `flex-direction: row` with `.detail-band__chart { flex: 1 1 0;
  min-width: 0 }`, and the `min-width` is load-bearing: a flex item's automatic minimum size is its
  content and an SVG's is not small, so without it the two refuse to halve. Verified in the browser
  with a row open: equal 788px columns inside a 260px band, and real marks at 786×214 and 786×158
  read through `.nge-chart-container.shadowRoot` — ⚠️ a light-DOM `svg` query returns the tooltip's
  0×0 arrow instead and reads as a collapsed chart (ARCH-291's probe trap, still live).

⚠️ **THE FINDING — pinning strands the injected control columns, and it is the composition defect
this story existed to produce.** `applyInjectedColumnOrder` (ARCH-298) puts expansion then
selection at the front of the **column order**; pinning is a separate axis resolved afterwards, and
the two know nothing about each other. Pin any data column left with expansion or selection switched
on, and the row's **own** chevron and checkbox land in the scrolling **centre** lane while a data
column stays sticky — exactly backwards, and silent: the table renders perfectly, every control is
present, and it becomes unreachable only once a user scrolls right. **No core edit was needed.**
`NGE_TABLE_EXPANSION_COLUMN_ID` / `NGE_TABLE_SELECTION_COLUMN_ID` are already reachable from the
public barrel (`@nge/table` → `./lib/nge-table` → `./store`), so a host names them in its
own `columnPinning.left` — exactly what
`stories/showcase/interaction/showcase-interaction-stories.component.ts` does:
`columnPinning.left: [NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID, 'name']`.
Verified in the browser after the fix: pinned-left holds expansion, selection, `name`, in that
order. **Whether the library should do this itself is a live question worth naming rather than
answering** — a host having to know the library's own internal column ids to keep its own checkbox
on screen is a seam worth revisiting — but that is not this story's to change under the epic's gate
discipline. The rule to carry forward: **any table combining pinning with selection or expansion
must pin the injected columns explicitly, every time.**

⚠️ **THE SECOND FINDING — a theming story's unthemed side must RESTATE the literal defaults, and
`--nge-table-*` is now exposed to this exactly as `--nge-chart-*` was.** The showcase's
light-vs-dark section put `.theme-dark` (fifteen tokens declared) beside a column that declared
none, on the assumption that declaring nothing yields the library's defaults. It does not.
Storybook's theme toolbar puts a domain theme class on **`<body>`** — `dlc-professional-dark` when this was
measured — and all six of those bridge `--nge-table-*` (ARCH-277), so the undeclared column
inherited the bridge and resolved `--nge-table-surface: #090b0d` under a heading reading "Default
(light)". Both halves rendered dark and the section demonstrated the opposite of its claim, with
nothing logged. The fix is an explicit `.theme-light` restating the fourteen values `.theme-dark`
sets; re-verified with `dlc-professional-dark` still on `<body>`, the two columns now resolve `#ffffff` against
`#16161a`.

⚠️ **Found by reading computed styles off the rendered tables, not by looking at the page** — both
columns looked plausibly "themed", so a visual check passes. Assert on the resolved token.

This is the trap § Rich content in a row-detail band records for `--nge-chart-*`, and the entry
there frames it as a charts-token quirk. **It is a property of the toolbar plus any bridged family**,
and the table's own tokens have been bridged in all six themes since ARCH-277 — so the rule is
general: *a theming section contrasting unthemed against themed must write the unthemed values out
by hand, whichever family it is about.*

⚠️ **Plain-click deselect — the core edit this story made, and why a composed table is what
surfaced it.** Neither a lone selected cell nor a selected column could be put down again by the
gesture that selected it. Both were reachable only by `Escape` or by selecting something else, and
in isolation neither reads as missing: a feature story selects, demonstrates, and moves on. It is
someone *using* the table who tries to undo a click.

- **A cell.** `startNgeRange` short-circuits when the pressed cell is already the whole selection —
  a deliberate identity guard, so a repeat click wrote nothing. `clearNgeCellIfSole` now clears in
  that one case. Only that case: with a block selected, a plain click inside it already collapses the
  block to that cell, and widening the clear to any covered cell would make a click inside a block
  ambiguous between re-anchoring and clearing.
- **A column.** `toggleNgeColumnRange` already deselected correctly and was wired to cmd/ctrl only;
  the plain path replaced unconditionally. `selectOrClearNgeColumnRange` clears when that column is
  already the whole selection and replaces otherwise, so a plain click still means "just this".
- ⚠️ **The clear happens on RELEASE, and the candidate is armed from the state BEFORE the press.**
  Both halves are load-bearing and each was found by a failing spec rather than by reasoning.
  Release, because the press may be a drag's first frame — clearing at `pointerdown` leaves the drag
  nothing to extend and `extendTo` silently re-anchors at whichever cell the pointer reached first.
  Before-the-press, because `startNgeRange` makes the pressed cell the sole selection either way, so
  a release-time test cannot tell *already alone* from *just became alone* — **a first click would
  select and then instantly clear itself, selecting nothing.** `nge-cell-range.spec.ts`'s
  entry-point agreement block caught exactly that.
- **`isNgeCellSoleSelection` is allowed to be a pre-read**, which the ARCH-269 finding otherwise
  forbids, and the asymmetry is the reason: it arms a *gesture flag*, while the write still re-decides
  inside `clearNgeCellIfSole`'s own updater. A stale answer therefore costs a missed clear and can
  never produce a wrong one.
- ⚠️ **`typecheck` caught a missing import that all 1,034 Jest specs passed straight through.** Jest
  transpiles rather than type-checks — the standing reason the target is not optional, demonstrated
  again here.

**The convention this story leaves behind: a new feature story either adds itself to the showcase,
or records here why it does not.** A measurement control (`always-chart`, `withEditors: false`) or a
feature that genuinely conflicts with something already on are both legitimate reasons to stay off;
"nobody got to it yet" is not. Without the rule the showcase rots into a snapshot of the library as
it stood on 2026-07-29; with it, the composition test re-runs on every future feature rather than
only on this one's.

**The verification limits, stated plainly rather than implied.** What the browser confirmed: the
three-overlay composition above and their inertness at rest; the hit-test landing on the cell; the
three-lane structure with sticky pinning on both edges, and the pinning fix; 96px rows and
10,000-row virtualization (`scrollHeight` 960,045); 13 charts and 0 shells at rest; 13 checkboxes,
13 comboboxes, 11 column handles, 9 resize grips; `Trend`'s `aria-sort` reading `null`
(`enableSorting: false` honoured); zero console errors; all four stories registered under their
titles. ⚠️ **What it could NOT confirm, and why: gesture arbitration across the six pointerdown
claimants, `Escape` and cmd-`A` with every addon live, and the ARCH-281 re-sort regression check all
need a real, trusted, foregrounded pointer or keyboard event.** An automation tab is
`visibilityState: 'hidden'`, which suspends `requestAnimationFrame` — measured here as **0** rAF
frames in 400ms — so zoneless change detection never flushes; a scripted click on the `Status`
header left `aria-sort` at `none` with the row order unchanged, which is not evidence the sort is
broken, only that automation cannot exercise it. This generalises ARCH-291's and ARCH-296's recorded
limit to a third story rather than adding a chart-cells or an editor quirk, and a human in a
foregrounded tab still owes this table the arbitration check, the two document-level keys, and the
re-sort verification before those AC lines are more than "not yet contradicted."

The Storybook dev-server log's own blind spot for template diagnostics — found while planning this
verification, not a showcase composition finding — is corrected in § Repo-specific gotchas below
rather than restated here.

### The store's composition root (ARCH-297)

`NgeTableStore` is **eight** `signalStore` slots: `withState`, then seven
`withFeature(store => withNgeTable*(store))` groups living in
`src/lib/nge-table/store/features/with-nge-table-<concern>.ts`. That is the workspace's prescribed
shape (`docs/ai-instructions/reference/multi-component-signal-store.instructions.md`) and the same
one `NgeCalendarStore` uses.

#### Where a new concern goes — ask which layer owns it

> New state belonging to a table **feature** goes on the engine as a `TableFeature` (extension axis
> 1, unbounded, published through `NgeTableState`). New state describing how Angular **paints** the
> table — templates, geometry, the virtual window — belongs in the store. Ask which one a new concern
> is before adding a slot.

⚠️ **TanStack's unbounded `_features` array is NOT the answer to a full store, and the distinction is
the whole reason this story was a regrouping rather than a migration.** `_features` is unbounded
extensibility for *engine* concerns; the ceiling is an `@ngrx/signals` overload limit on the *Angular
adapter*. What the store holds is a `TemplateRef` registry, DOM geometry, the virtualization window,
a11y counts, and the scratch `editing` target that is deliberately kept OUT of the published
`NgeTableState` (ARCH-292) — moving that one to a `TableFeature` would put it in the persistable
state it was excluded from, which is a regression rather than a migration. The store is large because
painting a virtualized, pinned, themed, slot-driven table in Angular is genuinely a lot of
derivation.

#### The order is the dependency graph

Each feature takes a `…Deps` interface extending `NgeTableBaseStore` (`nge-table-store.types.ts`)
with what an **earlier** feature contributed, so the root's sequence is compiler-checked rather than
remembered:

| Feature | Needs | Contributes |
| --- | --- | --- |
| `withNgeTableEngine` | state only | `table`, `applyTableState`, `applyTableStateChange`, `emitTableEvent`, the six setters |
| `withNgeTableLanes` | `table` | header/footer lanes, lane widths, aria counts, both template registries, `slotRegistry`, `laneCellsFor` |
| `withNgeTableRows` | `table`, `headerRows` | `rowVirtualizer`, `renderedRows`, `scrollSettled`, row geometry, `stripingEnabled` |
| `withNgeTableColumns` | `table`, `applyTableStateChange`, `emitTableEvent` | resize gestures, `toggleColumnSort` |
| `withNgeTableExpansion` | `table` | expansion state + gestures + the two expand slot contexts |
| `withNgeTableSlots` | the registries, `renderedRows`, `scrollSettled`, `emitTableEvent`, `toggleRowExpansion` | slot lookups, cell contexts, `editEnabled`, editing, click events |
| `withNgeTableSelection` | `table`, `applyTableStateChange` | selection state + gestures + the two selection slot contexts |

⚠️ **Expansion sits BEFORE slots, and that placement is the ordering rule earning its keep.**
`NgeRowContext` carries a `toggleExpanded` so a `row-detail` band can close itself, and the slots
feature builds that context — so it needs the gesture in hand. Written the other way round,
`toggleRowExpansion` would be missing from the slots feature's `store` argument and the failure would
arrive at **click time**, not compile time (the trap ARCH-278 documented).

#### Two mechanics that make this work, and one number

- ⚠️ **`signalStoreFeature` has its own ceiling, and it is TEN, not fifteen** (`f1 … f10`, both
  overload families). A feature is headroom, not an unlimited bag.
- **Members that read each other are plain `const`s in the feature's factory body**, exposed once at
  the end. That is what dissolved the store's eight `withMethods` blocks: only three of those splits
  were load-bearing, and each was load-bearing only because a later block reached a sibling through
  `store.*` — which a `signalStore` feature's argument cannot carry, since it holds only what
  *previous* features added. As a local binding the same call is ordinary TDZ the compiler checks.
- **`buildTableOptions` lives in its own module** (`nge-table-options.ts`), imported by the engine
  feature and re-exported by the root, so neither has to import the other. It receives a
  `NgeTableStateWriter` — the two writers as a plain object — because the store does not carry them
  yet at the moment the engine instance is built.

#### The guard

`nge-table-store.composition.spec.ts` parses the root with the TypeScript AST and fails at
**ten** of fifteen slots, with the diagnosis and the fix in the failure. ⚠️ Failing *at* the ceiling
would be useless: five slots of margin is what makes the fix a refactor instead of a rescue.

A correction to the recorded lore while you are here: on TypeScript 6.0.3 a sixteenth feature *does*
report `TS2769: No overload matches this call` in `nge-table-store.ts` — the store file is not
silent the way ARCH-292 recorded. The ~40 downstream errors in `nge-table.component.ts` still arrive
alongside it and still dominate the output, so the diagnosis is easier than the lore says but not
obvious. The guard trips well before either.

### The shared fixture — `@nge/table/testing` (ARCH-241)

**Every story and spec draws its rows from here. Never inline a row array.** A chart
story is one config object; a table story needs data, and the virtualization story needs
10,000 rows. One generator is what keeps the column set consistent across the epic.

```ts
import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS, NGE_TABLE_FIXTURE_SIZES }
  from '@nge/table/testing';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });
```

- **Secondary entry point, deliberately.** The fixture is a public API of the *library*,
  not of the *product* — keeping a 10k-row generator out of `@nge/table` stops
  demo data being one autocomplete away in application code. The alias
  (`tsconfig.base.json`) points into `src/testing/`, matching the
  `@nge/store/service-worker` precedent, so it is still covered by this project's
  lint and type-check with no extra config.
- **Deterministic.** Same seed ⇒ byte-identical rows. `createNgeTableFixtureRandom`
  (mulberry32) is the only source of randomness — **never `Math.random()`** — and dates
  are offset from the frozen `NGE_TABLE_FIXTURE_EPOCH_MS`, **never `new Date()` /
  `Date.now()`**. A spec moves the system clock twelve years to prove it.
- **Additive only.** Never repurpose or remove a field — `nge-table-fixture.spec.ts`
  asserts the baseline keys as a *subset*, so additions pass and removals/renames fail.
- ⚠️ **Adding a field changes every generated value, not just the new one.** All fields
  draw from one sequential PRNG stream, and `perfectionist/sort-objects` inserts the new
  key alphabetically — so draws shift downstream. The row *shape* contract holds and
  nothing breaks, but any golden-value or image snapshot taken against the fixture will
  need re-baselining. Do not add golden-value assertions against fixture data. Every
  consumer today reads values as `rows[N].field`, which is the pattern to keep.
- **The rich-cell fields (ARCH-290): `series`, `description`, `imageUrl`.** All three are on
  the *row* and **none is in `NGE_TABLE_FIXTURE_COLUMNS`** — the story that renders one
  declares its own column, as ARCH-291 does for the chart. That is deliberate on two
  counts: a column nothing renders is the inert-but-present defect ARCH-277 rejected, and
  the frozen ARCH-289 baseline story renders the shared column set wholesale, so a column
  added here silently changes what the epic's reference measurement measures. Adding a
  column later is cheap and re-rolls nothing (it costs the header assertions and
  `allColumnIds` in `nge-csv.spec.ts`); adding a *field* is what re-rolls, which is why all
  three landed in one story.
- ⚠️ **`series` has a fixed length and a shared `[0, 100]` domain.** A per-row length or
  range would make an in-cell chart's height and axis domain vary row to row, so two cells
  in one column could not be read against each other. It is a walk rather than independent
  draws, so a sparkline shows a trend instead of noise.
- ⚠️ **Every generated string is plain ASCII with no quote and no newline**, and
  `description` also has no comma. `nge-csv.spec.ts` builds its pure-tier tests on exactly
  this — it exercises quoting against hand-built export shapes *because* no fixture value
  forces it — so a value that did would change what the CSV-over-a-real-table tests
  measure. `nge-table-fixture.spec.ts` now asserts it rather than leaving it as a comment
  one field addition away from being false. (`imageUrl` carries the comma of its own `data:`
  scheme; harmless, since CSV quotes it and no column exposes it.)
- **Large preset: ~6 ms cold, up ~2.4× from ~2.5 ms before the three fields** (first call in
  a fresh V8, M5 Max / node 24); 6.1 MB serialized against 2.3 MB. Re-measure rather than
  trust this whenever the row grows again — and re-run ARCH-289's baseline, or a later story
  reads the fixture's cost as its own regression.
- Owners come from a fixed 12-entry roster so rows *share* owners — a per-row owner would
  make every group a group of one and render grouping stories meaningless.
- **The `amount` and `createdAt` columns declare `meta.ngeExport.format`** (ARCH-248) —
  the two whose exported text should differ from their raw value. Both are pinned to
  `en-US` / ISO rather than the ambient locale, for the same reason the rows are seeded: a
  spec asserting on formatted output has to produce the same bytes on every machine. This
  is on the *columns*, not the row shape, so it does not disturb the PRNG stream above.

### Repo-specific gotchas

- **`@tanstack/*` needs NO `transformIgnorePatterns` widening.** Verified empirically on
  ARCH-240 by importing all three packages in a Jest spec under the generator's default
  `node_modules/(?!.*\.mjs$)`. It works because `table-core` ships a CJS build,
  `angular-virtual` exposes a CJS `main`, and `angular-table` is `.mjs`-only — which that
  pattern's negative lookahead already excepts. ⚠️ A **consuming** library whose
  `transformIgnorePatterns` does *not* except `.mjs` will break on `@tanstack/angular-table`;
  widen it there, not here.
- **Everything TanStack — types *and* values — comes from `@tanstack/angular-table`, never
  from `@tanstack/table-core`.** The adapter is what `package.json` declares; the core is
  only its transitive dependency, so importing it directly is an undeclared dep. The
  adapter re-exports the core wholesale (`export * from '@tanstack/table-core'`), so
  `getCoreRowModel`, `functionalUpdate`, `Table`, `ColumnDef` and friends are all reachable
  through it and are identical.
  ⚠️ **Correction to ARCH-240's note:** value imports are fine now. They *were* impossible
  because `tsconfig.spec.json` resolved with `node10` / `module: commonjs` and the adapter
  ships no CommonJS `main`. ARCH-242 moved that config to `module: preserve` /
  `moduleResolution: bundler` / `isolatedModules` — the shape `shared-charts` already uses
  for its ESM-only d3 dependencies — and raised `target` to `es2022`. The whole library
  depends on this; do not revert it.
- ⚠️ **`shared-table` has no `build` target** (matching `shared-charts`), so lint + test never
  run `tsc` over the source — Jest transpiles rather than type-checks. **Run the `typecheck`
  target**, which covers `tsconfig.lib.json` *and* `tsconfig.spec.json`:
  `npx nx run-many -t lint test typecheck -p shared-table shared-table-addon-conformance`.
  Never invoke `tsc` by hand — the nx target is cached, runs from the root, and is the thing CI
  can gate on. ⚠️ `shared-charts` still has no such target and the same blind spot; it is worth
  the same treatment when someone is in there.
- ⚠️ **A library's `target` does NOT decide its `lib`.** `tsconfig.base.json` pins
  `lib: ["es2020", "dom"]`, and an explicit `lib` overrides the one a `target` implies — so
  `target: es2022` alone leaves `Array.prototype.at` and every other es2022 built-in unresolvable.
  Both table tsconfigs therefore set `lib` explicitly. This is what let 23 type errors accumulate
  unseen before the `typecheck` target existed, among them a `buildTableOptions` test double that
  had never been given the `applyTableState` ARCH-250 added to `NgeTableStateWriter`.
- ⚠️ **`Bin 0 -> N bytes` in a diffstat is a review gap, not a formatting curiosity.** Git
  classifies a file holding a **NUL byte** as binary, so a pull request renders no diff for
  it, `git blame` attributes nothing, and the next edit conflicts as a whole-file choice.
  ARCH-271 shipped `nge-fill-values.ts` this way — a NUL joined a `Map` key, which is
  functionally correct and collision-proof, and 717 specs, lint, and `tsc` all stayed green
  because none of them read bytes. Two defences now, deliberately independent: `.gitattributes`
  sets `*.ts diff`, so git renders a TypeScript file as text **even if** it holds a NUL — the
  review gap closes whether or not the byte is caught — and `src/source-hygiene.spec.ts` fails
  on any NUL under `src/`, so the byte itself does not survive. The fix is always to encode the
  intent without one (there, a nested `Map`). ⚠️ The `diff` attribute is **library-scoped**;
  everywhere else in the repo a `Bin 0 -> N bytes` line in a diffstat still means the reviewer
  saw nothing. Promote it to a root `.gitattributes` if that ever bites twice.
- ⚠️ **`declaration: true` + a signalStore prop typed as an Angular `Signal` breaks the
  type-check** with TS4023/TS4029 ("using name `SIGNAL` … but cannot be named"). Angular
  brands `Signal<T>` with a symbol from an internal chunk that a `.d.ts` cannot reference.
  `createAngularTable` returns `Table<T> & Signal<Table<T>>`, so `NgeTableStore` widens it
  to plain `Table<unknown>` — the proxied `get*` accessors keep all the reactivity, and
  nothing calls `table()`. Any future store prop that surfaces a raw `Signal` needs the
  same treatment.
- **This project lints with `perfectionist/sort-*`** — object literals, interface members,
  and imports must be alphabetical. `npx nx run shared-table:lint --fix` sorts them for
  you; writing them in semantic order first just means a second pass.
- **Test setup is zoneless.** `src/test-setup.ts` uses `setupZonelessTestEnv`. The Nx
  generator emits the deprecated `setupZoneTestEnv` — if you re-scaffold anything here,
  fix it back.
- **Jest is already the workspace generator default — do not delete the `nx.json` entry.**
  Nx 23's *stock* default for a non-buildable Angular ≥21 library is `vitest-analog`, but
  `nx.json` → `generators["@nx/angular:library"].unitTestRunner: "jest"` overrides it
  workspace-wide, so **no `--unitTestRunner` flag is needed** (verified by dry-running the
  generator without it — still emits `jest.config.cts`). The thing to protect is that
  `nx.json` entry; removing it is what would silently scaffold a Vitest library.
- **jsdom cannot exercise scroll geometry, sticky offsets, or drag.** Verify anything
  touching those in a real browser — that is why interaction is the *primary* Storybook
  story for table features, unlike charts.
- **Generate stories with `/create-table-storybook` (ARCH-249) — never hand-author them.**
  Three subdirectories per feature (`stories/<feature>/{interaction,usage,theming}/`), with
  `stories/core/` holding the table-level set and the cross-feature composition examples.
  **Interaction is the primary facet** — unlike charts, nearly everything here is only
  verifiable by driving it. ⚠️ **Theming stories are SCSS, not TypeScript:** there is no
  `config.theme`, so a section is a scoped wrapper class re-declaring `--nge-table-*`. And
  `--nge-table-row-height` / `-header-height` are unreachable from CSS whenever the config
  carries them — `createNgeTableConfig()` always fills them in and `applyGeometry` writes
  them **inline on the host**, where they outrank any class. Only a hand-authored config that
  omits the fields hands them back to the theme.
- **Storybook registration is two files, not one.** `apps/storybook-app/.storybook/main.ts`
  (the story glob) *and* `.storybook/tsconfig.json` (the `include` entry). A glob-only
  registration renders but never type-checks the story components. Both are wildcards over
  `libs/shared/table/src/**`, so a new story directory needs no registration change.
  Since ARCH-246 the story wrappers project `ng-template`s into `<nge-table>`, so their templates
  are the only place the slot **context guards** are exercised against real `let-` bindings —
  `tsc -p tsconfig.lib.json` checks the TypeScript but not the templates, and `shared-table` has no
  build target to run `ngtsc` over them. A projected template missing its `[ngeCellOf]` /
  `[ngeTableSlotOf]` type carrier leaves `TRow` as `unknown`, so `let-cell` / `let-detail` field
  access does not compile — and lint, test, and `tsc` all stay green.
  ⚠️ **Correction (ARCH-304): "Storybook's own compile is that check" is not true of the dev-server
  LOG, and this was falsifiability-tested rather than assumed.** An injected `.ts` source error
  (`const x: number = "s"`) surfaced in the `npm run storybook` log in ~4s —
  `ERROR in <file>:103:7 - error TS2322: …` plus `preview compiled with 1 error`. An injected
  **template** error — a `strictTemplates` violation (`{{ detail.row.thisFieldDoesNotExist }}`) on a
  `let-` binding, with `strictTemplates: true` confirmed on in `apps/storybook-app/tsconfig.json` —
  stayed silent across **482** incremental webpack rebuilds, a full `nx reset` plus cold boot, and an
  explicit `iframe.html` request that returned **200**. A prior session's log corroborates it
  independently: 31 error verdicts, every one naming a `.ts` file with a `TS####` code, not one a
  template. The documented wait-loop (`until … grep -qE "compiled (successfully|with)"`) never
  terminates on success here either, because this launch emits no success verdict at all — a monitor
  greping `ERROR in` has the right polarity for a **source** error and is blind to a template one.
  `tsc` does not run `ngtsc`, lint and Jest do not type-check templates, and the dev-server log
  reports neither a pass nor a fail on one — so during development a story template is checked by
  nothing automated, and the only positive check is loading the story and reading it, and its
  console, by eye.

  ⚠️ **In THIS repo that gap is closed at the workspace level, and the difference matters.** The
  source repo notes that a `build-storybook` target *would* close it; here that target exists
  (`npx nx run storybook-app:build-storybook`) and the port procedure runs it, which makes it the
  one `ngtsc` pass over every story template. Treat a clean `build-storybook` as the real template
  check and the dev-server log as development-time convenience only. The failure it catches in
  practice: a projected template missing its `[ngeCellOf]` / `[ngeTableSlotOf]` type carrier leaves
  `TRow` as `unknown`, so `let-cell` / `let-detail` field access does not compile — while lint,
  test and `tsc` all stay green.
- **jsdom does not lay out.** `nge-table.component.spec.ts` can assert row counts, cell
  text, emitted state, and `aria-sort`, but never a width, an offset, or a sticky position.
- Test: `npx nx run shared-table:test` · Lint: `npx nx run shared-table:lint`
