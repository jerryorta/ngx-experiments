---
applyTo: 'apps/*/src/app/**/*.component.ts,apps/*/src/app/**/*.component.html'
---

# Angular App Component Instructions

> **Write-time shell** (dlc-header-bar + dlc-mobile-page-content template, required `host` config) is distilled in [`../standards/app-component.md`](../standards/app-component.md) and auto-injected on write. This file adds the complete worked example.

## Overview

Components in `apps/` are **wrapper (page) components**. They should contain minimal logic and delegate to library components from `@gigasoftware/ui-design-library-deprecated` or `@gigasoftware/store`. Unless explicitly instructed otherwise, always build app components as wrappers.

## Full Example

### `my-page.component.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  DlcHeaderBarComponent,
  DlcMobilePageContentComponent,
  fadeInAnimation,
} from '@gigasoftware/ui-design-library-deprecated';
import { Store } from '@ngrx/store';

@Component({
  animations: [fadeInAnimation],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[@fadeInAnimation]': '',
    class: 're-my-page dlc-global-mobile-page',
  },
  imports: [DlcHeaderBarComponent, DlcMobilePageContentComponent],
  selector: 're-my-page',
  styleUrl: './my-page.component.scss',
  templateUrl: './my-page.component.html',
})
export class MyPageComponent {
  private readonly store = inject(Store);
}
```

### `my-page.component.html`

```html
<dlc-header-bar [noPadding]="true">
  <div class="w-full h-full flex flex-row items-center">
    <h2>My Page</h2>
    <div class="flex-auto"></div>
  </div>
</dlc-header-bar>
<dlc-mobile-page-content [overflowYScroll]="true">
  <!-- Delegate to library components -->
  <my-library-widget></my-library-widget>
</dlc-mobile-page-content>
```

### `my-page.component.scss`

```scss
:host {
  // page-specific styles if needed
}
```

## Key Rules

1. **Wrapper by default** — App components wrap library components. Keep logic in the store or library components, not in the page.
2. **Host class must match selector** — The first class in `host.class` must be the component's `selector` value.
3. **Always include `dlc-global-mobile-page`** — This class provides the standard page layout.
4. **Always include `fadeInAnimation`** — Import from `@gigasoftware/ui-design-library-deprecated` and bind via `'[@fadeInAnimation]': ''`.
5. **Use `inject()` for DI** — Never use constructor injection.
6. **Use new control flow** — `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `[ngSwitch]`.
7. **Prefer Tailwind CSS** — Use Tailwind utility classes over custom SCSS where possible.
