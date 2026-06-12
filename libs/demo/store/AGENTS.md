# Demo Store — Contributor Notes

## Overview

- **Purpose**: NgRx state management for the Demo application domain
- **Ownership**: Domain-specific global state — consumed by `demo-ui` and the Demo app

## Test & Lint

- Test: `npx nx run demo-store:test`
- Lint: `npx nx run demo-store:lint`

## Guidelines

- This library is for **global state and Angular-aware domain services** shared across multiple features or the whole app
- Use traditional NgRx (actions, reducers, effects, selectors) for global state slices
- Feature-local / component-local state belongs in an NgRx Signal Store colocated next to the component in `demo-ui` or `demo-design-library` — not here
- Keep store slices scoped to domain concepts
- **Supporting `@Injectable` services** (device detection, permissions, page navigation, UI state, bootstrap initialization) belong here — not in `demo-utils`
- Pure functions for data transformations — extract to `demo-utils` when reusable
- Export all public symbols through `src/index.ts`

## Shared utilities — reuse before adding

Before writing a helper here, check whether it already exists: grep this lib, and scan the `@nge/*` aliases in `tsconfig.base.json`. When logic is used by 2+ slices it belongs in a **store-internal concern folder** — a non-`+` directory under `src/lib/` with its own `index.ts`, re-exported through the store barrel — not copied into each slice. Prefer this domain's own libs over a cross-domain shared lib for domain-specific logic.

## Review Checklist

- [ ] State shape matches domain model
- [ ] Selectors are memoized and composable
- [ ] Side effects handled in effects/services
- [ ] Tests cover state transitions
- [ ] Feature-local state is NOT here — it belongs in a colocated Signal Store in `demo-ui` / `demo-design-library`
- [ ] New exports added to `src/index.ts`

## References

- Constraints: `docs/ai/CONSTRAINTS.md`
