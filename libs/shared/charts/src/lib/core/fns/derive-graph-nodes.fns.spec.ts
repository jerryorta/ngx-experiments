import type { NgeGraph } from '../config/nge-chart-config.models';

import { deriveGraphNodes } from './derive-graph-nodes.fns';

describe('deriveGraphNodes', () => {
  it('returns the explicit node set, preserving caller order, when nodes is supplied', () => {
    const data: NgeGraph = {
      links: [
        { source: 'B', target: 'A', value: 5 },
        { source: 'A', target: 'C', value: 3 },
      ],
      nodes: [{ id: 'A' }, { id: 'B' }, { id: 'C' }],
    };

    // Link order (B, A, C) differs from the explicit node order (A, B, C) — the explicit
    // set wins outright, order included, rather than being re-sorted by link appearance.
    expect(deriveGraphNodes(data)).toEqual([{ id: 'A' }, { id: 'B' }, { id: 'C' }]);
  });

  it("returns the caller's own nodes array BY REFERENCE — a deliberate aliasing contract, not a copy", () => {
    const nodes = [{ id: 'A' }, { id: 'B' }];
    const data: NgeGraph = { links: [], nodes };

    // Pinned so this stays a documented invariant a future change can't "fix" into a copy
    // without the test noticing — see the read-only warning on deriveGraphNodes' JSDoc.
    expect(deriveGraphNodes(data)).toBe(nodes);
  });

  it('preserves each node object (labels, colors, etc.) when nodes is supplied', () => {
    const data: NgeGraph = {
      links: [],
      nodes: [{ color: 'var(--override)', id: 'A', label: 'Alpha' }],
    };

    expect(deriveGraphNodes(data)).toEqual([{ color: 'var(--override)', id: 'A', label: 'Alpha' }]);
  });

  it('derives nodes from link endpoints in first-seen order when nodes is omitted', () => {
    const data: NgeGraph = {
      links: [
        { source: 'B', target: 'A', value: 5 },
        { source: 'A', target: 'C', value: 3 },
      ],
    };

    // B and A appear first (as the first link's source/target), then C.
    expect(deriveGraphNodes(data)).toEqual([{ id: 'B' }, { id: 'A' }, { id: 'C' }]);
  });

  it('dedupes an endpoint that reappears across links', () => {
    const data: NgeGraph = {
      links: [
        { source: 'A', target: 'B', value: 1 },
        { source: 'B', target: 'C', value: 2 },
        { source: 'A', target: 'C', value: 3 },
      ],
    };

    expect(deriveGraphNodes(data).map(node => node.id)).toEqual(['A', 'B', 'C']);
  });

  it('treats an empty nodes array the same as omitted — falls through to link derivation', () => {
    const data: NgeGraph = {
      links: [{ source: 'A', target: 'B', value: 1 }],
      nodes: [],
    };

    expect(deriveGraphNodes(data)).toEqual([{ id: 'A' }, { id: 'B' }]);
  });

  it('returns an empty array for an empty graph', () => {
    expect(deriveGraphNodes({ links: [] })).toEqual([]);
  });
});
