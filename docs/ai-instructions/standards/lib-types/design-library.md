---
applyTo: 'libs/*/design-library/**'
title: Design-library standard (presentational primitives)
---

A `*-design-library` holds reusable presentational components / directives / pipes — consumed by `<domain>-ui`, the app, and Storybook. Global component invariants are injected separately; this is what's specific to a design library.

- **Build here first, share second (placement hierarchy).** A new presentational primitive lives in THIS domain's own `design-library`. Promote it to the cross-app shared lib `@gigasoftware/ui-design-library` (`libs/shared/ui-design-library`, `dlc-*`) ONLY when a second application genuinely needs it — the domain lib is the default, shared is the exception.
- **No store dependency** — components are purely presentational: all data in via `input()`, all events out via `output()`. Never import from `<domain>-store`.
- **Behavior primitives from `@angular/cdk`** (overlay, portal, a11y, drag-drop) — NOT Angular Material.
- **GSAP** for animations needing timeline control or physics; keep animation logic in the component class, not the template.
- **Intrinsic widget mechanics only** may stay as component signals (CVA internals — a reveal toggle, an open flag, hover/focus state). ANY state beyond that goes in a colocated component-scoped SignalStore.
