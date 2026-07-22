import type {
  NgeChartConfig,
  NgeLineDataPoint,
  NgeScatterDataPoint,
  NgeScatterLayerConfig,
} from '../core/config';
import type { LineChartPresetOptions } from './line-chart.preset';

import { renderScatterLayer } from '../layers/scatter';
import { createLineChartConfig } from './line-chart.preset';

/**
 * Compact sparkline margin — a few pixels of breathing room so the trend fills the
 * cell almost edge-to-edge (a sparkline lives inline, not in a full chart frame).
 */
const DEFAULT_SPARKLINE_MARGIN = { bottom: 2, left: 2, right: 2, top: 2 };

/** A sparkline reads as a hairline trend, so a 1px stroke is the default. */
const DEFAULT_SPARKLINE_LINE_WIDTH = 1;

/** Small marker so the last-value dot punctuates the line's end without dominating it. */
const DEFAULT_LAST_VALUE_DOT_RADIUS = 2.5;

/** The default-series bucket for points that carry no explicit `seriesId`. */
const DEFAULT_SERIES_KEY = '__default__';

/**
 * The final datum of each series in first-seen order — one entry per distinct
 * `seriesId` (points without a `seriesId` collapse into a single default series),
 * each holding the last point encountered for that series in input order. A `Map`
 * keyed by series preserves first-insertion order while `set` overwrites with the
 * latest point, so its values are exactly "last datum per series". Drives the
 * last-value dot: one marker per line ending.
 */
function lastDatumPerSeries(data: NgeLineDataPoint[]): NgeLineDataPoint[] {
  const lastBySeries = new Map<string, NgeLineDataPoint>();

  for (const point of data) {
    lastBySeries.set(point.seriesId ?? DEFAULT_SERIES_KEY, point);
  }

  return Array.from(lastBySeries.values());
}

/**
 * Options for the sparkline preset — every {@link LineChartPresetOptions} field plus
 * a last-value dot toggle.
 *
 * The preset re-defaults a few line-layer options for a compact inline read and adds
 * only the last-value-dot controls; all other line options (data, tooltip, gestures,
 * axes, legend, series colours…) apply here unchanged.
 */
export type SparklineChartPresetOptions = LineChartPresetOptions & {
  /**
   * Fill for the last-value dot(s). When omitted the dot inherits its series' line
   * colour, so it reads as the tip of its own line.
   */
  lastValueColor?: string;

  /**
   * Draw a marker at each series' final datum (the classic sparkline end dot).
   * @default true
   */
  showLastValueDot?: boolean;
};

/**
 * Project a line datum's x onto the scatter layer's numeric-x contract. The dot
 * shares the line's `scaleFactory`, so the value only has to satisfy that same
 * scale: numeric x passes through, `Date` x becomes epoch ms (the time scale's
 * numeric input), and categorical (string) x is forwarded verbatim to the point
 * scale — typed as `number` to fit {@link NgeScatterDataPoint}, resolved by the
 * shared scale at render time.
 */
function toScatterX(x: Date | number | string): number {
  return x instanceof Date ? x.getTime() : (x as number);
}

/**
 * Build the single-point-per-series scatter overlay that marks each line's final
 * value. It reuses the SAME line `scaleFactory` (the line scales ignore non-line
 * layers, so the dot lands exactly on the line's endpoint) and the SAME `seriesColors`
 * palette, so a multi-series sparkline's dots match their lines. An explicit
 * `lastValueColor` wins over the series colour.
 */
function buildLastValueDotLayer(
  data: NgeLineDataPoint[],
  options: { lastValueColor?: string; pointRadius: number; seriesColors?: string[] }
): NgeScatterLayerConfig {
  const { lastValueColor, pointRadius, seriesColors } = options;

  const dots: NgeScatterDataPoint[] = lastDatumPerSeries(data).map(point => ({
    // lastValueColor wins when set; otherwise `undefined` falls through to the
    // scatter series colour, which matches the line's palette below.
    color: lastValueColor,
    seriesId: point.seriesId,
    x: toScatterX(point.x),
    y: point.y,
  }));

  return {
    data: dots,
    pointRadius,
    renderer: renderScatterLayer,
    seriesColors,
    type: 'scatter',
  };
}

/**
 * Compact, axis-less line **sparkline** — a hairline trend meant to sit inline next
 * to a number, not in a full chart frame. Tight margins, a 1px stroke, and points
 * off by default; an optional dot marks each series' last value.
 *
 * This is a thin preset — it introduces no new layer `type`, config-union entry, or
 * theme slice. It applies compact defaults over {@link createLineChartConfig} and,
 * for the end dot, COMPOSES a single-point overlay per series using the existing
 * `scatter` layer on the line's own scales (the Pareto-style `layers: [...line, ...dot]`
 * pattern). Every default is overridable and all other line options pass through.
 *
 * @example
 * // Single-series sparkline with a last-value dot (default on)
 * const config = createSparklineChartConfig({
 *   data: [
 *     { x: 0, y: 4 },
 *     { x: 1, y: 6 },
 *     { x: 2, y: 5 },
 *     { x: 3, y: 8 },
 *   ],
 * });
 *
 * <nge-chart [config]="config" />
 *
 * @example
 * // Multi-series (via seriesId); dots inherit each line's colour, no end dots
 * const config = createSparklineChartConfig({
 *   data: [
 *     { seriesId: 'A', x: 0, y: 4 }, { seriesId: 'A', x: 1, y: 6 },
 *     { seriesId: 'B', x: 0, y: 2 }, { seriesId: 'B', x: 1, y: 3 },
 *   ],
 *   showLastValueDot: false,
 * });
 *
 * <nge-chart [config]="config" />
 */
export function createSparklineChartConfig(options: SparklineChartPresetOptions): NgeChartConfig {
  const {
    lastValueColor,
    lineWidth = DEFAULT_SPARKLINE_LINE_WIDTH,
    margin = DEFAULT_SPARKLINE_MARGIN,
    showLastValueDot = true,
    showPoints = false,
    ...rest
  } = options;

  const lineConfig = createLineChartConfig({
    ...rest,
    lineWidth,
    margin,
    showPoints,
  });

  if (!showLastValueDot) {
    return lineConfig;
  }

  const dotLayer = buildLastValueDotLayer(rest.data, {
    lastValueColor,
    pointRadius: rest.pointRadius ?? DEFAULT_LAST_VALUE_DOT_RADIUS,
    seriesColors: rest.seriesColors,
  });

  return {
    ...lineConfig,
    // Line first (back), the end-value dot second (front) — same composition
    // order as the Pareto preset's bar + cumulative-line stack.
    layers: [...lineConfig.layers, dotLayer],
  };
}
