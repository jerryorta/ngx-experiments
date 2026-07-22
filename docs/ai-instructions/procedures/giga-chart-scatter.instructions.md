# GigaChart Scatter — Production Implementation Instructions

**Purpose:** Everything needed to implement a production scatter/bubble chart with `@gigasoftware/charts` — data model, preset options, multi-series, legend selection, zoom/pan/brush gestures, theming, testing — **without reading the library source**.

**When to use:** Any app feature that renders a scatter or bubble chart: single-series, multi-series comparison (groups/categories on shared axes), interactive series selection, or zoom/pan exploration.

**Canonical companion:** `docs/architecture/charts.md` (architecture, `--chart-*` token contract, layer authoring). This file is the consumer-side how-to; that file is the system reference.

---

## 0. TL;DR — the two production shapes

**Static / simple (no interactivity beyond tooltips):**

```ts
import { createScatterChartConfig } from '@gigasoftware/charts';

readonly config = computed(() =>
  createScatterChartConfig({
    data: this.points(),            // GigaScatterDataPoint[] from your store/facade
    legend: { enabled: true },      // auto-generated from seriesId
    tooltip: { enabled: true },
    showXAxis: true,
    showYAxis: true,
    xAxisLabel: 'Days on Market',
    yAxisLabel: 'Price Change %',
  })
);
```

```html
<!-- REQUIRED: explicit-height wrapper — the chart fills 100% and collapses to 0 without one -->
<div class="h-72">
  <giga-chart [config]="config()" />
</div>
```

**Interactive (series selection, zoom/pan/brush) — use the transform:**

```ts
import { GigaScatterChartTransform } from '@gigasoftware/charts';

// Plain class, NO providers/DI — hold it as a component field
readonly transform = new GigaScatterChartTransform({
  data: this.points(),                                  // points carry seriesId
  gestures: { brushZoom: true, pan: true, zoom: true },
  tooltip: { enabled: true },
  showXAxis: true,
  showYAxis: true,
});
```

```html
<div class="h-72">
  <giga-chart
    [config]="transform.config()"
    (legendItemClick)="transform.onLegendItemClick($event)"
    (chartGesture)="transform.onChartGesture($event)"
  />
</div>
```

Data updates: `this.transform.setData(newPoints)` (e.g. from an `effect()` watching your facade selector). Everything else is automatic.

---

## 1. Imports & exports

All from the barrel `@gigasoftware/charts` (project `shared-charts`):

| Export | Kind | Use |
|---|---|---|
| `GigaChartComponent` (`<giga-chart>`) | standalone component | the single chart host; input `config`, outputs `legendItemClick`, `chartGesture` |
| `createScatterChartConfig(options)` | preset factory | builds a complete `GigaChartConfig` |
| `GigaScatterChartTransform` | plain class | interaction semantics → derived config signal |
| `GigaChartLegendComponent` (`<giga-chart-legend>`) | standalone component | standalone/custom-placement legend |
| `GigaScatterDataPoint`, `ScatterChartPresetOptions`, `GigaScatterTransformOptions`, `GigaChartConfig`, `GigaChartGestureEvent`, `GigaChartGesturesConfig`, `GigaLegendItem`, `GigaChartLegendConfig` | types | as needed |
| `extractScatterChartLegendItems(data, seriesColors?, themeColors?)` | fn | legend items for fully custom legends |

---

## 2. Data model — `GigaScatterDataPoint`

```ts
interface GigaScatterDataPoint {
  x: number;            // REQUIRED — numeric only (linear scales)
  y: number;            // REQUIRED
  seriesId?: string;    // groups points into a named series (multi-series)
  color?: string;       // per-point override — ALWAYS wins over series/theme color
  size?: number;        // per-point radius px (bubble encoding) — overrides pointRadius
  opacity?: number;     // per-point opacity 0-1 — the series-fade primitive
}
```

**Color resolution order (per point):**
`point.color` → `seriesColors[i % len]` → `theme.scatter.point.colors[i % len]` → `theme.scatter.point.color` (`#1976D2`), where `i` is the series index in first-seen order. Points without `seriesId` form one implicit series (index 0 → theme primary).

**Radius:** `point.size ?? pointRadius ?? theme.scatter.point.radius (5)`.
**Opacity:** `point.opacity ?? theme.scatter.point.opacity (0.7)`.

---

## 3. Preset — `createScatterChartConfig(options)` full surface

| Option | Type / default | Notes |
|---|---|---|
| `data` | `GigaScatterDataPoint[]` **required** | |
| `seriesColors` | `string[]` | multi-series palette; cycles with modulo. Must be **browser-resolvable** colors (hex/rgb or `var(--chart-*)` — see §8) |
| `legend` | `Partial<GigaChartLegendConfig>` | `{ enabled: true }` auto-generates one entry per unique `seriesId` (empty for single-series). Sub-options: `position` (`'bottom'`\|`'top'`\|`'left'`\|`'right'`, default bottom), `interactive` (default false → entries become buttons + `legendItemClick` fires), `swatchShape` (default `'circle'` for scatter), `items` (explicit override) |
| `tooltip` | see below / disabled | `{ enabled: true }` gives the default series-aware formatter |
| `gestures` | `{ brushZoom?, pan?, zoom? }` / none | see §6 |
| `animationMs` | `number` / `300` | enter/update/exit transition duration; `0` = instant (the transform manages this during gestures — don't set manually when using the transform) |
| `pointRadius` | `number` / `5` | default point radius |
| `onClick` | `(event: { data, event, index }) => void` | per-point click (index = position in `data`) |
| `margin` | `{ top, right, bottom, left }` / `{20,10,45,45}` | give `left ≥ 50` + `bottom ≥ 45` when axes+labels shown |
| `showXAxis` / `showYAxis` | `boolean` / **`true`** | |
| `xAxisLabel` / `yAxisLabel` | `string` | |
| `xAxisTicks` / `yAxisTicks` | `number` / auto | |
| `xDomain` / `yDomain` | `[number, number]` | **explicit domain override** — skips data-driven domain + padding (the programmatic/axis-zoom hook) |
| `xDomainPadding` | `number` / `0.05` | fraction padding each side (ignored when `xDomain` set) |
| `yDomainPadding` | `number` / `0.1` | top padding fraction (ignored when `yDomain` set) |
| `yStartAtZero` | `boolean` / `false` | anchors y-min at 0 (no bottom padding) |

**Tooltip sub-options** (`tooltip`): `enabled`, `formatContent?: (point) => { label, value, extra? }` (default: `"<seriesId> · x: <x>" / y`), `position?: 'follow-mouse' | 'above' | 'below'` (default follow-mouse), `width?` (120), `height?` (65), `style?: { backgroundColor?, borderColor?, borderWidth?, divotHeight?, divotWidth? }`. Tooltip border defaults to the hovered point's resolved series color. Hit-testing is **Voronoi** — tooltips trigger when hovering *near* a point.

**Custom tooltip template** (projected, overrides the default bubble content):

```html
<giga-chart [config]="config()">
  <ng-template #gigaChartTooltip let-content>
    <strong>{{ content?.label }}</strong>
    <span>{{ content?.value }}</span>
    <!-- content.extra.seriesId is set by the default formatter -->
  </ng-template>
</giga-chart>
```

---

## 4. Multi-series

Give points a `seriesId` — that's the whole API:

```ts
data = [
  { seriesId: 'Q1', x: 10, y: 24 },
  { seriesId: 'Q2', x: 12, y: 50 },   // interleave freely; series share the axes
  { seriesId: 'Q1', x: 24, y: 30 },
];
```

- Each series renders in a distinct palette color (resolution order in §2); the legend (when enabled) lists each series with a circle swatch; the default tooltip prefixes the series name.
- Per-point `color`/`size` still override within a series (highlight one point, bubble-encode a third dimension).
- Renders as keyed `<g class="giga-scatter-series" data-series-id="...">` groups with ONE Voronoi overlay across all series — hover always highlights the correct point.
- Series order (and palette assignment) = first-seen order of `seriesId` in `data`.

---

## 5. Interactivity — `GigaScatterChartTransform`

The production pattern for anything interactive. A **plain class** (no DI, no providers — same idiom as `ChartsTooltipCalc`); it owns interaction state and derives the config; the chart stays dumb. Signals inside, so it composes with any component.

**Constructor options** = ALL preset options (§3) **plus**:

| Option | Default | |
|---|---|---|
| `fadedPointOpacity` | `0.15` | opacity applied to non-selected series' points while a series is selected |
| `fadedLegendOpacity` | `0.4` | same for legend entries (higher for label readability) |

**Behavioral defaults:** the transform forces `legend: { enabled: true, interactive: true }` (your `legend` options override — pass `legend: { enabled: false }` to suppress the internal legend, e.g. when using an external one).

**API:**

| Member | Purpose |
|---|---|
| `config: Signal<GigaChartConfig>` | bind: `[config]="transform.config()"` |
| `legendItems: Signal<GigaLegendItem[]>` | selection-stamped items for an EXTERNAL legend; populated even when the internal legend is disabled |
| `selectedSeries: Signal<string \| null>` | current selection (for status text etc.) |
| `onLegendItemClick(item)` | wire to `(legendItemClick)` — toggles selection (click again = clear) |
| `onChartGesture(event)` | wire to `(chartGesture)` — pan/zoom/brush/reset math |
| `selectSeries(id \| null)` / `clearSelection()` | programmatic selection |
| `setData(points)` | replace data (selection + zoom preserved) |
| `updateOptions(partial)` | merge any preset/transform options (for option-driven consumers: Storybook controls, app filter panels) |
| `setXDomain([min,max] \| null)` / `setYDomain(...)` / `resetZoom()` | programmatic axis zoom (null/reset = data-driven domains) |

**Selection semantics:** clicking a legend entry keeps that series at full prominence and fades every other series (points → `fadedPointOpacity` via per-point `opacity`; legend entries → `fadedLegendOpacity` + `selected`/aria-pressed). Fading uses **opacity, never color math** — series colors are often unresolved `var(--chart-*)` strings that JS cannot derive a "faded" version of. Source data is never mutated.

**Feeding data from your store:** the transform is chart-interaction state, not app state. Keep domain data in your NgRx store/facade (or component signalStore) and push it in:

```ts
constructor() {
  effect(() => this.transform.setData(this.facade.scatterPoints()));
}
```

---

## 6. Gestures — zoom / pan / brush-zoom

Enable via `gestures` (preset or transform options) and wire `(chartGesture)`:

| Gesture | Trigger | Behavior |
|---|---|---|
| Zoom | mouse wheel over the plot | zooms around the cursor; clamped ×0.5–×2 per wheel event; page scroll suppressed over the plot |
| Pan | click-drag | 3px threshold protects point clicks; grab/grabbing cursor; native text selection suppressed; the click after a drag is swallowed (point `onClick` won't fire) |
| Brush-zoom | **Shift+drag** (plain drag if `pan` is off) | draws a token-styled rectangle (clamped to the plot); release zooms to exactly that rect, **animated**; < 5px selections ignored; crosshair cursor in brush-only mode |
| Reset | double-click on the plot | back to data-driven domains, animated |

Notes:
- **Marks are clipped to the plot area automatically** (base-layout `clipPath`) — zoomed/panned points never spill over axes or margins.
- During continuous gestures the transform renders with `animationMs: 0` (no smearing); brush-zoom, reset, and selection changes restore the 300ms transitions.
- Events are **stateless** (`GigaChartGestureEvent` carries current domains + data-space deltas/extents) — if you skip the transform, you can consume `(chartGesture)` yourself with pure math; there is no hidden d3-zoom element state.
- Touch/pinch is not implemented yet (the event union is designed to extend).

---

## 7. Legends — internal, external, fully custom

**Internal (default):** `legend: { enabled: true }` — rendered by `<giga-chart>` at `position`; interactive when `interactive: true`.

**External / custom placement** (page header, side panel): suppress the internal one and drive the standalone component from the transform:

```ts
transform = new GigaScatterChartTransform({ data, legend: { enabled: false }, ... });
```

```html
<div class="flex items-center justify-between">
  <h3>Market segments</h3>
  <giga-chart-legend
    [items]="transform.legendItems()"
    [interactive]="true"
    swatchShape="circle"
    (itemClick)="transform.onLegendItemClick($event)"
  />
</div>
<div class="h-72"><giga-chart [config]="transform.config()" (chartGesture)="transform.onChartGesture($event)" /></div>
```

`<giga-chart-legend>` inputs: `items` (required), `orientation` (`'horizontal'` default | `'vertical'`), `interactive` (false), `swatchShape` (`'square'` default | `'circle'` | `'line'`). Output: `itemClick(GigaLegendItem)`.

**Fully custom legend (build guideline):** consume `GigaLegendItem[]` — `{ id?, color, label, opacity?, selected? }` — render however you like (respect `opacity` for fade, `selected` for aria-pressed), and emit the clicked item back to `transform.onLegendItemClick`. Anything speaking this contract stays compatible with the transform.

---

## 8. Theming

- Colors resolve through the domain-agnostic **`--chart-*` token contract** (defaults in the lib render correctly with no theme). Default series palette: `var(--chart-primary)`, `var(--chart-secondary)`, `var(--chart-tertiary)`, `var(--chart-error)`, `#4CAF50`, `#FF9800` — themed apps recolor series via their token bridge, not code.
- Per-persona bridges live in each domain's themes lib (`libs/media-workbench/themes/...`, `libs/concierge/themes/...`, `libs/cognition/themes/...`) — see `libs/shared/charts/AGENTS.md` for the live list. Real-estate has no bridge (its charts pass literal colors).
- Theme overrides per chart: spread `theme.scatter.point` onto the preset's config — `{ ...createScatterChartConfig({...}), theme: { scatter: { point: { color: '#4CAF50', opacity: 0.5, strokeColor: '#2E7D32', strokeWidth: 2 } } } }`. Fields: `color`, `colors[]` (series palette), `opacity`, `radius`, `strokeColor`, `strokeWidth` (`hoverColor` exists but is not applied — hover keeps the series color and grows the radius).
- **`var()` caveat:** point fill/stroke are applied as D3 *styles*, so `var(--chart-*)` values resolve in the chart's DOM context — but a `var()` string is NOT resolvable in JS. If you compute anything from a color (e.g. your own scale), pass resolved colors. `seriesColors` with `var(--chart-*)` entries is fine.
- No Angular Material anywhere (`--mat-sys-*` is banned; legacy EC/RE only).

---

## 9. Testing in a consumer app (Jest)

Any project that renders `<giga-chart>` needs two shims (jsdom lacks the primitives):

1. **`ResizeObserver` stub** in the project's `test-setup.ts`:
   ```ts
   global.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as never;
   ```
2. **d3 is pure ESM** — the project's `jest.config` `transformIgnorePatterns` must transform: `d3-.*|internmap|delaunator|robust-predicates` (the last three are transitive deps of `d3-scale`/`d3-delaunay`).

Assertion rules:
- The SVG lives in a **shadow root** — `document.querySelector('giga-chart svg')` returns nothing. Reach it via `element.querySelector('.giga-chart-container').shadowRoot`.
- Geometry (`r`, `cx`, `opacity`) animates via d3 transitions — jsdom fake timers do NOT drive them; use real-timer waits (~400ms past `animationMs`) or set `animationMs: 0`.
- Transform logic needs **no TestBed** — instantiate the class and assert on `transform.config()` / `legendItems()` directly (pure functions of state).
- Legend clicks/aria: TestBed the standalone `GigaChartLegendComponent` with `fixture.componentRef.setInput(...)`.

---

## 10. Production checklist & gotchas

- [ ] `<giga-chart>` sits inside an **explicit-height** container (`h-64`/`h-72`/`height: 300px`) — it fills 100% and collapses to nothing otherwise.
- [ ] Data is numeric `x`/`y` (no strings/dates — scatter scales are linear).
- [ ] Multi-series data spans a shared x-range if series are meant to be compared (don't band series into separate x-regions).
- [ ] `seriesColors` shorter than the series count is fine — it cycles, and the legend cycles identically.
- [ ] Interactive chart? → transform + BOTH outputs wired (`legendItemClick`, `chartGesture`). Missing wiring fails silently (buttons click, nothing happens).
- [ ] Don't rebuild the transform per change — one instance per chart, push changes via `setData`/`updateOptions`.
- [ ] Zoomed domains persist across `setData` — call `resetZoom()` when new data makes old domains meaningless.
- [ ] d3 transitions pause in hidden/occluded tabs (rAF) and complete on visibility — don't chase "frozen" charts in background windows; it's browser behavior, not a bug.
- [ ] Config-driven re-render is debounced ~16ms — pushing a new config per store emission is fine; avoid per-frame config churn outside the gesture path (the transform already handles gesture-rate updates).
- [ ] `verify-theming` / a11y: interactive legend entries are real buttons with `aria-pressed` out of the box.

## 11. Working references

- **Live examples (Storybook, `Charts → GigaChart → Scatter Chart`):** usage Examples 1–11 (basics → multi-series → legend selection), interaction stories `MultiSeries`, `ExternalLegend`, `ZoomPan` — source under `libs/shared/charts/src/lib/giga-chart/stories/scatter-chart/`.
- **Production consumer:** RE property analytics — `libs/real-estate/ui/src/lib/google/mls-property-search/property-analytics/property-analytics.component.ts` (single-series scatters + composed trend-line layer + custom scaleFactory).
- **Library internals** (only if extending the lib itself): `docs/architecture/charts.md`, then `libs/shared/charts/src/lib/{presets,transforms,layers/scatter,core}`.
