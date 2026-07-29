import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

// jsdom has no ResizeObserver, and `<nge-chart>` observes its container — the shim
// `docs/architecture/charts.md` § Testing under Jest prescribes for consumer libs.
// Guarded so a future jsdom that ships one wins.
if (!('ResizeObserver' in globalThis)) {
  (globalThis as { ResizeObserver?: unknown }).ResizeObserver = class {
    disconnect(): void {
      // no-op
    }
    observe(): void {
      // no-op
    }
    unobserve(): void {
      // no-op
    }
  };
}

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});
