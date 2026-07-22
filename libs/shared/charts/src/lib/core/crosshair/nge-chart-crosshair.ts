import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { bisector } from 'd3-array';

import type { NgeChartScales, NgeCrosshairConfig } from '../base-layout';
import type { NgeChartDimensions } from '../chart.models';
import type {
  NgeAreaDataPoint,
  NgeAreaLayerConfig,
  NgeChartLayerDefinition,
  NgeLineDataPoint,
  NgeLineLayerConfig,
} from '../config';
import type { NgeTooltipEvent, NgeTooltipHandlers } from '../tooltip';

import { DEFAULT_AREA_LAYER_THEME, DEFAULT_LINE_LAYER_THEME } from '../theme';

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
}

/** A unique data x-value across all host layers, with its pixel position for snapping. */
interface XEntry {
  key: string;
  px: number;
  raw: Date | number | string;
}

/** A resolved series for the shared tooltip: its swatch colour, label, and y-by-x lookup. */
interface CrosshairSeries {
  color: string;
  label: string;
  yByXKey: Map<string, number>;
}

/** One rendered tooltip row (a series that has a datum at the snapped x). */
interface CrosshairRow {
  color: string;
  label: string;
  value: number;
}

/** Stable string key for an x value (dates keyed by epoch ms) — matches the layer renderers. */
function xKeyOf(x: Date | number | string): string {
  return x instanceof Date ? String(x.getTime()) : String(x);
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
    color: palette[index % palette.length] ?? 'var(--chart-primary)',
    label: id === DEFAULT_SERIES_ID ? 'Value' : id,
    yByXKey: byId.get(id) as Map<string, number>,
  }));
}

/** Collect every host (line/area) series across the flattened layers. */
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

  return out;
}

/** Build the sorted, de-duplicated snap x-values (with pixel positions) across all host layers. */
function collectXEntries(layers: NgeChartLayerDefinition[], scales: NgeChartScales): XEntry[] {
  const seen = new Map<string, XEntry>();

  for (const layer of layers) {
    if (layer.type !== 'line' && layer.type !== 'area') {
      continue;
    }
    const data = (layer as NgeAreaLayerConfig | NgeLineLayerConfig).data as (
      | NgeAreaDataPoint
      | NgeLineDataPoint
    )[];
    for (const point of data) {
      const key = xKeyOf(point.x);
      if (!seen.has(key)) {
        seen.set(key, { key, px: xPositionOf(point.x, scales), raw: point.x });
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.px - b.px);
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
 * On `pointermove` inside the plot it snaps a vertical guide to the nearest datum x
 * (a d3 bisector over the merged, de-duplicated datum x-positions of all line/area
 * layers) and draws a focus dot on each series there. When `shared`, it also emits
 * the multi-series tooltip through the Angular tooltip handler as `content.rows`
 * (one legend-style row per series: swatch colour + label + y value) — the chart
 * renders it via its chromeless `#ngeChartTooltip` template, positioned beside the
 * guide in container coords. `pointerleave`, moving outside the plot, or a fresh
 * render hides both the guide and the tooltip.
 *
 * NOTE: the guide + focus dots are chart MARKS drawn in the (clipped) plot group;
 * the tooltip is a real Angular tooltip — there is no native SVG tooltip card.
 *
 * Prototype scope: continuous-x LINE + AREA hosts. Scatter (Voronoi) and
 * snap-to-tick are out of scope. Exported for direct use by the renderer.
 */
export function attachCrosshair(params: AttachCrosshairParams): void {
  const { bounds, clipPath, crosshair, dimensions, layers, margins, scales, svg, tooltipHandler } =
    params;

  const svgNode = svg.node();
  const showX = !!crosshair?.x;
  const showY = !!crosshair?.y;
  const showShared = !!crosshair?.shared;

  // Nothing requested (or no svg) ⇒ fully detach so toggling off cleans up.
  if (!svgNode || (!showX && !showY)) {
    detach(svg, bounds, tooltipHandler);
    return;
  }

  // Precompute per render: the snap x-values and the tooltip series (data may
  // change between renders, so these are rebuilt with fresh closures each time).
  const xEntries = collectXEntries(layers, scales);
  const series = collectSeries(layers);
  const yScale = scales.y as ScaleLinear<number, number>;

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
  // Re-attaching (a fresh render) starts hidden; the next pointermove re-shows with
  // current geometry — avoids a stale guide/tooltip lingering after a data change.
  const hideAll = (): void => {
    hideGuide();
    hideTooltip();
  };
  hideAll();

  // Pointer position relative to the plot origin (svg rect + margins) — identical
  // to the gesture listeners' math (jsdom lacks the SVG CTM d3.pointer needs).
  const toPlotPoint = (event: PointerEvent): [number, number] => {
    const rect = svgNode.getBoundingClientRect();
    return [event.clientX - rect.left - margins.left, event.clientY - rect.top - margins.top];
  };

  const renderAt = (px: number, py: number): void => {
    const entry = showX ? nearestEntry(xEntries, px) : null;
    const lineX = entry ? entry.px : px;
    const clampedY = Math.max(0, Math.min(dimensions.boundedHeight, py));

    // --- Guides + focus dots (clipped group) --------------------------------
    guide.style('display', null);
    guide.selectAll('*').remove();

    if (showX && entry) {
      guide
        .append('line')
        .attr('x1', lineX)
        .attr('x2', lineX)
        .attr('y1', 0)
        .attr('y2', dimensions.boundedHeight)
        .style('stroke', 'var(--chart-crosshair-guide, var(--chart-on-surface))')
        .style('stroke-opacity', 0.35)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '4 3');
    }

    if (showY) {
      guide
        .append('line')
        .attr('x1', 0)
        .attr('x2', dimensions.boundedWidth)
        .attr('y1', clampedY)
        .attr('y2', clampedY)
        .style('stroke', 'var(--chart-crosshair-guide, var(--chart-on-surface))')
        .style('stroke-opacity', 0.35)
        .style('stroke-width', 1)
        .style('stroke-dasharray', '4 3');
    }

    // Rows: series that actually have a datum at the snapped x.
    const rows: CrosshairRow[] = entry
      ? series
          .map(s => ({ color: s.color, label: s.label, value: s.yByXKey.get(entry.key) }))
          .filter((r): r is CrosshairRow => r.value !== undefined)
      : [];

    if (showX && entry) {
      for (const row of rows) {
        guide
          .append('circle')
          .attr('cx', lineX)
          .attr('cy', yScale(row.value) ?? 0)
          .attr('r', FOCUS_DOT_R)
          .style('fill', row.color)
          .style('stroke', 'var(--chart-surface)')
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
    if (!entry || rows.length === 0) {
      hideTooltip();
      return;
    }

    // Approximate card box, flipped to the side of the guide with more room and
    // clamped within the plot — mirrors the old native card's placement, in plot
    // space, then shifted by the margins into container (tooltip) coords below.
    const height = TOOLTIP_PAD_Y * 2 + TOOLTIP_HEADER_HEIGHT + rows.length * TOOLTIP_ROW_HEIGHT;
    const preferRight = lineX + TOOLTIP_GAP + TOOLTIP_WIDTH <= dimensions.boundedWidth;
    const rawX = preferRight ? lineX + TOOLTIP_GAP : lineX - TOOLTIP_GAP - TOOLTIP_WIDTH;
    const tx = Math.max(4, Math.min(rawX, dimensions.boundedWidth - TOOLTIP_WIDTH - 4));
    const ty = Math.max(4, Math.min(clampedY - height / 2, dimensions.boundedHeight - height - 4));

    // Container coords = plot coords + margins (matches the per-mark layer tooltip).
    tooltipHandler?.onTooltip({
      content: { label: formatXValue(entry.raw), rows, value: '' },
      dimensions: { height, width: TOOLTIP_WIDTH },
      divotPosition: 'bottom',
      position: { divotX: 0, x: tx + margins.left, y: ty + margins.top },
      visible: true,
    });
  };

  svg.on('pointermove.ngeCrosshair', (event: PointerEvent) => {
    const [px, py] = toPlotPoint(event);
    // Only track inside the plot area — margins/axes gutters hide the crosshair.
    if (px < 0 || px > dimensions.boundedWidth || py < 0 || py > dimensions.boundedHeight) {
      hideAll();
      return;
    }
    renderAt(px, py);
  });

  svg.on('pointerleave.ngeCrosshair', () => hideAll());
}
