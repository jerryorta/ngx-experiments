import { deviation, mean } from 'd3-array';
import { regressionLinear, regressionLoess } from 'd3-regression';

/**
 * One point of an analytical overlay in NUMBER space. The overlay render fn converts
 * the host layer's x (a `Date` / `number` / `string`) into a plain number BEFORE
 * calling these helpers, and maps the fitted results back through the chart scales —
 * so every fit / stat here operates purely on numeric xy pairs and stays scale- and
 * date-agnostic (and therefore trivially unit-testable).
 */
export interface OverlayXYPoint {
  /** Numeric x coordinate (already projected out of Date/string by the caller). */
  x: number;
  /** Numeric y value. */
  y: number;
}

/**
 * One point of an overlay BAND — a vertical `[y0, y1]` span at a given x. Used by the
 * control-limit and fan/prediction modes to describe the filled area between an upper
 * and lower boundary at each x, ready to feed a d3 area generator.
 */
export interface OverlayBandPoint {
  /** Numeric x coordinate. */
  x: number;
  /** Lower boundary of the band at this x. */
  y0: number;
  /** Upper boundary of the band at this x. */
  y1: number;
}

/**
 * Fit a straight trend line through a scatter/line series so the overlay layer can
 * draw the "where is this heading" reference line (the `trendline` mode, `fit:
 * 'linear'`). Delegates the least-squares solve to `d3-regression` and re-samples the
 * resulting line at every input x (sorted ascending) so the caller can stroke it as a
 * simple path, alongside the slope / intercept / R² surfaced on the trend-line tooltip.
 *
 * Degenerate input (0 or 1 point) has no defined line — returns an empty `line` with
 * NaN coefficients so the caller can skip drawing. An all-equal-x series (vertical,
 * no least-squares solution) falls back to a horizontal line at the mean y, keeping
 * every returned number finite.
 *
 * @param points - The series to fit, in number space.
 * @returns The fitted `line` sampled per input x plus the `slope`, `intercept`, and
 *   `rSquared` goodness-of-fit; empty `line` + NaN coefficients when under 2 points.
 */
export function linearFit(points: OverlayXYPoint[]): {
  intercept: number;
  line: OverlayXYPoint[];
  rSquared: number;
  slope: number;
} {
  if (points.length < 2) {
    return { intercept: NaN, line: [], rSquared: NaN, slope: NaN };
  }

  const result = regressionLinear<OverlayXYPoint>()
    .x(d => d.x)
    .y(d => d.y)(points);

  // `regressionLinear` yields NaN coefficients for an all-equal-x (vertical) series;
  // fall back to a flat line at the mean y so every returned value stays finite.
  const meanY = mean(points, d => d.y) ?? 0;
  const slope = Number.isFinite(result.a) ? result.a : 0;
  const intercept = Number.isFinite(result.b) ? result.b : meanY;
  const rSquared = Number.isFinite(result.rSquared) ? result.rSquared : 0;

  const line = [...points]
    .sort((a, b) => a.x - b.x)
    .map(p => ({ x: p.x, y: slope * p.x + intercept }));

  return { intercept, line, rSquared, slope };
}

/**
 * Smooth a series with LOESS local regression so the overlay layer can draw a
 * curved, non-parametric trend that follows local structure the straight `linearFit`
 * line misses (the `trendline` mode, `fit: 'loess'`). Delegates to `d3-regression`,
 * which sorts by x and averages repeated-x observations, so the returned curve is
 * ordered by x and ready to stroke as a path.
 *
 * @param points - The series to smooth, in number space.
 * @param bandwidth - Fraction of neighbours each local fit spans, in (0, 1]; smaller
 *   = wigglier, larger = smoother. Values outside the range fall back to the default.
 *   Default 0.3.
 * @returns The smoothed points sorted by x; empty when under 2 points (nothing to
 *   smooth).
 */
export function loessFit(points: OverlayXYPoint[], bandwidth = 0.3): OverlayXYPoint[] {
  if (points.length < 2) {
    return [];
  }

  const bw = bandwidth > 0 && bandwidth <= 1 ? bandwidth : 0.3;

  const smoothed = regressionLoess<OverlayXYPoint>()
    .x(d => d.x)
    .y(d => d.y)
    .bandwidth(bw)(points);

  return smoothed.map(([x, y]) => ({ x, y }));
}

/**
 * Compute the mean line and symmetric ±k·σ control limits for a set of values so the
 * overlay layer can draw a statistical-process-control band (the `control` mode) —
 * the classic "is this measurement in control?" envelope. The upper / lower limits
 * sit `sigma` sample standard deviations either side of the mean.
 *
 * NaN-safe by construction: an empty input returns all-NaN (nothing to plot), and a
 * single value collapses the band onto that value (zero σ), so the caller never has
 * to special-case tiny inputs.
 *
 * @param values - The observations to summarise.
 * @param sigma - Number of standard deviations for the limit width (the classic
 *   "3-sigma" chart). Default 3.
 * @returns The `mean`, `upper` / `lower` limits, and the sample `stdDev`.
 */
export function controlLimits(
  values: number[],
  sigma = 3
): { lower: number; mean: number; stdDev: number; upper: number } {
  if (values.length === 0) {
    return { lower: NaN, mean: NaN, stdDev: NaN, upper: NaN };
  }

  const meanValue = mean(values) ?? NaN;
  // `d3.deviation` (sample, n − 1 denominator) is undefined for a single value → 0.
  const stdDev = values.length > 1 ? (deviation(values) ?? 0) : 0;

  return {
    lower: meanValue - sigma * stdDev,
    mean: meanValue,
    stdDev,
    upper: meanValue + sigma * stdDev,
  };
}

/**
 * Build one widening prediction-interval band per requested level so the overlay
 * layer can draw a "fan chart" — nested envelopes that fan out from a series to
 * express growing forecast uncertainty (the `fan` mode).
 *
 * MODEL (deterministic, distribution-free — a heuristic envelope, not a rigorous
 * statistical prediction interval). For each x the band is symmetric about the
 * central series' own y, with half-width:
 *
 *   halfWidth(x, level) = σ · k(level) · √( t(x) )
 *
 * where
 *   • σ       — the sample standard deviation of the series' y values (the overall
 *               spread the band is scaled against);
 *   • t(x)    — the normalised forecast horizon `(x − x₀) / (xₙ − x₀)` ∈ [0, 1], 0 at
 *               the first (earliest) x and 1 at the last, so the band has zero width
 *               at the anchor and widens into the future like a √-horizon random walk;
 *   • k(level) — `−ln(1 − level)`, a monotonically increasing map of the interval
 *               level, so a higher level (e.g. 0.95) yields a strictly wider band than
 *               a lower one (e.g. 0.5).
 *
 * Each band point is `{ x, y0: y − halfWidth, y1: y + halfWidth }`. A series with no
 * x-range (all-equal x) or a degenerate level collapses that band to zero width
 * rather than producing NaN.
 *
 * @param points - The central series the bands fan around, in number space.
 * @param levels - Interval levels in (0, 1) (e.g. `[0.5, 0.8, 0.95]`); each yields one
 *   band. Preserved in the output in the given order.
 * @returns One `{ level, band }` per requested level; every `band` is empty when the
 *   series has under 2 points (no envelope to draw).
 */
export function predictionBands(
  points: OverlayXYPoint[],
  levels: number[]
): { band: OverlayBandPoint[]; level: number }[] {
  if (points.length < 2) {
    return levels.map(level => ({ band: [], level }));
  }

  const sorted = [...points].sort((a, b) => a.x - b.x);
  const x0 = sorted[0].x;
  const xSpan = sorted[sorted.length - 1].x - x0;
  const stdDev = deviation(sorted, d => d.y) ?? 0;

  return levels.map(level => {
    // Clamp to (0, 1) for the k(level) log; keep the ORIGINAL level in the output.
    const clamped = Math.min(Math.max(level, 0), 0.999999);
    const k = -Math.log(1 - clamped);

    const band = sorted.map(p => {
      const horizon = xSpan > 0 ? (p.x - x0) / xSpan : 0;
      const halfWidth = stdDev * k * Math.sqrt(horizon);
      return { x: p.x, y0: p.y - halfWidth, y1: p.y + halfWidth };
    });

    return { band, level };
  });
}
