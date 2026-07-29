import type { HierarchyNode, HierarchyRectangularNode } from 'd3-hierarchy';
import type { Selection } from 'd3-selection';

import { hcl } from 'd3-color';
import {
  hierarchy,
  treemap,
  treemapBinary,
  treemapDice,
  treemapResquarify,
  treemapSlice,
  treemapSliceDice,
  treemapSquarify,
} from 'd3-hierarchy';
import { polygonCentroid } from 'd3-polygon';
import { line } from 'd3-shape';
import 'd3-transition';

import type {
  NgeHierarchyDatum,
  NgeTreemapLayerConfig,
  NgeTreemapTiling,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeTreemapLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';
import type { VoronoiTreemapPolygon } from './voronoi-treemap-layout';

import {
  elideLabelText,
  mergeTreemapLayerTheme,
  resolveNgeChartThemeColor,
  resolveLabelColor,
  toCssFontSize,
} from '../../core/theme';
import { voronoiTreemapCellsFor } from './voronoi-treemap-layout';

/** A hierarchy node before any layout has positioned it. */
type TreemapNode = HierarchyNode<NgeHierarchyDatum>;

/** A hierarchy node carrying its rectangle (`x0/y0/x1/y1`) from `d3.treemap`. */
type TreemapRectNode = HierarchyRectangularNode<NgeHierarchyDatum>;

/** Where a label is anchored, in the container's local coordinates. */
interface LabelAnchor {
  x: number;
  y: number;
}

/**
 * Smallest cell extent (px) in EITHER direction that still earns a label when no
 * `minLabelSize` is supplied.
 *
 * 12px is one line box at the default 10px label size — a `<text>` element stands about
 * 1.2× its font size once ascenders and descenders are counted (`GLYPH_BOX_RATIO` in
 * `render-wordcloud-layer.ts` measures 1.10–1.17), so a cell shorter than this cannot seat
 * a line of text however wide it is. Applying the same threshold to both axes is what
 * makes a treemap legible at depth: cell areas span orders of magnitude, and a sliver that
 * is 200px wide and 3px tall would otherwise be labelled.
 */
const DEFAULT_MIN_LABEL_SIZE = 12;

/** Default gap (px) between sibling cells — enough to read as a separation with the stroke. */
const DEFAULT_PADDING = 1;

/**
 * A `d3.treemap` tile function. Declared structurally rather than as `typeof treemapSquarify`
 * because the squarify factories carry an extra `.ratio()` the other four tilings do not, so
 * the concrete type of one is not a type the whole set satisfies.
 */
type TreemapTileFn = (
  node: TreemapRectNode,
  x0: number,
  y0: number,
  x1: number,
  y1: number
) => void;

/** `tiling` → the `d3.treemap` tile function it selects. `'voronoi'` is not a tile fn. */
const TILE_FNS: Record<Exclude<NgeTreemapTiling, 'voronoi'>, TreemapTileFn> = {
  binary: treemapBinary,
  dice: treemapDice,
  resquarify: treemapResquarify,
  slice: treemapSlice,
  'slice-dice': treemapSliceDice,
  squarify: treemapSquarify,
};

/** Path generator for a Voronoi cell's vertex list. */
const cellLine = line<[number, number]>();

/**
 * Width of the horizontal chord through a convex polygon at height `y`.
 *
 * A label sits at its cell's centroid, and for a Voronoi cell the space actually available
 * to the text is the polygon's width AT THAT HEIGHT, not its bounding box — a triangular
 * cell's bounding box overstates the room near the apex by an arbitrary amount, and text
 * elided to it runs out over the slanted edges. Cells are convex, so the scanline crosses
 * the boundary exactly twice and min/max is the whole answer.
 */
function horizontalChordWidth(polygon: VoronoiTreemapPolygon, y: number): number {
  let min = Number.POSITIVE_INFINITY;
  let max = Number.NEGATIVE_INFINITY;

  for (let i = 0; i < polygon.length; i++) {
    const [x1, y1] = polygon[i];
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    if ((y1 <= y && y2 >= y) || (y2 <= y && y1 >= y)) {
      const t = y2 === y1 ? 0 : (y - y1) / (y2 - y1);
      const x = x1 + t * (x2 - x1);
      min = Math.min(min, x);
      max = Math.max(max, x);
    }
  }

  return max > min ? max - min : 0;
}

/** Axis-aligned extent of a polygon, used for the label-suppression size test. */
function polygonExtent(polygon: VoronoiTreemapPolygon): { height: number; width: number } {
  let minX = Number.POSITIVE_INFINITY;
  let maxX = Number.NEGATIVE_INFINITY;
  let minY = Number.POSITIVE_INFINITY;
  let maxY = Number.NEGATIVE_INFINITY;

  for (const [x, y] of polygon) {
    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  }

  return { height: maxY - minY, width: maxX - minX };
}

/**
 * Render a treemap layer — nested cells whose AREA is proportional to value.
 *
 * Self-scaled to `dimensions.boundedWidth × boundedHeight`; it ignores the shared cartesian
 * scales the way the radial layers do. `tiling` picks the partition: the six `d3.treemap`
 * tile functions give axis-aligned rectangles (adding `paddingOuter` / `paddingTop` keeps
 * parents visible behind their children for the nested reading), while `'voronoi'` swaps in
 * a weighted-Voronoi tessellation of straight-edged convex polygons.
 *
 * Cells join by their root-to-node label path (keyed enter/update/exit) and are placed at
 * their FINAL geometry synchronously, then faded in — the standard for layers whose marks
 * are re-laid-out wholesale (area / line / histogram), and the reason a resize or a gesture
 * re-render never shows a half-grown cell. Nodes are drawn parent-first and the merged
 * selection is `.order()`ed, so a parent can never paint over the children nested inside it.
 *
 * Opt-in labels (`showLabels`) ride a SECOND join on the same key, drawn inside the cell and
 * styled from `theme.label` with automatic on-fill contrast. They are positioned by plain
 * `x` / `y` attributes rather than a `transform`, which is what keeps this layer clear of the
 * `transform`-tween trap that `AGENTS.md` warns every Wave-3 layer hits first — a treemap
 * label is always horizontal, so it never needed a transform in the first place.
 *
 * **Suppression.** Cell areas span orders of magnitude, so `minLabelSize` (tested on BOTH
 * axes) and `maxLabelDepth` drop the cells that cannot hold text. Suppression filters the
 * label join's DATA rather than hiding elements, so a cell that shrinks past a threshold
 * exits cleanly and re-enters when the data grows it back.
 */
export function renderTreemapLayer(
  context: NgeChartLayerContext<
    NgeHierarchyDatum,
    NgeTreemapLayerConfig,
    NgeTreemapLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, data, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds || !Array.isArray(data) || data.length === 0) {
    return;
  }

  const theme = mergeTreemapLayerTheme(context.theme);

  // Wrap the top-level data under a synthetic root, then sum leaf values up the tree and
  // sort branches by descending magnitude (a stable order for palette + join).
  const root = hierarchy<NgeHierarchyDatum>({ children: data, label: '' } as NgeHierarchyDatum)
    .sum(d => Math.max(0, d.value ?? 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));

  // Cell palette: config seriesColors (non-empty) else the theme palette.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.cell.colors;

  // Stable join key: the root-to-node label path (unique per node in the tree).
  const nodeId = (d: TreemapNode): string =>
    d
      .ancestors()
      .map(a => a.data.label)
      .reverse()
      .join('/');

  const styleHost = bounds.node();

  /**
   * Resolve a cell fill: per-node `color` → palette by TOP-LEVEL branch index (all of a
   * branch's descendants share its hue), then lighten by depth.
   *
   * The depth fade is what makes nesting visible. A branch painted one flat colour reads as
   * a single blob once its children get small, and the hairline stroke alone cannot carry
   * the structure. The token has to be resolved to a concrete colour first — `d3-color`
   * cannot lighten the string `var(--nge-chart-primary)`, and silently returning an
   * unparseable colour would blank the cell.
   *
   * A per-node `color` is returned untouched: it is the author naming an exact colour, so it
   * opts out of the derivation entirely — the same contract a per-datum `labelColor` has with
   * automatic on-fill contrast.
   */
  const fillFor = (d: TreemapNode): string => {
    if (d.data.color) {
      return d.data.color;
    }

    const branch = d.ancestors().find(a => a.depth === 1);
    const topIndex = branch ? (root.children?.indexOf(branch) ?? 0) : 0;
    const base = palette[topIndex % palette.length] ?? theme.cell.color;

    const fade = theme.cell.depthFade;
    if (!fade || d.depth <= 1) {
      return base;
    }

    const shaded = hcl(resolveNgeChartThemeColor(styleHost, base, base));
    if (!Number.isFinite(shaded.l)) {
      return base;
    }
    shaded.l = Math.min(100, shaded.l + fade * (d.depth - 1));
    return shaded.formatHex();
  };

  const tiling = config.tiling ?? 'squarify';
  // Rect cells are `<rect>`, Voronoi cells are `<path>`. They share the class and the join
  // key, so a runtime `tiling` flip across the modes would match the OLD element type as
  // `update` and never enter the new one. Stamp the container with its rendered mode and
  // clear stale cells when it changes — before the join.
  const mode = tiling === 'voronoi' ? 'voronoi' : 'rect';
  const rectTile = TILE_FNS[tiling === 'voronoi' ? 'squarify' : tiling];

  bounds.selectAll('.nge-treemap-cell').interrupt();

  let container = bounds.select<SVGGElement>('.nge-treemap-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-treemap-container', true);
  }

  if (container.attr('data-tiling-mode') !== mode) {
    container.selectAll('.nge-treemap-cell').interrupt().remove();
    container.selectAll('.nge-treemap-label').interrupt().remove();
    container.attr('data-tiling-mode', mode);
  }

  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // Label colour resolves per cell against the cell's OWN fill: the text sits on a value
  // drawn from the palette and then depth-faded — a range — so no single colour reads on
  // every cell. Rungs: per-datum `labelColor` → layer-config `labelColor` → derived from the
  // fill's luminance between the theme's absolute black/white pair → the theme colour.
  const labelFillFor = (d: TreemapNode): string =>
    resolveLabelColor({
      configColor: config.labelColor,
      datumColor: d.data.labelColor,
      fill: fillFor(d),
      node: styleHost,
      theme: theme.label,
    });

  const maxLabelDepth = config.maxLabelDepth;
  const minLabelSize = config.minLabelSize ?? DEFAULT_MIN_LABEL_SIZE;

  /**
   * Draw the per-cell label join. A SEPARATE keyed join from the cells (mirrors the pie /
   * sunburst layers), on the same root-to-node key, so labels enter/update/exit on their own
   * schedule without disturbing the cell join.
   *
   * `eligible` carries the suppression rule, `anchorFor` the centre point, and
   * `maxTextWidthFor` the extent the text is elided to. Labels live in their own group,
   * raised to the end of the container each render so a freshly-entered cell can never paint
   * over an already-rendered label.
   */
  const renderCellLabels = (
    nodes: TreemapNode[],
    eligible: (d: TreemapNode) => boolean,
    anchorFor: (d: TreemapNode) => LabelAnchor,
    maxTextWidthFor: (d: TreemapNode) => number
  ): void => {
    let labelGroup = container.select<SVGGElement>('.nge-treemap-labels');
    if (labelGroup.empty()) {
      labelGroup = container.append('g').classed('nge-treemap-labels', true);
    }
    labelGroup.raise();

    const labelData = config.showLabels
      ? nodes.filter(d => (maxLabelDepth == null || d.depth <= maxLabelDepth) && eligible(d))
      : [];

    // Interrupt in-flight label transitions before joining (ARCH-194). Labels fade in from
    // opacity 0, so a re-render landing mid-fade would otherwise strand one invisible.
    labelGroup.selectAll('.nge-treemap-label').interrupt();

    const labelSel = labelGroup
      .selectAll<SVGTextElement, TreemapNode>('.nge-treemap-label')
      .data(labelData, nodeId);

    labelSel
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    const enteredLabels = labelSel
      .enter()
      .append('text')
      .classed('nge-treemap-label', true)
      .attr('data-label', d => d.data.label)
      .attr('text-anchor', 'middle')
      .attr('dominant-baseline', 'middle')
      // Labels sit on top of their own cell — let hover / click fall through to it.
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .attr('x', d => anchorFor(d).x)
      .attr('y', d => anchorFor(d).y);

    enteredLabels
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', 1);

    // Survivors re-assert full opacity SYNCHRONOUSLY (entering labels are excluded — they
    // are still fading in above). Without this, a label whose fade was interrupted by a
    // re-render keeps whatever partial opacity it was killed at, and never recovers.
    labelSel.style('opacity', 1);

    // Slide survivors to their new anchor. Plain numeric `x` / `y` attributes, so d3
    // interpolates them directly — no `transform` string to decompose, which is exactly the
    // parse that jsdom cannot do (`AGENTS.md`: never transition the transform attribute).
    labelSel
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x', d => anchorFor(d).x)
      .attr('y', d => anchorFor(d).y);

    // Re-apply text + styles on the MERGED selection so a runtime theme / formatLabel change
    // reaches already-rendered labels, not just freshly-entered ones. The text is set before
    // eliding because elision measures the rendered string.
    enteredLabels
      .merge(labelSel)
      .style('fill', labelFillFor)
      .style('font-size', toCssFontSize(theme.label.fontSize))
      .style('font-weight', theme.label.fontWeight)
      .each(function (d) {
        // Pass the node's SUMMED value to the formatter so an internal node reports its
        // aggregate magnitude instead of `undefined` — the same shape the tooltip gets.
        const text = config.formatLabel?.({ ...d.data, value: d.value }) ?? d.data.label;
        elideLabelText(this, text, maxTextWidthFor(d));
      });
  };

  /**
   * Re-apply fill / stroke on the MERGED selection every render so a runtime theme change
   * reaches already-rendered cells — exiting cells are excluded from the merge, so their
   * fade-out is unaffected — then (re)wire the cursor, tooltip, and click interactions.
   *
   * `opacity` is deliberately NOT set here: it is the property the enter transition animates,
   * so it is asserted on the entering and surviving selections separately by the callers.
   * `centroidOf` returns the cell centroid in the container's local coords, which the
   * container's identity transform makes the same as the plot's.
   */
  const applyCellStylesAndInteractions = <E extends SVGGraphicsElement, D extends TreemapNode>(
    merged: Selection<E, D, SVGGElement, unknown>,
    nodes: D[],
    centroidOf: (d: D) => [number, number]
  ): void => {
    merged
      .style('fill', fillFor)
      .style('stroke', theme.cell.stroke)
      .style('stroke-width', theme.cell.strokeWidth);

    // Tooltip event at the cell centroid, positioned in full-SVG coords (margins) and
    // clamped to the chart bounds — mirrors the pie / sunburst divot/clamp structure.
    const computeTooltipEvent = (d: D): NgeTooltipEvent | null => {
      if (!tooltipConfig || !tooltipConfig.formatContent) return null;

      const tooltipWidth = tooltipConfig.width;
      const tooltipHeight = tooltipConfig.height;

      const [mx, my] = centroidOf(d);
      const cellCenterX = margins.left + mx;

      // Clamp X so the bubble stays on-canvas (bounds match the chart bounds exactly).
      const minTooltipX = margins.left;
      const maxTooltipX = margins.left + dimensions.boundedWidth - tooltipWidth;
      const idealTooltipX = cellCenterX - tooltipWidth / 2;
      const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, idealTooltipX));

      // Y sits above the centroid, clamped to the canvas so a top-edge cell's bubble isn't
      // clipped above the chart (mirrors the X clamp).
      const containerHeight = margins.top + dimensions.boundedHeight + margins.bottom;
      const rawTooltipY = margins.top + my - tooltipHeight - 10;
      const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

      // Divot points at the cell centroid (clamped within the bubble like pie).
      const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
      const rx = 4;
      const targetTipX = cellCenterX - tooltipX;
      const idealDivotX = targetTipX - divotWidth / 2;
      const minDivotX = rx;
      const maxDivotX = tooltipWidth - rx - divotWidth;
      const divotX = Math.max(minDivotX, Math.min(maxDivotX, idealDivotX));
      const divotCenterX = divotX + divotWidth / 2;
      const divotTipOffset = targetTipX - divotCenterX;

      // Pass the node's SUMMED value into the formatter so internal (childless-value) nodes
      // report their aggregate magnitude instead of `undefined`.
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

    // Cursor: pointer when the cell is interactive.
    merged.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

    // Hover interactions for tooltip (re-attached on ALL cells to handle config changes).
    if (tooltipEnabled) {
      merged
        .on('mouseenter', (_event: PointerEvent, d: D) => {
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
      merged.on('click', (event: PointerEvent, d: D) => {
        config.onClick!({ data: d.data, event, index: nodes.indexOf(d) });
      });
    } else {
      merged.on('click', null);
    }
  };

  const maxDepth = config.maxDepth;
  const withinDepth = (d: TreemapNode): boolean =>
    d.depth >= 1 && (maxDepth == null || d.depth <= maxDepth);

  if (mode === 'rect') {
    const paddingOuter = config.paddingOuter ?? 0;
    // `paddingTop` reads as EXTRA room at the top, over and above the all-round outer inset,
    // because that is what a caller reaching for it wants: a strip for the parent's own
    // label. d3 treats the two as independent overrides, so add them here.
    const paddingTop = paddingOuter + (config.paddingTop ?? 0);

    const layoutRoot = treemap<NgeHierarchyDatum>()
      .tile(rectTile)
      .size([dimensions.boundedWidth, dimensions.boundedHeight])
      .paddingInner(config.padding ?? DEFAULT_PADDING)
      .paddingOuter(paddingOuter)
      .paddingTop(paddingTop)(root);

    // `descendants()` is pre-order, so a parent always precedes the children nested inside
    // it and therefore paints behind them.
    const nodes = layoutRoot.descendants().filter(withinDepth);

    const rectX = (d: TreemapNode): number => (d as TreemapRectNode).x0;
    const rectY = (d: TreemapNode): number => (d as TreemapRectNode).y0;
    const rectWidth = (d: TreemapNode): number => {
      const node = d as TreemapRectNode;
      return Math.max(0, node.x1 - node.x0);
    };
    const rectHeight = (d: TreemapNode): number => {
      const node = d as TreemapRectNode;
      return Math.max(0, node.y1 - node.y0);
    };

    const cells = container
      .selectAll<SVGRectElement, TreemapNode>('.nge-treemap-cell')
      .data(nodes, nodeId);

    cells
      .exit()
      .transition()
      .duration(animation.exitMs)
      .ease(animation.easing)
      .style('opacity', 0)
      .remove();

    // ENTER — placed at FINAL geometry synchronously, then faded in.
    const entered = cells
      .enter()
      .append('rect')
      .classed('nge-treemap-cell', true)
      .attr('data-label', d => d.data.label)
      .attr('data-depth', d => d.depth)
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight)
      .style('opacity', 0);

    entered
      .transition()
      .duration(animation.enterMs)
      .ease(animation.easing)
      .style('opacity', theme.cell.opacity);

    // UPDATE — resize survivors, and re-assert the animated opacity synchronously so a
    // fade interrupted by a re-render cannot strand a cell part-way (ARCH-194).
    cells.style('opacity', theme.cell.opacity);
    cells
      .transition()
      .duration(animation.updateMs)
      .ease(animation.easing)
      .attr('x', rectX)
      .attr('y', rectY)
      .attr('width', rectWidth)
      .attr('height', rectHeight);

    const merged = entered.merge(cells);
    // Enforce document order == data order, so a parent that enters AFTER its children
    // (d3 appends new elements last) still ends up behind them.
    merged.order();

    applyCellStylesAndInteractions(merged, nodes, d => [
      rectX(d) + rectWidth(d) / 2,
      rectY(d) + rectHeight(d) / 2,
    ]);

    renderCellLabels(
      nodes,
      d => rectWidth(d) >= minLabelSize && rectHeight(d) >= minLabelSize,
      d => ({ x: rectX(d) + rectWidth(d) / 2, y: rectY(d) + rectHeight(d) / 2 }),
      rectWidth
    );

    return;
  }

  // Voronoi: an iterative tessellation, cached against this chart's own container so a
  // theme change or a tooltip hover re-render does not re-run the solve.
  const cellPolygons = styleHost
    ? voronoiTreemapCellsFor(styleHost, {
        convergenceRatio: config.convergenceRatio,
        height: dimensions.boundedHeight,
        maxIterationCount: config.maxIterationCount,
        nodeId,
        root,
        seed: config.seed,
        width: dimensions.boundedWidth,
      })
    : new Map<string, VoronoiTreemapPolygon>();

  const polygonOf = (d: TreemapNode): undefined | VoronoiTreemapPolygon =>
    cellPolygons.get(nodeId(d));

  // Pre-order again, so parents precede (and paint behind) their children.
  const nodes = root.descendants().filter(d => withinDepth(d) && polygonOf(d) !== undefined);

  const centroids = new Map<string, [number, number]>();
  const centroidOf = (d: TreemapNode): [number, number] => {
    const key = nodeId(d);
    const cached = centroids.get(key);
    if (cached) {
      return cached;
    }
    const polygon = polygonOf(d);
    const centroid: [number, number] = polygon ? polygonCentroid(polygon) : [0, 0];
    centroids.set(key, centroid);
    return centroid;
  };

  const cells = container
    .selectAll<SVGPathElement, TreemapNode>('.nge-treemap-cell')
    .data(nodes, nodeId);

  cells
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  // A cell's vertex COUNT changes between renders (a relaxed site gains or loses a
  // neighbour), so there is no correspondence to interpolate `d` along. Set the final path
  // synchronously and animate opacity instead — the sanctioned enter idiom for a layer whose
  // marks are re-laid-out wholesale, and it keeps this layer clear of path morphing.
  const pathFor = (d: TreemapNode): string => {
    const polygon = polygonOf(d);
    if (!polygon || polygon.length === 0) {
      return '';
    }
    return `${cellLine(polygon) ?? ''}Z`;
  };

  const entered = cells
    .enter()
    .append('path')
    .classed('nge-treemap-cell', true)
    .attr('data-label', d => d.data.label)
    .attr('data-depth', d => d.depth)
    .attr('d', pathFor)
    .style('opacity', 0);

  entered
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.cell.opacity);

  cells.style('opacity', theme.cell.opacity).attr('d', pathFor);

  const merged = entered.merge(cells);
  merged.order();

  applyCellStylesAndInteractions(merged, nodes, centroidOf);

  renderCellLabels(
    nodes,
    d => {
      const polygon = polygonOf(d);
      if (!polygon) {
        return false;
      }
      const { height, width } = polygonExtent(polygon);
      return width >= minLabelSize && height >= minLabelSize;
    },
    d => {
      const [x, y] = centroidOf(d);
      return { x, y };
    },
    d => {
      const polygon = polygonOf(d);
      return polygon ? horizontalChordWidth(polygon, centroidOf(d)[1]) : 0;
    }
  );
}
