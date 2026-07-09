---
applyTo: '**/*.component.ts,**/*.directive.ts,**/*.service.ts,**/*.store.ts'
title: Class member ordering
---

Top-to-bottom order inside every Angular class (ESLint does NOT enforce this — apply by judgment):

1. `inject()` calls — all deps, grouped at the very top (must precede any field that uses them).
2. `input()` / `output()` signals — public API, grouped right after injects (components / directives only).
3. Feature groups — fields + the methods that operate on them, bundled by responsibility, each under a `/** … */` or `// ─── Feature ───` header. Order within a group: public → protected → private.
4. Lifecycle hooks LAST (`ngOnInit`, `ngOnDestroy`, …) — they reference members declared above (components / directives only).

- No `effect()` in the constructor — declare effects as feature-group fields.
- Keep a constructor only for setup that can't be a field initializer.
- Services: no input/output block, no lifecycle hooks (use `DestroyRef` / an explicit `disconnect()`).
- If you can't name a feature group, the class is doing too much — flag a split, don't silently reshuffle.
