import {
  controlLimits,
  linearFit,
  loessFit,
  type OverlayXYPoint,
  predictionBands,
} from './overlay-fit.helpers';

/** Perfect line y = 2x + 1 — slope 2, intercept 1, R² 1. */
const LINEAR_SERIES: OverlayXYPoint[] = [
  { x: 0, y: 1 },
  { x: 1, y: 3 },
  { x: 2, y: 5 },
  { x: 3, y: 7 },
];

/** Symmetric-around-5 sample (mean 5, sample σ = √(32/7) ≈ 2.1381). */
const CONTROL_VALUES = [2, 4, 4, 4, 5, 5, 7, 9];

/** Monotone-x series with varying y (non-zero σ) for the fan / loess tests. */
const FAN_SERIES: OverlayXYPoint[] = [
  { x: 0, y: 10 },
  { x: 1, y: 11 },
  { x: 2, y: 9 },
  { x: 3, y: 12 },
  { x: 4, y: 8 },
];

/** Width of a band point (upper − lower). */
function width(point: { y0: number; y1: number }): number {
  return point.y1 - point.y0;
}

describe('linearFit', () => {
  it('recovers slope, intercept, and R² of a perfect line', () => {
    const { intercept, rSquared, slope } = linearFit(LINEAR_SERIES);

    expect(slope).toBeCloseTo(2, 6);
    expect(intercept).toBeCloseTo(1, 6);
    expect(rSquared).toBeCloseTo(1, 6);
  });

  it('samples the fitted line at each input x, sorted ascending', () => {
    // Deliberately unsorted input — the returned line must be x-ordered.
    const { line } = linearFit([
      { x: 3, y: 7 },
      { x: 0, y: 1 },
      { x: 2, y: 5 },
      { x: 1, y: 3 },
    ]);

    expect(line.map(p => p.x)).toEqual([0, 1, 2, 3]);
    expect(line.map(p => p.y)).toEqual([1, 3, 5, 7]);
  });

  it('returns an empty line with NaN coefficients for degenerate input', () => {
    for (const degenerate of [[], [{ x: 5, y: 9 }]] as OverlayXYPoint[][]) {
      const fit = linearFit(degenerate);
      expect(fit.line).toEqual([]);
      expect(Number.isNaN(fit.slope)).toBe(true);
      expect(Number.isNaN(fit.intercept)).toBe(true);
      expect(Number.isNaN(fit.rSquared)).toBe(true);
    }
  });

  it('falls back to a flat line at mean y when every x is equal (vertical series)', () => {
    const { intercept, line, slope } = linearFit([
      { x: 2, y: 1 },
      { x: 2, y: 5 },
      { x: 2, y: 3 },
    ]);

    expect(slope).toBe(0);
    expect(intercept).toBeCloseTo(3, 6);
    expect(line).toHaveLength(3);
    expect(line.every(p => Number.isFinite(p.y))).toBe(true);
  });
});

describe('controlLimits', () => {
  it('computes mean and ±3σ limits for a known set (default sigma)', () => {
    const { lower, mean, stdDev, upper } = controlLimits(CONTROL_VALUES);

    expect(mean).toBeCloseTo(5, 6);
    expect(stdDev).toBeCloseTo(Math.sqrt(32 / 7), 6);
    expect(upper).toBeCloseTo(5 + 3 * Math.sqrt(32 / 7), 6);
    expect(lower).toBeCloseTo(5 - 3 * Math.sqrt(32 / 7), 6);
  });

  it('honours a custom sigma', () => {
    const { lower, upper } = controlLimits(CONTROL_VALUES, 2);

    expect(upper).toBeCloseTo(5 + 2 * Math.sqrt(32 / 7), 6);
    expect(lower).toBeCloseTo(5 - 2 * Math.sqrt(32 / 7), 6);
  });

  it('collapses the band onto a single value (zero σ)', () => {
    const { lower, mean, stdDev, upper } = controlLimits([42]);

    expect(mean).toBe(42);
    expect(stdDev).toBe(0);
    expect(upper).toBe(42);
    expect(lower).toBe(42);
  });

  it('is NaN-safe for empty input', () => {
    const { lower, mean, stdDev, upper } = controlLimits([]);

    expect(Number.isNaN(mean)).toBe(true);
    expect(Number.isNaN(stdDev)).toBe(true);
    expect(Number.isNaN(upper)).toBe(true);
    expect(Number.isNaN(lower)).toBe(true);
  });
});

describe('loessFit', () => {
  it('returns one smoothed, x-sorted point per (distinct-x) input', () => {
    const smoothed = loessFit(FAN_SERIES);

    expect(smoothed).toHaveLength(FAN_SERIES.length);
    const xs = smoothed.map(p => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(smoothed.every(p => Number.isFinite(p.y))).toBe(true);
  });

  it('sorts unordered input by x', () => {
    const smoothed = loessFit([
      { x: 4, y: 8 },
      { x: 0, y: 10 },
      { x: 2, y: 9 },
      { x: 1, y: 11 },
      { x: 3, y: 12 },
    ]);

    expect(smoothed.map(p => p.x)).toEqual([0, 1, 2, 3, 4]);
  });

  it('returns an empty array for degenerate input', () => {
    expect(loessFit([])).toEqual([]);
    expect(loessFit([{ x: 1, y: 2 }])).toEqual([]);
  });

  it('respects the bandwidth, and clamps an out-of-range one back to the 0.3 default', () => {
    // A narrow bandwidth follows local structure; a wide one flattens toward the trend —
    // so the two fits are genuinely different.
    const wiggly = loessFit(FAN_SERIES, 0.2);
    const smooth = loessFit(FAN_SERIES, 0.9);
    expect(wiggly.map(p => p.y)).not.toEqual(smooth.map(p => p.y));

    // Bandwidths outside (0, 1] fall back to 0.3, yielding output identical to bw 0.3.
    const dflt = loessFit(FAN_SERIES, 0.3);
    expect(loessFit(FAN_SERIES, 0)).toEqual(dflt);
    expect(loessFit(FAN_SERIES, 1.5)).toEqual(dflt);
  });

  it('collapses repeated-x observations (d3-regression averages them), staying x-sorted', () => {
    // Two points share x=1 (y 2 and 4); x=3 is distinct.
    const smoothed = loessFit([
      { x: 1, y: 2 },
      { x: 1, y: 4 },
      { x: 3, y: 6 },
    ]);

    // The duplicate x collapses, so the output is no longer than the input, and sorted.
    expect(smoothed.length).toBeLessThanOrEqual(3);
    const xs = smoothed.map(p => p.x);
    expect(xs).toEqual([...xs].sort((a, b) => a - b));
    expect(smoothed.every(p => Number.isFinite(p.y))).toBe(true);
  });
});

describe('predictionBands', () => {
  const levels = [0.5, 0.8, 0.95];

  it('produces one band per level, preserving the requested levels', () => {
    const result = predictionBands(FAN_SERIES, levels);

    expect(result.map(r => r.level)).toEqual(levels);
    for (const { band } of result) {
      expect(band).toHaveLength(FAN_SERIES.length);
    }
  });

  it('anchors zero width at the first x and widens into the future', () => {
    const [{ band }] = predictionBands(FAN_SERIES, [0.8]);

    // First point (horizon 0) collapses onto the central series.
    expect(width(band[0])).toBeCloseTo(0, 6);
    // Band is non-decreasing in x and strictly wider at the far end.
    for (let i = 1; i < band.length; i++) {
      expect(width(band[i])).toBeGreaterThanOrEqual(width(band[i - 1]) - 1e-9);
    }
    expect(width(band[band.length - 1])).toBeGreaterThan(width(band[0]));
  });

  it('keeps the band symmetric about the central series y', () => {
    const [{ band }] = predictionBands(FAN_SERIES, [0.95]);

    band.forEach((point, i) => {
      const centerY = FAN_SERIES[i].y;
      expect(point.y1 - centerY).toBeCloseTo(centerY - point.y0, 6);
    });
  });

  it('makes a higher level yield a wider band', () => {
    const result = predictionBands(FAN_SERIES, levels);
    const lastIndex = FAN_SERIES.length - 1;
    const farWidths = result.map(r => width(r.band[lastIndex]));

    expect(farWidths[1]).toBeGreaterThan(farWidths[0]); // 0.8 > 0.5
    expect(farWidths[2]).toBeGreaterThan(farWidths[1]); // 0.95 > 0.8
  });

  it('returns empty bands (one per level) for degenerate input', () => {
    const result = predictionBands([{ x: 0, y: 1 }], levels);

    expect(result.map(r => r.level)).toEqual(levels);
    for (const { band } of result) {
      expect(band).toEqual([]);
    }
  });

  it('collapses to a zero-width band when every x is equal (no forecast horizon)', () => {
    const [{ band }] = predictionBands(
      [
        { x: 2, y: 1 },
        { x: 2, y: 5 },
        { x: 2, y: 3 },
      ],
      [0.8]
    );

    expect(band).toHaveLength(3);
    // No x-range ⇒ every normalised horizon is 0 ⇒ every point collapses onto the series.
    for (const point of band) {
      expect(width(point)).toBeCloseTo(0, 6);
    }
  });

  it('clamps a level of 1 (or above) so k(level) stays finite, preserving the requested level', () => {
    const result = predictionBands(FAN_SERIES, [1, 1.5]);

    // The ORIGINAL levels are preserved verbatim in the output (only the log is clamped).
    expect(result.map(r => r.level)).toEqual([1, 1.5]);

    // k(level) = -ln(1 - level) would be Infinity at exactly 1; the clamp keeps every
    // band width finite.
    const lastIndex = FAN_SERIES.length - 1;
    for (const { band } of result) {
      expect(Number.isFinite(width(band[lastIndex]))).toBe(true);
    }
  });
});
