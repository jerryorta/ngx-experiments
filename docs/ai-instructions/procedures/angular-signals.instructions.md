---
applyTo: '**'
---

# Angular Signal Refactor Instructions

> **Write-time patterns** (input/output/model shapes, `@let` usage) are distilled in [`../standards/signals.md`](../standards/signals.md) and auto-injected on write. This file is the full conversion procedure.

This instruction provides a standardized procedure for refactoring Angular components from traditional `@Input()` and `@Output()` decorators to the modern signal-based `input()` and `output()` functions, along with updating templates to use the new signal patterns.

## Usage

To refactor Angular components to use signal inputs and outputs, use the keyword:

```
signal-refactor
```

Or more specific commands:

```
signal-refactor this component
signal-refactor all components in libs/ui
signal-refactor UserProfileComponent
```

## Procedure

Follow this exact sequence for each component refactor operation:

### 1. Update Imports

#### Add Signal Functions Import

```typescript
// Before
import { Component, Input, Output, EventEmitter } from '@angular/core';

// After
import { Component, effect, input, output } from '@angular/core';
```

**Note**: Remove `Input`, `Output`, and `EventEmitter` imports if they're no longer needed after refactoring. Add `effect` import if you need to handle input setters.

### 2. Refactor Class Properties

#### Convert @Input() to input()

Transform traditional input decorators into signal inputs:

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

#### Convert @Output() to output()

Transform traditional output decorators into signal outputs:

```typescript
// Before
@Output() userClick = new EventEmitter<User>();
@Output() statusChange = new EventEmitter<boolean>();
@Output() dataUpdate = new EventEmitter<void>();

// After
userClick = output<User>();
statusChange = output<boolean>();
dataUpdate = output<void>();
```

#### Property Ordering Rules

Class member ordering is governed by the workspace-wide rule in [angular-class-member-ordering.instructions.md](../reference/angular-class-member-ordering.instructions.md). Apply that ordering after refactoring inputs/outputs to signals — in particular, group `input()` / `output()` immediately after `inject()`.

### 3. Update Component Methods

#### Update Methods that Emit Events

```typescript
// Before
onUserClick(user: User) {
  this.userClick.emit(user);
}

onStatusChange(status: boolean) {
  this.statusChange.emit(status);
}

// After
onUserClick(user: User) {
  this.userClick.emit(user);
}

onStatusChange(status: boolean) {
  this.statusChange.emit(status);
}
```

**Note**: The method calls remain the same, but now they're calling signal outputs.

#### Handle Input Setters with Effects

If you have `@Input() set` setters, convert them to signal inputs with effects:

```typescript
// Before
@Input() set question(value: Question | null) {
  if (value) {
    this.processQuestion(value);
  }
}

// After
questionInput = input<Question | null>(null, { alias: 'question' });

// Declare the effect as a class FIELD — never in the constructor
private processQuestionEffect = effect(() => {
  const questionValue = this.questionInput();
  if (questionValue) {
    this.processQuestion(questionValue);
  }
});
```

**Key Points for Input Setters:**

- Use `effect()` to watch for signal input changes
- Declare each effect as a class field — NEVER in the constructor (per class-member-ordering)
- Use aliases to maintain the same property name for template compatibility
- Import `effect` from `@angular/core`

### 4. Update Templates

#### Use @let for Signal Inputs

Add `@let` declarations at the top of templates to consume signal inputs:

```html
<!-- Before -->
<div class="user-card">
  <h2>{{ userName }}</h2>
  <p>Active: {{ isActive }}</p>
  <span>Age: {{ userAge }}</span>
</div>

<!-- After -->
@let name = userName(); @let active = isActive(); @let age = userAge();

<div class="user-card">
  <h2>{{ name }}</h2>
  <p>Active: {{ active }}</p>
  <span>Age: {{ age }}</span>
</div>
```

#### Update Control Flow with Signal Inputs

```html
<!-- Before -->
@if (isActive) {
<div class="active-user">{{ userName }}</div>
} @for (item of items; track item.id) {
<div>{{ item.name }}</div>
}

<!-- After -->
@let active = isActive(); @let itemList = items(); @if (active) {
<div class="active-user">{{ userName() }}</div>
} @for (item of itemList; track item.id) {
<div>{{ item.name }}</div>
}
```

#### Update Event Bindings (Output Signals)

Output signal usage in templates remains the same:

```html
<!-- Before and After (no change needed) -->
<button (click)="onUserClick(user)">Click User</button>
<input (change)="onStatusChange($event.target.checked)" type="checkbox" />
```

### 5. Handle Special Cases

#### Required Inputs

```typescript
// Before
@Input({ required: true }) userId!: string;

// After
userId = input.required<string>();
```

#### Optional Inputs with Transform

```typescript
// Before
@Input({ transform: booleanAttribute }) isEnabled: boolean = false;

// After
isEnabled = input<boolean, string | boolean>(false, {
  transform: booleanAttribute
});
```

#### Inputs with Aliases

```typescript
// Before
@Input('user-name') userName: string = '';

// After
userName = input<string>('', { alias: 'user-name' });
```

#### Input Setters

When converting `@Input() set` setters to signal inputs, use an `effect()` to handle the input changes:

```typescript
// Before
@Input() set question(value: Question | null) {
  if (value) {
    this.question$.next(value);
  }
}

// After
questionInput = input<Question | null>(null, { alias: 'question' });

// Declare the effect as a class FIELD — never in the constructor
private syncQuestionEffect = effect(() => {
  const questionValue = this.questionInput();
  if (questionValue) {
    this.question$.next(questionValue);
  }
});
```

**Important Notes for Input Setters:**

- Convert the setter to a signal input with an alias to maintain the same property name in templates
- Declare the `effect()` as a class field (NEVER in the constructor) to watch for changes to the signal input
- Import `effect` from `@angular/core`
- The effect will automatically run whenever the signal input changes
- This pattern maintains backward compatibility with existing patterns like ReplaySubjects

### 6. Validation

After refactoring, ensure:

1. **No Compilation Errors**: All TypeScript files compile successfully
2. **Correct Property Order**: Inputs and outputs follow the specified order
3. **Template Syntax**: All signal inputs use `@let` declarations
4. **Functionality Preserved**: All input/output behavior works as before
5. **No Unused Imports**: Remove `Input`, `Output`, `EventEmitter` if no longer used

## Benefits

1. **Modern Angular**: Uses the latest Angular signal-based input/output API
2. **Better Performance**: Signal inputs and outputs are more efficient
3. **Type Safety**: Maintains full TypeScript type checking
4. **Cleaner Syntax**: No decorators needed, just function calls
5. **Signal Integration**: Works seamlessly with Angular's signal ecosystem
6. **Template Optimization**: `@let` declarations optimize template performance

## Error Handling

### If Compilation Errors Occur

1. Check that `input` and `output` functions are imported from '@angular/core'
2. Verify all required inputs use `input.required<T>()`
3. Ensure `@let` declarations use proper signal syntax with `()`
4. Check for proper type annotations on inputs and outputs

### If Template Errors Occur

1. Verify all `@let` declarations are at the top of template sections
2. Check that signal inputs use `()` to get values
3. Ensure output events still use the same method calls
4. Validate control flow blocks use the declared `@let` variables

## Integration Notes

- Compatible with Angular 17+ (signal inputs) and Angular 18+ (signal outputs)
- Works with Nx workspace structure
- Supports Angular standalone components
- Maintains existing functionality
- Preserves component communication patterns
- Works with all Angular features (directives, pipes, etc.)

## Example Before/After

### Before

```typescript
import { Component, Input, Output, EventEmitter } from '@angular/core';

@Component({...})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() showPrice = true;
  @Input() currency = 'USD';
  @Input() set config(value: ComponentConfig | null) {
    if (value) {
      this.processConfig(value);
    }
  }
  @Output() productSelect = new EventEmitter<Product>();
  @Output() addToCart = new EventEmitter<string>();

  onSelect() {
    this.productSelect.emit(this.product);
  }

  onAddToCart() {
    this.addToCart.emit(this.product.id);
  }

  private processConfig(config: ComponentConfig) {
    // Handle config logic
  }
}
```

```html
<div class="product-card">
  <h3>{{ product.name }}</h3>
  @if (showPrice) {
  <p class="price">{{ product.price }} {{ currency }}</p>
  }
  <button (click)="onSelect()">View Details</button>
  <button (click)="onAddToCart()">Add to Cart</button>
</div>
```

### After

```typescript
import { Component, effect, input, output } from '@angular/core';

@Component({...})
export class ProductCardComponent {
  product = input.required<Product>();
  showPrice = input<boolean>(true);
  currency = input<string>('USD');
  configInput = input<ComponentConfig | null>(null, { alias: 'config' });

  productSelect = output<Product>();
  addToCart = output<string>();

  // Effect declared as a field — never in the constructor
  private processConfigEffect = effect(() => {
    const config = this.configInput();
    if (config) {
      this.processConfig(config);
    }
  });

  onSelect() {
    this.productSelect.emit(this.product());
  }

  onAddToCart() {
    this.addToCart.emit(this.product().id);
  }

  private processConfig(config: ComponentConfig) {
    // Handle config logic
  }
}
```

```html
@let currentProduct = product(); @let priceVisible = showPrice(); @let currencyCode = currency();

<div class="product-card">
  <h3>{{ currentProduct.name }}</h3>
  @if (priceVisible) {
  <p class="price">{{ currentProduct.price }} {{ currencyCode }}</p>
  }
  <button (click)="onSelect()">View Details</button>
  <button (click)="onAddToCart()">Add to Cart</button>
</div>
```

## Usage Keywords

- `signal-refactor` - Refactor current component to use signal inputs/outputs
- `signal-refactor component` - Refactor current component
- `signal-refactor all` - Refactor all components in current directory
- `modernize-signals` - Alternative keyword for the same operation
