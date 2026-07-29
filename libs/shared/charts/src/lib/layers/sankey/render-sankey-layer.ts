import type { SankeyExtraProperties, SankeyLink, SankeyNode } from 'd3-sankey';

import { sankey, sankeyCenter, sankeyJustify, sankeyLeft, sankeyRight } from 'd3-sankey';
import 'd3-transition';

import type {
  NgeGraphLink,
  NgeGraphNode,
  NgeSankeyLayerConfig,
  NgeSankeyLinkShape,
  NgeSankeyNodeAlign,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeSankeyLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import {
  elideLabelText,
  mergeSankeyLayerTheme,
  resolveLabelColor,
  toCssFontSize,
} from '../../core/theme';

/**
 * `d3-sankey` is typed against an index signature, which an `interface` does not satisfy
 * implicitly (only a type alias gets one). Intersecting the datum with the plugin's own
 * extra-properties type is what makes the generic accept our declared shapes without a cast.
 */
type SankeyNodeDatum = NgeGraphNode & SankeyExtraProperties;
type SankeyLinkDatum = NgeGraphLink & SankeyExtraProperties;

/** A node once the layout has written its rect (`x0/x1/y0/y1`) and summed `value` onto it. */
type LaidOutNode = SankeyNode<SankeyNodeDatum, SankeyLinkDatum>;

/** A link once the layout has resolved its endpoints and written `y0` / `y1` / `width`. */
type LaidOutLink = SankeyLink<SankeyNodeDatum, SankeyLinkDatum>;

/** Width (px) of a node rect. Wide enough to read as a block, narrow enough to stay chrome. */
const DEFAULT_NODE_WIDTH = 16;

/** Vertical gap (px) between node rects sharing a column. */
const DEFAULT_NODE_PADDING = 8;

/** Gap (px) between a node rect and its label. */
const DEFAULT_LABEL_PADDING = 6;

/**
 * Relaxation passes. Matches `d3-sankey`'s own default — note the figure of 32 in
 * `@types/d3-sankey`'s JSDoc is stale; `src/sankey.js` initialises `iterations = 6`.
 */
const DEFAULT_ITERATIONS = 6;

/** `nodeAlign` → the `d3-sankey` alignment function it selects. */
const ALIGN_FNS: Record<
  NgeSankeyNodeAlign,
  (node: SankeyNode<SankeyNodeDatum, SankeyLinkDatum>, n: number) => number
> = {
  center: sankeyCenter,
  justify: sankeyJustify,
  left: sankeyLeft,
  right: sankeyRight,
};

/** Read a link endpoint's id, whether the layout has resolved it to a node yet or not. */
function endpointId(endpoint: LaidOutLink['source']): string {
  return typeof endpoint === 'object' ? ((endpoint as LaidOutNode).id ?? '') : String(endpoint);
}

/**
 * Build a link's ribbon as a CLOSED, fillable path.
 *
 * Both shapes are filled rather than stroked, which is what lets the two modes share one
 * `link` theme slice and — more importantly — is what gives every ribbon VERTICAL ends. The
 * canonical `sankeyLinkHorizontal()` idiom (stroke a centreline at `stroke-width: link.width`)
 * only meets its node squarely because its cubic leaves horizontally; a straight sloped
 * centreline stroked the same way is cut perpendicular to its own slope, leaving a visible
 * notch against the node rect. Constructing the outline directly sidesteps that for
 * `'parallelogram'` and costs `'curve'` nothing.
 *
 * `link.y0` / `link.y1` are the ribbon's CENTRE at each end (the layout writes
 * `y0 + width / 2`), so each edge is offset by half the width.
 */
function ribbonPath(link: LaidOutLink, shape: NgeSankeyLinkShape): string {
  const source = link.source as LaidOutNode;
  const target = link.target as LaidOutNode;

  const xs = source.x1 ?? 0;
  const xt = target.x0 ?? 0;
  const half = (link.width ?? 0) / 2;

  const sTop = (link.y0 ?? 0) - half;
  const sBottom = (link.y0 ?? 0) + half;
  const tTop = (link.y1 ?? 0) - half;
  const tBottom = (link.y1 ?? 0) + half;

  if (shape === 'parallelogram') {
    return `M${xs},${sTop}L${xt},${tTop}L${xt},${tBottom}L${xs},${sBottom}Z`;
  }

  // Control points sit on the midline, matching `d3.linkHorizontal` — the tangent is
  // horizontal at both ends, so the ribbon leaves and enters its node square on.
  const mid = (xs + xt) / 2;
  return (
    `M${xs},${sTop}C${mid},${sTop} ${mid},${tTop} ${xt},${tTop}` +
    `L${xt},${tBottom}C${mid},${tBottom} ${mid},${sBottom} ${xs},${sBottom}Z`
  );
}

/**
 * Derive the node set from the link endpoints, in first-seen order.
 *
 * Most flow datasets arrive as links alone, so `NgeGraph.nodes` is optional. First-seen
 * order (rather than, say, alphabetical) is what makes the derived palette assignment
 * stable and predictable: the first flow a caller writes owns the first colour.
 */
function nodesFromLinks(links: NgeGraphLink[]): NgeGraphNode[] {
  const ids: string[] = [];
  const seen = new Set<string>();

  for (const link of links) {
    for (const id of [link.source, link.target]) {
      if (!seen.has(id)) {
        seen.add(id);
        ids.push(id);
      }
    }
  }

  return ids.map(id => ({ id }));
}

/** Field the join key is stamped onto — read back by the key accessor on every render. */
const LINK_KEY_FIELD = 'ngeLinkKey';

/**
 * Stamp each link with a unique join key.
 *
 * `source->target` identifies a link in any sane graph, but PARALLEL edges between the same
 * pair are legal and would collide — and a duplicate key makes d3 silently drop marks from
 * the join. Repeats therefore take an ordinal suffix. The separator is deliberately plain
 * ASCII: a NUL byte in a key flips git to treating the source file as binary, which cost
 * ARCH-285 a review.
 *
 * ⚠️ The key has to live ON the datum, not in a side table. d3 calls the key accessor twice
 * per join — once over the new data and once over the elements already on the page, where it
 * passes the datum bound by the PREVIOUS render. A `Map` built this render has no entry for
 * that older object, so every existing ribbon would key as `undefined`, match nothing, and
 * re-enter: the marks silently double on every re-render and resize. Stamping the copies is
 * safe precisely because they are copies — the caller's graph never sees this field.
 */
function stampLinkKeys(links: LaidOutLink[]): void {
  const counts = new Map<string, number>();

  for (const link of links) {
    const base = `${endpointId(link.source)}->${endpointId(link.target)}`;
    const seen = counts.get(base) ?? 0;
    counts.set(base, seen + 1);
    link[LINK_KEY_FIELD] = seen === 0 ? base : `${base}#${seen}`;
  }
}

/** Read a link's stamped join key. */
function linkKey(link: LaidOutLink): string {
  return String(link[LINK_KEY_FIELD] ?? '');
}

/**
 * Render a sankey layer — weighted flow between staged nodes.
 *
 * Self-scaled to `dimensions.boundedWidth × boundedHeight`; it ignores the shared cartesian
 * scales the way the radial and treemap layers do. `d3-sankey` assigns each node a column
 * from its depth in the graph and a height proportional to its larger side, then relaxes the
 * rows to reduce crossings; every link becomes a ribbon as thick as its value.
 *
 * `linkShape` fans the one primitive across the catalog: `'curve'` is the Sankey / Alluvial
 * ribbon, `'parallelogram'` the straight-sided Parallel Sets band.
 *
 * Marks are placed at their FINAL geometry synchronously and then faded in — the standard
 * for layers re-laid-out wholesale (area / line / histogram / treemap). It matters more here
 * than most: any data change re-flows every column, so interpolating one ribbon's `d` from
 * its old path to its new one would tween between two unrelated shapes, and the two shapes
 * do not even carry the same number of control points once `linkShape` changes. Nothing
 * transitions a `transform` either, so the layer stays clear of the tween trap `AGENTS.md`
 * warns every Wave-3 layer hits first.
 *
 * Links are drawn before nodes so a rect always caps the ribbons meeting it, and labels last
 * in their own raised group.
 */
export function renderSankeyLayer(
  context: NgeChartLayerContext<
    NgeGraphNode,
    NgeSankeyLayerConfig,
    NgeSankeyLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds) {
    return;
  }

  const theme = mergeSankeyLayerTheme(context.theme);

  let container = bounds.select<SVGGElement>('.nge-sankey-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-sankey-container', true);
  }

  /** Drop every mark — the shared bail-out for empty, degenerate, or unmeasurable input. */
  const clear = (): void => {
    container.selectAll('.nge-sankey-link').interrupt().remove();
    container.selectAll('.nge-sankey-node').interrupt().remove();
    container.selectAll('.nge-sankey-label').interrupt().remove();
  };

  // The graph is a single object rather than an array, so it comes off `config.data` — the
  // same shape exception the bullet layer makes.
  const graph = config.data;
  const { boundedHeight, boundedWidth } = dimensions;

  // A chart renders once before its container is measured; laying out into a zero-size
  // extent yields NaN geometry rather than an error.
  if (!graph?.links?.length || boundedWidth <= 0 || boundedHeight <= 0) {
    clear();
    return;
  }

  // `d3-sankey` MUTATES what it is given — it replaces each link's `source` / `target` id
  // with the resolved node object and writes geometry onto both sets. Copying first is what
  // keeps the caller's config object reusable across re-renders and across charts; without
  // it the second render would receive links whose endpoints are already node objects.
  const nodeData: SankeyNodeDatum[] = (
    graph.nodes?.length ? graph.nodes : nodesFromLinks(graph.links)
  ).map(node => ({ ...node })) as SankeyNodeDatum[];
  const linkData: SankeyLinkDatum[] = graph.links.map(link => ({ ...link })) as SankeyLinkDatum[];

  const layout = sankey<SankeyNodeDatum, SankeyLinkDatum>()
    .nodeId(node => node.id)
    .nodeAlign(ALIGN_FNS[config.nodeAlign ?? 'justify'])
    .nodeWidth(config.nodeWidth ?? DEFAULT_NODE_WIDTH)
    .nodePadding(config.nodePadding ?? DEFAULT_NODE_PADDING)
    .iterations(config.iterations ?? DEFAULT_ITERATIONS)
    .extent([
      [0, 0],
      [boundedWidth, boundedHeight],
    ]);

  let laidOut: { links: LaidOutLink[]; nodes: LaidOutNode[] };
  try {
    laidOut = layout({ links: linkData, nodes: nodeData });
  } catch {
    // `d3-sankey` throws on a cycle ("circular link") and on a link naming a node that is
    // not in the set. A render fn runs on every resize, so letting that escape would take
    // the host down on a data problem — drop the marks and leave the plot empty instead.
    clear();
    return;
  }

  const { links, nodes } = laidOut;
  const linkShape = config.linkShape ?? 'curve';
  const labelPadding = config.labelPadding ?? DEFAULT_LABEL_PADDING;
  const palette = config.seriesColors?.length ? config.seriesColors : theme.node.colors;
  const styleHost = bounds.node();

  /** Node fill: per-node `color` → palette by node index → the single-node fallback. */
  const nodeFill = (node: LaidOutNode): string =>
    node.color ?? palette[(node.index ?? 0) % palette.length] ?? theme.node.color;

  /**
   * Link fill: per-link `color` → its SOURCE node's colour → the theme fallback. Inheriting
   * forward is what lets a reader follow a flow out of where it came from, which is the
   * whole reading a sankey is for.
   */
  const linkFill = (link: LaidOutLink): string =>
    link.color ?? nodeFill(link.source as LaidOutNode) ?? theme.link.color;

  stampLinkKeys(links);
  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  // ── Links ────────────────────────────────────────────────────────────────────────────
  // Drawn first so the node rects paint over the ends of the ribbons meeting them.
  let linkGroup = container.select<SVGGElement>('.nge-sankey-links');
  if (linkGroup.empty()) {
    linkGroup = container.append('g').classed('nge-sankey-links', true);
  }

  linkGroup.selectAll('.nge-sankey-link').interrupt();

  const linkSel = linkGroup
    .selectAll<SVGPathElement, LaidOutLink>('.nge-sankey-link')
    .data(links, linkKey);

  linkSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enteredLinks = linkSel
    .enter()
    .append('path')
    .classed('nge-sankey-link', true)
    .attr('data-link', linkKey)
    .style('fill-rule', 'evenodd')
    .style('stroke', 'none')
    .style('opacity', 0);

  // Geometry is set on the MERGED selection synchronously — entering ribbons need it before
  // their fade, and survivors re-place without tweening between two unrelated outlines.
  const mergedLinks = enteredLinks.merge(linkSel);
  mergedLinks.attr('d', link => ribbonPath(link, linkShape)).style('fill', linkFill);

  enteredLinks
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.link.opacity);

  // Survivors re-assert their resting opacity SYNCHRONOUSLY (entering ribbons are excluded —
  // they are still fading in). Without this a ribbon whose fade was cut short by a re-render
  // keeps whatever partial opacity it was interrupted at, permanently (ARCH-194).
  linkSel.style('opacity', theme.link.opacity);

  // Hover lifts opacity rather than changing hue, so the flow stays the same colour it was.
  mergedLinks
    .on('mouseenter.nge-sankey-hover', function () {
      this.style.opacity = String(theme.link.opacityHover);
    })
    .on('mouseleave.nge-sankey-hover', function () {
      this.style.opacity = String(theme.link.opacity);
    });

  // ── Nodes ────────────────────────────────────────────────────────────────────────────
  let nodeGroup = container.select<SVGGElement>('.nge-sankey-nodes');
  if (nodeGroup.empty()) {
    nodeGroup = container.append('g').classed('nge-sankey-nodes', true);
  }
  nodeGroup.raise();

  nodeGroup.selectAll('.nge-sankey-node').interrupt();

  const nodeSel = nodeGroup
    .selectAll<SVGRectElement, LaidOutNode>('.nge-sankey-node')
    .data(nodes, node => node.id);

  nodeSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enteredNodes = nodeSel
    .enter()
    .append('rect')
    .classed('nge-sankey-node', true)
    .attr('data-node', node => node.id)
    .style('opacity', 0);

  const mergedNodes = enteredNodes.merge(nodeSel);

  // Plain numeric attributes, never a `transform` — d3 interpolates x / y / width / height
  // directly, so nothing here reaches the transform parser jsdom cannot run.
  mergedNodes
    .attr('x', node => node.x0 ?? 0)
    .attr('y', node => node.y0 ?? 0)
    .attr('width', node => Math.max(0, (node.x1 ?? 0) - (node.x0 ?? 0)))
    .attr('height', node => Math.max(0, (node.y1 ?? 0) - (node.y0 ?? 0)))
    .style('fill', nodeFill)
    .style('stroke', theme.node.stroke)
    .style('stroke-width', theme.node.strokeWidth);

  enteredNodes
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.node.opacity);

  nodeSel.style('opacity', theme.node.opacity);

  /**
   * Tooltip bubble anchored above the node's centre, in full-SVG coords, clamped to the
   * canvas — mirrors the treemap / pie divot + clamp structure.
   */
  const computeTooltipEvent = (node: LaidOutNode): NgeTooltipEvent | null => {
    if (!tooltipConfig?.formatContent) {
      return null;
    }

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    const centerX = margins.left + ((node.x0 ?? 0) + (node.x1 ?? 0)) / 2;
    const centerY = ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2;

    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + boundedWidth - tooltipWidth;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, centerX - tooltipWidth / 2));

    const containerHeight = margins.top + boundedHeight + margins.bottom;
    const rawTooltipY = margins.top + centerY - tooltipHeight - 10;
    const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4;
    const targetTipX = centerX - tooltipX;
    const divotX = Math.max(
      rx,
      Math.min(tooltipWidth - rx - divotWidth, targetTipX - divotWidth / 2)
    );
    const divotTipOffset = targetTipX - (divotX + divotWidth / 2);

    // Hand over the node carrying its LAID-OUT value, so a caller that supplied no `value`
    // still reads the throughput the layout summed rather than `undefined`.
    const content = tooltipConfig.formatContent({ ...node, value: node.value } as NgeGraphNode);

    return {
      content,
      dimensions: { height: tooltipHeight, width: tooltipWidth },
      divotPosition: 'bottom' as const,
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

  mergedNodes.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  if (tooltipEnabled) {
    mergedNodes
      .on('mouseenter', (_event: PointerEvent, node: LaidOutNode) => {
        const tooltipEvent = computeTooltipEvent(node);
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
    mergedNodes.on('mouseenter', null).on('mouseleave', null);
  }

  if (config.onClick) {
    mergedNodes.on('click', (event: PointerEvent, node: LaidOutNode) => {
      config.onClick!({ data: node as NgeGraphNode, event, index: nodes.indexOf(node) });
    });
  } else {
    mergedNodes.on('click', null);
  }

  // ── Labels ───────────────────────────────────────────────────────────────────────────
  let labelGroup = container.select<SVGGElement>('.nge-sankey-labels');
  if (labelGroup.empty()) {
    labelGroup = container.append('g').classed('nge-sankey-labels', true);
  }
  labelGroup.raise();

  labelGroup.selectAll('.nge-sankey-label').interrupt();

  const labelData = config.showLabels ? nodes : [];

  /**
   * Labels always fall INWARD: a node in the left half is labelled to the right of its rect
   * and one in the right half to the left. That is what keeps every label inside the plot
   * rect — which is not cosmetic, because the layers group is clipped, so a label hung past
   * the edge would be discarded outright rather than merely sitting tight (and jsdom does
   * not clip, so a spec would never see it).
   */
  const labelsRight = (node: LaidOutNode): boolean => (node.x0 ?? 0) < boundedWidth / 2;
  const labelX = (node: LaidOutNode): number =>
    labelsRight(node) ? (node.x1 ?? 0) + labelPadding : (node.x0 ?? 0) - labelPadding;
  const labelY = (node: LaidOutNode): number => ((node.y0 ?? 0) + (node.y1 ?? 0)) / 2;

  /** Room left between the label's anchor and the plot edge it runs toward. */
  const labelRoom = (node: LaidOutNode): number =>
    labelsRight(node) ? boundedWidth - labelX(node) : labelX(node);

  const labelSel = labelGroup
    .selectAll<SVGTextElement, LaidOutNode>('.nge-sankey-label')
    .data(labelData, node => node.id);

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
    .classed('nge-sankey-label', true)
    .attr('data-label', node => node.id)
    .attr('dominant-baseline', 'middle')
    // Labels overlap the ribbons leaving / entering their node — let the pointer through.
    .style('pointer-events', 'none')
    .style('opacity', 0);

  enteredLabels.transition().duration(animation.enterMs).ease(animation.easing).style('opacity', 1);

  labelSel.style('opacity', 1);

  enteredLabels
    .merge(labelSel)
    .attr('x', labelX)
    .attr('y', labelY)
    .attr('text-anchor', node => (labelsRight(node) ? 'start' : 'end'))
    .style('fill', node =>
      resolveLabelColor({
        configColor: config.labelColor,
        datumColor: node.labelColor,
        // A sankey label never sits on a mark — a node rect is `nodeWidth` wide — so there
        // is no fill to derive contrast against. The empty string falls through to the
        // theme colour while the two explicit rungs above keep working.
        fill: '',
        node: styleHost,
        theme: theme.label,
      })
    )
    .style('font-size', toCssFontSize(theme.label.fontSize))
    .style('font-weight', theme.label.fontWeight)
    .each(function (node) {
      const text =
        config.formatLabel?.({ ...node, value: node.value } as NgeGraphNode) ??
        node.label ??
        node.id;
      elideLabelText(this, text, labelRoom(node));
    });
}
