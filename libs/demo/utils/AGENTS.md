# Demo Utils — Contributor Notes

## Overview

- **Purpose**: Pure utility functions and helpers for the Demo domain
- **Ownership**: Domain-specific utilities — consumed by `demo-store`, `demo-ui`, and `demo-design-library`

## Test & Lint

- Test: `npx nx run demo-utils:test`
- Lint: `npx nx run demo-utils:lint`

## Guidelines

- Pure functions only — no side effects, no Angular DI, no observables
- Strict TypeScript types — avoid `any`
- Each utility should be independently testable
- Export all public symbols through `src/index.ts`

## Review Checklist

- [ ] Functions are pure with no side effects
- [ ] Unit tests cover edge cases
- [ ] No Angular or NgRx dependencies introduced
- [ ] New exports added to `src/index.ts`

## References

- Constraints: `docs/ai/CONSTRAINTS.md`
