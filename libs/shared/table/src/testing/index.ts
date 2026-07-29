/**
 * `@nge/table/testing` — the shared dataset every NgeTable story and
 * spec draws from.
 *
 * Deliberately a **secondary** entry point. The fixture is a public API of the
 * library, not of the product: keeping a 10,000-row generator out of
 * `@nge/table` stops demo data from being one autocomplete away in
 * application code, and leaves the main barrel describing only what ships.
 */
export * from './nge-scroll-benchmark';
export * from './nge-table-fixture';
export * from './nge-table-fixture.columns';
export * from './nge-table-fixture.models';
export * from './nge-table-fixture.random';
