import type { ColumnDef } from '@tanstack/angular-table';

/**
 * A column definition, as consumers of this library see it.
 *
 * Structurally this **is** TanStack's `ColumnDef` — the alias exists so that
 * `@tanstack/*` never appears in a consumer's import statements. That insulation
 * is what keeps a future TanStack v9 migration internal to this library: the day
 * the underlying type moves or changes shape, this one line absorbs it and no
 * consumer file is touched.
 *
 * Aliasing is deliberately not the same as re-namespacing. TanStack's own
 * interfaces (`Table`, `Column`, `Row`, `Cell`, `Header`, `TableFeature`) are
 * used as-is inside the library; only the surface consumers touch is renamed.
 *
 * The type is imported from `@tanstack/angular-table` rather than
 * `@tanstack/table-core` because the adapter re-exports the core wholesale and is
 * the package this workspace actually declares — `table-core` is present only as
 * the adapter's transitive dependency. It must stay an `import type`: the adapter
 * ships no CommonJS `main`, so a value import would fail to resolve under the
 * spec tsconfig's `node10` module resolution.
 *
 * `NgeTableConfig` (ARCH-242) builds on top of this.
 */
export type NgeTableColumn<TRow, TValue = unknown> = ColumnDef<TRow, TValue>;
