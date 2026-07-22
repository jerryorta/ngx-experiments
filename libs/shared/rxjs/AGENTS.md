# Shared RxJS — Contributor Notes

> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

**Bespoke shared library** — outside the auto-injected lib-type standard system; these notes are
the guidance.

## Shared specifics

- **Purpose**: custom RxJS operators and utilities — memoization, polling, filtering,
  rate-limiting, JSON change detection.
- **Pure RxJS — no Angular dependencies.** Operators must be pure and composable; add marble tests
  for new operators; export every public API through `index.ts`.
- Test: `npx nx run shared-rxjs:test` · Lint: `npx nx run shared-rxjs:lint`
