# Domain Library Set

> **IMPORTANT:** Always use the Nx CLI (`npx nx generate`) to create domain libraries. NEVER create library files, `project.json`, `tsconfig.json`, or barrel exports manually.

A **domain** is a top-level vertical in the monorepo — it owns both its applications and its libraries under a shared parent directory name:

```
apps/[domain]/          ← main Angular application
libs/[domain]/          ← the six supporting libraries
```

Examples: `media-workbench`, `real-estate`, `evolving-cognition`.

The `libs/[domain]/` side always contains the same six-library structure. The canonical example is `libs/media-workbench/` backed by `apps/media-workbench/app`.

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

| Library          | Nx project name           | Path alias                              | Component prefix | Nx tags                     |
| ---------------- | ------------------------- | --------------------------------------- | ---------------- | --------------------------- |
| `models`         | `[domain]-models`         | `@gigasoftware/[domain]/models`         | —                | `models`, `lib`             |
| `store`          | `[domain]-store`          | `@gigasoftware/[domain]-store`          | —                | `lib`                       |
| `themes`         | `[domain]-themes`         | — (SCSS only, no TS exports)            | —                | `[domain]`, `themes`, `lib` |
| `ui`             | `[domain]-ui`             | `@gigasoftware/[domain]/ui`             | `[prefix]`       | `lib`                       |
| `design-library` | `[domain]-design-library` | `@gigasoftware/[domain]/design-library` | `[prefix]`       | `[domain]`, `lib`           |
| `utils`          | `[domain]-utils`          | `@gigasoftware/[domain]/utils`          | —                | `lib`                       |

> **Note on `store` path alias:** The store uses a dash separator (`[domain]-store`) rather than a slash, matching the Nx project name convention. All other libs use the slash form (`[domain]/lib-type`).

---

## Library Purposes

### `models` — Models & Interfaces

Domain-specific types, interfaces, enums, and pure reusable functions. No Angular, no DI, no side effects.

- **What goes here:** data models (`*.model.ts`), DTOs, enums, type guards, domain-specific pure transformation functions
- **What does NOT go here:** services, components, state, anything with Angular DI
- **Depends on:** nothing (foundation — no internal workspace deps)

### `store` — Global NgRx State

**Global** NgRx state for the domain — actions, reducers, effects, and selectors that are shared across multiple features or the whole app.

- **What goes here:** `+[feature]/` directories (actions, reducer, effects, selectors, facade); query engine services for Firestore sync; state that is consumed by more than one feature
- **Store-internal shared concerns:** logic used by 2+ slices (but not a slice itself) lives in a named non-`+` folder under `src/lib/<concern>/` with its own `index.ts`, re-exported through the store barrel — e.g. `firestore-write/`, `firestore-timestamp/`. Extract here the moment a helper would otherwise be copied into a second slice.
- **What does NOT go here:** UI components; feature-local state (Signal Store for local/component state lives next to its component in `ui` or `design-library`)
- **Depends on:** `models`, shared `@gigasoftware/store`, `@gigasoftware/firebase`

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
- **Depends on:** `models`, `store`, `design-library`, `@gigasoftware/ui-design-library-deprecated`

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
- **Depends on:** `models` (for model types), `themes` (for CSS tokens), `@gigasoftware/ui-design-library-deprecated`

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
- The authoritative registry of shared libraries is **`tsconfig.base.json`** (`compilerOptions.paths`) — every shared lib is a `@gigasoftware/*` alias there. It is build-maintained, so it never goes stale; prefer it over any hand-kept inventory.

### Place by altitude (prefer the domain's own libs)

The direction is **self-contained domain apps** — each domain owns its full six-lib set, so new shared code defaults to the consuming domain rather than a cross-domain shared lib:

| What | Where |
| ---- | ----- |
| Pure models / types / enums / pure fns | `libs/<domain>/models` |
| Stateless utility fns | `libs/<domain>/utils` |
| Logic shared by 2+ store slices | `libs/<domain>/store/src/lib/<concern>/` (e.g. `firestore-write`, `firestore-timestamp`) |
| Presentational component / directive / pipe | `libs/<domain>/design-library` first — promote to `libs/shared/ui-design-library` only when shared across apps |
| Smart / container component | `libs/<domain>/ui` |
| Cross-domain infra (Firebase, RxJS, dates, charts, …) | the existing `@gigasoftware/*` shared lib — reuse, don't duplicate |

**Design-library components — build here first, share second.** A new presentational primitive (`<prefix>-*`) starts in the **consuming domain's own `libs/<domain>/design-library`**. Promote it to the cross-app **`libs/shared/ui-design-library`** (`dlc-*`) ONLY once a second application genuinely needs it — the domain lib is the default, shared is the exception. Both use the same Material-free, own-namespace `--<prefix>-*` token architecture (see `libs/shared/ui-design-library/COMPONENT-ARCHITECTURE-BEST-PRACTICES.md`).

### Deprecated shared libraries — do not add to or reuse for new code

These cross-domain libs are being **phased out**. Don't treat them as the home for new shared code, and migrate off them when you touch a consumer:

- `@gigasoftware/ui-design-library-deprecated` (`libs/shared/ui-design-library-deprecated`) — **superseded by the shared successor `@gigasoftware/ui-design-library` (`libs/shared/ui-design-library`)**, the go-forward home for cross-app `dlc-*` primitives.
- `@gigasoftware/material` (`libs/shared/material`) — being phased out as domains become self-contained; its reusable parts are reimplemented in each domain's own `design-library` / `themes` (no shared successor).

> All other `@gigasoftware/*` aliases in `tsconfig.base.json` remain valid shared infrastructure — reuse them rather than duplicating. Two are in transition but still supported:
> - `@gigasoftware/api` (`libs/shared/api`) — being trimmed of deprecated-app code as those apps are removed, but the library is kept. Reuse is fine.
> - `@gigasoftware/store` (`libs/shared/store`) — no longer the primary store, but domains may depend on it (e.g. `QueryEngineCache` is consumed by every domain store). Build on it as shared infra; just put NEW domain state slices in `libs/<domain>/store`, not here.

> **Worked example (REX-443).** `toIsoTimestamp` had been copied into three concierge store slices. The fix extracted a single helper into `libs/concierge/store/src/lib/firestore-timestamp/` (domain-owned, store-internal concern folder), reusing the existing per-slice pattern (REX-397). The shared `convertToUnixTimestamp` in `@gigasoftware/api` was NOT reusable here anyway — it returns epoch-ms `number` (wrong type for these ISO-`string` fields) and ignores live `Timestamp` instances / already-ISO strings — but the deciding factor was the **"prefer the domain's own libs"** altitude rule: keep domain-specific logic in the domain, not in a cross-domain shared lib.

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

Applications depend on all six. Libraries never depend upward in this list. The `store` must never import from `ui` or `design-library`.

---

## Naming Conventions

| Concept            | Pattern                             | Example (`media-workbench`)                    |
| ------------------ | ----------------------------------- | ---------------------------------------------- |
| Directory          | `libs/[domain]/[lib-type]/`         | `libs/media-workbench/design-library/`         |
| Nx project name    | `[domain]-[lib-type]`               | `media-workbench-design-library`               |
| Path alias (most)  | `@gigasoftware/[domain]/[lib-type]` | `@gigasoftware/media-workbench/design-library` |
| Path alias (store) | `@gigasoftware/[domain]-store`      | `@gigasoftware/media-workbench-store`          |
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
  --tags="[domain],app"
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

**Post-generation — `src/styles.scss`:** import Tailwind between the theme `@use` and the theme mixin call:

```scss
@use '[prefix]-themes';
@import 'tailwindcss';

@include [prefix]-themes.[prefix]-theme-mixin();
```

> See the themes section below for the full `[prefix]-themes` setup. The `@import 'tailwindcss'` line must sit between the `@use` and the mixin call — this matches the pattern in `apps/media-workbench/app/src/styles.scss`.

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

### `models` — `@nx/js:library`

Pure TypeScript — no Angular, no Zone.js, CommonJS module system.

```bash
npx nx generate @nx/js:library libs/[domain]/models \
  --name=[domain]-models \
  --tags="models,lib"
```

### `store` — `@nx/angular:library`

Angular library. Uses `jest-preset-angular` with **zoneless** test setup.

```bash
npx nx generate @nx/angular:library libs/[domain]/store \
  --name=[domain]-store \
  --prefix=[prefix] \
  --tags="lib"
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
  --tags="[domain],themes,lib"
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
@import 'tailwindcss';

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
  --tags="lib"
```

**Post-generation:** replace `src/test-setup.ts` with the zoneless setup (same as `store` above).

### `design-library` — `@nx/angular:library`

Reusable presentational components, directives, pipes. Uses `jest-preset-angular` with **zoneless** test setup.

```bash
npx nx generate @nx/angular:library libs/[domain]/design-library \
  --name=[domain]-design-library \
  --prefix=[prefix] \
  --tags="[domain],lib"
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

The `@use` directive must appear before `@import 'tailwindcss'`. The `@include` call must follow it, alongside the other theme mixin calls.

> See `apps/storybook-app/` as the canonical reference — it already wires `mw-themes` using this exact pattern.

---

### `utils` — `@nx/angular:library`

Pure utility functions. Uses `@nx/angular:library` (not `@nx/js:library`) so it shares the same Angular module resolution and test setup as the rest of the domain. Uses `jest-preset-angular` with **zoneless** test setup.

```bash
npx nx generate @nx/angular:library libs/[domain]/utils \
  --name=[domain]-utils \
  --prefix=[prefix] \
  --tags="lib"
```

**Post-generation:** replace `src/test-setup.ts` with the zoneless setup (same as `store` above).

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

Use a unique port for each domain app (media-workbench uses `4201`, real-estate uses `4200`).

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

**Global component generator defaults (`nx.json`):** the workspace pre-configures `@nx/angular:component` globally with `OnPush`, `ViewEncapsulation.None`, SCSS, and `displayBlock`. These apply automatically to all generated components — no per-domain setup needed. The `design-library` `generators` block supplements this with `inlineStyle: false` and `inlineTemplate: false` to enforce separate files.

**No module boundary enforcement:** the root `eslint.config.js` does not include `@nx/enforce-module-boundaries`. The dependency hierarchy documented in this file is convention only — it is not enforced by tooling. Adhere to the dependency order manually.

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
"@gigasoftware/[domain]/models":         ["libs/[domain]/models/src/index.ts"],
"@gigasoftware/[domain]-store":          ["libs/[domain]/store/src/index.ts"],
"@gigasoftware/[domain]/ui":             ["libs/[domain]/ui/src/index.ts"],
"@gigasoftware/[domain]/design-library": ["libs/[domain]/design-library/src/index.ts"],
"@gigasoftware/[domain]/utils":          ["libs/[domain]/utils/src/index.ts"]
```

> Note: `store` uses a dash separator (`[domain]-store`) not a slash — this matches the Nx project name and keeps it consistent with `real-estate-store`, `evolving-cognition-store`, and `media-workbench-store`.

> Note: `themes` has no TypeScript exports and is not registered here — it is consumed via SCSS `includePaths` in the app's build config, not via a TypeScript import.

---

## AGENTS.md

Each library must have an `AGENTS.md` at its root describing its purpose, commands, guidelines, and review checklist. Use the existing media-workbench libs as the template:

- `libs/media-workbench/store/AGENTS.md`
- `libs/media-workbench/ui/AGENTS.md`
- `libs/media-workbench/utils/AGENTS.md`
- `libs/real-estate/api/AGENTS.md`
