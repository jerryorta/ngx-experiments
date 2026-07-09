---
applyTo: 'libs/*/models/**'
title: Models library standard (types + pure fns)
---

A `*-models` library holds domain types, interfaces, enums, and pure functions — consumed by store / ui / app. **Zero framework dependencies** (no Angular, no NgRx, no side effects).

- Types / interfaces are the primary exports: interfaces for data shapes, enums for fixed sets, type aliases for unions.
- Pure, reusable, domain-specific transformation functions may live here; nothing with side effects or DI.
- Strict types — avoid `any`. Export all public symbols through `src/index.ts`.
