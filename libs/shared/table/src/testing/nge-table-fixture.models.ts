/**
 * The status values the fixture's enum column cycles through.
 *
 * Four rather than two: the boolean column already covers the binary case, so
 * this one earns its place by exercising what a status column is actually for —
 * multi-value grouping, faceted filtering, and per-value cell styling.
 */
export const NGE_TABLE_FIXTURE_STATUSES = ['active', 'pending', 'archived', 'failed'] as const;

/** One of {@link NGE_TABLE_FIXTURE_STATUSES}. */
export type NgeTableFixtureStatus = (typeof NGE_TABLE_FIXTURE_STATUSES)[number];

/**
 * The nested object carried by every fixture row.
 *
 * Its job is to be *nested*. A column reading `owner.name` cannot use
 * `accessorKey` and has to go through an `accessorFn`, so keeping one of these in
 * the fixture means every story exercises the accessor-function path rather than
 * only the flat-key one.
 *
 * Owners are drawn from a small fixed roster, so the same owner recurs across
 * many rows — that is what makes grouping and aggregation stories meaningful
 * instead of producing one group per row.
 */
export interface NgeTableFixtureOwner {
  readonly email: string;
  readonly id: string;
  readonly name: string;
}

/**
 * One generated row, spanning the column kinds a table has to render
 * differently: text, a right-aligned integer, currency, a date, a boolean, an
 * enum, a nested object, and — for the rich-cell wave — long text, a numeric
 * series, and an image.
 *
 * **Additive only.** Never repurpose or remove an existing field: every story
 * and spec in the epic reads this shape. `nge-table-fixture.spec.ts` enforces
 * exactly that asymmetry — it fails on a removal or a rename, and lets
 * additions through untouched.
 *
 * ⚠️ Every string here is plain ASCII and holds **no quote, newline, or comma**.
 * That is a property the CSV suite builds on: it tests quoting and escaping
 * against hand-built export shapes precisely because no fixture value forces
 * them, so a value that did would change what the CSV-over-a-real-table tests
 * are measuring. The fixture spec asserts it directly.
 */
export interface NgeTableFixtureRow {
  /** Currency in major units, 2dp. Formatting is the cell's job, not the fixture's. */
  readonly amount: number;
  readonly createdAt: Date;
  /**
   * Long free text — the overflow / ellipsis case, and an editing target that
   * is not `name`. Long enough to need truncating at an ordinary column width.
   */
  readonly description: string;
  /** Stable identity, zero-padded so lexical order matches generation order. */
  readonly id: string;
  /**
   * A `data:` swatch, so an image cell renders with no network and no CSP
   * exception. Drawn from a small roster, so rows share URLs the way they share
   * owners and a browser decodes a handful of images rather than one per row.
   */
  readonly imageUrl: string;
  readonly isActive: boolean;
  readonly name: string;
  readonly owner: NgeTableFixtureOwner;
  /** Plain integer — the right-aligned numeric case. */
  readonly quantity: number;
  /**
   * The in-cell chart source: {@link NGE_TABLE_FIXTURE_SERIES_LENGTH} values in
   * `[0, 100]`, walked rather than drawn independently so a sparkline shows a
   * trend instead of noise.
   */
  readonly series: readonly number[];
  readonly status: NgeTableFixtureStatus;
}

/** Arguments to {@link createNgeTableFixture}. */
export interface NgeTableFixtureOptions {
  /** How many rows to generate. `NGE_TABLE_FIXTURE_SIZES` holds the presets. */
  readonly rows: number;
  /** Same seed produces the same rows. Defaults to `NGE_TABLE_FIXTURE_DEFAULT_SEED`. */
  readonly seed?: number;
}

/**
 * The instant every generated `createdAt` is measured forward from —
 * 2026-01-01T00:00:00Z.
 *
 * The generator must never call `new Date()` or `Date.now()`. Either would make
 * output depend on *when* it ran, quietly destroying the determinism the fixture
 * exists to provide: story snapshots would churn daily, and a spec could pass
 * locally and fail in CI an hour later. Offsetting from a frozen anchor keeps
 * the dates realistic without that cost.
 */
export const NGE_TABLE_FIXTURE_EPOCH_MS = Date.UTC(2026, 0, 1);

/**
 * How many points every {@link NgeTableFixtureRow.series} carries — twelve, a
 * sparkline's worth.
 *
 * Fixed rather than drawn, and that is the load-bearing half. A per-row length
 * would make an in-cell chart's axis domain and height vary row to row, so two
 * cells in the same column could not be read against each other and a
 * virtualized row's height would depend on its data. The values are bounded to
 * `[0, 100]` for the same reason: a shared domain is what makes the column
 * comparable down its length.
 */
export const NGE_TABLE_FIXTURE_SERIES_LENGTH = 12;
