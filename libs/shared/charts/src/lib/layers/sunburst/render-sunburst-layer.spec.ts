import type { HierarchyRectangularNode } from 'd3-hierarchy';

import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeHierarchyDatum, NgeSunburstLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeSunburstLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderSunburstLayer } from './render-sunburst-layer';

type SunburstContext = NgeChartLayerContext<
  NgeHierarchyDatum,
  NgeSunburstLayerConfig,
  NgeSunburstLayerTheme | undefined
>;

interface ContextOptions {
  endAngle?: number;
  innerRadius?: number;
  layout?: NgeSunburstLayerConfig['layout'];
  maxDepth?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  padAngle?: number;
  seriesColors?: string[];
  startAngle?: number;
  theme?: NgeSunburstLayerTheme;
  tooltip?: boolean;
}

// Square bounds → cx = cy = 100, outerRadius = 100.
const DIMENSIONS = {
  boundedHeight: 200,
  boundedWidth: 200,
  height: 220,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 220,
};

/**
 * Two top branches, each with two leaves. Branch A (total 50) outweighs branch B
 * (total 25), so A sorts first — its top-level index is 0 (A B in `root.children`).
 */
const SUNBURST: NgeHierarchyDatum[] = [
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
];

/**
 * A three-level tree (branch → child → grandchild) for depth-cap + deep-inheritance
 * tests. Branch A (total 30) outweighs branch B (total 5), so A sorts first (index 0).
 */
const DEEP: NgeHierarchyDatum[] = [
  {
    children: [
      {
        children: [
          { label: 'A1a', value: 20 },
          { label: 'A1b', value: 10 },
        ],
        label: 'A1',
      },
    ],
    label: 'A',
  },
  {
    children: [
      {
        children: [{ label: 'B1a', value: 5 }],
        label: 'B1',
      },
    ],
    label: 'B',
  },
];

function createContext(
  data: NgeHierarchyDatum[],
  options: ContextOptions = {}
): { context: SunburstContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeSunburstLayerConfig = {
    data,
    endAngle: options.endAngle,
    innerRadius: options.innerRadius,
    layout: options.layout,
    maxDepth: options.maxDepth,
    onClick: options.onClick,
    padAngle: options.padAngle,
    renderer: renderSunburstLayer,
    seriesColors: options.seriesColors,
    startAngle: options.startAngle,
    type: 'sunburst',
  };

  // Sunburst ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: SunburstContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: { bottom: 10, left: 10, right: 10, top: 10 },
    scales,
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeHierarchyDatum) => ({ label: d.label, value: d.value ?? '' }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** The hierarchy node d3 bound to a segment element. */
function datumOf(node: Element): HierarchyRectangularNode<NgeHierarchyDatum> {
  return (node as unknown as { __data__: HierarchyRectangularNode<NgeHierarchyDatum> }).__data__;
}

/**
 * The endpoint radii of a d3 `arc()` path — the min / max distance from the container
 * origin (0,0) across the path's command endpoints. For an annular sector the min is the
 * inner radius and the max the outer; when the inner radius is 0 the inner edge collapses
 * to the center point (an `L0,0`), so `inner` rounds to 0. Lets the DRAWN radial geometry
 * be asserted from the rendered `d` attribute, independent of the raw partition offsets.
 */
function arcRadii(d: string): { inner: number; outer: number } {
  const radii = Array.from(d.matchAll(/([MLA])([^MLAZ]+)/g)).map(match => {
    const nums = match[2].split(',').map(Number);
    // M / L carry a single (x,y); A carries (rx,ry,rot,large,sweep,x,y) — take its endpoint.
    const [x, y] = match[1] === 'A' ? [nums[5], nums[6]] : [nums[0], nums[1]];
    return Math.hypot(x, y);
  });
  return { inner: Math.min(...radii), outer: Math.max(...radii) };
}

/** The `.nge-sunburst-segment` element bound to a specific node label. */
function segByLabel(g: SVGGElement, label: string): SVGGraphicsElement {
  const match = Array.from(g.querySelectorAll<SVGGraphicsElement>('.nge-sunburst-segment')).find(
    node => datumOf(node).data.label === label
  );
  if (!match) {
    throw new Error(`No sunburst segment for label "${label}"`);
  }
  return match;
}

/**
 * Real-timer wait so d3 transitions run to completion. Segment shape attrs (`d` for
 * radial via `attrTween`, `x/y/width/height` for linear) are applied over the transition
 * (never synchronously), so they are only observable after a real delay past the enter
 * duration (300ms). Fills / handlers apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderSunburstLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderSunburstLayer(context);

      expect(g.querySelectorAll('.nge-sunburst-segment')).toHaveLength(0);
    });
  });

  describe('structure (radial)', () => {
    it('draws one segment per non-root node', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      // 2 branches + 4 leaves = 6 drawn nodes (the synthetic root is skipped).
      expect(g.querySelectorAll('.nge-sunburst-segment')).toHaveLength(6);
    });

    it('centers the segment container in the bounded area', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      const container = g.querySelector('.nge-sunburst-container');
      expect(container?.getAttribute('transform')).toBe('translate(100,100)');
    });

    it('renders segments as <path> elements', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      const segments = Array.from(g.querySelectorAll('.nge-sunburst-segment'));
      expect(segments.every(node => node.tagName === 'path')).toBe(true);
    });
  });

  describe('structure (linear)', () => {
    it('renders segments as <rect> elements with a top-left origin container', () => {
      const { context, g } = createContext(SUNBURST, { layout: 'linear' });

      renderSunburstLayer(context);

      const segments = Array.from(g.querySelectorAll('.nge-sunburst-segment'));
      expect(segments).toHaveLength(6);
      expect(segments.every(node => node.tagName === 'rect')).toBe(true);

      const container = g.querySelector('.nge-sunburst-container');
      expect(container?.getAttribute('transform')).toBe('translate(0,0)');
    });

    it('gives each rect a sane x / y / width / height', async () => {
      const { context, g } = createContext(SUNBURST, { layout: 'linear' });

      renderSunburstLayer(context);
      await settle();

      const rect = segByLabel(g, 'A');
      const width = Number(rect.getAttribute('width'));
      const height = Number(rect.getAttribute('height'));
      const x = Number(rect.getAttribute('x'));
      const y = Number(rect.getAttribute('y'));
      expect(width).toBeGreaterThan(0);
      expect(height).toBeGreaterThan(0);
      expect(x).toBeGreaterThanOrEqual(0);
      // Bug 1 (icicle): depth-1 starts at the top edge — the skipped root's strip is reclaimed.
      expect(y).toBeCloseTo(0, 1);
    });
  });

  describe('join contract (enter / update / exit)', () => {
    it('adds a segment per node on enter', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      expect(g.querySelectorAll('.nge-sunburst-segment')).toHaveLength(6);
    });

    it('updates a node in place (same id keeps the same element)', async () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);
      await settle();
      const before = segByLabel(g, 'A1');

      // Change a leaf's value only — its label path (join key) is unchanged.
      const changed: NgeHierarchyDatum[] = [
        {
          children: [
            { label: 'A1', value: 5 },
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
      ];
      context.config.data = changed;
      context.data = changed;
      renderSunburstLayer(context);
      await settle();

      // The SAME DOM element is reused for the unchanged node id (no exit/re-enter).
      expect(segByLabel(g, 'A1')).toBe(before);
    });

    it('exits a removed branch on re-render', async () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);
      expect(g.querySelectorAll('.nge-sunburst-segment')).toHaveLength(6);

      // Drop branch B (and its leaves) and re-render into the same bounds.
      const reduced = SUNBURST.slice(0, 1);
      context.config.data = reduced;
      context.data = reduced;
      renderSunburstLayer(context);
      await settle();

      const remaining = Array.from(g.querySelectorAll('.nge-sunburst-segment')).map(
        node => datumOf(node).data.label
      );
      expect(remaining.sort()).toEqual(['A', 'A1', 'A2']);
    });
  });

  describe('color resolution (via .style)', () => {
    it('colors top branches from the theme palette by branch index', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      expect(styleOf(segByLabel(g, 'A'), 'fill')).toBe('var(--chart-primary)');
      expect(styleOf(segByLabel(g, 'B'), 'fill')).toBe('var(--chart-secondary)');
    });

    it('gives descendants their top-level branch hue', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      // Leaves inherit their branch's palette color (A → primary, B → secondary).
      expect(styleOf(segByLabel(g, 'A1'), 'fill')).toBe('var(--chart-primary)');
      expect(styleOf(segByLabel(g, 'A2'), 'fill')).toBe('var(--chart-primary)');
      expect(styleOf(segByLabel(g, 'B1'), 'fill')).toBe('var(--chart-secondary)');
    });

    it('honors a per-node color override above the branch palette', () => {
      const data: NgeHierarchyDatum[] = [
        {
          children: [
            { color: 'var(--override)', label: 'A1', value: 30 },
            { label: 'A2', value: 20 },
          ],
          label: 'A',
        },
      ];
      const { context, g } = createContext(data);

      renderSunburstLayer(context);

      expect(styleOf(segByLabel(g, 'A1'), 'fill')).toBe('var(--override)');
      // Its sibling still resolves the branch hue.
      expect(styleOf(segByLabel(g, 'A2'), 'fill')).toBe('var(--chart-primary)');
    });

    it('honors the config seriesColors palette', () => {
      const { context, g } = createContext(SUNBURST, {
        seriesColors: ['#111111', '#222222'],
      });

      renderSunburstLayer(context);

      expect(styleOf(segByLabel(g, 'A'), 'fill')).toBe('#111111');
      expect(styleOf(segByLabel(g, 'B'), 'fill')).toBe('#222222');
    });
  });

  describe('interaction', () => {
    it('leaves segments non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      expect(styleOf(segByLabel(g, 'A'), 'cursor')).toBe('default');
    });

    it('routes a hovered internal node to the tooltip with its SUMMED value', () => {
      const { context, g, onTooltip } = createContext(SUNBURST, { tooltip: true });

      renderSunburstLayer(context);
      segByLabel(g, 'A').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.label).toBe('A');
      // Branch A has no own value — the formatter receives the summed 30 + 20 = 50.
      expect(event.content.value).toBe(50);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(SUNBURST, { tooltip: true });

      renderSunburstLayer(context);
      const segment = segByLabel(g, 'A1');
      segment.dispatchEvent(new MouseEvent('mouseenter'));
      segment.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked datum and its drawn index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(SUNBURST, { onClick });

      renderSunburstLayer(context);
      const segments = Array.from(g.querySelectorAll<SVGGraphicsElement>('.nge-sunburst-segment'));
      const target = segByLabel(g, 'A2');
      const expectedIndex = segments.indexOf(target);
      target.dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      // d3 preserves the original datum reference on each node.
      expect(onClick.mock.calls[0][0].data).toBe(SUNBURST[0].children![1]);
      expect(onClick.mock.calls[0][0].index).toBe(expectedIndex);
    });
  });

  describe('radial geometry (bug 1 — rings start at innerRadius)', () => {
    it('fills the center when innerRadius is 0 (depth-1 inner radius ≈ 0)', async () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);
      await settle();

      // The synthetic root's band must be reclaimed so the first ring touches the center.
      const branch = arcRadii(segByLabel(g, 'A').getAttribute('d') ?? '');
      expect(branch.inner).toBeCloseTo(0, 1);

      // ...and the deepest ring still reaches the outer radius (min(w,h) / 2 = 100).
      const leaf = arcRadii(segByLabel(g, 'A1').getAttribute('d') ?? '');
      expect(leaf.outer).toBeCloseTo(100, 0);
    });

    it('carves a donut hole sized to innerRadius (depth-1 inner ≈ 0.6 · outerRadius)', async () => {
      const { context, g } = createContext(SUNBURST, { innerRadius: 0.6 });

      renderSunburstLayer(context);
      await settle();

      // innerRadius is a ratio of the outer radius (100) → depth-1 inner radius ≈ 60.
      const branch = arcRadii(segByLabel(g, 'A').getAttribute('d') ?? '');
      expect(branch.inner).toBeCloseTo(60, 0);
    });

    it('keeps a [0, π] semi-circle sweep within [0, π]', () => {
      const { context, g } = createContext(SUNBURST, { endAngle: Math.PI, startAngle: 0 });

      renderSunburstLayer(context);

      // Every drawn segment's angular offsets stay inside the requested half-turn.
      const segments = Array.from(g.querySelectorAll<SVGGraphicsElement>('.nge-sunburst-segment'));
      for (const seg of segments) {
        const d = datumOf(seg);
        expect(d.x0).toBeGreaterThanOrEqual(0);
        expect(d.x1).toBeLessThanOrEqual(Math.PI + 1e-9);
      }
    });
  });

  describe('depth handling', () => {
    it('caps the drawn depth at maxDepth (only top branches when maxDepth is 1)', () => {
      const { context, g } = createContext(DEEP, { maxDepth: 1 });

      renderSunburstLayer(context);

      // DEEP has two top branches and deeper descendants; maxDepth 1 draws only the branches.
      expect(g.querySelectorAll('.nge-sunburst-segment')).toHaveLength(2);
    });

    it('gives a depth-3 descendant its top-level branch hue', () => {
      const { context, g } = createContext(DEEP);

      renderSunburstLayer(context);

      // A1a sits three levels under branch A (index 0) → primary; B1a under B → secondary.
      expect(styleOf(segByLabel(g, 'A1a'), 'fill')).toBe('var(--chart-primary)');
      expect(styleOf(segByLabel(g, 'B1a'), 'fill')).toBe('var(--chart-secondary)');
    });
  });

  describe('layout switch (bug 2)', () => {
    it('swaps <path> for <rect> when the layout flips at runtime', async () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);
      await settle();
      expect(g.querySelectorAll('path.nge-sunburst-segment').length).toBeGreaterThan(0);

      // Flip the persisted chart to linear and re-render into the SAME bounds.
      context.config.layout = 'linear';
      renderSunburstLayer(context);

      // Stale <path> segments are cleared so the <rect> element type enters cleanly.
      expect(g.querySelectorAll('rect.nge-sunburst-segment').length).toBeGreaterThan(0);
      expect(g.querySelectorAll('path.nge-sunburst-segment')).toHaveLength(0);
    });
  });
});
