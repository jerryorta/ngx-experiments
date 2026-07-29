import type { SimulationLinkDatum, SimulationNodeDatum } from 'd3-force';

import {
  forceCenter,
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
} from 'd3-force';

import type { NgeGraph, NgeGraphNode, NgeNetworkLayout } from '../../core/config';

/** Where one node ended up, in container-local coordinates, plus the radius it was sized to. */
export interface NetworkNodePosition {
  /** Circle radius (px) — derived from the node's resolved magnitude. */
  r: number;
  /** Centre x, already clamped inside the plot rect. */
  x: number;
  /** Centre y, already clamped inside the plot rect. */
  y: number;
}

/** Node positions keyed by `NgeGraphNode.id` — the same key the render fn joins on. */
export type NetworkPositions = Map<string, NetworkNodePosition>;

/**
 * One hive axis: where it points and how far it runs. The render fn draws these as the
 * layout's own chrome, so they are returned alongside the node positions rather than
 * recomputed from the config on the other side.
 */
export interface NetworkHiveAxis {
  /** Direction in radians, 0 = pointing right, increasing clockwise in SVG's y-down space. */
  angle: number;
  /** Index in the axis set — also the palette index for anything coloured per axis. */
  index: number;
  /** Distance (px) from the centre at which the axis starts. */
  innerRadius: number;
  /** The `group` value this axis represents, when the graph supplied one. */
  label?: string;
  /** Distance (px) from the centre at which the axis ends. */
  outerRadius: number;
}

/** What a solve produced: node positions, plus the hive axes when that layout drew any. */
export interface NetworkLayoutResult {
  /** Hive axes — empty for the force layouts, which draw no axes. */
  axes: NetworkHiveAxis[];
  /** Plot centre, so the render fn draws inter-axis curves about the same origin. */
  center: { x: number; y: number };
  /** Settled node positions, keyed by node id. */
  positions: NetworkPositions;
}

/**
 * Default seed for the simulation's initial placement. Any fixed value would do — what
 * matters is that it is fixed, so the same data always settles into the same picture.
 */
export const DEFAULT_NETWORK_SEED = 42;

/** How many iterations the simulation is stepped before the graph is drawn. */
export const DEFAULT_NETWORK_TICK_COUNT = 300;

/** Target distance (px) between two linked nodes. */
export const DEFAULT_NETWORK_LINK_DISTANCE = 60;

/** Many-body strength — negative repels, which is what spreads a graph out. */
export const DEFAULT_NETWORK_CHARGE = -180;

/** How hard a node is pulled toward its group's anchor in the clustered layout (0–1). */
export const DEFAULT_NETWORK_CLUSTER_STRENGTH = 0.35;

/** Node circle radius range (px) — scaled by each node's resolved magnitude. */
export const DEFAULT_NETWORK_MIN_NODE_RADIUS = 4;
export const DEFAULT_NETWORK_MAX_NODE_RADIUS = 16;

/** How many axes the hive layout radiates, and the range it is clamped to. */
export const DEFAULT_NETWORK_AXIS_COUNT = 3;
const MIN_AXIS_COUNT = 2;
const MAX_AXIS_COUNT = 4;

/** Where a hive axis starts, as a ratio of the outer radius. */
export const DEFAULT_NETWORK_INNER_RADIUS = 0.15;

/** Padding (px) between a node circle and its neighbour, added to the collision radius. */
const COLLIDE_PADDING = 2;

export interface NetworkLayoutOptions {
  /** How many axes the hive layout radiates (clamped to 2–4). */
  axisCount?: number;
  /** Many-body force strength (negative repels). */
  charge?: number;
  /** Pull toward a group anchor in the clustered layout (0–1). */
  clusterStrength?: number;
  /** The graph being laid out. */
  graph: NgeGraph;
  /** Plot height in px. */
  height: number;
  /** Hive axis start, as a ratio (0–1) of the outer radius. */
  innerRadius?: number;
  /** Which geometry to solve. */
  layout: NgeNetworkLayout;
  /** Target distance (px) between two linked nodes. */
  linkDistance?: number;
  /** Largest node circle radius (px). */
  maxNodeRadius?: number;
  /** Smallest node circle radius (px). */
  minNodeRadius?: number;
  /** The node set, already derived + copied by the caller. */
  nodes: NgeGraphNode[];
  /** Outer radius (px) the hive axes run out to — the caller's label reserve is already off it. */
  outerRadius?: number;
  /** Seed for the simulation's initial placement. */
  seed?: number;
  /** How many iterations to step the simulation. */
  tickCount?: number;
  /** Plot width in px. */
  width: number;
}

/**
 * Seeded PRNG (mulberry32) with `Math.random`'s interface, which is what `d3-force`'s
 * `randomSource()` hook accepts.
 *
 * `d3-force` reaches for randomness in two places — jiggling coincident nodes apart in the
 * many-body and link forces, and breaking ties in collision resolution — so left on
 * `Math.random` the same graph settles into a visibly different arrangement on every render,
 * reload and test run. Seeding is the whole reason this module exists rather than the render
 * fn driving the simulation directly. Six lines beat a `seedrandom` dependency, matching the
 * treemap layer's identical choice (`layers/treemap/voronoi-treemap-layout.ts`, ARCH-198) and
 * the wordcloud's inlined deterministic spiral (ARCH-196).
 */
function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A node as the simulation sees it — `id` for link resolution, `r` for collision. */
interface ForceNode extends SimulationNodeDatum {
  group?: string;
  id: string;
  r: number;
}

type ForceLink = SimulationLinkDatum<ForceNode>;

/** Fold a value into `[min, max]`. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Each node's undirected degree — how many links touch it.
 *
 * The universal fallback magnitude. `NgeGraphNode.value` is optional by design (a caller who
 * has only edges supplies only edges), and unlike the flow layers there is nothing to sum: a
 * network link's `value` is an edge weight, not a quantity passing THROUGH the node. Degree is
 * the graph-native answer, and it is what sizes the circles and ranks the hive axes when the
 * caller supplied no values.
 */
function degreesOf(graph: NgeGraph, ids: Set<string>): Map<string, number> {
  const degrees = new Map<string, number>();
  for (const id of ids) {
    degrees.set(id, 0);
  }

  for (const link of graph.links) {
    if (ids.has(link.source)) {
      degrees.set(link.source, (degrees.get(link.source) ?? 0) + 1);
    }
    if (ids.has(link.target)) {
      degrees.set(link.target, (degrees.get(link.target) ?? 0) + 1);
    }
  }

  return degrees;
}

/**
 * Resolve each node's magnitude: its own `value` when supplied, else its degree.
 *
 * Resolved per-NODE rather than per-graph — a caller who values some nodes and not others gets
 * the explicit number where they gave one, which is less surprising than an all-or-nothing
 * switch. Negatives clamp to 0 rather than inverting the radius scale.
 */
function magnitudesOf(nodes: NgeGraphNode[], degrees: Map<string, number>): Map<string, number> {
  const magnitudes = new Map<string, number>();
  for (const node of nodes) {
    const own = node.value;
    magnitudes.set(node.id, own === undefined ? (degrees.get(node.id) ?? 0) : Math.max(0, own));
  }
  return magnitudes;
}

/**
 * Map magnitude → circle radius over a square-root scale, so a node's AREA tracks its
 * magnitude rather than its width — the same perceptual correction the chord layer's linear
 * node circles make. A flat graph (every node equal) draws every circle at the maximum, which
 * reads better than collapsing them all to the minimum.
 */
function radiusScale(
  magnitudes: Map<string, number>,
  minRadius: number,
  maxRadius: number
): (id: string) => number {
  const max = Math.max(0, ...magnitudes.values());
  if (max <= 0) {
    return () => minRadius;
  }
  return (id: string) => {
    const magnitude = magnitudes.get(id) ?? 0;
    return minRadius + Math.sqrt(magnitude / max) * (maxRadius - minRadius);
  };
}

/**
 * Assign each node to a hive axis, and hand back the group label each axis stands for.
 *
 * Two rules, in priority order — the question ARCH-201's grooming note left open:
 *
 * 1. **`group` when the graph supplies one.** A real hive plot's axes are categorical roles
 *    ("source", "relay", "sink"), and only the caller knows them. Groups take axes in
 *    first-seen order, matching the node-derivation order convention this graph family uses
 *    everywhere else; more groups than axes wrap, so no node is ever dropped.
 * 2. **Degree tertiles otherwise.** The catalog's own description — "positioned on radially
 *    distributed linear axes … based on network structural properties" — is degree, and a
 *    graph with no groups must still plot rather than piling every node onto one axis.
 */
function assignAxes(
  nodes: NgeGraphNode[],
  degrees: Map<string, number>,
  axisCount: number
): { axisLabels: (string | undefined)[]; byNode: Map<string, number> } {
  const byNode = new Map<string, number>();
  const axisLabels: (string | undefined)[] = new Array(axisCount).fill(undefined);

  const grouped = nodes.filter(node => node.group !== undefined);

  if (grouped.length > 0) {
    const axisByGroup = new Map<string, number>();
    for (const node of nodes) {
      const group = node.group;
      if (group === undefined) {
        // An ungrouped node in an otherwise-grouped graph still needs a home; axis 0 is the
        // deterministic choice, and leaving it unplaced would silently drop it from the chart.
        byNode.set(node.id, 0);
        continue;
      }
      let axis = axisByGroup.get(group);
      if (axis === undefined) {
        axis = axisByGroup.size % axisCount;
        axisByGroup.set(group, axis);
        axisLabels[axis] ??= group;
      }
      byNode.set(node.id, axis);
    }
    return { axisLabels, byNode };
  }

  // Degree tertiles: rank by degree, then cut the ranking into `axisCount` equal slices. Cut
  // on RANK rather than on degree value so a graph whose degrees cluster tightly (or are all
  // identical) still spreads across every axis instead of collapsing onto one.
  const ranked = [...nodes].sort((a, b) => {
    const delta = (degrees.get(a.id) ?? 0) - (degrees.get(b.id) ?? 0);
    // Tie-break on id so the assignment is stable regardless of input ordering.
    return delta !== 0 ? delta : a.id.localeCompare(b.id);
  });

  ranked.forEach((node, rank) => {
    const axis = Math.min(axisCount - 1, Math.floor((rank / ranked.length) * axisCount));
    byNode.set(node.id, axis);
  });

  return { axisLabels, byNode };
}

/**
 * Place nodes on radial axes — the Hive Plot. Deterministic and closed-form: there is no
 * simulation here at all, which is exactly what the grooming note on ARCH-201 established. A
 * hive plot's whole claim is that position is *assigned* by a rule rather than *discovered* by
 * relaxation, so running it through `d3-force` would defeat the chart type.
 *
 * Nodes are seated along their axis by magnitude rank, spread evenly between the inner and
 * outer radius. Rank, not raw value, for the same reason the tertile cut uses it: a graph
 * whose values bunch would otherwise stack every node at one end of the axis.
 */
function solveHive(
  options: NetworkLayoutOptions,
  radiusFor: (id: string) => number
): NetworkLayoutResult {
  const { height, nodes, width } = options;
  const centerX = width / 2;
  const centerY = height / 2;
  const axisCount = clamp(
    Math.round(options.axisCount ?? DEFAULT_NETWORK_AXIS_COUNT),
    MIN_AXIS_COUNT,
    MAX_AXIS_COUNT
  );

  const ids = new Set(nodes.map(node => node.id));
  const degrees = degreesOf(options.graph, ids);
  const magnitudes = magnitudesOf(nodes, degrees);
  const { axisLabels, byNode } = assignAxes(nodes, degrees, axisCount);

  const maxNodeRadius = Math.max(0, ...nodes.map(node => radiusFor(node.id)));
  // Keep the outermost circle's EDGE inside the plot, not just its centre — the layers group
  // is clipped, so a node hanging half-out is half-gone rather than merely tight.
  const outerRadius = Math.max(
    0,
    (options.outerRadius ?? Math.min(width, height) / 2) - maxNodeRadius
  );
  const innerRadius =
    outerRadius * clamp(options.innerRadius ?? DEFAULT_NETWORK_INNER_RADIUS, 0, 1);

  const axes: NetworkHiveAxis[] = Array.from({ length: axisCount }, (_, index) => ({
    angle: (index / axisCount) * 2 * Math.PI - Math.PI / 2,
    index,
    innerRadius,
    label: axisLabels[index],
    outerRadius,
  }));

  // Rank within each axis, so every axis uses its full length regardless of how many nodes
  // landed on it.
  const byAxis = new Map<number, NgeGraphNode[]>();
  for (const node of nodes) {
    const axis = byNode.get(node.id) ?? 0;
    const bucket = byAxis.get(axis);
    if (bucket) {
      bucket.push(node);
    } else {
      byAxis.set(axis, [node]);
    }
  }

  const positions: NetworkPositions = new Map();

  for (const [axisIndex, axisNodes] of byAxis) {
    const axis = axes[axisIndex] ?? axes[0];
    const ranked = [...axisNodes].sort((a, b) => {
      const delta = (magnitudes.get(a.id) ?? 0) - (magnitudes.get(b.id) ?? 0);
      return delta !== 0 ? delta : a.id.localeCompare(b.id);
    });

    const span = axis.outerRadius - axis.innerRadius;
    ranked.forEach((node, rank) => {
      // A single node on an axis sits at its midpoint rather than at the inner end, which
      // would read as "lowest ranked" when there is nothing to rank it against.
      const t = ranked.length > 1 ? rank / (ranked.length - 1) : 0.5;
      const radius = axis.innerRadius + t * span;
      positions.set(node.id, {
        r: radiusFor(node.id),
        x: centerX + radius * Math.cos(axis.angle),
        y: centerY + radius * Math.sin(axis.angle),
      });
    });
  }

  return { axes, center: { x: centerX, y: centerY }, positions };
}

/**
 * Settle nodes with a `d3-force` simulation — the Network Visualisation, and with
 * `layout: 'cluster'` the Clustered Force Layout.
 *
 * Run STOPPED for a fixed number of ticks rather than animated to rest. Three things follow
 * from that, and all three are the point:
 * - the result is reproducible (same seed + same data ⇒ same picture, every render and reload);
 * - it is unit-testable, because nothing depends on `requestAnimationFrame` ever firing;
 * - the layer keeps the enter/update/exit animation contract, since the marks animate from the
 *   join rather than from the simulation's own ticking.
 *
 * Clustering is a `forceX`/`forceY` pull toward a per-group anchor seated on a circle about the
 * centre, layered ON TOP of the ordinary forces rather than replacing them — so the groups
 * separate while each cluster's interior is still shaped by the graph's own links. A bespoke
 * cluster force would buy tighter packing at the cost of a hand-rolled solver; this composes
 * two stock forces instead.
 */
function solveForce(
  options: NetworkLayoutOptions,
  radiusFor: (id: string) => number
): NetworkLayoutResult {
  const { graph, height, layout, nodes, width } = options;
  const centerX = width / 2;
  const centerY = height / 2;
  const random = mulberry32(options.seed ?? DEFAULT_NETWORK_SEED);

  // Seed the INITIAL placement from the PRNG rather than leaving it to d3-force.
  //
  // `forceSimulation` only invents a starting position for a node whose `x`/`y` is NaN, and the
  // position it invents is a deterministic phyllotaxis spiral — not random at all. Its
  // `randomSource` hook feeds only `jiggle()`, which fires when two nodes land exactly on top of
  // one another, and the spiral guarantees they never do. So a simulation left to initialise
  // itself is already reproducible, but `seed` would be inert: every seed would draw the same
  // picture, and the option would be a knob wired to nothing.
  //
  // Scattering the starting positions across the plot rect from the seeded generator makes the
  // seed load-bearing — a caller who dislikes an arrangement can ask for another one — while
  // keeping the result exactly as reproducible, since the generator is itself deterministic.
  const forceNodes: ForceNode[] = nodes.map(node => ({
    group: node.group,
    id: node.id,
    r: radiusFor(node.id),
    x: random() * width,
    y: random() * height,
  }));

  const ids = new Set(forceNodes.map(node => node.id));
  // `forceLink` throws on a link naming a node it cannot resolve, so unknown endpoints are
  // dropped here rather than allowed to take down the render — the same tolerance the sankey
  // and chord layers extend to a link naming an unknown node.
  const forceLinks: ForceLink[] = graph.links
    .filter(link => ids.has(link.source) && ids.has(link.target))
    .map(link => ({ source: link.source, target: link.target }));

  const simulation = forceSimulation<ForceNode>(forceNodes)
    .randomSource(random)
    .force(
      'link',
      forceLink<ForceNode, ForceLink>(forceLinks)
        .id(node => node.id)
        .distance(options.linkDistance ?? DEFAULT_NETWORK_LINK_DISTANCE)
    )
    .force('charge', forceManyBody<ForceNode>().strength(options.charge ?? DEFAULT_NETWORK_CHARGE))
    .force('center', forceCenter<ForceNode>(centerX, centerY))
    .force(
      'collide',
      forceCollide<ForceNode>().radius(node => node.r + COLLIDE_PADDING)
    );

  if (layout === 'cluster') {
    const anchors = clusterAnchors(forceNodes, centerX, centerY, Math.min(width, height));
    const strength = clamp(options.clusterStrength ?? DEFAULT_NETWORK_CLUSTER_STRENGTH, 0, 1);
    simulation
      .force(
        'clusterX',
        forceX<ForceNode>(node => anchors.get(node.group ?? '')?.x ?? centerX).strength(strength)
      )
      .force(
        'clusterY',
        forceY<ForceNode>(node => anchors.get(node.group ?? '')?.y ?? centerY).strength(strength)
      );
  }

  simulation.stop();
  const ticks = Math.max(1, Math.round(options.tickCount ?? DEFAULT_NETWORK_TICK_COUNT));
  for (let i = 0; i < ticks; i++) {
    simulation.tick();
  }

  const positions: NetworkPositions = new Map();
  for (const node of forceNodes) {
    // ⚠️ `d3-force` has NO concept of an extent — `forceCenter` pulls the centre of mass to the
    // middle but nothing stops an individual node from settling outside the plot, and a
    // disconnected or strongly-repelled node routinely does. The layers group is CLIPPED, so
    // such a node does not overflow the chart, it disappears from it — and jsdom does not clip,
    // so a spec would never see the loss. Clamping the node's EDGE (not its centre) into the
    // rect is what guarantees every mark is visible. See `libs/shared/charts/AGENTS.md`.
    positions.set(node.id, {
      r: node.r,
      x: clamp(node.x ?? centerX, node.r, Math.max(node.r, width - node.r)),
      y: clamp(node.y ?? centerY, node.r, Math.max(node.r, height - node.r)),
    });
  }

  return { axes: [], center: { x: centerX, y: centerY }, positions };
}

/**
 * Seat each group's anchor on a circle about the plot centre, in first-seen group order.
 *
 * The radius is a third of the smaller dimension: far enough out that the clusters read as
 * separate, close enough in that the collision + centering forces still pull the whole graph
 * inside the plot rect before the final clamp has to do any work.
 */
function clusterAnchors(
  nodes: ForceNode[],
  centerX: number,
  centerY: number,
  minDimension: number
): Map<string, { x: number; y: number }> {
  const groups: string[] = [];
  for (const node of nodes) {
    const group = node.group ?? '';
    if (!groups.includes(group)) {
      groups.push(group);
    }
  }

  const radius = minDimension / 3;
  const anchors = new Map<string, { x: number; y: number }>();
  groups.forEach((group, index) => {
    // A single group has nothing to separate from, so it anchors at the centre — otherwise it
    // would be pushed off to one side of an otherwise empty plot.
    if (groups.length === 1) {
      anchors.set(group, { x: centerX, y: centerY });
      return;
    }
    const angle = (index / groups.length) * 2 * Math.PI - Math.PI / 2;
    anchors.set(group, {
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    });
  });

  return anchors;
}

/**
 * Lay a graph out into the plot rect, by whichever geometry `layout` selects.
 *
 * Returns an empty result for a degenerate plot or an empty node set. The zero-size guard is
 * not defensive padding: a chart renders once before its container is measured, and laying out
 * into a zero-size extent yields NaN geometry rather than an error — which surfaces later as
 * marks that silently fail to draw.
 */
export function computeNetworkLayout(options: NetworkLayoutOptions): NetworkLayoutResult {
  const { height, nodes, width } = options;
  const empty: NetworkLayoutResult = {
    axes: [],
    center: { x: width / 2, y: height / 2 },
    positions: new Map(),
  };

  if (width <= 0 || height <= 0 || nodes.length === 0) {
    return empty;
  }

  const ids = new Set(nodes.map(node => node.id));
  const degrees = degreesOf(options.graph, ids);
  const magnitudes = magnitudesOf(nodes, degrees);
  const radiusFor = radiusScale(
    magnitudes,
    options.minNodeRadius ?? DEFAULT_NETWORK_MIN_NODE_RADIUS,
    options.maxNodeRadius ?? DEFAULT_NETWORK_MAX_NODE_RADIUS
  );

  return options.layout === 'hive' ? solveHive(options, radiusFor) : solveForce(options, radiusFor);
}

/** What a cached layout was computed from — a miss on any input means re-solve. */
function cacheKeyFor(options: NetworkLayoutOptions): string {
  const shape = options.nodes
    .map(node => `${node.id}:${node.value ?? ''}:${node.group ?? ''}`)
    .join('|');
  const links = options.graph.links
    .map(link => `${link.source}>${link.target}:${link.value}`)
    .join('|');

  return [
    options.layout,
    options.seed ?? DEFAULT_NETWORK_SEED,
    // Sub-pixel container jitter must not re-run an iterative solve.
    Math.round(options.width),
    Math.round(options.height),
    Math.round(options.outerRadius ?? -1),
    options.tickCount ?? DEFAULT_NETWORK_TICK_COUNT,
    options.linkDistance ?? DEFAULT_NETWORK_LINK_DISTANCE,
    options.charge ?? DEFAULT_NETWORK_CHARGE,
    options.clusterStrength ?? DEFAULT_NETWORK_CLUSTER_STRENGTH,
    options.axisCount ?? DEFAULT_NETWORK_AXIS_COUNT,
    options.innerRadius ?? DEFAULT_NETWORK_INNER_RADIUS,
    options.minNodeRadius ?? DEFAULT_NETWORK_MIN_NODE_RADIUS,
    options.maxNodeRadius ?? DEFAULT_NETWORK_MAX_NODE_RADIUS,
    shape,
    links,
  ].join('~');
}

const LAYOUT_CACHE = new WeakMap<Element, { key: string; result: NetworkLayoutResult }>();

/**
 * {@link computeNetworkLayout}, memoized per chart instance.
 *
 * A layer render fn is re-invoked on EVERY state change — a theme switch, a tooltip hover that
 * re-runs the chart, a config toggle — while the arrangement only depends on the graph, the
 * plot size and the tuning. Stepping a 300-tick simulation on every hover is the one
 * performance mistake this layout invites, and it would also make the graph appear to twitch
 * under the pointer, so the result is cached against the chart's own container element and
 * reused until one of those inputs actually changes. The cache is a `WeakMap`, so a destroyed
 * chart's entry goes with its DOM (ARCH-198 established this shape for the treemap).
 */
export function networkLayoutFor(
  host: Element,
  options: NetworkLayoutOptions
): NetworkLayoutResult {
  const key = cacheKeyFor(options);
  const cached = LAYOUT_CACHE.get(host);
  if (cached?.key === key) {
    return cached.result;
  }

  const result = computeNetworkLayout(options);
  LAYOUT_CACHE.set(host, { key, result });
  return result;
}
