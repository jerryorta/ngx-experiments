import 'd3-transition';

import type { NgeGraphLink, NgeGraphNode, NgeNetworkLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeNetworkLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';
import type { NetworkHiveAxis, NetworkNodePosition } from './network-force-layout';

import { applyRadiusRatio, deriveGraphNodes } from '../../core/fns';
import {
  elideLabelText,
  measureLabelWidth,
  mergeNetworkLayerTheme,
  resolveLabelColor,
  toCssFontSize,
} from '../../core/theme';
import { networkLayoutFor } from './network-force-layout';

/** Gap (px) between a node's circle and its label when a layer config omits `labelPadding`. */
const DEFAULT_LABEL_PADDING = 6;

/**
 * Horizontal room (px) reserved past a node circle for its label before eliding.
 *
 * Fixed, like the chord layer's circular-label gutter and for the same reason: the room
 * actually available varies per node with wherever the layout happened to seat it, and
 * chasing that exactly is not worth the complexity. Every label gets the same budget and a
 * longer one elides into it.
 */
const LABEL_GUTTER = 64;

/**
 * Numeric font size (px) assumed when `theme.label.fontSize` is a CSS string
 * `measureLabelWidth` cannot parse into a number for its jsdom fallback (e.g.
 * `var(--nge-chart-label-font-size, 10px)`, the theme default). Matches that default's own
 * literal fallback, so the common case measures against the number the token itself resolves to.
 */
const FALLBACK_LABEL_FONT_SIZE = 10;

/** Radial room (px) reserved past the hive axes for an axis label. */
const HIVE_AXIS_LABEL_RESERVE = 18;

/** Arrowhead geometry (px) for `directed` links — length along the edge, and half-width. */
const ARROW_LENGTH = 8;
const ARROW_HALF_WIDTH = 4;

/**
 * Unique `<marker>` ids per layer instance — several charts coexist on one page (a Storybook
 * docs page routinely renders a dozen), and `url(#id)` would otherwise resolve to whichever
 * chart mounted first. Mirrors the counter the base layout uses for its clip-path ids
 * (`core/base-layout/nge-chart-base-layout.ts`); each chart's marks live in their own shadow
 * tree, so a per-instance id is enough without any global registry.
 */
let markerIdCounter = 0;

/** How far a link's own bow deviates from the straight chord, as a fraction of its length. */
const HIVE_LINK_CURVATURE = 0.35;

/** A link once resolved against the settled layout — both endpoints, plus its identity. */
interface ResolvedLink {
  /** Join key: the endpoint pair, disambiguated when a graph carries parallel edges. */
  key: string;
  /** The caller's own link datum, for colour resolution and tooltips. */
  link: NgeGraphLink;
  source: NetworkNodePosition;
  target: NetworkNodePosition;
}

/** Fold an angle into `[0, 2π)`. */
function normaliseAngle(angle: number): number {
  const turn = 2 * Math.PI;
  return ((angle % turn) + turn) % turn;
}

/**
 * A straight edge between two node centres, shortened at the target end so an arrowhead sits
 * clear of the circle rather than under it. The shortening runs unconditionally (not only when
 * `directed`) so a link's visible length means the same thing in both modes.
 */
function straightLinkPath(link: ResolvedLink, directed: boolean): string {
  const dx = link.target.x - link.source.x;
  const dy = link.target.y - link.source.y;
  const length = Math.hypot(dx, dy);

  if (length === 0) {
    return `M${link.source.x},${link.source.y}L${link.target.x},${link.target.y}`;
  }

  const inset = link.target.r + (directed ? ARROW_LENGTH : 0);
  // A link shorter than its own inset would otherwise reverse direction and draw backwards
  // through the source node.
  const t = Math.max(0, (length - inset) / length);

  return `M${link.source.x},${link.source.y}L${link.source.x + dx * t},${link.source.y + dy * t}`;
}

/**
 * A curved edge for the hive layout, bowed toward the centre.
 *
 * The bow is what makes a hive plot readable: with straight chords, two edges between the same
 * pair of axes overlap completely and the plot collapses into a triangle of solid lines. A
 * quadratic Bézier whose control point is pulled off the midpoint toward the centre separates
 * them and gives the diagram its characteristic sweep — the same idiom as the classic
 * `d3.hive.link()`, built here as a raw path because that plugin never made it into modern d3
 * and `d3-shape`'s `linkRadial` assumes a root-and-leaf orientation a hive plot does not have.
 */
function hiveLinkPath(
  link: ResolvedLink,
  center: { x: number; y: number },
  directed: boolean
): string {
  const dx = link.target.x - link.source.x;
  const dy = link.target.y - link.source.y;
  const length = Math.hypot(dx, dy);

  const inset = link.target.r + (directed ? ARROW_LENGTH : 0);
  const t = length === 0 ? 0 : Math.max(0, (length - inset) / length);
  const endX = link.source.x + dx * t;
  const endY = link.source.y + dy * t;

  const midX = (link.source.x + endX) / 2;
  const midY = (link.source.y + endY) / 2;

  return `M${link.source.x},${link.source.y}Q${midX + (center.x - midX) * HIVE_LINK_CURVATURE},${
    midY + (center.y - midY) * HIVE_LINK_CURVATURE
  } ${endX},${endY}`;
}

/**
 * Render a network layer — a node-link graph drawn as a graph, folding four Data Viz Project
 * catalog entries into one primitive via `layout` (+ the `directed` / `showLabels` pair that
 * turns the force layout into a Sociogram).
 *
 * Self-scaled to `dimensions.boundedWidth × boundedHeight`; it ignores the shared cartesian
 * scales the way the sankey, chord and radial layers do. `config.data` is a single
 * {@link NgeGraph} object rather than an array — the same shape exception those two make —
 * resolved to a node set via `deriveGraphNodes` (shared with the legend extractor, so the two
 * can never disagree on order or on palette index) and copied before anything writes geometry,
 * since `d3-force` mutates what it is handed exactly as `d3-sankey` does.
 *
 * The arrangement itself comes from `network-force-layout.ts`, which is where the two
 * genuinely different geometries live: a seeded, fixed-tick `d3-force` simulation for
 * `'force'` / `'cluster'`, and a closed-form radial placement for `'hive'`. Keeping the solve
 * out here buys three things — it is memoized per chart instance (a render fn re-runs on every
 * hover, and re-stepping a simulation there would both cost and visibly twitch), it is
 * deterministic, and it is unit-testable without a DOM.
 *
 * Every mark is positioned by a PLAIN NUMERIC attribute — circles by `cx`/`cy`, labels by
 * `x`/`y`, links and axes by `d` — and never by a `transform`. That is deliberate: d3's
 * transform interpolator reads `svgNode.transform.baseVal`, which jsdom does not implement, so
 * a transitioned `transform` throws from a rAF callback and surfaces as a mystery failure in
 * an unrelated spec. AGENTS.md names this layer as one the trap was waiting for.
 *
 * Marks follow the sankey triad: geometry written at its final position synchronously, opacity
 * the only thing transitioned, and survivors re-asserting resting opacity synchronously
 * outside any transition (ARCH-194) — with the resting value kept OFF the merged enter+update
 * selection, which would otherwise defeat the enter fade and quietly turn the re-assert into
 * dead code (ARCH-200).
 */
export function renderNetworkLayer(
  context: NgeChartLayerContext<
    NgeGraphNode,
    NgeNetworkLayerConfig,
    NgeNetworkLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds) {
    return;
  }

  const theme = mergeNetworkLayerTheme(context.theme);

  let container = bounds.select<SVGGElement>('.nge-network-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-network-container', true);
  }

  /** Drop every mark — the shared bail-out for empty, degenerate, or unmeasurable input. */
  const clear = (): void => {
    container.selectAll('.nge-network-axis').interrupt().remove();
    container.selectAll('.nge-network-axis-label').interrupt().remove();
    container.selectAll('.nge-network-link').interrupt().remove();
    container.selectAll('.nge-network-node').interrupt().remove();
    container.selectAll('.nge-network-label').interrupt().remove();
  };

  const graph = config.data;
  const { boundedHeight, boundedWidth } = dimensions;

  // A chart renders once before its container is measured; laying out into a zero-size extent
  // yields NaN geometry rather than an error.
  if (!graph || boundedWidth <= 0 || boundedHeight <= 0) {
    clear();
    return;
  }

  // `deriveGraphNodes` hands back the caller's OWN array and node objects by reference in the
  // explicit-`nodes` branch — copy before the layout writes computed geometry, so the caller's
  // config object stays reusable across re-renders (the same reason the sankey and chord
  // layers copy before their layouts mutate).
  const nodeData: NgeGraphNode[] = deriveGraphNodes(graph).map(node => ({ ...node }));

  // Unlike the flow layers, a graph with nodes and NO links is legitimate here — a sociogram
  // of people who happen to share no relationship is still a sociogram — so the bail-out tests
  // the node set rather than the link set.
  if (nodeData.length === 0) {
    clear();
    return;
  }

  const layout = config.layout ?? 'force';
  const directed = config.directed ?? false;
  const labelPadding = config.labelPadding ?? DEFAULT_LABEL_PADDING;
  const styleHost = bounds.node();

  const parsedFontSize =
    typeof theme.label.fontSize === 'number'
      ? theme.label.fontSize
      : parseFloat(theme.label.fontSize);
  const fallbackFontSize = Number.isFinite(parsedFontSize)
    ? parsedFontSize
    : FALLBACK_LABEL_FONT_SIZE;

  // The magnitude the layout sizes each circle by: the node's own `value` when supplied, else
  // its degree. Resolved HERE, above every consumer, because `formatLabel` is handed it — and
  // the label-measuring pass below must ask the formatter the same question the render does,
  // or a formatter that reads `value` would be measured at one width and drawn at another.
  const magnitudeOf = (node: NgeGraphNode): number => {
    if (node.value !== undefined) {
      return Math.max(0, node.value);
    }
    return graph.links.filter(link => link.source === node.id || link.target === node.id).length;
  };
  const withMagnitude = (node: NgeGraphNode): NgeGraphNode => ({
    ...node,
    value: magnitudeOf(node),
  });
  const labelTextFor = (node: NgeGraphNode): string =>
    config.formatLabel?.(withMagnitude(node)) ?? node.label ?? node.id;

  // How far past the end of a hive axis its NAME has to sit to clear the outermost node's own
  // label. The outermost node's circle edge lands exactly on the axis end, so its label occupies
  // `[end + labelPadding, end + labelPadding + itsWidth]` — placing the axis name at
  // `end + labelPadding` (the obvious choice) prints the two on top of each other. Found by
  // driving the chart in a browser: the axis named "Edge" and the node labelled "Gateway"
  // rendered as one unreadable smear, and jsdom can neither lay text out nor detect the overlap,
  // so the whole spec suite stayed green.
  //
  // Measured through the shared `measureLabelWidth()` rather than reserving the flat
  // `LABEL_GUTTER` — a graph with short names should not pay for a gutter sized to the longest
  // one it might have had. Same probe idiom the chord layer's endpoint-label reserve uses.
  let widestNodeLabel = 0;
  if (config.showLabels) {
    const probe = bounds
      .append('text')
      .style('font-size', toCssFontSize(theme.label.fontSize))
      .node();
    if (probe) {
      for (const node of nodeData) {
        widestNodeLabel = Math.max(
          widestNodeLabel,
          Math.min(LABEL_GUTTER, measureLabelWidth(probe, labelTextFor(node), fallbackFontSize))
        );
      }
      probe.remove();
    }
  }

  // ONE expression feeds both the reserve and the placement below, so the two can never drift
  // apart — the defect above was exactly that drift.
  const hiveAxisLabelGap = labelPadding + widestNodeLabel;

  // The hive layout draws its own axes, and the layers group is CLIPPED — so chrome hung past
  // the plot rect is discarded rather than merely tight. Take the whole reserve out of the
  // radius BEFORE the layout runs, then apply the shared `radiusRatio` knob last, after the
  // reserves, exactly as every radial layer does.
  const hiveLabelReserve = hiveAxisLabelGap + HIVE_AXIS_LABEL_RESERVE;
  const hiveOuterRadius = applyRadiusRatio(
    Math.max(0, Math.min(boundedWidth, boundedHeight) / 2 - hiveLabelReserve),
    config.radiusRatio
  );

  // Runtime `layout` flips leave the previous geometry's marks bound to data the new joins do
  // not look for, so they would never enter an exit transition — stamp the rendered layout and
  // clear every mark when it changes, before any join runs. Same guard the chord layer uses.
  if (container.attr('data-layout') !== layout) {
    container
      .selectAll(
        '.nge-network-axis, .nge-network-axis-label, .nge-network-link, .nge-network-node, .nge-network-label'
      )
      .interrupt()
      .remove();
    container.attr('data-layout', layout);
  }

  const { axes, center, positions } = networkLayoutFor(styleHost ?? container.node()!, {
    axisCount: config.axisCount,
    charge: config.charge,
    clusterStrength: config.clusterStrength,
    graph,
    height: boundedHeight,
    innerRadius: config.innerRadius,
    layout,
    linkDistance: config.linkDistance,
    maxNodeRadius: config.maxNodeRadius,
    minNodeRadius: config.minNodeRadius,
    nodes: nodeData,
    outerRadius: layout === 'hive' ? hiveOuterRadius : undefined,
    seed: config.seed,
    tickCount: config.tickCount,
    width: boundedWidth,
  });

  if (positions.size === 0) {
    clear();
    return;
  }

  // ── Colour ────────────────────────────────────────────────────────────────────────────────
  // Node fill: per-node `color` → palette by node index → the single-node fallback. Index is
  // taken from `deriveGraphNodes`' order, which is also what the legend extractor walks — the
  // two must agree or a legend swatch shows a colour the chart never drew.
  const palette = config.seriesColors?.length ? config.seriesColors : theme.node.colors;
  const indexById = new Map<string, number>(nodeData.map((node, i) => [node.id, i]));
  const nodeById = new Map<string, NgeGraphNode>(nodeData.map(node => [node.id, node]));
  const nodeFill = (node: NgeGraphNode): string => {
    const index = indexById.get(node.id) ?? 0;
    return node.color ?? palette[index % palette.length] ?? theme.node.color;
  };

  // Link colour: an explicit per-link override → its SOURCE node's resolved colour → the theme
  // fallback. Inheriting the source forward is what lets a reader follow a relationship out of
  // where it came from — the same rule the sankey and chord layers use.
  const linkStroke = (link: NgeGraphLink): string => {
    const source = nodeById.get(link.source);
    return link.color ?? (source ? nodeFill(source) : theme.link.color);
  };

  // ── Links ─────────────────────────────────────────────────────────────────────────────────
  // A link naming an endpoint outside the node set is dropped rather than thrown on, matching
  // the tolerance the sankey and chord layers extend. Parallel edges between the same pair get
  // a disambiguating suffix so the keyed join never binds two marks to one key.
  const linkKeyCounts = new Map<string, number>();
  const resolvedLinks: ResolvedLink[] = [];

  for (const link of graph.links) {
    const source = positions.get(link.source);
    const target = positions.get(link.target);
    if (!source || !target) {
      continue;
    }

    const base = `${link.source}->${link.target}`;
    const seen = linkKeyCounts.get(base) ?? 0;
    linkKeyCounts.set(base, seen + 1);

    resolvedLinks.push({
      key: seen === 0 ? base : `${base}#${seen}`,
      link,
      source,
      target,
    });
  }

  const linkPathFor = (resolved: ResolvedLink): string =>
    layout === 'hive'
      ? hiveLinkPath(resolved, center, directed)
      : straightLinkPath(resolved, directed);

  // ── Arrowhead markers ─────────────────────────────────────────────────────────────────────
  // One `<marker>` per distinct resolved link colour, rather than one shared marker: a link
  // inherits its source node's colour, so a single grey arrowhead would visibly detach every
  // arrow from the edge it terminates. `context-stroke` would express this in one marker but
  // is not reliably supported, so the colours are enumerated instead.
  let defs = container.select<SVGDefsElement>('defs.nge-network-defs');
  if (defs.empty()) {
    defs = container.append('defs').attr('class', 'nge-network-defs');
  }

  const markerIdPrefix =
    container.attr('data-marker-prefix') ??
    (() => {
      const prefix = `nge-network-arrow-${++markerIdCounter}`;
      container.attr('data-marker-prefix', prefix);
      return prefix;
    })();

  const arrowColors = directed
    ? [...new Set(resolvedLinks.map(resolved => linkStroke(resolved.link)))]
    : [];
  const markerIdByColor = new Map<string, string>(
    arrowColors.map((color, index) => [color, `${markerIdPrefix}-${index}`])
  );

  const markerSel = defs
    .selectAll<SVGMarkerElement, string>('marker.nge-network-arrow')
    .data(arrowColors, color => color);

  markerSel.exit().remove();

  markerSel
    .enter()
    .append('marker')
    .attr('class', 'nge-network-arrow')
    .attr('markerUnits', 'userSpaceOnUse')
    .attr('markerWidth', ARROW_LENGTH)
    .attr('markerHeight', ARROW_HALF_WIDTH * 2)
    .attr('refX', ARROW_LENGTH)
    .attr('refY', ARROW_HALF_WIDTH)
    .attr('orient', 'auto')
    .append('path')
    .attr('d', `M0,0L${ARROW_LENGTH},${ARROW_HALF_WIDTH}L0,${ARROW_HALF_WIDTH * 2}Z`);

  defs
    .selectAll<SVGMarkerElement, string>('marker.nge-network-arrow')
    .attr('id', color => markerIdByColor.get(color) ?? '')
    .select('path')
    .style('fill', color => color as string);

  let linkGroup = container.select<SVGGElement>('.nge-network-links');
  if (linkGroup.empty()) {
    linkGroup = container.append('g').classed('nge-network-links', true);
  }

  linkGroup.selectAll('.nge-network-link').interrupt();

  const linkSel = linkGroup
    .selectAll<SVGPathElement, ResolvedLink>('.nge-network-link')
    .data(resolvedLinks, resolved => resolved.key);

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
    .classed('nge-network-link', true)
    .attr('data-link', resolved => resolved.key)
    .style('fill', 'none')
    .style('opacity', 0);

  const mergedLinks = enteredLinks.merge(linkSel);
  mergedLinks
    .attr('d', linkPathFor)
    .attr('marker-end', resolved => {
      const id = markerIdByColor.get(linkStroke(resolved.link));
      return id ? `url(#${id})` : null;
    })
    .style('stroke', resolved => linkStroke(resolved.link))
    .style('stroke-width', theme.link.width);

  enteredLinks
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.link.opacity);

  // Survivors re-assert resting opacity SYNCHRONOUSLY (entering links excluded — still fading
  // in). Without this a link whose fade was cut short by a re-render keeps whatever partial
  // opacity it was interrupted at, permanently (ARCH-194).
  linkSel.style('opacity', theme.link.opacity);

  mergedLinks
    .on('mouseenter.nge-network-hover', function () {
      this.style.opacity = String(theme.link.opacityHover);
    })
    .on('mouseleave.nge-network-hover', function () {
      this.style.opacity = String(theme.link.opacity);
    });

  // ── Hive axes ─────────────────────────────────────────────────────────────────────────────
  let axisGroup = container.select<SVGGElement>('.nge-network-axes');
  if (axisGroup.empty()) {
    axisGroup = container.append('g').classed('nge-network-axes', true);
  }
  axisGroup.lower();

  axisGroup.selectAll('.nge-network-axis').interrupt();

  const axisSel = axisGroup
    .selectAll<SVGPathElement, NetworkHiveAxis>('.nge-network-axis')
    .data(axes, axis => String(axis.index));

  axisSel.exit().remove();

  const axisPath = (axis: NetworkHiveAxis): string =>
    `M${center.x + axis.innerRadius * Math.cos(axis.angle)},${
      center.y + axis.innerRadius * Math.sin(axis.angle)
    }L${center.x + axis.outerRadius * Math.cos(axis.angle)},${
      center.y + axis.outerRadius * Math.sin(axis.angle)
    }`;

  axisSel
    .enter()
    .append('path')
    .classed('nge-network-axis', true)
    .attr('data-axis', axis => axis.index)
    .merge(axisSel)
    .attr('d', axisPath)
    .style('fill', 'none')
    .style('stroke', theme.axis.color)
    .style('stroke-width', theme.axis.width);

  // An axis is named only when the graph's own `group` values named it — the degree-tertile
  // fallback has no meaningful label to show, and inventing one ("Axis 2") would read as data.
  const axisLabelData = axes.filter(axis => axis.label !== undefined);

  const axisLabelSel = axisGroup
    .selectAll<SVGTextElement, NetworkHiveAxis>('.nge-network-axis-label')
    .data(axisLabelData, axis => String(axis.index));

  axisLabelSel.exit().remove();

  axisLabelSel
    .enter()
    .append('text')
    .classed('nge-network-axis-label', true)
    .attr('data-axis-label', axis => axis.index)
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'none')
    .merge(axisLabelSel)
    .attr('x', axis => center.x + (axis.outerRadius + hiveAxisLabelGap) * Math.cos(axis.angle))
    .attr('y', axis => center.y + (axis.outerRadius + hiveAxisLabelGap) * Math.sin(axis.angle))
    // Anchor away from the centre so a label extends outward rather than back across its axis:
    // the left half reads right-to-left, the right half left-to-right, and the two vertical
    // extremes centre.
    .attr('text-anchor', axis => {
      const angle = normaliseAngle(axis.angle);
      const cos = Math.cos(angle);
      if (Math.abs(cos) < 0.2) {
        return 'middle';
      }
      return cos > 0 ? 'start' : 'end';
    })
    .style('fill', theme.label.color)
    .style('font-size', toCssFontSize(theme.label.fontSize))
    .style('font-weight', theme.label.fontWeight)
    .text(axis => axis.label ?? '');

  // ── Nodes ─────────────────────────────────────────────────────────────────────────────────
  let nodeGroup = container.select<SVGGElement>('.nge-network-nodes');
  if (nodeGroup.empty()) {
    nodeGroup = container.append('g').classed('nge-network-nodes', true);
  }
  nodeGroup.raise();

  nodeGroup.selectAll('.nge-network-node').interrupt();

  // Only nodes the layout actually seated are drawn — the two sets agree today, and binding
  // the layout's own output keeps them from ever diverging silently.
  const drawnNodes = nodeData.filter(node => positions.has(node.id));
  const positionOf = (node: NgeGraphNode): NetworkNodePosition =>
    positions.get(node.id) ?? { r: 0, x: center.x, y: center.y };

  const nodeSel = nodeGroup
    .selectAll<SVGCircleElement, NgeGraphNode>('.nge-network-node')
    .data(drawnNodes, node => node.id);

  nodeSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enteredNodes = nodeSel
    .enter()
    .append('circle')
    .classed('nge-network-node', true)
    .attr('data-node', node => node.id)
    .style('opacity', 0);

  const mergedNodes = enteredNodes.merge(nodeSel);
  mergedNodes
    .attr('cx', node => positionOf(node).x)
    .attr('cy', node => positionOf(node).y)
    .attr('r', node => positionOf(node).r)
    .style('fill', nodeFill)
    .style('stroke', theme.node.stroke)
    .style('stroke-width', theme.node.strokeWidth);

  // Opacity is deliberately NOT set on `mergedNodes` above — this mark follows the sankey
  // triad, so setting it there too would apply the resting value to an ENTERING node before
  // its fade-in transition below ever reads a starting point, defeating the fade outright AND
  // turning the update-only reassert into dead code (ARCH-200, AGENTS.md).
  enteredNodes
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.node.opacity);

  nodeSel.style('opacity', theme.node.opacity);

  // ── Interaction ───────────────────────────────────────────────────────────────────────────
  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  /**
   * Tooltip bubble anchored above a node's circle, offset by the chart's margins and clamped
   * to the canvas — mirrors the pie / sunburst / sankey / chord divot + clamp structure.
   */
  const buildTooltipEvent = (node: NgeGraphNode): NgeTooltipEvent | null => {
    if (!tooltipConfig?.formatContent) {
      return null;
    }

    const { r, x, y } = positionOf(node);
    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;

    const centerX = margins.left + x;

    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + boundedWidth - tooltipWidth;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, centerX - tooltipWidth / 2));

    const containerHeight = margins.top + boundedHeight + margins.bottom;
    const rawTooltipY = margins.top + y - r - tooltipHeight - 10;
    const tooltipY = Math.max(0, Math.min(containerHeight - tooltipHeight, rawTooltipY));

    const divotWidth = tooltipConfig.style?.divotWidth ?? 24;
    const rx = 4;
    const targetTipX = centerX - tooltipX;
    const divotX = Math.max(
      rx,
      Math.min(tooltipWidth - rx - divotWidth, targetTipX - divotWidth / 2)
    );
    const divotTipOffset = targetTipX - (divotX + divotWidth / 2);

    return {
      content: tooltipConfig.formatContent(withMagnitude(node)),
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

  const hideTooltipEvent = (): NgeTooltipEvent => ({
    content: { label: '', value: '' },
    dimensions: { height: tooltipConfig!.height, width: tooltipConfig!.width },
    divotPosition: 'bottom',
    position: { divotX: 0, x: 0, y: 0 },
    visible: false,
  });

  mergedNodes.style('cursor', config.onClick || tooltipEnabled ? 'pointer' : 'default');

  if (tooltipEnabled) {
    mergedNodes
      .on('mouseenter', (_event: PointerEvent, node: NgeGraphNode) => {
        const tooltipEvent = buildTooltipEvent(node);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      })
      .on('mouseleave', () => tooltipHandlers!.onTooltip(hideTooltipEvent()));
  } else {
    mergedNodes.on('mouseenter', null).on('mouseleave', null);
  }

  if (config.onClick) {
    mergedNodes.on('click', (event: PointerEvent, node: NgeGraphNode) => {
      config.onClick!({
        data: withMagnitude(node),
        event,
        index: indexById.get(node.id) ?? 0,
      });
    });
  } else {
    mergedNodes.on('click', null);
  }

  // ── Node labels ───────────────────────────────────────────────────────────────────────────
  let labelGroup = container.select<SVGGElement>('.nge-network-labels');
  if (labelGroup.empty()) {
    labelGroup = container.append('g').classed('nge-network-labels', true);
  }
  labelGroup.raise();

  labelGroup.selectAll('.nge-network-label').interrupt();

  const labelData = config.showLabels ? drawnNodes : [];

  const labelSel = labelGroup
    .selectAll<SVGTextElement, NgeGraphNode>('.nge-network-label')
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
    .classed('nge-network-label', true)
    .attr('data-label', node => node.id)
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'none')
    .style('opacity', 0);

  enteredLabels.transition().duration(animation.enterMs).ease(animation.easing).style('opacity', 1);
  labelSel.style('opacity', 1);

  enteredLabels
    .merge(labelSel)
    // A label sits to the RIGHT of its node when there is room on that side and flips to the
    // left otherwise — the layers group is clipped, so a label that overhangs is truncated
    // rather than merely tight, and jsdom neither lays text out nor clips (so a spec would
    // never see it). The flip is decided per node because a force layout gives no advance
    // notice of which side of the plot a node will settle on.
    .each(function (node) {
      const { r, x, y } = positionOf(node);
      const text = labelTextFor(node);
      const width = measureLabelWidth(this, text, fallbackFontSize);
      const flipsLeft = x + r + labelPadding + width > boundedWidth;

      const anchorX = flipsLeft ? x - r - labelPadding : x + r + labelPadding;
      const available = flipsLeft ? Math.max(0, anchorX) : Math.max(0, boundedWidth - anchorX);

      this.setAttribute('x', String(anchorX));
      this.setAttribute('y', String(y));
      this.setAttribute('text-anchor', flipsLeft ? 'end' : 'start');
      elideLabelText(this, text, Math.min(LABEL_GUTTER, available));
    })
    .style('fill', node =>
      resolveLabelColor({
        configColor: config.labelColor,
        datumColor: node.labelColor,
        // A network label never sits on a mark — see the layer config's own JSDoc — so there
        // is no fill to derive contrast against.
        fill: '',
        node: styleHost,
        theme: theme.label,
      })
    )
    .style('font-size', toCssFontSize(theme.label.fontSize))
    .style('font-weight', theme.label.fontWeight);
}
