Verify and AUTO-FIX theming for the file: $ARGUMENTS

This skill is for shared and non-MW domain files.
For Media Workbench files (`libs/media-workbench/` or `apps/media-workbench/`) use `/verify-theming-mw` instead.

## Phase 1: Analysis

1. Read the file specified
2. If the file is an HTML template (\*.html), also read the associated:
   - TypeScript component file (\*.component.ts) - check for `host` property classes and inline `template` with color classes
   - SCSS file (\*.component.scss or \*.scss) - check for hardcoded color values
3. Read the theming documentation at `docs/ai-instructions/legacy/theming.md`
4. Read the sample color tokens:
   - Dark theme: `libs/shared/ui-design-library-deprecated/src/lib/themes/theming/sample-color-tokens-dark.scss`
   - Light theme: `libs/shared/ui-design-library-deprecated/src/lib/themes/theming/sample-color-tokens-light.scss`
5. Analyze all related files for:
   - Hardcoded Tailwind colors (e.g., `text-gray-500`, `bg-blue-600`, `border-red-400`)
   - Inline color styles (e.g., `style="color: #fff"`, `[style.color]="'red'"`)
   - CSS color values that should use theme tokens (e.g., `color: #333`, `background: rgba(0,0,0,0.5)`)
   - Host classes in component decorator that contain color classes
   - Inline templates in component decorator with color classes
   - Console.log statements that should be removed
6. Identify SCSS styles that should be migrated to Tailwind:
   - Colors: `color`, `background-color`, `border-color` → Tailwind with theme tokens (e.g., `text-(--mat-sys-primary)`)
   - Typography: `font-size`, `font-weight`, `text-transform`, `letter-spacing` → Tailwind utilities
   - Layout: `display`, `flex-direction`, `gap`, `padding`, `margin` → Tailwind utilities
   - Sizing: `width`, `height` → Tailwind utilities (e.g., `w-full`, `h-[240px]`)
   - Keep in SCSS only: Material component deep selectors, CSS custom property definitions, pseudo-elements
7. Verify CSS class usage (both directions):
   a. SCSS → HTML: For any CSS classes defined in SCSS files, verify they are actually used in the template
   b. HTML → SCSS: For any BEM-style CSS classes used in HTML, verify they are defined
   - Report any unused CSS classes (defined but not used) that could be removed
   - Report any undefined CSS classes (used but not defined) that should be removed from HTML
8. For each color found:
   - Identify if it should be replaced with a Material theme token
   - Map the appropriate `--mat-sys-*` token based on hue, lightness, and purpose
9. Skip utility theme classes listed in the theming docs (e.g., `re-default-condensed-theme`)
10. Check for Angular signal function calls in the HTML template:
    - Look for patterns like `signalName()` being called directly in the template
    - Signals should be declared at the top of the template using `@let` syntax: `@let _signalName = signalName();`
    - All references throughout the template should use the `@let` variable
    - Report any signal function calls that should use `@let` variables

## Phase 1b: File Structure Check

Before applying theming fixes, check the component's file structure:

1. If the component `.ts` file uses inline `template:` or `styles:` (instead of `templateUrl` and `styleUrl`), **split it into separate files first**:
   - Extract the inline `template` string → `[component-name].component.html`
   - Extract the inline `styles` string → `[component-name].component.scss`
   - Update the `.ts` file to use `templateUrl` and `styleUrl` pointing to the new files
   - Ensure the SCSS content is wrapped in the component's host class (e.g., `.dlc-component-name { ... }`) per UI Design Library conventions
2. This applies to ALL components (library and application)
3. See `libs/shared/ui-design-library/COMPONENT-ARCHITECTURE-BEST-PRACTICES.md` for the required file structure

## Phase 2: Auto-Fix (Safe Changes)

After analysis, AUTOMATICALLY APPLY these fixes without asking:

### Always auto-fix:

- **Hardcoded Tailwind colors** → Replace with theme token equivalents (e.g., `text-gray-500` → `text-(--mat-sys-on-surface-variant)`)
- **Signal @let declarations** → Add `@let` at top of template and replace all `signalName()` calls with `_signalName`
- **Console.log removal** → Delete console.log/warn/error statements
- **Inline color styles** → Replace with theme token Tailwind classes
- **Unused CSS classes** → Remove from SCSS
- **Undefined CSS classes** → Remove from HTML
- **Simple SCSS → Tailwind migrations** where the mapping is unambiguous:
  - `font-weight: 600` → `font-semibold`
  - `display: flex; flex-direction: column` → `flex flex-col`
  - `gap: 8px` → `gap-2`
  - `padding: 16px` → `p-4`
  - Color properties using `var(--mat-sys-*)` → corresponding Tailwind class

### Do NOT auto-fix (report only):

- Ambiguous color token mappings (multiple possible tokens)
- Material component deep selectors in SCSS
- Complex layout refactors where the Tailwind equivalent isn't clear
- `color="warn"` or `color="primary"` on Material components (M3 migration is context-dependent)
- CSS custom property definitions
- Pseudo-elements

## Phase 3: Report

After applying fixes, output a summary:

## Theming Verification: [filename]

### Files Analyzed

- [list all files checked]

### 🔧 Auto-Fixed

- [file:line] `[before]` → `[after]` (reason)

### ⚠️ Needs Manual Review

- [file:line] `[current]` → `[suggested]` (why it wasn't auto-fixed)

### ✅ Correctly Themed (no changes needed)

- [list items already using proper theme tokens]

### ℹ️ Exceptions

- [any utility classes or intentional custom colors]

## Phase 4: Accessibility Check

After completing theming verification, also run `/verify-accessibility` on the same file to check for missing `aria-label` and `data-testid` attributes.

<!-- Phase 5: Wake Event (disabled)
After completing all fixes and generating the report, send the results to Koda:

```bash
openclaw gateway wake --text "verify-theming complete for [filename]: [N] auto-fixed, [M] need manual review. [brief summary of manual items if any]" --mode now
```

This ensures Koda can review manual items and address them in the current PR cycle.
-->
