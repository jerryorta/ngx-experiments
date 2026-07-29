import type { NgeGraph, NgeGraphNode } from '../config/nge-chart-config.models';

/**
 * Resolve a {@link NgeGraph}'s categorical node set — the rule `NgeGraph.nodes`'s own doc
 * comment states, promoted to ONE shared implementation so every consumer of a graph-shaped
 * layer (the chord renderer, its legend extractor, and any future relationship layer) agrees
 * on both the SET and the ORDER of nodes. `nodes` wins when supplied, in caller order —
 * letting a caller control node identity, labels, colours, or include a node no link
 * touches. Omit it and the set is derived from the link endpoints in first-seen order
 * (`source` before `target`, link array order), so a caller who only has edges still gets a
 * stable, reproducible node list.
 *
 * Node index drives the categorical palette (`palette[i % length]`) wherever a layer or its
 * legend colours by node — so drift between two independent derivations would silently
 * paint a legend swatch a colour the chart never drew. Both chord call sites resolve through
 * this one function instead of keeping their own copy.
 *
 * ⚠️ The result is READ-ONLY, and which branch produced it changes what that means: when
 * `nodes` is supplied, the caller's own array and its own node objects come back BY
 * REFERENCE — nothing is copied — while the derived branch allocates a fresh array of fresh
 * objects. A consumer that needs to mutate what comes back (reorder it, write a computed
 * field onto a node, anything) must copy first rather than relying on which branch ran; the
 * renderer does exactly that before handing a graph to a layout.
 */
export function deriveGraphNodes(graph: NgeGraph): NgeGraphNode[] {
  if (graph.nodes?.length) {
    return graph.nodes;
  }

  const seen = new Set<string>();
  const nodes: NgeGraphNode[] = [];

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
