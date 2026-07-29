import type { NgeChartScales } from '../base-layout';
import type {
  NgeBarLayerConfig,
  NgeChartLayerDefinition,
  NgeChartLayerType,
  NgeGroupedBarLayerConfig,
  NgeOverlayLayerConfig,
  NgeStackedBarLayerConfig,
} from '../config';

import {
  buildStackedBarSeries,
  computeMarimekkoColumns,
} from '../../nge-chart/nge-chart.stacked-bar.helpers';
import { controlLimits, linearFit, loessFit } from '../../layers/overlay/overlay-fit.helpers';
import { orderedBandCategories } from '../gesture';
import {
  DEFAULT_BAR_LAYER_THEME,
  DEFAULT_GROUPED_BAR_LAYER_THEME,
  DEFAULT_OVERLAY_LAYER_THEME,
  DEFAULT_STACKED_BAR_LAYER_THEME,
} from '../theme';

/**
 * How a layer type participates in the shared crosshair.
 *
 * - `continuous` — a datum x on the shared x-scale, resolved in 1-D by bisector
 *   (line / area).
 * - `band` — a categorical band on the shared x-scale, resolved by asking which
 *   band the pointer is INSIDE (the bar family).
 * - `point` — resolved in 2-D over the flattened marks, because y is not a
 *   function of x (scatter). Exclusive: see `attachCrosshair`.
 * - `derived` — contributes no marks of its own but computes a value at the
 *   resolved x (the analytical overlay).
 * - `none` — contributes nothing, for the documented `reason`.
 */
export type CrosshairHostKind = 'band' | 'continuous' | 'derived' | 'none' | 'point';

/** One layer type's crosshair participation, with a reason when it has none. */
export interface CrosshairHostSupport {
  /**
   * `true` when the layer sits on the shared cartesian scales and COULD host, but
   * is not wired yet. Separates "not built" from "structurally impossible" so a
   * later story can pick the eligible ones up without re-deriving which are which.
   */
  eligible?: boolean;
  kind: CrosshairHostKind;
  /** Why this layer contributes nothing. Present exactly when `kind` is `'none'`. */
  reason?: string;
}

/**
 * Every layer type's crosshair participation — the answer to "why did nothing
 * happen on this chart?".
 *
 * Typed as a total `Record` on purpose: adding a member to `NgeChartLayerType`
 * fails the build until it is classified here, which is what keeps an unsupported
 * layer an explicit decision rather than a silent `continue` (ARCH-263). A `'none'`
 * entry must carry a `reason`; an `eligible` one says the omission is scope, not
 * geometry.
 */
export const CROSSHAIR_HOST_SUPPORT: Record<NgeChartLayerType, CrosshairHostSupport> = {
  area: { kind: 'continuous' },
  bar: { kind: 'band' },
  bullet: {
    kind: 'none',
    reason: 'self-scaling single datum — builds its own value scale and has no category axis',
  },
  bump: {
    eligible: true,
    kind: 'none',
    reason: 'ranks series at an ordered x; eligible as a continuous host but not yet wired',
  },
  chord: { kind: 'none', reason: 'radial node-link layout — no cartesian x' },
  distribution: {
    kind: 'none',
    reason: 'a category holds a whole distribution, not one value at an x',
  },
  'diverging-bar': {
    kind: 'none',
    reason: 'self-scaling single datum — builds its own [min, max] scale and has no category axis',
  },
  financial: {
    kind: 'none',
    reason: 'an OHLC bar carries four values at one x, so a single row would misreport it',
  },
  funnel: { kind: 'none', reason: 'self-scaling stage geometry — no shared cartesian x' },
  gauge: { kind: 'none', reason: 'self-scaling single datum on its own angular scale' },
  'grouped-bar': { kind: 'band' },
  heatmap: {
    kind: 'none',
    reason: 'a 2-D categorical grid — one column holds a value per row, not one value',
  },
  histogram: {
    eligible: true,
    kind: 'none',
    reason: 'bins are x RANGES rather than datum x values; eligible but needs a bin-aware anchor',
  },
  line: { kind: 'continuous' },
  lollipop: {
    eligible: true,
    kind: 'none',
    reason: 'categorical like the bar family; eligible as a band host but not yet wired',
  },
  network: { kind: 'none', reason: 'force-directed node-link layout — no cartesian x' },
  overlay: { kind: 'derived' },
  'parallel-coords': {
    kind: 'none',
    reason: 'draws its own per-dimension axes — x is a dimension index, not a data x',
  },
  pie: { kind: 'none', reason: 'radial — no cartesian x' },
  proportional: { kind: 'none', reason: 'self-scaling area/waffle packing — no cartesian x' },
  radar: { kind: 'none', reason: 'radial — no cartesian x' },
  'radial-bar': { kind: 'none', reason: 'radial — no cartesian x' },
  sankey: { kind: 'none', reason: 'node-link flow layout — no cartesian x' },
  scatter: { kind: 'point' },
  'stacked-bar': { kind: 'band' },
  sunburst: { kind: 'none', reason: 'radial hierarchy — no cartesian x' },
  timeline: {
    eligible: true,
    kind: 'none',
    reason: 'items span [start, end] on band ROWS; eligible but needs a span-aware anchor',
  },
  tree: { kind: 'none', reason: 'hierarchical node-link layout — no cartesian x' },
  treemap: { kind: 'none', reason: 'space-filling hierarchy — no cartesian x' },
  waterfall: {
    eligible: true,
    kind: 'none',
    reason: 'categorical like the bar family; eligible as a band host but not yet wired',
  },
  wordcloud: { kind: 'none', reason: 'spiral text packing — no cartesian x' },
};

/**
 * A unique data x across the host layers, with the pixel geometry the crosshair
 * snaps against. `start`/`width` are present only for a BAND entry, where the
 * anchor is the band the pointer is inside rather than the nearest centre.
 */
export interface CrosshairXEntry {
  key: string;
  px: number;
  raw: Date | number | string;
  /** Band rect start (px) — band entries only. */
  start?: number;
  /** Band rect width (px) — band entries only. */
  width?: number;
}

/** A resolved series for the shared tooltip: swatch colour, label, and lookups by x key. */
export interface CrosshairSeries {
  color: string;
  /**
   * Per-x mark colour, when a per-datum `color` makes the swatch vary by category.
   * Falls back to `color` for any x it does not hold.
   */
  colorByXKey?: Map<string, string>;
  label: string;
  /**
   * Per-x plot y for the focus dot, when the mark does not sit at the value the row
   * displays — a stack segment shows its own magnitude but is drawn at its
   * cumulative top. Falls back to `yByXKey`.
   */
  plotYByXKey?: Map<string, number>;
  yByXKey: Map<string, number>;
}

/**
 * Swatch colour of last resort. Every nested theme field is optional even under
 * `Required<…>` (which only lifts the top level), so each read carries the literal
 * fallback the workspace styling rule asks for — the same shape `collectSeries`
 * uses for the line/area palettes.
 */
const FALLBACK_MARK_COLOR = 'var(--nge-chart-primary)';

/** Stable string key for an x value (dates keyed by epoch ms) — matches the layer renderers. */
export function xKeyOf(x: Date | number | string): string {
  return x instanceof Date ? String(x.getTime()) : String(x);
}

/** The shared x-scale, narrowed to the call + optional band surface every scale kind offers. */
type XScaleLike = {
  (value: Date | number | string): number | undefined;
  bandwidth?: () => number;
};

/**
 * A layer's category axis is the shared x-scale only in VERTICAL orientation —
 * every bar-family renderer computes `isVertical ? scales.x : scales.y`. A
 * horizontal chart puts its categories on y, which an x-snapping crosshair has no
 * way to address, so those layers contribute nothing (a runtime opt-out, since
 * orientation is config rather than type).
 */
function isVerticalBand(layer: NgeChartLayerDefinition): boolean {
  if (layer.type === 'stacked-bar') {
    const stacked = layer as NgeStackedBarLayerConfig;
    // Marimekko is vertical-only, regardless of `orientation` — mirrors the renderer.
    return stacked.bandWidthAccessor !== undefined || stacked.orientation !== 'horizontal';
  }
  const oriented = layer as NgeBarLayerConfig | NgeGroupedBarLayerConfig;
  return oriented.orientation !== 'horizontal';
}

/** Band geometry for one category through the shared band scale. */
function bandEntryOf(
  category: string,
  scales: NgeChartScales
): { px: number; start: number; width: number } {
  const xScale = scales.x as unknown as XScaleLike;
  const start = xScale(category) ?? 0;
  // A point scale reports zero bandwidth, so its "band" collapses onto the
  // position itself and containment never matches — nearest-centre then answers,
  // which is the right reading for a point scale.
  const width = xScale.bandwidth?.() ?? 0;
  return { px: start + width / 2, start, width };
}

/**
 * Band entries for a bar-family layer, in the renderer's own first-seen category
 * order. Marimekko self-computes variable column widths across the bounded width
 * and IGNORES the shared band scale, so its geometry comes from the same helper
 * the renderer uses — otherwise every marimekko column would snap to the wrong
 * place.
 */
function bandEntriesOf(
  layer: NgeChartLayerDefinition,
  scales: NgeChartScales,
  boundedWidth: number
): CrosshairXEntry[] {
  if (layer.type === 'stacked-bar') {
    const stacked = layer as NgeStackedBarLayerConfig;
    const built = buildStackedBarSeries(stacked.data, stacked.stackOffset);

    if (stacked.bandWidthAccessor) {
      return computeMarimekkoColumns(
        built.columns,
        boundedWidth,
        stacked.barPadding ?? 0,
        stacked.bandWidthAccessor
      ).map(column => ({
        key: column.category,
        px: column.x + column.width / 2,
        raw: column.category,
        start: column.x,
        width: column.width,
      }));
    }

    return built.categories.map(category => ({
      key: category,
      raw: category,
      ...bandEntryOf(category, scales),
    }));
  }

  const categories =
    layer.type === 'bar'
      ? orderedBandCategories((layer as NgeBarLayerConfig).data, d => d.label)
      : orderedBandCategories((layer as NgeGroupedBarLayerConfig).data, d => d.label);

  return categories.map(category => ({
    key: category,
    raw: category,
    ...bandEntryOf(category, scales),
  }));
}

/**
 * The band a pointer is INSIDE, falling back to the nearest centre when it sits in
 * padding or beyond the outermost band.
 *
 * Containment rather than a bisector over centres, because the two disagree once
 * band widths vary: a Marimekko column's width is proportional to its group total,
 * so a wide column's neighbour can own a pixel that is closer to the neighbour's
 * centre. For uniform bands the two readings coincide.
 */
export function bandEntryAt(entries: CrosshairXEntry[], px: number): CrosshairXEntry | null {
  if (entries.length === 0) {
    return null;
  }

  for (const entry of entries) {
    const start = entry.start;
    const width = entry.width;
    if (start !== undefined && width !== undefined && px >= start && px <= start + width) {
      return entry;
    }
  }

  let nearest = entries[0];
  let best = Math.abs(px - nearest.px);
  for (const entry of entries) {
    const distance = Math.abs(px - entry.px);
    if (distance < best) {
      best = distance;
      nearest = entry;
    }
  }
  return nearest;
}

/**
 * Series for a single-series `bar` layer. The renderer fills every bar from ONE
 * colour (`d.color ?? theme.bar.color`) with no palette cycle, so the swatch does
 * too — a per-datum override rides `colorByXKey`.
 */
function barSeries(layer: NgeBarLayerConfig): CrosshairSeries[] {
  const color = DEFAULT_BAR_LAYER_THEME.bar.color ?? FALLBACK_MARK_COLOR;
  const yByXKey = new Map<string, number>();
  const colorByXKey = new Map<string, string>();

  for (const point of layer.data) {
    yByXKey.set(point.label, point.value);
    if (point.color) {
      colorByXKey.set(point.label, point.color);
    }
  }

  return [{ color, colorByXKey, label: 'Value', yByXKey }];
}

/**
 * Series for a `grouped-bar` layer: one per `groupId`, in first-seen order.
 *
 * ⚠️ The renderer treats `label` as the AXIS category and `groupId` as the series
 * (`render-grouped-bar-layer.ts` — "Categories (label) are on the axis; series
 * (groupId) are side-by-side bars"), which is the opposite of what the data
 * model's own field comments suggest. The renderer is authoritative. It also fills
 * every inner bar from the single `theme.bar.color` — there is no palette cycle
 * here, unlike the stacked layer.
 */
function groupedBarSeries(layer: NgeGroupedBarLayerConfig): CrosshairSeries[] {
  const color = DEFAULT_GROUPED_BAR_LAYER_THEME.bar.color ?? FALLBACK_MARK_COLOR;
  const groupIds = orderedBandCategories(layer.data, d => d.groupId);
  const byGroup = new Map<string, CrosshairSeries>();

  for (const groupId of groupIds) {
    byGroup.set(groupId, {
      color,
      colorByXKey: new Map<string, string>(),
      label: groupId,
      yByXKey: new Map<string, number>(),
    });
  }

  for (const point of layer.data) {
    const series = byGroup.get(point.groupId);
    if (!series) {
      continue;
    }
    series.yByXKey.set(point.label, point.value);
    if (point.color) {
      series.colorByXKey?.set(point.label, point.color);
    }
  }

  return groupIds.map(groupId => byGroup.get(groupId) as CrosshairSeries);
}

/**
 * Series for a `stacked-bar` layer: one per `seriesId`, in the stack's own order.
 *
 * The stack itself comes from `buildStackedBarSeries` — the same helper the
 * renderer calls — so the cumulative bounds (and `stackOffset: 'expand'`
 * normalisation) are identical to what is drawn rather than re-derived. Each row
 * reports the segment's own `value` while its focus dot rides `y1`, the segment's
 * top edge, because a stacked segment does not sit at its own magnitude.
 *
 * Colour mirrors the renderer's `resolveSegmentFill`: a per-datum `color`, else
 * the config/theme palette cycled by series index.
 */
function stackedBarSeries(layer: NgeStackedBarLayerConfig): CrosshairSeries[] {
  const built = buildStackedBarSeries(layer.data, layer.stackOffset);
  const palette = layer.seriesColors ?? DEFAULT_STACKED_BAR_LAYER_THEME.bar.colors ?? [];

  const colorByDatum = new Map<string, string>();
  for (const point of layer.data) {
    if (point.color) {
      colorByDatum.set(`${point.category} ${point.seriesId}`, point.color);
    }
  }

  return built.seriesOrder.map((seriesId, index) => {
    const yByXKey = new Map<string, number>();
    const plotYByXKey = new Map<string, number>();
    const colorByXKey = new Map<string, string>();

    for (const column of built.columns) {
      const segment = column.segments.find(candidate => candidate.seriesId === seriesId);
      if (!segment) {
        continue;
      }
      yByXKey.set(column.category, segment.value);
      plotYByXKey.set(column.category, segment.y1);
      const override = colorByDatum.get(`${column.category} ${seriesId}`);
      if (override) {
        colorByXKey.set(column.category, override);
      }
    }

    return {
      color: palette[index % palette.length] ?? FALLBACK_MARK_COLOR,
      colorByXKey,
      label: seriesId,
      plotYByXKey,
      yByXKey,
    };
  });
}

/**
 * Round a DERIVED value to 2 decimals for display.
 *
 * Host rows report a datum's own y and inherit whatever precision the data has; an
 * overlay row is computed, so an unrounded least-squares fit renders as
 * `65.5202380952381` in the shared card. The overlay layer's own tooltips already
 * settle on 2 decimals (`formatStat`), so the crosshair reports its values the same
 * way rather than inventing a second convention.
 */
function roundDerived(value: number): number {
  return Math.round(value * 100) / 100;
}

/**
 * Coerce a Date / number / string x to a plain number, matching the overlay
 * renderer's own `toNumericX` so a fit evaluated here lands on the curve drawn
 * there.
 */
function toNumericX(x: Date | number | string): number {
  if (x instanceof Date) {
    return +x;
  }
  if (typeof x === 'number') {
    return x;
  }
  const n = Number(x);
  return Number.isNaN(n) ? +new Date(x) : n;
}

/**
 * The overlay's own curve, sampled at every x it covers.
 *
 * An overlay's `data` is the series it ANALYSES — usually the host's own — so
 * contributing those points as rows would just duplicate the host's. What it
 * genuinely adds is the derived value beside the actual one, labelled in the
 * layer's own vocabulary: `'Trend'` for a fit, `'Mean'` for the control centre
 * line.
 *
 * `'fan'` contributes nothing: nested prediction bands describe a RANGE that
 * widens with x, so there is no single value at an x for a row to report.
 */
function overlaySeries(layer: NgeOverlayLayerConfig): CrosshairSeries[] {
  const source = layer.seriesId
    ? layer.data.filter(d => d.seriesId === layer.seriesId)
    : layer.data;

  const points = source
    .map(d => ({ raw: d.x, x: toNumericX(d.x), y: d.y }))
    .filter(p => Number.isFinite(p.x) && Number.isFinite(p.y));

  if (points.length === 0 || layer.mode === 'fan') {
    return [];
  }

  const yByXKey = new Map<string, number>();

  if (layer.mode === 'control') {
    const { mean } = controlLimits(
      points.map(p => p.y),
      layer.sigma
    );
    if (!Number.isFinite(mean)) {
      return [];
    }
    // The centre line is flat, so every x reports the same value.
    for (const point of points) {
      yByXKey.set(xKeyOf(point.raw), roundDerived(mean));
    }
    return [
      {
        color: DEFAULT_OVERLAY_LAYER_THEME.meanLine.color ?? FALLBACK_MARK_COLOR,
        label: 'Mean',
        yByXKey,
      },
    ];
  }

  if (layer.fit === 'loess') {
    // LOESS is sampled rather than closed-form: `loessFit` sorts by x and averages
    // repeated x's, so match its output back to the source x by numeric value.
    const smoothed = loessFit(
      points.map(p => ({ x: p.x, y: p.y })),
      layer.loessBandwidth
    );
    const smoothedByX = new Map(smoothed.map(p => [p.x, p.y]));
    for (const point of points) {
      const y = smoothedByX.get(point.x);
      if (y !== undefined) {
        yByXKey.set(xKeyOf(point.raw), roundDerived(y));
      }
    }
  } else {
    const { intercept, slope } = linearFit(points.map(p => ({ x: p.x, y: p.y })));
    if (!Number.isFinite(slope) || !Number.isFinite(intercept)) {
      return [];
    }
    for (const point of points) {
      yByXKey.set(xKeyOf(point.raw), roundDerived(slope * point.x + intercept));
    }
  }

  if (yByXKey.size === 0) {
    return [];
  }

  return [
    {
      color: DEFAULT_OVERLAY_LAYER_THEME.fitLine.color ?? FALLBACK_MARK_COLOR,
      label: 'Trend',
      yByXKey,
    },
  ];
}

/** Does this layer contribute a categorical band anchor to the crosshair? */
export function isBandHost(layer: NgeChartLayerDefinition): boolean {
  return CROSSHAIR_HOST_SUPPORT[layer.type].kind === 'band' && isVerticalBand(layer);
}

/**
 * Does this layer contribute a 1-D x anchor — the reading that a scatter layer
 * defers to whenever the two are composed on one chart (ARCH-221)?
 */
export function isOneDimensionalHost(layer: NgeChartLayerDefinition): boolean {
  const kind = CROSSHAIR_HOST_SUPPORT[layer.type].kind;
  if (kind === 'band') {
    return isVerticalBand(layer);
  }
  return kind === 'continuous' || kind === 'derived';
}

/**
 * Band snap entries across every bar-family host on the chart, de-duplicated by
 * category (first host to claim a category owns its geometry) and ordered left to
 * right.
 */
export function collectBandEntries(
  layers: NgeChartLayerDefinition[],
  scales: NgeChartScales,
  boundedWidth: number
): CrosshairXEntry[] {
  const seen = new Map<string, CrosshairXEntry>();

  for (const layer of layers) {
    if (!isBandHost(layer)) {
      continue;
    }
    for (const entry of bandEntriesOf(layer, scales, boundedWidth)) {
      if (!seen.has(entry.key)) {
        seen.set(entry.key, entry);
      }
    }
  }

  return Array.from(seen.values()).sort((a, b) => a.px - b.px);
}

/** Tooltip series across every bar-family and overlay host, in layer order. */
export function collectBandAndDerivedSeries(layers: NgeChartLayerDefinition[]): CrosshairSeries[] {
  const out: CrosshairSeries[] = [];

  for (const layer of layers) {
    if (layer.type === 'overlay') {
      out.push(...overlaySeries(layer as NgeOverlayLayerConfig));
      continue;
    }
    if (!isBandHost(layer)) {
      continue;
    }
    if (layer.type === 'bar') {
      out.push(...barSeries(layer as NgeBarLayerConfig));
    } else if (layer.type === 'grouped-bar') {
      out.push(...groupedBarSeries(layer as NgeGroupedBarLayerConfig));
    } else if (layer.type === 'stacked-bar') {
      out.push(...stackedBarSeries(layer as NgeStackedBarLayerConfig));
    }
  }

  return out;
}
