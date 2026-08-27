# CLAUDE.md

Single Nx workspace — Angular 22.0.7, Angular CDK 22.0.5, NgRx 21.1.1 (`@ngrx/store` + `@ngrx/signals`), RxJS 7.8.2, TypeScript 6.0.3, Nx 23.1.0, Tailwind CSS 4.3.3, Storybook 10.5.2. Package manager: npm. Import namespace: `@nge/*`. No backend, no mobile, **no Angular Material** — `@angular/material` is not installed and must never be added.

## Mirrored vs ngx-Owned — read before editing any doc or skill

Most of `docs/` and `.claude/skills/` is a **one-directional curated mirror** pushed in from the sibling `arch` repo (`/Users/gigasoftware_developer/Dev/DEV_ARCH/arch`) by two skills that live there: `sync-docs-to-ngx` and `sync-skills-to-ngx`. **A local edit to a mirrored path is silently reverted on the next sync.** Fix it in `arch`, then resync.

**Mirrored — do NOT edit here:**

- `docs/ai/CONSTRAINTS.md`, `docs/ai/ANTI-PATTERNS.json`
- `docs/reference/`: `angular-conventions.md`, `styling-conventions.md`, `testing-strategy.md`, `domain-library-set.md`, `important-notes.md`, `ngrx/`
- `docs/architecture/charts.md`, `docs/architecture/table.md`
- `docs/ai-instructions/`: `README.md`, `procedures/` (minus the sync skill's `PROC_EXCL` set — its index `procedures.md` is ngx-owned and lists only the procedures this repo has), `reference/`, `standards/`
- `.claude/skills/`: everything except the ngx-owned set below. A repo-specific skill copied in by hand is deleted on the next sync (the sync's DROP list).

**ngx-owned — edit here:**

- `docs/reference/commands.md` (dev servers, ports, build/lint/test invocations)
- `docs/reference/storybook.md` (this workspace's Storybook: the `apps/storybook-app` config, story globs, the Welcome page, commands, the Firebase Hosting workflow)
- `docs/demos/` (`ledger-build-plan.md`, `fieldwork-demo-prompt.md`, `personal-finance-demo-prompt.md`)
- every `libs/**/AGENTS.md` (authored per library, never rsync'd), `README.md`, and this file
- `.claude/commands/` (`ci`, `explain`, `setup`, `update`) and `.claude/hooks/inject-standards.sh`
- `.claude/skills/`: `epic-config`, `epic-cross-actor-test`, `epic-evolution-audit`, `epic-next`, `epic-pipeline`, `epic-plan`, `epic-story-complete`, `epic-triage`, `create-storybook`, `create-chart-storybook`, `create-table-storybook`, `ui-storybook`, `ngrx-global-store`, `ngrx-component-state` — adapted to this workspace's namespace, libraries and boards; improvements from `arch` are hand-ported, never rsync'd

⚠️ Mirrored docs are namespace-normalized (`giga` → `nge`) but still describe the source repo's shape in places — they can name apps and libraries that do not exist here. This file, `docs/reference/commands.md`, and `tsconfig.base.json` are the authority on what ngx actually contains.

## Coding Standards (Quick Reference)

- Separate files for every component: `.ts`, `.html`, `.scss`, `.spec.ts` — NEVER inline `template`/`styles`
- Angular control flow: `@if`, `@for`, `@switch` — NEVER `*ngIf`/`*ngFor`
- DI: `inject()` — NEVER constructor injection
- Signals: `input()` / `output()` — NEVER `@Input()` / `@Output()`
- Zoneless: `provideZonelessChangeDetection()` in app config; `setupZonelessTestEnv` in test setup — no Zone.js
- Component state: ALL internal reactive state (signals / computeds / effects / subscriptions + their orchestration) lives in a **component-scoped `@ngrx/signals` SignalStore** provided at the component (`providers: [Store]`, NEVER `providedIn: 'root'`) and **colocated** next to it — **no size or line-count threshold**; the class keeps only `input()`/`output()`, the injected store, and template glue. Exemptions are by kind, not size (design-library primitives keep intrinsic widget mechanics like CVA internals). For a system, children `inject()` it (don't prop-drill `input()`/`output()`). It **supplements, never replaces, the global `@ngrx/store`** domain store (global = app/domain data via facades; component store = local UI / interaction state). See Discovery Map → "Component-scoped SignalStore"
- Styling: Tailwind utility classes in HTML by default; SCSS with BEM only for complex layouts/animations when Tailwind is insufficient
- **No Angular Material, no exemption.** New components use own-namespace `--<prefix>-*` CSS-var tokens with literal defaults (proven in `libs/shared/calendar`: `var(--nge-calendar-surface, #ffffff)`), never `mat-*` / `--mat-sys-*`. `docs/ai/CONSTRAINTS.md` § Angular Material is mirrored and describes the source repo's legacy apps — ngx has none
- Namespacing: a shared library declares **zero** un-namespaced CSS custom properties, classes, or `ViewEncapsulation.None` selectors — `--nge-calendar-*`, `--nge-chart-*`, `--nge-table-*`, `dlc-*`
- Testing: Jest only — NEVER Jasmine
- Comments describe the code **as it stands**, never the edit that produced it. A comment is read by someone who has never seen the previous version, so a diff narrative is dead weight from the moment it is written and becomes wrong the moment the next change touches the file. NEVER write "no longer …", "this used to …", "changed from …", "previously …", "now also …", "was moved here", or "fixed by". Write the current behavior, its conditions, and the reason it is that way. **Where a past decision genuinely has to be recorded** — a rejected alternative, a bug a future change would reintroduce — put it in the library's `AGENTS.md` or `docs/`, which are written to be read chronologically; keep it out of the source.

> Authoritative invariants: `docs/ai/CONSTRAINTS.md`

## UI Design Library (`libs/shared/ui-design-library`)

- `ViewEncapsulation.None` + `host: { class: 'dlc-selector-name' }`
- SCSS: wrap in `.dlc-component-name { }`, NEVER `:host`
- CSS variables (`--dlc-component-name-*`) for overridable styles
- Full guide: `libs/shared/ui-design-library/COMPONENT-ARCHITECTURE-BEST-PRACTICES.md`

## App & Page Components

- Default encapsulation; `:host { }` wraps styles; `@media` outside `:host`
- `apps/<domain>/app/src/app/` is a thin shell (routes, config, theme); routed feature pages live in `libs/<domain>/ui`
- Page components are wrappers around the domain design-library's layout primitives — for ledger, `<ldg-header-bar>` + `<ldg-page-content>` (`libs/ledger/design-library`). The shared `dlc-*` library ships no layout shell
- Full guide: `docs/ai-instructions/reference/angular-app-component.instructions.md` (mirrored — its `<dlc-header-bar>` / `<dlc-mobile-page-content>` examples name components ngx does not have)

## Constraints & Anti-Patterns

- `docs/ai/CONSTRAINTS.md` — authoritative invariants + PR review checklist (wins all conflicts)
- `docs/ai/ANTI-PATTERNS.json` — regex-detectable violations with severities
- `docs/ai-instructions/` — role-organized AI docs; `standards/` fragments auto-inject on Write/Edit via `.claude/hooks/inject-standards.sh`, which also injects the matching `standards/lib-types/<type>.md` and the nearest `AGENTS.md` above the file (taxonomy: `docs/ai-instructions/README.md`)

## Shared Code — Search Before You Write

Before adding a util, helper, model, type, pipe, or component, check whether one already exists — silent duplication is the default failure mode.

- **Search first:** grep the codebase for the symbol/behavior, and scan the library registry in `tsconfig.base.json` — every library in the workspace is an `@nge/*` path alias there. That file is build-maintained, so it never goes stale; prefer it over any hand-kept list.
- **Placement (self-contained domains is the direction):** prefer the consuming domain's OWN libs over shared code.
  - Pure models / types / enums / pure fns → `libs/<domain>/models`
  - Stateless utility fns → `libs/<domain>/utils`
  - Logic shared by 2+ store slices → a concern folder under `libs/<domain>/store/src/lib/<concern>/`, exported via the store barrel
  - Presentational component/directive/pipe → `libs/<domain>/design-library` (promote to `libs/shared/ui-design-library` only when shared across apps); smart/container component → `libs/<domain>/ui`
- **Shared infrastructure — reuse, don't duplicate:** `@nge/ui-design-library`, `@nge/charts`, `@nge/table` (+ `/editors`, `/testing`), `@nge/table-addon-conformance`, `@nge/calendar`, `@nge/themes`, `@nge/date`, `@nge/rxjs`, `@nge/storybook`.
- Full guide: `docs/reference/domain-library-set.md` (§ Finding & Placing Shared Code)

## Essential Documentation (Always Loaded)

@docs/reference/commands.md
@docs/reference/important-notes.md

## Discovery Map

| Area                         | Path                                                                           |
| ---------------------------- | ------------------------------------------------------------------------------ |
| Constraints (authoritative)  | `docs/ai/CONSTRAINTS.md`                                                       |
| Anti-patterns                | `docs/ai/ANTI-PATTERNS.json`                                                   |
| Commands, ports, dev servers | `docs/reference/commands.md`                                                   |
| Angular conventions          | `docs/reference/angular-conventions.md`                                        |
| Styling                      | `docs/reference/styling-conventions.md`                                        |
| Domain library set           | `docs/reference/domain-library-set.md`                                         |
| Testing                      | `docs/reference/testing-strategy.md`                                           |
| Storybook                    | `docs/reference/storybook.md`                                                  |
| NgRx facades & selectors     | `docs/reference/ngrx/facades-and-selectors.md`                                 |
| NgRx signal store            | `docs/reference/ngrx/ngrx-signal-store.md`                                     |
| Component-scoped SignalStore | `docs/ai-instructions/reference/multi-component-signal-store.instructions.md`  |
| Charts library               | `docs/architecture/charts.md`                                                  |
| Scatter chart in an app      | `docs/ai-instructions/procedures/nge-chart-scatter.instructions.md`            |
| Table library                | `docs/architecture/table.md`                                                   |
| UIDL best practices          | `libs/shared/ui-design-library/COMPONENT-ARCHITECTURE-BEST-PRACTICES.md`       |
| AI instructions (taxonomy)   | `docs/ai-instructions/README.md`                                               |
| AI procedures (overview)     | `docs/ai-instructions/procedures/procedures.md`                                |
| Library-type standards       | `docs/ai-instructions/standards/lib-types/`                                    |
| Angular generator            | `docs/ai-instructions/procedures/angular-generator.instructions.md`            |
| App components               | `docs/ai-instructions/reference/angular-app-component.instructions.md`         |
| File renaming                | `docs/ai-instructions/procedures/angular-file-rename.instructions.md`          |
| Class member ordering        | `docs/ai-instructions/reference/angular-class-member-ordering.instructions.md` |
| Inject (DI)                  | `docs/ai-instructions/procedures/angular-inject.instructions.md`               |
| Signal inputs/outputs        | `docs/ai-instructions/procedures/angular-signals.instructions.md`              |
| Refactoring                  | `docs/ai-instructions/procedures/refactoring-procedures.md`                    |
| Accessibility selectors      | `docs/ai-instructions/reference/accessibility-selectors.instructions.md`       |
| Ledger demo build plan       | `docs/demos/ledger-build-plan.md`                                              |
| Dependency-cycle scripts     | `scripts/madge/README.md`                                                      |
| Repo overview & deploy       | `README.md`                                                                    |

## Key Reminders

- IMPORTANT: Always use the TodoWrite tool to plan and track tasks
- Nx: `npx nx run [project]:[target]` — NEVER `nx [target] [project]`
- Nx skills: invoke `nx-workspace` before exploring projects/targets/dependencies, and `nx-generate` before ANY scaffolding — they own the discovery and generator patterns. Reach for `nx_docs` only for unfamiliar flags, migration guides, plugin config, and edge cases — never to look up basic generator syntax, and never guess a flag instead
- NEVER install nx-console VSCode extension
- Build only when asked: Storybook `npm run build-storybook`, Ledger app `npm run b.app.ledger`
- Lint / test go through Nx directly — there are no npm scripts for them: `npx nx run <project>:lint` · `npx nx affected -t lint test`
- Dependency cycles: `npm run madge:check` (quick) · `npm run madge:analyze` · `npm run madge:source`
- Package updates: run the `/update` command (it drives `npx nx migrate` where migrations exist)
- Fresh clone: `/setup`; guided tour: `/explain`; clean reinstall: `/ci`; new domain library-set + app: `/new-domain`
- Framework source references (`../open-source` clones, version-pinned): `npm run oss.sync`

## Running an app or Storybook

`docs/reference/commands.md` § Dev servers is the authority — it carries the launch command, port, and log file for each:

| App                         | Command                | Port   |
| --------------------------- | ---------------------- | ------ |
| Storybook (`storybook-app`) | `npm run storybook`    | `4400` |
| Ledger demo (`ledger-app`)  | `npm run s.app.ledger` | `4203` |

Redirect stdout to the log file (`<command> > <log> 2>&1 &`) and arm a compile-error monitor on it before driving the app in a browser — a TypeScript error in a file you just wrote otherwise masquerades as a propagation or data bug. Health-check with `curl -sS -o /dev/null -w "%{http_code}\n" http://localhost:<port>` → `200`. Storybook's log reports TypeScript source errors but is **silent on Angular template errors**, and a healthy build emits no success line, so silence is never proof of a green build.

⚠️ Never kill the port holder of a dev server the user is relying on.
