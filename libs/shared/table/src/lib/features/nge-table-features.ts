import type { Provider } from '@angular/core';
import type { TableFeature } from '@tanstack/angular-table';

import { InjectionToken } from '@angular/core';

import { ngeTableExportFeature } from '../export';

/**
 * The features this library registers on every table of its own accord.
 *
 * Ordinary `TableFeature` objects, appended to the engine's fourteen built-ins by
 * `buildTableOptions`. Nothing about them is privileged — an addon supplied
 * through {@link provideNgeTableFeatures} arrives in the same array by the same
 * route, which is the property the extensibility gate (ARCH-250 / ARCH-251) exists
 * to verify.
 */
export const NGE_TABLE_CORE_FEATURES: readonly TableFeature[] = [ngeTableExportFeature];

/**
 * Addon `TableFeature`s for one `<nge-table>` — extension axis 1 of 4.
 *
 * A multi-provider token rather than a config field, and the reason is a hard
 * engine constraint rather than taste. `createTable` reads `options._features`
 * **once**, when the instance is constructed
 * (`table-core/src/core/table.ts` → `[...builtInFeatures, ...(options._features ?? [])]`),
 * and `@tanstack/angular-table` builds that instance from a `queueMicrotask`
 * scheduled as soon as the store exists — at which point `<nge-table>` has not yet
 * run the effect that pushes `config` in, so `store.config()` is still `null`. A
 * `config.features` field would therefore register nothing at all, silently, and
 * would look like the addon being broken rather than the wiring.
 *
 * Dependency injection has no such window: the token resolves during the store's
 * construction, before the engine instance can exist. It is also the honest
 * modelling — a feature is a capability granted to this table, like the store
 * itself, not data handed to it.
 */
export const NGE_TABLE_FEATURES = new InjectionToken<readonly TableFeature[]>(
  'NGE_TABLE_FEATURES'
);

/**
 * Register addon `TableFeature`s on the `<nge-table>` being provided.
 *
 * ```ts
 * @Component({ providers: [provideNgeTableFeatures(ngeCellHighlighting)], … })
 * ```
 *
 * Put it on the component that hosts the table, never in an application's root
 * providers — features are per-table, exactly as `NgeTableStore` is per-table.
 * Multiple calls accumulate, so a wrapper component can add one without displacing
 * whatever its caller registered.
 */
export function provideNgeTableFeatures(...features: TableFeature[]): Provider[] {
  return features.map(feature => ({
    multi: true,
    provide: NGE_TABLE_FEATURES,
    useValue: feature,
  }));
}
