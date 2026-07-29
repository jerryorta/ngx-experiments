import {
  createNgeTableFixture,
  NGE_TABLE_FIXTURE_DEFAULT_SEED,
  NGE_TABLE_FIXTURE_SIZES,
} from './nge-table-fixture';
import { NGE_TABLE_FIXTURE_COLUMNS } from './nge-table-fixture.columns';
import {
  NGE_TABLE_FIXTURE_EPOCH_MS,
  NGE_TABLE_FIXTURE_SERIES_LENGTH,
  NGE_TABLE_FIXTURE_STATUSES,
  type NgeTableFixtureRow,
} from './nge-table-fixture.models';

/**
 * `Date` serialises to an ISO string, so comparing serialised output is a literal
 * byte-for-byte comparison of the generated dataset — which is the guarantee the
 * ticket asks for, rather than the structural one `toEqual` would give.
 */
const serialize = (rows: readonly NgeTableFixtureRow[]): string => JSON.stringify(rows);

/**
 * The fields stories and specs in ARCH-239 already read.
 *
 * Asserted as a **subset**, never as an exact match. The fixture is explicitly
 * expected to grow, and an exact-match assertion would fail on precisely those
 * legitimate additions. As a subset it still fails hard on the thing that
 * actually breaks consumers: a removal or a rename.
 */
const BASELINE_KEYS = [
  'id',
  'name',
  'quantity',
  'amount',
  'createdAt',
  'isActive',
  'status',
  'owner',
  'description',
  'imageUrl',
  'series',
];

/**
 * Characters no generated string may contain.
 *
 * The CSV suite tests quoting and escaping against hand-built export shapes
 * rather than fixture rows, and says so in a comment — because no fixture value
 * forces quoting. That makes it a real invariant of this generator rather than a
 * coincidence, so it is asserted here instead of being left as prose one field
 * addition away from becoming false.
 */
const FORBIDDEN_CHARACTERS = ['"', '\n', '\r'];

/** Every string a row carries, nested ones included. */
const stringsOf = (row: NgeTableFixtureRow): readonly string[] => [
  row.description,
  row.id,
  row.imageUrl,
  row.name,
  row.owner.email,
  row.owner.id,
  row.owner.name,
  row.status,
];

describe('createNgeTableFixture', () => {
  afterEach(() => {
    jest.useRealTimers();
  });

  describe('determinism', () => {
    it('produces byte-identical output for the same seed', () => {
      const first = createNgeTableFixture({ rows: 100, seed: 2024 });
      const second = createNgeTableFixture({ rows: 100, seed: 2024 });

      expect(serialize(first)).toBe(serialize(second));
    });

    it('produces different output for a different seed', () => {
      const first = createNgeTableFixture({ rows: 100, seed: 2024 });
      const second = createNgeTableFixture({ rows: 100, seed: 2025 });

      expect(serialize(first)).not.toBe(serialize(second));
    });

    it('falls back to a fixed default seed, so two unseeded callers agree', () => {
      const implicit = createNgeTableFixture({ rows: 25 });
      const explicit = createNgeTableFixture({ rows: 25, seed: NGE_TABLE_FIXTURE_DEFAULT_SEED });

      expect(serialize(implicit)).toBe(serialize(explicit));
    });

    // The subtle way determinism dies is a `new Date()` or `Date.now()` slipping
    // into the generator: output would still look stable within a single run and
    // then drift between runs, churning story snapshots daily. Moving the system
    // clock by twelve years proves the clock is not an input at all.
    it('ignores the system clock entirely', () => {
      jest.useFakeTimers().setSystemTime(new Date('2019-03-04T05:06:07.000Z'));
      const generatedInThePast = createNgeTableFixture({ rows: 50, seed: 77 });

      jest.setSystemTime(new Date('2031-11-12T13:14:15.000Z'));
      const generatedInTheFuture = createNgeTableFixture({ rows: 50, seed: 77 });

      expect(serialize(generatedInThePast)).toBe(serialize(generatedInTheFuture));
    });
  });

  describe('sizing', () => {
    it('returns exactly the requested number of rows', () => {
      expect(createNgeTableFixture({ rows: 37 })).toHaveLength(37);
    });

    it('supports an empty dataset for the empty-state story', () => {
      expect(createNgeTableFixture({ rows: 0 })).toEqual([]);
    });

    it.each([
      ['small', 25],
      ['medium', 500],
      ['large', 10_000],
    ] as const)('generates %s at %i rows', (size, expected) => {
      expect(NGE_TABLE_FIXTURE_SIZES[size]).toBe(expected);
      expect(createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES[size] })).toHaveLength(
        expected
      );
    });

    it.each([-1, 1.5, Number.NaN])('rejects a rows value of %p', rows => {
      expect(() => createNgeTableFixture({ rows })).toThrow(RangeError);
    });
  });

  describe('row shape', () => {
    const [row] = createNgeTableFixture({ rows: 1, seed: 5 });

    it('covers every column kind the epic has to render differently', () => {
      expect(typeof row.id).toBe('string');
      expect(typeof row.name).toBe('string');
      expect(typeof row.quantity).toBe('number');
      expect(typeof row.amount).toBe('number');
      expect(row.createdAt).toBeInstanceOf(Date);
      expect(typeof row.isActive).toBe('boolean');
      expect(NGE_TABLE_FIXTURE_STATUSES).toContain(row.status);
      expect(row.owner).toEqual({
        email: expect.any(String),
        id: expect.any(String),
        name: expect.any(String),
      });
    });

    // Guards the additive-only contract — see BASELINE_KEYS above for why this is
    // a subset assertion and not an equality one.
    it('still carries every field consumers already depend on', () => {
      expect(Object.keys(row)).toEqual(expect.arrayContaining(BASELINE_KEYS));
    });

    it('carries the rich-cell fields: long text, a numeric series, and an image', () => {
      expect(typeof row.description).toBe('string');
      expect(row.description.length).toBeGreaterThan(0);
      expect(row.imageUrl.startsWith('data:image/svg+xml,')).toBe(true);
      expect(row.series).toHaveLength(NGE_TABLE_FIXTURE_SERIES_LENGTH);
      expect(row.series.every(Number.isFinite)).toBe(true);
    });

    it('holds currency to two decimal places', () => {
      const rows = createNgeTableFixture({ rows: 500 });

      expect(rows.every(({ amount }) => Number.isInteger(Math.round(amount * 100)))).toBe(true);
      expect(rows.every(({ amount }) => amount === Math.round(amount * 100) / 100)).toBe(true);
    });

    it('anchors every date inside the year following the frozen epoch', () => {
      const rows = createNgeTableFixture({ rows: 500 });
      const oneYearOn = NGE_TABLE_FIXTURE_EPOCH_MS + 366 * 86_400_000;

      expect(
        rows.every(
          ({ createdAt }) =>
            createdAt.getTime() >= NGE_TABLE_FIXTURE_EPOCH_MS && createdAt.getTime() < oneYearOn
        )
      ).toBe(true);
    });
  });

  describe('rich cell content', () => {
    // A variable-length series would make an in-cell chart's height and axis
    // domain vary per row, so the length is the contract and not an incidental
    // property of the generator.
    it('gives every series the same fixed length', () => {
      const rows = createNgeTableFixture({ rows: 500 });

      expect(rows.every(({ series }) => series.length === NGE_TABLE_FIXTURE_SERIES_LENGTH)).toBe(
        true
      );
    });

    // The shared domain is what lets two cells in the same column be read
    // against each other; a value outside it would silently rescale one row's
    // chart and make the comparison a lie.
    it('holds every series value inside the shared [0, 100] domain', () => {
      const values = createNgeTableFixture({ rows: 500 }).flatMap(({ series }) => [...series]);

      expect(values.filter(value => value < 0 || value > 100)).toEqual([]);
      expect(values.every(Number.isInteger)).toBe(true);
    });

    // A walk, not independent draws — what distinguishes them is that adjacent
    // points stay close, which is exactly what makes a sparkline read as a trend
    // rather than as noise.
    //
    // The bound is a fifth of the domain rather than the generator's own step
    // constant: it states the property (smooth) instead of restating the
    // implementation, and it still fails loudly on the regression that matters,
    // since independent draws would produce steps approaching the full 100.
    it('walks the series rather than drawing each point independently', () => {
      const rows = createNgeTableFixture({ rows: 200 });
      const steps = rows.flatMap(({ series }) =>
        series.slice(1).map((value, index) => Math.abs(value - series[index]))
      );

      expect(Math.max(...steps)).toBeLessThanOrEqual(20);
    });

    // Wide enough to need truncating at any sensible column width — that is the
    // whole reason the field exists.
    it('makes every description longer than a column can show', () => {
      const rows = createNgeTableFixture({ rows: 500 });

      expect(rows.every(({ description }) => description.length >= 100)).toBe(true);
      expect(new Set(rows.map(({ description }) => description)).size).toBeGreaterThan(1);
    });

    // `imageUrl` carries a comma as part of the `data:` scheme, which CSV handles
    // by quoting. `description` is the field a later story puts behind a column
    // (ARCH-292), so keeping it comma-free is what stops that column's export
    // from suddenly being quoted the day it lands.
    it('keeps descriptions free of the comma that would force CSV quoting', () => {
      const rows = createNgeTableFixture({ rows: 500 });

      expect(rows.filter(({ description }) => description.includes(','))).toEqual([]);
    });

    // Shared like owners, and for a sharper reason: ten thousand distinct data
    // URIs would be ten thousand image decodes in a virtualized scroll.
    it('draws image swatches from a small roster so rows share them', () => {
      const rows = createNgeTableFixture({ rows: 500 });
      const swatches = new Set(rows.map(({ imageUrl }) => imageUrl));

      expect(swatches.size).toBeGreaterThan(1);
      expect(swatches.size).toBeLessThanOrEqual(12);
    });
  });

  describe('ids', () => {
    it('are unique', () => {
      const rows = createNgeTableFixture({ rows: 1000 });

      expect(new Set(rows.map(({ id }) => id)).size).toBe(rows.length);
    });

    // Zero-padded so a story that sorts by id lexically gets generation order
    // back. Unpadded ids would put `row-10` before `row-2`.
    it('are zero-padded to a width that keeps them lexically sortable', () => {
      const rows = createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });
      const ids = rows.map(({ id }) => id);

      expect(ids[0]).toBe('row-0000');
      expect(ids[ids.length - 1]).toBe('row-9999');
      expect([...ids].sort()).toEqual(ids);
    });

    // The four-digit floor means small, medium, and large all render the same id
    // format, so a story that switches preset does not also switch how ids look.
    it('keeps one id width across every preset', () => {
      const widthOf = (rows: number) => createNgeTableFixture({ rows })[0].id.length;

      expect(widthOf(NGE_TABLE_FIXTURE_SIZES.small)).toBe(widthOf(NGE_TABLE_FIXTURE_SIZES.large));
    });

    // Past ten thousand the width has to grow, or ids stop being unique.
    it('widens past the four-digit floor when the dataset demands it', () => {
      const rows = createNgeTableFixture({ rows: 10_001 });

      expect(rows[0].id).toBe('row-00000');
      expect(rows[rows.length - 1].id).toBe('row-10000');
    });
  });

  // A per-row owner would make every group a group of one, which would render
  // grouping and aggregation stories meaningless.
  it('draws owners from a small roster so rows share them', () => {
    const rows = createNgeTableFixture({ rows: 500 });
    const ownerIds = new Set(rows.map(({ owner }) => owner.id));

    expect(ownerIds.size).toBeGreaterThan(1);
    expect(ownerIds.size).toBeLessThanOrEqual(12);
  });

  // See FORBIDDEN_CHARACTERS — this is the CSV suite's stated assumption, made
  // executable so a future field addition cannot quietly invalidate it.
  it('keeps every generated string free of a quote, a newline, or a non-ASCII character', () => {
    const values = createNgeTableFixture({ rows: 500 }).flatMap(stringsOf);

    expect(
      values.filter(value => FORBIDDEN_CHARACTERS.some(character => value.includes(character)))
    ).toEqual([]);
    expect(
      values.filter(value => [...value].some(character => character.charCodeAt(0) > 127))
    ).toEqual([]);
  });

  it('exposes columns that line up with the generated rows', () => {
    const [row] = createNgeTableFixture({ rows: 1 });
    const columnIds = NGE_TABLE_FIXTURE_COLUMNS.map(column => column.id);

    expect(new Set(columnIds).size).toBe(NGE_TABLE_FIXTURE_COLUMNS.length);
    // `owner` is reached through an accessorFn rather than a key, so it is checked
    // against the row's nested object instead of a top-level property.
    expect(columnIds.filter(id => id !== 'owner').every(id => id !== undefined && id in row)).toBe(
      true
    );
    expect(columnIds).toContain('owner');
  });

  // The fixture must not dominate story load time. The real cost is a few
  // milliseconds, so the ceiling is deliberately loose — it is here to catch a
  // pathological regression (an accidental O(n²), a crypto call), not to police
  // microseconds on a shared CI box.
  it('generates the 10,000-row preset well under a second', () => {
    const startedAt = performance.now();
    createNgeTableFixture({ rows: NGE_TABLE_FIXTURE_SIZES.large });

    expect(performance.now() - startedAt).toBeLessThan(500);
  });
});
