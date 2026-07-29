import type { NgeCrosshairConfig } from '../../../core/base-layout';
import type {
  NgeBarDataPoint,
  NgeChartConfig,
  NgeChartLayerDefinition,
  NgeGroupedBarDataPoint,
  NgeLineDataPoint,
  NgeOverlayDataPoint,
  NgeScatterDataPoint,
  NgeStackedBarDataPoint,
} from '../../../core/config';

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
 * Build the same deterministic series over a CONTINUOUS numeric x, deliberately
 * stepped by 7 so the observations (0, 7, 14 …) never coincide with the "nice"
 * round tick values d3 picks (0, 10, 20 …). That mismatch is what makes
 * `snap: 'tick'` visibly different from `snap: 'datum'` — on a categorical x the
 * two are identical, because every tick already sits on a node.
 */
export function buildContinuousCrosshairData(
  seriesCount = 3,
  pointCount = 15
): NgeLineDataPoint[] {
  return SERIES.slice(0, seriesCount).flatMap(series =>
    Array.from({ length: pointCount }, (_, i) => ({
      seriesId: series.id,
      x: i * 7,
      y: Math.round(series.base + series.amp * Math.sin(i * 0.6 + series.phase)),
    }))
  );
}

/**
 * Build a deterministic 2-D cloud on a CONTINUOUS x/y, spread so no two series
 * share an x — which is what makes the scatter host's nearest-POINT anchor visibly
 * different from the line/area hosts' nearest-x snap. Each series occupies its own
 * y band, so moving vertically at a fixed x re-anchors onto a different series.
 *
 * The offsets come from a fixed irrational-ish stride rather than `Math.random`,
 * so the cloud is identical on every load (the whole story set is deterministic).
 */
export function buildScatterCrosshairData(
  seriesCount = 3,
  pointCount = 22
): NgeScatterDataPoint[] {
  return SERIES.slice(0, seriesCount).flatMap((series, s) =>
    Array.from({ length: pointCount }, (_, i) => {
      const stride = (i * 37 + s * 13) % 100;
      return {
        seriesId: series.id,
        x: Math.round(stride + s * 0.7 + (i % 5) * 0.3),
        y: Math.round(series.base + series.amp * Math.sin(i * 0.9 + series.phase)),
      };
    })
  );
}

/** Band categories shared by every bar-family crosshair host. */
export const CROSSHAIR_CATEGORIES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug'];

/**
 * A single-series bar dataset over {@link CROSSHAIR_CATEGORIES}. The bar host is the
 * plainest demonstration of the band anchor: one value per category, so the guide
 * lands on the column the pointer is over and the card reports that column.
 */
export function buildBarCrosshairData(): NgeBarDataPoint[] {
  return CROSSHAIR_CATEGORIES.map((label, i) => ({
    label,
    value: Math.round(SERIES[0].base + SERIES[0].amp * Math.sin(i * 0.6)),
  }));
}

/**
 * A grouped-bar dataset: the AXIS category is `label` and each series is a
 * `groupId` — the orientation the renderer uses, which is the reverse of what the
 * field names suggest. Three side-by-side bars per category give the shared tooltip
 * three rows at one band.
 */
export function buildGroupedBarCrosshairData(): NgeGroupedBarDataPoint[] {
  return CROSSHAIR_CATEGORIES.flatMap((label, i) =>
    SERIES.map(series => ({
      groupId: series.id,
      label,
      value: Math.round(series.base + series.amp * Math.sin(i * 0.6 + series.phase)),
    }))
  );
}

/**
 * A stacked-bar dataset — the case where a row's VALUE and its focus dot's position
 * separate: each row reports the segment's own magnitude while the dot sits at the
 * segment's cumulative top, which is where the mark actually is.
 */
export function buildStackedBarCrosshairData(): NgeStackedBarDataPoint[] {
  return CROSSHAIR_CATEGORIES.flatMap((category, i) =>
    SERIES.map(series => ({
      category,
      seriesId: series.id,
      value: Math.round(20 + 0.35 * series.amp * (2 + Math.sin(i * 0.6 + series.phase))),
    }))
  );
}

/**
 * Per-category weights for the Marimekko demo, deliberately LOPSIDED.
 *
 * The evenly-weighted {@link buildStackedBarCrosshairData} totals produce columns
 * within ~15% of one another, and near-uniform contiguous bands make "the band the
 * pointer is inside" and "the band whose centre is nearest" agree almost
 * everywhere — so the story would silently fail to show the thing it is about. A
 * 6:1 spread makes a wide column's far edge genuinely closer to a narrow
 * neighbour's centre than to its own.
 */
const MARIMEKKO_WEIGHTS = [6, 1, 1, 5, 1, 1, 4, 1];

/**
 * A stacked dataset whose category TOTALS vary sharply, for the Marimekko host —
 * where column width is proportional to the total and the band anchor has to be
 * resolved by containment rather than by nearest centre.
 */
export function buildMarimekkoCrosshairData(): NgeStackedBarDataPoint[] {
  return CROSSHAIR_CATEGORIES.flatMap((category, i) =>
    SERIES.map(series => ({
      category,
      seriesId: series.id,
      value: Math.round(6 * MARIMEKKO_WEIGHTS[i] * (0.6 + 0.4 * (series.amp / 18))),
    }))
  );
}

/**
 * The overlay's source series, over the same CONTINUOUS x the gesture host uses so
 * the fit has something to slope against. Single-series: an overlay annotates one
 * series at a time.
 */
export function buildOverlayCrosshairData(): NgeOverlayDataPoint[] {
  return buildContinuousCrosshairData(1).map(point => ({ x: point.x, y: point.y }));
}

/** Append a composed layer (an analytical overlay) to a preset's layer list. */
export function withLayer(cfg: NgeChartConfig, layer: NgeChartLayerDefinition): NgeChartConfig {
  return { ...cfg, layers: [...cfg.layers, layer] };
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

/**
 * Set the X-axis tick-count hint on a preset's base. The axis, the gridlines and
 * `snap: 'tick'` all read it, so pinning it keeps the crosshair guide on exactly
 * the gridlines the demo draws.
 */
export function withXAxisTicks(cfg: NgeChartConfig, xAxisTicks: number): NgeChartConfig {
  return { ...cfg, base: { ...cfg.base, xAxisTicks } };
}

/** Merge an opt-in crosshair config onto a preset's base (leaves everything else intact). */
export function withCrosshair(
  cfg: NgeChartConfig,
  crosshair: NgeCrosshairConfig
): NgeChartConfig {
  return { ...cfg, base: { ...cfg.base, crosshair } };
}

/**
 * Move a preset's legend to one edge of the chart, keeping its items and every other
 * legend option. `top` and `left` put the legend AHEAD of the plot container in the
 * chart's flex layout, which shifts the plot's origin inside the host — the geometry
 * the shared tooltip has to be positioned through (ARCH-223). A preset with no legend
 * is returned untouched rather than given one.
 */
export function withLegendPosition(
  cfg: NgeChartConfig,
  position: 'bottom' | 'left' | 'right' | 'top'
): NgeChartConfig {
  if (!cfg.legend) {
    return cfg;
  }
  return { ...cfg, legend: { ...cfg.legend, position } };
}
