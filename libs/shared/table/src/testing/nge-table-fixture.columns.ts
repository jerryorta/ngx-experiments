import type { NgeTableColumn } from '../lib/nge-table-column';
import type { NgeTableFixtureRow } from './nge-table-fixture.models';

/**
 * Column definitions matching {@link NgeTableFixtureRow} — one per column kind a
 * table has to render differently.
 *
 * Shipped alongside the row generator so a story never has to restate the shape
 * of the shared dataset; it imports the rows and these together and gets a
 * working table.
 *
 * Every column carries an explicit `id`. TanStack would derive one from
 * `accessorKey`, but column state (order, sizing, visibility, pinning) is keyed by
 * id and lives *outside* the table instance under the controlled-state contract —
 * so a derived id would silently invalidate persisted state the moment an
 * accessor changed.
 *
 * The owner column is the reason the fixture carries a nested object: `owner.name`
 * cannot be reached with `accessorKey`, so this entry keeps the `accessorFn` path
 * exercised by every story that uses the defaults.
 *
 * Two columns declare `meta.ngeExport.format` (ARCH-248) — the currency one and
 * the date one, which are exactly the two kinds whose exported text should differ
 * from their raw value. The other five fall back to `String(value)`, which is the
 * right answer for them and keeps the default path exercised too.
 */
export const NGE_TABLE_FIXTURE_COLUMNS: NgeTableColumn<NgeTableFixtureRow>[] = [
  { accessorKey: 'name', header: 'Name', id: 'name' },
  { accessorKey: 'status', header: 'Status', id: 'status' },
  { accessorKey: 'quantity', header: 'Quantity', id: 'quantity' },
  {
    accessorKey: 'amount',
    header: 'Amount',
    id: 'amount',
    meta: { ngeExport: { format: value => formatFixtureCurrency(value) } },
  },
  {
    accessorKey: 'createdAt',
    header: 'Created',
    id: 'createdAt',
    meta: { ngeExport: { format: value => formatFixtureDate(value) } },
  },
  { accessorKey: 'isActive', header: 'Active', id: 'isActive' },
  { accessorFn: row => row.owner.name, header: 'Owner', id: 'owner' },
];

/**
 * `1234.5` → `$1,234.50`.
 *
 * Fixed to `en-US` / `USD` rather than the ambient locale, for the same reason the
 * row generator is seeded and its dates are offset from a frozen epoch: a spec
 * asserting on formatted output has to produce the same bytes on every machine.
 */
function formatFixtureCurrency(value: unknown): string {
  return typeof value === 'number'
    ? value.toLocaleString('en-US', { currency: 'USD', style: 'currency' })
    : '';
}

/** A `Date` → `2026-01-01`. The date part of the ISO string, so it is stable and sortable. */
function formatFixtureDate(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : '';
}
