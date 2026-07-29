/** The drawing primitives {@link createNgeTableFixtureRandom} hands back. */
export interface NgeTableFixtureRandom {
  /** `true` with probability `trueRatio` (default `0.5`). */
  readonly bool: (trueRatio?: number) => boolean;
  /** Integer in `[min, max]` — both bounds inclusive. */
  readonly int: (min: number, max: number) => number;
  /** Next value in `[0, 1)`. */
  readonly next: () => number;
  /** A uniformly-drawn element of `values`. */
  readonly pick: <TValue>(values: readonly TValue[]) => TValue;
}

/**
 * A seeded pseudo-random generator — the reason fixture output is reproducible.
 *
 * `Math.random()` cannot be used anywhere in the fixture: it would make every
 * generated dataset unique, so story snapshots would churn on each run and a
 * failing spec could never be reproduced from its seed alone.
 *
 * The algorithm is mulberry32 — a well-known 32-bit generator chosen because it
 * is a handful of integer operations with no dependency, no state beyond a single
 * word, and a period long enough that the 10,000-row preset never revisits it.
 * Fixture data needs reproducibility and a plausible spread, not cryptographic
 * quality, and this delivers both at roughly a nanosecond per draw.
 *
 * @param seed Any integer. The same seed always replays the same sequence.
 */
export function createNgeTableFixtureRandom(seed: number): NgeTableFixtureRandom {
  // Coerced to an unsigned 32-bit word up front so negative and fractional seeds
  // are accepted rather than silently producing a degenerate sequence.
  let state = seed >>> 0;

  const next = (): number => {
    state = (state + 0x6d2b79f5) | 0;
    let drawn = Math.imul(state ^ (state >>> 15), 1 | state);
    drawn = (drawn + Math.imul(drawn ^ (drawn >>> 7), 61 | drawn)) ^ drawn;
    return ((drawn ^ (drawn >>> 14)) >>> 0) / 4_294_967_296;
  };

  const int = (min: number, max: number): number => min + Math.floor(next() * (max - min + 1));

  return {
    bool: (trueRatio = 0.5) => next() < trueRatio,
    int,
    next,
    pick: values => values[int(0, values.length - 1)],
  };
}
