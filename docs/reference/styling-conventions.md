# Styling Conventions

> **Angular Material is legacy-only — NOT for new development.** New apps and all new components do
> NOT use Angular Material (`mat-*`, `--mat-sys-*`, `@angular/material`). Material remains only in the
> legacy **evolving-cognition** and **real-estate** apps. New components use the own-namespace
> CSS-variable architecture proven in `libs/shared/calendar`: `ViewEncapsulation.None` +
> `host: { class: '<prefix>-name' }`, Tailwind utilities, and a self-sufficient `--<prefix>-*` token
> set with **literal fallbacks** (`var(--<prefix>-x, <literal>)`) — never `--mat-sys-*`. Sections below
> that reference `--mat-sys-*` / `mat-*` describe how the legacy apps work and are labelled **Legacy**;
> do not follow them when building anything new. Authoritative policy:
> `docs/ai/CONSTRAINTS.md` § "Angular Material — Legacy Only (NOT for New Development)".

## Tailwind CSS Preference

**Always prefer Tailwind CSS over SCSS/Sass for styling.**

Key points:
- Use Tailwind utility classes instead of custom SCSS
- Leverage Tailwind's design system for consistency
- **New components:** reference your own `--<prefix>-*` design tokens with literal fallbacks via the
  Tailwind CSS-variable syntax — e.g. `text-[var(--giga-calendar-on-surface,#1a1a1a)]` — never
  `--mat-sys-*`
- **Legacy (evolving-cognition / real-estate) only:** combine Tailwind with Material Design tokens via
  CSS-variable syntax: `text-(--mat-sys-primary)`
- Only use SCSS for complex animations or third-party library integration

## CSS Variables with Tailwind

Always use Tailwind's CSS variable syntax when working with CSS custom properties.

**New components** — reference your own-namespace tokens with literal fallbacks (no Material):

```html
<!-- New components: own --<prefix>-* tokens with literal fallbacks -->
<div class="text-[var(--giga-calendar-on-surface,#1a1a1a)] bg-[var(--giga-calendar-surface,#ffffff)]">
  <button class="px-4 py-2 rounded-md bg-[var(--giga-calendar-primary,#2563eb)] text-[var(--giga-calendar-on-primary,#ffffff)] hover:opacity-90">
    Button
  </button>
</div>
```

**Legacy (evolving-cognition / real-estate)** — existing code references Material `--mat-sys-*` tokens:

```html
<!-- Legacy: Tailwind + Material system tokens -->
<div class="text-(--mat-sys-on-surface) bg-(--mat-sys-surface)">
  <button class="px-4 py-2 bg-(--mat-sys-primary) text-(--mat-sys-on-primary) rounded-md hover:bg-(--mat-sys-primary-hover)">
    Button
  </button>
</div>
```

## Material Design Integration (Legacy — evolving-cognition / real-estate only)

> **Legacy reference.** The examples below build/theme **Angular Material** components and apply only to
> the legacy EC/RE apps. For new components do NOT use Material (`mat-*` / `--mat-sys-*`) — use your own
> `--<prefix>-*` tokens with literal fallbacks (see "CSS Variables with Tailwind" above).

When working with Angular Material components in the legacy apps, combine Tailwind utilities with
Material Design tokens:

```html
<mat-card class="p-6 m-4 shadow-lg">
  <mat-card-header class="pb-4 border-b border-(--mat-sys-outline)">
    <mat-card-title class="text-(--mat-sys-on-surface) text-xl font-medium">
      Card Title
    </mat-card-title>
  </mat-card-header>
  <mat-card-content class="pt-4">
    <p class="text-(--mat-sys-on-surface-variant) leading-relaxed">
      Card content with proper Material Design theming
    </p>
  </mat-card-content>
</mat-card>
```

## Common Patterns

### Spacing and Layout
```html
<!-- Container with proper spacing -->
<div class="container mx-auto px-4 py-6">
  <!-- Grid layout -->
  <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
    <!-- Card items -->
  </div>
</div>
```

### Typography with Material Tokens (Legacy — EC/RE only)

> Legacy `--mat-sys-*` examples. For new components, swap `--mat-sys-on-surface` /
> `--mat-sys-on-surface-variant` for your own `--<prefix>-*` tokens with literal fallbacks.

```html
<!-- Headings -->
<h1 class="text-2xl font-bold text-(--mat-sys-on-surface) mb-4">Main Heading</h1>
<h2 class="text-xl font-semibold text-(--mat-sys-on-surface) mb-3">Subheading</h2>

<!-- Body text -->
<p class="text-base text-(--mat-sys-on-surface-variant) leading-relaxed">
  Body text with proper line height
</p>

<!-- Small text -->
<span class="text-sm text-(--mat-sys-on-surface-variant)">Helper text</span>
```

### Interactive Elements (Legacy — EC/RE only)

> Legacy `--mat-sys-*` / `mat-icon` examples. New components use own `--<prefix>-*` tokens with literal
> fallbacks and no `mat-*` elements.

```html
<!-- Primary button -->
<button class="px-4 py-2 bg-(--mat-sys-primary) text-(--mat-sys-on-primary) rounded-md hover:opacity-90 transition-opacity">
  Primary Action
</button>

<!-- Secondary button -->
<button class="px-4 py-2 border border-(--mat-sys-outline) text-(--mat-sys-primary) rounded-md hover:bg-(--mat-sys-surface-variant)">
  Secondary Action
</button>

<!-- Icon button -->
<button class="p-2 rounded-full hover:bg-(--mat-sys-surface-variant) transition-colors">
  <mat-icon class="text-(--mat-sys-on-surface-variant)">settings</mat-icon>
</button>
```

### Form Elements (Legacy — EC/RE only)

> Legacy `mat-form-field` / `mat-select` examples. New components build form controls without Angular
> Material, styling with own `--<prefix>-*` tokens.

```html
<!-- Input field -->
<mat-form-field class="w-full">
  <mat-label>Email</mat-label>
  <input matInput type="email" class="text-(--mat-sys-on-surface)">
</mat-form-field>

<!-- Select dropdown -->
<mat-form-field class="w-full">
  <mat-label>Choose option</mat-label>
  <mat-select class="text-(--mat-sys-on-surface)">
    <mat-option value="option1">Option 1</mat-option>
    <mat-option value="option2">Option 2</mat-option>
  </mat-select>
</mat-form-field>
```

### Cards and Surfaces (Legacy — EC/RE only)

> Legacy `--mat-sys-*` examples. New components use own `--<prefix>-*` surface/outline tokens with
> literal fallbacks.

```html
<!-- Elevated card -->
<div class="bg-(--mat-sys-surface) rounded-lg shadow-md p-6">
  <h3 class="text-lg font-medium text-(--mat-sys-on-surface) mb-2">Card Title</h3>
  <p class="text-(--mat-sys-on-surface-variant)">Card content</p>
</div>

<!-- Outlined card -->
<div class="border border-(--mat-sys-outline) rounded-lg p-6">
  <h3 class="text-lg font-medium text-(--mat-sys-on-surface) mb-2">Card Title</h3>
  <p class="text-(--mat-sys-on-surface-variant)">Card content</p>
</div>
```

## Responsive Design

Use Tailwind's responsive modifiers:
```html
<!-- Mobile-first responsive design -->
<div class="p-4 md:p-6 lg:p-8">
  <div class="text-sm md:text-base lg:text-lg">
    Responsive text
  </div>
  
  <!-- Stack on mobile, side-by-side on larger screens -->
  <div class="flex flex-col md:flex-row gap-4">
    <div class="flex-1">Column 1</div>
    <div class="flex-1">Column 2</div>
  </div>
</div>
```

## Dark Mode Support

**New components:** define light/dark variants as two sets of the same `--<prefix>-*` tokens (one per
theme class, e.g. `.<prefix>-light` / `.<prefix>-dark`) and consume the tokens in markup — switching the
class on the root re-themes everything (see `docs/reference/brand-theme-wiring.md`). Tokens carry literal
fallbacks so a component is never blank if no theme class is applied.

**Legacy (evolving-cognition / real-estate) only** — Material Design system colors that automatically
adapt to theme:
```html
<!-- Legacy: --mat-sys-* colors adjust for light/dark mode -->
<div class="bg-(--mat-sys-surface) text-(--mat-sys-on-surface)">
  <div class="bg-(--mat-sys-surface-variant) text-(--mat-sys-on-surface-variant)">
    Content that adapts to theme
  </div>
</div>
```

## SCSS Requirements for UI Design Library Components

**IMPORTANT: These requirements apply ONLY to components in `libs/shared/ui-design-library`.**

Application components in `apps/` directories may use `:host` and follow different styling conventions.

### Component Class Wrapper (Required for UI Design Library)

Every component in `libs/shared/ui-design-library` must:
1. Have `host: { class: 'component-name' }` in the `@Component` decorator
2. Wrap ALL SCSS styles in the same class
3. Define CSS variables first for overridable styles

```typescript
@Component({
  selector: 'dlc-my-component',
  host: {
    class: 'dlc-my-component'  // REQUIRED
  },
  styleUrl: './dlc-my-component.component.scss',
  // ...
})
```

```scss
// ✅ CORRECT: Component class with CSS variables
// New components: own --<prefix>-* tokens with LITERAL fallbacks — never --mat-sys-*.
// (The var(--dlc-*-bg-color, …) fallbacks below stand in for the consumer-provided theme token.)
.dlc-my-component {
  // 1. Define CSS variables FIRST (overridable by consumers)
  --dlc-my-component-padding: 1rem;
  --dlc-my-component-bg-color: var(--dlc-color-surface, #ffffff);
  --dlc-my-component-text-color: var(--dlc-color-on-surface, #1a1a1a);

  // 2. Component styles (using CSS variables)
  display: block;
  padding: var(--dlc-my-component-padding);
  background-color: var(--dlc-my-component-bg-color);
  color: var(--dlc-my-component-text-color);

  // 3. Child element styles
  .header {
    font-weight: bold;
  }

  .content {
    padding: calc(var(--dlc-my-component-padding) * 0.5);
  }

  // 4. State modifiers
  &.loading {
    opacity: 0.5;
  }
}

// Consumer can override CSS variables:
// .parent-component {
//   dlc-my-component {
//     --dlc-my-component-padding: 2rem;
//     --dlc-my-component-bg-color: var(--dlc-color-primary, #2563eb);
//   }
// }

// ❌ WRONG: Using :host
:host {
  display: block;  // DON'T USE :host!
}

// ❌ WRONG: Unwrapped styles (will leak globally)
.header {
  font-weight: bold;  // NO! Must be wrapped in component class
}
```

**CSS Variable Naming Convention:**
- Prefix with component name: `--dlc-component-name-property-name`
- Use kebab-case
- Be descriptive: `--dlc-button-padding`, not `--dlc-btn-p`
- Give color/surface tokens **literal fallbacks** (`var(--dlc-color-surface, #ffffff)`) so the component
  renders standalone — do NOT reference `--mat-sys-*` (Material is legacy EC/RE only)

**Why UI Design Library doesn't use `:host`:**
- All library components use `ViewEncapsulation.None`, where `:host` doesn't work properly
- Component class provides consistent, predictable scoping across all library components
- Easier to debug and override styles
- Prevents accidental global style leakage
- Matches the `host.class` property in the component decorator

**Note:** Application components in `apps/` directories use default `ViewEncapsulation.Emulated` and can safely use `:host` for their styling needs.

### SCSS Usage Guidelines

Only use SCSS when:
- Complex animations not achievable with Tailwind
- Advanced CSS features (custom properties, complex selectors)
- Third-party component integration
- Complex pseudo-elements or pseudo-selectors

**Remember:** Prefer Tailwind in templates whenever possible. Use SCSS as a fallback only.

## SCSS Requirements for Application Components

**For application components in `apps/` directories (NOT UI Design Library):**

When using `:host` with default `ViewEncapsulation.Emulated`, ALL SCSS styles MUST be wrapped inside `:host { }`, except for `@media` queries.

### Correct :host Pattern (Application Components)

```scss
// ✅ CORRECT: All styles wrapped in :host
:host {
  display: block;

  // All component styles go here
  .header {
    font-weight: bold;
  }

  .content {
    padding: 1rem;
  }

  // State modifiers
  &.loading {
    opacity: 0.5;
  }
}

// ✅ CORRECT: @media queries go outside :host
@media (max-width: 768px) {
  :host {
    .content {
      padding: 0.5rem;
    }
  }
}
```

### Incorrect :host Pattern

```scss
// ❌ WRONG: Styles outside :host (will leak globally)
.header {
  font-weight: bold;
}

:host {
  display: block;
}

// ❌ WRONG: @media inside :host
:host {
  display: block;

  @media (max-width: 768px) {
    // Don't nest @media inside :host
  }
}
```

### :host Pattern Rules

**Rules for application components:**
1. **Wrap ALL styles inside `:host { }`**
2. **Exception: `@media` queries must be outside `:host`**
3. **Nest `:host` inside `@media` for responsive styles**
4. **Use default `ViewEncapsulation.Emulated`** (or omit encapsulation property)

**Example with multiple media queries:**

```scss
:host {
  display: block;
  padding: 1rem;

  .container {
    width: 100%;
  }

  .button {
    padding: 0.5rem 1rem;
  }
}

@media (min-width: 768px) {
  :host {
    padding: 1.5rem;

    .container {
      max-width: 720px;
      margin: 0 auto;
    }
  }
}

@media (min-width: 1024px) {
  :host {
    padding: 2rem;

    .container {
      max-width: 960px;
    }
  }
}
```

### Summary: When to Use Which Pattern

| Location | Encapsulation | SCSS Wrapper | Can Use :host |
|----------|--------------|--------------|---------------|
| `libs/shared/ui-design-library` | `ViewEncapsulation.None` | `.component-class { }` | ❌ No |
| `apps/*/src/app/` | Default (Emulated) | `:host { }` | ✅ Yes |

**Key takeaway:**
- UI Design Library: Use component class wrapper (`.dlc-component-name { }`)
- Application components: Use `:host { }` wrapper with `@media` outside

---

## SCSS Theme Architecture (Legacy — evolving-cognition / real-estate)

> **Legacy reference.** This section documents the **Angular-Material** theme wiring used by the legacy
> EC/RE apps. New domain apps do NOT use Material — they wire a **pure-SCSS `--<prefix>-*` token theme**
> (no `mat.theme()`); see `docs/reference/brand-theme-wiring.md`. The `includePaths` / barrel mechanics
> below are Material-agnostic and still apply to any SCSS theme lib.

### Overview

Each legacy application has a single theme entry file that wires together Angular Material theming, shared library styles, and app-specific theme variants. The entry files live in domain-specific theme libraries:

| App | Theme entry file |
|-----|-----------------|
| Evolving Cognition | `libs/evolving-cognition/themes/src/lib/styles/ec-themes.scss` |
| Real Estate | `libs/real-estate/themes/src/lib/styles/re-themes.scss` |

These files are consumed by the app's `styles.scss` and define all theme class variants (e.g. `.ec-default-theme`, `.ec-class-theme`).

---

### Resolving SCSS Imports Without Relative Paths

Relative paths like `../../../../../shared/charts/theming` are fragile and hard to read. Angular's build system supports `stylePreprocessorOptions.includePaths` in each app's `project.json`, which tells the SASS compiler where to look for unqualified `@use` paths — exactly like `tsconfig.paths` for TypeScript.

```json
// apps/evolving-cognition/app/project.json
"stylePreprocessorOptions": {
  "includePaths": [
    "libs/evolving-cognition/ui/src/lib/quiz-components",
    "libs/shared/charts",
    "libs/shared/material",
    "libs/shared/themes/src/lib/styles",
    "libs/shared/ui-design-library-deprecated/src/lib/components",
    "libs/evolving-cognition/themes/src/lib/styles",
    "node_modules/@syncfusion"
  ]
}
```

With this configuration, the theme entry file can use short, location-independent imports:

```scss
// ✅ Short path — resolved via includePaths
@use "theming" as charts;          // → libs/shared/charts/_theming.scss
@use "dlc-theming";                // → libs/shared/themes/src/lib/styles/dlc-theming.scss
@use "component-vars" as component-vars; // → libs/shared/ui-design-library-deprecated/src/lib/components/component-vars.scss
@use "ec-quiz";                    // → libs/evolving-cognition/ui/src/lib/quiz-components/ec-quiz.scss

// ❌ Avoid — brittle relative paths
@use "../../../../../shared/charts/theming" as charts;
```

**How SASS resolves the path:** for each unqualified `@use "name"`, SASS searches the `includePaths` directories in order, looking for `name.scss`, `_name.scss`, or `name/_index.scss`. The first match wins.

---

### Barrel Files (`src/index.scss`)

Each SCSS library should have a `src/index.scss` that re-exports (`@forward`s) its public SCSS API. This mirrors the TypeScript `src/index.ts` barrel pattern.

```
libs/shared/charts/src/index.scss
libs/shared/material/src/index.scss
libs/shared/ui-design-library-deprecated/src/index.scss
libs/evolving-cognition/ui/src/index.scss
```

Each barrel must contain **only `@forward` statements** — no `@use`, no mixin definitions. If a library file contains mixins, extract them to a dedicated `_theming.scss` (or similar) and forward that file from the barrel.

```scss
// libs/shared/charts/src/index.scss
@forward '../theming';

// libs/shared/material/src/index.scss
@forward '../index'; // _index.scss is itself a pure @forward barrel

// libs/shared/ui-design-library-deprecated/src/index.scss
@forward './lib/components/component-vars';

// libs/evolving-cognition/ui/src/index.scss
@forward './lib/quiz-components/ec-quiz';
```

The barrel is **not** what the theme file imports directly — theme files use the `includePaths` resolution described above to import a specific file by name. The barrel is for any consumer that imports the library at the `src/` level (e.g. if `libs/my-lib/src` were itself an includePath, `@use "index"` would load the barrel). In practice, theme files should always import via a specific, non-colliding filename — never `@use "index"` directly.

---

### Adding a New SCSS Library to a Theme

When a theme file needs to `@use` styles from a new library, follow these steps:

1. **Identify the SCSS file** inside the library (e.g. `libs/my-lib/src/lib/foo/bar.scss`)

2. **Add or update the barrel** at `libs/my-lib/src/index.scss`:
   ```scss
   @forward './lib/foo/bar';
   ```

3. **Add the includePath** to `apps/[app]/project.json` pointing to the directory that *contains* the target file:
   ```json
   "includePaths": [
     "libs/my-lib/src/lib/foo"
   ]
   ```

4. **Use the short import** in the theme entry file:
   ```scss
   @use "bar" as my-alias; // libs/my-lib/src/lib/foo/bar.scss
   ```

5. **Add an inline comment** on the `@use` line showing the resolved path (see `ec-themes.scss` for examples).

> **Rule:** The `includePath` must be a **directory**, not a file path. Point it to the directory that directly contains the target `.scss` file so the filename alone resolves the import.