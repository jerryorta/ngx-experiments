import type { HierarchyRectangularNode } from 'd3-hierarchy';
import type { Selection } from 'd3-selection';

import { hierarchy, partition } from 'd3-hierarchy';
import { interpolate } from 'd3-interpolate';
import { arc } from 'd3-shape';
import 'd3-transition';

import type { NgeHierarchyDatum, NgeSunburstLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeSunburstLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { mergeSunburstLayerTheme } from '../../core/theme';

/** A laid-out hierarchy node — carries the partition rectangle (`x0/x1/y0/y1`). */
type SunburstNode = HierarchyRectangularNode<NgeHierarchyDatum>;

/**
 * The slim geometry an arc / rect is drawn from: partition offsets in the layout's own
 * units (radial → `x` angle offsets, `y` radius offsets; linear → `x`/`y` pixels). Kept
 * separate from the full {@link SunburstNode} so the radial arc-tween can interpolate it
 * safely — interpolating the whole node would recurse into its circular `parent` link.
 */
interface SegmentGeom {
  x0: number;
  x1: number;
  y0: number;
  y1: number;
}

/**
 * A radial segment `<path>` node caches its last-drawn geometry (`_current`) so the
 * enter/update transition can interpolate offsets smoothly (grow-in + reshape).
 */
type RadialSegmentNode = SVGPathElement & { _current?: SegmentGeom };

/**
 * Render the sunburst / icicle (multi-level hierarchy) layer into the provided bounds
 * with theme support. Pure function — no side effects outside of D3 DOM manipulation.
 *
 * Geometry is SELF-computed from `context.dimensions` (center + radius for `'radial'`,
 * width + height for `'linear'`) and IGNORES the injected cartesian `scales`: the input
 * `data` is wrapped under a synthetic root, summed + sorted into a `d3.hierarchy`, and
 * `d3.partition`ed into per-node rectangles. `'radial'` (default) maps those rectangles
 * to concentric ring arcs (`innerRadius` carves a donut hole, `startAngle`/`endAngle`
 * sweep a gauge); `'linear'` maps them to stacked icicle columns. Segments join by their
 * root-to-node label path (keyed enter/update/exit) and grow in from a collapsed state.
 */
export function renderSunburstLayer(
  context: NgeChartLayerContext<
    NgeHierarchyDatum,
    NgeSunburstLayerConfig,
    NgeSunburstLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  // Merge theme with defaults
  const theme = mergeSunburstLayerTheme(context.theme);

  // Wrap the top-level data under a synthetic root, then sum leaf values up the tree and
  // sort branches by descending magnitude (a stable order for palette + join).
  const root = hierarchy<NgeHierarchyDatum>({ children: data, label: '' } as NgeHierarchyDatum)
    .sum(d => Math.max(0, d.value ?? 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  // Segment palette: config seriesColors (non-empty) else the theme palette.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.segment.colors;

  // Resolve a segment fill: per-node color → palette by TOP-LEVEL branch index (all of a
  // branch's descendants share its hue) → the single-segment fallback.
  const fillFor = (d: SunburstNode): string => {
    const branch = d.ancestors().find(a => a.depth === 1);
    const topIndex = branch ? (root.children?.indexOf(branch) ?? 0) : 0;
    return d.data.color ?? palette[topIndex % palette.length] ?? theme.segment.color;
  };

  // Stable join key: the root-to-node label path (unique per node in the tree).
  const nodeId = (d: SunburstNode): string =>
    d
      .ancestors()
      .map(a => a.data.label)
      .reverse()
      .join('/');

  const layout = config.layout ?? 'radial';

  // Interrupt any running transitions (mirrors pie/bar) before recomputing the join.
  bounds.selectAll('.nge-sunburst-segment').interrupt();

  // Container group (positioned per layout below).
  let container = bounds.select<SVGGElement>('.nge-sunburst-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-sunburst-container', true);
  }

  // Radial (`<path>`) and linear (`<rect>`) segments share the class + join key, so a
  // runtime `layout` flip would match the OLD element type as `update` and never enter the
  // new one. Stamp the container with its rendered layout and clear stale segments when it
  // changes — before the join — so the new element type enters cleanly.
  if (container.attr('data-layout') !== layout) {
    container.selectAll('.nge-sunburst-segment').interrupt().remove();
    container.attr('data-layout', layout);
  }

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  /**
   * Re-apply ALL styles (fill / stroke / opacity) on the MERGED selection every render so
   * a runtime theme change reaches already-rendered segments — exiting segments are
   * excluded from the merge, so their fade-out is unaffected — then (re)wire the cursor,
   * tooltip, and click interactions. `centroidOf` returns the segment centroid in the
   * container's local coords; `originX`/`originY` translate that into full-SVG coords for
   * the tooltip bubble (center offset for radial, top-left origin for linear).
   */
  const applySegmentStylesAndInteractions = <E extends SVGGraphicsElement>(
    merged: Selection<E, SunburstNode, SVGGElement, unknown>,
    nodes: SunburstNode[],
    centroidOf: (d: SunburstNode) => [number, number],
    originX: number,
    originY: number
  ): void => {
    merged
      .style('fill', fillFor)
      .style('stroke', theme.segment.stroke)
      .style('stroke-width', theme.segment.strokeWidth)
      .style('opacity', theme.segment.opacity);

    // Tooltip event at the segment centroid, positioned in full-SVG coords (origin offset
    // + margins) and clamped to the chart bounds — mirrors the pie divot/clamp structure.
    const computeTooltipEvent = (d: SunburstNode): NgeTooltipEvent | null => {
      if (!tooltipConfig || !tooltipConfig.formatContent) return null;

      const tooltipWidth = tooltipConfig.width;
      const tooltipHeight = tooltipConfig.height;

      const [mx, my] = centroidOf(d);
      const segCenterX = margins.left + originX + mx;

      // Clamp X so the bubble stays on-canvas (bounds match the chart bounds exactly).
      const minTooltipX = margins.left;
      const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;
      const idealTooltipX = segCenterX - tooltipWidth / 2;
      const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

      // Y sits above the centroid, clamped to the canvas so a top-edge segment's bubble
      // isn't clipped above the chart (mirrors the X clamp).
      const containerHeight = margins.top + dimensions.boundedHeight + margins.bottom;
      const rawTooltipY = margins.top + originY + my - tooltipHeight - 10;
      const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

      // Divot points at the segment centroid (clamped within the bubble like pie).
      const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
      const rx = 4;
      const targetTipX = segCenterX - tooltipX;
      const idealDivotX = targetTipX - divotWidth / 2;
      const minDivotX = rx;
      const maxDivotX = tooltipWidth - rx - divotWidth;
      const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
      const divotCenterX = divotX + divotWidth / 2;
      const divotTipOffset = targetTipX - divotCenterX;

      // Pass the node's SUMMED value into the formatter so internal (childless-value)
      // nodes report their aggregate magnitude instead of `undefined`.
      const content = tooltipConfig.formatContent({ ...d.data, value: d.value });

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

    // Cursor: pointer when the segment is interactive.
    merged.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

    // Hover interactions for tooltip (re-attached on ALL segments to handle config changes).
    if (tooltipEnabled) {
      merged
        .on('mouseenter', (_event: PointerEvent, d: SunburstNode) => {
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

    // Click handler. Index is the node's position among the drawn (join) nodes.
    if (config.onClick) {
      merged.on('click', (event: PointerEvent, d: SunburstNode) => {
        config.onClick!({ data: d.data, event, index: nodes.indexOf(d) });
      });
    } else {
      merged.on('click', null);
    }
  };

  if (layout === 'radial') {
    // Self-scaled geometry: center in the bounded area, size the outer radius to the
    // smaller half-dimension, and read innerRadius as a ratio of it (0 → rings at center).
    const cx = dimensions.boundedWidth / 2;
    const cy = dimensions.boundedHeight / 2;
    const outerRadius = Math.min(dimensions.boundedWidth, dimensions.boundedHeight) / 2;
    const innerRadiusPx = (config.innerRadius ?? 0) * outerRadius;

    const startAngle = config.startAngle ?? 0;
    const endAngle = config.endAngle ?? 2 * Math.PI;
    const span = endAngle - startAngle;

    // Partition over the FULL hierarchy (incl. synthetic root) into [angle, radius]
    // offsets: x0/x1 sweep [0, span]; y0/y1 span [0, outerRadius]. The undrawn root claims
    // the innermost band [0, root.y1], so remap radius from [root.y1, outerRadius] onto
    // [innerRadiusPx, outerRadius] to reclaim it — depth-1 then starts exactly at
    // innerRadiusPx (0 → touches center) and the deepest ring ends at outerRadius. Using
    // root.y1 as the origin keeps this shape-agnostic (no depth-count arithmetic).
    const layoutRoot = partition<NgeHierarchyDatum>().size([span, outerRadius])(root);
    const nodes = layoutRoot
      .descendants()
      .filter(d => d.depth >= 1 && (config.maxDepth == null || d.depth <= config.maxDepth));

    const rootY1 = layoutRoot.y1; // radius where depth-1 begins
    const remapR = (y: number): number =>
      outerRadius === rootY1
        ? innerRadiusPx
        : innerRadiusPx + ((y - rootY1) / (outerRadius - rootY1)) * (outerRadius - innerRadiusPx);

    container.attr('transform', `translate(${cx},${cy})`);

    const arcGen = arc<SegmentGeom>()
      .startAngle(g => startAngle + g.x0)
      .endAngle(g => startAngle + g.x1)
      .padAngle(config.padAngle ?? 0)
      .innerRadius(g => remapR(g.y0))
      .outerRadius(g => remapR(g.y1));

    // Reshape tween: interpolate the cached `_current` geometry → the target so a segment
    // grows in from a zero-sweep collapse (enter) and morphs smoothly (update). `this` is
    // the `<path>` node; cache the interpolated offsets PER FRAME so an interrupted
    // transition (rapid updates) resumes from the visible position instead of snapping.
    function arcTween(this: SVGPathElement, d: SunburstNode): (t: number) => string {
      const node = this as RadialSegmentNode;
      const target: SegmentGeom = { x0: d.x0, x1: d.x1, y0: d.y0, y1: d.y1 };
      const start = node._current ?? { x0: d.x0, x1: d.x0, y0: d.y0, y1: d.y1 };
      const interpolator = interpolate(start, target);
      return (t: number) => {
        const interpolated = interpolator(t);
        node._current = interpolated;
        return arcGen(interpolated) ?? '';
      };
    }

    // Keyed enter/update/exit join by the node's label path.
    const segments = container
      .selectAll<SVGPathElement, SunburstNode>('.nge-sunburst-segment')
      .data(nodes, nodeId);

    // EXIT — fade out and remove.
    segments
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    // ENTER — append + cache a collapsed (zero-sweep) start geometry, then grow in.
    const entered = segments
      .enter()
      .append('path')
      .classed('nge-sunburst-segment', true)
      .each(function (d) {
        (this as RadialSegmentNode)._current = { x0: d.x0, x1: d.x0, y0: d.y0, y1: d.y1 };
      });

    entered
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .attrTween('d', arcTween);

    // UPDATE — morph existing segments to the new offsets.
    segments
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attrTween('d', arcTween);

    const merged = entered.merge(segments);

    applySegmentStylesAndInteractions(merged, nodes, d => arcGen.centroid(d), cx, cy);
  } else {
    // Linear (icicle): partition into pixel rectangles across width × height (depth
    // increases downward). Container sits at the top-left origin (no center translate).
    const boundedWidth = dimensions.boundedWidth;
    const boundedHeight = dimensions.boundedHeight;
    const layoutRoot = partition<NgeHierarchyDatum>().size([boundedWidth, boundedHeight])(root);
    const nodes = layoutRoot
      .descendants()
      .filter(d => d.depth >= 1 && (config.maxDepth == null || d.depth <= config.maxDepth));

    container.attr('transform', 'translate(0,0)');

    // Reclaim the undrawn root's top strip [0, root.y1]: remap the depth axis from
    // [root.y1, boundedHeight] onto [0, boundedHeight] so depth-1 starts at the top edge
    // and the deepest row ends at the bottom. The x/width axis needs no remap — the root
    // already spans the full width, shared by every column.
    const rootY1 = layoutRoot.y1;
    const remapY = (y: number): number =>
      boundedHeight === rootY1 ? 0 : ((y - rootY1) / (boundedHeight - rootY1)) * boundedHeight;

    const rectX = (d: SunburstNode): number => d.x0;
    const rectY = (d: SunburstNode): number => remapY(d.y0);
    const rectWidth = (d: SunburstNode): number => Math.max(0, d.x1 - d.x0);
    const rectHeight = (d: SunburstNode): number => Math.max(0, remapY(d.y1) - remapY(d.y0));
    const rectMidY = (d: SunburstNode): number => (remapY(d.y0) + remapY(d.y1)) / 2;

    // Keyed enter/update/exit join by the node's label path.
    const segments = container
      .selectAll<SVGRectElement, SunburstNode>('.nge-sunburst-segment')
      .data(nodes, nodeId);

    // EXIT — fade out and remove.
    segments
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    // ENTER — append collapsed at the cell center, then grow out to the full rectangle.
    const entered = segments
      .enter()
      .append('rect')
      .classed('nge-sunburst-segment', true)
      .attr('x', d => (d.x0 + d.x1) / 2)
      .attr('y', rectMidY)
      .attr('width', 0)
      .attr('height', 0);

    entered
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight);

    // UPDATE — resize existing segments to the new rectangle.
    segments
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight);

    const merged = entered.merge(segments);

    applySegmentStylesAndInteractions(merged, nodes, d => [(d.x0 + d.x1) / 2, rectMidY(d)], 0, 0);
  }
}
