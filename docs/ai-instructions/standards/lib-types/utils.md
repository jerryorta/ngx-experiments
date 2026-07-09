---
applyTo: 'libs/*/utils/**'
title: Utils library standard (pure helpers)
---

A `*-utils` library holds pure utility functions / helpers — consumed by store / ui / design-library.

- **Pure functions only** — no side effects, no Angular DI, no observables. (Angular-aware `@Injectable` services belong in `<domain>-store`, not here.)
- Each utility independently testable; strict types, no `any`.
- Export all public symbols through `src/index.ts`.
