import type { NgeGraph } from '../../core/config';
import type { NetworkLayoutOptions } from './network-force-layout';

import { computeNetworkLayout, networkLayoutFor } from './network-force-layout';

const WIDTH = 400;
const HEIGHT = 300;

/** Three nodes, three links — a triangle, so every node has the same degree. */
const TRIANGLE: NgeGraph = {
  links: [
    { source: 'A', target: 'B', value: 3 },
    { source: 'B', target: 'C', value: 2 },
    { source: 'A', target: 'C', value: 1 },
  ],
};

/** A star: one hub of degree 3, three leaves of degree 1 — distinct degrees to rank by. */
const STAR: NgeGraph = {
  links: [
    { source: 'hub', target: 'a', value: 1 },
    { source: 'hub', target: 'b', value: 1 },
    { source: 'hub', target: 'c', value: 1 },
  ],
};

/** The same star, with every node assigned an explicit role — the hive's primary axis rule. */
const GROUPED: NgeGraph = {
  links: STAR.links,
  nodes: [
    { group: 'core', id: 'hub' },
    { group: 'leaf', id: 'a' },
    { group: 'leaf', id: 'b' },
    { group: 'edge', id: 'c' },
  ],
};

function optionsFor(graph: NgeGraph, overrides: Partial<NetworkLayoutOptions> = {}) {
  const nodes = graph.nodes ?? nodesFromLinks(graph);
  return {
    graph,
    height: HEIGHT,
    layout: 'force' as const,
    nodes: nodes.map(node => ({ ...node })),
    width: WIDTH,
    ...overrides,
  };
}

/** Mirrors `deriveGraphNodes`' derived branch — first-seen order, source before target. */
function nodesFromLinks(graph: NgeGraph) {
  const seen = new Set<string>();
  const nodes: { id: string }[] = [];
  for (const link of graph.links) {
    for (const id of [link.source, link.target]) {
      if (!seen.has(id)) {
        seen.add(id);
        nodes.push({ id });
      }
    }
  }
  return nodes;
}

describe('computeNetworkLayout', () => {
  describe('degenerate input', () => {
    it('returns no positions before the container has been measured', () => {
      const result = computeNetworkLayout(optionsFor(TRIANGLE, { height: 0, width: 0 }));

      expect(result.positions.size).toBe(0);
      expect(result.axes).toEqual([]);
    });

    it('returns no positions for an empty node set', () => {
      const result = computeNetworkLayout(
        optionsFor({ links: [] }, { graph: { links: [] }, nodes: [] })
      );

      expect(result.positions.size).toBe(0);
    });

    it('places an isolated node — a graph with nodes and no links is legitimate here', () => {
      const graph: NgeGraph = { links: [], nodes: [{ id: 'alone' }] };
      const result = computeNetworkLayout(optionsFor(graph));

      expect(result.positions.size).toBe(1);
      expect(result.positions.get('alone')).toBeDefined();
    });

    it('drops a link naming an unknown endpoint instead of throwing', () => {
      // `forceLink` throws outright on an unresolvable endpoint, so this guards a crash, not
      // just a cosmetic omission.
      const graph: NgeGraph = {
        links: [
          { source: 'A', target: 'B', value: 1 },
          { source: 'A', target: 'GHOST', value: 1 },
        ],
        nodes: [{ id: 'A' }, { id: 'B' }],
      };

      expect(() => computeNetworkLayout(optionsFor(graph))).not.toThrow();
      expect(computeNetworkLayout(optionsFor(graph)).positions.size).toBe(2);
    });

    it('never produces a NaN coordinate', () => {
      const result = computeNetworkLayout(optionsFor(TRIANGLE));

      for (const position of result.positions.values()) {
        expect(Number.isFinite(position.x)).toBe(true);
        expect(Number.isFinite(position.y)).toBe(true);
        expect(Number.isFinite(position.r)).toBe(true);
      }
    });
  });

  describe('determinism', () => {
    it.each(['force', 'cluster', 'hive'] as const)(
      'settles %s into identical positions across two independent solves',
      layout => {
        const first = computeNetworkLayout(optionsFor(GROUPED, { layout }));
        const second = computeNetworkLayout(optionsFor(GROUPED, { layout }));

        expect([...second.positions.entries()]).toEqual([...first.positions.entries()]);
      }
    );

    it('re-rolls the arrangement when the seed changes, without changing the data', () => {
      // The complement of the test above: determinism must come from the SEED, not from the
      // simulation having quietly become degenerate (which would also make two runs match).
      const a = computeNetworkLayout(optionsFor(STAR, { seed: 1 }));
      const b = computeNetworkLayout(optionsFor(STAR, { seed: 999 }));

      expect([...b.positions.entries()]).not.toEqual([...a.positions.entries()]);
    });

    it('ignores the seed in the hive layout, which runs no simulation at all', () => {
      const a = computeNetworkLayout(optionsFor(GROUPED, { layout: 'hive', seed: 1 }));
      const b = computeNetworkLayout(optionsFor(GROUPED, { layout: 'hive', seed: 999 }));

      expect([...b.positions.entries()]).toEqual([...a.positions.entries()]);
    });
  });

  describe('stays inside the plot rect', () => {
    it.each(['force', 'cluster', 'hive'] as const)(
      'keeps every %s node circle fully inside the bounded rect',
      layout => {
        // ⚠️ The layers group is CLIPPED and jsdom does not clip, so an escaped node vanishes in
        // the browser while every other assertion here still passes. `d3-force` has no extent of
        // its own — this is the guard that the clamp exists at all.
        const result = computeNetworkLayout(optionsFor(GROUPED, { layout }));

        for (const { r, x, y } of result.positions.values()) {
          expect(x - r).toBeGreaterThanOrEqual(0);
          expect(x + r).toBeLessThanOrEqual(WIDTH);
          expect(y - r).toBeGreaterThanOrEqual(0);
          expect(y + r).toBeLessThanOrEqual(HEIGHT);
        }
      }
    );

    it('holds even with a charge strong enough to blow the graph apart', () => {
      const result = computeNetworkLayout(
        optionsFor(STAR, { charge: -100000, linkDistance: 5000 })
      );

      for (const { r, x, y } of result.positions.values()) {
        expect(x - r).toBeGreaterThanOrEqual(0);
        expect(x + r).toBeLessThanOrEqual(WIDTH);
        expect(y - r).toBeGreaterThanOrEqual(0);
        expect(y + r).toBeLessThanOrEqual(HEIGHT);
      }
    });
  });

  describe('node sizing', () => {
    it('sizes a node by its own value when the caller supplied one', () => {
      const graph: NgeGraph = {
        links: [{ source: 'big', target: 'small', value: 1 }],
        nodes: [
          { id: 'big', value: 100 },
          { id: 'small', value: 1 },
        ],
      };
      const result = computeNetworkLayout(optionsFor(graph));

      expect(result.positions.get('big')!.r).toBeGreaterThan(result.positions.get('small')!.r);
    });

    it('falls back to degree when no value is supplied', () => {
      const result = computeNetworkLayout(optionsFor(STAR));

      // The hub touches three links; each leaf touches one.
      expect(result.positions.get('hub')!.r).toBeGreaterThan(result.positions.get('a')!.r);
    });

    it('honours the configured radius range', () => {
      const result = computeNetworkLayout(
        optionsFor(STAR, { maxNodeRadius: 20, minNodeRadius: 10 })
      );

      for (const { r } of result.positions.values()) {
        expect(r).toBeGreaterThanOrEqual(10);
        expect(r).toBeLessThanOrEqual(20);
      }
    });

    it('draws every circle at the maximum when the graph is flat', () => {
      // A triangle gives every node degree 2. Collapsing an undifferentiated graph to the
      // MINIMUM radius would read as "everything is unimportant" rather than "nothing here
      // distinguishes these nodes".
      const result = computeNetworkLayout(optionsFor(TRIANGLE, { maxNodeRadius: 16 }));

      for (const { r } of result.positions.values()) {
        expect(r).toBeCloseTo(16);
      }
    });

    it('clamps a negative value to zero rather than inverting the radius scale', () => {
      const graph: NgeGraph = {
        links: [{ source: 'bad', target: 'ok', value: 1 }],
        nodes: [
          { id: 'bad', value: -50 },
          { id: 'ok', value: 10 },
        ],
      };
      const result = computeNetworkLayout(optionsFor(graph, { minNodeRadius: 4 }));

      expect(result.positions.get('bad')!.r).toBeCloseTo(4);
    });
  });

  describe("hive layout — the grooming note's axis rule", () => {
    it('radiates the configured number of axes from the plot centre', () => {
      const result = computeNetworkLayout(
        optionsFor(GROUPED, { axisCount: 3, layout: 'hive', outerRadius: 100 })
      );

      expect(result.axes).toHaveLength(3);
      expect(result.center).toEqual({ x: WIDTH / 2, y: HEIGHT / 2 });
    });

    it('clamps the axis count into 2–4', () => {
      const one = computeNetworkLayout(optionsFor(GROUPED, { axisCount: 1, layout: 'hive' }));
      const many = computeNetworkLayout(optionsFor(GROUPED, { axisCount: 99, layout: 'hive' }));

      expect(one.axes).toHaveLength(2);
      expect(many.axes).toHaveLength(4);
    });

    it('gives each group its own axis, in first-seen order', () => {
      const result = computeNetworkLayout(
        optionsFor(GROUPED, { axisCount: 3, layout: 'hive', outerRadius: 100 })
      );

      expect(result.axes.map(axis => axis.label)).toEqual(['core', 'leaf', 'edge']);
    });

    it('seats every node of one group on that group’s axis', () => {
      const result = computeNetworkLayout(
        optionsFor(GROUPED, { axisCount: 3, layout: 'hive', outerRadius: 100 })
      );
      const { center } = result;

      // Both 'leaf' nodes must lie on the same ray from the centre — same angle, whatever
      // radius their rank put them at.
      const angleOf = (id: string): number => {
        const { x, y } = result.positions.get(id)!;
        return Math.atan2(y - center.y, x - center.x);
      };

      expect(angleOf('a')).toBeCloseTo(angleOf('b'), 5);
      expect(angleOf('a')).not.toBeCloseTo(angleOf('hub'), 5);
    });

    it('falls back to degree tertiles when the graph names no groups', () => {
      // The star has one degree-3 hub and three degree-1 leaves. Without a fallback every node
      // would pile onto one axis and the plot would degenerate into a single line.
      const result = computeNetworkLayout(
        optionsFor(STAR, { axisCount: 3, layout: 'hive', outerRadius: 100 })
      );
      const { center } = result;

      const angles = new Set(
        [...result.positions.values()].map(({ x, y }) =>
          Math.atan2(y - center.y, x - center.x).toFixed(5)
        )
      );

      expect(angles.size).toBeGreaterThan(1);
      expect(result.axes.every(axis => axis.label === undefined)).toBe(true);
    });

    it('leaves the centre clear by starting every axis at innerRadius', () => {
      const result = computeNetworkLayout(
        optionsFor(GROUPED, { innerRadius: 0.4, layout: 'hive', outerRadius: 100 })
      );

      for (const axis of result.axes) {
        expect(axis.innerRadius).toBeCloseTo(axis.outerRadius * 0.4);
      }
    });

    it('seats a lone node on an axis at its midpoint, not at the inner end', () => {
      const graph: NgeGraph = {
        links: [{ source: 'only', target: 'other', value: 1 }],
        nodes: [
          { group: 'x', id: 'only' },
          { group: 'y', id: 'other' },
        ],
      };
      const result = computeNetworkLayout(
        optionsFor(graph, { innerRadius: 0, layout: 'hive', outerRadius: 100 })
      );
      const { center } = result;
      const { x, y } = result.positions.get('only')!;
      const radius = Math.hypot(x - center.x, y - center.y);

      expect(radius).toBeCloseTo(result.axes[0].outerRadius / 2, 5);
    });
  });

  describe('cluster layout', () => {
    it('pulls same-group nodes closer together than cross-group nodes', () => {
      const graph: NgeGraph = {
        // Deliberately NO links between the two groups' members beyond one bridge, so any
        // gathering that shows up is the cluster force's doing rather than the link force's.
        links: [
          { source: 'a1', target: 'a2', value: 1 },
          { source: 'b1', target: 'b2', value: 1 },
          { source: 'a1', target: 'b1', value: 1 },
        ],
        nodes: [
          { group: 'A', id: 'a1' },
          { group: 'A', id: 'a2' },
          { group: 'B', id: 'b1' },
          { group: 'B', id: 'b2' },
        ],
      };

      const result = computeNetworkLayout(optionsFor(graph, { layout: 'cluster' }));
      const distance = (p: string, q: string): number => {
        const a = result.positions.get(p)!;
        const b = result.positions.get(q)!;
        return Math.hypot(a.x - b.x, a.y - b.y);
      };

      expect(distance('a1', 'a2')).toBeLessThan(distance('a2', 'b2'));
    });

    it('anchors a single group at the centre rather than pushing it to one side', () => {
      const graph: NgeGraph = {
        links: [{ source: 'a', target: 'b', value: 1 }],
        nodes: [
          { group: 'only', id: 'a' },
          { group: 'only', id: 'b' },
        ],
      };
      const result = computeNetworkLayout(optionsFor(graph, { layout: 'cluster' }));
      const midX = ([...result.positions.values()].reduce((sum, p) => sum + p.x, 0) /
        result.positions.size) as number;

      expect(midX).toBeCloseTo(WIDTH / 2, 0);
    });
  });
});

describe('networkLayoutFor', () => {
  let host: Element;

  beforeEach(() => {
    host = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  });

  it('returns the SAME result object for unchanged inputs', () => {
    // Identity, not equality: a render fn re-runs on every hover, and re-stepping a 300-tick
    // simulation there would both cost and visibly twitch the graph under the pointer.
    const first = networkLayoutFor(host, optionsFor(TRIANGLE));
    const second = networkLayoutFor(host, optionsFor(TRIANGLE));

    expect(second).toBe(first);
  });

  it.each([
    ['the plot size', { width: WIDTH + 40 }],
    ['the layout', { layout: 'hive' as const }],
    ['the seed', { seed: 7 }],
    ['the tick count', { tickCount: 50 }],
    ['the link distance', { linkDistance: 120 }],
  ])('re-solves when %s changes', (_label, overrides) => {
    const first = networkLayoutFor(host, optionsFor(TRIANGLE));
    const second = networkLayoutFor(host, optionsFor(TRIANGLE, overrides));

    expect(second).not.toBe(first);
  });

  it('re-solves when the graph changes', () => {
    const first = networkLayoutFor(host, optionsFor(TRIANGLE));
    const second = networkLayoutFor(host, optionsFor(STAR));

    expect(second).not.toBe(first);
  });

  it('ignores sub-pixel container jitter', () => {
    // A resize observer reports fractional widths; re-running an iterative solve for a third
    // of a pixel is pure waste.
    const first = networkLayoutFor(host, optionsFor(TRIANGLE));
    const second = networkLayoutFor(host, optionsFor(TRIANGLE, { width: WIDTH + 0.3 }));

    expect(second).toBe(first);
  });

  it('caches per chart instance, not globally', () => {
    const other = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    const first = networkLayoutFor(host, optionsFor(TRIANGLE));
    const second = networkLayoutFor(other, optionsFor(TRIANGLE));

    expect(second).not.toBe(first);
    // Same inputs, so a fresh instance must still arrive at the same arrangement — the cache
    // is an optimisation, never a source of the determinism.
    expect([...second.positions.entries()]).toEqual([...first.positions.entries()]);
  });
});
