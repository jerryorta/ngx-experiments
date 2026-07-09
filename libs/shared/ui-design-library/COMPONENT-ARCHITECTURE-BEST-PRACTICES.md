# Component Architecture Best Practices

## Overview

This document outlines best practices for developing components in the `@nge/ui-design-library` (`libs/shared/ui-design-library`) based on lessons learned from refactoring 109+ linting and architectural issues. Following these guidelines ensures consistent, accessible, type-safe, and maintainable components.

**IMPORTANT: These guidelines apply ONLY to components in `libs/shared/ui-design-library`. Application components in `apps/` directories may follow different conventions.**

> **No Angular Material in new components.** This own-namespace CSS-variable architecture is proven to
> work without Material (see `libs/shared/calendar`). Components expose their own `--<prefix>-*` tokens
> with **literal fallbacks** (`var(--<prefix>-x, <literal>)`) and consumers theme via those tokens —
> NEVER reference `--mat-sys-*`, and never add `mat-*` elements. Angular Material is legacy-only,
> confined to the evolving-cognition + real-estate apps; see `docs/ai/CONSTRAINTS.md` § "Angular
> Material — Legacy Only (NOT for New Development)".

---

## 1. Component Naming & Selector Conventions

### Component Selector Pattern

**Always use the `dlc-` prefix for new components:**

```typescript
@Component({
  selector: 'dlc-component-name',
  host: {
    class: 'dlc-component-name'
  },
  // ...
})
export class ComponentNameComponent {}
```

**CRITICAL REQUIREMENTS (UI Design Library Only):**

These requirements apply to ALL components in `libs/shared/ui-design-library`:

1. **Every component MUST include a `host` property that adds a class matching the component selector**
2. **The SCSS file MUST wrap ALL styles using the same class (NOT `:host`)**

```typescript
@Component({
  selector: 'dlc-component-name',
  host: {
    class: 'dlc-component-name'  // REQUIRED
  },
  styleUrl: './dlc-component-name.component.scss',
  // ...
})
```

```scss
// REQUIRED: Wrap ALL styles with the component class
.dlc-component-name {
  display: block;

  // All component styles go here
  .header {
  }
  .content {
  }
}

// ❌ NEVER use :host - it won't work with ViewEncapsulation.None
:host {
  display: block; // WRONG!
}
```

**Why these requirements exist in the UI Design Library:**

- Ensures consistent styling with SCSS wrapper classes
- Provides proper scoping when using `ViewEncapsulation.None` (library standard)
- Prevents style leakage to other components
- Enables predictable component targeting in parent styles
- Maintains consistency across all library components

### Dual-Selector Migration Pattern

**When migrating from `gs-` to `dlc-` prefix, support both selectors temporarily:**

```typescript
@Component({
  selector: 'dlc-component-name,gs-component-name',
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-component-name'
  },
  // ...
})
```

**Requirements for dual-selector pattern:**

- Add `ViewEncapsulation.None` to the component decorator
- Update `host.class` to use `dlc-` prefix
- Update SCSS wrapper class to use `dlc-` prefix
- Both selectors work during migration period

### File Structure — Separate Files Required

**CRITICAL: Every component MUST be created with separate files. NEVER use inline `template` or `styles` in the component `.ts` file.**

A component directory must contain at minimum these files:

```
dlc-component-name/
  ├── dlc-component-name.component.ts       # Component class only
  ├── dlc-component-name.component.html     # Template (REQUIRED — never inline)
  ├── dlc-component-name.component.scss     # Styles (REQUIRED — never inline)
  ├── dlc-component-name.component.spec.ts  # Tests
  └── index.ts                              # Barrel export
```

**Use `templateUrl` and `styleUrl`, NEVER `template` or `styles`:**

```typescript
// ✅ CORRECT — separate files
@Component({
  selector: 'dlc-component-name',
  templateUrl: './dlc-component-name.component.html',
  styleUrl: './dlc-component-name.component.scss',
})

// ❌ WRONG — inline template
@Component({
  selector: 'dlc-component-name',
  template: `<div>...</div>`,       // NEVER DO THIS
  styles: `...`,                     // NEVER DO THIS
})
```

**Why separate files are required:**

- Keeps component classes focused on logic, not markup
- Enables IDE features (syntax highlighting, Emmet, linting) in HTML/SCSS files
- Makes code reviews clearer — template, style, and logic changes are distinct
- Consistent with the Nx generator output and Angular conventions
- Prevents bloated single-file components that are hard to navigate

---

## 2. ViewEncapsulation Best Practices

### ViewEncapsulation.None (UI Design Library Standard)

**All components in `libs/shared/ui-design-library` use `ViewEncapsulation.None`.**

This is a library-wide standard, not a workspace-wide requirement. Application components in `apps/` directories typically use the default `ViewEncapsulation.Emulated`.

```typescript
import { ViewEncapsulation } from '@angular/core';

@Component({
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-component-name'
  },
  selector: 'dlc-component-name',
  styleUrl: './dlc-component-name.component.scss',
  // ...
})
```

### SCSS Organization (UI Design Library Standard)

**Because all UI Design Library components use `ViewEncapsulation.None`, ALL SCSS styles MUST be wrapped in the component class (same as host class):**

```scss
// REQUIRED: Use component selector class, NOT :host
.dlc-component-name {
  display: block; // Component-level styles

  // All child element styles go here
  .header {
    font-weight: bold;
  }

  .content {
    padding: 1rem;
  }

  // Component variants
  &.variant-large {
    font-size: 1.2rem;
  }
}
```

**❌ WRONG - Using :host:**

```scss
:host {
  display: block; // DON'T USE :host!
}

.header {
  color: red;
}
```

**❌ WRONG - Global styles leak:**

```scss
// Styles not wrapped - will leak globally!
.header {
  color: red;
}
```

**✅ CORRECT - Wrapped in component class:**

```scss
.dlc-component-name {
  display: block;

  .header {
    color: red; // Properly scoped
  }
}
```

**Why the UI Design Library doesn't use `:host`:**

- `:host` doesn't work properly with `ViewEncapsulation.None` (which all library components use)
- Using the component class ensures consistent scoping across the entire library
- Makes styles predictable and easier to debug
- Prevents accidental style leakage
- Note: Application components with default encapsulation can safely use `:host`

### CSS Variables for Overridable Styles

**For exposing styles that can be overridden by consumers, use CSS custom properties (CSS variables).**

Define CSS variables immediately after the component wrapper class (or assigned to that class), then use them throughout the component.

```scss
.dlc-component-name {
  // Define CSS variables first (overridable by consumers).
  // Color/surface tokens carry LITERAL fallbacks — never reference --mat-sys-*.
  --dlc-component-padding: 1rem;
  --dlc-component-bg-color: var(--dlc-color-surface, #ffffff);
  --dlc-component-text-color: var(--dlc-color-on-surface, #1a1a1a);
  --dlc-component-border-radius: 8px;
  --dlc-component-header-height: 60px;

  // Use the CSS variables in component styles
  display: block;
  padding: var(--dlc-component-padding);
  background-color: var(--dlc-component-bg-color);
  color: var(--dlc-component-text-color);
  border-radius: var(--dlc-component-border-radius);

  .header {
    height: var(--dlc-component-header-height);
    font-weight: bold;
  }

  .content {
    padding: calc(var(--dlc-component-padding) * 0.5);
  }
}
```

**Benefits of CSS variables:**

- Consumers can override styles without touching component internals
- Type-safe and self-documenting
- Works perfectly with `ViewEncapsulation.None`
- Supports theming and customization

**Consumer override example:**

```scss
// In parent/consumer component
.my-page {
  dlc-component-name {
    --dlc-component-padding: 2rem;
    --dlc-component-bg-color: var(--dlc-color-primary-container, #dbeafe);
  }
}
```

**Naming convention for CSS variables:**

- Prefix: `--dlc-component-name-`
- Use kebab-case
- Be descriptive: `--dlc-card-header-height`, not `--dlc-card-h`
- Give color/surface tokens **literal fallbacks** (`var(--dlc-color-surface, #ffffff)`) so the component
  renders standalone — do NOT reference `--mat-sys-*` (Angular Material is legacy EC/RE only)

---

## 3. Accessibility Requirements (WCAG Compliance)

### Label-For-ID Associations

**Every form control must have an associated label:**

```html
<!-- ✅ Correct -->
<label for="userName">User Name</label>
<input id="userName" type="text" [formControl]="userNameControl" />

<!-- ❌ Wrong -->
<label>User Name</label>
<input type="text" [formControl]="userNameControl" />
```

### Keyboard Accessibility

**Interactive elements must support keyboard navigation:**

```html
<div
  (click)="onSelect($event)"
  (keyup.enter)="onSelect($event)"
  tabindex="0"
  role="button"
  [attr.aria-label]="item.name"
>
  {{ item.name }}
</div>
```

**Key requirements:**

- Add `(keyup.enter)` handler alongside `(click)`
- Add `tabindex="0"` for keyboard focus
- Add appropriate `role` attribute
- Add `aria-label` or `aria-labelledby` for screen readers

**Method signature must accept Event type:**

```typescript
// ✅ Correct - supports both keyboard and mouse events
onSelect(e: Event): void {
  // Handle both keyboard and mouse events
}

// ❌ Wrong - only works with mouse events
onSelect(e: MouseEvent): void {
  // Fails with keyboard events
}
```

### Radio Groups

**Radio groups need proper label associations:**

```html
<label [for]="'radio-' + fieldId">{{ label }}</label>
<mat-radio-group [id]="'radio-' + fieldId">
  <mat-radio-button *ngFor="let option of options" [value]="option.value">
    {{ option.label }}
  </mat-radio-button>
</mat-radio-group>
```

### ARIA Attributes

**Use ARIA attributes for non-semantic elements:**

```html
<!-- Clickable div needs role and aria-label -->
<div (click)="onAction()" role="button" [attr.aria-label]="actionDescription" tabindex="0">
  Action Button
</div>
```

---

## 4. TypeScript Type Safety

### Avoid Non-Null Assertions

**Never use the `!` operator - use proper null checks instead:**

```typescript
// ❌ Wrong - runtime error if undefined
const nextKey = queue.shift()!;
processKey(nextKey);

// ✅ Correct - safe null check
const nextKey = queue.shift();
if (nextKey) {
  processKey(nextKey);
}
```

### Optional Chaining

**Use optional chaining for nested properties:**

```typescript
// ❌ Wrong
const value = obj.prop!.nested!.value;

// ✅ Correct
const value = obj?.prop?.nested?.value;
```

### Regex Match Results

**Extract match results to variables before accessing:**

```typescript
// ❌ Wrong - non-null assertion
const pageNum = el.id.match(/page(\d+)/)![1];

// ✅ Correct - safe extraction
const match = el.id?.match(/page(\d+)/);
const pageNum = match?.[1] ? parseInt(match[1], 10) : 1;
```

### Form Controls and ChipInput

**Check existence before accessing properties:**

```typescript
// ❌ Wrong
event.chipInput!.clear();

// ✅ Correct
if (event.chipInput) {
  event.chipInput.clear();
}
```

### Map.get() Returns

**Always handle undefined from Map.get():**

```typescript
// ❌ Wrong
order.get(key)!.items.push(item);

// ✅ Correct
const group = order.get(key);
if (group) {
  group.items.push(item);
}
```

### Type Guards for Composite Objects

**Use type guards for optional composite objects:**

```typescript
// ❌ Wrong
const parts = comp.composite!.parts;

// ✅ Correct
if (!comp.composite) continue;
const parts = comp.composite.parts;
```

---

## 5. Form & Template Patterns

### Reactive Forms

**Use typed FormControls:**

```typescript
import { FormControl } from '@angular/forms';

export class MyComponent {
  userNameControl = new FormControl<string>('');
  ageControl = new FormControl<number | null>(null);
}
```

### Template Variables with Signals

**Use @let declarations for signal inputs:**

```html
@let title = titleSignal(); @let items = itemsSignal(); @let isActive = isActiveSignal();

<div class="component">
  <h2>{{ title }}</h2>
  @if (isActive) {
  <ul>
    @for (item of items; track item.id) {
    <li>{{ item.name }}</li>
    }
  </ul>
  }
</div>
```

### Modern Control Flow

**Use new Angular control flow syntax:**

```html
<!-- ✅ Correct - new syntax -->
@if (condition) {
<div>Show when true</div>
} @else {
<div>Show when false</div>
} @for (item of items; track item.id) {
<div>{{ item.name }}</div>
}

<!-- ❌ Wrong - old syntax -->
<div *ngIf="condition">Show when true</div>
<div *ngFor="let item of items">{{ item.name }}</div>
```

---

## 6. ESLint Compliance

### Component Decorator Property Order

**Follow this exact order in @Component decorator:**

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    class: 'dlc-component-name'
  },
  imports: [CommonModule, ReactiveFormsModule],
  selector: 'dlc-component-name',
  standalone: true,
  styleUrl: './dlc-component-name.component.scss',
  templateUrl: './dlc-component-name.component.html',
})
```

**Key order rules:**

1. `changeDetection` first
2. `encapsulation` before `imports`
3. Alphabetical order for most properties
4. Run `nx run shared-ui-design-library:lint --fix` to auto-sort

### Import Sorting

**Keep imports alphabetically sorted:**

```typescript
import { Component, inject, input, signal, ViewEncapsulation } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { Store } from '@ngrx/store';
```

**Let ESLint auto-fix:**

```bash
npx nx run shared-ui-design-library:lint --fix
```

### Regular Expression Escaping

**In string literals, use double backslash for regex special characters:**

```typescript
// ❌ Wrong - triple backslash
regex: '^[^@\\\s]+@[^@\\\s]+\\\.[^@\\\s]+'

// ✅ Correct - double backslash in string literals
regex: '^[^@\\s]+@[^@\\s]+\\.[^@\\s]+'
```

**Character patterns:**

- `\s` (whitespace) → `\\s` in strings
- `\d` (digit) → `\\d` in strings
- `\.` (literal dot) → `\\.` in strings

### Unused Variables

**Prefix unused variables with underscore:**

```typescript
// ❌ Wrong - unused variable
let store: Store;

// ✅ Correct - prefixed with underscore
let _store: Store;
```

### Empty Blocks

**Never leave empty blocks:**

```typescript
// ❌ Wrong
ngOnInit(): void {}

// ✅ Correct - remove if not needed
// (no ngOnInit method)

// ✅ Correct - add implementation if needed
ngOnInit(): void {
  this.loadData();
}
```

---

## 7. Component Class Organization

### Property Order

**Follow this exact order in component classes:**

```typescript
export class MyComponent {
  // 1. Inject functions FIRST
  private store = inject(Store);
  private router = inject(Router);
  private fb = inject(FormBuilder);

  // 2. Input and Output signals GROUPED
  title = input<string>('');
  items = input<Item[]>([]);
  userId = input.required<string>();
  itemSelect = output<Item>();
  save = output<void>();

  // 3. Observable properties
  user$: Observable<User>;
  data$: Observable<Data>;

  // 4. Other properties
  loading = signal(false);
  form: FormGroup;

  // 5. Constructor (if needed)
  constructor() {
    this.form = this.fb.group({});
    this.user$ = this.store.select(selectUser);
  }

  // 6. Lifecycle hooks
  ngOnInit(): void {}

  // 7. Public methods
  onSave(): void {}

  // 8. Private methods
  private loadData(): void {}
}
```

### Dependency Injection Pattern

**Always use inject() function:**

```typescript
// ✅ Correct - modern inject() function
private store = inject(Store);
private router = inject(Router);

// ❌ Wrong - constructor injection
constructor(
  private store: Store,
  private router: Router
) {}
```

### Signal-Based Inputs/Outputs

**Use signal inputs and outputs:**

```typescript
// ✅ Correct - signal-based
title = input<string>('');
userId = input.required<string>();
save = output<void>();

// ❌ Wrong - decorator-based
@Input() title = '';
@Input({ required: true }) userId!: string;
@Output() save = new EventEmitter<void>();
```

---

## 7.5 Component-Scoped State (Complex Components & Multi-Component Systems)

When a component carries **substantial internal state / logic** — a large interactive form with cross-field validation, a rich editor, OR a _system_ of components (a root orchestrating a child tree that shares selection / hover / drag / focus / current view) — extract that state into one **component-scoped `@ngrx/signals` SignalStore provided at the component** (for a system, its root). Don't accrete dozens of signals in the class, and don't thread shared state through `input()` / `output()` across levels.

- **Colocate** the store next to the component (or system root) it serves — same folder, not a central store directory.
- Provide on the component: `providers: [FeatureStore]` — never `providedIn: 'root'` (one instance per component instance).
- Children `inject(FeatureStore)` and read signals / call methods — no shared-state `input()`, no bubbled `output()`.
- `input()` / `output()` stay ONLY at the root's public boundary (config in, events out).
- State → `withState`; derived view-models → `withComputed` (calling pure functions); mutations → `withMethods` (`patchState`).
- Shallow parent → leaf cases with trivial shared state can stay on plain `input()`/`output()`.

This **supplements** the global domain store (`@nge/<domain>-store`) — it does NOT replace it: global = app/domain-wide persistent data + websocket subscriptions (consumed via facades/selectors); the component-scoped store = the local UI/interaction state of this one system. A system often uses both.

Reference impl: `libs/real-estate/ui/src/lib/cma/store/` (provided on `cma-comparison-task-editor.component.ts`, injected by `dlc-cma-stats-bar.component.ts`). Full guide: `docs/ai-instructions/reference/multi-component-signal-store.instructions.md`. Scaffold via the `ngrx-component-state` skill.

---

## 8. Testing Patterns

### Mock Component Structure

**Create simple mock components for testing:**

```typescript
@Component({
  selector: 'dlc-child-component',
  standalone: true,
  template: ''
})
class MockChildComponent {
  // Minimal mock implementation
}
```

### TestBed Configuration

**Use proper TestBed setup with signal inputs:**

```typescript
describe('MyComponent', () => {
  let component: MyComponent;
  let fixture: ComponentFixture<MyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MyComponent, MockChildComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(MyComponent);
    component = fixture.componentInstance;

    // Set required signal inputs
    fixture.componentRef.setInput('userId', 'test-123');
    fixture.componentRef.setInput('title', 'Test Title');

    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

### Avoid Unused Variables in Tests

**Prefix unused test variables:**

```typescript
// ❌ Wrong
let store: MockStore;

// ✅ Correct
let _store: MockStore;
```

---

## 9. SCSS Organization

### Component Wrapper Class

**CRITICAL: ALWAYS use the component class (matching host class) as root wrapper. NEVER use `:host`.**

```scss
// ✅ CORRECT: Use component class from host property
.dlc-component-name {
  // 1. Define CSS variables FIRST (for overridable styles) — literal fallbacks, never --mat-sys-*
  --dlc-component-name-padding: 1rem;
  --dlc-component-name-bg-color: var(--dlc-color-surface, #ffffff);

  // 2. Component-level styles (using CSS variables)
  display: block;
  position: relative;
  padding: var(--dlc-component-name-padding);
  background-color: var(--dlc-component-name-bg-color);

  // 3. Child element styles
  .header {
    font-weight: bold;
  }

  .content {
    padding: calc(var(--dlc-component-name-padding) * 0.5);
  }

  // 4. State modifiers
  &.loading {
    opacity: 0.5;
  }

  // 5. Responsive styles
  @media (max-width: 768px) {
    --dlc-component-name-padding: 0.5rem;
  }
}
```

**❌ WRONG: Using :host**

```scss
// DON'T DO THIS - :host doesn't work with ViewEncapsulation.None
:host {
  display: block;
}

.header {
  font-weight: bold;
}
```

**Why the UI Design Library uses component class instead of `:host`:**

1. `:host` is incompatible with `ViewEncapsulation.None` (library standard)
2. Component class provides consistent, predictable scoping
3. Easier to debug and override styles
4. Prevents unintended style leakage
5. Matches the `host.class` property in the component decorator

**Note:** Application components in `apps/` with default `ViewEncapsulation.Emulated` can use `:host` without issues.

### Tailwind Integration

**Prefer Tailwind utilities in templates, SCSS for complex styles:**

```html
<!-- ✅ Correct - Tailwind for simple utilities (own token + literal fallback, never --mat-sys-*) -->
<div class="flex items-center gap-4 p-4">
  <span class="text-sm text-[var(--dlc-color-on-surface,#1a1a1a)]">Label</span>
</div>
```

```scss
// ✅ Correct - SCSS for complex component-specific styles
.dlc-component-name {
  .complex-layout {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
    gap: 1rem;

    &::before {
      content: '';
      position: absolute;
      // Complex pseudo-element styles
    }
  }
}
```

---

## 10. Common Pitfalls to Avoid

### ❌ Non-Null Assertions

```typescript
// Never use !
const value = obj.prop!.value;
```

### ❌ Missing Label Associations

```html
<!-- Missing for/id -->
<label>Name</label>
<input type="text" />
```

### ❌ Missing Keyboard Support

```html
<!-- Only mouse events -->
<div (click)="onSelect()">Click me</div>
```

### ❌ Wrong Event Type

```typescript
// KeyboardEvent from Angular is actually Event
onSelect(e: MouseEvent): void {}
```

### ❌ Wrong Selector Prefix

```typescript
// Should use dlc- prefix
selector: 'gs-new-component'
```

### ❌ Missing Host Class

```typescript
// Missing host property with class
@Component({
  selector: 'dlc-component-name',
  // Missing host class!
})
```

### ❌ Global SCSS Leaks

```scss
// Styles not wrapped - leak globally
.header {
  color: red;
}
```

### ❌ Using :host in SCSS

```scss
// Don't use :host - use component class instead
:host {
  display: block;
}
```

### ❌ Triple Backslash in Regex

```typescript
// Wrong escape sequence
regex: '\\\.com'
```

### ❌ Unused Variables

```typescript
// Unused without underscore prefix
let unusedVar: string;
```

---

## 11. Quick Checklist

Before submitting a component, verify:

- [ ] **Separate files for template (`.html`), styles (`.scss`), class (`.ts`), and tests (`.spec.ts`) — NEVER inline**
- [ ] Component uses `dlc-` prefix
- [ ] **Component has `host.class` matching selector (REQUIRED)**
- [ ] **SCSS wrapped in component class, NOT :host (REQUIRED)**
- [ ] **Uses `ViewEncapsulation.None` (library standard)**
- [ ] All form controls have `for` and `id` attributes
- [ ] Interactive elements support keyboard (keyup.enter, tabindex)
- [ ] No `!` non-null assertions used
- [ ] Event handlers accept `Event` type
- [ ] Component decorator properties in correct order
- [ ] Uses `inject()` for dependency injection
- [ ] Uses signal inputs/outputs
- [ ] Regex patterns use correct escape sequences
- [ ] No unused variables (or prefixed with `_`)
- [ ] Tests use proper signal input setup
- [ ] Runs `nx run shared-ui-design-library:lint --fix` without errors

---

## 12. Running Lint and Build

### Lint the Library

```bash
npx nx run shared-ui-design-library:lint
```

### Auto-fix Linting Issues

```bash
npx nx run shared-ui-design-library:lint --fix
```

### Build the Library

```bash
npx nx run shared-ui-design-library:build
```

### Test the Library

```bash
npx nx run shared-ui-design-library:test
```

---

## 13. Migration Guide

### Migrating Existing Components to Best Practices

**Step 1: Update Selector**

```typescript
// Add dual-selector support
selector: 'dlc-component-name,gs-component-name',
encapsulation: ViewEncapsulation.None,
```

**Step 2: Fix Accessibility**

- Add `for`/`id` to all form controls
- Add keyboard handlers to interactive elements
- Add ARIA attributes where needed

**Step 3: Remove Non-Null Assertions**

- Replace `!` with proper null checks
- Use optional chaining `?.`
- Add type guards

**Step 4: Update Dependency Injection**

- Convert to `inject()` function
- Remove constructor if empty

**Step 5: Modernize Inputs/Outputs**

- Convert to signal inputs
- Convert to signal outputs
- Update templates with `@let` declarations

**Step 6: Run Lint**

```bash
npx nx run shared-ui-design-library:lint --fix
```

---

## References

This document is based on refactoring work completed across 5 sessions:

- **Session 1-2**: Constructor injection, unused variables, empty blocks, component selectors
- **Session 3**: 23 accessibility fixes (label associations, keyboard events)
- **Session 4**: 21 error fixes (regex escapes, component selectors, object sorting)
- **Session 5**: 11 warning fixes (non-null assertions)

**Total Issues Fixed**: 109/109 (100%)

For questions or updates to these best practices, consult the team or create a discussion in the repository.
