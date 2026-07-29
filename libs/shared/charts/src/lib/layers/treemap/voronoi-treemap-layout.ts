import type { HierarchyNode } from 'd3-hierarchy';

// @ts-expect-error -- `d3-voronoi-treemap` ships no type declarations and no `@types/`
// package exists for it, so this import is the one place the compiler cannot check.
// It is typed immediately below, and nothing outside this module names the package.
//
// Deliberately NOT solved with an ambient `declare module` in a `.d.ts`: such a file only
// reaches a compiler that globs it, and every tsconfig here globs differently — the
// library's own passes while Storybook (which includes only `*.stories.ts` from libs) and
// any consuming app both fail with TS7016. Suppressing on this single line travels with
// the import graph, so it works everywhere. If `@types/d3-voronoi-treemap` ever ships,
// this directive turns into an "unused" error — which is the signal to delete the shim.
import { voronoiTreemap as untypedVoronoiTreemap } from 'd3-voronoi-treemap';

/**
 * A cell boundary: `[x, y]` vertices, counter-clockwise with the origin at the top-left,
 * and OPEN — the first vertex is not repeated to close the ring, so a triangle is three
 * points. Callers append their own `Z` when building a path.
 */
export type VoronoiTreemapPolygon = [number, number][];

/**
 * The plugin's fluent layout. Called with a `d3-hierarchy` root, it mutates the tree in
 * place, assigning a `polygon` to the root and every descendant. The root must already
 * carry summed values (`root.sum(…)`) — cells are weighted by `node.value`.
 *
 * Only the surface this module calls is declared; a hand-written shim is a maintenance
 * liability, so it stays as small as the one caller needs.
 */
interface VoronoiTreemapLayout<Datum> {
  (root: HierarchyNode<Datum>): void;
  clip(polygon: VoronoiTreemapPolygon): this;
  convergenceRatio(ratio: number): this;
  maxIterationCount(count: number): this;
  /**
   * Replaces the `Math.random` used to seed initial cell sites. Supplying a seeded
   * generator is what makes a Voronoi treemap reproducible across renders and reloads.
   */
  prng(prng: () => number): this;
}

const voronoiTreemap = untypedVoronoiTreemap as <Datum>() => VoronoiTreemapLayout<Datum>;

/** A hierarchy node after the layout has run — `polygon` is assigned in place by the plugin. */
type VoronoiHierarchyNode<Datum> = HierarchyNode<Datum> & { polygon?: VoronoiTreemapPolygon };

/** Cell boundaries keyed by the caller's stable node id. */
export type VoronoiTreemapCells = Map<string, VoronoiTreemapPolygon>;

/**
 * Default seed for the layout's initial cell sites. Any fixed value would do — what matters
 * is that it is fixed, so the same data always draws the same arrangement.
 */
export const DEFAULT_VORONOI_SEED = 1;

/** Stop the solve at 1% total cell-area error — the plugin's own default. */
export const DEFAULT_VORONOI_CONVERGENCE_RATIO = 0.01;

/** Hard iteration ceiling, so pathological data cannot hang a render — the plugin's default. */
export const DEFAULT_VORONOI_MAX_ITERATION_COUNT = 50;

export interface VoronoiTreemapLayoutOptions<Datum> {
  /** Stop once total cell-area error falls to this fraction of the plot area. */
  convergenceRatio?: number;
  /** Plot height in px. */
  height: number;
  /** Hard iteration ceiling. */
  maxIterationCount?: number;
  /** Stable per-node key — the same one the render fn joins on. */
  nodeId: (node: HierarchyNode<Datum>) => string;
  /** Hierarchy root with values already summed (`root.sum(…)`). */
  root: HierarchyNode<Datum>;
  /** Seed for the initial cell sites. */
  seed?: number;
  /** Plot width in px. */
  width: number;
}

/**
 * Seeded PRNG (mulberry32) with `Math.random`'s interface, which is what the plugin's
 * `prng()` hook accepts.
 *
 * A Voronoi treemap starts from randomly-placed sites and relaxes them until each cell's
 * area matches its datum's weight. Left on `Math.random` the same data lands in a visibly
 * different arrangement on every render, reload and test run — so the layout is unusable
 * for snapshots and disorienting in a live chart. Seeding is the whole reason this module
 * exists rather than the render fn calling the plugin directly. Chosen over the
 * `seedrandom` package the plugin's README suggests because six lines beat a dependency,
 * matching the deterministic spiral the wordcloud layer inlines (ARCH-196).
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

/**
 * Tessellate the plot rect into one convex cell per hierarchy node, each cell's AREA
 * proportional to that node's summed value.
 *
 * Returns polygons keyed by `nodeId` rather than mutating the caller's hierarchy, because
 * the render fn rebuilds its hierarchy from scratch on every call — a `polygon` written
 * onto a node object would not survive to the next render, but a keyed map does, which is
 * what makes {@link voronoiTreemapCellsFor}'s cache possible.
 *
 * Returns an empty map for a degenerate plot or an empty tree. The zero-size guard is not
 * defensive padding: a chart renders once before its container is measured, and the
 * underlying `d3-voronoi-map` throws on a zero-area clipping polygon.
 */
export function computeVoronoiTreemapCells<Datum>(
  options: VoronoiTreemapLayoutOptions<Datum>
): VoronoiTreemapCells {
  const { height, nodeId, root, width } = options;
  const cells: VoronoiTreemapCells = new Map();

  if (width <= 0 || height <= 0 || !root.value) {
    return cells;
  }

  const layout = voronoiTreemap<Datum>()
    .clip([
      [0, 0],
      [0, height],
      [width, height],
      [width, 0],
    ])
    .convergenceRatio(options.convergenceRatio ?? DEFAULT_VORONOI_CONVERGENCE_RATIO)
    .maxIterationCount(options.maxIterationCount ?? DEFAULT_VORONOI_MAX_ITERATION_COUNT)
    .prng(mulberry32(options.seed ?? DEFAULT_VORONOI_SEED));

  layout(root);

  for (const node of root.descendants()) {
    const { polygon } = node as VoronoiHierarchyNode<Datum>;
    if (polygon && polygon.length > 0) {
      // Copy the vertices: the plugin hands back its own working array, decorated with a
      // `site` back-reference into the simulation. Storing that in a cache would pin the
      // whole simulation graph in memory for as long as the chart lives.
      cells.set(
        nodeId(node),
        polygon.map(([x, y]) => [x, y] as [number, number])
      );
    }
  }

  return cells;
}

/** What a cached tessellation was computed from — a miss on any input means recompute. */
function cacheKeyFor<Datum>(options: VoronoiTreemapLayoutOptions<Datum>): string {
  const { height, nodeId, root, width } = options;
  const shape = root
    .descendants()
    .map(node => `${nodeId(node)}:${node.value ?? 0}`)
    .join('|');

  return [
    options.seed ?? DEFAULT_VORONOI_SEED,
    // Sub-pixel container jitter must not re-run an iterative solve.
    Math.round(width),
    Math.round(height),
    options.convergenceRatio ?? DEFAULT_VORONOI_CONVERGENCE_RATIO,
    options.maxIterationCount ?? DEFAULT_VORONOI_MAX_ITERATION_COUNT,
    shape,
  ].join('~');
}

const CELL_CACHE = new WeakMap<Element, { cells: VoronoiTreemapCells; key: string }>();

/**
 * {@link computeVoronoiTreemapCells}, memoized per chart instance.
 *
 * A layer render fn is re-invoked on EVERY state change — a theme switch, a tooltip hover
 * that re-runs the chart, a config toggle — while the tessellation only depends on the
 * data, the plot size and the tuning. Recomputing an iterative solve on hover is the one
 * performance mistake this layout invites, so the result is cached against the chart's own
 * container element and reused until one of those inputs actually changes. The cache is a
 * `WeakMap`, so a destroyed chart's entry goes with its DOM.
 */
export function voronoiTreemapCellsFor<Datum>(
  host: Element,
  options: VoronoiTreemapLayoutOptions<Datum>
): VoronoiTreemapCells {
  const key = cacheKeyFor(options);
  const cached = CELL_CACHE.get(host);
  if (cached?.key === key) {
    return cached.cells;
  }

  const cells = computeVoronoiTreemapCells(options);
  CELL_CACHE.set(host, { cells, key });
  return cells;
}
