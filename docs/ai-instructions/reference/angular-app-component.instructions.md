---
applyTo: 'apps/*/src/app/**/*.component.ts,apps/*/src/app/**/*.component.html'
---

# Angular App Component Instructions

> **Write-time shell** (per-domain page shell + required `host` config) is distilled in [`../standards/app-component.md`](../standards/app-component.md) and auto-injected on write. This file adds the complete worked examples.

## Overview

Components in `apps/` are **wrapper (page) components**. They contain minimal logic and delegate to the domain's own design-library components and to a store. Unless explicitly instructed otherwise, always build app components as wrappers.

Which library they delegate to depends on the domain:

| Domain | Design library | Page shell |
|---|---|---|
| concierge | `@nge/concierge-design-library` (`cg-`) | plain elements under the shell's `<cg-nav-sidebar>` + `<cg-breadcrumb>` |
| got-you | `@nge/got-you-design-library` (`gy-`) | `<gy-page-content>` body; the shell supplies `<gy-header-bar>` |
| cognition | `@nge/cognition-design-library` (`cog-`) | `<cog-page-heading>` inside a `<cog-top-bar>` / `<cog-bottom-bar>` / `<cog-nav-sidebar>` shell |
| media-workbench | `@nge/media-workbench/design-library` (`mw-`) | the page's own markup over `--mw-*` tokens |
| nge-marketing | `@nge/nge-marketing-design-library` (`nge-`) | the page's own markup over `--nge-*` tokens |
| jerryorta | `@nge/jerryorta-design-library` (`jo-`) | `<jo-site-header>` + `<jo-site-footer>` site chrome |
| evolving-cognition, real-estate | **legacy** — `@nge/ui-design-library-deprecated` (`dlc-`) | `<dlc-header-bar>` + `<dlc-mobile-page-content>` |

Promote a component to `libs/shared/ui-design-library` (`dlc-` prefix) only when two apps need it; never reach into `@nge/ui-design-library-deprecated` from a domain that is not evolving-cognition or real-estate.

## Full Example

### `my-page.component.ts`

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { MwPanelComponent } from '@nge/media-workbench/design-library';

import { MyPageStore } from './my-page.store';

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'mw-my-page' },
  imports: [MwPanelComponent],
  providers: [MyPageStore],
  selector: 'mw-my-page',
  styleUrl: './my-page.component.scss',
  templateUrl: './my-page.component.html',
})
export class MyPageComponent {
  protected readonly store = inject(MyPageStore);
}
```

### `my-page.component.html`

```html
<h1 class="mw-my-page__title">My Page</h1>
<mw-panel>
  <!-- Delegate to design-library components -->
</mw-panel>
```

### `my-page.component.scss`

```scss
:host {
  // page-specific styles if needed
}
```

## Key Rules

1. **Wrapper by default** — App components wrap design-library components. Keep reactive state in a colocated component-scoped SignalStore and domain data in the global store; keep both out of the page class.
2. **Host class must match selector** — When the component sets a host class, its first class is the component's `selector` value.
3. **Use `inject()` for DI** — Never use constructor injection.
4. **Use new control flow** — `@if`, `@for`, `@switch` instead of `*ngIf`, `*ngFor`, `[ngSwitch]`.
5. **Prefer Tailwind CSS** — Use Tailwind utility classes over custom SCSS where possible.
6. **Stay inside the domain** — Import from the app's own `libs/<domain>/design-library` and `libs/<domain>/ui`; `@nge/ui-design-library-deprecated` is off-limits outside evolving-cognition and real-estate.

## Legacy shell — evolving-cognition and real-estate only

Those two apps' pages predate the per-domain design libraries and wrap every page in the deprecated shared shell. Edit such a page in place; do not port the shape to a new app.

```typescript
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  DlcHeaderBarComponent,
  DlcMobilePageContentComponent,
  fadeInAnimation,
} from '@nge/ui-design-library-deprecated';
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

```html
<dlc-header-bar [noPadding]="true">
  <div class="w-full h-full flex flex-row items-center">
    <h2>My Page</h2>
    <div class="flex-auto"></div>
  </div>
</dlc-header-bar>
<dlc-mobile-page-content [overflowYScroll]="true">
  <my-library-widget></my-library-widget>
</dlc-mobile-page-content>
```

In that shell the `dlc-global-mobile-page` host class supplies the standard page layout and `fadeInAnimation` the route transition — both come from the deprecated library, and both belong only to these two apps.
