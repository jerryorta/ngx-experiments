import { scaleLinear } from 'd3-scale';
import { select } from 'd3-selection';

import type { NgeScatterDataPoint, NgeScatterLayerConfig } from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeScatterLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { renderScatterLayer } from './render-scatter-layer';

type ScatterContext = NgeChartLayerContext<
  NgeScatterDataPoint,
  NgeScatterLayerConfig,
  NgeScatterLayerTheme | undefined
>;

interface ContextOptions {
  animationMs?: number;
  onTooltip?: jest.Mock;
  pointRadius?: number;
  seriesColors?: string[];
  theme?: NgeScatterLayerTheme;
  tooltip?: boolean;
}

/**
 * Build a jsdom SVG bounds group + a layer context for the scatter renderer.
 * Fill / stroke are set synchronously via `.style()` so they can be read back
 * verbatim from `circle.style.getPropertyValue('fill')` without flushing d3 transitions.
 */
function createContext(
  data: NgeScatterDataPoint[],
  options: ContextOptions = {}
): { context: ScatterContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeScatterLayerConfig = {
    animationMs: options.animationMs,
    data,
    pointRadius: options.pointRadius,
    renderer: renderScatterLayer,
    seriesColors: options.seriesColors,
    type: 'scatter',
  };

  const context: ScatterContext = {
    bounds: select(g),
    config,
    data,
    dimensions: {
      boundedHeight: 300,
      boundedWidth: 500,
      height: 340,
      margin: { bottom: 25, left: 45, right: 15, top: 15 },
      width: 560,
    },
    margins: { bottom: 25, left: 45, right: 15, top: 15 },
    scales: {
      x: scaleLinear().domain([0, 100]).range([0, 500]),
      y: scaleLinear().domain([0, 100]).range([300, 0]),
    },
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? { enabled: true, height: 65, position: 'above', width: 120 }
      : undefined,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/** Read the inline (verbatim) fill of a scatter circle. */
function fillOf(circle: Element): string {
  return (circle as SVGElement).style.getPropertyValue('fill');
}

/** Find the rendered circle bound to a specific datum (via d3's __data__). */
function circleForDatum(g: SVGGElement, datum: NgeScatterDataPoint): SVGCircleElement {
  const match = Array.from(g.querySelectorAll<SVGCircleElement>('.nge-scatter-point')).find(
    node => (node as unknown as { __data__: NgeScatterDataPoint }).__data__ === datum
  );
  if (!match) {
    throw new Error('No circle bound to the given datum');
  }
  return match;
}

/** Find the Voronoi cell bound to a specific datum (via d3's __data__). */
function cellForDatum(g: SVGGElement, datum: NgeScatterDataPoint): SVGPathElement {
  const match = Array.from(g.querySelectorAll<SVGPathElement>('.nge-scatter-voronoi-cell')).find(
    node => (node as unknown as { __data__: NgeScatterDataPoint }).__data__ === datum
  );
  if (!match) {
    throw new Error('No Voronoi cell bound to the given datum');
  }
  return match;
}

/**
 * Real-timer wait so d3 transitions run to completion. Fake timers do NOT drive
 * d3-transition in this zone-based jsdom env, so geometry (`r`) and hover/reset
 * fill — which animate — are only observable after a real delay past the duration.
 */
const settle = (ms = 400): Promise<void> => new Promise(resolve => setTimeout(resolve, ms));

describe('renderScatterLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('groupBySeries (via rendered DOM)', () => {
    it('renders a single "__default__" series when no point has a seriesId', () => {
      const data: NgeScatterDataPoint[] = [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
        { x: 50, y: 60 },
      ];
      const { context, g } = createContext(data);

      renderScatterLayer(context);

      const seriesGroups = g.querySelectorAll('.nge-scatter-series');
      expect(seriesGroups).toHaveLength(1);
      expect(seriesGroups[0].getAttribute('data-series-id')).toBe('__default__');
      expect(g.querySelectorAll('.nge-scatter-point')).toHaveLength(3);
    });

    it('buckets points into one group per seriesId', () => {
      const data: NgeScatterDataPoint[] = [
        { seriesId: 'Alpha', x: 1, y: 1 },
        { seriesId: 'Beta', x: 2, y: 2 },
        { seriesId: 'Alpha', x: 3, y: 3 },
        { seriesId: 'Beta', x: 4, y: 4 },
        { seriesId: 'Alpha', x: 5, y: 5 },
      ];
      const { context, g } = createContext(data);

      renderScatterLayer(context);

      const seriesGroups = Array.from(g.querySelectorAll('.nge-scatter-series'));
      expect(seriesGroups.map(s => s.getAttribute('data-series-id'))).toEqual(['Alpha', 'Beta']);
      expect(seriesGroups[0].querySelectorAll('.nge-scatter-point')).toHaveLength(3);
      expect(seriesGroups[1].querySelectorAll('.nge-scatter-point')).toHaveLength(2);
    });

    it('cycles the palette with modulo across series', () => {
      const data: NgeScatterDataPoint[] = [
        { seriesId: 'A', x: 1, y: 1 },
        { seriesId: 'B', x: 2, y: 2 },
        { seriesId: 'C', x: 3, y: 3 },
      ];
      const { context, g } = createContext(data, { seriesColors: ['var(--c0)', 'var(--c1)'] });

      renderScatterLayer(context);

      const groups = Array.from(g.querySelectorAll('.nge-scatter-series'));
      const firstPointFill = (group: Element): string =>
        fillOf(group.querySelector('.nge-scatter-point')!);

      // Series index 0 -> c0, 1 -> c1, 2 -> c0 (2 % 2)
      expect(firstPointFill(groups[0])).toBe('var(--c0)');
      expect(firstPointFill(groups[1])).toBe('var(--c1)');
      expect(firstPointFill(groups[2])).toBe('var(--c0)');
    });
  });

  describe('color precedence', () => {
    it('lets a per-point color win over the series palette', () => {
      const overridden: NgeScatterDataPoint = {
        color: 'var(--override)',
        seriesId: 'A',
        x: 3,
        y: 3,
      };
      const data: NgeScatterDataPoint[] = [{ seriesId: 'A', x: 1, y: 1 }, overridden];
      const { context, g } = createContext(data, { seriesColors: ['var(--series-a)'] });

      renderScatterLayer(context);

      expect(fillOf(circleForDatum(g, data[0]))).toBe('var(--series-a)');
      expect(fillOf(circleForDatum(g, overridden))).toBe('var(--override)');
    });

    it('uses the series palette when a point has no color', () => {
      const data: NgeScatterDataPoint[] = [{ seriesId: 'Only', x: 1, y: 1 }];
      const { context, g } = createContext(data, { seriesColors: ['var(--series-only)'] });

      renderScatterLayer(context);

      expect(fillOf(circleForDatum(g, data[0]))).toBe('var(--series-only)');
    });

    it('falls back to theme.point.color when the palette is empty', () => {
      const data: NgeScatterDataPoint[] = [{ x: 1, y: 1 }];
      const { context, g } = createContext(data, {
        theme: { point: { color: 'var(--solo)', colors: [] } },
      });

      renderScatterLayer(context);

      expect(fillOf(circleForDatum(g, data[0]))).toBe('var(--solo)');
    });

    it('defaults a single series to the theme palette head (var(--chart-primary))', () => {
      const data: NgeScatterDataPoint[] = [{ x: 1, y: 1 }];
      const { context, g } = createContext(data);

      renderScatterLayer(context);

      // No seriesColors + default theme -> palette[0] === 'var(--chart-primary)'
      expect(fillOf(circleForDatum(g, data[0]))).toBe('var(--chart-primary)');
    });
  });

  describe('Voronoi overlay', () => {
    it('appends a single overlay after the series groups with one cell per point', () => {
      const data: NgeScatterDataPoint[] = [
        { seriesId: 'A', x: 10, y: 10 },
        { seriesId: 'B', x: 40, y: 40 },
        { seriesId: 'A', x: 70, y: 20 },
      ];
      const { context, g } = createContext(data, { tooltip: true });

      renderScatterLayer(context);

      const scatterGroup = g.querySelector('.nge-scatter-group')!;
      const overlays = scatterGroup.querySelectorAll('.nge-scatter-voronoi-overlay');
      expect(overlays).toHaveLength(1);
      // Overlay must be the LAST child so it stays on top of every series group
      expect(scatterGroup.lastElementChild).toBe(overlays[0]);
      expect(overlays[0].querySelectorAll('.nge-scatter-voronoi-cell')).toHaveLength(3);
    });

    it('routes the hovered cell datum to the tooltip with the resolved series border color', () => {
      const data: NgeScatterDataPoint[] = [
        { color: 'var(--pt-0)', seriesId: 'A', x: 12, y: 10 },
        { seriesId: 'B', x: 40, y: 40 },
      ];
      const { context, g, onTooltip } = createContext(data, { tooltip: true });

      renderScatterLayer(context);

      const cells = g.querySelectorAll('.nge-scatter-voronoi-cell');
      cells[0].dispatchEvent(new MouseEvent('pointerenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.label).toContain('12.0');
      expect(event.style?.borderColor).toBe('var(--pt-0)');
    });

    it('highlights the hovered point by datum identity, not DOM position', () => {
      // Grouping reorders: series A = [A0, A1], series B = [B0].
      // DOM circle order is [A0, A1, B0]; voronoi cell order matches data order [A0, B0, A1].
      // Hovering the B0 cell (data index 1) must highlight B0, NOT DOM index 1 (A1).
      const a0: NgeScatterDataPoint = { seriesId: 'A', x: 10, y: 10 };
      const b0: NgeScatterDataPoint = { seriesId: 'B', x: 50, y: 50 };
      const a1: NgeScatterDataPoint = { seriesId: 'A', x: 90, y: 20 };
      const data: NgeScatterDataPoint[] = [a0, b0, a1];
      const { context, g } = createContext(data, { tooltip: true });

      renderScatterLayer(context);

      // Clear the enter transitions so only the hover transition remains observable
      select(g).selectAll('.nge-scatter-point').interrupt();

      const cells = g.querySelectorAll('.nge-scatter-voronoi-cell');
      // Sanity: cell order follows the original data order
      expect((cells[1] as unknown as { __data__: NgeScatterDataPoint }).__data__).toBe(b0);
      cells[1].dispatchEvent(new MouseEvent('pointerenter'));

      const hasPendingTransition = (circle: SVGCircleElement): boolean =>
        (circle as unknown as { __transition?: unknown }).__transition != null;

      // Identity-selected circle (B0) is highlighted; DOM-position-1 circle (A1) is not.
      expect(hasPendingTransition(circleForDatum(g, b0))).toBe(true);
      expect(hasPendingTransition(circleForDatum(g, a1))).toBe(false);
    });

    it('restores the resolved series color on pointerleave (not a blanket theme color)', async () => {
      const b0: NgeScatterDataPoint = { seriesId: 'B', x: 50, y: 50 };
      const data: NgeScatterDataPoint[] = [{ seriesId: 'A', x: 10, y: 10 }, b0];
      const { context, g } = createContext(data, {
        seriesColors: ['var(--series-a)', 'var(--series-b)'],
        tooltip: true,
      });

      renderScatterLayer(context);
      await settle();

      const circle = circleForDatum(g, b0);
      expect(fillOf(circle)).toBe('var(--series-b)');

      // Sentinel proves the reset transition actually rewrites the fill
      circle.style.setProperty('fill', 'green');

      const cell = cellForDatum(g, b0);
      cell.dispatchEvent(new MouseEvent('pointerenter'));
      cell.dispatchEvent(new MouseEvent('pointerleave'));
      await settle();

      // Restored to B's resolved SERIES color (no per-point color) — NOT the default
      // theme.point.color (#1976D2). A blanket-reset regression would fail here.
      expect(fillOf(circle)).toBe('var(--series-b)');
      expect(fillOf(circle)).not.toBe('#1976D2');
    });
  });

  describe('single-series preservation', () => {
    it('re-renders idempotently, keeping one default series group', () => {
      const data: NgeScatterDataPoint[] = [
        { x: 10, y: 20 },
        { x: 30, y: 40 },
      ];
      const { context, g } = createContext(data);

      renderScatterLayer(context);
      renderScatterLayer(context);

      expect(g.querySelectorAll('.nge-scatter-group')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-scatter-series')).toHaveLength(1);
      expect(g.querySelectorAll('.nge-scatter-point')).toHaveLength(2);
    });
  });

  describe('point geometry', () => {
    it('renders r from a per-point size, overriding the base radius', async () => {
      const sized: NgeScatterDataPoint = { size: 12, x: 10, y: 10 };
      const data: NgeScatterDataPoint[] = [{ x: 40, y: 40 }, sized];
      const { context, g } = createContext(data, { pointRadius: 4 });

      renderScatterLayer(context);
      await settle();

      // Explicit size wins; the unsized point uses the configured base radius
      expect(circleForDatum(g, sized).getAttribute('r')).toBe('12');
      expect(circleForDatum(g, data[0]).getAttribute('r')).toBe('4');
    });
  });

  describe('animationMs', () => {
    it('renders instantly with animationMs 0 (gesture mode — no smearing)', async () => {
      const data: NgeScatterDataPoint[] = [{ x: 40, y: 40 }];
      const { context, g } = createContext(data, { animationMs: 0, pointRadius: 5 });

      renderScatterLayer(context);
      // duration(0) completes on the next timer flush — far shorter than 300ms
      await settle(50);

      expect(circleForDatum(g, data[0]).getAttribute('r')).toBe('5');
      expect(circleForDatum(g, data[0]).getAttribute('opacity')).toBe('0.7');
    });
  });

  describe('point opacity', () => {
    it('resolves a per-point opacity over the theme default (series-fade primitive)', async () => {
      const faded: NgeScatterDataPoint = { opacity: 0.2, seriesId: 'A', x: 10, y: 10 };
      const data: NgeScatterDataPoint[] = [{ seriesId: 'B', x: 40, y: 40 }, faded];
      const { context, g } = createContext(data);

      renderScatterLayer(context);
      await settle();

      // Explicit per-point opacity wins; the other point uses theme.point.opacity (0.7)
      expect(circleForDatum(g, faded).getAttribute('opacity')).toBe('0.2');
      expect(circleForDatum(g, data[0]).getAttribute('opacity')).toBe('0.7');
    });
  });
});
