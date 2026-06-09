---
name: verify-accessibility
description: Verify and auto-fix accessibility selectors (aria-label, data-testid) for Playwright compatibility on the file or directory: $ARGUMENTS
---

Verify and AUTO-FIX accessibility selectors for: $ARGUMENTS

## Phase 1: Analysis

1. Determine the target:
   - If `$ARGUMENTS` is an HTML file, analyze that file
   - If `$ARGUMENTS` is a `.ts` component file, find and analyze its associated `.html` template
   - If `$ARGUMENTS` is a directory, find all `*.component.html` files recursively
2. Read the convention doc: `docs/ai-instructions/accessibility-selectors.instructions.md`
3. For each HTML template, identify:

### Missing `aria-label` (interactive elements)

- **Icon-only buttons**: `<button>` with `mat-icon-button`, `dlc-rounded-icon-button`, `dlc-square-icon-button`, or similar directive containing only a `<mat-icon>` child and no visible text
- **Icon-only text-icon buttons**: `<button>` with `dlc-rounded-text-icon-button` where the only text is whitespace or `&nbsp;`
- **Button toggle groups**: `<mat-button-toggle-group>` without `aria-label`
- **Overlay triggers**: Icon-only buttons with `cdkOverlayOrigin` or `[matMenuTriggerFor]` that lack `aria-label`
- **Inputs without labels**: `<input>` elements not inside a `<mat-form-field>` with `<mat-label>`, and lacking `aria-label`

Skip elements that already have `aria-label`, `[aria-label]`, or `[attr.aria-label]`.

### Missing `data-testid` (structural containers)

- **Top-level wrapper divs**: The outermost `<div>` with a component-specific class (e.g., `class="lead-list-container"`)
- **Form containers**: `<form>` elements
- **Sidenav/drawer containers**: `<mat-sidenav>`, `<mat-sidenav-container>`, `<dlc-resizable-drawer>`
- **Dialog content wrappers**: Root divs in dialog templates
- **List/table wrappers**: Container divs around `<table mat-table>` or list components

Skip elements that already have `data-testid`.

## Phase 2: Auto-Fix (Safe Changes)

After analysis, AUTOMATICALLY APPLY these fixes without asking:

### Always auto-fix:

- **Icon-only buttons with clear purpose**: Add `aria-label` based on the icon name and surrounding context:
  - `close` icon → `aria-label="Close [context]"` (e.g., "Close dialog", "Close preview")
  - `delete` icon → `aria-label="Delete [context]"` (e.g., "Delete file", "Delete item")
  - `edit` icon → `aria-label="Edit [context]"`
  - `download` icon → `aria-label="Download [context]"`
  - `save` icon → `aria-label="Save [context]"`
  - `add` / `remove` icons → `aria-label="Zoom in"` / `"Zoom out"` or contextual equivalent
  - `undo` / `redo` icons → `aria-label="Undo [context]"` / `"Redo [context]"`
  - `filter_list` icon → `aria-label="Toggle filter menu"`
  - `arrow_back` icon → `aria-label="Go back"` or `"Back to [context]"`
  - `visibility` icon → `aria-label="View [context]"`
  - `archive` icon → `aria-label="Archive [context]"`
  - `content_copy` icon → `aria-label="Copy [context]"`
- **Button toggle groups**: Add `aria-label` based on the toggle options (e.g., "Filter by file type")
- **Missing `data-testid` on structural containers**: Add based on the element's class name or component context, using kebab-case
- **Match `matTooltip`**: If a `matTooltip` exists on the element, use its text as the `aria-label` value

### Do NOT auto-fix (report only):

- Elements where the correct label text is ambiguous (multiple plausible labels)
- Dynamic contexts where a static `aria-label` wouldn't be correct (suggest `[attr.aria-label]` pattern instead)
- Elements inside `@for` loops where the label should include item-specific context

## Phase 3: Report

After applying fixes, output a summary:

## Accessibility Verification: [filename or directory]

### Files Analyzed
- [list all HTML files checked]

### Auto-Fixed
- [file:line] Added `aria-label="[value]"` on `<button mat-icon-button>` (icon-only [icon-name] button)
- [file:line] Added `data-testid="[value]"` on `<div class="[class]">` (structural container)

### Needs Manual Review
- [file:line] Icon-only button with `[icon-name]` — context ambiguous, suggest: `aria-label="[suggestion]"`
- [file:line] Button in `@for` loop — suggest: `[attr.aria-label]="'[action] ' + item.name"`

### Already Compliant
- [count] elements already have `aria-label`
- [count] containers already have `data-testid`
