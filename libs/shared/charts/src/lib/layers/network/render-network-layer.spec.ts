import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeGraph, NgeGraphNode, NgeNetworkLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeNetworkLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { DEFAULT_NETWORK_LAYER_THEME } from '../../core/theme';
import { renderNetworkLayer } from './render-network-layer';

type NetworkContext = NgeChartLayerContext<
  NgeGraphNode,
  NgeNetworkLayerConfig,
  NgeNetworkLayerTheme | undefined
>;

type ContextOptions = Partial<Omit<NgeNetworkLayerConfig, 'data' | 'renderer' | 'type'>> & {
  dimensions?: Partial<typeof DIMENSIONS>;
  onTooltip?: jest.Mock;
  theme?: NgeNetworkLayerTheme;
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
 * Three nodes, three links. Every value is distinct so colour / size assertions below are
 * unambiguous, and the triangle means no node is isolated.
 */
const GRAPH: NgeGraph = {
  links: [
    { source: 'A', target: 'B', value: 10 },
    { source: 'B', target: 'C', value: 6 },
    { source: 'A', target: 'C', value: 2 },
  ],
};

/** The same graph with explicit roles — what the `'cluster'` and `'hive'` layouts arrange by. */
const GROUPED_GRAPH: NgeGraph = {
  links: GRAPH.links,
  nodes: [
    { group: 'core', id: 'A', label: 'Alpha' },
    { group: 'edge', id: 'B', label: 'Bravo' },
    { group: 'edge', id: 'C', label: 'Charlie' },
  ],
};

function createContext(
  data: NgeGraph,
  options: ContextOptions = {}
): { context: NetworkContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeNetworkLayerConfig = {
    axisCount: options.axisCount,
    charge: options.charge,
    clusterStrength: options.clusterStrength,
    data,
    directed: options.directed,
    formatLabel: options.formatLabel,
    innerRadius: options.innerRadius,
    labelColor: options.labelColor,
    labelPadding: options.labelPadding,
    layout: options.layout,
    linkDistance: options.linkDistance,
    maxNodeRadius: options.maxNodeRadius,
    minNodeRadius: options.minNodeRadius,
    onClick: options.onClick,
    radiusRatio: options.radiusRatio,
    renderer: renderNetworkLayer,
    seed: options.seed,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    tickCount: options.tickCount,
    type: 'network',
  };

  // Network ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: NetworkContext = {
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

function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

function nodeCircles(g: SVGGElement): SVGCircleElement[] {
  return Array.from(g.querySelectorAll<SVGCircleElement>('.nge-network-node'));
}

function linkPaths(g: SVGGElement): SVGPathElement[] {
  return Array.from(g.querySelectorAll<SVGPathElement>('.nge-network-link'));
}

function labelEls(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-network-label'));
}

function axisPaths(g: SVGGElement): SVGPathElement[] {
  return Array.from(g.querySelectorAll<SVGPathElement>('.nge-network-axis'));
}

function circleByNode(g: SVGGElement, id: string): SVGCircleElement {
  const match = nodeCircles(g).find(el => el.getAttribute('data-node') === id);
  if (!match) {
    throw new Error(`No network node circle for "${id}"`);
  }
  return match;
}

function labelByNode(g: SVGGElement, id: string): SVGTextElement {
  const match = labelEls(g).find(el => el.getAttribute('data-label') === id);
  if (!match) {
    throw new Error(`No network label for node "${id}"`);
  }
  return match;
}

/** Numeric attribute, throwing rather than defaulting so a missing attr fails loudly. */
function numAttr(el: Element, name: string): number {
  const raw = el.getAttribute(name);
  if (raw === null) {
    throw new Error(`numAttr: <${el.nodeName}> has no "${name}"`);
  }
  return Number(raw);
}

/**
 * Every coordinate pair in a path's `d`. The layer emits only `M`, `L` and `Q` commands, all
 * with absolute coordinates, so a flat scan of number pairs is exact — no arc-flag operands to
 * misread as coordinates.
 */
function pathPoints(el: Element): { x: number; y: number }[] {
  const numbers = (el.getAttribute('d') ?? '').match(/-?[\d.]+(?:e[-+]?\d+)?/gi) ?? [];
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push({ x: Number(numbers[i]), y: Number(numbers[i + 1]) });
  }
  return points;
}

/**
 * d3 transitions run on real timers; opacity is the only property this layer transitions, so a
 * real delay past the enter duration is needed before resting opacity is observable. Geometry,
 * fills and handlers all apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

function rerender(context: NetworkContext, data: NgeGraph): void {
  context.config.data = data;
  renderNetworkLayer(context);
}

describe('renderNetworkLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('degenerate input', () => {
    it('renders nothing for an empty graph', () => {
      const { context, g } = createContext({ links: [] });
      renderNetworkLayer(context);

      expect(nodeCircles(g)).toHaveLength(0);
      expect(linkPaths(g)).toHaveLength(0);
    });

    it('renders nothing before the container has been measured', () => {
      const { context, g } = createContext(GRAPH, {
        dimensions: { boundedHeight: 0, boundedWidth: 0 },
      });
      renderNetworkLayer(context);

      expect(nodeCircles(g)).toHaveLength(0);
    });

    it('draws isolated nodes — a graph with nodes and no links is legitimate here', () => {
      // The flow layers bail on an empty link set; a network of people who happen to share no
      // relationship is still a network, so this layer tests the NODE set instead.
      const { context, g } = createContext({ links: [], nodes: [{ id: 'A' }, { id: 'B' }] });
      renderNetworkLayer(context);

      expect(nodeCircles(g)).toHaveLength(2);
      expect(linkPaths(g)).toHaveLength(0);
    });

    it('drops a link naming an unknown endpoint instead of throwing', () => {
      const { context, g } = createContext({
        links: [
          { source: 'A', target: 'B', value: 1 },
          { source: 'A', target: 'GHOST', value: 1 },
        ],
        nodes: [{ id: 'A' }, { id: 'B' }],
      });

      expect(() => renderNetworkLayer(context)).not.toThrow();
      expect(linkPaths(g)).toHaveLength(1);
      expect(nodeCircles(g)).toHaveLength(2);
    });

    it('never throws on an all-zero-value graph', () => {
      const { context, g } = createContext({
        links: [
          { source: 'A', target: 'B', value: 0 },
          { source: 'B', target: 'C', value: 0 },
        ],
      });

      expect(() => renderNetworkLayer(context)).not.toThrow();
      expect(nodeCircles(g)).toHaveLength(3);
    });

    it('clears every mark when the graph empties out', () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);
      expect(nodeCircles(g)).toHaveLength(3);

      rerender(context, { links: [] });

      expect(nodeCircles(g)).toHaveLength(0);
      expect(linkPaths(g)).toHaveLength(0);
    });
  });

  describe('graph adapter', () => {
    it('derives the node set from link endpoints in first-seen order when nodes are omitted', () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);

      expect(nodeCircles(g).map(el => el.getAttribute('data-node'))).toEqual(['A', 'B', 'C']);
    });

    it('honours an explicit node set, including a node no link touches', () => {
      const { context, g } = createContext({
        links: [{ source: 'A', target: 'B', value: 1 }],
        nodes: [{ id: 'B' }, { id: 'A' }, { id: 'ORPHAN' }],
      });
      renderNetworkLayer(context);

      expect(nodeCircles(g).map(el => el.getAttribute('data-node'))).toEqual(['B', 'A', 'ORPHAN']);
    });

    it('does not mutate the caller’s graph, so a config object stays reusable', () => {
      // `d3-force` writes `x` / `y` / `vx` / `index` onto whatever node objects it is handed.
      const nodes = [{ id: 'A' }, { id: 'B' }];
      const data: NgeGraph = { links: [{ source: 'A', target: 'B', value: 1 }], nodes };
      const { context } = createContext(data);
      renderNetworkLayer(context);

      expect(nodes).toEqual([{ id: 'A' }, { id: 'B' }]);
      expect(data.links[0]).toEqual({ source: 'A', target: 'B', value: 1 });
    });

    it('gives parallel links between the same pair distinct join keys', () => {
      // One shared key would bind two marks to one datum and silently drop an edge.
      const { context, g } = createContext({
        links: [
          { source: 'A', target: 'B', value: 1 },
          { source: 'A', target: 'B', value: 2 },
        ],
      });
      renderNetworkLayer(context);

      const keys = linkPaths(g).map(el => el.getAttribute('data-link'));
      expect(keys).toHaveLength(2);
      expect(new Set(keys).size).toBe(2);
    });
  });

  describe('force layout — Network Visualisation (default)', () => {
    it('draws one circle per node and one path per link', () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);

      expect(nodeCircles(g)).toHaveLength(3);
      expect(linkPaths(g)).toHaveLength(3);
    });

    it('draws no axes — those belong to the hive layout alone', () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);

      expect(axisPaths(g)).toHaveLength(0);
    });

    it('sizes each circle in proportion to its magnitude', () => {
      const { context, g } = createContext({
        links: [{ source: 'big', target: 'small', value: 1 }],
        nodes: [
          { id: 'big', value: 100 },
          { id: 'small', value: 1 },
        ],
      });
      renderNetworkLayer(context);

      expect(numAttr(circleByNode(g, 'big'), 'r')).toBeGreaterThan(
        numAttr(circleByNode(g, 'small'), 'r')
      );
    });

    it('re-renders idempotently (keyed by node id)', () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);
      renderNetworkLayer(context);
      renderNetworkLayer(context);

      expect(nodeCircles(g)).toHaveLength(3);
      expect(linkPaths(g)).toHaveLength(3);
    });

    it('settles into the same picture on every render', () => {
      // The whole point of solving stopped with a fixed tick count off a seeded generator: a
      // re-render must not shuffle the graph under the reader.
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);
      const first = nodeCircles(g).map(el => [numAttr(el, 'cx'), numAttr(el, 'cy')]);

      renderNetworkLayer(context);
      const second = nodeCircles(g).map(el => [numAttr(el, 'cx'), numAttr(el, 'cy')]);

      expect(second).toEqual(first);
    });

    it('draws the same picture in a second, independent chart', () => {
      const a = createContext(GRAPH);
      const b = createContext(GRAPH);
      renderNetworkLayer(a.context);
      renderNetworkLayer(b.context);

      expect(nodeCircles(b.g).map(el => numAttr(el, 'cx'))).toEqual(
        nodeCircles(a.g).map(el => numAttr(el, 'cx'))
      );
    });

    it('re-rolls the arrangement when the seed changes', () => {
      const a = createContext(GRAPH, { seed: 1 });
      const b = createContext(GRAPH, { seed: 999 });
      renderNetworkLayer(a.context);
      renderNetworkLayer(b.context);

      expect(nodeCircles(b.g).map(el => numAttr(el, 'cx'))).not.toEqual(
        nodeCircles(a.g).map(el => numAttr(el, 'cx'))
      );
    });
  });

  describe('stays inside the bounded plot rect', () => {
    // ⚠️ The layers group is CLIPPED and jsdom does not clip, so a mark outside these bounds
    // vanishes in the browser while every count-based assertion above still passes. `d3-force`
    // has no extent of its own, which is exactly why this guard exists (ARCH-197's rule).
    it.each(['force', 'cluster', 'hive'] as const)(
      'keeps every %s node circle fully inside the rect',
      layout => {
        const { context, g } = createContext(GROUPED_GRAPH, { layout });
        renderNetworkLayer(context);

        for (const el of nodeCircles(g)) {
          const [cx, cy, r] = [numAttr(el, 'cx'), numAttr(el, 'cy'), numAttr(el, 'r')];
          expect(cx - r).toBeGreaterThanOrEqual(0);
          expect(cx + r).toBeLessThanOrEqual(DIMENSIONS.boundedWidth);
          expect(cy - r).toBeGreaterThanOrEqual(0);
          expect(cy + r).toBeLessThanOrEqual(DIMENSIONS.boundedHeight);
        }
      }
    );

    it.each(['force', 'cluster', 'hive'] as const)(
      'keeps every %s link path inside the rect',
      layout => {
        const { context, g } = createContext(GROUPED_GRAPH, { layout });
        renderNetworkLayer(context);

        for (const el of linkPaths(g)) {
          for (const { x, y } of pathPoints(el)) {
            expect(x).toBeGreaterThanOrEqual(0);
            expect(x).toBeLessThanOrEqual(DIMENSIONS.boundedWidth);
            expect(y).toBeGreaterThanOrEqual(0);
            expect(y).toBeLessThanOrEqual(DIMENSIONS.boundedHeight);
          }
        }
      }
    );

    it('keeps the hive axes inside the rect, label reserve and all', () => {
      const { context, g } = createContext(GROUPED_GRAPH, { layout: 'hive', showLabels: true });
      renderNetworkLayer(context);

      expect(axisPaths(g).length).toBeGreaterThan(0);
      for (const el of axisPaths(g)) {
        for (const { x, y } of pathPoints(el)) {
          expect(x).toBeGreaterThanOrEqual(0);
          expect(x).toBeLessThanOrEqual(DIMENSIONS.boundedWidth);
          expect(y).toBeGreaterThanOrEqual(0);
          expect(y).toBeLessThanOrEqual(DIMENSIONS.boundedHeight);
        }
      }
    });

    it('keeps every node label anchored inside the rect', () => {
      const { context, g } = createContext(GROUPED_GRAPH, { showLabels: true });
      renderNetworkLayer(context);

      for (const el of labelEls(g)) {
        expect(numAttr(el, 'x')).toBeGreaterThanOrEqual(0);
        expect(numAttr(el, 'x')).toBeLessThanOrEqual(DIMENSIONS.boundedWidth);
        expect(numAttr(el, 'y')).toBeGreaterThanOrEqual(0);
        expect(numAttr(el, 'y')).toBeLessThanOrEqual(DIMENSIONS.boundedHeight);
      }
    });

    it('flips a label to the left of its node rather than letting it overhang the right edge', () => {
      // Real defect shape, borrowed from the chord layer's clipped endpoint label: the clip
      // silently discards whichever end overhangs, and jsdom neither lays text out nor clips.
      const { context, g } = createContext(
        {
          links: [{ source: 'A', target: 'B', value: 1 }],
          nodes: [{ id: 'A', label: 'A very long node label indeed' }, { id: 'B' }],
        },
        { showLabels: true }
      );
      renderNetworkLayer(context);

      for (const el of labelEls(g)) {
        const anchor = el.getAttribute('text-anchor');
        const x = numAttr(el, 'x');
        // Whichever side it chose, the label must run INTO the plot, not out of it.
        expect(anchor === 'end' || anchor === 'start').toBe(true);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(DIMENSIONS.boundedWidth);
      }
    });
  });

  describe('hive layout — Hive Plot', () => {
    it('draws one axis per configured axis and seats every node on one', () => {
      const { context, g } = createContext(GROUPED_GRAPH, { axisCount: 3, layout: 'hive' });
      renderNetworkLayer(context);

      expect(axisPaths(g)).toHaveLength(3);
      expect(nodeCircles(g)).toHaveLength(3);
    });

    it('names an axis only when the graph named the group it stands for', () => {
      const named = createContext(GROUPED_GRAPH, { axisCount: 2, layout: 'hive' });
      renderNetworkLayer(named.context);

      const ungrouped = createContext(GRAPH, { axisCount: 2, layout: 'hive' });
      renderNetworkLayer(ungrouped.context);

      expect(
        Array.from(named.g.querySelectorAll('.nge-network-axis-label')).map(el => el.textContent)
      ).toEqual(['core', 'edge']);
      // The degree-tertile fallback has no meaningful name; inventing "Axis 2" would read as data.
      expect(ungrouped.g.querySelectorAll('.nge-network-axis-label')).toHaveLength(0);
    });

    it("places an axis name clear of the outermost node's own label", () => {
      // Real defect, found by driving the chart in a browser: the axis name sat at
      // `outerRadius + labelPadding`, which is exactly where the outermost node's label STARTS,
      // so the axis "Edge" and the node "Gateway" printed on top of each other as one smear.
      // jsdom neither lays text out nor detects overlap, so the whole suite stayed green.
      //
      // `measureLabelWidth` degrades to `length × fontSize × 0.6` under jsdom, which is enough
      // to assert the RELATIONSHIP even though the absolute pixels are synthetic: the axis name
      // must sit at least one label-width past the end of its own axis.
      const { context, g } = createContext(GROUPED_GRAPH, {
        axisCount: 2,
        layout: 'hive',
        showLabels: true,
      });
      renderNetworkLayer(context);

      const center = { x: DIMENSIONS.boundedWidth / 2, y: DIMENSIONS.boundedHeight / 2 };
      const distance = (x: number, y: number): number => Math.hypot(x - center.x, y - center.y);

      const axisLabels = Array.from(g.querySelectorAll<SVGTextElement>('.nge-network-axis-label'));
      expect(axisLabels.length).toBeGreaterThan(0);

      for (const label of axisLabels) {
        const index = label.getAttribute('data-axis-label');
        const axis = axisPaths(g).find(el => el.getAttribute('data-axis') === index)!;
        // The axis path's far end — the greater of its two points' distances from centre.
        const axisEnd = Math.max(...pathPoints(axis).map(p => distance(p.x, p.y)));
        const labelAt = distance(numAttr(label, 'x'), numAttr(label, 'y'));

        // The longest node label here is "Charlie" (7 chars) → 7 × 10 × 0.6 = 42px under the
        // jsdom fallback. The gap must cover it, not merely the 6px labelPadding.
        expect(labelAt - axisEnd).toBeGreaterThan(40);
      }
    });

    it('bows a connection off the straight chord so parallel-axis edges stay distinguishable', () => {
      // Straight chords between the same two axes overlap exactly, collapsing a hive plot into
      // a triangle of solid lines — the curve is the chart type, not decoration.
      const { context, g } = createContext(GROUPED_GRAPH, { layout: 'hive' });
      renderNetworkLayer(context);

      for (const el of linkPaths(g)) {
        expect(el.getAttribute('d')).toContain('Q');
      }
    });

    it('draws straight connections in the force layouts', () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);

      for (const el of linkPaths(g)) {
        expect(el.getAttribute('d')).toContain('L');
        expect(el.getAttribute('d')).not.toContain('Q');
      }
    });

    it('shrinks the plot when radiusRatio narrows it', () => {
      const full = createContext(GROUPED_GRAPH, { layout: 'hive' });
      const half = createContext(GROUPED_GRAPH, { layout: 'hive', radiusRatio: 0.5 });
      renderNetworkLayer(full.context);
      renderNetworkLayer(half.context);

      const spanOf = (g: SVGGElement): number => {
        const xs = axisPaths(g).flatMap(el => pathPoints(el).map(p => p.x));
        return Math.max(...xs) - Math.min(...xs);
      };

      expect(spanOf(half.g)).toBeLessThan(spanOf(full.g));
    });

    it('clears the previous geometry when the layout flips at runtime', () => {
      // The two geometries use the same mark classes, so a stale axis from a previous hive
      // render would otherwise survive into a force render with nothing looking for it.
      const { context, g } = createContext(GROUPED_GRAPH, { layout: 'hive' });
      renderNetworkLayer(context);
      expect(axisPaths(g).length).toBeGreaterThan(0);

      context.config.layout = 'force';
      renderNetworkLayer(context);

      expect(axisPaths(g)).toHaveLength(0);
      expect(nodeCircles(g)).toHaveLength(3);
    });
  });

  describe('directed — the Sociogram convention', () => {
    it('draws no arrowheads by default', () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);

      expect(g.querySelectorAll('marker.nge-network-arrow')).toHaveLength(0);
      expect(linkPaths(g).every(el => el.getAttribute('marker-end') === null)).toBe(true);
    });

    it('marks every link’s target end when directed', () => {
      const { context, g } = createContext(GRAPH, { directed: true });
      renderNetworkLayer(context);

      for (const el of linkPaths(g)) {
        expect(el.getAttribute('marker-end')).toMatch(/^url\(#nge-network-arrow-\d+-\d+\)$/);
      }
    });

    it('gives each link colour its own marker, so an arrowhead matches its edge', () => {
      const { context, g } = createContext(GRAPH, {
        directed: true,
        seriesColors: ['#ff0000', '#00ff00', '#0000ff'],
      });
      renderNetworkLayer(context);

      const markers = Array.from(g.querySelectorAll('marker.nge-network-arrow path'));
      const fills = markers.map(el => styleOf(el, 'fill'));

      // A always sources two links, B one — two distinct source colours, so two markers.
      expect(new Set(fills).size).toBe(markers.length);
      expect(fills).toContain('#ff0000');
    });

    it('gives two charts on one page distinct marker ids', () => {
      // `url(#id)` resolves to whichever chart mounted first otherwise — a Storybook docs page
      // routinely renders a dozen.
      const a = createContext(GRAPH, { directed: true });
      const b = createContext(GRAPH, { directed: true });
      renderNetworkLayer(a.context);
      renderNetworkLayer(b.context);

      const idsOf = (g: SVGGElement): string[] =>
        Array.from(g.querySelectorAll('marker.nge-network-arrow')).map(
          el => el.getAttribute('id') ?? ''
        );

      expect(idsOf(a.g).some(id => idsOf(b.g).includes(id))).toBe(false);
    });

    it('keeps its marker prefix stable across re-renders', () => {
      const { context, g } = createContext(GRAPH, { directed: true });
      renderNetworkLayer(context);
      const first = g.querySelector('marker.nge-network-arrow')?.getAttribute('id');

      renderNetworkLayer(context);

      expect(g.querySelector('marker.nge-network-arrow')?.getAttribute('id')).toBe(first);
    });

    it('removes the markers when directed is turned back off', () => {
      const { context, g } = createContext(GRAPH, { directed: true });
      renderNetworkLayer(context);
      expect(g.querySelectorAll('marker.nge-network-arrow').length).toBeGreaterThan(0);

      context.config.directed = false;
      renderNetworkLayer(context);

      expect(g.querySelectorAll('marker.nge-network-arrow')).toHaveLength(0);
    });
  });

  describe('color', () => {
    it('assigns the node palette by node index', () => {
      const { context, g } = createContext(GRAPH, {
        seriesColors: ['#ff0000', '#00ff00', '#0000ff'],
      });
      renderNetworkLayer(context);

      expect(styleOf(circleByNode(g, 'A'), 'fill')).toBe('#ff0000');
      expect(styleOf(circleByNode(g, 'B'), 'fill')).toBe('#00ff00');
      expect(styleOf(circleByNode(g, 'C'), 'fill')).toBe('#0000ff');
    });

    it('lets a per-node color win over the palette', () => {
      const { context, g } = createContext({
        links: GRAPH.links,
        nodes: [{ color: '#123456', id: 'A' }, { id: 'B' }, { id: 'C' }],
      });
      renderNetworkLayer(context);

      expect(styleOf(circleByNode(g, 'A'), 'fill')).toBe('#123456');
    });

    it("gives a link its source node's colour by default", () => {
      const { context, g } = createContext(GRAPH, {
        seriesColors: ['#ff0000', '#00ff00', '#0000ff'],
      });
      renderNetworkLayer(context);

      const aToB = linkPaths(g).find(el => el.getAttribute('data-link') === 'A->B');
      expect(styleOf(aToB!, 'stroke')).toBe('#ff0000');
    });

    it('lets a per-link color win', () => {
      const { context, g } = createContext({
        links: [{ color: '#abcdef', source: 'A', target: 'B', value: 1 }],
      });
      renderNetworkLayer(context);

      expect(styleOf(linkPaths(g)[0], 'stroke')).toBe('#abcdef');
    });
  });

  describe('theme', () => {
    it('applies the default node stroke and link opacity', async () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);
      await settle();

      expect(styleOf(nodeCircles(g)[0], 'stroke')).toBe(DEFAULT_NETWORK_LAYER_THEME.node.stroke);
      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe(
        String(DEFAULT_NETWORK_LAYER_THEME.link.opacity)
      );
    });

    it('merges a partial user theme over the defaults', async () => {
      const { context, g } = createContext(GRAPH, {
        theme: { link: { opacity: 0.9 }, node: { stroke: '#000000' } },
      });
      renderNetworkLayer(context);
      await settle();

      expect(styleOf(nodeCircles(g)[0], 'stroke')).toBe('#000000');
      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe('0.9');
      // Untouched entries still fall through to the defaults.
      expect(styleOf(linkPaths(g)[0], 'stroke-width')).toBe(
        String(DEFAULT_NETWORK_LAYER_THEME.link.width)
      );
    });

    it('styles the hive axes from the axis slice', () => {
      const { context, g } = createContext(GROUPED_GRAPH, {
        layout: 'hive',
        theme: { axis: { color: '#ff00ff', width: 3 } },
      });
      renderNetworkLayer(context);

      expect(styleOf(axisPaths(g)[0], 'stroke')).toBe('#ff00ff');
      expect(styleOf(axisPaths(g)[0], 'stroke-width')).toBe('3');
    });

    it('lifts a hovered link to hover opacity and restores it on leave', async () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);
      await settle();

      const link = linkPaths(g)[0];
      link.dispatchEvent(new MouseEvent('mouseenter'));
      expect(styleOf(link, 'opacity')).toBe(String(DEFAULT_NETWORK_LAYER_THEME.link.opacityHover));

      link.dispatchEvent(new MouseEvent('mouseleave'));
      expect(styleOf(link, 'opacity')).toBe(String(DEFAULT_NETWORK_LAYER_THEME.link.opacity));
    });
  });

  describe('ARCH-194 — resting opacity reassert on survivors', () => {
    it('reasserts full resting opacity on an immediate re-render', () => {
      // A mark whose fade-in is cut short by a re-render is otherwise stranded at whatever
      // partial opacity it was interrupted at, permanently.
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderNetworkLayer(context);
      renderNetworkLayer(context);

      expect(styleOf(nodeCircles(g)[0], 'opacity')).toBe(
        String(DEFAULT_NETWORK_LAYER_THEME.node.opacity)
      );
      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe(
        String(DEFAULT_NETWORK_LAYER_THEME.link.opacity)
      );
      expect(styleOf(labelEls(g)[0], 'opacity')).toBe('1');
    });

    it('starts an ENTERING node at zero opacity so it has something to fade in from', () => {
      // The complement of the reassert, and the reason resting opacity must stay OFF the merged
      // enter+update selection: setting it there runs before the enter transition reads a
      // starting point, so the mark pops in AND the reassert above becomes untestable dead code
      // (ARCH-200 found exactly that in the chord layer).
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);

      expect(styleOf(nodeCircles(g)[0], 'opacity')).toBe('0');
      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe('0');
    });
  });

  describe('labels', () => {
    it('draws none by default', () => {
      const { context, g } = createContext(GRAPH);
      renderNetworkLayer(context);

      expect(labelEls(g)).toHaveLength(0);
    });

    it('draws one per node when showLabels is set', () => {
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderNetworkLayer(context);

      expect(labelEls(g)).toHaveLength(3);
    });

    it('falls back from label to id', () => {
      const { context, g } = createContext(
        {
          links: [{ source: 'A', target: 'B', value: 1 }],
          nodes: [{ id: 'A', label: 'Alpha' }, { id: 'B' }],
        },
        { showLabels: true }
      );
      renderNetworkLayer(context);

      expect(labelByNode(g, 'A').textContent).toBe('Alpha');
      expect(labelByNode(g, 'B').textContent).toBe('B');
    });

    it("renders formatLabel's return value, not just calling it with the right args", () => {
      const { context, g } = createContext(GRAPH, {
        formatLabel: d => `${d.id}!`,
        showLabels: true,
      });
      renderNetworkLayer(context);

      expect(labelByNode(g, 'A').textContent).toBe('A!');
    });

    it('hands formatLabel the resolved magnitude even when the caller set no value', () => {
      // `NgeGraphNode.value` documents itself as an OUTPUT as much as an input — a caller who
      // supplied only edges must still read a number rather than `undefined`.
      //
      // Asserted on the VALUES the formatter is told, not on a call count: the layer asks it
      // once to measure the label and once to draw it, so a count assertion would be testing an
      // implementation detail. What must hold is that both asks get the same answer — see the
      // sibling test below.
      const seen: (number | undefined)[] = [];
      const { context } = createContext(GRAPH, {
        formatLabel: d => {
          seen.push(d.value);
          return d.id;
        },
        showLabels: true,
      });
      renderNetworkLayer(context);

      // A touches two links, B two, C two.
      expect(seen.length).toBeGreaterThanOrEqual(3);
      expect(new Set(seen)).toEqual(new Set([2]));
    });

    it('measures a label with the SAME text it draws', () => {
      // The hive axis reserve is sized from a measuring pass over `formatLabel`. If that pass
      // asked the formatter a different question than the render does — e.g. handing it the raw
      // node while the render hands it the magnitude-resolved one — a formatter that reads
      // `value` would be measured at one width and drawn at another, and the axis reserve would
      // silently be wrong. Caught while fixing the axis/node label collision.
      const calls: (number | undefined)[] = [];
      const { context, g } = createContext(GROUPED_GRAPH, {
        formatLabel: d => {
          calls.push(d.value);
          return `${d.id}=${d.value}`;
        },
        layout: 'hive',
        showLabels: true,
      });
      renderNetworkLayer(context);

      // Every ask — measuring and drawing alike — saw a resolved number, never `undefined`.
      expect(calls.length).toBeGreaterThan(0);
      expect(calls.every(v => typeof v === 'number')).toBe(true);
      // And the drawn text is the formatter's own output, so measure and render agree.
      expect(labelByNode(g, 'A').textContent).toBe('A=2');
    });

    it('lets a config labelColor override the theme', () => {
      const { context, g } = createContext(GRAPH, {
        labelColor: '#ff0000',
        showLabels: true,
      });
      renderNetworkLayer(context);

      expect(styleOf(labelEls(g)[0], 'fill')).toBe('#ff0000');
    });

    it('lets a per-datum labelColor win over the config', () => {
      const { context, g } = createContext(
        {
          links: GRAPH.links,
          nodes: [{ id: 'A', labelColor: '#00ff00' }, { id: 'B' }, { id: 'C' }],
        },
        { labelColor: '#ff0000', showLabels: true }
      );
      renderNetworkLayer(context);

      expect(styleOf(labelByNode(g, 'A'), 'fill')).toBe('#00ff00');
    });

    it('removes the labels when showLabels is turned back off', async () => {
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderNetworkLayer(context);
      expect(labelEls(g)).toHaveLength(3);

      context.config.showLabels = false;
      renderNetworkLayer(context);
      // Labels leave through an exit transition, so they are gone only after it runs.
      await settle();

      expect(labelEls(g)).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('emits a tooltip on node hover and hides it on leave', () => {
      const { context, g, onTooltip } = createContext(GRAPH, { tooltip: true });
      renderNetworkLayer(context);

      circleByNode(g, 'A').dispatchEvent(new MouseEvent('mouseenter'));
      expect(onTooltip).toHaveBeenCalledWith(expect.objectContaining({ visible: true }));

      circleByNode(g, 'A').dispatchEvent(new MouseEvent('mouseleave'));
      expect(onTooltip).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }));
    });

    it('keeps the tooltip bubble inside the canvas', () => {
      const { context, g, onTooltip } = createContext(GRAPH, { tooltip: true });
      renderNetworkLayer(context);

      for (const el of nodeCircles(g)) {
        el.dispatchEvent(new MouseEvent('mouseenter'));
      }

      for (const [event] of onTooltip.mock.calls) {
        if (!event.visible) {
          continue;
        }
        expect(event.position.x).toBeGreaterThanOrEqual(0);
        expect(event.position.y).toBeGreaterThanOrEqual(0);
      }
    });

    it('reports the resolved magnitude to the tooltip formatter', () => {
      const { context, g, onTooltip } = createContext(GRAPH, { tooltip: true });
      renderNetworkLayer(context);

      circleByNode(g, 'A').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledWith(
        expect.objectContaining({ content: { label: 'A', value: 2 } })
      );
    });

    it('fires onClick with the node datum and its index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(GRAPH, { onClick });
      renderNetworkLayer(context);

      circleByNode(g, 'B').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ id: 'B' }), index: 1 })
      );
    });

    it('shows a pointer cursor only when something is listening', () => {
      const plain = createContext(GRAPH);
      renderNetworkLayer(plain.context);
      expect(styleOf(nodeCircles(plain.g)[0], 'cursor')).toBe('default');

      const clickable = createContext(GRAPH, { onClick: jest.fn() });
      renderNetworkLayer(clickable.context);
      expect(styleOf(nodeCircles(clickable.g)[0], 'cursor')).toBe('pointer');
    });

    it('detaches its handlers when the tooltip is turned off', () => {
      const { context, g, onTooltip } = createContext(GRAPH, { tooltip: true });
      renderNetworkLayer(context);

      context.tooltipConfig = undefined;
      context.tooltipHandlers = undefined;
      renderNetworkLayer(context);
      onTooltip.mockClear();

      circleByNode(g, 'A').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).not.toHaveBeenCalled();
    });
  });
});
