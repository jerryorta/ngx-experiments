---
applyTo: 'libs/*/mocks/**'
title: Mocks library standard (fixtures)
---

A `*-mocks` library holds seed-data and spec fixtures — kept OUT of the production `<domain>-models` / `<domain>-store` bundles so fixtures never ship to users. **Zero framework dependencies** (type-only imports from `<domain>-models`; pure-fn imports from `<domain>-utils` where genuinely needed).

- **Allowed consumers:** any `*.spec.ts`, Storybook stories that need data, a backend seeder. A `MOCK_*` import in production code is a regression — use a live facade instead.
- Fixture constants are `MOCK_*`, typed from `<domain>-models`. Organize under `src/lib/` mirroring the data source (Firestore tree, REST payloads, external-store rows); re-export via `src/index.ts`.
- Static config (option lists, label maps, form defaults) is NOT a mock — it lives elsewhere.
