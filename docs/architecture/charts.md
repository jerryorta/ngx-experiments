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
  shared axes, and a **clipped `g.giga-chart-layers` group** (clipPath sized to the plot
  area) that all layers render into — marks never spill over axes/margins when zoomed or
  panned; axes stay unclipped siblings. Created once via `createBaseLayout(root)`.
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

### Axis grouping tiers

A second dimension of structure drawn beneath (bottom axis) or beside (left/right axis) the tick
labels — e.g. months tiered under weeks, quarters under months, regions under cities. Set
`base.xAxisGroups` / `base.yAxisGroups` to an `AxisTierConfig[]` (home: `core/axis/`); each array
entry is one stacked tier row, innermost (nearest the axis) first. A tier resolves to pixel bands
by exactly one of three strategies:

| Variant            | Shape                                            | Scale it targets | Example                                                                                                     |
| ------------------ | ------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------ |
| Explicit ranges     | `{ ranges: { from, to, label }[] }`               | linear or time     | `{ ranges: [{ from: 0, label: 'Low', to: 33 }, { from: 33, label: 'Medium', to: 66 }, { from: 66, label: 'High', to: 100 }] }` |
| Calendar interval   | `{ interval: 'day' \| 'week' \| 'month' \| 'quarter' \| 'year' }` | time | `{ interval: 'month' }` — tiles the visible domain into calendar bands; a 6-week window yields ~6 week-bands, a 3-year window ~36 month-bands |
| Category grouping   | `{ groupBy: (category: string) => string }`       | band or point      | `{ groupBy: quarterOfMonth }` — coalesces adjacent same-group categories (e.g. 12 months → 4 quarters) into one band |

Presets don't expose a tier option directly — layer it onto the built config's `base`:

```ts
const config: GigaChartConfig = {
  ...createScatterChartConfig({ data, xDomain: [0, 100] }),
  base: {
    ...createScatterChartConfig({ data, xDomain: [0, 100] }).base,
    xAxisGroups: [
      { ranges: [{ from: 0, label: 'Low', to: 33 }, { from: 33, label: 'Medium', to: 66 }, { from: 66, label: 'High', to: 100 }] },
    ],
  },
};
```

Style tiers via `theme.axis.group` (`labelColor`, `labelFontSize`, `separatorColor`,
`separatorWidth`, optional band `tint`) — namespaced under the base `axis` theme block alongside
its existing `labelColor` / `tickColor` / etc. fields. Live demo:
`giga-chart/stories/axis-grouping/{usage,theming}`.

**Render style (`style: 'pill'`).** Each tier accepts an optional `style` — `'separators'` (the
default: a per-band tint plus a full-height rule at every boundary) or `'pill'`, an *open-top
bracket* per band: a baseline in the lower portion of the row, an end tick rising from it at each
band edge, and a centered rounded-pill badge straddling the baseline around the label. Set it on the
tier config, not the theme:

```ts
xAxisGroups: [
  {
    style: 'pill',
    ranges: [
      { from: 0, label: 'Low', to: 33 },
      { from: 33, label: 'Medium', to: 66 },
      { from: 66, label: 'High', to: 100 },
    ],
  },
];
```

The pill outline, baseline, and end ticks all use `separatorColor` / `separatorWidth`; the label uses
`labelColor` / `labelFontSize`. Three pill-only `theme.axis.group` fields tune the badge:

| Field           | Meaning                                                                                          | Default              |
| --------------- | ------------------------------------------------------------------------------------------------- | -------------------- |
| `pillBackground`| Badge fill. Kept **opaque** so the baseline doesn't strike through the label sitting on it.        | `var(--chart-surface)` |
| `pillPaddingX`  | Horizontal padding (px) between the label and each rounded end.                                    | `8`                  |
| `pillRadius`    | Corner radius (px). Omit for a full pill (radius = pill height / 2); set a literal for a soft rect. | *(full pill)*        |

On a horizontal (bottom) axis the whole pill must fit its band width, so a too-wide label is
ellipsized and, if not even `…` fits, the label + pill are dropped (re-shown when a band re-widens on
zoom). On a vertical (left/right) axis the label stays horizontal, so its badge reads as a chip
pinned on the vertical baseline and may extend past the ~22px row width for a long label; there the
pill is hidden only when its band is too short to seat it. Live demo:
`giga-chart/stories/axis-grouping/{usage,theming}` (last example in each).

> Axes now render through an in-lib `giga-axis` fork (`core/axis/render-giga-axis.ts`) — d3-axis
> has been removed. `computeAxisTicks()` produces the shared `{ value, position, label }` tick
> geometry consumed by both the axis renderer and gridlines, so ticks and gridlines can never
> disagree on placement.

### Custom tooltip

```html
<giga-chart [config]="config">
  <ng-template #gigaChartTooltip let-content>
    <strong>{{ content?.label }}</strong>
    <span>{{ content?.value | currency:'USD':'symbol':'1.0-0' }}</span>
  </ng-template>
</giga-chart>
```

#### Chart in tooltip (nested `<giga-chart>`)

Because `#gigaChartTooltip` is a real Angular `TemplateRef`, the tooltip body can be **any**
Angular content — including another `<giga-chart>`. Combine it with `[chromelessTooltip]="true"`
(drops the default bubble) and the nested chart *becomes* the tooltip: hover a stacked/grouped bar
column → a donut/pie of that column's parts. No new preset or layer — the consumer owns the source
data and maps the hovered column to a nested config:

```html
<giga-chart [config]="config()" [chromelessTooltip]="true">
  <ng-template #gigaChartTooltip let-content>
    @if (pieConfigFor(content); as pieCfg) {
      <div class="nested-tooltip__chart"><giga-chart [config]="pieCfg" /></div>
    }
  </ng-template>
</giga-chart>
```

Three gotchas make it robust:

- **Give the nested chart an explicit box, and reserve room for it.** `<giga-chart>`'s host style is
  `width/height: 100%`, so a zero-height parent collapses it — wrap it in a fixed box (e.g. `120×120`).
  Set the preset's `tooltip.height`/`width` to roughly match that box (the small default tooltip size
  is far too small for a nested chart). Because the bar layer's `'above'` tooltip Y is not clamped to
  the viewport, also reserve a top `margin` on the base chart of at least `tooltip.height + ~12` so the
  tooltip clears the top of the plot even for full-height columns.
- **Memoize per column.** Build one nested config per column **once** (a `Map` keyed by the column
  id) and look it up by `content.label`, returning a stable object reference so the nested D3 chart
  never rebuilds while the pointer moves within a column.
- **Key the tooltip by the column.** Have the base chart's `formatContent` set `label` to the column
  identity (`category` / `groupId`), and use `position: 'above'` (enter-driven) rather than
  `follow-mouse`.

Live demo: `libs/shared/charts/src/lib/giga-chart/stories/chart-in-tooltip/` (Storybook →
**Charts/GigaChart/Chart in Tooltip (Prototype)**).

### Legend interactivity & series selection (scatter)

The legend can be interactive: `config.legend.interactive: true` renders entries as
buttons and `<giga-chart>` emits `(legendItemClick)` with the clicked `GigaLegendItem`.
The chart itself stays dumb — selection *semantics* live in
`GigaScatterChartTransform` (a plain non-DI class, same idiom as `ChartsTooltipCalc`),
which turns interaction state into a new `GigaChartConfig` signal:

```ts
// Component — no providers needed
transform = new GigaScatterChartTransform({
  data: points, // points carry seriesId
  tooltip: { enabled: true },
});
```

```html
<giga-chart [config]="transform.config()" (legendItemClick)="transform.onLegendItemClick($event)" />
```

Clicking a legend entry selects that series: every other series fades (points to
`fadedPointOpacity`, default 0.15; legend entries to `fadedLegendOpacity`, default 0.4)
while the selected series stays prominent; clicking again clears. Fading is applied via
the per-point `opacity` data property — **opacity, not color math**, because series
colors are often unresolved `var(--chart-*)` strings that JS cannot derive a "faded
color" from. The transform also supports programmatic axis zoom
(`setXDomain`/`setYDomain`/`resetZoom` → the preset's explicit `xDomain`/`yDomain`
overrides) — the landing seam for future chart-emitted pan/zoom gestures. Live demo:
scatter usage story, Example 11.

**Standalone / custom legends.** `GigaChartLegendComponent` (`<giga-chart-legend>`) is
exported from the barrel and works **outside** the chart too — suppress the internal one
(`legend: { enabled: false }`) and place the component anywhere, fed by
`transform.legendItems()` (which stays populated regardless). Its contract doubles as the
build guideline for fully custom app legends: consume `GigaLegendItem[]`
(`id`/`color`/`label`/`opacity`/`selected`), emit the clicked item back (e.g. to
`transform.onLegendItemClick`), and pick a `swatchShape` matching the mark (`'circle'`
scatter, `'line'` line, `'square'` bar — the scatter preset defaults its internal legend
to `circle`). Live demo: scatter interaction story, "External Legend".

**Zoom + pan + brush gestures.** Opt in with
`gestures: { brushZoom: true, pan: true, zoom: true }` (preset option →
`config.gestures`) and wire `(chartGesture)="transform.onChartGesture($event)"`. Wheel
zooms around the cursor, drag pans (3px threshold protects point clicks),
**Shift+drag draws a rectangle and zooms to it on release** (plain drag brushes when
`pan` is off; 5px minimum avoids accidental micro-zooms), double-click resets. The
chart emits **stateless** semantic `GigaChartGestureEvent`s — deliberately *not* d3-zoom,
whose accumulated element transform fights the rebuild-from-config render model; each
transform derives the next state with pure, unit-tested math, so gesture handling is
re-render-safe. While a continuous gesture is in flight the transform emits `animationMs: 0`
(per-frame re-renders must not smear); the discrete brush-zoom + reset restore the default
transitions. `d3-zoom` / `d3-brush` are **not** runtime dependencies — the brush is
hand-rolled with pointer events.

Supported per chart type — pair each with its transform:

| Type          | Axis kind                    | Gesture semantics                                    | Transform                     |
| ------------- | ---------------------------- | --------------------------------------------------- | ----------------------------- |
| `scatter`     | linear x + linear y          | continuous zoom / pan on both                        | `GigaScatterChartTransform`   |
| `line`        | linear / time x              | continuous zoom / pan (time domains flow as epoch ms) | `GigaLineChartTransform`    |
| `line`        | categorical (point) x        | band-**window** zoom (below)                         | `GigaLineChartTransform`      |
| `bar`         | band category + linear value | band-**window** on the category axis; value auto-fits | `GigaBarChartTransform`     |
| `grouped-bar` | band group + linear value    | band-**window** on the group axis; value auto-fits    | `GigaGroupedBarChartTransform` |

**Continuous axes** reuse one set of pure domain fns (`core/gesture/gesture-domain-math.ts`:
`zoomDomain` / `panDomain` / `isDegenerateSpan`) — no per-type copies. The renderer normalizes
inverted values to numbers so the event model stays `[number, number]` (a time scale's
`invert()` returns a `Date` → epoch ms; the scale factory maps it back). Programmatic zoom
stays available (`setXDomain` / `setYDomain` / `resetZoom`).

**Band / point axes have no `invert()`**, so they **window by whole categories** instead of
rescaling: wheel narrows/widens the visible category window, pan shifts it by whole
categories, brush selects a category range, double-click restores the full domain. The window
is an inclusive `[startIndex, endIndex]` into the ordered category list, driven by pure index
math (`core/gesture/band-window-math.ts`). The transform **filters the data to the visible
window** (so off-window marks don't pile at the origin) and the value axis **auto-fits** to
the visible window — its continuous "rescale". The event carries the band op as
`{ kind: 'band-window', axis, op }` (`GigaBandWindowOp` — zoom / pan / brush in band-axis terms).

**Range-slider axis (ARCH-172).** Scatter can also opt into `rangeAxisX` / `rangeAxisY`: the
standard axis is replaced by a full-range ruler + draggable brush (window + end handles) that
zooms the plot along that axis (emits `range-zoom`). Independent of the plot gestures.

**Excluded:** `bullet` and `diverging-bar` are single-value micro-charts (one datum, fixed
layout, no category axis) — no meaningful zoom/pan surface, so they take no `gestures`. Live
demos: scatter / line / bar interaction stories.

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

## Authoring a new chart type — the layer contract

A "chart type" here is **not** an Angular component. It is four plain pieces that the
`<giga-chart>` component orchestrates:

| Piece | What it is | Lives in |
| --- | --- | --- |
| **Render fn** | `render<Name>Layer(context)` — a **pure D3 function** that draws into `context.bounds` via a **keyed enter/update/exit join**, driving every transition off **`context.animation`** (both required — see the two subsections below). Type `GigaChartLayerRenderFn<Data, Config, Theme>` (`core/layer/`). | `layers/<name>/render-<name>-layer.ts` |
| **Layer config** | A `type`-discriminated interface `{ type, data, renderer, …options, tooltip? }`, added to the `GigaChartLayerDefinition` union + the `GigaChartLayerType` string union. The layer **carries its own `renderer`**. | `core/config/` |
| **Theme slice** | `theme.<type>` interface + defaults (in `--chart-*` tokens) + a `merge<Name>LayerTheme()`. Keyed by layer `type`. | `core/theme/` |
| **Preset** | `create<Name>ChartConfig(options): GigaChartConfig` — builds `{ base, layers: [{ type, data, renderer, … }] }` for callers. | `presets/<name>-chart.preset.ts` |

`renderChart()` (`giga-chart/giga-chart.renderer.ts`) resizes the layout, builds scales
(`config.scaleFactory` or the default), renders axes, then `renderLayers()` calls each
`layer.renderer(context)` with a shared context `{ animation, bounds, data, dimensions, margins,
scales, theme[type], tooltipConfig, tooltipElement, tooltipHandlers }` — where `animation` is the
fully-resolved enter/update/exit durations + easing (see the Animation subsection). A render fn draws SVG into
`bounds`, reads geometry from `dimensions`, may build its **own** d3 scale (the bullet layer
does — it ignores the shared `scales`), merges its theme via `merge<Name>LayerTheme()`, and
emits `GigaTooltipEvent`s through `tooltipHandlers.onTooltip`.

Invariants: theme namespaced by layer `type`; styling via D3 `.style()` with `--chart-*`
tokens (CSS classes for structure/queries only, never `--mat-sys-*`). **Two are non-negotiable
for the render fn itself, and a new chart type is not done until both hold: (1) reconcile the DOM
with a keyed enter/update/exit join, and (2) drive every transition off `context.animation` —
never a hardcoded `.duration()`. Both are detailed in the two subsections directly below.** The
full step-by-step narrative (config → theme + defaults + merge → render fn → preset → stories) is
preserved in the gigasoftware repo at
`docs/architecture/chart-architecture/LAYER_IMPLEMENTATION_GUIDE.md` (accurate for the
config / theme / preset mechanics, but its render-fn code predates both the `--chart-*` migration
and the animation standard — follow the two subsections here for the render fn). Generate stories
with the `create-chart-storybook` skill.

### Rendering discipline — the D3 enter / update / exit join

A render fn is invoked on **every** state change (data, theme, config, resize) against the
**same persistent `bounds` group** — it re-renders, it does not draw once. So it must
**reconcile** the DOM to the current data every call, never "clear and re-append". Bind data
with a **keyed** `.data()` and drive the three selections. The reference is
`libs/shared/charts/src/lib/layers/bar/render-bar-layer.ts`:

```typescript
bounds.selectAll('.giga-bar-group').interrupt();          // 1. stop in-flight transitions

const groups = bounds
  .selectAll<SVGGElement, GigaBarDataPoint>('.giga-bar-group')
  .data(data, d => d.label);                              // 2. keyed join (identity, not index)

const enter = enterBars(groups.enter(), params);          // 3. append + birth state, transition in
updateBars(groups, params);                               // 4. re-apply pos/theme to survivors (animates)
groups.exit().transition().duration(exitMs)               // 5. transition out, then remove
  .style('opacity', 0).remove();

enter.merge(groups);                                       // 6. shared work (handlers) on enter + update
```

- **Key the join** — `.data(data, d => d.id)`. An index key makes updates swap identity and
  breaks the enter/exit animations.
- **Enter** appends the element, sets its *birth* attributes, then `.transition()`s to target.
- **Update** re-applies position + theme to the **existing** selection — this is what makes
  data / theme / resize changes *animate* instead of snap. Do not skip it.
- **Exit** `.transition()…​.remove()`.
- **`enter.merge(update)`** for anything both need (event handlers, cursor, labels).
- **`.interrupt()` before joining** so a rapid re-render doesn't fight a running transition.
- A layer that draws a **single `<path>`/`<line>` per series** (area, line) uses a
  `sel.empty() ? append : select` create-once idiom for that one element — the *series groups*
  around it are still keyed-joined. Empty data returns early after removing stale marks.

Every array-data layer follows this: `bar`, `area`, `line`, `grouped-bar`, `stacked-bar`,
`histogram`, `lollipop`, `scatter`, `waterfall` — several run the join **per sub-mark**
(e.g. histogram joins bars, zero-line, curve, nodes and labels independently).

**Exception — single-value meter layers.** `bullet` and `diverging-bar` bind exactly one
composite datum (`config.data` is a single object drawn as a fixed set of ~6 sub-elements), so
enter and exit degenerate — there is never a variable number of marks. They use the sanctioned
`container.empty() ? create : update` **singleton idiom** (create the group + children once,
mutate in place on every later call) with **no `.data()` join and no exit**. Decision rule:
**variable number of marks (one per array element) → keyed enter/update/exit join; fixed
single-value composite → singleton idiom.**

### Animation — the enter / update / exit standard

Every render fn drives its transitions through one resolved object the renderer injects
onto the context as **`context.animation`** — never a hardcoded `.duration()`:

```ts
interface ResolvedGigaChartAnimation {
  easing: (t: number) => number;   // default easeCubicInOut
  enterMs: number;                 // default 300 — new marks growing in
  exitMs: number;                  // default 200 — removed marks fading out
  updateMs: number;                // default 300 — survivors repositioning / re-theming
}
```

Apply it in the join — `enter.transition().duration(animation.enterMs).ease(animation.easing)…`,
`update…​.duration(animation.updateMs).ease(animation.easing)…`, and
`exit.transition().duration(animation.exitMs).ease(animation.easing).style('opacity', 0).remove()`.

**The default is already applied.** A chart with no animation config animates at
300 / 300 / 200 ms eased with `easeCubicInOut`. Callers tune it three ways — most-specific
wins, all merged centrally by `resolveAnimation` (`core/animation/`):

| Level | Field | Scope |
| --- | --- | --- |
| Chart-wide | `config.animation?: GigaChartAnimationConfig` | every layer |
| Per-layer | `layer.animation?: GigaChartAnimationConfig` | one layer (wins) |
| Shorthand | `layer.animationMs?: number` | one layer; sets enter = update = exit |

`GigaChartAnimationConfig` is the all-optional partial: set only `exitMs`, or only
`easing`, and the rest fall back to the defaults. `enabled: false` — or the
`animationMs: 0` shorthand — collapses every phase to 0 (instant), the contract the
zoom/pan transforms rely on to render smear-free per frame.

**Every layer animates on enter; the standard supplies the durations + easing, and a layer
chooses _how_ its marks arrive:**

- **Grow** (bar, grouped-bar, scatter): marks grow from a baseline / zero radius on enter,
  transition on update, fade on exit.
- **Fade in** (area, line, histogram, lollipop, stacked-bar, waterfall): marks are placed at
  their **final geometry synchronously** — so first paint stays smear-free under gesture
  re-renders and unit-testable without flushing a transition — then **fade in** (the entering
  series/column group, or the bars/bins, transition `opacity` 0→1 over `enterMs`); survivors
  transition or re-place on update; removed marks fade on exit.
- **Single-value meters** (bullet, diverging-bar): the `container.empty()` create branch uses
  `enterMs`, the update branch `updateMs`; there is no exit.

Rule of thumb: route **every** data-join `.transition()` (enter/update/exit) through
`context.animation`; leave small hover/interaction micro-transitions (e.g. a 150 ms point
grow on hover) as fixed local durations — they're interaction feedback, not the join
lifecycle.

## Domain charts must be promotion-ready

**A chart built in a domain lib follows the same layer contract as a shared one.** The point:
when a domain chart's concept is approved, it should promote into `@gigasoftware/charts` by
**moving files + registering a `type`** — never a rewrite. So build every chart as a layer
(render fn + config + theme slice + preset) even while it incubates in your domain, and render
it through `<giga-chart [config]>`.

**Anti-pattern — do not do this.** A self-contained Angular chart component — one that owns
its own `<svg viewBox>`, computes arcs/paths in a `computed()` and `@for`s them in its
template, and takes arbitrary color strings — cannot mount inside `<giga-chart>` and cannot
promote without a rewrite: none of its logic is a render fn, a config, or a `--chart-*` theme.
(In ngx-experiments, `libs/ledger/design-library/src/lib/donut-chart/ldg-donut-chart.component.ts`
is exactly this shape — a cautionary example, not a template to copy.)

**Promotion-ready — do this instead.** Even a radial chart (donut/pie) fits the layer system.
For a donut, build:

- `render-donut-layer.ts` — a pure D3 fn that draws arcs into `context.bounds`, sizing from
  `context.dimensions` (a radial layer **ignores** `scales`, computing `center` / `radius`
  from `boundedWidth`/`boundedHeight` — the same way the bullet layer builds its own scale).
- a `GigaDonutLayerConfig` (`{ type: 'donut', data, renderer, thickness?, tooltip? }`) + a
  `GigaDonutDataPoint`.
- a `theme.donut` slice defaulting to the `--chart-*` series tokens (not domain `--ldg-*`).
- `createDonutChartConfig(options)` returning
  `{ base: { showXAxis: false, showYAxis: false, margin: {…} }, layers: [{ type: 'donut', data, renderer: renderDonutLayer, … }] }`.

Consume it as `<giga-chart [config]="createDonutChartConfig({ data })" />`. If you want a
domain-branded element, wrap it in a **thin** domain component whose only job is to map domain
inputs → the preset → `<giga-chart>` — all real logic stays in the promotable render fn/preset.

**Incubate, then promote.** While unproven, keep the four pieces together in the domain (e.g.
`libs/<domain>/design-library/src/lib/charts/<name>/`). When approved:

1. Move `render-<name>-layer.ts` → `libs/shared/charts/src/lib/layers/<name>/`; the config →
   `core/config/`; the theme slice/defaults/merge → `core/theme/`; the preset → `presets/`.
2. Add `'<name>'` to the `GigaChartLayerType` union and the config to `GigaChartLayerDefinition`.
3. Export all four from the charts barrel; move the stories; delete the domain copies (and the
   thin wrapper, or repoint it at the now-shared preset).

Because the incubated chart already used the layer contract + `--chart-*` tokens, promotion is
a move + a `type` registration — no logic changes.

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

- **Consumer how-to (scatter)** — `docs/ai-instructions/procedures/giga-chart-scatter.instructions.md`
  (implement a production scatter/bubble chart end-to-end without reading library source)
- Token contract — `libs/shared/charts/src/lib/styles/_chart-tokens.scss`
- Config / data types — `libs/shared/charts/src/lib/core/config/giga-chart-config.models.ts`
- Theme models / defaults / merge — `libs/shared/charts/src/lib/core/theme/`
- Axis rendering + grouping tiers — `libs/shared/charts/src/lib/core/axis/`
- Entry component + renderer — `libs/shared/charts/src/lib/giga-chart/`
- Layer render fns — `libs/shared/charts/src/lib/layers/`
- Presets — `libs/shared/charts/src/lib/presets/`
- Story generator — `.claude/skills/create-chart-storybook/SKILL.md`
- Archived design docs — `docs/architecture/chart-architecture/`
- Workspace invariants — `docs/ai/CONSTRAINTS.md`
