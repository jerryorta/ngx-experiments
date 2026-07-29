import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type {
  NgeHierarchyDatum,
  NgeTreeLayerConfig,
  NgeTreeOrientation,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeTreeLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { DEFAULT_TREE_LAYER_THEME } from '../../core/theme';
import { renderTreeLayer } from './render-tree-layer';
import { computeTreeLayout } from './tree-layout';

type TreeContext = NgeChartLayerContext<
  NgeHierarchyDatum,
  NgeTreeLayerConfig,
  NgeTreeLayerTheme | undefined
>;

type ContextOptions = Partial<Omit<NgeTreeLayerConfig, 'data' | 'renderer' | 'type'>> & {
  dimensions?: Partial<typeof DIMENSIONS>;
  onTooltip?: jest.Mock;
  theme?: NgeTreeLayerTheme;
  tooltip?: boolean;
};

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 400,
  height: 320,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 420,
};

/** One root, two branches, four leaves — deep enough to have internal nodes to test against. */
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

/** The same tree with one branch pruned — used to exercise enter / update / exit. */
const ORG_TRIMMED: NgeHierarchyDatum[] = [
  {
    children: [{ children: [{ label: 'ana', value: 3 }], label: 'eng' }],
    label: 'ceo',
  },
];

const ORIENTATIONS: NgeTreeOrientation[] = [
  'bottom-top',
  'left-right',
  'right-left',
  'top-bottom',
];

function createContext(
  data: NgeHierarchyDatum[],
  options: ContextOptions = {}
): { context: TreeContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeTreeLayerConfig = {
    alignLeaves: options.alignLeaves,
    data,
    formatLabel: options.formatLabel,
    labelColor: options.labelColor,
    labelPadding: options.labelPadding,
    layout: options.layout,
    linkShape: options.linkShape,
    maxDepth: options.maxDepth,
    nodeRadius: options.nodeRadius,
    onClick: options.onClick,
    orientation: options.orientation,
    radiusRatio: options.radiusRatio,
    renderer: renderTreeLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    type: 'tree',
  };

  // The tree layer is self-scaled and ignores the cartesian scales — trivial linear scales
  // satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: TreeContext = {
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
          formatContent: (d: NgeHierarchyDatum) => ({
            label: d.label,
            value: String(d.value ?? ''),
          }),
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
  return Array.from(g.querySelectorAll<SVGCircleElement>('.nge-tree-node'));
}

function linkPaths(g: SVGGElement): SVGPathElement[] {
  return Array.from(g.querySelectorAll<SVGPathElement>('.nge-tree-link'));
}

function labelEls(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-tree-label'));
}

function circleByKey(g: SVGGElement, key: string): SVGCircleElement {
  const match = nodeCircles(g).find(el => el.getAttribute('data-node') === key);
  if (!match) {
    throw new Error(`No tree node circle for "${key}"`);
  }
  return match;
}

function labelByKey(g: SVGGElement, key: string): SVGTextElement {
  const match = labelEls(g).find(el => el.getAttribute('data-label') === key);
  if (!match) {
    throw new Error(`No tree label for "${key}"`);
  }
  return match;
}

function numAttr(el: Element, name: string): number {
  return Number(el.getAttribute(name));
}

describe('renderTreeLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('marks', () => {
    it('draws one circle per node and one path per edge', () => {
      const { context, g } = createContext(ORG);

      renderTreeLayer(context);

      expect(nodeCircles(g)).toHaveLength(7);
      expect(linkPaths(g)).toHaveLength(6);
    });

    it('keys each circle by its root-to-node path', () => {
      const { context, g } = createContext(ORG);

      renderTreeLayer(context);

      const keys = nodeCircles(g).map(el => el.getAttribute('data-node'));

      expect(keys).toContain('ceo');
      expect(keys).toContain('ceo/eng');
      expect(keys).toContain('ceo/eng/ana');
    });

    it('draws the nodes above the links, so an edge does not cross its own endpoint', () => {
      const { context, g } = createContext(ORG);

      renderTreeLayer(context);

      const groups = Array.from(g.querySelectorAll('.nge-tree-container > g'));
      const linkIndex = groups.findIndex(el => el.classList.contains('nge-tree-links'));
      const nodeIndex = groups.findIndex(el => el.classList.contains('nge-tree-nodes'));

      expect(linkIndex).toBeGreaterThanOrEqual(0);
      expect(nodeIndex).toBeGreaterThan(linkIndex);
    });

    it('honours nodeRadius', () => {
      const { context, g } = createContext(ORG, { nodeRadius: 9 });

      renderTreeLayer(context);

      expect(nodeCircles(g).every(el => numAttr(el, 'r') === 9)).toBe(true);
    });

    it('draws nothing for empty data', () => {
      const { context, g } = createContext([]);

      renderTreeLayer(context);

      expect(nodeCircles(g)).toHaveLength(0);
      expect(linkPaths(g)).toHaveLength(0);
    });

    it('draws nothing before the container has been measured', () => {
      const { context, g } = createContext(ORG, {
        dimensions: { boundedHeight: 0, boundedWidth: 0 },
      });

      renderTreeLayer(context);

      expect(nodeCircles(g)).toHaveLength(0);
    });

    it('clears its marks when the data empties out', () => {
      const { context, g } = createContext(ORG);
      renderTreeLayer(context);
      expect(nodeCircles(g)).toHaveLength(7);

      context.config.data = [];
      renderTreeLayer(context);

      expect(nodeCircles(g)).toHaveLength(0);
      expect(linkPaths(g)).toHaveLength(0);
    });
  });

  describe('the enter / update / exit join', () => {
    it('reconciles rather than redrawing — a survivor keeps its element identity', () => {
      const { context, g } = createContext(ORG);
      renderTreeLayer(context);

      const before = circleByKey(g, 'ceo/eng/ana');
      context.config.data = ORG_TRIMMED;
      renderTreeLayer(context);

      expect(circleByKey(g, 'ceo/eng/ana')).toBe(before);
    });

    it('enters the nodes a data change adds', () => {
      const { context, g } = createContext(ORG_TRIMMED);
      renderTreeLayer(context);
      expect(nodeCircles(g)).toHaveLength(3);

      context.config.data = ORG;
      renderTreeLayer(context);

      expect(nodeCircles(g)).toHaveLength(7);
    });

    it('places an entering circle at the geometry the layout computed, synchronously', () => {
      // Marks arrive at their FINAL position and fade in, rather than tweening into place — so
      // first paint stays smear-free under gesture re-renders and the position is assertable
      // without flushing a transition.
      const { context, g } = createContext(ORG, { orientation: 'left-right' });

      renderTreeLayer(context);

      const expected = computeTreeLayout({
        boundedHeight: DIMENSIONS.boundedHeight,
        boundedWidth: DIMENSIONS.boundedWidth,
        data: ORG,
        orientation: 'left-right',
      }).nodes;

      for (const node of expected) {
        const circle = circleByKey(g, node.key);
        expect(numAttr(circle, 'cx')).toBeCloseTo(node.x, 5);
        expect(numAttr(circle, 'cy')).toBeCloseTo(node.y, 5);
      }
    });

    it('survives repeated renders without stacking duplicate marks', () => {
      const { context, g } = createContext(ORG);

      renderTreeLayer(context);
      renderTreeLayer(context);
      renderTreeLayer(context);

      expect(nodeCircles(g)).toHaveLength(7);
      expect(linkPaths(g)).toHaveLength(6);
    });
  });

  describe('a layout flip re-enters the marks it would otherwise corrupt', () => {
    it('stamps the container with what it drew', () => {
      const { context, g } = createContext(ORG, { linkShape: 'curve' });

      renderTreeLayer(context);

      expect(g.querySelector('.nge-tree-container')?.getAttribute('data-layout')).toBe(
        'tidy|left-right|curve'
      );
    });

    it('replaces the link elements when linkShape changes command structure', () => {
      const { context, g } = createContext(ORG, { linkShape: 'curve' });
      renderTreeLayer(context);
      const before = linkPaths(g)[0];

      context.config.linkShape = 'elbow';
      renderTreeLayer(context);

      expect(linkPaths(g)[0]).not.toBe(before);
      expect(linkPaths(g)[0].getAttribute('d')).toMatch(/[HV]/);
    });

    it('replaces the link elements when the coordinate system changes', () => {
      const { context, g } = createContext(ORG);
      renderTreeLayer(context);
      const before = linkPaths(g)[0];

      context.config.layout = 'radial';
      renderTreeLayer(context);

      expect(linkPaths(g)[0]).not.toBe(before);
    });

    it('keeps the node circles across a flip — they only move', () => {
      const { context, g } = createContext(ORG);
      renderTreeLayer(context);
      const before = circleByKey(g, 'ceo');

      context.config.layout = 'radial';
      renderTreeLayer(context);

      expect(circleByKey(g, 'ceo')).toBe(before);
    });
  });

  describe('labels', () => {
    it('draws none unless showLabels is set', () => {
      const { context, g } = createContext(ORG);

      renderTreeLayer(context);

      expect(labelEls(g)).toHaveLength(0);
    });

    it('draws one per node when set', () => {
      const { context, g } = createContext(ORG, { showLabels: true });

      renderTreeLayer(context);

      expect(labelEls(g)).toHaveLength(7);
    });

    it('positions a label by transform, never by a transitioned transform attribute', () => {
      // `d3-interpolate`'s transform parser reads `transform.baseVal`, which jsdom does not
      // implement — a transitioned `transform` attribute would throw from a rAF callback and
      // surface as an unrelated spec failure. The layer tweens the string itself.
      const { context, g } = createContext(ORG, { showLabels: true });

      renderTreeLayer(context);

      expect(labelByKey(g, 'ceo').getAttribute('transform')).toMatch(
        /^translate\([-\d.]+,[-\d.]+\) rotate\([-\d.]+\)$/
      );
    });

    it('places an entering label at its final geometry synchronously', () => {
      const { context, g } = createContext(ORG, { orientation: 'left-right', showLabels: true });

      renderTreeLayer(context);

      const transform = labelByKey(g, 'ceo/eng/ana').getAttribute('transform') ?? '';
      const [, x] = /translate\(([-\d.]+),([-\d.]+)\)/.exec(transform) ?? [];

      expect(Number(x)).toBeGreaterThan(0);
    });

    it('anchors a leaf outward and an internal node back toward its parent', () => {
      const { context, g } = createContext(ORG, { orientation: 'left-right', showLabels: true });

      renderTreeLayer(context);

      expect(labelByKey(g, 'ceo/eng/ana').getAttribute('text-anchor')).toBe('start');
      expect(labelByKey(g, 'ceo/eng').getAttribute('text-anchor')).toBe('end');
    });

    it('uses formatLabel when supplied, with the summed value on internal nodes', () => {
      const { context, g } = createContext(ORG, {
        formatLabel: d => `${d.label}: ${d.value}`,
        showLabels: true,
      });

      renderTreeLayer(context);

      expect(labelByKey(g, 'ceo/eng').textContent).toBe('eng: 5');
    });

    it('drops the labels out of the join when showLabels is turned back off', () => {
      const { context, g } = createContext(ORG, { orientation: 'left-right', showLabels: true });
      renderTreeLayer(context);
      expect(labelByKey(g, 'ceo/eng/ana').getAttribute('text-anchor')).toBe('start');

      // Turn the labels off AND change the formatter. An exiting label is fading out, not being
      // re-rendered, so it must keep the text it was drawn with — which is what proves it left
      // the join rather than surviving as an update.
      context.config.showLabels = false;
      context.config.formatLabel = () => 'CHANGED';
      renderTreeLayer(context);

      expect(labelByKey(g, 'ceo/eng/ana').textContent).toBe('ana');
    });
  });

  describe('theming', () => {
    it('fills a branch and its descendants from one palette entry', () => {
      const { context, g } = createContext(ORG, { seriesColors: ['#111111', '#222222'] });

      renderTreeLayer(context);

      expect(styleOf(circleByKey(g, 'ceo/eng'), 'fill')).toBe('#111111');
      expect(styleOf(circleByKey(g, 'ceo/eng/ana'), 'fill')).toBe('#111111');
      expect(styleOf(circleByKey(g, 'ceo/sales'), 'fill')).toBe('#222222');
      expect(styleOf(circleByKey(g, 'ceo/sales/cam'), 'fill')).toBe('#222222');
    });

    it('lets a per-node color win over the palette', () => {
      const data: NgeHierarchyDatum[] = [
        { children: [{ color: '#abcdef', label: 'child', value: 1 }], label: 'root' },
      ];
      const { context, g } = createContext(data, { seriesColors: ['#111111'] });

      renderTreeLayer(context);

      expect(styleOf(circleByKey(g, 'root/child'), 'fill')).toBe('#abcdef');
    });

    it('falls back to the default theme when none is supplied', () => {
      const { context, g } = createContext(ORG);

      renderTreeLayer(context);

      expect(styleOf(nodeCircles(g)[0], 'stroke')).toBe(DEFAULT_TREE_LAYER_THEME.node.stroke);
      expect(styleOf(linkPaths(g)[0], 'stroke-width')).toBe(
        String(DEFAULT_TREE_LAYER_THEME.link.width)
      );
    });

    it('applies a user theme override', () => {
      const { context, g } = createContext(ORG, {
        theme: { link: { color: '#ff0000', width: 4 }, node: { stroke: '#00ff00' } },
      });

      renderTreeLayer(context);

      expect(styleOf(linkPaths(g)[0], 'stroke')).toBe('#ff0000');
      expect(styleOf(linkPaths(g)[0], 'stroke-width')).toBe('4');
      expect(styleOf(nodeCircles(g)[0], 'stroke')).toBe('#00ff00');
    });

    it('takes the label colour from the layer config over the theme', () => {
      const { context, g } = createContext(ORG, { labelColor: '#123456', showLabels: true });

      renderTreeLayer(context);

      expect(styleOf(labelByKey(g, 'ceo'), 'fill')).toBe('#123456');
    });

    it('lets a per-datum labelColor win over the layer config', () => {
      const data: NgeHierarchyDatum[] = [
        { children: [{ label: 'child', labelColor: '#fedcba', value: 1 }], label: 'root' },
      ];
      const { context, g } = createContext(data, { labelColor: '#123456', showLabels: true });

      renderTreeLayer(context);

      expect(styleOf(labelByKey(g, 'root/child'), 'fill')).toBe('#fedcba');
    });
  });

  describe('interaction', () => {
    it('emits a tooltip event on hover and hides it on leave', () => {
      const { context, g, onTooltip } = createContext(ORG, { tooltip: true });

      renderTreeLayer(context);
      circleByKey(g, 'ceo/eng').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledWith(
        expect.objectContaining({ content: { label: 'eng', value: '5' }, visible: true })
      );

      circleByKey(g, 'ceo/eng').dispatchEvent(new MouseEvent('mouseleave'));

      expect(onTooltip).toHaveBeenLastCalledWith(expect.objectContaining({ visible: false }));
    });

    it('keeps the tooltip inside the canvas', () => {
      const { context, g, onTooltip } = createContext(ORG, { tooltip: true });

      renderTreeLayer(context);
      for (const circle of nodeCircles(g)) {
        circle.dispatchEvent(new MouseEvent('mouseenter'));
      }

      for (const call of onTooltip.mock.calls) {
        const event = call[0];
        if (!event.visible) {
          continue;
        }
        expect(event.position.x).toBeGreaterThanOrEqual(0);
        expect(event.position.y).toBeGreaterThanOrEqual(0);
      }
    });

    it('calls onClick with the node datum', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(ORG, { onClick });

      renderTreeLayer(context);
      circleByKey(g, 'ceo/sales/cam').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ label: 'cam', value: 4 }) })
      );
    });

    it('shows a pointer cursor only when something responds to it', () => {
      const plain = createContext(ORG);
      renderTreeLayer(plain.context);
      expect(styleOf(nodeCircles(plain.g)[0], 'cursor')).toBe('default');

      const clickable = createContext(ORG, { onClick: jest.fn() });
      renderTreeLayer(clickable.context);
      expect(styleOf(nodeCircles(clickable.g)[0], 'cursor')).toBe('pointer');
    });

    it('detaches the handlers when the options are removed', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(ORG, { onClick });
      renderTreeLayer(context);

      context.config.onClick = undefined;
      renderTreeLayer(context);
      circleByKey(g, 'ceo').dispatchEvent(new MouseEvent('click'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('every mark stays inside the bounded plot rect', () => {
    // `g.nge-chart-layers` is CLIPPED, so a mark hung outside these bounds is DISCARDED rather
    // than merely tight — and jsdom does not clip, which is what makes this assertion the only
    // thing standing between the layer and silently missing marks (AGENTS.md).
    const RADIUS = 6;

    function assertInside(g: SVGGElement, expectedNodes: number): void {
      // Without this the bounds loops below pass vacuously on a chart that drew nothing at all —
      // which is the exact failure the whole block exists to catch.
      expect(nodeCircles(g)).toHaveLength(expectedNodes);
      expect(labelEls(g)).toHaveLength(expectedNodes);

      for (const circle of nodeCircles(g)) {
        const cx = numAttr(circle, 'cx');
        const cy = numAttr(circle, 'cy');
        // The circle's EDGE, not its centre.
        expect(cx - RADIUS).toBeGreaterThanOrEqual(-1e-6);
        expect(cx + RADIUS).toBeLessThanOrEqual(DIMENSIONS.boundedWidth + 1e-6);
        expect(cy - RADIUS).toBeGreaterThanOrEqual(-1e-6);
        expect(cy + RADIUS).toBeLessThanOrEqual(DIMENSIONS.boundedHeight + 1e-6);
      }

      for (const label of labelEls(g)) {
        const transform = label.getAttribute('transform') ?? '';
        const match = /translate\(([-\d.]+),([-\d.]+)\)/.exec(transform);
        expect(match).not.toBeNull();
        expect(Number(match![1])).toBeGreaterThanOrEqual(-1e-6);
        expect(Number(match![1])).toBeLessThanOrEqual(DIMENSIONS.boundedWidth + 1e-6);
        expect(Number(match![2])).toBeGreaterThanOrEqual(-1e-6);
        expect(Number(match![2])).toBeLessThanOrEqual(DIMENSIONS.boundedHeight + 1e-6);
      }
    }

    for (const orientation of ORIENTATIONS) {
      it(`holds for ${orientation} with labels on`, () => {
        expect.hasAssertions();
        const { context, g } = createContext(ORG, {
          formatLabel: d => `${d.label} — a deliberately long label`,
          nodeRadius: RADIUS,
          orientation,
          showLabels: true,
        });

        renderTreeLayer(context);

        assertInside(g, 7);
      });
    }

    it('holds for the radial layout with labels on', () => {
      expect.hasAssertions();
      const { context, g } = createContext(ORG, {
        formatLabel: d => `${d.label} — a deliberately long label`,
        layout: 'radial',
        nodeRadius: RADIUS,
        showLabels: true,
      });

      renderTreeLayer(context);

      assertInside(g, 7);
    });

    it('holds for a forest, whose reclaimed depth band moves every mark', () => {
      expect.hasAssertions();
      const forest: NgeHierarchyDatum[] = [
        { children: [{ label: 'a1', value: 1 }], label: 'a' },
        { children: [{ label: 'b1', value: 2 }], label: 'b' },
      ];
      const { context, g } = createContext(forest, {
        nodeRadius: RADIUS,
        showLabels: true,
      });

      renderTreeLayer(context);

      assertInside(g, 4);
    });

    it('holds on a small plot, where the label reserve is capped rather than crowding the tree', () => {
      const { context, g } = createContext(ORG, {
        dimensions: { boundedHeight: 90, boundedWidth: 120 },
        formatLabel: () => 'an extremely long label that cannot possibly fit',
        nodeRadius: RADIUS,
        showLabels: true,
      });

      renderTreeLayer(context);

      for (const circle of nodeCircles(g)) {
        expect(numAttr(circle, 'cx') + RADIUS).toBeLessThanOrEqual(120 + 1e-6);
        expect(numAttr(circle, 'cy') + RADIUS).toBeLessThanOrEqual(90 + 1e-6);
      }
      // The tree still has depth — the reserve did not collapse it onto one line.
      const xs = new Set(nodeCircles(g).map(el => numAttr(el, 'cx')));
      expect(xs.size).toBeGreaterThan(1);
    });
  });

  describe('animation', () => {
    it('drives the enter fade off context.animation rather than a hardcoded duration', () => {
      const { context, g } = createContext(ORG);
      context.animation = { ...NGE_CHART_ANIMATION_DEFAULTS, enterMs: 0 };

      renderTreeLayer(context);

      // With a zero-duration enter the marks are already at their resting opacity.
      expect(nodeCircles(g)).toHaveLength(7);
    });

    it('does not set the animated opacity on the merged selection', () => {
      // Setting it there would apply the resting value to an entering mark before its fade-in
      // reads a starting point — which both defeats the fade and makes the update-only reassert
      // dead code (ARCH-200). An entering circle therefore starts at opacity 0.
      const { context, g } = createContext(ORG);

      renderTreeLayer(context);

      expect(styleOf(nodeCircles(g)[0], 'opacity')).toBe('0');
    });

    it('re-asserts the resting opacity on the update selection', () => {
      const { context, g } = createContext(ORG);
      renderTreeLayer(context);
      renderTreeLayer(context);

      expect(styleOf(circleByKey(g, 'ceo'), 'opacity')).toBe(
        String(DEFAULT_TREE_LAYER_THEME.node.opacity)
      );
    });
  });
});
