Verify and AUTO-FIX theming for the Media Workbench file: $ARGUMENTS

This skill is for Media Workbench files only (`libs/media-workbench/` or `apps/media-workbench/`).

## Phase 1: Analysis

1. Read the file specified
2. If the file is an HTML template (\*.html), also read the associated:
   - TypeScript component file (\*.component.ts) — check for `host` property classes and inline `template` with color classes
   - SCSS file (\*.component.scss or \*.scss) — check for hardcoded color values and SCSS that can be migrated to Tailwind
3. Read the MW theme documentation:
   - Token contract (canonical): `libs/media-workbench/themes/src/lib/styles/_mw-tokens.scss`
   - Contributor guide: `libs/media-workbench/themes/AGENTS.md`
   - Dark theme values: `libs/media-workbench/themes/src/lib/styles/mw/_mw-dark.scss`
   - Light theme values: `libs/media-workbench/themes/src/lib/styles/mw/_mw-light.scss`
4. Reference the MW UI design library at `libs/media-workbench/ui-design-library/src/lib` for component patterns
5. Analyze all related files for:
   - Hardcoded color values (hex, rgb, rgba, named colors) that should use `--mw-*` tokens
   - Inline color styles (e.g., `style="color: #fff"`, `[style.color]="'red'"`)
   - `--mat-sys-*` references — wrong token system for MW
   - Host classes or inline templates with hardcoded color classes
   - Console.log statements that should be removed
6. Identify SCSS styles that can be migrated to Tailwind on the HTML element:
   - **Colors**: `color`, `background-color`, `border-color` → Tailwind with `--mw-*` tokens (e.g., `text-(--mw-on-surface)`, `bg-(--mw-surface)`, `border-(--mw-outline)`)
   - **Typography**: `font-size`, `font-weight`, `letter-spacing`, `text-transform`, `font-family` → Tailwind utilities (e.g., `text-xs`, `font-medium`, `tracking-widest`, `uppercase`, `font-[family-name:var(--mw-font-family)]`)
   - **Layout**: `display`, `flex-direction`, `align-items`, `justify-content`, `gap`, `flex`, `flex-shrink` → Tailwind utilities (e.g., `flex`, `flex-col`, `items-center`, `justify-between`, `gap-2`, `flex-1`, `shrink-0`)
   - **Spacing**: `padding`, `margin` → Tailwind utilities (e.g., `p-3`, `px-2`, `py-1.5`, `mt-1`)
   - **Sizing**: `width`, `height`, `min-width` → Tailwind utilities (e.g., `w-full`, `h-6`, `w-[300px]`, `min-w-0`)
   - **Borders**: `border`, `border-radius`, `overflow` → Tailwind utilities (e.g., `border`, `rounded-sm`, `overflow-hidden`)
   - **Position**: `position`, `inset`, `z-index`, `top`, `right` → Tailwind utilities (e.g., `absolute`, `fixed`, `inset-0`, `z-[101]`, `top-full`, `right-0`)
   - **Cursor**: `cursor` → Tailwind utility (e.g., `cursor-pointer`, `cursor-default`)
   - **Misc**: `outline`, `white-space`, `text-overflow` → Tailwind utilities (e.g., `outline-none`, `whitespace-nowrap`, `truncate`)
7. Verify `--mw-*` token usage:
   - **Primary/accent**: `var(--mw-primary)`, `var(--mw-primary-container)`, `var(--mw-on-primary)`
   - **Surfaces**: `var(--mw-surface)`, `var(--mw-surface-container)`, `var(--mw-surface-container-high)`, `var(--mw-surface-container-low)`
   - **Text**: `var(--mw-on-surface)`, `var(--mw-on-surface-variant)`
   - **Borders**: `var(--mw-outline)`, `var(--mw-outline-variant)`
   - **Semantic**: `var(--mw-error)`, `var(--mw-success)`, `var(--mw-warning)` (and their `on-*` counterparts)
   - **Typography**: `var(--mw-font-family)`, `var(--mw-font-weight-regular/medium/bold)`
   - **Shape**: `var(--mw-radius-sm)`, `var(--mw-radius-md)`, `var(--mw-radius-lg)`
   - **Motion**: `var(--mw-transition-duration)` — used as `transition: <property> var(--mw-transition-duration) ease` (note: `--mw-transition` shorthand does NOT exist; flag any usages of it)
8. Verify CSS class usage (both directions):
   a. SCSS → HTML: For any CSS classes defined in SCSS, verify they are used in the template
   b. HTML → SCSS: For any BEM-style CSS classes used in HTML, verify they are defined
   - Report unused CSS classes (defined but not used)
   - Report undefined CSS classes (used but not defined)
9. Check for Angular signal function calls in the HTML template:
   - Look for patterns like `signalName()` being called directly in the template
   - Signals should be declared at the top of the template using `@let` syntax: `@let _signalName = signalName();`
   - All references throughout the template should use the `@let` variable

## Phase 1b: File Structure Check

Before applying fixes, check the component's file structure:

1. If the component `.ts` file uses inline `template:` or `styles:` (instead of `templateUrl` and `styleUrl`), **split it into separate files first**:
   - Extract the inline `template` string → `[component-name].component.html`
   - Extract the inline `styles` string → `[component-name].component.scss`
   - Update the `.ts` file to use `templateUrl` and `styleUrl` pointing to the new files
   - Wrap SCSS in the component's BEM host class (e.g., `.mw-component-name { ... }`)
2. MW components use `ViewEncapsulation.None` and BEM SCSS — NEVER `:host`

## Phase 2: Auto-Fix (Safe Changes)

After analysis, AUTOMATICALLY APPLY these fixes without asking:

- **Hardcoded hex/rgb colors in SCSS** → Replace with the appropriate `var(--mw-*)` token
- **`--mat-sys-*` references** → Replace with the equivalent `--mw-*` token
- **Inline color styles** → Replace with Tailwind using `--mw-*` tokens
- **Signal @let declarations** → Add `@let` at top of template and replace all `signalName()` calls with `_signalName`
- **Console.log removal** → Delete console.log/warn/error statements
- **Undefined CSS classes** → Remove from HTML
- **SCSS → Tailwind migration** where the mapping is unambiguous:
  - Move color, typography, layout, spacing, sizing, border, position, cursor, and misc properties from SCSS into Tailwind classes on the HTML element
  - After migrating all properties out of a SCSS rule, delete the empty rule
  - After migrating all rules out of a BEM block, remove the BEM class from the HTML element and delete the SCSS block entirely
  - Keep the SCSS file if any rules remain; delete it only if it becomes completely empty
  - Use CSS custom property Tailwind syntax for `--mw-*` tokens: `text-(--mw-on-surface)`, `bg-(--mw-surface)`, `border-(--mw-outline)`, `transition-[color]`, etc.
  - For `border-radius` using `var(--mw-radius-sm/md/lg)`: use `rounded-[var(--mw-radius-sm)]` etc.
  - For `transition`: use `transition-[color,border-color]` + `duration-[var(--mw-transition-duration)]` + `ease-[ease]`
  - For `font-family`: use `font-[family-name:var(--mw-font-family)]`
- **`--mw-transition` shorthand** → Replace with `var(--mw-transition-duration) ease`
- **Unused CSS classes** → Remove from SCSS (after Tailwind migration removes all consumers)

### Do NOT auto-fix (report only):

- Ambiguous token mappings (e.g., a gray that could be `--mw-on-surface-variant` or `--mw-outline`)
- CSS custom property definitions (intentional overrides)
- `::placeholder`, `::before`, `::after`, `:focus-within`, `:hover` pseudo-selectors — keep in SCSS
- Material component deep selectors
- Complex layout refactors where the Tailwind equivalent isn't clear
- Nested child selectors (e.g., `.mw-component &__child`) that can't be expressed as flat Tailwind

## Phase 3: Report

After applying fixes, output a summary:

## MW Theming Verification: [filename]

### Files Analyzed

- [list all files checked]

### 🔧 Auto-Fixed

- [file:line] `[before]` → `[after]` (reason)

### ⚠️ Needs Manual Review

- [file:line] `[current]` → `[suggested]` (why it wasn't auto-fixed)

### ✅ Correctly Themed (no changes needed)

- [list items already using proper `--mw-*` tokens or Tailwind]

### ℹ️ Exceptions

- [any intentional custom values kept in SCSS]

## Phase 4: Accessibility Check

After completing theming verification, also run `/verify-accessibility` on the same file to check for missing `aria-label` and `data-testid` attributes.
