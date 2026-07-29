import type { HierarchyNode } from 'd3-hierarchy';

import { hierarchy } from 'd3-hierarchy';

import type { NgeHierarchyDatum } from '../../core/config';
import type { VoronoiTreemapCells } from './voronoi-treemap-layout';

import { computeVoronoiTreemapCells, voronoiTreemapCellsFor } from './voronoi-treemap-layout';

const WIDTH = 400;
const HEIGHT = 300;

/** Two branches of two leaves plus a standalone leaf — total 100. */
const DATA: NgeHierarchyDatum[] = [
  {
    children: [
      { label: 'A1', value: 30 },
      { label: 'A2', value: 20 },
    ],
    label: 'A',
  },
  {
    children: [
      { label: 'B1', value: 15 },
      { label: 'B2', value: 10 },
    ],
    label: 'B',
  },
  { label: 'C', value: 25 },
];

function nodeId(node: HierarchyNode<NgeHierarchyDatum>): string {
  return node
    .ancestors()
    .map(a => a.data.label)
    .reverse()
    .join('/');
}

function rootOf(data: NgeHierarchyDatum[]): HierarchyNode<NgeHierarchyDatum> {
  return hierarchy<NgeHierarchyDatum>({ children: data, label: '' } as NgeHierarchyDatum)
    .sum(d => Math.max(0, d.value ?? 0))
    .sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
}

function cellsFor(
  data: NgeHierarchyDatum[],
  overrides: { height?: number; seed?: number; width?: number } = {}
): VoronoiTreemapCells {
  return computeVoronoiTreemapCells({
    height: overrides.height ?? HEIGHT,
    nodeId,
    root: rootOf(data),
    seed: overrides.seed,
    width: overrides.width ?? WIDTH,
  });
}

/** Shoelace area of a simple polygon. */
function areaOf(polygon: [number, number][]): number {
  const twice = polygon.reduce((sum, [x1, y1], i) => {
    const [x2, y2] = polygon[(i + 1) % polygon.length];
    return sum + (x1 * y2 - x2 * y1);
  }, 0);
  return Math.abs(twice / 2);
}

describe('computeVoronoiTreemapCells', () => {
  it('assigns a polygon to every node in the tree', () => {
    const cells = cellsFor(DATA);

    // The synthetic root plus 3 branches plus 4 leaves.
    expect(cells.size).toBe(8);
    expect([...cells.keys()].sort()).toEqual([
      '',
      '/A',
      '/A/A1',
      '/A/A2',
      '/B',
      '/B/B1',
      '/B/B2',
      '/C',
    ]);
  });

  it('sizes each cell area in proportion to its value', () => {
    const cells = cellsFor(DATA);
    const plotArea = WIDTH * HEIGHT;

    // The tessellation is an approximation that stops at `convergenceRatio` (1% of the plot
    // area by default), so this asserts the contract — area tracks value — not exact numbers.
    const expectations: [string, number][] = [
      ['/A', 50],
      ['/B', 25],
      ['/C', 25],
      ['/A/A1', 30],
      ['/B/B2', 10],
    ];

    for (const [key, value] of expectations) {
      const expected = (value / 100) * plotArea;
      expect(areaOf(cells.get(key)!)).toBeCloseTo(expected, -3);
    }
  });

  it('fills the plot: the top-level cells sum to the whole area', () => {
    const cells = cellsFor(DATA);
    const covered = ['/A', '/B', '/C'].reduce((sum, key) => sum + areaOf(cells.get(key)!), 0);

    expect(covered).toBeCloseTo(WIDTH * HEIGHT, -3);
  });

  it('keeps every vertex inside the plot rect', () => {
    for (const polygon of cellsFor(DATA).values()) {
      for (const [x, y] of polygon) {
        expect(x).toBeGreaterThanOrEqual(-0.01);
        expect(x).toBeLessThanOrEqual(WIDTH + 0.01);
        expect(y).toBeGreaterThanOrEqual(-0.01);
        expect(y).toBeLessThanOrEqual(HEIGHT + 0.01);
      }
    }
  });

  it('draws the same arrangement twice for the same seed', () => {
    expect([...cellsFor(DATA, { seed: 3 })]).toEqual([...cellsFor(DATA, { seed: 3 })]);
  });

  it('draws a different arrangement for a different seed', () => {
    // The whole reason `seed` is exposed: the layout relaxes randomly-placed sites, so the
    // seed is the only thing standing between a caller and a chart that reshuffles on reload.
    expect([...cellsFor(DATA, { seed: 1 })]).not.toEqual([...cellsFor(DATA, { seed: 2 })]);
  });

  it('returns plain vertex pairs, not the plugin working arrays', () => {
    for (const polygon of cellsFor(DATA).values()) {
      for (const vertex of polygon) {
        expect(vertex).toHaveLength(2);
        expect(typeof vertex[0]).toBe('number');
      }
      // The plugin decorates its own polygons with a `site` back-reference into the
      // simulation graph; caching one would pin that whole graph for the chart's lifetime.
      expect(polygon).not.toHaveProperty('site');
    }
  });

  it('returns nothing for a zero-size plot instead of running the solve', () => {
    // Not defensive padding: a chart renders once before its container is measured, and the
    // underlying d3-voronoi-map spins forever on a zero-area clipping polygon rather than
    // throwing — so without this guard a first paint hangs the tab.
    expect(cellsFor(DATA, { width: 0 }).size).toBe(0);
    expect(cellsFor(DATA, { height: 0 }).size).toBe(0);
    expect(cellsFor(DATA, { height: -10, width: -10 }).size).toBe(0);
  });

  it('returns nothing when every value is zero', () => {
    expect(cellsFor([{ label: 'a', value: 0 }, { label: 'b' }]).size).toBe(0);
  });

  it('handles a lone child, a lone nested chain, and a zero-value sibling', () => {
    expect(cellsFor([{ label: 'only', value: 5 }]).size).toBe(2);
    expect(cellsFor([{ children: [{ label: 'A1', value: 7 }], label: 'A' }]).size).toBe(3);
    expect(
      cellsFor([
        { label: 'A', value: 30 },
        { label: 'B', value: 0 },
      ]).size
    ).toBe(3);
  });
});

describe('voronoiTreemapCellsFor', () => {
  let host: SVGGElement;

  beforeEach(() => {
    host = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  });

  const cached = (overrides: { height?: number; seed?: number; width?: number } = {}) =>
    voronoiTreemapCellsFor(host, {
      height: overrides.height ?? HEIGHT,
      nodeId,
      root: rootOf(DATA),
      seed: overrides.seed,
      width: overrides.width ?? WIDTH,
    });

  it('reuses the identical result for unchanged inputs', () => {
    // Identity, not equality: a layer re-renders on every theme change and tooltip hover, and
    // this solve is iterative. Recomputing it on hover is the mistake the cache exists to stop.
    expect(cached()).toBe(cached());
  });

  it('ignores sub-pixel container jitter', () => {
    expect(cached({ width: WIDTH + 0.4 })).toBe(cached());
  });

  it('recomputes when the size, the seed, or the data changes', () => {
    const first = cached();

    expect(cached({ width: WIDTH + 40 })).not.toBe(first);
    expect(cached({ seed: 9 })).not.toBe(cached({ seed: 8 }));

    const beforeDataChange = cached();
    const changed = voronoiTreemapCellsFor(host, {
      height: HEIGHT,
      nodeId,
      root: rootOf([...DATA, { label: 'D', value: 40 }]),
      width: WIDTH,
    });
    expect(changed).not.toBe(beforeDataChange);
    expect(changed.has('/D')).toBe(true);
  });

  it('caches per chart, so two charts do not share an arrangement slot', () => {
    const other = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const mine = cached();
    const theirs = voronoiTreemapCellsFor(other, {
      height: HEIGHT,
      nodeId,
      root: rootOf(DATA),
      width: WIDTH,
    });

    expect(theirs).not.toBe(mine);
    expect([...theirs]).toEqual([...mine]);
  });
});
