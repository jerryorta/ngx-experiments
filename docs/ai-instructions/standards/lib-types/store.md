---
applyTo: 'libs/*/store/**'
title: Store library standard (global state + facades)
---

A `*-store` library owns the domain's **global** state and Angular-aware domain services (consumed by `<domain>-ui` and the app). NgRx mutation-flow mechanics are in the reference guide; this is what's specific to a store library.

- Traditional NgRx (actions / reducers / effects / selectors) for global slices. Each slice lives in its own `+<slice>/` directory and exposes a **`*.facade.ts`** as its ONLY public consumption boundary — consumers **inject the facade**, never `Store` / selectors directly. Scaffold via the `ngrx-global-store` skill. Exemplars: `libs/got-you/store/src/lib/+needs/needs.facade.ts`, `libs/concierge/store/src/lib/+properties/properties.facade.ts`.
- **Feature-local / component-local state does NOT belong here** — it goes in a colocated component-scoped SignalStore in `<domain>-ui` / `<domain>-design-library`.
- **Supporting `@Injectable` services** (device detection, permissions, navigation, bootstrap init) belong here — not in `<domain>-utils`.
- Logic used by 2+ slices → a non-`+` concern folder under `src/lib/` with its own `index.ts`, re-exported through the barrel — not copied per slice.
