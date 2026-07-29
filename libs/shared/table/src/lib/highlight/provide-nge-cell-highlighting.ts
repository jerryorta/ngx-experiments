import type { Provider } from '@angular/core';

import { inject } from '@angular/core';

import type { NgeCellHighlightingOptions } from './nge-highlight-options';

import { NGE_TABLE_FEATURES, provideNgeTableFeatures } from '../features';
import { ngeCellHighlighting } from './nge-cell-highlighting';
import { createNgeHighlightBridgeFeature, NgeHighlightBridge } from './nge-highlight-bridge';
import { NGE_HIGHLIGHT_OPTIONS } from './nge-highlight-options';

/**
 * Switch cell highlighting on for one `<nge-table>`.
 *
 * ```ts
 * @Component({ providers: [provideNgeCellHighlighting()], … })
 * ```
 *
 * ```html
 * <nge-table [config]="config" [(state)]="state">
 *   <ng-template ngeTableSlot="cell-overlay" let-cell>
 *     <nge-highlight-overlay [cell]="cell" [highlight]="state().ngeHighlight" />
 *   </ng-template>
 * </nge-table>
 * ```
 *
 * Three registrations, and the split is worth understanding rather than treating as
 * boilerplate:
 *
 * - {@link ngeCellHighlighting} — the state, the cell API, and the export
 *   predicate. Registerable **on its own** through `provideNgeTableFeatures` by a
 *   consumer who wants highlighted-cell export without a rendered overlay.
 * - {@link NgeHighlightBridge} — what a projected `cell-overlay` template resolves
 *   to. It has to live in the *consumer's* injector, because that is the injector a
 *   projected `ng-template` is instantiated with.
 * - The bridge's companion feature, which hands it the engine instance.
 *
 * ⚠️ **`config.getRowId` is no longer optional.** Every mark is keyed by
 * `getRowId(row)`; without one the engine keys rows by array index, so a sort, a
 * filter, or a re-fetch moves the user's highlights onto different records. Bind
 * `state` too — the marks live there, and a table with no `state` binding has
 * nowhere to keep them across a rebuild.
 *
 * Put this on the component that hosts the table, never in an application's root
 * providers: highlighting is per-table, exactly as `NgeTableStore` is.
 */
export function provideNgeCellHighlighting(options: NgeCellHighlightingOptions = {}): Provider[] {
  return [
    NgeHighlightBridge,
    { provide: NGE_HIGHLIGHT_OPTIONS, useValue: { clearOnEscape: options.clearOnEscape ?? true } },
    ...provideNgeTableFeatures(ngeCellHighlighting),
    {
      multi: true,
      provide: NGE_TABLE_FEATURES,
      useFactory: () => createNgeHighlightBridgeFeature(inject(NgeHighlightBridge)),
    },
  ];
}
