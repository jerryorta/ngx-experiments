import { scaleBand, scaleTime } from 'd3-scale';

import type { NgeChartScales } from '../core/base-layout';
import type { NgeChartDimensions } from '../core/chart.models';
import type {
  NgeChartConfig,
  NgeTimelineDataPoint,
  NgeTimelineLayerConfig,
} from '../core/config';

/** One day in milliseconds — the fallback pad for a zero-width time domain. */
const DAY_MS = 24 * 60 * 60 * 1000;

/** Coerce a timeline time value (`Date` | epoch-ms `number` | date `string`) to a `Date`. */
function toDate(value: Date | number | string): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * The timeline's data-driven time extent `[minStart, maxEnd]` as epoch-ms numbers.
 * Milestones contribute only their `start`; a span authored end-before-start folds
 * both ends in. Empty data → a single unit day; a zero-width extent (a single instant
 * / lone milestone) is padded by a day so marks stay visible.
 *
 * Exported because THREE consumers must agree on it — `createTimelineChartScales`'
 * default x domain, the preset's `base.xRangeAxis.fullDomain` (the scrub ruler's full
 * extent), and `NgeTimelineChartTransform`'s zoom-clamp bound — so "100%" is exactly
 * the un-zoomed view and the ruler and plot never disagree.
 */
export function computeTimelineXDataDomain(data: NgeTimelineDataPoint[]): [number, number] {
  let minTime = Number.POSITIVE_INFINITY;
  let maxTime = Number.NEGATIVE_INFINITY;

  for (const d of data) {
    const startMs = toDate(d.start).getTime();
    const endMs = d.milestone ? startMs : toDate(d.end).getTime();
    minTime = Math.min(minTime, startMs, endMs);
    maxTime = Math.max(maxTime, startMs, endMs);
  }

  if (!Number.isFinite(minTime) || !Number.isFinite(maxTime)) {
    return [0, DAY_MS];
  }
  if (minTime === maxTime) {
    return [minTime - DAY_MS, maxTime + DAY_MS];
  }
  return [minTime, maxTime];
}

/**
 * Options for creating timeline / Gantt chart scales.
 */
export interface CreateTimelineChartScalesOptions {
  /**
   * Padding between band rows (0-1). A per-layer `rowPadding` wins over this.
   * @default 0.2
   */
  rowPadding?: number;

  /**
   * Explicit time x-domain `[min, max]` (epoch ms) — the continuous scrub/zoom
   * override. When set, replaces the data-driven extent so the plot renders only that
   * focus window; the range-axis ruler still shows the full extent. Mapped back to
   * `Date`s for the `scaleTime` domain.
   */
  xDomain?: [number, number];
}

const DEFAULT_OPTIONS: Required<Omit<CreateTimelineChartScalesOptions, 'xDomain'>> = {
  rowPadding: 0.2,
};

/**
 * Creates scales for a timeline / Gantt chart: a continuous **time** x-axis and a
 * categorical **band** y-axis (one row per unique `rowId`, first-seen order). The x
 * domain is the data's `[minStart, maxEnd]` extent (see
 * {@link computeTimelineXDataDomain}) unless an explicit `xDomain` focus window is
 * supplied (scrub / zoom). Mirrors the `line` time-x factory (epoch-ms domain mapped
 * back to `Date`s) + the `grouped-bar` band factory — the chart's default
 * `createBarChartScales` only builds band-x / linear-y, so the timeline preset injects
 * this via `scaleFactory`.
 *
 * @param config - The chart configuration containing timeline layers
 * @param dimensions - The bounded dimensions for the chart area
 * @param options - Optional scale creation options (row padding, x-domain focus)
 * @returns Scales object with a time x scale and a band y scale
 */
export function createTimelineChartScales(
  config: NgeChartConfig,
  dimensions: NgeChartDimensions,
  options?: CreateTimelineChartScalesOptions
): NgeChartScales {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const timelineData: NgeTimelineDataPoint[] = [];
  const rowIds: string[] = [];

  for (const layer of config.layers.flat()) {
    if (layer.type !== 'timeline') continue;
    for (const d of layer.data as NgeTimelineDataPoint[]) {
      timelineData.push(d);
      if (!rowIds.includes(d.rowId)) {
        rowIds.push(d.rowId);
      }
    }
  }

  const [xLo, xHi] = opts.xDomain ?? computeTimelineXDataDomain(timelineData);

  const timelineLayer = config.layers.flat().find(l => l.type === 'timeline') as
    | NgeTimelineLayerConfig
    | undefined;
  const rowPadding = timelineLayer?.rowPadding ?? opts.rowPadding;

  const xScale = scaleTime()
    .domain([new Date(xLo), new Date(xHi)])
    .range([0, dimensions.boundedWidth]);

  const yScale = scaleBand<string>()
    .domain(rowIds)
    .range([0, dimensions.boundedHeight])
    .padding(rowPadding);

  return { x: xScale, y: yScale };
}
