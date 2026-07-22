import { scaleBand, scaleLinear } from 'd3-scale';

import type { NgeChartAnimationConfig } from '../core/animation';
import type { NgeChartBaseConfig, NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeLollipopDataPoint,
  NgeLollipopLayerConfig,
} from '../core/config';
import type { NgeTooltipConfig, NgeTooltipContent } from '../core/tooltip';

import { orderedBandCategories } from '../core/gesture';
import { renderLollipopLayer } from '../layers/lollipop';

/**
 * Options for creating a lollipop chart config preset.
 *
 * One preset covers the whole lollipop family — pass `showStem: false` for a dot
 * plot, per-point `valueEnd` for dumbbells, or `connect: true` for a slope chart.
 */
export interface LollipopChartPresetOptions {
  /**
   * Chart-wide enter/update/exit animation (per-phase durations + easing) applied to
   * every layer. A layer's own `animationMs` shorthand still wins over it.
   */
  animation?: NgeChartAnimationConfig;

  /**
   * Exit-transition (fade-out) duration in ms for removed marks. Default 300.
   * Set 0 for instant renders (used during zoom/pan gestures).
   */
  animationMs?: number;

  /** Single-marker stem origin on the value axis. Default 0. */
  baseline?: number;

  /** Join same-`seriesId` markers across categories into a slope line. Default false. */
  connect?: boolean;

  /** Data points to render — one lollipop / row per point. */
  data: NgeLollipopDataPoint[];

  /** Chart margin configuration. */
  margin?: NgeChartBaseConfig['margin'];

  /** Marker radius in pixels. Overrides the theme default. */
  markerSize?: number;

  /** Click handler for markers. */
  onClick?: NgeLollipopLayerConfig['onClick'];

  /** Category-axis orientation. `'vertical'` (default) puts categories on x. */
  orientation?: 'horizontal' | 'vertical';

  /** Multi-series palette keyed by `seriesId` index. */
  seriesColors?: string[];

  /** Marker glyph. Default `'circle'`. */
  shape?: 'circle' | 'diamond' | 'square';

  /** Show per-point value labels near each marker. Default false. */
  showLabels?: boolean;

  /** Draw the stem / dumbbell connector. `false` ⇒ a bare dot plot. Default true. */
  showStem?: boolean;

  /** Enable tooltips on hover. Default false. */
  showTooltip?: boolean;

  /** Show the X axis. Default true. */
  showXAxis?: boolean;

  /** Show the Y axis. Default true. */
  showYAxis?: boolean;

  /** X axis label. */
  xAxisLabel?: string;

  /** Y axis label. */
  yAxisLabel?: string;
}

/**
 * Default tooltip content formatter for lollipop data points.
 */
function defaultLollipopTooltipFormatter(data: NgeLollipopDataPoint): NgeTooltipContent {
  return {
    label: data.category,
    value: data.valueEnd !== undefined ? `${data.value} → ${data.valueEnd}` : data.value,
  };
}

/**
 * The lollipop chart's value extent `[min, max]`.
 *
 * The encoding decides whether the axis anchors at the baseline. A **true
 * lollipop** (`showStem !== false` AND no `valueEnd` row) encodes magnitude as
 * stem LENGTH from the baseline, so the domain force-includes `baseline` and `0`
 * and pads 10% on the non-zero side (the zero baseline is preserved, mirroring the
 * waterfall factory). A **dot plot** (`showStem: false`) or any **dumbbell** row
 * (`valueEnd` present) encodes POSITION, not length-from-zero — anchoring at 0
 * would waste axis range and squeeze the marks — so the domain is computed from the
 * DATA EXTENT of every `value` / `valueEnd` with ~10% padding on each side. Returns
 * `[0, 1]` when there are no points.
 */
function computeLollipopValueDomain(
  points: NgeLollipopDataPoint[],
  baseline: number,
  showStem: boolean | undefined
): [number, number] {
  if (points.length === 0) {
    return [0, 1];
  }

  const hasDumbbell = points.some(point => point.valueEnd !== undefined);
  const values: number[] = [];
  for (const point of points) {
    values.push(point.value);
    if (point.valueEnd !== undefined) {
      values.push(point.valueEnd);
    }
  }

  // A true lollipop reads stem length from the baseline, so 0 / baseline must be in
  // the domain. A dot plot or dumbbell reads position, so anchor to the data extent.
  const trueLollipop = showStem !== false && !hasDumbbell;
  if (trueLollipop) {
    values.push(baseline, 0);

    const lo = Math.min(...values);
    const hi = Math.max(...values);
    const domainLo = lo < 0 ? lo * 1.1 : lo;
    const domainHi = hi > 0 ? hi * 1.1 : hi;

    return domainLo === domainHi ? [domainLo, domainHi + 1] : [domainLo, domainHi];
  }

  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const span = hi - lo;
  const pad = span === 0 ? Math.abs(hi) * 0.1 || 1 : span * 0.1;

  return [lo - pad, hi + pad];
}

/**
 * Build the lollipop scales: a `scaleBand` category axis over the unique
 * categories (in data order) and a `scaleLinear` value axis over the combined
 * extent. `orientation` swaps which of x / y is the band vs the linear axis.
 */
function createLollipopChartScalesFactory(
  options: Pick<LollipopChartPresetOptions, 'baseline' | 'orientation' | 'showStem'>
) {
  const { baseline = 0, orientation = 'vertical', showStem } = options;
  const vertical = orientation === 'vertical';

  return (config: NgeChartConfig, dimensions: NgeChartDimensions): NgeChartScales => {
    const allPoints: NgeLollipopDataPoint[] = [];
    for (const layer of config.layers.flat()) {
      if (layer.type === 'lollipop') {
        allPoints.push(...(layer as NgeLollipopLayerConfig).data);
      }
    }

    const categories = orderedBandCategories(allPoints, d => d.category);
    const valueDomain = computeLollipopValueDomain(allPoints, baseline, showStem);

    const band = scaleBand<string>().domain(categories).padding(0.5);
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
 * Create a lollipop chart configuration.
 *
 * Renders stems + end markers on shared cartesian scales. One preset spans the
 * family: default is a vertical **lollipop**; `showStem: false` gives a **dot
 * plot**; per-point `valueEnd` gives **dumbbells**; `connect: true` joins each
 * series across categories into a **slope** chart. Like the waterfall preset, axes
 * default ON — a lollipop is a standalone analytical chart.
 *
 * @example
 * // Lollipop
 * const config = createLollipopChartConfig({
 *   data: [
 *     { category: 'Jan', value: 40 },
 *     { category: 'Feb', value: 25 },
 *     { category: 'Mar', value: 60 },
 *   ],
 * });
 *
 * @example
 * // Dumbbell (before → after)
 * const config = createLollipopChartConfig({
 *   data: [
 *     { category: 'North', value: 20, valueEnd: 55 },
 *     { category: 'South', value: 35, valueEnd: 48 },
 *   ],
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createLollipopChartConfig(options: LollipopChartPresetOptions): NgeChartConfig {
  const {
    animation,
    animationMs,
    baseline,
    connect,
    data,
    margin,
    markerSize,
    onClick,
    orientation,
    seriesColors,
    shape,
    showLabels,
    showStem,
    showTooltip = false,
    showXAxis = true,
    showYAxis = true,
    xAxisLabel,
    yAxisLabel,
  } = options;

  const tooltipConfig: Partial<NgeTooltipConfig<NgeLollipopDataPoint>> | undefined = showTooltip
    ? {
        enabled: true,
        formatContent: defaultLollipopTooltipFormatter,
        height: 65,
        position: 'follow-mouse',
        width: 140,
      }
    : undefined;

  const lollipopLayer: NgeLollipopLayerConfig = {
    animationMs,
    baseline,
    connect,
    data,
    markerSize,
    onClick,
    orientation,
    renderer: renderLollipopLayer,
    seriesColors,
    shape,
    showLabels,
    showStem,
    tooltip: tooltipConfig,
    type: 'lollipop',
  };

  return {
    animation,
    base: {
      margin: margin ?? { bottom: 45, left: 50, right: 15, top: 20 },
      showXAxis,
      showYAxis,
      xAxisLabel,
      yAxisLabel,
    },
    layers: [lollipopLayer],
    scaleFactory: createLollipopChartScalesFactory({ baseline, orientation, showStem }),
  };
}
