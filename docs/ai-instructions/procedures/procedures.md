# AI Assistant Procedures — Index

Task-time how-tos in this directory (opened by intent, never auto-injected — see `docs/ai-instructions/README.md` for the taxonomy). One line each; the linked file is the procedure:

- **[angular-generator.instructions.md](./angular-generator.instructions.md)** — scaffold components / services / pipes / directives via Nx generators
- **[angular-file-rename.instructions.md](./angular-file-rename.instructions.md)** — safe file renames (+ reference updates)
- **[angular-inject.instructions.md](./angular-inject.instructions.md)** — convert constructor DI → `inject()` (incl. `GigaFirebaseConnectionService` services)
- **[angular-signals.instructions.md](./angular-signals.instructions.md)** — convert `@Input()`/`@Output()` → signal `input()`/`output()`
- **[ngrx-mutation-flow.instructions.md](./ngrx-mutation-flow.instructions.md)** — add an NgRx mutation method (facade recipe)
- **[query-engine-service-setup.instructions.md](./query-engine-service-setup.instructions.md)** — Firestore sub-collection query-engine service setup
- **[angular-guided-popup.instructions.md](./angular-guided-popup.instructions.md)** — add a guided popup (CDK overlay)
- **[refactoring-procedures.md](./refactoring-procedures.md)** — refactoring playbooks
- **[module-update-procedures.md](./module-update-procedures.md)** — package updates (`npx nx migrate`, priority order, restrictions)
- **[feature-flags.md](./feature-flags.md)** — feature-flag workflow

Nx usage guidelines and commands live in `CLAUDE.md` (§ General Guidelines for working with Nx) and `docs/reference/commands.md` — not here.
