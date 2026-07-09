Set up a complete new domain architecture in the Gigasoftware monorepo — guides domain naming, orchestrates Nx generation, applies post-generation configuration, and validates the result.

> **Reference:** `docs/reference/domain-library-set.md` is the authoritative source of truth for this skill. Each agent is instructed to read its relevant section before acting.

---

## Phase 1: Domain Ideation

Ask the user:

> "Describe what this domain will build, solve, or present — its purpose, who uses it, what it does. I'll propose a domain name and prefix from your description."

From their response, propose:

- **Domain name** — kebab-case, concise, descriptive (e.g. `media-workbench`, `real-estate`)
- **Prefix** — 2–3 letter initials of the domain name (e.g. `mw`, `re`, `ec`)
- **Port** — next available port; check root `package.json` for existing `s.app.*` scripts to avoid conflicts (`real-estate` → `4200`, `media-workbench` → `4201`)

If the description is ambiguous, present 2–3 name options with reasoning. Do not proceed until the user confirms all three values.

Store confirmed values as `DOMAIN`, `PREFIX`, `PORT`, and `DOMAIN_TITLE` — substitute them literally into every agent prompt below before launching. `DOMAIN_TITLE` is the human-readable Title Case form of the domain name (e.g. `got-you` → `Got You`, `media-workbench` → `Media Workbench`, `real-estate` → `Real Estate`); Phase 4b uses it for the AGENTS.md headings.

---

## Phase 2: Stubs (background agent)

Launch immediately after confirmation — runs in parallel with Phase 3. Target directories are outside the Nx workspace graph; no conflict risk.

**Agent prompt:**

```
Working directory: /path/to/gigasoftware (set to the repo root)

1. Create .gitkeep placeholder files for these directories using mkdir -p and touch:
     apps/DOMAIN/backend/.gitkeep
     apps/DOMAIN/desktop/.gitkeep
     apps/DOMAIN/mobile/.gitkeep
     libs/DOMAIN/docs/.gitkeep
   (libs/DOMAIN/docs is the per-domain home for notes / md files — the kind of
   content that previously lived in the root docs-projects directory. It is
   markdown only, is NOT an Nx project, and — unlike the app stubs above — needs
   NO .nxignore or eslint-exclude entry, so do NOT add it in steps 2 and 3.)

2. Add these two lines to .nxignore (after the other apps/* per-domain entries):
     apps/DOMAIN/backend
     apps/DOMAIN/desktop
   Note: apps/**/mobile is already covered by an existing wildcard in .nxignore.

3. In nx.json, find the "exclude" array inside the @nx/eslint/plugin entry and add:
     "apps/DOMAIN/backend/**/*",
     "apps/DOMAIN/desktop/**/*",
     "apps/DOMAIN/mobile/**/*",
   Insert them alongside the other apps/* per-domain entries (before "backend/**/*").
```

---

## Phase 3: Sequential Nx Generation (orchestrator)

Read `docs/reference/domain-library-set.md` — "Creating a New Domain Library Set" — before running any commands.

Run each generator directly using Bash. Verify the expected file exists after each command before proceeding. If any generator fails, stop and report the error to the user — do not continue.

### 1. App

```bash
npx nx generate @nx/angular:application apps/DOMAIN/app \
  --name=DOMAIN-app \
  --prefix=PREFIX \
  --routing=true \
  --e2eTestRunner=none \
  --tags="DOMAIN,app"
```

Verify: `apps/DOMAIN/app/src/main.ts` exists.

### 2. `models`

```bash
npx nx generate @nx/js:library libs/DOMAIN/models \
  --name=DOMAIN-models \
  --tags="models,lib"
```

Verify: `libs/DOMAIN/models/src/index.ts` exists.

### 3. `store`

```bash
npx nx generate @nx/angular:library libs/DOMAIN/store \
  --name=DOMAIN-store \
  --prefix=PREFIX \
  --tags="store,lib"
```

Verify: `libs/DOMAIN/store/src/index.ts` exists.

### 4. `themes`

```bash
npx nx generate @nx/angular:library libs/DOMAIN/themes \
  --name=DOMAIN-themes \
  --prefix=PREFIX \
  --unitTestRunner=none \
  --tags="DOMAIN,themes,lib"
```

Verify: `libs/DOMAIN/themes/project.json` exists.

### 5. `ui`

```bash
npx nx generate @nx/angular:library libs/DOMAIN/ui \
  --name=DOMAIN-ui \
  --prefix=PREFIX \
  --tags="ui,lib"
```

Verify: `libs/DOMAIN/ui/src/index.ts` exists.

### 6. `design-library`

```bash
npx nx generate @nx/angular:library libs/DOMAIN/design-library \
  --name=DOMAIN-design-library \
  --prefix=PREFIX \
  --tags="DOMAIN,design,lib"
```

Verify: `libs/DOMAIN/design-library/src/index.ts` exists.

### 7. `utils`

```bash
npx nx generate @nx/angular:library libs/DOMAIN/utils \
  --name=DOMAIN-utils \
  --prefix=PREFIX \
  --tags="utils,lib"
```

Verify: `libs/DOMAIN/utils/src/index.ts` exists.

### 8. `mocks`

```bash
npx nx generate @nx/js:library libs/DOMAIN/mocks \
  --name=DOMAIN-mocks \
  --tags="mocks,lib"
```

Verify: `libs/DOMAIN/mocks/src/index.ts` exists.

> Like `models`, `mocks` is a `@nx/js:library` — seed-data / spec fixtures with **zero framework deps** (no Angular, no NgRx; type-only imports from `DOMAIN-models`). Worker Agent 3 adds its explicit lint target (the generator does not create one).

---

## Phase 4: Post-Generation — Worker Agents (parallel)

Launch all three worker agents simultaneously. Each agent receives the confirmed domain params and must read its specified doc section before making any changes.

> **Note:** The Nx CLI automatically adds tsconfig.base.json path aliases and (when `--prefix` is provided) ESLint selector prefixes. Worker agents below handle only what the CLI does not.

---

### Worker Agent 1 — App

**Agent prompt:**

```
You are configuring the Angular app post-generation for a new Nx domain.

Domain: DOMAIN | Prefix: PREFIX | Port: PORT

FIRST — read these sections of docs/reference/domain-library-set.md before touching any files:
- "App" under "Creating a New Domain Library Set"
- "Post-Generation — src/styles.scss"
- "Post-Generation — app.config.ts"
- "Post-Generation — index.html"
- "Post-Generation — package.json scripts"
- "Workspace Notes" (Custom components + GSAP note)

Use apps/media-workbench/app/ as the canonical reference.

Complete these tasks:

1. Create apps/DOMAIN/app/tailwind.config.js per the doc template using
   createGlobPatternsForDependencies from @nx/angular/tailwind.

2. Replace apps/DOMAIN/app/src/styles.scss with:
   @use 'PREFIX-themes';
   @import 'tailwindcss';
   @include PREFIX-themes.PREFIX-theme-mixin();

3. Replace apps/DOMAIN/app/src/index.html with the full template:
   - <html lang="en" class="PREFIX-dark">
   - Inline <style>body { background-color: #000; }</style> (flash prevention placeholder)
   - Google Fonts preconnect links (placeholders)
   - Material Symbols Outlined icon font link
   - <meta name="theme-color" content="#000"> (placeholder)
   - <PREFIX-root></PREFIX-root> in body

4. Update apps/DOMAIN/app/src/app/app.config.ts to use
   provideZonelessChangeDetection() — remove any Zone.js providers.

5. Add to the root package.json scripts:
   "s.app.DOMAIN": "npx nx run DOMAIN-app:serve:local-dev --skip-nx-cache --port PORT",
   "b.app.DOMAIN": "npx nx run DOMAIN-app:build --configuration=production --skip-nx-cache"
```

---

### Worker Agent 2 — Themes

**Agent prompt:**

```
You are scaffolding the SCSS theme library for a new Nx domain.

Domain: DOMAIN | Prefix: PREFIX

FIRST — read these before touching any files:
- The full "themes" generator section of docs/reference/domain-library-set.md
  including the SCSS structure, mixin pattern, and stylePreprocessorOptions wiring
- docs/ai-instructions/standards/lib-types/themes.md — the themes-library standard
  (documents the --<prefix>-* token-system structure this worker scaffolds)
- Examine all files under libs/media-workbench/themes/src/lib/styles/ as the
  canonical SCSS structural example (a simple dark/light setup — note concierge's
  own themes use a more elaborate multi-persona structure not needed for a fresh domain)

Complete these tasks:

1. Create the SCSS file structure under libs/DOMAIN/themes/src/lib/styles/:

   PREFIX-themes.scss       ← entry point: @use all partials, exposes PREFIX-theme-mixin()
   _PREFIX-tokens.scss      ← documents all --PREFIX-* variable names (no values, comments only)
   _PREFIX-base.scss        ← reset, body styles, global layout — wrapped in PREFIX-base() mixin
   PREFIX/
     _PREFIX-dark.scss      ← dark theme: all --PREFIX-* tokens under html.PREFIX-dark,
                               wrapped in PREFIX-dark-theme() mixin
     _PREFIX-light.scss     ← light theme placeholder wrapped in PREFIX-light-theme() mixin

   Each partial MUST wrap all rules in a mixin. Nothing emits CSS at @use time —
   only when the mixin is called from PREFIX-themes.scss.

2. Delete the generated stub component and barrel — themes is style-only, no TS exports:
   rm -rf libs/DOMAIN/themes/src/lib/DOMAIN-themes/
   rm libs/DOMAIN/themes/src/index.ts

3. Add stylePreprocessorOptions to the top-level options block (NOT inside any
   configuration) of the build target in apps/DOMAIN/app/project.json:
   "stylePreprocessorOptions": {
     "includePaths": ["libs/DOMAIN/themes/src/lib/styles"]
   }

4. While in apps/DOMAIN/app/project.json, add a "local-dev" configuration to BOTH
   the build and serve targets. The @nx/angular:application generator only creates
   "production" and "development", but Worker Agent 1's "s.app.DOMAIN" script runs
   serve:local-dev and will fail without this. Mirror the cognition app — no
   environment files or fileReplacements are needed:
     build  → configurations.local-dev: { "optimization": false, "extractLicenses": false, "sourceMap": true }
     serve  → configurations.local-dev: { "buildTarget": "DOMAIN-app:build:local-dev" }
```

---

### Worker Agent 3 — Libs (store, ui, design-library, utils)

**Agent prompt:**

```
You are applying post-generation corrections to the new domain's libraries — the four Angular libs (store, ui, design-library, utils) plus the models and mocks JS libraries.

Domain: DOMAIN | Prefix: PREFIX

FIRST — read these sections of docs/reference/domain-library-set.md before touching any files:
- "Post-Generation Corrections"
- Individual sections for store, ui, design-library, and utils under
  "Creating a New Domain Library Set"

Complete these corrections:

FOR ALL FOUR LIBS (store, ui, design-library, utils):

1. Replace libs/DOMAIN/[lib]/src/test-setup.ts with:
   import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';
   setupZonelessTestEnv({ errorOnUnknownElements: true, errorOnUnknownProperties: true });

2. In libs/DOMAIN/[lib]/eslint.config.mjs, verify both selector rules use
   prefix: 'PREFIX'. The generator may have defaulted to 'lib' — correct it if so:
   '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'PREFIX', style: 'camelCase' }],
   '@angular-eslint/component-selector': ['error', { type: 'element', prefix: 'PREFIX', style: 'kebab-case' }],

FOR DESIGN-LIBRARY ONLY:

3. Add a generators block to libs/DOMAIN/design-library/project.json:
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

FOR MODELS AND MOCKS (libs/DOMAIN/models + libs/DOMAIN/mocks — generated by @nx/js:library, not Angular libs):

4. Add an explicit lint target to BOTH libs/DOMAIN/models/project.json AND
   libs/DOMAIN/mocks/project.json under "targets".
   @nx/js:library does not create one, so `nx lint DOMAIN-models` / `nx lint DOMAIN-mocks`
   fall back to broken inference (runs `eslint . --shell=...` and fails). Mirror cognition-models:
   "lint": {
     "executor": "@nx/eslint:lint"
   }
```

---

### Worker Agent 4 — Storybook Registration

> **What Storybook registers:** Every domain registers its `libs/[domain]/design-library` — that is the standard. `libs/[domain]/ui` is NOT registered by default (it may be added manually later if smart components have stories worth showing). `apps/[domain]/app` is never registered in Storybook.

**Agent prompt:**

```
You are registering a new domain's design-library with the workspace Storybook app.

Domain: DOMAIN | Prefix: PREFIX

FIRST — read these before touching any files:
- The "Storybook Registration — design-library" section of
  docs/reference/domain-library-set.md
- apps/storybook-app/.storybook/main.ts (existing stories pattern)
- apps/storybook-app/project.json (existing stylePreprocessorOptions block)
- apps/storybook-app/src/styles.scss (existing @use/@include pattern)

Complete these tasks:

1. In apps/storybook-app/.storybook/main.ts, add to the stories array:
   '../../../libs/DOMAIN/design-library/src/**/*.@(mdx|stories.@(js|jsx|ts|tsx))'

2. In apps/storybook-app/project.json, add to the stylePreprocessorOptions.includePaths
   array in the build target's top-level options block (not inside any named configuration):
   "libs/DOMAIN/themes/src/lib/styles"

3. In apps/storybook-app/src/styles.scss:
   - Add @use 'PREFIX-themes'; alongside the existing @use directives, before @import 'tailwindcss'
   - Add @include PREFIX-themes.PREFIX-theme-mixin(); alongside the existing @include calls, after @import 'tailwindcss'

4. In apps/storybook-app/.storybook/tsconfig.json:
   - Add to the "include" array (following the same pattern as existing entries):
     "../../../libs/DOMAIN/design-library/src/**/*.stories.ts",
     "../../../libs/DOMAIN/design-library/src/**/*.component.ts"
   - Add to the "exclude" array:
     "../../../libs/DOMAIN/design-library/src/**/*.spec.ts"

   The stories glob in main.ts controls Storybook discovery; the tsconfig entries
   are required separately for TypeScript compilation — both are needed or the build fails.
```

---

## Phase 4 QA — QA Agents (parallel, after all workers complete)

Launch all three QA agents simultaneously after all worker agents have completed. Each QA agent re-reads the relevant doc section independently and verifies the worker's output with fresh eyes.

**QA agent rules:**

- Fix minor issues directly (wrong prefix string, missing JSON property, incorrect import path, misplaced block)
- Report structural issues to the orchestrator without guessing at a fix — stop and explain what is wrong and where

---

### QA Agent 1 — App QA

**Agent prompt:**

```
You are a QA agent verifying the Angular app post-generation setup.

Domain: DOMAIN | Prefix: PREFIX | Port: PORT

FIRST — re-read docs/reference/domain-library-set.md App post-generation sections
independently. Do not assume the worker was correct.

Read and verify each file against the doc:
- apps/DOMAIN/app/tailwind.config.js
- apps/DOMAIN/app/src/styles.scss
- apps/DOMAIN/app/src/index.html
- apps/DOMAIN/app/src/app/app.config.ts
- Root package.json (s.app.DOMAIN and b.app.DOMAIN entries)

Check specifically:
- tailwind.config.js uses createGlobPatternsForDependencies
- styles.scss: @use before @import tailwindcss, mixin call last
- index.html: PREFIX-dark class on <html>, inline body style present,
  Material Symbols font loaded, PREFIX-root in body
- app.config.ts: provideZonelessChangeDetection() present, no Zone.js providers
- package.json: correct port PORT, correct nx project name DOMAIN-app

Fix minor issues. Report structural issues without fixing.
```

---

### QA Agent 2 — Themes QA

**Agent prompt:**

```
You are a QA agent verifying the themes library setup.

Domain: DOMAIN | Prefix: PREFIX

FIRST — re-read the themes section of docs/reference/domain-library-set.md and
docs/ai-instructions/standards/lib-types/themes.md (the themes-library standard)
independently.

Read and verify:
- All files under libs/DOMAIN/themes/src/lib/styles/
- apps/DOMAIN/app/project.json (stylePreprocessorOptions)

Check specifically:
- PREFIX-themes.scss @uses all partials and exposes PREFIX-theme-mixin()
- Each partial wraps rules in a mixin — no top-level CSS rules
- Dark theme defines --PREFIX-* tokens under html.PREFIX-dark {}
- stylePreprocessorOptions is in the top-level options block of the build target,
  NOT nested inside a named configuration
- includePaths points to libs/DOMAIN/themes/src/lib/styles
- apps/DOMAIN/app/project.json has a "local-dev" configuration on BOTH the build
  and serve targets (serve's buildTarget = DOMAIN-app:build:local-dev) — the
  s.app.DOMAIN script depends on it

Fix minor issues. Report structural issues without fixing.
```

---

### QA Agent 3 — Libs QA

**Agent prompt:**

```
You are a QA agent verifying post-generation corrections for four Angular libraries.

Domain: DOMAIN | Prefix: PREFIX

FIRST — re-read the "Post-Generation Corrections" section of
docs/reference/domain-library-set.md independently.

Read and verify for each of store, ui, design-library, utils:
- libs/DOMAIN/[lib]/src/test-setup.ts
  Must import from jest-preset-angular/setup-env/zoneless (not /zone)
  Must call setupZonelessTestEnv (not setupZoneTestEnv)
- libs/DOMAIN/[lib]/eslint.config.mjs
  Both selector rules must have prefix: 'PREFIX' (not 'lib' or anything else)

Read and verify for design-library only:
- libs/DOMAIN/design-library/project.json
  Must contain a generators block with @nx/angular:component defaults

Fix minor issues. Report structural issues without fixing.
```

---

## Phase 4b: AGENTS.md (thin pointers, after QA completes)

Each library's AGENTS.md is a **thin pointer** to its per-library-TYPE standard at `docs/ai-instructions/standards/lib-types/<type>.md` — the single source of truth, auto-injected on write by the standards hook (`.claude/hooks/inject-standards.sh`) and shared by every library of that type (across domains and the type-named shared libs). The generated file carries ONLY genuine domain-specific deltas (a concrete primitive inventory, a domain rule), added later as the domain develops — never a copy of the type standard.

> **State-layer split (encoded in the `store` + `ui` type standards).** Two layers, kept separate:
>
> - **Global** domain / Firestore / realtime data → a classic `@ngrx/store` slice in `{{DOMAIN}}-store` (one `+<slice>/` directory per slice), exposed via a **`*.facade.ts`** that `{{DOMAIN}}-ui` and the app **inject** — never `Store` / selectors directly.
> - **Local UI / interaction state** → a component-scoped `@ngrx/signals` **signalStore** colocated with the component (`providers: [Store]`, never `providedIn: 'root'`).
>
> Canonical **state-pattern** references (the live shapes a new domain should mirror): `libs/got-you/store/` and `libs/concierge/store/`, both full of real `+<slice>/…facade.ts` implementations. Scaffold with the `ngrx-global-store` (global slice + facade) and `ngrx-component-state` (component state — signalStore and/or facade wiring) skills. The binding rules live in `docs/ai-instructions/standards/lib-types/store.md` + `ui.md` (auto-injected on write) and `docs/ai/CONSTRAINTS.md`.

This is **NOT an agent task** — run it directly with Bash:

```bash
# >>> Set these two to the confirmed Phase 1 values, then run the rest verbatim.
DOMAIN_TITLE="<Title Case name — e.g. Got You>"
DOMAIN="<kebab-case domain — e.g. got-you>"

for lib in models store themes ui design-library utils mocks; do
  case "$lib" in
    models) disp="Models";; store) disp="Store";; themes) disp="Themes";;
    ui) disp="UI";; design-library) disp="Design Library";;
    utils) disp="Utils";; mocks) disp="Mocks";;
  esac
  cat > "libs/$DOMAIN/$lib/AGENTS.md" <<EOF
# $DOMAIN_TITLE $disp — Contributor Notes

> **Type standard** (auto-injected on write): \`docs/ai-instructions/standards/lib-types/$lib.md\`
> **Workspace invariants**: \`docs/ai/CONSTRAINTS.md\`

Add only genuine $DOMAIN_TITLE-specific content below (concrete primitive inventory, domain rules) — never restate the type standard or CONSTRAINTS.
EOF
done

# Guard: every AGENTS.md points at its type standard.
grep -L "standards/lib-types/" "libs/$DOMAIN"/*/AGENTS.md && echo "MISSING POINTER — investigate" || echo "OK: all AGENTS.md point at their type standard"
```

The guard must print `OK: all AGENTS.md point at their type standard`.

> **Maintaining the standards:** each per-library-TYPE standard lives ONCE at `docs/ai-instructions/standards/lib-types/<type>.md`. When a workspace-wide per-type convention changes, edit that one file — every library's AGENTS.md points at it and the hook injects it on write, so nothing needs regenerating. The canonical living reference for domain-specific *deltas* is `libs/concierge/*/AGENTS.md`.

---

## Phase 5: Validation Agent

**Agent prompt:**

```
Run validation for the new domain DOMAIN. Execute the following commands in
sequence using Bash. Stop on the first failure and report the error with file
path and line number where available.

1. Reset the Nx graph FIRST. The concurrent Phase 2/3 edits (nx.json + .nxignore
   while generators run) can leave the daemon's project graph stale — symptoms are
   a spurious "Could not find project DOMAIN-utils" and a build that "Can't find
   stylesheet to import: @use 'PREFIX-themes'". A reset clears it:
   npx nx reset

2. Lint all domain projects WITH --fix. The Nx generators emit stub code that
   violates the workspace's strict eslint rules (perfectionist/sort-imports,
   perfectionist/sort-objects, @typescript-eslint/consistent-type-imports); --fix
   resolves all of them. Any remaining OnPush / self-closing-tag warnings are
   non-failing.
   npx nx run-many --target=lint --fix \
     --projects=DOMAIN-models,DOMAIN-mocks,DOMAIN-store,DOMAIN-themes,DOMAIN-ui,DOMAIN-design-library,DOMAIN-utils,DOMAIN-app

3. Test all domain projects (themes excluded — no tests):
   npx nx run-many --target=test \
     --projects=DOMAIN-models,DOMAIN-mocks,DOMAIN-store,DOMAIN-ui,DOMAIN-design-library,DOMAIN-utils,DOMAIN-app

4. Build the app:
   npx nx run DOMAIN-app:build

Report each project as ✅ pass or ❌ fail. On failure, include the error output,
file, and line number. If all pass, confirm the domain is ready for feature development.
```

---

## Final Report

Once Phase 5 completes, report to the user:

```
Domain `DOMAIN` is ready.

Structure:
  apps/DOMAIN/app/
  apps/DOMAIN/backend/   (stub, Nx-ignored)
  apps/DOMAIN/desktop/   (stub, Nx-ignored)
  apps/DOMAIN/mobile/    (stub, Nx-ignored)
  libs/DOMAIN/{models,mocks,store,themes,ui,design-library,utils}/
  libs/DOMAIN/docs/      (project notes / md — replaces root docs-projects)

Path aliases registered in tsconfig.base.json ✅
Scripts: s.app.DOMAIN (port PORT) · b.app.DOMAIN ✅
Lint ✅ · Tests ✅ · Build ✅

Next steps:
- Add domain font and real color values to libs/DOMAIN/themes/
- Update the placeholder hex values in apps/DOMAIN/app/src/index.html
```

If validation failed, list what needs manual attention before the domain is usable.
