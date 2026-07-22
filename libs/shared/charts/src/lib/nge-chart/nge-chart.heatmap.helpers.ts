import { scaleBand } from 'd3-scale';
import {
  interpolateBlues,
  interpolateGreens,
  interpolateGreys,
  interpolateInferno,
  interpolateMagma,
  interpolateOranges,
  interpolatePlasma,
  interpolatePurples,
  interpolateReds,
  interpolateViridis,
  interpolateYlGnBu,
  interpolateYlOrRd,
} from 'd3-scale-chromatic';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeChartScaleFactory,
  NgeHeatmapDataPoint,
  NgeHeatmapLayerConfig,
  HeatmapColorScheme,
} from '../core/config';

import { orderedBandCategories } from '../core/gesture';

/** Default band padding between heatmap cells (fraction of the band step). */
const DEFAULT_CELL_PADDING = 0.05;

/**
 * The named sequential `d3-scale-chromatic` interpolators the heatmap layer's
 * `scheme` option selects between (a `scheme` overrides the theme token ramp). Each
 * maps a normalised `t ∈ [0, 1]` to a concrete colour string, so the renderer can
 * feed it straight into a `scaleSequential` without resolving any `var(--chart-*)`
 * token (unlike the token ramp, which must be resolved first).
 */
export const HEATMAP_SCHEME_INTERPOLATORS: Record<HeatmapColorScheme, (t: number) => string> = {
  blues: interpolateBlues,
  greens: interpolateGreens,
  greys: interpolateGreys,
  inferno: interpolateInferno,
  magma: interpolateMagma,
  oranges: interpolateOranges,
  plasma: interpolatePlasma,
  purples: interpolatePurples,
  reds: interpolateReds,
  viridis: interpolateViridis,
  ylGnBu: interpolateYlGnBu,
  ylOrRd: interpolateYlOrRd,
};

/**
 * The heatmap layers' colour domain: the `[min, max]` extent over every non-null
 * cell value (empty cells carry `null` and are excluded). Returns `[0, 1]` when
 * there are no non-null values, and expands a flat extent (every value identical) to
 * `[v, v + 1]` so the sequential colour scale never collapses to a single stop.
 *
 * @param layers - The heatmap layers whose cell values set the domain.
 * @returns The `[min, max]` colour domain.
 */
export function computeHeatmapValueDomain(layers: NgeHeatmapLayerConfig[]): [number, number] {
  let lo = Infinity;
  let hi = -Infinity;

  for (const layer of layers) {
    for (const point of layer.data) {
      if (point.value === null) {
        continue;
      }
      lo = Math.min(lo, point.value);
      hi = Math.max(hi, point.value);
    }
  }

  if (!Number.isFinite(lo) || !Number.isFinite(hi)) {
    return [0, 1];
  }
  if (lo === hi) {
    return [lo, lo + 1];
  }
  return [lo, hi];
}

/**
 * Build a heatmap-chart scale factory: a `scaleBand` COLUMN axis on x over the
 * unique `col` keys and a `scaleBand` ROW axis on y over the unique `row` keys, both
 * in first-occurrence data order (`orderedBandCategories`). Unlike most layers the
 * heatmap seats marks on band × band scales (a grid), so both axes are categorical.
 * Cell padding defaults to 0.05 of the band step each side.
 *
 * @param options - Column / row band padding overrides (default 0.05 each).
 * @returns A {@link NgeChartScaleFactory} producing the band × band scales.
 */
export function createHeatmapChartScalesFactory(options: {
  colPadding?: number;
  rowPadding?: number;
}): NgeChartScaleFactory {
  const { colPadding = DEFAULT_CELL_PADDING, rowPadding = DEFAULT_CELL_PADDING } = options;

  return (config: NgeChartConfig, dimensions: NgeChartDimensions): NgeChartScales => {
    const allPoints: NgeHeatmapDataPoint[] = [];
    for (const layer of config.layers.flat()) {
      if (layer.type === 'heatmap') {
        allPoints.push(...(layer as NgeHeatmapLayerConfig).data);
      }
    }

    const cols = orderedBandCategories(allPoints, point => point.col);
    const rows = orderedBandCategories(allPoints, point => point.row);

    return {
      x: scaleBand<string>().domain(cols).range([0, dimensions.boundedWidth]).padding(colPadding),
      y: scaleBand<string>().domain(rows).range([0, dimensions.boundedHeight]).padding(rowPadding),
    };
  };
}
