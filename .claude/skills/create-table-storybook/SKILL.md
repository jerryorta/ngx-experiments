---
name: create-table-storybook
description: Generate the 3-subdirectory Storybook story set for a NgeTable feature (interaction, usage, theming). Creates 12 files with NgeStorybookReviewContainerComponent, the shared ARCH-241 fixture, signal inputs for interaction controls, and SCSS-driven --nge-table-* theming. INTERACTION IS THE PRIMARY facet — the inversion from charts. Use when creating table stories, or when the user says "add table stories", "create table storybook", "write stories for <feature>", or mentions stories for a table feature like row selection, cell ranges, pinning, resize, or virtualization.
---

# Create Table Storybook Stories

Generate the complete 3-subdirectory Storybook story set for a **NgeTable feature**. Each feature
gets **interaction**, **usage**, and **theming** subdirectories — 4 files each, 12 files total.

This is the table sibling of `/create-chart-storybook`. **It is not a copy of it**, and the two
places it diverges are the two places a copied chart story silently breaks:

| | Charts | Table |
| --- | --- | --- |
| Primary facet | **usage** — a chart is mostly verifiable by looking at it | **interaction** — resize, pin, sort, select, scroll and edit are only verifiable by *driving* them |
| Theming mechanism | `config.theme` object → the theming story is **TypeScript** | **no `config.theme` exists** → the theming story is **SCSS wrapper classes** setting `--nge-table-*` |

> Do not hand-author table stories once this skill exists.

## When to Use

- A new table feature is landing and needs its story set (every feature ships stories **with** it,
  never as a trailing story).
- A feature has partial story coverage and is missing a facet.
- The user says "add table stories", "create table storybook", "write stories for \<feature\>".

---

## Phase 1: Identify the feature

Parse `$ARGUMENTS` for the feature name (kebab-case, e.g. `row-selection`, `cell-range`,
`fill-handle`).

1. **Read the library's contributor notes first** — `libs/shared/table/AGENTS.md`. It carries the
   per-story gotchas (what bites in each directory) that the story has to respect.
2. **Find the feature's surface.** Its config flags live in
   `libs/shared/table/src/lib/nge-table-config.ts`; its state slice in
   `nge-table-state.ts`; its events in `src/lib/events/`. Read all three — the interaction story's
   controls are derived from them.
3. **Check for existing stories:**
   ```
   Glob: libs/shared/table/src/lib/nge-table/stories/<feature>/**/*
   ```
   If all 3 subdirectories exist, say so and stop.
4. **Read the exemplar** for whichever facet you are generating (see the Reference table at the
   bottom). `core/` is the reference set for all three.

---

## Phase 2: Directory structure and naming

```
libs/shared/table/src/lib/nge-table/stories/<feature>/
├── interaction/                              ← PRIMARY. Generate first, richest.
│   ├── <feature>-interaction-stories.component.ts
│   ├── <feature>-interaction-stories.component.html
│   ├── <feature>-interaction-stories.component.scss
│   └── <feature>-interaction.stories.ts
├── usage/
│   ├── <feature>-usage-stories.component.{ts,html,scss}
│   └── <feature>-usage.stories.ts
└── theming/
    ├── <feature>-theming.component.{ts,html,scss}   ← NOTE: no "-stories" suffix
    └── <feature>-theming.stories.ts
```

**Naming rules:**

| Thing | Pattern | Example (`row-selection`) |
| --- | --- | --- |
| Wrapper component class | `NgeTable<Feature><Facet>StoriesComponent` | `NgeTableRowSelectionInteractionStoriesComponent` |
| Theming component class | `NgeTable<Feature>ThemingComponent` — **no `Stories`** | `NgeTableRowSelectionThemingComponent` |
| Selector + `host.class` | `nge-table-<feature>-<facet>-stories` | `nge-table-row-selection-interaction-stories` |
| Theming selector | `nge-table-<feature>-theming` — **no `-stories`** | `nge-table-row-selection-theming` |
| Story title | `Table/NgeTable/<Feature Title>/<Facet>` | `Table/NgeTable/Row Selection/Interaction` |

**`core` is the one set with no feature segment.** It is the table itself — `NgeTableUsageStoriesComponent`,
selector `nge-table-usage-stories`, title `Table/NgeTable/Core/Usage`. Cross-feature composition
examples (virtualization + pinning + resize together) belong there, not in a feature directory.

**Relative import depth is the same from every facet directory** (both are 2 levels below
`stories/`):

```ts
import type { NgeTableFixtureRow } from '../../../../../testing';        // src/testing
import { createNgeTableConfig }     from '../../../../nge-table-config'; // src/lib/*
import { NgeTableSlotDirective }    from '../../../../slots';
import { NgeTableComponent }        from '../../../nge-table.component';
```

⚠️ **Import the fixture by relative path, never by the `@nge/table/testing` alias.** The
alias is the *consumer's* entry point; inside the library it is a self-reference.

---

## Phase 3: Generate the 12 files

### The rules every facet obeys

1. **Rows come from the shared ARCH-241 fixture. Never inline a row array.**
   ```ts
   import { createNgeTableFixture, NGE_TABLE_FIXTURE_COLUMNS, NGE_TABLE_FIXTURE_SIZES }
     from '../../../../../testing';

   const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.small });
   ```
   It is deterministic (seeded mulberry32, frozen epoch), so stories are stable across machines.
   Use `NGE_TABLE_FIXTURE_SIZES.large` (10,000) only for virtualization.

2. ⚠️ **`getRowId` is mandatory for any story that marks, selects, edits, or highlights.** Without
   it the engine keys rows by array index, so a sort or a filter silently moves the user's marks
   onto different records — the failure that looks like data corruption rather than a bug.
   ```ts
   getRowId: row => row.id,
   ```

3. **Controlled state**: hold `NgeTableState` in a `signal`, bind `[state]`, handle
   `(stateChange)`. Never read state back off the table instance as a source of truth.

4. ⚠️ **Bound a table's height on `nge-table` itself, never on a wrapper `div`.** The host is a
   flex column whose viewport is `flex: 1 1 auto; min-height: 0`; a `max-height` on an ancestor is
   simply overflowed, so nothing scrolls, the sticky header has nothing to stick against, and
   virtualization has no window to compute.
   ```scss
   .table-container nge-table { max-height: 420px; }   // ✅
   .table-container { max-height: 420px; }              // ❌ silently does nothing useful
   ```

5. **`ViewEncapsulation.None` + `host: { class: '<selector>' }`**, and **nest all SCSS under that
   root wrapper — never `:host`.** An unnested rule leaks into every other story in the bundle.

6. **Inner story class names stay bare** — `.story-section`, `.table-container`, `.code-block`.
   This deliberately diverges from the charts stories' `nge-story-*` prefix: charts needed it
   because its runtime emits `nge-chart-*` classes a story could collide with, whereas the table
   runtime emits BEM `.nge-table__*`, so there is no collision surface. The nesting provides the
   isolation. **Do not "align" this with charts.**

7. **Never write a rule targeting `.nge-table__*` from a story.** That is styling the library, not
   theming it — and under `ViewEncapsulation.None` such a rule would actually land.

8. ⚠️ **Slot and cell templates need their type carrier**, or `TRow` resolves to `unknown` and any
   `let-` field access fails:
   ```html
   <ng-template ngeCell="amount" [ngeCellOf]="rows" let-cell>{{ cell.row.amount }}</ng-template>
   <ng-template ngeTableSlot="row-detail" [ngeTableSlotOf]="rows" let-detail>{{ detail.row.name }}</ng-template>
   ```
   **And note where that failure surfaces:** `shared-table` has no build target, so
   `tsc -p tsconfig.lib.json` never runs `ngtsc` over story templates. **Storybook's own compile is
   the only thing that checks them** — a template type error will not show up in lint or test.

9. **No Angular Material.** Plain `<button type="button">`, styled in the story SCSS.

10. **`perfectionist/sort-*` is enforced** — alphabetical imports, object literals, interface
    members. Finish with `npx nx run shared-table:lint --fix` rather than hand-sorting.

11. **Every wrapper sits inside `NgeStorybookReviewContainerComponent`:**
    ```ts
    import { NgeStorybookReviewContainerComponent, REVIEW_STATUS } from '@nge/storybook';
    // …
    reviewStatus = REVIEW_STATUS.DRAFT;
    storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/<feature>/<facet>';
    ```

12. **No `themeGroup` parameter.** Ten domain themes bridge `--nge-table-*` (ARCH-277), so the
    Storybook theme toolbar does move the table's tokens — but a theming story's subject is the
    contract, not one domain's mapping of it. Demonstrate every token from a scoped wrapper class,
    the way a consumer overriding it would.

---

### Subdirectory 1: Interaction — **the primary facet**

**Purpose:** drive the feature. jsdom cannot exercise scroll geometry, sticky offsets, or drag, so
for most table features this story is the *only* real verification that exists. Generate it first
and make it the richest of the three.

Two shapes are both valid; pick by what the feature is:

- **Numbered examples** (`core/interaction` uses this) — when the feature has several distinct
  behaviours worth showing side by side, each with its own live state readout. Best for seams.
- **Storybook controls** (the charts idiom) — `input()` signals surfaced as `argTypes`, with a
  `computed()` config rebuilding on change. Best for a feature with a wide flag surface.

```ts
@Component({
  encapsulation: ViewEncapsulation.None,
  host: { class: 'nge-table-<feature>-interaction-stories' },
  imports: [NgeStorybookReviewContainerComponent, NgeTableComponent],
  selector: 'nge-table-<feature>-interaction-stories',
  standalone: true,
  styleUrl: './<feature>-interaction-stories.component.scss',
  templateUrl: './<feature>-interaction-stories.component.html',
})
export class NgeTable<Feature>InteractionStoriesComponent {
  reviewStatus = REVIEW_STATUS.DRAFT;
  storybookFilePath = 'libs/shared/table/src/lib/nge-table/stories/<feature>/interaction';

  // Controls, when using the control shape. NEVER @Input().
  readonly enable<Feature> = input<boolean>(true);

  config = createNgeTableConfig<NgeTableFixtureRow>({
    columns: NGE_TABLE_FIXTURE_COLUMNS,
    data: rows,
    enable<Feature>: true,
    getRowId: row => row.id,          // ⚠️ mandatory if the feature marks anything
  });

  readonly state = signal<NgeTableState>(createNgeTableState());

  /** Show the state as JSON — the controlled-state contract is the thing being demonstrated. */
  readonly stateJson = computed(() => JSON.stringify(this.state(), null, 2));

  onStateChange(next: NgeTableState): void {
    this.state.set(next);
  }
}
```

**Every interaction story must show the state.** A `<pre>` of the relevant slice next to the table
is what turns "it looks right" into "the contract holds" — and it is what a reviewer reads.

**Include a host-drives-state example.** Buttons that write `state` from outside prove the other
half of the round trip, which a gesture alone never shows. Note that host-pushed state is
deliberately **silent** — it emits no `NgeTableEvent`.

`.stories.ts` for the control shape:

```ts
const meta: Meta<NgeTable<Feature>InteractionStoriesComponent> = {
  argTypes: {
    enable<Feature>: {
      control: 'boolean',
      description: '…',
      table: { category: 'Feature - Flags' },
    },
  },
  component: NgeTable<Feature>InteractionStoriesComponent,
  title: 'Table/NgeTable/<Feature Title>/Interaction',
};
export default meta;
export const Interaction: StoryObj<NgeTable<Feature>InteractionStoriesComponent> = {
  args: { enable<Feature>: true },
};
```

Categories: `'Feature - Flags'`, `'Feature - Behaviour'`, `'Table - Geometry'`, `'Table - Capabilities'`.
Every `input()` gets an `argType`; every `argType` gets a default in `args`.

⚠️ **A `select` / `radio` control puts `options` at the argType level, NEVER inside `control`.**
Nested, the Controls panel renders the row as a bare `-` — Storybook honours `type: 'select'`,
looks for `options` where they belong, finds none, and gives up **with no error in the console or
the build**. Boolean and number controls have nothing to look up, so they keep working and hide the
mistake; the story looks fine until someone tries to change the value.

```ts
// ✅
cellMode: { control: { type: 'select' }, options: ['gated', 'always-chart'], table: { … } }
// ❌ renders a dead `-`
cellMode: { control: { options: ['gated', 'always-chart'], type: 'select' }, table: { … } }
```

⚠️ **Verify a control by driving it, not by seeing it listed.** ARCH-291 shipped this bug through
lint, tests, typecheck and a Storybook compile; it surfaced only when a human opened the panel and
found the dropdown missing. The same applies to every interaction story: a control nobody moved is
a control nobody tested.

---

### Subdirectory 2: Usage

**Purpose:** documentation-style. Numbered examples with copy-pasteable code blocks, no controls.

- 5–9 numbered `<section class="story-section">` blocks, each: `<h4>` numbered title,
  `<p class="story-description">`, a `<div class="code-block"><pre>` example, then the table.
- Template escaping: `{{ '{' }}` / `{{ '}' }}` for braces, `&lt;` / `&gt;` for angle brackets,
  `&#64;` for `@`.
- The code in the block must be the code that actually runs above it. A usage story whose snippet
  has drifted from its example is worse than no snippet.
- State the insulation claim where it applies: **no example imports `@tanstack/*`**.

```html
<nge-storybook-review-container [reviewStatus]="reviewStatus" [storybookFilePath]="storybookFilePath">
  <div class="stories-container">
    <h2>NgeTable — <Feature Title> Usage</h2>
    <p class="intro-text">…</p>

    <section class="story-section">
      <h4>1. Basic usage</h4>
      <p class="story-description">…</p>
      <div class="code-block">
        <pre>
config = createNgeTableConfig&lt;Row&gt;({{ '{' }}
  columns: NGE_TABLE_FIXTURE_COLUMNS,
  data: createNgeTableFixture({{ '{' }} rows: 25 {{ '}' }}),
{{ '}' }});</pre>
      </div>
      <div class="table-container"><nge-table [config]="basicConfig" /></div>
    </section>
  </div>
</nge-storybook-review-container>
```

---

### Subdirectory 3: Theming

> ⚠️ **Read this whole section before writing a line of it. It is where a copied chart story breaks.**

**There is no `config.theme` on `NgeTableConfig`.** Do not write one, do not spread one. The table
themes exclusively through `--nge-table-*` CSS custom properties, so **the theming story's
substance lives in its SCSS**, and the component is little more than the configs its wrappers wrap.

Each section is one scoped wrapper class re-declaring tokens — which is exactly what a consumer
would write:

```scss
.nge-table-<feature>-theming {
  // …story scaffolding…

  .theme-<name> {
    --nge-table-<token>: <literal>;
  }
}
```

Because theming changes nothing about configuration, **reuse one config across most sections**.
Only sections demonstrating a token that a *capability* must switch on (pinning, resizing, the
row-detail band, the loading scrim) need a config of their own. A "same config, three wrapper
classes" comparison section makes the point better than any prose.

**Only demonstrate tokens the component actually reads.** Grep before you write:

```
grep -oE '\-\-nge-table-[a-z-]+' libs/shared/table/src/lib/nge-table/nge-table.component.scss | sort -u
```

A section for a token nothing consumes renders as a no-op and teaches a false contract. There are
**four tiers**, and the theming story should carry a closing section naming them:

| Tier | Tokens | Themeable from a wrapper class? |
| --- | --- | --- |
| Read from CSS | surfaces, content, borders, header band, pinning, typography, cell padding, resize grip, focus ring, slot chrome, selected row + selection accent, alternate row | **Yes** |
| Overwritten inline by the component | `--nge-table-row-height`, `--nge-table-header-height` | **Only when the config omits them** — see below |
| Mirrored in TypeScript | `--nge-table-column-min-width` / `-default-width` / `-max-width`, `--nge-table-selection-column-width` | No — the resize clamp and the selection column's `size` read `NGE_TABLE_DEFAULTS`; the knob is `NgeTableConfig` |
| Never yours to set | the `--nge-table-internal-*` family | No — runtime lane geometry; overriding breaks layout rather than restyling it |

⚠️ **A section whose prose says "scroll horizontally" needs a table that overflows.** The fixture's
seven columns come to ~1120px and fit the story panel, so a pinning section left at full width has
nothing to scroll and demonstrates none of what it claims. Bound the container (`max-width: 720px`)
for any section about the pinned lanes — and check `scrollWidth > clientWidth` in the browser rather
than assuming.

⚠️ **The geometry trap, in full.** `createNgeTableConfig()` fills in `rowHeight` and `headerHeight`
from `NGE_TABLE_DEFAULTS` *unconditionally*, and `<nge-table>`'s `applyGeometry` then publishes
both as **inline custom properties on the host** — where they beat a wrapper class outright, because
an inline declaration outranks a class selector regardless of specificity. So a density section
built on a factory config **will not work**, and it fails silently. To demonstrate the height
tokens, hand-author the config object and omit the fields (a supported path — the factory exists for
convenience, not as the only constructor):

```ts
readonly themableGeometryConfig: NgeTableConfig<NgeTableFixtureRow> = {
  columns: NGE_TABLE_FIXTURE_COLUMNS,
  data: rows,
  getRowId: row => row.id,
};
```

Cell padding has no such caveat. With virtualization on, row height is *always* a config concern —
the virtualizer positions rows it has not rendered and so needs the number in TypeScript.

**Ship a dark section.** It is the shape a domain's `--nge-table-*` bridge will take when a
consumer adopts the library. Restate every surface rather than letting any inherit — the pinned
surfaces especially, which are opaque by requirement, so a missed one shows up as pale rectangles
punched through a dark table.

**Some tokens are only visible under a gesture.** The resize grip is `transparent` at rest by
design; the hover, active and focus-ring tokens need prose telling the reviewer to hover, drag and
tab. Say so in the section rather than shipping a section that appears to do nothing.

`.stories.ts` — no `argTypes`, matching the charts theming convention:

```ts
const meta: Meta<NgeTable<Feature>ThemingComponent> = {
  component: NgeTable<Feature>ThemingComponent,
  title: 'Table/NgeTable/<Feature Title>/Theming',
};
export default meta;
export const Theming: StoryObj<NgeTable<Feature>ThemingComponent> = { args: {} };
```

---

## Phase 4: Verify

1. **Lint and test** — `npx nx run-many -t lint test -p shared-table`. Run lint with `--fix` first
   to settle `perfectionist` ordering.
2. **Type-check** — `npx tsc -p libs/shared/table/tsconfig.lib.json --noEmit`. `shared-table` has no
   build target, so nothing else runs `tsc` over the source. ⚠️ **This does not check templates.**
3. **Storybook — mandatory, not optional.** No registration change is needed: the globs in
   `apps/storybook-app/.storybook/main.ts` and `.storybook/tsconfig.json` are wildcards over
   `libs/shared/table/src/**`. Run `npm run storybook` and confirm the story appears under
   `Table/NgeTable/<Feature Title>/` and renders **without console errors**. This is the only
   `ngtsc` pass over the story templates.
   - ⚠️ Port 4400 may be held by a **sibling clone** of this repo with an identical story tree, so a
     visual check can silently test the wrong working copy. Confirm the serving cwd first:
     ```
     for pid in $(lsof -ti:4400 -sTCP:LISTEN); do lsof -a -p $pid -d cwd -Fn | grep ^n; done
     ```
4. **Drive the feature in the browser.** Anything touching scroll geometry, sticky offsets, or drag
   is unverifiable anywhere else — that is why interaction is the primary facet. Asserting on
   computed styles is stronger than eyeballing:
   ```js
   getComputedStyle(document.querySelector('.nge-table__cell')).height
   ```

---

## Reference

| What | Path |
| --- | --- |
| Exemplar story set (all 3 facets) | `libs/shared/table/src/lib/nge-table/stories/core/` |
| Interaction exemplar | `…/stories/core/interaction/` — 14 numbered examples, live state readouts |
| Usage exemplar | `…/stories/core/usage/` — numbered examples with code blocks |
| Theming exemplar | `…/stories/core/theming/` — SCSS wrapper classes, four token tiers, dark |
| Contributor notes (read first) | `libs/shared/table/AGENTS.md` |
| Architecture guide | `docs/architecture/table.md` |
| Token contract | `libs/shared/table/src/lib/styles/_table-tokens.scss` |
| Config / state types | `libs/shared/table/src/lib/nge-table-config.ts`, `nge-table-state.ts` |
| Shared fixture | `libs/shared/table/src/testing/` |
| Slots and contexts | `libs/shared/table/src/lib/slots/` |
| Chart sibling skill | `.claude/skills/create-chart-storybook/SKILL.md` |
