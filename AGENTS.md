# Repository Guide for Codex

Single Nx workspace — Angular 22.0.7, NgRx 21.1.1, Nx 23.1.0, TypeScript 6.0.3, Tailwind CSS 4.3.3, Storybook 10.5.2, npm. Import namespace `@nge/*`. No backend, no mobile, **no Angular Material**.

## Precedence Chain

1. `docs/ai/CONSTRAINTS.md` — authoritative invariants (wins all conflicts)
2. Root `CLAUDE.md` — coding standards, discovery map, mirrored-vs-owned map, key reminders
3. `docs/ai/*.{md,json}` — constraints, anti-patterns
4. `docs/reference/*.md` and `docs/ai-instructions/**` — detailed guides
5. `libs/**/AGENTS.md` — library-specific contributor notes (auto-injected on write by `.claude/hooks/inject-standards.sh`)

## Project Structure

- `apps/` — `ledger` (the Ledger demo app, project `ledger-app`, prefix `ldg`) and `storybook-app` (the Storybook host, prefix `sb`)
- `libs/shared/` — `ui-design-library` (`dlc-*`), `charts`, `table`, `table-addon-conformance`, `calendar`, `themes`, `date`, `rxjs`, `storybook`
- `libs/ledger/` — the worked domain library-set: `models`, `store`, `ui`, `design-library`, `utils`, `mocks`, `themes`
- `docs/` — AI-consumed documentation
- `landing/` — the static hub page published alongside the demo and Storybook
- `scripts/` — `madge/` dependency-cycle checks and `clone-open-source.sh`
- Path aliases for every library live in `tsconfig.base.json` `paths` — that registry is the source of truth for what exists

## Mirrored vs ngx-Owned

`docs/ai/`, `docs/ai-instructions/`, most of `docs/reference/`, `docs/architecture/`, and most of `.claude/skills/` are a **one-directional mirror** from the sibling `arch` repo (`/Users/gigasoftware_developer/Dev/DEV_ARCH/arch`). Editing a mirrored file here is wasted work — the next sync reverts it; change it in `arch` instead.

ngx owns and you may edit: `docs/reference/commands.md`, `docs/demos/`, every `libs/**/AGENTS.md`, `README.md`, `CLAUDE.md`, this file, `.claude/commands/`, `.claude/hooks/`, and the adapted skills listed in `CLAUDE.md` § Mirrored vs ngx-Owned (`epic-*`, the storybook generators, `ui-storybook`, both `ngrx-*`).

## Build & Test

- Test: `npx nx run <project>:test` — all: `npx nx run-many -t test`
- Lint: `npx nx run <project>:lint` — all: `npx nx run-many -t lint`
- Affected: `npx nx affected -t lint test`
- Build (only when asked): `npm run b.app.ledger` (Ledger app) · `npm run build-storybook` (Storybook static — also the cheapest full-surface check for design-library / charts / table work)
- Serve: `npm run s.app.ledger` (`:4203`) · `npm run storybook` (`:4400`)
- Dependency cycles: `npm run madge:check`
- There are **no npm lint/test scripts** — go through Nx directly

## Nx Validation Workflow

Before submitting changes:

1. `npx nx affected -t lint` — fix all lint errors
2. `npx nx affected -t test` — all tests must pass
3. `npm run build-storybook` when the change touches a shared library that has stories

## Coding Conventions

- TypeScript strict-mode idioms, Angular style guide, 2-space indent
- Naming: `kebab-case` files, `PascalCase` classes, `camelCase` variables
- Standalone components, `inject()`, signal `input()`/`output()`, `@if`/`@for`/`@switch`, zoneless change detection, separate `.ts`/`.html`/`.scss`/`.spec.ts` files
- Component internal reactive state belongs in a colocated component-scoped `@ngrx/signals` SignalStore provided at that component
- Shared libraries namespace everything they publish — `--nge-*` tokens, prefixed classes and selectors, zero bare custom properties
- Jest for tests, never Jasmine
- Conventional commits: `<type>(<scope>): <description>`, scope = the library, app, or area touched (`table`, `calendar`, `ledger`, `themes`, `storybook`, `docs`, `ci`)
- Keep PRs scoped to the projects they target

## Security

- Never commit secrets or credentials
- Defensive security only

<!-- nx configuration start-->
<!-- Leave the start & end comments to automatically receive updates. -->

## General Guidelines for working with Nx

- For navigating/exploring the workspace, invoke the `nx-workspace` skill first - it has patterns for querying projects, targets, and dependencies
- When running tasks (for example build, lint, test, e2e, etc.), always prefer running the task through `nx` (i.e. `nx run`, `nx run-many`, `nx affected`) instead of using the underlying tooling directly
- Prefix nx commands with the workspace's package manager (e.g., `npm exec nx test`) - avoids using globally installed CLI
- You have access to the Nx MCP server and its tools, use them to help the user
- For Nx plugin best practices, check `node_modules/@nx/<plugin>/PLUGIN.md`. Not all plugins have this file - proceed without it if unavailable.
- NEVER guess CLI flags - always check nx_docs or `--help` first when unsure

## Scaffolding & Generators

- For scaffolding tasks (creating apps, libs, project structure, setup), ALWAYS invoke the `nx-generate` skill FIRST before exploring or calling MCP tools

## When to use nx_docs

- USE for: advanced config options, unfamiliar flags, migration guides, plugin configuration, edge cases
- DON'T USE for: basic generator syntax (`nx g @nx/angular:lib`), standard commands, things you already know
- The `nx-generate` skill handles generator discovery internally - don't call nx_docs just to look up generator syntax

<!-- nx configuration end-->
