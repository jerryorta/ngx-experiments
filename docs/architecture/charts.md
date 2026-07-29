# Charts — `@nge/charts`

Unified, composable D3 chart system: one `<nge-chart>` component driven by a plain
`NgeChartConfig`, with pluggable **layers** (bar, line, bullet, grouped-bar,
diverging-bar, scatter) that share a base layout, axes, tooltip, and legend. Visual
styling is theme-agnostic via the `--nge-chart-*` CSS custom-property contract — never
`--mat-sys-*`.

- **Library**: `libs/shared/charts` · alias `@nge/charts` · project `shared-charts`
- **Selector**: `nge-chart` (`ViewEncapsulation.None`, `OnPush`, `host: { class: 'nge-chart' }`)
- **Test / Lint**: `npx nx run shared-charts:test` · `npx nx run shared-charts:lint`

> **ngx-experiments (`@nge`):** the ported library is `@nge/charts` with the `nge-chart`
> selector. Architecture, config shape, and the `--nge-chart-*` contract are identical — read
> nge-→nge- for selectors/aliases. Per-repo theming differences are in each repo's
> `libs/shared/charts/AGENTS.md`.

---

## Architecture

The system is **config-driven, not content-projected**. You build a `NgeChartConfig`
(usually via a preset factory) and hand it to a single component:

```
NgeChartConfig ── input ──▶ <nge-chart [config]>
  ├─ base    (margins, axes visibility/labels, tick formatting)
  ├─ layers[] (one entry per chart type; each carries its own data + renderer fn)
  └─ legend  (optional)
```

```
                       renderChart()  (nge-chart.renderer.ts)
                              │  computes shared dimensions + x/y scales from `base`
              ┌───────────────┼───────────────┐
              ▼               ▼                ▼
       renderBarLayer   renderLineLayer   renderBulletLayer  … (pure D3 fns, layers/*)
        each receives a shared context: { bounds, data, scales, dimensions,
        theme[layer.type], tooltipConfig, tooltipHandlers }
```

Key structural facts (all in `src/lib/`):

- **Entry component** `nge-chart/nge-chart.component.ts` — takes one required signal
  input `config`, debounces config + resize into a single `render()` (~16 ms), and owns
  the tooltip + legend. It does **not** know about individual chart types.
- **Layers carry their own renderer.** A layer definition is
  `{ type, data, renderer, …layerOptions, tooltip? }`. The registry
  (`layers/layer-registry.ts`) simply iterates `config.layers` and calls
  `layer.renderer(context)` — presets wire `renderer: renderBarLayer` etc. Adding a chart
  type does not require editing a central switch.
- **Base layout** `core/base-layout/` — SVG wrapper, bounds group, margins, dimensions,
  shared axes, and a **clipped `g.nge-chart-layers` group** (clipPath sized to the plot
  area) that all layers render into — marks never spill over axes/margins when zoomed or
  panned; axes stay unclipped siblings. Created once via `createBaseLayout(root)`.
- **Presets** `presets/*.preset.ts` — convenience factories that return a fully-formed
  `NgeChartConfig` (see table below).
- **Tooltip is generic** `nge-chart-tooltip/` + `core/tooltip/` — layers emit a
  `NgeTooltipEvent`; the component positions the bubble via D3 (bypassing change
  detection) and renders content through the default template or a consumer-supplied
  `#ngeChartTooltip` `ng-template`.
- **Legend** `nge-chart-legend/` — rendered from `config.legend` (position drives a
  row/column layout on the host).

### Shadow-DOM isolation (important)

`NgeChartComponent` attaches a **shadow root** to its `.nge-chart-container` and renders
the SVG inside it, so per-instance chart styles never leak. Consequences:

- A light-DOM probe like `document.querySelector('nge-chart svg')` returns **nothing**
  (or a 0×0 box). **Verify charts visually**, or reach through
  `container.shadowRoot.querySelector('svg')`.
- The injected shadow style is `:host, svg { width: 100%; height: 100% }` — a chart in a
  **zero-height** parent collapses to nothing. Always give `<nge-chart>` an
  explicit-height wrapper (e.g. a fixed `h-64` / `height: 300px` container).

---

## Public API

```html
<nge-chart [config]="config" />
```

```ts
import { createBarChartConfig } from '@nge/charts';

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
| `createBarChartConfig`          | `bar`          | `NgeBarDataPoint`    |
| `createLineChartConfig`         | `line`         | `NgeLineDataPoint`   |
| `createBulletChartConfig`       | `bullet`       | `NgeBulletDataPoint` |
| `createGroupedBarChartConfig`   | `grouped-bar`  | `NgeGroupedBarDataPoint` |
| `createDivergingBarChartConfig` | `diverging-bar`| (see preset)          |
| `createScatterChartConfig`      | `scatter`      | (see preset)          |

Exact option surfaces live in each `presets/*.preset.ts`; config/data types in
`core/config/nge-chart-config.models.ts`. Presets are **not uniform** — e.g. the bar
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
const config: NgeChartConfig = {
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
`nge-chart/stories/axis-grouping/{usage,theming}`.

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
| `pillBackground`| Badge fill. Kept **opaque** so the baseline doesn't strike through the label sitting on it.        | `var(--nge-chart-surface)` |
| `pillPaddingX`  | Horizontal padding (px) between the label and each rounded end.                                    | `8`                  |
| `pillRadius`    | Corner radius (px). Omit for a full pill (radius = pill height / 2); set a literal for a soft rect. | *(full pill)*        |

On a horizontal (bottom) axis the whole pill must fit its band width, so a too-wide label is
ellipsized and, if not even `…` fits, the label + pill are dropped (re-shown when a band re-widens on
zoom). On a vertical (left/right) axis the label stays horizontal, so its badge reads as a chip
pinned on the vertical baseline and may extend past the ~22px row width for a long label; there the
pill is hidden only when its band is too short to seat it. Live demo:
`nge-chart/stories/axis-grouping/{usage,theming}` (last example in each).

> Axes now render through an in-lib `nge-axis` fork (`core/axis/render-nge-axis.ts`) — d3-axis
> has been removed. `computeAxisTicks()` produces the shared `{ value, position, label }` tick
> geometry consumed by both the axis renderer and gridlines, so ticks and gridlines can never
> disagree on placement.

### Custom tooltip

```html
<nge-chart [config]="config">
  <ng-template #ngeChartTooltip let-content>
    <strong>{{ content?.label }}</strong>
    <span>{{ content?.value | currency:'USD':'symbol':'1.0-0' }}</span>
  </ng-template>
</nge-chart>
```

#### Chart in tooltip (nested `<nge-chart>`)

Because `#ngeChartTooltip` is a real Angular `TemplateRef`, the tooltip body can be **any**
Angular content — including another `<nge-chart>`. Combine it with `[chromelessTooltip]="true"`
(drops the default bubble) and the nested chart *becomes* the tooltip: hover a stacked/grouped bar
column → a donut/pie of that column's parts. No new preset or layer — the consumer owns the source
data and maps the hovered column to a nested config:

```html
<nge-chart [config]="config()" [chromelessTooltip]="true">
  <ng-template #ngeChartTooltip let-content>
    @if (pieConfigFor(content); as pieCfg) {
      <div class="nested-tooltip__chart"><nge-chart [config]="pieCfg" /></div>
    }
  </ng-template>
</nge-chart>
```

Three gotchas make it robust:

- **Give the nested chart an explicit box, and reserve room for it.** `<nge-chart>`'s host style is
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

Live demo: `libs/shared/charts/src/lib/nge-chart/stories/chart-in-tooltip/` (Storybook →
**Charts/NgeChart/Chart in Tooltip (Prototype)**).

#### Tooltip coordinates — producers emit CONTAINER coords, never host coords

`NgeTooltipEvent.position` is measured **inside the plot container's svg**: plot coords plus
the chart margins. Every producer follows it — the crosshair
(`core/crosshair/nge-chart-crosshair.ts`) and every layer's `margins.left + …` placement.
Emit anything else and one tooltip disagrees with the rest.

`<nge-chart-tooltip>` is `position: absolute` against the **host**, so `NgeChartComponent`
performs the one translation between the two spaces: it adds the plot container's
`offsetLeft`/`offsetTop` within the host when it writes `left`/`top`. That offset is non-zero
exactly when the legend sits `top` or `left`, because the legend is then a flex sibling ahead
of the plot container and pushes the plot's origin down/right (ARCH-223). It is measured once
per render, not per `pointermove` — the crosshair mutates the svg immediately before emitting,
so a per-event read would force a synchronous layout every frame.

Consequences for a new layer:

- Place tooltips in **container coords** and let the component translate. A layer that resolves
  host coords itself will be double-offset under a top/left legend.
- A layer that animates the tooltip element **directly** (`skipPosition: true` plus its own
  `select(tooltipElement).style('left', …)` — the bullet and diverging-bar enter transitions)
  bypasses that translation and is mis-placed under a top/left legend. Prefer emitting through
  `onTooltip`.

### Legend interactivity & series selection (scatter)

The legend can be interactive: `config.legend.interactive: true` renders entries as
buttons and `<nge-chart>` emits `(legendItemClick)` with the clicked `NgeLegendItem`.
The chart itself stays dumb — selection *semantics* live in
`NgeScatterChartTransform` (a plain non-DI class, same idiom as `NgeChartTooltipCalc`),
which turns interaction state into a new `NgeChartConfig` signal:

```ts
// Component — no providers needed
transform = new NgeScatterChartTransform({
  data: points, // points carry seriesId
  tooltip: { enabled: true },
});
```

```html
<nge-chart [config]="transform.config()" (legendItemClick)="transform.onLegendItemClick($event)" />
```

Clicking a legend entry selects that series: every other series fades (points to
`fadedPointOpacity`, default 0.15; legend entries to `fadedLegendOpacity`, default 0.4)
while the selected series stays prominent; clicking again clears. Fading is applied via
the per-point `opacity` data property — **opacity, not color math**, because series
colors are often unresolved `var(--nge-chart-*)` strings that JS cannot derive a "faded
color" from. The transform also supports programmatic axis zoom
(`setXDomain`/`setYDomain`/`resetZoom` → the preset's explicit `xDomain`/`yDomain`
overrides) — the landing seam for future chart-emitted pan/zoom gestures. Live demo:
scatter usage story, Example 11.

**Standalone / custom legends.** `NgeChartLegendComponent` (`<nge-chart-legend>`) is
exported from the barrel and works **outside** the chart too — suppress the internal one
(`legend: { enabled: false }`) and place the component anywhere, fed by
`transform.legendItems()` (which stays populated regardless). Its contract doubles as the
build guideline for fully custom app legends: consume `NgeLegendItem[]`
(`id`/`color`/`label`/`opacity`/`selected`), emit the clicked item back (e.g. to
`transform.onLegendItemClick`), and pick a `swatchShape` matching the mark (`'circle'`
scatter, `'line'` line, `'square'` bar — the scatter preset defaults its internal legend
to `circle`). Live demo: scatter interaction story, "External Legend".

**A legend selection must FADE, never filter (ARCH-284).** The scatter transform above fades
the unselected series; the pie does the same through `highlightedLabels` (named slices keep
`theme.pie.slice.opacity`, the rest drop to `dimmedOpacity`, default 0.25). Removing the
unselected data instead is the tempting shortcut and it is wrong on any part-to-whole chart:
drop a pie slice and `d3.pie()` re-runs, so every surviving wedge grows and the one being
compared against changes size mid-comparison. Opacity is also the only mechanism available —
series colours are usually unresolved `var(--nge-chart-*)` strings that JS cannot derive a
faded colour from. The layer holds no selection state: the caller owns the set and passes it
down, exactly as with the scatter transform.

Pair it with `legend.showValues` (each `NgeLegendItem.value` beside its label) and
`legend.showClearAction` (a "Clear highlight" button emitting `(legendClearAction)`) and the
legend becomes the chart's data table — which is what lets a dense pie set `showLabels: false`
and stop fighting to place labels around a crowded arc at all. `showValues` is opt-in
precisely because `extractPieChartLegendItems` populates `value` for every pie: the data is
always there, the display is a choice. Live demo: pie chart "Legend Highlight" story. The
sibling Interaction story's `interactiveLegend` deliberately does the opposite (it filters)
and is kept as the contrast.

**Zoom + pan + brush gestures.** Opt in with
`gestures: { brushZoom: true, pan: true, zoom: true }` (preset option →
`config.gestures`) and wire `(chartGesture)="transform.onChartGesture($event)"`. Wheel
zooms around the cursor, drag pans (3px threshold protects point clicks),
**Shift+drag draws a rectangle and zooms to it on release** (plain drag brushes when
`pan` is off; 5px minimum avoids accidental micro-zooms), double-click resets. The
chart emits **stateless** semantic `NgeChartGestureEvent`s — deliberately *not* d3-zoom,
whose accumulated element transform fights the rebuild-from-config render model; each
transform derives the next state with pure, unit-tested math, so gesture handling is
re-render-safe. While a continuous gesture is in flight the transform emits `animationMs: 0`
(per-frame re-renders must not smear); the discrete brush-zoom + reset restore the default
transitions. `d3-zoom` / `d3-brush` are **not** runtime dependencies — the brush is
hand-rolled with pointer events.

Supported per chart type — pair each with its transform:

| Type          | Axis kind                    | Gesture semantics                                    | Transform                     |
| ------------- | ---------------------------- | --------------------------------------------------- | ----------------------------- |
| `scatter`     | linear x + linear y          | continuous zoom / pan on both                        | `NgeScatterChartTransform`   |
| `line`        | linear / time x              | continuous zoom / pan (time domains flow as epoch ms) | `NgeLineChartTransform`    |
| `line`        | categorical (point) x        | band-**window** zoom (below)                         | `NgeLineChartTransform`      |
| `bar`         | band category + linear value | band-**window** on the category axis; value auto-fits | `NgeBarChartTransform`     |
| `grouped-bar` | band group + linear value    | band-**window** on the group axis; value auto-fits    | `NgeGroupedBarChartTransform` |

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
`{ kind: 'band-window', axis, op }` (`NgeBandWindowOp` — zoom / pan / brush in band-axis terms).

**Range-slider axis (ARCH-172).** Scatter can also opt into `rangeAxisX` / `rangeAxisY`: the
standard axis is replaced by a full-range ruler + draggable brush (window + end handles) that
zooms the plot along that axis (emits `range-zoom`). Independent of the plot gestures.

**Excluded:** `bullet` and `diverging-bar` are single-value micro-charts (one datum, fixed
layout, no category axis) — no meaningful zoom/pan surface, so they take no `gestures`. Live
demos: scatter / line / bar interaction stories.

---

## Theming — the `--nge-chart-*` token contract

Charts read a **domain-agnostic** `--nge-chart-*` CSS custom-property contract, defined with
light-mode defaults in `src/lib/styles/_nge-chart-tokens.scss` (forwarded via `_theming.scss`).
The defaults let charts render correctly with **no** theme applied. A domain theme styles
charts by re-declaring the same properties inside its theme **class** selector — class
specificity beats `:root`, so theme values always win. **Never use `--mat-sys-*`.**

| Group   | Tokens                                                                                                                                    | Used for                              |
| ------- | ----------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Surface | `--nge-chart-surface`, `-surface-variant`, `-surface-container`, `-surface-container-low`, `-surface-container-highest`, `-inverse-surface`, `-inverse-on-surface` | Backgrounds, panels, containers |
| Content | `--nge-chart-on-surface`, `--nge-chart-on-surface-variant`                                                                                        | Labels, axis text, legend text        |
| Border  | `--nge-chart-outline`, `--nge-chart-outline-variant`                                                                                              | Axis lines, grid lines, card outlines |
| Accent  | `--nge-chart-primary`, `-primary-container`, `-on-primary`, `-secondary`, `-secondary-container`, `-tertiary`, `-error`                       | Data series colors, highlights        |

**Series assignment:** `--nge-chart-primary` → series 1 · `--nge-chart-secondary` → series 2 /
median lines · `--nge-chart-tertiary` → series 3 / mean lines · `--nge-chart-error` → error state.

**Values are applied as D3 inline styles**, not CSS classes. Theme objects on the config
(`config.theme` / preset `theme` overrides) resolve to literal color/number strings written
straight onto SVG elements. Because these are D3 `.style()` strings, a raw
`var(--nge-chart-primary)` works only where the browser resolves it in context — passing an
**unresolved** `var()` where D3 expects a concrete color (e.g. a `seriesColors` array
consumed by a scale) fails silently. Use a resolved color, or drive it through the
`--nge-chart-*` token on the element rather than a JS-side `var()` string.

**Adding a token:** add it to `_nge-chart-tokens.scss` with a default + comment, use
`var(--nge-chart-<name>)` in chart SCSS or D3 style strings, then map it in every consuming
theme's chart bridge (per-repo locations are in `libs/shared/charts/AGENTS.md`).

### Data-label colour — the four-rung resolution order

A data label drawn **on top of a data mark** is a special case, because its backdrop is the
mark's own fill and that fill comes from the series palette — a *range*. No single themed
colour reads on every mark: white reads on a deep blue slice and vanishes on a pale yellow
one. Every layer that draws text inside its own mark resolves the label colour per datum
through one shared helper, `resolveLabelColor()` in
`core/theme/nge-chart-label-color.fns.ts`. Highest priority first:

| # | Rung | Source | Notes |
| - | ---- | ------ | ----- |
| 1 | Per-datum | `datum.labelColor` | The author decided, for this one mark. |
| 2 | Layer config | `config.labelColor` | The author decided, for the whole layer. Supplying it **disables** derivation — the escape hatch to one flat colour. |
| 3 | Derived from the fill | `theme.<type>.label.colorOnDark` when the resolved fill is perceptually dark (CIE Lab L\* < 60), else `theme.<type>.label.color` | The default path. Still resolves to *theme* values, so the slice stays fully themeable. |
| 4 | Theme default | `theme.<type>.label.color` | Used when the fill cannot be measured, or the theme declares no `colorOnDark`. |

Rung 3 resolves a `var(--nge-chart-*)` fill to a concrete colour before measuring it
(`resolveNgeChartThemeColor()`, backed by a literal fallback map so the maths never throws
under jsdom or an unloaded `:root`).

**Rung 3 applies only to text drawn INSIDE a mark.** A label sitting on the plot surface has
a theme-relative backdrop and must not derive — the bar layer's value labels (drawn above /
beside the bar), the pie's `labelPosition: 'outside'`, and the funnel's
`labelPosition: 'edge' | 'right'` are the current cases. Those pass an empty `fill`, which
falls through to rung 4 while leaving rungs 1–2 working, so no extra flag is needed.

`theme.<type>.label.color` / `.colorOnDark` default to the **absolute** `--nge-chart-black` /
`--nge-chart-white` tokens — see `libs/shared/charts/AGENTS.md` on why those two must not be
remapped by a theme bridge. `fontSize` / `fontWeight` accept `number | string` (number = px /
numeric weight; a string passes to CSS verbatim, so a token reference works) and are
normalised by the shared `toCssFontSize()`.

### A placement that leaves the mark needs its OWN theme slice — `labelOutside`

An empty `fill` is only half the answer. It stops rung 3 from deriving, but rung 4 still hands
back `theme.<type>.label.color` — and for any layer with automatic on-fill contrast that value
is deliberately the **absolute** `--nge-chart-black`, chosen because it is *not* theme-relative.
Black on a light surface reads; black on a dark surface does not. The funnel shipped exactly
that bug for one release: `labelPosition: 'edge' | 'right'` labels were invisible in every dark
bridge (found and fixed in ARCH-267).

So a layer that can draw the same label **on** its mark or **off** it declares two slices:

| Slice | Backdrop | Colour rule |
| ----- | -------- | ----------- |
| `theme.<type>.label` | the mark's own fill (a palette *range*) | absolute `--nge-chart-black` / `--nge-chart-white` pair, picked per datum by rung 3 |
| `theme.<type>.labelOutside` | the plot surface | theme-relative `--nge-chart-on-surface`, **no `colorOnDark`** |

The missing `colorOnDark` is the mechanism, not an omission: `resolveLabelColor()` short-circuits
to `theme.color` when the pair is absent, so an outside label *structurally cannot* derive from a
fill it is not drawn on, while rungs 1–2 keep working. Type the slice without the field so the
guarantee is checked rather than remembered. The renderer picks the slice by placement and uses
it for typography too:

```ts
const labelTheme = isOutside ? theme.labelOutside : theme.label;
// …
resolveLabelColor({ configColor, datumColor, fill: isOutside ? '' : fillFor(d), node, theme: labelTheme });
```

Live in `layers/pie/render-pie-layer.ts`, `layers/funnel/render-funnel-layer.ts` and
`layers/radial-bar/render-radial-bar-layer.ts`. A story that restyles outside labels must override
`labelOutside` — overriding `label` silently does nothing. The bar layer's value labels are the one
case that legitimately needs no second slice: they are *always* outside the mark, so there is no
on-fill placement to disambiguate. The sunburst is the mirror image — it only ever draws inside the
mark, so it declares `label` alone; a future outside placement there must add the second slice
rather than widen the first.

⚠️ **A mark that encodes value as OPACITY cannot use rung 3 at all.** Derived contrast reads the
mark's `fill`, and the radial-bar's circular-heatmap cell (`mark: 'cell'`) draws one base colour at
a value-driven `fill-opacity` — so the luminance maths sees a saturated fill under text that is
actually sitting on a near-transparent wash, and picks white for a cell that reads as white. That is
why ARCH-238 scoped radial-bar labels to `mark: 'bar'`: labelling an opacity-encoded mark needs a
rung that composes the fill against the surface first, which no layer has yet. Applies equally to
any future layer that encodes magnitude in alpha.

> **Deliberately not per-datum: typography.** Data points carry `labelColor` and nothing else.
> Size and weight do not co-vary with the fill — which is the whole justification for
> data-driven label style — so they stay on the layer-config and theme rungs (ARCH-266).

⚠️ **A derived label colour does not survive a CSS-only theme swap.** Rung 3 is a *decision*
(black or white?) that CSS cannot express, so it is made in JS at render time and written out
as a concrete choice. A slice's `fill` stays the literal string `var(--nge-chart-primary)`,
which the browser re-resolves on every paint — so swapping the theme **class** on `<body>`
(exactly what the MW / Concierge / Cognition bridges do) repaints the fill but leaves the
label on the colour derived from the *previous* palette. Until the layer re-renders, a light
theme can show a dark-derived label over a now-dark fill.

Re-rendering fixes it — and any config change already does. Only a class-swap with an
otherwise-identical config is exposed. Verified in Storybook: the pie theming story is correct
in `mw-light` and `mw-dark` on load (min contrast 3.79 / 3.27 across the theme palette, 6.82
across the wide-luminance demo palette), and mismatches only if the theme is toggled after
render. When auditing label contrast, **reload with the target theme active** rather than
toggling into it, or the reading is of the previous theme's derivation.

### Radial labels — orientation and the two-part suppression rule

A label ON a radial mark has one extra decision a cartesian one does not: which way it points.
The sunburst layer settles it for the radial family (ARCH-237), and a new radial layer should
follow rather than re-derive.

**Orientation — along the radius, flipped on the left hemisphere.** The classic sunburst
transform, `rotate(mid − 90) translate(midRadius, 0) rotate(flip)`, where `flip` is 180° once
the node's mid-angle passes 180° so the text never reads upside down. The alternative —
tangential text following the arc — bounds the label's *length* by arc length, and an inner
ring has almost none of it; running along the radius bounds the length by the ring's radial
thickness instead, which is roughly constant at every depth. Normalise the mid-angle into
[0, 360) before the hemisphere test: `startAngle` is arbitrary, so the raw degrees are too.

`renderSunburstLayer` emits this as `translate(x,y) rotate(a)` — the same placement folded into
an anchor plus a rotation about it. That is not cosmetic: d3's automatic `transform` interpolator
decomposes the attribute through `node.transform.baseVal`, which sends an anchor-then-rotate
placement on a matrix-decomposed detour and is **not implemented by jsdom at all** (a `transform`
transition throws there, and the throw takes the layer's other transitions down with it).
Tween the anchor's own numbers via `attrTween` instead, and snap the rotation to its target
rather than interpolating it — a label crossing the hemisphere boundary would otherwise spin
180° on its way over.

**Suppression takes two thresholds, not one.** A minimum *angle* is necessary but not
sufficient on a hierarchy: a node on an inner ring can hold a generous sweep and still have
almost no arc, because arc length is `sweep × radius`. So a radial layer with more than one ring
gates on both — `minLabelAngle` (radians, narrow wedges) **and** `minLabelSize` (px of arc at the
node's mid-radius). A depth cap (`maxLabelDepth`) is the third, blunt lever, and is deliberately
independent of `maxDepth`: a chart can draw five rings and label two. All three filter the label
join's **data** rather than hiding elements, so a node that shrinks past a threshold exits
cleanly and re-enters when the data grows it back. A zero-sweep node is never labelled, whatever
the thresholds are set to.

**The radial-bar adds a second axis to `minLabelSize` (ARCH-238).** On a sunburst every ring has
roughly the same radial thickness, so the arc test carries the whole absolute-size rule. A radial
bar's length *is* the data, so the same threshold has to be applied twice — once to the arc (the
text's cap-height) and once to the bar's own radial extent (`outerRadius − innerRadius`, the
direction the text runs). A tall-value bar in a donut can hold 168px of arc and 0.4px of length;
only the second test drops it. Read `minLabelSize` as "px in whichever direction the text runs",
not "px of arc".

**Off-mark radial placement is a ring, not two columns.** Put every off-mark label on one ring at
`outerRadius + offset`, anchored by the sign of `sin(midAngle)` with `'middle'` at dead top and
bottom — the radar layer's axis-label convention. Reserve that ring's width off the **radius**
(`labelGutter`), not off the width alone: the layers group is clipped to the plot rect, and this
ring crosses the top and bottom edges as well as the sides.

**That vertical reserve is load-bearing, and its absence hides rather than announces itself**
(ARCH-275). A hemisphere column only needs width — its labels sit beside the pie and are clamped
inside the plot vertically. A ring does not: give it only the width and the 12-o'clock label is
drawn past `boundedHeight`, and the collision clamp then shoves a whole *band* of labels off their
own bearing to keep them in frame. Nothing is visibly cut, so it reads as a layout that fans and
crosses under pressure rather than as a missing reserve. Take `offset + lineHeight / 2` off the
half-height — the ring's own extent, **not** the full gutter: at dead top the text runs
horizontally, so it needs a line's height of room, not a label's width.

**Crossing leaders are a function of plot HEIGHT, not of pie size.** Measured on a 30-category
pie by counting leader-segment intersections, against the ARCH-275 placement pass: 84 crossings at
506px of plot height, 58 at 620, 40 at 760, 34 at 900 — then flat, once width becomes the binding
constraint on the radius. Shrinking the pie does nothing (crossings are scale-invariant: offset
12 → 180 drops the radius 361 → 193 and leaves the count at 40), and raising `labelLineHeight`
makes it worse (10 → 22px takes 14 crossings to 79) because it forces more displacement. Give a
crowded ring vertical room; do not try to fix it by making the pie smaller.

**Crossings are a DENSITY ceiling, not a layout defect — the ring is clean to ~20 categories
(ARCH-279).** The same counter run across category counts, on the shipped placement pass:

| categories | 5 | 8 | 12 | 16 | 20 | 25 | 30 |
| ---------- | - | - | -- | -- | -- | -- | -- |
| crossings  | 0 | 0 | 0  | 0  | 0  | 8  | 34 |

Zero through 20, then a sharp knee. Past ~20 the labels can no longer be seated near their own
bearings, so the y-pass slides them a long way along the ring and the leaders it drags behind them
sweep across their neighbours'. The 30-category reference pie is **above the ring's usable
density**, not evidence that the ring is broken — and that is exactly what `'columns'` is for,
which stays at 0 crossings at any count.

**Do not try to untangle a crowded ring by reassigning labels to slots.** ARCH-279 built and
measured that: a leader's final segment is a chord of the label ring, two chords intersect exactly
when their endpoints interleave, and the y-pass hands back a sorted→sorted matching — the
non-crossing optimum on a *line* (hence `'columns'` = 0) but not on a *circle*. A 2-opt exchange
of slot occupancy does un-cross them, provably and cheaply, taking 30 categories from **34
crossings to 3**. It was **rejected anyway**, because un-crossing works *by* permuting who sits in
which slot, and the measured price is reading order:

| positions a label may stray | 0 (wedge order) | 1 | 2 | 3 | 4 | 6 | unbounded |
| --------------------------- | --------------- | -- | -- | -- | -- | - | --------- |
| crossings                   | 34              | 30 | 26 | 24 | 19 | 8 | 3         |
| order inversions            | 0               | 4  | 8  | 10 | 11 | 12 | 16       |

There is no cheap region: every crossing removed is bought with order, and at the useful end labels
land up to **9 positions** from their own wedge (Turkey and Belgium surfacing mid-run between
Poland and Canada). **Labels reading around the ring in the same order as the wedges is worth more
than the crossings cost**, so the ring keeps wedge order and the ceiling stands. Both facts are
pinned by the `leader crossings` suite in `render-pie-layer.spec.ts`.

**Sizing a radial layer: `radiusRatio`, never `labelGutter`.** Every radial layer (pie /
sunburst / radar / radial-bar / gauge) self-scales to fill its plot — `min(w, h) / 2` minus
whatever it reserves for labels — which left the family with **no way to be made smaller inside
a box it does not control**. `labelGutter` looks like that lever and is not: it is measured off
the arc, so shrinking the mark with it drags the labels inward too and merely moves the dead
space from the middle to the edges. It also stops working entirely once height, not width, is
the binding constraint.

`radiusRatio` (0–1, default 1) is the lever. It is applied **last**, by the shared
`applyRadiusRatio()` in `core/fns/radial-radius.fns.ts`, after each layer's own label reserves —
so the two compose rather than fight: the reserves decide how much room the labels need, then
this scales the mark inside what is left. Because every radial layer derives `innerRadiusPx` as
a ratio **of** the outer radius, a donut's hole and a sunburst's rings scale with it
automatically; the chart gets smaller, not distorted. The ratio is clamped into `[0, 1]` (above
1 the layers group's clip-path would silently crop the mark rather than grow it) and a
non-finite value falls back to 1 rather than poisoning every arc path with `NaN`.

Pair it with `labelOffset` for full control, in that order: `radiusRatio` sets how big the mark
is, `labelOffset` sets how far off it the labels sit.

Whether the ring needs **collision resolution** is what separates the two families. An
angular-band layer (radial bar, and any future one) does not: evenly-spread band mid-angles do not
crowd the way a pie's value-proportional wedges do, so `minLabelAngle` covers what is left. A pie
does, because a 36-of-3000 sliver sits arbitrarily close to its neighbour. So `resolveOutsideLabels`
stays **pie-local** — lift it only when a layer actually needs it.

The pie therefore offers both forms under `labelLayout` (ARCH-275). `'perimeter'` — the ring above —
is the **default** (ARCH-276); `'columns'` is the original ARCH-267 form, which pins each hemisphere
to a fixed x. Columns guarantee separation but pull *every* label off its slice's bearing even when
nothing was going to collide. The ring resolves the same collisions on the same forward/backward
y-pass and then maps the settled y back onto the circle (`x = ±√(labelRadius² − y²)`), so an
untouched label lands exactly on its mid-angle projection and a crowded one slides *along* the
ring. No second resolver.

**The ring does not draw FEWER leaders — it draws SHORTER ones (measured, ARCH-276).** `displaced`
is `|resolvedY − naturalY| > ε`, decided entirely by the y-pass that both layouts share, so
`leaderLines: 'displaced'` picks an identical SET either way (30-country reference: 12 and 12;
5-slice budget: 0 and 0). What changes is length, because a ring connector ends on its own slice's
bearing instead of reaching across to a ruler line. At `leaderLines: 'all'` on the 30-country pie:

| labelLayout | leaders | total ink | mean | max |
| ----------- | ------- | --------- | ---- | --- |
| `'columns'` | 30      | 5556px    | 185px | 414px |
| `'perimeter'` | 30    | 1341px    | 45px | 121px |

Do not describe the ring as reducing the number of connectors — that claim was carried in the
public JSDoc from ARCH-275 and is false.

**`displaced` weighs y and nothing else — settled, do not re-open (ARCH-283).** It reads like a
cheap stand-in for "has this label left its slice's bearing", and it is not: in both layouts it
*is* that test, because the height carries the whole of what a label's position says about which
wedge it names.

- Hemispheres split on `sign(sin θ)`, which cuts the circle at exactly the two angles where `cos`
  turns — so within one hemisphere `naturalY = −cos θ · labelRadius` is one-to-one with the
  mid-angle, and no two labels can want the same height. The collision pass only separates, never
  reorders, so the resolved heights still run in wedge order.
- Under `'perimeter'`, `x = ±(√(labelRadius² − y²) + gap)` is a pure function of the resolved y.
  There is no independent x to weigh, so an x-aware predicate is provably a no-op here.
- Under `'columns'`, every label shares one of two x values, so being pulled to the ruler line
  discards nothing that identified the wedge — the height is untouched and the connector the
  label goes without would have been horizontal anyway. An x-aware predicate would instead fire
  on nearly every label (30-slice reference fixture: 28 of 30, against 6 today), collapsing
  `'displaced'` into `'all'` for that layout and deleting the option's meaning there.

Where a part-leadered column genuinely reads as ambiguous, the answer is `leaderLines: 'all'` or
the `'perimeter'` default — both already exist. The `what displacement measures` suite in
`render-pie-layer.spec.ts` pins all three facts, and the cross-layout leader-set identity is the
tripwire that fails the moment a predicate consults x.

**A leader leaves its slice radially.** Three points: the arc's outer edge at the slice mid-angle →
that **same mid-angle** carried out to the elbow radius → the label's anchor. Jumping straight from
the arc to the label's x makes the whole connector one long diagonal with nothing tying it to the
wedge it names. Carrying the mid-angle out first costs nothing — at the default elbow radius
`naturalY` already *is* that point's y, so an undisplaced label's final segment comes out exactly
horizontal on its own.

**The stub and the label distance are separable — `leaderElbowOffset` (ARCH-279).** The elbow
sits at `outerRadius + leaderElbowOffset`, which **defaults to `labelOffset`** and so reproduces
the original single-knob geometry byte-for-byte. Setting it shorter decouples the two: a stubby
radial tick off the wedge with the text sitting further out, instead of `labelOffset` dragging
both. Two things hold whatever it is set to — the stub stays on the slice's own bearing (p0 and
p1 share a ray from the center), and under `'perimeter'` the vertical reserve becomes
`max(labelOffset + lineHeight / 2, leaderElbowOffset)`, so an elbow pushed past the labels is
still paid for out of the height rather than being clipped at 12 o'clock. Note the final hop is
never exactly collinear with the stub: the 4px text gap is applied horizontally, not radially,
so the elbow stays a real elbow.

---

## Authoring a new chart type — the layer contract

A "chart type" here is **not** an Angular component. It is four plain pieces that the
`<nge-chart>` component orchestrates:

| Piece | What it is | Lives in |
| --- | --- | --- |
| **Render fn** | `render<Name>Layer(context)` — a **pure D3 function** that draws into `context.bounds` via a **keyed enter/update/exit join**, driving every transition off **`context.animation`** (both required — see the two subsections below). Type `NgeChartLayerRenderFn<Data, Config, Theme>` (`core/layer/`). | `layers/<name>/render-<name>-layer.ts` |
| **Layer config** | A `type`-discriminated interface `{ type, data, renderer, …options, tooltip? }`, added to the `NgeChartLayerDefinition` union + the `NgeChartLayerType` string union. The layer **carries its own `renderer`**. | `core/config/` |
| **Theme slice** | `theme.<type>` interface + defaults (in `--nge-chart-*` tokens) + a `merge<Name>LayerTheme()`. Keyed by layer `type`. | `core/theme/` |
| **Preset** | `create<Name>ChartConfig(options): NgeChartConfig` — builds `{ base, layers: [{ type, data, renderer, … }] }` for callers. | `presets/<name>-chart.preset.ts` |

`renderChart()` (`nge-chart/nge-chart.renderer.ts`) resizes the layout, builds scales
(`config.scaleFactory` or the default), renders axes, then `renderLayers()` calls each
`layer.renderer(context)` with a shared context `{ animation, bounds, data, dimensions, margins,
scales, theme[type], tooltipConfig, tooltipElement, tooltipHandlers }` — where `animation` is the
fully-resolved enter/update/exit durations + easing (see the Animation subsection). A render fn draws SVG into
`bounds`, reads geometry from `dimensions`, may build its **own** d3 scale (the bullet layer
does — it ignores the shared `scales`), merges its theme via `merge<Name>LayerTheme()`, and
emits `NgeTooltipEvent`s through `tooltipHandlers.onTooltip`.

Invariants: theme namespaced by layer `type`; styling via D3 `.style()` with `--nge-chart-*`
tokens (CSS classes for structure/queries only, never `--mat-sys-*`). **Two are non-negotiable
for the render fn itself, and a new chart type is not done until both hold: (1) reconcile the DOM
with a keyed enter/update/exit join, and (2) drive every transition off `context.animation` —
never a hardcoded `.duration()`. Both are detailed in the two subsections directly below.** The
full step-by-step narrative (config → theme + defaults + merge → render fn → preset → stories) is
preserved in the gigasoftware repo at
`docs/architecture/chart-architecture/LAYER_IMPLEMENTATION_GUIDE.md` (accurate for the
config / theme / preset mechanics, but its render-fn code predates both the `--nge-chart-*` migration
and the animation standard — follow the two subsections here for the render fn). Generate stories
with the `create-chart-storybook` skill.

### Rendering discipline — the D3 enter / update / exit join

A render fn is invoked on **every** state change (data, theme, config, resize) against the
**same persistent `bounds` group** — it re-renders, it does not draw once. So it must
**reconcile** the DOM to the current data every call, never "clear and re-append". Bind data
with a **keyed** `.data()` and drive the three selections. The reference is
`libs/shared/charts/src/lib/layers/bar/render-bar-layer.ts`:

```typescript
bounds.selectAll('.nge-bar-group').interrupt();          // 1. stop in-flight transitions

const groups = bounds
  .selectAll<SVGGElement, NgeBarDataPoint>('.nge-bar-group')
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
interface ResolvedNgeChartAnimation {
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
| Chart-wide | `config.animation?: NgeChartAnimationConfig` | every layer |
| Per-layer | `layer.animation?: NgeChartAnimationConfig` | one layer (wins) |
| Shorthand | `layer.animationMs?: number` | one layer; sets enter = update = exit |

`NgeChartAnimationConfig` is the all-optional partial: set only `exitMs`, or only
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
when a domain chart's concept is approved, it should promote into `@nge/charts` by
**moving files + registering a `type`** — never a rewrite. So build every chart as a layer
(render fn + config + theme slice + preset) even while it incubates in your domain, and render
it through `<nge-chart [config]>`.

**Anti-pattern — do not do this.** A self-contained Angular chart component — one that owns
its own `<svg viewBox>`, computes arcs/paths in a `computed()` and `@for`s them in its
template, and takes arbitrary color strings — cannot mount inside `<nge-chart>` and cannot
promote without a rewrite: none of its logic is a render fn, a config, or a `--nge-chart-*` theme.
(In ngx-experiments, `libs/ledger/design-library/src/lib/donut-chart/ldg-donut-chart.component.ts`
is exactly this shape — a cautionary example, not a template to copy.)

**Promotion-ready — do this instead.** Even a radial chart (donut/pie) fits the layer system.
For a donut, build:

- `render-donut-layer.ts` — a pure D3 fn that draws arcs into `context.bounds`, sizing from
  `context.dimensions` (a radial layer **ignores** `scales`, computing `center` / `radius`
  from `boundedWidth`/`boundedHeight` — the same way the bullet layer builds its own scale).
- a `NgeDonutLayerConfig` (`{ type: 'donut', data, renderer, thickness?, tooltip? }`) + a
  `NgeDonutDataPoint`.
- a `theme.donut` slice defaulting to the `--nge-chart-*` series tokens (not domain `--ldg-*`).
- `createDonutChartConfig(options)` returning
  `{ base: { showXAxis: false, showYAxis: false, margin: {…} }, layers: [{ type: 'donut', data, renderer: renderDonutLayer, … }] }`.

Consume it as `<nge-chart [config]="createDonutChartConfig({ data })" />`. If you want a
domain-branded element, wrap it in a **thin** domain component whose only job is to map domain
inputs → the preset → `<nge-chart>` — all real logic stays in the promotable render fn/preset.

**Incubate, then promote.** While unproven, keep the four pieces together in the domain (e.g.
`libs/<domain>/design-library/src/lib/charts/<name>/`). When approved:

1. Move `render-<name>-layer.ts` → `libs/shared/charts/src/lib/layers/<name>/`; the config →
   `core/config/`; the theme slice/defaults/merge → `core/theme/`; the preset → `presets/`.
2. Add `'<name>'` to the `NgeChartLayerType` union and the config to `NgeChartLayerDefinition`.
3. Export all four from the charts barrel; move the stories; delete the domain copies (and the
   thin wrapper, or repoint it at the now-shared preset).

Because the incubated chart already used the layer contract + `--nge-chart-*` tokens, promotion is
a move + a `type` registration — no logic changes.

---

## Testing under Jest (consumer libs)

Any lib or app that renders `<nge-chart>` (directly or via the design-library barrel) under
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

- **Consumer how-to (scatter)** — `docs/ai-instructions/procedures/nge-chart-scatter.instructions.md`
  (implement a production scatter/bubble chart end-to-end without reading library source)
- Token contract — `libs/shared/charts/src/lib/styles/_nge-chart-tokens.scss`
- Config / data types — `libs/shared/charts/src/lib/core/config/nge-chart-config.models.ts`
- Theme models / defaults / merge — `libs/shared/charts/src/lib/core/theme/`
- Axis rendering + grouping tiers — `libs/shared/charts/src/lib/core/axis/`
- Entry component + renderer — `libs/shared/charts/src/lib/nge-chart/`
- Layer render fns — `libs/shared/charts/src/lib/layers/`
- Presets — `libs/shared/charts/src/lib/presets/`
- Story generator — `.claude/skills/create-chart-storybook/SKILL.md`
- Archived design docs — `docs/architecture/chart-architecture/`
- Workspace invariants — `docs/ai/CONSTRAINTS.md`
