# AI Instructions

Docs for AI assistants working in this repo, organized by **when** they're needed. The write-time layer is delivered automatically by a hook; everything else is opened on demand.

## How the write-time layer works

`.claude/hooks/inject-standards.sh` (a `PreToolUse` hook on `Write` / `Edit` / `MultiEdit`) inspects the file being written, infers the artifact type from its path, and injects **only** the matching standards into context — **nothing loads at session start**. Per write it assembles:

1. **Invariants** — the mapped sections of `docs/ai/CONSTRAINTS.md`
2. **Patterns & shapes** — the matching `standards/*.md` fragment bodies (below)
3. **Library-type rules** — the matching `standards/lib-types/<type>.md`, routed by the library path
4. **Anti-patterns** — the matching entries from `docs/ai/ANTI-PATTERNS.json`
5. **Deep-guide pointers** — the matching `reference/*.instructions.md` (opened only if needed)
6. **Library notes** — the nearest `AGENTS.md` above the file being written

Each layer is emitted **once per session**, keyed in a marker directory: an artifact type, a lib-type fragment and a library's `AGENTS.md` each inject on their first matching write and stay silent afterwards. When a write matches nothing new, the hook emits nothing at all.

Routing is by each doc's `applyTo:` frontmatter glob: a **precise** glob injects when a matching file is written; `applyTo: '**'` marks a general/procedure doc that is **never** auto-injected. Add or retune a standard by editing frontmatter — no code change to the hook.

## `standards/` — write-time rules (auto-injected as content)

Small distilled fragments — shape/how (patterns, skeletons); they never restate CONSTRAINTS invariants or anti-patterns.

| Fragment | `applyTo` |
|---|---|
| `signals.md` | `**/*.component.ts,**/*.directive.ts` |
| `inject.md` | component / service / directive / pipe `.ts` |
| `signal-store.md` | `**/*.component.ts,**/*.store.ts` |
| `class-member-ordering.md` | component / directive / service / store `.ts` |
| `a11y.md` | `**/*.component.html` |
| `app-component.md` | `apps/*/src/app/**/*.component.{ts,html}` |
| `styling.md` | `**/*.scss` |

## `standards/lib-types/` — library-type rules (auto-injected as content)

Routed by the **library** the file is being written into — one fragment per lib type, injected on the first write into that lib type.

| Fragment | `applyTo` |
|---|---|
| `models.md` | `libs/*/models/**` |
| `store.md` | `libs/*/store/**` |
| `ui.md` | `libs/*/ui/**` |
| `design-library.md` | `libs/*/design-library/**` |
| `utils.md` | `libs/*/utils/**` |
| `themes.md` | `libs/*/themes/**` |
| `mocks.md` | `libs/*/mocks/**` |

## `reference/` — deep write-time guides (pointer; open for full detail)

The full companions to the fragments: `accessibility-selectors`, `angular-app-component`, `angular-class-member-ordering`, `multi-component-signal-store`.

## `procedures/` — task-time how-tos (opened by intent, never auto-injected)

`angular-generator` (scaffold), `angular-signals` / `angular-inject` (convert), `ngrx-mutation-flow`, `query-engine-service-setup`, `nge-chart-scatter` (implement a production scatter/bubble chart — data model, multi-series, legend selection, zoom/pan/brush gestures, theming, testing), `angular-guided-popup`, `angular-file-rename`, `refactoring-procedures`, `module-update-procedures`, `procedures`, `feature-flags`.

## `legacy/` — Angular Material (evolving-cognition / real-estate only)

`angular-material-theme-customize`, `theming`, `angular-generate-material-table-column`. New components do **not** use Material (see `docs/ai/CONSTRAINTS.md` § Angular Material).

## `deployment/` — release & cloud ops

Android / iOS deployment, mobile Google auth, GCP service-account permissions.

## `process/` — multi-session workflow

`multi-session-workflow/` — patterns for multi-phase features spanning sessions.

## `claude-docs/` — Claude Code meta

Plugin discovery and related Claude Code tooling notes.
