import type { PieArcDatum } from 'd3-shape';

import { interpolate } from 'd3-interpolate';
import { arc, pie } from 'd3-shape';
import 'd3-transition';

import type { NgePieDataPoint, NgePieLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgePieLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { mergePieLayerTheme } from '../../core/theme';

/**
 * A pie slice `<path>` node caches its last-drawn arc datum (`_current`) so the
 * enter/update transition can interpolate angles smoothly (grow-in + reshape).
 */
type PieSliceNode = SVGPathElement & { _current?: PieArcDatum<NgePieDataPoint> };

/**
 * Render the pie / donut / semi-circle layer into the provided bounds with theme
 * support. Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` (center + radius) and IGNORES
 * the injected cartesian `scales`: `innerRadius` is a ratio (0 → pie, >0 → donut) of
 * the self-sized outer radius, and `startAngle`/`endAngle` sweep a semi-circle / gauge.
 * Slices join by `label` (keyed enter/update/exit) and reshape via a classic arc-tween.
 */
export function renderPieLayer(
  context: NgeChartLayerContext<
    NgePieDataPoint,
    NgePieLayerConfig,
    NgePieLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  // Merge theme with defaults
  const theme = mergePieLayerTheme(context.theme);

  // Self-scaled geometry: center in the bounded area, size the outer radius to the
  // smaller half-dimension, and read innerRadius as a ratio of it (0 → pie).
  const cx = dimensions.boundedWidth / 2;
  const cy = dimensions.boundedHeight / 2;
  const outerRadius = Math.min(dimensions.boundedWidth, dimensions.boundedHeight) / 2;
  const innerRadius = (config.innerRadius ?? 0) * outerRadius;

  // Slice palette: config seriesColors (non-empty) else the theme palette.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.slice.colors;

  // Interrupt any running transitions (mirrors bullet/bar) before recomputing the join.
  bounds.selectAll('.nge-pie-slice').interrupt();

  // Container group, centered in the bounded area.
  let container = bounds.select<SVGGElement>('.nge-pie-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-pie-container', true);
  }
  container.attr('transform', `translate(${cx},${cy})`);

  const pieGen = pie<NgePieDataPoint>()
    .value(d => Math.max(0, d.value))
    .sort(null)
    .startAngle(config.startAngle ?? 0)
    .endAngle(config.endAngle ?? 2 * Math.PI)
    .padAngle(config.padAngle ?? 0);

  const arcGen = arc<PieArcDatum<NgePieDataPoint>>()
    .innerRadius(innerRadius)
    .outerRadius(outerRadius);

  const arcs = pieGen(data);

  // Resolve a slice fill: per-datum color → palette by input index (`d.index`, stable
  // under sort(null)) → the single-slice fallback.
  const fillFor = (d: PieArcDatum<NgePieDataPoint>): string =>
    d.data.color ?? palette[d.index % palette.length] ?? theme.slice.color;

  // Reshape tween: interpolate the cached `_current` arc → the target arc so a slice
  // grows in from a zero-sweep collapse (enter) and morphs smoothly (update). `this`
  // is the `<path>` node; cache the interpolated angles PER FRAME so an interrupted
  // transition (rapid updates) resumes from the visible position instead of snapping.
  function arcTween(this: SVGPathElement, d: PieArcDatum<NgePieDataPoint>): (t: number) => string {
    const node = this as PieSliceNode;
    const start = node._current ?? { ...d, endAngle: d.startAngle, startAngle: d.startAngle };
    const interpolator = interpolate(start, d);
    return (t: number) => {
      const interpolated = interpolator(t);
      node._current = interpolated;
      return arcGen(interpolated) ?? '';
    };
  }

  // Keyed enter/update/exit join by slice label.
  const slices = container
    .selectAll<SVGPathElement, PieArcDatum<NgePieDataPoint>>('.nge-pie-slice')
    .data(arcs, d => d.data.label);

  // EXIT — fade out and remove.
  slices
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // ENTER — append + cache a collapsed (zero-sweep) start arc, then grow in.
  const entered = slices
    .enter()
    .append('path')
    .classed('nge-pie-slice', true)
    .each(function (d) {
      (this as PieSliceNode)._current = { ...d, endAngle: d.startAngle, startAngle: d.startAngle };
    });

  entered.transition().duration(animation.enterMs).ease(animation.easing).attrTween('d', arcTween);

  // UPDATE — morph existing slices to the new angles.
  slices.transition().duration(animation.updateMs).ease(animation.easing).attrTween('d', arcTween);

  // Merged selection (new + existing slices).
  const merged = entered.merge(slices);

  // Re-apply ALL styles every render so a runtime theme change (palette / stroke /
  // opacity) reaches already-rendered slices, not just freshly-entered ones. Exiting
  // slices are excluded from the merge, so their fade-out is unaffected.
  merged
    .style('fill', fillFor)
    .style('stroke', theme.slice.stroke)
    .style('stroke-width', theme.slice.strokeWidth)
    .style('opacity', theme.slice.opacity);

  // Tooltip event at the arc centroid, positioned in full-SVG coords (center offset +
  // margins) and clamped to the chart bounds — mirrors the bullet divot/clamp structure.
  const computeTooltipEvent = (d: PieArcDatum<NgePieDataPoint>): NgeTooltipEvent | null => {
    if (!tooltipConfig || !tooltipConfig.formatContent) return null;

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    const [mx, my] = arcGen.centroid(d);
    const sliceCenterX = margins.left + cx + mx;

    // Clamp X so the bubble stays on-canvas (bounds match the chart bounds exactly).
    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;
    const idealTooltipX = sliceCenterX - tooltipWidth / 2;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

    // Y sits above the centroid, clamped to the canvas so a top-edge slice's bubble
    // isn't clipped above the chart (mirrors the X clamp).
    const containerHeight = margins.top + dimensions.boundedHeight + margins.bottom;
    const rawTooltipY = margins.top + cy + my - tooltipHeight - 10;
    const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

    // Divot points at the slice centroid (clamped within the bubble like bullet).
    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4;
    const targetTipX = sliceCenterX - tooltipX;
    const idealDivotX = targetTipX - divotWidth / 2;
    const minDivotX = rx;
    const maxDivotX = tooltipWidth - rx - divotWidth;
    const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
    const divotCenterX = divotX + divotWidth / 2;
    const divotTipOffset = targetTipX - divotCenterX;

    const content = tooltipConfig.formatContent(d.data);

    return {
      content,
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition: 'bottom' as const,
      // Round all position values to avoid subpixel jitter.
      position: {
        divotTipOffset: Math.round(divotTipOffset),
        divotX: Math.round(divotX),
        x: Math.round(tooltipX),
        y: Math.round(tooltipY),
      },
      style: tooltipConfig.style,
      visible: true,
    };
  };

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Cursor: pointer when the slice is interactive.
  merged.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  // Hover interactions for tooltip (re-attached on ALL slices to handle config changes).
  if (tooltipEnabled) {
    merged
      .on('mouseenter', (_event: PointerEvent, d: PieArcDatum<NgePieDataPoint>) => {
        const tooltipEvent = computeTooltipEvent(d);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      })
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
    merged.on('mouseenter', null).on('mouseleave', null);
  }

  // Click handler. Use the datum's own input-order index (`d.index`, stable under
  // sort(null)) — the same value the fill path uses.
  if (config.onClick) {
    merged.on('click', (event: PointerEvent, d: PieArcDatum<NgePieDataPoint>) => {
      config.onClick!({ data: d.data, event, index: d.index });
    });
  } else {
    merged.on('click', null);
  }
}
