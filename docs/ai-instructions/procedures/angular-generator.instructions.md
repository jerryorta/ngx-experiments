---
applyTo: '**'
---

# Angular Generator Instructions

Standardized procedure for generating Angular components, services, pipes, directives, guards, and interceptors using Nx workspace generators.

> **New components do NOT use Angular Material** (`mat-*`, `--mat-sys-*`, `@angular/material`). Use the own-namespace CSS-variable architecture proven in `libs/shared/calendar`: `ViewEncapsulation.None` + `host: { class: '<prefix>-name' }`, Tailwind utilities, and a self-sufficient `--<prefix>-*` token set with literal fallbacks — never `--mat-sys-*`. The Material patterns shown below (dialog `mat-*` imports, `--mat-sys-*` tokens) are **legacy** — they describe how the established **evolving-cognition** + **real-estate** apps work; do not follow them for new development. Authoritative policy: `docs/ai/CONSTRAINTS.md` § Angular Material.

## Usage Keywords

```
generate component user-profile
generate service auth-service in libs/shared/store
generate pipe format-date
generate directive highlight
generate guard auth
generate interceptor logging
create component settings-page
```

## Generation Procedure

### 1. Determine Target Location

If location not specified, prompt user:

```
"Where would you like to generate the [artifact-type]?
1. Current directory: [current-directory-path]
2. Common locations:
   - apps/real-estate/app/src/app/[type]s
   - apps/evolving-cognition/app/src/app/[type]s
   - libs/shared/ui-design-library/src/lib/[type]s"
```

**Critical**: The path provided creates a **directory** containing all component files. **NEVER create components with inline `template` or `styles` — always use separate files.**

```bash
# Command creates a directory:
npx nx generate @nx/angular:component apps/real-estate/app/src/app/pages/dashboard/re-broker-dashboard

# Result:
apps/real-estate/app/src/app/pages/dashboard/re-broker-dashboard/
  ├── re-broker-dashboard.component.ts
  ├── re-broker-dashboard.component.html
  ├── re-broker-dashboard.component.scss
  └── re-broker-dashboard.component.spec.ts
```

**IMPORTANT — Separate files are mandatory:**

- Use `templateUrl`, NEVER `template`
- Use `styleUrl`, NEVER `styles`
- This applies to ALL components (UI Design Library and application components)
- When creating components manually (without the generator), still create all four files

### 2. Project Configuration

| Project                  | Prefix   | Base Path                               |
| ------------------------ | -------- | --------------------------------------- |
| real-estate-app          | `re`     | `apps/real-estate/app/src/app`          |
| evolving-cognition-app   | `ec`     | `apps/evolving-cognition/app/src/app`   |
| shared-ui-design-library | `dlc`    | `libs/shared/ui-design-library/src/lib` |
| shared-store             | `ng-pat` | `libs/shared/store/src/lib`             |

### 3. Execute Nx Generate Commands

**Always use standalone components**: `--standalone=true`

```bash
# Component
npx nx generate @nx/angular:component [full-path] --standalone=true --export=false

# Service
npx nx generate @nx/angular:service [path]/[name] --name=[name]

# Pipe
npx nx generate @nx/angular:pipe [path]/[name] --standalone=true

# Directive
npx nx generate @nx/angular:directive [path]/[name] --standalone=true

# Guard/Interceptor/Resolver
npx nx generate @nx/angular:[type] [path]/[name] --name=[name]
```

### 4. Apply Workspace Conventions

#### Host Class Requirement (UI Design Library Only)

**CRITICAL: Components in `libs/shared/ui-design-library` MUST include a `host` property with a class matching the component selector.**

This is a **required standard for UI Design Library components only**. Application components in `apps/` directories may use `:host` and follow different conventions.

```typescript
@Component({
  selector: 're-my-component',
  host: {
    class: 're-my-component', // REQUIRED - must match selector
  },
  // ...
})
```

**Why this is required:**

- Ensures consistent styling with SCSS wrapper classes
- Provides proper scoping when using `ViewEncapsulation.None`
- Enables predictable component targeting in parent styles
- Prevents style leakage across components

#### SCSS File Requirements (UI Design Library Only)

**For components in `libs/shared/ui-design-library` ONLY: The SCSS file MUST wrap ALL styles using the component class. NEVER use `:host`.**

Application components in `apps/` directories may use `:host` if preferred.

```scss
// ✅ CORRECT: Use component class with CSS variables
.dlc-my-component {
  // 1. Define CSS variables FIRST (for overridable styles)
  // New components: own-namespace tokens with literal fallbacks — NEVER --mat-sys-* (legacy).
  --dlc-my-component-padding: 1rem;
  --dlc-my-component-bg-color: var(--dlc-my-component-surface, #ffffff);

  // 2. Component styles (using CSS variables)
  display: block;
  padding: var(--dlc-my-component-padding);
  background-color: var(--dlc-my-component-bg-color);

  // 3. Child element styles
  .header {
    font-weight: bold;
  }

  .content {
    padding: calc(var(--dlc-my-component-padding) * 0.5);
  }
}

// ❌ WRONG: Using :host
:host {
  display: block; // DON'T USE :host!
}

// ❌ WRONG: Unwrapped styles (will leak globally)
.header {
  color: red; // NO! Must be wrapped in component class
}
```

**CSS Variables for Overridable Styles:**

For exposing styles that consumers can override, define CSS variables at the top of the component class:

```scss
.dlc-component-name {
  // Define overridable CSS variables first
  --dlc-component-name-property: value;

  // Then use them in styles
  property: var(--dlc-component-name-property);
}
```

**Naming convention:**

- Prefix: `--dlc-component-name-`
- Use kebab-case
- Be descriptive

**Why UI Design Library doesn't use `:host`:**

- All library components use `ViewEncapsulation.None`, where `:host` doesn't work properly
- Component class ensures consistent scoping across the library
- Makes styles predictable and easier to debug
- Prevents accidental global style leakage

**Note:** Application components outside the UI Design Library typically use default `ViewEncapsulation.Emulated` and can use `:host` safely.

#### SCSS with :host (Application Components Only)

**For application components in `apps/` directories:**

**IMPORTANT**: Only use `:host` when `encapsulation` is NOT explicitly set in the `@Component` decorator (defaults to `ViewEncapsulation.Emulated`). If `encapsulation: ViewEncapsulation.None` is set, `:host` will NOT work - use the component class selector instead.

When using `:host` with default encapsulation, ALL SCSS must be wrapped inside `:host { }`, EXCEPT `@media` queries.

```scss
// ✅ CORRECT: Styles wrapped in :host
:host {
  display: block;

  .header {
    font-weight: bold;
  }

  .content {
    padding: 1rem;
  }
}

// ✅ CORRECT: @media outside :host
@media (max-width: 768px) {
  :host {
    .content {
      padding: 0.5rem;
    }
  }
}

// ❌ WRONG: Styles outside :host
.header {
  font-weight: bold; // Will leak globally!
}

:host {
  display: block;
}

// ❌ WRONG: @media inside :host
:host {
  @media (max-width: 768px) {
    // Don't nest @media inside :host
  }
}
```

**Rules:**

1. Wrap ALL styles in `:host { }`
2. Exception: `@media` queries go outside
3. Nest `:host` inside `@media` blocks

#### ViewEncapsulation.None (UI Design Library Standard)

**All components in `libs/shared/ui-design-library` use `ViewEncapsulation.None`.**

This is a library-wide standard. Application components in `apps/` typically use the default `ViewEncapsulation.Emulated`.

**ViewEncapsulation.None pattern (UI Design Library):**

1. **Host Class** must match selector exactly
2. **SCSS Root Selector** must use component selector (NOT `:host`)
3. **Display Block** set in SCSS
4. **ViewEncapsulation.None** set in component decorator

```typescript
@Component({
  selector: 're-my-component',
  host: {
    class: 're-my-component', // MUST match selector
  },
  encapsulation: ViewEncapsulation.None,
})
```

```scss
// Use component class, NOT :host
.re-my-component {
  // MUST match selector and host class
  display: block;
  // Component styles here
}
```

#### Component Patterns by Type

**Dialog Components** (files ending in `-dialog`):

> **Legacy (EC/RE only).** The `@angular/material/dialog` imports below apply to the established evolving-cognition + real-estate apps. New components do NOT use Angular Material — build dialogs with `@angular/cdk` overlay/dialog utilities and own-namespace styling. See `docs/ai/CONSTRAINTS.md` § Angular Material.

```typescript
import { Component, inject, ViewEncapsulation } from '@angular/core';
import { MatDialogModule, MatDialogRef } from '@angular/material/dialog';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': '[prefix]-[component-name]' },
  imports: [MatDialogModule, MatButtonModule, MatIconModule],
  selector: '[prefix]-[component-name]',
  styleUrl: './[component-name].component.scss',
  templateUrl: './[component-name].component.html',
})
export class [ComponentName]Component {
  private dialogRef = inject(MatDialogRef<[ComponentName]Component>);

  onCancel(): void { this.dialogRef.close(false); }
  onConfirm(): void { this.dialogRef.close(true); }
}
```

**Page Components** (in `/pages/` directories):

```typescript
import { fadeInAnimation } from '@gigasoftware/ui-design-library-deprecated';

@Component({
  animations: [fadeInAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: {
    '[@fadeInAnimation]': '',
    'class': '[prefix]-[component-name]',
  },
  // ...
})
```

**UI Components** (reusable components):

```typescript
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None,
  host: { 'class': '[prefix]-[component-name]' },
  // ...
})
export class [ComponentName]Component {
  // Use signal inputs/outputs
}
```

#### Styling Hierarchy

**Priority Order (new components):**

1. **Tailwind CSS** (default) - use utility classes directly in HTML for all layouts, spacing, typography, colors, and responsive design
2. **SCSS with BEM** (last resort) - only for complex layouts/animations, pseudo-selectors, and own-namespace CSS-variable (`--<prefix>-*`) definitions Tailwind cannot express

New components do NOT use Angular Material. Use `@angular/cdk` (overlays, portals, a11y, drag-drop) as a construction aid where it helps, and theme via own-namespace `--<prefix>-*` tokens with literal fallbacks — never `--mat-sys-*`. (Material — `mat-*`, `--mat-sys-*` — appears only in the legacy EC/RE apps; see `docs/ai/CONSTRAINTS.md` § Angular Material.)

**Tailwind for Custom Layouts (own-namespace tokens, no Material):**

```html
<div class="dlc-component-name block">
  <div class="flex items-center gap-3">
    <span class="material-symbols-outlined text-(--dlc-component-name-error) h-6 w-6 text-2xl">warning</span>
    <h2 class="m-0 font-medium">Delete Workspace</h2>
  </div>

  <div class="py-4">
    <p class="mb-4 text-base leading-relaxed">Warning message</p>
    <div class="bg-(--dlc-component-name-error-container) flex items-start gap-2 rounded-lg p-3">
      <span class="material-symbols-outlined h-[18px] w-[18px] text-lg">info</span>
      <span class="text-sm">Details</span>
    </div>
  </div>
</div>
```

> **Legacy reference (EC/RE only).** The established apps render the same structure with Material directives (`mat-dialog-title`, `<mat-dialog-content>`, `<mat-icon>`, `mat-raised-button color="primary"`). Leave that as-is in those apps; do not introduce it into new components.

```scss
// Minimal SCSS for Tailwind components
.re-component-name {
  display: block;
  // All visual styling handled by Tailwind in template
}
```

**SCSS with BEM (Last Resort Only):**

Use SCSS with BEM only when Tailwind is insufficient:

- Complex animations not achievable with Tailwind
- Advanced CSS features (own-namespace custom properties, complex selectors)
- Third-party component integration

```scss
.dlc-component-name {
  display: block;

  // BEM naming: Block__Element--Modifier
  &__header {
    display: flex;
    align-items: center;
  }

  &__button {
    min-width: 100px;

    // Own-namespace token with literal fallback — NEVER --mat-sys-* (legacy)
    &--warn {
      color: var(--dlc-component-name-error, #b3261e);
    }
  }
}
```

**Common Tailwind Patterns:**

```html
<!-- Layouts -->
<div class="flex items-center gap-3">Horizontal layout</div>
<div class="grid grid-cols-1 gap-4 md:grid-cols-2">Responsive grid</div>

<!-- Typography -->
<h1 class="text-2xl font-bold">Heading</h1>
<p class="text-base leading-relaxed">Body text</p>

<!-- Icons + own-namespace design tokens (no Material) -->
<span class="material-symbols-outlined h-6 w-6 text-2xl">icon</span>
<div class="text-(--dlc-component-name-on-surface) bg-(--dlc-component-name-surface)">Design tokens</div>

<!-- States -->
<div class="transition-colors hover:bg-gray-100">Hover</div>
<div class="pointer-events-none opacity-60">Disabled</div>
```

#### Service/Pipe/Directive Post-Generation

**Services:**

```typescript
import { inject, Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class [ServiceName]Service {
  private store = inject(Store);
}
```

**Services must NOT implement Angular lifecycle hooks (`OnDestroy`, `OnInit`, …).** Hooks on services only run when the providing injector is destroyed — for `providedIn: 'root'` that's application shutdown (effectively never), and the hook is silently misleading. For subscription cleanup use `DestroyRef` + `takeUntilDestroyed`:

```typescript
import { DestroyRef, inject, Injectable } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

@Injectable({ providedIn: 'root' })
export class ExampleService {
  private readonly destroyRef = inject(DestroyRef);

  constructor() {
    someObservable$
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe(...);
  }
}
```

This ties the subscription to the host injector's lifetime, works in prod (app shutdown) and in tests (fires on `TestBed.resetTestingModule()`).

**Pipes:**

```typescript
@Pipe({ name: '[pipeName]', standalone: true, pure: true })
export class [PipeName]Pipe implements PipeTransform {
  transform(value: unknown, ...args: unknown[]): unknown {
    return value;
  }
}
```

**Directives:**

```typescript
@Directive({ selector: '[prefix][directiveName]', standalone: true })
export class [DirectiveName]Directive {
  private elementRef = inject(ElementRef);
}
```

### 5. Update Test Files

**Use Jest, not Jasmine:**

```typescript
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideMockStore } from '@ngrx/store/testing';

describe('[ComponentName]Component', () => {
  let component: [ComponentName]Component;
  let fixture: ComponentFixture<[ComponentName]Component>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [[ComponentName]Component],
      providers: [provideMockStore()]
    }).compileComponents();

    fixture = TestBed.createComponent([ComponentName]Component);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
```

**Dialog Test Pattern:**

```typescript
let mockDialogRef: jest.Mocked<MatDialogRef<[ComponentName]Component>>;

beforeEach(async () => {
  mockDialogRef = { close: jest.fn() } as any;

  await TestBed.configureTestingModule({
    imports: [[ComponentName]Component],
    providers: [
      provideMockStore(),
      { provide: MatDialogRef, useValue: mockDialogRef }
    ]
  }).compileComponents();
  // ...
});
```

### 6. Update Barrel Exports

```typescript
// libs/[lib-name]/src/index.ts
export * from './lib/[artifact-path]/[artifact-name].[type]';

// libs/shared/ui-design-library/src/lib/components/index.ts
export * from './[category]/[component-name]/[component-name].component';
```

### 7. Validation Checklist

**Required Patterns:**

- ✅ **Separate files: `.ts`, `.html`, `.scss`, `.spec.ts` — NEVER inline template or styles**
- ✅ **Uses `templateUrl` and `styleUrl`, NEVER `template` or `styles`**
- ✅ Inject pattern used (no constructor injection)
- ✅ Standalone component/pipe/directive
- ✅ **Host class matches selector (REQUIRED for UI Design Library)**
- ✅ **SCSS wrapped in component class, NOT :host (REQUIRED for UI Design Library)**
- ✅ **ViewEncapsulation.None (REQUIRED for UI Design Library)**
- ✅ OnPush change detection

**Component-Specific:**

- ✅ Dialog: MatDialogRef injected, onCancel/onConfirm methods
- ✅ Page: fadeInAnimation imported and applied, follows [angular-app-component.instructions.md](angular-app-component.instructions.md)
- ✅ UI Library: Follows [COMPONENT-ARCHITECTURE-BEST-PRACTICES.md](../../../libs/shared/ui-design-library/COMPONENT-ARCHITECTURE-BEST-PRACTICES.md)

**Accessibility Selectors:**

- ✅ Icon-only buttons have `aria-label`
- ✅ Top-level container has `data-testid`
- See [accessibility-selectors.instructions.md](accessibility-selectors.instructions.md) for full rules

**Styling Validation:**

- ✅ No Angular Material in new components (`mat-*` / `--mat-sys-*` are legacy EC/RE only)
- ✅ Tailwind for custom layouts (preferred)
- ✅ SCSS/BEM only when Tailwind insufficient
- ✅ Overridable styles use own-namespace `--<prefix>-*` tokens with literal fallbacks
- ✅ All styles nested under component class (no global leaks)

**Test Validation:**

- ✅ Jest syntax (`jest.fn()`, `jest.Mocked<T>`)
- ✅ provideMockStore() when using Store
- ✅ Component imported in TestBed

**Quick Validation:**

```bash
npx nx build [project-name] --skip-nx-cache
```

**Post-Generation:**

- Run `/verify-theming` task to ensure styling follows workspace conventions (new components use own-namespace `--<prefix>-*` tokens, not Material `--mat-sys-*` — see `docs/ai/CONSTRAINTS.md` § Angular Material)

## Error Handling

| Problem                                        | Solution                                                                 |
| ---------------------------------------------- | ------------------------------------------------------------------------ |
| `Schema does not support positional arguments` | Use full path: `npx nx generate @nx/angular:component apps/path/to/name` |
| `Could not find a candidate module`            | Add `--standalone=true` flag                                             |
| `'project' is not found in schema`             | Use full path instead of `--project` parameter                           |
| `jasmine.SpyObj not found`                     | Use Jest syntax: `jest.Mocked<T>` and `jest.fn()`                        |
| `Cannot find module 'zone.js'`                 | Environment issue - ignore test failures, focus on compilation           |

## Naming Conventions

| Type      | Class Name             | File Name                   | Selector/Pipe Name |
| --------- | ---------------------- | --------------------------- | ------------------ |
| Component | `UserProfileComponent` | `user-profile.component.ts` | `re-user-profile`  |
| Service   | `AuthService`          | `auth.service.ts`           | N/A                |
| Pipe      | `PhoneNumberPipe`      | `phone-number.pipe.ts`      | `phoneNumber`      |
| Directive | `AutoFocusDirective`   | `auto-focus.directive.ts`   | `autoFocus`        |

## Common Paths

**Real Estate App:**

- Pages: `apps/real-estate/app/src/app/pages`
- Components: `apps/real-estate/app/src/app/components`
- Services: `apps/real-estate/app/src/app/services`

**Evolving Cognition App:**

- Pages: `apps/evolving-cognition/app/src/app/pages`
- Components: `apps/evolving-cognition/app/src/app/components`

**UI Design Library:**

- Components: `libs/shared/ui-design-library/src/lib/components`
- Pipes: `libs/shared/ui-design-library/src/lib/pipes`
- Directives: `libs/shared/ui-design-library/src/lib/directives`

**Store Library:**

- Services: `libs/shared/store/src/lib/+[feature-name]`

## Integration Notes

- Compatible with Nx 21.1.3+ workspace
- Standalone components only (no NgModules)
- Uses inject() function for DI
- Signal-based inputs/outputs preferred
- Jest for testing (not Jasmine)
- ViewEncapsulation.None workspace standard
