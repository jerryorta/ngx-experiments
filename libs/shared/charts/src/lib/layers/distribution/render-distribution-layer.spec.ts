import type { ScaleBand, ScaleLinear } from 'd3-scale';

import { select } from 'd3-selection';

import type {
  NgeChartConfig,
  NgeDistributionDataPoint,
  NgeDistributionLayerConfig,
} from '../../core/config';
import type { NgeChartLayerContext } from '../../core/layer';
import type { NgeDistributionLayerTheme } from '../../core/theme';
import type { NgeTooltipEvent } from '../../core/tooltip';

import { NGE_CHART_ANIMATION_DEFAULTS } from '../../core/animation';
import {
  computeBoxStats,
  createDistributionChartScalesFactory,
} from '../../nge-chart/nge-chart.distribution.helpers';
import { renderDistributionLayer } from './render-distribution-layer';

type DistributionContext = NgeChartLayerContext<
  NgeDistributionDataPoint,
  NgeDistributionLayerConfig,
  NgeDistributionLayerTheme | undefined
>;

interface ContextOptions {
  boxWidth?: number;
  jitter?: 'beeswarm' | 'none' | 'uniform';
  onClick?: jest.Mock;
  onTooltip?: jest.Mock;
  orientation?: 'horizontal' | 'vertical';
  pointRadius?: number;
  render?: 'box' | 'points' | 'violin';
  showBox?: boolean;
  showInnerBox?: boolean;
  showMean?: boolean;
  showOutliers?: boolean;
  theme?: NgeDistributionLayerTheme;
  tooltip?: boolean;
  whiskerStat?: 'iqr' | 'minmax' | 'stddev' | 'stderr';
}

const DIMENSIONS = {
  boundedHeight: 300,
  boundedWidth: 500,
  height: 340,
  margin: { bottom: 25, left: 45, right: 15, top: 15 },
  width: 560,
};

const MARGINS = { bottom: 25, left: 45, right: 15, top: 15 };

/** Category 'A' carries a single Tukey outlier (40); 'B' has none. */
const BOX_DATA: NgeDistributionDataPoint[] = [
  { category: 'A', values: [10, 12, 12, 13, 14, 40] },
  { category: 'B', values: [5, 6, 7, 8, 9] },
];

/** Small clouds for points mode — five observations across two categories. */
const POINT_DATA: NgeDistributionDataPoint[] = [
  { category: 'A', values: [1, 2, 3] },
  { category: 'B', values: [4, 5] },
];

/**
 * Build a jsdom SVG bounds group + a layer context for the distribution renderer,
 * with scales from the real factory so band positions / value domain match
 * production. Enter geometry is applied synchronously so it reads back verbatim.
 */
function createContext(
  data: NgeDistributionDataPoint[],
  options: ContextOptions = {}
): { context: DistributionContext; g: SVGGElement; onTooltip: jest.Mock } {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  svg.appendChild(g);
  document.body.appendChild(svg);

  const onTooltip = options.onTooltip ?? jest.fn();

  const config: NgeDistributionLayerConfig = {
    boxWidth: options.boxWidth,
    data,
    jitter: options.jitter,
    onClick: options.onClick,
    orientation: options.orientation,
    pointRadius: options.pointRadius,
    render: options.render,
    renderer: renderDistributionLayer,
    showBox: options.showBox,
    showInnerBox: options.showInnerBox,
    showMean: options.showMean,
    showOutliers: options.showOutliers,
    tooltip: options.tooltip
      ? {
          enabled: true,
          formatContent: (point: NgeDistributionDataPoint) => ({
            label: point.category,
            value: computeBoxStats(point.values)?.median ?? 0,
          }),
          height: 65,
          position: 'above',
          width: 120,
        }
      : undefined,
    type: 'distribution',
    whiskerStat: options.whiskerStat,
  };

  const chartConfig: NgeChartConfig = { layers: [config] };
  const scales = createDistributionChartScalesFactory({ orientation: options.orientation })(
    chartConfig,
    DIMENSIONS
  );

  const context: DistributionContext = {
    animation: NGE_CHART_ANIMATION_DEFAULTS,
    bounds: select(g),
    config,
    data,
    dimensions: DIMENSIONS,
    margins: MARGINS,
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

/** The box rect for a category. */
function boxRect(g: SVGGElement, category: string): SVGRectElement {
  const rect = g.querySelector<SVGRectElement>(
    `.nge-distribution-box[data-category="${category}"]`
  );
  if (!rect) {
    throw new Error(`No distribution box for category ${category}`);
  }
  return rect;
}

/** Count elements matching a sub-mark class. */
function count(g: SVGGElement, className: string): number {
  return g.querySelectorAll(`.${className}`).length;
}

describe('renderDistributionLayer', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  describe('empty-data guard', () => {
    it('draws nothing for empty data', () => {
      const { context, g } = createContext([]);

      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-box')).toBe(0);
    });

    it('removes stale marks when the data empties', () => {
      const { context, g } = createContext(BOX_DATA);

      renderDistributionLayer(context);
      expect(count(g, 'nge-distribution-box')).toBe(2);

      context.data = [];
      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-box')).toBe(0);
      expect(count(g, 'nge-distribution-median')).toBe(0);
      expect(count(g, 'nge-distribution-whisker')).toBe(0);
    });
  });

  describe('box mode', () => {
    it('draws a box + median + whisker per category, plus outliers where present', () => {
      const { context, g } = createContext(BOX_DATA);

      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-box')).toBe(2);
      expect(count(g, 'nge-distribution-median')).toBe(2);
      expect(count(g, 'nge-distribution-whisker')).toBe(2);
      // Category 'A' has one Tukey outlier (40); 'B' has none.
      expect(count(g, 'nge-distribution-outlier')).toBe(1);
    });

    it('sizes each box to its [q1, q3] span on the value axis', () => {
      const { context, g } = createContext(BOX_DATA);

      renderDistributionLayer(context);

      const yScale = context.scales.y as ScaleLinear<number, number>;
      const xScale = context.scales.x as ScaleBand<string>;
      const stats = computeBoxStats(BOX_DATA[0].values)!;
      const boxHalf = (0.6 * xScale.bandwidth()) / 2;
      const center = (xScale('A') ?? 0) + xScale.bandwidth() / 2;

      const rect = boxRect(g, 'A');
      expect(num(rect, 'x')).toBeCloseTo(center - boxHalf, 6);
      expect(num(rect, 'width')).toBeCloseTo(2 * boxHalf, 6);
      expect(num(rect, 'y')).toBeCloseTo(yScale(stats.q3), 6);
      expect(num(rect, 'height')).toBeCloseTo(Math.abs(yScale(stats.q3) - yScale(stats.q1)), 6);
    });

    it('re-renders idempotently', () => {
      const { context, g } = createContext(BOX_DATA);

      renderDistributionLayer(context);
      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-box')).toBe(2);
      expect(count(g, 'nge-distribution-outlier')).toBe(1);
    });

    it('omits outliers when showOutliers is false', () => {
      const { context, g } = createContext(BOX_DATA, { showOutliers: false });

      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-outlier')).toBe(0);
    });

    it('marks the mean when showMean is set', () => {
      const { context, g } = createContext(BOX_DATA, { showMean: true });

      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-mean')).toBe(2);
      const yScale = context.scales.y as ScaleLinear<number, number>;
      const stats = computeBoxStats(BOX_DATA[1].values)!;
      const mean = g.querySelectorAll<SVGCircleElement>('.nge-distribution-mean')[1];
      expect(num(mean, 'cy')).toBeCloseTo(yScale(stats.mean), 6);
    });

    it('places boxes on the horizontal value axis when orientation is horizontal', () => {
      const { context, g } = createContext(BOX_DATA, { orientation: 'horizontal' });

      renderDistributionLayer(context);

      const xScale = context.scales.x as ScaleLinear<number, number>;
      const yScale = context.scales.y as ScaleBand<string>;
      const stats = computeBoxStats(BOX_DATA[0].values)!;

      const rect = boxRect(g, 'A');
      expect(num(rect, 'height')).toBeCloseTo(0.6 * yScale.bandwidth(), 6);
      expect(num(rect, 'width')).toBeCloseTo(Math.abs(xScale(stats.q3) - xScale(stats.q1)), 6);
    });
  });

  describe('error-bar mode (showBox: false)', () => {
    it('draws whiskers + means but no box, median, or outliers', () => {
      const { context, g } = createContext(BOX_DATA, { showBox: false });

      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-whisker')).toBe(2);
      expect(count(g, 'nge-distribution-mean')).toBe(2);
      expect(count(g, 'nge-distribution-box')).toBe(0);
      expect(count(g, 'nge-distribution-median')).toBe(0);
      expect(count(g, 'nge-distribution-outlier')).toBe(0);
    });
  });

  describe('violin mode', () => {
    it('draws a violin path + inner box + median per category', () => {
      const { context, g } = createContext(BOX_DATA, { render: 'violin' });

      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-violin')).toBe(2);
      expect(count(g, 'nge-distribution-box')).toBe(2);
      expect(count(g, 'nge-distribution-median')).toBe(2);
      const violin = g.querySelector('.nge-distribution-violin');
      expect(violin!.getAttribute('d')).toBeTruthy();
    });

    it('suppresses the inner box when showInnerBox is false', () => {
      const { context, g } = createContext(BOX_DATA, { render: 'violin', showInnerBox: false });

      renderDistributionLayer(context);

      expect(count(g, 'nge-distribution-violin')).toBe(2);
      expect(count(g, 'nge-distribution-box')).toBe(0);
    });

    it('falls back to the inner box only when the KDE is degenerate (all-equal)', () => {
      const { context, g } = createContext([{ category: 'Flat', values: [5, 5, 5] }], {
        render: 'violin',
      });

      renderDistributionLayer(context);

      // Zero spread → empty KDE → no violin path, but the inner box still draws.
      expect(count(g, 'nge-distribution-violin')).toBe(0);
      expect(count(g, 'nge-distribution-box')).toBe(1);
    });
  });

  describe('points mode', () => {
    it.each(['beeswarm', 'none', 'uniform'] as const)(
      'draws one circle per observation for %s jitter',
      jitter => {
        const { context, g } = createContext(POINT_DATA, { jitter, render: 'points' });

        renderDistributionLayer(context);

        // Five observations across the two categories.
        expect(count(g, 'nge-distribution-point')).toBe(5);
      }
    );

    it('places points on the value axis at their observed value', () => {
      const { context, g } = createContext([{ category: 'A', values: [1, 2, 3] }], {
        jitter: 'none',
        render: 'points',
      });

      renderDistributionLayer(context);

      const yScale = context.scales.y as ScaleLinear<number, number>;
      const points = Array.from(g.querySelectorAll<SVGCircleElement>('.nge-distribution-point'));
      const cys = points.map(point => num(point, 'cy')).sort((a, b) => a - b);
      const expected = [yScale(3), yScale(2), yScale(1)].sort((a, b) => a - b);
      cys.forEach((cy, i) => expect(cy).toBeCloseTo(expected[i], 6));
    });
  });

  describe('color resolution (via .style)', () => {
    it('fills boxes from the theme default primary token', () => {
      const { context, g } = createContext(BOX_DATA);

      renderDistributionLayer(context);

      expect(styleOf(boxRect(g, 'A'), 'fill')).toBe('var(--chart-primary)');
    });

    it('honours a theme box color override', () => {
      const { context, g } = createContext(BOX_DATA, {
        theme: { box: { color: 'var(--override)' } },
      });

      renderDistributionLayer(context);

      expect(styleOf(boxRect(g, 'A'), 'fill')).toBe('var(--override)');
    });

    it('cycles the point palette per category', () => {
      const { context, g } = createContext(POINT_DATA, { jitter: 'none', render: 'points' });

      renderDistributionLayer(context);

      const points = Array.from(g.querySelectorAll<SVGCircleElement>('.nge-distribution-point'));
      // Category 'A' (index 0) → palette[0] = primary.
      expect(styleOf(points[0], 'fill')).toBe('var(--chart-primary)');
      // Category 'B' (index 1) → palette[1] = secondary.
      const bPoint = points.find(point => styleOf(point, 'fill') !== 'var(--chart-primary)');
      expect(styleOf(bPoint!, 'fill')).toBe('var(--chart-secondary)');
    });
  });

  describe('interaction', () => {
    it('leaves boxes non-interactive when neither tooltip nor onClick is set', () => {
      const { context, g } = createContext(BOX_DATA);

      renderDistributionLayer(context);

      expect(styleOf(boxRect(g, 'A'), 'cursor')).toBe('default');
    });

    it('routes the hovered box to the tooltip with the category median', () => {
      const { context, g, onTooltip } = createContext(BOX_DATA, { tooltip: true });

      renderDistributionLayer(context);
      boxRect(g, 'B').dispatchEvent(new MouseEvent('mouseenter'));

      expect(onTooltip).toHaveBeenCalledTimes(1);
      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect(event.visible).toBe(true);
      expect(event.content.value).toBe(computeBoxStats(BOX_DATA[1].values)!.median);
    });

    it('hides the tooltip on mouseleave', () => {
      const { context, g, onTooltip } = createContext(BOX_DATA, { tooltip: true });

      renderDistributionLayer(context);
      const rect = boxRect(g, 'A');
      rect.dispatchEvent(new MouseEvent('mouseenter'));
      rect.dispatchEvent(new MouseEvent('mouseleave'));

      const last = onTooltip.mock.calls.at(-1)![0] as NgeTooltipEvent;
      expect(last.visible).toBe(false);
    });

    it('routes a hovered point to the tooltip with its own observation value', () => {
      const { context, g, onTooltip } = createContext([{ category: 'A', values: [1, 2, 3] }], {
        jitter: 'none',
        render: 'points',
        tooltip: true,
      });

      renderDistributionLayer(context);
      g.querySelector<SVGCircleElement>('.nge-distribution-point')!.dispatchEvent(
        new MouseEvent('mouseenter')
      );

      const event = onTooltip.mock.calls[0][0] as NgeTooltipEvent;
      expect([1, 2, 3]).toContain(event.content.value);
    });

    it('invokes onClick with the clicked category and its index', () => {
      const onClick = jest.fn();
      const { context, g } = createContext(BOX_DATA, { onClick });

      renderDistributionLayer(context);
      boxRect(g, 'B').dispatchEvent(new MouseEvent('click'));

      expect(onClick).toHaveBeenCalledTimes(1);
      expect(onClick.mock.calls[0][0].index).toBe(1);
      expect(onClick.mock.calls[0][0].data.category).toBe('B');
    });
  });
});
