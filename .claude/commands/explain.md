Explain this repo to a developer who just cloned it — its **philosophy**, how it's **organized**, and how to carve out **their own space to experiment** via `/new-domain`. Ground the explanation in the CURRENT repo (list the real projects/libs below) — don't just recite this file — and present it conversationally. End by offering to run `/new-domain` with them.

First, ground yourself in what's actually here:

```bash
npx nx show projects
ls libs/shared
```

Then explain, in this shape:

## 1. Philosophy — what this repo IS

- A standalone **Nx + Angular experiments & reference workspace** under its own **`@nge`** namespace (deliberately not tied to any product/org).
- A **clean-room for modern Angular done to a high standard**: standalone components, signals (`input()` / `output()` + component-scoped `@ngrx/signals` stores), new control flow (`@if`/`@for`), OnPush, `ViewEncapsulation.None`, and **zero Angular Material** — components self-theme through their own `--<prefix>-*` CSS-variable tokens with literal fallbacks.
- Patterns and a **curated slice of conventions are mirrored from a larger production monorepo** (its `.claude/skills/` + `docs/`), so what you build here matches battle-tested standards — but every product/domain specific has been stripped out. It's a place to **port shared libraries, prove out ideas, and showcase work** without the weight of a real product.

## 2. How it's organized

Walk through what `nx show projects` / `ls libs/shared` actually returned, mapping each to its role:

- **`apps/storybook-app`** — the Storybook host (`:4400`); serves every design-library + charts + calendar story, with a persona **theme switcher** in the toolbar.
- **`libs/shared/*`** — the shared building blocks: `ui-design-library` (the `dlc-` presentational component set), `themes` (personas × light/dark, `--dlc-*` tokens), `calendar`, `date`, `charts`, `rxjs`, `storybook`.
- **`docs/`** — the curated Angular / Nx / NgRx / testing conventions (the "how we build" reference).
- **`.claude/`** — `skills/` (generic, framework-level) + `commands/` (`/setup`, `/update`, `/explain`).
- **`scripts/clone-open-source.sh`** + the sibling **`../open-source/`** dir — shallow, version-pinned framework SOURCE clones (Angular, Material+CDK, NgRx, RxJS) to reference beyond `node_modules`' built `.d.ts`.
- **The domain-library-set pattern** — each domain is a consistent set of libs (`models` / `store` / `ui` / `design-library` / `utils` / `mocks` / `themes`), each with its own short prefix (like `dlc` for the shared design library).

## 3. Make your own space — `/new-domain`

The whole point is that you get **your own domain** to try things without touching the shared libs:

- Run **`/new-domain`** — it scaffolds a full domain-library-set with a prefix you choose, wired into Nx (and, for the design-library, into Storybook). That's your sandbox.
- Build components, a signal/global store, a theme in *your* domain; when something proves genuinely reusable, promote it up into `libs/shared/*`.
- First time on this machine? Run **`/setup`** first (installs dependencies + clones the framework source references). Bump dependencies later with **`/update`**.

Finish by asking what they'd like to build, and offer to kick off `/new-domain` together.
