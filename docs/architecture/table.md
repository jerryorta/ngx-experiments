# NgeTable — `@nge/table`

> **Status: Waves 0–5 complete (ARCH-239).** Wave 0 shipped the core and all four extension axes —
> the library shell, naming convention and `--nge-table-*` tokens (ARCH-240), the shared fixture
> (ARCH-241), `<nge-table>` with the controlled-state contract (ARCH-242), the three-lane substrate
> and multi-column pinning (ARCH-243), column drag-to-resize (ARCH-244), row virtualization
> (ARCH-245), the render-slot (ARCH-246), event-stream (ARCH-247) and data-pipeline (ARCH-248)
> seams, and the story conventions plus `/create-table-storybook` (ARCH-249).
>
> Wave 1 then **passed the extensibility gate**: highlighting (ARCH-250) found the state axis
> non-additive and fixed it with one general seam change, after which CSV export (ARCH-251) needed
> no core edit at all — later given opt-in formula-injection escaping (ARCH-273) and proven from
> outside the library entirely (ARCH-274). Wave 2 added row selection (ARCH-268) with a swappable
> control (ARCH-278), cell ranges (ARCH-269) and column selection (ARCH-270). Wave 3 crossed the
> data boundary with the fill handle and `fill-intent` (ARCH-271) — the library proposes, the host
> applies. Wave 4 bridged the tokens into all ten domain themes (ARCH-277), and Wave 5 honoured the
> last unconsumed one with zebra striping (ARCH-286).
>
> **Wave 6 — rich cells is in flight**, where "a cell is an arbitrary Angular render target" stops
> being a claim. The scroll performance harness landed first so the wave's own thesis is falsifiable
> (ARCH-289), then the fixture's rich-cell fields — a numeric series, long text and an image
> (ARCH-290), and then the claim itself: charts in cells, with a scroll-settle signal on the cell
> context and a shell to render while a flick is in progress (ARCH-291, which needed no
> charts-library change and no scroll listener of its own — the virtualizer already had one), and
> then the control half of the same claim: inline editing as a cell pattern (ARCH-292 — an activation
> model, an `edit-intent` kind, a role-based interactive-element guard and keyboard containment, with
> no editor components of its own), and then the editors themselves, behind a third entry point and
> reached by a column naming a component rather than a consumer writing a template: an input and a
> checkbox (ARCH-293), a select over a CDK overlay (ARCH-294), and a textarea whose commit is explicit
> because every implicit moment the other three use is unavailable to it (ARCH-296). The store was
> regrouped into six `signalStore` features along the way (ARCH-297).
>
> Sections below marked _(pending)_ are deliberate placeholders — fill them in with the story that
> ships the behaviour, never ahead of it.

`@nge/table` (`libs/shared/table`, project `shared-table`, prefix `nge`, selector
`<nge-table>`) is a reusable table built on the **headless** `@tanstack/table-core` engine. It is
architected like [`@nge/charts`](./charts.md): a solid core with **pluggable seams**, so new
features land as additions rather than rewrites.

Concierge is the first consumer (replacing `libs/concierge/design-library/src/lib/cg-data-table`);
cognition follows. **Evolving Cognition and Real Estate are out of scope** — their `matColumnDef`
sites belong to the sunsetting legacy apps and must not shape this design.

## Naming convention

`Nge` / `nge` / `NGE` on everything we own, so nothing collides with TanStack's deliberately
generic exports.

| Kind | Convention | Example |
| --- | --- | --- |
| Types / interfaces / classes | `Nge` prefix | `NgeTableConfig`, `NgeTableColumn`, `NgeTableFeature`, `NgeTableEvent` |
| Constants / injection tokens | `NGE_` prefix | `NGE_TABLE_DEFAULTS`, `NGE_TABLE_SLOT` |
| Component / directive classes | `Nge` prefix | `NgeTableComponent`, `NgeCellDirective` |
| Selectors / attribute directives | `nge` prefix | `nge-table`, `[ngeCell]`, `[ngeTableSlot]` |
| CSS custom properties | `--nge-table-*` | `--nge-table-surface`, `--nge-table-row-height` |
| Factory functions | `Nge` prefix **when the bare name would be generic** | `createNgeTableConfig()` |

**TanStack's own interfaces are NOT re-namespaced.** `Table`, `Column`, `Row`, `Cell`, `Header`,
`ColumnDef`, and `TableFeature` are imported and used as-is. The `Nge` prefix exists so *our*
surface never collides with theirs.

The factory rule follows charts by intent, not by letter: `createBarChartConfig` needs no prefix
because "BarChart" is already unambiguous, whereas a bare `createTableConfig` is not.

`--nge-table-*` matches charts' `--nge-chart-*` — every shared library owns a `--nge-<lib>-*`
namespace. It earns its keep here: `table` is a far more common word in app CSS than `chart`, and
minimal collision is a stated goal.

**Consumers must never import `@tanstack/*`.** They see `NgeTableConfig` and the `nge`-prefixed
surface only. That insulation is what keeps a future TanStack v9 migration internal to the library.

## Architecture — the four extension axes

Charts has one extension axis (layers); a table has four. **All four must exist by the end of
Wave 0, even if nearly empty** — retrofitting a seam later *is* the rewrite this library exists to
avoid. Adding a feature must be **additive**: a new file plus a barrel export, never a change to a
central switch.

| Axis | Mechanism | Provided by | Story |
| --- | --- | --- | --- |
| Behaviour / state | `TableFeature` registered via TanStack's `_features` array | TanStack | ARCH-248 (`provideNgeTableFeatures`) |
| Render slots | named `TemplateRef` registry (cells, headers, overlays, footer, row detail, empty, loading) | us | ARCH-246 |
| Data pipeline | readers over the **processed** row model (post-filter / post-sort) | us | ARCH-248 |
| Events | one `kind`-discriminated `NgeTableEvent` output — never N separate outputs | us | ARCH-247 |

**Behaviour extensibility is TanStack-native, not invented here.** `table-core`'s `core/table.ts`
composes `[...builtInFeatures, ...(options._features ?? [])]` — the built-in features are ordinary
`TableFeature` objects with no privileged status, so a custom feature registers identically. Same
property as the charts layer registry: the thing carries its own logic, the core iterates, there is
no central switch to edit.

Addons namespace their `TableMeta` / `ColumnMeta` declaration-merge keys; never add bare fields.

### The extensibility gate

The core is not "done" when it renders. It is done when **cell highlighting** (ARCH-250) and
**CSV export** (ARCH-251) can be added as addons touching **zero core files**. Highlighting spans
three axes at once (state + cell styling + export), and highlighted-cell export forces two
independent addons to compose without importing each other. If either forces a core edit, the seams
are wrong — and that is discovered while it costs a day rather than after five consumers depend on
it.

## Substrate — the locked rendering decisions

These were each argued and settled. Do not re-litigate them; do not "optimize" past them without
re-testing the failure each one prevents.

**Flexbox lanes, NOT CSS Grid, NOT a semantic `<table>`.** Three lanes per row — pinned-left,
center, pinned-right. Pinning is `position: sticky` **on the lane wrapper, never per-cell**. Lane
geometry comes from the engine (`table.getLeftTotalSize()` and friends, the same reduction that
backs `column.getStart('left')` / `getAfter('right')`), never from hand-rolled arithmetic.

> CSS Grid was evaluated and rejected. Its only real advantage is intrinsic column sizing, which
> this product explicitly does not want — columns take explicit widths the **user drags**,
> Excel/Numbers style. It is also structurally incompatible: a sticky lane wrapper cannot be a grid
> item, and `display: contents` cannot be sticky because it generates no box.

### The lane substrate in practice (ARCH-243)

```
.nge-table                      host — carries the --nge-table-internal-* geometry
  .nge-table__viewport          overflow: auto · role="grid" aria-rowcount aria-colcount
    .nge-table__header          position: sticky; top: 0 · role="rowgroup"
      .nge-table__header-row    display: flex · role="row" · owns the header band's background
        .nge-table__lane--pinned-left    sticky left  · role="presentation"
        .nge-table__lane--center                      · role="presentation"
        .nge-table__lane--pinned-right   sticky right · role="presentation"
    .nge-table__body            role="rowgroup"
      .nge-table__row × n       display: flex · role="row" · the same three lanes
```

**Why multiple pinned columns work.** The predecessor pinned per cell, so every frozen column
claimed `left: 0` and they stacked on top of one another — its own source says so
(`libs/concierge/design-library/src/lib/cg-data-table/cg-data-table.component.ts`). Here the pinned
cells are ordinary flex children of **one** sticky wrapper, so there is no per-cell offset for a
second frozen column to collide with. Three, or thirty, cost the same one sticky box.

**One scroll viewport, not two.** AG Grid gives the header its own scroller and keeps the two in
step with a scroll listener. Sharing a single viewport makes "header lanes stay aligned with body
lanes" structural instead of synchronised, and nested sticky — `top` on the header band, `left` /
`right` on the lanes inside it — is what produces the frozen corner. The header's z-index outranks
the lanes' precisely because the two stickies cross there.

**Bound the height on `<nge-table>`, not on a wrapper.** The host is a flex column and the viewport
is `flex: 1 1 auto; min-height: 0`, so a `height` or `max-height` on the host constrains the
scroller. A `max-height` on an ancestor `div` is simply overflowed — the scroller grows to fit every
row, nothing scrolls vertically, and the sticky header has nothing to stick against. With no height
set the column collapses to its content, so this costs an unbounded table nothing.

**Empty lanes are dropped, not rendered.** An unpinned table — the common case — renders exactly one
wrapper per row. The template `@for`-iterates lanes rather than branching on them, so each lane
carries the kind it is and a new lane kind is an entry in `toNgeTableLanes()` plus a CSS class,
never an edit to a central switch.

**Lane widths travel as `--nge-table-internal-*` properties on the host,** written once per state
change by `<nge-table>` and read by every lane and row rule. Inline widths would mean touching
3 × (rows + 1) elements per pin or resize, which stops scaling exactly when virtualization makes it
matter; AG Grid uses the same idiom (`--ag-internal-pinned-left-sticky-offset`). The `internal`
segment marks them as runtime measurements rather than part of the themeable contract — they are
deliberately absent from `_table-tokens.scss`, because there is nothing for a theme to say about
them and overriding one breaks layout rather than restyling it.

**ARIA.** `role="grid"` on the viewport with `aria-rowcount` / `aria-colcount`, `role="row"` /
`columnheader` / `gridcell`, and **`role="presentation"` on every lane wrapper** so its cells are
re-parented onto their row in the accessibility tree. Each cell also carries `aria-colindex` from its
position across the lanes, because pinning is precisely what makes DOM order diverge from the order
the columns were declared in.

**Capability flags gate the effect, not just the affordance.** `enablePinning: false` suppresses the
lanes even when `state.columnPinning` names columns — matching `enableSorting`, which the engine
already filters through `column.getCanSort()`. The engine's pinning feature reads
`state.columnPinning` raw and never consults `getCanPin()`, so `buildTableOptions` blanks the pinning
on the way in. The host's own state is never rewritten: a saved view keeps its frozen columns across
a toggle of the flag.

**Virtualized rows position with `top`, NEVER `transform: translateY`.** A transform creates a
stacking context, which breaks sticky pinned cells. AG Grid hit this exact wall and switched to
top-positioning (`packages/ag-grid-community/src/rendering/row/rowCtrl.ts`, reference clone at
`../open-source/ag-grid`). Virtualization and pinning both ship in Wave 0, so this is
non-negotiable.

**Controlled state from the first commit.** Sorting, filtering, pagination, sizing, order,
visibility, pinning, selection, and expansion state all live **outside** the table instance and are
handed in via `state`, with every `onXChange` wired and re-emitted. Never read state back off the
table instance as a source of truth. Client-side ships first, but this is the only thing that makes
server-side a later `manualSorting` / `manualFiltering` / `manualPagination` flag flip instead of a
per-feature rewrite.

**A cell is an arbitrary Angular render target** — charts, inputs, graphics. Inline editing is
therefore a *cell pattern*, not a table feature. Two consequences:

- A `<nge-chart>` is sized in **percentages** and attaches a shadow root (see
  [charts.md](./charts.md) § Shadow-DOM isolation), so it needs an ancestor with a *definite*
  height and collapses in a `height: auto` box. ⚠️ A cell already is one — `height:
  var(--nge-table-row-height)`, never `auto` — so no wrapper is needed there; `config.rowHeight`
  is what gives it room.
- Virtualization **recycles DOM**, so cell content must re-derive from state on every render and
  must never hold state locally.

## Theming — the `--nge-table-*` token contract

Defaults live in `libs/shared/table/src/lib/styles/_table-tokens.scss` as a `:root` block of
**literal light-mode values**, forwarded through `_theming.scss` → `_index.scss`. A domain theme
overrides them by re-declaring the same custom properties inside its theme class selector; class
selectors outrank `:root`, so theme values always win.

**Angular Material is banned in this library.** Never `--mat-sys-*`, never `mat-*`. The literal
defaults are what let the table render correctly with **no theme applied at all** — that
self-sufficiency is the point of owning the namespace.

Token groups: surface · content · border · metric · typography · pinning · interaction. Read the
partial for the current list; it is commented per group and is the source of truth.

**Consumption rule — always pair a token with a literal fallback at the use site:**

```scss
.nge-table__cell {
  padding-inline: var(--nge-table-cell-padding-x, 12px);
  color: var(--nge-table-on-surface, #1d1b20);
}
```

The `:root` block guarantees the token exists once the partial is imported; the fallback guarantees
the table still renders if a consumer forgets to import it. Both layers are required — this matches
the `libs/shared/calendar` precedent named in `docs/ai/CONSTRAINTS.md`.

**Pinned lanes must keep an opaque background.** `--nge-table-pinned-surface` defaults to a solid
colour on purpose: a pinned lane is sticky and scrolls *over* the center lane, so a transparent
background shows the center cells bleeding through underneath. A pinned lane inside the header takes
`--nge-table-pinned-header-surface` instead — it sits on the header band rather than on a row, and
the row-flavoured surface would punch two pale rectangles through it.

**`--nge-table-internal-*` is not part of this contract.** Those properties carry live lane geometry
that `<nge-table>` writes on its own host, so they have no meaningful default and are absent from
the partial. Overriding one from a theme breaks layout rather than restyling it. Everything in
`_table-tokens.scss` is the opposite: a value a consumer is invited to change.

### Geometry is mirrored in TypeScript

A handful of metric tokens are duplicated in `NGE_TABLE_DEFAULTS`
(`src/lib/nge-table-defaults.ts`) because layout code needs them as numbers: virtualization
computes scroll offsets arithmetically from the row height, and the resize drag clamps against the
width bounds. Neither can measure a DOM node — the rows being positioned are precisely the ones not
yet rendered. `nge-table-defaults.spec.ts` asserts parity between the two sources, so they cannot
drift silently. **Change one, change both.**

## Public API

The library has **three** entry points, and the split is structural rather than a matter of
discipline: what ships from the main barrel is what every table needs, and the two secondary ones
carry what only some do — which is also what keeps a dependency of theirs from becoming the core's.
`src/entry-points.spec.ts` walks the barrel's transitive import closure and fails if it ever reaches
either, because "the core does not import this" is exactly the kind of claim that decays in silence
the first time someone adds a convenient re-export.

`@nge/table` — the production surface: the `<nge-table>` component, `NgeTableConfig` +
`createNgeTableConfig()`, `NgeTableState` + `createNgeTableState()`, `NgeTableColumn`,
`NGE_TABLE_DEFAULTS`, the render-slot seam (`NgeCellDirective`, `NgeTableSlotDirective`,
`NGE_TABLE_SLOT_NAMES`, and the slot context types), the event-stream seam (`NgeTableEvent`,
`NgeTableEventKind`, `NGE_TABLE_EVENT_KINDS`), the export seam (`toNgeTableExportData`,
`NgeTableExportData`, `NgeTableExportOptions`, `NgeTableExportSlice`, `NgeTableColumnExport`),
and the feature-registration axis (`provideNgeTableFeatures`, `NGE_TABLE_FEATURES`,
`NGE_TABLE_CORE_FEATURES`).

`@nge/table/editors` — the table's own cell editors (`NgeCellInputComponent`,
`NgeCellCheckboxComponent`). Most tables display rather than edit, so an editor is optional; keeping
them out here is what stops a dependency one of them needs from becoming the table's. See § Cell
editors.

`@nge/table/testing` — the shared fixture, kept out of the production barrel on purpose so
a 10,000-row generator is not one autocomplete away in application code. See § Testing.

```html
<nge-table [config]="config" [(state)]="tableState" />
```

```ts
config = createNgeTableConfig<Row>({ columns, data, getRowId: row => row.id });
tableState = signal(createNgeTableState());
```

`NgeTableColumn<TRow, TValue>` is a thin alias over TanStack's `ColumnDef`. Aliasing is not
re-namespacing: TanStack's interfaces stay as-is *inside* the library, and the alias exists only so
`@tanstack/*` never appears in a consumer's imports — the insulation that keeps a future v9
migration internal. It is imported from `@tanstack/angular-table` rather than
`@tanstack/table-core`, because the adapter is the package the workspace declares and re-exports the
core wholesale.

### `<nge-table>` and the controlled-state contract (ARCH-242)

`config` describes what the table **is** — rows, columns, geometry, which capabilities are switched
on. `NgeTableState` is what the user has **done** to it — sorting, filters, pagination, sizing,
order, visibility, pinning, selection, expansion. Collapsing the two is how tables end up unable to
restore a saved view, so the split is enforced at the boundary.

The component provides a component-scoped `NgeTableStore` (`@ngrx/signals`, `providers:` on the
component, never `providedIn: 'root'`) which owns the engine instance and the **effective** state.
Three properties follow from that, and each is load-bearing:

- **The store, never the engine, is the source of truth.** The engine is handed `state` on every
  recompute and its `onXChange` callbacks route straight back into the store. Client-side this is
  indistinguishable from letting the engine keep its own state — which is exactly the trap. Only
  this arrangement makes server-side mode a later `manualSorting` / `manualFiltering` /
  `manualPagination` flag flip instead of a rewrite of every feature that touched the internal copy.
- **`NgeTableState` is declared, not aliased** to TanStack's `TableState`. It is deliberately
  narrower — filter payloads are `NgeTableJsonValue` rather than `unknown` — so "this state can be
  persisted to Firestore" is a compile-time property rather than a convention nobody checks until a
  `Date` comes back as a string. A spec asserts the JSON round trip.
- **Binding is optional.** Bind `[(state)]` and the host owns the view, ready to save and restore.
  Bind neither half and the store's own copy keeps the table usable out of the box. The loop between
  the two is closed by reference identity: the component tracks the last object that crossed the
  boundary and skips whichever direction already carries it, so a two-way binding cannot oscillate.

**`buildTableOptions` is the only place `@tanstack/*` option names appear.** That single translation
point is what makes the facade real rather than nominal — a v9 rename lands there and nowhere else.
All ten state slices are already routed through it even though only the core and sorted row models
are wired today; turning on filtering, selection, expansion, grouping, or pagination is an options
line rather than a redesign. Shipping the whole contract in Wave 0 is what buys that.

### Column resizing (ARCH-244)

`enableColumnResizing: true` puts a grip on each header's trailing edge. Columns **never** size
themselves to their content — a width is whatever the user last dragged it to, Excel / Numbers
behaviour, and that requirement is what ruled out CSS Grid in the first place. Widths live in
`state.columnSizing`, so they persist and restore with the rest of the view.

**The library owns the gesture; the engine owns everything downstream of the number.** Once a width
lands in state, `column.getSize()`, `getStart()` / `getAfter()`, and the lane totals behind
`--nge-table-internal-*` all recompute on their own — which is why resizing a *pinned* column keeps
every sticky offset correct without a line of resize code knowing pinning exists.

**`header.getResizeHandler()` is deliberately unused.** Despite the name it is a mouse-and-touch
handler: it branches on `isTouchStartEvent` and attaches `mousemove` / `mouseup` *or* `touchmove` /
`touchend` to the document (`table-core/src/features/ColumnSizing.ts:343-513`). Using it would mean
two bindings, no pointer capture, and a document listener outliving a header that virtualization
recycled. Instead `<nge-table>` runs one `pointerdown` → `setPointerCapture` → `pointermove` →
`pointerup` / `pointercancel` gesture — one path for mouse, trackpad, touch and pen — following the
same shape as `libs/shared/charts/src/lib/core/gesture/range-axis-brush.ts`. What *is* kept is the
engine's arithmetic, reimplemented in `store/nge-table-resize.ts`: the drag is expressed as a
percentage of the grabbed header's starting width and applied to each of its leaves, so a grouped
header widens its children in proportion instead of dumping the delta on one.

**Widths are clamped on the write, not only on the read.** The engine clamps inside `getSize()`
(`ColumnSizing.ts:262-272`) and its own drag math clamps to `>= 0` alone, so an engine-driven resize
renders correctly while leaving out-of-range numbers in `state.columnSizing` — precisely the object a
consumer persists. Clamping as the width is written keeps the emitted state as honest as the render.
Bounds come from `columnDef.minSize` / `maxSize`, which the engine has already merged with the
config's `columnMinWidth` / `columnMaxWidth` (`core/column.ts:71-74`), so a per-column override wins
with no precedence logic of ours.

**The capability flag gates the affordance, and that is the whole of it here.**
`column.getCanResize()` reads `columnDef.enableResizing ?? true` **&&** `options.enableColumnResizing
?? true`, so unlike pinning the engine already honours the flag and no `applyPinningCapability`
sibling is needed. A width the *host* set still applies with the flag off, and that asymmetry with
pinning is intended: switching resizing off withdraws the user's ability to drag, it does not
discard widths the application chose.

**Keyboard.** The grip is pointer-only and `aria-hidden`; the keyboard path lives on the header cell,
which is focusable when it can be sorted **or** resized. `Shift` + `←` / `→` steps the width by 16px
and `Shift` + `Home` resets it — `Shift`-modified so the plain arrows stay free for the grid
navigation the later a11y story will add, and on the cell so the header keeps one tab stop per column
rather than two.

**Two layout consequences.** A header cell does **not** clip (`overflow` moved to
`.nge-table__cell` alone) because the grip straddles the cell's trailing edge — the label keeps its
own ellipsis, so nothing is lost. And the grip carries **`touch-action: none`**, without which the
browser claims the gesture for scrolling and never emits `pointermove`: the grip would silently do
nothing on a touchscreen, with no error to explain it.

### Row virtualization (ARCH-245)

`enableVirtualization: true` renders only the rows near the viewport. The body is given the whole
dataset's height so the scrollbar still describes it, and each rendered row is placed inside that box
at its own offset. Ten thousand rows cost a DOM of tens.

Off by default, unlike `enableSorting`. It changes what the table *is* rather than what it can do: a
windowed row is **positioned** rather than laid out, and that has two prices worth paying only when
the row count demands it — the table needs a bounded height (`height` / `max-height` on
`<nge-table>` itself, never a wrapper), and the row height becomes arithmetic.

**Rows position with `top`. Never `transform: translateY`.** A transform creates a stacking context,
and a stacking context breaks `position: sticky` for everything inside it — which here is every
pinned lane. AG Grid hit exactly this and switched to top-positioning
(`packages/ag-grid-community/src/rendering/row/rowCtrl.ts:163-167`, reference clone at
`../open-source/ag-grid`). This is the single constraint the story exists to honour, and it fails
invisibly: a transform looks correct right up until a column is pinned.

**The window is cut from the processed row model**, not from `config.data`. A sort reorders the rows
the window is taken from, so virtualization follows sorting, filtering, and everything else on the
data-pipeline axis without knowing any of them exist.

**`scrollMargin` is load-bearing, and it is the one number easy to get wrong.** The header shares the
body's scroll viewport and is sticky *in flow*, so the rows begin a header's height down the
scrollable content. The virtualizer compares its window against the viewport's `scrollTop`, so
without being told about that space its window sits a header too low and a blank strip appears under
the header mid-scroll. `NgeTableStore.scrollMargin` supplies it as *header-row count* × header
height (grouped columns stack a header row per level). TanStack then folds the margin into every
measurement's `start` while leaving it out of `getTotalSize()`, so `toNgeTableVirtualRows` subtracts
it back off — `start` is an offset within the viewport, `start - scrollMargin` is the offset within
the body, and the body is what the row sits inside.

**`enabled` is a real capability gate.** `virtual-core` reads it in `_willUpdate` (the scroll element
is not even resolved when false) and again in `getMeasurements`, which returns `[]` and clears its
caches — so with virtualization off the instance exists but installs no `ResizeObserver`, attaches no
scroll listener, and measures nothing. This is the asymmetry check this epic has had to make by hand
for pinning; here the engine gets it right on its own and no `applyPinningCapability` sibling is
needed.

**The row height token is pinned while virtualization is on.** `--nge-table-row-height` is normally
themeable and `applyGeometry` hands it back to the theme when the config names none. Virtualized, the
resolved value is always written to the host instead: offsets are computed as `index × rowHeight`, so
a theme moving the token out from under that arithmetic would not restyle the table, it would overlap
its rows.

**One template path.** `NgeTableStore.renderedRows` returns `{ row, ariaRowIndex, top }` — the window
when virtualization is on, every row with `top: null` when it is off. The template binds `top`
unconditionally and Angular drops the property on `null`, so the row loop has no branch and the
un-virtualized table stays in normal flow.

**`aria-rowindex` becomes mandatory**, on header rows and body rows alike. With most rows absent, an
assistive technology counting what it can see announces row 4 of 27 for a table of ten thousand;
`aria-rowcount` alone cannot fix that.

**Fixed row height only.** Measuring a row means rendering it first, and the rows being positioned
are precisely the ones not yet rendered. Variable / measured heights (`measureElement`), header and
column virtualization, and `scrollToIndex` affordances are all deliberately out of scope for this
story.

### Render slots (ARCH-246)

Extension axis 2 of 4 — **where consumer-supplied Angular content plugs in**. A consumer projects
`ng-template`s into `<nge-table>`; the table looks each one up and renders it where it belongs,
without ever knowing what is inside.

```html
<nge-table [config]="config">
  <ng-template ngeCell="amount" [ngeCellOf]="rows" let-cell>
    <strong>{{ cell.row.amount | currency }}</strong> · {{ cell.row.owner.name }}
  </ng-template>

  <ng-template ngeTableSlot="empty" let-table>
    Nothing matched across {{ table.columnCount }} columns.
  </ng-template>
</nge-table>
```

**Cells are addressed by column, everything else by name.** `[ngeCell]` takes a column id and a
column without one keeps rendering its `columnDef.cell` — so adopting a custom cell is a per-column
decision, and a table nobody projected into renders exactly what it rendered before this seam
existed. `[ngeTableSlot]` takes one of `cell-overlay`, `empty`, `footer-cell`, `header-cell`,
`header-overlay`, `loading`, `row-detail`, `toolbar`; the four column-shaped names also accept
`ngeTableSlotColumn`, and a column-scoped template beats the shared one, so the general case and
its exception can be declared side by side.

**A slot is a place, not a state.** Its template renders whenever one is registered, and whether
anything appears is the consumer's decision, taken from the context they are handed. That is why
`loading` needs no `config.loading` flag and `row-detail` needs no expansion feature: the template
gates itself on `isExpanded` (which `state.expanded` already carries), and the table gains no
coupling to how a consumer fetches or expands anything.

**The seam bridges `flexRender`, it does not bypass it.** The adapter's `FlexRenderContent` already
accepts a `TemplateRef`, and `#renderTemplateRefContent` builds the embedded view with a context of
`$implicit` alone, valued at whatever is bound to `flexRenderProps` — so the library chooses the
object, and choosing its own is what keeps `@tanstack/*` out of a consumer's `let-` binding.
`NgeCellContext` / `NgeHeaderContext` / `NgeRowContext` / `NgeTableContext` are the whole of that
translation, built in `store/nge-table-slot-registry.ts` for the same reason `buildTableOptions` is
the only place engine *option* names appear.

Two consequences worth knowing before writing one:

- **`flexRender`'s `content` cannot take a bare `TemplateRef`** — only a function returning one. That
  thunk is built once, in the registry, because `ngOnChanges` on `content` clears the view container:
  a thunk allocated per change-detection pass would destroy and rebuild every custom cell on every
  cycle.
- **Cell contexts are memoised against the engine `Cell`; header and row contexts are not.** A `Cell`
  is created with its row model and its value cannot change under it, but a `Header` survives a sort
  and a resize while `sortDirection` and `width` move, and a `Row` survives an expand while
  `isExpanded` moves. Caching those two would serve stale values. ⚠️ The corollary is that any
  *plain* field on a cell context is frozen at first build, so a field that genuinely moves travels
  as a **signal** instead — see [Charts in cells, and the settle signal](#charts-in-cells-and-the-settle-signal-arch-291).

**Adding a ninth name costs a name.** An entry in `NGE_TABLE_SLOT_NAMES`, its context in
`NgeTableSlotContexts` — which the compiler *demands*, because `NgeTableSlotContextByName` is a
mapping over the name union rather than a loose interface — and one `ngTemplateOutlet` at the
position it names. Nothing in the directives, the registry, or either resolver mentions a slot by
name, so none of them changes. This is the property ARCH-250 and ARCH-251 exist to audit.

**Typed contexts, no `any`.** Both directives carry a `static ngTemplateContextGuard`;
`NgeTableSlotDirective` is generic over the bound name, so `ngeTableSlot="empty"` types `let-ctx` as
`NgeTableContext` while `ngeTableSlot="row-detail"` types it as `NgeRowContext`. `TRow` is inferred
from the optional `ngeCellOf` / `ngeTableSlotOf` type-carrier inputs — never read at runtime, the
same trick `NgForOf` uses for `ngForOf`. Omit them and `row` is `unknown`: safe to hold, honest about
what is known, and not an `any`.

**A cell is an arbitrary Angular render target**, which is what makes inline editing a *cell pattern*
rather than a table feature — a cell containing an `<input>`. The two rules such a cell must respect
are unchanged: a percentage-sized child such as `<nge-chart>` needs an ancestor with a definite
height (a cell already is one), and because virtualization recycles DOM, cell content must
re-derive everything it shows from its context and never hold state locally.
ARCH-291 is where that claim was first exercised, and it added the one thing an expensive cell needs
to be affordable under a fast scroll — see
[Charts in cells, and the settle signal](#charts-in-cells-and-the-settle-signal-arch-291).

**Header slots are not text-only.** `header-cell` replaces the label outright, because these slots
exist for the custom sort and filter forms a later story will host. The cell's own click toggles the
sort, so a control inside one needs `$event.stopPropagation()` — the same arrangement the resize grip
has used since ARCH-244.

**`row-detail` composes with virtualization through a DECLARED height**, never a measured one
(ARCH-298). `estimateSize` returns `rowHeight + rowDetailHeight` for an expanded row, so the rows
beneath move down rather than being overlapped, and every row's size stays knowable before it is
rendered. See [Row expansion](#row-expansion-arch-298) for the three things that keeps true.

### The event stream (ARCH-247)

Extension axis 4 of 4 — **what the table announces**. One `kind`-discriminated union, one output.

```html
<nge-table [config]="config" (ngeTableEvent)="onEvent($event)" />
```

```ts
onEvent(event: NgeTableEvent<Row>): void {
  switch (event.kind) {
    case 'sort-change':   return this.reload(event.sorting);        // narrowed to this kind's fields
    case 'cell-click':    return this.open(event.cell.row);
    case 'column-resize': return this.save(event.columnSizing);
  }
}
```

**One output, not ten, and that is the whole design.** With N outputs every new event is a public
API change on `<nge-table>` — a new binding a consumer has to learn, and a component signature that
grows for the lifetime of the library. With one output a new event is a *member*: hosts already
bound receive it without changing a line, and hosts that do not care keep ignoring the kinds they do
not switch on.

| Kind | Payload | Raised by |
| --- | --- | --- |
| `sort-change` | `sorting` | a header click, or any engine-routed sort |
| `filter-change` | `columnFilters`, `globalFilter` | either filter slice moving |
| `pagination-change` | `pagination` | a page or page-size change |
| `column-resize` | `columnId`, `width`, `columnSizing` | a **committed** resize — see below |
| `fill-intent` | `cells`, `sourceRowIds`, `sourceColumnIds` | a released fill drag — the one kind a host must **act** on (ARCH-271) |
| `column-reorder` | `columnOrder` | columns reordered |
| `column-pin` | `columnPinning` | a column frozen to an edge or released |
| `cell-click` | `cell: NgeCellContext` | a click inside a cell |
| `row-click` | `row: NgeRowContext` | a click on a row |
| `load-complete` | `rowCount`, `columnCount` | the processed row model settled |
| `render-complete` | `renderedRowCount`, `rowCount`, `columnCount` | that row model reached the DOM |

**Events are notifications; they are not the state contract.** They describe what the table *did*;
`NgeTableState` describes what the table *is*. An event carries the resulting slice so a listener
can act without a follow-up query — not so it can be accumulated into a rival copy. The
corollary bites in a useful place: **state the host pushes in through `[state]` announces nothing**,
so restoring a saved view does not replay as a burst of user activity and `[(state)]` never looks
like an event source.

**`cell-click` and `row-click` speak the render-slot seam's vocabulary.** They carry
`NgeCellContext` / `NgeRowContext` — the very objects `[ngeCell]` and `row-detail` templates are
handed, and for cells literally the same memoised instance. A click inside a cell emits `cell-click`
and then `row-click`, ordered by ordinary DOM bubbling; a click on a row's own padding emits
`row-click` alone. A control inside a cell that should not read as a click on the table needs
`$event.stopPropagation()` — the same arrangement the resize grip (ARCH-244) and the header slots
(ARCH-246) already use. A consumer who wants the raw DOM event binds `(click)` inside their own
`[ngeCell]` template, which is exactly what that seam is for.

**`load-complete` and `render-complete` both describe the current row model, not a paint frame.**
This is the definition the story had to fix before writing a line, and it is the one to hold:

- `load-complete` — `table.getRowModel()` yielded a new row set: data arrived, or a sort or filter
  re-ran. It is the **data** being ready, which is what a consumer hiding a spinner or measuring a
  fetch is actually waiting for. Emitted from an ordinary `effect`.
- `render-complete` — the DOM for that same row model has been committed. Emitted from an
  `afterRenderEffect`, so a listener may measure, scroll, or screenshot the table and find the rows
  actually there.

`load-complete` always precedes the matching `render-complete`, because effects run during change
detection and after-render hooks run past it. Both are guarded on the row model's **reference
identity**, which is what lets them distinguish "the rows moved" from "something else recomputed": a
resize or a pin re-derives a great deal and leaves that reference alone, so neither event fires.
⚠️ **Scrolling a virtualized table therefore does not re-emit `render-complete`** — its
`renderedRowCount` is the window as first painted for this row model, which is precisely the number
that shows virtualization doing its job (10,000 rows, 23 rendered).

**The throttling contract is structural, not a debounce.** `column-resize` is emitted on **commit** —
a drag released, an arrow-key step, a reset — and never per `pointermove`, even though a drag writes
`state.columnSizing` on every frame (that is what makes the column follow the pointer). The
mechanism is that `columnSizing` is deliberately *absent* from the state-slice event map and the
three commit sites emit it directly; they are also the only places that know which column moved.
`stateChange` still carries every intermediate width for anyone who genuinely wants the live value.

**A slice rewritten to the value it already held is not an event**, and the case that forces this is
the engine's own. `_autoResetPageIndex` fires on every row-model rebuild
(`table-core/src/utils/getSortedRowModel.ts:118` and its three siblings) and calls `resetPageIndex()`,
which writes a **new** `pagination` object holding the values it already had — so a reference check
would let every sort on an unpaginated table announce a pagination change that changed nothing. The
comparison is therefore by value, which is well-defined precisely because `NgeTableState` is JSON by
construction. A reset that genuinely moves the page still emits.

**Adding a kind costs a kind.** A member on the `NgeTableEvent` union, an entry in
`NGE_TABLE_EVENT_KINDS` (which the compiler demands — a spec holds the exhaustiveness gate), and
either one line in `NGE_TABLE_STATE_EVENT_BY_SLICE` if a state slice raises it or one
`emitTableEvent` call at the site that does. The emission pipeline — a single sink on
`NgeTableStore`, wired once to the output — never changes, and nothing in it names a kind. This is
the property ARCH-250 and ARCH-251 exist to audit.

### The export seam (ARCH-248)

Extension axis 3 of 4 — a **reader over the processed row model**, with no knowledge of any output
format. `readNgeExportData()` returns one neutral shape, and a CSV or XLSX writer is an addon over
that shape rather than a feature of the table.

```ts
const data = table.readNgeExportData();
// data.columns → { id: 'amount', header: 'Amount' }[]
// data.rows    → { id: 'row-0001', cells: { columnId, raw, formatted }[] }[]
```

It is reachable two ways, and the pair is deliberate. `<nge-table>` carries
`readNgeExportData(options?)` as an ordinary method, so an **application** exports through a
`viewChild` without naming a `@tanstack/*` type. The same method also sits on the **engine instance**,
put there by `ngeTableExportFeature`, because that is where two independent **addons** can compose:
ARCH-251's formatter and ARCH-250's highlighting both hold the table, and neither imports the other.

**What it reflects is what the user sees.** Rows come from the processed model — post-filter,
post-sort — so a sort reorders the export without a line of it knowing sorting exists, the same
property row virtualization relies on. Columns are the visible leaf columns composed across the three
lanes, exactly as `columnIndexById` composes them for `aria-colindex`, so column order, visibility
and pinning are all applied from one definition of "visual order".

`options.slice` picks the rows: `all` (every processed row), `page` (only the rendered ones), or
`selected`. ⚠️ `page` is identical to `all` until pagination is switched on — `getRowModel()` *is*
`getPaginationRowModel()` — which is the correct degradation, not a special case. ⚠️ `selected`
filters the processed rows rather than calling `table.getSelectedRowModel()`: that accessor is
memoised off `getCoreRowModel()`, so it answers in source order and includes rows the active filters
removed.

**`options.cellPredicate` is the composition seam, and it is deliberately anonymous.** It receives a
`NgeCellContext` — the same object a `[ngeCell]` template is handed, so an inline predicate never
forces `@tanstack/*` into a consumer's imports, and `rowId` + `columnId` is the key an addon marking
cells has to use anyway, because virtualization recycles DOM. Supplying one narrows the export both
ways: a row with no surviving cell is dropped, and a column with no surviving cell leaves `columns`.
That is what makes highlighted-cell export fall out of composing two addons rather than needing a
third feature.

**Every cell carries `raw` and `formatted`.** `raw` is what the accessor returned — a `Date` stays a
`Date` — and `formatted` is text. A column says how it reads through its own namespaced meta key:

```ts
{ accessorKey: 'amount', header: 'Amount', id: 'amount',
  meta: { ngeExport: { format: value => formatCurrency(value) } } }
```

Declared rather than derived, because a cell here is an arbitrary Angular render target — a chart, an
input, an image — so there is no general way to ask one what it displayed, and rendering ten thousand
of them to find out is not an option. ⚠️ **Keeping the formatter in step with the column's cell
renderer is the consumer's job**; nothing can check it. Columns that declare none fall back to
`String(value)`, with `null` / `undefined` becoming `''`.

**Cost.** Eager and proportional to rows × columns: the 10,000-row fixture (70,000 cells) takes
**~170–230 ms** in one synchronous pass. That is a visible pause, not a freeze, and it is the
documented limit rather than a silently shipped one — a host exporting materially more than that
should chunk, because this seam will not yield.

### The CSV formatter addon (ARCH-251)

The first formatter over that shape, and **not a `TableFeature`** — a plain function, which is the
whole of its claim to independence. It holds no table instance, so it *cannot* reach highlighting
even if it wanted to.

```ts
const data = table.readNgeExportData({ cellPredicate: table.ngeHighlightPredicate() });
const csv = toNgeCsv(data);                       // or toNgeCsvBlob(data) for a download
```

Three pieces, none of which imports another. `NgeCsvOptions` carries `delimiter`, `header`,
`newline`, `values` (`'formatted' | 'raw'`), `byteOrderMark` and `escapeFormulas`; the defaults are
RFC 4180 — comma-separated, CRLF between records, a header row, no BOM, no escaping, and **no
trailing separator**.

⚠️ **Quoting is decided against the CONFIGURED delimiter, never a literal comma.** Getting this
wrong fails in both directions at once: a comma is needlessly quoted (harmless) and a semicolon is
left bare, which silently splits one field into two on the reader's side. It is also **conditional**
— the fixture's `$127.80` needs no quotes while `$2,242.41` does, so a spec expecting every currency
record to be quoted passes only by luck of the seed.

⚠️ **Rows are re-aligned against `data.columns`, never emitted in cell order.** A predicate-narrowed
export is deliberately ragged — each row carries only its surviving cells — so each row is indexed
by `columnId` and a column with no cell writes an empty field. Three marks on three rows in three
columns therefore produce a rectangular CSV with a diagonal of values:

```
Name,Status,Quantity
Vectorized Gateway,,
,failed,
,,459
```

That is why `NgeTableExportCell` carries its `columnId` at all, and it is what lets highlighted-cell
export need no row or column bookkeeping of its own.

`values: 'raw'` stringifies `cell.raw` rather than taking `cell.formatted`: a `Date` becomes **ISO**
(sortable and unambiguous, unlike `String(date)`) and an object becomes **JSON** (rather than
`[object Object]`). The toggle earns its place on the currency column — `"$1,802.44"` for a person,
`1802.44` for a spreadsheet that still has to sum it.

#### Formula injection — `escapeFormulas` (ARCH-273)

⚠️ Excel and Sheets read a field beginning `=`, `+`, `-`, `@`, a tab or a carriage return as a
**formula** and evaluate it on open, so an export can run the source system's text as code on the
reader's machine. `escapeFormulas: true` prefixes such a field with `'` — Excel's own text marker,
invisible in the rendered cell and honoured by Sheets.

**It is off by default, and the default is the decision rather than an omission.** Escaping alters
the user's data: the field no longer round-trips, and anything parsing the CSV as data rather than
opening it as a spreadsheet sees the `'`. A library should not make that trade unasked — so a host
turns it on for what a person will open, and leaves it off for what another program will parse.
The same reasoning as `byteOrderMark`, and the same shape of answer.

⚠️ **The guard is prefix AND not-a-number, and the numeric half is what makes it usable.** `-` and
`+` open every negative and explicitly-signed number as well as every payload, so a prefix-only test
turns `-1234.5` into `'-1234.5` and corrupts an entire currency column — not a security fix, and
silent, because the file still opens. The residual cost falls on a *formatted* negative such as
`-$1,234.50`, which is not a plain number and so is escaped; it was already text a spreadsheet could
not sum.

It applies to **every field written** — the header row and both `values` readings. Scoping it to
`formatted` is the tempting wrong axis: a `raw` *string* is as dangerous as a formatted one, while a
`raw` *number* is safe because of the numeric guard rather than because of the path it came down.
Escaping runs **before** quoting, so the `'` lands inside the quotes where a reader looks for it:
`=SUM(A1,A2)` becomes `"'=SUM(A1,A2)"`.

Nothing in the shared fixture is formula-shaped, so the flag is a **no-op over ordinary data** — a
host can adopt it without auditing its columns, and a spec pins that.

Downloading stays the host's concern. `toNgeCsvBlob` returns a `Blob`; the object URL, the anchor,
the filename and the revoke are application decisions, and a library reaching for `document` here
would stop working under SSR for no benefit.

### Gate result 2/2 — ARCH-251: **no findings, seams hold**

Highlighted-cell CSV export fell out of composing what already existed. Final diff: **one barrel
line** (`src/index.ts`), a new `src/lib/csv/` and a new story directory. **Zero files under the
core, under ARCH-248's `src/lib/export/`, or under ARCH-250's `src/lib/highlight/` were modified** —
the interaction story even reuses ARCH-250's `highlight-demo-table.component` unchanged, so the only
new code the composition needed was a pure function and a toolbar.

Read against gate 1/2, that is the useful result: ARCH-250 found the state axis non-additive and
needed one general seam fix, and **once fixed, a second addon needed nothing at all.** The
distinction between the two is worth carrying: highlighting is a *stateful* addon and hit the
`NgeTableState` augmentation question, while CSV is *stateless* and raised it at all — it is an
ordinary function over a published type and could live in any package. The limit recorded at the
time bound addon **state**, not addons; ARCH-274 then found it bound nothing at all, since an
external addon augments `@nge/table` and merges into the same interface.

### Registering a `TableFeature` (axis 1)

```ts
@Component({ providers: [provideNgeTableFeatures(myFeature)], … })
```

⚠️ **Features come from DI, never from `config`, and that is an engine constraint rather than a
preference.** `createTable` reads `options._features` **once**, while constructing the instance, and
the Angular adapter builds that instance from a `queueMicrotask` scheduled as soon as the store
exists — before `<nge-table>` has run the effect that pushes `config` in. A `config.features` field
would therefore register nothing at all, silently, and would read as the addon being broken rather
than the wiring. Injection has no such window.

`NGE_TABLE_CORE_FEATURES` holds what the library registers of its own accord (today, the export
seam). Nothing about those is privileged: they are appended to the engine's fourteen built-ins by the
same line an addon's are, which is the property the extensibility gate exists to verify.

⚠️ **A feature method must not be named `get*`.** `@tanstack/angular-table` proxies the instance and
turns every `get*` accessor into a computed. A zero-arity one becomes a `Signal`, which silently
swallows any argument; a higher-arity one is cached by `JSON.stringify(args)`, and a **function**
serialises to `{}` — so two different `cellPredicate`s would collide on one cache key and the second
caller would receive the first one's cells. `readNgeExportData` is named the way it is for exactly
that reason.

### An addon's own state slice (axis 1, continued)

A `TableFeature` that carries state adds its slice by **declaration-merging two interfaces** and
writing through the engine's own updater plumbing. Nothing else is required, and nothing in the core
learns the addon exists.

```ts
declare module '../nge-table-state' {          // the host's state
  interface NgeTableState { ngeHighlight?: NgeHighlightState }
}
declare module '@tanstack/table-core' {          // the engine's state
  interface TableState { ngeHighlight?: NgeHighlightState }
}
```

⚠️ **The specifier depends on where the addon lives, and both routes reach the same interface.** The
relative path above is what an **in-library** addon must use, because a library cannot import its own
barrel — the import is circular and Nx's module-boundary rule rejects it. An addon shipping from
**another project** names the public specifiers instead:

```ts
declare module '@nge/table' {           // the host's state
  interface NgeTableState { acmeRowFlag?: AcmeRowFlagState }
}
declare module '@tanstack/angular-table' {       // the engine's state
  interface TableState { acmeRowFlag?: AcmeRowFlagState }
}
```

`src/index.ts` re-exports `NgeTableState` with `export *`, and TypeScript resolves an augmentation's
name through a star-export to the declaration behind it — so an external slice merges into the same
interface `applyTableState` and `stateChange` are typed against. The adapter behaves identically
(`@tanstack/angular-table`'s `index.d.ts` is `export * from '@tanstack/table-core'`), which is what
lets an external addon satisfy `makeStateUpdater<K extends keyof TableState>` without ever naming
`@tanstack/table-core` — only the adapter is a declared dependency.

⚠️ **The augmenting file must also `import` the module it augments**, or TypeScript raises TS2664 and
drops the augmentation whole, which reads as the merge silently not happening.

`libs/shared/table-addon-conformance` is the worked example: a different Nx project whose stateful
addon registers through `provideNgeTableFeatures` alone and whose spec asserts the host's state and
the component's `stateChange`. It exists as a regression guard — if this property ever breaks, that
project fails rather than the first real external addon discovering it.

⚠️ **Both fields optional.** `createNgeTableState()` cannot know about an addon's slice, so a host
building state the documented way hands in `undefined` — every updater must normalise rather than
assume `getInitialState` seeded it.

Writes go out through `makeStateUpdater`, which reaches `table.setState` → `options.onStateChange` →
`buildTableOptions` → `NgeTableStore.applyTableState`, and land in the host's state exactly like a
built-in slice.

⚠️ **That holds for a click-driven addon and breaks for a gesture-driven one.** An addon whose writes
can land twice in one synchronous burst — a `pointerdown` and the drag's first `pointermove`, a key
repeat, two programmatic calls in a tick — must resolve its updater **inside** `table.setState` and
must not decide from a pre-read, because a pre-read hits the raw engine instance whose options
refresh only when the adapter's proxy is read. `makeStateUpdater` also allocates a new top-level
state object unconditionally, so a no-op write still churns the host's state once per frame. See
§ Cell range selection (ARCH-269) for both failures in full; ARCH-269 hit them and ARCH-270 will.

> **This route is the extensibility gate's one finding, and it is worth stating plainly.** Before
> ARCH-250, `onStateChange` was not wired — and the failure mode was silent *in the direction that
> looks like success*. The Angular adapter keeps an internal state signal and absorbs the write, so
> an addon rendered, toggled, and even survived a virtualized scroll while `NgeTableState` never
> moved and `stateChange` never fired. A rendering addon is therefore not evidence that the seam
> works; the host's state is. The fix is one option line plus one store method, neither of which
> names a slice: `applyTableState` resolves a whole-state updater against the store's own state (not
> `table.getState()`, which would make the table a second source of truth) and routes every changed
> key through the existing `ngeTableStateEventFor` lookup, so an addon key announces nothing.
> Built-ins never arrive there — `buildTableOptions` overrides all eleven per-slice handlers.

**Marks are id-keyed state, and a contiguous mark is a descriptor.** Anything that marks a row, a
cell, or a column lives in state keyed by `getRowId(row)` + column id — never a DOM flag (virtualization
recycles nodes) and never a field on the datum (`config.data` belongs to the host, and rows from an
NgRx store are frozen). But *identified by ids ≠ enumerated per cell*: a block is stored as an anchor,
a focus, and a list of column ids, and membership is answered by a predicate. Enumerating one column
of the 10,000-row fixture is ~270 KB of JSON re-emitted on every `stateChange`, and three or four such
columns exceed Firestore's 1 MiB document limit — which destroys the persistable-view property rather
than merely costing frames. ⚠️ A descriptor's endpoints follow their records, but which rows lie
*between* them resolves against the processed row model, so **a re-sort re-shapes the block**.
⚠️ `config.getRowId` stops being optional the moment any of this is switched on.

> ⚠️ **Re-deriving the membership is not enough — the thing that paints it has to re-run, and this is
> the default way a mark-painting addon goes wrong.** A sort leaves an addon's own slice untouched,
> reorders the *same* `Row` instances, and (because the row and cell loops track by id) moves DOM
> rather than rebuilding it. An overlay whose `computed` depends on its slice plus its cell therefore
> has no dependency a sort changes, and paints the block as it stood when the marks were made —
> visually indistinguishable from the enumeration the descriptor exists to avoid, while every unit
> assertion on the membership predicate still passes. **Bind `[state]`, the whole `NgeTableState`,
> never the slice**; both shipped overlays do, and the rule survives because it has already been
> broken in two independently-written ones. ⚠️ Only a **re-sort** discriminates it — a column reorder
> invalidates the engine's leaf-column memo and makes the computed re-run incidentally, so that
> version of the test passes either way.

**A projected slot template cannot reach the table, by design.** `cell-overlay` hands over a
`NgeCellContext`, and an `ng-template` is instantiated with its *declaration* injector — the
consumer's — so an addon needing a table-derived answer in the view (a range needs the row order)
ships a small injectable of its own, provided in the consumer's injector and handed the instance by a
companion feature. ⚠️ Such a bridge is **per-table**: one injector, one bridge, last attach wins, so a
component hosting several such tables must give each its own provider scope.

**Styling reaches outward.** `.nge-table__cell` is neither positioned nor a stacking context — both
deliberate, so pinned lanes stay sticky — so an addon tints a cell with `:has()` from its own
stylesheet rather than with an absolutely-positioned layer, and pairs each token with a literal
fallback instead of adding to `_table-tokens.scss`. The cost is a dependency on core's BEM class
names, which is the same dependency a theme has.

Worked example: `src/lib/highlight/` (ARCH-250).

### Row selection (ARCH-268)

`enableRowSelection: true` injects a leading checkbox column and gives the user five routes into
`state.rowSelection`: the checkbox, a click (**replace**), cmd/ctrl-click (**add or remove**),
shift-click (**the range from the anchor**), `Space` on a focused row, and the header's select-all.
`enableMultiRowSelection: false` reduces all of it to one row at a time.

```ts
config = createNgeTableConfig<Row>({
  columns, data,
  enableRowSelection: true,
  getRowId: row => row.id,          // ⚠️ not optional — see below
});
```

**Most of it is the engine's, and reaching for the right part of the engine is the design.**
`row.toggleSelected()` and `table.toggleAllRowsSelected()` forward to `options.onRowSelectionChange`,
which `buildTableOptions` routes into `applyTableStateChange` — so they are in-contract exactly as
`column.toggleSorting()` is, while `table.setRowSelection` is not (an engine *option* name belongs to
one function). That choice is what makes single-row mode free: `mutateRowIsSelected` clears every
other key when a row cannot multi-select, so the flag needs no code of ours. The tri-state header
checkbox is likewise `getIsAllRowsSelected()` / `getIsSomeRowsSelected()`.

**What the engine does not provide is the range** — `addRowSelectionRange` is a commented-out block
in `RowSelection.ts`. Ours walks `table.getRowModel().rows`, the **processed** model, so shift-clicking
after a sort takes what the user *sees* between the two clicks rather than what the source array
holds. It is written as one `applyTableStateChange`, which makes a range one state change and one
event rather than one per row — and which is why it applies `getCanSelect()` itself, since a
single-slice write never reaches the engine's own check.

⚠️ **The row body and the checkbox are two halves of one affordance, and shift means the same thing
on both.** They share `extendRangeTo`. A checkbox that merely toggled while the row extended would
read as the range being broken rather than as two separate gestures — and the checkbox is the
control most likely to be shift-clicked, because it is the one that looks like a multi-select
affordance. The single deliberate difference: a **plain** checkbox click is *additive* where a plain
row click *replaces*, because a per-item switch must never clear the rest. The native box is
therefore handled on `click` (the only event carrying modifiers) and `preventDefault()`s, so
`state.rowSelection` drives `checked` rather than the browser racing it.

**The anchor is scratch state**, on `NgeTableStoreState` beside the resize drag and deliberately not
in `NgeTableState`: it records where a gesture started, not what the table is, and a saved view
restoring one would have a user's next shift-click extend from a row they never touched. It is
dropped whenever the selection empties, and it does not move on a shift-click — which is what lets a
range be grown and shrunk rather than only ratcheted.

⚠️ **`config.getRowId` stops being optional, and the library throws in dev rather than degrade.**
Selection is id-keyed; without a stable identity the engine keys it by array index, so a sort, a
filter, or a re-fetch leaves the ticks on whichever records moved into those positions — a failure
that reads as data corruption rather than a bug.

**The capability-flag asymmetry check lands the opposite way from pinning.** `getCanSelect()` gates
the *write*, so with `enableRowSelection: false` every gesture is already a no-op — but
`getIsSelected()` reads the slice raw, so a selection the **host** pushed in still renders and still
exports. That follows ARCH-244's resize precedent rather than ARCH-243's pinning one: the flag
withdraws the *user's* affordance, it does not discard what the *application* chose. No
`applyPinningCapability` sibling is needed.

**A second `state` transform is needed, for a reason pinning did not have.** `orderColumns` *appends*
whatever it does not find in `state.columnOrder`, so a host supplying an order for its own columns
would push the injected column to the end of the row; `applySelectionColumnOrder` keeps it leading.
Like its sibling it returns the same reference when there is nothing to do, and never rewrites the
host's own state.

**Keyboard and a11y**: the **row** is the tab stop (and only while selection is on — a row that does
nothing when activated should not be in the tab order), carrying `aria-selected` and `Space`; the
per-row checkbox is `tabindex="-1"` and `aria-hidden`, a pointer affordance like the resize grip.
Full arrow-key grid navigation over a roving tabindex remains a later story.

⚠️ **A shift-click must `preventDefault()` its `mousedown`**, or the browser extends the document's
*text* selection across the same rows and the result reads as a rendering bug. Gate it on the
modifier: `user-select: none` would also stop a user copying a cell's text, and an unconditional
`preventDefault` suppresses focus and breaks an `<input>` in a cell. **No spec can catch a regression
here** — an untrusted event triggers no browser default, so a synthetic click passes while a real one
does not.

### The swappable selection control (ARCH-278)

The native checkbox is the **default**, not the only option: a consuming app projects its own
control through two named slots and the table wears that domain's design language.

```html
<nge-table [config]="config" [(state)]="state">
  <ng-template ngeTableSlot="selection-cell" [ngeTableSlotOf]="rows" let-selection>
    <cg-checkbox
      [checked]="selection.isSelected"
      [disabled]="!selection.canSelect"
      (click)="$event.stopPropagation()"
      (checkedChange)="selection.toggle()" />
  </ng-template>
</nge-table>
```

This is the render-slot axis paying for itself: two entries in `NGE_TABLE_SLOT_NAMES`, two context
types in the `NgeTableSlotContextByName` mapping, two `ngTemplateOutlet` anchors. Nothing in the
directive, the registry, or either resolver changed — which is the property ARCH-250 and ARCH-251
were built to audit, tested here against a feature they never anticipated.

**The action travels on the context.** `selection.toggle()` and `selection.toggleAll()` are
callbacks the table closes over, not a service to inject — and the difference from ARCH-250 is worth
understanding rather than copying. A projected `ng-template` resolves DI from its **declaration**
injector, the consumer's, so it cannot reach the table; highlighting needed a whole
`NgeHighlightBridge` for that reason. But that constraint binds when a template must *ask the table
a question*. Here the table is already building the context and can close over its own store, so the
answer travels with the question — no bridge, and no per-table provider scope for a consumer to get
wrong.

**`canSelect` is why `enableRowSelection` takes a predicate.** With a bare `true` the field would
always be `true` and carry nothing; with `row => row.status !== 'archived'` it lets a consumer render
a **disabled** control rather than none, which is the difference between a rule and an apparent
rendering bug. ⚠️ The predicate receives the row *datum* — the engine's own option receives its `Row`
wrapper, so `buildTableOptions` adapts between them. A consumer writing one must never need a
`@tanstack/*` import.

⚠️ **The projected template is consulted first; the native control is the fallback.** The reverse
order compiles, lints, and renders perfectly while silently ignoring every consumer template — a
central switch standing in front of a seam, and the exact failure shape this epic's gate exists to
surface.

### Cell range selection (ARCH-269)

`provideNgeCellRange()` gives the table a spreadsheet's rectangle: an **anchored block with a focus
cell**, dragged out with the pointer, extended by shift-click, added to with cmd/ctrl, taken whole
with cmd/ctrl-A and dropped with `Escape`. It is an addon in the full sense — a `TableFeature`, a
per-table injectable, and a component projected into the existing `cell-overlay` slot.

**It modified zero core files.** The final diff is one line in `src/index.ts`, a new
`src/lib/range/`, and a new `stories/cell-range/`. That is ARCH-251's result repeated for a
**stateful, gestural** addon, where ARCH-250 — also stateful — needed one general seam fix. The
honest reading is that once `onStateChange` was wired, the four axes carried a feature nobody
designed them for: a pointer drag with auto-scroll and its own DOM hit-test is the furthest thing
from the "tint a cell" case the seams were validated against, and it still landed as a new directory
plus a barrel line.

```ts
@Component({ providers: [provideNgeCellRange()], … })
```

```html
<nge-table [config]="config" [(state)]="state">
  <ng-template ngeTableSlot="cell-overlay" let-cell>
    <nge-range-overlay [cell]="cell" [state]="state()" />
  </ng-template>
</nge-table>
```

⚠️ **The overlay is what makes the gesture possible, not merely what paints it.** It stamps the
attribute every hit-test reads and hands the bridge the table's root element, so a table that
provides the feature and projects no overlay has range state and export composition and no pointer
behaviour at all — which is a supported arrangement, not a misconfiguration. ⚠️ `config.getRowId`
stops being optional, and the library throws in dev rather than degrade — see below for why the
check sits where it does.

**The descriptor is four ids, symmetric on both axes** — `{ anchorRowId, anchorColumnId, focusRowId,
focusColumnId }` — and that is a deliberate divergence from `NgeHighlightRange`'s `{ anchorRowId,
focusRowId, columnIds }`, which materialises its column span at write time. Here **both** spans
resolve at *read* time: rows against the processed row model, columns against the visible leaf
columns in visual order. Three things follow, and together they are why two sibling addons are
allowed to disagree about a shape:

- A column reorder or a pin **re-shapes the block exactly as a sort does**. The epic had already
  settled that reading for rows; this applies it to the axis ARCH-250 never had one for. A spec pins
  the case a materialised span gets wrong: endpoints `name` → `quantity` cover three columns, and
  pinning `status` to the left lane moves it out from between them, so the block narrows to two.
- Hiding a column narrows the block, rather than leaving a materialised id describing a column
  nobody can see.
- There is a focus **cell** rather than a focus row — the corner the overlay paints with a heavier
  ring, the one a keyboard extension will move, and the one ARCH-271's fill handle will hang off.

The scalability lock is unchanged: a descriptor is four strings however much it covers, where
enumerating one column of the 10,000-row fixture is ~270 KB of JSON re-emitted on every
`stateChange`.

**There are two anchors, and only one of them is state.** `NgeCellRange`'s anchor is the
rectangle's corner — persisted, part of the descriptor, and what membership is resolved from. Where
the user's current *gesture* started is a plain field on `NgeRangeBridge`, the addon's own
per-table injectable, and it never reaches state. ARCH-268 keeps its row anchor on
`NgeTableStoreState`, which is a core file an addon may not touch; ARCH-250 persists its anchor *in*
the slice, on the opposite rationale. The third option is the one available to an addon, and it
honours ARCH-268's reasoning at no core cost: an anchor records where a gesture started, not what the
table is, and a restored view carrying one would have a user's next shift-click extend from a cell
they never touched. The consequence is worth stating plainly, because it is what a user meets: after
a reload, a shift-click **starts** a rectangle instead of extending the one the saved view carries.
Reaching from a stranger's corner is the alternative, and it is worse.

**Row selection's range walk is deliberately not reused.** `ngeSelectionRangeIds` is exported and
ARCH-268 pointed at it for this story, but it applies `getCanSelect()` — the *row-selection*
capability. A row that a consumer's `enableRowSelection` predicate excludes can still sit inside a
cell range, so reusing it would silently shrink ranges on exactly the tables ARCH-278's predicate
exists for. What is inherited instead is its **degeneracy rules**, applied to both axes: a focus that
has left the current model matches nothing (a filter removed the block's boundary, and inventing one
would select cells the user never dragged across), while a missing anchor degenerates to the focus
cell alone, because a filtered-away anchor is an ordinary thing for a restored view to carry.

**Writes take a different route from highlighting's, and the difference is a finding rather than a
preference.** ARCH-250 writes through `makeStateUpdater` — what § An addon's own state slice
documents, and what a `TableFeature` normally reaches for. This addon calls `table.setState` directly
and resolves its updater **inside** that call. A gesture writes differently from a click, and both
reasons only become visible once a drag exists:

- **Two writes can land in one synchronous burst.** A `pointerdown` starts a rectangle and the
  drag's first `pointermove` extends it, with no render in between. An updater decided against a
  *pre-read* — read the slice, then write a function of it — reads the **raw** engine instance,
  whose options refresh only when the adapter's proxy is read, so both calls see the same "before"
  and the extend silently does nothing. Resolving inside `setState` hands the updater the state
  `NgeTableStore.applyTableState` is about to patch, which is current by construction.
- **`makeStateUpdater` allocates unconditionally.** It builds a new top-level state object whether
  or not the slice moved, so `applyTableState`'s identity short-circuit never trips. For a click that
  costs nothing. For a drag firing every frame — most of them landing on the cell the focus is
  already on — every frame would patch the host's state and emit a `stateChange`. Returning the
  *same* reference for an unchanged write is what keeps a gesture from churning a persistable view,
  the same discipline that keeps `columnSizing` out of the state-slice event map.

Neither is a defect in `makeStateUpdater`: ARCH-250 is click-driven, and there it is the right tool.

**The `getRowId` check has to sit on the write, because an addon has no earlier moment.** ARCH-268
throws from `buildTableOptions`, which it can afford to do because `enableRowSelection` is a config
field that function already reads — the check costs nothing and happens before a single row is keyed.
An addon has no equivalent. Its feature registers inside `createTable`, which the Angular adapter
drives from a `queueMicrotask`, so a throw there escapes through `lazyInit` rather than through the
caller's own stack and reads as an adapter fault rather than as a misconfigured table. The read path
is worse still: membership is answered once per rendered cell, so a throw there takes out the render.
The first **write** is both the earliest point reachable from a caller's own stack and the exact
moment a key would be minted from an array index — and it is `ngDevMode`-guarded, so a production
build carries neither the check nor the risk of destroying a table over a misconfiguration that has
already shipped.

**The gesture touches the DOM in exactly two places, and neither is a core attribute.** The table
root and its scroll viewport are reached by class name — `closest('.nge-table')`,
`.nge-table__viewport` — the same documented dependency the overlay's `:has()` styling already
accepts, and the same one a theme has; `NgeTableStore` is provided at `<nge-table>`, so an addon
living in the consumer's injector has no other route to the element auto-scroll must move. Everything
else rides the addon's **own** attribute: `<nge-range-overlay>` stamps `data-nge-range-cell` with
its `rowId::columnId` pair, and `pointermove` resolves a cell through `document.elementFromPoint`.
That last part is forced rather than chosen — pointer capture retargets the entire stream to the
root, which is what lets `pointermove` and `pointerup` be bound once, so a per-cell `pointerenter`
never fires during a drag.

**A drag that reaches an edge keeps going.** Auto-scroll is a `requestAnimationFrame` loop that
re-hit-tests at the *last known pointer position* each frame — the pointer is not moving, the cells
under it are — and it stops rather than spins when a frame has nothing to scroll, so a drag held
still costs no frames. The speed ramps from nothing at the threshold's inner edge to
`autoScrollSpeed` at the viewport boundary, because a flat speed makes a long selection either
unbearably slow or impossible to stop on the right row.

**Touch is deliberately out of scope**, and the reason is the drag surface rather than effort. A
pointer gesture on a touchscreen needs `touch-action: none` on whatever owns it — ARCH-244's resize
grip carries exactly that — but the thing that owns this one is *every cell*, so the same treatment
would make the table unscrollable by finger. A touch range needs a small grip of its own to start
from, which is ARCH-271's fill handle: a control the size of the resize grip, where suppressing the
browser's own gesture costs nothing.

**Two overlays on one cell is the intended composition, not a collision.** Cell highlighting
(ARCH-250) marks an arbitrary *set*; a range is an anchored *rectangle* extended by gesture. The epic
settled that the two coexist as independent addons over one cell rather than one being re-expressed
on the other, and neither imports the other — they meet only at the export seam, where each supplies
an anonymous `cellPredicate`:

```ts
table.readNgeExportData({ cellPredicate: range.predicate() });
```

**Three copies of "the visible leaf columns in visual order" exist, and the duplication is the price
of the claim under test.** The core composes the three lanes for `aria-colindex` and again for
the export seam; both addons carry their own four-line copy. An addon reaching into the core for a
helper would couple to it, and the whole property being demonstrated is that it need not; importing
from the sibling addon would couple the two that must stay independent; and promoting it to a shared
core export is the option that is a core edit. A story whose entire result is "zero core files" is
not the one to spend that on.

### Column selection (ARCH-270)

Selecting a whole column completes the triad — rows (ARCH-268), cells (ARCH-269), columns. It adds
**no slice, no provider, and no feature flag**: one more projected template on top of
`provideNgeCellRange()`, because a selected column *is* a `NgeCellRange`.

```html
<nge-table [config]="config" [(state)]="state">
  <ng-template ngeTableSlot="cell-overlay" let-cell>
    <nge-range-overlay [cell]="cell" [state]="state()" />
  </ng-template>
  <ng-template ngeTableSlot="header-overlay" let-header>
    <nge-range-column-handle [header]="header" [state]="state()" />
  </ng-template>
</nge-table>
```

The two templates are **independently optional** — the handle binds its own listeners rather than
riding the delegated table root, so neither needs the other.

#### Decision 1 — the gesture: a leading-edge strip

**A header click already toggles the sort** (ARCH-242, and `Enter` / `Space` do the same), so two
gestures share one element. Three resolutions were considered and the second was taken: a **thin
strip on the header cell's leading edge**, transparent at rest and revealed on header hover — the
same bargain ARCH-244's resize grip strikes. A plain click takes the column, `shift` takes the span
from the anchor, `cmd`/`ctrl` adds or drops a disjoint one.

Rejected, and why:

- **A modifier split** (plain click sorts, some modifier selects) is ruled out by the requirement
  itself: `shift` and `cmd`/`ctrl` are already spent on span-and-disjoint, so the discriminator
  would have to be a *third* modifier stacked on those two.
- **Moving sort onto an explicit control** frees the click outright, at the cost of rewriting
  established behaviour and every story that sorts by clicking a header. Disproportionate.

It fits the crowded header without collision. The resize grip half-overhangs the **trailing** edge,
the strip owns the **leading** one, and a consumer's slotted `header-cell` control sits in the flex
flow inside the cell padding. The strip carries **no `z-index`**, deliberately, so the previous
column's grip (`z-index: 1`) keeps the few-pixel overlap at the boundary — a user aiming there means
to resize. `.nge-table__header-cell` is already `position: relative` for the grip, so the strip
anchors with no core edit.

⚠️ **The two gestures cannot reach each other, and each half is secured differently.** The pointer
half is a `stopPropagation()` on the strip's own click — the arrangement the grip, the select-all
checkbox and a slotted `header-cell` control all already use, and a spec goes red without it. The
keyboard half is **structural**: cmd/ctrl + `Space` selects the column, and Angular's
`keydown.space` binding (what toggles the sort) matches only when *no* modifiers are held, because
`KeyEventsPlugin.matchEventFullKeyCode` appends every pressed modifier before comparing. A modified
press therefore cannot reach the sort at all. A spec pins that too, since a template edit could
quietly undo it.

That keyboard route is also the only one of the addon's three shortcuts scoped by **focus** rather
than by engagement — a header cell is a real tab stop, so "which column did the user mean" has an
answer here that `Escape` and cmd-A never have. It consequently needs no per-table opt-out on a page
of several tables, where those two do.

#### Decision 2 — the state: nullable row endpoints, not a second collection

A whole column is `{ anchorColumnId: 'amount', anchorRowId: null, focusColumnId: 'amount',
focusRowId: null }`. **`null` means the view's boundary, never "missing"** — the anchor end resolves
to the first position, the focus end to the last, and an id that has genuinely left the model keeps
the degeneracy rules ARCH-269 already had (a filtered-away *focus* matches nothing; a filtered-away
*anchor* degenerates to the focus).

⚠️ **The alternative fails silently and in the worst direction.** Expressed as a span between the
records that happened to be first and last, a column selection follows those two records through a
sort — so the "column" quietly becomes whatever now lies between them. Naming no record at all is
what makes a re-sort a no-op by construction. `selectAllNgeRange` carried exactly this defect and
is fixed by the same change: a spec confirms cmd/ctrl-A used to shrink a twelve-row table to two
rows after a sort.

Rejected: **a separate `columns: string[]` collection** in the slice, unioned by the same predicate.
Equally cheap, and it makes "selected" two concepts again — which is the thing the story's
constraint forbids and the reason everything downstream composes for free.

Three consequences the nullable endpoints force, each pinned by a spec:

- A whole-column mark has **no focus cell**, so no focus ring. That falls out of the string
  comparison rather than needing a branch.
- `Shift`+arrow on one is a **no-op**. There is no cell to step from, and materialising the row axis
  at either end would silently turn "this whole column" into "these rows of it".
- `NgeRangeBridge`'s gesture anchor becomes a small union — a cell *or* a column. Only its
  null-ness is read today; it carries the origin so the field does not lie, and so ARCH-271's fill
  handle can tell which kind is live.

⚠️ **Extending to a column unbounds the row axis of whatever was active** — the one place anything
moves an anchor. The anchor *column* stays put, exactly as it does for a cell extension, but a user
who shift-clicks a header is asking for columns, so a two-row block becomes full-height. The
alternative (refusing to extend from a cell anchor) would make one gesture mean different things
depending on what the user did a moment earlier.

#### Decision 3 — the overlays: the count of cell-marking addons stays at two

ARCH-269 recorded that `cell-overlay` resolves to **one template per column plus one shared
fallback**, so two cell-marking addons already require the consumer to author a wrapper template
hosting both — and a third would make that worse. Writing the same `ngeRange` slice is what avoids
it: `<nge-range-overlay>` paints a selected column with nothing else registered, so **no third
competitor for that slot is introduced**. The header-side visual is a *different* slot,
`header-overlay`, which has no competitor at all today.

`data-nge-range-column` is stamped on the header cell, deliberately **not** the body's
`data-nge-range-cell`. The body hit-test asks for that attribute and must keep answering `null` for
a header, or a click on a header label would read as a click on a cell; two names make the
separation structural rather than a guard someone can forget. It is read by the **keyboard** route
only — the attribute is on the whole header cell, so a pointer test against it would select the
column from a plain header click, which is the sort.

Finally, the export AC costs nothing: `readNgeExportData({ cellPredicate: table.ngeRangePredicate()
})` exports a selected column with no change to ARCH-248's seam and none to ARCH-269's path either.
That is the dividend of expressing a column as a range rather than as a second kind of mark.

**A header tints only when the column is *fully* selected.** A column that a dragged block merely
passes through is not a selected column, and tinting it would make the band say the same thing for
"I selected this column" and "my selection happens to touch it". A second, weaker state for the
partial case is a real design and is deliberately not one this story decided.

### The fill handle, and the data boundary (ARCH-271)

Wave 3 is where the library first proposes a change to **data** rather than to interaction state, and
the whole story is about not crossing that line. `<nge-fill-handle>` puts a grip on the active
range's corner; dragging it computes which cells would take which values and **announces them**. The
table changes nothing. The host applies the proposal and hands new `data` back in — the
controlled-state contract extended one layer out.

```ts
onEvent(event: NgeTableEvent<Row>): void {
  if (event.kind !== 'fill-intent') return;
  this.rows.update(rows => applyPatches(rows, event.cells));   // the host's own write
}
```

⚠️ **`fill-intent` is the first kind a host is expected to ACT on rather than observe**, which makes
the guide's own "events are notifications" claim no longer universally true. Every other kind reports
something already done; ignore it and you have merely missed news. Ignore this one and the fill does
not happen — which is the correct behaviour for a host that has not opted into editing, not a bug.
It is the shape any future "the library wants to change your data" kind must take, because the
library owns no data and must never acquire any.

#### Finding: extension axis 4 was closed to addons

**The mechanism the ticket assumed did not exist.** `emitTableEvent` is a closure on `NgeTableStore`,
which is provided at `<nge-table>`; an addon's services live in the **consumer's** injector and hold
only the raw engine instance, so they had no route to it. `applyTableState` — the route ARCH-250
opened for addon *state* — is deliberately silent for an addon's slice, so it was not one either. A
fill handle living with the range, as the ticket requires, could not announce anything.

This is the same shape as ARCH-250's finding about axis 1 (the state axis looked additive and was
not), and it took the same kind of fix: **one general, kind-agnostic core edit** rather than a special
case for filling. `createNgeTableEmitterFeature` publishes the sink onto the engine instance —
exactly as ARCH-248 publishes `readNgeExportData` — so any `TableFeature` can now announce. Nothing
in it names an event, so the next addon's kind needs no second seam.

⚠️ **It does not make addon state changes announce themselves.** Those still route through
`applyTableState`, which stays silent for addon slices on purpose; an addon that wants to be heard
says so explicitly. Silence remains the default, which is what keeps `stateChange` from becoming a
second event bus.

**Core edits are legitimate here** — the zero-core-edit gate was Wave 1 (ARCH-250 / 251) only, and
this is a Wave 3 feature story. Both edits are additive: a union member, and the emitter feature.

#### What the fill infers, and where it refuses

Two behaviours, inferred from the source rather than configured: **copy** (one cell, or anything
non-numeric — cycling the pattern), and a **linear series** (two or more finite numbers, step
`(last − first) / (n − 1)`). Dragging backwards changes the arithmetic, not just the order:
`[10, 20]` extended upward gives `…, −10, 0`. "Not a series" and "a series whose step is zero" are
deliberately distinct answers — `[5, 5, 5]` is arithmetic, and conflating the two would send it down
a path where it only happens to agree today.

The gesture is **two-dimensional**: the grip drags the far corner and each axis resolves
independently, so one drag can grow the rows while shrinking the columns. Per axis, given the near
edge `n`, the far edge `f` and the target `t`, the new span is `[n, t]` when `t ≥ n` (which covers
both growing outward and shrinking back) and `[t, f]` when `t < n` (growing backwards past the near
edge). Positions resolve against the **processed** row model, so filling down after a sort fills the
rows the user sees. A column opts out with `meta.ngeFill.enabled: false`, which excludes it as a
*target* while leaving it usable as a source.

⚠️ **Growing both axes at once leaves a corner quadrant belonging to neither the source's rows nor
its columns**, and the fill is therefore **two-pass**: pass 1 extends the rows over the columns the
source had, pass 2 extends the columns across every row of the new block *including the ones pass 1
just produced*. The corner is derived from derived values — deterministic, and the only reading
available, since nothing in the source points at it. Excel declines diagonal fills rather than take
it; NgeTable takes it and says so.

⚠️ **No handle at all while the active range is unbounded on the row axis** — a whole column
(ARCH-270), or cmd/ctrl-A. Such a range covers every row, so it has no corner and nothing below it to
extend into. Materialising rows to give the grip somewhere to sit would silently turn "this whole
column" into "these rows of it".

**On release the selection grows to cover source ∪ swept**, and the grip moves to the new bottom edge
— so a second drag extends further without re-selecting, which is what a spreadsheet does. Two things
are deliberate about it:

- It is the **one operation that moves a rectangle's anchor**, which every other gesture is careful
  not to do. A fill reshapes the block rather than re-aiming it, and leaving the anchor where it was
  would strand it mid-block instead of on a corner. The union is anchored at its first corner, so a
  fill upward and a fill downward leave the same shape.
- It reshapes the **active** rectangle only. A user who cmd/ctrl-added disjoint blocks keeps them; a
  fill that dropped selections it never touched would be destructive well beyond its own scope.

⚠️ **This is interaction state, not a claim about data.** The host may ignore the intent entirely —
that is the contract — and the user still swept those cells, so the selection reflects the gesture
rather than the outcome. A commit that proposed nothing (every swept column opted out) reshapes
nothing either.

**Dragging the grip back INTO the block retracts it** — the block shrinks to where the pointer came
back to, the cells about to leave grey out during the drag, and **nothing is proposed**.

⚠️ **Extending and retracting are not separate concepts.** They were, until the gesture went
two-dimensional and stopped being separable: one drag can grow the rows and shrink the columns at
once. The whole gesture is therefore a single `NgeFillPlan` — the rectangle before and the rectangle
after — from which the cells to fill (`next \ source`) and the cells to drop (`source \ next`) both
fall out, either possibly empty. A drag that only shrank proposes nothing because that difference is
empty, not because a branch says so.

⚠️ **A spreadsheet also clears the cells dragged back over; NgeTable deliberately does not.**
Clearing is a change to *data*, and what "cleared" means — `null`, an empty string, a type's zero —
is a question about a host's schema that this library has no business answering. Shrinking is pure
interaction state, which it does own. If clearing is wanted later it is a `fill-intent` like any
other proposal, and it needs its own story to decide the vocabulary.

⚠️ **The source is fixed for the whole gesture.** A drag that dips inside the block and then
continues out past the original edge fills from where the user *started*, not from whatever the block
momentarily became — which is precisely what a live-shrinking selection would have got wrong, and why
the retraction commits on release rather than following the pointer.

#### Two limits worth carrying forward

- **The grip does not overhang the corner.** `.nge-table__cell` carries `overflow: hidden` (a cell's
  content is arbitrary and must not spill) *and* is deliberately unpositioned (ARCH-243, so pinned
  lanes stay sticky), so an overhanging grip is clipped however it is positioned, and an absolute one
  escapes to the table host. It therefore rides the `cell-overlay` slot's own flow position — the
  trailing edge of the corner cell. Moving it to the true corner needs a core change and deserves its
  own story rather than a quiet exemption.
- **`cell-overlay` now has three claimants.** ARCH-269's overlay, ARCH-250's highlight, and this grip
  all want that slot, which resolves to one template per column plus one shared fallback. The
  consumer hosts them in **one** wrapper template; a second `ngeTableSlot="cell-overlay"` silently
  replaces the first. The limit ARCH-269 recorded is now load-bearing rather than theoretical.

### Zebra striping (ARCH-286)

`enableStriping` paints alternate rows on `--nge-table-row-surface-alt`. It is the smallest
feature in the library and the one with the two most inviting wrong answers, both of which look
correct in a screenshot and fail the moment the table is used.

**Parity is the row's position in the processed row model.** `NgeTableRenderedRow` carries
`isAlternate`, computed in `toNgeTableRenderedRows` / `toNgeTableVirtualRows` from the same
position the window itself is built from, and the template turns it into a
`nge-table__row--alt` class.

The two rejected sources are worth naming, because each is the obvious choice from one angle:

- **`:nth-child`** — what CSS offers, and what the slot-context doc comments originally
  suggested. It reads the DOM, and under virtualization the DOM holds a *recycled window*: a row
  moves between DOM positions as the window slides, so the stripes would stand still while the
  rows travelled through them. This is the failure the acceptance criteria demand be checked by
  scrolling rather than by a static screenshot.
- **TanStack's `row.index`** — the position in `config.data`. `getSortedRowModel` shallow-copies
  each row, so `index` survives a sort unchanged and the stripes would scramble into an arbitrary
  pattern the first time a column was sorted.

**Precedence is structural: the stripe does not enter the contest.** `.nge-table__row--alt` sets
*only* `--nge-table-internal-row-surface`; it never declares `background`. The base
`.nge-table__row` rule already resolves through that property, so a stripe changes the value that
one declaration resolves. Hover and selection therefore remain the only other rules declaring the
property, and they keep beating the base rule exactly as they did before the feature existed —
hover on specificity (`(0,2,0)` against `(0,1,0)`), selection on source order.

The alternative — declaring `background` on the modifier and holding it down with `:not()`
exclusions and careful source order — was rejected on maintenance grounds. That rule scores
`(0,1,0)`, a tie with `.nge-table__row--selected`, so source order becomes load-bearing and every
future row-level mark has to be declared after it or added to the exclusion list. Forget once and
the stripe silently out-ranks the new mark *on alternate rows only*, which is the hardest kind of
visual bug to notice.

The cell-level marks never entered the contest at all. Range, column selection, highlighting and
the fill region all paint `.nge-table__cell`, and a cell is a rendering descendant of its row,
so its background paints over the row's regardless of the cascade.

**The pinned lanes read the same property**, so a striped row stays one continuous band rather
than breaking into three at the lane seams. The property inherits from the row, and the alternate
surface is opaque both in the library default and in all ten theme bridges, so the lane's
opacity requirement (ARCH-243) still holds.

Striping carries **no state**: it is absent from `NgeTableState`, never persisted, and never a
field on the datum. It is display, re-derived on every render.

### Charts in cells, and the settle signal (ARCH-291)

"A cell is an arbitrary Angular render target" had been an architectural claim since ARCH-239 and
never once code. This is the story that makes it real — and the general seam that makes it
affordable under virtualization, shipped together the way ARCH-248 shipped the export seam with
its reader.

`NgeCellContext` gains **`isSettled`**, meaning "the scroll has been quiet long enough to render
expensive content". A cell template branches on it:

```html
<ng-template ngeCell="series" [ngeCellOf]="rows" let-cell>
  @if (cell.isSettled()) { <nge-chart [config]="chartFor(cell.row)" /> }
  @else { <nge-cell-shell /> }
</ng-template>
```

A chart, an image, a map and a third-party widget all benefit from this with no cooperation from
their own libraries, which is what makes it a seam rather than a chart feature.

**It is a field on the context, not a `NgeTableEvent`.** That output exists to notify the *host*;
a "load now" event would make a consumer hold per-cell render flags and feed them back, which is
the data flow the slot seam exists to remove. ARCH-246 already settled the shape — *a slot is a
place, not a state* — and this is the same answer applied to a fact rather than a template.

#### The memoisation collision, and why the field is signal-valued

⚠️ **This is the design question the story turns on.** Cell contexts are memoised against the
engine `Cell` on the stated grounds that a cell's value cannot change under it; header and row
contexts are deliberately *not*, because `sortDirection` and `isExpanded` move. **A settled flag
moves.** So a plain boolean on a memoised context is read once at first build and served stale for
the life of the row model — the cell renders, the shell appears, and it simply never resolves.

Two routes existed and the second was taken:

- Drop cell memoisation — a new context object per cell per render, which is the allocation churn
  virtualization was added to avoid, and the opposite of this story's goal.
- Make the field **signal-valued**, so object identity stays stable while the value stays live.

`nge-table-slot-registry.spec.ts` pins both halves in one assertion pair — same object, moved
value — and it is the spec that fails the day someone simplifies the field back to a boolean. The
`flexRender` thunk is untouched by any of it: it is still built once in `toNgeCellTemplateMap`,
because `ngOnChanges` on `content` clears the view container.

#### The engine already answers "has it settled"

**Nothing in this library listens to a scroll, and nothing should start.** `virtual-core` sets
`isScrolling` on the first scroll event and clears it after `isScrollingResetDelay` of quiet —
150ms by default, and `useScrollendEvent` is off, so the debounce rather than a browser-dependent
`scrollend` is the path taken. That *is* "quiet for N ms" with exactly one knob, so
`NgeTableStore.scrollSettled` is one `computed` over `rowVirtualizer.isScrolling()` and every cell
context closes over that single signal. The Angular adapter lists `isScrolling` among the
attributes it transforms to signals, so it is reactive by construction rather than by arrangement.

This is the same instinct as registering a `TableFeature` instead of editing a switch: adding a
second scroll listener beside the engine's would be inventing here what TanStack already provides.

⚠️ **Binary, not a velocity, and no knob reaches the public config.** A velocity threshold is a
tuning constant that is wrong across trackpad momentum, wheel clicks and touch flicks, and becomes
something every consumer sets badly. "Quiet for N ms" has one knob and degrades correctly on its
own: a slow drag settles continuously, a fast flick shells the whole way. Tiered rendering by
scroll speed (shell → low fidelity → full) is a real technique and deliberately a later story.

**Without virtualization the flag is permanently `true`**, which is the honest answer rather than
a gap: `enabled: false` makes `virtual-core` skip its scroll listener outright, and a table
rendering every row builds each cell once and never recycles it — there is no per-slide cost to
defer, so a shell would cost a frame and save nothing.

**`toNgeCellContext` takes the signal as a required parameter**, and the export seam passes
`NGE_CELL_ALWAYS_SETTLED`. Required rather than defaulted deliberately: an export reads a row
model rather than a viewport, so always-settled is its *answer*, and a future caller inheriting
that answer by omission would be a deferred cell that never defers.

#### The shell belongs to the table

`<nge-cell-shell>` ships from this library, not from charts. If charts owned the skeleton then
images, maps and widgets would each need their own equivalent and this story would have blocked on
another library's release. ⚠️ **It does not animate**, and that is the point: a shimmer is a
per-frame paint on every node in the window, asked for at exactly the moment the frame budget is
tightest, and recycling would restart it on every window slide so it would read as a strobe rather
than as progress. It adds nothing to `_table-tokens.scss` either — its surface falls through to
`--nge-table-surface-variant`, which all ten themes already bridge, so it wears a host's theme for
free without adding an eleventh bridge entry to get wrong.

#### The chart config is the consumer's, and the memo is load-bearing

⚠️ **The library never defines what a chart cell's data looks like.** The consumer supplies a pure
transform — row in, chart config out — and the library only calls it. There is no `chartType`
enum and no per-type branch: a sparkline, a grouped bar and a bullet are three different transforms
returning three different configs, and none of them is a table concern. The fixture's `series`
field is therefore *the demo's input to the demo's transform*, never a contract.

⚠️ **The memoisation is the half that is easy to drop and expensive to lose.** A factory called
straight from a template allocates a new config on every change-detection pass, so `<nge-chart>`'s
`config` input changes identity and the chart re-renders — which under virtualization is precisely
the cost the settle signal exists to avoid. The story memoises per `row.id`.

**Zero charts-library change was needed**, and this was established before the story committed to
anything: axes are opt-*in* (`showXAxis` / `showYAxis` default `false`), `legend` renders only when
present, header and footer do not exist in `NgeChartConfig` at all, `base.margin` is a fully
overridable `Partial`, and `animationMs: 0` genuinely collapses enter/update/exit.
`createSparklineChartConfig` and its column / win-loss siblings already default to a 2px margin, no
axes and no legend. A future story that finds itself needing a charts change here should stop
rather than reach for one.

Two constraints a cell chart cannot escape:

- ⚠️ **`<nge-chart>` attaches a shadow root**, so the mark is unreachable from the light DOM —
  and the obvious probe does not merely fail, it lies. `document.querySelector('nge-chart svg')`
  returns a **0×0 svg**: the always-instantiated `<nge-chart-tooltip>`'s arrow, which lives in the
  light DOM. A check written that way finds an svg, measures zero, and reports a collapsed chart
  that is rendering perfectly. Measured during this story — 26 charts, 26 zero-sized light-DOM
  svgs, 26 correctly-sized marks inside the shadow roots. Reach the real one through
  `chart.querySelector('.nge-chart-container').shadowRoot.querySelector('svg')`, or verify
  visually. Its height is a **percentage**, so it needs an ancestor whose
  height is *definite*; in a zero-height or `height: auto` box it collapses to nothing.
  ⚠️ **A table cell already satisfies that**, and the distinction is worth stating because the
  folklore version ("always wrap it in a fixed-height div") sends people chasing a wrapper that
  changes nothing: `.nge-table__cell` carries `height: var(--nge-table-row-height)` and never
  `auto`, so a bare `<nge-chart>` dropped straight into one fills the row. What actually gives a
  sparkline room is `config.rowHeight`, not a wrapper. The wrapper earns its place for two *other*
  reasons — matching the shell's inset and surface (below) — and for portability to a context with
  no definite height of its own, such as a story panel or a `row-detail` band. Checked in a browser
  rather than reasoned about.
- ⚠️ **`animationMs: 0`.** Recycling re-creates the cell on every window slide, so an entrance
  animation replays per slide.

#### What the signal actually buys, and why the obvious measurement cannot see it

⚠️ **`isSettled` does not make a chart cheaper.** It moves the work off the scroll and onto the
settle, where a long frame is invisible because nothing is moving. ⚠️ **And at sparkline weight it
does not measurably do even that** — see the numbers below, where the gate defeated and the gate
engaged are the same figure. The signal buys **headroom**, not a demonstrated saving. Claim that
and nothing more; the stronger version did not survive being measured.

⚠️ **The acceptance criterion, read literally, passes vacuously.** "A scripted scroll of the 10k
fixture with the chart column present stays inside ARCH-289's frame budget" — but the harness
advances `scrollTop` on *every* measured frame, so each frame resets `virtual-core`'s 150 ms
`isScrollingResetDelay`, `isScrolling` never clears, and **not one chart is ever built**. The
instrument would time a column of grey shells and report a pass. A second artifact sits at the
start of such a run: charts mounted before the first scroll event all unmount on it, so the
opening frames measure a mount-and-destroy burst rather than steady state.

The cost this feature actually creates is the **settle burst** — a window's worth of charts
mounting in one frame, each attaching a shadow root, constructing a `ResizeObserver` and running a
full render. `Performance/Chart Cells/Interaction` therefore carries two instruments rather than
one, and a `cellMode` control (`gated` / `always-chart` / `always-shell`) so the scroll can be run
with the gate defeated. ⚠️ `always-chart` is a **measurement control**, never a supported pattern:
the library offers no way to switch the gate off, and the story reaches around it by ignoring
`cell.isSettled()`.

#### What it measured — and the answer is "nothing, at this weight"

Apple M5 Max · 60 Hz · Chrome · 2026-07-28, all in one warm session. Baseline at 120 × 240 px;
chart cells at 120 × 288 px (an exact multiple of the 96 px row, so `rowsAdded` stays whole).

| Run | p95 median | worst | dropped | rows built |
| --- | --- | --- | --- | --- |
| Baseline, no chart column | 17.2 ms | 17.6–17.7 ms | 0 | 714 |
| Chart cells, `gated` | 17.0 ms | 17.5–17.7 ms | 0 | 357 |
| Chart cells, `always-chart` | 17.1 ms | 17.5 ms | 0 | 357 |
| Chart cells, `always-shell` | 17.2 ms | 17.5 ms | 0 | 357 |

```
settle burst (gated, 2 runs)   charts mounted 19 · to first chart 150.3 / 150.2 ms
                               worst frame 17.6 / 17.7 ms · dropped 0 · idle frame 16.7 ms
```

**The floor and the ceiling are the same number.** Every mode lands within 0.2 ms of every other —
inside each run's own 1.8–3 % spread — and nothing dropped a frame anywhere. **`to first chart`
lands within 0.3 ms of the engine's 150 ms `isScrollingResetDelay` on both runs**, which is the
settle contract confirmed by measurement rather than asserted; and 19 charts mounting in the burst
still produced a worst frame indistinguishable from idle.

⚠️ **Three readings this does NOT support**, each of which the numbers invite:

- *"The gate is what keeps the scroll fast."* It is not — `always-chart` was equally fast.
- *"Charts never render during the scroll, so the comparison is void."* They do. Sparklines are
  visible mid-scroll in `always-chart`; this was checked visually, because the earlier hypothesis
  that `<nge-chart>`'s 16 ms debounce was suppressing the render turned out to be wrong.
- *"All four cost the same."* ⚠️ **`p95` on a vsync-locked display cannot distinguish 1 ms of work
  from 15 ms** — both yield a ~16.7 ms frame. It moves only when work *exceeds* the budget. Four
  identical p95 figures mean **"all four fit inside the frame budget"**, which is a weaker and
  different claim. The same blindness will affect ARCH-292 / ARCH-293 / ARCH-294: this instrument
  will report "no cost" for editors too, right up until something overruns.

**So the honest conclusion is the weak one.** A twelve-point sparkline with no chrome and
`animationMs: 0` is cheap enough that neither gating nor ungating it moves a 60 Hz budget. The
settle signal's value here is **headroom** — for heavier cells, denser windows, slower machines —
not a demonstrated saving. It is worth keeping on those grounds, and worth *not* claiming more for.
To put a number on what it buys, something has to exceed the budget first: raise `stepPx` until
rows-per-frame does it, or measure a heavier cell.

#### The limit the settle signal does not cover: resize × `ResizeObserver`

⚠️ **A column drag is the one gesture where every visible chart re-renders per frame, and
`isSettled` does nothing about it.** `<nge-chart>` observes its container with a native
`ResizeObserver`; a resize drag writes `state.columnSizing` on every `pointermove` frame (that is
what makes the column follow the pointer); so every chart in the window is re-measured and redrawn
at pointer rate. And the settle flag is *scroll*-derived — during a resize the viewport is
perfectly still, so the flag reads settled and every chart is live precisely when the storm hits.

**This is documented as a limit rather than measured, and the distinction is deliberate.**
ARCH-289's instrument scrolls a viewport on a fixed schedule; it cannot drive a pointer drag, so
putting a number on this needs a second instrument rather than another run of the first. The story
that wants that number should build it, and until then a table combining chart cells with
drag-to-resize over a wide window should be treated as unmeasured, not as known-good.

⚠️ **The tempting fix is the wrong shape.** A "resize-settled" flag alongside `isSettled` would
double the vocabulary of the cell context to cover one gesture, and the next expensive gesture
would ask for a third. If this needs solving, it is one general "the table is in a live gesture"
question with one answer, decided in its own story — not a second flag bolted beside this one.
Nothing here forecloses it; the field is already signal-valued, which is the part that would have
been expensive to retrofit.

#### What an array-valued accessor forces

Three per-column answers, each pinned in `nge-array-cell.spec.ts`. They are answers for *this
column*, not library rules — a transform reading three scalar fields faces none of them.

| Seam | Default behaviour | The column's opt-out |
| --- | --- | --- |
| Export | `raw` is the array; `formatted` is `String(value)` → `"1,2,3"`, which the CSV writer then quotes because it holds the delimiter | `meta.ngeExport.format` |
| Sorting | Sortable, because nothing infers "unorderable" from a type — and ordering a `number[]` answers no question a user asked | `enableSorting: false` |
| Fill | Copy-vs-series is inferred from finite numbers, so an array fails that test by construction and falls to the copy path without throwing | `meta.ngeFill.enabled: false` |

⚠️ **The chart column is never added to `NGE_TABLE_FIXTURE_COLUMNS`.** That array is still exactly
the seven columns it began with, and the frozen ARCH-289 baseline story renders it wholesale — so a
column landing there would change the epic's reference measurement by the back door, with nothing
to flag it. The story declares its own column set, and its cost is measured in its own
`Performance/Chart Cells/Interaction` story against a baseline re-run in the same session.

### Inline editing (ARCH-292)

"Inline editing is a cell pattern, not a table feature" has been said twice already — when the
substrate was locked in Wave 0, and again when the render-slot seam shipped (ARCH-246) — and never
once had plumbing behind it. This story is that plumbing: the activation model that decides when a
cell is being edited, and the `edit-intent` event that lets a host apply what changes. It ships no
editor. `<input>`, a picker, a dropdown — those are ARCH-293 (the library's own controls) and
ARCH-294 (composite, panel-based ones), building on exactly what lands here.

**The data boundary is inherited, not re-decided.** ARCH-271 already settled what a proposed change
to *data* looks like — the library proposes, the host applies — and editing takes that shape rather
than reopening the question:

```ts
onEvent(event: NgeTableEvent<Row>): void {
  if (event.kind !== 'edit-intent' && event.kind !== 'fill-intent') return;
  this.rows.update(rows => applyPatches(rows, event.cells));   // one function, either kind
}
```

`edit-intent` and `fill-intent` carry the same `NgeCellPatch` — `columnId`, `rowId`, `value`, and
`previousValue` for the host's own undo — which is what lets one `applyPatches` serve both. They
stay two `kind`s rather than one, so a host that accepts a fill can still reject a hand-typed edit,
or the reverse; collapsing them into a single kind would take that choice away along with the
duplication.

**The four callbacks live on the context itself, not behind an injected bridge.** `beginEdit`,
`cancelEdit`, `commitEdit` and `isEditing` are members of `NgeCellContext`, for the same reason
`NgeSelectionCellContext.toggle` is (ARCH-278): a projected `ng-template` resolves DI from its own
*declaration* injector — the consumer's — and can never reach `NgeTableStore`. The table is already
building this object and can close over its own store, so the answer travels with the question. No
per-table provider scope is needed, unlike ARCH-250's highlight bridge, which needed one because its
overlay has to *ask* the table something the context alone cannot answer.

#### Activation is the default; always-live is the exception

A column opts in with `meta.ngeEdit.enabled`; a cell reads `NgeCellContext.isEditing()` and swaps
its read-only text for whatever the consumer's own `[ngeCell]` template renders while it is true —
the same division of labour ARCH-291 uses for `isSettled()` and a chart.

**Activation is the default, and the reason is arithmetic.** Rendering a control unconditionally on
every editable cell means thirty visible rows across three editable columns build ninety control
instances nobody has asked to edit yet. Activation is what avoids building any of them until a click
or an `Enter` says otherwise. `meta.ngeEdit.alwaysLive` opts a column out of that saving, for the
case where the control *is* the reading rather than a way to change one — a column of sliders a user
scans down, say — and nothing else should reach for it, because every other column is paying for
exactly what activation exists to avoid.

Two routes call `beginEdit()`: a click, and `Enter` on a focused row. The second is the honest
answer to a real gap rather than a shortcut dressed up as one — there is no per-cell tab stop yet
(arrow-key grid navigation over a roving tabindex is a later, unticketed story), so a focused row
carries no notion of "which cell" for `Enter` to resolve against. It activates the row's *first*
editable column instead, which is what "activate on `Enter`" can honestly mean until grid navigation
exists, not a placeholder to be embarrassed about before then.

#### Edit state is scratch, not a saved-view slice

An in-progress edit is `NgeCellEditTarget` — a `{ columnId, rowId }` pair — held on
`NgeTableStoreState`, never on `NgeTableState`. The same call ARCH-268 made for its selection
anchor, and for the same reason: a saved view is what the table *is*, and an open editor is what a
user is *doing right now*. Persisting the second inside the first would let restoring a view reopen
an editor on a row nobody has touched this session.

⚠️ **Scrolling the edited row out of the virtualized window cancels the edit, and that is a
corollary rather than a separate rule.** Virtualization recycles DOM — the slot that rendered row A
a moment ago renders row B once the window slides — so a draft tracked any way other than by the
row's own id would have nowhere honest to land the moment that happens. It would surface against
whichever row scrolls into the recycled slot, which is the shape of a bug that reads as data
corruption rather than as an edit that was, correctly, abandoned.

#### The memoisation collision, inherited rather than re-decided

`isEditing` is signal-valued for the reason ARCH-291's `isSettled` is, and this story treats that as
settled rather than reopening it. Cell contexts are memoised against the engine `Cell` on the
grounds that a cell's *value* cannot move under it — which makes any plain field on that object
frozen at first build. A plain boolean would be read once: a cell activated after that first build
would never see it, the read-only text would stay, and the failure would look exactly like a wiring
bug in the click or the `Enter` handler rather than in the field's shape.

⚠️ **But the cost profile is the opposite of `isSettled`'s, and that is worth stating rather than
assuming away.** `isSettled` describes the *viewport* — one scroll, one signal, shared by every cell
in the table. `isEditing` describes the *cell* — whether this one, specifically, is open — so an
opted-in table allocates one `computed` per cell rather than one for the whole table. A table with
no editable column pays none of it: `NGE_CELL_NO_EDIT` is a single frozen bundle (its always-false
signal, `NGE_CELL_NEVER_EDITING`, mirrors `NGE_CELL_ALWAYS_SETTLED`) returned by reference for
every cell, so "the feature is available but unused" costs exactly what it cost before the feature
existed. That is what makes ARCH-289's frame-budget criterion a structural property of the design
rather than a number that happened to come back clean.

`toNgeCellContext` takes both `isSettled` and `edit` as **required** parameters, for the reason
ARCH-291 made `isSettled` one: a caller with no viewport and no editing story — the export seam —
hands over `NGE_CELL_ALWAYS_SETTLED` and `NGE_CELL_NO_EDIT` explicitly, rather than inheriting
either by omission. A defaulted parameter would let a future caller inherit "always settled" or "not
editable" by accident — a deferred cell that never defers, or an editable cell that can never be
activated — and both failures look like success until someone asks why nothing happens.

#### Finding: the interactive-element guard has to live in core, and has to be role-based

The ticket assumed the range addon's own guard — a tag list: `input`, `button`, `select`,
`textarea`, `[contenteditable]` — was the whole of what a cell's control needed to be left alone by.
It was not, in two directions at once, and both are now fixed together in `NGE_INTERACTIVE_SELECTOR`
/ `isNgeInteractiveElement` (`src/lib/interactive/`).

**It has to live in core, not the range addon it started in, because row selection's `Space` asks the
identical question.** A `Space` keystroke typed into an in-cell control bubbles to the row exactly as
one meant to toggle selection does, and core cannot import from an addon to answer it — so the guard
moved up rather than being copied a second time.

**It has to be role-based, not tag-based, because a cell's control is not reliably a native tag.** A
cell is an arbitrary render target, so the control a design library ships for one — `cg-select`, a
composed slider, the table's own future editors — is a `div` carrying `role="slider"` or
`role="combobox"` at least as often as it is an `<input>`. The tag list matched none of those, so
dragging a composed control's own thumb was indistinguishable from a pointerdown on bare cell text:
it started a cell-range drag instead of moving the control. `NGE_INTERACTIVE_SELECTOR` now matches
on `role` — the ARIA widget roles from `button` to `treeitem` — plus a `data-nge-interactive` escape
hatch for a control with no role of its own to declare.

⚠️ **The ticket also proposed a bare `[tabindex]` clause as one more generalisation, and it must
never be added.** It reads as the obvious finish to "match more than native tags", and it is the one
addition that breaks every selectable table rather than fixing one control. Selection puts
`tabindex="0"` on the *row* whenever it is on, and the guard is a `closest()` walk from wherever the
pointer or the key landed — so from *any* cell inside a selectable row, `closest('[tabindex]')`
resolves straight to the row itself. Every cell in every selectable table would read as "inside a
control", and cell-range dragging would stop working table-wide, not for one control. The failure is
total rather than subtle, which is the only reason it was caught before shipping rather than after.
Roles rather than component names, for the same reason the extensibility gate audits for a central
switch elsewhere: naming `cg-select` in the guard would put one in front of a seam, and it would
still miss a control written after the list. A role costs nothing to extend, because a role is
something any control — including one that does not exist yet — can declare for itself.

**The leverage is in where the guard is already consulted.** `NgeRangeBridge` reads it in exactly
two places — `onPointerDown`, before a drag can start, and `takeKey`, before cmd/ctrl-`A` or
`Shift`+arrow can take the keystroke. Generalising the one constant therefore fixes the drag guard
*and* keeps both of those keyboard shortcuts out of an in-cell control's way, in a single change
touching neither call site.

#### Finding: `Escape` has three claimants, and containment beats coordination

The ticket named one existing claimant — the range addon's `Escape`, which clears a selection or
cancels an in-flight fill. It is not the only one: the **highlight addon** (`nge-highlight-bridge.ts`)
binds its own `Escape` at the document too, unconditionally, to clear whatever is marked. An edit's
`Escape` would be a third — and coordinating three independent, addon-owned document listeners, each
written without knowledge of the others, is an ongoing obligation rather than a fix.

**Containing the key at the cell is the version that does not require that coordination.** An
editor's own `Escape` calls `stopPropagation()` before the event ever leaves the cell, and because
`document` is the last stop on the bubble path, that single call starves every document-level
listener at once — the range addon's, the highlight addon's, and any addon written after this one —
without any of them changing, and without core ever having to enumerate which addons currently bind
the key. A future addon binding `Escape` at the document inherits the containment automatically, the
same way it inherits `isNgeInteractiveElement` without asking for it. ARCH-294's two-stage `Escape`
— closing a panel first, and only then cancelling the edit underneath it — builds on top of this
rather than around it.

| Key | Already claimed by | What this story does |
| --- | --- | --- |
| `Space` | Row selection's toggle | Guarded by the shared interactive-element check — the same generalisation the drag guard needed |
| `Escape` | The range addon's clear/cancel, the highlight addon's clear (both document-level) | Contained at the cell with `stopPropagation()`, so neither ever sees it |
| cmd/ctrl-`A` | Cell range's select-all (`takeKey`) | Free — `takeKey` already consults the guard |
| cmd/ctrl-`Space` | Column selection's keyboard route (`selectFocusedColumn`) | Free — scoped to a stamped header, which an in-cell editor never is |

⚠️ **None of this may regress ARCH-268's modifier-gated `preventDefault` on a row's `mousedown`.** It
is gated on `event.shiftKey` rather than applied unconditionally precisely because an unconditional
one suppresses *focus*, and a click meant to focus an `<input>` inside a cell would never land it.
The gate existed for this reason before this story landed; it is a constraint this story depends on
rather than one it introduces.

#### No core switch beyond the flag

`meta.ngeEdit.enabled` is the only decision core makes about "is this column editable". What
renders during an edit is a `[ngeCell]` template resolved through the same registry every other
custom cell uses — never a branch in `<nge-table>`'s own markup, never an `if (editable)
renderOurInput()`. Introducing one would be the first central switch this epic's own extensibility
gate exists to catch.

This is also the seam ARCH-293 hands off into: its library-shipped editors are, in ARCH-278's
language, *defaults a `[ngeCell]` template shadows* — which needs a route for a library-shipped
editor to become "the" template for a column before a consumer has written one, while still yielding
to a consumer's own template the moment they do. **That route turned out to be a second lookup
rather than a branch** — see § Cell editors.

#### `config.getRowId` stops being optional

The moment any column sets `meta.ngeEdit.enabled`, the same dev-mode throw ARCH-268 added for row
selection applies here, for the identical reason: an edit is id-keyed scratch state, and without a
stable `getRowId` the engine keys by array index, so a sort or a re-fetch would leave an in-progress
edit — or its cancellation on scroll — resolving against whichever record now occupies that position
rather than the one the user opened.

#### Finding: the store had reached `signalStore`'s fifteen-feature ceiling

⚠️ **`signalStore` is typed by overload and the widest overload takes fifteen features.** A sixteenth
is not rejected — it simply matches no overload, so inference collapses: every store member degrades
to an index signature and `store.table` types as `Function`.

**The reason this is worth a section is where the errors appear.** Adding a sixteenth block produced
around forty `TS4111` and `TS2339` errors in `nge-table.component.ts`, so every signal pointed at
the component — a file that had not been touched. The way back is to check the base: `npx tsc -p
libs/shared/table/tsconfig.lib.json --noEmit` on a clean tree reports zero errors there, so dozens of
them on a branch means a feature was appended, not that the component broke.

This story recorded the consequence as "a new concern joins an existing block or replaces one — it
never appends", and named the alternative — extracting groups into `signalStoreFeature()` units — as
a real option deliberately declined, since it would have been a store-wide refactor riding along
inside a feature story. **ARCH-297 is that story, and it took the alternative**; see § The store's
composition root. `editEnabled` no longer sits among the render facts, because the reason it did was
this ceiling rather than cohesion.

## Cell editors (ARCH-293)

The table ships two editors of its own — `<nge-cell-input>` (text and number) and
`<nge-cell-checkbox>` — behind a third entry point, `@nge/table/editors`. A column names
one and the table renders it:

```ts
import { NgeCellInputComponent } from '@nge/table/editors';

{ accessorKey: 'quantity', header: 'Quantity', id: 'quantity',
  meta: { ngeEdit: {
    editor: NgeCellInputComponent,
    editorInputs: { type: 'number' },
    enabled: true,
  } } }
```

### The route: a second lookup, not a branch

ARCH-292 left one question open and ruled out the obvious answer to it. The editors had to become
"the" template for a column *before a consumer has written one* while still yielding the moment they
do — and a branch in `<nge-table>`'s markup was forbidden, because an `if (editable)
renderOurInput()` is the first central switch the extensibility gate exists to catch. A branch would
also have made the entry point a fiction: core would have had to import the editors it names.

The answer is that `NgeTableStore.cellTemplate(columnId)` gains a second lookup and the markup is
**untouched**:

```ts
cellTemplate(columnId: string): NgeCellTemplate | null {
  return (
    store.cellTemplateById().get(columnId) ??      // the consumer's projected [ngeCell]
    store.editorTemplateById().get(columnId) ??    // the editor the column named
    null                                           // …and then columnDef.cell
  );
}
```

⚠️ **That order is the acceptance criterion, expressed as two lines rather than as a rule someone
has to remember.** Projected templates are consulted first, so a `[ngeCell]` shadows the editor.
Reversing them is exactly ARCH-278's recorded failure — the arrangement that "compiles, lints and
renders perfectly while silently ignoring every consumer template".

**What makes a component renderable through a template seam is the adapter, not us.**
`FlexRenderContent` accepts a `FlexRenderComponent` alongside a `TemplateRef`
(`angular-table/src/flex-render/view.ts`), so `NgeCellTemplate.content` widened to return either
and nothing else in the render path moved. ⚠️ **A bare component `Type` does not work**, and the
failure is silent: the adapter feeds it `props` as inputs *by name*, and a cell context carries no
`cell` key, so the editor's one required input would never be set. It has to be
`flexRenderComponent(editor, { inputs: { cell } })`.

⚠️ **The wrapper is memoised per cell context in a `WeakMap`, which is not an optimisation.**
`*flexRender` calls the thunk on every change-detection pass of every rendered editable cell, so a
fresh wrapper each time costs a `reflectComponentType` per cell per pass *and* invalidates the
adapter's memo key — the churn the cell-context cache and the stable-thunk rule already exist to
prevent. Keying on the context is safe for the same reason that cache is: a context is memoised
against its engine `Cell`, and anything that changes a cell's value rebuilds both.

`editorInputs` exists so an option is never a reason to abandon the route. Without it, "this column
is a number field" would mean writing a template, which is the work naming a component removes.
⚠️ Only inputs the component declares are applied — the adapter filters by reflected input names —
so a misspelled key is dropped in silence.

### Finding: focus follows the transition, never the field's presence

An editor has to focus itself. `Enter` on a focused row activates the row's first editable column
and focuses nothing (ARCH-292), so without it a keyboard-only user opens a field they cannot type
into.

⚠️ **But "the field exists" is the wrong condition, and getting it wrong is worse than not focusing
at all.** A column declaring `alwaysLive` reports `isEditing()` true from its first render *for
every cell at once*, so focusing on presence has every rendered row grab focus as it paints and the
last one to render win — a user's caret leaves whatever they were doing the moment such a table
appears. The condition is the **transition** into editing, which an always-live column never makes.
`focusNgeEditorOnActivation` holds the rule once for both editors, and its `null` start is what
makes a first observation never count as a transition. A spec pins it, and it fails against the
presence-based version.

### Neither editor holds a draft, for two different reasons

The input's `<input>` DOM value *is* its draft. That is safe because activation bounds the element's
life: the field exists only while `isEditing()` is true, and ARCH-292 cancels an edit whose row
leaves the virtualized window, so there is no recycled node for a draft to survive onto.

⚠️ **A checkbox has no such bound when its column is always-live, so it commits on toggle.** The
tempting symmetry — hold the state, commit on blur — is a recycling bug: `[checked]` re-derives from
the cell, and Angular writes a property binding only when the **bound** value changes, so a box
unchecked on a `true` row and recycled onto another `true` row keeps showing the stale unchecked
state because `true → true` is no change at all. Committing on `change` leaves nothing to go stale.
`Enter` commits too, since a browser fires no `change` for it; blur has nothing left to do. This
reads ARCH-293's "commit on `Enter` / blur" in substance rather than to the letter, deliberately —
and the substance is that a flipped checkbox is a decision, where a half-typed string is not.

⚠️ **The input's blur handler is guarded on `isEditing()`, and dropping the guard ships a bug.**
Removing a focused element fires a native blur — the browser's own focus-fixup step — and `Escape`
does exactly that: it clears the edit, which tears the field down a moment later. Without the guard
that teardown blur commits the draft `Escape` discarded, and it presents as `Escape` not working.

**`Escape` is not bound in either editor.** ARCH-292 contains it at the cell, the one position from
which a `stopPropagation()` starves the range and highlight addons' document-level listeners at
once. A second claimant inside the editor is the coordination that finding rejected.

### Why these are not general form controls

⚠️ **A cell editor is not a form control, and that is what makes it affordable.** No
`ControlValueAccessor`, no `NgControl` injection, no label element, no validation, no touched or
dirty tracking — there is no form. Signal inputs and `OnPush` only. That per-instance saving is the
justification for the table owning them rather than reusing a domain's `cg-input`, and it is why a
richer control is a consumer's `[ngeCell]` template rather than a bigger editor.

⚠️ **`<nge-cell-checkbox>` is not ARCH-268's selection checkbox.** That one is a pointer affordance
— `tabindex="-1"`, `aria-hidden`, driven by `state.rowSelection` and announced by the row it sits
in. This one is a focusable control that proposes a value, so it is a real tab stop with a real
label. Do not reuse one for the other.

### What the editors cost: nothing measurable

`Performance/Cell Editors/Interaction` carries a `withEditors` toggle, so the comparison is a
controlled pair rather than a reading — the identical seven fixture columns, identical geometry
(40px rows, 240px steps), one machine, one session, the editors the only variable. Off, it renders
exactly what the frozen ARCH-289 baseline renders.

⚠️ **The always-live boolean column is the honest subject.** Activation means an *activated* column
builds no control at all while nobody is editing, so a story measuring only those would measure
almost nothing and report a pass. `Active` is `alwaysLive` here, so every rendered row really does
construct a control — the worst case a consumer can configure.

```
Apple M5 Max · 60Hz (16.7ms idle frame) · Chrome · 120 frames x 240px · 2 runs each
                  p95 median          worst          dropped     rows built
editors on        16.9ms (16.9–17.0)  17.6ms         0 / 240     714
editors off       17.3ms (17.1–17.4)  17.6–17.7ms    0 / 240     714
```

**Editors-on measured marginally *faster*, and that is the finding.** The difference between the
medians (2.4%) is smaller than the off-pair's own spread across two identical runs (1.8%), and its
sign is backwards — which is a cleaner demonstration that the number is noise than any tolerance
argument would be. Both settings sit inside the baseline's recorded band, and `rowsBuilt` held at
714 across all four runs, which is the machine-independent half of the check.

⚠️ **Read this as "both fit", not "both cost the same".** On a vsync-locked display p95 cannot
separate 1ms of work from 15ms; it moves only when work *exceeds* the frame budget. The same caveat
ARCH-291 recorded applies here, and the claim this measurement supports is exactly the acceptance
criterion's: the frame budget is unchanged with an editable column present.

### Theming, and the entry point's enforcement

`--nge-table-editor-*` is a family of its own rather than a reuse of the surface tokens, because a
field has to read as *sitting on* the row: on a themed table `--nge-table-surface` and the row
routinely resolve to the same colour, and a field that inherited it would have only its border to
say it is a control. The colour-carrying members are bridged into all ten domain themes; geometry
and `font-size` (which defaults to `inherit`) are not, on ARCH-277's test — *would a bridge entry
teach a contract the table does not honour?*

⚠️ **The focus ring is `--nge-table-focus-ring-*` drawn inset.** `.nge-table__cell` carries
`overflow: hidden` and is deliberately unpositioned (ARCH-243, both staying), so a ring drawn
outside the box is clipped on every edge and a keyboard user loses their only cue.

**`src/entry-points.spec.ts` is what makes the third entry point structural rather than a
convention.** It walks the transitive relative-import closure of `src/index.ts` and fails if it
reaches `src/editors/` or `src/testing/` — the transitive part being the point, since a core module
importing an editor is exactly as bad as the barrel doing it and considerably harder to notice.
⚠️ Confirm such a walker can fail before trusting it: append `export * from './editors'` to the
barrel and watch it go red. A resolver that silently returns nothing passes everything.

## The select editor (ARCH-294)

`<nge-cell-select>` is the third editor and the one that brought `@angular/cdk` into the library. A
column declares it with `ngeCellSelectEdit(options)`; a flat `@for` over primitives renders in a CDK
overlay. The cheapness reasoning is ARCH-293's, applied a third time — no `ControlValueAccessor`, no
per-option `TemplateRef`, no content projection — and richer needs are served by the `[ngeCell]`
seam rather than by growing this control.

### Why a body-level overlay is what keeps the substrate intact

`.nge-table__cell` carries `overflow: hidden` because cell content is arbitrary, and it is
deliberately unpositioned so pinned lanes stay sticky (ARCH-243). Both stay. The CDK attaches its
panel to a container appended to `<body>`, so cell clipping is simply irrelevant to it — which is
what makes a dropdown in a cell possible without touching the substrate at all. ARCH-271's fill
handle hit the other side of this wall (a grip cannot overhang a corner) and had to ride the slot's
flow position instead.

### Finding: the scroll strategy the ticket specified was solving a problem this table does not have

The story called for `CloseScrollStrategy` — close the panel on scroll — against the fear that
virtualization destroys the trigger and leaves CDK positioning against a detached element. The fear
is reasonable and the conclusion was wrong, and a single line decides it: `nge-table.component.html`
`@for`-tracks rows by `rendered.row.id`, so a row leaving the window is **destroyed rather than
recycled onto another record**. The editor component dies with its row and its `DestroyRef` teardown
disposes the overlay.

That makes "follows the trigger" and "closes when the row is gone" the *same* mechanism rather than
alternatives. `RepositionScrollStrategy` tracks while the row is visible and inherits the close for
free. Measured at 25px per frame: thirteen frames tracking exactly, **zero** frames positioned at the
detached `{0,0,0,0}` origin, clean close on the fourteenth. The cost of closing on the first scroll
event instead is losing a dropdown to an inertial trackpad brush.

⚠️ **This is load-bearing on destroy-not-recycle.** Row recycling ("reuse row controllers across
window slides") sits in this epic's unticketed backlog; if it lands, a recycled trigger stays
connected while showing a different record and the panel would follow the wrong row. The strategy has
to be revisited before that ships — and the coupling runs the opposite way to intuition, since the
*more* efficient row model is the one that breaks the overlay.

⚠️ **`autoClose` is deliberately unset.** It measures the overlay against the browser viewport and
carries an upstream TODO about ancestor scroll containers, so in a table that scrolls in an inner
viewport it would almost never fire — an inconsistent half-measure over a teardown that already
covers the case.

Whatever the strategy, `detachments()` must be subscribed: one that detaches rather than disposes
otherwise leaves the component believing a panel it can no longer see is open.

*Generalisable*: an acceptance criterion can encode a **mitigation** rather than a requirement. This
one read "scrolling closes the panel", but what it wanted was "the panel is never positioned against
a dead element" — and once the row model was checked, the requirement held without the mitigation.

### Finding: the options key the ticket asked for could not exist

The story specified options on a namespaced column meta key, "the way `meta.ngeExport.format` and
`meta.ngeFill.enabled` already are". Those two are top-level because **core** reads them — the export
seam and the fill feature. A `NgeCellContext` carries `columnId` as a *string* and no `Column`, so an
editor cannot read column meta by any route; the inputs the adapter spreads are its only channel.
A `ngeSelect` key would therefore require core to learn what a select is — the central switch the
extensibility gate exists to catch.

Options ride `meta.ngeEdit.editorInputs`, which is still namespaced and still not a bare
`ColumnMeta` field. `ngeCellSelectEdit()` exists because `editorInputs` is `Record<string, unknown>`
and the adapter drops a key the component does not declare **in silence** — an empty panel reads as a
data problem rather than as a typo.

*Generalisable*: when a specification cites precedents, check why those precedents have the shape
they do. Following this one to the letter would have satisfied its acceptance criterion and violated
the epic's central lock.

### Finding: containment is a claim about a position, not about a key

ARCH-292 contains `Escape` by stopping it at the cell, which starves the range and highlight addons
because `document` is last on the bubble path. **That containment does not reach a body-level panel
— it never runs there at all.**

The CDK dispatches overlay keydowns from a listener on **`body`**, one node before `document`
(`overlay-keyboard-dispatcher.ts:31`). So `stopPropagation()` inside `overlayRef.keydownEvents()` is
the same trick applied one node earlier, and it starves the same addons symmetrically.

But the trigger sits *inside* the cell, so a key raised there is stopped by ARCH-292's containment
before it ever reaches `body` — meaning stage one would be skipped and the first `Escape` would
cancel the edit outright. Hence two claimants: the panel's stream, and a trigger handler **guarded on
the panel being open**. With no panel the key is untouched and stage two is inherited rather than
reimplemented, which is what keeps this from being the coordination ARCH-292's finding rejected.

⚠️ **The panel closing is not evidence the containment works.** Delete the `stopPropagation()` and
the panel still opens, closes and commits; exactly one spec goes red — the one that installs a
document listener and asserts it never fires. Keep it.

### Theming a panel that is not in the table

The claim "tokens do not reach the panel" is nearly right, and the imprecision points at the wrong
fix. `:root` defaults **do** reach it — the overlay container is a child of `<body>`, itself a
descendant of `:root` — which is why the panel renders correctly with no theme and why that is the
least informative case to check. What does not follow it out is anything scoped tighter: a theme
class on a wrapper, and `<nge-table>`'s inline host geometry, which outranks a class anyway.

`applyNgeEditorPanelTokens` resolves `NGE_EDITOR_PANEL_TOKENS` through `getComputedStyle` **at the
trigger** and copies them onto the pane. That answers every scoping at once and needs no knowledge of
a domain's theme-class naming — where copying a theme class, `cg-select`'s approach, needs exactly
that. ⚠️ **Add a token a panel reads and add it to `NGE_EDITOR_PANEL_TOKENS` in the same change**,
or it will work at `:root` and silently not under a theme. Verify by measuring the rendered panel,
never the wrapper's declared token.

Both live in `src/editors/nge-cell-editor-panel.ts`, holding the union of what the two panel editors
read. One shared list is what turns that rule from something to remember into something structural —
a second editor cannot forget a list it does not own, and an unresolved token costs the other editor
a lookup and nothing else, because a value that comes back empty is skipped rather than written.

### The one editor that is always-live by default

`ngeCellSelectEdit()` sets `alwaysLive: true`, which no other editor does. The reasoning is
ARCH-293's checkbox argument reaching a second control rather than a new principle: activation
exists to avoid *building* things nobody engaged, and for a select what it avoids building is one
`<button>` per visible row. Against that it charges a click to activate before the click that
opens, and — the part that actually decides it — leaves the cell rendering as bare text, which
tells a user nothing about the column being a select at all.

⚠️ **The expensive half is deferred regardless, and that is what makes this cheap rather than a
concession.** The overlay, the portal and the option list are constructed on open and never before,
so a table showing thirty triggers holds zero panels.

A column passing `alwaysLive: false` gets the read-only text branch and the two-click gesture — the
right trade for a dense, read-mostly grid where a trigger per row is noise. ⚠️ It is also the
setting a story section about the **two-stage `Escape`** needs: with the column always-live there is
no activation for the second press to cancel, so stage two demonstrates nothing.

### What came free, and what the entry point now proves

`role="combobox"` on the trigger is the entire cost of the "a range drag on the trigger selects no
cells" criterion — `INTERACTIVE_ROLES` already carries `combobox`, `listbox` and `option`, so the
drag guard plus cmd/ctrl-`A` and `Shift`+arrow containment all arrive with the attribute. Focus goes
to the panel itself rather than roving over options, with `aria-activedescendant` announcing the
active one; a roving `tabindex` would move focus per keystroke and defeat stage one of `Escape`.

`entry-points.spec.ts` gained the **package** half. The directory assertions prove the barrel imports
no file under `editors/`; they say nothing about `@angular/cdk`, which is what that separation was
created to contain. `FORBIDDEN_PACKAGES` closes it, with a companion assertion that the walker still
finds the package from the editors entry point — a guard that would otherwise pass against every
possible tree.

## The textarea editor (ARCH-296)

`<nge-cell-textarea>` is the library's fourth editor and the first whose commit is **explicit**. A
column declares it with `ngeCellTextareaEdit({ rows, maxlength, placeholder })`; the cell shows
read-only truncated text until activated, then an overlay panel opens carrying the field, a **Cancel**
button and an **Apply** button.

### Why a control can run out of implicit moments

The three earlier editors each found a different natural instant to commit at: `<nge-cell-input>` on
blur, `<nge-cell-checkbox>` on toggle, `<nge-cell-select>` on selection. A textarea has none of
them.

`Enter` is unavailable because it inserts a newline, and multi-line input is the entire reason a
column reaches for a textarea rather than an input — taking the key would remove the feature the
control was chosen for.

Blur is unavailable for a sharper reason, and it is **the exact inverse of ARCH-293's recorded
finding**. There, a blur handler needed *guarding* on `isEditing()`, because removing a focused
element fires a native blur and `Escape` does exactly that, so the teardown blur would commit the
draft `Escape` had just discarded. Here the problem runs the other way: clicking **Cancel** blurs the
field on its way to the button while the edit is still perfectly live, so the guard passes and a
commit-on-blur applies the very edit Cancel exists to discard. **The guard is not enough — the
handler must not exist**, and there is none in the class or the template.

What generalises past this control is the shape of the answer rather than the control: **a control
whose natural gestures are all ambiguous needs explicit affordances, and adding them is cheaper than
inventing a rule about which keystroke means "done".** The alternative on offer was a convention —
`Shift`+`Enter` for newline, plain `Enter` to commit, say — which is a rule every consumer would have
to teach every user, in exchange for saving two buttons.

### Finding: a destroyed row takes an unsaved draft with it, and only here does that hurt

Rows are `@for`-tracked by `rendered.row.id`, so a row leaving the virtualized window is **destroyed**
rather than recycled — the editor dies with it and its `DestroyRef` teardown disposes the overlay.
ARCH-294 established that and depends on it; it is what makes `RepositionScrollStrategy` safe for the
select.

⚠️ **That is benign for a select and destructive for a textarea.** A select loses a closed list. A
textarea loses however much prose the user has typed, silently, mid-sentence, because they scrolled —
the failure that reads as data loss rather than as a UI quirk, and the only one in this library that
can.

The fix removes the failure rather than guarding against it: **`hasBackdrop: true`**, so the row
cannot leave the window while the panel is open. `.cdk-overlay-backdrop` is
`position: absolute; inset: 0; pointer-events: auto` inside the fixed-position overlay container on
`<body>`, so a wheel event over it targets the backdrop, whose scroll chain runs container → `body` →
`html` and **never** includes `.nge-table__viewport`. The draft can then stay where every other
editor keeps it — in the field's own DOM value — with no scratch state and no `NgeTableStoreState`
slice.

⚠️ **`scrollStrategies.block()` looks like the intended API and is a verified no-op here.** It
operates on `document.documentElement` and its own `disable()` doc comment says it unblocks
*page-level* scroll; this table scrolls in an inner viewport. It would read as implemented and change
nothing. **That is the third sighting of the same seam** — CDK's scroll machinery is written against
the browser viewport, and ARCH-294 found the identical limitation in `autoClose`, which carries an
upstream TODO saying so. Treat any CDK scroll API as meaning the *page* until proven otherwise.

The backdrop was **measured rather than reasoned about**, on the virtualized story section (2,000
rows, 80,045px of content in a 250px viewport), with real wheel events:

| Leg | `scrollTop` | |
| --- | --- | --- |
| No panel — the baseline | 0 → **500** | scrolls |
| Panel open, backdrop showing | 500 → **500** | blocked; panel and draft intact |
| After Cancel | 500 → **1,500** | scrolls again |

⚠️ **The middle leg counts as evidence only because the *page* scrolled instead.** A wheel that moved
nothing anywhere would show the event never landed, which is a different result wearing the same
face — and the baseline and the recovery legs are what separate "the backdrop blocked it" from "this
table never scrolled".

⚠️ **One caveat worth carrying, because it makes the measurement easy to get backwards.** CDK adds
`cdk-overlay-backdrop-showing` inside a `requestAnimationFrame`; until it lands, a transparent
backdrop computes to `visibility: hidden` and intercepts nothing. In a real browser that is a single
frame, before anything has been typed. In an **automation tab it never lands**, because a hidden tab
suspends rAF — so the class has to be applied by hand, and a run that skips that step watches the
table scroll and concludes the mechanism does not work.

⚠️ **The asymmetry with the select is the rule applied to different stakes, not an inconsistency.**
Making both block was considered and rejected: it would cost a select's user their scrolling and buy
nothing, on top of `block()` not working here at all.

### The panel is modal only while the draft is dirty

Blocking scroll leaves outside clicks to decide, and the ticket required both halves pinned — what
happens to the draft, and what the user is told.

A **clean** draft has nothing to protect, so an outside click closes the panel exactly as the
select's does. A **dirty** one keeps the panel and returns focus to the field. Dismissing there would
reintroduce the failure the backdrop exists to remove, only by a stray click instead of a scroll.

The telling half is an **"Unsaved"** hint beside the buttons, which appears exactly when the panel
starts refusing to dismiss — so the two are one explanation rather than a rule and a surprise.
Dirtiness is `field.value !== display()`, a local comparison against the cell rather than a record
that a key was pressed, so typing back to the original makes the panel dismissible again.

### `Escape` collapses to one stage, and the collapse is forced

ARCH-294's two-stage `Escape` — close the panel, then cancel the edit — is not inherited, and
inheriting it verbatim would have been wrong. Both of its stages were free because a select's trigger
is still a usable control with the panel shut. Here the column is never always-live, so a closed panel
with the edit still live leaves the cell as bare read-only text with **no way back into it**. That is
not a state worth having, so `Escape` cancels outright: the keyboard twin of Cancel, and neither asks
for confirmation, because both are deliberate abandonments.

The **containment** is inherited unchanged — `stopPropagation()` inside `overlayRef.keydownEvents()`,
because CDK dispatches panel keys from a `body` listener one node before `document`, which is the one
position that starves ARCH-269's range and ARCH-250's highlight addons at once. No trigger-level
handler is needed here, unlike the select's, because the panel opens on activation and focus is never
on the trigger while an edit is live.

⚠️ **Confirmed falsifiable, which is the only reason the spec is worth having.** Deleting that single
`stopPropagation()` fails exactly one spec — `never lets a panel Escape reach a document-level
listener` — and leaves *every* "the panel closed" assertion green. ARCH-250's lesson, third
confirmation. The same probe on the blur rule fails two of the three blur specs and leaves the third
green, because jsdom moves no focus on a synthesized backdrop click; the spec says so rather than
letting three sibling assertions imply equal cover.

### The one editor for which always-live is incoherent

`ngeCellSelectEdit()` offers `alwaysLive` and defaults it true. `ngeCellTextareaEdit()` does not
offer it at all, and the difference is a kind rather than a preference: a select's trigger costs one
`<button>` per visible row, while this editor's control is a **body-level overlay opened on
activation**. An always-live column would mean one panel per visible row, which is not a rendering of
a column at all.

The component takes a second lock rather than trusting the helper. It opens on the **transition** into
editing — the `null`-start rule `focusNgeEditorOnActivation` already holds for focus — so a
hand-written `meta.ngeEdit.alwaysLive: true` degrades to *no* panel rather than to thirty. The
trigger's click-stop exists only for that degraded state, where triggers sit with nothing over them.

### One token list, shared

`PANEL_TOKENS` and `applyPanelTokens` moved out of the select into
`src/editors/nge-cell-editor-panel.ts` as `NGE_EDITOR_PANEL_TOKENS` and
`applyNgeEditorPanelTokens`. ARCH-294's rule — add a token the panel reads, add it to the list in the
same change — is the kind that decays silently, and holding the list once makes it structural: a
second editor cannot forget a list it does not own.

A spec then checks it rather than the reader being asked to. `nge-cell-editor-panel.spec.ts` parses
both panel stylesheets for `var(--nge-…)` reads and fails naming any token missing from the array.
That is worth a test rather than a paragraph because of *how* the rule fails: a token left out works
perfectly with no theme loaded — the first case anyone tries — and is absent under every theme. The
pattern anchors on `var(` so a token a stylesheet **declares** is never mistaken for one it
**reads**, which is the difference between a forwarding obligation and an ordinary default.

Three tokens are new. `--nge-table-editor-on-accent` is bridged in all ten themes, because the Apply
button is **filled** with `--nge-table-editor-accent` to mark it as the commit and so needs a paired
foreground; a pair of identical buttons would put the decision back on the user to work out which one
proposes something. `--nge-table-editor-panel-padding` and `--nge-table-editor-panel-min-width` are
geometry and stay unbridged on ARCH-277's test — *would a bridge entry teach a contract the table does
not honour?* A dropdown is sized to its trigger because its content is short labels; prose sized to a
cell would be unusable, so the panel takes a floor of its own.

`role="textbox"` on the trigger is the whole cost of the range-drag criterion, exactly as
`combobox` was for the select — `INTERACTIVE_ROLES` already carries it.

## Row expansion (ARCH-298)

Wave 0 shipped **half** of row expansion and stopped there deliberately. `state.expanded`, the
`row-detail` slot, `NgeRowContext.isExpanded` and `--nge-table-row-detail-surface` all existed on
the principle that *a slot is a place, not a state* — a host could drive the band, and that was the
intended arrangement rather than a stopgap. What was missing was an affordance a **user** could
touch, and an answer to what an expanded band costs a virtualized table.

### The engine gives more than it looks like, and one thing less

`row.toggleExpanded()` and `table.toggleAllRowsExpanded()` both forward to `options.onExpandedChange`
— which `buildTableOptions` has routed into the store since ARCH-242. So the write path was already
in-contract; the story is mostly an affordance in front of wiring that existed.

⚠️ **The thing it gives less of is `getRowCanExpand`, and getting this wrong yields a feature that
renders perfectly and cannot be used.** `row.getCanExpand()` falls back to
`(enableExpanding ?? true) && !!row.subRows?.length` (`table-core/src/features/RowExpanding.ts:329`).
Flat data has no `subRows`, so **every row of every table in this library answers `false`** unless
the option is supplied. The engine's default is written for tree data; a detail band is the other
half of the feature and has to say so explicitly. `enableRowExpansion` therefore doubles as the
predicate, adapted from the row datum exactly as `enableRowSelection` is.

Two smaller findings worth keeping:

- **`toggleExpanded` does not consult `getCanExpand()`.** Only `getToggleExpandedHandler()` does, and
  that returns a handler this library has no use for. The capability check is ours, or a rejected row
  opens by keyboard while its control renders disabled.
- **`_autoResetExpanded` is unreachable here.** It is called only from `getGroupedRowModel`
  (`utils/getGroupedRowModel.ts:170`), which is unwired — so expansion survives a sort with no
  guard of ours, unlike the `_autoResetPageIndex` trap ARCH-247 had to work around. ⚠️ A later story
  wiring grouping would silently start collapsing the user's rows.

### Finding: the controlled-state lock is load-bearing, and expand-all is where it shows

`allRowsExpanded` was first written the obvious way — `store.table.getIsAllRowsExpanded()`, the
engine's own answer. It is wrong, and the failure is precise: that method reads
`table.getState()`, which is the options object the Angular adapter last applied. Two writes inside
one change-detection pass therefore have the second deciding against the state *before* the first, so
pressing expand-all twice **expanded twice** instead of toggling.

A spec caught it, which is the point worth carrying: *"never read state back off the table instance
as a source of truth"* has been an architectural lock since ARCH-242 and had, until here, never been
the difference between working and not. The fix derives the answer from `tableState` and passes the
direction to the engine explicitly, so `toggleAllRowsExpanded` never consults its own copy.

### The design question the story owned: a band in a virtualized table

`estimateSize` was `() => rowHeight()` — one number, no `measureElement`. Every row was assumed to be
exactly one height, so a band taller than that overlapped the row beneath it. The failure is visual
rather than thrown, and jsdom lays nothing out, so nothing in the test suite could see it.

Three options were on the table. **Declared height won**: `config.rowDetailHeight` feeds an
index-aware `estimateSize`, so an expanded row is `rowHeight + rowDetailHeight` and the rows beneath
move down by exactly that much. Row sizes stay *computable before a row is rendered*, which is the
property virtualization actually depends on — `measureElement` gives that up, makes row height
variable, and would put ARCH-289's frozen scroll baseline in question for a feature that has a
cheaper answer. The third option (throw when detail meets virtualization) declines the combination a
real consumer most wants.

The cost is a number a consumer keeps true, and the failure when they do not is visible rather than
silent: content beyond the declared height scrolls inside the band.

### Finding: two independent mechanisms were keeping it working, and the test could not tell

The invalidation path was reasoned out from source first: `getMeasurements` memoises on
`[getMeasurementOptions(), itemSizeCacheVersion]`, and `getMeasurementOptions` lists count, padding,
`scrollMargin`, `getItemKey`, `enabled`, lanes and gap — **not `estimateSize`** (`virtual-core`
`index.js:538,571`). So a size that changes invalidates nothing, and an expanded row would compute a
new size nobody reads. A `measure()` effect was added to bump the cache version.

The regression test passed. ⚠️ **It also passed with the effect disabled.** `getItemKey` is a fresh
arrow on every options rebuild, and the options rebuild when the expansion slice moves — so its
*identity* already invalidates the memo as a side effect. Disabling either mechanism alone still
passes; only disabling both fails.

The explicit `measure()` was kept anyway, and the reasoning is worth stating because "redundant, so
delete it" is the tempting read. The incidental mechanism is a **performance bug waiting to be
fixed**: memoising `getItemKey` is an obvious optimisation on ten thousand rows, and whoever makes it
would silently take expanded rows back to overlapping their neighbours, in a story that has nothing
to do with expansion. The spec now says so, because a green run there proves less than it looks like.

### Finding: the browser caught what the type system and 1,017 specs could not

The band's height was first applied to `.nge-table__row-detail` directly. Everything compiled, every
spec passed, and the first Storybook load showed the bug immediately: **every closed row was 161px
tall with an empty 120px band**.

The cause is the slot contract working as designed. The band renders for every row whose table
registered a `row-detail` template — the *template* does the gating, on `isExpanded` — so a height on
the band itself reserves one on every closed row too. Off virtualization that is a table of
triple-height rows; on it, the window budgets 40px while the DOM hands back 161px, and every row
overlaps the next.

The height now hangs off a `--open` modifier, and the wrap stays keyed on the band merely existing —
a second thing the browser had to settle. Collapsing both onto `--open` makes a closed band a
`width: 100%` flex item competing with the lanes in a `nowrap` row: harmless while there is slack,
and a squashed lane the moment there is not.

jsdom cannot measure a height, but it can hold the class the height hangs off, so the regression is
now pinned by four specs. **The general lesson is the one ARCH-250 recorded in a different key: a
feature that renders is not evidence that its geometry is right.**

### What ships

- A leading display column (`createNgeExpansionColumn`), following ARCH-268's precedent —
  `minSize`/`maxSize` pinned equal to `size` so the width is fixed where the *renderer* reads it.
- `expand-cell` and `expand-header` render slots, consulted **before** the native control, so a
  consuming app's chevron replaces the library's rather than sitting beside it.
- `toggleExpanded` on `NgeRowContext`, so a band can collapse itself — a projected template resolves
  DI from its declaration injector and cannot reach the store.
- Disabled-not-absent rendering for a row the predicate rejects (ARCH-278's `canSelect` reasoning).
- An `expansion-change` member on the event stream, which the state-event lookup had reserved in
  prose since ARCH-247.
- A `getRowId` throw, the third sibling of `assertSelectableRowsAreIdentified`.

⚠️ **The chevron is a tab stop where the selection checkbox is not.** The row's `Space` is already
selection's and its `Enter` is already editing's, so there is no key left for expansion, and a
disclosure control no keyboard user can reach is worse than one extra tab stop per row.

**Out of scope, and the distinction is not pedantic:** tree data. `getExpandedRowModel()` exists to
flatten *sub-rows* into the visible row model; a detail band needs none of it. Conflating the two
would drag `getSubRows`, `row.depth`, indentation and grouping into a story about a disclosure
control.

## Rich content in the row-detail band (ARCH-299)

ARCH-291 made good on "a cell is an arbitrary Angular render target" for the half a column width can
hold. The band is the other half — the only surface as wide as the table, and, once ARCH-298 gave it
a declared height, the only one able to hold content that *needs* a height. Two charts side by side
is the case that needs both dimensions at once, and it is what the story ships.

**The result worth recording is that nothing shipped in the library.** The band is a render slot and
its content is the consumer's markup, so the whole story is a story set plus documentation. Read
against the ARCH-250 / ARCH-251 gate, that is the render-slot axis behaving the way the state axis
did not: no seam fix, no core edit, nothing to report but the absence of a finding.

### The one rule a consumer writes, and why it is not the cell's rule

⚠️ **`align-self: stretch` is a *cell's* answer and does not generalise to a band.** A cell is a flex
**item** on a row whose height is already definite, so stretching resolves against the line. The
band is a plain **block** on its own line — `.nge-table__row:has(.nge-table__row-detail)` sets
`flex-wrap: wrap` precisely so it gets one — and there is no flex line to stretch against. (The two
regimes also differed until ARCH-300: the band was a fixed `height` under virtualization and a
`min-height` otherwise, and a percentage-height child resolved against neither `auto` nor a bare
`min-height`. They now agree on a definite height, which is what let the open be animated.)

`<nge-chart>` is `:host { height: 100% }`, so an unwrapped chart in a band collapses to a 0px-tall
nothing — silently, with no error, which is the failure this section exists to prevent. Content
claims the height instead, by reading the property the table publishes:

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

One declaration, correct in both regimes, and no number duplicated between the SCSS and the config —
`applyGeometry` writes `--nge-table-row-detail-height` inline on the host whenever the config
carries `rowDetailHeight`, which a factory-built config always does. ⚠️ `min-height: 0` on the plot
is load-bearing: a flex item's automatic minimum size is its content, and an SVG's is not small, so
without it the plot refuses to shrink and turns the band's fixed height into a scrollbar.

### The design question the story owned: one height, or one per row?

`config.rowDetailHeight` is **per table**, and the story's job was to settle whether it should stay
that way. It should.

The tempting alternative is a per-row `(row) => number` callback. `estimateSize` already takes an
index, so it is cheaper to build than it looks — and that is precisely the trap. It converts a number
a consumer sets once into a function they can get wrong per row, and getting it wrong means expanded
rows overlapping their neighbours: the exact class of bug ARCH-298's *declared, never measured*
decision was taken to prevent. A uniform band also earns its keep on the reading side, for the same
reason the fixture fixes its series length — bands you can compare down a column beat bands that each
size to their own content.

So: **two band kinds that genuinely want two heights are two tables** (a config object, and it cannot
go wrong per row), and **within a table the content is pitched at the height chosen**. The second
half is what makes the first liveable rather than a restriction: a legend, axis labels and gridlines
are ~75px of chrome a 320px band affords and a 160px one does not, so the compact band drops them.
Reopening this needs its own ticket rather than a quiet addition.

### What band content owes, beyond its height

- **Purity.** Virtualization recycles DOM, so the template runs again against a different row as the
  user scrolls. `Math.random()` in a data builder redraws itself mid-scroll; a value cached on the
  element belongs to whichever row that element is showing *now*.
- **A memoised config, keyed by the row object.** A factory called from the template allocates per
  change-detection pass, so `<nge-chart>`'s `config` input changes identity and the chart
  re-renders. A `WeakMap` keyed by `row` rather than a `Map` keyed by `row.id`: the latter never
  forgets a row, so a full 10,000-row scroll ends holding 10,000 configs.
- **Both token contracts.** The band is `--nge-table-row-detail-surface`; whatever sits on it reads
  its own library's tokens and knows nothing about the table. A domain bridging only `--nge-table-*`
  gets a dark band with bright white charts punched through it.
  ⚠️ **Demonstrating either contrast inside Storybook needs the unthemed side written out by hand.**
  The theme toolbar puts a domain class on `<body>`, and every bridged family — `--nge-chart-*`
  since ARCH-236, `--nge-table-*` since ARCH-277 — is therefore live everywhere in the preview
  regardless of what a wrapper class declares. A section contrasting "unthemed" against "themed"
  that merely *omits* the family on one side inherits the toolbar's values there too, so both halves
  render themed and the comparison proves nothing — silently, since nothing errors and both columns
  look plausibly correct. `stories/row-detail-content/theming` restates the charts library's own
  literal fallbacks for this reason; ARCH-304's showcase hit the identical trap with the table's
  *own* tokens (see § The showcase table) and fixed it the same way — an explicit class restating
  the literal defaults. Verify by reading the resolved token, never by looking at the page.
- **No settle signal, deliberately.** `NgeCellContext` carries `isSettled` (ARCH-291);
  `NgeRowContext` does not, because a band renders once per *open* row inside the window rather than
  once per cell down a column. Should a case ever prove otherwise, the field would have to be
  signal-valued — the cell-context memo lock applies to anything on a context that can move.

## Animating the detail band (ARCH-300)

The band opens over `--nge-table-row-detail-duration` (180ms) and the rows beneath it move in one
step. **The second clause is half the story**, so it is written down here rather than left in a
ticket: the next person to propose GSAP should find the reasoning before the dependency.

Nothing in TypeScript changed. A token, three CSS rules and a media query — which is itself the
result: the render-slot axis needed nothing for ARCH-299, and the geometry ARCH-298 declared turned
out to be enough for this too.

### A declared height is a transitionable one

The usual accordion blocker is that **`height: auto` cannot be animated**, which is what pushes
implementations into JavaScript measurement, `max-height` guesswork, or a FLIP library. ARCH-298
declared the band's height so the virtualizer could place rows without measuring them, and the same
declaration makes `0 → 120px` a plain CSS transition.

⚠️ **What it cost was the `min-height` off virtualization.** An un-virtualized band used to grow to
arbitrary content, deliberately, because nothing there is positioned by arithmetic. That cannot
animate: a consumer's template un-gates its content in the same frame the class flips, so the band
jumps to content height whatever a `min-height` is doing — there is no second definite endpoint to
transition to. The regimes therefore converge on a definite `height`, and content taller than it
scrolls in both, which is what a window already did. It is a real reversal of an ARCH-298 decision
rather than an incidental one, and it pays for itself twice over: the two regimes now agree, which
retires the percentage-child trap ARCH-299 had to write down.

**And giving the growth up was safe**, which is the half a reversal has to earn rather than assert.
The overflowing content is **reachable, not lost** — the band scrolls. The regime it converged *onto*
is the one a window already had, so nothing about a virtualized table moved and the change reaches
un-virtualized tables only. And the failure it inherits is ARCH-298's **honest-and-visible** one:
content that does not fit is seen not to fit, rather than silently overlapping the row beneath, which
is the failure a declared height exists to prevent and the reason the height is declared rather than
measured. The `min-height` was in fact the *less* safe shape even setting the animation aside, since
it made the two regimes disagree about what a band's height means — the disagreement ARCH-299 had to
write a trap about. Taking the growth back is ARCH-303, gated on the platform rather than on
appetite; see below.

⚠️ **It must CLIP, not squash**, and `height` + `overflow` is the only mechanism that does. Content
in normal flow keeps its own height inside a shorter box, so a `<nge-chart>` in the band is laid out
once and then progressively revealed. `grid-template-rows: 0fr → 1fr` — the animate-to-auto trick,
and the one shape that would have kept the growth affordance — was **rejected for exactly this**: it
stretches the item into a collapsing track, and a chart re-laid-out every frame in a box heading
toward zero height is thrash rather than motion. `interpolate-size: allow-keywords` would restore
growth-with-animation honestly and is the thing to reach for when the platform allows; it is
**Baseline limited as of 2026-07-29**, and the gate is recorded below rather than left as a claim.

⚠️ **The `overflow` flip is delayed by exactly the duration.** ARCH-299's contract has band content
pitched at the declared height, so mid-animation the content always exceeds the growing box. An
`overflow: auto` in force from the first frame shows a scrollbar for the whole duration, and wherever
that scrollbar takes layout space it narrows the content box — re-laying out the chart the clip
exists to protect. This was **measured rather than argued**: sweeping the band through the heights
the transition passes and reading the chart's box back gives an identical box at every height with
`hidden`, and an 8px swing on every frame with `auto`. ⚠️ Overlay scrollbars are not a defence —
whether a scrollbar takes layout space depends on the platform *and* the user's "show scroll bars"
setting, so the defect reproduces on macOS. `overflow` is a discrete property, so
`transition-behavior: allow-discrete` with a delay of the full duration flips it at the end rather
than the midpoint.

### The band animates in the direction where the space already exists

Off virtualization it animates **both** ways, and the rows beneath follow it the whole way — free
from normal flow, with no code involved. In a window it animates **open only**.

⚠️ That asymmetry is a property of windowing, not a shortcut. A virtualized row is
`position: absolute` at the running total of the sizes the virtualizer was given, so on collapse the
row beneath takes its closed `top` in ONE frame while an animating band is still at full height —
and rows are `background: transparent` by default, so the closing band would go on painting through
the row that has already moved over it. A smear, not a collapse. Opening has the opposite shape: the
rows make the space in one frame and the band grows into it, which reads as an accordion.

So the close is suppressed under `.nge-table__body--virtualized`, on the **closed** selector,
because a transition is chosen from the style the element is moving *to*. Making it animate means
holding the row's declared size until the animation ends — geometry and state out of agreement for
the duration, and a much larger change than it looks. ARCH-302 took that question up and declined it.

### The close under virtualization: evaluated and declined (ARCH-302)

**The `transition: none` is a decision, not an omission**, and two measurements settle it. Both were
taken in a browser, because neither is visible to jsdom.

**Every pixel the band still has is a pixel it paints through the row beneath.** With the row
collapsed — so the virtualizer has already placed the row beneath at its closed `top` — sweeping the
band through the heights a closing transition passes, on the two regimes side by side:

| band height | overlap, virtualized | overlap, normal flow |
| --- | --- | --- |
| 140px | 141px | 0px |
| 105px | 106px | 0px |
| 70px | 71px | 0px |
| 35px | 36px | 0px |
| 0px | 1px | 0px |

Overlap is the band's height plus the 1px row border, exactly, at every step; in flow it is zero at
every step, because the rows beneath reflow to whatever height the band has.

⚠️ **The mechanism that would end the hold is the one the escapes remove.** A fix keeps the row's
declared size at `rowHeight + rowDetailHeight` until the band finishes collapsing, and something has
to decide when that is. The only DOM-native answer is `transitionend` — and a suppressed transition
is never *created*, so it never fires: `height 1s ease` produces one transition, while `height 0s`,
`height 0ms` and `none` each produce zero. Both escapes the library ships land in that zero row —
`prefers-reduced-motion: reduce` applies `transition: none`, and
`--nge-table-row-detail-duration: 0ms` is the `0ms` case. A hold keyed to `transitionend` therefore
never drains for exactly the users who asked for no motion, leaving the row budgeted one band taller
than it renders, permanently and silently. That is expanded rows overlapping their neighbours, which
the declared height exists to prevent. Draining it anyway means the store reading `matchMedia` and
`getComputedStyle` to learn what the CSS already decided — TypeScript duplicating a number kept only
in CSS. A row that scrolls out of the window mid-collapse is destroyed and fires nothing at all, so
the same leak is reachable with no setting changed.

Two alternatives avoid the geometry hold and neither works. An **opaque row** lets the row that moved
up hide the collapsing band: it removes the smear but not the snap, since the cover arrives in the
same frame and the animation runs invisibly underneath it. A **ghost band** left painting at the old
coordinates has to paint *over* the rows that already moved up, so the gesture reads as the band
sliding across the content beneath it rather than closing — and it re-instantiates the consumer's
band template, which for a chart means building a second one to throw away.

**What would change the answer:** a virtualizer that accepts a transient per-row size override with a
lifetime of its own, which would leave the library nothing to hold. `interpolate-size: allow-keywords`
would not — it restores growth-to-content, and this is about the rows beneath.

### The growth affordance: blocked, not declined (ARCH-303)

**The section above and this one end in different places, and the difference is the point.** ARCH-302
is a *decision* — the close does not animate in a window, and only a different virtualizer would
reopen it. ARCH-303 is a *date*: growth-to-content off virtualization is still wanted, the mechanism
for it is known and sound, and what is missing is browser support. It does not need re-deciding when
the platform moves; it needs re-checking.

**The mechanism.** `interpolate-size: allow-keywords` makes `height: auto` interpolable — precisely
the second endpoint a transition needs, and the one the un-virtualized `min-height` never had. With
it the open band off virtualization becomes `height: auto` +
`min-height: var(--nge-table-row-detail-height)`, scoped to the band rather than declared at
`:root`, and still animates. **The windowed regime would not move**: the virtualizer is told each open
row is `rowHeight + rowDetailHeight` tall and the DOM has to agree, so a definite height there is a
requirement rather than a limitation. ARCH-299's content contract is unaffected either way — this
only ever concerned band content that declares no height of its own.

**Support state, checked 2026-07-29** — Baseline **limited**, which is short of *widely available* and
short of *newly available* as well:

| Source | Result |
| --- | --- |
| `api.webstatus.dev/v1/features/interpolate-size` | `baseline.status: "limited"`, no `low_date`, no `high_date` |
| MDN browser-compat-data (`css/properties/interpolate-size.json`, `main`) | Chrome 129 · Edge mirror · **Firefox `false`** · **Safari `false`** · experimental |
| caniuse `mdn-css_properties_interpolate-size_allow-keywords` | Chromium only — Chrome/Edge 129+, Opera 115+, Samsung Internet 28+ |

Two engines of the Baseline core set have not shipped it at all (Firefox `bugzil.la/1945962`, WebKit
`webkit.org/b/295132`), and *widely available* is **newly available + 30 months**. The earliest the
gate can open is thirty months after the later of those two bugs closes — 2029 on today's
information.

⚠️ **`@supports` is refused on the record.** Progressive enhancement is the reflex for a partially
supported CSS feature, and it is the wrong reflex when the feature decides a **layout contract**
rather than a decoration. Behind an `@supports` fork the same table with the same data would grow its
band on one engine and scroll it on another: the regime split ARCH-300 retired, re-introduced along a
worse axis, since a consumer chooses their regime and cannot choose their user's browser. Ship it
unconditionally or not at all.

**Re-check trigger:** both tracking bugs closed *and* thirty months elapsed since the later ship.
Until then the definite height stands in both regimes, and the work is re-minted as a fresh ticket
rather than tracked by an open one.

### Why the rows beneath do not animate, and why GSAP is not the answer

1. ⚠️ **`transform: translateY` is banned in this library**: it creates a stacking context that breaks
   the sticky pinned lanes (the substrate lock; AG Grid hit the identical wall). **This is what rules
   GSAP out**, and the reasoning is worth stating precisely because the answer looks like a library
   choice and is not. GSAP's FLIP plugin — the standard tool for exactly this problem — animates by
   applying transforms. The constraint is *no transforms*, not *sequencing is hard*, and GSAP only
   solves the latter. It would land on the same wall as a hand-rolled version, having added a runtime
   dependency no `libs/shared/*` carries at runtime.
2. **`top` is not compositor-friendly.** Transitioning it means layout on every rendered row every
   frame — roughly thirty of them — which is what ARCH-289's frozen baseline exists to measure, in
   the wave whose stated thesis is no perceptible lag while scrolling.
3. ⚠️ **A blanket `transition: top` smears every re-order.** Rows are tracked by id, so a row entering
   the window is a *new* element rather than a recycled one and takes its first `top` without
   animating — that much is fine. What is not: an element that survives a **sort or filter** gets a
   new `top` along with every other row, so the whole table would slide on every re-order. Gating the
   transition to the expand moment alone is possible and leaves a sort landing mid-animation looking
   broken.

**So: the band animates, the rows jump.** That is also what MUI's detail panel does, and it is the
honest shape rather than a compromise to apologise for. Reopening it means reopening the transform
ban first, which is an epic-level decision and not a story's to take.

### Reduced motion — the library's first, so it is the pattern

`@media (prefers-reduced-motion: reduce)` sits last in `nge-table.component.scss` and stops the band
*and* ARCH-298's chevron. Two things generalise:

- **Anything animated later joins that block on the day it lands.** A reduced-motion rule that
  covered the new animation and skipped one already in the file would be a worse precedent than a
  couple of extra selectors.
- ⚠️ **`transition: none`, never a zeroed duration token.** A consumer can set the duration inline on
  the host, and an inline custom property outranks anything a media query says about it — so the
  accessibility setting would lose to a theme. A declaration on the same element cannot be beaten
  that way. `--nge-table-row-detail-duration: 0ms` is the consumer-facing half of the same switch,
  and the two are independent by design: either alone stops the band moving.

The block is last in the file because every selector in it ties on specificity with the rule it
overrides, so source order is what settles it.

### What it costs the scroll

Nothing, and the claim was checked rather than assumed. The feature is CSS end to end, so there is no
engine surface for it to cost anything through, and a transition only runs when its property changes
— never during a scroll. ARCH-289's baseline was re-run on the same machine in the same session
anyway, because *should not move* and *did not move* are different claims and this epic only makes the
second one:

| | Reference (2026-07-28) | After ARCH-300 |
| --- | --- | --- |
| p95 median | 17ms | 17.4ms (0.6% spread over 2 runs) |
| worst frame | 17.6ms | 17.7ms |
| dropped frames | 0 | 0 |
| rows built | 714 | 714 |

## The store's composition root (ARCH-297)

`NgeTableStore` spends **eight** of `signalStore`'s fifteen slots: `withState`, then seven
`withFeature(store => withNgeTable*(store))` groups under
`libs/shared/table/src/lib/nge-table/store/features/`. Wave 6 had filled all fifteen, and the next
concern needing one had nowhere to go.

```ts
export const NgeTableStore = signalStore(
  withState(initialNgeTableStoreState),
  withFeature(store => withNgeTableEngine(store)),      // table, state writers, event sink, setters
  withFeature(store => withNgeTableLanes(store)),       // header/footer lanes, registries, aria
  withFeature(store => withNgeTableRows(store)),        // virtualizer, rendered window, row geometry
  withFeature(store => withNgeTableColumns(store)),     // resize gestures, sort
  withFeature(store => withNgeTableSlots(store)),       // slot lookups, cell contexts, editing
  withFeature(store => withNgeTableSelection(store))    // selection state, gestures, slot contexts
);
```

### Which layer owns a new concern

> New state belonging to a table **feature** goes on the engine as a `TableFeature` (extension axis
> 1, unbounded, published through `NgeTableState`). New state describing how Angular **paints** the
> table — templates, geometry, the virtual window — belongs in the store. Ask which one a new concern
> is before adding a slot.

⚠️ **TanStack's unbounded `_features` array does not relieve this ceiling, and the reason is the
whole shape of the story.** `_features` is unbounded extensibility for *engine* concerns;
fifteen is an `@ngrx/signals` overload limit on the *Angular adapter* that turns engine state into a
painted table. Almost nothing in the store could move even in principle — it holds a `TemplateRef`
registry, DOM geometry, the virtualization window, a11y counts, and the scratch `editing` target that
ARCH-292 deliberately kept **out** of the published `NgeTableState`, so relocating that one to a
`TableFeature` would put it back in the persistable state it was excluded from. The store is large
because painting a virtualized, pinned, themed, slot-driven table in Angular is a lot of derivation,
not because engine state was misfiled into it.

### Finding: seven of the eight `withMethods` blocks were not separate for a reason

The store carried one `withState`, two `withProps`, four `withComputed` and **eight** `withMethods`.
Only three of those eight splits were load-bearing, and each was load-bearing for the same mechanical
reason: **a `signalStore` feature's `store` argument carries only what *previous* features added**, so
a method calling a sibling declared in its own block throws `is not a function` at call time. The
selection block said so in its own ⚠️ comment.

Expressed as **local `const`s in a feature's factory body**, that constraint disappears — the call is
ordinary TDZ the compiler already checks, and the block boundary stops being load-bearing at all.
Merging alone would have reached eleven; the six groups reach seven.

### Two mechanics, and one number nobody documents

- ⚠️ **`signalStoreFeature` has a ceiling of its own, and it is TEN** (`f1 … f10`, in both the
  input-typed and untyped overload families) — not the fifteen of `signalStore`. A grouped feature is
  headroom, not an unlimited bag.
- **`withFeature`'s factory runs inside the store's constructor** (`featureFactory(storeForFactory)(store)`),
  so `inject()`, `injectVirtualizer()` and `effect()` keep their injection context after extraction,
  and the factory store carries `STATE_SOURCE` so `patchState` still works.
- **`buildTableOptions` moved to its own module**, `nge-table-options.ts`, imported by the engine
  feature and re-exported by the root so neither imports the other. It takes a `NgeTableStateWriter`
  — the two writers as a plain object — because at the moment the engine instance is built the store
  does not carry them yet. That interface already existed for spy-based testing; here it became
  load-bearing.

### The guard

`nge-table-store.composition.spec.ts` parses the root with the TypeScript AST and fails at **ten**
slots, carrying the diagnosis and the fix in the failure message. ⚠️ **Failing at the ceiling would be
useless** — five slots of margin is what makes the response a refactor rather than a rescue. The
counter is proved against synthetic sources with known answers, in the falsifiability shape
`entry-points.spec.ts` established: a parser that quietly returned zero would otherwise pass against
every possible tree.

A correction to the recorded lore: on TypeScript 6.0.3 a sixteenth feature **does** report `TS2769:
No overload matches this call` in `nge-table-store.ts`, so the store file is not silent the way
ARCH-292 recorded it. The ~40 downstream errors in `nge-table.component.ts` still arrive alongside
and still dominate the output, so the diagnosis is easier than the lore suggests but not obvious.

## The showcase table (ARCH-304)

Every feature in this epic had been exercised in isolation, and several — highlighting with export,
selection with a swappable control, charts alongside editors in adjacent stories — had been
exercised in pairs. **None had ever shared a table with all the others**, and closing the epic meant
finding out what that actually costs, both in complexity and in the composition defects that only
surface once everything is switched on together. `stories/showcase/showcase-demo-table.component.*`
puts every shipped feature on one `<nge-table>` over the 10,000-row fixture, virtualized, with
three facets (`stories/showcase/{interaction,usage,theming}`, titled
`Table/NgeTable/Showcase/<Facet>`) and a fourth story reusing the scroll-benchmark harness
(`stories/performance/showcase/interaction`, `Table/NgeTable/Performance/Showcase/Interaction`). It
ships no new mechanism. A demo is the visible half of what this buys; the composition test that can
fail is the half that matters, and it did fail once, in a way no per-feature story could have found.

⚠️ **Read its result carefully, because it splits.** The *composition* required no core edit: every
seam absorbed the whole feature set exactly as designed, which is the finding below. What did require
one is a different thing — two **gesture gaps in ARCH-269 / ARCH-270** that only a person driving the
composed table would ever meet, namely that a lone selected cell and a selected column could not be
deselected by the gesture that selected them. Three files under `src/lib/range/` changed to close
them. So ARCH-304's honest summary is **composition clean, gestures not**, and it must not be quoted
as a "zero core files" result the way ARCH-251's genuinely can be. That distinction is also the more
useful reading: a table's seams held under full composition, while its *interaction vocabulary* had a
hole that no story exercising one feature at a time was ever going to reveal.

### Three claimants on one slot, and why they do not collide

Cell highlighting (ARCH-250), the cell range (ARCH-269) and the fill handle (ARCH-271) all project
into `cell-overlay`, and ARCH-271 had already recorded that the slot resolves to one template per
column plus a shared fallback — a limit that mattered as soon as a **second** claimant existed and
is now exercised by a **third**. The showcase hosts all three in one wrapper template, and they
compose with no change to the registry.

The reason is geometry rather than luck. `<nge-highlight-overlay>` and `<nge-range-overlay>` are
`display: none` at rest; `<nge-fill-handle>`'s host is `display: contents`; none of the three
declares a `z-index`. All three are therefore zero-sized with nothing to stack, and a hit-test
landing on a cell's centre resolves to the **cell**, never to one of the overlays sitting over it —
which is exactly what `NgeRangeBridge`'s delegated pointer handling needs, since it reads the
stamped `data-nge-range-cell` attribute off whatever `elementFromPoint` returns. Verified on the
rendered showcase: 143 cells, each carrying all three components, with zero stacking contests.

### Six ways into one `pointerdown`, and the one thing this story does not claim

A press on a cell can mean six different things — select the row, start a cell range, toggle a
highlight, activate an editor, grab the fill handle, or hit the expansion toggle — and each was
designed against a subset of the others, never against all six at once. `NGE_INTERACTIVE_SELECTOR`
carries native tags, the ARIA widget roles and a `data-nge-interactive` escape hatch; `[tabindex]`
is still deliberately absent, because the table's own row is a tab stop under selection and the
guard is a `closest()` walk, so adding it would resolve every cell in a selectable table to the row
and disable cell-range dragging table-wide rather than fixing one control. ARCH-268's
`shiftKey`-gated `preventDefault` on a row's `mousedown` is unchanged, so a click still reaches an
`<input>` inside a cell.

⚠️ **What this story does not do is arbitrate between the six, and that must not be read as having
been done.** Nothing here is new mechanism to verify; the guard shape is inherited unchanged, and
whether six live claimants actually resolve correctly against each other in a real gesture is
exactly the kind of question a browser answers and automation cannot — see § What a browser
confirmed, below.

### `Escape` and cmd/ctrl-`A`, decided rather than inherited by default

Both marking addons ship with `clearOnEscape: true` in the showcase — the same default either ships
with alone — so one `Escape`, pressed with nothing else focused, clears a highlight and a range
together. That reads as the behaviour a user actually wants — put everything down — and it costs
nothing extra to get: ARCH-292 already contains `Escape` at the **cell**, so an edit in progress is
never in the same event's path as either addon's document-level listener. The per-table
`clearOnEscape: false` opt-out both addons carry exists for a page holding **several** tables, where
one `Escape` should not reach past its own table's boundary — a single table with two addons sharing
one key is a different question, and this story answers it by leaving both at their default rather
than reaching for the opt-out.

cmd/ctrl-`A` resolves without a collision for a simpler reason: row selection never binds the key at
all, and the cell range's own `selectAllOnModifierA` scopes itself by *engagement* — it only fires
once a click has landed inside the table — so the two can never compete for the same press. The
ambiguity the ticket raised is conceptual rather than mechanical: with row selection and cell ranges
both live, "select all" has two plausible readings, all rows or all cells, and only one gesture to
ask for it. The showcase resolves it by what each affordance already has on offer: row selection
keeps the header's select-all checkbox — a visible, discoverable route to "every row" that needs no
keyboard shortcut at all — while the cell range has no other gesture that means "everything". The
key goes to the one that would otherwise have none.

### One row height, where the library's own features disagree

Text rows in this library are 40px; ARCH-291 measured a chart cell at 96px and
`nge-cell-shell.component.scss:25` is written to that figure; an expanded row is
`rowHeight + rowDetailHeight`. A table carrying every feature at once has to pick **one** number, and
the showcase picks 96px — the only figure that lets a chart column render at all. The performance
story's `stepPx` follows from the same constraint: it has to be a whole multiple of the row height or
`expectedRowsBuilt` degrades to `null`, so it is set to 288 (3 × 96) rather than the baseline's 240,
matching the precedent `Performance/Chart Cells` already set for the identical reason.

⚠️ **The consequence worth stating plainly: the showcase's scroll figure is comparable to
`Performance/Chart Cells`, not to the 40px `Performance/Baseline` figure.** The baseline builds 714
rows over the same 120 scripted frames; a 96px-row table builds roughly half that over an identical
scroll distance, because each frame's fixed pixel step now crosses fewer rows. Reading the two side
by side without saying so would attribute a row-height difference to a feature-cost difference.
Verified in the browser: the computed cell height is 96px, `--nge-table-row-height: 96px` sits on
the host, and the viewport's `scrollHeight` comes out to 10,000 rows × 96px plus the header.

### Addon presence is a construction-time decision, not a runtime toggle

`provideNgeCellHighlighting()` and `provideNgeCellRange()` are fixed in
`NgeTableShowcaseDemoComponent`'s own `providers` array, which settles a question the ticket left
open: whether the showcase should expose "turn highlighting off" as a control at all. It does not,
and the reason is what a Storybook `argType` actually costs here. The **config-gated** capabilities —
row selection, virtualization, striping, row expansion, and the rest of `NgeTableConfig`'s flags —
toggle freely because the same live component instance reads them on every change. An addon's
*presence*, by contrast, is decided once, when the component is constructed; the only way to make it
a control would be to destroy and rebuild the whole demo component on every toggle, which would reset
every other control a user had set along the way. That price is disproportionate to the thing being
toggled, so the showcase always provides both marking addons and lets a user judge their behaviour by
whether the row selection, editing, or expansion controls around them change — never by an addon
appearing or disappearing.

### What a chart column exports, decided once and reused rather than re-decided

A `readonly number[]` has no obvious CSV representation, and `chart-cells/usage` had already settled
one: `meta.ngeExport.format: value => Array.isArray(value) ? \`${value.length} points\` : ''`,
alongside `enableSorting: false` (there is no meaningful order for an array) and
`meta.ngeFill.enabled: false` (a series is a legitimate fill *source* and a meaningless fill
*target*). The showcase's own `series` column reuses that exact answer rather than inventing a
second one. The decision worth recording is the reuse itself: two stories independently choosing
different text for the same kind of column is precisely the drift the shared fixture exists to
prevent, and the showcase is the first table where both stories' column declarations sit side by
side to prove it.

### Finding: pinning strands the injected control columns

**This is the composition defect the showcase existed to find**, and it involves no addon at all —
both features at fault are core. `applyInjectedColumnOrder` (ARCH-298) places the expansion chevron
and the selection checkbox at the front of the table's **column order**; column pinning (ARCH-243)
is a wholly separate axis, resolved afterwards, with no knowledge of what the ordering axis just
did. Pin any data column to the left edge — the single most ordinary thing a real consumer does with
pinning — while selection or expansion is switched on, and the row's **own** controls end up in the
scrolling **centre** lane while the data column stays sticky. Exactly backwards, and silent: the
table renders precisely as configured, every control is present and fully functional, and the only
symptom is that a user has to scroll right back to find their own checkbox.

Neither feature is wrong on its own terms. Column ordering says the injected columns lead; pinning
says whichever columns a host names are frozen. The defect exists only in the *combination*, and no
amount of testing either feature alone — which is exactly how each was tested — would ever produce
it.

**No core edit was needed to fix it.** `NGE_TABLE_EXPANSION_COLUMN_ID` and
`NGE_TABLE_SELECTION_COLUMN_ID` were already reachable from the public barrel before this story
(`@nge/table` re-exports `./lib/nge-table`, which re-exports its `./store`, which exports
both constants), so a host can simply name them in its own `columnPinning.left` ahead of its data
columns — which is exactly what the showcase's own initial state does:

```ts
columnPinning: {
  left: [NGE_TABLE_EXPANSION_COLUMN_ID, NGE_TABLE_SELECTION_COLUMN_ID, 'name'],
  right: ['createdAt'],
}
```

Verified in the browser after applying it: the pinned-left lane holds expansion, then selection,
then `name`, in that order, and both controls stay on screen at any scroll position.

Whether the library should do this itself — resolve the two axes together so a host does not have
to know two internal-looking column ids exist just to keep its own checkbox in view — is a real
question this story surfaces without answering. Answering it is explicitly not this story's to do
under the epic's own gate discipline: it composes what exists and adds nothing. The rule this story
leaves in its place is a host-side one, and it holds regardless of how that question is eventually
settled — **any table combining pinning with selection or expansion must pin the injected columns
explicitly.**

### Finding: a theming story's unthemed side must restate the literal defaults, and it is not a chart-only trap

The showcase's light-vs-dark theming section put `.theme-dark` (fifteen tokens declared) beside a
column declaring none, on the reasonable-looking assumption that declaring nothing yields the
library's own defaults. It does not, once a global toolbar is in the picture. Storybook's theme
toolbar puts a domain theme class on `<body>` — `mw-dark` when this was measured — and every one of
the ten domain themes bridges `--nge-table-*` (ARCH-277), so the undeclared column inherited that
bridge instead of the library's defaults and rendered `--nge-table-surface: #090b0d` under a
heading reading "Default (light)". Both halves of the comparison rendered dark, and the section
demonstrated the opposite of its own claim, with nothing logged to say so.

The fix is the same one § Rich content in the row-detail band already records for a chart's own
tokens: an explicit `.theme-light` class restating the literal values `.theme-dark` sets, re-verified
with `mw-dark` still on `<body>` — the two columns now resolve `#ffffff` against `#16161a`. What is
worth carrying forward is that the rule generalises past charts: it is a property of **the toolbar
plus any bridged family**, and `--nge-table-*` has been bridged in all ten themes since ARCH-277, so
the table's own tokens are exactly as exposed to it as a chart's are. A theming section contrasting
*unthemed* against *themed* has to write the unthemed values out by hand, whichever family it is
about.

⚠️ **This was found by reading computed styles off the rendered tables, not by looking at the
page.** Both columns looked plausibly "themed" and nothing errored — the only way to catch it is to
assert on the resolved token rather than the visual impression.

### The convention the showcase leaves behind

A story that ships a new feature after this one owes the showcase one of two things: **add the
feature to it, or record here why it does not belong** — because it is a measurement control that
exists to defeat a seam (`always-chart`, `withEditors: false`), or because it genuinely conflicts
with something already switched on. "Nobody got to it yet" is not one of the two. Without that rule
the showcase is a snapshot of the library as it happened to stand on the day this story shipped, and
every wave after it quietly stops being covered by the composition test that found the one defect
above. With the rule, the showcase re-runs on every future feature rather than only on this one.

### What a browser confirmed, and what only a browser still can

The acceptance criteria call for every gesture to be verified in a real browser, and that work is
not finished — stating so plainly matters more here than anywhere else in the epic, because a
composition story is exactly the kind of work that looks done once the static picture is right.

What automation confirmed, and it is all static: the three-overlay composition above and its
inertness at rest; the pointer hit-test landing on the cell rather than an overlay; the three-lane
structure with sticky pinning holding on both edges, including after the pinning fix; 96px rows and
10,000-row virtualization (`scrollHeight` 960,045); thirteen chart cells and zero shells at rest;
thirteen checkboxes, thirteen comboboxes, eleven column-selection handles and nine resize grips, all
present and correctly counted; the `Trend` column's `aria-sort` reading `null` (confirming
`enableSorting: false` is honoured); zero console errors; and all four stories registered under
their titles.

⚠️ **What it could not confirm, and why, is gesture arbitration across the six pointerdown
claimants, `Escape` and cmd/ctrl-`A` with both marking addons live, and the re-sort regression check
ARCH-281 exists to guard.** An automation tab runs at `visibilityState: 'hidden'`, which suspends
`requestAnimationFrame` — measured here as **zero** rAF frames across 400ms — so Angular's zoneless
change detection never flushes and nothing re-renders in response to a scripted event. A scripted
click on the `Status` header, run against this exact table, left `aria-sort` at `none` and the row
order unchanged: not evidence that sorting is broken, only that a script cannot exercise it. This is
the third time this epic has hit the identical limit — ARCH-291 recorded it for the chart settle
signal, ARCH-296 recorded it for the textarea editor's backdrop — and it generalises rather than
being specific to any one of the three: **anything whose correctness depends on a real, trusted
event, or on a frame having actually been painted, needs a human in a foregrounded tab.** A
foregrounded session still owes this table the arbitration check across all six claimants, the two
document-level keys, and the sort-and-re-check that proves selection, range, highlight and expansion
marks all follow their records rather than their positions.

## Testing

### The shared fixture (ARCH-241)

Every story and spec draws its rows from `@nge/table/testing`. **No story inlines a row
array.** A chart story is cheap because a chart is one config object; a table story needs data, and
the virtualization story needs 10,000 rows — one generator is what keeps the column set consistent
across the epic instead of ten stories each inventing a shape.

```ts
import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS, NGE_TABLE_FIXTURE_SIZES }
  from '@nge/table/testing';

const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large }); // 10,000, ~6 ms
```

`NgeTableFixtureRow` spans the kinds a table has to render differently — string, integer,
currency, date, boolean, enum, and a nested `owner` object reached by `accessorFn` so the
non-flat accessor path is always exercised. Presets are `small` (25, layout), `medium` (500,
pagination/grouping), and `large` (10,000, virtualization).

Three fields exist for the rich-cell wave (ARCH-290), none of them yet in
`NGE_TABLE_FIXTURE_COLUMNS` — the story that renders one declares its own column, the way
ARCH-291 does for the chart:

| Field | Shape | For |
| --- | --- | --- |
| `series` | `readonly number[]`, `NGE_TABLE_FIXTURE_SERIES_LENGTH` (12) values in `[0, 100]` | charts in cells (ARCH-291) |
| `description` | 105–136 chars of plain ASCII, no comma | overflow / ellipsis, and a free-text editing target that is not `name` |
| `imageUrl` | a `data:image/svg+xml` swatch from a 12-entry roster | an image in a cell |

The **series length is fixed and the domain is shared** on purpose: a per-row length or range would
make an in-cell chart's height and axis domain vary row to row, so two cells in a column could not be
read against each other. `imageUrl` is `data:` rather than a URL so a story renders offline with no
CSP exception, and rows *share* the twelve strings, so a virtualized scroll decodes twelve images
rather than ten thousand.

⚠️ **Every generated string is plain ASCII and holds no quote and no newline**, and `description`
additionally holds no comma. This is a real invariant, not an accident: the CSV suite tests quoting
and escaping against hand-built export shapes *because* no fixture value forces them, so a value that
did would change what the CSV-over-a-real-table tests measure. The fixture spec asserts it.
(`imageUrl` carries the comma of its own `data:` scheme, which is harmless — CSV quotes it, and no
column exposes it.)

**Output is deterministic**: the same seed yields byte-identical rows. That rests on two rules the
generator must keep — a seeded mulberry32 stream instead of `Math.random()`, and dates offset from a
frozen epoch constant instead of `new Date()` / `Date.now()`. Reproducibility is what lets a story
snapshot be stable and a failing spec be replayed from its seed alone.

The fixture is **additive only**: nothing is ever repurposed or removed, and the spec enforces that
asymmetry by asserting the baseline keys as a subset. One consequence worth knowing: because all
fields share one PRNG stream and lint keeps the row literal alphabetical, adding a field shifts the
*values* of every field below it. The shape contract holds, but do not write golden-value assertions
against fixture data.

**Cost of the large preset: ~6 ms cold, ~2.4× what it was before the three fields landed** (~2.5 ms;
measured as the first call in a fresh V8, five runs each, M5 Max / node 24). Serialized it is 6.1 MB
against 2.3 MB. The array per row is where most of it goes, and the figure is worth re-measuring
rather than trusting whenever the row grows again — a stale number here is how a fixture change gets
read as a feature's regression.

### The scroll baseline (ARCH-289)

`@nge/table/testing` carries a frame-budget instrument —
`runNgeScrollBenchmark(viewport)` — driven from
`stories/performance/baseline/interaction` (`Table/NgeTable/Performance/Baseline/Interaction`). It
scrolls a plain virtualized table on a fixed schedule and times every frame, so a later story can
claim "no worse than baseline" instead of "feels fine".

⚠️ **The baseline story is frozen.** A virtualized table and nothing else — no striping, no
selection, no editors, no extra config flag however small. Its whole value is being the unfeatured
case. A feature's cost is measured in **that feature's own** `Performance/<Feature>/Interaction`
story, with the same harness, against a baseline re-run on the same machine.

⚠️ **A baseline is per-machine and measured fresh, never committed as a threshold.** Frame timings
belong to the CPU and the display. The figures below are a *reference example* of what healthy looks
like, not a gate:

```
Apple M5 Max · 60Hz (16.7ms idle frame) · Chrome · 120 frames x 240px · 20 runs
dropped frames    1 / 2400         one isolated miss (33.4ms = 2 vsyncs)
p95 frame         16.8–17.3ms median
worst frame       17.4–17.7ms      33.4ms on the run that dropped one
rows built        714              19/20; the one 712 was a harness bug, now fixed
p95 spread        1.2–2.4% warm · 4.2–4.8% shortly after a cold rebuild
```

**The rich-cell fields did not move it (ARCH-290).** Re-captured on the same machine after `series`,
`description` and `imageUrl` landed — four runs, cold Storybook — the numbers fall inside the band
above: p95 median **17.1ms** (17.0–17.4), worst frame **17.5–17.8ms**, **0** dropped frames, and
`rowsAdded` **714** on every run. Four runs is fewer than the twenty behind the block, so read this as
"no movement detectable", not as a tighter figure.

That result is the one worth carrying into the rest of Wave 6, because it says *why* nothing moved: the
three fields are held in memory but **rendered by nothing** — none of them is in
`NGE_TABLE_FIXTURE_COLUMNS`, so the baseline still lays out the same seven cells per row over a
dataset that is 2.6× larger serialized. What ARCH-291 measures next is therefore the chart's cost, not
the fixture's. ⚠️ The corollary: the first story to add a *column* to the shared set changes the
baseline's subject and has to re-capture again.

Three findings from taking it, each of which changes how the numbers are read:

- **`rowsAdded` is the regression metric, not the timings.** It is geometry — 240px ÷ 40px = 6 rows
  per step × 119 scroll steps = **714** — so it should hold on any machine, and it did in 15 of 16
  runs. ⚠️ The sixteenth reported **712**, which was a harness bug rather than a property of the
  table: `MutationObserver.disconnect()` **discards the pending record queue**, and records arrive on
  a microtask, so disconnecting immediately lost whatever the final frames produced.
  `takeRecords()` now drains the queue first, and a four-run confirmation after the fix returned 714
  every time. Treat any future non-714 as a dropped-record bug, not a slower table.
- ⚠️ **Zero dropped frames is the expectation, not a requirement.** One frame in 1,920 missed a vsync
  (33.4ms — exactly two intervals) on an otherwise healthy machine, for reasons that have nothing to
  do with the table. The story therefore reads the count in three states: `0` clean, up to 1% of
  frames tolerable, above that a problem. A strict `=== 0` check paints a healthy machine red and
  teaches the reader to ignore the indicator.
- ⚠️ **A fixed-budget frame count was removed outright, not demoted.** With the budget at 16.7ms it
  sat *on* the 60Hz refresh interval, so jitter relocated dozens of frames across it: it ranged
  **29%–48%** across identical runs while p95, worst frame and dropped frames barely moved. It is
  gone from `NgeFrameSummary` along with the `budgetMs` option that fed it, and a spec asserts the
  word never reappears in the report. `droppedFrames` — past 1.5× the *measured* interval, published
  as `droppedThresholdMs` — is the honest "did it stutter" count, and being refresh-relative it
  survives a move to a 120Hz machine.
- **Theme made no measurable difference.** Bridged (`cg-home-light`) and unbridged runs produced the
  same 17.3ms median p95, the same worst frame, 0 dropped and 714 rows built. Baselines are portable
  across themes, so the harness deliberately records no theme field.

⚠️ **The noise floor is not a constant, so take the baseline in the same session as the measurement
it judges.** The p95 spread was **1.8%** on a warm, quiet machine and **4.2–4.8%** minutes after a
cold `nx reset` rebuild — the same table, the same machine, twice the apparent noise. Comparing a
feature story against a baseline recorded on a different day therefore risks attributing the
machine's state to the feature. The rule that follows is stronger than any recorded figure: **run the
baseline, then run the feature story, back to back, and compare those two.**

A regression smaller than the spread is invisible to the timings; look at `rowsAdded`, which had zero
variance across all twelve runs. Two runs minimum before quoting anything — and the story withholds
drift and spread entirely when runs used different options, because a figure computed across a
changed `stepPx` describes the change while looking like a tolerance.

⚠️ **A hidden tab suspends `requestAnimationFrame`**, so the harness refuses to start (and aborts if
backgrounded mid-run) rather than hanging forever on a promise that cannot settle. That is why the
baseline cannot be captured by browser automation, whose tab is never the foreground one.

### Running tests

- Unit tests are Jest, colocated as `*.spec.ts`. Run with `npx nx run shared-table:test`.
- `shared-table` has **no `build` target** (matching `shared-charts`), so lint and test never run
  `tsc` over the full source. Type-check with
  `npx tsc -p libs/shared/table/tsconfig.lib.json --noEmit`.
- **jsdom cannot exercise scroll geometry, sticky offsets, or drag.** Anything touching those must
  be verified in a real browser — that is why every table story ships an *interaction* Storybook
  story as its primary, not a static usage story.

## Storybook

Every feature ships its Storybook set **with** the feature, never as a trailing story: three
subdirectories per feature (interaction / usage / theming) with **interaction as the primary**.
Unlike charts, nearly every table feature is only verifiable by driving it. All stories and specs
draw from the shared fixture rather than inlining row arrays — see § Testing.

> **Generate stories with the `/create-table-storybook` skill (ARCH-249) — do not hand-author
> them.** It encodes the layout, the naming, the fixture rule, and the two traps below. The chart
> equivalent is `/create-chart-storybook`; the table skill is deliberately **not** a copy of it.

**Layout.** One directory per feature, three facets inside it, mirroring the chart library's
per-chart-type shape:

```
libs/shared/table/src/lib/nge-table/stories/
├── core/                  ← the table itself; cross-feature composition examples live here
│   ├── interaction/       ← 14 numbered examples, each with a live state readout
│   ├── usage/
│   └── theming/
└── <feature>/             ← generated by the skill
    ├── interaction/
    ├── usage/
    └── theming/
```

Titles follow the directories — `Table/NgeTable/Core/Interaction`,
`Table/NgeTable/Row Selection/Interaction`. Each facet is the four-file shape
`/create-chart-storybook` established: a wrapper component (`.ts` / `.html` / `.scss`) inside a
`NgeStorybookReviewContainerComponent`, plus the `.stories.ts` entry. `core` is the one set with no
feature segment in its class names or selectors — it *is* `nge-table`.

**Registration needs no change per story.** `apps/storybook-app/.storybook/main.ts` (the glob) and
`.storybook/tsconfig.json` (the `include`) are both wildcards over `libs/shared/table/src/**`. Both
must stay — a glob-only registration renders but never type-checks.

⚠️ **Storybook is the only place a broken story template surfaces, and reaching that requires a
human eye rather than the dev-server log.** `shared-table` has no build target, so
`tsc -p tsconfig.lib.json` checks the TypeScript and nothing checks the HTML. Falsifiability-tested
for ARCH-304: an injected `.ts` source error reported in the `npm run storybook` log within seconds,
but an injected `strictTemplates` violation on a `let-` binding stayed silent across 482 incremental
rebuilds, a cold reboot, and a direct request that came back 200 — the log has the right polarity
for a source error and none at all for a template one. A missing `[ngeCellOf]` /
`[ngeTableSlotOf]` type carrier — which leaves `TRow` as `unknown` — therefore surfaces only in the
rendered story and its console, never in anything automated, so loading and reading a story by eye
is part of the definition of done, not a nicety.

### Theming stories are SCSS, not TypeScript

The single largest divergence from charts, and the one a copied chart story gets wrong:
**`NgeTableConfig` has no `theme` field.** A chart carries its palette in a `config.theme` object;
the table themes exclusively through `--nge-table-*` custom properties. So a table theming story's
substance lives in its SCSS — one scoped wrapper class per section re-declaring tokens, which is
precisely what a consumer writes. Reuse one config across sections; theming changes nothing about
configuration.

⚠️ **`--nge-table-row-height` and `--nge-table-header-height` are not reachable from CSS when the
config carries them.** `createNgeTableConfig()` fills both in from `NGE_TABLE_DEFAULTS`
unconditionally, and `applyGeometry` publishes them as **inline** custom properties on the host,
where they outrank any class selector. Only a hand-authored config that omits the fields hands them
back to the theme — `applyGeometry` calls `removeProperty` exactly so it can. With virtualization on
they are always a config concern, because the virtualizer needs the number in TypeScript. Cell
padding is unaffected. `core/theming` demonstrates both halves side by side.

Domain theme bridges exist as of ARCH-277 — ten theme files map `--nge-table-*` onto their own
palettes, so the Storybook theme toolbar now re-themes a `<nge-table>` the way it already re-themed
a `<nge-chart>`. Details and the do-not-bridge list are in
[`libs/shared/table/AGENTS.md`](../../libs/shared/table/AGENTS.md) § `--nge-table-*` tokens.

⚠️ **A bridge only works if the host loads `_table-tokens.scss` before its theme mixins.** `:root`
scores (0,1,0) — *equal* to a single theme class, not lower — so source order decides, and a host
loading the partial last has its defaults silently beating every bridge. `apps/storybook-app/src/styles.scss`
does it in the right order for both charts and the table; charts learned this the hard way in ARCH-236.

**The stories still declare no `themeGroup`, deliberately.** The parameter scopes the toolbar to one
*domain*, and the table — like charts — is bridged across three, so no single key describes it and
charts declares none for exactly this reason. A story's own theming section therefore stays the
substance of the feature: it demonstrates the scoped-wrapper-class mechanism a consumer writes
directly, which is a different thing from the toolbar swapping a whole palette.

## References

- Epic plan — `~/Dev/gigasoftware-plans/arch/ARCH-239.md`
- Charts architecture, the pattern this mirrors — [`docs/architecture/charts.md`](./charts.md)
- TanStack Table source — `../open-source/table` (pinned `v8.21.3`)
- AG Grid source, **reference only** — `../open-source/ag-grid` (`latest` branch;
  `ag-grid-enterprise` is commercially licensed — read for patterns, **never copy**)
- Predecessor being replaced — `libs/concierge/design-library/src/lib/cg-data-table`
- Workspace invariants — `docs/ai/CONSTRAINTS.md`
