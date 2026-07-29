import { createNgeTableFixtureRandom } from './nge-table-fixture.random';

const drawSequence = (seed: number, count = 50): number[] => {
  const random = createNgeTableFixtureRandom(seed);
  return Array.from({ length: count }, () => random.next());
};

describe('createNgeTableFixtureRandom', () => {
  // Reproducibility is the entire reason this exists instead of Math.random().
  // If these two go, every determinism guarantee above it goes with them.
  describe('determinism', () => {
    it('replays an identical sequence for the same seed', () => {
      expect(drawSequence(42)).toEqual(drawSequence(42));
    });

    it('produces a different sequence for a different seed', () => {
      expect(drawSequence(42)).not.toEqual(drawSequence(43));
    });

    it('keeps two generators independent rather than sharing state', () => {
      const first = createNgeTableFixtureRandom(7);
      const second = createNgeTableFixtureRandom(7);

      first.next();
      first.next();

      // `second` has been untouched, so its first draw must still be the first
      // draw of the seed — a shared module-level state word would break this.
      expect(second.next()).toBe(createNgeTableFixtureRandom(7).next());
    });
  });

  describe('next', () => {
    it('stays within [0, 1)', () => {
      const drawn = drawSequence(1, 500);

      expect(Math.min(...drawn)).toBeGreaterThanOrEqual(0);
      expect(Math.max(...drawn)).toBeLessThan(1);
    });

    it('spreads across the range rather than collapsing to one value', () => {
      const distinct = new Set(drawSequence(1, 500));

      expect(distinct.size).toBeGreaterThan(400);
    });
  });

  describe('int', () => {
    it('stays within the inclusive bounds', () => {
      const random = createNgeTableFixtureRandom(9);
      const drawn = Array.from({ length: 500 }, () => random.int(3, 7));

      expect(Math.min(...drawn)).toBeGreaterThanOrEqual(3);
      expect(Math.max(...drawn)).toBeLessThanOrEqual(7);
    });

    it('reaches both bounds — the off-by-one an exclusive max would hide', () => {
      const random = createNgeTableFixtureRandom(9);
      const drawn = new Set(Array.from({ length: 500 }, () => random.int(3, 7)));

      expect([...drawn].sort()).toEqual([3, 4, 5, 6, 7]);
    });

    it('returns the bound itself when the range is a single value', () => {
      const random = createNgeTableFixtureRandom(9);

      expect(random.int(4, 4)).toBe(4);
    });
  });

  describe('pick', () => {
    it('only ever returns members of the supplied list', () => {
      const random = createNgeTableFixtureRandom(11);
      const values = ['a', 'b', 'c'] as const;

      const drawn = Array.from({ length: 200 }, () => random.pick(values));

      expect(drawn.every(value => values.includes(value))).toBe(true);
    });

    it('reaches every member', () => {
      const random = createNgeTableFixtureRandom(11);
      const values = ['a', 'b', 'c'];

      const drawn = new Set(Array.from({ length: 200 }, () => random.pick(values)));

      expect([...drawn].sort()).toEqual(values);
    });
  });

  describe('bool', () => {
    it('is always true at a ratio of 1 and always false at 0', () => {
      const random = createNgeTableFixtureRandom(13);

      expect(Array.from({ length: 100 }, () => random.bool(1))).not.toContain(false);
      expect(Array.from({ length: 100 }, () => random.bool(0))).not.toContain(true);
    });

    it('honours the ratio approximately', () => {
      const random = createNgeTableFixtureRandom(13);
      const trueCount = Array.from({ length: 2000 }, () => random.bool(0.7)).filter(Boolean).length;

      // Wide band on purpose: this asserts the ratio is wired up at all, not that
      // the generator is statistically pristine. A narrow band would be flaky for
      // no benefit — the seed is fixed, so a real regression moves this a lot.
      expect(trueCount).toBeGreaterThan(1200);
      expect(trueCount).toBeLessThan(1600);
    });
  });
});
