import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// jsdom has no `ResizeObserver`, and row virtualization (ARCH-245) watches the
// scroll viewport with one. `@tanstack/virtual-core` is null-safe about its
// absence — it feature-detects before observing — so specs pass either way; what
// the shim buys is that the observing path actually runs instead of being
// skipped, which is the path the browser takes. Same shape as the charts
// precedent in `libs/shared/charts/src/test-setup.ts`.
//
// ⚠️ A **consuming** library's Jest setup needs this too. Nothing here can supply
// it: `test-setup.ts` is per-project, so a consumer rendering `<nge-table>` with
// virtualization on installs its own.
if (typeof (globalThis as { ResizeObserver?: unknown }).ResizeObserver === 'undefined') {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    disconnect(): void {
      // No layout in jsdom, so nothing is ever observed and nothing is delivered.
    }
    observe(): void {
      // Deliberately silent: firing a synthetic entry would feed the virtualizer
      // a measurement jsdom never actually took.
    }
    unobserve(): void {
      // See `disconnect`.
    }
  };
}
