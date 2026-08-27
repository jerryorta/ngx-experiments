---
applyTo: 'apps/*/src/app/**/*.component.ts,apps/*/src/app/**/*.component.html'
title: App page component shell
---

App page components are thin WRAPPERS — delegate to the design library + store; keep logic out of the page.

Compose the page from **the domain's OWN design library**, `libs/<domain>/design-library`
(`@nge/<domain>-design-library`, selector prefix `cg-` / `gy-` / `cog-` / `mw-` / `nge-` / `jo-`).
There is no cross-domain page shell — match the app you are writing in:

| Domain | Page shell |
|---|---|
| got-you | `<gy-page-content>` body; the shell supplies `<gy-header-bar>` |
| cognition | `<cog-page-heading>` title inside a `<cog-top-bar>` / `<cog-bottom-bar>` / `<cog-nav-sidebar>` shell |
| concierge | plain elements under the shell's `<cg-nav-sidebar>` + `<cg-breadcrumb>` |
| media-workbench / nge-marketing / jerryorta | the page's own markup over `--mw-*` / `--nge-*` / `--jo-*` tokens |

Required `host` config — when the component sets a host class, the first class MUST equal the `selector`:

```ts
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: '<prefix>-my-page' },
})
```

**Legacy — evolving-cognition and real-estate only.** Those apps' pages wrap
`<dlc-header-bar>` + `<dlc-mobile-page-content>` and add the `dlc-global-mobile-page` host
class and `fadeInAnimation`, all from `@nge/ui-design-library-deprecated`. That
library is deprecated: edit those pages in place, never import it into anything new.
