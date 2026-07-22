import { bin, deviation, mean } from 'd3-array';
import { scaleLinear } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type { NgeChartConfig, NgeHistogramBin, NgeHistogramLayerConfig } from '../core/config';

/** Bin count used when neither `binCount` nor explicit `thresholds` are given. */
const DEFAULT_BIN_COUNT = 10;

/** Points sampled along the fitted normal curve (rootogram mode). */
const CURVE_SAMPLE_COUNT = 64;

/**
 * Fractional headroom added above the fitted curve peak (rootogram mode) so the
 * topmost curve node's upper half — and the curve stroke — clear the clipped
 * plot top instead of being sliced off at the edge.
 */
const ROOTOGRAM_TOP_HEADROOM = 0.08;

/**
 * Options for {@link binHistogram}. `thresholds` (explicit cut points) wins over
 * `binCount` (uniform bins); `domain` pins the binning range.
 */
export interface BinHistogramOptions {
  /** Desired number of uniform bins across the domain. Default 10. */
  binCount?: number;
  /** Explicit binning range `[min, max]`. Defaults to the data extent. */
  domain?: [number, number];
  /** Explicit internal bin boundaries fed straight to `d3.bin`. */
  thresholds?: number[];
}

/**
 * Result of {@link binHistogram}: the ordered bins, the resolved binning extent
 * (the x domain both the scale factory and renderer map through), and the tallest
 * bin count (the histogram-mode y max).
 */
export interface BinnedHistogram {
  bins: NgeHistogramBin[];
  maxCount: number;
  xExtent: [number, number];
}

/**
 * One sampled point on the fitted expected-frequency curve (value space).
 */
export interface HistogramCurvePoint {
  x: number;
  y: number;
}

/**
 * Result of {@link fitExpectedCurve}: the fitted normal's `mean`/`stdDev`, the
 * per-bin `expected` counts (integral of the normal over each bin × N), the
 * sampled `curve` points tracing the expected frequency across the extent, and
 * the per-bin `nodes` — one point sitting ON the fitted curve at each bin's
 * center, marking where the curve threads each hanging bar's top.
 */
export interface HistogramFit {
  curve: HistogramCurvePoint[];
  expected: number[];
  mean: number;
  nodes: HistogramCurvePoint[];
  stdDev: number;
}

/**
 * Bin a set of raw numeric observations into a frequency distribution — the
 * shared geometry core used by BOTH the histogram scale factory (for the value
 * extent + count max) AND the renderer (for the per-bin rects), so both agree on
 * exactly which observation lands in which bin.
 *
 * Delegates to `d3-array`'s `bin()`. When explicit `thresholds` are supplied they
 * are passed straight through; otherwise `binCount` uniform bins are cut across
 * the (data or overridden) domain. An always-set explicit domain keeps the bin
 * edges deterministic (d3's default "nice" thresholds can otherwise drift).
 *
 * @param values - The raw observations to bin.
 * @param opts - Bin-count / explicit-thresholds / domain overrides.
 * @returns The ordered bins, the `[lo, hi]` binning extent, and the max bin count.
 */
export function binHistogram(values: number[], opts: BinHistogramOptions = {}): BinnedHistogram {
  if (values.length === 0) {
    return { bins: [], maxCount: 0, xExtent: [0, 1] };
  }

  const [lo, hi] = resolveDomain(values, opts.domain);

  const binGenerator = bin<number, number>()
    .domain([lo, hi])
    .value(value => value);

  if (opts.thresholds && opts.thresholds.length > 0) {
    binGenerator.thresholds(opts.thresholds);
  } else {
    const count = Math.max(1, Math.floor(opts.binCount ?? DEFAULT_BIN_COUNT));
    binGenerator.thresholds(uniformThresholds(lo, hi, count));
  }

  const bins: NgeHistogramBin[] = binGenerator(values).map(entry => ({
    count: entry.length,
    x0: entry.x0 ?? lo,
    x1: entry.x1 ?? hi,
  }));

  let maxCount = 0;
  for (const b of bins) {
    maxCount = Math.max(maxCount, b.count);
  }

  return { bins, maxCount, xExtent: [lo, hi] };
}

/**
 * Fit a normal distribution to the raw values and derive the rootogram geometry:
 * the expected count per bin and a smooth sampled curve of expected frequency.
 *
 * The fit is the sample mean μ and (n − 1) standard deviation σ. The expected
 * count for a bin `[x0, x1)` is `N · (Φ(x1) − Φ(x0))` (Φ = the normal CDF), so it
 * matches the actual binomial expectation over that interval; the curve samples
 * `N · binWidth · φ(x)` (φ = the normal PDF) so its height at a bin center tracks
 * that bin's expected count. Returns a zeroed fit (no curve) when the sample is
 * degenerate (fewer than 2 points or σ = 0), letting the renderer fall back to a
 * plain histogram.
 *
 * @param values - The raw observations the normal is fit from.
 * @param bins - The already-computed bins (from {@link binHistogram}).
 * @param options - Optional binning extent + curve sample-count overrides.
 * @returns The fitted mean/σ, per-bin expected counts, and sampled curve points.
 */
export function fitExpectedCurve(
  values: number[],
  bins: NgeHistogramBin[],
  options: { sampleCount?: number; xExtent?: [number, number] } = {}
): HistogramFit {
  const n = values.length;
  const mu = n > 0 ? (mean(values) ?? 0) : 0;
  const sigma = n > 1 ? (deviation(values) ?? 0) : 0;

  if (n < 2 || sigma <= 0 || bins.length === 0) {
    return { curve: [], expected: bins.map(() => 0), mean: mu, nodes: [], stdDev: sigma };
  }

  const expected = bins.map(b => n * (normalCdf(b.x1, mu, sigma) - normalCdf(b.x0, mu, sigma)));

  const [lo, hi] = options.xExtent ?? [bins[0].x0, bins[bins.length - 1].x1];
  const binWidth = (hi - lo) / bins.length;
  const samples = Math.max(2, options.sampleCount ?? CURVE_SAMPLE_COUNT);

  const curve: HistogramCurvePoint[] = [];
  for (let i = 0; i <= samples; i++) {
    const x = lo + ((hi - lo) * i) / samples;
    curve.push({ x, y: n * binWidth * normalPdf(x, mu, sigma) });
  }

  // One node per bin, sampled from the SAME `n · binWidth · φ(x)` curve at the
  // bin center — so each node lies exactly on the drawn path where it threads
  // that hanging bar's top-center.
  const nodes: HistogramCurvePoint[] = bins.map(b => {
    const x = (b.x0 + b.x1) / 2;
    return { x, y: n * binWidth * normalPdf(x, mu, sigma) };
  });

  return { curve, expected, mean: mu, nodes, stdDev: sigma };
}

/**
 * Creates scales for a histogram visualization — a CONTINUOUS linear x over the
 * binning extent and a linear y over the count range (mode-aware).
 *
 * Collects `type === 'histogram'` layers and re-bins each via {@link binHistogram}
 * (so the y domain matches the renderer's rects exactly). In `'histogram'` mode
 * the y domain is `[0, maxCount]`; in `'rootogram'` mode it widens to cover the
 * fitted expected counts, the sampled curve, and any negative residual (an
 * observed count exceeding its expected value hangs the bar below the axis). A
 * degenerate rootogram (σ ≤ 0 / n < 2) has no fitted curve, so — like the
 * renderer — it falls back to the `[0, maxCount]` histogram y domain.
 *
 * @param config - The chart configuration containing layers.
 * @param dimensions - The bounded dimensions for the chart area.
 * @returns Scales object with linear x and y scales.
 */
export function createHistogramChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions
): NgeChartScales {
  const layers: NgeHistogramLayerConfig[] = [];
  for (const layer of config.layers.flat()) {
    if (layer.type === 'histogram') {
      layers.push(layer as NgeHistogramLayerConfig);
    }
  }

  if (layers.length === 0) {
    return {
      x: scaleLinear().domain([0, 1]).range([0, dimensions.boundedWidth]),
      y: scaleLinear().domain([0, 1]).range([dimensions.boundedHeight, 0]),
    };
  }

  let xLo = Infinity;
  let xHi = -Infinity;
  let yLo = 0;
  let yHi = 0;
  let hasFittedCurve = false;

  for (const layer of layers) {
    const values = layer.data.map(point => point.value);
    const { bins, maxCount, xExtent } = binHistogram(values, optionsOf(layer));

    xLo = Math.min(xLo, xExtent[0]);
    xHi = Math.max(xHi, xExtent[1]);

    if ((layer.mode ?? 'histogram') === 'rootogram') {
      const fit = fitExpectedCurve(values, bins, { xExtent });
      if (fit.curve.length === 0) {
        // Degenerate fit (σ ≤ 0 / n < 2): the renderer detects this the same way
        // (`fit.curve.length === 0`) and falls back to plain axis-anchored bars in
        // value-space [0, count], so the y domain must be [0, maxCount] to match —
        // NOT the zeroed-expected residual domain [-maxCount, 0].
        yHi = Math.max(yHi, maxCount);
      } else {
        hasFittedCurve = true;
        const { curve, expected } = fit;
        for (let i = 0; i < bins.length; i++) {
          yHi = Math.max(yHi, expected[i]);
          yLo = Math.min(yLo, expected[i] - bins[i].count);
        }
        for (const point of curve) {
          yHi = Math.max(yHi, point.y);
        }
      }
    } else {
      yHi = Math.max(yHi, maxCount);
    }
  }

  if (!Number.isFinite(xLo) || !Number.isFinite(xHi) || xLo === xHi) {
    xLo = Number.isFinite(xLo) ? xLo : 0;
    xHi = xLo + 1;
  }
  if (yHi <= yLo) {
    yHi = yLo + 1;
  }

  // The rootogram's curve nodes sit ON the peak, so a snug `yHi` would clip the
  // topmost node's upper half against the clipped plot top. Add headroom above
  // the fitted curve. Plain histograms keep the conventional snug [0, maxCount]
  // top (bars may touch the top edge), so this applies only to a fitted curve.
  if (hasFittedCurve) {
    yHi += (yHi - yLo) * ROOTOGRAM_TOP_HEADROOM;
  }

  return {
    x: scaleLinear().domain([xLo, xHi]).range([0, dimensions.boundedWidth]),
    y: scaleLinear().domain([yLo, yHi]).range([dimensions.boundedHeight, 0]),
  };
}

/**
 * The cumulative distribution function Φ(x) of a normal(μ, σ) — the probability a
 * draw falls at or below `x`. Implemented from an erf approximation (Abramowitz &
 * Stegun 7.1.26, ~1e-7 accuracy) so no extra dependency is needed. Exposed so the
 * rootogram's expected-count math can be unit-tested against known values.
 *
 * @param x - The point to evaluate the CDF at.
 * @param mu - The distribution mean.
 * @param sigma - The distribution standard deviation (must be > 0).
 * @returns Φ(x) in `[0, 1]`.
 */
export function normalCdf(x: number, mu: number, sigma: number): number {
  return 0.5 * (1 + erf((x - mu) / (sigma * Math.SQRT2)));
}

/** Per-layer {@link BinHistogramOptions} pulled off a histogram layer config. */
function optionsOf(layer: NgeHistogramLayerConfig): BinHistogramOptions {
  return { binCount: layer.binCount, domain: layer.domain, thresholds: layer.thresholds };
}

/**
 * Resolve the binning domain: an explicit override, else the data's `[min, max]`
 * extent — expanded to a unit span when every value is identical (a zero-width
 * domain would collapse every bin).
 */
function resolveDomain(values: number[], override?: [number, number]): [number, number] {
  if (override) {
    return override[0] === override[1] ? [override[0], override[0] + 1] : override;
  }
  let lo = Infinity;
  let hi = -Infinity;
  for (const value of values) {
    lo = Math.min(lo, value);
    hi = Math.max(hi, value);
  }
  return lo === hi ? [lo, lo + 1] : [lo, hi];
}

/**
 * The `count − 1` internal cut points that slice `[lo, hi]` into `count` uniform
 * bins. Only interior boundaries are emitted (passing the domain endpoints to
 * `d3.bin` would spawn spurious zero-width edge bins).
 */
function uniformThresholds(lo: number, hi: number, count: number): number[] {
  const step = (hi - lo) / count;
  const thresholds: number[] = [];
  for (let i = 1; i < count; i++) {
    thresholds.push(lo + i * step);
  }
  return thresholds;
}

/** The normal(μ, σ) probability density φ(x). */
function normalPdf(x: number, mu: number, sigma: number): number {
  const z = (x - mu) / sigma;
  return Math.exp(-0.5 * z * z) / (sigma * Math.sqrt(2 * Math.PI));
}

/** Error function erf(x) via the Abramowitz & Stegun 7.1.26 rational approximation. */
function erf(x: number): number {
  const sign = x < 0 ? -1 : 1;
  const ax = Math.abs(x);

  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;

  const t = 1 / (1 + p * ax);
  const y = 1 - ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-ax * ax);

  return sign * y;
}
