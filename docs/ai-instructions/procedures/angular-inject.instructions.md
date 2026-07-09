---
applyTo: '**'
---

# Angular Inject Refactor Instructions

> **Write-time patterns** (`inject()` shapes, tokens, `DestroyRef` cleanup) are distilled in [`../standards/inject.md`](../standards/inject.md) and auto-injected on write. This file is the full conversion procedure.

This instruction provides a standardized procedure for refactoring Angular components, services, and other classes from constructor-based dependency injection to the modern `inject()` function pattern.

## Usage

To refactor Angular classes to use inject functions, use the keyword:

```
inject-refactor
```

Or more specific commands:

```
inject-refactor this component
inject-refactor all services in libs/api
inject-refactor UserService
```

## Procedure

Follow this exact sequence for each file refactor operation:

### 1. Update Imports

#### Remove Type Imports for Injectable Dependencies

Convert type-only imports to regular imports for services that will be injected:

```typescript
// Before
import type { Router } from '@angular/router';
import type { Store } from '@ngrx/store';

// After
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
```

#### Add inject Function Import

```typescript
// Before
import { Component, EventEmitter, Inject, Input, Output } from '@angular/core';

// After
import { Component, EventEmitter, inject, Input, Output } from '@angular/core';
```

**Note**: Remove `Inject` import if it's no longer needed after refactoring.

### 2. Refactor Class Properties

#### Convert Constructor Parameters to Class Properties

Transform constructor-injected dependencies into class properties using `inject()`:

```typescript
// Before
constructor(
  private store: Store,
  private router: Router,
  @Inject(WINDOW) public win: Window
) { }

// After
private store = inject(Store);
private router = inject(Router);
public win = inject(WINDOW);
```

#### Property Ordering Rules

Class member ordering is governed by the workspace-wide rule in [angular-class-member-ordering.instructions.md](../reference/angular-class-member-ordering.instructions.md). The only invariant relevant to this refactor: `inject()` calls must move to the top of the class.

### 3. Update Constructor

#### Convert to Parameter-less Constructor or Remove if Empty

```typescript
// Before
constructor(
  private store: Store,
  private router: Router,
  @Inject(WINDOW) public win: Window
) {
  this.subscriptions$ = this.store.select(selectSomething);
  this.hasActiveSubscription$ = this.store.select(selectOther);
}

// After (if constructor has body)
constructor() {
  this.subscriptions$ = this.store.select(selectSomething);
  this.hasActiveSubscription$ = this.store.select(selectOther);
}

// After (if constructor becomes empty, remove it entirely)
// No constructor needed - Angular will use default constructor
```

#### Remove Empty Constructor

If the constructor becomes empty after removing all dependency injection parameters, remove the constructor entirely:

```typescript
// Before
constructor(
  private store: Store,
  private router: Router
) {}

// After - Remove empty constructor completely
export class MyComponent {
  private store = inject(Store);
  private router = inject(Router);
  // No constructor needed
}
```

### 5. Validation

After refactoring, ensure:

1. **No Compilation Errors**: All TypeScript files compile successfully
2. **Correct Property Order**: Inject functions are first in the class
3. **No Unused Imports**: Remove `Inject` if no longer used
4. **Empty Constructor Removed**: Remove constructor if it becomes empty after refactoring
5. **Functionality Preserved**: All injected dependencies work as before

## File Types Supported

### Components

```typescript
@Component({...})
export class MyComponent {
  private store = inject(Store);
  private router = inject(Router);
  // ...rest of class
  // No constructor needed if empty
}
```

### Services

```typescript
@Injectable()
export class MyService {
  private http = inject(HttpClient);
  private store = inject(Store);
  // ...rest of class
  // No constructor needed if empty
}
```

### Directives

```typescript
@Directive({...})
export class MyDirective {
  private elementRef = inject(ElementRef);
  private renderer = inject(Renderer2);
  // ...rest of class
}
```

### Pipes

```typescript
@Pipe({...})
export class MyPipe {
  private datePipe = inject(DatePipe);
  // ...rest of class
}
```

### Guards

```typescript
@Injectable()
export class AuthGuard {
  private authService = inject(AuthService);
  private router = inject(Router);
  // ...rest of class
}
```

## Benefits

1. **Cleaner Code**: No constructor parameters cluttering the class
2. **Better Readability**: Dependencies are clearly visible at the top
3. **Modern Angular**: Follows latest Angular best practices
4. **Functional Style**: Aligns with Angular's move toward functional patterns
5. **Easier Testing**: Simpler to mock dependencies in tests

## Error Handling

### If Compilation Errors Occur

1. Check that all injected services are properly imported (not type-only)
2. Verify inject() function is imported from '@angular/core'
3. Ensure injection tokens are correctly used
4. Check for circular dependencies

### If Runtime Errors Occur

1. Verify all services are properly provided in the module/component
2. Check injection token values are correct
3. Ensure providers are available in the correct injector scope

## Integration Notes

- Compatible with Angular 14+ (inject function introduced)
- Works with Nx workspace structure
- Supports Angular standalone components
- Maintains existing functionality
- Preserves dependency injection hierarchy
- Works with all Angular decorators (@Component, @Injectable, etc.)

## Example Before/After

### Before

```typescript
import type { Router } from '@angular/router';
import type { Store } from '@ngrx/store';
import { Component, Inject, Input, Output, EventEmitter } from '@angular/core';
import { WINDOW } from '@some/token';

@Component({...})
export class MyComponent {
  @Input() showBtn = true;
  @Output() btnClick = new EventEmitter();
  someProperty$: Observable<any>;

  constructor(
    private store: Store,
    private router: Router,
    @Inject(WINDOW) public win: Window
  ) {
    this.someProperty$ = this.store.select(selectSomething);
  }
}
```

### After

```typescript
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Component, inject, Input, Output, EventEmitter } from '@angular/core';
import { WINDOW } from '@some/token';

@Component({...})
export class MyComponent {
  private store = inject(Store);
  private router = inject(Router);
  public win = inject(WINDOW);

  someProperty$: Observable<any>;
  @Input() showBtn = true;
  @Output() btnClick = new EventEmitter();

  constructor() {
    this.someProperty$ = this.store.select(selectSomething);
  }
}
```

## GigaFirebaseConnectionService Services (ComponentStore-based)

Services implementing `GigaFirebaseConnectionService` (typically extending `ComponentStore` with Firebase connection management) have extra conversion concerns beyond the standard procedure:

1. **Update imports** — add `inject`, change type imports to value imports
2. **Replace constructor injection** with `inject()` class properties
3. **`GigaServiceConnector` moves to a property initializer** (it needs the injected store): `connection: GigaServiceConnector = new GigaServiceConnector(this, this.store);`
4. **Clean up the constructor** — remove the `const that = this` pattern; use `this` directly in configuration objects
5. **Simplify `onDisconnect()`** — remove the unused `user` parameter; null-check the connection

```typescript
// Before
export class MyFirebaseService extends ComponentStore<MyState> implements GigaFirebaseConnectionService {
  constructor(
    private store: Store,
    private customFirestoreService: GigaFirestoreService
  ) {
    super(initialState);
    this.connection = new GigaServiceConnector(this, this.store);

    const that = this;
    this._queryService = new GigaFirestoreCollectionQuery<T>({
      deleteManyUpdater: (ids: string[]) => that.deleteMany(ids),
      // ... other config
    }, store, customFirestoreService);
  }

  onDisconnect(user: GigaAccountState) {
    if (this.someCondition && user.uid) {
      this._isConnected$.next(false);
    }
    this.connection.deleteKey();
    this._queryService.onDisconnect(user.uid);
  }
}

// After
export class MyFirebaseService extends ComponentStore<MyState> implements GigaFirebaseConnectionService {
  private store = inject(Store);
  private customFirestoreService = inject(GigaFirestoreService);

  connection: GigaServiceConnector = new GigaServiceConnector(this, this.store);

  constructor() {
    super(initialState);

    this._queryService = new GigaFirestoreCollectionQuery<T>({
      deleteManyUpdater: (ids: string[]) => this.deleteMany(ids),
      // ... other config
    }, this.store, this.customFirestoreService);
  }

  onDisconnect() {
    if (this.connection) {
      this.connection.deleteKey();
    }
    this._isConnected$.next(false);
    this._queryService.onDisconnect();
  }
}
```

## Usage Keywords

- `inject-refactor` - Refactor current file or selection
- `inject-refactor component` - Refactor current component
- `inject-refactor service` - Refactor current service
- `inject-refactor all` - Refactor all files in current directory
- `modernize-di` - Alternative keyword for the same operation
