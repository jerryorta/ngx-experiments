import {
  NGE_TABLE_FIXTURE_EPOCH_MS,
  NGE_TABLE_FIXTURE_SERIES_LENGTH,
  NGE_TABLE_FIXTURE_STATUSES,
  type NgeTableFixtureOptions,
  type NgeTableFixtureOwner,
  type NgeTableFixtureRow,
} from './nge-table-fixture.models';
import {
  createNgeTableFixtureRandom,
  type NgeTableFixtureRandom,
} from './nge-table-fixture.random';

/**
 * Row counts the epic's stories actually need, named for the thing they prove.
 *
 * They are exported as data rather than wrapped in preset functions so the
 * fixture keeps a single entry point:
 * `createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large })`.
 */
export const NGE_TABLE_FIXTURE_SIZES = {
  /** Virtualization (ARCH-245) — the count the windowing has to survive. */
  large: 10_000,
  /** Pagination, sorting, and grouping stories — more rows than fit on a screen. */
  medium: 500,
  /** Layout, pinning, and resize stories — small enough to eyeball in full. */
  small: 25,
} as const;

/** A key of {@link NGE_TABLE_FIXTURE_SIZES}. */
export type NgeTableFixtureSize = keyof typeof NGE_TABLE_FIXTURE_SIZES;

/**
 * Used when a caller supplies no seed, so two stories that both just want "some
 * rows" show the same rows and a reviewer can compare them directly.
 */
export const NGE_TABLE_FIXTURE_DEFAULT_SEED = 20_260_101;

/**
 * How many distinct owners the roster holds.
 *
 * Far fewer than the row count on purpose: owners have to repeat for grouping and
 * aggregation stories to have anything to group, and a per-row owner would make
 * every group a group of one.
 */
const OWNER_ROSTER_SIZE = 12;

const MS_PER_DAY = 86_400_000;

const FIRST_NAMES = [
  'Ada',
  'Bo',
  'Chidi',
  'Dara',
  'Eli',
  'Fen',
  'Gita',
  'Hugo',
  'Ines',
  'Jae',
  'Kai',
  'Lena',
];

const LAST_NAMES = [
  'Ahmed',
  'Barros',
  'Chen',
  'Duarte',
  'Eriksen',
  'Fournier',
  'Gallo',
  'Haddad',
  'Ivanov',
  'Jensen',
];

// Two banks combined rather than one list of finished names: 11 × 12 gives 132
// distinct labels from 23 entries, so `name` stays varied enough to sort and
// filter against without a wall of literals.
const PRODUCT_ADJECTIVES = [
  'Adaptive',
  'Composite',
  'Distributed',
  'Layered',
  'Modular',
  'Nested',
  'Parallel',
  'Resilient',
  'Streaming',
  'Unified',
  'Vectorized',
];

const PRODUCT_NOUNS = [
  'Analyzer',
  'Bridge',
  'Cluster',
  'Dispatcher',
  'Gateway',
  'Indexer',
  'Ledger',
  'Pipeline',
  'Registry',
  'Scheduler',
  'Transform',
  'Workspace',
];

// Four banks rather than a list of finished sentences: 10 × 6 × 5 × 5 gives 1,500
// distinct descriptions from 26 entries, each 105–136 characters — past the width
// of any sensible column, which is what makes them the overflow / ellipsis case.
//
// ⚠️ Every entry is plain ASCII with no quote, no newline and no comma. The CSV
// suite tests quoting against hand-built export shapes precisely because no
// fixture value forces it, and `description` is the field a later story will put
// behind a column (ARCH-292). A comma here would start quoting that column's
// output the day it lands.
const DESCRIPTION_VERBS = [
  'Aggregates',
  'Buffers',
  'Consolidates',
  'Materializes',
  'Normalizes',
  'Partitions',
  'Rebalances',
  'Reconciles',
  'Replicates',
  'Serializes',
];

const DESCRIPTION_SUBJECTS = [
  'cross-region audit records',
  'downstream settlement events',
  'inbound telemetry batches',
  'partitioned session metrics',
  'regional inventory deltas',
  'upstream ledger traffic',
];

const DESCRIPTION_CONTEXTS = [
  'across the shared gateway tier',
  'between the primary and standby clusters',
  'inside the tenant isolation boundary',
  'over the long-lived replication channel',
  'through the regional dispatch fabric',
];

const DESCRIPTION_QUALIFIERS = [
  'and retries whatever the acknowledgement window drops',
  'before the nightly compaction window opens',
  'so downstream consumers observe one ordered stream',
  'while preserving per-tenant ordering guarantees',
  'without holding a lock on the originating partition',
];

/** The bounds every {@link NgeTableFixtureRow.series} value is clamped into. */
const SERIES_MIN = 0;
const SERIES_MAX = 100;

/**
 * The largest move between two adjacent series points.
 *
 * A walk rather than independent draws is what makes a sparkline show a trend;
 * capping the step is what stops the walk pinning itself to a bound and going
 * flat, which would render as a straight line in every cell.
 */
const SERIES_MAX_STEP = 14;

/**
 * The palette behind {@link NgeTableFixtureRow.imageUrl}.
 *
 * Hex without the `#`, which the data URI carries percent-encoded as `%23`.
 */
const IMAGE_SWATCH_COLORS = [
  '17becf',
  '1f77b4',
  '2ca02c',
  '4c78a8',
  '7f7f7f',
  '8c564b',
  '9467bd',
  'bcbd22',
  'd62728',
  'e377c2',
  'f58518',
  'ff7f0e',
];

/**
 * A fixed roster of `data:` swatches, one per palette entry.
 *
 * `data:` rather than a URL, so an image cell renders offline, needs no CSP
 * exception, and never shows a broken-image icon in a story. Fully
 * percent-encoded — including the attribute quotes as `%27` — so the value holds
 * no quote character of its own.
 *
 * Built from a literal palette rather than from the seeded stream on purpose:
 * consuming no draws here keeps the owner roster, which is generated from the
 * same stream, byte-identical across this change. Rows then *share* these twelve
 * strings, so ten thousand rows cost twelve string allocations and a browser
 * decodes twelve images rather than ten thousand.
 */
const IMAGE_SWATCHES = IMAGE_SWATCH_COLORS.map(
  color =>
    `data:image/svg+xml,%3Csvg%20xmlns=%27http://www.w3.org/2000/svg%27%20viewBox=%270%200%201%201%27%3E%3Crect%20width=%271%27%20height=%271%27%20fill=%27%23${color}%27/%3E%3C/svg%3E`
);

/**
 * Builds one row's numeric series as a bounded random walk.
 *
 * Each point steps from the one before it by at most {@link SERIES_MAX_STEP} and
 * is clamped into `[{@link SERIES_MIN}, {@link SERIES_MAX}]`. Independent draws
 * would give every cell the same noise; the walk gives each row a shape, and the
 * shared bounds keep the column readable down its length.
 *
 * The opening value starts a fifth of the way inside each bound so a walk has
 * room to move in both directions from the outset.
 */
function createSeries(random: NgeTableFixtureRandom): number[] {
  const inset = (SERIES_MAX - SERIES_MIN) / 5;
  const series = [random.int(SERIES_MIN + inset, SERIES_MAX - inset)];

  for (let point = 1; point < NGE_TABLE_FIXTURE_SERIES_LENGTH; point += 1) {
    const stepped = series[point - 1] + random.int(-SERIES_MAX_STEP, SERIES_MAX_STEP);

    series.push(Math.min(SERIES_MAX, Math.max(SERIES_MIN, stepped)));
  }

  return series;
}

/** Assembles one long sentence from the four description banks. */
function createDescription(random: NgeTableFixtureRandom): string {
  return [
    random.pick(DESCRIPTION_VERBS),
    random.pick(DESCRIPTION_SUBJECTS),
    random.pick(DESCRIPTION_CONTEXTS),
    `${random.pick(DESCRIPTION_QUALIFIERS)}.`,
  ].join(' ');
}

/**
 * Builds the fixed owner roster every row draws from. Generated from the same
 * seeded stream as the rows, so the roster is reproducible too.
 */
function createOwnerRoster(random: NgeTableFixtureRandom): readonly NgeTableFixtureOwner[] {
  return Array.from({ length: OWNER_ROSTER_SIZE }, (_unused, index) => {
    const firstName = random.pick(FIRST_NAMES);
    const lastName = random.pick(LAST_NAMES);

    return {
      email: `${firstName}.${lastName}@example.com`.toLowerCase(),
      id: `owner-${String(index).padStart(2, '0')}`,
      name: `${firstName} ${lastName}`,
    };
  });
}

/**
 * Generates the shared dataset every NgeTable story and spec draws from.
 *
 * A chart story is cheap because a chart is one config object; a table story
 * needs rows, and the virtualization story needs ten thousand of them. Having one
 * generator instead of per-story row arrays is what keeps the column set
 * consistent across the epic — and what makes a story reproducible from its seed.
 *
 * Output is fully deterministic: the same `seed` always yields byte-identical
 * rows, including the dates, which are offset from a frozen epoch rather than
 * from the current clock.
 *
 * @throws RangeError when `rows` is not a non-negative integer — a typo in a story
 *   should fail loudly rather than quietly render an empty table.
 */
export function createNgeTableFixture({
  rows,
  seed = NGE_TABLE_FIXTURE_DEFAULT_SEED,
}: NgeTableFixtureOptions): NgeTableFixtureRow[] {
  if (!Number.isInteger(rows) || rows < 0) {
    throw new RangeError(
      `createNgeTableFixture: \`rows\` must be a non-negative integer, received ${rows}`
    );
  }

  const random = createNgeTableFixtureRandom(seed);
  const owners = createOwnerRoster(random);
  // Width is derived, not hard-coded, so ids stay lexically sortable at every
  // preset size instead of only at the one that happened to be tested.
  const idWidth = Math.max(4, String(Math.max(rows - 1, 0)).length);

  // ⚠️ Property order here is draw order, and lint keeps it alphabetical — so
  // inserting a field re-rolls every field below it. That is the shape contract
  // holding while the values move, and it is why nothing may assert a golden
  // fixture value.
  return Array.from({ length: rows }, (_unused, index) => ({
    // Drawn in cents and divided, so the value is exactly representable to 2dp
    // rather than carrying float noise a currency cell would have to hide.
    amount: random.int(0, 250_000) / 100,
    createdAt: new Date(
      NGE_TABLE_FIXTURE_EPOCH_MS + random.int(0, 364) * MS_PER_DAY + random.int(0, 86_399) * 1000
    ),
    description: createDescription(random),
    id: `row-${String(index).padStart(idWidth, '0')}`,
    imageUrl: random.pick(IMAGE_SWATCHES),
    isActive: random.bool(0.7),
    name: `${random.pick(PRODUCT_ADJECTIVES)} ${random.pick(PRODUCT_NOUNS)}`,
    owner: random.pick(owners),
    quantity: random.int(1, 500),
    series: createSeries(random),
    status: random.pick(NGE_TABLE_FIXTURE_STATUSES),
  }));
}
