import type { NgeCrosshairConfig } from '../../../core/base-layout';
import type { NgeChartConfig, NgeLineDataPoint } from '../../../core/config';

/**
 * Shared fixtures + helpers for the `Charts/NgeChart/Crosshair/*` story set.
 * Deterministic (sine-shaped, no randomness) so snapping + the shared tooltip are
 * stable to eyeball across every story.
 */

/** Multi-series palette (Product A / B / C) shared by the line + area hosts and swatches. */
export const CROSSHAIR_PALETTE = ['#1E88E5', '#43A047', '#FB8C00'];

/** Deterministic 3-series definitions so the demos render identically every load. */
const SERIES = [
  { amp: 18, base: 62, id: 'Product A', phase: 0 },
  { amp: 14, base: 42, id: 'Product B', phase: 1.4 },
  { amp: 11, base: 24, id: 'Product C', phase: 2.7 },
];

/**
 * Build a deterministic dataset over a CATEGORICAL daily x ("Jan 1" … "Jan N").
 * A categorical/point x gives ONE axis tick + gridline per node, centered under
 * each node (a continuous time scale's "nice" ticks otherwise fall between the
 * daily observations). `seriesCount` slices the 3 series; typed as line points,
 * area points are identical.
 */
export function buildCrosshairData(seriesCount = 3, pointCount = 12): NgeLineDataPoint[] {
  return SERIES.slice(0, seriesCount).flatMap(series =>
    Array.from({ length: pointCount }, (_, i) => ({
      seriesId: series.id,
      x: `Jan ${i + 1}`,
      y: Math.round(series.base + series.amp * Math.sin(i * 0.6 + series.phase)),
    }))
  );
}

/**
 * Inset the categorical (point) x-scale so the first + last nodes and their tick
 * labels sit inside the plot instead of flush against the y-axis / right edge (the
 * preset builds the point scale with zero outer padding). Only touches band/point
 * scales — a no-op for continuous scales, which have no `.padding`.
 */
export function withInsetPointX(cfg: NgeChartConfig): NgeChartConfig {
  const inner = cfg.scaleFactory;
  if (!inner) {
    return cfg;
  }
  return {
    ...cfg,
    scaleFactory: (config, dimensions) => {
      const scales = inner(config, dimensions);
      const x = scales.x as { padding?: (outer: number) => void };
      x.padding?.(0.5);
      return scales;
    },
  };
}

/** Merge an opt-in crosshair config onto a preset's base (leaves everything else intact). */
export function withCrosshair(
  cfg: NgeChartConfig,
  crosshair: NgeCrosshairConfig
): NgeChartConfig {
  return { ...cfg, base: { ...cfg.base, crosshair } };
}
