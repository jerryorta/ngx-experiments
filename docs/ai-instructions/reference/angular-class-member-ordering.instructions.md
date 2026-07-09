---
description: Authoritative rule for ordering members inside Angular classes (components, directives, services, stores). Applied any time a class is created or modified.
applyTo: '**/*.component.ts,**/*.directive.ts,**/*.service.ts,**/*.store.ts'
---

# Angular Class Member Ordering

Single source of truth for how members are arranged inside Angular classes in this workspace. ESLint does **not** enforce this — `perfectionist/sort-classes` is intentionally disabled (`eslint.config.js:102`) because the rule below is judgment-based. AI assistants and reviewers must apply it.

> **Write-time rule** (the member order + key sub-rules) is distilled in [`../standards/class-member-ordering.md`](../standards/class-member-ordering.md) and auto-injected on write. This file adds the canonical worked examples and the refactoring steps.

## Canonical Layout

```typescript
@Component({ /* … */ })
export class ExampleComponent {
  // 1. inject() — always first
  private store = inject(Store);
  private router = inject(Router);

  // 2. input() / output() — public API, grouped
  userId = input.required<string>();
  showHeader = input<boolean>(true);
  saved = output<User>();
  cancelled = output<void>();

  /**
   * User profile loading
   * Pulls the user record from the store and exposes derived view state.
   */
  user = this.store.selectSignal(selectUser);
  isLoading = computed(() => this.user() === null);

  loadUser(): void {
    this.store.dispatch(loadUser({ id: this.userId() }));
  }

  /**
   * Save flow
   * Validates the form and emits the saved user to the parent.
   */
  private formValid = signal(false);

  onSave(): void {
    if (!this.formValid()) return;
    this.saved.emit(this.user()!);
  }

  onCancel(): void {
    this.cancelled.emit();
  }

  // Lifecycle hooks — last, because they reference the members above
  ngOnInit(): void {
    this.loadUser();
  }

  ngOnDestroy(): void {
    // teardown
  }
}
```

## Services

Services follow the same rules with two differences:

- No `input()` / `output()` block (services have no template-binding surface).
- **No lifecycle hooks** — see rule above. Use explicit teardown methods or `DestroyRef`.

```typescript
@Injectable({ providedIn: 'root' })
export class ExampleService {
  // 1. inject() first
  private firestore = inject(GigaFirestoreService);
  private store = inject(Store);

  /**
   * Collaboration query lifecycle
   * Owns the parent/child query pair for the shared collection.
   */
  private collaborationQuery!: GigaFirestoreCollectionQuery<Entity>;

  connectCollaboration(uid: string): void { /* … */ }
  disconnectCollaboration(): void { /* … */ }

  /**
   * Private collection query lifecycle
   * Owns the user-private collection query.
   */
  private privateQuery!: GigaFirestoreCollectionQuery<Entity>;

  connectPrivate(uid: string): void { /* … */ }
  disconnectPrivate(): void { /* … */ }
}
```

## When Refactoring an Existing Class

When you touch a class for an inject-refactor, signal-refactor, or any other reason and the layout does not match:

1. Move all `inject()` calls to the top.
2. Group `input()` / `output()` signals immediately below.
3. Identify feature groups by reading what each field/method is for, then reorder so related members sit together.
4. Add a comment header per group.
5. Move lifecycle hooks to the bottom.
6. If you find a feature group that does not belong with the rest, that is a signal to split the class — flag it rather than silently reshuffling.

## Related Documents

- [angular-inject.instructions.md](../procedures/angular-inject.instructions.md) — `inject()` DI convention and conversion procedure
- [angular-signals.instructions.md](../procedures/angular-signals.instructions.md) — `input()`/`output()` signal convention and conversion procedure
- [refactoring-procedures.md](../procedures/refactoring-procedures.md) — overall refactoring playbook
