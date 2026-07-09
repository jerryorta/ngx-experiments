# Refactoring Procedures

This document contains standardized procedures for refactoring Angular code in the Gigasoftware workspace.

## Inject Refactoring

### Usage Keywords
- `inject-refactor`
- `inject-refactor this component`
- `inject-refactor all services in [path]`
- `modernize-di`

### Inject Refactoring Procedure

Transform constructor-based dependency injection to the modern `inject()` function pattern.

#### Step 1: Update Imports

Remove type-only imports and add inject function:

```typescript
// Before
import type { Router } from '@angular/router';
import type { Store } from '@ngrx/store';
import { Component, Inject } from '@angular/core';

// After
import { Router } from '@angular/router';
import { Store } from '@ngrx/store';
import { Component, inject } from '@angular/core';
```

#### Step 2: Convert Constructor Parameters

Transform constructor injection to class properties:

```typescript
// Before
constructor(
  private store: Store,
  private router: Router,
  @Inject(WINDOW) public win: Window
) {}

// After
private store = inject(Store);
private router = inject(Router);
public win = inject(WINDOW);
```

#### Step 3: Property Ordering

Class member ordering follows the workspace-wide rule in [angular-class-member-ordering.instructions.md](../reference/angular-class-member-ordering.instructions.md). For this refactor specifically: move `inject()` calls to the top of the class.

#### Step 4: Handle Constructor Logic

If constructor has initialization logic:

```typescript
// Before
constructor(private store: Store) {
  this.user$ = this.store.select(selectUser);
}

// After
private store = inject(Store);

constructor() {
  this.user$ = this.store.select(selectUser);
}

// Or remove constructor if empty
private store = inject(Store);
user$ = this.store.select(selectUser);
```

### Special Injection Cases

#### Optional Dependencies
```typescript
// Before
@Optional() private service?: SomeService

// After
private service = inject(SomeService, { optional: true });
```

#### Self/SkipSelf
```typescript
// Before
@Self() private service: SomeService
@SkipSelf() private parentService: SomeService

// After
private service = inject(SomeService, { self: true });
private parentService = inject(SomeService, { skipSelf: true });
```

#### Token Injection
```typescript
// Before
@Inject(API_URL) private apiUrl: string

// After
private apiUrl = inject(API_URL);
```

### GigaFirebaseConnectionService Pattern

Special pattern for Firebase connection services:

```typescript
// After refactoring
export class MyFirebaseService extends ComponentStore<MyState> implements GigaFirebaseConnectionService {
  private store = inject(Store);
  private firestoreService = inject(GigaFirestoreService);
  
  connection = new GigaServiceConnector(this, this.store);

  constructor() {
    super(initialState);
    // Initialize query service
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

## Signal Refactoring

### Usage Keywords
- `signal-refactor`
- `signal-refactor this component`
- `signal-refactor all components in [path]`
- `modernize-signals`

### Signal Refactoring Procedure

Convert traditional @Input/@Output decorators to signal-based patterns.

#### Step 1: Update Imports

```typescript
// Before
import { Component, Input, Output, EventEmitter } from '@angular/core';

// After
import { Component, effect, input, output } from '@angular/core';
```

#### Step 2: Convert Inputs

```typescript
// Before
@Input() userName: string = '';
@Input() isActive: boolean = false;
@Input() userAge?: number;
@Input({ required: true }) userId!: string;

// After
userName = input<string>('');
isActive = input<boolean>(false);
userAge = input<number>();
userId = input.required<string>();
```

#### Step 3: Convert Outputs

```typescript
// Before
@Output() userClick = new EventEmitter<User>();
@Output() statusChange = new EventEmitter<boolean>();

// After
userClick = output<User>();
statusChange = output<boolean>();
```

#### Step 4: Handle Input Setters

Convert setters to effects:

```typescript
// Before
@Input() set question(value: Question | null) {
  if (value) {
    this.processQuestion(value);
  }
}

// After
questionInput = input<Question | null>(null, { alias: 'question' });

constructor() {
  effect(() => {
    const questionValue = this.questionInput();
    if (questionValue) {
      this.processQuestion(questionValue);
    }
  });
}
```

#### Step 5: Update Templates

Add @let declarations for signal inputs:

```html
<!-- Before -->
<div class="user-card">
  <h2>{{ userName }}</h2>
  <p>Active: {{ isActive }}</p>
  @if (showDetails) {
    <div>Details here</div>
  }
</div>

<!-- After -->
@let name = userName();
@let active = isActive();
@let details = showDetails();

<div class="user-card">
  <h2>{{ name }}</h2>
  <p>Active: {{ active }}</p>
  @if (details) {
    <div>Details here</div>
  }
</div>
```

### Signal Property Ordering

**CRITICAL**: Maintain this exact order:

1. **Inject functions FIRST** (always at top)
2. **Input and Output signals GROUPED**
3. **Observable properties**
4. **Other properties**

```typescript
export class MyComponent {
  // 1. Inject functions FIRST
  private store = inject(Store);
  private router = inject(Router);
  
  // 2. Input/Output signals GROUPED
  title = input<string>('');
  items = input<Item[]>([]);
  userId = input.required<string>();
  itemSelect = output<Item>();
  save = output<void>();
  
  // 3. Observable properties
  user$: Observable<User>;
  
  // 4. Other properties
  loading = false;
}
```

### Special Signal Cases

#### Required Inputs
```typescript
// Before
@Input({ required: true }) userId!: string;

// After
userId = input.required<string>();
```

#### Input Transforms
```typescript
// Before
@Input({ transform: booleanAttribute }) enabled: boolean = false;

// After
enabled = input<boolean, string | boolean>(false, {
  transform: booleanAttribute
});
```

#### Input Aliases
```typescript
// Before
@Input('user-name') userName: string = '';

// After
userName = input<string>('', { alias: 'user-name' });
```

## Common Refactoring Patterns

### Component with Store and Inputs

```typescript
// Before
@Component({...})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() showPrice = true;
  @Output() addToCart = new EventEmitter<string>();
  
  products$: Observable<Product[]>;
  
  constructor(private store: Store) {
    this.products$ = this.store.select(selectProducts);
  }
  
  onAddToCart() {
    this.addToCart.emit(this.product.id);
  }
}

// After
@Component({...})
export class ProductCardComponent {
  private store = inject(Store);
  
  product = input.required<Product>();
  showPrice = input<boolean>(true);
  addToCart = output<string>();
  
  products$ = this.store.select(selectProducts);
  
  onAddToCart() {
    this.addToCart.emit(this.product().id);
  }
}
```

### Service with Multiple Dependencies

```typescript
// Before
@Injectable()
export class DataService {
  constructor(
    private http: HttpClient,
    private store: Store,
    @Inject(API_URL) private apiUrl: string
  ) {}
}

// After
@Injectable()
export class DataService {
  private http = inject(HttpClient);
  private store = inject(Store);
  private apiUrl = inject(API_URL);
}
```

## Validation Checklist

### After Inject Refactoring
- [ ] No compilation errors
- [ ] Inject functions are first in class
- [ ] No unused imports (remove `Inject` if not needed)
- [ ] Empty constructors removed
- [ ] All injection patterns converted

### After Signal Refactoring
- [ ] No compilation errors
- [ ] Correct property order maintained
- [ ] Templates use @let declarations
- [ ] Input setters converted to effects
- [ ] No unused imports (remove `Input`, `Output`, `EventEmitter`)

## Benefits of Refactoring

### Inject Pattern Benefits
- Cleaner code without constructor clutter
- Dependencies visible at top of class
- Aligns with modern Angular patterns
- Easier testing and mocking
- Better tree-shaking potential

### Signal Pattern Benefits
- Better performance with fine-grained reactivity
- Type-safe template bindings
- Cleaner syntax without decorators
- Optimized change detection
- Future-proof Angular code