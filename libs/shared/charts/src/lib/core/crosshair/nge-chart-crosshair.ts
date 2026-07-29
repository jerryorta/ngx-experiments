import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { bisector } from 'd3-array';
import { Delaunay } from 'd3-delaunay';

import type { NgeChartScales, NgeCrosshairConfig } from '../base-layout';
import type { NgeChartDimensions } from '../chart.models';
import type {
  NgeAreaDataPoint,
  NgeAreaLayerConfig,
  NgeChartLayerDefinition,
  NgeLineDataPoint,
  NgeLineLayerConfig,
  NgeOverlayLayerConfig,
  NgeScatterDataPoint,
  NgeScatterLayerConfig,
} from '../config';
import type { NgeTooltipEvent, NgeTooltipHandlers } from '../tooltip';
import type { CrosshairSeries, CrosshairXEntry as XEntry } from './crosshair-hosts';

import { computeAxisTicks } from '../axis';
import { isGestureBrushing } from '../gesture';
import {
  DEFAULT_AREA_LAYER_THEME,
  DEFAULT_LINE_LAYER_THEME,
  DEFAULT_SCATTER_LAYER_THEME,
} from '../theme';
import {
  bandEntryAt,
  collectBandAndDerivedSeries,
  collectBandEntries,
  isBandHost,
  isOneDimensionalHost,
  xKeyOf,
} from './crosshair-hosts';

/** Series bucket key for points that carry no explicit `seriesId`. */
const DEFAULT_SERIES_ID = '__default__';

/**
 * Approximate shared-tooltip geometry, used ONLY to size + clamp the Angular
 * tooltip's position (the tooltip renders CHROMELESS and self-sizes, so these
 * are estimates the story card CSS mirrors — `width: 176px` etc).
 */
/** Fixed width (px) the shared tooltip card is laid out at. */
const TOOLTIP_WIDTH = 176;
/** Height (px) of one series row inside the shared tooltip. */
const TOOLTIP_ROW_HEIGHT = 18;
/** Height (px) reserved for the x-value header row. */
const TOOLTIP_HEADER_HEIGHT = 20;
/** Vertical padding (px) above the header and below the last row. */
const TOOLTIP_PAD_Y = 8;
/** Gap (px) between the guide and the tooltip card's near edge. */
const TOOLTIP_GAP = 14;
/** Focus-dot radius (px) drawn on each series at the snapped x. */
const FOCUS_DOT_R = 3.5;

/** The pointer's last position inside the plot, in plot coords (margin-relative). */
interface CrosshairPointerState {
  px: number;
  py: number;
}

/**
 * Per-svg pointer state, keyed by the one node that survives a render.
 *
 * A gesture emits per frame, the consumer writes a new domain, and the chart
 * re-renders — which re-attaches the crosshair. Without state that outlives the
 * render the guide can only be redrawn by the NEXT `pointermove`, so through a
 * drag it alternates between drawn and blank at pointer rate. Holding the last
 * in-plot position here lets {@link attachCrosshair} re-assert the crosshair
 * against the new render's scales instead, which is what keeps a gesture steady.
 *
 * Entries exist only while the pointer is over the plot: leaving it, leaving the
 * svg, or detaching clears the entry, so a re-render with no pointer on the chart
 * still starts hidden and cannot strand a stale guide after a data change.
 */
const pointerStateBySvg = new WeakMap<SVGSVGElement, CrosshairPointerState>();

/**
 * Params for {@link attachCrosshair}. Mirrors the shape the renderer already has
 * on hand after a render (scales, dimensions, margins, the plot clip) plus the
 * flattened layer definitions the shared-tooltip rows are sourced from.
 */
export interface AttachCrosshairParams {
  /** The outer, margin-translated `<g>` the crosshair groups are appended to. */
  bounds: Selection<SVGGElement, unknown, null, undefined>;
  /** The plot clip-path url (e.g. `url(#nge-chart-clip-3)`) — copied from the layers group. */
  clipPath: null | string;
  /** The opt-in crosshair config (`config.base.crosshair`); undefined/off ⇒ detach. */
  crosshair: NgeCrosshairConfig | undefined;
  dimensions: NgeChartDimensions;
  /** Flattened layer definitions — line/area layers seed the snap x-values + tooltip rows. */
  layers: NgeChartLayerDefinition[];
  margins: { bottom: number; left: number; right: number; top: number };
  scales: NgeChartScales;
  /** The persistent svg wrapper — pointer capture surface (shared with the gesture listeners). */
  svg: Selection<SVGSVGElement, unknown, null, undefined>;
  /**
   * Angular tooltip handler (`{ onTooltip }`) — the shared multi-series tooltip is
   * emitted through it (as `content.rows`) and rendered by the chart's chromeless
   * `#ngeChartTooltip` template. Omit it and the crosshair draws guides + focus
   * dots only (no tooltip).
   */
  tooltipHandler?: NgeTooltipHandlers;
  /**
   * The chart's X-axis tick-count hint (`config.base.xAxisTicks`). Only read when
   * `crosshair.snap === 'tick'`, and passed straight to the shared tick geometry so
   * the guide lands on the SAME ticks the axis and gridlines are drawn from.
   */
  xAxisTicks?: number;
}

/** One rendered tooltip row (a series that has a datum at the snapped x). */
interface CrosshairRow {
  color: string;
  label: string;
  /**
   * Where the focus dot belongs, in DATA space, when the mark does not sit at the
   * value the row reports — a stack segment displays its own magnitude but is drawn
   * at its cumulative top. Omitted whenever the two coincide.
   */
  plotY?: number;
  value: number;
}

/**
 * Pixel position of an x value through the shared x-scale, handling point/band
 * (categorical, centered), linear, and time scales — mirrors the line/area layers'
 * own `getXPosition` so the crosshair snaps to exactly where marks are drawn.
 */
function xPositionOf(x: Date | number | string, scales: NgeChartScales): number {
  const xScale = scales.x as unknown as {
    (value: Date | number | string): number | undefined;
    bandwidth?: () => number;
  };
  if (typeof x === 'string' && xScale.bandwidth) {
    return (xScale(x) ?? 0) + xScale.bandwidth() / 2;
  }
  return xScale(x) ?? 0;
}

/**
 * Pixel position of a y value through the shared y-scale. Scatter y is always
 * continuous, so this is the plain scale call — the band handling `xPositionOf`
 * needs has no y-axis counterpart here.
 */
function yPositionOf(y: number, scales: NgeChartScales): number {
  return (scales.y as ScaleLinear<number, number>)(y) ?? 0;
}

/** Format the x header: dates as a locale date, everything else as-is. */
function formatXValue(x: Date | number | string): string {
  return x instanceof Date ? x.toLocaleDateString() : String(x);
}

/**
 * Resolve line/area layer data into shared-tooltip series, grouped by `seriesId`
 * in first-seen order with colours cycled `palette[i % len]` — matching each
 * layer renderer's own series colouring so the swatches agree with the lines.
 */
function seriesFromPoints(
  data: (NgeAreaDataPoint | NgeLineDataPoint)[],
  palette: string[]
): CrosshairSeries[] {
  const order: string[] = [];
  const byId = new Map<string, Map<string, number>>();

  for (const point of data) {
    const id = point.seriesId ?? DEFAULT_SERIES_ID;
    let lookup = byId.get(id);
    if (!lookup) {
      lookup = new Map<string, number>();
      byId.set(id, lookup);
      order.push(id);
    }
    lookup.set(xKeyOf(point.x), point.y);
  }

  return order.map((id, index) => ({
    color: palette[index % palette.length] ?? 'var(--nge-chart-primary)',
    label: id === DEFAULT_SERIES_ID ? 'Value' : id,
    yByXKey: byId.get(id) as Map<string, number>,
  }));
}

/**
 * Collect every 1-D host series across the flattened layers: the line/area point
 * series here, plus the bar-family and analytical-overlay series resolved by
 * `crosshair-hosts`. A layer type that contributes nothing is recorded there with
 * a reason rather than skipped silently (ARCH-263).
 */
function collectSeries(layers: NgeChartLayerDefinition[]): CrosshairSeries[] {
  const out: CrosshairSeries[] = [];

  for (const layer of layers) {
    if (layer.type === 'line') {
      const line = layer as NgeLineLayerConfig;
      out.push(
        ...seriesFromPoints(
          line.data,
          line.seriesColors ?? DEFAULT_LINE_LAYER_THEME.line.colors ?? []
        )
      );
    } else if (layer.type === 'area') {
      const area = layer as NgeAreaLayerConfig;
      out.push(
        ...seriesFromPoints(
          area.data,
          area.seriesColors ?? DEFAULT_AREA_LAYER_THEME.fill.colors ?? []
        )
      );
    }
  }

  out.push(...collectBandAndDerivedSeries(layers));

  return out;
}

/**
 * One scatter observation with its resolved pixel position, the index of the
 * series it belongs to (into the parallel {@link CrosshairSeries} list) and its
 * final mark colour.
 */
interface ScatterPoint {
  /** Resolved mark colour — `point.color ?? seriesColor`, as the layer draws it. */
  color: string;
  point: NgeScatterDataPoint;
  px: number;
  py: number;
  /** Index into the `series` array {@link collectScatter} returns alongside this. */
  seriesIndex: number;
  xKey: string;
}

/**
 * Flatten every scatter layer into positioned points AND their tooltip series in
 * ONE walk, so a point's `seriesIndex` is guaranteed to address the series array
 * returned beside it.
 *
 * Grouping and colouring mirror the scatter layer's own `groupBySeries`
 * (`render-scatter-layer.ts`) exactly — bucket by `seriesId` in first-seen order,
 * colour `palette[i % len]` with the palette index LAYER-local, falling back to
 * `theme.point.color` when the palette is empty. Diverging from it would put a
 * swatch in the tooltip that disagrees with the dot on the plot.
 */
function collectScatter(
  layers: NgeChartLayerDefinition[],
  scales: NgeChartScales
): { points: ScatterPoint[]; series: CrosshairSeries[] } {
  const points: ScatterPoint[] = [];
  const series: CrosshairSeries[] = [];

  for (const layer of layers) {
    if (layer.type !== 'scatter') {
      continue;
    }
    const scatter = layer as NgeScatterLayerConfig;
    const palette = scatter.seriesColors ?? DEFAULT_SCATTER_LAYER_THEME.point.colors ?? [];

    const order: string[] = [];
    const byId = new Map<string, NgeScatterDataPoint[]>();
    for (const point of scatter.data) {
      const id = point.seriesId ?? DEFAULT_SERIES_ID;
      let bucket = byId.get(id);
      if (!bucket) {
        bucket = [];
        byId.set(id, bucket);
        order.push(id);
      }
      bucket.push(point);
    }

    order.forEach((id, localIndex) => {
      // An empty palette falls through to the theme's single point colour, exactly
      // as the layer's `groupBySeries` does.
      const color =
        palette[localIndex % palette.length] ??
        DEFAULT_SCATTER_LAYER_THEME.point.color ??
        'var(--nge-chart-primary)';
      const seriesIndex = series.length;
      const yByXKey = new Map<string, number>();

      for (const point of byId.get(id) as NgeScatterDataPoint[]) {
        const xKey = xKeyOf(point.x);
        yByXKey.set(xKey, point.y);
        points.push({
          color: point.color ?? color,
          point,
          px: xPositionOf(point.x, scales),
          py: yPositionOf(point.y, scales),
          seriesIndex,
          xKey,
        });
      }

      series.push({
        color,
        label: id === DEFAULT_SERIES_ID ? 'Value' : id,
        yByXKey,
      });
    });
  }

  return { points, series };
}

/**
 * Build the sorted, de-duplicated snap x-values (with pixel positions) across all
 * host layers: line/area datum x's, the analytical overlay's source x's, and the
 * bar family's band categories.
 *
 * A band entry carries its rect (`start`/`width`) so the anchor can be the band the
 * pointer is INSIDE; a continuous entry carries only its position and is resolved
 * by bisector. Band geometry wins on a key claimed by both, since a band anchor
 * needs the rect a continuous entry cannot supply.
 */
function collectXEntries(
  layers: NgeChartLayerDefinition[],
  scales: NgeChartScales,
  boundedWidth: number
): XEntry[] {
  const seen = new Map<string, XEntry>();

  for (const layer of layers) {
    if (layer.type === 'overlay') {
      for (const point of (layer as NgeOverlayLayerConfig).data) {
        const key = xKeyOf(point.x);
        if (!seen.has(key)) {
          seen.set(key, { key, px: xPositionOf(point.x, scales), raw: point.x });
        }
      }
      continue;
    }
    if (layer.type !== 'line' && layer.type !== 'area') {
      continue;
    }
    const data = (layer as NgeAreaLayerConfig | NgeLineLayerConfig).data as (
      NgeAreaDataPoint | NgeLineDataPoint
    )[];
    for (const point of data) {
      const key = xKeyOf(point.x);
      if (!seen.has(key)) {
        seen.set(key, { key, px: xPositionOf(point.x, scales), raw: point.x });
      }
    }
  }

  for (const entry of collectBandEntries(layers, scales, boundedWidth)) {
    seen.set(entry.key, entry);
  }

  return Array.from(seen.values()).sort((a, b) => a.px - b.px);
}

/**
 * Build snap entries from the X-axis TICK positions rather than the data, reusing
 * the shared `computeAxisTicks` geometry so the guide lands exactly where the axis
 * and gridlines draw their ticks (band/point scales emit one centered tick per
 * category, which is already where the marks sit).
 */
function collectTickEntries(scales: NgeChartScales, tickCount: number | undefined): XEntry[] {
  return computeAxisTicks(scales.x, tickCount).map(tick => ({
    key: xKeyOf(tick.value as Date | number | string),
    px: tick.position,
    raw: tick.value as Date | number | string,
  }));
}

const bisectXEntry = bisector<XEntry, number>(entry => entry.px).left;

/** Nearest snap entry to a pointer pixel-x, comparing the two bracketing candidates. */
function nearestEntry(entries: XEntry[], pointerPx: number): null | XEntry {
  if (entries.length === 0) {
    return null;
  }
  const i = bisectXEntry(entries, pointerPx);
  if (i <= 0) {
    return entries[0];
  }
  if (i >= entries.length) {
    return entries[entries.length - 1];
  }
  const lo = entries[i - 1];
  const hi = entries[i];
  return pointerPx - lo.px <= hi.px - pointerPx ? lo : hi;
}

/** The canonical "hide the shared tooltip" event (chromeless host ignores dimensions). */
function hiddenTooltipEvent(): NgeTooltipEvent {
  return {
    content: { label: '', rows: [], value: '' },
    dimensions: { height: 0, width: 0 },
    divotPosition: 'bottom',
    position: { divotX: 0, x: 0, y: 0 },
    visible: false,
  };
}

/**
 * Remove all crosshair DOM + listeners and hide the shared tooltip once
 * (crosshair disabled, or re-enabled elsewhere).
 */
function detach(
  svg: Selection<SVGSVGElement, unknown, null, undefined>,
  bounds: Selection<SVGGElement, unknown, null, undefined>,
  tooltipHandler: NgeTooltipHandlers | undefined
): void {
  const svgNode = svg.node();
  if (svgNode) {
    pointerStateBySvg.delete(svgNode);
  }
  svg.on('pointermove.ngeCrosshair', null).on('pointerleave.ngeCrosshair', null);
  bounds.select('.nge-chart-crosshair').remove();
  tooltipHandler?.onTooltip(hiddenTooltipEvent());
}

/**
 * Attach the shared crosshair + shared multi-series tooltip to the plot (ARCH-213).
 *
 * Opt-in and additive — a sibling of the gesture listeners on the same svg wrapper
 * (namespaced `.ngeCrosshair`, never `stopPropagation`/`preventDefault`), so pan/
 * zoom/brush keep working when both are enabled. Re-called on every render with
 * fresh closures; d3's namespaced `.on()` replaces the listeners idempotently.
 *
 * Coexistence with the plot gestures (ARCH-222) has two halves. **Persistence:** the
 * pointer's last in-plot position is held per-svg, so an attach that finds the pointer
 * still over the plot re-asserts the crosshair against THIS render's scales rather
 * than blanking it — a gesture re-renders every frame, and blanking each time is what
 * made the guide and tooltip flicker through a drag. An attach with no pointer on the
 * chart still starts hidden, so a data change cannot strand a stale guide.
 * **Deference:** while a brush-zoom rectangle is being dragged the crosshair draws
 * nothing, asking {@link isGestureBrushing} rather than racing the brush for the plot.
 * Pan and wheel-zoom are not deferred to — the pointer is still what the reader is
 * tracking there, so the crosshair keeps drawing through them.
 *
 * On `pointermove` inside the plot it snaps a vertical guide to the nearest datum x
 * (a d3 bisector over the merged, de-duplicated datum x-positions of all line/area
 * layers) and draws a focus dot on each series there. With `snap: 'tick'` the guide
 * instead lands on the nearest X-axis TICK — the same `computeAxisTicks` geometry the
 * axis and gridlines use — while the dots and tooltip keep describing the nearest
 * DATUM to that tick, so the dots stay on the series. When `shared`, it also emits
 * the multi-series tooltip through the Angular tooltip handler as `content.rows`
 * (one legend-style row per series: swatch colour + label + y value) — the chart
 * renders it via its chromeless `#ngeChartTooltip` template, positioned beside the
 * guide in container coords. `pointerleave`, moving outside the plot, or a fresh
 * render hides both the guide and the tooltip.
 *
 * NOTE: the guide + focus dots are chart MARKS drawn in the (clipped) plot group;
 * the tooltip is a real Angular tooltip — there is no native SVG tooltip card.
 *
 * Host scope: LINE + AREA layers, or SCATTER (ARCH-221). Scatter y is not a function
 * of x, so a scatter host resolves the anchor in 2-D instead — `Delaunay.find()` over
 * the flattened points, the same triangulation the scatter layer builds for its own
 * hit-test overlay — and BOTH guides land on the resolved point. `snap: 'tick'` is
 * inert there (a tick is an x; the anchor is a point). The 2-D reading applies only
 * when scatter is the SOLE host: mixed scatter + line/area keeps the 1-D x reading,
 * and composed/overlay hosts plus the bar family remain out of scope (ARCH-263).
 * Exported for direct use by the renderer.
 */
export function attachCrosshair(params: AttachCrosshairParams): void {
  const {
    bounds,
    clipPath,
    crosshair,
    dimensions,
    layers,
    margins,
    scales,
    svg,
    tooltipHandler,
    xAxisTicks,
  } = params;

  const svgNode = svg.node();
  const showX = !!crosshair?.x;
  const showY = !!crosshair?.y;
  const showShared = !!crosshair?.shared;

  // Nothing requested (or no svg) ⇒ fully detach so toggling off cleans up.
  if (!svgNode || (!showX && !showY)) {
    detach(svg, bounds, tooltipHandler);
    return;
  }

  // Scatter is resolved in 2-D, so it takes over ONLY when it is the sole host — a
  // chart that also carries ANY 1-D host (line / area / the bar family / an
  // analytical overlay) keeps the 1-D x reading, since the two anchors disagree and
  // silently preferring one would make a composed chart's crosshair depend on layer
  // order (the rule settled in ARCH-221, widened to the new hosts in ARCH-263).
  const scatterHost =
    layers.some(layer => layer.type === 'scatter') && !layers.some(isOneDimensionalHost);

  // Precompute per render: the snap x-values and the tooltip series (data may
  // change between renders, so these are rebuilt with fresh closures each time).
  const scatter = scatterHost ? collectScatter(layers, scales) : null;
  const xEntries = scatterHost ? [] : collectXEntries(layers, scales, dimensions.boundedWidth);
  const series = scatter ? scatter.series : collectSeries(layers);
  const yScale = scales.y as ScaleLinear<number, number>;

  // A categorical host resolves the anchor by asking which band the pointer is
  // INSIDE; a continuous one bisects over datum positions. The two disagree once
  // band widths vary (Marimekko), so the reading follows the host rather than the
  // pixel arithmetic.
  const bandHost = layers.some(isBandHost);
  const resolveEntry = (entries: XEntry[], at: number): null | XEntry =>
    bandHost ? bandEntryAt(entries, at) : nearestEntry(entries, at);

  // 2-D nearest-point index over the flattened scatter points — the same
  // triangulation the scatter layer builds for its per-mark hit-test overlay
  // (ARCH-169), here used only for `find()`. An empty host leaves it null (there
  // is nothing to search), and the crosshair simply draws nothing.
  const delaunay =
    scatter && scatter.points.length > 0
      ? Delaunay.from(scatter.points.map(p => [p.px, p.py] as [number, number]))
      : null;

  // `snap: 'tick'` moves only the GUIDE onto axis-tick positions; the dots and
  // tooltip still resolve through `xEntries` (the data). An axis with no ticks
  // falls back to datum snapping rather than leaving the crosshair inert.
  const tickEntries = crosshair?.snap === 'tick' ? collectTickEntries(scales, xAxisTicks) : [];
  const snapEntries = tickEntries.length > 0 ? tickEntries : xEntries;

  // Crosshair guide group (clipped to the plot). Appended AFTER the layers group
  // so the guide paints above the marks; the plot clip keeps it off the axis
  // gutters/labels.
  let guide = bounds.select<SVGGElement>('.nge-chart-crosshair');
  if (guide.empty()) {
    guide = bounds
      .append('g')
      .classed('nge-chart-crosshair', true)
      .style('pointer-events', 'none');
  }
  guide.attr('clip-path', clipPath);

  const hideGuide = (): void => {
    guide.style('display', 'none');
  };
  const hideTooltip = (): void => {
    tooltipHandler?.onTooltip(hiddenTooltipEvent());
  };
  const hideAll = (): void => {
    hideGuide();
    hideTooltip();
  };

  // Pointer position relative to the plot origin (svg rect + margins) — identical
  // to the gesture listeners' math (jsdom lacks the SVG CTM d3.pointer needs).
  const toPlotPoint = (event: PointerEvent): [number, number] => {
    const rect = svgNode.getBoundingClientRect();
    return [event.clientX - rect.left - margins.left, event.clientY - rect.top - margins.top];
  };

  /** Is this plot position one the crosshair may occupy — i.e. not the margins/axis gutters? */
  const isInPlot = (px: number, py: number): boolean =>
    px >= 0 && px <= dimensions.boundedWidth && py >= 0 && py <= dimensions.boundedHeight;

  const renderAt = (px: number, py: number): void => {
    // --- Resolve the anchor -------------------------------------------------
    // Two host readings feed ONE drawing path below:
    //  • scatter — the nearest point in 2-D, so both guides land ON that point;
    //  • line/area — the nearest datum x in 1-D, with y tracking the raw pointer.
    /** The anchor's x value — non-null exactly when something was resolved. */
    let anchorX: Date | null | number | string = null;
    let lineX: number;
    let dotX: number;
    let guideY: number;
    let drawXGuide: boolean;
    let rows: CrosshairRow[] = [];

    if (scatter) {
      // `snap: 'tick'` is deliberately inert here — a tick is an x, and this
      // anchor is a point; there is nothing coherent for it to move.
      const index = delaunay ? delaunay.find(px, py) : -1;
      const nearest = index >= 0 ? (scatter.points[index] ?? null) : null;

      lineX = nearest ? nearest.px : px;
      dotX = lineX;
      guideY = nearest ? nearest.py : Math.max(0, Math.min(dimensions.boundedHeight, py));
      drawXGuide = showX && !!nearest;

      if (nearest) {
        anchorX = nearest.point.x;
        // The anchor's own row is exact — its y and its resolved mark colour, so a
        // per-datum `color` shows up in the swatch. Other series join it only where
        // they hold a point at the SAME x: the real multi-series case on a discrete
        // or shared x, and empty on continuous data, where one row is the honest answer.
        rows = series.flatMap((s, i) => {
          if (i === nearest.seriesIndex) {
            return [{ color: nearest.color, label: s.label, value: nearest.point.y }];
          }
          const value = s.yByXKey.get(nearest.xKey);
          return value === undefined ? [] : [{ color: s.color, label: s.label, value }];
        });
      }
    } else {
      // The guide snaps through `snapEntries` (ticks under `snap: 'tick'`, else data);
      // the dots + tooltip always resolve to a real DATUM, which is the same entry
      // whenever a tick coincides with one — every band/point axis, and the usual
      // case on continuous axes.
      const snapEntry = showX ? resolveEntry(snapEntries, px) : null;
      const entry =
        snapEntry && snapEntries !== xEntries ? resolveEntry(xEntries, snapEntry.px) : snapEntry;

      lineX = snapEntry ? snapEntry.px : px;
      dotX = entry ? entry.px : lineX;
      guideY = Math.max(0, Math.min(dimensions.boundedHeight, py));
      drawXGuide = showX && !!snapEntry;

      if (entry) {
        anchorX = entry.raw;
        rows = series.flatMap(s => {
          const value = s.yByXKey.get(entry.key);
          if (value === undefined) {
            return [];
          }
          return [
            {
              // A per-datum colour varies the swatch by category on a bar host, so
              // it resolves per x rather than once per series.
              color: s.colorByXKey?.get(entry.key) ?? s.color,
              label: s.label,
              plotY: s.plotYByXKey?.get(entry.key),
              value,
            },
          ];
        });
      }
    }

    // --- Guides + focus dots (clipped group) --------------------------------
    guide.style('display', null);
    guide.selectAll('*').remove();

    if (drawXGuide) {
      guide
        .append('line')
        .attr('x1', lineX)
        .attr('x2', lineX)
        .attr('y1', 0)
        .attr('y2', dimensions.boundedHeight)
        .style('stroke', 'var(--nge-chart-crosshair-guide, var(--nge-chart-on-surface))')
        .style('stroke-opacity', 0.35)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '4 3');
    }

    if (showY) {
      guide
        .append('line')
        .attr('x1', 0)
        .attr('x2', dimensions.boundedWidth)
        .attr('y1', guideY)
        .attr('y2', guideY)
        .style('stroke', 'var(--nge-chart-crosshair-guide, var(--nge-chart-on-surface))')
        .style('stroke-opacity', 0.35)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '4 3');
    }

    if (anchorX !== null) {
      for (const row of rows) {
        guide
          .append('circle')
          .attr('cx', dotX)
          // `plotY` is where the MARK is when that differs from the value the row
          // reports — a stack segment is drawn at its cumulative top.
          .attr('cy', yScale(row.plotY ?? row.value) ?? 0)
          .attr('r', FOCUS_DOT_R)
          .style('fill', row.color)
          .style('stroke', 'var(--nge-chart-surface)')
          .style('stroke-width', 1.5);
      }
    }

    // --- Shared tooltip via the Angular tooltip host ------------------------
    // Only touch the tooltip host when the crosshair OWNS it (`shared`). With
    // `shared` off the guide/dots still draw, but the host is left alone (it was
    // already hidden at attach) so it can't stomp a coexisting per-mark tooltip.
    if (!showShared) {
      return;
    }
    if (anchorX === null || rows.length === 0) {
      hideTooltip();
      return;
    }

    // Approximate card box, flipped to the side of the guide with more room and
    // clamped within the plot — mirrors the old native card's placement, in plot
    // space, then shifted by the margins into container (tooltip) coords below.
    // Vertically it centres on the anchor: the pointer's y on a line/area host,
    // the resolved point's y on a scatter one.
    const height = TOOLTIP_PAD_Y * 2 + TOOLTIP_HEADER_HEIGHT + rows.length * TOOLTIP_ROW_HEIGHT;
    const preferRight = lineX + TOOLTIP_GAP + TOOLTIP_WIDTH <= dimensions.boundedWidth;
    const rawX = preferRight ? lineX + TOOLTIP_GAP : lineX - TOOLTIP_GAP - TOOLTIP_WIDTH;
    const tx = Math.max(4, Math.min(rawX, dimensions.boundedWidth - TOOLTIP_WIDTH - 4));
    const ty = Math.max(4, Math.min(guideY - height / 2, dimensions.boundedHeight - height - 4));

    // Container coords = plot coords + margins (matches the per-mark layer tooltip).
    tooltipHandler?.onTooltip({
      content: { label: formatXValue(anchorX), rows, value: '' },
      dimensions: { height, width: TOOLTIP_WIDTH },
      divotPosition: 'bottom',
      position: { divotX: 0, x: tx + margins.left, y: ty + margins.top },
      visible: true,
    });
  };

  /**
   * Draw the crosshair at a plot position, or hide it. Both entry points go through
   * here — the pointer handler and the re-assert below — so a live pointer and a
   * re-render can never disagree about when the crosshair is visible.
   *
   * Two things hide it: a position outside the plot, and a live brush-zoom drag,
   * whose rectangle owns the plot for its duration.
   */
  const showAt = (px: number, py: number): void => {
    if (!isInPlot(px, py) || isGestureBrushing(svgNode)) {
      hideAll();
      return;
    }
    renderAt(px, py);
  };

  // Re-assert across the re-render. A gesture frame lands here with the pointer
  // still on the plot, so the crosshair is redrawn from THIS render's scales —
  // which both keeps it steady and re-resolves it against the new domain. With no
  // pointer on the chart there is no state, and the attach starts hidden.
  const live = pointerStateBySvg.get(svgNode);
  if (live) {
    showAt(live.px, live.py);
  } else {
    hideAll();
  }

  svg.on('pointermove.ngeCrosshair', (event: PointerEvent) => {
    const [px, py] = toPlotPoint(event);
    // Track only inside the plot: an entry here is what lets the next render
    // re-assert, so leaving the plot must clear it rather than go stale.
    if (!isInPlot(px, py)) {
      pointerStateBySvg.delete(svgNode);
      hideAll();
      return;
    }
    // Recorded even while a brush drag suppresses the drawing, so the crosshair
    // comes back on release without waiting for the pointer to move again.
    pointerStateBySvg.set(svgNode, { px, py });
    showAt(px, py);
  });

  svg.on('pointerleave.ngeCrosshair', () => {
    pointerStateBySvg.delete(svgNode);
    hideAll();
  });
}
