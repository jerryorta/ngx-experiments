import type { ScaleBand, ScaleLinear } from 'd3-scale';

import { select } from 'd3-selection';

import type {
  NgeChartConfig,
  NgeStackedBarDataPoint,
  NgeStackedBarLayerConfig,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeStackedBarLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import { createStackedBarChartScales } from '../../nge-chart/nge-chart.stacked-bar.helpers';
import { renderStackedBarLayer } from './render-stacked-bar-layer';

type StackedBarContext = NgeChartLayerContext<
  NgeStackedBarDataPoint,
  NgeStackedBarLayerConfig,
  NgeStackedBarLayerTheme | undefined
>;

interface ContextOptions {
  animationMs?: number;
  bandWidthAccessor?: (category: string, total: number) => number;
  barPadding?: number;
  barRadius?: number;
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  orientation?: 'horizontal' | 'vertical';
  seriesColors?: string[];
  showLabels?: boolean;
  stackOffset?: NgeStackedBarLayerConfig['stackOffset'];
  theme?: NgeStackedBarLayerTheme;
  tooltip?: boolean;
}

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

/** Two series (A, B) across two categories (Q1, Q2) — Q1 totals 30, Q2 totals 15. */
const STACKED: NgeStackedBarDataPoint[] = [
  { category: 'Q1', seriesId: 'A', value: 10 },
  { category: 'Q1', seriesId: 'B', value: 20 },
  { category: 'Q2', seriesId: 'A', value: 10 },
  { category: 'Q2', seriesId: 'B', value: 5 },
];

/**
 * Build a jsdom SVG bounds group + a layer context for the stacked-bar renderer,
 * with scales derived from the real factory so band widths / value domain match
 * production. Geometry is applied synchronously so it can be read back verbatim.
 */
function createContext(
  data: NgeStackedBarDataPoint[],
  options: ContextOptions = {}
): { context: StackedBarContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeStackedBarLayerConfig = {
    animationMs: options.animationMs,
    bandWidthAccessor: options.bandWidthAccessor,
    barPadding: options.barPadding,
    barRadius: options.barRadius,
    data,
    onClick: options.onClick,
    orientation: options.orientation,
    renderer: renderStackedBarLayer,
    seriesColors: options.seriesColors,
    showLabels: options.showLabels,
    stackOffset: options.stackOffset,
    type: 'stacked-bar',
  };

  const chartConfig: NgeChartConfig = { layers: [config] };
  const scales = createStackedBarChartScales(chartConfig, DIMENSIONS);

  const context: StackedBarContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: { bottom: 25, left: 45, right: 15, top: 15 },
    scales,
    theme: options.theme,
    tooltipConfig: options.tooltip
      ? {
          enabled: true,
          formatContent: (d: NgeStackedBarDataPoint) => ({
            label: `${d.seriesId} ${d.category}`,
            value: d.value,
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

/** Read the inline (verbatim) style property of an element. */
function styleOf(el: Element, prop: string): string {
  return (el as SVGElement).style.getPropertyValue(prop);
}

/** The column `<g>` for a category. */
function columnFor(g: SVGGElement, category: string): SVGGElement {
  const column = Array.from(g.querySelectorAll<SVGGElement>('.nge-stacked-bar-column')).find(
    node => node.getAttribute('data-category') === category
  );
  if (!column) {
    throw new Error(`No column group for category "${category}"`);
  }
  return column;
}

/** The segment rect for a category + seriesId. */
function segmentRect(g: SVGGElement, category: string, seriesId: string): SVGRectElement {
  const rect = columnFor(g, category).querySelector<SVGRectElement>(
    `.nge-stacked-bar-segment[data-series-id="${seriesId}"]`
  );
  if (!rect) {
    throw new Error(`No segment rect for "${category}" / "${seriesId}"`);
  }
  return rect;
}

/** Numeric value of an attribute. */
function num(el: Element, attr: string): number {
  return Number(el.getAttribute(attr));
}

describe('renderStackedBarLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('is a no-op when data is empty', () => {
      const { context, g } = createContext([]);

      renderStackedBarLayer(context);

      expect(g.querySelectorAll('.nge-stacked-bar-column')).toHaveLength(0);
      expect(g.querySelectorAll('.nge-stacked-bar-segment')).toHaveLength(0);
    });
  });

  describe('column / segment structure', () => {
    it('renders one column per category and one segment per series', () => {
      const { context, g } = createContext(STACKED, { stackOffset: 'none' });

      renderStackedBarLayer(context);

      const columns = Array.from(g.querySelectorAll('.nge-stacked-bar-column'));
      expect(columns.map(c => c.getAttribute('data-category'))).toEqual(['Q1', 'Q2']);
      expect(g.querySelectorAll('.nge-stacked-bar-segment')).toHaveLength(4);
      expect(columnFor(g, 'Q1').querySelectorAll('.nge-stacked-bar-segment')).toHaveLength(2);
    });

    it('re-renders idempotently, keeping one segment per series', () => {
      const { context, g } = createContext(STACKED, { stackOffset: 'none' });

      renderStackedBarLayer(context);
      renderStackedBarLayer(context);

      expect(g.querySelectorAll('.nge-stacked-bar-column')).toHaveLength(2);
      expect(g.querySelectorAll('.nge-stacked-bar-segment')).toHaveLength(4);
    });

    it('translates each column group to its band start', () => {
      const { context, g } = createContext(STACKED, { stackOffset: 'none' });

      renderStackedBarLayer(context);

      const bandScale = context.scales.x as ScaleBand<string>;
      expect(columnFor(g, 'Q1').getAttribute('transform')).toBe(`translate(${bandScale('Q1')}, 0)`);
      expect(columnFor(g, 'Q2').getAttribute('transform')).toBe(`translate(${bandScale('Q2')}, 0)`);
    });
  });

  describe('vertical geometry (offset none)', () => {
    it('stacks segments from the baseline with band-width rects', () => {
      const { context, g } = createContext(STACKED, { stackOffset: 'none' });

      renderStackedBarLayer(context);

      const valueScale = context.scales.y as ScaleLinear<number, number>;
      const bandwidth = (context.scales.x as ScaleBand<string>).bandwidth();

      // Q1: A occupies [0, 10], B stacks on top [10, 30]. Value scale domain [0, 30].
      const a = segmentRect(g, 'Q1', 'A');
      const b = segmentRect(g, 'Q1', 'B');

      expect(num(a, 'x')).toBe(0);
      expect(num(a, 'width')).toBeCloseTo(bandwidth, 6);
      expect(num(a, 'y')).toBeCloseTo(valueScale(10), 6);
      expect(num(a, 'height')).toBeCloseTo(valueScale(0) - valueScale(10), 6);

      // The bottom segment sits on the baseline; B stacks directly on top of A.
      expect(num(a, 'y') + num(a, 'height')).toBeCloseTo(valueScale(0), 6);
      expect(num(b, 'y') + num(b, 'height')).toBeCloseTo(num(a, 'y'), 6);
      expect(num(b, 'y')).toBeCloseTo(valueScale(30), 6);
    });
  });

  describe('expand (100%)', () => {
    it('normalises every column to fill the full height', () => {
      const { context, g } = createContext(STACKED, { stackOffset: 'expand' });

      renderStackedBarLayer(context);

      // Each column's segments together span the full bounded height.
      for (const category of ['Q1', 'Q2']) {
        const total = Array.from(
          columnFor(g, category).querySelectorAll<SVGRectElement>('.nge-stacked-bar-segment')
        ).reduce((sum, rect) => sum + num(rect, 'height'), 0);
        expect(total).toBeCloseTo(DIMENSIONS.boundedHeight, 6);
      }
    });
  });

  describe('marimekko (bandWidthAccessor)', () => {
    it('gives each column a width proportional to its group total', () => {
      const { context, g } = createContext(STACKED, {
        bandWidthAccessor: (_category, total) => total,
        stackOffset: 'expand',
      });

      renderStackedBarLayer(context);

      // Q1 total 30 vs Q2 total 15 → Q1 columns are twice as wide, laid out
      // contiguously (Q1 at x=0, Q2 starting after Q1's width).
      const q1Width = num(segmentRect(g, 'Q1', 'A'), 'width');
      const q2Width = num(segmentRect(g, 'Q2', 'A'), 'width');
      expect(q1Width / q2Width).toBeCloseTo(2, 6);
      expect(q1Width + q2Width).toBeCloseTo(DIMENSIONS.boundedWidth, 6);

      expect(columnFor(g, 'Q1').getAttribute('transform')).toBe('translate(0, 0)');
      expect(columnFor(g, 'Q2').getAttribute('transform')).toBe(`translate(${q1Width}, 0)`);
    });
  });

  describe('horizontal orientation', () => {
    it('lays segments along x with full-band-height rects', () => {
      const { context, g } = createContext(STACKED, {
        orientation: 'horizontal',
        stackOffset: 'none',
      });

      renderStackedBarLayer(context);

      const valueScale = context.scales.x as ScaleLinear<number, number>;
      const bandHeight = (context.scales.y as ScaleBand<string>).bandwidth();

      const a = segmentRect(g, 'Q1', 'A');
      expect(num(a, 'y')).toBe(0);
      expect(num(a, 'height')).toBeCloseTo(bandHeight, 6);
      expect(num(a, 'x')).toBeCloseTo(valueScale(0), 6);
      expect(num(a, 'width')).toBeCloseTo(valueScale(10) - valueScale(0), 6);
    });
  });

  describe('color resolution (via .style)', () => {
    it('cycles the config palette by series index with modulo', () => {
      const data: NgeStackedBarDataPoint[] = [
        { category: 'C1', seriesId: 'A', value: 1 },
        { category: 'C1', seriesId: 'B', value: 1 },
        { category: 'C1', seriesId: 'C', value: 1 },
      ];
      const { context, g } = createContext(data, {
        seriesColors: ['var(--c0)', 'var(--c1)'],
        stackOffset: 'none',
      });

      renderStackedBarLayer(context);

      expect(styleOf(segmentRect(g, 'C1', 'A'), 'fill')).toBe('var(--c0)');
      expect(styleOf(segmentRect(g, 'C1', 'B'), 'fill')).toBe('var(--c1)');
      // Series index 2 wraps: 2 % 2 -> c0.
      expect(styleOf(segmentRect(g, 'C1', 'C'), 'fill')).toBe('var(--c0)');
    });

    it('defaults the first series to the theme palette head (var(--chart-primary))', () => {
      const { context, g } = createContext([{ category: 'C1', seriesId: 'A', value: 10 }]);

      renderStackedBarLayer(context);

      expect(styleOf(segmentRect(g, 'C1', 'A'), 'fill')).toBe('var(--chart-primary)');
    });

    it('honours a per-datum color override', () => {
      const data: NgeStackedBarDataPoint[] = [
        { category: 'C1', color: 'var(--override)', seriesId: 'A', value: 10 },
        { category: 'C1', seriesId: 'B', value: 5 },
      ];
      const { context, g } = createContext(data, { stackOffset: 'none' });

      renderStackedBarLayer(context);

      expect(styleOf(segmentRect(g, 'C1', 'A'), 'fill')).toBe('var(--override)');
    });
  });

  describe('labels', () => {
    it('draws one label per non-zero segment, skipping zero-fill cells', () => {
      // C2 has no B point → the pivot fills (C2, B) with 0, which gets no label.
      const data: NgeStackedBarDataPoint[] = [
        { category: 'C1', seriesId: 'A', value: 10 },
        { category: 'C1', seriesId: 'B', value: 5 },
        { category: 'C2', seriesId: 'A', value: 12 },
      ];
      const { context, g } = createContext(data, { showLabels: true, stackOffset: 'none' });

      renderStackedBarLayer(context);

      expect(g.querySelectorAll('.nge-stacked-bar-label')).toHaveLength(3);
      expect(columnFor(g, 'C2').querySelectorAll('.nge-stacked-bar-label')).toHaveLength(1);
    });

    it('renders no labels when showLabels is false', () => {
      const { context, g } = createContext(STACKED, { stackOffset: 'none' });

      renderStackedBarLayer(context);

      expect(g.querySelectorAll('.nge-stacked-bar-label')).toHaveLength(0);
    });
  });

  describe('interaction', () => {
    it('leaves segments non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(STACKED, { stackOffset: 'none' });

      renderStackedBarLayer(context);

      expect(styleOf(segmentRect(g, 'Q1', 'A'), 'cursor')).toBe('default');
    });

    it('routes the hovered segment to the tooltip with its datum value + border color', () => {
      const { context, g, onTooltip } = createContext(STACKED, {
        seriesColors: ['var(--series-a)', 'var(--series-b)'],
        stackOffset: 'none',
        tooltip: true,
      });

      renderStackedBarLayer(context);
      segmentRect(g, 'Q1', 'B').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(20);
      expect(event.style?.borderColor).toBe('var(--series-b)');
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(STACKED, {
        stackOffset: 'none',
        tooltip: true,
      });

      renderStackedBarLayer(context);
      const rect = segmentRect(g, 'Q1', 'A');
      rect.dispatchEvent(new MouseEvent('mouseenter'));
      rect.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('invokes onClick with the clicked segment datum', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(STACKED, { onClick, stackOffset: 'none' });

      renderStackedBarLayer(context);
      segmentRect(g, 'Q1', 'A').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].data).toBe(STACKED[0]);
      expect(onClick.mock.calls[0][0].index).toBe(0);
    });

    it('leaves a zero-fill (missing-cell) segment inert — no tooltip, no click', () => {
      // C2 has no B point → the pivot fills (C2, B) with a zero-height segment.
      // Its rect is rendered but carries no source datum, so the `if (!datum)
      // return` guards make hover and click no-ops (mirrors the area layer's
      // inert zero-fill), with tooltip + onClick both wired.
      const onClick = jest.fn();
      const onTooltip = jest.fn();
      const data: NgeStackedBarDataPoint[] = [
        { category: 'C1', seriesId: 'A', value: 10 },
        { category: 'C1', seriesId: 'B', value: 5 },
        { category: 'C2', seriesId: 'A', value: 12 },
      ];
      const { context, g } = createContext(data, {
        onClick,
        onTooltip,
        stackOffset: 'none',
        tooltip: true,
      });

      renderStackedBarLayer(context);
      const zeroFill = segmentRect(g, 'C2', 'B');

      expect(() => {
        zeroFill.dispatchEvent(new MouseEvent('mouseenter'));
        zeroFill.dispatchEvent(new MouseEvent('click'));
      }).not.toThrow();
      expect(onTooltip).not.toHaveBeenCalled();
      expect(onClick).not.toHaveBeenCalled();
    });
  });
});
