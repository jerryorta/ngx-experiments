# Shared Charts — Contributor Notes

> **Charts guide**: `docs/architecture/charts.md`
> **Workspace invariants**: `docs/ai/CONSTRAINTS.md` § Shared Library Namespacing

## Shared specifics

- **Holds**: the unified `nge-chart` D3 chart system — one config-driven `<nge-chart>` plus 31
  pluggable layers (area, bar, bullet, bump, chord, distribution, diverging-bar, financial, funnel,
  gauge, grouped-bar, heatmap, histogram, line, lollipop, network, overlay, parallel-coords, pie,
  proportional, radar, radial-bar, sankey, scatter, stacked-bar, sunburst, timeline, tree, treemap,
  waterfall, wordcloud), presets, the generic tooltip and the legend. Architecture, public API and
  the Jest shims consumers need all live in `docs/architecture/charts.md`, which is mirrored from
  gigasoftware **with the namespace already normalized to `nge`** — read it as-is.

- **Naming convention — the whole library is on the `nge` namespace.** Zero bare CSS custom
  properties, every emitted class and selector prefixed, and the TS identity surface prefixed.
  Two namespaces, not one:
  - runtime classes and every component/directive selector → `nge-chart-*` / `nge-<layer>-*`
  - **story-internal classes → `nge-story-*`**, deliberately disjoint. 90 components here use
    `ViewEncapsulation.None`, so a story rule on `.chart-container` would style the internals of
    every chart in the bundle. This is not cosmetic.
  - **Singular `chart`, never plural `charts`** — in directories, filenames, selectors, classes and
    symbols alike. The generic tooltip is `nge-chart-tooltip/`.
  - ⚠️ `/create-chart-storybook` generates story components and therefore encodes this convention.
    Change the convention and change that skill in the same commit, or the next chart type
    reintroduces the old names by the book.

- **`--nge-chart-*` token bridge (repo-specific — the part that isn't in the shared guide).**
  Charts render off the `--nge-chart-*` contract (defaults in `src/lib/styles/_nge-chart-tokens.scss`,
  22 tokens); the `@nge/themes` **dlc personas** re-declare 18 of them per-persona, light + dark.
  Live list: `grep -rl -- '--nge-chart-' libs/*/themes/src`. Current bridge:
  - `libs/shared/themes/src/lib/styles/{home,professional,service-provider}/_dlc-*-{light,dark}.scss`
  - ⚠️ **`--nge-chart-white` / `--nge-chart-black` are ABSOLUTE — never add them to a bridge.** They
    colour marks drawn ON a saturated data fill (on-arc pie labels, in-bar value labels, on-cell
    heatmap text), whose backdrop is the series palette rather than the page surface. Every
    theme-relative token flips and is therefore wrong there, so a bridge that remaps them
    reintroduces the unreadable-label bug. `--nge-chart-label-font-size` /
    `--nge-chart-label-font-weight` sit alongside them as shared typography defaults and are also
    left unbridged here. So the usual "a new token means updating every bridge" rule has exactly
    four exceptions — which is why the bridge is 18 and the contract is 22.

- **Ledger consumes the contract directly.** `libs/ledger/design-library/src/lib/donut-chart/` and
  `libs/ledger/ui/src/lib/overview/overview.store.ts` reference `--nge-chart-*` by name. Renaming a
  token means updating them too, not just the personas.

- Never `--mat-sys-*` — nge has no Angular Material; the `--nge-chart-*` defaults ensure charts
  render with no theme applied.

- ⚠️ **`src/test-setup.ts` is ngx-owned and excluded from the source-repo sync.** It uses
  `setupZonelessTestEnv` (this repo removed `zone.js` outright) where the source repo's is
  zone-based with Firebase polyfills, so overwriting it takes the whole suite down. It also carries
  the guarded `ResizeObserver` no-op stub that `docs/architecture/charts.md` § Testing under Jest
  prescribes — `<nge-chart>` observes its container and jsdom has no `ResizeObserver`, so without it
  every spec that actually mounts the component dies in `ngAfterViewInit`.
- **No `fakeAsync` / `tick` / `waitForAsync` anywhere.** Zoneless means those throw at suite load,
  which reads as a mysterious "test suite failed to run" rather than a test failure. The render
  pipeline debounces on RxJS `debounceTime(16)`, i.e. `setTimeout` — drive it with
  `jest.useFakeTimers()` + `jest.advanceTimersByTime(...)` instead (see `nge-chart.component.spec.ts`).

- **d3 is ESM**, so `jest.config.cts` must keep transforming the d3 family
  (`d3`, `d3-*`, `internmap`, `delaunator`, `robust-predicates`) or the axis/gesture specs fail to
  load. The layer set also depends on `d3-chord`, `d3-sankey`, `d3-voronoi-treemap`, `d3-hierarchy`
  and `d3-regression` as real dependencies — a missing one takes down whole suites at import time.

- Test: `npx nx run shared-charts:test` · Lint: `npx nx run shared-charts:lint`
