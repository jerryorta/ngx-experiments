import { setupZonelessTestEnv } from 'jest-preset-angular/setup-env/zoneless';

setupZonelessTestEnv({
  errorOnUnknownElements: true,
  errorOnUnknownProperties: true,
});

// jsdom has no `ResizeObserver` — `@nge/charts`' `NgeChartComponent` constructs
// one in `ngAfterViewInit` to re-render on container resize. `@nge/charts`
// itself has no component spec that mounts `<nge-chart>`, so this gap was
// latent until the ledger-ui screens started rendering real charts. A no-op
// stub is enough — these specs don't assert on resize behavior, and the
// `typeof` guard means a real implementation (if the test env ever adds one)
// always wins.
class ResizeObserverStub {
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  observe(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  unobserve(): void {}
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  disconnect(): void {}
}

if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = ResizeObserverStub as unknown as typeof ResizeObserver;
}
