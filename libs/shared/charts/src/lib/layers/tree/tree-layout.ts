import type { ClusterLayout, HierarchyPointNode, TreeLayout } from 'd3-hierarchy';

import { cluster, hierarchy, tree } from 'd3-hierarchy';
import { linkHorizontal, linkVertical } from 'd3-shape';

import type {
  NgeHierarchyDatum,
  NgeTreeLayout,
  NgeTreeLinkShape,
  NgeTreeOrientation,
} from '../../core/config';

import { applyRadiusRatio } from '../../core/fns';

/** Node circle radius (px) when a layer config omits `nodeRadius`. */
export const DEFAULT_TREE_NODE_RADIUS = 4;

/** Gap (px) between a node's circle and its label when a layer config omits `labelPadding`. */
export const DEFAULT_TREE_LABEL_PADDING = 6;

/** Coordinate system when a layer config omits `layout`. */
export const DEFAULT_TREE_LAYOUT: NgeTreeLayout = 'tidy';

/** Root edge when a layer config omits `orientation`. */
export const DEFAULT_TREE_ORIENTATION: NgeTreeOrientation = 'left-right';

/** Edge geometry when a layer config omits `linkShape`. */
export const DEFAULT_TREE_LINK_SHAPE: NgeTreeLinkShape = 'curve';

/**
 * A node once seated by the layout — everything the render fn needs to draw it, in
 * **plot-absolute pixels**.
 *
 * Absolute rather than centre-relative even in the radial layout, which costs a hand-built
 * radial link path (see {@link radialBumpPath}) and buys two things: the render fn has one
 * positioning path instead of two, and "every mark lies inside the bounded plot rect" — the
 * property `g.nge-chart-layers`' clip makes load-bearing, and which jsdom cannot catch — is
 * a direct assertion on these numbers rather than one that has to undo a group transform.
 */
export interface TreeNodePosition {
  /** Polar angle (radians, clockwise from 12 o'clock). Radial layout only. */
  angle?: number;
  /** Index of the top-level branch this node descends from — the palette key. */
  branchIndex: number;
  /** The caller's datum, carrying its SUMMED value (internal nodes report their aggregate). */
  datum: NgeHierarchyDatum;
  /** Depth below the drawn root (0 = root). */
  depth: number;
  /** True when the node has no drawn children — the label side of the tree. */
  isLeaf: boolean;
  /** Join key: the root-to-node label path, unique where a bare `label` is not. */
  key: string;
  /** Where the label anchors relative to {@link labelX} / {@link labelY}. */
  labelAnchor: 'end' | 'middle' | 'start';
  /** Room (px) this label has before it runs into a neighbour or the plot edge; elide into it. */
  labelMaxWidth: number;
  /** Label rotation (degrees) applied after the translate — non-zero in the radial layout only. */
  labelRotate: number;
  /** Label origin (px, plot-absolute). */
  labelX: number;
  labelY: number;
  /** Polar radius (px from the plot centre). Radial layout only. */
  radius?: number;
  /** Node centre (px, plot-absolute). */
  x: number;
  y: number;
}

/** A parent→child edge once resolved against the seated nodes. */
export interface TreeLinkPosition {
  /** Join key: the two endpoint keys. */
  key: string;
  /** The `d` attribute, in plot-absolute pixels. */
  path: string;
  source: TreeNodePosition;
  target: TreeNodePosition;
}

/** Everything {@link computeTreeLayout} hands the render fn. */
export interface TreeLayoutResult {
  links: TreeLinkPosition[];
  nodes: TreeNodePosition[];
}

/**
 * Inputs to {@link computeTreeLayout}.
 *
 * The two label reserves arrive **already measured in pixels** because text measurement needs
 * a laid-out DOM node and this module is deliberately DOM-free — the render fn measures with
 * the shared `measureLabelWidth()` and passes the result in, the same division of labour the
 * network layer's hive-axis reserve uses.
 */
export interface TreeLayoutOptions {
  /** Push every leaf to the outer edge (`d3.cluster()`) instead of its own depth (`d3.tree()`). */
  alignLeaves?: boolean;
  boundedHeight: number;
  boundedWidth: number;
  /** Top-level hierarchy nodes. */
  data: NgeHierarchyDatum[];
  /** Gap (px) between a node's circle and its label. */
  labelPadding?: number;
  /**
   * Px to reserve past the LEAF end of the depth axis for leaf labels — a width in the
   * horizontal orientations and the radial layout, a height in the vertical ones.
   */
  labelReserveFar?: number;
  /**
   * Px to reserve before the ROOT end of the depth axis for the root's own label. Cartesian
   * only: a radial root sits at the centre, where its label has the whole hub to itself.
   */
  labelReserveNear?: number;
  layout?: NgeTreeLayout;
  linkShape?: NgeTreeLinkShape;
  maxDepth?: number;
  nodeRadius?: number;
  orientation?: NgeTreeOrientation;
  radiusRatio?: number;
}

/** A laid-out d3 hierarchy node — carries the layout's own `x` (breadth) and `y` (depth). */
type PointNode = HierarchyPointNode<NgeHierarchyDatum>;

/** True for the two orientations whose depth axis runs left↔right. */
function isHorizontal(orientation: NgeTreeOrientation): boolean {
  return orientation === 'left-right' || orientation === 'right-left';
}

/**
 * Cubic-bezier edge for the radial layout, in plot-absolute pixels.
 *
 * `d3.linkRadial()` draws exactly this curve but emits coordinates relative to the pole, which
 * would force the whole layer into a translated group; see {@link TreeNodePosition} for why
 * the layer stays plot-absolute instead. The shape is `curveBumpRadial`'s: both control points
 * sit at the endpoints' own angles, at the mid-radius, so the edge leaves each node radially
 * and the family of edges out of one parent reads as a fan.
 */
function radialBumpPath(
  source: TreeNodePosition,
  target: TreeNodePosition,
  centerX: number,
  centerY: number
): string {
  const a0 = source.angle ?? 0;
  const a1 = target.angle ?? 0;
  const r0 = source.radius ?? 0;
  const r1 = target.radius ?? 0;
  const rm = (r0 + r1) / 2;

  const px = (angle: number, radius: number): number =>
    centerX + radius * Math.cos(angle - Math.PI / 2);
  const py = (angle: number, radius: number): number =>
    centerY + radius * Math.sin(angle - Math.PI / 2);

  return (
    `M${source.x},${source.y}` +
    `C${px(a0, rm)},${py(a0, rm)} ${px(a1, rm)},${py(a1, rm)} ${target.x},${target.y}`
  );
}

/**
 * Right-angle edge — the org-chart reporting line. The turn is taken at the midpoint of the
 * depth axis, so every edge at one level turns on the same line and the siblings read as a
 * bracket rather than a bundle of independent paths.
 */
function elbowPath(
  source: TreeNodePosition,
  target: TreeNodePosition,
  horizontal: boolean
): string {
  if (horizontal) {
    const mid = (source.x + target.x) / 2;
    return `M${source.x},${source.y}H${mid}V${target.y}H${target.x}`;
  }

  const mid = (source.y + target.y) / 2;
  return `M${source.x},${source.y}V${mid}H${target.x}V${target.y}`;
}

const horizontalCurve = linkHorizontal<
  { source: TreeNodePosition; target: TreeNodePosition },
  TreeNodePosition
>()
  .source(d => d.source)
  .target(d => d.target)
  .x(p => p.x)
  .y(p => p.y);

const verticalCurve = linkVertical<
  { source: TreeNodePosition; target: TreeNodePosition },
  TreeNodePosition
>()
  .source(d => d.source)
  .target(d => d.target)
  .x(p => p.x)
  .y(p => p.y);

/**
 * Seat a hierarchy as a link diagram and resolve every mark to plot-absolute pixels.
 *
 * Pure and DOM-free, so the whole geometry — orientation mapping, label placement, the reserve
 * arithmetic that keeps marks inside the clipped plot rect — is unit-testable without a chart.
 */
export function computeTreeLayout(options: TreeLayoutOptions): TreeLayoutResult {
  const {
    alignLeaves = false,
    boundedHeight,
    boundedWidth,
    data,
    labelPadding = DEFAULT_TREE_LABEL_PADDING,
    labelReserveFar = 0,
    labelReserveNear = 0,
    layout = DEFAULT_TREE_LAYOUT,
    linkShape = DEFAULT_TREE_LINK_SHAPE,
    maxDepth,
    nodeRadius = DEFAULT_TREE_NODE_RADIUS,
    orientation = DEFAULT_TREE_ORIENTATION,
    radiusRatio,
  } = options;

  if (!data.length || boundedWidth <= 0 || boundedHeight <= 0) {
    return { links: [], nodes: [] };
  }

  // A single top-level node IS the tree's root and is drawn. Several are a forest, which needs
  // a synthetic root to lay out but must not draw one — an unlabelled node joining unrelated
  // trees claims a relationship the data does not have.
  const isForest = data.length !== 1;
  const root = isForest
    ? hierarchy<NgeHierarchyDatum>({ children: data, label: '' })
    : hierarchy<NgeHierarchyDatum>(data[0]);

  // Sum BEFORE pruning so a node whose children `maxDepth` hides still reports its full
  // subtree aggregate to `formatLabel` and the tooltip.
  root.sum(node => (node.children?.length ? 0 : (node.value ?? 0)));

  const drawnRootDepth = isForest ? 1 : 0;
  if (maxDepth !== undefined && Number.isFinite(maxDepth) && maxDepth >= 0) {
    const cap = drawnRootDepth + maxDepth;
    root.each(node => {
      if (node.depth >= cap) {
        node.children = undefined;
      }
    });
  }

  const radial = layout === 'radial';
  const horizontal = isHorizontal(orientation);

  // Breadth extent — the axis siblings spread along. Inset by the node radius at BOTH ends so
  // the outermost circle's EDGE lands inside the plot, not its centre (the clipped-group rule).
  const breadthExtent = radial
    ? 2 * Math.PI
    : Math.max(0, (horizontal ? boundedHeight : boundedWidth) - 2 * nodeRadius);

  // Depth extent — root end to leaf end, with both label reserves taken out FIRST so the
  // labels have somewhere to sit that is still inside the clip.
  const depthAvailable = radial
    ? Math.max(0, Math.min(boundedWidth, boundedHeight) / 2 - nodeRadius - labelReserveFar)
    : Math.max(
        0,
        (horizontal ? boundedWidth : boundedHeight) -
          2 * nodeRadius -
          labelReserveNear -
          labelReserveFar
      );

  // `radiusRatio` is applied LAST, after the reserve, so the two compose rather than fight —
  // the shared contract in `core/fns/radial-radius.fns.ts` that every radial layer follows.
  const depthExtent = radial ? applyRadiusRatio(depthAvailable, radiusRatio) : depthAvailable;

  // A radial tree crowds toward the pole, so siblings need proportionally more angular room
  // the shallower they sit; the cartesian layouts use d3's own separation.
  const layoutFn: ClusterLayout<NgeHierarchyDatum> | TreeLayout<NgeHierarchyDatum> = alignLeaves
    ? cluster<NgeHierarchyDatum>()
    : tree<NgeHierarchyDatum>();
  layoutFn.size([breadthExtent, depthExtent]);
  if (radial) {
    layoutFn.separation((a, b) => (a.parent === b.parent ? 1 : 2) / Math.max(a.depth, 1));
  }

  const laidOut = layoutFn(root);
  const drawn: PointNode[] = laidOut.descendants().filter(node => node.depth >= drawnRootDepth);

  // Dropping the synthetic root would otherwise leave its empty depth band at the root end;
  // re-normalising the depth coordinate over the DRAWN nodes reclaims it. A no-op when the
  // caller's own root is drawn (its `y` is already 0).
  const depths = drawn.map(node => node.y);
  const minDepth = Math.min(...depths);
  const maxDepthPx = Math.max(...depths);
  const depthSpan = maxDepthPx - minDepth;
  const normaliseDepth = (y: number): number =>
    depthSpan > 0 ? ((y - minDepth) / depthSpan) * depthExtent : 0;

  // Distinct drawn depths, used to size the room an internal label has before it reaches the
  // level behind it.
  const levelCount = new Set(drawn.map(node => node.depth)).size;
  const depthStep = levelCount > 1 ? depthExtent / (levelCount - 1) : depthExtent;

  const centerX = boundedWidth / 2;
  const centerY = boundedHeight / 2;
  const labelGap = nodeRadius + labelPadding;

  const keyOf = (node: PointNode): string =>
    node
      .ancestors()
      .map(ancestor => ancestor.data.label)
      .reverse()
      .join('/');

  // Palette key: the depth-1 ancestor, so a branch and every node under it share one hue —
  // the rule the sunburst and treemap use, which is what lets ONE legend over the top-level
  // branches serve all three layers. The drawn root itself (depth 0, single-root trees) has no
  // such ancestor and takes the first entry.
  const topLevel = laidOut.children ?? [];
  const branchIndexOf = (node: PointNode): number => {
    const branch = node.ancestors().find(ancestor => ancestor.depth === 1);
    const index = branch ? topLevel.indexOf(branch) : 0;
    return index < 0 ? 0 : index;
  };

  // Nearest same-depth neighbour distance along the breadth axis — the horizontal budget a
  // centred label has in the vertical orientations before it touches a sibling's.
  const breadthByDepth = new Map<number, number[]>();
  for (const node of drawn) {
    const bucket = breadthByDepth.get(node.depth);
    if (bucket) {
      bucket.push(node.x);
    } else {
      breadthByDepth.set(node.depth, [node.x]);
    }
  }
  for (const bucket of breadthByDepth.values()) {
    bucket.sort((a, b) => a - b);
  }
  const neighbourGap = (node: PointNode): number => {
    const bucket = breadthByDepth.get(node.depth) ?? [];
    if (bucket.length < 2) {
      return Number.POSITIVE_INFINITY;
    }
    let gap = Number.POSITIVE_INFINITY;
    for (let i = 0; i < bucket.length; i++) {
      if (bucket[i] === node.x) {
        if (i > 0) {
          gap = Math.min(gap, node.x - bucket[i - 1]);
        }
        if (i < bucket.length - 1) {
          gap = Math.min(gap, bucket[i + 1] - node.x);
        }
        break;
      }
    }
    return gap;
  };

  const positions = new Map<string, TreeNodePosition>();
  const nodes: TreeNodePosition[] = [];

  for (const node of drawn) {
    const depthPx = normaliseDepth(node.y);
    const isLeaf = !node.children?.length;
    const isRoot = node.depth === drawnRootDepth;

    const position: TreeNodePosition = {
      branchIndex: branchIndexOf(node),
      datum: { ...node.data, value: node.value ?? node.data.value },
      depth: node.depth - drawnRootDepth,
      isLeaf,
      key: keyOf(node),
      labelAnchor: 'start',
      labelMaxWidth: 0,
      labelRotate: 0,
      labelX: 0,
      labelY: 0,
      x: 0,
      y: 0,
    };

    if (radial) {
      const angle = node.x;
      const radius = depthPx;
      position.angle = angle;
      position.radius = radius;
      position.x = centerX + radius * Math.cos(angle - Math.PI / 2);
      position.y = centerY + radius * Math.sin(angle - Math.PI / 2);

      if (isRoot) {
        // The pole has no radial direction to run along, so the root's label sits above it.
        position.labelAnchor = 'middle';
        position.labelX = position.x;
        position.labelY = position.y - labelGap;
        position.labelMaxWidth = Math.min(boundedWidth, boundedHeight) / 2;
      } else {
        // Past 6 o'clock the outward direction points left, so the text is flipped end-over-end
        // to stay upright and anchored from its far end — it still runs outward.
        const flip = angle >= Math.PI;
        const labelRadius = radius + labelGap;
        position.labelAnchor = flip ? 'end' : 'start';
        position.labelRotate = (angle * 180) / Math.PI - 90 + (flip ? 180 : 0);
        position.labelX = centerX + labelRadius * Math.cos(angle - Math.PI / 2);
        position.labelY = centerY + labelRadius * Math.sin(angle - Math.PI / 2);
        // A leaf's label runs outward into the reserve; an internal node's runs into the NEXT
        // RING, which is exactly where its own children sit — so it is bounded by the ring step
        // and elides before it reaches them. The cartesian branch makes the same split by
        // anchoring an internal label backward instead; a radial label has no backward to run
        // into, because the rings crowd toward the pole. Without this bound an internal label
        // overlaps its own child's — measured at 15×15px on the usage story's radial example,
        // and invisible to jsdom, which lays out no text and so finds no collision.
        position.labelMaxWidth = isLeaf
          ? Math.max(0, depthExtent + labelReserveFar - labelRadius)
          : Math.max(0, depthStep - labelGap - labelPadding);
      }
    } else {
      const breadthPx = nodeRadius + node.x;
      const alongDepth = nodeRadius + labelReserveNear + depthPx;

      if (orientation === 'left-right') {
        position.x = alongDepth;
        position.y = breadthPx;
      } else if (orientation === 'right-left') {
        position.x = boundedWidth - alongDepth;
        position.y = breadthPx;
      } else if (orientation === 'top-bottom') {
        position.x = breadthPx;
        position.y = alongDepth;
      } else {
        position.x = breadthPx;
        position.y = boundedHeight - alongDepth;
      }

      // A leaf's label runs OUT into the reserve; an internal node's runs BACK toward its
      // parent, into the depth step it already owns. Without that split every internal label
      // would lie across the subtree hanging off it.
      const outward = isLeaf ? 1 : -1;

      if (horizontal) {
        const direction = orientation === 'left-right' ? 1 : -1;
        const sign = outward * direction;
        position.labelAnchor = sign > 0 ? 'start' : 'end';
        position.labelX = position.x + sign * labelGap;
        position.labelY = position.y;
        position.labelMaxWidth = isLeaf
          ? Math.max(0, labelReserveFar - labelPadding)
          : Math.max(0, depthStep - 2 * labelGap);
      } else {
        const direction = orientation === 'top-bottom' ? 1 : -1;
        const sign = outward * direction;
        position.labelAnchor = 'middle';
        position.labelX = position.x;
        position.labelY = position.y + sign * labelGap;
        // Centred text spreads BOTH ways from the node, so the budget is the gap to the
        // nearer sibling — not the distance between them.
        const gap = neighbourGap(node);
        position.labelMaxWidth = Number.isFinite(gap) ? Math.max(0, gap - labelPadding) : 0;
      }
    }

    positions.set(position.key, position);
    nodes.push(position);
  }

  // `'elbow'` has no polar reading — a right angle in polar coordinates is an arc followed by a
  // radius, which looks like neither an elbow nor a curve — so the radial layout draws curves.
  const resolvedShape: NgeTreeLinkShape = radial && linkShape === 'elbow' ? 'curve' : linkShape;

  const links: TreeLinkPosition[] = [];
  for (const link of laidOut.links()) {
    if (link.source.depth < drawnRootDepth) {
      continue;
    }
    const source = positions.get(keyOf(link.source));
    const target = positions.get(keyOf(link.target));
    if (!source || !target) {
      continue;
    }

    let path: string;
    if (resolvedShape === 'straight') {
      path = `M${source.x},${source.y}L${target.x},${target.y}`;
    } else if (resolvedShape === 'elbow') {
      path = elbowPath(source, target, horizontal);
    } else if (radial) {
      path = radialBumpPath(source, target, centerX, centerY);
    } else {
      const generator = horizontal ? horizontalCurve : verticalCurve;
      path = generator({ source, target }) ?? `M${source.x},${source.y}L${target.x},${target.y}`;
    }

    links.push({ key: `${source.key}→${target.key}`, path, source, target });
  }

  return { links, nodes };
}
