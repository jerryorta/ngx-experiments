import 'd3-transition';

import type { NgeHierarchyDatum, NgeTreeLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeTreeLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';
import type { TreeNodePosition } from './tree-layout';

import {
  elideLabelText,
  measureLabelWidth,
  mergeTreeLayerTheme,
  resolveLabelColor,
  toCssFontSize,
} from '../../core/theme';
import {
  computeTreeLayout,
  DEFAULT_TREE_LABEL_PADDING,
  DEFAULT_TREE_LAYOUT,
  DEFAULT_TREE_LINK_SHAPE,
  DEFAULT_TREE_NODE_RADIUS,
  DEFAULT_TREE_ORIENTATION,
} from './tree-layout';

/**
 * Widest label reserve (px) the layer will take out of the plot, however long the text is. A
 * tree with one verbose leaf should not squash every level to make room for it; past this the
 * label elides instead. Matches the network layer's gutter.
 */
const LABEL_GUTTER = 72;

/**
 * Hard ceiling on the label reserve as a fraction of the depth axis. Reached only on a small
 * chart with long labels, where the flat {@link LABEL_GUTTER} alone would leave no room for the
 * tree itself — the marks the labels exist to annotate.
 */
const MAX_RESERVE_RATIO = 0.4;

/**
 * A `<text>` box is taller than its font size — ascenders and descenders reach past the em
 * square — so a vertical orientation reserves `fontSize × this`, not `fontSize`. Same ratio the
 * wordcloud layer packs by; under-reserving here puts the bottom row's descenders through the
 * clip edge, which jsdom cannot see (AGENTS.md § A `<text>` element is TALLER than its font size).
 */
const GLYPH_BOX_RATIO = 1.2;

/**
 * Numeric font size (px) assumed when `theme.label.fontSize` is a CSS string
 * `measureLabelWidth` cannot parse into a number for its jsdom fallback (e.g.
 * `var(--nge-chart-label-font-size, 10px)`, the theme default). Matches that default's own
 * literal fallback, so the common case measures against the number the token itself resolves to.
 */
const FALLBACK_LABEL_FONT_SIZE = 10;

/**
 * A label `<text>` caches the geometry it was last drawn at, so the update transition can
 * interpolate to the new one.
 *
 * The cache exists because the transform is tweened by hand: `d3-interpolate`'s transform parser
 * reads `svgNode.transform.baseVal`, which **jsdom does not implement**, so a plain
 * `.transition().attr('transform', …)` throws from inside a rAF callback and surfaces as a
 * mystery failure in whichever spec happened to be running. The node circles escape this
 * entirely by positioning through `cx` / `cy`, which are ordinary numeric attributes; a label
 * cannot, because the radial layout rotates it (AGENTS.md § NEVER transition the `transform`
 * ATTRIBUTE).
 */
interface LabelGeometry {
  rotate: number;
  x: number;
  y: number;
}

type LabelNode = SVGTextElement & { _current?: LabelGeometry };

/** Linear interpolation for the hand-rolled transform tween. */
function lerp(from: number, to: number, t: number): number {
  return from + (to - from) * t;
}

/** The transform string a label is drawn with — one shape for both coordinate systems. */
function labelTransform(geometry: LabelGeometry): string {
  return `translate(${geometry.x},${geometry.y}) rotate(${geometry.rotate})`;
}

function geometryOf(node: TreeNodePosition): LabelGeometry {
  return { rotate: node.labelRotate, x: node.labelX, y: node.labelY };
}

/**
 * Render the tree layer — a hierarchy drawn as a link diagram (dendrogram / org chart / mind
 * map / radial convergence).
 *
 * Self-scaled: it ignores the shared cartesian scales and seats itself on the plot rect, the
 * same opt-out the radial, sankey, chord and network layers make. All geometry comes from
 * `computeTreeLayout()`, which is pure and DOM-free; this function does the DOM reconciliation,
 * theming and interaction only.
 */
export function renderTreeLayer(
  context: NgeChartLayerContext<
    NgeHierarchyDatum,
    NgeTreeLayerConfig,
    NgeTreeLayerTheme | undefined
  >
): void {
  const { animation, bounds, config, dimensions, margins, tooltipConfig, tooltipHandlers } =
    context;

  if (!bounds) {
    return;
  }

  const theme = mergeTreeLayerTheme(context.theme);

  let container = bounds.select<SVGGElement>('.nge-tree-container');
  if (container.empty()) {
    container = bounds.append('g').classed('nge-tree-container', true);
  }

  /** Drop every mark — the shared bail-out for empty or unmeasurable input. */
  const clear = (): void => {
    container.selectAll('.nge-tree-link').interrupt().remove();
    container.selectAll('.nge-tree-node').interrupt().remove();
    container.selectAll('.nge-tree-label').interrupt().remove();
  };

  const data = config.data;
  const { boundedHeight, boundedWidth } = dimensions;

  // A chart renders once before its container is measured; laying out into a zero-size extent
  // yields NaN geometry rather than an error.
  if (!data?.length || boundedWidth <= 0 || boundedHeight <= 0) {
    clear();
    return;
  }

  const layout = config.layout ?? DEFAULT_TREE_LAYOUT;
  const orientation = config.orientation ?? DEFAULT_TREE_ORIENTATION;
  const linkShape = config.linkShape ?? DEFAULT_TREE_LINK_SHAPE;
  const nodeRadius = config.nodeRadius ?? DEFAULT_TREE_NODE_RADIUS;
  const labelPadding = config.labelPadding ?? DEFAULT_TREE_LABEL_PADDING;
  const styleHost = bounds.node();

  const parsedFontSize =
    typeof theme.label.fontSize === 'number'
      ? theme.label.fontSize
      : parseFloat(theme.label.fontSize);
  const fallbackFontSize = Number.isFinite(parsedFontSize)
    ? parsedFontSize
    : FALLBACK_LABEL_FONT_SIZE;

  const labelTextFor = (datum: NgeHierarchyDatum): string =>
    config.formatLabel?.(datum) ?? datum.label;

  const baseOptions = {
    alignLeaves: config.alignLeaves,
    boundedHeight,
    boundedWidth,
    data,
    labelPadding,
    layout,
    linkShape,
    maxDepth: config.maxDepth,
    nodeRadius,
    orientation,
    radiusRatio: config.radiusRatio,
  };

  // Two passes, because the reserve depends on which nodes end up as leaves and `maxDepth` can
  // turn an internal node into one. The first pass answers that question against zero reserves;
  // the second lays the tree out inside what the labels actually need. A closed-form layout, so
  // the second pass costs one more O(n) walk — cheap next to guessing the reserve wrong, which
  // the clip turns into missing labels rather than tight ones.
  const probeLayout = computeTreeLayout(baseOptions);

  let reserveFar = 0;
  let reserveNear = 0;

  if (config.showLabels && probeLayout.nodes.length) {
    const vertical = orientation === 'bottom-top' || orientation === 'top-bottom';

    if (vertical && layout !== 'radial') {
      // Text runs ACROSS the depth axis here, so the reserve is a line box, not a width.
      const band = fallbackFontSize * GLYPH_BOX_RATIO + labelPadding;
      reserveFar = band;
      reserveNear = band;
    } else {
      const probe = bounds
        .append('text')
        .style('font-size', toCssFontSize(theme.label.fontSize))
        .node();

      if (probe) {
        for (const node of probeLayout.nodes) {
          const width = Math.min(
            LABEL_GUTTER,
            measureLabelWidth(probe, labelTextFor(node.datum), fallbackFontSize) + labelPadding
          );
          if (node.isLeaf) {
            reserveFar = Math.max(reserveFar, width);
          }
          // A non-leaf root label anchors BACKWARD, off the root end of the depth axis, so it
          // needs its own reserve there. Radial roots sit at the pole and need none.
          if (node.depth === 0 && !node.isLeaf && layout !== 'radial') {
            reserveNear = Math.max(reserveNear, width);
          }
        }
        probe.remove();
      }
    }

    // Never let the labels crowd the tree out of its own plot.
    const depthAxis =
      layout === 'radial'
        ? Math.min(boundedWidth, boundedHeight) / 2
        : orientation === 'bottom-top' || orientation === 'top-bottom'
          ? boundedHeight
          : boundedWidth;
    const ceiling = depthAxis * MAX_RESERVE_RATIO;
    reserveFar = Math.min(reserveFar, ceiling);
    reserveNear = Math.min(reserveNear, ceiling);
  }

  const { links, nodes } = computeTreeLayout({
    ...baseOptions,
    labelReserveFar: reserveFar,
    labelReserveNear: reserveNear,
  });

  if (!nodes.length) {
    clear();
    return;
  }

  // A link's `d` changes COMMAND STRUCTURE across `linkShape` (an elbow's `M H V H` against a
  // curve's `M C`) and across `layout`, and `interpolateString` tweens the numbers it finds
  // positionally — so transitioning between two mismatched command lists draws garbage
  // mid-flight. Stamp what was drawn and clear the affected marks before the join, so the new
  // shape ENTERS rather than being mistaken for an update. Same guard the sunburst makes when
  // its radial `<path>` and linear `<rect>` share a class (`render-sunburst-layer.ts`).
  const mode = `${layout}|${orientation}|${linkShape}`;
  if (container.attr('data-layout') !== mode) {
    container.selectAll('.nge-tree-link').interrupt().remove();
    // Labels go too: a radial label's rotation and a cartesian label's zero are not points on
    // one arc, so tweening between them spins the text through most of a turn.
    container.selectAll('.nge-tree-label').interrupt().remove();
    container.attr('data-layout', mode);
  }

  const palette = config.seriesColors?.length ? config.seriesColors : theme.node.colors;
  const fillFor = (node: TreeNodePosition): string =>
    node.datum.color ?? palette[node.branchIndex % palette.length] ?? theme.node.color;

  // ── Links ─────────────────────────────────────────────────────────────────────────────────
  // Drawn first so the node circles sit on top of the edges that reach them.
  let linkGroup = container.select<SVGGElement>('.nge-tree-links');
  if (linkGroup.empty()) {
    linkGroup = container.append('g').classed('nge-tree-links', true);
  }

  linkGroup.selectAll('.nge-tree-link').interrupt();

  const linkSel = linkGroup
    .selectAll<SVGPathElement, (typeof links)[number]>('.nge-tree-link')
    .data(links, link => link.key);

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
    .classed('nge-tree-link', true)
    .attr('data-link', link => link.key)
    .attr('d', link => link.path)
    .style('fill', 'none')
    .style('opacity', 0);

  // `d` is a plain string attribute, so the survivors' reshape transitions natively — only
  // `transform` has to be tweened by hand.
  linkSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('d', link => link.path);

  enteredLinks
    .merge(linkSel)
    .style('stroke', link => link.target.datum.color ?? theme.link.color)
    .style('stroke-width', theme.link.width);

  // Opacity is deliberately NOT set on the merged selection: doing so would apply the resting
  // value to an ENTERING mark before its fade-in ever reads a starting point, defeating the fade
  // AND turning the update-only reassert below into dead code (ARCH-200, AGENTS.md).
  enteredLinks
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.link.opacity);

  linkSel.style('opacity', theme.link.opacity);

  // ── Nodes ─────────────────────────────────────────────────────────────────────────────────
  let nodeGroup = container.select<SVGGElement>('.nge-tree-nodes');
  if (nodeGroup.empty()) {
    nodeGroup = container.append('g').classed('nge-tree-nodes', true);
  }
  nodeGroup.raise();

  nodeGroup.selectAll('.nge-tree-node').interrupt();

  const nodeSel = nodeGroup
    .selectAll<SVGCircleElement, TreeNodePosition>('.nge-tree-node')
    .data(nodes, node => node.key);

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
    .classed('nge-tree-node', true)
    .attr('data-node', node => node.key)
    .attr('cx', node => node.x)
    .attr('cy', node => node.y)
    .attr('r', nodeRadius)
    .style('opacity', 0);

  nodeSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attr('cx', node => node.x)
    .attr('cy', node => node.y)
    .attr('r', nodeRadius);

  const mergedNodes = enteredNodes.merge(nodeSel);
  mergedNodes
    .style('fill', fillFor)
    .style('stroke', theme.node.stroke)
    .style('stroke-width', theme.node.strokeWidth);

  enteredNodes
    .transition()
    .duration(animation.enterMs)
    .ease(animation.easing)
    .style('opacity', theme.node.opacity);

  nodeSel.style('opacity', theme.node.opacity);

  // ── Interaction ───────────────────────────────────────────────────────────────────────────
  const tooltipEnabled = tooltipConfig?.enabled && tooltipHandlers?.onTooltip;

  /**
   * Tooltip bubble anchored above a node's circle, offset by the chart's margins and clamped to
   * the canvas — mirrors the pie / sunburst / sankey / chord / network divot + clamp structure.
   */
  const buildTooltipEvent = (node: TreeNodePosition): NgeTooltipEvent | null => {
    if (!tooltipConfig?.formatContent) {
      return null;
    }

    const tooltipWidth = tooltipConfig.width;
    const tooltipHeight = tooltipConfig.height;
    const centerX = margins.left + node.x;

    const minTooltipX = margins.left;
    const maxTooltipX = margins.left + boundedWidth - tooltipWidth;
    const tooltipX = Math.max(minTooltipX, Math.min(maxTooltipX, centerX - tooltipWidth / 2));

    const containerHeight = margins.top + boundedHeight + margins.bottom;
    const rawTooltipY = margins.top + node.y - nodeRadius - tooltipHeight - 10;
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
      content: tooltipConfig.formatContent(node.datum),
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
      .on('mouseenter', (_event: PointerEvent, node: TreeNodePosition) => {
        const tooltipEvent = buildTooltipEvent(node);
        if (tooltipEvent) {
          tooltipHandlers!.onTooltip(tooltipEvent);
        }
      })
      .on('mouseleave', () => tooltipHandlers!.onTooltip(hideTooltipEvent()));
  } else {
    mergedNodes.on('mouseenter', null).on('mouseleave', null);
  }

  const indexByKey = new Map(nodes.map((node, index) => [node.key, index]));

  if (config.onClick) {
    mergedNodes.on('click', (event: PointerEvent, node: TreeNodePosition) => {
      config.onClick!({ data: node.datum, event, index: indexByKey.get(node.key) ?? 0 });
    });
  } else {
    mergedNodes.on('click', null);
  }

  // ── Labels ────────────────────────────────────────────────────────────────────────────────
  let labelGroup = container.select<SVGGElement>('.nge-tree-labels');
  if (labelGroup.empty()) {
    labelGroup = container.append('g').classed('nge-tree-labels', true);
  }
  labelGroup.raise();

  labelGroup.selectAll('.nge-tree-label').interrupt();

  const labelData = config.showLabels ? nodes : [];

  const labelSel = labelGroup
    .selectAll<LabelNode, TreeNodePosition>('.nge-tree-label')
    .data(labelData, node => node.key);

  labelSel
    .exit()
    .transition()
    .duration(animation.exitMs)
    .ease(animation.easing)
    .style('opacity', 0)
    .remove();

  const enteredLabels = labelSel
    .enter()
    .append<LabelNode>('text')
    .classed('nge-tree-label', true)
    .attr('data-label', node => node.key)
    .attr('dominant-baseline', 'middle')
    .style('pointer-events', 'none')
    .style('opacity', 0)
    // Entering labels are placed at their FINAL geometry synchronously and fade in, so first
    // paint is smear-free and the position is assertable without flushing a transition.
    .each(function (node) {
      this._current = geometryOf(node);
      this.setAttribute('transform', labelTransform(this._current));
    });

  labelSel
    .transition()
    .duration(animation.updateMs)
    .ease(animation.easing)
    .attrTween('transform', function (node) {
      const from = this._current ?? geometryOf(node);
      const to = geometryOf(node);
      this._current = to;
      return (t: number) =>
        labelTransform({
          rotate: lerp(from.rotate, to.rotate, t),
          x: lerp(from.x, to.x, t),
          y: lerp(from.y, to.y, t),
        });
    });

  enteredLabels.transition().duration(animation.enterMs).ease(animation.easing).style('opacity', 1);

  labelSel.style('opacity', 1);

  enteredLabels
    .merge(labelSel)
    .attr('text-anchor', node => node.labelAnchor)
    .style('fill', node =>
      resolveLabelColor({
        configColor: config.labelColor,
        datumColor: node.datum.labelColor,
        // A tree label never sits on a mark — see the layer config's own JSDoc — so there is no
        // fill to derive contrast against.
        fill: '',
        node: styleHost,
        theme: theme.label,
      })
    )
    .style('font-size', toCssFontSize(theme.label.fontSize))
    .style('font-weight', theme.label.fontWeight)
    .each(function (node) {
      elideLabelText(this, labelTextFor(node.datum), node.labelMaxWidth);
    });
}
