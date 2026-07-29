import type { NgeHierarchyDatum, NgeTreeOrientation } from '../../core/config';
import type { TreeLayoutOptions, TreeNodePosition } from './tree-layout';

import { computeTreeLayout, DEFAULT_TREE_NODE_RADIUS } from './tree-layout';

const WIDTH = 400;
const HEIGHT = 300;

/** One root, two branches, four leaves — a tree deep enough to have internal nodes. */
const ORG: NgeHierarchyDatum[] = [
  {
    children: [
      {
        children: [
          { label: 'ana', value: 3 },
          { label: 'bo', value: 2 },
        ],
        label: 'eng',
      },
      {
        children: [
          { label: 'cam', value: 4 },
          { label: 'dee', value: 1 },
        ],
        label: 'sales',
      },
    ],
    label: 'ceo',
  },
];

/** Two unrelated trees — the forest case, which needs a synthetic root it must not draw. */
const FOREST: NgeHierarchyDatum[] = [
  { children: [{ label: 'a1', value: 1 }], label: 'a' },
  { children: [{ label: 'b1', value: 2 }], label: 'b' },
];

/** The same leaf name under two different branches — a bare `label` is not a unique key. */
const DUPLICATE_LABELS: NgeHierarchyDatum[] = [
  {
    children: [
      { children: [{ label: 'shared', value: 1 }], label: 'left' },
      { children: [{ label: 'shared', value: 2 }], label: 'right' },
    ],
    label: 'root',
  },
];

const ORIENTATIONS: NgeTreeOrientation[] = [
  'bottom-top',
  'left-right',
  'right-left',
  'top-bottom',
];

function optionsFor(overrides: Partial<TreeLayoutOptions> = {}): TreeLayoutOptions {
  return {
    boundedHeight: HEIGHT,
    boundedWidth: WIDTH,
    data: ORG,
    ...overrides,
  };
}

function nodeByLabel(nodes: TreeNodePosition[], label: string): TreeNodePosition {
  const found = nodes.find(node => node.datum.label === label);
  if (!found) {
    throw new Error(`no node labelled "${label}"`);
  }
  return found;
}

describe('computeTreeLayout', () => {
  describe('shape of the result', () => {
    it('seats every node of a single-root tree, root included', () => {
      const { nodes } = computeTreeLayout(optionsFor());

      expect(nodes.map(node => node.datum.label).sort()).toEqual([
        'ana',
        'bo',
        'cam',
        'ceo',
        'dee',
        'eng',
        'sales',
      ]);
    });

    it('draws one link per parent-child edge', () => {
      const { links, nodes } = computeTreeLayout(optionsFor());

      expect(links).toHaveLength(nodes.length - 1);
    });

    it('keys a node by its root-to-node path, so duplicate labels stay distinct', () => {
      const { nodes } = computeTreeLayout(optionsFor({ data: DUPLICATE_LABELS }));

      const keys = nodes.filter(node => node.datum.label === 'shared').map(node => node.key);

      expect(keys).toHaveLength(2);
      expect(new Set(keys).size).toBe(2);
      expect(keys).toContain('root/left/shared');
      expect(keys).toContain('root/right/shared');
    });

    it('reports an internal node’s summed subtree value, not undefined', () => {
      const { nodes } = computeTreeLayout(optionsFor());

      expect(nodeByLabel(nodes, 'eng').datum.value).toBe(5);
      expect(nodeByLabel(nodes, 'ceo').datum.value).toBe(10);
    });

    it('returns nothing for empty data or a collapsed plot', () => {
      expect(computeTreeLayout(optionsFor({ data: [] })).nodes).toEqual([]);
      expect(computeTreeLayout(optionsFor({ boundedWidth: 0 })).nodes).toEqual([]);
      expect(computeTreeLayout(optionsFor({ boundedHeight: 0 })).nodes).toEqual([]);
    });
  });

  describe('the forest case', () => {
    it('does not draw the synthetic root that joins unrelated trees', () => {
      const { nodes } = computeTreeLayout(optionsFor({ data: FOREST }));

      expect(nodes.map(node => node.datum.label).sort()).toEqual(['a', 'a1', 'b', 'b1']);
      expect(nodes.some(node => node.datum.label === '')).toBe(false);
    });

    it('reclaims the synthetic root’s depth band instead of leaving it blank', () => {
      const { nodes } = computeTreeLayout(optionsFor({ data: FOREST, orientation: 'left-right' }));

      // The two drawn levels span the full depth extent: the shallowest sits at the root
      // inset, not one depth-step in from it.
      const shallowest = Math.min(...nodes.map(node => node.x));

      expect(shallowest).toBeCloseTo(DEFAULT_TREE_NODE_RADIUS, 5);
    });

    it('draws no link into the synthetic root', () => {
      const { links } = computeTreeLayout(optionsFor({ data: FOREST }));

      expect(links).toHaveLength(2);
      expect(links.every(link => link.source.datum.label !== '')).toBe(true);
    });
  });

  describe('orientation', () => {
    it('grows depth left-to-right, with the root on the left', () => {
      const { nodes } = computeTreeLayout(optionsFor({ orientation: 'left-right' }));

      expect(nodeByLabel(nodes, 'ceo').x).toBeLessThan(nodeByLabel(nodes, 'eng').x);
      expect(nodeByLabel(nodes, 'eng').x).toBeLessThan(nodeByLabel(nodes, 'ana').x);
    });

    it('mirrors the depth axis for right-left', () => {
      const { nodes } = computeTreeLayout(optionsFor({ orientation: 'right-left' }));

      expect(nodeByLabel(nodes, 'ceo').x).toBeGreaterThan(nodeByLabel(nodes, 'eng').x);
      expect(nodeByLabel(nodes, 'eng').x).toBeGreaterThan(nodeByLabel(nodes, 'ana').x);
    });

    it('grows depth downward for top-bottom, with the root on top', () => {
      const { nodes } = computeTreeLayout(optionsFor({ orientation: 'top-bottom' }));

      expect(nodeByLabel(nodes, 'ceo').y).toBeLessThan(nodeByLabel(nodes, 'eng').y);
      expect(nodeByLabel(nodes, 'eng').y).toBeLessThan(nodeByLabel(nodes, 'ana').y);
    });

    it('mirrors the depth axis for bottom-top', () => {
      const { nodes } = computeTreeLayout(optionsFor({ orientation: 'bottom-top' }));

      expect(nodeByLabel(nodes, 'ceo').y).toBeGreaterThan(nodeByLabel(nodes, 'eng').y);
      expect(nodeByLabel(nodes, 'eng').y).toBeGreaterThan(nodeByLabel(nodes, 'ana').y);
    });
  });

  describe('alignLeaves (the dendrogram reading)', () => {
    /** A tree whose leaves sit at DIFFERENT depths — the only shape that can tell the two apart. */
    const RAGGED: NgeHierarchyDatum[] = [
      {
        children: [
          { children: [{ label: 'deep', value: 1 }], label: 'branch' },
          { label: 'shallow', value: 1 },
        ],
        label: 'root',
      },
    ];

    it('leaves a ragged tree ragged by default', () => {
      const { nodes } = computeTreeLayout(optionsFor({ data: RAGGED, orientation: 'left-right' }));

      expect(nodeByLabel(nodes, 'shallow').x).toBeLessThan(nodeByLabel(nodes, 'deep').x);
    });

    it('pushes every leaf onto the outer edge when set', () => {
      const { nodes } = computeTreeLayout(
        optionsFor({ alignLeaves: true, data: RAGGED, orientation: 'left-right' })
      );

      expect(nodeByLabel(nodes, 'shallow').x).toBeCloseTo(nodeByLabel(nodes, 'deep').x, 5);
    });

    it('aligns leaves in the radial layout too', () => {
      const { nodes } = computeTreeLayout(
        optionsFor({ alignLeaves: true, data: RAGGED, layout: 'radial' })
      );

      expect(nodeByLabel(nodes, 'shallow').radius).toBeCloseTo(
        nodeByLabel(nodes, 'deep').radius ?? 0,
        5
      );
    });
  });

  describe('maxDepth', () => {
    it('prunes levels below the cap', () => {
      const { nodes } = computeTreeLayout(optionsFor({ maxDepth: 1 }));

      expect(nodes.map(node => node.datum.label).sort()).toEqual(['ceo', 'eng', 'sales']);
    });

    it('still reports the pruned subtree’s aggregate on the node that hides it', () => {
      const { nodes } = computeTreeLayout(optionsFor({ maxDepth: 1 }));

      expect(nodeByLabel(nodes, 'eng').datum.value).toBe(5);
    });

    it('spreads the remaining levels across the whole plot rather than leaving a gap', () => {
      const full = computeTreeLayout(optionsFor({ orientation: 'left-right' }));
      const capped = computeTreeLayout(optionsFor({ maxDepth: 1, orientation: 'left-right' }));

      const deepestFull = Math.max(...full.nodes.map(node => node.x));
      const deepestCapped = Math.max(...capped.nodes.map(node => node.x));

      expect(deepestCapped).toBeCloseTo(deepestFull, 5);
    });
  });

  describe('link shape', () => {
    it('draws a cubic bezier for curve', () => {
      const { links } = computeTreeLayout(optionsFor({ linkShape: 'curve' }));

      expect(links[0].path).toMatch(/^M[\d.,-]+C/);
    });

    it('draws a single segment for straight', () => {
      const { links } = computeTreeLayout(optionsFor({ linkShape: 'straight' }));

      expect(links[0].path).toMatch(/^M[\d.,-]+L[\d.,-]+$/);
    });

    it('draws right angles for elbow, turning on the depth midpoint', () => {
      const { links } = computeTreeLayout(
        optionsFor({ linkShape: 'elbow', orientation: 'left-right' })
      );

      expect(links[0].path).toMatch(/^M[\d.,-]+H[\d.-]+V[\d.-]+H[\d.-]+$/);
    });

    it('swaps the elbow’s axes for a vertical orientation', () => {
      const { links } = computeTreeLayout(
        optionsFor({ linkShape: 'elbow', orientation: 'top-bottom' })
      );

      expect(links[0].path).toMatch(/^M[\d.,-]+V[\d.-]+H[\d.-]+V[\d.-]+$/);
    });

    it('falls back to a curve for elbow in the radial layout, which has no right angle', () => {
      const { links } = computeTreeLayout(optionsFor({ layout: 'radial', linkShape: 'elbow' }));

      expect(links[0].path).toMatch(/^M[\d.,-]+C/);
      expect(links[0].path).not.toMatch(/[HV]/);
    });

    it('starts and ends every link on its two endpoint nodes', () => {
      const { links } = computeTreeLayout(optionsFor({ linkShape: 'straight' }));

      for (const link of links) {
        expect(link.path).toBe(
          `M${link.source.x},${link.source.y}L${link.target.x},${link.target.y}`
        );
      }
    });
  });

  describe('the radial layout', () => {
    it('puts the root at the plot centre', () => {
      const { nodes } = computeTreeLayout(optionsFor({ layout: 'radial' }));

      const root = nodeByLabel(nodes, 'ceo');

      expect(root.x).toBeCloseTo(WIDTH / 2, 5);
      expect(root.y).toBeCloseTo(HEIGHT / 2, 5);
      expect(root.radius).toBe(0);
    });

    it('grows radius with depth', () => {
      const { nodes } = computeTreeLayout(optionsFor({ layout: 'radial' }));

      expect(nodeByLabel(nodes, 'eng').radius ?? 0).toBeLessThan(
        nodeByLabel(nodes, 'ana').radius ?? 0
      );
    });

    it('shrinks the whole diagram through radiusRatio, applied after the label reserve', () => {
      const full = computeTreeLayout(optionsFor({ layout: 'radial' }));
      const half = computeTreeLayout(optionsFor({ layout: 'radial', radiusRatio: 0.5 }));

      const outerFull = Math.max(...full.nodes.map(node => node.radius ?? 0));
      const outerHalf = Math.max(...half.nodes.map(node => node.radius ?? 0));

      expect(outerHalf).toBeCloseTo(outerFull / 2, 5);
    });

    it('flips a label past 6 o’clock so it stays upright and still runs outward', () => {
      const { nodes } = computeTreeLayout(optionsFor({ layout: 'radial' }));

      const flipped = nodes.filter(node => (node.angle ?? 0) >= Math.PI && node.radius);
      const upright = nodes.filter(node => (node.angle ?? 0) < Math.PI && node.radius);

      expect(flipped.length).toBeGreaterThan(0);
      expect(upright.length).toBeGreaterThan(0);
      expect(flipped.every(node => node.labelAnchor === 'end')).toBe(true);
      expect(upright.every(node => node.labelAnchor === 'start')).toBe(true);
    });

    it('bounds an internal label to the ring step so it cannot cross its own children', () => {
      // Both run OUTWARD in the radial layout — an internal label has no backward to run into,
      // because the rings crowd toward the pole. Bounding it to the ring step is what stops it
      // reaching the ring its children sit on. jsdom lays out no text, so an overlap is
      // invisible here; the budget is the assertable form of the rule.
      const { nodes } = computeTreeLayout(optionsFor({ labelReserveFar: 40, layout: 'radial' }));

      const byKey = new Map(nodes.map(node => [node.key, node]));
      const internals = nodes.filter(node => !node.isLeaf && node.depth > 0);
      expect(internals.length).toBeGreaterThan(0);

      for (const parent of internals) {
        // The label starts a gap past the circle and runs outward by at most its budget.
        const labelEnd = (parent.radius ?? 0) + 4 + 6 + parent.labelMaxWidth;
        const childRadius = Math.min(
          ...nodes
            .filter(node => byKey.get(node.key.slice(0, node.key.lastIndexOf('/'))) === parent)
            .map(node => node.radius ?? 0)
        );

        expect(labelEnd).toBeLessThanOrEqual(childRadius + 1e-6);
      }
    });

    it('anchors the root label at the pole, where there is no radial direction to run along', () => {
      const { nodes } = computeTreeLayout(optionsFor({ layout: 'radial' }));

      const root = nodeByLabel(nodes, 'ceo');

      expect(root.labelAnchor).toBe('middle');
      expect(root.labelRotate).toBe(0);
    });
  });

  describe('label placement', () => {
    it('runs a leaf label outward and an internal label back toward its parent', () => {
      const { nodes } = computeTreeLayout(
        optionsFor({ labelReserveFar: 60, orientation: 'left-right' })
      );

      const leaf = nodeByLabel(nodes, 'ana');
      const internal = nodeByLabel(nodes, 'eng');

      expect(leaf.labelAnchor).toBe('start');
      expect(leaf.labelX).toBeGreaterThan(leaf.x);
      expect(internal.labelAnchor).toBe('end');
      expect(internal.labelX).toBeLessThan(internal.x);
    });

    it('mirrors that split for a right-left tree', () => {
      const { nodes } = computeTreeLayout(
        optionsFor({ labelReserveFar: 60, orientation: 'right-left' })
      );

      const leaf = nodeByLabel(nodes, 'ana');
      const internal = nodeByLabel(nodes, 'eng');

      expect(leaf.labelAnchor).toBe('end');
      expect(leaf.labelX).toBeLessThan(leaf.x);
      expect(internal.labelAnchor).toBe('start');
      expect(internal.labelX).toBeGreaterThan(internal.x);
    });

    it('centres labels in a vertical orientation and budgets them by the sibling gap', () => {
      const { nodes } = computeTreeLayout(
        optionsFor({ labelReserveFar: 20, orientation: 'top-bottom' })
      );

      const leaf = nodeByLabel(nodes, 'ana');

      expect(leaf.labelAnchor).toBe('middle');
      expect(leaf.labelX).toBe(leaf.x);
      expect(leaf.labelMaxWidth).toBeGreaterThan(0);
      expect(leaf.labelMaxWidth).toBeLessThan(WIDTH);
    });

    it('keeps a leaf label inside the reserve it was given', () => {
      const reserve = 80;
      const { nodes } = computeTreeLayout(
        optionsFor({ labelReserveFar: reserve, orientation: 'left-right' })
      );

      for (const leaf of nodes.filter(node => node.isLeaf)) {
        expect(leaf.labelX + leaf.labelMaxWidth).toBeLessThanOrEqual(WIDTH + 1e-6);
      }
    });
  });

  describe('every mark lies inside the bounded plot rect', () => {
    // `g.nge-chart-layers` is CLIPPED, so a mark outside these bounds is discarded rather
    // than merely tight — and jsdom does not clip, so nothing else in the suite can catch it.
    const inside = (value: number, max: number): boolean => value >= -1e-6 && value <= max + 1e-6;

    for (const orientation of ORIENTATIONS) {
      for (const alignLeaves of [false, true]) {
        it(`holds for ${orientation}${alignLeaves ? ' + alignLeaves' : ''}`, () => {
          const { nodes } = computeTreeLayout(
            optionsFor({
              alignLeaves,
              labelReserveFar: 70,
              labelReserveNear: 40,
              nodeRadius: 6,
              orientation,
            })
          );

          for (const node of nodes) {
            // The circle's EDGE, not its centre — the distinction that made ARCH-201's
            // force layout lose nodes to the clip.
            expect(inside(node.x - 6, WIDTH)).toBe(true);
            expect(inside(node.x + 6, WIDTH)).toBe(true);
            expect(inside(node.y - 6, HEIGHT)).toBe(true);
            expect(inside(node.y + 6, HEIGHT)).toBe(true);
            expect(inside(node.labelX, WIDTH)).toBe(true);
            expect(inside(node.labelY, HEIGHT)).toBe(true);
          }
        });
      }
    }

    it('holds for the radial layout, label reserve included', () => {
      const reserve = 40;
      const { nodes } = computeTreeLayout(
        optionsFor({ labelReserveFar: reserve, layout: 'radial', nodeRadius: 6 })
      );

      for (const node of nodes) {
        expect(inside(node.x - 6, WIDTH)).toBe(true);
        expect(inside(node.x + 6, WIDTH)).toBe(true);
        expect(inside(node.y - 6, HEIGHT)).toBe(true);
        expect(inside(node.y + 6, HEIGHT)).toBe(true);
        expect(inside(node.labelX, WIDTH)).toBe(true);
        expect(inside(node.labelY, HEIGHT)).toBe(true);
      }
    });

    it('holds for a forest, whose reclaimed depth band moves every mark', () => {
      const { nodes } = computeTreeLayout(
        optionsFor({ data: FOREST, labelReserveFar: 70, labelReserveNear: 40, nodeRadius: 6 })
      );

      for (const node of nodes) {
        expect(inside(node.x - 6, WIDTH)).toBe(true);
        expect(inside(node.x + 6, WIDTH)).toBe(true);
        expect(inside(node.y - 6, HEIGHT)).toBe(true);
        expect(inside(node.y + 6, HEIGHT)).toBe(true);
      }
    });
  });

  describe('branch colouring', () => {
    it('gives a branch and every node under it the same palette index', () => {
      const { nodes } = computeTreeLayout(optionsFor());

      expect(nodeByLabel(nodes, 'eng').branchIndex).toBe(0);
      expect(nodeByLabel(nodes, 'ana').branchIndex).toBe(0);
      expect(nodeByLabel(nodes, 'bo').branchIndex).toBe(0);
      expect(nodeByLabel(nodes, 'sales').branchIndex).toBe(1);
      expect(nodeByLabel(nodes, 'cam').branchIndex).toBe(1);
    });

    it('indexes a forest by its top-level trees', () => {
      const { nodes } = computeTreeLayout(optionsFor({ data: FOREST }));

      expect(nodeByLabel(nodes, 'a').branchIndex).toBe(0);
      expect(nodeByLabel(nodes, 'a1').branchIndex).toBe(0);
      expect(nodeByLabel(nodes, 'b').branchIndex).toBe(1);
      expect(nodeByLabel(nodes, 'b1').branchIndex).toBe(1);
    });
  });
});
