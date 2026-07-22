import type { ScaleLinear } from 'd3-scale';

import { select } from 'd3-selection';

import type {
  NgeChartConfig,
  NgeHistogramBin,
  NgeHistogramDataPoint,
  NgeHistogramLayerConfig,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeHistogramLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import {
  binHistogram,
  createHistogramChartScales,
  fitExpectedCurve,
} from '../../nge-chart/nge-chart.histogram.helpers';
import { renderHistogramLayer } from './render-histogram-layer';

type HistogramContext = NgeChartLayerContext<
  NgeHistogramDataPoint,
  NgeHistogramLayerConfig,
  NgeHistogramLayerTheme | undefined
>;

interface ContextOptions {
  barGap?: number;
  binCount?: number;
  domain?: [number, number];
  mode?: 'histogram' | 'rootogram';
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  showLabels?: boolean;
  showZeroLine?: boolean;
  theme?: NgeHistogramLayerTheme;
  tooltip?: boolean;
}

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** 1..10 — ten evenly spread observations. */
const VALUES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

/** Symmetric-around-5 sample used for the rootogram cases. */
const SYMMETRIC = [2, 4, 4, 4, 5, 5, 7, 9];

/**
 * Build a jsdom SVG bounds group + a layer context for the histogram renderer,
 * with scales from the real factory so bin widths / value domain match
 * production. Geometry is applied synchronously so it can be read back verbatim.
 */
function createContext(
  values: number[],
  options: ContextOptions = {}
): { context: HistogramContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();
  const data: NgeHistogramDataPoint[] = values.map(value => ({ value }));

  const config: NgeHistogramLayerConfig = {
    barGap: options.barGap,
    binCount: options.binCount,
    data,
    domain: options.domain,
    mode: options.mode,
    onClick: options.onClick,
    renderer: renderHistogramLayer,
    showLabels: options.showLabels,
    showZeroLine: options.showZeroLine,
    tooltip: options.tooltip
      ? {
          enabled: true,
          formatContent: (bin: NgeHistogramBin) => ({
            label: `${bin.x0}-${bin.x1}`,
            value: bin.count,
          }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    type: 'histogram',
  };

  const chartConfig: NgeChartConfig = { layers: [config] };
  const scales = createHistogramChartScales(chartConfig, DIMENSIONS);

  const context: HistogramContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: { bottom: 25, left: 45, right: 15, top: 15 },
    scales,
    theme: options.theme,
    tooltipHandlers: options.tooltip ? { onTooltip } : undefined,
  };

  return { context, g, onTooltip };
}

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** Numeric value of an attribute. */
function num(el: Element, attr: string): number {
  return Number(el.getAttribute(attr));
}

/** The bar rect for a bin index. */
function barRect(g: SVGGElement, index: number): SVGRectElement {
  const rect = g.querySelector<SVGRectElement>(`.nge-histogram-bar[data-index="${index}"]`);
  if (!rect) {
    throw new Error(`No histogram bar for index ${index}`);
  }
  return rect;
}

/** Document-order indices of the last bar, the curve, and the first node. */
function domOrder(g: SVGGElement): { curve: number; firstNode: number; lastBar: number } {
  const children = Array.from(g.children);
  const lastIndexMatching = (selector: string): number => {
    for (let i = children.length - 1; i >= 0; i--) {
      if (children[i].matches(selector)) {
        return i;
      }
    }
    return -1;
  };
  return {
    curve: children.findIndex(child => child.matches('.nge-histogram-curve')),
    firstNode: children.findIndex(child => child.matches('.nge-histogram-node')),
    lastBar: lastIndexMatching('.nge-histogram-bar'),
  };
}

describe('renderHistogramLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderHistogramLayer(context);

      expect(g.querySelectorAll('.nge-histogram-bar')).toHaveLength(0);
    });
  });

  describe('bar structure + geometry', () => {
    it('renders one rect per bin, tagged with its index', () => {
      const { context, g } = createContext(VALUES, { binCount: 5, domain: [0, 10] });

      renderHistogramLayer(context);

      const bars = Array.from(g.querySelectorAll('.nge-histogram-bar'));
      expect(bars).toHaveLength(5);
      expect(bars.map(bar => bar.getAttribute('data-index'))).toEqual(['0', '1', '2', '3', '4']);
    });

    it('re-renders idempotently', () => {
      const { context, g } = createContext(VALUES, { binCount: 5, domain: [0, 10] });

      renderHistogramLayer(context);
      renderHistogramLayer(context);

      expect(g.querySelectorAll('.nge-histogram-bar')).toHaveLength(5);
    });

    it('sizes each bar to its bin span (minus the gap) and its count height', () => {
      const { context, g } = createContext(VALUES, { barGap: 1, binCount: 5, domain: [0, 10] });

      renderHistogramLayer(context);

      const xScale = context.scales.x as ScaleLinear<number, number>;
      const yScale = context.scales.y as ScaleLinear<number, number>;
      const { bins } = binHistogram(VALUES, { binCount: 5, domain: [0, 10] });

      // Bin 0 is [0, 2] with a count of 1.
      const left = xScale(bins[0].x0);
      const right = xScale(bins[0].x1);
      const bar = barRect(g, 0);
      expect(num(bar, 'x')).toBeCloseTo(left + 0.5, 6);
      expect(num(bar, 'width')).toBeCloseTo(right - left - 1, 6);
      expect(num(bar, 'y')).toBeCloseTo(yScale(1), 6);
      expect(num(bar, 'height')).toBeCloseTo(yScale(0) - yScale(1), 6);
    });

    it('spans the full bin width when no gap is configured', () => {
      const { context, g } = createContext(VALUES, { barGap: 0, binCount: 5, domain: [0, 10] });

      renderHistogramLayer(context);

      const xScale = context.scales.x as ScaleLinear<number, number>;
      const bar = barRect(g, 0);
      expect(num(bar, 'x')).toBeCloseTo(xScale(0), 6);
      expect(num(bar, 'width')).toBeCloseTo(xScale(2) - xScale(0), 6);
    });
  });

  describe('color resolution (via .style)', () => {
    it('fills bars from the theme default primary token', () => {
      const { context, g } = createContext(VALUES, { binCount: 5, domain: [0, 10] });

      renderHistogramLayer(context);

      expect(styleOf(barRect(g, 0), 'fill')).toBe('var(--chart-primary)');
    });

    it('honours a theme bar color override', () => {
      const { context, g } = createContext(VALUES, {
        binCount: 5,
        domain: [0, 10],
        theme: { bar: { color: 'var(--override)' } },
      });

      renderHistogramLayer(context);

      expect(styleOf(barRect(g, 0), 'fill')).toBe('var(--override)');
    });
  });

  describe('rootogram mode', () => {
    it('draws the fitted expected-frequency curve as a path', () => {
      const { context, g } = createContext(SYMMETRIC, {
        binCount: 4,
        domain: [1, 9],
        mode: 'rootogram',
      });

      renderHistogramLayer(context);

      const curve = g.querySelector('.nge-histogram-curve');
      expect(curve).not.toBeNull();
      expect(curve!.getAttribute('d')).toBeTruthy();
    });

    it('hangs each bar from the fitted expected value down by the observed count', () => {
      const { context, g } = createContext(SYMMETRIC, {
        barGap: 0,
        binCount: 4,
        domain: [1, 9],
        mode: 'rootogram',
      });

      renderHistogramLayer(context);

      const yScale = context.scales.y as ScaleLinear<number, number>;
      const { bins } = binHistogram(SYMMETRIC, { binCount: 4, domain: [1, 9] });
      const fit = fitExpectedCurve(SYMMETRIC, bins, { xExtent: [1, 9] });

      // Bar 0 hangs from expected[0] down by its count → [expected, expected - count].
      const top = fit.expected[0];
      const bottom = top - bins[0].count;
      const bar = barRect(g, 0);
      expect(num(bar, 'y')).toBeCloseTo(Math.min(yScale(top), yScale(bottom)), 6);
      expect(num(bar, 'height')).toBeCloseTo(Math.abs(yScale(bottom) - yScale(top)), 6);
    });

    it('draws one node per bin, centered on each bar, in front of the bars', () => {
      const { context, g } = createContext(SYMMETRIC, {
        barGap: 0,
        binCount: 4,
        domain: [1, 9],
        mode: 'rootogram',
      });

      renderHistogramLayer(context);

      const nodes = Array.from(g.querySelectorAll<SVGCircleElement>('.nge-histogram-node'));
      expect(nodes).toHaveLength(4);

      // Each node's x is its bar's horizontal center.
      const xScale = context.scales.x as ScaleLinear<number, number>;
      const { bins } = binHistogram(SYMMETRIC, { binCount: 4, domain: [1, 9] });
      nodes.forEach((node, index) => {
        const bar = barRect(g, index);
        const barCenter = num(bar, 'x') + num(bar, 'width') / 2;
        expect(num(node, 'cx')).toBeCloseTo(barCenter, 6);
        expect(num(node, 'cx')).toBeCloseTo(xScale((bins[index].x0 + bins[index].x1) / 2), 6);
      });

      // Z-order: the curve + every node come AFTER the bars in document order so
      // they paint in front of them.
      const order = domOrder(g);
      expect(order.curve).toBeGreaterThan(order.lastBar);
      expect(order.firstNode).toBeGreaterThan(order.curve);
    });

    it('keeps the curve + nodes in front of the bars after binCount grows', () => {
      // A higher bin count enter-appends new rects; the render must re-raise the
      // curve + nodes so freshly-appended bars never cover them.
      const { context, g } = createContext(SYMMETRIC, {
        barGap: 0,
        binCount: 4,
        domain: [1, 9],
        mode: 'rootogram',
      });
      renderHistogramLayer(context);

      context.config.binCount = 8;
      const chartConfig: NgeChartConfig = { layers: [context.config] };
      context.scales = createHistogramChartScales(chartConfig, DIMENSIONS);
      renderHistogramLayer(context);

      expect(g.querySelectorAll('.nge-histogram-node')).toHaveLength(8);
      const order = domOrder(g);
      expect(order.curve).toBeGreaterThan(order.lastBar);
      expect(order.firstNode).toBeGreaterThan(order.curve);
    });

    it('hides the nodes when the themed node radius is 0', () => {
      const { context, g } = createContext(SYMMETRIC, {
        binCount: 4,
        domain: [1, 9],
        mode: 'rootogram',
        theme: { node: { radius: 0 } },
      });

      renderHistogramLayer(context);

      expect(g.querySelector('.nge-histogram-curve')).not.toBeNull();
      expect(g.querySelectorAll('.nge-histogram-node')).toHaveLength(0);
    });

    it('draws no curve or nodes in the default histogram mode', () => {
      const { context, g } = createContext(VALUES, { binCount: 5, domain: [0, 10] });

      renderHistogramLayer(context);

      expect(g.querySelector('.nge-histogram-curve')).toBeNull();
      expect(g.querySelectorAll('.nge-histogram-node')).toHaveLength(0);
    });

    it('draws the y = 0 baseline across the plot when showZeroLine is set', () => {
      const { context, g } = createContext(SYMMETRIC, {
        binCount: 4,
        domain: [1, 9],
        mode: 'rootogram',
        showZeroLine: true,
      });

      renderHistogramLayer(context);

      const zeroLine = g.querySelector<SVGLineElement>('.nge-histogram-zero-line');
      expect(zeroLine).not.toBeNull();
      const yScale = context.scales.y as ScaleLinear<number, number>;
      expect(num(zeroLine!, 'y1')).toBeCloseTo(yScale(0), 6);
      expect(num(zeroLine!, 'y2')).toBeCloseTo(yScale(0), 6);
      expect(num(zeroLine!, 'x1')).toBeCloseTo(0, 6);
      expect(num(zeroLine!, 'x2')).toBeCloseTo(DIMENSIONS.boundedWidth, 6);
    });

    it('places the zero line in front of the bars but behind the curve', () => {
      const { context, g } = createContext(SYMMETRIC, {
        binCount: 4,
        domain: [1, 9],
        mode: 'rootogram',
        showZeroLine: true,
      });

      renderHistogramLayer(context);

      const children = Array.from(g.children);
      const order = domOrder(g);
      const zeroLineIdx = children.findIndex(child => child.matches('.nge-histogram-zero-line'));
      expect(zeroLineIdx).toBeGreaterThan(order.lastBar);
      expect(zeroLineIdx).toBeLessThan(order.curve);
    });

    it('draws no zero line by default, nor in histogram mode when requested', () => {
      const { context: rootogramOff, g: gOff } = createContext(SYMMETRIC, {
        binCount: 4,
        domain: [1, 9],
        mode: 'rootogram',
      });
      renderHistogramLayer(rootogramOff);
      expect(gOff.querySelector('.nge-histogram-zero-line')).toBeNull();

      // Requested but plain histogram mode → suppressed (y = 0 is the x-axis).
      const { context: histoMode, g: gHisto } = createContext(VALUES, {
        binCount: 5,
        domain: [0, 10],
        showZeroLine: true,
      });
      renderHistogramLayer(histoMode);
      expect(gHisto.querySelector('.nge-histogram-zero-line')).toBeNull();
    });

    it('renders bars on-bounds in [0, maxCount] when the rootogram fit is degenerate (σ = 0)', () => {
      const { context, g } = createContext([5, 5, 5], {
        barGap: 0,
        binCount: 5,
        domain: [0, 10],
        mode: 'rootogram',
      });

      renderHistogramLayer(context);

      const yScale = context.scales.y as ScaleLinear<number, number>;
      // σ = 0 → degenerate fit: no curve, plain axis-anchored bars in [0, count].
      expect(g.querySelector('.nge-histogram-curve')).toBeNull();

      // Bin 2 ([4, 6]) holds all 3 observations — the tallest bar.
      const bar = barRect(g, 2);
      expect(num(bar, 'y')).toBeCloseTo(yScale(3), 6);
      expect(num(bar, 'height')).toBeCloseTo(yScale(0) - yScale(3), 6);
      // On-bounds: top ≥ 0 and bottom ≤ the bounded height (not negative pixels).
      expect(num(bar, 'y')).toBeGreaterThanOrEqual(0);
      expect(num(bar, 'y') + num(bar, 'height')).toBeLessThanOrEqual(
        DIMENSIONS.boundedHeight + 1e-6
      );
    });
  });

  describe('labels', () => {
    it('draws one count label per bin when showLabels is set', () => {
      const { context, g } = createContext(VALUES, {
        binCount: 5,
        domain: [0, 10],
        showLabels: true,
      });

      renderHistogramLayer(context);

      const labels = Array.from(g.querySelectorAll('.nge-histogram-label'));
      expect(labels).toHaveLength(5);
      // Bin 4 ([8, 10]) holds 3 observations.
      expect(labels.some(label => label.textContent === '3')).toBe(true);
    });

    it('renders no labels by default', () => {
      const { context, g } = createContext(VALUES, { binCount: 5, domain: [0, 10] });

      renderHistogramLayer(context);

      expect(g.querySelectorAll('.nge-histogram-label')).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('leaves bars non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(VALUES, { binCount: 5, domain: [0, 10] });

      renderHistogramLayer(context);

      expect(styleOf(barRect(g, 0), 'cursor')).toBe('default');
    });

    it('routes the hovered bin to the tooltip with its count', () => {
      const { context, g, onTooltip } = createContext(VALUES, {
        binCount: 5,
        domain: [0, 10],
        tooltip: true,
      });

      renderHistogramLayer(context);
      barRect(g, 4).dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      // Bin 4 ([8, 10]) holds 3 observations.
      expect(event.content.value).toBe(3);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(VALUES, {
        binCount: 5,
        domain: [0, 10],
        tooltip: true,
      });

      renderHistogramLayer(context);
      const bar = barRect(g, 0);
      bar.dispatchEvent(new MouseEvent('mouseenter'));
      bar.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked bin and its index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(VALUES, { binCount: 5, domain: [0, 10], onClick });

      renderHistogramLayer(context);
      barRect(g, 2).dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].index).toBe(2);
      // Bin 2 is [4, 6] with a count of 2.
      expect(onClick.mock.calls[0][0].data).toMatchObject({ count: 2, x0: 4, x1: 6 });
    });
  });
});
