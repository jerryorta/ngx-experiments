# Demo Mocks — Contributor Notes

## Purpose

Seed-data and spec fixtures for the Demo domain — kept OUT of the production `demo-api` / `demo-store` bundles so fixture data never ships to users, and so the dependency boundary can be locked at the dep-graph level via Nx tags.

This library has **zero framework dependencies** — no Angular, no NgRx, no DI. Type-only imports from `@nge/demo-api`; pure-function imports from `@nge/demo-utils` are allowed where a fixture genuinely needs them.

## Allowed consumers

- Any `*.spec.ts` file anywhere in the workspace.
- Storybook stories that need representative data.
- A backend seeder, if the domain has one.

Production code should get its data from a live facade, not a fixture. A `MOCK_*` import in production code is a regression — find or build the relevant facade instead.

## Naming & placement

- Fixture constants are `MOCK_*`. Their types come from `@nge/demo-api`.
- Organize fixtures under `src/lib/` to mirror the data source they represent (the Firestore document tree, REST payloads, external-store rows, etc.) so the seeder / consumer mapping is obvious.
- Re-export every fixture through `src/index.ts`.
- Static config (option lists, label maps, form defaults) is NOT a mock — it does not belong here.

## Test & Lint

- Test: `npx nx run demo-mocks:test`
- Lint: `npx nx run demo-mocks:lint`

## Review Checklist

- [ ] New fixture re-exported through `src/index.ts`
- [ ] Imports from `@nge/demo-api` are type-only where possible
- [ ] No Angular, no NgRx, no DI tokens introduced
- [ ] It's a fixture, not static config (which lives elsewhere)
- [ ] Folder placement mirrors the data source hierarchy

## References

- Constraints: `docs/ai/CONSTRAINTS.md`
