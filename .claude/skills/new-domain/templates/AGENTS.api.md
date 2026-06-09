# {{DOMAIN_TITLE}} API — Contributor Notes

## Overview

- **Purpose**: Domain-specific types, interfaces, enums, and pure functions for the {{DOMAIN_TITLE}} domain
- **Ownership**: Consumed by `{{DOMAIN}}-store`, `{{DOMAIN}}-ui`, and the {{DOMAIN_TITLE}} app; no Angular dependency

## Test & Lint

- Test: `npx nx run {{DOMAIN}}-api:test`
- Lint: `npx nx run {{DOMAIN}}-api:lint`

## Guidelines

- Types and interfaces are the primary exports — avoid runtime logic unless it is a pure, reusable function
- Export all public symbols through `src/index.ts`
- Use strict TypeScript types — avoid `any`
- Interfaces for data shapes, enums for fixed sets, type aliases for unions
- Pure transformation functions belong here when they are domain-specific and reusable across store/UI
- No Angular, no NgRx, no side effects — this library has zero framework dependencies

## Review Checklist

- [ ] New exports added to `src/index.ts`
- [ ] No circular dependencies introduced
- [ ] Pure functions only — no side effects, no Angular DI
- [ ] Strict types — no `any`
- [ ] No Angular or NgRx imports introduced

## References

- Constraints: `docs/ai/CONSTRAINTS.md`
