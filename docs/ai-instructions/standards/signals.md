---
applyTo: '**/*.component.ts,**/*.directive.ts'
title: Signal inputs / outputs
---

Shapes for signal I/O (the "use input()/output(), not decorators" invariant is enforced separately — this is how they look):

- Optional input: `showActions = input<boolean>(true)` · Required: `user = input.required<User>()`
- Alias to keep the template name: `qInput = input<Question | null>(null, { alias: 'question' })`
- Two-way: `value = model<string>('')` (binds `[(value)]`)
- Output: `userSelect = output<User>()` → emit with `this.userSelect.emit(x)`
- Transform: `disabled = input(false, { transform: booleanAttribute })`
- Bridge an Observable → signal: `data = toSignal(this.data$)`
- React to an input in code with an `effect()` declared as a FIELD (never in the constructor):
  `private sync = effect(() => { const v = this.qInput(); if (v) this.q$.next(v); });`

Templates — read each signal once via `@let` at the top, then use the local:

```html
@let currentUser = user(); @let actionsVisible = showActions();
<h3>{{ currentUser.name }}</h3>
@if (actionsVisible) { <button (click)="onSelect()">Select</button> }
```
