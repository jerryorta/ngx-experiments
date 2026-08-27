# Angular Conventions

The Angular coding conventions (control flow `@if`/`@for`/`@switch`, `inject()` DI, signal `input()`/`output()`, component-scoped state, styling) live in one place and are **auto-injected on write** by `.claude/hooks/inject-standards.sh` — this file intentionally holds no rule content.

- **Invariants (authoritative):** `docs/ai/CONSTRAINTS.md` § Angular Conventions
- **Write-time patterns:** `docs/ai-instructions/standards/` — by artifact (`signals.md`, `inject.md`, `signal-store.md`, `class-member-ordering.md`, `a11y.md`, `app-component.md`, `styling.md`) and by library type (`lib-types/{models,store,ui,design-library,utils,themes,mocks}.md`)
- **Conversion procedures:** `docs/ai-instructions/procedures/angular-inject.instructions.md` (constructor DI → `inject()`, including the `NgeFirebaseConnectionService` / `ComponentStore` special case) and `docs/ai-instructions/procedures/angular-signals.instructions.md` (`@Input()`/`@Output()` → signals)
