import type { Provider } from '@angular/core';

import { inject } from '@angular/core';

import type { NgeCellRangeOptions } from './nge-range-options';

import { NGE_TABLE_FEATURES, provideNgeTableFeatures } from '../features';
import { ngeCellFill } from './nge-cell-fill';
import { ngeCellRange } from './nge-cell-range';
import { createNgeRangeBridgeFeature, NgeRangeBridge } from './nge-range-bridge';
import { NGE_RANGE_DEFAULT_OPTIONS, NGE_RANGE_OPTIONS } from './nge-range-options';

/**
 * Switch cell range selection on for one `<nge-table>`.
 *
 * ```ts
 * @Component({ providers: [provideNgeCellRange()], … })
 * ```
 *
 * ```html
 * <nge-table [config]="config" [(state)]="state">
 *   <ng-template ngeTableSlot="cell-overlay" let-cell>
 *     <nge-range-overlay [cell]="cell" [state]="state()" />
 *   </ng-template>
 *   <!-- Optional: selecting whole columns from the header (ARCH-270). -->
 *   <ng-template ngeTableSlot="header-overlay" let-header>
 *     <nge-range-column-handle [header]="header" [state]="state()" />
 *   </ng-template>
 * </nge-table>
 * ```
 *
 * Three registrations, and the split is worth understanding rather than treating as
 * boilerplate:
 *
 * - {@link ngeCellRange} — the state, the cell API, and the export predicate.
 *   Registerable **on its own** through `provideNgeTableFeatures` by a consumer who
 *   wants range-narrowed export without a gesture or a rendered selection.
 * - {@link NgeRangeBridge} — what a projected `cell-overlay` template resolves to,
 *   and what owns the pointer gesture. It has to live in the *consumer's* injector,
 *   because that is the injector a projected `ng-template` is instantiated with.
 * - The bridge's companion feature, which hands it the engine instance.
 *
 * ⚠️ **The overlay is not optional if the gesture is wanted.** It stamps the
 * `data-nge-range-cell` attribute every hit-test reads, and it is what hands the
 * bridge the table's root element. A table that provides this but projects no
 * overlay has state and export composition and no pointer behaviour at all.
 *
 * **`<nge-range-column-handle>` is independently optional** (ARCH-270). Project it
 * into `header-overlay` for column selection, or leave it out for cell ranges alone;
 * it binds its own listeners rather than riding the delegated root, so neither
 * template needs the other. Both write the same slice, which is why a selected column
 * paints, exports, and clears through everything already wired above.
 *
 * ⚠️ **`config.getRowId` is no longer optional.** Every rectangle is keyed by
 * `getRowId(row)`; without one the engine keys rows by array index, so a sort, a
 * filter, or a re-fetch moves the user's selection onto different records — and the
 * first write throws in dev rather than degrading. Bind `state` too — the
 * rectangles live there, and a table with no `state` binding has nowhere to keep
 * them across a rebuild.
 *
 * Put this on the component that hosts the table, never in an application's root
 * providers: a range is per-table, exactly as `NgeTableStore` is. ⚠️ **A component
 * rendering several range-enabled tables needs one provider scope each** — one
 * injector means one bridge, and the last table to attach wins.
 */
export function provideNgeCellRange(options: NgeCellRangeOptions = {}): Provider[] {
  return [
    NgeRangeBridge,
    {
      provide: NGE_RANGE_OPTIONS,
      // Per key rather than a spread over the defaults, so an explicitly passed
      // `undefined` — which a host building options from a config object produces
      // routinely — falls back instead of clobbering.
      useValue: {
        autoScrollSpeed: options.autoScrollSpeed ?? NGE_RANGE_DEFAULT_OPTIONS.autoScrollSpeed,
        autoScrollThreshold:
          options.autoScrollThreshold ?? NGE_RANGE_DEFAULT_OPTIONS.autoScrollThreshold,
        clearOnEscape: options.clearOnEscape ?? NGE_RANGE_DEFAULT_OPTIONS.clearOnEscape,
        selectAllOnModifierA:
          options.selectAllOnModifierA ?? NGE_RANGE_DEFAULT_OPTIONS.selectAllOnModifierA,
        selectColumnOnModifierSpace:
          options.selectColumnOnModifierSpace ??
          NGE_RANGE_DEFAULT_OPTIONS.selectColumnOnModifierSpace,
      },
    },
    // ⚠️ `ngeCellFill` registers unconditionally, and it is inert until a
    // `<nge-fill-handle>` is projected — a table with no handle has no gesture that
    // can set a fill target, so the slice stays `null` and the feature costs two
    // no-op methods on the instance. Gating it behind an option would mean a consumer
    // who projects the handle and forgets the flag gets a grip that does nothing.
    ...provideNgeTableFeatures(ngeCellRange, ngeCellFill),
    {
      multi: true,
      provide: NGE_TABLE_FEATURES,
      useFactory: () => createNgeRangeBridgeFeature(inject(NgeRangeBridge)),
    },
  ];
}
