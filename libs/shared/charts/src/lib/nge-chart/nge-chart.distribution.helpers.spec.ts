import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeDistributionDataPoint,
  NgeDistributionLayerConfig,
} from '../core/config';

import {
  computeBoxStats,
  computeDodgeOffsets,
  computeJitterOffsets,
  computeKde,
  createDistributionChartScalesFactory,
  hashSeed,
  silvermanBandwidth,
} from './nge-chart.distribution.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Symmetric-around-5 sample (mean 5, sample σ = √(32/7)); a lone high outlier at 9. */
const SYMMETRIC = [2, 4, 4, 4, 5, 5, 7, 9];

/** Symmetric-around-10 unimodal sample (triple mode at 10). */
const UNIMODAL = [6, 8, 9, 10, 10, 10, 11, 12, 14];

/** Two categories with distinct value spreads for the scale-factory tests. */
const SCALE_DATA: NgeDistributionDataPoint[] = [
  { category: 'A', values: [10, 20, 30] },
  { category: 'B', values: [5, 15, 25] },
];

/** Build a minimal single-distribution-layer chart config for the scale factory. */
function distributionConfig(
  data: NgeDistributionDataPoint[],
  overrides?: Partial<NgeDistributionLayerConfig>
): NgeChartConfig {
  const layer: NgeDistributionLayerConfig = {
    data,
    renderer: () => undefined,
    type: 'distribution',
    ...overrides,
  };
  return { layers: [layer] };
}

/** Assert no two markers overlap: any pair within one diameter on the position axis
 *  must keep a Euclidean center distance of at least `2·radius`. */
function assertNoOverlap(positions: number[], offsets: number[], radius: number): void {
  const minDistSq = (2 * radius) ** 2;
  for (let i = 0; i < positions.length; i++) {
    for (let j = i + 1; j < positions.length; j++) {
      const deltaPos = positions[i] - positions[j];
      if (Math.abs(deltaPos) >= 2 * radius) {
        continue;
      }
      const deltaOff = offsets[i] - offsets[j];
      expect(deltaPos * deltaPos + deltaOff * deltaOff).toBeGreaterThanOrEqual(minDistSq - 1e-6);
    }
  }
}

describe('computeBoxStats', () => {
  it('returns null for no observations', () => {
    expect(computeBoxStats([])).toBeNull();
  });

  it('collapses every quartile onto the value for a single observation', () => {
    const stats = computeBoxStats([42]);
    if (stats === null) {
      throw new Error('expected non-null stats');
    }

    expect(stats.count).toBe(1);
    expect([stats.min, stats.q1, stats.median, stats.q3, stats.max]).toEqual([42, 42, 42, 42, 42]);
    expect(stats.iqr).toBe(0);
    expect(stats.stdDev).toBe(0);
    expect(stats.stdErr).toBe(0);
    expect(stats.whiskerLow).toBe(42);
    expect(stats.whiskerHigh).toBe(42);
    expect(stats.outliers).toEqual([]);
  });

  it('has zero spread and no outliers when all values are equal', () => {
    const stats = computeBoxStats([5, 5, 5]);
    if (stats === null) {
      throw new Error('expected non-null stats');
    }

    expect(stats.iqr).toBe(0);
    expect(stats.stdDev).toBe(0);
    expect(stats.whiskerLow).toBe(5);
    expect(stats.whiskerHigh).toBe(5);
    expect(stats.outliers).toEqual([]);
  });

  it('computes quartiles and flags a Tukey-fence outlier (iqr, the default)', () => {
    // [1..9, 100]: q1 3.25, median 5.5, q3 7.75, IQR 4.5, upper fence 14.5 → 100 is
    // an outlier and the upper whisker retreats to the in-fence max (9).
    const stats = computeBoxStats([1, 2, 3, 4, 5, 6, 7, 8, 9, 100]);
    if (stats === null) {
      throw new Error('expected non-null stats');
    }

    expect(stats.q1).toBeCloseTo(3.25, 6);
    expect(stats.median).toBeCloseTo(5.5, 6);
    expect(stats.q3).toBeCloseTo(7.75, 6);
    expect(stats.iqr).toBeCloseTo(4.5, 6);
    expect(stats.min).toBe(1);
    expect(stats.max).toBe(100);
    expect(stats.whiskerLow).toBe(1);
    expect(stats.whiskerHigh).toBe(9);
    expect(stats.outliers).toEqual([100]);
  });

  it('fits the sample mean and (n-1) standard deviation', () => {
    const stats = computeBoxStats(SYMMETRIC);
    if (stats === null) {
      throw new Error('expected non-null stats');
    }

    expect(stats.mean).toBeCloseTo(5, 6);
    expect(stats.stdDev).toBeCloseTo(Math.sqrt(32 / 7), 6);
    expect(stats.stdErr).toBeCloseTo(stats.stdDev / Math.sqrt(stats.count), 6);
  });

  it('sets whiskers to the data min/max with no outliers (minmax)', () => {
    const stats = computeBoxStats(SYMMETRIC, 'minmax');
    if (stats === null) {
      throw new Error('expected non-null stats');
    }

    expect(stats.whiskerLow).toBe(2);
    expect(stats.whiskerHigh).toBe(9);
    expect(stats.outliers).toEqual([]);
  });

  it('sets whiskers to mean ± stdDev (stddev)', () => {
    const stats = computeBoxStats(SYMMETRIC, 'stddev');
    if (stats === null) {
      throw new Error('expected non-null stats');
    }

    expect(stats.whiskerLow).toBeCloseTo(stats.mean - stats.stdDev, 6);
    expect(stats.whiskerHigh).toBeCloseTo(stats.mean + stats.stdDev, 6);
    expect(stats.outliers).toEqual([]);
  });

  it('sets whiskers to mean ± stdErr (stderr)', () => {
    const stats = computeBoxStats(SYMMETRIC, 'stderr');
    if (stats === null) {
      throw new Error('expected non-null stats');
    }

    expect(stats.whiskerLow).toBeCloseTo(stats.mean - stats.stdErr, 6);
    expect(stats.whiskerHigh).toBeCloseTo(stats.mean + stats.stdErr, 6);
    expect(stats.outliers).toEqual([]);
  });
});

describe('computeKde', () => {
  it('returns an empty estimate for fewer than two observations', () => {
    expect(computeKde([])).toEqual([]);
    expect(computeKde([5])).toEqual([]);
  });

  it('returns an empty estimate for a non-positive bandwidth', () => {
    expect(computeKde([1, 2, 3, 4], { bandwidth: 0 })).toEqual([]);
    expect(computeKde([1, 2, 3, 4], { bandwidth: -1 })).toEqual([]);
  });

  it('peaks near the mode of a symmetric unimodal sample', () => {
    const curve = computeKde(UNIMODAL, { kernel: 'gaussian' });
    const peak = curve.reduce((best, point) => (point.density > best.density ? point : best));

    expect(curve.length).toBeGreaterThan(0);
    expect(Math.abs(peak.value - 10)).toBeLessThan(1);
  });

  it('samples `resolution` points spanning the value extent', () => {
    const curve = computeKde(UNIMODAL, { resolution: 20 });

    expect(curve).toHaveLength(20);
    expect(curve[0].value).toBeCloseTo(6, 6);
    expect(curve[19].value).toBeCloseTo(14, 6);
  });

  it('honours an explicit domain override', () => {
    const curve = computeKde(UNIMODAL, { bandwidth: 5, domain: [0, 100], resolution: 11 });

    expect(curve[0].value).toBeCloseTo(0, 6);
    expect(curve[10].value).toBeCloseTo(100, 6);
  });

  it('estimates a non-empty density for a modal spike (IQR 0 but σ > 0)', () => {
    expect(computeKde([1, 1, 1, 1, 9]).length).toBeGreaterThan(0);
  });
});

describe('silvermanBandwidth', () => {
  it('returns 0 for a degenerate sample (all values equal)', () => {
    expect(silvermanBandwidth([5, 5, 5])).toBe(0);
  });

  it('returns 0 for fewer than two observations', () => {
    expect(silvermanBandwidth([])).toBe(0);
    expect(silvermanBandwidth([7])).toBe(0);
  });

  it('applies 0.9 · min(σ, IQR/1.34) · n^(-1/5)', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    const sd = Math.sqrt(60 / 8);
    const expected = 0.9 * Math.min(sd, 4 / 1.34) * Math.pow(9, -1 / 5);

    expect(silvermanBandwidth(values)).toBeCloseTo(expected, 10);
  });

  it('falls back to σ for a modal spike (IQR 0 but σ > 0)', () => {
    expect(silvermanBandwidth([1, 1, 1, 1, 9])).toBeGreaterThan(0);
  });
});

describe('computeDodgeOffsets', () => {
  it('returns all-zero offsets for a non-positive radius', () => {
    expect(computeDodgeOffsets([1, 2, 3], 0)).toEqual([0, 0, 0]);
  });

  it('leaves a single point on the axis', () => {
    expect(computeDodgeOffsets([5], 3)).toEqual([0]);
  });

  it('keeps stacked (same-position) markers at least one diameter apart', () => {
    const positions = [10, 10, 10, 10, 10];
    const radius = 3;
    const offsets = computeDodgeOffsets(positions, radius);

    expect(offsets).toHaveLength(positions.length);
    assertNoOverlap(positions, offsets, radius);
  });

  it('packs mixed positions without overlap', () => {
    const positions = [0, 1, 2, 0.5, 1.5, 1, 0];
    const radius = 3;
    const offsets = computeDodgeOffsets(positions, radius);

    expect(offsets).toHaveLength(positions.length);
    assertNoOverlap(positions, offsets, radius);
  });

  it('is deterministic — identical input yields identical output', () => {
    const positions = [0, 1, 2, 0.5, 1.5, 1, 0];
    expect(computeDodgeOffsets(positions, 3)).toEqual(computeDodgeOffsets(positions, 3));
  });
});

describe('computeJitterOffsets', () => {
  it('produces the requested count of offsets', () => {
    expect(computeJitterOffsets(7, 2, 1)).toHaveLength(7);
  });

  it('keeps every offset within ±width/2', () => {
    const offsets = computeJitterOffsets(200, 4, 99);
    for (const offset of offsets) {
      expect(Math.abs(offset)).toBeLessThanOrEqual(2);
    }
  });

  it('is deterministic for a given seed', () => {
    expect(computeJitterOffsets(10, 4, 123)).toEqual(computeJitterOffsets(10, 4, 123));
  });

  it('produces a different sequence for a different seed', () => {
    expect(computeJitterOffsets(10, 4, 1)).not.toEqual(computeJitterOffsets(10, 4, 2));
  });
});

describe('hashSeed', () => {
  it('is stable for the same string', () => {
    expect(hashSeed('Widget A')).toBe(hashSeed('Widget A'));
  });

  it('differs for different strings', () => {
    expect(hashSeed('a')).not.toBe(hashSeed('b'));
  });

  it('returns an unsigned 32-bit integer', () => {
    const hash = hashSeed('any category');

    expect(Number.isInteger(hash)).toBe(true);
    expect(hash).toBeGreaterThanOrEqual(0);
    expect(hash).toBeLessThanOrEqual(0xffffffff);
  });
});

describe('createDistributionChartScalesFactory', () => {
  it('puts categories on the band x-axis and values on the linear y-axis (vertical)', () => {
    const scales = createDistributionChartScalesFactory({ orientation: 'vertical' })(
      distributionConfig(SCALE_DATA),
      DIMENSIONS
    );

    expect(scales.x.domain()).toEqual(['A', 'B']);
    expect(scales.x.range()).toEqual([0, 500]);
    expect((scales.x as { bandwidth?: () => number }).bandwidth).toBeDefined();
    expect((scales.y as { bandwidth?: () => number }).bandwidth).toBeUndefined();

    // Value extent [5, 30] padded ~8% each side.
    const [yLo, yHi] = scales.y.domain() as [number, number];
    expect(yLo).toBeCloseTo(3, 6);
    expect(yHi).toBeCloseTo(32, 6);
    expect(scales.y.range()).toEqual([300, 0]);
  });

  it('puts values on the linear x-axis and categories on the band y-axis (horizontal)', () => {
    const scales = createDistributionChartScalesFactory({ orientation: 'horizontal' })(
      distributionConfig(SCALE_DATA),
      DIMENSIONS
    );

    expect((scales.x as { bandwidth?: () => number }).bandwidth).toBeUndefined();
    expect((scales.y as { bandwidth?: () => number }).bandwidth).toBeDefined();
    expect(scales.y.domain()).toEqual(['A', 'B']);
    expect(scales.y.range()).toEqual([0, 300]);

    const [xLo, xHi] = scales.x.domain() as [number, number];
    expect(xLo).toBeCloseTo(3, 6);
    expect(xHi).toBeCloseTo(32, 6);
    expect(scales.x.range()).toEqual([0, 500]);
  });

  it('defaults to a vertical (band-x, linear-y) orientation', () => {
    const scales = createDistributionChartScalesFactory({})(
      distributionConfig(SCALE_DATA),
      DIMENSIONS
    );

    expect((scales.x as { bandwidth?: () => number }).bandwidth).toBeDefined();
    expect((scales.y as { bandwidth?: () => number }).bandwidth).toBeUndefined();
  });

  it('falls back to an empty band domain and a [0, 1] value domain with no layers', () => {
    const scales = createDistributionChartScalesFactory({})({ layers: [] }, DIMENSIONS);

    expect(scales.x.domain()).toEqual([]);
    expect(scales.y.domain()).toEqual([0, 1]);
  });

  it('folds stddev whisker extents into the value domain (whisker not clipped)', () => {
    // [0,0,0,0,10] with stddev whiskers: mean 2, σ = √20 ≈ 4.47, so the lower
    // whisker (mean − σ ≈ −2.47) falls below the raw data min (0). The domain must
    // reach past it or the plot clip-path slices the whisker + cap off.
    const scales = createDistributionChartScalesFactory({ orientation: 'vertical' })(
      distributionConfig([{ category: 'X', values: [0, 0, 0, 0, 10] }], { whiskerStat: 'stddev' }),
      DIMENSIONS
    );

    const [yLo] = scales.y.domain() as [number, number];
    expect(yLo).toBeLessThanOrEqual(2 - Math.sqrt(20));
  });
});
