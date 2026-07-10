# Charts — `@gigasoftware/charts`

Unified, composable D3 chart system: one `<giga-chart>` component driven by a plain
`GigaChartConfig`, with pluggable **layers** (bar, line, bullet, grouped-bar,
diverging-bar, scatter) that share a base layout, axes, tooltip, and legend. Visual
styling is theme-agnostic via the `--chart-*` CSS custom-property contract — never
`--mat-sys-*`.

- **Library**: `libs/shared/charts` · alias `@gigasoftware/charts` · project `shared-charts`
- **Selector**: `giga-chart` (`ViewEncapsulation.None`, `OnPush`, `host: { class: 'giga-chart' }`)
- **Test / Lint**: `npx nx run shared-charts:test` · `npx nx run shared-charts:lint`

> **ngx-experiments (`@nge`):** the ported library is `@nge/charts` with the `nge-chart`
> selector. Architecture, config shape, and the `--chart-*` contract are identical — read
> giga-→nge- for selectors/aliases. Per-repo theming differences are in each repo's
> `libs/shared/charts/AGENTS.md`.

---

## Architecture

The system is **config-driven, not content-projected**. You build a `GigaChartConfig`
(usually via a preset factory) and hand it to a single component:

```
GigaChartConfig ── input ──▶ <giga-chart [config]>
  ├─ base    (margins, axes visibility/labels, tick formatting)
  ├─ layers[] (one entry per chart type; each carries its own data + renderer fn)
  └─ legend  (optional)
```

```
                       renderChart()  (giga-chart.renderer.ts)
                              │  computes shared dimensions + x/y scales from `base`
              ┌───────────────┼───────────────┐
              ▼               ▼                ▼
       renderBarLayer   renderLineLayer   renderBulletLayer  … (pure D3 fns, layers/*)
        each receives a shared context: { bounds, data, scales, dimensions,
        theme[layer.type], tooltipConfig, tooltipHandlers }
```

Key structural facts (all in `src/lib/`):

- **Entry component** `giga-chart/giga-chart.component.ts` — takes one required signal
  input `config`, debounces config + resize into a single `render()` (~16 ms), and owns
  the tooltip + legend. It does **not** know about individual chart types.
- **Layers carry their own renderer.** A layer definition is
  `{ type, data, renderer, …layerOptions, tooltip? }`. The registry
  (`layers/layer-registry.ts`) simply iterates `config.layers` and calls
  `layer.renderer(context)` — presets wire `renderer: renderBarLayer` etc. Adding a chart
  type does not require editing a central switch.
- **Base layout** `core/base-layout/` — SVG wrapper, bounds group, margins, dimensions,
  shared axes. Created once via `createBaseLayout(root)`.
- **Presets** `presets/*.preset.ts` — convenience factories that return a fully-formed
  `GigaChartConfig` (see table below).
- **Tooltip is generic** `charts-tooltip/` + `core/tooltip/` — layers emit a
  `GigaTooltipEvent`; the component positions the bubble via D3 (bypassing change
  detection) and renders content through the default template or a consumer-supplied
  `#gigaChartTooltip` `ng-template`.
- **Legend** `giga-chart-legend/` — rendered from `config.legend` (position drives a
  row/column layout on the host).

### Shadow-DOM isolation (important)

`GigaChartComponent` attaches a **shadow root** to its `.giga-chart-container` and renders
the SVG inside it, so per-instance chart styles never leak. Consequences:

- A light-DOM probe like `document.querySelector('giga-chart svg')` returns **nothing**
  (or a 0×0 box). **Verify charts visually**, or reach through
  `container.shadowRoot.querySelector('svg')`.
- The injected shadow style is `:host, svg { width: 100%; height: 100% }` — a chart in a
  **zero-height** parent collapses to nothing. Always give `<giga-chart>` an
  explicit-height wrapper (e.g. a fixed `h-64` / `height: 300px` container).

---

## Public API

```html
<giga-chart [config]="config" />
```

```ts
import { createBarChartConfig } from '@gigasoftware/charts';

config = createBarChartConfig({
  data: [{ label: 'A', value: 30 }, { label: 'B', value: 55 }],
  orientation: 'vertical',
  showLabels: true,
  tooltip: { enabled: true },
});
```

### Preset factories

| Preset factory                  | Layer `type`   | Data point            |
| ------------------------------- | -------------- | --------------------- |
| `createBarChartConfig`          | `bar`          | `GigaBarDataPoint`    |
| `createLineChartConfig`         | `line`         | `GigaLineDataPoint`   |
| `createBulletChartConfig`       | `bullet`       | `GigaBulletDataPoint` |
| `createGroupedBarChartConfig`   | `grouped-bar`  | `GigaGroupedBarDataPoint` |
| `createDivergingBarChartConfig` | `diverging-bar`| (see preset)          |
| `createScatterChartConfig`      | `scatter`      | (see preset)          |

Exact option surfaces live in each `presets/*.preset.ts`; config/data types in
`core/config/giga-chart-config.models.ts`. Presets are **not uniform** — e.g. the bar
preset exposes `xAxisTickFormat` / `yAxisTickFormat`, but `createLineChartConfig` does
**not** (scale the values into the data instead of formatting ticks).

### Composition

Multiple layers share one base layout / axes. Build a config and append layers with
`addLayer(config, layer)` (immutable), or author the `layers[]` array directly. `theme` is
matched to each layer by its `type` key (`theme.bar`, `theme.line`, …).

### Custom tooltip

```html
<giga-chart [config]="config">
  <ng-template #gigaChartTooltip let-content>
    <strong>{{ content?.label }}</strong>
    <span>{{ content?.value | currency:'USD':'symbol':'1.0-0' }}</span>
  </ng-template>
</giga-chart>
```

---

## Theming — the `--chart-*` token contract

Charts read a **domain-agnostic** `--chart-*` CSS custom-property contract, defined with
light-mode defaults in `src/lib/styles/_chart-tokens.scss` (forwarded via `_theming.scss`).
The defaults let charts render correctly with **no** theme applied. A domain theme styles
charts by re-declaring the same properties inside its theme **class** selector — class
specificity beats `:root`, so theme values always win. **Never use `--mat-sys-*`.**

| Group   | Tokens                                                                                                                                    | Used for                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Surface | `--chart-surface`, `-surface-variant`, `-surface-container`, `-surface-container-low`, `-surface-container-highest`, `-inverse-surface`, `-inverse-on-surface` | Backgrounds, panels, containers |
| Content | `--chart-on-surface`, `--chart-on-surface-variant`                                                                                        | Labels, axis text, legend text        |
| Border  | `--chart-outline`, `--chart-outline-variant`                                                                                              | Axis lines, grid lines, card outlines |
| Accent  | `--chart-primary`, `-primary-container`, `-on-primary`, `-secondary`, `-secondary-container`, `-tertiary`, `-error`                       | Data series colors, highlights        |

**Series assignment:** `--chart-primary` → series 1 · `--chart-secondary` → series 2 /
median lines · `--chart-tertiary` → series 3 / mean lines · `--chart-error` → error state.

**Values are applied as D3 inline styles**, not CSS classes. Theme objects on the config
(`config.theme` / preset `theme` overrides) resolve to literal color/number strings written
straight onto SVG elements. Because these are D3 `.style()` strings, a raw
`var(--chart-primary)` works only where the browser resolves it in context — passing an
**unresolved** `var()` where D3 expects a concrete color (e.g. a `seriesColors` array
consumed by a scale) fails silently. Use a resolved color, or drive it through the
`--chart-*` token on the element rather than a JS-side `var()` string.

**Adding a token:** add it to `_chart-tokens.scss` with a default + comment, use
`var(--chart-<name>)` in chart SCSS or D3 style strings, then map it in every consuming
theme's chart bridge (per-repo locations are in `libs/shared/charts/AGENTS.md`).

---

## Adding a new chart layer

A layer is a pure D3 render function plus a namespaced theme slice, wired to a preset. Model
a new one on an existing layer under `src/lib/layers/` (each is a self-contained
`render-<name>-layer.ts`) and its `src/lib/presets/*.preset.ts`; generate its stories with
the `create-chart-storybook` skill. The full step-by-step narrative (config interface →
theme + defaults + merge fn → render fn → preset → stories) is preserved in the gigasoftware
repo at `docs-projects/archive/features/chart-architecture/LAYER_IMPLEMENTATION_GUIDE.md` —
accurate for the **layer mechanics**, though its theme defaults predate the `--chart-*`
migration and show `--mat-sys-*`; use `--chart-*`.

Invariants to preserve: `ViewEncapsulation.None` + `OnPush`; theme structure namespaced by
layer `type`; styling via D3 `.style()` (CSS classes for structure/queries only).

---

## Testing under Jest (consumer libs)

Any lib or app that renders `<giga-chart>` (directly or via the design-library barrel) under
Jest needs two shims — jsdom lacks the browser primitives the component uses:

- **`ResizeObserver`** — add a guarded no-op stub in the project's `test-setup.ts`
  (jsdom has no `ResizeObserver`; the component observes its container).
- **d3 v7 is pure ESM** — broaden `transformIgnorePatterns` in the project's
  `jest.config` so `d3-*` packages are transformed.

Do **not** assert chart geometry from the light DOM (shadow-root isolation — see above);
storybook build passing ≠ visually correct. Verify rendered charts in the browser or via
the shadow root.

Story conventions (the 3-subdirectory usage / theming / interaction set) are generated by
the `create-chart-storybook` skill — use it rather than hand-authoring chart stories.

---

## References

- Token contract — `libs/shared/charts/src/lib/styles/_chart-tokens.scss`
- Config / data types — `libs/shared/charts/src/lib/core/config/giga-chart-config.models.ts`
- Theme models / defaults / merge — `libs/shared/charts/src/lib/core/theme/`
- Entry component + renderer — `libs/shared/charts/src/lib/giga-chart/`
- Layer render fns — `libs/shared/charts/src/lib/layers/`
- Presets — `libs/shared/charts/src/lib/presets/`
- Story generator — `.claude/skills/create-chart-storybook/SKILL.md`
- Archived design docs — `docs-projects/archive/features/chart-architecture/`
- Workspace invariants — `docs/ai/CONSTRAINTS.md`
