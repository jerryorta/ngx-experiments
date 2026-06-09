# {{DOMAIN_TITLE}} Mocks — Contributor Notes

## Purpose

Seed-data and spec fixtures for the {{DOMAIN_TITLE}} domain — kept OUT of the production `{{DOMAIN}}-api` / `{{DOMAIN}}-store` bundles so fixture data never ships to users, and so the dependency boundary can be locked at the dep-graph level via Nx tags.

This library has **zero framework dependencies** — no Angular, no NgRx, no DI. Type-only imports from `@gigasoftware/{{DOMAIN}}-api`; pure-function imports from `@gigasoftware/{{DOMAIN}}-utils` are allowed where a fixture genuinely needs them.

## Allowed consumers

- Any `*.spec.ts` file anywhere in the workspace.
- Storybook stories that need representative data.
- A backend seeder, if the domain has one.

Production code should get its data from a live facade, not a fixture. A `MOCK_*` import in production code is a regression — find or build the relevant facade instead.

## Naming & placement

- Fixture constants are `MOCK_*`. Their types come from `@gigasoftware/{{DOMAIN}}-api`.
- Organize fixtures under `src/lib/` to mirror the data source they represent (the Firestore document tree, REST payloads, external-store rows, etc.) so the seeder / consumer mapping is obvious.
- Re-export every fixture through `src/index.ts`.
- Static config (option lists, label maps, form defaults) is NOT a mock — it does not belong here.

## Test & Lint

- Test: `npx nx run {{DOMAIN}}-mocks:test`
- Lint: `npx nx run {{DOMAIN}}-mocks:lint`

## Review Checklist

- [ ] New fixture re-exported through `src/index.ts`
- [ ] Imports from `@gigasoftware/{{DOMAIN}}-api` are type-only where possible
- [ ] No Angular, no NgRx, no DI tokens introduced
- [ ] It's a fixture, not static config (which lives elsewhere)
- [ ] Folder placement mirrors the data source hierarchy

## References

- Constraints: `docs/ai/CONSTRAINTS.md`
