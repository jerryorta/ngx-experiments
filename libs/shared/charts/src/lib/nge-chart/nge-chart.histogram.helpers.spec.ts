import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeHistogramDataPoint,
  NgeHistogramLayerConfig,
} from '../core/config';

import { renderHistogramLayer } from '../layers/histogram';
import {
  binHistogram,
  createHistogramChartScales,
  fitExpectedCurve,
  normalCdf,
} from './nge-chart.histogram.helpers';

const DIMENSIONS: NgeChartDimensions = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** 1..10 — ten evenly spread observations. */
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Symmetric-around-5 sample (mean 5, sample σ = √(32/7)). */
const SYMMETRIC = [2, 4, 4, 4, 5, 5, 7, 9];

/** Build a minimal single-histogram-layer chart config for the scale factory. */
function histogramConfig(
  values: number[],
  overrides?: Partial<NgeHistogramLayerConfig>
): NgeChartConfig {
  const data: NgeHistogramDataPoint[] = values.map(value => ({ value }));
  const layer: NgeHistogramLayerConfig = {
    data,
    renderer: renderHistogramLayer,
    type: 'histogram',
    ...overrides,
  };
  return { layers: [layer] };
}

describe('binHistogram', () => {
  it('returns an empty result with a [0, 1] extent for no data', () => {
    expect(binHistogram([])).toEqual({ bins: [], maxCount: 0, xExtent: [0, 1] });
  });

  it('cuts uniform bins across an explicit domain from a bin count', () => {
    const { bins, maxCount, xExtent } = binHistogram(VALUES, { binCount: 5, domain: [0, 10] });

    expect(bins.map(bin => [bin.x0, bin.x1, bin.count])).toEqual([
      [0, 2, 1],
      [2, 4, 2],
      [4, 6, 2],
      [6, 8, 2],
      [8, 10, 3],
    ]);
    expect(maxCount).toBe(3);
    expect(xExtent).toEqual([0, 10]);
  });

  it('honours explicit thresholds over a bin count', () => {
    const { bins } = binHistogram(VALUES, { domain: [0, 10], thresholds: [2, 4, 6, 8] });

    expect(bins.map(bin => bin.count)).toEqual([1, 2, 2, 2, 3]);
  });

  it('defaults to 10 uniform bins when neither binCount nor thresholds are given', () => {
    const { bins } = binHistogram(VALUES, { domain: [0, 10] });

    expect(bins).toHaveLength(10);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(VALUES.length);
  });

  it('expands a zero-width extent so bins never collapse (all values equal)', () => {
    const { bins, xExtent } = binHistogram([5, 5, 5]);

    expect(xExtent).toEqual([5, 6]);
    expect(bins.reduce((sum, bin) => sum + bin.count, 0)).toBe(3);
  });

  it('expands a zero-width explicit domain', () => {
    expect(binHistogram([1, 2, 3], { domain: [4, 4] }).xExtent).toEqual([4, 5]);
  });
});

describe('normalCdf', () => {
  it('matches known standard-normal CDF values', () => {
    expect(normalCdf(0, 0, 1)).toBeCloseTo(0.5, 4);
    expect(normalCdf(1, 0, 1)).toBeCloseTo(0.8413, 3);
    expect(normalCdf(-1, 0, 1)).toBeCloseTo(0.1587, 3);
    expect(normalCdf(1.96, 0, 1)).toBeCloseTo(0.975, 3);
  });

  it('shifts and scales with mean / sigma', () => {
    // One sigma above the mean is always ~0.8413 regardless of μ, σ.
    expect(normalCdf(7, 5, 2)).toBeCloseTo(0.8413, 3);
  });
});

describe('fitExpectedCurve', () => {
  it('fits the sample mean and (n-1) standard deviation', () => {
    const { bins } = binHistogram(SYMMETRIC, { binCount: 4, domain: [1, 9] });
    const fit = fitExpectedCurve(SYMMETRIC, bins, { xExtent: [1, 9] });

    expect(fit.mean).toBeCloseTo(5, 6);
    expect(fit.stdDev).toBeCloseTo(Math.sqrt(32 / 7), 6);
  });

  it('produces per-bin expected counts that are symmetric around the mean', () => {
    const { bins } = binHistogram(SYMMETRIC, { binCount: 4, domain: [1, 9] });
    const fit = fitExpectedCurve(SYMMETRIC, bins, { xExtent: [1, 9] });

    expect(fit.expected).toHaveLength(4);
    // Bins [1,3],[3,5],[5,7],[7,9] mirror around 5 → outer & inner pairs match.
    expect(fit.expected[0]).toBeCloseTo(fit.expected[3], 6);
    expect(fit.expected[1]).toBeCloseTo(fit.expected[2], 6);

    const total = fit.expected.reduce((sum, value) => sum + value, 0);
    expect(total).toBeGreaterThan(0);
    expect(total).toBeLessThanOrEqual(SYMMETRIC.length + 1e-9);
  });

  it('samples the curve across the extent (sampleCount + 1 points)', () => {
    const { bins } = binHistogram(SYMMETRIC, { binCount: 4, domain: [1, 9] });
    const fit = fitExpectedCurve(SYMMETRIC, bins, { sampleCount: 16, xExtent: [1, 9] });

    expect(fit.curve).toHaveLength(17);
    expect(fit.curve[0].x).toBeCloseTo(1, 6);
    expect(fit.curve[16].x).toBeCloseTo(9, 6);
    // The density peaks at the mean (x = 5), the middle sample.
    expect(fit.curve[8].x).toBeCloseTo(5, 6);
    expect(fit.curve[8].y).toBeGreaterThan(fit.curve[0].y);
  });

  it('places one node per bin, at each bin center on the fitted curve', () => {
    const { bins } = binHistogram(SYMMETRIC, { binCount: 4, domain: [1, 9] });
    const fit = fitExpectedCurve(SYMMETRIC, bins, { xExtent: [1, 9] });

    expect(fit.nodes).toHaveLength(bins.length);
    // Node x is the bin center; bins [1,3],[3,5],[5,7],[7,9] → centers 2,4,6,8.
    expect(fit.nodes.map(node => node.x)).toEqual([2, 4, 6, 8]);
    // Each node sits ON the curve — its y equals `n · binWidth · φ(center)`, the
    // same formula the sampled curve uses (binWidth = extent/bins = 8/4 = 2).
    const n = SYMMETRIC.length;
    const binWidth = 2;
    for (const node of fit.nodes) {
      const z = (node.x - fit.mean) / fit.stdDev;
      const phi = Math.exp(-0.5 * z * z) / (fit.stdDev * Math.sqrt(2 * Math.PI));
      expect(node.y).toBeCloseTo(n * binWidth * phi, 6);
    }
    // Symmetric sample → nodes mirror around the mean (x = 5).
    expect(fit.nodes[0].y).toBeCloseTo(fit.nodes[3].y, 6);
    expect(fit.nodes[1].y).toBeCloseTo(fit.nodes[2].y, 6);
  });

  it('returns a zeroed fit (no curve, no nodes) for a degenerate sample (σ = 0)', () => {
    const { bins } = binHistogram([5, 5, 5], { domain: [0, 10] });
    const fit = fitExpectedCurve([5, 5, 5], bins);

    expect(fit.curve).toEqual([]);
    expect(fit.nodes).toEqual([]);
    expect(fit.expected.every(value => value === 0)).toBe(true);
  });

  it('returns a zeroed fit for a single observation', () => {
    const { bins } = binHistogram([5], { domain: [0, 10] });
    expect(fitExpectedCurve([5], bins).curve).toEqual([]);
  });
});

describe('createHistogramChartScales', () => {
  it('returns default [0, 1] linear scales when there are no histogram layers', () => {
    const scales = createHistogramChartScales({ layers: [] }, DIMENSIONS);

    expect(scales.x.domain()).toEqual([0, 1]);
    expect(scales.y.domain()).toEqual([0, 1]);
    expect(scales.x.range()).toEqual([0, 500]);
    expect(scales.y.range()).toEqual([300, 0]);
  });

  it('builds a linear x over the bin extent and y over [0, maxCount] in histogram mode', () => {
    const scales = createHistogramChartScales(
      histogramConfig(VALUES, { binCount: 5, domain: [0, 10] }),
      DIMENSIONS
    );

    expect(scales.x.domain()).toEqual([0, 10]);
    expect(scales.x.range()).toEqual([0, 500]);
    expect(scales.y.domain()).toEqual([0, 3]);
    expect(scales.y.range()).toEqual([300, 0]);
    // Linear x (invertible) — not a band scale.
    expect((scales.x as { bandwidth?: () => number }).bandwidth).toBeUndefined();
  });

  it('widens the y domain to cover the fitted curve + residuals in rootogram mode', () => {
    const scales = createHistogramChartScales(
      histogramConfig(SYMMETRIC, { binCount: 4, domain: [1, 9], mode: 'rootogram' }),
      DIMENSIONS
    );

    const [yLo, yHi] = scales.y.domain() as [number, number];
    // Residuals hang bars below the axis (yLo ≤ 0); expected/curve set the top.
    expect(yLo).toBeLessThanOrEqual(0);
    expect(yHi).toBeGreaterThan(0);
  });

  it('adds headroom above the fitted curve peak in rootogram mode', () => {
    const scales = createHistogramChartScales(
      histogramConfig(SYMMETRIC, { binCount: 4, domain: [1, 9], mode: 'rootogram' }),
      DIMENSIONS
    );

    const [, yHi] = scales.y.domain() as [number, number];
    // The y top must clear the tallest fitted-curve sample (so the peak node's
    // upper half is not sliced off at the clipped plot edge).
    const { bins } = binHistogram(SYMMETRIC, { binCount: 4, domain: [1, 9] });
    const fit = fitExpectedCurve(SYMMETRIC, bins, { xExtent: [1, 9] });
    const curvePeak = Math.max(...fit.curve.map(point => point.y));
    expect(yHi).toBeGreaterThan(curvePeak);
  });

  it('falls back to the [0, maxCount] histogram y domain for a degenerate rootogram (σ = 0)', () => {
    const scales = createHistogramChartScales(
      histogramConfig([5, 5, 5], { binCount: 5, domain: [0, 10], mode: 'rootogram' }),
      DIMENSIONS
    );

    // σ = 0 → the fit is degenerate (empty curve), so the renderer draws plain
    // axis-anchored bars in [0, count]. The factory must agree: [0, maxCount],
    // NOT the zeroed-expected residual domain [-maxCount, 0].
    expect(scales.y.domain()).toEqual([0, 3]);
  });
});
