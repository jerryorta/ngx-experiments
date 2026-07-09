---
applyTo: '**/*.component.ts,**/*.directive.ts,**/*.service.ts,**/*.pipe.ts'
title: Dependency injection with inject()
---

Shapes for `inject()` (the "no constructor injection / no service lifecycle hooks" invariants are enforced separately):

- Standard: `private store = inject(Store)` · `private http = inject(HttpClient)` · `private router = inject(Router)`
- Token: `private win = inject(WINDOW)` · Optional: `inject(SOME_TOKEN, { optional: true })`
- Resolution modifiers: `inject(X, { self: true })` / `{ skipSelf: true }` / `{ host: true }`
- Functional guard / resolver: call `inject()` inside the function body (it runs in an injection context).
- All `inject()` calls sit at the very top of the class; delete the constructor once it is empty.
- Service teardown (services have NO lifecycle hooks) — tie subscriptions to the injector:

```ts
private destroyRef = inject(DestroyRef);
// ...
this.source$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(/* ... */);
```
