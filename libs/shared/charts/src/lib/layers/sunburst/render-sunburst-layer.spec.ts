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
  formatLabel?: NgeSunburstLayerConfig['formatLabel'];
  innerRadius?: number;
  labelColor?: string;
  layout?: NgeSunburstLayerConfig['layout'];
  maxDepth?: number;
  maxLabelDepth?: number;
  minLabelAngle?: number;
  minLabelSize?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  padAngle?: number;
  radiusRatio?: number;
  seriesColors?: string[];
  showLabels?: boolean;
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
    formatLabel: options.formatLabel,
    innerRadius: options.innerRadius,
    labelColor: options.labelColor,
    layout: options.layout,
    maxDepth: options.maxDepth,
    maxLabelDepth: options.maxLabelDepth,
    minLabelAngle: options.minLabelAngle,
    minLabelSize: options.minLabelSize,
    onClick: options.onClick,
    padAngle: options.padAngle,
    radiusRatio: options.radiusRatio,
    renderer: renderSunburstLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
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

/** Every rendered label element, in DOM order. */
function labels(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-sunburst-label'));
}

/** The node labels that currently carry a rendered `<text>`, sorted for stable comparison. */
function labelledNodes(g: SVGGElement): string[] {
  return labels(g)
    .map(node => node.getAttribute('data-label') ?? '')
    .sort();
}

/** The `.nge-sunburst-label` element for a specific node label. */
function labelByNode(g: SVGGElement, label: string): SVGTextElement {
  const match = labels(g).find(node => node.getAttribute('data-label') === label);
  if (!match) {
    throw new Error(`No sunburst label for node "${label}"`);
  }
  return match;
}

/**
 * Parse a label transform back into its parts. The renderer emits `translate(x,y) rotate(a)`
 * — the anchor in container coords plus the rotation about it. `radius` is the anchor's
 * distance from the container origin, which for the radial layout is the middle of the ring
 * band the label names.
 */
function labelPlacement(el: SVGTextElement): {
  radius: number;
  rotate: number;
  x: number;
  y: number;
} {
  const transform = el.getAttribute('transform') ?? '';
  const match = /^translate\(([-\d.e]+),([-\d.e]+)\) rotate\(([-\d.e]+)\)$/.exec(transform);
  if (!match) {
    throw new Error(`Unexpected label transform: "${transform}"`);
  }
  const x = Number(match[1]);
  const y = Number(match[2]);
  return { radius: Math.hypot(x, y), rotate: Number(match[3]), x, y };
}

/**
 * True when text rotated by `deg` still reads left-to-right rather than upside down — the
 * property the hemisphere flip exists to guarantee.
 */
function readsUpright(deg: number): boolean {
  return deg <= 90 || deg >= 270;
}

/**
 * Real-timer wait so d3 transitions run to completion. Segment shape attrs (`d` for
 * radial via `attrTween`, `x/y/width/height` for linear) are applied over the transition
 * (never synchronously), so they are only observable after a real delay past the enter
 * duration (300ms). Fills / handlers apply synchronously.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderSunburstLayer', () => {
  describe('radiusRatio', () => {
    /**
     * The largest magnitude in an arc's own path data is its outer radius — every coordinate
     * and every `A rx,ry` on a centered arc is bounded by it. A blunt probe, but it needs no
     * layout (jsdom has none) and it moves exactly with the radius.
     */
    const maxExtent = (g: SVGGElement, selector: string): number => {
      const magnitudes = Array.from(g.querySelectorAll<SVGPathElement>(selector)).flatMap(
        node =>
          (node.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?/g)?.map(n => Math.abs(Number(n))) ??
          []
      );
      // Without this a mistyped selector yields `Math.max()` === -Infinity, and -Infinity/2
      // is still -Infinity — so the ratio assertion below would pass while measuring nothing.
      if (magnitudes.length === 0) {
        throw new Error(`No marks matched "${selector}" — the probe would measure nothing`);
      }
      return Math.max(...magnitudes);
    };

    it('scales the mark down without distorting it', async () => {
      const full = createContext(SUNBURST);
      const small = createContext(SUNBURST, { radiusRatio: 0.5 });

      renderSunburstLayer(full.context);
      renderSunburstLayer(small.context);
      await settle();

      // Half the ratio, half the radius — and because `innerRadius` is a ratio OF the outer
      // radius, the rings/hole scale with it rather than the shape warping.
      expect(maxExtent(small.g, '.nge-sunburst-segment')).toBeCloseTo(
        maxExtent(full.g, '.nge-sunburst-segment') / 2,
        4
      );
    });

    it('fills the plot when omitted', async () => {
      const omitted = createContext(SUNBURST);
      const explicit = createContext(SUNBURST, { radiusRatio: 1 });

      renderSunburstLayer(omitted.context);
      renderSunburstLayer(explicit.context);
      await settle();

      expect(maxExtent(omitted.g, '.nge-sunburst-segment')).toBeCloseTo(
        maxExtent(explicit.g, '.nge-sunburst-segment'),
        6
      );
    });
  });

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

      expect(styleOf(segByLabel(g, 'A'), 'fill')).toBe('var(--nge-chart-primary)');
      expect(styleOf(segByLabel(g, 'B'), 'fill')).toBe('var(--nge-chart-secondary)');
    });

    it('gives descendants their top-level branch hue', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      // Leaves inherit their branch's palette color (A → primary, B → secondary).
      expect(styleOf(segByLabel(g, 'A1'), 'fill')).toBe('var(--nge-chart-primary)');
      expect(styleOf(segByLabel(g, 'A2'), 'fill')).toBe('var(--nge-chart-primary)');
      expect(styleOf(segByLabel(g, 'B1'), 'fill')).toBe('var(--nge-chart-secondary)');
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
      expect(styleOf(segByLabel(g, 'A2'), 'fill')).toBe('var(--nge-chart-primary)');
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
      expect(styleOf(segByLabel(g, 'A1a'), 'fill')).toBe('var(--nge-chart-primary)');
      expect(styleOf(segByLabel(g, 'B1a'), 'fill')).toBe('var(--nge-chart-secondary)');
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

    it('clears labels on the flip so no transform list is interpolated across modes', async () => {
      const { context, g } = createContext(SUNBURST, { showLabels: true });

      renderSunburstLayer(context);
      await settle();
      const before = labelByNode(g, 'A');
      expect(labelPlacement(before).rotate).not.toBe(0);

      context.config.layout = 'linear';
      renderSunburstLayer(context);

      // A fresh element, carrying the linear (unrotated, top-left origin) placement.
      const after = labelByNode(g, 'A');
      expect(after).not.toBe(before);
      expect(labelPlacement(after).rotate).toBe(0);
    });
  });

  describe('labels', () => {
    it('draws none until showLabels is set', () => {
      const { context, g } = createContext(SUNBURST);

      renderSunburstLayer(context);

      expect(labels(g)).toHaveLength(0);
    });

    it('draws one label per drawn node in radial layout', () => {
      const { context, g } = createContext(SUNBURST, { showLabels: true });

      renderSunburstLayer(context);

      expect(labelledNodes(g)).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'B2']);
    });

    it('draws one label per drawn node in linear layout', () => {
      const { context, g } = createContext(SUNBURST, { layout: 'linear', showLabels: true });

      renderSunburstLayer(context);

      expect(labelledNodes(g)).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'B2']);
    });

    it('lets hover and click fall through to the segment underneath', () => {
      const { context, g } = createContext(SUNBURST, { showLabels: true });

      renderSunburstLayer(context);

      expect(styleOf(labelByNode(g, 'A'), 'pointer-events')).toBe('none');
    });

    it('keeps the label group after the segments so a new segment cannot paint over a label', () => {
      const { context, g } = createContext(SUNBURST, { showLabels: true });

      renderSunburstLayer(context);
      const container = g.querySelector('.nge-sunburst-container');

      expect(container?.lastElementChild?.classList.contains('nge-sunburst-labels')).toBe(true);
    });

    describe('rotation convention (radial — along the radius, flipped on the left)', () => {
      it('anchors each label at the middle of its own ring band', () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);

        // Depth-1 occupies the [0, 50] radius band after the root remap, so its labels sit at
        // the midpoint, 25. Branch A sweeps [0°, 240°] of the turn (50 of 75) → mid-angle 120°,
        // i.e. the direction (sin 120°, −cos 120°) out from the center.
        const a = labelPlacement(labelByNode(g, 'A'));
        expect(a.radius).toBeCloseTo(25, 5);
        expect(a.x).toBeCloseTo(25 * Math.sin((120 * Math.PI) / 180), 5);
        expect(a.y).toBeCloseTo(-25 * Math.cos((120 * Math.PI) / 180), 5);

        // Leaves sit one ring out, in the [50, 100] band → midpoint 75.
        expect(labelPlacement(labelByNode(g, 'A1')).radius).toBeCloseTo(75, 5);
      });

      it('turns each label along its own radius', () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);

        // A's mid-angle is 120°, so its baseline runs at 120 − 90 = 30° from horizontal.
        expect(labelPlacement(labelByNode(g, 'A')).rotate).toBeCloseTo(30, 5);
        // A1's is 72° → −18°, normalised to 342°.
        expect(labelPlacement(labelByNode(g, 'A1')).rotate).toBeCloseTo(342, 5);
      });

      it('flips the left hemisphere so no label reads upside down', () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);

        // A2's mid-angle is 192°, so its bare baseline would be 102° — upside down. The flip
        // adds 180 to give 282°.
        expect(labelPlacement(labelByNode(g, 'A2')).rotate).toBeCloseTo(282, 5);

        // The invariant behind that number, asserted across every label.
        for (const label of labels(g)) {
          expect(readsUpright(labelPlacement(label).rotate)).toBe(true);
        }
      });

      it('normalises an arbitrary startAngle before the hemisphere test', () => {
        // Shift the whole sunburst a full turn: identical geometry, raw degrees past 360.
        const { context, g } = createContext(SUNBURST, {
          endAngle: 4 * Math.PI,
          showLabels: true,
          startAngle: 2 * Math.PI,
        });

        renderSunburstLayer(context);

        expect(labelPlacement(labelByNode(g, 'A')).rotate).toBeCloseTo(30, 5);
        for (const label of labels(g)) {
          expect(readsUpright(labelPlacement(label).rotate)).toBe(true);
        }
      });

      it('centers a linear label in its rect with no rotation', () => {
        const { context, g } = createContext(SUNBURST, { layout: 'linear', showLabels: true });

        renderSunburstLayer(context);

        // Branch A spans [0, 133.3] of the 200px width → centered at 66.7; depth-1 owns the
        // [0, 100] half of the height after the root remap → centered at 50.
        const placement = labelPlacement(labelByNode(g, 'A'));
        expect(placement.x).toBeCloseTo(200 / 3, 5);
        expect(placement.y).toBeCloseTo(50, 5);
        expect(placement.rotate).toBe(0);
      });
    });

    describe('suppression', () => {
      it('drops nodes narrower than minLabelAngle', () => {
        // Sweeps (of a full turn): A 4.19, A1 2.51, B 2.09, A2 1.68 rad — only A clears 3.
        const { context, g } = createContext(SUNBURST, { minLabelAngle: 3, showLabels: true });

        renderSunburstLayer(context);

        expect(labelledNodes(g)).toEqual(['A']);
      });

      it('drops nodes with too little arc even when their angle is generous', () => {
        // Arc at mid-radius: A 104.7, A1 188.5, A2 125.7, B 52.4, B1 94.2, B2 62.8 px. B has a
        // 2.09 rad sweep — far past the default angle threshold — but sits on the inner ring,
        // so 100px of required arc still rules it out. This is the rule an angle cannot express.
        const { context, g } = createContext(SUNBURST, { minLabelSize: 100, showLabels: true });

        renderSunburstLayer(context);

        expect(labelledNodes(g)).toEqual(['A', 'A1', 'A2']);
      });

      it('applies minLabelSize to the rect width in linear layout', () => {
        // Widths (of 200px): A 133.3, A1 80, B 66.7, A2 53.3, B1 40, B2 26.7.
        const { context, g } = createContext(SUNBURST, {
          layout: 'linear',
          minLabelSize: 70,
          showLabels: true,
        });

        renderSunburstLayer(context);

        expect(labelledNodes(g)).toEqual(['A', 'A1']);
      });

      it('caps labels at maxLabelDepth without changing what is drawn', () => {
        const { context, g } = createContext(SUNBURST, { maxLabelDepth: 1, showLabels: true });

        renderSunburstLayer(context);

        expect(labelledNodes(g)).toEqual(['A', 'B']);
        // maxLabelDepth is independent of maxDepth — every node is still rendered.
        expect(g.querySelectorAll('.nge-sunburst-segment')).toHaveLength(6);
      });

      it('never labels a zero-sweep node, even with the thresholds turned off', () => {
        const data: NgeHierarchyDatum[] = [
          {
            children: [
              { label: 'A1', value: 30 },
              { label: 'Empty', value: 0 },
            ],
            label: 'A',
          },
        ];
        const { context, g } = createContext(data, {
          minLabelAngle: 0,
          minLabelSize: 0,
          showLabels: true,
        });

        renderSunburstLayer(context);

        expect(labelledNodes(g)).toEqual(['A', 'A1']);
      });

      it('exits a label whose node shrinks past the threshold and re-enters it when it grows back', async () => {
        const { context, g } = createContext(SUNBURST, { minLabelAngle: 2, showLabels: true });

        renderSunburstLayer(context);
        await settle();
        expect(labelledNodes(g)).toContain('B');

        // Shrink branch B so its sweep drops under the threshold.
        const shrunk: NgeHierarchyDatum[] = [
          SUNBURST[0],
          { children: [{ label: 'B1', value: 1 }], label: 'B' },
        ];
        context.config.data = shrunk;
        context.data = shrunk;
        renderSunburstLayer(context);
        await settle();
        expect(labelledNodes(g)).not.toContain('B');

        // Restore the data — the label comes back rather than staying suppressed.
        context.config.data = SUNBURST;
        context.data = SUNBURST;
        renderSunburstLayer(context);
        await settle();
        expect(labelledNodes(g)).toContain('B');
      });
    });

    describe('text', () => {
      it('defaults to the node label', () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);

        expect(labelByNode(g, 'A1').textContent).toBe('A1');
      });

      it('passes an internal node its SUMMED value to formatLabel', () => {
        const { context, g } = createContext(SUNBURST, {
          formatLabel: d => `${d.label}: ${d.value}`,
          showLabels: true,
        });

        renderSunburstLayer(context);

        // Branch A carries no own value — 30 + 20 is summed up from its leaves.
        expect(labelByNode(g, 'A').textContent).toBe('A: 50');
        expect(labelByNode(g, 'A1').textContent).toBe('A1: 30');
      });

      it('re-runs formatLabel on already-rendered labels', async () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);
        await settle();

        context.config.formatLabel = d => d.label.toLowerCase();
        renderSunburstLayer(context);

        expect(labelByNode(g, 'A1').textContent).toBe('a1');
      });

      it('leaves text untrimmed where the environment cannot measure it', () => {
        // jsdom does not lay SVG text out, so `getComputedTextLength` is absent and elision
        // degrades to the full string rather than guessing at a width.
        const { context, g } = createContext(SUNBURST, {
          formatLabel: () => 'a considerably longer label than the ring can hold',
          showLabels: true,
        });

        renderSunburstLayer(context);

        expect(labelByNode(g, 'A').textContent).toBe(
          'a considerably longer label than the ring can hold'
        );
      });
    });

    describe('join contract', () => {
      it('keeps the same element for an unchanged node id', async () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);
        await settle();
        const before = labelByNode(g, 'A1');

        const changed: NgeHierarchyDatum[] = [
          {
            children: [
              { label: 'A1', value: 25 },
              { label: 'A2', value: 20 },
            ],
            label: 'A',
          },
          SUNBURST[1],
        ];
        context.config.data = changed;
        context.data = changed;
        renderSunburstLayer(context);
        await settle();

        expect(labelByNode(g, 'A1')).toBe(before);
        expect(labels(g)).toHaveLength(6);
      });

      it('restores full opacity on a survivor whose fade was interrupted', () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);
        // Re-render immediately — mid-fade for every entering label.
        renderSunburstLayer(context);
        renderSunburstLayer(context);

        // Survivors re-assert opacity synchronously rather than staying stranded part-faded.
        expect(styleOf(labelByNode(g, 'A'), 'opacity')).toBe('1');
      });

      it('exits every label when showLabels is switched off', async () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);
        await settle();
        expect(labels(g)).toHaveLength(6);

        context.config.showLabels = false;
        renderSunburstLayer(context);
        await settle();

        expect(labels(g)).toHaveLength(0);
      });
    });

    describe('colour + typography', () => {
      it('flips to the light colour on a perceptually dark node fill', () => {
        const data: NgeHierarchyDatum[] = [{ color: '#000080', label: 'Navy', value: 10 }];
        const { context, g } = createContext(data, { showLabels: true });

        renderSunburstLayer(context);

        expect(styleOf(labelByNode(g, 'Navy'), 'fill')).toBe('var(--nge-chart-white, #ffffff)');
      });

      it('keeps the dark colour on a light node fill', () => {
        const data: NgeHierarchyDatum[] = [{ color: '#ffff00', label: 'Yellow', value: 10 }];
        const { context, g } = createContext(data, { showLabels: true });

        renderSunburstLayer(context);

        expect(styleOf(labelByNode(g, 'Yellow'), 'fill')).toBe('var(--nge-chart-black, #000000)');
      });

      it('lets a per-node labelColor beat the derived contrast', () => {
        const data: NgeHierarchyDatum[] = [
          { color: '#000080', label: 'Navy', labelColor: '#ff00ff', value: 10 },
        ];
        const { context, g } = createContext(data, { showLabels: true });

        renderSunburstLayer(context);

        expect(styleOf(labelByNode(g, 'Navy'), 'fill')).toBe('#ff00ff');
      });

      it('lets a layer-config labelColor pin one flat colour across every node', () => {
        const { context, g } = createContext(SUNBURST, { labelColor: '#123456', showLabels: true });

        renderSunburstLayer(context);

        expect(styleOf(labelByNode(g, 'A'), 'fill')).toBe('#123456');
        expect(styleOf(labelByNode(g, 'B1'), 'fill')).toBe('#123456');
      });

      it('reads typography from the theme', () => {
        const { context, g } = createContext(SUNBURST, {
          showLabels: true,
          theme: { label: { fontSize: 18, fontWeight: 700 } },
        });

        renderSunburstLayer(context);

        const label = labelByNode(g, 'A');
        expect(styleOf(label, 'font-size')).toBe('18px');
        expect(styleOf(label, 'font-weight')).toBe('700');
      });

      it('applies a runtime theme change to already-rendered labels', async () => {
        const { context, g } = createContext(SUNBURST, { showLabels: true });

        renderSunburstLayer(context);
        await settle();

        // Same theme shape a consumer would swap in at runtime.
        context.theme = { label: { color: '#0f0f0f', colorOnDark: '#f0f0f0', fontSize: 22 } };
        renderSunburstLayer(context);

        const label = labelByNode(g, 'A');
        expect(styleOf(label, 'font-size')).toBe('22px');
        // The palette fill (`var(--nge-chart-primary)`) is unmeasurable in jsdom beyond its
        // token fallback (#1976d2, dark) → the new dark-fill endpoint.
        expect(styleOf(label, 'fill')).toBe('#f0f0f0');
      });
    });
  });
});
