# Domain Library Set

> **IMPORTANT:** Always use the Nx CLI (`npx nx generate`) to create domain libraries. NEVER create library files, `project.json`, `tsconfig.json`, or barrel exports manually.

A **domain** is a top-level vertical in the monorepo — it owns both its applications and its libraries under a shared parent directory name:

```
apps/[domain]/          ← main Angular application
libs/[domain]/          ← the supporting libraries
```

Examples: `concierge`, `cognition`, `got-you`, `media-workbench`, `nge-marketing`, `jerryorta`.

Every domain carries the same **six core libraries** — `models`, `store`, `themes`, `ui`, `design-library`, `utils` — and adds the optional ones it needs: `mocks` (cognition, concierge, jerryorta), `secrets` (cognition, concierge, got-you) and a `docs/` folder. The canonical example is `libs/media-workbench/` backed by `apps/media-workbench/app`.

---

## Domain Directory Structure

```
apps/
  [domain]/
    app/                ← main Angular application
    backend/            ← Firebase backend (functions, Firestore rules, etc.)
                           Explicitly ignored by Nx — not an Nx project
    desktop/            ← Desktop application (Tauri)
                           Explicitly ignored by Nx — not an Nx project
    mobile/             ← Mobile application (Capacitor/native)
                           Explicitly ignored by Nx — not an Nx project

libs/
  [domain]/
    models/             ← models, interfaces, pure functions
    store/              ← NgRx state (actions, reducers, effects, selectors)
    themes/             ← design tokens, CSS custom properties (own-namespace --[prefix]-* theme; no Angular Material)
    ui/                 ← smart/container components (consume store)
    design-library/     ← reusable presentational components, directives, pipes
    utils/              ← pure utility functions
```

---

## Library Inventory

| Library          | Nx project name           | Path alias                              | Component prefix |
| ---------------- | ------------------------- | --------------------------------------- | ---------------- |
| `models`         | `[domain]-models`         | `@nge/[domain]-models`         | —                |
| `store`          | `[domain]-store`          | `@nge/[domain]-store`          | —                |
| `themes`         | `[domain]-themes`         | — (SCSS only, no TS exports)            | —                |
| `ui`             | `[domain]-ui`             | `@nge/[domain]-ui`             | `[prefix]`       |
| `design-library` | `[domain]-design-library` | `@nge/[domain]-design-library` | `[prefix]`       |
| `utils`          | `[domain]-utils`          | `@nge/[domain]-utils`          | —                |

> **Path-alias separator — use the dash form for a new domain.** The alias mirrors the Nx project name: `@nge/[domain]-[lib-type]`. `cognition`, `concierge`, `nge-marketing`, `got-you` and `jerryorta` follow it throughout. One older domain uses a slash for everything except the store, which is dash in all six: `@nge/media-workbench/{models,ui,design-library,utils}`. Read the alias out of `tsconfig.base.json` rather than deriving it.
>
> **Nx tags** are declared in each library's `project.json` and enforced by the root ESLint config's module-boundary rule. Every project carries one `scope:[domain]` and one `type:[lib-type]` tag, as each generator command below passes.

---

## Library Purposes

### `models` — Models & Interfaces

Domain-specific types, interfaces, enums, and pure reusable functions. No Angular, no DI, no side effects.

This is also the lib the domain's Firebase backend compiles from source, aliased as `@nge/<domain>-models` in its `functions/tsconfig.json`, `jest.config.cjs` and `esbuild.config.mjs`. Domain code a backend needs lives here, never in `@nge/api`. Framework-free is lint-enforced: each models lib's `eslint.config.mjs` spreads `frameworkFreeLib`, which makes an `@angular/*`, `@ngrx/*`, `@capacitor/*`, `@ionic/*`, `rxjs` or `zone.js` import an error.

- **What goes here:** data models (`*.model.ts`), DTOs, enums, type guards, domain-specific pure transformation functions
- **What does NOT go here:** services, components, state, anything with Angular DI
- **Depends on:** `@nge/api` only, for cross-domain primitives (e.g. `IanaTimeZone`, `DocumentState`); no other workspace lib

### `store` — Global NgRx State

**Global** NgRx state for the domain — actions, reducers, effects, and selectors that are shared across multiple features or the whole app.

- **What goes here:** `+[feature]/` directories (actions, reducer, effects, selectors, facade); query engine services for Firestore sync; state that is consumed by more than one feature
- **Store-internal shared concerns:** logic used by 2+ slices (but not a slice itself) lives in a named non-`+` folder under `src/lib/<concern>/` with its own `index.ts`, re-exported through the store barrel — e.g. `firestore-write/`, `firestore-timestamp/`. Extract here the moment a helper would otherwise be copied into a second slice.
- **What does NOT go here:** UI components; feature-local state (Signal Store for local/component state lives next to its component in `ui` or `design-library`)
- **Depends on:** `models`, shared `@nge/store`, `@nge/firebase`

### `themes` — Design Tokens & SCSS Theme

CSS custom property design tokens (`--[prefix]-*`) and global SCSS styles for the domain's visual identity. Style-only — no TypeScript exports, no Angular Material.

- **What goes here:** CSS custom property definitions (e.g. `--mw-primary`, `--mw-surface`), reset/base styles, theme variants (dark/light)
- **What does NOT go here:** Angular components, TypeScript
- **Depends on:** nothing (no internal workspace deps)

### `ui` — Domain Smart Components

Angular components specific to this domain that are **container/smart** — they connect to the store, inject services, and compose `design-library` components into feature-level views.

- **What goes here:** page-level containers, views that wire store selectors → template, domain-specific feature components; feature-local NgRx Signal Stores colocated next to the component they serve
- **What does NOT go here:** reusable presentational components (those go in `design-library`); global shared state (that goes in `store`)
- **Custom components — no Angular Material:** build domain-branded components from scratch; use `@angular/cdk` utilities (overlays, portals, a11y, drag-drop) where they help, but CDK is a construction aid, not a component library
- **Animations:** GSAP (`gsap`) for sophisticated animations; Angular animations for simple state transitions
- **Styling — Tailwind first:** same priority as `design-library` — Tailwind for layout, spacing, typography, and colors; SCSS only for pseudo-selectors, child selectors, and CSS custom property definitions
- **Tailwind availability:** picked up automatically by the app's `tailwind.config.js` via `createGlobPatternsForDependencies` — no lib-level config needed
- **Depends on:** `models`, `store`, `design-library`, `utils`

### `design-library` — Reusable Presentational Components

Reusable Angular **components, directives, and pipes** that are purely presentational — they accept `input()` signals, emit `output()` signals, render to the DOM, and have no store or service dependency. This is the domain's component kit.

- **What goes here:** domain-branded UI primitives (buttons, chips, progress bars, cards), reusable directives, pure pipes; feature-local NgRx Signal Stores colocated next to the component they serve
- **What does NOT go here:** global shared state (that goes in `store`); smart components that consume the global store (those go in `ui`)
- **Custom components — no Angular Material:** build domain-branded components from scratch; use `@angular/cdk` utilities (overlays, portals, a11y, drag-drop) where they help, but CDK is a construction aid, not a component library
- **Animations:** GSAP (`gsap`) for sophisticated animations; Angular animations for simple state transitions
- **Component conventions:**
  - `ViewEncapsulation.None`
  - `host: { class: '[prefix]-[name]' }` matching the selector
  - SCSS wrapped in `.[prefix]-[name] { }` — never `:host`
  - CSS custom properties (`--[prefix]-*` tokens) for all overridable styles
- **Styling — Tailwind first:**
  - Tailwind utility classes are the primary styling tool — layout, spacing, typography, colors
  - Reference domain CSS tokens via Tailwind's CSS variable syntax: `text-(--mw-on-surface)`, `bg-(--mw-surface)`, `border-(--mw-outline)`
  - SCSS is used only for: pseudo-selectors (`:hover`, `:focus`, `::placeholder`), child element selectors, and CSS custom property definitions
  - If the `.scss` file contains only the root class wrapper with no rules inside, delete it and remove `styleUrl` from the decorator
- **Tailwind availability:** Tailwind is configured at the app level via `createGlobPatternsForDependencies` in `apps/[domain]/app/tailwind.config.js` — no lib-level Tailwind config is needed; classes used in lib templates are automatically picked up
- **Depends on:** `models` (for model types), `themes` (for CSS tokens)

### `utils` — Pure Utility Functions

Stateless, side-effect-free TypeScript functions. No Angular, no NgRx, no Firebase.

- **What goes here:** transformation functions, formatters, validators, parsers — each as `[name].ts` + `[name].spec.ts`
- **What does NOT go here:** anything with Angular DI or observables
- **Depends on:** `models` (for model types)

---

## Finding & Placing Shared Code

A workspace this size has many shared libraries; the failure modes are (a) re-writing a helper that already exists, and (b) putting new shared code in a library that is being deprecated. Two rules prevent both.

### Search before you write

- Grep the codebase for the symbol or behavior first.
- The authoritative registry of shared libraries is **`tsconfig.base.json`** (`compilerOptions.paths`) — every shared lib is a `@nge/*` alias there. It is build-maintained, so it never goes stale; prefer it over any hand-kept inventory.

### Place by altitude (prefer the domain's own libs)

The direction is **self-contained domain apps** — each domain owns its own core library set, so new shared code defaults to the consuming domain rather than a cross-domain shared lib:

| What | Where |
| ---- | ----- |
| Pure models / types / enums / pure fns | `libs/<domain>/models` |
| Stateless utility fns | `libs/<domain>/utils` |
| Logic shared by 2+ store slices | `libs/<domain>/store/src/lib/<concern>/` (e.g. `firestore-write`, `firestore-timestamp`) |
| Presentational component / directive / pipe | `libs/<domain>/design-library` first — promote to `libs/shared/ui-design-library` only when shared across apps |
| Smart / container component | `libs/<domain>/ui` |
| Cross-domain infra (Firebase, RxJS, dates, charts, …) | the existing `@nge/*` shared lib — reuse, don't duplicate |
| Public / open-data endpoints (a state registry, a government or open-data API, a public dataset) | `libs/shared/data` (`@nge/data`), `src/lib/static/endpoints/` — the base-URL const, URL builders and typed responses, with a companion `.md` recording what the API returns and why it is here (pattern: `texas-comptroller.ts`) |

**Public endpoints are the cross-domain exception to place-by-altitude.** An open endpoint discovered while working one domain (the Texas Comptroller franchise-tax API turned up in Got You's vendor onboarding) is by nature usable by every other domain — an entity-status lookup is as relevant to a real-estate cross-reference as to an A2P brand check — so it goes straight into `@nge/data`'s `static/endpoints/`, never into `libs/<domain>/…`. Keep the entry to the endpoint itself (URLs, builders, response types, explainer); the domain-specific analysis that consumes it stays in the domain.

**Design-library components — build here first, share second.** A new presentational primitive (`<prefix>-*`) starts in the **consuming domain's own `libs/<domain>/design-library`**. Promote it to the cross-app **`libs/shared/ui-design-library`** (`dlc-*`) ONLY once a second application genuinely needs it — the domain lib is the default, shared is the exception. Both use the same Material-free, own-namespace `--<prefix>-*` token architecture (see `libs/shared/ui-design-library/AGENTS.md` § Tokens).

### Shared libraries in transition

Every `@nge/*` alias in `tsconfig.base.json` is valid shared infrastructure — reuse it rather than duplicating. Two need care:
- `@nge/api` (`libs/shared/api`) — framework-free, truly cross-domain code: the MCP core (`@nge/api/mcp-server`) and shared primitives (`NgeTimeStamp`, `DocumentState`, `IanaTimeZone`). A backend aliases it only when it imports that shared code (today, cognition's). A concept one domain owns belongs in that domain's `models` lib instead.
- `@nge/store` (`libs/shared/store`) — shared state infrastructure rather than the primary store; domains may depend on it (e.g. `QueryEngineCache` is consumed by every domain store). Build on it as shared infra; put NEW domain state slices in `libs/<domain>/store`, not here.

> **Worked example.** The concierge store slices share one `toIsoTimestamp`, in `libs/concierge/store/src/lib/firestore-timestamp/`: a domain-owned, store-internal concern folder. The shared `convertToUnixTimestamp` in `@nge/api` would not fit anyway. It returns an epoch-ms `number`, the wrong type for these ISO-`string` fields, and it ignores live `Timestamp` instances and already-ISO strings. The deciding rule, though, is **"prefer the domain's own libs"**: domain-specific logic stays in the domain, not in a cross-domain shared lib.

---

## Dependency Order

```
models         ←── no internal deps
utils          ←── models
themes         ←── no internal deps
design-library ←── models, themes
store          ←── models, utils
ui             ←── models, store, design-library, utils
```

Applications depend on the whole set. Libraries never depend upward in this list. The `store` must never import from `ui` or `design-library`.

---

## Naming Conventions

| Concept            | Pattern                             | Example (`media-workbench`)                    |
| ------------------ | ----------------------------------- | ---------------------------------------------- |
| Directory          | `libs/[domain]/[lib-type]/`         | `libs/media-workbench/design-library/`         |
| Nx project name    | `[domain]-[lib-type]`               | `media-workbench-design-library`               |
| Path alias         | `@nge/[domain]-[lib-type]` | `@nge/cognition-design-library`       |
| Path alias (store) | `@nge/[domain]-store`      | `@nge/media-workbench-store`          |
| Component prefix   | domain initials                     | `mw`                                           |
| Component selector | `[prefix]-[name]`                   | `mw-chip`                                      |

---

## Creating a New Domain Library Set

> Always verify flags with `--help` before running. These commands reflect the patterns observed in `libs/media-workbench/` and `apps/media-workbench/`.

Replace `[domain]` (e.g. `media-workbench`), `[domain-camel]` (e.g. `mediaWorkbench`), and `[prefix]` (e.g. `mw`).

### App

```bash
npx nx generate @nx/angular:application apps/[domain]/app \
  --name=[domain]-app \
  --prefix=[prefix] \
  --routing=true \
  --e2eTestRunner=none \
  --tags="scope:[domain],type:app"
```

**Post-generation — `tailwind.config.js`:** add a Tailwind config at `apps/[domain]/app/tailwind.config.js`. This is the single Tailwind entry point for the entire domain — it covers the app and all its lib dependencies automatically via `createGlobPatternsForDependencies`:

```javascript
const { createGlobPatternsForDependencies } = require('@nx/angular/tailwind');
const { join } = require('path');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    join(__dirname, 'src/**/!(*.stories|*.spec).{ts,html}'),
    ...createGlobPatternsForDependencies(__dirname),
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
```

Tailwind classes used in `ui`, `design-library`, and any other lib consumed by the app are all processed through this config — no per-library Tailwind setup is needed.

**Post-generation — `src/styles.scss`:** load Tailwind between the theme `@use` and the theme mixin call:

```scss
@use '[prefix]-themes';

@use 'tailwindcss';

@include [prefix]-themes.[prefix]-theme-mixin();
```

> See the themes section below for the full `[prefix]-themes` setup. The `@use 'tailwindcss'` line sits between the `@use` and the mixin call — the pattern in `apps/media-workbench/app/src/styles.scss`, shared by cognition, concierge, nge-marketing and jerryorta. Got You is the one variant: `apps/got-you/app/src/styles.scss` uses `@import "tailwindcss" source(none)` so Sass passes the line through to `@tailwindcss/postcss` untouched.

**Custom components + GSAP:** `@angular/cdk` and `gsap` are workspace dependencies — no installation needed. Use GSAP for sophisticated animations in the app.

**Post-generation — `app.config.ts`:** the generator may scaffold Zone.js providers. Replace with `provideZonelessChangeDetection()`:

```typescript
import { provideZonelessChangeDetection } from '@angular/core';

export const appConfig: ApplicationConfig = {
  providers: [
    provideZonelessChangeDetection(),
    // ... other providers
  ],
};
```

**Post-generation — release updates (required for any app users keep open):**
- Add `apps/[domain]/app/src/app/app-version.ts` and a served `app-version.json`.
- Wire the shared watcher with `provideNgeAppRelease({ firestorePath: '<APP_COLLECTION>/[domain]-app-release', servedVersionUrl: 'app-version.json', version: appInstalledBuildVersion })` (`@nge/store/app-release`). Never write a domain watcher; anti-pattern `domain-release-watcher` blocks one.
- The domain's prompt component (in its design library), the publish tool and the release doc's READ rule follow once the design library and backend exist.

Contract: `docs/ai/CONSTRAINTS.md` § App Release Updates. Steps: `docs/service-worker/README.md` § Onboard a new app, step 4.

### `models` — `@nx/js:library`

Pure TypeScript — no Angular, no Zone.js, CommonJS module system.

```bash
npx nx generate @nx/js:library libs/[domain]/models \
  --name=[domain]-models \
  --tags="scope:[domain],type:models"
```

Then spread `frameworkFreeLib` (from the root `eslint.config.js`) in the lib's `eslint.config.mjs`, as `libs/cognition/models/eslint.config.mjs` does.

### `store` — `@nx/angular:library`

Angular library. Uses `jest-preset-angular` with **zoneless** test setup.

```bash
npx nx generate @nx/angular:library libs/[domain]/store \
  --name=[domain]-store \
  --prefix=[prefix] \
  --tags="scope:[domain],type:store"
```

**Post-generation:** replace the generated `src/test-setup.ts` with the zoneless setup:

```typescript
import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
```

### `themes` — `@nx/angular:library`

Style-only library. No unit tests — Angular compiler options still needed for SCSS processing.

```bash
npx nx generate @nx/angular:library libs/[domain]/themes \
  --name=[domain]-themes \
  --prefix=[prefix] \
  --unitTestRunner=none \
  --tags="scope:[domain],type:themes"
```

**Post-generation — remove generated component and barrel.** The generator creates a stub Angular component and `src/index.ts` that must be deleted — `themes` is a style-only library with no TypeScript exports:

```bash
rm -rf libs/[domain]/themes/src/lib/[domain]-themes/
rm libs/[domain]/themes/src/index.ts
```

> Canonical reference: `libs/media-workbench/themes/src/` contains no component directory and no `index.ts`.

**Post-generation — scaffold the SCSS structure.** The generator produces an empty lib. Create the following file structure to prevent compile errors when the app imports the theme. Follow the `libs/media-workbench/themes/` pattern exactly:

```
libs/[domain]/themes/src/lib/styles/
  [prefix]-themes.scss          # Entry point — @use all partials, exposes [prefix]-theme-mixin()
  _[prefix]-tokens.scss         # Documents all --[prefix]-* CSS variable names (contract, no values)
  _[prefix]-base.scss           # Reset, body styles, global layout classes
  [prefix]/
    _[prefix]-dark.scss         # Dark theme — all --[prefix]-* values under html.[prefix]-dark
    _[prefix]-light.scss        # Light theme — all --[prefix]-* values under html.[prefix]-light
```

The entry point exposes a single mixin that the app calls — this is what prevents SCSS compile errors:

```scss
// libs/[domain]/themes/src/lib/styles/[prefix]-themes.scss
@use '[prefix]/[prefix]-dark';
@use '[prefix]/[prefix]-light';
@use '[prefix]-base';

@mixin [prefix]-theme-mixin() {
  @include [prefix]-dark.[prefix]-dark-theme();
  @include [prefix]-light.[prefix]-light-theme();
  @include [prefix]-base.[prefix]-base();
}
```

Each partial wraps its rules in a mixin — nothing emits CSS at `@use` time, only when the mixin is called:

```scss
// libs/[domain]/themes/src/lib/styles/[prefix]/_[prefix]-dark.scss
@mixin [prefix]-dark-theme() {
  html.[prefix]-dark {
    --[prefix]-primary: /* value */;
    --[prefix]-surface: /* value */;
    // ... all tokens
  }
}
```

**Post-generation — wire into the app's `project.json`:** add `stylePreprocessorOptions` to the top-level `options` block of the `build` target (not inside a specific configuration — placing it here applies it to all build configurations automatically) so SCSS in any lib can `@use` theme partials by name without a relative path:

```json
"stylePreprocessorOptions": {
  "includePaths": [
    "libs/[domain]/themes/src/lib/styles"
  ]
}
```

**Post-generation — wire into `apps/[domain]/app/src/styles.scss`:**

```scss
@use '[prefix]-themes';

@use 'tailwindcss';

@include [prefix]-themes.[prefix]-theme-mixin();
```

**Set the default theme class on `<html>`** in `apps/[domain]/app/src/index.html`:

```html
<html lang="en" class="[prefix]-dark"></html>
```

> See `libs/media-workbench/themes/` as the canonical example, and `libs/media-workbench/themes/AGENTS.md` for the full token contract and usage guidelines.

### `ui` — `@nx/angular:library`

Smart/container Angular components. Uses `jest-preset-angular` with **zoneless** test setup.

```bash
npx nx generate @nx/angular:library libs/[domain]/ui \
  --name=[domain]-ui \
  --prefix=[prefix] \
  --tags="scope:[domain],type:ui"
```

**Post-generation:** replace `src/test-setup.ts` with the zoneless setup (same as `store` above).

### `design-library` — `@nx/angular:library`

Reusable presentational components, directives, pipes. Uses `jest-preset-angular` with **zoneless** test setup.

```bash
npx nx generate @nx/angular:library libs/[domain]/design-library \
  --name=[domain]-design-library \
  --prefix=[prefix] \
  --tags="scope:[domain],type:design-library"
```

**Post-generation — `src/test-setup.ts`:** replace with the zoneless setup (same as `store` above).

**Post-generation — `project.json`:** add a `generators` block so all components generated inside this library default to the correct conventions:

```json
"generators": {
  "@nx/angular:component": {
    "style": "scss",
    "changeDetection": "OnPush",
    "viewEncapsulation": "None",
    "displayBlock": true,
    "skipTests": false,
    "inlineStyle": false,
    "inlineTemplate": false
  }
}
```

### Storybook Registration — `design-library`

**What to register:** Every domain registers its `libs/[domain]/design-library` — that is the standard. `libs/[domain]/ui` is *not* registered by default (smart component stories can be added manually later if desired). `apps/[domain]/app` is never registered in Storybook.

After the `design-library` is generated, register it with the workspace Storybook app (`apps/storybook-app/`) so its stories are visible during development. Make the following three changes:

**1. `.storybook/main.ts` — add a `stories` entry:**

```typescript
'../../../libs/[domain]/design-library/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))',
```

Add it to the existing `stories` array alongside the other domain lib entries.

**2. `project.json` — add the domain themes path to `stylePreprocessorOptions.includePaths`:**

```json
"libs/[domain]/themes/src/lib/styles"
```

This goes in the existing `includePaths` array on the build target's top-level `options` block (not inside a named configuration).

**3. `src/styles.scss` — import the domain theme:**

```scss
@use '[prefix]-themes';
// ...
@include [prefix]-themes.[prefix]-theme-mixin();
```

The `@use` directive must appear before `@use 'tailwindcss'`. The `@include` call must follow it, alongside the other theme mixin calls.

> See `apps/storybook-app/src/styles.scss` as the canonical reference — it wires six domain themes (`mw-`, `cg-`, `nge-`, `cog-`, `gy-`, `jo-`) using this exact pattern, with the `libs/shared/charts/theming` and `libs/shared/table/theming` `:root` defaults `@use`d ahead of them so a theme's bridge wins the source-order tie.

---

### `utils` — `@nx/angular:library`

Pure utility functions. Uses `@nx/angular:library` (not `@nx/js:library`) so it shares the same Angular module resolution and test setup as the rest of the domain. Uses `jest-preset-angular` with **zoneless** test setup.

```bash
npx nx generate @nx/angular:library libs/[domain]/utils \
  --name=[domain]-utils \
  --prefix=[prefix] \
  --tags="scope:[domain],type:utils"
```

**Post-generation:** replace `src/test-setup.ts` with the zoneless setup (same as `store` above).

### `mocks` — `@nx/js:library` (optional)

Test fixtures shaped by the domain's models, for the domain's specs and stories. Pure TypeScript, like `models`, so no `--prefix`.

```bash
npx nx generate @nx/js:library libs/[domain]/mocks \
  --name=[domain]-mocks \
  --tags="scope:[domain],type:mocks"
```

---

### Post-Generation Corrections

The Nx CLI automatically configures Jest (`jest.config.cts`, `tsconfig.spec.json`, `test-setup.ts`) and ESLint (`eslint.config.mjs`) and wires up `test` and `lint` targets in `project.json`. Two things must be manually corrected after generation:

**1. ESLint prefix** — Angular libs may generate with `prefix: 'lib'` in `eslint.config.mjs`. Correct it to the domain prefix:

```javascript
// In libs/[domain]/[lib]/eslint.config.mjs
'@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: '[prefix]', style: 'camelCase' }],
'@angular-eslint/component-selector': ['error', { type: 'element', prefix: '[prefix]', style: 'kebab-case' }],
```

**2. Zoneless test setup** — Angular libs generate with `setupZoneTestEnv`. Replace with `setupZonelessTestEnv` in `src/test-setup.ts` (see [Zoneless test setup](#store--nxangularlibrary) above).

---

### Post-Generation — `index.html`

Set the theme class, prevent flash of unstyled content, load fonts, and load the Material Symbols icon font. Follow `apps/media-workbench/app/src/index.html` as the canonical example:

```html
<!doctype html>
<html lang="en" class="[prefix]-dark">
  <head>
    <meta charset="utf-8" />
    <title>[Domain Name]</title>
    <base href="/" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
    <link rel="icon" type="image/x-icon" href="favicon.ico" />

    <!-- Prevent flash of white before CSS loads -->
    <style>
      body { background-color: [dark-surface-hex]; }
    </style>

    <!-- Domain font (replace with domain-specific choice) -->
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link href="https://fonts.googleapis.com/css2?family=..." rel="stylesheet" />

    <!-- Material Symbols icon font -->
    <link rel="stylesheet"
      href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@20..48,100..700,0..1,-50..200" />

    <meta name="theme-color" content="[primary-color-hex]" />
  </head>
  <body>
    <[prefix]-root></[prefix]-root>
  </body>
</html>
```

### Post-Generation — `package.json` scripts

Add serve and build scripts to the root `package.json` following the workspace convention:

```json
"s.app.[domain]": "npx nx run [domain]-app:serve:local-dev --skip-nx-cache --port [port]",
"b.app.[domain]": "npx nx run [domain]-app:build --configuration=production --skip-nx-cache"
```

Use a unique port for each domain app. The `s.app.*` scripts in the root `package.json` show the ports already taken (media-workbench uses `4201`).

### Post-Generation — module boundaries

Register the new scope in the root ESLint config. In the `@nx/enforce-module-boundaries` `depConstraints`, find every constraint whose `sourceTag` is an existing domain's `scope:*`, and add the same constraint for `scope:[domain]`, with that domain's name replaced by `[domain]` in its tag lists. Change no other constraint.

Every generated project already matches a `type:*` constraint, so lint passes without this step. But a scope that no constraint names goes unchecked, and the new domain could then import another domain's libraries with no lint error.

### Post-Generation — Verification

Run lint and build to confirm the domain scaffolding compiles cleanly before starting feature work:

```bash
# Lint all domain projects
npx nx run-many --target=lint --projects=[domain]-models,[domain]-store,[domain]-themes,[domain]-ui,[domain]-design-library,[domain]-utils,[domain]-app

# Test all domain projects
npx nx run-many --target=test --projects=[domain]-models,[domain]-store,[domain]-ui,[domain]-design-library,[domain]-utils,[domain]-app

# Build the app
npx nx run [domain]-app:build
```

---

### Workspace Notes

**Global component generator defaults (`nx.json`):** the workspace pre-configures `@nx/angular:component` globally with `OnPush`, `ViewEncapsulation.None`, SCSS, `displayBlock`, `skipTests: false`, and `inlineStyle` / `inlineTemplate` both `false`. These apply automatically to all generated components — the `design-library` `generators` block restates them so the library carries its own contract even if the global default moves.

**Module boundaries are enforced:** the root ESLint config carries `@nx/enforce-module-boundaries`, and every project declares a `scope:*` tag (its vertical) and a `type:*` tag (its rung in the hierarchy above) in `project.json`. The dependency order in this file is therefore checked at lint time, not left to discipline. The tag vocabulary and the constraint table are in `docs/ai/CONSTRAINTS.md` § Module Boundaries — read the rule itself from the root ESLint config.

**Custom components — no Angular Material:** `ui` and `design-library` build domain-branded components from scratch. `@angular/cdk` (overlays, portals, a11y, drag-drop) is available as a construction utility — it assists in building components but is not a component library itself. `@angular/material` components are not used. `gsap` is available for sophisticated animations across `ui`, `design-library`, and the app. Both `@angular/cdk` and `gsap` are workspace dependencies — no installation needed.

---

### Backend, Desktop, Mobile

These directories are **not Nx projects** and are not generated with the Nx CLI. They live inside `apps/[domain]/` alongside the Angular app. The tech stack varies per use case (e.g. Python vs Node.js for Firebase, Tauri vs Electron for desktop, Capacitor vs another framework for mobile). Create each with a `.gitkeep` placeholder only:

```bash
mkdir -p apps/[domain]/backend && touch apps/[domain]/backend/.gitkeep
mkdir -p apps/[domain]/desktop && touch apps/[domain]/desktop/.gitkeep
mkdir -p apps/[domain]/mobile  && touch apps/[domain]/mobile/.gitkeep
```

**After creating the stubs**, register them with Nx's ignore system so they are never treated as Nx projects:

1. Add to `.nxignore` (alongside the other `apps/*` per-domain entries):
   ```
   apps/[domain]/backend
   apps/[domain]/desktop
   ```
   > `mobile` is already covered by the existing `apps/**/mobile` wildcard in `.nxignore`.

2. Add to the `exclude` array of the `@nx/eslint/plugin` entry in `nx.json` (alongside the other `apps/*` per-domain entries, before `"backend/**/*"`):
   ```json
   "apps/[domain]/backend/**/*",
   "apps/[domain]/desktop/**/*",
   "apps/[domain]/mobile/**/*",
   ```

---

### `tsconfig.base.json` path aliases

After all libraries are generated, add entries to `tsconfig.base.json`:

```json
"@nge/[domain]-models":         ["libs/[domain]/models/src/index.ts"],
"@nge/[domain]-store":          ["libs/[domain]/store/src/index.ts"],
"@nge/[domain]-ui":             ["libs/[domain]/ui/src/index.ts"],
"@nge/[domain]-design-library": ["libs/[domain]/design-library/src/index.ts"],
"@nge/[domain]-utils":          ["libs/[domain]/utils/src/index.ts"]
```

> Note: every alias uses a dash separator matching the Nx project name — the form `cognition`, `concierge`, `nge-marketing`, `got-you` and `jerryorta` use throughout. `media-workbench` predates it and keeps a slash for its non-store libs; the store is dash in all six.

> Note: `themes` has no TypeScript exports and is not registered here — it is consumed via SCSS `includePaths` in the app's build config, not via a TypeScript import.

---

## AGENTS.md

Each library must have an `AGENTS.md` at its root: a one-page **rulebook** — its purpose, commands, the paradigms it follows (component-scoped vs global state, where logic lives, token and theme wiring, the test gate) and the invariants its code cannot state (a frozen public surface, a banned engine API). It is not a log of feature decisions; the code and its specs are the record of how a feature is built, and a story's narrative lives in its `~/Dev/gigasoftware-plans/<board>/<KEY>.md`. Keep it short enough to auto-load (≤ 25 KB).

- `libs/media-workbench/store/AGENTS.md`
- `libs/media-workbench/ui/AGENTS.md`
- `libs/media-workbench/utils/AGENTS.md`
