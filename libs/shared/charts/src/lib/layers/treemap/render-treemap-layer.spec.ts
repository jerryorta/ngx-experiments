import { hcl } from 'd3-color';
import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeChartScales } from '../../core/base-layout';
import type { NgeHierarchyDatum, NgeTreemapLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeTreemapLayerTheme } from '../../core/theme';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { renderTreemapLayer } from './render-treemap-layer';

type TreemapContext = NgeChartLayerContext<
  NgeHierarchyDatum,
  NgeTreemapLayerConfig,
  NgeTreemapLayerTheme | undefined
>;

type ContextOptions = Partial<Omit<NgeTreemapLayerConfig, 'data' | 'renderer' | 'type'>> & {
  onTooltip?: jest.Mock;
  theme?: NgeTreemapLayerTheme;
  tooltip?: boolean;
};

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 400,
  height: 320,
  margin: { bottom: 10, left: 10, right: 10, top: 10 },
  width: 420,
};

const PLOT_AREA = DIMENSIONS.boundedWidth * DIMENSIONS.boundedHeight;

/**
 * Two branches of two leaves plus a standalone leaf — total 100, so a node's value doubles
 * as its percentage of the plot area.
 */
const TREE: NgeHierarchyDatum[] = [
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
  { label: 'C', value: 25 },
];

function createContext(
  data: NgeHierarchyDatum[],
  options: ContextOptions = {}
): { context: TreemapContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeTreemapLayerConfig = {
    convergenceRatio: options.convergenceRatio,
    data,
    formatLabel: options.formatLabel,
    labelColor: options.labelColor,
    maxDepth: options.maxDepth,
    maxIterationCount: options.maxIterationCount,
    maxLabelDepth: options.maxLabelDepth,
    minLabelSize: options.minLabelSize,
    onClick: options.onClick,
    padding: options.padding,
    paddingOuter: options.paddingOuter,
    paddingTop: options.paddingTop,
    renderer: renderTreemapLayer,
    seed: options.seed,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    tiling: options.tiling,
    type: 'treemap',
  };

  // Treemap ignores the cartesian scales — pass trivial linear scales to satisfy the type.
  const scales: NgeChartScales = { x: scaleLinear(), y: scaleLinear() };

  const context: TreemapContext = {
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

/**
 * d3 transitions run on real timers, so anything applied over a transition — the enter
 * fade-in, the exit removal, a survivor's repositioning — is only observable after a delay
 * past the 300ms enter duration. Geometry is applied synchronously and needs no wait.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

/** Re-render the same layer with new data, mirroring how the chart feeds a data change. */
function rerender(context: TreemapContext, data: NgeHierarchyDatum[]): void {
  context.config.data = data;
  context.data = data;
  renderTreemapLayer(context);
}

function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** Every rendered cell, in DOM order. */
function cells(g: SVGGElement): SVGGraphicsElement[] {
  return Array.from(g.querySelectorAll<SVGGraphicsElement>('.nge-treemap-cell'));
}

/** The rendered cells' node labels, in DOM order (which is paint order). */
function cellOrder(g: SVGGElement): string[] {
  return cells(g).map(node => node.getAttribute('data-label') ?? '');
}

function cellByLabel(g: SVGGElement, label: string): SVGGraphicsElement {
  const match = cells(g).find(node => node.getAttribute('data-label') === label);
  if (!match) {
    throw new Error(`No treemap cell for label "${label}"`);
  }
  return match;
}

/** A `<rect>` cell's geometry, read back off the rendered attributes. */
function rectOf(el: Element): { height: number; width: number; x: number; y: number } {
  return {
    height: Number(el.getAttribute('height')),
    width: Number(el.getAttribute('width')),
    x: Number(el.getAttribute('x')),
    y: Number(el.getAttribute('y')),
  };
}

function areaOfRect(el: Element): number {
  const { height, width } = rectOf(el);
  return width * height;
}

/** The vertices of a Voronoi cell's `<path>`, parsed back out of its `d`. */
function pathVertices(el: Element): [number, number][] {
  const numbers = (el.getAttribute('d') ?? '').match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? [];
  const vertices: [number, number][] = [];
  for (let i = 0; i + 1 < numbers.length; i += 2) {
    vertices.push([Number(numbers[i]), Number(numbers[i + 1])]);
  }
  return vertices;
}

function labels(g: SVGGElement): SVGTextElement[] {
  return Array.from(g.querySelectorAll<SVGTextElement>('.nge-treemap-label'));
}

/** The node labels that currently carry a rendered `<text>`, sorted for stable comparison. */
function labelledNodes(g: SVGGElement): string[] {
  return labels(g)
    .map(node => node.getAttribute('data-label') ?? '')
    .sort();
}

function labelByNode(g: SVGGElement, label: string): SVGTextElement {
  const match = labels(g).find(node => node.getAttribute('data-label') === label);
  if (!match) {
    throw new Error(`No treemap label for node "${label}"`);
  }
  return match;
}

describe('renderTreemapLayer', () => {
  describe('rectangular layout', () => {
    it('draws one cell per node and skips the synthetic root', () => {
      const { context, g } = createContext(TREE);

      renderTreemapLayer(context);

      // 3 branches + 4 leaves; the unlabelled synthetic root the data is seated under is
      // never drawn (it would be one cell covering the whole plot).
      expect(cells(g)).toHaveLength(7);
      expect(cellOrder(g)).not.toContain('');
    });

    it('sizes each cell area in proportion to its value', () => {
      const { context, g } = createContext(TREE, { padding: 0 });

      renderTreemapLayer(context);

      for (const [label, value] of [
        ['A', 50],
        ['B', 25],
        ['C', 25],
        ['A1', 30],
        ['B2', 10],
      ] as [string, number][]) {
        expect(areaOfRect(cellByLabel(g, label))).toBeCloseTo((value / 100) * PLOT_AREA, 4);
      }
    });

    it('tiles the whole plot with the top-level cells', () => {
      const { context, g } = createContext(TREE, { padding: 0 });

      renderTreemapLayer(context);

      const covered = ['A', 'B', 'C'].reduce(
        (sum, label) => sum + areaOfRect(cellByLabel(g, label)),
        0
      );
      expect(covered).toBeCloseTo(PLOT_AREA, 4);
    });

    it('nests a branch inside its own cell', () => {
      const { context, g } = createContext(TREE, { padding: 0 });

      renderTreemapLayer(context);

      const branch = rectOf(cellByLabel(g, 'A'));
      for (const leaf of ['A1', 'A2']) {
        const child = rectOf(cellByLabel(g, leaf));
        expect(child.x).toBeGreaterThanOrEqual(branch.x - 0.01);
        expect(child.y).toBeGreaterThanOrEqual(branch.y - 0.01);
        expect(child.x + child.width).toBeLessThanOrEqual(branch.x + branch.width + 0.01);
        expect(child.y + child.height).toBeLessThanOrEqual(branch.y + branch.height + 0.01);
      }
    });

    it('paints a parent behind the children nested inside it', () => {
      const { context, g } = createContext(TREE);

      renderTreemapLayer(context);

      // SVG paints in document order, so a parent must precede its children or it covers them.
      const order = cellOrder(g);
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('A1'));
      expect(order.indexOf('B')).toBeLessThan(order.indexOf('B1'));
    });

    it('keeps a parent behind its children even when the parent enters later', async () => {
      // d3 appends entering elements at the END of the group, so a branch that appears after
      // its own leaves already exist would paint over them without an explicit `.order()`.
      const leafFirst: NgeHierarchyDatum[] = [{ label: 'A1', value: 30 }, ...TREE.slice(1)];
      const { context, g } = createContext(leafFirst);

      renderTreemapLayer(context);
      await settle();
      rerender(context, TREE);
      await settle();

      const order = cellOrder(g);
      expect(order.indexOf('A')).toBeLessThan(order.indexOf('A1'));
    });

    it('applies the sibling gap, the outer inset and the extra top strip', () => {
      const { context, g } = createContext(TREE, {
        padding: 0,
        paddingOuter: 4,
        paddingTop: 12,
      });

      renderTreemapLayer(context);

      const branch = rectOf(cellByLabel(g, 'A'));
      const child = rectOf(cellByLabel(g, 'A1'));

      // `paddingTop` reads as EXTRA room above the all-round outer inset, so the top gap is
      // the sum of the two while the sides take the outer inset alone.
      expect(child.y - branch.y).toBeCloseTo(16, 4);
      expect(child.x - branch.x).toBeCloseTo(4, 4);
    });
  });

  describe('bounded plot rect', () => {
    // `context.bounds` sits inside a clip-path of the plot rect, so a mark hung outside it is
    // DISCARDED rather than merely tight — and jsdom does not clip, so only an explicit
    // coordinate assertion catches it (ARCH-197).
    const assertInsidePlot = (x: number, y: number): void => {
      expect(x).toBeGreaterThanOrEqual(-0.01);
      expect(y).toBeGreaterThanOrEqual(-0.01);
      expect(x).toBeLessThanOrEqual(DIMENSIONS.boundedWidth + 0.01);
      expect(y).toBeLessThanOrEqual(DIMENSIONS.boundedHeight + 0.01);
    };

    it('keeps every rectangular mark inside the bounded plot rect', () => {
      const { context, g } = createContext(TREE, { paddingOuter: 3, showLabels: true });

      renderTreemapLayer(context);

      // Guard the loops below against passing vacuously on an empty selection.
      expect(cells(g).length).toBeGreaterThan(0);
      expect(labels(g).length).toBeGreaterThan(0);

      for (const cell of cells(g)) {
        const { height, width, x, y } = rectOf(cell);
        assertInsidePlot(x, y);
        assertInsidePlot(x + width, y + height);
      }
      for (const label of labels(g)) {
        assertInsidePlot(Number(label.getAttribute('x')), Number(label.getAttribute('y')));
      }
    });

    it('keeps every Voronoi mark inside the bounded plot rect', () => {
      const { context, g } = createContext(TREE, { showLabels: true, tiling: 'voronoi' });

      renderTreemapLayer(context);

      // Guard the loops below against passing vacuously on an empty selection.
      expect(cells(g).length).toBeGreaterThan(0);
      expect(labels(g).length).toBeGreaterThan(0);

      for (const cell of cells(g)) {
        for (const [x, y] of pathVertices(cell)) {
          assertInsidePlot(x, y);
        }
      }
      for (const label of labels(g)) {
        assertInsidePlot(Number(label.getAttribute('x')), Number(label.getAttribute('y')));
      }
    });
  });

  describe('join contract (enter / update / exit)', () => {
    it('reuses the same element for an unchanged node id', async () => {
      const { context, g } = createContext(TREE);

      renderTreemapLayer(context);
      await settle();
      const before = cellByLabel(g, 'A1');

      rerender(context, [
        { children: [{ label: 'A1', value: 5 }, ...TREE[0].children!.slice(1)], label: 'A' },
        ...TREE.slice(1),
      ]);
      await settle();

      expect(cellByLabel(g, 'A1')).toBe(before);
    });

    it('re-lays-out survivors when a value changes', async () => {
      const { context, g } = createContext(TREE, { padding: 0 });

      renderTreemapLayer(context);
      await settle();
      const before = areaOfRect(cellByLabel(g, 'C'));

      // C goes from 25 of 100 to 25 of 150, so its share — and its area — must shrink.
      rerender(context, [
        ...TREE.slice(0, 2),
        { label: 'C', value: 25 },
        { label: 'D', value: 50 },
      ]);
      await settle();

      expect(areaOfRect(cellByLabel(g, 'C'))).toBeLessThan(before);
      expect(areaOfRect(cellByLabel(g, 'C'))).toBeCloseTo((25 / 150) * PLOT_AREA, 4);
    });

    it('exits a removed branch on re-render', async () => {
      const { context, g } = createContext(TREE);

      renderTreemapLayer(context);
      expect(cells(g)).toHaveLength(7);

      rerender(context, TREE.slice(0, 1));
      await settle();

      expect(cellOrder(g).sort()).toEqual(['A', 'A1', 'A2']);
    });

    it('places entering cells at their final geometry synchronously, then fades them in', async () => {
      const { context, g } = createContext(TREE, { padding: 0 });

      renderTreemapLayer(context);

      // Geometry is correct on the very first paint — no half-grown cell under a resize or a
      // gesture re-render — while opacity is still at its birth value mid-fade.
      expect(areaOfRect(cellByLabel(g, 'C'))).toBeCloseTo(0.25 * PLOT_AREA, 4);
      expect(styleOf(cellByLabel(g, 'C'), 'opacity')).toBe('0');

      await settle();
      expect(Number(styleOf(cellByLabel(g, 'C'), 'opacity'))).toBe(1);
    });

    it('re-asserts opacity on survivors so an interrupted fade cannot strand a cell', () => {
      const { context, g } = createContext(TREE);

      // Re-render immediately, mid-fade: the survivor branch must be pushed to full opacity
      // synchronously rather than keeping whatever partial value its killed transition left.
      renderTreemapLayer(context);
      renderTreemapLayer(context);

      expect(Number(styleOf(cellByLabel(g, 'A'), 'opacity'))).toBe(1);
    });
  });

  describe('depth', () => {
    it('caps the drawn levels at maxDepth', () => {
      const { context, g } = createContext(TREE, { maxDepth: 1 });

      renderTreemapLayer(context);

      expect(cellOrder(g).sort()).toEqual(['A', 'B', 'C']);
    });

    it('stamps each cell with its depth', () => {
      const { context, g } = createContext(TREE);

      renderTreemapLayer(context);

      expect(cellByLabel(g, 'A').getAttribute('data-depth')).toBe('1');
      expect(cellByLabel(g, 'A1').getAttribute('data-depth')).toBe('2');
    });
  });

  describe('tiling', () => {
    it('defaults to squarify', () => {
      const { context: squarified, g: squarifiedG } = createContext(TREE, { tiling: 'squarify' });
      const { context: defaulted, g: defaultedG } = createContext(TREE);

      renderTreemapLayer(squarified);
      renderTreemapLayer(defaulted);

      expect(rectOf(cellByLabel(defaultedG, 'A'))).toEqual(rectOf(cellByLabel(squarifiedG, 'A')));
    });

    it('cuts only across the width under dice', () => {
      const { context, g } = createContext(TREE, { padding: 0, tiling: 'dice' });

      renderTreemapLayer(context);

      for (const label of ['A', 'B', 'C']) {
        expect(rectOf(cellByLabel(g, label)).height).toBeCloseTo(DIMENSIONS.boundedHeight, 4);
      }
    });

    it('cuts only down the height under slice', () => {
      const { context, g } = createContext(TREE, { padding: 0, tiling: 'slice' });

      renderTreemapLayer(context);

      for (const label of ['A', 'B', 'C']) {
        expect(rectOf(cellByLabel(g, label)).width).toBeCloseTo(DIMENSIONS.boundedWidth, 4);
      }
    });

    it('lays a branch out differently under binary than under squarify', () => {
      const { context: binary, g: binaryG } = createContext(TREE, { tiling: 'binary' });
      const { context: squarify, g: squarifyG } = createContext(TREE, { tiling: 'squarify' });

      renderTreemapLayer(binary);
      renderTreemapLayer(squarify);

      expect(rectOf(cellByLabel(binaryG, 'A1'))).not.toEqual(rectOf(cellByLabel(squarifyG, 'A1')));
    });
  });

  describe('voronoi tiling', () => {
    it('draws convex polygons rather than rectangles', () => {
      const { context, g } = createContext(TREE, { tiling: 'voronoi' });

      renderTreemapLayer(context);

      expect(cells(g)).toHaveLength(7);
      for (const cell of cells(g)) {
        expect(cell.tagName).toBe('path');
        expect(cell.getAttribute('d')).toMatch(/^M.*Z$/);
        expect(pathVertices(cell).length).toBeGreaterThanOrEqual(3);
      }
    });

    it('draws the same arrangement for the same seed and a different one for a new seed', () => {
      const drawn = (seed?: number): string[] => {
        const { context, g } = createContext(TREE, { seed, tiling: 'voronoi' });
        renderTreemapLayer(context);
        return cells(g).map(cell => cell.getAttribute('d') ?? '');
      };

      // Without a seeded PRNG the plugin reshuffles the whole chart on every render.
      expect(drawn(4)).toEqual(drawn(4));
      expect(drawn(4)).not.toEqual(drawn(5));
    });

    it('clears the rectangles when the tiling flips to voronoi, and back again', async () => {
      const { context, g } = createContext(TREE);

      renderTreemapLayer(context);
      await settle();
      expect(cells(g).every(cell => cell.tagName === 'rect')).toBe(true);

      // Rect and Voronoi cells share the class and the join key, so without the mode guard the
      // old element type would be matched as `update` and the new one would never enter.
      context.config.tiling = 'voronoi';
      renderTreemapLayer(context);
      expect(cells(g).every(cell => cell.tagName === 'path')).toBe(true);
      expect(g.querySelectorAll('rect.nge-treemap-cell')).toHaveLength(0);

      context.config.tiling = 'squarify';
      renderTreemapLayer(context);
      expect(cells(g).every(cell => cell.tagName === 'rect')).toBe(true);
      expect(g.querySelectorAll('path.nge-treemap-cell')).toHaveLength(0);
    });

    it('draws nothing rather than hanging when the plot has not been measured yet', () => {
      const { context, g } = createContext(TREE, { tiling: 'voronoi' });
      context.dimensions = { ...DIMENSIONS, boundedHeight: 0, boundedWidth: 0 };

      renderTreemapLayer(context);

      expect(cells(g)).toHaveLength(0);
    });
  });

  describe('theming', () => {
    it('assigns a palette colour per top-level branch, shared by its descendants', () => {
      const { context, g } = createContext(TREE, {
        seriesColors: ['#ff0000', '#00ff00', '#0000ff'],
        theme: { cell: { depthFade: 0 } },
      });

      renderTreemapLayer(context);

      expect(styleOf(cellByLabel(g, 'A'), 'fill')).toBe('#ff0000');
      expect(styleOf(cellByLabel(g, 'A1'), 'fill')).toBe('#ff0000');
      expect(styleOf(cellByLabel(g, 'B'), 'fill')).toBe('#00ff00');
      expect(styleOf(cellByLabel(g, 'C'), 'fill')).toBe('#0000ff');
    });

    it('lets a per-node colour override the palette, exactly, opting out of the depth fade', () => {
      const data: NgeHierarchyDatum[] = [
        { children: [{ color: '#123456', label: 'A1', value: 30 }], label: 'A' },
        ...TREE.slice(1),
      ];
      // A1 sits at depth 2, so a palette-derived fill would be lightened here. An explicitly
      // named colour is the author's exact choice and must survive verbatim.
      const { context, g } = createContext(data, {
        seriesColors: ['#ff0000'],
        theme: { cell: { depthFade: 20 } },
      });

      renderTreemapLayer(context);

      expect(styleOf(cellByLabel(g, 'A1'), 'fill')).toBe('#123456');
    });

    it('lightens a cell with depth so nesting stays visible', () => {
      const { context, g } = createContext(TREE, {
        seriesColors: ['#3366cc'],
        theme: { cell: { depthFade: 12 } },
      });

      renderTreemapLayer(context);

      const branch = styleOf(cellByLabel(g, 'A'), 'fill');
      const leaf = styleOf(cellByLabel(g, 'A1'), 'fill');

      // The top level keeps the palette entry untouched; only nesting shifts the luminance.
      expect(branch).toBe('#3366cc');
      expect(leaf).not.toBe(branch);
      expect(hcl(leaf).l).toBeGreaterThan(hcl(branch).l);
    });

    it('paints every depth alike when the fade is switched off', () => {
      const { context, g } = createContext(TREE, {
        seriesColors: ['#3366cc'],
        theme: { cell: { depthFade: 0 } },
      });

      renderTreemapLayer(context);

      expect(styleOf(cellByLabel(g, 'A1'), 'fill')).toBe(styleOf(cellByLabel(g, 'A'), 'fill'));
    });

    it('applies the cell stroke from the theme', () => {
      const { context, g } = createContext(TREE, {
        theme: { cell: { stroke: '#abcdef', strokeWidth: 3 } },
      });

      renderTreemapLayer(context);

      expect(styleOf(cellByLabel(g, 'A'), 'stroke')).toBe('#abcdef');
      expect(styleOf(cellByLabel(g, 'A'), 'stroke-width')).toBe('3');
    });

    it('reaches already-rendered cells when the theme changes at runtime', async () => {
      const { context, g } = createContext(TREE, { theme: { cell: { stroke: '#111111' } } });

      renderTreemapLayer(context);
      await settle();

      context.theme = { cell: { stroke: '#999999' } };
      renderTreemapLayer(context);

      expect(styleOf(cellByLabel(g, 'A'), 'stroke')).toBe('#999999');
    });
  });

  describe('labels', () => {
    it('draws none unless showLabels is set', () => {
      const { context, g } = createContext(TREE);

      renderTreemapLayer(context);

      expect(labels(g)).toHaveLength(0);
    });

    it('draws one per cell that has room', () => {
      const { context, g } = createContext(TREE, { showLabels: true });

      renderTreemapLayer(context);

      expect(labelledNodes(g)).toEqual(['A', 'A1', 'A2', 'B', 'B1', 'B2', 'C']);
    });

    it('centres a label in its own cell', () => {
      const { context, g } = createContext(TREE, { padding: 0, showLabels: true });

      renderTreemapLayer(context);

      const cell = rectOf(cellByLabel(g, 'C'));
      const label = labelByNode(g, 'C');
      expect(Number(label.getAttribute('x'))).toBeCloseTo(cell.x + cell.width / 2, 4);
      expect(Number(label.getAttribute('y'))).toBeCloseTo(cell.y + cell.height / 2, 4);
    });

    it('positions labels by x/y attributes, never a transform', () => {
      const { context, g } = createContext(TREE, { showLabels: true });

      renderTreemapLayer(context);

      // A transitioned `transform` decomposes through `node.transform.baseVal`, which jsdom
      // does not implement — the trap AGENTS.md flags for every Wave-3 layer. A treemap label
      // is always horizontal, so it never needs one.
      for (const label of labels(g)) {
        expect(label.getAttribute('transform')).toBeNull();
        expect(label.getAttribute('x')).not.toBeNull();
      }
    });

    it('suppresses a label on a cell too NARROW to seat the text', () => {
      const { context, g } = createContext(TREE, { minLabelSize: 120, showLabels: true });

      renderTreemapLayer(context);

      const drawn = labelledNodes(g);
      expect(drawn.length).toBeGreaterThan(0);
      for (const label of drawn) {
        expect(rectOf(cellByLabel(g, label)).width).toBeGreaterThanOrEqual(120);
      }
    });

    it('suppresses a label on a cell too SHORT to seat the text', () => {
      // The half `minLabelSize` cannot express as a width test alone: a sliver can be 200px
      // wide and 3px tall, which reads as a labelled cell with the text spilling over it.
      const { context, g } = createContext(TREE, {
        minLabelSize: 100,
        showLabels: true,
        tiling: 'dice',
      });

      renderTreemapLayer(context);

      for (const label of labelledNodes(g)) {
        expect(rectOf(cellByLabel(g, label)).height).toBeGreaterThanOrEqual(100);
      }
    });

    it('caps labels at maxLabelDepth independently of what is drawn', () => {
      const { context, g } = createContext(TREE, { maxLabelDepth: 1, showLabels: true });

      renderTreemapLayer(context);

      // Every level is still DRAWN — only the labelling stops at depth 1.
      expect(cells(g)).toHaveLength(7);
      expect(labelledNodes(g)).toEqual(['A', 'B', 'C']);
    });

    it('exits a label whose cell shrinks past the threshold and re-enters it when it grows back', async () => {
      const { context, g } = createContext(TREE, { minLabelSize: 60, showLabels: true });

      renderTreemapLayer(context);
      await settle();
      expect(labelledNodes(g)).toContain('B2');

      rerender(context, [
        ...TREE.slice(0, 1),
        {
          children: [
            { label: 'B1', value: 15 },
            { label: 'B2', value: 0.2 },
          ],
          label: 'B',
        },
        ...TREE.slice(2),
      ]);
      await settle();
      expect(labelledNodes(g)).not.toContain('B2');

      rerender(context, TREE);
      await settle();
      expect(labelledNodes(g)).toContain('B2');
    });

    it('formats a label with the node SUMMED value', () => {
      const { context, g } = createContext(TREE, {
        formatLabel: d => `${d.label} · ${d.value}`,
        showLabels: true,
      });

      renderTreemapLayer(context);

      // A branch has no `value` of its own — the formatter must still see its aggregate.
      expect(labelByNode(g, 'A').textContent).toBe('A · 50');
      expect(labelByNode(g, 'A1').textContent).toBe('A1 · 30');
    });

    it('derives label colour from the cell fill it sits on', () => {
      const { context, g } = createContext(TREE, {
        seriesColors: ['#000000', '#ffffff'],
        showLabels: true,
        theme: {
          cell: { depthFade: 0 },
          label: { color: '#111111', colorOnDark: '#eeeeee' },
        },
      });

      renderTreemapLayer(context);

      expect(styleOf(labelByNode(g, 'A'), 'fill')).toBe('#eeeeee');
      expect(styleOf(labelByNode(g, 'B'), 'fill')).toBe('#111111');
    });

    it('lets a layer-config label colour flatten every label', () => {
      const { context, g } = createContext(TREE, {
        labelColor: '#ff00ff',
        seriesColors: ['#000000', '#ffffff'],
        showLabels: true,
      });

      renderTreemapLayer(context);

      expect(styleOf(labelByNode(g, 'A'), 'fill')).toBe('#ff00ff');
      expect(styleOf(labelByNode(g, 'B'), 'fill')).toBe('#ff00ff');
    });

    it('lets a per-node label colour win over the layer config', () => {
      const data: NgeHierarchyDatum[] = [
        { label: 'A', labelColor: '#00ffff', value: 50 },
        ...TREE.slice(1),
      ];
      const { context, g } = createContext(data, { labelColor: '#ff00ff', showLabels: true });

      renderTreemapLayer(context);

      expect(styleOf(labelByNode(g, 'A'), 'fill')).toBe('#00ffff');
    });

    it('applies label typography from the theme', () => {
      const { context, g } = createContext(TREE, {
        showLabels: true,
        theme: { label: { fontSize: 14, fontWeight: 700 } },
      });

      renderTreemapLayer(context);

      expect(styleOf(labelByNode(g, 'A'), 'font-size')).toBe('14px');
      expect(styleOf(labelByNode(g, 'A'), 'font-weight')).toBe('700');
    });

    it('lets hover fall through a label to the cell beneath it', () => {
      const { context, g } = createContext(TREE, { showLabels: true });

      renderTreemapLayer(context);

      expect(styleOf(labelByNode(g, 'A'), 'pointer-events')).toBe('none');
    });

    it('anchors a Voronoi label at its cell centroid', () => {
      const { context, g } = createContext(TREE, { showLabels: true, tiling: 'voronoi' });

      renderTreemapLayer(context);

      expect(labels(g).length).toBeGreaterThan(0);
      for (const label of labels(g)) {
        const cell = cellByLabel(g, label.getAttribute('data-label') ?? '');
        const vertices = pathVertices(cell);
        const xs = vertices.map(([x]) => x);
        const ys = vertices.map(([, y]) => y);
        // The centroid of a convex polygon always lies within its bounding box.
        expect(Number(label.getAttribute('x'))).toBeGreaterThanOrEqual(Math.min(...xs) - 0.01);
        expect(Number(label.getAttribute('x'))).toBeLessThanOrEqual(Math.max(...xs) + 0.01);
        expect(Number(label.getAttribute('y'))).toBeGreaterThanOrEqual(Math.min(...ys) - 0.01);
        expect(Number(label.getAttribute('y'))).toBeLessThanOrEqual(Math.max(...ys) + 0.01);
      }
    });

    it('exits every label when showLabels is switched off', async () => {
      const { context, g } = createContext(TREE, { showLabels: true });

      renderTreemapLayer(context);
      await settle();
      expect(labels(g).length).toBeGreaterThan(0);

      context.config.showLabels = false;
      renderTreemapLayer(context);
      await settle();

      expect(labels(g)).toHaveLength(0);
    });
  });

  describe('tooltip', () => {
    it('emits a tooltip event at the cell on mouseenter', () => {
      const { context, g, onTooltip } = createContext(TREE, { tooltip: true });

      renderTreemapLayer(context);
      cellByLabel(g, 'C').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0];
      expect(event.visible).toBe(true);
      expect(event.content).toEqual({ label: 'C', value: 25 });
      expect(event.dimensions).toEqual({ height: 65, width: 120 });
    });

    it('reports a branch aggregate rather than an undefined value', () => {
      const { context, g, onTooltip } = createContext(TREE, { tooltip: true });

      renderTreemapLayer(context);
      cellByLabel(g, 'A').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip.mock.calls[0][0].content).toEqual({ label: 'A', value: 50 });
    });

    it('keeps the bubble on the canvas', () => {
      const { context, g, onTooltip } = createContext(TREE, { tooltip: true });

      renderTreemapLayer(context);
      for (const cell of cells(g)) {
        cell.dispatchEvent(new MouseEvent('mouseenter'));
      }

      const containerHeight = 10 + DIMENSIONS.boundedHeight + 10;
      for (const [event] of onTooltip.mock.calls) {
        expect(event.position.x).toBeGreaterThanOrEqual(10);
        expect(event.position.x).toBeLessThanOrEqual(10 + DIMENSIONS.boundedWidth - 120);
        expect(event.position.y).toBeGreaterThanOrEqual(0);
        expect(event.position.y).toBeLessThanOrEqual(containerHeight - 65);
      }
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(TREE, { tooltip: true });

      renderTreemapLayer(context);
      cellByLabel(g, 'C').dispatchEvent(new MouseEvent('mouseleave'));

      expect(onTooltip).toHaveBeenCalledWith(expect.objectContaining({ visible: false }));
    });

    it('wires no hover handlers when the tooltip is off', () => {
      const { context, g, onTooltip } = createContext(TREE);

      renderTreemapLayer(context);
      cellByLabel(g, 'C').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).not.toHaveBeenCalled();
      expect(styleOf(cellByLabel(g, 'C'), 'cursor')).toBe('default');
    });

    it('detaches the handlers when the tooltip is switched off at runtime', async () => {
      const { context, g, onTooltip } = createContext(TREE, { tooltip: true });

      renderTreemapLayer(context);
      await settle();

      context.tooltipConfig = undefined;
      context.tooltipHandlers = undefined;
      renderTreemapLayer(context);
      cellByLabel(g, 'C').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).not.toHaveBeenCalled();
    });
  });

  describe('click', () => {
    it('reports the datum, the event and the drawn index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(TREE, { onClick });

      renderTreemapLayer(context);
      cellByLabel(g, 'A1').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data.label).toBe('A1');
      expect(onClick.mock.calls[0][0].index).toBe(cellOrder(g).indexOf('A1'));
      expect(styleOf(cellByLabel(g, 'A1'), 'cursor')).toBe('pointer');
    });

    it('detaches the handler when it is removed at runtime', async () => {
      const onClick = jest.fn();
      const { context, g } = createContext(TREE, { onClick });

      renderTreemapLayer(context);
      await settle();

      context.config.onClick = undefined;
      renderTreemapLayer(context);
      cellByLabel(g, 'A1').dispatchEvent(new MouseEvent('click'));

      expect(onClick).not.toHaveBeenCalled();
    });
  });

  describe('guards', () => {
    it('draws nothing for empty data', () => {
      const { context, g } = createContext([]);

      renderTreemapLayer(context);

      expect(g.querySelectorAll('.nge-treemap-container')).toHaveLength(0);
    });

    it('clamps a negative value to zero rather than inverting a cell', () => {
      const { context, g } = createContext([
        { label: 'A', value: 50 },
        { label: 'B', value: -20 },
      ]);

      renderTreemapLayer(context);

      expect(rectOf(cellByLabel(g, 'B')).width).toBeGreaterThanOrEqual(0);
      expect(rectOf(cellByLabel(g, 'B')).height).toBeGreaterThanOrEqual(0);
      expect(areaOfRect(cellByLabel(g, 'A'))).toBeCloseTo(PLOT_AREA, 0);
    });
  });
});
