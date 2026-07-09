---
applyTo: '**/*.component.html'
---

# Accessibility Selectors Convention

> **Write-time rules** (aria-label / data-testid required-on lists, naming, locator priority) are distilled in [`../standards/a11y.md`](../standards/a11y.md) and auto-injected on write. This file adds the worked HTML examples and verification steps.

Stable selectors for Playwright browser automation and screen reader accessibility.

## Strategy

- `aria-label` on interactive elements — serves both accessibility and Playwright (`getByRole`, `getByLabel`)
- `data-testid` only on non-semantic containers that can't be targeted by role or label

## aria-label Rules

### Syntax

Use static `aria-label` when the label is fixed. Use `[attr.aria-label]` when dynamic.

```html
<!-- Static: icon-only close button -->
<button mat-icon-button aria-label="Close dialog">
  <mat-icon>close</mat-icon>
</button>

<!-- Static: icon-only action in a table row -->
<button mat-icon-button aria-label="Delete file">
  <mat-icon>delete</mat-icon>
</button>

<!-- Static: button toggle group -->
<mat-button-toggle-group aria-label="Filter by file type">
  <mat-button-toggle value="all">All</mat-button-toggle>
  <mat-button-toggle value="images">Images</mat-button-toggle>
</mat-button-toggle-group>

<!-- Static: overlay trigger -->
<button mat-icon-button aria-label="Toggle filter menu">
  <mat-icon>filter_list</mat-icon>
</button>

<!-- Dynamic: label depends on context -->
<button mat-icon-button [attr.aria-label]="'Remove ' + item.name">
  <mat-icon>close</mat-icon>
</button>

<!-- Dynamic: label from signal -->
@let _fileName = fileName();
<button mat-icon-button [attr.aria-label]="'Download ' + _fileName">
  <mat-icon>download</mat-icon>
</button>
```

### Label Writing Guidelines

- Use imperative verbs: "Close dialog", "Save CMA analysis", "Delete file"
- Be specific to context: "Archive lead" not just "Archive"
- Keep concise: 2-4 words typical
- Match the `matTooltip` text when one exists (or use it as a starting point)

## data-testid Rules

```html
<!-- App-level structural containers -->
<div class="app-layout" data-testid="app-layout">
<mat-sidenav-container data-testid="sidenav-container">
<mat-sidenav data-testid="sidenav-left">
<dlc-resizable-drawer data-testid="sidenav-right-drawer">

<!-- Page-level containers -->
<div class="lead-list-container" data-testid="lead-list-container">
<div class="sticky-header-wrapper" data-testid="lead-list-header">
<div class="table-container" data-testid="lead-list-table">

<!-- Form containers -->
<form class="access-form" data-testid="access-gate-form">

<!-- Shared component containers -->
<div class="media-gallery-container" data-testid="media-gallery">
<div class="dlc-input-media__container" data-testid="media-input-container">
<div class="dlc-mobile-page-content--container" data-testid="mobile-page-content">

<!-- Dialog containers -->
<div class="dlc-update-available-dialog" data-testid="update-available-dialog">
<div class="dlc-media-preview-dialog-header" data-testid="media-preview-dialog">
```

## Verification

After adding attributes, verify with:

```bash
# Build to check for template errors
npm run b.prod.app.re.com

# Spot-check with playwright-cli
playwright-cli open http://localhost:4200 --headed
playwright-cli snapshot
# Confirm elements appear with their aria-labels in the snapshot
```
