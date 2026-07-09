# ngx-experiments

> A standalone **Nx + Angular** reference workspace — a clean-room design system and experiments playground for **modern Angular** (standalone, signals, zero Angular Material), built under the `@nge` namespace.

![Angular](https://img.shields.io/badge/Angular-21-DD0031?logo=angular&logoColor=white)
![Nx](https://img.shields.io/badge/Nx-22-143055?logo=nx&logoColor=white)
![NgRx](https://img.shields.io/badge/NgRx-21-BA2BD2?logo=reactivex&logoColor=white)
![Storybook](https://img.shields.io/badge/Storybook-10-FF4785?logo=storybook&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)

## What it is

`ngx-experiments` is a self-contained Nx monorepo for building and showcasing modern Angular to a high standard — and a sandbox for porting shared libraries and trying ideas without the weight of a product. Everything lives under its own **`@nge`** import scope.

Its conventions — coding standards, generators, and a curated set of AI / Claude skills and docs — are **mirrored from a larger production monorepo** with every product/domain specific stripped out, so what you build matches battle-tested patterns while staying framework-pure.

**Principles**

- **Standalone + signals everywhere** — `input()` / `output()`, component-scoped `@ngrx/signals` stores, new control flow (`@if` / `@for`), OnPush, `ViewEncapsulation.None`.
- **No Angular Material** — components self-theme through their own `--<prefix>-*` CSS-variable tokens (with literal fallbacks), never `--mat-sys-*`.
- **Nx domain-library-set** — each domain is a consistent set of libs (`models` / `store` / `ui` / `design-library` / `utils` / `mocks` / `themes`), each with its own short prefix.

## What's inside

| Library | Import | Description |
| --- | --- | --- |
| **ui-design-library** | `@nge/ui-design-library` | **50 `dlc-` presentational components** — button, input, select, chip, dialog, drawer, data-table, tooltip, stepper, cards, filters… |
| **themes** | `@nge/themes` | **3 personas** (Professional / Home / Service Provider) × light & dark, as `--dlc-*` CSS-variable tokens |
| **calendar** | `@nge/calendar` | Calendar, date-picker, time-picker, and views |
| **charts** | `@nge/charts` | d3-based chart primitives |
| **date** · **rxjs** · **storybook** | `@nge/*` | Temporal utilities, RxJS helpers, Storybook support |

- **`apps/storybook-app`** — a Storybook host that serves every component + chart + calendar story, with a **persona theme switcher** in the toolbar.
- **1,100+ passing Jest tests**, lint-clean across the workspace.

## Quick start

```bash
git clone git@github.com:jerryorta-dev/ngx-experiments.git
cd ngx-experiments
```

**With [Claude Code](https://claude.com/claude-code):** run **`/setup`** — it installs dependencies, clones the framework source references, verifies the build, and hands off to `/explain` for a guided tour.

**Manually:**

```bash
npm ci --legacy-peer-deps          # --legacy-peer-deps is the workspace default (see .npmrc)
./scripts/clone-open-source.sh     # optional: shallow framework SOURCE clones into ../open-source
```

Then run Storybook:

```bash
npx nx run storybook-app:storybook   # → http://localhost:4400
```

## Working in the repo

Verify — there are no `npm run lint/test/build` scripts; use Nx:

```bash
npx nx run-many --target=lint,test --all
npx nx run storybook-app:build-storybook
```

Claude Code commands (`.claude/commands/`):

| Command | What it does |
| --- | --- |
| `/setup` | First run — install deps + clone framework refs + verify, then hand off to `/explain` |
| `/explain` | Tour the repo's philosophy, organization, and how to make your own space |
| `/new-domain` | Scaffold your own domain-library-set — your sandbox |
| `/update` | Update npm dependencies (Nx-migrate flow, `--legacy-peer-deps`) |

## Architecture

- **Nx monorepo**, npm, the `@angular/build` (esbuild) builder, Tailwind v4 (CSS-first).
- **`libs/shared/*`** — the reusable building blocks (table above). Promote domain code up here once it's genuinely reusable.
- **`apps/storybook-app`** — the Storybook host.
- **`docs/`** — curated Angular / Nx / NgRx / testing conventions.
- **Prefixes** — the shared design library uses **`dlc-`** (a design-library prefix, deliberately separate from the `@nge` org namespace); other shared libs use `nge-`; each new domain picks its own.
- **`../open-source/`** (a sibling directory) — shallow, version-pinned clones of Angular, Material + CDK, NgRx, and RxJS **source**, for reference beyond `node_modules`' built types. Set up via `scripts/clone-open-source.sh`.

## Tech stack

| | Version |
| --- | --- |
| Nx | 22.7.5 |
| Angular | 21.2 (zone-based, standalone) |
| NgRx (store + signals) | 21.1 |
| Storybook (Angular) | 10.4 |
| Tailwind CSS | 4 (CSS-first) |
| TypeScript | 5.9 |
| Testing | Jest 30 |
| Lint | ESLint 9 (flat config) |

## Built for AI-assisted development

This workspace is set up to be worked on with **Claude Code**: framework-level skills in `.claude/skills/`, the `/setup` · `/explain` · `/new-domain` · `/update` commands in `.claude/commands/`, and the `../open-source/` framework source clones give the assistant accurate, version-matched references. A fresh clone is one command (`/setup`) from being set up *and* oriented.

> **Optional — agent teams.** Much of this repo was built using Claude Code's experimental **agent teams** mode (a persistent lead agent coordinating a team of subagents). To work the same way, enable it once in your **global** `~/.claude/settings.json` — it's a personal, user-level opt-in, so the repo deliberately doesn't force it on cloners:
>
> ```jsonc
> // ~/.claude/settings.json  (NOT the repo's .claude/settings.json)
> { "env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" } }
> ```

---

_A personal reference / experiments workspace — not a published package._
