First-time setup for a fresh clone of this workspace — install dependencies and clone the framework source references. Run the steps below in order, then report.

## 1. Install dependencies

```bash
npm ci --legacy-peer-deps
```

- `npm ci` = a clean, lockfile-exact install (what a fresh clone wants).
- `--legacy-peer-deps` because this workspace intentionally runs Angular / Nx ahead of NgRx's peer range (also set as the default in `.npmrc`, so a bare `npm ci` works too).
- No `package-lock.json` yet? Use `npm install --legacy-peer-deps` instead.

## 2. Clone the upstream framework sources

```bash
./scripts/clone-open-source.sh
```

Shallow-clones the pinned framework repos (Angular, Material + CDK, NgRx, RxJS) into a **sibling** `../open-source/` directory — the readable source + tests + migration schematics to reference beyond `node_modules`' built `.d.ts`. Idempotent (skips what's already there); it's a sibling (outside the repo root) so Nx / VSCode / tsc / ESLint / git never index it. Pins live at the top of the script.

## 3. Verify the workspace builds

```bash
npx nx run-many --target=lint,test --all
```

If `nx` can't find a project (stale daemon after install), run `npx nx reset` first.

## 4. Report
- Dependencies installed (+ any install / peer warnings)
- Framework clones present (which repos, at what refs)
- Lint / test status

## 5. Orient the developer — run `/explain`

Setup is the first thing a fresh cloner runs, so hand them straight off to the tour: invoke the **`/explain`** command — read and follow `.claude/commands/explain.md` — to walk them through the repo's philosophy, how it's organized, and how to spin up their own space with `/new-domain`. (Skip only if the caller explicitly just wanted install-and-stop.)

> While orienting, mention the **optional** agent-teams workflow: much of this repo was built with Claude Code's experimental agent teams, enabled by `"env": { "CLAUDE_CODE_EXPERIMENTAL_AGENT_TEAMS": "1" }` in the developer's **global** `~/.claude/settings.json` (a user-level opt-in — see the README's "Built for AI-assisted development" note). Do **not** edit their global settings for them; just point them to it.
