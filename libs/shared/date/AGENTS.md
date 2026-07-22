# Shared Date — Contributor Notes

> **Workspace invariants**: `docs/ai/CONSTRAINTS.md`

**Bespoke shared library** — outside the auto-injected lib-type standard system; these notes are
the guidance.

## Shared specifics

- **Purpose**: date/time utilities — millisecond constants (`milliseconds.ts`, `one-day.ts`), the
  `temporal/` helpers, and the `NgeTimeStamp` model (`timestamp.model.ts`).
- **Pure and side-effect free.** Keep functions pure; use Angular pipes for template-level
  formatting; export every public API through `index.ts`.
- Ported from gigasoftware's `@gigasoftware/date` with `giga`→`nge` renaming; `NgeTimeStamp`
  inlines what was `GigaTimeStamp`.
- Test: `npx nx run shared-date:test` · Lint: `npx nx run shared-date:lint`
