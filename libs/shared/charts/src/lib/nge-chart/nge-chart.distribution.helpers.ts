import { deviation, extent, mean, quantile } from 'd3-array';
import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  DistributionWhiskerStat,
  NgeChartConfig,
  NgeChartScaleFactory,
  NgeDistributionDataPoint,
  NgeDistributionLayerConfig,
} from '../core/config';

import { orderedBandCategories } from '../core/gesture';

/** Sample points along the KDE curve when no explicit resolution is given (violin mode). */
const DEFAULT_KDE_RESOLUTION = 50;

/** Float tolerance for the greedy beeswarm collision test (pixel space). */
const DODGE_EPSILON = 1e-9;

/** Fractional padding added to each side of the distribution value domain. */
const VALUE_DOMAIN_PADDING = 0.08;

/**
 * Five-number-summary (plus mean / dispersion) for one distribution — the shared
 * geometry core the scale factory folds into the value domain (via `whiskerLow` /
 * `whiskerHigh`, so `'stddev'` / `'stderr'` whiskers aren't clipped) and the
 * renderer draws from (the box / whiskers / outliers), so both agree on exactly
 * which observation is a whisker end and which is an outlier.
 *
 * `whiskerLow` / `whiskerHigh` are the whisker EXTENTS resolved from the chosen
 * `whiskerStat`; `outliers` are only populated for `'iqr'` (the data beyond the
 * Tukey fences). `stdErr` is the standard error of the mean (`stdDev / √n`).
 */
export interface NgeBoxStats {
  /** Number of observations. */
  count: number;
  /** Interquartile range (`q3 − q1`). */
  iqr: number;
  /** Largest observation. */
  max: number;
  /** Arithmetic mean. */
  mean: number;
  /** Median (0.5 quantile). */
  median: number;
  /** Smallest observation. */
  min: number;
  /** Observations beyond the whiskers (`'iqr'` mode only; empty otherwise). */
  outliers: number[];
  /** First quartile (0.25 quantile). */
  q1: number;
  /** Third quartile (0.75 quantile). */
  q3: number;
  /** Sample standard deviation (n − 1 denominator). */
  stdDev: number;
  /** Standard error of the mean (`stdDev / √n`). */
  stdErr: number;
  /** Upper whisker extent (resolved from `whiskerStat`). */
  whiskerHigh: number;
  /** Lower whisker extent (resolved from `whiskerStat`). */
  whiskerLow: number;
}

/** One sampled point on a kernel-density-estimate curve (value space). */
export interface KdePoint {
  /** Estimated probability density at `value`. */
  density: number;
  /** The value-axis coordinate this density was sampled at. */
  value: number;
}

/**
 * Compute the box-plot statistics for one set of raw observations.
 *
 * Sorts a COPY ascending, then derives quartiles (`d3.quantile`), the mean, the
 * sample standard deviation (`d3.deviation`), and the standard error. The whisker
 * extents depend on `whiskerStat`:
 * - `'iqr'` (default): Tukey fences `q1 − 1.5·IQR` / `q3 + 1.5·IQR`; the whiskers
 *   reach the most extreme observation still WITHIN the fences and everything
 *   beyond becomes an `outlier`.
 * - `'minmax'`: whiskers at the data min / max (no outliers).
 * - `'stddev'`: whiskers at `mean ± stdDev`.
 * - `'stderr'`: whiskers at `mean ± stdErr`.
 *
 * A single observation collapses every quartile onto that value (zero IQR, no
 * outliers). Returns `null` for an empty input.
 *
 * @param values - The raw observations to summarise.
 * @param whiskerStat - Which statistic sets the whisker extent. Default `'iqr'`.
 * @returns The box statistics, or `null` when there are no observations.
 */
export function computeBoxStats(
  values: number[],
  whiskerStat: DistributionWhiskerStat = 'iqr'
): NgeBoxStats | null {
  const count = values.length;
  if (count === 0) {
    return null;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const min = sorted[0];
  const max = sorted[count - 1];
  const q1 = quantile(sorted, 0.25) ?? min;
  const median = quantile(sorted, 0.5) ?? min;
  const q3 = quantile(sorted, 0.75) ?? max;
  const iqr = q3 - q1;
  const meanValue = mean(sorted) ?? min;
  const stdDev = count > 1 ? (deviation(sorted) ?? 0) : 0;
  const stdErr = count > 1 ? stdDev / Math.sqrt(count) : 0;

  let whiskerLow: number;
  let whiskerHigh: number;
  let outliers: number[] = [];

  if (whiskerStat === 'minmax') {
    whiskerLow = min;
    whiskerHigh = max;
  } else if (whiskerStat === 'stddev') {
    whiskerLow = meanValue - stdDev;
    whiskerHigh = meanValue + stdDev;
  } else if (whiskerStat === 'stderr') {
    whiskerLow = meanValue - stdErr;
    whiskerHigh = meanValue + stdErr;
  } else {
    // 'iqr' — Tukey 1.5·IQR fences: whiskers reach the most extreme datum still
    // inside the fences; everything beyond is an outlier.
    const lowerFence = q1 - 1.5 * iqr;
    const upperFence = q3 + 1.5 * iqr;
    let low = max;
    let high = min;
    for (const value of sorted) {
      if (value >= lowerFence && value <= upperFence) {
        low = Math.min(low, value);
        high = Math.max(high, value);
      }
    }
    whiskerLow = low;
    whiskerHigh = high;
    outliers = sorted.filter(value => value < lowerFence || value > upperFence);
  }

  return {
    count,
    iqr,
    max,
    mean: meanValue,
    median,
    min,
    outliers,
    q1,
    q3,
    stdDev,
    stdErr,
    whiskerHigh,
    whiskerLow,
  };
}

/**
 * Estimate a probability-density curve for a set of observations (violin mode).
 *
 * Samples `resolution` evenly spaced points across the domain and, at each, sums a
 * smoothing kernel over every observation: `density = mean(K((x − xᵢ) / h)) / h`.
 * The bandwidth `h` defaults to the {@link silvermanBandwidth} rule-of-thumb and
 * the kernel to Epanechnikov. Returns `[]` for a degenerate estimate (fewer than
 * two observations, or a non-positive bandwidth) so the renderer can skip the
 * violin.
 *
 * @param values - The raw observations to estimate a density for.
 * @param opts - Bandwidth / domain / kernel / resolution overrides.
 * @returns The sampled `{ value, density }` points, or `[]` when degenerate.
 */
export function computeKde(
  values: number[],
  opts: {
    bandwidth?: number;
    domain?: [number, number];
    kernel?: 'epanechnikov' | 'gaussian';
    resolution?: number;
  } = {}
): KdePoint[] {
  const count = values.length;
  if (count < 2) {
    return [];
  }

  const bandwidth = opts.bandwidth ?? silvermanBandwidth(values);
  if (bandwidth <= 0) {
    return [];
  }

  const [lo, hi] = opts.domain ?? (extent(values) as [number, number]);
  const resolution = Math.max(2, Math.floor(opts.resolution ?? DEFAULT_KDE_RESOLUTION));
  const kernel = opts.kernel === 'gaussian' ? gaussianKernel : epanechnikovKernel;

  const points: KdePoint[] = [];
  for (let i = 0; i < resolution; i++) {
    const value = lo + ((hi - lo) * i) / (resolution - 1);
    let sum = 0;
    for (const datum of values) {
      sum += kernel((value - datum) / bandwidth);
    }
    points.push({ density: sum / (count * bandwidth), value });
  }

  return points;
}

/**
 * The Silverman rule-of-thumb KDE bandwidth:
 * `0.9 · min(stdDev, IQR / 1.34) · n^(−1/5)`.
 *
 * Falls back to σ when the IQR term collapses — a modal spike (a repeated median
 * with σ > 0) would otherwise zero the bandwidth and silently drop the violin.
 * Returns `0` only for fewer than two observations or a zero-variance sample
 * (every value identical — no density to estimate), signalling {@link computeKde}
 * to skip the estimate.
 *
 * @param values - The raw observations to size a bandwidth for.
 * @returns The bandwidth, or `0` when the sample is degenerate.
 */
export function silvermanBandwidth(values: number[]): number {
  const count = values.length;
  if (count < 2) {
    return 0;
  }

  const sorted = [...values].sort((a, b) => a - b);
  const stdDev = deviation(sorted) ?? 0;
  const q1 = quantile(sorted, 0.25) ?? 0;
  const q3 = quantile(sorted, 0.75) ?? 0;

  // Prefer the tighter of σ and the IQR term, but fall back to σ when the IQR term
  // collapses (a modal spike — repeated median with σ > 0). A zero-variance sample
  // (σ = 0 ⇒ every value identical) has no density to estimate → 0.
  let spread = Math.min(stdDev, (q3 - q1) / 1.34);
  if (spread <= 0) {
    spread = stdDev;
  }
  if (spread <= 0) {
    return 0;
  }

  return 0.9 * spread * Math.pow(count, -1 / 5);
}

/**
 * Deterministic greedy beeswarm dodge (points mode). Given each point's position
 * on the value axis and a marker `radius`, returns the perpendicular offset that
 * packs the markers without overlap — non-random, so tests are stable.
 *
 * Points are swept in ascending position order (ties keep input order). Each point
 * is placed at the smallest-magnitude offset whose center clears every
 * already-placed neighbor within one diameter on the position axis (Euclidean
 * center distance ≥ `2·radius`). The returned offsets are realigned to the INPUT
 * order.
 *
 * @param positions - Each point's position on the value axis (pixel space).
 * @param radius - The marker radius (pixel space).
 * @returns The perpendicular offset per point, in input order.
 */
export function computeDodgeOffsets(positions: number[], radius: number): number[] {
  const count = positions.length;
  const offsets = Array.from({ length: count }, () => 0);
  if (count === 0 || radius <= 0) {
    return offsets;
  }

  const diameter = radius * 2;
  const minDistSq = diameter * diameter;

  // Sweep ascending by position (stable: ties keep input order) so each point only
  // needs to dodge neighbors already placed behind it on the position axis.
  const order = Array.from(positions.keys()).sort((a, b) => {
    const delta = positions[a] - positions[b];
    return delta !== 0 ? delta : a - b;
  });

  const placed: { offset: number; position: number }[] = [];

  for (const index of order) {
    const position = positions[index];

    // Each neighbor within one diameter carves a forbidden offset interval; the
    // best offset is 0 or one of those interval boundaries. Take the smallest
    // |offset| that clears every neighbor.
    const candidates = [0];
    for (const neighbor of placed) {
      const deltaPos = position - neighbor.position;
      if (Math.abs(deltaPos) >= diameter) {
        continue;
      }
      const half = Math.sqrt(minDistSq - deltaPos * deltaPos);
      candidates.push(neighbor.offset + half, neighbor.offset - half);
    }

    candidates.sort((a, b) => Math.abs(a) - Math.abs(b) || a - b);

    let chosen = 0;
    for (const candidate of candidates) {
      const collides = placed.some(neighbor => {
        const deltaPos = position - neighbor.position;
        const deltaOff = candidate - neighbor.offset;
        return deltaPos * deltaPos + deltaOff * deltaOff < minDistSq - DODGE_EPSILON;
      });
      if (!collides) {
        chosen = candidate;
        break;
      }
    }

    offsets[index] = chosen;
    placed.push({ offset: chosen, position });
  }

  return offsets;
}

/**
 * Seeded uniform jitter offsets (points mode). Draws `count` offsets uniformly in
 * `[−width/2, width/2]` from a {@link mulberry32} stream seeded with `seed`, so the
 * same seed always yields the same jitter (stable across change-detection cycles).
 *
 * @param count - How many offsets to generate.
 * @param width - The full jitter width (offsets span `±width/2`).
 * @param seed - The RNG seed (see {@link hashSeed} to derive one from a category).
 * @returns `count` deterministic offsets in `[−width/2, width/2]`.
 */
export function computeJitterOffsets(count: number, width: number, seed: number): number[] {
  const random = mulberry32(seed);
  const offsets: number[] = [];
  for (let i = 0; i < count; i++) {
    offsets.push((random() - 0.5) * width);
  }
  return offsets;
}

/**
 * A small stable 32-bit string hash (FNV-1a), returned unsigned — used to derive a
 * deterministic per-category jitter seed so each category's point cloud is stable
 * but distinct.
 *
 * @param str - The string to hash (e.g. a category name).
 * @returns An unsigned 32-bit hash.
 */
export function hashSeed(str: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < str.length; i++) {
    hash ^= str.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * The mulberry32 pseudo-random generator — a tiny, fast, deterministic 32-bit RNG.
 * Returns a function yielding successive floats in `[0, 1)`. Same seed ⇒ identical
 * stream (copied verbatim from the histogram usage stories).
 *
 * @param seed - The 32-bit seed.
 * @returns A function returning the next float in `[0, 1)`.
 */
export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Build a distribution-chart scale factory: a `scaleBand` category axis over the
 * unique categories (in data order, `padding(0.3)`) and a `scaleLinear` value axis
 * over the combined observation extent (padded ~8% each side). `orientation` swaps
 * which of x / y is the band vs the linear axis, mirroring the lollipop factory.
 *
 * @param options - Orientation (`'vertical'` default puts categories on x).
 * @returns A {@link NgeChartScaleFactory} producing the band + linear scales.
 */
export function createDistributionChartScalesFactory(options: {
  orientation?: 'horizontal' | 'vertical';
}): NgeChartScaleFactory {
  const { orientation = 'vertical' } = options;
  const vertical = orientation === 'vertical';

  return (config: NgeChartConfig, dimensions: NgeChartDimensions): NgeChartScales => {
    const layers: NgeDistributionLayerConfig[] = [];
    const allPoints: NgeDistributionDataPoint[] = [];
    for (const layer of config.layers.flat()) {
      if (layer.type === 'distribution') {
        const distributionLayer = layer as NgeDistributionLayerConfig;
        layers.push(distributionLayer);
        allPoints.push(...distributionLayer.data);
      }
    }

    const categories = orderedBandCategories(allPoints, point => point.category);
    const valueDomain = computeDistributionValueDomain(layers);

    const band = scaleBand<string>().domain(categories).padding(0.3);
    const linear = scaleLinear().domain(valueDomain);

    return vertical
      ? {
          x: band.range([0, dimensions.boundedWidth]),
          y: linear.range([dimensions.boundedHeight, 0]),
        }
      : {
          x: linear.range([0, dimensions.boundedWidth]),
          y: band.range([0, dimensions.boundedHeight]),
        };
  };
}

/**
 * The distribution layer's value domain, padded ~8% each side so whisker caps /
 * violin tails clear the plot edges. Covers every category's raw observations AND
 * each category's resolved whisker extents (`computeBoxStats` under the layer's
 * `whiskerStat`) — so `'stddev'` / `'stderr'` whiskers reaching beyond the data
 * `[min, max]` are NOT clipped by the plot clip-path (`'iqr'` / `'minmax'` extents
 * already lie within the data range, so folding them is a no-op there). Returns
 * `[0, 1]` with no observations, and expands a zero-width span (every value
 * identical) to a padded band.
 */
function computeDistributionValueDomain(layers: NgeDistributionLayerConfig[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;

  for (const layer of layers) {
    for (const point of layer.data) {
      for (const value of point.values) {
        lo = Math.min(lo, value);
        hi = Math.max(hi, value);
      }
      const stats = computeBoxStats(point.values, layer.whiskerStat);
      if (stats) {
        lo = Math.min(lo, stats.whiskerLow);
        hi = Math.max(hi, stats.whiskerHigh);
      }
    }
  }

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return [0, 1];
  }
  if (lo === hi) {
    const pad = Math.abs(hi) * VALUE_DOMAIN_PADDING || 1;
    return [lo - pad, hi + pad];
  }

  const pad = (hi - lo) * VALUE_DOMAIN_PADDING;
  return [lo - pad, hi + pad];
}

/** Epanechnikov kernel `K(u) = 0.75·(1 − u²)` for `|u| ≤ 1`, else `0`. */
function epanechnikovKernel(u: number): number {
  return Math.abs(u) <= 1 ? 0.75 * (1 - u * u) : 0;
}

/** Standard gaussian kernel `K(u) = e^(−u²/2) / √(2π)`. */
function gaussianKernel(u: number): number {
  return Math.exp(-0.5 * u * u) / Math.sqrt(2 * Math.PI);
}
