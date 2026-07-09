---
applyTo: 'apps/*/src/app/**/*.component.ts,apps/*/src/app/**/*.component.html'
title: App page component shell
---

App page components are thin WRAPPERS — delegate to design-library + store; keep logic out of the page.

Template shell (header optional):

```html
<dlc-header-bar [noPadding]="true">
  <div class="w-full h-full flex flex-row items-center"><!-- title / actions --></div>
</dlc-header-bar>
<dlc-mobile-page-content [overflowYScroll]="true"><!-- library components --></dlc-mobile-page-content>
```

Required `host` config — first class MUST equal the `selector`, then `dlc-global-mobile-page`:

```ts
@Component({
  animations: [fadeInAnimation],            // from @gigasoftware/ui-design-library-deprecated
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { '[@fadeInAnimation]': '', class: 're-my-page dlc-global-mobile-page' },
})
```
