import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeChordLayerConfig, NgeGraph, NgeGraphNode } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeChordLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { extractChordChartLegendItems } from '../../core/legend';
import { DEFAULT_CHORD_LAYER_THEME, measureLabelWidth } from '../../core/theme';
import { renderChordLayer } from './render-chord-layer';

type ChordContext = NgeChartLayerContext<
  NgeGraphNode,
  NgeChordLayerConfig,
  NgeChordLayerTheme | undefined
>;

type ContextOptions = Partial<Omit<NgeChordLayerConfig, 'data' | 'renderer' | 'type'>> & {
  dimensions?: Partial<typeof DIMENSIONS>;
  onTooltip?: jest.Mock;
  theme?: NgeChordLayerTheme;
  tooltip?: boolean;
};

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 400,
  height: 320,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 420,
};

/**
 * A simple three-node relationship: A relates outward to both B and C, B to C. Every value is
 * distinct so ratios in the assertions below are unambiguous. Good for structure / colour /
 * label / interaction / theme coverage that only needs counts and ids, not hand-derived angles.
 */
const GRAPH: NgeGraph = {
  links: [
    { source: 'A', target: 'B', value: 10 },
    { source: 'B', target: 'C', value: 6 },
    { source: 'A', target: 'C', value: 2 },
  ],
};

/**
 * A linear-layout fixture whose FIRST and LAST nodes carry long labels — "Northeast Region"
 * (16 chars) at one endpoint, "Central" at the other. `GRAPH`'s bare ids are all one letter,
 * so it never exercises the clipped-endpoint-label defect (a real bug found by driving the
 * chart in a browser: "Northeast" rendered as "rtheast", the layers-group clip-path silently
 * discarding whichever end of a centred label overhangs the plot edge).
 */
const LONG_ENDPOINT_LABEL_GRAPH: NgeGraph = {
  links: [
    { source: 'A', target: 'B', value: 10 },
    { source: 'B', target: 'C', value: 6 },
  ],
  nodes: [
    { id: 'A', label: 'Northeast Region' },
    { id: 'B', label: 'B' },
    { id: 'C', label: 'Central' },
  ],
};

/**
 * A single bidirectional pair with DIFFERENT values each way — the minimal fixture that shows
 * `d3.chord()`'s "merge into one asymmetric-ended ribbon" behaviour without a third node's
 * angles to hand-derive. Source ends up A (value 10, the larger direction), target B (value 4).
 */
const AB_GRAPH: NgeGraph = {
  links: [
    { source: 'A', target: 'B', value: 10 },
    { source: 'B', target: 'A', value: 4 },
  ],
};

function createContext(
  data: NgeGraph,
  options: ContextOptions = {}
): { context: ChordContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeChordLayerConfig = {
    data,
    directed: options.directed,
    endAngle: options.endAngle,
    formatLabel: options.formatLabel,
    innerRadius: options.innerRadius,
    labelColor: options.labelColor,
    labelPadding: options.labelPadding,
    layout: options.layout,
    linkMark: options.linkMark,
    onClick: options.onClick,
    padAngle: options.padAngle,
    radiusRatio: options.radiusRatio,
    renderer: renderChordLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    sortSubgroups: options.sortSubgroups,
    startAngle: options.startAngle,
    type: 'chord',
  };

  // Chord ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: ChordContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data: [],
    dimensions: { ...DIMENSIONS, ...options.dimensions },
    margins: { bottom: 10, left: 10, right: 10, top: 10 },
    scales,
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeGraphNode) => ({ label: d.label ?? d.id, value: d.value ?? '' }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/** d3 stashes the bound datum on the DOM node itself under `__data__`. */
function datumOf<T>(node: Element): T {
  return (node as unknown as { __data__: T }).__data__;
}

function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

function arcPaths(g: SVGGElement): SVGPathElement[] {
  return Array.from(g.querySelectorAll<SVGPathElement>('.nge-chord-arc'));
}

function nodeCircles(g: SVGGElement): SVGCircleElement[] {
  return Array.from(g.querySelectorAll<SVGCircleElement>('.nge-chord-node'));
}

function linkPaths(g: SVGGElement): SVGPathElement[] {
  return Array.from(g.querySelectorAll<SVGPathElement>('.nge-chord-link'));
}

function labelEls(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-chord-label'));
}

function arcByNode(g: SVGGElement, id: string): SVGPathElement {
  const match = arcPaths(g).find(el => el.getAttribute('data-node') === id);
  if (!match) {
    throw new Error(`No chord arc for node "${id}"`);
  }
  return match;
}

/**
 * Every `A` command's radius operand in a ring arc's `d` — a `d3.arc()` annular sector draws
 * an OUTER arc (`A{outerRadius},{outerRadius} …`) and an INNER arc (`A{innerRadius},{innerRadius}
 * …`), so this is the set of radii the generator was actually called with. `rx` and `ry` are
 * identical for every arc this layer draws (a circle, never an ellipse), so only the first
 * operand of each match is read.
 */
function arcRadii(el: Element): number[] {
  const matches = (el.getAttribute('d') ?? '').match(/A(-?[\d.]+),/g) ?? [];
  return matches.map(token => Number(/A(-?[\d.]+),/.exec(token)?.[1] ?? 0));
}

function circleByNode(g: SVGGElement, id: string): SVGCircleElement {
  const match = nodeCircles(g).find(el => el.getAttribute('data-node') === id);
  if (!match) {
    throw new Error(`No chord node circle for "${id}"`);
  }
  return match;
}

function labelByNode(g: SVGGElement, id: string): SVGTextElement {
  const match = labelEls(g).find(el => el.getAttribute('data-label') === id);
  if (!match) {
    throw new Error(`No chord label for node "${id}"`);
  }
  return match;
}

/**
 * The `translate(x,y)` component of a circular label's `rotate + translate` transform.
 *
 * Throws when the pattern does not match rather than defaulting to `{x:0,y:0}` — a silent
 * default would read as "at the center, well in bounds" for every in-bounds assertion this
 * feeds, masking a malformed or NaN-poisoned transform as a passing test instead of failing
 * loudly on the actual defect. The character class includes `e`/`E`/`+` because a coordinate
 * this close to a multiple of π/2 can land on a near-zero `cos`/`sin` that JS stringifies in
 * exponential form (e.g. `4.776122516674678e-15`), not because the value is actually huge.
 */
function translateOf(el: Element): { x: number; y: number } {
  const raw = el.getAttribute('transform') ?? '';
  const match = /translate\(([-\d.eE+]+),([-\d.eE+]+)\)/.exec(raw);
  if (!match) {
    throw new Error(`translateOf: no translate(x,y) found in transform "${raw}"`);
  }
  return { x: Number(match[1]), y: Number(match[2]) };
}

/**
 * d3 transitions run on real timers; the ring-arc reshape and the circular label's placement
 * both apply via `attrTween`, so their final geometry is only observable after a real delay
 * past the enter duration. Fills, plain attrs (linear layout), and handlers apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function rerender(context: ChordContext, data: NgeGraph): void {
  context.config.data = data;
  renderChordLayer(context);
}

describe('renderChordLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('degenerate input', () => {
    it('renders nothing for an empty link set', () => {
      const { context, g } = createContext({ links: [] });
      renderChordLayer(context);

      expect(arcPaths(g)).toHaveLength(0);
      expect(linkPaths(g)).toHaveLength(0);
    });

    it('renders nothing before the container has been measured', () => {
      const { context, g } = createContext(GRAPH, {
        dimensions: { boundedHeight: 0, boundedWidth: 0 },
      });
      renderChordLayer(context);

      expect(arcPaths(g)).toHaveLength(0);
    });

    it('does not throw for a single explicit node with no links', () => {
      const { context, g } = createContext({ links: [], nodes: [{ id: 'Solo' }] });

      // A single, disconnected node has no links at all, so the shared bail-out (which keys
      // off `links.length`) clears rather than draws it — a real absence of data, not a
      // crash. Asserting the no-throw is the property under test.
      expect(() => renderChordLayer(context)).not.toThrow();
      expect(arcPaths(g)).toHaveLength(0);
    });

    it('clamps a negative link value to zero rather than letting it invert into a full-circle sweep', async () => {
      const { context, g } = createContext({
        links: [{ source: 'A', target: 'B', value: -5 }],
      });

      expect(() => renderChordLayer(context)).not.toThrow();
      await settle();

      // Un-clamped, `d3.chord()` divides its angle-per-value scale factor by a NEGATIVE
      // total, flipping its sign — this one cell's own negative value cancels that back out
      // to a POSITIVE, FULL-TURN sweep for node A (traced against the actual d3-chord source,
      // not just the `@types` prose): a silently swallowed ring, not a thrown error or a NaN
      // path, which is why a bare `.not.toContain('NaN')` check cannot catch it. Clamped, the
      // matrix is entirely zero and BOTH nodes get a zero-width sweep instead.
      const a = datumOf<{ endAngle: number; startAngle: number }>(arcByNode(g, 'A'));
      const b = datumOf<{ endAngle: number; startAngle: number }>(arcByNode(g, 'B'));
      expect(a.endAngle - a.startAngle).toBeCloseTo(0, 6);
      expect(b.endAngle - b.startAngle).toBeCloseTo(0, 6);
      for (const path of arcPaths(g)) {
        expect(path.getAttribute('d') ?? '').not.toContain('NaN');
      }
    });

    it('never throws on an all-zero-value graph', () => {
      const { context, g } = createContext({
        links: [
          { source: 'A', target: 'B', value: 0 },
          { source: 'B', target: 'C', value: 0 },
        ],
      });

      expect(() => renderChordLayer(context)).not.toThrow();
      expect(arcPaths(g)).toHaveLength(3);
    });
  });

  describe('matrix adapter', () => {
    it('drops a link naming an unknown endpoint instead of throwing', () => {
      const { context, g } = createContext({
        links: [{ source: 'A', target: 'Ghost', value: 5 }],
        nodes: [{ id: 'A' }, { id: 'B' }],
      });

      expect(() => renderChordLayer(context)).not.toThrow();
      expect(arcPaths(g)).toHaveLength(2);
      expect(linkPaths(g)).toHaveLength(0);
    });

    it('sums parallel links between the same pair into one matrix cell', () => {
      const { context, g } = createContext({
        links: [
          { source: 'A', target: 'B', value: 3 },
          { source: 'A', target: 'B', value: 5 },
        ],
      });
      renderChordLayer(context);

      expect(linkPaths(g)).toHaveLength(1);
      const chord = datumOf<{ source: { value: number } }>(linkPaths(g)[0]);
      expect(chord.source.value).toBe(8);
    });

    it('derives the node set from link endpoints in first-seen order when nodes are omitted', () => {
      const { context, g } = createContext({
        links: [
          { source: 'B', target: 'A', value: 1 },
          { source: 'A', target: 'C', value: 1 },
        ],
      });
      renderChordLayer(context);

      expect(arcPaths(g).map(el => el.getAttribute('data-node'))).toEqual(['B', 'A', 'C']);
    });

    it('honours an explicit node set, including a node no link touches', () => {
      const { context, g } = createContext({
        links: [{ source: 'A', target: 'B', value: 1 }],
        nodes: [{ id: 'A' }, { id: 'B' }, { id: 'Unused' }],
      });
      renderChordLayer(context);

      expect(arcPaths(g).map(el => el.getAttribute('data-node'))).toEqual(['A', 'B', 'Unused']);
    });
  });

  describe('circular layout — Chord Diagram (ribbon, default)', () => {
    it('draws one ring arc per node and one ribbon per relationship', () => {
      const { context, g } = createContext(GRAPH);
      renderChordLayer(context);

      expect(arcPaths(g)).toHaveLength(3);
      expect(linkPaths(g)).toHaveLength(3);
    });

    it('centers the ring container in the bounded area', () => {
      const { context, g } = createContext(GRAPH);
      renderChordLayer(context);

      expect(g.querySelector('.nge-chord-container')?.getAttribute('transform')).toBe(
        'translate(200,150)'
      );
    });

    it('sizes each ring arc in proportion to its node value', async () => {
      const { context, g } = createContext(AB_GRAPH);
      renderChordLayer(context);
      await settle();

      const a = datumOf<{ endAngle: number; startAngle: number }>(arcByNode(g, 'A'));
      const b = datumOf<{ endAngle: number; startAngle: number }>(arcByNode(g, 'B'));
      const sweepA = a.endAngle - a.startAngle;
      const sweepB = b.endAngle - b.startAngle;

      expect(sweepA / sweepB).toBeCloseTo(10 / 4, 1);
    });

    it('merges A→B and B→A into one asymmetric-ended ribbon under the default undirected mode', () => {
      const { context, g } = createContext(AB_GRAPH);
      renderChordLayer(context);

      expect(linkPaths(g)).toHaveLength(1);
      const chord = datumOf<{ source: { value: number }; target: { value: number } }>(
        linkPaths(g)[0]
      );
      expect(chord.source.value).toBe(10);
      expect(chord.target.value).toBe(4);
    });

    it('keeps A→B and B→A as two distinct chords under directed: true', () => {
      const { context, g } = createContext(AB_GRAPH, { directed: true });
      renderChordLayer(context);

      expect(linkPaths(g)).toHaveLength(2);
    });

    it('re-renders idempotently (keyed by resolved node ids)', () => {
      const { context, g } = createContext(GRAPH);
      renderChordLayer(context);
      renderChordLayer(context);

      expect(arcPaths(g)).toHaveLength(3);
      expect(linkPaths(g)).toHaveLength(3);
    });
  });

  describe('linkMark — ribbon vs edge', () => {
    it('fills ribbons and leaves them unstroked', () => {
      const { context, g } = createContext(AB_GRAPH);
      renderChordLayer(context);

      const link = linkPaths(g)[0];
      expect(styleOf(link, 'fill')).not.toBe('none');
      expect(styleOf(link, 'stroke')).toBe('none');
    });

    it('strokes edges, unfilled, with width proportional to the chord value', () => {
      const { context, g } = createContext(AB_GRAPH, { linkMark: 'edge' });
      renderChordLayer(context);

      const link = linkPaths(g)[0];
      expect(styleOf(link, 'fill')).toBe('none');
      expect(styleOf(link, 'stroke')).not.toBe('none');
      expect(Number(styleOf(link, 'stroke-width'))).toBeGreaterThan(0);
    });

    it('collapses an edge to a zero-width ribbon rather than a full-width one', () => {
      // Both variants read the SAME chord datum; only the geometry generator differs. A
      // ribbon spans two full arcs of width, an edge collapses each end to its midpoint —
      // observable as a materially shorter `d` string with no repeated wide-arc segments.
      const ribbon = createContext(AB_GRAPH, { linkMark: 'ribbon' });
      renderChordLayer(ribbon.context);
      const edge = createContext(AB_GRAPH, { linkMark: 'edge' });
      renderChordLayer(edge.context);

      const ribbonD = linkPaths(ribbon.g)[0].getAttribute('d') ?? '';
      const edgeD = linkPaths(edge.g)[0].getAttribute('d') ?? '';
      expect(edgeD).not.toBe(ribbonD);
      expect(edgeD.length).toBeLessThan(ribbonD.length);
    });
  });

  describe('circular — radiusRatio + innerRadius', () => {
    it('shrinks the ring without distorting the label ring', () => {
      // min(400,300)/2 = 150, minus the showLabels reserve (6 label padding + 72 gutter) = 72
      // — the full outerRadius. `radiusRatio` scales ONLY that outer radius (36 at 0.5); the
      // 6px `labelPadding` added on top to place the label ring is a fixed offset, not itself
      // scaled — so the two ring radii are 78 and 42, not a clean 2x apart. Pie's own
      // radiusRatio spec hits the same "additive offset doesn't scale proportionally" shape.
      const full = createContext(AB_GRAPH, { showLabels: true });
      const half = createContext(AB_GRAPH, { radiusRatio: 0.5, showLabels: true });

      renderChordLayer(full.context);
      renderChordLayer(half.context);

      const ringR = (g: SVGGElement): number => {
        const { x, y } = translateOf(labelByNode(g, 'A'));
        return Math.hypot(x, y);
      };

      expect(ringR(full.g)).toBeCloseTo(78, 6);
      expect(ringR(half.g)).toBeCloseTo(42, 6);
    });

    it('fills the plot when radiusRatio is omitted — 1 is a no-op', async () => {
      const withOut = createContext(AB_GRAPH);
      const explicit = createContext(AB_GRAPH, { radiusRatio: 1 });

      renderChordLayer(withOut.context);
      renderChordLayer(explicit.context);
      await settle();

      expect(arcByNode(withOut.g, 'A').getAttribute('d')).toBe(
        arcByNode(explicit.g, 'A').getAttribute('d')
      );
    });

    it('honours the innerRadius ratio for the ring band', async () => {
      // Neither fixture sets radiusRatio or showLabels, so outerRadius is exactly
      // min(400,300)/2 = 150 — the same arithmetic the radiusRatio test above derives 78/42
      // from. Each arc's `d` carries an OUTER arc at that radius and an INNER arc at
      // `innerRadius * outerRadius`; asserting both radii (not just "an `A` command exists",
      // which every arc has regardless of `innerRadius`) is what actually pins the band width.
      const outerRadius = 150;

      const defaulted = createContext(AB_GRAPH);
      renderChordLayer(defaulted.context);
      const thick = createContext(AB_GRAPH, { innerRadius: 0.5 });
      renderChordLayer(thick.context);
      await settle();

      const defaultRadii = arcRadii(arcByNode(defaulted.g, 'A'));
      const thickRadii = arcRadii(arcByNode(thick.g, 'A'));

      expect(Math.max(...defaultRadii)).toBeCloseTo(outerRadius, 6);
      expect(Math.min(...defaultRadii)).toBeCloseTo(outerRadius * 0.9, 6);

      expect(Math.max(...thickRadii)).toBeCloseTo(outerRadius, 6);
      expect(Math.min(...thickRadii)).toBeCloseTo(outerRadius * 0.5, 6);

      // The two configs must disagree on the INNER radius specifically — the outer edge (and
      // therefore the overall ring size) is untouched by innerRadius.
      expect(Math.min(...thickRadii)).toBeLessThan(Math.min(...defaultRadii));
      expect(Math.max(...thickRadii)).toBeCloseTo(Math.max(...defaultRadii), 6);
    });
  });

  describe('circular — padAngle / startAngle / endAngle / labelPadding', () => {
    it('creates an angular gap between adjacent groups equal to padAngle', () => {
      const { context, g } = createContext(AB_GRAPH, { padAngle: 0.2 });
      renderChordLayer(context);

      const a = datumOf<{ endAngle: number; startAngle: number }>(arcByNode(g, 'A'));
      const b = datumOf<{ endAngle: number; startAngle: number }>(arcByNode(g, 'B'));
      // Groups lay out in node order (A=0, B=1; no sortGroups is ever set), consecutively —
      // the gap between A's end and B's start is exactly the configured padAngle, applied
      // directly by `d3.chord()` in native [0, 2π] units before any startAngle/endAngle remap.
      expect(b.startAngle - a.endAngle).toBeCloseTo(0.2, 6);
    });

    it('confines the ring to a partial span when startAngle/endAngle narrow it', () => {
      // The remap only happens INSIDE the arc/ribbon generators' angle accessors — the bound
      // `ChordGroup` datum itself always carries d3-chord's RAW, un-remapped [0, 2π] angles,
      // so this has to observe the effect through something that reads the remapped value,
      // not by reading `d.startAngle` / `d.endAngle` back off the datum directly. A label's
      // `text-anchor` is exactly that: it flips at the remapped hemisphere boundary (deg 180).
      // Under the default full turn, A sits in the right hemisphere and B — on the opposite
      // side of the circle — in the left. Compressing the SAME graph into [0, π] (half the
      // native span) pulls B's remapped midpoint into the right hemisphere too, alongside A.
      const full = createContext(AB_GRAPH, { showLabels: true });
      const half = createContext(AB_GRAPH, { endAngle: Math.PI, showLabels: true, startAngle: 0 });
      renderChordLayer(full.context);
      renderChordLayer(half.context);

      expect(labelByNode(full.g, 'A').getAttribute('text-anchor')).toBe('start');
      expect(labelByNode(full.g, 'B').getAttribute('text-anchor')).toBe('end');

      expect(labelByNode(half.g, 'A').getAttribute('text-anchor')).toBe('start');
      expect(labelByNode(half.g, 'B').getAttribute('text-anchor')).toBe('start');
    });

    it('reserves more room (shrinks the ring) as labelPadding grows', async () => {
      // min(400,300)/2 - (labelPadding + 72-gutter): 150-(2+72)=76, 150-(30+72)=48. The label's
      // own RING DISTANCE stays constant across labelPadding values (`labelRadius =
      // outerRadius + labelPadding`, and labelPadding cancels out of that sum algebraically —
      // see the radiusRatio spec above) — the actually-attributable effect is the ring's OWN
      // outer radius shrinking, which this reads off the arc's own radius operand instead.
      const tight = createContext(AB_GRAPH, { labelPadding: 2, showLabels: true });
      const loose = createContext(AB_GRAPH, { labelPadding: 30, showLabels: true });
      renderChordLayer(tight.context);
      renderChordLayer(loose.context);
      await settle();

      const outerOf = (g: SVGGElement): number => Math.max(...arcRadii(arcByNode(g, 'A')));
      expect(outerOf(tight.g)).toBeCloseTo(76, 6);
      expect(outerOf(loose.g)).toBeCloseTo(48, 6);
    });
  });

  describe('stays inside the bounded plot rect', () => {
    /**
     * The layers group carries a `clip-path` of the plot rect (AGENTS.md, ARCH-197) — a mark
     * hung past it is DISCARDED, not merely tight, and jsdom does not clip, so nothing else in
     * this suite would notice. Circular geometry is angle-driven (`d3.arc()` / `d3.ribbon()`
     * guarantee their own output never exceeds the radius they are given, the same reason the
     * sunburst / pie specs verify radii and bound datums rather than parsing rendered `d`
     * strings), so the property actually under test is that the COMPUTED outer radius — the
     * number that bounds every arc and ribbon by construction — fits the tightest half-dimension.
     * Labels ARE plain translate(x,y) pairs, so those are checked exactly.
     */
    it('computes a circular outer radius (+ label reserve) that fits the tightest dimension', () => {
      const { context, g } = createContext(AB_GRAPH, { showLabels: true });
      renderChordLayer(context);

      const { x, y } = translateOf(labelByNode(g, 'A'));
      const cx = DIMENSIONS.boundedWidth / 2;
      const cy = DIMENSIONS.boundedHeight / 2;
      // The label sits at `outerRadius + labelPadding` from the center; the ring itself (and
      // every ribbon, which never reaches past `outerRadius`) sits entirely inside that.
      const labelDistance = Math.hypot(x, y);
      expect(cx - labelDistance).toBeGreaterThanOrEqual(-0.001);
      expect(cy - labelDistance).toBeGreaterThanOrEqual(-0.001);
    });

    it('keeps every circular label inside the bounded rect', () => {
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderChordLayer(context);

      const cx = DIMENSIONS.boundedWidth / 2;
      const cy = DIMENSIONS.boundedHeight / 2;
      for (const label of labelEls(g)) {
        const { x, y } = translateOf(label);
        expect(cx + x).toBeGreaterThanOrEqual(-0.001);
        expect(cy + y).toBeGreaterThanOrEqual(-0.001);
        expect(cx + x).toBeLessThanOrEqual(DIMENSIONS.boundedWidth + 0.001);
        expect(cy + y).toBeLessThanOrEqual(DIMENSIONS.boundedHeight + 0.001);
      }
    });

    it('keeps every linear node circle and its label inside the bounded rect', () => {
      const { context, g } = createContext(LONG_ENDPOINT_LABEL_GRAPH, {
        layout: 'linear',
        showLabels: true,
      });
      renderChordLayer(context);

      for (const circle of nodeCircles(g)) {
        const cx = Number(circle.getAttribute('cx'));
        const cy = Number(circle.getAttribute('cy'));
        const r = Number(circle.getAttribute('r'));
        expect(cx - r).toBeGreaterThanOrEqual(-0.001);
        expect(cx + r).toBeLessThanOrEqual(DIMENSIONS.boundedWidth + 0.001);
        expect(cy - r).toBeGreaterThanOrEqual(-0.001);
        expect(cy + r).toBeLessThanOrEqual(DIMENSIONS.boundedHeight + 0.001);
      }

      // `text-anchor: middle` means a label's rendered extent is `x ± halfWidth`, not the bare
      // anchor point a `y`-only (or mark-count) check would settle for — an endpoint node sits
      // only `maxNodeRadius` from the plot edge, so any label wider than that overhangs it
      // regardless of whether it also collides with its neighbour. Measured through the SAME
      // `measureLabelWidth()` the renderer's own eliding calls use, against the label's own
      // (already font-styled) node, so jsdom's lack of real text layout degrades identically
      // on both sides rather than the spec asserting a number the renderer never computed.
      for (const label of labelEls(g)) {
        const x = Number(label.getAttribute('x'));
        const y = Number(label.getAttribute('y'));
        const fontSize = parseFloat(styleOf(label, 'font-size')) || 10;
        const halfWidth = measureLabelWidth(label, label.textContent ?? '', fontSize) / 2;

        expect(x - halfWidth).toBeGreaterThanOrEqual(-0.001);
        expect(x + halfWidth).toBeLessThanOrEqual(DIMENSIONS.boundedWidth + 0.001);
        expect(y).toBeLessThanOrEqual(DIMENSIONS.boundedHeight + 0.001);
      }
    });

    it('keeps the tallest linear connector arc peak inside the bounded rect', () => {
      const { context, g } = createContext(GRAPH, { layout: 'linear' });
      renderChordLayer(context);

      const baselineY = Number(nodeCircles(g)[0].getAttribute('cy'));
      const xs = nodeCircles(g).map(el => Number(el.getAttribute('cx')));
      const widestGap = Math.max(...xs) - Math.min(...xs);
      const peakY = baselineY - widestGap / 2;

      expect(peakY).toBeGreaterThanOrEqual(-0.001);
    });

    it('clamps the baseline when the arcs would need more height than the plot has', () => {
      // Every other linear spec uses a plot tall enough that the baseline never has to
      // compromise — this one is deliberately too short, to actually BIND the
      // `Math.min(topReserve, boundedHeight - bottomReserve)` clamp branch rather than
      // leaving it dead code as far as the suite can tell.
      const { context, g } = createContext(AB_GRAPH, {
        dimensions: { boundedHeight: 40 },
        layout: 'linear',
      });
      renderChordLayer(context);

      // xPad = maxNodeRadius = 16 (A's value 10 maps to the top of the sqrt scale's [4,16]
      // range); nodeX(0)=16, nodeX(1)=400-16=384; the arcs' natural height (maxArcRadius) is
      // (384-16)/2=184 — far more than the 40px plot has. bottomReserve = maxNodeRadius = 16
      // (no labels), so the clamp forces baselineY to boundedHeight - bottomReserve = 24,
      // not the 184 the arcs would otherwise want.
      const baselineY = Number(nodeCircles(g)[0].getAttribute('cy'));
      expect(baselineY).toBeCloseTo(24, 6);

      // The circle itself still fits exactly — cy(24) + r(16) = 40 = boundedHeight, no
      // overflow — even though the connector arc above it will read as clipped in this
      // deliberately extreme case (an accepted trade-off, not asserted here).
      const r = Number(nodeCircles(g)[0].getAttribute('r'));
      expect(baselineY + r).toBeLessThanOrEqual(DIMENSIONS.boundedHeight + 0.001);
    });
  });

  describe('linear layout — Arc Diagram', () => {
    it('draws one circle per node and one stroked arc per relationship, ignoring linkMark', () => {
      const { context, g } = createContext(GRAPH, { layout: 'linear', linkMark: 'ribbon' });
      renderChordLayer(context);

      expect(nodeCircles(g)).toHaveLength(3);
      expect(linkPaths(g)).toHaveLength(3);
      for (const link of linkPaths(g)) {
        expect(styleOf(link, 'fill')).toBe('none');
      }
    });

    it('positions nodes left to right along one shared baseline', () => {
      const { context, g } = createContext(GRAPH, { layout: 'linear' });
      renderChordLayer(context);

      const ys = nodeCircles(g).map(el => Number(el.getAttribute('cy')));
      expect(new Set(ys).size).toBe(1);

      const xs = nodeCircles(g).map(el => Number(el.getAttribute('cx')));
      expect(new Set(xs).size).toBe(3);
    });

    it('sizes each node circle in proportion to its combined flow', () => {
      const { context, g } = createContext(AB_GRAPH, { layout: 'linear' });
      renderChordLayer(context);

      const a = Number(circleByNode(g, 'A').getAttribute('r'));
      const b = Number(circleByNode(g, 'B').getAttribute('r'));
      expect(a).toBeGreaterThan(b);
    });

    it('scales connector stroke-width with the chord value', () => {
      const { context, g } = createContext(
        {
          links: [
            { source: 'A', target: 'B', value: 1 },
            { source: 'A', target: 'C', value: 20 },
          ],
        },
        { layout: 'linear' }
      );
      renderChordLayer(context);

      const widths = linkPaths(g).map(el => Number(styleOf(el, 'stroke-width')));
      expect(Math.max(...widths)).toBeGreaterThan(Math.min(...widths));
    });
  });

  describe('color', () => {
    it('assigns the node palette by node index', () => {
      const { context, g } = createContext(GRAPH, { seriesColors: ['#111111', '#222222'] });
      renderChordLayer(context);

      expect(styleOf(arcByNode(g, 'A'), 'fill')).toBe('#111111');
      expect(styleOf(arcByNode(g, 'B'), 'fill')).toBe('#222222');
      // Index 2 wraps back to the first entry.
      expect(styleOf(arcByNode(g, 'C'), 'fill')).toBe('#111111');
    });

    it('lets a per-node color win over the palette', () => {
      const { context, g } = createContext(
        {
          links: [{ source: 'A', target: 'B', value: 1 }],
          nodes: [{ color: '#abcdef', id: 'A' }, { id: 'B' }],
        },
        { seriesColors: ['#111111'] }
      );
      renderChordLayer(context);

      expect(styleOf(arcByNode(g, 'A'), 'fill')).toBe('#abcdef');
      expect(styleOf(arcByNode(g, 'B'), 'fill')).toBe('#111111');
    });

    it("gives a ribbon its source node's colour by default", () => {
      const { context, g } = createContext(AB_GRAPH, { seriesColors: ['#111111', '#222222'] });
      renderChordLayer(context);

      expect(styleOf(linkPaths(g)[0], 'fill')).toBe('#111111');
    });

    it('lets a per-link color win, surviving aggregation into the matrix', () => {
      const { context, g } = createContext(
        {
          links: [
            { color: '#ff0000', source: 'A', target: 'B', value: 3 },
            { source: 'A', target: 'B', value: 5 },
          ],
        },
        { seriesColors: ['#111111'] }
      );
      renderChordLayer(context);

      expect(styleOf(linkPaths(g)[0], 'fill')).toBe('#ff0000');
    });
  });

  describe('theme', () => {
    it('applies the default node stroke and link opacity', async () => {
      const { context, g } = createContext(AB_GRAPH);
      renderChordLayer(context);
      await settle();

      expect(styleOf(arcByNode(g, 'A'), 'stroke')).toBe(DEFAULT_CHORD_LAYER_THEME.node.stroke);
      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe(
        String(DEFAULT_CHORD_LAYER_THEME.link.opacity)
      );
    });

    it('merges a partial user theme over the defaults', async () => {
      const { context, g } = createContext(AB_GRAPH, {
        theme: { link: { opacity: 0.9 }, node: { stroke: '#00ff00' } },
      });
      renderChordLayer(context);
      await settle();

      expect(styleOf(arcByNode(g, 'A'), 'stroke')).toBe('#00ff00');
      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe('0.9');
      expect(styleOf(arcByNode(g, 'A'), 'stroke-width')).toBe(
        String(DEFAULT_CHORD_LAYER_THEME.node.strokeWidth)
      );
    });

    it('lifts a hovered link to hover opacity and restores it on leave', async () => {
      const { context, g } = createContext(AB_GRAPH);
      renderChordLayer(context);
      await settle();

      const link = linkPaths(g)[0];
      link.dispatchEvent(new MouseEvent('mouseenter'));
      expect(styleOf(link, 'opacity')).toBe(String(DEFAULT_CHORD_LAYER_THEME.link.opacityHover));

      link.dispatchEvent(new MouseEvent('mouseleave'));
      expect(styleOf(link, 'opacity')).toBe(String(DEFAULT_CHORD_LAYER_THEME.link.opacity));
    });
  });

  describe('ARCH-194 — resting opacity reassert on survivors', () => {
    /**
     * Every fade (link/label opacity in both layouts, plus linear node opacity) enters at 0
     * and transitions toward its resting value ASYNCHRONOUSLY — d3 transitions schedule via
     * a real timer, so nothing observes a frame until one actually ticks. Re-rendering the
     * SAME keyed data immediately (no `await settle()`) therefore always lands before the
     * first frame: the elements now match the UPDATE selection, not `.enter()`, so
     * `.interrupt()` cancels the still-pending fade while it is frozen at its enter-time
     * value (0) — and the ONLY thing that can bring it back to the resting value on that
     * path is the plain `xSel.style('opacity', …)` line. Delete that line and every
     * assertion below reads "0" instead. This is a deterministic instance of "the fade was
     * cut short by a re-render" (AGENTS.md / ARCH-194) — the never-started case rather than
     * a timing-dependent partially-faded one, chosen so the test needs no fake timers.
     */
    it('circular: links and labels reassert full resting opacity on an immediate re-render', () => {
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderChordLayer(context);
      renderChordLayer(context);

      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe(
        String(DEFAULT_CHORD_LAYER_THEME.link.opacity)
      );
      expect(styleOf(labelEls(g)[0], 'opacity')).toBe('1');
    });

    it('linear: links, nodes, and labels reassert full resting opacity on an immediate re-render', () => {
      const { context, g } = createContext(GRAPH, { layout: 'linear', showLabels: true });
      renderChordLayer(context);
      renderChordLayer(context);

      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe(
        String(DEFAULT_CHORD_LAYER_THEME.link.opacity)
      );
      expect(styleOf(nodeCircles(g)[0], 'opacity')).toBe(
        String(DEFAULT_CHORD_LAYER_THEME.node.opacity)
      );
      expect(styleOf(labelEls(g)[0], 'opacity')).toBe('1');
    });
  });

  describe('labels', () => {
    it('draws none by default', () => {
      const { context, g } = createContext(GRAPH);
      renderChordLayer(context);

      expect(labelEls(g)).toHaveLength(0);
    });

    it('draws one per node when showLabels is set (circular and linear)', () => {
      const circular = createContext(GRAPH, { showLabels: true });
      renderChordLayer(circular.context);
      expect(labelEls(circular.g)).toHaveLength(3);

      const linear = createContext(GRAPH, { layout: 'linear', showLabels: true });
      renderChordLayer(linear.context);
      expect(labelEls(linear.g)).toHaveLength(3);
    });

    it('falls back from label to id', () => {
      const { context, g } = createContext(
        {
          links: [{ source: 'A', target: 'B', value: 1 }],
          nodes: [{ id: 'A', label: 'Alpha' }, { id: 'B' }],
        },
        { showLabels: true }
      );
      renderChordLayer(context);

      expect(labelByNode(g, 'A').textContent).toBe('Alpha');
      expect(labelByNode(g, 'B').textContent).toBe('B');
    });

    it('hands formatLabel the summed flow even when the caller set no value', () => {
      const seen: (number | undefined)[] = [];
      const { context } = createContext(AB_GRAPH, {
        formatLabel: d => {
          seen.push(d.value);
          return d.id;
        },
        showLabels: true,
      });
      renderChordLayer(context);

      expect(seen).toContain(10);
      expect(seen.every(v => typeof v === 'number')).toBe(true);
    });

    it("renders formatLabel's return value as the label text, not just calling it with the right args", () => {
      const { context, g } = createContext(AB_GRAPH, {
        formatLabel: d => `${d.id}=${d.value}`,
        showLabels: true,
      });
      renderChordLayer(context);

      expect(labelByNode(g, 'A').textContent).toBe('A=10');
      expect(labelByNode(g, 'B').textContent).toBe('B=4');
    });
  });

  describe('interaction', () => {
    it('emits a tooltip event on ring-arc hover and hides it on leave (circular)', () => {
      const { context, g, onTooltip } = createContext(AB_GRAPH, { tooltip: true });
      renderChordLayer(context);

      arcByNode(g, 'A').dispatchEvent(new MouseEvent('mouseenter'));
      expect(onTooltip).toHaveBeenCalledTimes(1);
      expect(onTooltip.mock.calls[0][0].visible).toBe(true);
      expect(onTooltip.mock.calls[0][0].content).toEqual({ label: 'A', value: 10 });

      arcByNode(g, 'A').dispatchEvent(new MouseEvent('mouseleave'));
      expect(onTooltip.mock.calls[1][0].visible).toBe(false);
    });

    it('emits a tooltip event on node-circle hover (linear)', () => {
      const { context, g, onTooltip } = createContext(AB_GRAPH, {
        layout: 'linear',
        tooltip: true,
      });
      renderChordLayer(context);

      circleByNode(g, 'A').dispatchEvent(new MouseEvent('mouseenter'));
      expect(onTooltip).toHaveBeenCalledTimes(1);
      expect(onTooltip.mock.calls[0][0].content).toEqual({ label: 'A', value: 10 });
    });

    it('fires onClick with the node and its index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(GRAPH, { onClick });
      renderChordLayer(context);

      arcByNode(g, 'B').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data.id).toBe('B');
      expect(onClick.mock.calls[0][0].index).toBe(1);
    });

    it('nulls the tooltip and click handlers when disabled, rather than leaving stale ones', () => {
      const onClick = jest.fn();
      const withHandlers = createContext(GRAPH, { onClick, tooltip: true });
      renderChordLayer(withHandlers.context);

      // Re-render the SAME context with both turned off — a real reconfigure, not a fresh mount.
      withHandlers.context.config.onClick = undefined;
      withHandlers.context.config.tooltip = undefined;
      withHandlers.context.tooltipConfig = undefined;
      withHandlers.context.tooltipHandlers = undefined;
      renderChordLayer(withHandlers.context);

      arcByNode(withHandlers.g, 'A').dispatchEvent(new MouseEvent('click'));
      expect(onClick).not.toHaveBeenCalled();
      expect(styleOf(arcByNode(withHandlers.g, 'A'), 'cursor')).toBe('default');
    });

    it('shows a pointer cursor only when the node is interactive', () => {
      const plain = createContext(GRAPH);
      renderChordLayer(plain.context);
      expect(styleOf(arcByNode(plain.g, 'A'), 'cursor')).toBe('default');

      const clickable = createContext(GRAPH, { onClick: jest.fn() });
      renderChordLayer(clickable.context);
      expect(styleOf(arcByNode(clickable.g, 'A'), 'cursor')).toBe('pointer');
    });

    it('fires onClick with the node and its index (linear)', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(GRAPH, { layout: 'linear', onClick });
      renderChordLayer(context);

      circleByNode(g, 'B').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data.id).toBe('B');
      expect(onClick.mock.calls[0][0].index).toBe(1);
    });

    it('nulls the linear node handlers when disabled, rather than leaving stale ones', () => {
      const onClick = jest.fn();
      const withHandlers = createContext(GRAPH, { layout: 'linear', onClick, tooltip: true });
      renderChordLayer(withHandlers.context);

      // Re-render the SAME context with both turned off — a real reconfigure, not a fresh mount.
      withHandlers.context.config.onClick = undefined;
      withHandlers.context.config.tooltip = undefined;
      withHandlers.context.tooltipConfig = undefined;
      withHandlers.context.tooltipHandlers = undefined;
      renderChordLayer(withHandlers.context);

      circleByNode(withHandlers.g, 'A').dispatchEvent(new MouseEvent('click'));
      expect(onClick).not.toHaveBeenCalled();
      expect(styleOf(circleByNode(withHandlers.g, 'A'), 'cursor')).toBe('default');
    });

    it('shows a pointer cursor only when the linear node is interactive', () => {
      const plain = createContext(GRAPH, { layout: 'linear' });
      renderChordLayer(plain.context);
      expect(styleOf(circleByNode(plain.g, 'A'), 'cursor')).toBe('default');

      const clickable = createContext(GRAPH, { layout: 'linear', onClick: jest.fn() });
      renderChordLayer(clickable.context);
      expect(styleOf(circleByNode(clickable.g, 'A'), 'cursor')).toBe('pointer');
    });
  });

  describe('leaves the caller graph untouched', () => {
    it('does not mutate the input nodes or links', () => {
      const graph: NgeGraph = {
        links: [{ source: 'A', target: 'B', value: 3 }],
        nodes: [{ id: 'A' }, { id: 'B' }],
      };
      const snapshot = JSON.stringify(graph);

      const { context } = createContext(graph);
      renderChordLayer(context);
      renderChordLayer(context);

      expect(JSON.stringify(graph)).toBe(snapshot);
    });
  });

  describe('no doubling on re-render', () => {
    it('updates existing marks in place rather than stacking a second set', () => {
      const { context, g } = createContext(GRAPH);
      renderChordLayer(context);
      renderChordLayer(context);
      renderChordLayer(context);

      expect(arcPaths(g)).toHaveLength(3);
      expect(linkPaths(g)).toHaveLength(3);
    });

    it('removes exited marks after the exit transition', async () => {
      const { context, g } = createContext(GRAPH);
      renderChordLayer(context);
      expect(arcPaths(g)).toHaveLength(3);

      rerender(context, { links: [{ source: 'A', target: 'B', value: 1 }] });
      await settle();

      expect(arcPaths(g)).toHaveLength(2);
      expect(linkPaths(g)).toHaveLength(1);
    });

    it('clears every mark when the graph empties', async () => {
      const { context, g } = createContext(GRAPH);
      renderChordLayer(context);

      rerender(context, { links: [] });
      await settle();

      expect(arcPaths(g)).toHaveLength(0);
      expect(linkPaths(g)).toHaveLength(0);
    });

    it('clears the OLD layout entirely when layout flips at runtime', async () => {
      const { context, g } = createContext(GRAPH, { layout: 'circular' });
      renderChordLayer(context);
      expect(arcPaths(g)).toHaveLength(3);

      context.config.layout = 'linear';
      renderChordLayer(context);
      await settle();

      expect(arcPaths(g)).toHaveLength(0);
      expect(nodeCircles(g)).toHaveLength(3);
    });
  });

  describe('legend / renderer colour parity (ARCH-200 #14)', () => {
    it('colours every node identically to extractChordChartLegendItems', () => {
      // GRAPH supplies no explicit `nodes`, so both this renderer and the legend extractor
      // resolve the node set through the SAME shared `deriveGraphNodes` — the whole point of
      // #14 was making that guaranteed, rather than two independent derivations that could
      // silently drift and leave the legend swatching a colour the chart never drew.
      const seriesColors = ['#111111', '#222222', '#333333'];
      const { context, g } = createContext(GRAPH, { seriesColors });
      renderChordLayer(context);

      const legendItems = extractChordChartLegendItems(GRAPH, seriesColors);
      expect(legendItems).toHaveLength(3);
      for (const item of legendItems) {
        expect(styleOf(arcByNode(g, item.id as string), 'fill')).toBe(item.color);
      }
    });
  });

  describe('sortSubgroups', () => {
    it('accepts ascending / descending / none without throwing', () => {
      for (const sortSubgroups of ['ascending', 'descending', 'none'] as const) {
        const { context } = createContext(GRAPH, { sortSubgroups });
        expect(() => renderChordLayer(context)).not.toThrow();
      }
    });

    it("orders a node's own sub-arcs by value when sortSubgroups is set", () => {
      const fixture: NgeGraph = {
        links: [
          { source: 'A', target: 'B', value: 2 },
          { source: 'A', target: 'C', value: 8 },
          { source: 'A', target: 'D', value: 5 },
        ],
      };

      const ascendingCtx = createContext(fixture, { sortSubgroups: 'ascending' });
      renderChordLayer(ascendingCtx.context);
      const descendingCtx = createContext(fixture, { sortSubgroups: 'descending' });
      renderChordLayer(descendingCtx.context);

      // Every chord touching A contributes exactly one subgroup (its `source` or its
      // `target`) whose `.index` equals A's own group index — collecting those, ordered by
      // where they sit around A's own arc-span (`startAngle`), and reading off each one's
      // value is what actually shows sortSubgroups reordering A's connections, rather than
      // just not throwing when the option is set.
      const subgroupValuesForA = (g: SVGGElement): number[] => {
        const aIndex = datumOf<{ index: number }>(arcByNode(g, 'A')).index;
        return linkPaths(g)
          .map(el =>
            datumOf<{
              source: { index: number; startAngle: number; value: number };
              target: { index: number; startAngle: number; value: number };
            }>(el)
          )
          .flatMap(c => [c.source, c.target])
          .filter(sub => sub.index === aIndex)
          .sort((x, y) => x.startAngle - y.startAngle)
          .map(sub => sub.value);
      };

      expect(subgroupValuesForA(ascendingCtx.g)).toEqual([2, 5, 8]);
      expect(subgroupValuesForA(descendingCtx.g)).toEqual([8, 5, 2]);
    });
  });
});
