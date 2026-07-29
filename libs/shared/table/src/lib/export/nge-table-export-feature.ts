import type { RowData, TableFeature } from '@tanstack/angular-table';

import type { NgeTableExportData, NgeTableExportOptions } from './nge-table-export';

import { toNgeTableExportData } from './nge-table-export';

declare module '@tanstack/table-core' {
  interface Table<TData extends RowData> {
    /**
     * Read the table as neutral export data (ARCH-248).
     *
     * See {@link toNgeTableExportData} for what it returns and why. Present on
     * every `<nge-table>` instance because {@link ngeTableExportFeature} is one
     * of `NGE_TABLE_CORE_FEATURES`.
     */
    readNgeExportData: (options?: NgeTableExportOptions<TData>) => NgeTableExportData;
  }
}

/**
 * The export seam, as an ordinary `TableFeature` (extension axis 1 of 4).
 *
 * It is registered exactly the way an addon is — through `_features`, alongside
 * the engine's fourteen built-ins, with no privileged status
 * (`table-core/src/core/table.ts` composes `[...builtInFeatures, ...options._features]`).
 * That is deliberate: the library's own seam going through the addon path is what
 * proves the path works before ARCH-250 bets the extensibility gate on it.
 *
 * Putting the reader on the **instance** rather than leaving it as a bare function
 * is what makes two independent addons compose. ARCH-251's formatter and ARCH-250's
 * highlighting both hold the table; neither imports the other.
 *
 * ⚠️ **The name must not begin with `get`.** `@tanstack/angular-table` proxies the
 * instance and converts every `get*` accessor into a computed
 * (`angular-table/src/proxy.ts`). A zero-arity `get*` becomes a `Signal`, which
 * would silently swallow the options argument; a higher-arity one is cached by
 * `JSON.stringify(args)`, and a function serialises to `{}` — so two different
 * `cellPredicate`s would collide on one cache key and the second caller would
 * receive the first one's rows. A non-`get` name skips both paths: the proxy caches
 * the raw closure once, and that closure reads the real table object, which
 * `setOptions` mutates in place, so it always sees current state.
 */
export const ngeTableExportFeature: TableFeature = {
  createTable: table => {
    table.readNgeExportData = options => toNgeTableExportData(table, options);
  },
};
