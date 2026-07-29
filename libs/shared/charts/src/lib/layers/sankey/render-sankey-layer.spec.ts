import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeGraph, NgeGraphNode, NgeSankeyLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeSankeyLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { DEFAULT_SANKEY_LAYER_THEME } from '../../core/theme';
import { renderSankeyLayer } from './render-sankey-layer';

type SankeyContext = NgeChartLayerContext<
  NgeGraphNode,
  NgeSankeyLayerConfig,
  NgeSankeyLayerTheme | undefined
>;

type ContextOptions = Partial<Omit<NgeSankeyLayerConfig, 'data' | 'renderer' | 'type'>> & {
  dimensions?: Partial<typeof DIMENSIONS>;
  onTooltip?: jest.Mock;
  theme?: NgeSankeyLayerTheme;
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
 * A three-stage household budget: one source, one hub, four sinks. Outflow from `Budget`
 * sums to its 5200 inflow, so the hub's height is unambiguous and each sink's ribbon
 * thickness is directly comparable.
 */
const GRAPH: NgeGraph = {
  links: [
    { source: 'Salary', target: 'Budget', value: 5200 },
    { source: 'Budget', target: 'Housing', value: 2100 },
    { source: 'Budget', target: 'Food', value: 900 },
    { source: 'Budget', target: 'Savings', value: 1400 },
    { source: 'Budget', target: 'Other', value: 800 },
  ],
};

function createContext(
  data: NgeGraph,
  options: ContextOptions = {}
): { context: SankeyContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeSankeyLayerConfig = {
    data,
    formatLabel: options.formatLabel,
    iterations: options.iterations,
    labelColor: options.labelColor,
    labelPadding: options.labelPadding,
    linkShape: options.linkShape,
    nodeAlign: options.nodeAlign,
    nodePadding: options.nodePadding,
    nodeWidth: options.nodeWidth,
    onClick: options.onClick,
    renderer: renderSankeyLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    type: 'sankey',
  };

  // Sankey ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: SankeyContext = {
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

/**
 * d3 transitions run on real timers, so anything applied over a transition — the enter
 * fade-in, the exit removal — is only observable after a delay past the 300ms enter
 * duration. Geometry is applied synchronously and needs no wait.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** Re-render the same layer with a new graph, mirroring how the chart feeds a data change. */
function rerender(context: SankeyContext, data: NgeGraph): void {
  context.config.data = data;
  renderSankeyLayer(context);
}

function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

function nodeRects(g: SVGGElement): SVGRectElement[] {
  return Array.from(g.querySelectorAll<SVGRectElement>('.nge-sankey-node'));
}

function linkPaths(g: SVGGElement): SVGPathElement[] {
  return Array.from(g.querySelectorAll<SVGPathElement>('.nge-sankey-link'));
}

function labels(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-sankey-label'));
}

function nodeIds(g: SVGGElement): string[] {
  return nodeRects(g).map(rect => rect.getAttribute('data-node') ?? '');
}

function nodeById(g: SVGGElement, id: string): SVGRectElement {
  const match = nodeRects(g).find(rect => rect.getAttribute('data-node') === id);
  if (!match) {
    throw new Error(`No sankey node rect for id "${id}"`);
  }
  return match;
}

function rectOf(el: Element): { height: number; width: number; x: number; y: number } {
  return {
    height: Number(el.getAttribute('height')),
    width: Number(el.getAttribute('width')),
    x: Number(el.getAttribute('x')),
    y: Number(el.getAttribute('y')),
  };
}

/** Every numeric token in a path's `d`, as (x, y) pairs. */
function pathPoints(el: Element): [number, number][] {
  const numbers = (el.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? [];
  const points: [number, number][] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    points.push([Number(numbers[i]), Number(numbers[i + 1])]);
  }
  return points;
}

/**
 * A ribbon's thickness at its source end — the vertical gap between the first point (top
 * edge) and the last point (bottom edge), both of which sit on the source node's right face.
 */
function ribbonThickness(el: Element): number {
  const points = pathPoints(el);
  return Math.abs(points[points.length - 1][1] - points[0][1]);
}

describe('renderSankeyLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('layout', () => {
    it('draws one rect per node and one ribbon per link', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      expect(nodeRects(g)).toHaveLength(6);
      expect(linkPaths(g)).toHaveLength(5);
    });

    it('derives the node set from link endpoints in first-seen order when nodes are omitted', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      expect(nodeIds(g)).toEqual(['Salary', 'Budget', 'Housing', 'Food', 'Savings', 'Other']);
    });

    it('honours an explicit node set, including a node no link touches', () => {
      const { context, g } = createContext({
        links: GRAPH.links,
        nodes: [
          { id: 'Salary' },
          { id: 'Budget' },
          { id: 'Housing' },
          { id: 'Food' },
          { id: 'Savings' },
          { id: 'Other' },
          { id: 'Unused' },
        ],
      });
      renderSankeyLayer(context);

      expect(nodeIds(g)).toContain('Unused');
      expect(nodeRects(g)).toHaveLength(7);
    });

    it('stages nodes into columns by depth', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      const salary = rectOf(nodeById(g, 'Salary')).x;
      const budget = rectOf(nodeById(g, 'Budget')).x;
      const housing = rectOf(nodeById(g, 'Housing')).x;

      expect(salary).toBeLessThan(budget);
      expect(budget).toBeLessThan(housing);
    });

    it('sizes a node rect from its summed flow', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      const housing = rectOf(nodeById(g, 'Housing')).height;
      const other = rectOf(nodeById(g, 'Other')).height;

      // Housing (2100) carries a little over 2.6x Other's flow (800).
      expect(housing / other).toBeCloseTo(2100 / 800, 1);
    });

    it('scales ribbon thickness with link value', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      const paths = linkPaths(g);
      const housing = ribbonThickness(paths[1]);
      const other = ribbonThickness(paths[4]);

      expect(housing / other).toBeCloseTo(2100 / 800, 1);
    });

    it('applies nodeWidth and nodePadding', () => {
      const { context, g } = createContext(GRAPH, { nodePadding: 20, nodeWidth: 30 });
      renderSankeyLayer(context);

      expect(rectOf(nodeById(g, 'Budget')).width).toBe(30);

      // The four sinks share a column, so three 20px gaps separate them.
      const sinks = ['Housing', 'Food', 'Savings', 'Other']
        .map(id => rectOf(nodeById(g, id)))
        .sort((a, b) => a.y - b.y);
      for (let i = 1; i < sinks.length; i++) {
        expect(sinks[i].y - (sinks[i - 1].y + sinks[i - 1].height)).toBeCloseTo(20, 5);
      }
    });

    it('pushes sinks to the last column under nodeAlign "justify" but not "left"', () => {
      // `Food` is a sink one hop from the hub; justify drives every sink to the far column,
      // left leaves it in the column its depth alone implies. With a uniform three-stage
      // graph the two agree, so compare against a graph with an EARLY sink.
      const early: NgeGraph = {
        links: [
          { source: 'A', target: 'B', value: 10 },
          { source: 'B', target: 'C', value: 6 },
          { source: 'A', target: 'Leaf', value: 4 },
        ],
      };

      const justify = createContext(early, { nodeAlign: 'justify' });
      renderSankeyLayer(justify.context);
      const justified = rectOf(nodeById(justify.g, 'Leaf')).x;

      const left = createContext(early, { nodeAlign: 'left' });
      renderSankeyLayer(left.context);
      const leftAligned = rectOf(nodeById(left.g, 'Leaf')).x;

      expect(justified).toBeGreaterThan(leftAligned);
    });
  });

  /**
   * The layers group carries a `clip-path` of the plot rect, so a mark drawn outside it is
   * DISCARDED rather than merely tight — and jsdom does not clip, so nothing else in this
   * suite would notice. `AGENTS.md` requires every layer to guard this explicitly.
   */
  describe('stays inside the bounded plot rect', () => {
    it('keeps every mark inside the bounded plot rect', () => {
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderSankeyLayer(context);

      const { boundedHeight, boundedWidth } = DIMENSIONS;

      for (const rect of nodeRects(g)) {
        const { height, width, x, y } = rectOf(rect);
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x + width).toBeLessThanOrEqual(boundedWidth + 0.001);
        expect(y + height).toBeLessThanOrEqual(boundedHeight + 0.001);
      }

      for (const path of linkPaths(g)) {
        for (const [x, y] of pathPoints(path)) {
          expect(x).toBeGreaterThanOrEqual(-0.001);
          expect(y).toBeGreaterThanOrEqual(-0.001);
          expect(x).toBeLessThanOrEqual(boundedWidth + 0.001);
          expect(y).toBeLessThanOrEqual(boundedHeight + 0.001);
        }
      }

      for (const label of labels(g)) {
        const x = Number(label.getAttribute('x'));
        const y = Number(label.getAttribute('y'));
        expect(x).toBeGreaterThanOrEqual(0);
        expect(y).toBeGreaterThanOrEqual(0);
        expect(x).toBeLessThanOrEqual(boundedWidth);
        expect(y).toBeLessThanOrEqual(boundedHeight);
      }
    });

    it('anchors labels inward so neither edge column runs off the plot', () => {
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderSankeyLayer(context);

      const first = labels(g).find(l => l.getAttribute('data-label') === 'Salary');
      const last = labels(g).find(l => l.getAttribute('data-label') === 'Housing');

      // A left-half node is labelled to the RIGHT of its rect, a right-half node to its LEFT.
      expect(first?.getAttribute('text-anchor')).toBe('start');
      expect(last?.getAttribute('text-anchor')).toBe('end');
    });
  });

  describe('linkShape', () => {
    it('draws cubic ribbons by default', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      expect(linkPaths(g)[0].getAttribute('d')).toContain('C');
    });

    it('draws straight-sided bands under "parallelogram" — the Parallel Sets reading', () => {
      const { context, g } = createContext(GRAPH, { linkShape: 'parallelogram' });
      renderSankeyLayer(context);

      const d = linkPaths(g)[0].getAttribute('d') ?? '';
      expect(d).not.toContain('C');
      expect(d).toContain('L');
    });

    it('gives both shapes vertical ends, so a ribbon meets its node square on', () => {
      for (const linkShape of ['curve', 'parallelogram'] as const) {
        const { context, g } = createContext(GRAPH, { linkShape });
        renderSankeyLayer(context);

        const points = pathPoints(linkPaths(g)[0]);
        // First and last points share the source node's right face; the two middle-of-path
        // target points share the target node's left face.
        expect(points[0][0]).toBeCloseTo(points[points.length - 1][0], 5);
      }
    });
  });

  /**
   * `d3-sankey` rewrites each link's `source` / `target` id into a resolved node object and
   * writes geometry onto both sets. A render fn runs on every state change, so it works on a
   * copy — otherwise the caller's own config object is corrupted by the first paint.
   */
  describe('leaves the caller graph untouched', () => {
    it('does not mutate the input links or nodes', () => {
      const graph: NgeGraph = {
        links: [{ source: 'A', target: 'B', value: 3 }],
        nodes: [{ id: 'A' }, { id: 'B' }],
      };
      const snapshot = JSON.stringify(graph);

      const { context } = createContext(graph);
      renderSankeyLayer(context);
      renderSankeyLayer(context);

      expect(typeof graph.links[0].source).toBe('string');
      expect(JSON.stringify(graph)).toBe(snapshot);
    });

    /**
     * A re-render must UPDATE the marks already on the page, never stack a second set on top
     * of them. The join key therefore has to be readable off the datum: d3 runs the key
     * accessor over the bound elements using the datum from the PREVIOUS render, so a key
     * resolved through a side table built this render comes back undefined for every existing
     * mark and the whole selection re-enters. That doubles the ribbons on every resize.
     */
    it('updates the existing marks on a repeat call instead of stacking a second set', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);
      const first = linkPaths(g).map(p => p.getAttribute('d'));

      renderSankeyLayer(context);
      renderSankeyLayer(context);
      const second = linkPaths(g).map(p => p.getAttribute('d'));

      expect(linkPaths(g)).toHaveLength(GRAPH.links.length);
      expect(nodeRects(g)).toHaveLength(6);
      expect(second).toEqual(first);
    });
  });

  describe('joins', () => {
    it('keys parallel edges between the same pair distinctly', () => {
      const { context, g } = createContext({
        links: [
          { source: 'A', target: 'B', value: 3 },
          { source: 'A', target: 'B', value: 5 },
        ],
      });
      renderSankeyLayer(context);

      const keys = linkPaths(g).map(p => p.getAttribute('data-link'));
      expect(keys).toEqual(['A->B', 'A->B#1']);
    });

    it('updates in place rather than duplicating when the graph changes', async () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      rerender(context, {
        links: [
          { source: 'Salary', target: 'Budget', value: 5200 },
          { source: 'Budget', target: 'Housing', value: 3000 },
        ],
      });
      await settle();

      expect(nodeIds(g).sort()).toEqual(['Budget', 'Housing', 'Salary']);
      expect(linkPaths(g)).toHaveLength(2);
    });

    it('removes exited marks after the exit transition', async () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);
      expect(nodeRects(g)).toHaveLength(6);

      rerender(context, { links: [{ source: 'Salary', target: 'Budget', value: 5200 }] });
      await settle();

      expect(nodeRects(g)).toHaveLength(2);
      expect(linkPaths(g)).toHaveLength(1);
    });

    it('paints nodes over links', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      const groups = Array.from(g.querySelectorAll('g')).map(el => el.getAttribute('class'));
      expect(groups.indexOf('nge-sankey-links')).toBeLessThan(groups.indexOf('nge-sankey-nodes'));
    });
  });

  describe('colour', () => {
    it('assigns the palette by node index', () => {
      const { context, g } = createContext(GRAPH, { seriesColors: ['#111111', '#222222'] });
      renderSankeyLayer(context);

      expect(styleOf(nodeById(g, 'Salary'), 'fill')).toBe('#111111');
      expect(styleOf(nodeById(g, 'Budget'), 'fill')).toBe('#222222');
      // Index 2 wraps back to the first entry.
      expect(styleOf(nodeById(g, 'Housing'), 'fill')).toBe('#111111');
    });

    it('lets a per-node color win over the palette', () => {
      const { context, g } = createContext(
        {
          links: [{ source: 'Salary', target: 'Budget', value: 5200 }],
          nodes: [{ color: '#abcdef', id: 'Salary' }, { id: 'Budget' }],
        },
        { seriesColors: ['#111111'] }
      );
      renderSankeyLayer(context);

      expect(styleOf(nodeById(g, 'Salary'), 'fill')).toBe('#abcdef');
      expect(styleOf(nodeById(g, 'Budget'), 'fill')).toBe('#111111');
    });

    it('gives a link its source node colour so a flow reads forward', () => {
      const { context, g } = createContext(GRAPH, { seriesColors: ['#111111', '#222222'] });
      renderSankeyLayer(context);

      // Every Budget-sourced ribbon takes Budget's colour (palette index 1).
      const paths = linkPaths(g);
      expect(styleOf(paths[0], 'fill')).toBe('#111111'); // Salary -> Budget
      expect(styleOf(paths[1], 'fill')).toBe('#222222'); // Budget -> Housing
    });

    it('lets a per-link color win over the source node colour', () => {
      const { context, g } = createContext(
        {
          links: [{ color: '#ff0000', source: 'A', target: 'B', value: 3 }],
        },
        { seriesColors: ['#111111'] }
      );
      renderSankeyLayer(context);

      expect(styleOf(linkPaths(g)[0], 'fill')).toBe('#ff0000');
    });
  });

  describe('labels', () => {
    it('draws none by default', () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);

      expect(labels(g)).toHaveLength(0);
    });

    it('draws one per node when showLabels is set', () => {
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderSankeyLayer(context);

      expect(labels(g)).toHaveLength(6);
    });

    it('falls back from label to id', () => {
      const { context, g } = createContext(
        {
          links: [{ source: 'A', target: 'B', value: 3 }],
          nodes: [{ id: 'A', label: 'Alpha' }, { id: 'B' }],
        },
        { showLabels: true }
      );
      renderSankeyLayer(context);

      const texts = labels(g).map(l => l.textContent);
      expect(texts).toEqual(['Alpha', 'B']);
    });

    it('hands formatLabel the laid-out throughput even when the caller set no value', () => {
      const seen: (number | undefined)[] = [];
      const { context } = createContext(GRAPH, {
        formatLabel: d => {
          seen.push(d.value);
          return d.id;
        },
        showLabels: true,
      });
      renderSankeyLayer(context);

      // Budget's inflow — summed by the layout, never supplied by the caller.
      expect(seen).toContain(5200);
      expect(seen.every(v => typeof v === 'number')).toBe(true);
    });

    it('takes the theme label colour, with config and per-datum rungs overriding it', () => {
      const themed = createContext(GRAPH, { showLabels: true });
      renderSankeyLayer(themed.context);
      expect(styleOf(labels(themed.g)[0], 'fill')).toBe(DEFAULT_SANKEY_LAYER_THEME.label.color);

      const configured = createContext(GRAPH, { labelColor: '#123456', showLabels: true });
      renderSankeyLayer(configured.context);
      expect(styleOf(labels(configured.g)[0], 'fill')).toBe('#123456');

      const perDatum = createContext(
        {
          links: [{ source: 'A', target: 'B', value: 3 }],
          nodes: [{ id: 'A', labelColor: '#654321' }, { id: 'B' }],
        },
        { labelColor: '#123456', showLabels: true }
      );
      renderSankeyLayer(perDatum.context);
      const a = labels(perDatum.g).find(l => l.getAttribute('data-label') === 'A');
      expect(styleOf(a as Element, 'fill')).toBe('#654321');
    });

    it('does not intercept the pointer', () => {
      const { context, g } = createContext(GRAPH, { showLabels: true });
      renderSankeyLayer(context);

      expect(styleOf(labels(g)[0], 'pointer-events')).toBe('none');
    });
  });

  describe('theme', () => {
    it('applies the default node stroke and link opacity', async () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);
      await settle();

      expect(styleOf(nodeById(g, 'Budget'), 'stroke')).toBe(DEFAULT_SANKEY_LAYER_THEME.node.stroke);
      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe(
        String(DEFAULT_SANKEY_LAYER_THEME.link.opacity)
      );
    });

    it('merges a partial user theme over the defaults', async () => {
      const { context, g } = createContext(GRAPH, {
        theme: { link: { opacity: 0.9 }, node: { stroke: '#00ff00' } },
      });
      renderSankeyLayer(context);
      await settle();

      expect(styleOf(nodeById(g, 'Budget'), 'stroke')).toBe('#00ff00');
      expect(styleOf(linkPaths(g)[0], 'opacity')).toBe('0.9');
      // Untouched entries still come from the defaults.
      expect(styleOf(nodeById(g, 'Budget'), 'stroke-width')).toBe(
        String(DEFAULT_SANKEY_LAYER_THEME.node.strokeWidth)
      );
    });

    it('lifts a hovered ribbon to the hover opacity and restores it on leave', async () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);
      await settle();

      const path = linkPaths(g)[0];
      path.dispatchEvent(new MouseEvent('mouseenter'));
      expect(styleOf(path, 'opacity')).toBe(String(DEFAULT_SANKEY_LAYER_THEME.link.opacityHover));

      path.dispatchEvent(new MouseEvent('mouseleave'));
      expect(styleOf(path, 'opacity')).toBe(String(DEFAULT_SANKEY_LAYER_THEME.link.opacity));
    });
  });

  describe('interaction', () => {
    it('emits a tooltip event on node hover and hides it on leave', () => {
      const { context, g, onTooltip } = createContext(GRAPH, { tooltip: true });
      renderSankeyLayer(context);

      nodeById(g, 'Budget').dispatchEvent(new MouseEvent('mouseenter'));
      expect(onTooltip).toHaveBeenCalledTimes(1);

      const event = onTooltip.mock.calls[0][0];
      expect(event.visible).toBe(true);
      expect(event.content).toEqual({ label: 'Budget', value: 5200 });

      nodeById(g, 'Budget').dispatchEvent(new MouseEvent('mouseleave'));
      expect(onTooltip.mock.calls[1][0].visible).toBe(false);
    });

    it('keeps the tooltip bubble on the canvas for an edge-column node', () => {
      const { context, g, onTooltip } = createContext(GRAPH, { tooltip: true });
      renderSankeyLayer(context);

      nodeById(g, 'Salary').dispatchEvent(new MouseEvent('mouseenter'));
      const { x, y } = onTooltip.mock.calls[0][0].position;

      expect(x).toBeGreaterThanOrEqual(context.margins.left);
      expect(y).toBeGreaterThanOrEqual(0);
    });

    it('fires onClick with the node and its index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(GRAPH, { onClick });
      renderSankeyLayer(context);

      nodeById(g, 'Housing').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data.id).toBe('Housing');
      expect(onClick.mock.calls[0][0].index).toBe(2);
    });

    it('shows a pointer cursor only when the node is interactive', () => {
      const plain = createContext(GRAPH);
      renderSankeyLayer(plain.context);
      expect(styleOf(nodeById(plain.g, 'Budget'), 'cursor')).toBe('default');

      const clickable = createContext(GRAPH, { onClick: jest.fn() });
      renderSankeyLayer(clickable.context);
      expect(styleOf(nodeById(clickable.g, 'Budget'), 'cursor')).toBe('pointer');
    });
  });

  describe('degenerate input', () => {
    it('renders nothing for an empty link set', () => {
      const { context, g } = createContext({ links: [] });
      renderSankeyLayer(context);

      expect(nodeRects(g)).toHaveLength(0);
      expect(linkPaths(g)).toHaveLength(0);
    });

    it('renders nothing before the container has been measured', () => {
      const { context, g } = createContext(GRAPH, {
        dimensions: { boundedHeight: 0, boundedWidth: 0 },
      });
      renderSankeyLayer(context);

      expect(nodeRects(g)).toHaveLength(0);
    });

    it('clears existing marks when the graph empties', async () => {
      const { context, g } = createContext(GRAPH);
      renderSankeyLayer(context);
      expect(nodeRects(g)).toHaveLength(6);

      rerender(context, { links: [] });
      await settle();

      expect(nodeRects(g)).toHaveLength(0);
      expect(linkPaths(g)).toHaveLength(0);
    });

    it('drops the marks instead of throwing on a cyclic graph', () => {
      const { context, g } = createContext({
        links: [
          { source: 'A', target: 'B', value: 1 },
          { source: 'B', target: 'A', value: 1 },
        ],
      });

      expect(() => renderSankeyLayer(context)).not.toThrow();
      expect(nodeRects(g)).toHaveLength(0);
    });

    it('drops the marks instead of throwing when a link names an unknown node', () => {
      const { context, g } = createContext({
        links: [{ source: 'A', target: 'Ghost', value: 1 }],
        nodes: [{ id: 'A' }, { id: 'B' }],
      });

      expect(() => renderSankeyLayer(context)).not.toThrow();
      expect(nodeRects(g)).toHaveLength(0);
    });
  });
});
