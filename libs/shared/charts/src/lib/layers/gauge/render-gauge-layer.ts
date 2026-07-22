import type { ScaleLinear } from 'd3-scale';
import type { Selection } from 'd3-selection';

import { interpolate } from 'd3-interpolate';
import { scaleLinear } from 'd3-scale';
import { arc } from 'd3-shape';
import 'd3-transition';

import type { ResolvedNgeChartAnimation } from '../../core/animation';
import type {
  NgeGaugeDataPoint,
  NgeGaugeLayerConfig,
  NgeGaugeShape,
  NgeGaugeThreshold,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeGaugeLayerTheme, ResolvedNgeGaugeLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { mergeGaugeLayerTheme } from '../../core/theme';

/** Default sweep: a 270° speedometer (radial-bar convention, 0 = 12 o'clock, clockwise). */
const DEFAULT_START_ANGLE = -0.75 * Math.PI;
const DEFAULT_END_ANGLE = 0.75 * Math.PI;

/** Default inner-radius ratio (the classic gauge ring). */
const DEFAULT_INNER_RADIUS_RATIO = 0.65;

/** Height (px) of the `shape: 'linear'` progress rail. */
const LINEAR_RAIL_HEIGHT = 20;

/** Gap (px) between the linear rail and the value label sitting above it. */
const LINEAR_LABEL_GAP = 6;

/**
 * Multiplier on `theme.label.fontSize` used to size the needle's inner (pivot) endpoint —
 * a hub sized to the label's own footprint, not the ring's `innerRadiusPx` (which is often
 * far larger than the label needs and reads as a floating, disconnected needle).
 */
const NEEDLE_HUB_RADIUS_TO_FONT_SIZE_RATIO = 1.4;

/** Every mark class the gauge layer owns — used for the interrupt + the empty-data teardown. */
const GAUGE_MARK_SELECTOR =
  '.nge-gauge-track, .nge-gauge-value, .nge-gauge-needle, .nge-gauge-arc-band, ' +
  '.nge-gauge-rail, .nge-gauge-fill, .nge-gauge-linear-band, .nge-gauge-label';

/** The angular span a `d3.arc()` is drawn from. */
interface GaugeArcDatum {
  endAngle: number;
  startAngle: number;
}

/** A value-arc `<path>` caches its last-drawn end angle so the grow-in tween stays smooth. */
type GaugeArcNode = SVGPathElement & { _a1?: number };

/** A needle `<line>` caches its last-drawn rotation (degrees) so the swing tween stays smooth. */
type GaugeNeedleNode = SVGLineElement & { _deg?: number };

/** One resolved colored threshold band along the track, keyed for its (tiny) sub-join. */
interface GaugeBand {
  color: string;
  from: number;
  key: string;
  to: number;
}

/** Resolved geometry + palette threaded through the gauge mark helpers. */
interface GaugeRenderParams {
  angleScale: ScaleLinear<number, number>;
  animation: ResolvedNgeChartAnimation;
  boundedWidth: number;
  datum: NgeGaugeDataPoint;
  endAngle: number;
  fillWidth: number;
  innerRadiusPx: number;
  outerRadius: number;
  railHeight: number;
  showValueLabel: boolean;
  span: number;
  startAngle: number;
  theme: ResolvedNgeGaugeLayerTheme;
  thresholds: NgeGaugeThreshold[];
  value: number;
  valueAngle: number;
  widthScale: ScaleLinear<number, number>;
}

/**
 * Render the gauge (single-value meter) layer into the provided bounds with theme support.
 * Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` (center + radius) and IGNORES the
 * injected cartesian `scales` (like `bullet`). As a single-value meter it uses the
 * sanctioned singleton idiom — a container created once and mutated in place, NO keyed
 * `.data()` join and NO exit (the threshold bands are the one small keyed sub-join, since
 * their count varies with the threshold list). One primitive fans out across the meter
 * family: `shape: 'arc'` draws a circular gauge (`indicator: 'fill'` grows a value arc,
 * `indicator: 'needle'` swings a needle), `shape: 'linear'` a horizontal progress bar. The
 * create branch animates over `animation.enterMs`, later updates over `animation.updateMs`.
 */
export function renderGaugeLayer(
  context: NgeChartLayerContext<
    NgeGaugeDataPoint,
    NgeGaugeLayerConfig,
    NgeGaugeLayerTheme | undefined
  >
): void {
  const { bounds, config, dimensions } = context;

  const datum = config.data;

  // Empty / invalid datum: interrupt owned transitions and tear the singleton down.
  if (!bounds || !datum) {
    bounds?.selectAll(GAUGE_MARK_SELECTOR).interrupt();
    bounds?.select('.nge-gauge-container').remove();
    return;
  }

  const theme = mergeGaugeLayerTheme(context.theme);

  const { max, min } = datum;
  const span = max - min;
  const value = clampValue(datum.value, min, max);

  // Self-scaled geometry: center in the bounded area, size the outer radius to the smaller
  // half-dimension, and read innerRadius as a 0–1 ratio of it (clamped so it can't invert).
  const cx = dimensions.boundedWidth / 2;
  const cy = dimensions.boundedHeight / 2;
  const outerRadius = Math.min(dimensions.boundedWidth, dimensions.boundedHeight) / 2;
  const innerRatio = Math.max(
    0,
    Math.min(config.innerRadius ?? DEFAULT_INNER_RADIUS_RATIO, 1 - 1e-6)
  );
  const innerRadiusPx = innerRatio * outerRadius;

  const startAngle = config.startAngle ?? DEFAULT_START_ANGLE;
  const endAngle = config.endAngle ?? DEFAULT_END_ANGLE;

  // Value scales (self-scaled, ignore context.scales): value → angle (arc) / width (linear),
  // both clamped. The `span > 0` guard keeps a degenerate [min === max] range NaN-free.
  const angleScale = scaleLinear().domain([min, max]).range([startAngle, endAngle]).clamp(true);
  const widthScale = scaleLinear()
    .domain([min, max])
    .range([0, dimensions.boundedWidth])
    .clamp(true);
  const valueAngle = span > 0 ? angleScale(value) : startAngle;
  const fillWidth = span > 0 ? widthScale(value) : 0;
  const railHeight = Math.max(4, Math.min(dimensions.boundedHeight, LINEAR_RAIL_HEIGHT));

  // Interrupt any in-flight transitions before reconciling.
  bounds.selectAll(GAUGE_MARK_SELECTOR).interrupt();

  // Singleton container, centered in the bounded area (both shapes draw relative to center).
  let container = bounds.select<SVGGElement>('.nge-gauge-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-gauge-container', true);
  }
  container.attr('transform', `translate(${cx},${cy})`);

  const params: GaugeRenderParams = {
    angleScale,
    animation: context.animation,
    boundedWidth: dimensions.boundedWidth,
    datum,
    endAngle,
    fillWidth,
    innerRadiusPx,
    outerRadius,
    railHeight,
    showValueLabel: config.showValueLabel ?? true,
    span,
    startAngle,
    theme,
    thresholds: config.thresholds ?? [],
    value,
    valueAngle,
    widthScale,
  };

  const shape = config.shape ?? 'arc';
  const indicator = config.indicator ?? 'fill';
  const bands = buildGaugeBands(params);

  if (shape === 'arc') {
    // Remove the inactive (linear) marks, then draw the arc track + bands + indicator.
    container.selectAll('.nge-gauge-rail, .nge-gauge-fill, .nge-gauge-linear-band').remove();
    renderArcTrack(container, params);
    renderArcBands(container, params, bands);
    if (indicator === 'needle') {
      container.select('.nge-gauge-value').remove();
      renderArcNeedle(container, params);
    } else {
      container.select('.nge-gauge-needle').remove();
      renderArcValue(container, params);
    }
  } else {
    // Remove the inactive (arc) marks, then draw the rail + bands + progress fill.
    container
      .selectAll('.nge-gauge-track, .nge-gauge-value, .nge-gauge-needle, .nge-gauge-arc-band')
      .remove();
    renderLinearRail(container, params);
    renderLinearBands(container, params, bands);
    renderLinearFill(container, params);
  }

  renderValueLabel(container, params, shape);

  // Lock the paint order: track/rail + bands (back) → value/needle/fill → label (front).
  container.selectAll('.nge-gauge-value, .nge-gauge-needle, .nge-gauge-fill').raise();
  container.select('.nge-gauge-label').raise();

  wireGaugeInteraction(context, value);
}

/** Clamp a value into `[min, max]`; a non-finite value collapses to `min`. */
function clampValue(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}

/**
 * Resolve the ascending threshold list into colored track bands. Band N spans from the
 * prior band's upper bound (or the datum `min`) up to `threshold[n].value`; its color is
 * the per-threshold `color` or the theme palette cycled by band index. N thresholds → N
 * bands.
 */
function buildGaugeBands(params: GaugeRenderParams): GaugeBand[] {
  const { datum, theme, thresholds } = params;
  const palette = theme.threshold.colors;
  const sorted = [...thresholds].sort((left, right) => left.value - right.value);

  let previous = datum.min;
  return sorted.map((threshold, index) => {
    const from = previous;
    const to = threshold.value;
    previous = to;
    return {
      color: threshold.color ?? palette[index % palette.length] ?? theme.value.color,
      from,
      key: `gauge-band-${index}`,
      to,
    };
  });
}

/** Build the `d3.arc()` generator for the gauge track / value / band arcs. */
function gaugeArcGen(params: GaugeRenderParams) {
  return arc<GaugeArcDatum>()
    .innerRadius(params.innerRadiusPx)
    .outerRadius(params.outerRadius)
    .startAngle(d => d.startAngle)
    .endAngle(d => d.endAngle);
}

/** Draw / update the full-sweep background track arc. */
function renderArcTrack(
  container: Selection<SVGGElement, unknown, null, undefined>,
  params: GaugeRenderParams
): void {
  const { endAngle, startAngle, theme } = params;
  const arcGen = gaugeArcGen(params);
  const existing = container.select<SVGPathElement>('.nge-gauge-track');
  const track = existing.empty()
    ? container.append('path').classed('nge-gauge-track', true)
    : existing;
  track
    .attr('d', arcGen({ endAngle, startAngle }) ?? '')
    .style('fill', theme.track.color)
    .style('opacity', theme.track.opacity);
}

/**
 * Draw / update the filled value arc (`indicator: 'fill'`). Grows from `startAngle` on
 * enter (over `enterMs`) and eases to the new value angle on update (over `updateMs`) via
 * an arc-tween that reads the last angle off the node (`_a1`) so several gauges on one page
 * stay independent. The target span is bound as datum for smear-free, testable geometry.
 */
function renderArcValue(
  container: Selection<SVGGElement, unknown, null, undefined>,
  params: GaugeRenderParams
): void {
  const { animation, datum, startAngle, theme, valueAngle } = params;
  const fill = datum.color ?? theme.value.color;
  const arcGen = gaugeArcGen(params);

  function valueTween(this: SVGPathElement): (t: number) => string {
    const node = this as GaugeArcNode;
    const from = node._a1 ?? startAngle;
    const interpolator = interpolate(from, valueAngle);
    return (t: number): string => {
      const a1 = interpolator(t);
      node._a1 = a1;
      return arcGen({ endAngle: a1, startAngle }) ?? '';
    };
  }

  const existing = container.select<SVGPathElement>('.nge-gauge-value');
  const creating = existing.empty();
  const path = creating
    ? container
        .append('path')
        .classed('nge-gauge-value', true)
        .each(function () {
          (this as GaugeArcNode)._a1 = startAngle;
        })
    : existing;

  path
    .datum<GaugeArcDatum>({ endAngle: valueAngle, startAngle })
    .style('fill', fill)
    .style('opacity', theme.value.opacity)
    .transition()
    .duration(creating ? animation.enterMs : animation.updateMs)
    .ease(animation.easing)
    .attrTween('d', valueTween);
}

/**
 * Draw / update the angular-gauge needle (`indicator: 'needle'`). Rotated to the value angle
 * (radial-bar convention: 0 = straight up, clockwise); the swing is animated by tweening the
 * rotation from the last drawn angle (read off the node as `_deg`), so several gauges stay
 * independent. The target angle is bound as datum.
 *
 * The inner endpoint is pulled out to a small hub — sized off the label's own font size,
 * capped at `innerRadiusPx` so it never pokes past the ring — rather than starting at the
 * pivot (0,0). The needle then clears the center (like the value-arc fill's donut hole)
 * while still reading as a needle anchored near the label, not a floating ring segment.
 */
function renderArcNeedle(
  container: Selection<SVGGElement, unknown, null, undefined>,
  params: GaugeRenderParams
): void {
  const { animation, datum, innerRadiusPx, outerRadius, startAngle, theme, valueAngle } = params;
  const stroke = datum.color ?? theme.needle.color;
  const startDeg = (startAngle * 180) / Math.PI;
  const valueDeg = (valueAngle * 180) / Math.PI;
  const hubRadius = Math.min(
    innerRadiusPx,
    theme.label.fontSize * NEEDLE_HUB_RADIUS_TO_FONT_SIZE_RATIO
  );

  function needleTween(this: SVGLineElement): (t: number) => string {
    const node = this as GaugeNeedleNode;
    const from = node._deg ?? startDeg;
    const interpolator = interpolate(from, valueDeg);
    return (t: number): string => {
      const deg = interpolator(t);
      node._deg = deg;
      return `rotate(${deg})`;
    };
  }

  const existing = container.select<SVGLineElement>('.nge-gauge-needle');
  const creating = existing.empty();
  const line = creating
    ? container
        .append('line')
        .classed('nge-gauge-needle', true)
        .attr('transform', `rotate(${startDeg})`)
        .each(function () {
          (this as GaugeNeedleNode)._deg = startDeg;
        })
    : existing;

  line
    .datum({ angle: valueAngle })
    .attr('x1', 0)
    .attr('x2', 0)
    .attr('y1', -hubRadius)
    .attr('y2', -outerRadius)
    .style('stroke', stroke)
    .style('stroke-linecap', 'round')
    .style('stroke-width', theme.needle.width)
    .transition()
    .duration(creating ? animation.enterMs : animation.updateMs)
    .ease(animation.easing)
    .attrTween('transform', needleTween);
}

/** Draw / update the background rail (`shape: 'linear'`). */
function renderLinearRail(
  container: Selection<SVGGElement, unknown, null, undefined>,
  params: GaugeRenderParams
): void {
  const { boundedWidth, railHeight, theme } = params;
  const rx = railHeight / 2;
  const existing = container.select<SVGRectElement>('.nge-gauge-rail');
  const rail = existing.empty()
    ? container.append('rect').classed('nge-gauge-rail', true)
    : existing;
  rail
    .attr('height', railHeight)
    .attr('rx', rx)
    .attr('ry', rx)
    .attr('width', boundedWidth)
    .attr('x', -boundedWidth / 2)
    .attr('y', -railHeight / 2)
    .style('fill', theme.track.color)
    .style('opacity', theme.track.opacity);
}

/**
 * Draw / update the progress fill (`shape: 'linear'`). Grows its width from 0 on enter and
 * eases to the new width on update; d3 reads each rect's current width as the animate-from,
 * so several gauges stay independent. The target width is bound as datum.
 */
function renderLinearFill(
  container: Selection<SVGGElement, unknown, null, undefined>,
  params: GaugeRenderParams
): void {
  const { animation, boundedWidth, datum, fillWidth, railHeight, theme } = params;
  const fill = datum.color ?? theme.value.color;
  const rx = railHeight / 2;
  const existing = container.select<SVGRectElement>('.nge-gauge-fill');
  const creating = existing.empty();
  const rect = creating
    ? container.append('rect').classed('nge-gauge-fill', true).attr('width', 0)
    : existing;
  rect
    .datum({ width: fillWidth })
    .attr('height', railHeight)
    .attr('rx', rx)
    .attr('ry', rx)
    .attr('x', -boundedWidth / 2)
    .attr('y', -railHeight / 2)
    .style('fill', fill)
    .style('opacity', theme.value.opacity)
    .transition()
    .duration(creating ? animation.enterMs : animation.updateMs)
    .ease(animation.easing)
    .attr('width', fillWidth);
}

/**
 * Draw the colored threshold bands as arc segments (a tiny keyed enter/update/exit join —
 * the one sub-join the singleton meter allows, since the band count varies with the
 * threshold list). Each band spans its `[from, to]` value range mapped to angles.
 */
function renderArcBands(
  container: Selection<SVGGElement, unknown, null, undefined>,
  params: GaugeRenderParams,
  bands: GaugeBand[]
): void {
  const { angleScale, span, startAngle } = params;
  const arcGen = gaugeArcGen(params);
  const angleOf = (v: number): number => (span > 0 ? angleScale(v) : startAngle);

  const selection = container
    .selectAll<SVGPathElement, GaugeBand>('.nge-gauge-arc-band')
    .data(bands, d => d.key);

  selection.exit().remove();

  selection
    .enter()
    .append('path')
    .classed('nge-gauge-arc-band', true)
    .merge(selection)
    .attr('d', d => arcGen({ endAngle: angleOf(d.to), startAngle: angleOf(d.from) }) ?? '')
    .style('fill', d => d.color);
}

/**
 * Draw the colored threshold bands as rail segments (a tiny keyed enter/update/exit join).
 * Each band spans its `[from, to]` value range mapped to x positions along the rail.
 */
function renderLinearBands(
  container: Selection<SVGGElement, unknown, null, undefined>,
  params: GaugeRenderParams,
  bands: GaugeBand[]
): void {
  const { boundedWidth, railHeight, span, widthScale } = params;
  const xOf = (v: number): number => (span > 0 ? widthScale(v) : 0) - boundedWidth / 2;

  const selection = container
    .selectAll<SVGRectElement, GaugeBand>('.nge-gauge-linear-band')
    .data(bands, d => d.key);

  selection.exit().remove();

  selection
    .enter()
    .append('rect')
    .classed('nge-gauge-linear-band', true)
    .merge(selection)
    .attr('height', railHeight)
    .attr('width', d => Math.max(0, xOf(d.to) - xOf(d.from)))
    .attr('x', d => xOf(d.from))
    .attr('y', -railHeight / 2)
    .style('fill', d => d.color);
}

/**
 * Draw / update the center value label (`showValueLabel`, default true). Shows the clamped
 * value + units; centered in the arc, seated just above the linear rail. Removed when off.
 */
function renderValueLabel(
  container: Selection<SVGGElement, unknown, null, undefined>,
  params: GaugeRenderParams,
  shape: NgeGaugeShape
): void {
  const { datum, railHeight, showValueLabel, theme, value } = params;

  if (!showValueLabel) {
    container.select('.nge-gauge-label').remove();
    return;
  }

  // Keep the label clear of the marks: above the linear rail; true-centered at the pivot for
  // an arc (both indicators — the needle's inner endpoint is pulled out to innerRadiusPx, so
  // it clears the center like the value-arc fill's donut hole instead of crossing through it).
  const labelY = shape === 'linear' ? -(railHeight / 2 + LINEAR_LABEL_GAP) : 0;

  const units = datum.units ?? '';
  const existing = container.select<SVGTextElement>('.nge-gauge-label');
  const label = existing.empty()
    ? container.append('text').classed('nge-gauge-label', true)
    : existing;

  label
    .attr('dominant-baseline', shape === 'linear' ? 'auto' : 'central')
    .attr('text-anchor', 'middle')
    .attr('x', 0)
    .attr('y', labelY)
    .style('fill', theme.label.color)
    .style('font-family', theme.label.fontFamily)
    .style('font-size', `${theme.label.fontSize}px`)
    .style('font-weight', theme.label.fontWeight)
    .text(`${value}${units}`);
}

/**
 * Resolve a pointer event to bounds-local coordinates. Uses the SVG screen CTM when the
 * browser provides it (accurate under viewBox scaling — the bar / grouped-bar / timeline
 * pattern), guarded with `typeof` and falling back to the bounds' client rect so it never
 * throws under jsdom (which implements neither `createSVGPoint` nor `getScreenCTM`).
 */
function resolvePointer(event: PointerEvent, boundsNode: SVGGElement): { x: number; y: number } {
  const owner = boundsNode.ownerSVGElement;
  if (
    owner &&
    typeof owner.createSVGPoint === 'function' &&
    typeof boundsNode.getScreenCTM === 'function'
  ) {
    const ctm = boundsNode.getScreenCTM();
    if (ctm) {
      const svgPoint = owner.createSVGPoint();
      svgPoint.x = event.clientX;
      svgPoint.y = event.clientY;
      const local = svgPoint.matrixTransform(ctm.inverse());
      return { x: local.x, y: local.y };
    }
  }
  const rect = boundsNode.getBoundingClientRect();
  return { x: event.clientX - rect.left, y: event.clientY - rect.top };
}

/**
 * Wire the tooltip (following the pointer) + click on the whole layer bounds (a single-value
 * meter has one interaction target). On enter / move the bubble floats just above the cursor
 * with the divot pointing down at it, clamped within the chart bounds; leave hides it. The
 * click / tooltip payload carries the datum with its clamped value. Handlers are (re)attached
 * every render (and detached when the tooltip is disabled).
 */
function wireGaugeInteraction(
  context: NgeChartLayerContext<
    NgeGaugeDataPoint,
    NgeGaugeLayerConfig,
    NgeGaugeLayerTheme | undefined
  >,
  value: number
): void {
  const { bounds, config, dimensions, margins, tooltipConfig, tooltipHandlers } = context;
  const datum = config.data;

  const computeTooltipEvent = (event: PointerEvent): NgeTooltipEvent | null => {
    const boundsNode = bounds.node();
    if (!tooltipConfig || !tooltipConfig.formatContent || !boundsNode) {
      return null;
    }

    const pointer = resolvePointer(event, boundsNode);
    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    // Follow the pointer: float the bubble just above it (full-SVG coords), clamped in X to
    // the chart bounds, with the divot pointing down at the cursor.
    const containerWidth = margins.left + dimensions.boundedWidth + margins.right;
    const idealX = margins.left + pointer.x - tooltipWidth / 2;
    const tooltipX = Math.max(0, Math.min(containerWidth - tooltipWidth, idealX));
    const tooltipY = margins.top + pointer.y - tooltipHeight - 10;

    // Divot centered on the pointer, shifted to stay put when the bubble is clamped in X.
    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const baseDivotX = (tooltipWidth - divotWidth) / 2;
    const divotX = baseDivotX + (margins.left + pointer.x - (tooltipX + tooltipWidth / 2));

    return {
      content: tooltipConfig.formatContent({ ...datum, value }),
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition: 'bottom' as const,
      position: {
        divotX: Math.round(divotX),
        x: Math.round(tooltipX),
        y: Math.round(tooltipY),
      },
      style: tooltipConfig.style,
      visible: true,
    };
  };

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;
  if (tooltipEnabled) {
    const emit = (event: PointerEvent): void => {
      const tooltipEvent = computeTooltipEvent(event);
      if (tooltipEvent) {
        tooltipHandlers!.onTooltip(tooltipEvent);
      }
    };
    bounds
      .on('mouseenter', emit)
      .on('mousemove', emit)
      .on('mouseleave', () => {
        tooltipHandlers!.onTooltip({
          content: { label: '', value: '' },
          dimensions: { height: tooltipConfig!.height, width: tooltipConfig!.width },
          divotPosition: 'bottom',
          position: { divotX: 0, x: 0, y: 0 },
          visible: false,
        });
      });
  } else {
    bounds.on('mouseenter', null).on('mousemove', null).on('mouseleave', null);
  }

  if (config.onClick) {
    bounds.style('cursor', 'pointer').on('click', (event: PointerEvent) => {
      config.onClick!({ data: { ...datum, value }, event, index: 0 });
    });
  } else {
    bounds.style('cursor', 'default').on('click', null);
  }
}
